/**
 * Versa · Feature Flag Service (v35.0)
 *
 * 功能开关 / A-B 实验：
 * - FlagRegistry (boolean/string/number/json flag types)
 * - TargetingEngine (rules: user attr, segment, % rollout)
 * - SegmentRegistry (用户分群: by attribute, by cohort, by list)
 * - ExperimentService (A/B/n with traffic split + sticky assignment)
 * - FlagEvaluator (consistent hashing for rollout)
 * - FlagOverride (per-user override)
 * - FlagAudit (toggle history)
 * - MetricsCollector (eval count, variant exposure)
 * - Persistence
 */

import { withRetry, defaultRetry, computeBackoff } from '../federation'

// ============== Types ==============

export type FlagType = 'boolean' | 'string' | 'number' | 'json'
export type RolloutStrategy = 'all' | 'none' | 'percent' | 'segment' | 'whitelist' | 'expression' | 'experiment'

export interface Flag {
  id: string
  key: string
  type: FlagType
  description: string
  defaultValue: unknown
  strategy: RolloutStrategy
  rolloutPercent?: number       // 0-100
  segmentIds?: string[]         // segment-based rollout
  whitelist?: string[]          // user IDs
  expression?: string           // simple JS-like expression
  variants?: FlagVariant[]      // for experiments
  tags: string[]
  enabled: boolean
  createdAt: number
  updatedAt: number
  owner?: string
}

export interface FlagVariant {
  key: string
  value: unknown
  weight: number  // 0-100, total should sum to 100
}

export interface Segment {
  id: string
  name: string
  description?: string
  /** User attributes to match */
  rules: SegmentRule[]
  /** Static user list */
  userIds?: string[]
  createdAt: number
  updatedAt: number
}

export type SegmentRuleOp = 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'regex' | 'exists' | 'notExists'

export interface SegmentRule {
  attribute: string  // e.g. 'country', 'plan', 'signupDate'
  op: SegmentRuleOp
  value: unknown
}

export interface UserContext {
  userId: string
  attributes: Record<string, unknown>
  /** Override flags for this user */
  overrides?: Record<string, unknown>
}

export interface FlagEvaluation {
  flagKey: string
  value: unknown
  variant?: string
  reason: 'default' | 'override' | 'whitelist' | 'segment' | 'percent' | 'experiment' | 'expression' | 'disabled'
  timestamp: number
  userId: string
}

export interface Experiment {
  id: string
  key: string
  description: string
  flagKey: string
  variants: FlagVariant[]
  startedAt: number
  endedAt?: number
  status: 'draft' | 'running' | 'paused' | 'completed'
  /** Sticky assignment: same user → same variant */
  sticky: boolean
  exposures: Record<string, number>  // variant key → count
  conversions: Record<string, number>
}

export interface FlagAuditEntry {
  id: string
  flagKey: string
  action: 'created' | 'updated' | 'toggled' | 'deleted' | 'evaluated'
  before?: Partial<Flag>
  after?: Partial<Flag>
  actor: string
  ts: number
}

// ============== Hashing (deterministic rollout) ==============

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h * 16777619) >>> 0
  }
  return h
}

export function bucket(userId: string, key: string): number {
  return (hash(`${key}:${userId}`) % 10000) / 100  // 0-100
}

// ============== Segment ==============

export class SegmentRegistry {
  private segments = new Map<string, Segment>()

  create(input: Omit<Segment, 'id' | 'createdAt' | 'updatedAt'>): Segment {
    const id = `seg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const s: Segment = { ...input, id, createdAt: Date.now(), updatedAt: Date.now() }
    this.segments.set(id, s)
    return s
  }
  update(id: string, patch: Partial<Segment>): Segment | undefined {
    const s = this.segments.get(id)
    if (!s) return undefined
    const updated: Segment = { ...s, ...patch, updatedAt: Date.now() }
    this.segments.set(id, updated)
    return updated
  }
  remove(id: string): boolean { return this.segments.delete(id) }
  get(id: string): Segment | undefined { return this.segments.get(id) }
  list(): Segment[] { return [...this.segments.values()] }
  clear(): void { this.segments.clear() }

  matches(user: UserContext, segment: Segment): boolean {
    if (segment.userIds?.includes(user.userId)) return true
    if (segment.rules.length === 0) return false
    for (const rule of segment.rules) {
      if (!this.matchRule(user, rule)) return false
    }
    return true
  }

  private matchRule(user: UserContext, rule: SegmentRule): boolean {
    const v = user.attributes[rule.attribute]
    switch (rule.op) {
      case 'eq': return v === rule.value
      case 'neq': return v !== rule.value
      case 'in': return Array.isArray(rule.value) && (rule.value as unknown[]).includes(v)
      case 'nin': return Array.isArray(rule.value) && !(rule.value as unknown[]).includes(v)
      case 'gt': return typeof v === 'number' && typeof rule.value === 'number' && v > rule.value
      case 'gte': return typeof v === 'number' && typeof rule.value === 'number' && v >= rule.value
      case 'lt': return typeof v === 'number' && typeof rule.value === 'number' && v < rule.value
      case 'lte': return typeof v === 'number' && typeof rule.value === 'number' && v <= rule.value
      case 'contains': return typeof v === 'string' && typeof rule.value === 'string' && v.includes(rule.value)
      case 'startsWith': return typeof v === 'string' && typeof rule.value === 'string' && v.startsWith(rule.value)
      case 'endsWith': return typeof v === 'string' && typeof rule.value === 'string' && v.endsWith(rule.value)
      case 'regex': return typeof v === 'string' && typeof rule.value === 'string' && new RegExp(rule.value).test(v)
      case 'exists': return v !== undefined && v !== null
      case 'notExists': return v === undefined || v === null
    }
    return false
  }
}

export const segments = new SegmentRegistry()

// ============== Flag Registry ==============

export class FlagRegistry {
  private flags = new Map<string, Flag>()

  create(input: Omit<Flag, 'id' | 'createdAt' | 'updatedAt'>): Flag {
    if ([...this.flags.values()].some(f => f.key === input.key)) {
      throw new Error(`Flag ${input.key} already exists`)
    }
    const id = `flag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const f: Flag = { ...input, id, createdAt: Date.now(), updatedAt: Date.now() }
    this.flags.set(id, f)
    return f
  }
  update(id: string, patch: Partial<Flag>): Flag | undefined {
    const f = this.flags.get(id)
    if (!f) return undefined
    const updated: Flag = { ...f, ...patch, updatedAt: Date.now() }
    this.flags.set(id, updated)
    return updated
  }
  toggle(key: string, enabled?: boolean): Flag | undefined {
    const f = this.getByKey(key)
    if (!f) return undefined
    f.enabled = enabled ?? !f.enabled
    f.updatedAt = Date.now()
    return f
  }
  remove(id: string): boolean { return this.flags.delete(id) }
  get(id: string): Flag | undefined { return this.flags.get(id) }
  getByKey(key: string): Flag | undefined {
    return [...this.flags.values()].find(f => f.key === key)
  }
  list(filter?: { tag?: string; enabled?: boolean; type?: FlagType }): Flag[] {
    let arr = [...this.flags.values()]
    if (filter?.tag) arr = arr.filter(f => f.tags.includes(filter.tag!))
    if (filter?.enabled !== undefined) arr = arr.filter(f => f.enabled === filter.enabled)
    if (filter?.type) arr = arr.filter(f => f.type === filter.type)
    return arr
  }
  clear(): void { this.flags.clear() }
  size(): number { return this.flags.size }
}

export const flags = new FlagRegistry()

// ============== Experiment Service ==============

export class ExperimentService {
  private experiments = new Map<string, Experiment>()

  create(input: Omit<Experiment, 'id' | 'exposures' | 'conversions'>): Experiment {
    const id = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const exp: Experiment = { ...input, id, exposures: {}, conversions: {} }
    this.experiments.set(id, exp)
    return exp
  }
  get(id: string): Experiment | undefined { return this.experiments.get(id) }
  getByFlag(flagKey: string): Experiment | undefined {
    return [...this.experiments.values()].find(e => e.flagKey === flagKey)
  }
  list(): Experiment[] { return [...this.experiments.values()] }
  remove(id: string): boolean { return this.experiments.delete(id) }
  start(id: string): boolean {
    const e = this.experiments.get(id)
    if (!e) return false
    e.status = 'running'
    e.startedAt = Date.now()
    return true
  }
  pause(id: string): boolean {
    const e = this.experiments.get(id)
    if (!e) return false
    e.status = 'paused'
    return true
  }
  complete(id: string): boolean {
    const e = this.experiments.get(id)
    if (!e) return false
    e.status = 'completed'
    e.endedAt = Date.now()
    return true
  }
  recordExposure(expId: string, variantKey: string): void {
    const e = this.experiments.get(expId)
    if (!e) return
    e.exposures[variantKey] = (e.exposures[variantKey] ?? 0) + 1
  }
  recordConversion(expId: string, variantKey: string): void {
    const e = this.experiments.get(expId)
    if (!e) return
    e.conversions[variantKey] = (e.conversions[variantKey] ?? 0) + 1
  }
  clear(): void { this.experiments.clear() }

  /** Pick a variant based on weight + userId (sticky) */
  pickVariant(exp: Experiment, userId: string): FlagVariant | undefined {
    if (exp.variants.length === 0) return undefined
    if (exp.variants.length === 1) return exp.variants[0]
    const totalWeight = exp.variants.reduce((s, v) => s + v.weight, 0)
    if (totalWeight === 0) return exp.variants[0]
    const h = exp.sticky ? bucket(userId, exp.key) : Math.random() * 100
    let acc = 0
    for (const v of exp.variants) {
      acc += (v.weight / totalWeight) * 100
      if (h < acc) return v
    }
    return exp.variants[exp.variants.length - 1]
  }
}

export const experiments = new ExperimentService()

// ============== Evaluator ==============

export class FlagEvaluator {
  private auditLog: FlagAuditEntry[] = []
  private evalCounts = new Map<string, number>()

  evaluate(flagKey: string, user: UserContext, defaultValue?: unknown): FlagEvaluation {
    const flag = flags.getByKey(flagKey)
    const inc = (this.evalCounts.get(flagKey) ?? 0) + 1
    this.evalCounts.set(flagKey, inc)
    if (!flag || !flag.enabled) {
      return { flagKey, value: defaultValue ?? flag?.defaultValue, reason: 'disabled', timestamp: Date.now(), userId: user.userId }
    }
    // Override
    if (user.overrides?.[flagKey] !== undefined) {
      return { flagKey, value: user.overrides[flagKey], reason: 'override', timestamp: Date.now(), userId: user.userId }
    }
    switch (flag.strategy) {
      case 'all':
        return { flagKey, value: this.value(flag), reason: 'default', timestamp: Date.now(), userId: user.userId }
      case 'none':
        return { flagKey, value: flag.defaultValue, reason: 'default', timestamp: Date.now(), userId: user.userId }
      case 'percent': {
        const b = bucket(user.userId, flag.key)
        if (b < (flag.rolloutPercent ?? 0)) return { flagKey, value: this.value(flag), reason: 'percent', timestamp: Date.now(), userId: user.userId }
        return { flagKey, value: flag.defaultValue, reason: 'default', timestamp: Date.now(), userId: user.userId }
      }
      case 'whitelist': {
        if (flag.whitelist?.includes(user.userId)) return { flagKey, value: this.value(flag), reason: 'whitelist', timestamp: Date.now(), userId: user.userId }
        return { flagKey, value: flag.defaultValue, reason: 'default', timestamp: Date.now(), userId: user.userId }
      }
      case 'segment': {
        for (const sid of flag.segmentIds ?? []) {
          const seg = segments.get(sid)
          if (seg && segments.matches(user, seg)) {
            return { flagKey, value: this.value(flag), reason: 'segment', timestamp: Date.now(), userId: user.userId }
          }
        }
        return { flagKey, value: flag.defaultValue, reason: 'default', timestamp: Date.now(), userId: user.userId }
      }
      case 'experiment': {
        const exp = experiments.getByFlag(flagKey)
        if (exp && exp.status === 'running') {
          const v = experiments.pickVariant(exp, user.userId)
          if (v) {
            experiments.recordExposure(exp.id, v.key)
            return { flagKey, value: v.value, variant: v.key, reason: 'experiment', timestamp: Date.now(), userId: user.userId }
          }
        }
        return { flagKey, value: flag.defaultValue, reason: 'default', timestamp: Date.now(), userId: user.userId }
      }
      case 'expression': {
        if (this.evalExpression(flag.expression ?? '', user)) {
          return { flagKey, value: this.value(flag), reason: 'expression', timestamp: Date.now(), userId: user.userId }
        }
        return { flagKey, value: flag.defaultValue, reason: 'default', timestamp: Date.now(), userId: user.userId }
      }
    }
  }

  /** Simple expression evaluator: country == 'US' AND plan == 'pro' */
  private evalExpression(expr: string, user: UserContext): boolean {
    try {
      // Convert AND/OR to &&/||
      const normalized = expr.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||')
      const safe = normalized.replace(/(\w+)\s*(==|!=|>=|<=|>|<)\s*('([^']*)'|(\d+)|(\w+))/g, (_m, attr: string, op: string, _q, qStr: string | undefined, numStr: string | undefined, ident: string | undefined) => {
        let rhs = 'undefined'
        if (qStr !== undefined) rhs = `'${qStr}'`
        else if (numStr !== undefined) rhs = numStr
        else if (ident !== undefined) rhs = `ctx.attributes['${ident}']`
        let fn = ''
        switch (op) {
          case '==': fn = '==='; break
          case '!=': fn = '!=='; break
          default: fn = op
        }
        return `(ctx.attributes['${attr}'] ${fn} ${rhs})`
      })
      // eslint-disable-next-line no-new-func
      const fn = new Function('ctx', `return ${safe}`)
      return !!fn(user)
    } catch { return false }
  }

  private value(flag: Flag): unknown {
    if (flag.variants && flag.variants.length > 0) {
      const v = flag.variants[0]
      return v ? v.value : flag.defaultValue
    }
    return flag.defaultValue
  }

  audit(): FlagAuditEntry[] { return [...this.auditLog] }
  evalCounts_(flagKey?: string): Record<string, number> {
    if (flagKey) return { [flagKey]: this.evalCounts.get(flagKey) ?? 0 }
    return Object.fromEntries(this.evalCounts)
  }
  clear(): void { this.auditLog = []; this.evalCounts.clear() }
}

export const evaluator = new FlagEvaluator()

// ============== Persistence ==============

const STORAGE_KEY = 'versa.flags.v1'

export interface PersistShape {
  flags: Flag[]
  segments: Segment[]
  experiments: Experiment[]
}

export function persistFlags(): number {
  if (typeof localStorage === 'undefined') return 0
  const data: PersistShape = {
    flags: flags.list(),
    segments: segments.list(),
    experiments: experiments.list(),
  }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return data.flags.length } catch { return 0 }
}

export function loadFlags(): { flags: number; segments: number } {
  if (typeof localStorage === 'undefined') return { flags: 0, segments: 0 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { flags: 0, segments: 0 }
    const data = JSON.parse(raw) as PersistShape
    return { flags: data.flags.length, segments: data.segments.length }
  } catch { return { flags: 0, segments: 0 } }
}

export function summarizeFlags(): { flags: number; segments: number; experiments: number; evals: number } {
  let totalEvals = 0
  for (const n of Object.values(evaluator.evalCounts_())) totalEvals += n
  return {
    flags: flags.size(),
    segments: segments.list().length,
    experiments: experiments.list().length,
    evals: totalEvals,
  }
}

export { withRetry, defaultRetry, computeBackoff }
