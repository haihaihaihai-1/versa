// Data Validation: schema, type, range, pattern, custom rules, batch validation.

export type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'email' | 'url' | 'date' | 'enum'

export interface FieldRule {
  type: FieldType
  required?: boolean
  min?: number
  max?: number
  pattern?: string
  enum?: string[]
  default?: unknown
  allowNull?: boolean
  description?: string
  custom?: (value: unknown) => true | string
}

export type Schema = Record<string, FieldRule>

export interface ValidationError {
  path: string
  message: string
  rule: string
  value: unknown
}

export interface ValidationResult {
  ok: boolean
  errors: ValidationError[]
  cleaned: Record<string, unknown>
}

export interface ValidationConfig {
  stopOnFirstError: boolean
  coerceTypes: boolean
  strictMode: boolean
}

const DEFAULT_CONFIG: ValidationConfig = {
  stopOnFirstError: false,
  coerceTypes: true,
  strictMode: false,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const URL_RE = /^https?:\/\/.+\..+/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const checkType = (value: unknown, type: FieldType): true | string => {
  if (value === null || value === undefined) return 'is null'
  switch (type) {
    case 'string': return typeof value === 'string' ? true : 'not a string'
    case 'number': return typeof value === 'number' && !isNaN(value) ? true : 'not a number'
    case 'integer': return typeof value === 'number' && Number.isInteger(value) ? true : 'not an integer'
    case 'boolean': return typeof value === 'boolean' ? true : 'not a boolean'
    case 'email': return typeof value === 'string' && EMAIL_RE.test(value) ? true : 'invalid email'
    case 'url': return typeof value === 'string' && URL_RE.test(value) ? true : 'invalid url'
    case 'date': return typeof value === 'string' && DATE_RE.test(value) && !isNaN(Date.parse(value)) ? true : 'invalid date'
    case 'enum': return true
    default: return true
  }
}

const coerce = (value: unknown, type: FieldType): unknown => {
  if (value === null || value === undefined) return value
  switch (type) {
    case 'string': return String(value)
    case 'number': {
      if (typeof value === 'number') return value
      if (typeof value === 'string') { const n = Number(value); return isNaN(n) ? value : n }
      if (typeof value === 'boolean') return value ? 1 : 0
      return value
    }
    case 'integer': {
      const n = typeof value === 'number' ? value : Number(value)
      return isNaN(n) ? value : Math.trunc(n)
    }
    case 'boolean': {
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') return value === 'true' || value === '1'
      if (typeof value === 'number') return value !== 0
      return value
    }
    case 'email': case 'url': case 'date': return String(value)
    default: return value
  }
}

export class Validator {
  readonly config: ValidationConfig

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  validateField(rule: FieldRule, value: unknown, path: string): { errors: ValidationError[]; cleaned: unknown } {
    const errors: ValidationError[] = []
    let cleaned = value
    if (value === undefined) {
      if (rule.required) {
        errors.push({ path, message: 'required', rule: 'required', value })
        return { errors, cleaned }
      }
      if (rule.default !== undefined) cleaned = rule.default
      return { errors, cleaned }
    }
    if (value === null) {
      if (rule.required && !rule.allowNull) {
        errors.push({ path, message: 'required', rule: 'required', value })
        return { errors, cleaned }
      }
      if (rule.allowNull) return { errors, cleaned: null }
      if (rule.default !== undefined) cleaned = rule.default
      return { errors, cleaned }
    }
    if (this.config.coerceTypes) cleaned = coerce(value, rule.type)
    const typeRes = checkType(cleaned, rule.type)
    if (typeRes !== true) errors.push({ path, message: typeRes, rule: 'type', value: cleaned })
    if ((rule.type === 'number' || rule.type === 'integer') && typeof cleaned === 'number') {
      if (rule.min !== undefined && cleaned < rule.min) errors.push({ path, message: `min ${rule.min}`, rule: 'min', value: cleaned })
      if (rule.max !== undefined && cleaned > rule.max) errors.push({ path, message: `max ${rule.max}`, rule: 'max', value: cleaned })
    }
    if ((rule.type === 'string' || rule.type === 'email' || rule.type === 'url' || rule.type === 'date') && typeof cleaned === 'string') {
      if (rule.min !== undefined && cleaned.length < rule.min) errors.push({ path, message: `min length ${rule.min}`, rule: 'minLength', value: cleaned })
      if (rule.max !== undefined && cleaned.length > rule.max) errors.push({ path, message: `max length ${rule.max}`, rule: 'maxLength', value: cleaned })
    }
    if (rule.type === 'enum') {
      if (!rule.enum || !rule.enum.includes(cleaned as string)) errors.push({ path, message: `not in enum`, rule: 'enum', value: cleaned })
    }
    if (rule.pattern && typeof cleaned === 'string') {
      try {
        const re = new RegExp(rule.pattern)
        if (!re.test(cleaned)) errors.push({ path, message: 'pattern mismatch', rule: 'pattern', value: cleaned })
      } catch {
        errors.push({ path, message: 'invalid pattern regex', rule: 'pattern', value: cleaned })
      }
    }
    if (rule.custom) {
      const r = rule.custom(cleaned)
      if (r !== true) errors.push({ path, message: r, rule: 'custom', value: cleaned })
    }
    return { errors, cleaned }
  }

  validate(schema: Schema, record: Record<string, unknown>): ValidationResult {
    const errors: ValidationError[] = []
    const cleaned: Record<string, unknown> = {}
    for (const [k, rule] of Object.entries(schema)) {
      const v = record[k]
      const { errors: fieldErrs, cleaned: fieldCleaned } = this.validateField(rule, v, k)
      errors.push(...fieldErrs)
      cleaned[k] = fieldCleaned
      if (this.config.stopOnFirstError && fieldErrs.length > 0) break
    }
    if (this.config.strictMode) {
      for (const k of Object.keys(record)) {
        if (!schema[k]) errors.push({ path: k, message: 'unknown field', rule: 'strict', value: record[k] })
      }
    }
    return { ok: errors.length === 0, errors, cleaned }
  }

  validateBatch(schema: Schema, records: Record<string, unknown>[]): { results: ValidationResult[]; okCount: number; failCount: number } {
    const results = records.map(r => this.validate(schema, r))
    const okCount = results.filter(r => r.ok).length
    return { results, okCount, failCount: records.length - okCount }
  }
}

let _validator: Validator | null = null
export const getValidator = (config?: Partial<ValidationConfig>): Validator => {
  if (!_validator) _validator = new Validator(config)
  return _validator
}
export const resetValidator = (): void => { _validator = null }
