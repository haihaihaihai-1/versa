/**
 * Versa · Feature Experiment / A-B Testing (v53.0)
 * - Experiment definition (key, variants, traffic split, status)
 * - User assignment (deterministic hash → bucket → variant) with sticky
 * - Traffic ramping (0-100% rollout)
 * - Forced variants (whitelist user IDs)
 * - Multivariate tests (A/B/n)
 * - Conversion events / metrics tracking
 * - Statistical significance (two-proportion z-test)
 * - Sticky bucketing (consistent per user)
 * - Variant overrides (custom rules)
 * - Holdout groups
 * - Targeting rules (attribute predicates)
 * - Lifecycle (draft / running / paused / completed / archived)
 * - Metrics
 */
import { createHash } from 'crypto'

export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed' | 'archived'

export interface Variant {
  name: string
  weight: number
  config: Record<string, unknown>
  description?: string
}

export interface Experiment {
  key: string
  name: string
  description?: string
  status: ExperimentStatus
  variants: Variant[]
  targeting?: TargetingRule
  rampPercent?: number
  holdoutPercent?: number
  forcedUserIds?: string[]
  createdAt: number
  updatedAt: number
  startedAt?: number
  endedAt?: number
  tags?: string[]
  ownerId?: string
}

export type TargetingRule =
  | { type: 'match-all' }
  | { type: 'match-attrs'; predicates: Array<{ attr: string; op: 'eq' | 'in' | 'gt' | 'lt' | 'contains'; value: unknown }> }
  | { type: 'not' }
  | { type: 'and' | 'or'; rules: TargetingRule[] }

export interface AssignmentContext {
  userId: string
  attributes?: Record<string, unknown>
}

export interface AssignmentResult {
  experimentKey: string
  variant: string
  config: Record<string, unknown>
  sticky: boolean
  source: 'forced' | 'targeting' | 'holdout' | 'bucket' | 'rampout'
  assignedAt: number
  bucket: number
}

export interface ConversionEvent {
  experimentKey: string
  variant: string
  userId: string
  metric: string
  value?: number
  timestamp: number
}

export interface VariantStats {
  variant: string
  exposures: number
  conversions: number
  conversionRate: number
  uniqueUsers: number
  totalValue: number
}

export interface ExperimentResults {
  experimentKey: string
  startedAt: number
  totalExposures: number
  totalConversions: number
  variantStats: VariantStats[]
  significance?: Array<{ baseline: string; variant: string; pValue: number; significant: boolean }>
}

export interface ExperimentMetrics {
  totalExperiments: number
  byStatus: Record<ExperimentStatus, number>
  totalAssignments: number
  totalConversions: number
  totalExposureUsers: number
  totalVariantAssignments: number
  byVariant: Record<string, number>
}

export class ExperimentService {
  private experiments = new Map<string, Experiment>()
  private assignments = new Map<string, Map<string, AssignmentResult>>() // userId → expKey → result
  private exposures = new Map<string, number>() // `${userId}::${expKey}::${variant}` → count
  private conversions: ConversionEvent[] = []
  private metrics: ExperimentMetrics = { totalExperiments: 0, byStatus: { draft: 0, running: 0, paused: 0, completed: 0, archived: 0 }, totalAssignments: 0, totalConversions: 0, totalExposureUsers: 0, totalVariantAssignments: 0, byVariant: {} }

  // -------- CRUD --------
  createExperiment(input: Omit<Experiment, 'createdAt' | 'updatedAt' | 'status'> & { status?: ExperimentStatus }): Experiment {
    if (this.experiments.has(input.key)) throw new Error(`experiment ${input.key} already exists`)
    const exp: Experiment = { ...input, status: input.status ?? 'draft', createdAt: Date.now(), updatedAt: Date.now() }
    this.experiments.set(exp.key, exp)
    this.metrics.totalExperiments = this.experiments.size
    this.metrics.byStatus[exp.status]++
    return exp
  }
  updateExperiment(key: string, patch: Partial<Experiment>): Experiment {
    const exp = this.experiments.get(key); if (!exp) throw new Error(`experiment ${key} not found`)
    this.metrics.byStatus[exp.status]--
    Object.assign(exp, patch, { updatedAt: Date.now() })
    this.metrics.byStatus[exp.status]++
    return exp
  }
  deleteExperiment(key: string): boolean {
    const exp = this.experiments.get(key); if (!exp) return false
    this.metrics.byStatus[exp.status]--
    return this.experiments.delete(key)
  }
  getExperiment(key: string): Experiment | undefined { return this.experiments.get(key) }
  listExperiments(filter?: { status?: ExperimentStatus; tag?: string; ownerId?: string }): Experiment[] {
    let arr = [...this.experiments.values()]
    if (filter?.status) arr = arr.filter(e => e.status === filter.status)
    if (filter?.tag) arr = arr.filter(e => e.tags?.includes(filter.tag!))
    if (filter?.ownerId) arr = arr.filter(e => e.ownerId === filter.ownerId)
    return arr
  }
  startExperiment(key: string): Experiment { return this.updateExperiment(key, { status: 'running', startedAt: Date.now() }) }
  pauseExperiment(key: string): Experiment { return this.updateExperiment(key, { status: 'paused' }) }
  resumeExperiment(key: string): Experiment { return this.updateExperiment(key, { status: 'running' }) }
  completeExperiment(key: string): Experiment { return this.updateExperiment(key, { status: 'completed', endedAt: Date.now() }) }
  archiveExperiment(key: string): Experiment { return this.updateExperiment(key, { status: 'archived' }) }

  // -------- Targeting --------
  evaluateTargeting(rule: TargetingRule | undefined, ctx: AssignmentContext): boolean {
    if (!rule || rule.type === 'match-all') return true
    if (rule.type === 'not') return !this.evaluateTargeting(undefined, ctx)
    if (rule.type === 'and') return rule.rules.every(r => this.evaluateTargeting(r, ctx))
    if (rule.type === 'or') return rule.rules.some(r => this.evaluateTargeting(r, ctx))
    if (rule.type === 'match-attrs') {
      return rule.predicates.every(p => {
        const v = ctx.attributes?.[p.attr]
        if (p.op === 'eq') return v === p.value
        if (p.op === 'in') return Array.isArray(p.value) && p.value.includes(v)
        if (p.op === 'gt') return typeof v === 'number' && typeof p.value === 'number' && v > p.value
        if (p.op === 'lt') return typeof v === 'number' && typeof p.value === 'number' && v < p.value
        if (p.op === 'contains') return typeof v === 'string' && typeof p.value === 'string' && v.includes(p.value)
        return false
      })
    }
    return false
  }

  // -------- Hash bucketing --------
  private hashBucket(userId: string, expKey: string, salt = ''): number {
    const h = createHash('sha256').update(`${userId}::${expKey}::${salt}`).digest()
    // take first 4 bytes as unsigned int, mod 10000 → bucket 0-9999
    return h.readUInt32BE(0) % 10000
  }

  // -------- Assignment --------
  assign(experimentKey: string, ctx: AssignmentContext): AssignmentResult | null {
    const exp = this.experiments.get(experimentKey); if (!exp) return null
    if (exp.status !== 'running') return null
    if (!this.evaluateTargeting(exp.targeting, ctx)) return null
    // sticky check
    const userMap = this.assignments.get(ctx.userId) ?? new Map<string, AssignmentResult>()
    this.assignments.set(ctx.userId, userMap)
    const existing = userMap.get(experimentKey)
    if (existing) {
      // record exposure
      this.recordExposure(experimentKey, existing.variant, ctx.userId)
      return { ...existing, sticky: true, assignedAt: existing.assignedAt }
    }
    // forced
    if (exp.forcedUserIds?.includes(ctx.userId)) {
      const v = exp.variants[0]!
      const result: AssignmentResult = { experimentKey, variant: v.name, config: v.config, sticky: false, source: 'forced', assignedAt: Date.now(), bucket: -1 }
      userMap.set(experimentKey, result)
      this.recordExposure(experimentKey, v.name, ctx.userId)
      this.metrics.totalAssignments++
      this.metrics.byVariant[v.name] = (this.metrics.byVariant[v.name] ?? 0) + 1
      return result
    }
    // holdout
    const holdoutBucket = this.hashBucket(ctx.userId, experimentKey, 'holdout')
    if (exp.holdoutPercent && exp.holdoutPercent > 0 && holdoutBucket < exp.holdoutPercent * 100) {
      const result: AssignmentResult = { experimentKey, variant: '__holdout__', config: {}, sticky: false, source: 'holdout', assignedAt: Date.now(), bucket: holdoutBucket }
      userMap.set(experimentKey, result)
      return result
    }
    // ramp
    const rampBucket = this.hashBucket(ctx.userId, experimentKey, 'ramp')
    if (exp.rampPercent != null && exp.rampPercent < 100 && rampBucket >= exp.rampPercent * 100) {
      const result: AssignmentResult = { experimentKey, variant: '__rampout__', config: {}, sticky: false, source: 'rampout', assignedAt: Date.now(), bucket: rampBucket }
      userMap.set(experimentKey, result)
      return result
    }
    // weighted bucket
    const bucket = this.hashBucket(ctx.userId, experimentKey, 'variant')
    const totalWeight = exp.variants.reduce((s, v) => s + v.weight, 0)
    let cum = 0
    let chosen = exp.variants[0]!
    for (const v of exp.variants) {
      cum += v.weight
      if (bucket < (cum / totalWeight) * 10000) { chosen = v; break }
    }
    const result: AssignmentResult = { experimentKey, variant: chosen.name, config: chosen.config, sticky: false, source: 'bucket', assignedAt: Date.now(), bucket }
    userMap.set(experimentKey, result)
    this.recordExposure(experimentKey, chosen.name, ctx.userId)
    this.metrics.totalAssignments++
    this.metrics.byVariant[chosen.name] = (this.metrics.byVariant[chosen.name] ?? 0) + 1
    return result
  }

  private recordExposure(expKey: string, variant: string, userId: string): void {
    const k = `${userId}::${expKey}::${variant}`
    this.exposures.set(k, (this.exposures.get(k) ?? 0) + 1)
  }
  getExposures(expKey: string, variant: string): number {
    let n = 0
    const suffix = `::${expKey}::${variant}`
    for (const [k, c] of this.exposures.entries()) if (k.endsWith(suffix)) n += c
    return n
  }

  // -------- Conversions --------
  trackConversion(event: Omit<ConversionEvent, 'timestamp'>): void {
    this.conversions.push({ ...event, timestamp: Date.now() })
    this.metrics.totalConversions++
  }
  listConversions(filter?: { experimentKey?: string; userId?: string; metric?: string }): ConversionEvent[] {
    let arr = [...this.conversions]
    if (filter?.experimentKey) arr = arr.filter(c => c.experimentKey === filter.experimentKey)
    if (filter?.userId) arr = arr.filter(c => c.userId === filter.userId)
    if (filter?.metric) arr = arr.filter(c => c.metric === filter.metric)
    return arr
  }

  // -------- Statistics --------
  computeResults(experimentKey: string): ExperimentResults | null {
    const exp = this.experiments.get(experimentKey); if (!exp) return null
    const variantStats: VariantStats[] = []
    const userSetPerVariant = new Map<string, Set<string>>()
    for (const v of exp.variants) {
      const convs = this.listConversions({ experimentKey, metric: 'goal' }).filter(c => c.variant === v.name)
      const exposures = this.getExposures(experimentKey, v.name)
      const users = new Set<string>()
      for (const k of this.exposures.keys()) if (k.includes(`::${experimentKey}::${v.name}`)) users.add(k.split('::')[0]!)
      userSetPerVariant.set(v.name, users)
      variantStats.push({ variant: v.name, exposures, conversions: convs.length, conversionRate: exposures > 0 ? convs.length / exposures : 0, uniqueUsers: users.size, totalValue: convs.reduce((s, c) => s + (c.value ?? 1), 0) })
    }
    const totalExposures = variantStats.reduce((s, v) => s + v.exposures, 0)
    const totalConversions = variantStats.reduce((s, v) => s + v.conversions, 0)
    const significance: Array<{ baseline: string; variant: string; pValue: number; significant: boolean }> = []
    if (variantStats.length >= 2) {
      const baseline = variantStats[0]!
      for (let i = 1; i < variantStats.length; i++) {
        const v = variantStats[i]!
        const p = this.twoProportionZ(baseline.conversions, baseline.exposures, v.conversions, v.exposures)
        significance.push({ baseline: baseline.variant, variant: v.variant, pValue: p, significant: p < 0.05 })
      }
    }
    return { experimentKey, startedAt: exp.startedAt ?? exp.createdAt, totalExposures, totalConversions, variantStats, significance }
  }

  // two-proportion z-test (two-sided), returns p-value
  private twoProportionZ(x1: number, n1: number, x2: number, n2: number): number {
    if (n1 === 0 || n2 === 0) return 1
    const p1 = x1 / n1, p2 = x2 / n2
    const p = (x1 + x2) / (n1 + n2)
    const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2))
    if (se === 0) return 1
    const z = (p1 - p2) / se
    return 2 * (1 - this.normalCdf(Math.abs(z)))
  }
  private normalCdf(x: number): number {
    // approximation (Abramowitz & Stegun 7.1.26)
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
    const sign = x < 0 ? -1 : 1
    const ax = Math.abs(x) / Math.SQRT2
    const t = 1 / (1 + p * ax)
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax)
    return 0.5 * (1 + sign * y)
  }

  // -------- Query --------
  getAssignment(userId: string, experimentKey: string): AssignmentResult | undefined { return this.assignments.get(userId)?.get(experimentKey) }
  listAssignmentsForUser(userId: string): AssignmentResult[] { return [...(this.assignments.get(userId)?.values() ?? [])] }

  // -------- Metrics --------
  getMetrics(): ExperimentMetrics {
    this.metrics.totalExposureUsers = this.assignments.size
    return JSON.parse(JSON.stringify(this.metrics))
  }
  resetMetrics(): void { this.metrics = { totalExperiments: this.experiments.size, byStatus: { draft: 0, running: 0, paused: 0, completed: 0, archived: 0 }, totalAssignments: 0, totalConversions: 0, totalExposureUsers: 0, totalVariantAssignments: 0, byVariant: {} } }
}

let _instance: ExperimentService | null = null
export function getExperimentService(): ExperimentService { if (!_instance) _instance = new ExperimentService(); return _instance }
export function resetExperimentService(): void { _instance = null }
export { ExperimentService as default }
