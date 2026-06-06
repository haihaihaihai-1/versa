// v65.0 Schema Registry — schema registration, versioning,
// compatibility checks (BACKWARD/FORWARD/FULL/NONE), field indexing,
// reference resolution ($ref), migration mapping, codec (encode/decode)

export type SchemaType = 'json-schema' | 'avro' | 'protobuf'

export type Compatibility = 'BACKWARD' | 'FORWARD' | 'FULL' | 'NONE'

export interface SchemaField {
  name: string
  type: string  // primitive, complex, or $ref
  required?: boolean
  default?: unknown
  doc?: string
}

export interface ParsedSchema {
  name: string
  type: SchemaType
  raw: unknown
  fields: SchemaField[]
  version: number
  id: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Primitive type compatibility

const PRIMITIVES = ['null', 'boolean', 'int', 'long', 'float', 'double', 'bytes', 'string']

function isPrimitive(type: string): boolean { return PRIMITIVES.includes(type) }

// ─────────────────────────────────────────────────────────────────────────────
// Schema Parser

export class SchemaParser {
  static parse(raw: unknown, type: SchemaType = 'json-schema', name = 'Schema'): ParsedSchema {
    const fields = SchemaParser.extractFields(raw)
    return { name, type, raw, fields, version: 1, id: 0 }
  }

  static extractFields(raw: unknown): SchemaField[] {
    if (typeof raw !== 'object' || raw === null) return []
    const obj = raw as Record<string, unknown>
    // JSON Schema
    if (obj.properties && typeof obj.properties === 'object') {
      const required = Array.isArray(obj.required) ? obj.required as string[] : []
      return Object.entries(obj.properties as Record<string, unknown>).map(([k, v]) => {
        const prop = v as Record<string, unknown>
        return {
          name: k,
          type: SchemaParser.typeOf(prop),
          required: required.includes(k),
          default: prop.default,
          doc: typeof prop.description === 'string' ? prop.description : undefined,
        }
      })
    }
    // Avro
    if (obj.type === 'record' && Array.isArray(obj.fields)) {
      return (obj.fields as Array<Record<string, unknown>>).map(f => ({
        name: String(f.name),
        type: SchemaParser.typeOf(f),
        required: SchemaParser.isRequiredAvro(f),
        default: f.default,
        doc: typeof f.doc === 'string' ? f.doc : undefined,
      }))
    }
    // Generic list
    if (Array.isArray(raw)) {
      return raw.map((item, i) => {
        const f = item as Record<string, unknown>
        return {
          name: String(f.name ?? f.key ?? `field${i}`),
          type: SchemaParser.typeOf(f),
          required: !f.optional,
          default: f.default,
          doc: typeof f.doc === 'string' ? f.doc : undefined,
        }
      })
    }
    return []
  }

  static typeOf(field: Record<string, unknown>): string {
    if (typeof field.type === 'string') return field.type
    if (Array.isArray(field.type)) return (field.type as string[]).join('|')
    if (field.$ref) return String(field.$ref)
    if (field.type && typeof field.type === 'object') return 'object'
    return 'unknown'
  }

  static isRequiredAvro(field: Record<string, unknown>): boolean {
    // In Avro, a field is required unless it has a default or is part of a union with null
    if (field.default !== undefined) return false
    if (Array.isArray(field.type) && (field.type as string[]).includes('null')) return false
    return true
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema Registry

export class SchemaRegistry {
  private schemas: Map<number, ParsedSchema> = new Map()
  private byName: Map<string, number[]> = new Map()
  private refs: Map<string, ParsedSchema> = new Map()
  private nextId = 1

  register(raw: unknown, type: SchemaType = 'json-schema', name = 'Schema'): ParsedSchema {
    const parsed = SchemaParser.parse(raw, type, name)
    parsed.id = this.nextId++
    this.schemas.set(parsed.id, parsed)
    const list = this.byName.get(parsed.name) ?? []
    list.push(parsed.id)
    this.byName.set(parsed.name, list)
    // Set version
    parsed.version = list.length
    return parsed
  }

  get(id: number): ParsedSchema | undefined { return this.schemas.get(id) }

  getByName(name: string): ParsedSchema[] {
    const ids = this.byName.get(name) ?? []
    return ids.map(id => this.schemas.get(id)!).filter(Boolean)
  }

  getLatest(name: string): ParsedSchema | undefined {
    const list = this.getByName(name)
    return list[list.length - 1]
  }

  listAll(): ParsedSchema[] { return Array.from(this.schemas.values()) }

  listByName(name: string): string[] { return (this.byName.get(name) ?? []).map(String) }

  delete(id: number): boolean {
    const s = this.schemas.get(id)
    if (!s) return false
    this.schemas.delete(id)
    const list = this.byName.get(s.name) ?? []
    this.byName.set(s.name, list.filter(i => i !== id))
    return true
  }

  // Reference management (allow schemas to reference each other)
  addReference(name: string, schema: ParsedSchema): void {
    this.refs.set(name, schema)
  }

  resolveRef(ref: string): ParsedSchema | undefined {
    if (ref.startsWith('#/definitions/')) {
      return this.refs.get(ref.substring('#/definitions/'.length))
    }
    if (ref.startsWith('schema:')) {
      return this.refs.get(ref.substring('schema:'.length))
    }
    return this.refs.get(ref)
  }

  // Field lookup across all versions of a schema name
  findField(name: string, fieldName: string): { schema: ParsedSchema; field: SchemaField } | undefined {
    for (const s of this.getByName(name)) {
      const f = s.fields.find(x => x.name === fieldName)
      if (f) return { schema: s, field: f }
    }
    return undefined
  }

  // Search fields by name across all schemas
  searchFields(query: string): Array<{ schema: ParsedSchema; field: SchemaField }> {
    const results: Array<{ schema: ParsedSchema; field: SchemaField }> = []
    for (const s of this.schemas.values()) {
      for (const f of s.fields) {
        if (f.name.includes(query)) results.push({ schema: s, field: f })
      }
    }
    return results
  }

  // Compatibility check between two schemas (same name, different versions)
  checkCompatibility(oldSchema: ParsedSchema, newSchema: ParsedSchema, mode: Compatibility = 'BACKWARD'): { compatible: boolean; issues: string[] } {
    const issues: string[] = []
    if (oldSchema.name !== newSchema.name) {
      return { compatible: false, issues: [`name mismatch: ${oldSchema.name} vs ${newSchema.name}`] }
    }

    if (mode === 'NONE') return { compatible: true, issues: [] }

    const oldFields = new Map(oldSchema.fields.map(f => [f.name, f]))
    const newFields = new Map(newSchema.fields.map(f => [f.name, f]))

    // Check removed fields
    for (const [name, oldField] of oldFields) {
      if (!newFields.has(name)) {
        if (oldField.required && (mode === 'BACKWARD' || mode === 'FULL')) {
          issues.push(`removed required field: ${name}`)
        } else if (mode === 'FORWARD') {
          // Forward: new code can read old data; removal of optional is fine
        } else if (mode === 'BACKWARD') {
          // Backward: new schema is read by old code. Removing field = old code expects it.
          if (oldField.required) issues.push(`removed required field: ${name}`)
        }
      }
    }

    // Check added fields
    for (const [name, newField] of newFields) {
      if (!oldFields.has(name)) {
        if (newField.required && (mode === 'FORWARD' || mode === 'FULL')) {
          issues.push(`added required field: ${name}`)
        } else if (mode === 'BACKWARD') {
          // old code reading new data: optional fields fine, required would fail
          if (newField.required) issues.push(`added required field: ${name}`)
        }
      }
    }

    // Check type changes
    for (const [name, newField] of newFields) {
      const oldField = oldFields.get(name)
      if (oldField && oldField.type !== newField.type) {
        if (mode === 'BACKWARD' || mode === 'FULL') {
          // old code reading new data: type change is a problem
          issues.push(`type changed for ${name}: ${oldField.type} → ${newField.type}`)
        }
      }
      if (oldField && mode === 'FORWARD') {
        // new code reading old data
        if (oldField.type !== newField.type) {
          issues.push(`type changed for ${name}: ${oldField.type} → ${newField.type}`)
        }
      }
    }

    return { compatible: issues.length === 0, issues }
  }

  // Auto-register and check (compares against the latest version BEFORE registering the new one)
  evolve(raw: unknown, type: SchemaType = 'json-schema', name = 'Schema', mode: Compatibility = 'BACKWARD'): { schema: ParsedSchema; compatible: boolean; issues: string[] } {
    const latest = this.getLatest(name)
    const newSchema = this.register(raw, type, name)
    if (!latest) return { schema: newSchema, compatible: true, issues: [] }
    if (latest.id === newSchema.id) return { schema: newSchema, compatible: true, issues: [] }
    const result = this.checkCompatibility(latest, newSchema, mode)
    return { schema: newSchema, ...result }
  }

  // Evolve a specific previous version (used for name changes)
  evolveFrom(prevId: number, raw: unknown, type: SchemaType = 'json-schema', name = 'Schema', mode: Compatibility = 'BACKWARD'): { schema: ParsedSchema; compatible: boolean; issues: string[] } {
    const prev = this.schemas.get(prevId)
    if (!prev) throw new Error('prev not found')
    const newSchema = this.register(raw, type, name)
    const result = this.checkCompatibility(prev, newSchema, mode)
    return { schema: newSchema, ...result }
  }

  metrics(): { total: number; families: number; references: number } {
    return { total: this.schemas.size, families: this.byName.size, references: this.refs.size }
  }

  clear(): void {
    this.schemas.clear()
    this.byName.clear()
    this.refs.clear()
    this.nextId = 1
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Migration — field-level mapping between schema versions

export interface FieldMapping {
  fromField: string
  toField: string
  transform?: (value: unknown) => unknown
}

export class SchemaMigration {
  mappings: FieldMapping[] = []
  fromVersion: number
  toVersion: number

  constructor(fromVersion: number, toVersion: number) {
    this.fromVersion = fromVersion
    this.toVersion = toVersion
  }

  map(fromField: string, toField: string, transform?: (v: unknown) => unknown): this {
    this.mappings.push({ fromField, toField, transform })
    return this
  }

  apply(record: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = { ...record }
    for (const m of this.mappings) {
      if (m.fromField in record) {
        const v = m.transform ? m.transform(record[m.fromField]) : record[m.fromField]
        out[m.toField] = v
        if (m.fromField !== m.toField) delete out[m.fromField]
      }
    }
    return out
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Codec — encode/decode records against schema (validation + defaults)

export interface ValidationError {
  field: string
  reason: string
}

export class SchemaCodec {
  static validate(record: Record<string, unknown>, schema: ParsedSchema): { valid: boolean; errors: ValidationError[] } {
    const errors: ValidationError[] = []
    for (const field of schema.fields) {
      const v = record[field.name]
      if (v === undefined) {
        if (field.required) errors.push({ field: field.name, reason: 'missing required field' })
        continue
      }
      if (!SchemaCodec.typeMatches(v, field.type)) {
        errors.push({ field: field.name, reason: `expected ${field.type}, got ${typeof v}` })
      }
    }
    return { valid: errors.length === 0, errors }
  }

  static typeMatches(value: unknown, type: string): boolean {
    if (type === 'null') return value === null
    if (type === 'boolean') return typeof value === 'boolean'
    if (type === 'int' || type === 'long' || type === 'float' || type === 'double') return typeof value === 'number'
    if (type === 'string') return typeof value === 'string'
    if (type === 'bytes') return value instanceof Uint8Array || typeof value === 'string'
    if (type.includes('|')) {
      return type.split('|').some(t => SchemaCodec.typeMatches(value, t))
    }
    if (type === 'array' || type === 'object') return typeof value === 'object'
    return true  // unknown refs pass
  }

  static applyDefaults(record: Record<string, unknown>, schema: ParsedSchema): Record<string, unknown> {
    const out = { ...record }
    for (const field of schema.fields) {
      if (!(field.name in out) && field.default !== undefined) {
        out[field.name] = field.default
      }
    }
    return out
  }

  static encode(record: Record<string, unknown>, schema: ParsedSchema): { ok: boolean; result?: Record<string, unknown>; errors: ValidationError[] } {
    const withDefaults = SchemaCodec.applyDefaults(record, schema)
    const v = SchemaCodec.validate(withDefaults, schema)
    if (!v.valid) return { ok: false, errors: v.errors }
    return { ok: true, result: withDefaults, errors: [] }
  }

  static decode(record: Record<string, unknown>, schema: ParsedSchema): { ok: boolean; result?: Record<string, unknown>; errors: ValidationError[] } {
    return SchemaCodec.encode(record, schema)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton

let _registry: SchemaRegistry | null = null
export function getRegistry(): SchemaRegistry {
  if (!_registry) _registry = new SchemaRegistry()
  return _registry
}
export function resetRegistry(): void {
  _registry?.clear()
  _registry = null
}
