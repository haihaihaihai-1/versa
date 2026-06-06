// v66.0 Feature Flag Targeting Engine — user segments, rule evaluation,
// context-based targeting, bulk evaluation, traffic allocation, rollout
// percentages, force-on/force-off, kill switch, dependency rules

export type FlagValue = boolean | string | number
export type Context = Record<string, unknown>

// ─────────────────────────────────────────────────────────────────────────────
// Operators

export type Operator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith' | 'matches' | 'exists' | 'notExists' | 'before' | 'after' | 'between' | 'semver'

export interface Rule {
  attribute: string  // dot.path in context
  op: Operator
  value?: unknown
  values?: unknown[]
}

export function evaluateRule(rule: Rule, ctx: Context): boolean {
  const actual = getPath(ctx, rule.attribute)
  switch (rule.op) {
    case 'eq': return actual === rule.value
    case 'neq': return actual !== rule.value
    case 'gt': return typeof actual === 'number' && typeof rule.value === 'number' && actual > rule.value
    case 'gte': return typeof actual === 'number' && typeof rule.value === 'number' && actual >= rule.value
    case 'lt': return typeof actual === 'number' && typeof rule.value === 'number' && actual < rule.value
    case 'lte': return typeof actual === 'number' && typeof rule.value === 'number' && actual <= rule.value
    case 'in': return Array.isArray(rule.values) && rule.values.includes(actual)
    case 'nin': return Array.isArray(rule.values) && !rule.values.includes(actual)
    case 'contains': return Array.isArray(actual) && actual.includes(rule.value)
    case 'startsWith': return typeof actual === 'string' && typeof rule.value === 'string' && actual.startsWith(rule.value)
    case 'endsWith': return typeof actual === 'string' && typeof rule.value === 'string' && actual.endsWith(rule.value)
    case 'matches': return typeof actual === 'string' && typeof rule.value === 'string' && new RegExp(rule.value).test(actual)
    case 'exists': return actual !== undefined
    case 'notExists': return actual === undefined
    case 'before': return typeof actual === 'string' && typeof rule.value === 'string' && actual < rule.value
    case 'after': return typeof actual === 'string' && typeof rule.value === 'string' && actual > rule.value
    case 'between': return Array.isArray(rule.values) && rule.values.length === 2 && typeof actual === 'number' && actual >= (rule.values[0] as number) && actual <= (rule.values[1] as number)
    case 'semver': return typeof actual === 'string' && typeof rule.value === 'string' && semverCompare(actual, rule.value) >= 0
    default: return false
  }
}

function getPath(obj: Context, path: string): unknown {
  if (!path.includes('.')) return obj[path]
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur && typeof cur === 'object') cur = (cur as Record<string, unknown>)[p]
    else return undefined
  }
  return cur
}

function semverCompare(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0
    const db = pb[i] ?? 0
    if (da > db) return 1
    if (da < db) return -1
  }
  return 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Segment — reusable group definition

export interface Segment {
  id: string
  name: string
  rules: Rule[]
  // all = AND, any = OR
  combinator: 'all' | 'any'
}

export function evaluateSegment(seg: Segment, ctx: Context): boolean {
  if (seg.combinator === 'all') return seg.rules.every(r => evaluateRule(r, ctx))
  return seg.rules.some(r => evaluateRule(r, ctx))
}

// ─────────────────────────────────────────────────────────────────────────────
// Flag definition

export type FlagState = 'on' | 'off' | 'kill-switch'

export interface Flag {
  id: string
  name: string
  description?: string
  defaultValue: FlagValue
  state: FlagState
  // Variants for A/B testing
  variants?: Array<{ name: string; value: FlagValue; weight: number }>
  // Targeting rules (if any match → use this variant)
  rules: Array<{ rules: Rule[]; combinator: 'all' | 'any'; serve: FlagValue | { variant: string } }>
  // Rollout percentage (0-100) for users that didn't match any rule
  rolloutPercentage: number
  // Dependencies
  dependsOn?: Array<{ flag: string; expectedValue: FlagValue }>
  // Tags
  tags?: string[]
  createdAt: number
  updatedAt: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine

export class FlagEngine {
  private flags: Map<string, Flag> = new Map()
  private segments: Map<string, Segment> = new Map()
  private evaluations: Map<string, Map<string, { value: FlagValue; variant?: string; reason: string }>> = new Map()  // flagId -> userId -> result
  private evalCount = 0

  // Flag CRUD
  createFlag(spec: Omit<Flag, 'createdAt' | 'updatedAt'>): Flag {
    const now = Date.now()
    const flag: Flag = { ...spec, createdAt: now, updatedAt: now }
    this.flags.set(flag.id, flag)
    return flag
  }

  updateFlag(id: string, patch: Partial<Flag>): Flag | undefined {
    const f = this.flags.get(id)
    if (!f) return undefined
    const updated = { ...f, ...patch, updatedAt: Date.now() }
    this.flags.set(id, updated)
    return updated
  }

  getFlag(id: string): Flag | undefined { return this.flags.get(id) }
  getFlagByName(name: string): Flag | undefined {
    return Array.from(this.flags.values()).find(f => f.name === name)
  }
  deleteFlag(id: string): boolean { return this.flags.delete(id) }
  listFlags(): Flag[] { return Array.from(this.flags.values()) }
  setState(id: string, state: FlagState): boolean {
    const f = this.flags.get(id)
    if (!f) return false
    f.state = state
    f.updatedAt = Date.now()
    return true
  }

  // Segment CRUD
  createSegment(seg: Segment): Segment {
    this.segments.set(seg.id, seg)
    return seg
  }
  getSegment(id: string): Segment | undefined { return this.segments.get(id) }
  listSegments(): Segment[] { return Array.from(this.segments.values()) }
  deleteSegment(id: string): boolean { return this.segments.delete(id) }

  // Evaluation
  evaluate(flagId: string, ctx: Context & { userId?: string }): { value: FlagValue; variant?: string; reason: string } {
    this.evalCount++
    const flag = this.flags.get(flagId)
    if (!flag) return { value: false, reason: 'flag-not-found' }
    if (flag.state === 'kill-switch') return { value: false, reason: 'kill-switch' }
    if (flag.state === 'off') return { value: flag.defaultValue, reason: 'flag-off' }

    // Check dependencies
    if (flag.dependsOn) {
      for (const dep of flag.dependsOn) {
        const depResult = this.evaluate(dep.flag, ctx)
        if (depResult.value !== dep.expectedValue) {
          return { value: flag.defaultValue, reason: `dependency-fail:${dep.flag}` }
        }
      }
    }

    // Check targeting rules (in order)
    for (const target of flag.rules) {
      const allMatch = target.combinator === 'all'
        ? target.rules.every(r => evaluateRule(r, ctx))
        : target.rules.some(r => evaluateRule(r, ctx))
      if (allMatch) {
        if (typeof target.serve === 'object' && target.serve !== null && 'variant' in (target.serve as Record<string, unknown>)) {
          const variantName = (target.serve as { variant: string }).variant
          const variant = flag.variants?.find(v => v.name === variantName)
          if (variant) {
            this.recordEvaluation(flag, ctx, variant.value, variant.name, 'rule-match')
            return { value: variant.value, variant: variant.name, reason: 'rule-match' }
          }
        } else {
          this.recordEvaluation(flag, ctx, target.serve as FlagValue, undefined, 'rule-match')
          return { value: target.serve as FlagValue, reason: 'rule-match' }
        }
      }
    }

    // Rollout percentage
    if (flag.rolloutPercentage <= 0) {
      this.recordEvaluation(flag, ctx, flag.defaultValue, undefined, 'rollout=0')
      return { value: flag.defaultValue, reason: 'rollout=0' }
    }
    if (flag.rolloutPercentage >= 100) {
      // On, possibly pick variant by weight
      if (flag.variants && flag.variants.length > 0) {
        const v = pickVariant(flag.variants, ctx.userId ?? 'anon')
        this.recordEvaluation(flag, ctx, v.value, v.name, 'rollout=100/variant')
        return { value: v.value, variant: v.name, reason: 'rollout=100/variant' }
      }
      this.recordEvaluation(flag, ctx, flag.defaultValue, undefined, 'rollout=100')
      return { value: flag.defaultValue, reason: 'rollout=100' }
    }
    // Hash-based rollout
    const userId = ctx.userId ?? 'anon'
    const bucket = hashBucket(`${flag.id}:${userId}`)
    if (bucket < flag.rolloutPercentage) {
      if (flag.variants && flag.variants.length > 0) {
        const v = pickVariant(flag.variants, userId)
        this.recordEvaluation(flag, ctx, v.value, v.name, `rollout-bucket=${bucket}`)
        return { value: v.value, variant: v.name, reason: `rollout-bucket=${bucket}` }
      }
      this.recordEvaluation(flag, ctx, flag.defaultValue, undefined, `rollout-bucket=${bucket}`)
      return { value: flag.defaultValue, reason: `rollout-bucket=${bucket}` }
    }
    this.recordEvaluation(flag, ctx, flag.defaultValue, undefined, 'rollout-not-bucketed')
    return { value: flag.defaultValue, reason: 'rollout-not-bucketed' }
  }

  private recordEvaluation(flag: Flag, ctx: Context & { userId?: string }, value: FlagValue, variant: string | undefined, reason: string): void {
    if (!ctx.userId) return
    let userMap = this.evaluations.get(flag.id)
    if (!userMap) { userMap = new Map(); this.evaluations.set(flag.id, userMap) }
    userMap.set(ctx.userId, { value, variant, reason })
  }

  // Bulk evaluate
  evaluateBulk(flagIds: string[], ctx: Context & { userId?: string }): Record<string, { value: FlagValue; variant?: string; reason: string }> {
    const result: Record<string, { value: FlagValue; variant?: string; reason: string }> = {}
    for (const id of flagIds) result[id] = this.evaluate(id, ctx)
    return result
  }

  // Evaluate all flags for a user
  evaluateAll(ctx: Context & { userId?: string }): Record<string, { value: FlagValue; variant?: string; reason: string }> {
    return this.evaluateBulk(Array.from(this.flags.keys()), ctx)
  }

  // Force on/off (override for specific user)
  override(flagId: string, userId: string, value: FlagValue): void {
    const f = this.flags.get(flagId)
    if (!f) return
    let userMap = this.evaluations.get(flagId)
    if (!userMap) { userMap = new Map(); this.evaluations.set(flagId, userMap) }
    userMap.set(userId, { value, reason: 'override' })
  }

  getOverride(flagId: string, userId: string): { value: FlagValue; reason: string } | undefined {
    return this.evaluations.get(flagId)?.get(userId)
  }

  // Metrics
  metrics(): { flags: number; segments: number; evaluations: number; overrides: number } {
    let overrides = 0
    for (const m of this.evaluations.values()) overrides += m.size
    return { flags: this.flags.size, segments: this.segments.size, evaluations: this.evalCount, overrides }
  }

  // Kill switch — turns off all flags
  killAll(): number {
    let n = 0
    for (const f of this.flags.values()) { f.state = 'kill-switch'; n++ }
    return n
  }

  clear(): void {
    this.flags.clear()
    this.segments.clear()
    this.evaluations.clear()
    this.evalCount = 0
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hashing for rollout

function hashBucket(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0
  return Math.abs(h) % 100
}

function pickVariant<T extends { name: string; weight: number }>(variants: T[], seed: string): T {
  const total = variants.reduce((s, v) => s + v.weight, 0)
  if (total === 0) return variants[0]
  const target = hashBucket(`${seed}:variant`) / 100 * total
  let acc = 0
  for (const v of variants) {
    acc += v.weight
    if (target < acc) return v
  }
  return variants[variants.length - 1]
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton

let _engine: FlagEngine | null = null
export function getFlagEngine(): FlagEngine {
  if (!_engine) _engine = new FlagEngine()
  return _engine
}
export function resetFlagEngine(): void {
  _engine?.clear()
  _engine = null
}
