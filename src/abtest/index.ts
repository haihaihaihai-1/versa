// A/B Testing Framework: experiments, variants, deterministic assignment, exposure & metric tracking, statistical tests.

export type VariantId = string
export type ExperimentId = string
export type UserId = string

export interface Variant {
  id: VariantId
  name: string
  weight: number
  config?: Record<string, unknown>
  isControl?: boolean
}

export interface Experiment {
  id: ExperimentId
  name: string
  description?: string
  variants: Variant[]
  status: 'draft' | 'running' | 'paused' | 'completed'
  startedAt?: number
  endedAt?: number
  owner?: string
  tags?: string[]
  metric: string
  hypothesis?: string
  minSampleSize?: number
}

export interface Assignment {
  userId: UserId
  experimentId: ExperimentId
  variantId: VariantId
  assignedAt: number
  bucket: number
}

export interface Exposure {
  id: string
  userId: UserId
  experimentId: ExperimentId
  variantId: VariantId
  metric: string
  value: number
  at: number
}

export interface VariantStats {
  variantId: VariantId
  exposures: number
  uniques: number
  sum: number
  sumOfSquares: number
  mean: number
  variance: number
  std: number
  conversionRate: number
}

export interface TestResult {
  experimentId: ExperimentId
  metric: string
  variants: VariantStats[]
  winner?: VariantId
  pValue?: number
  zScore?: number
  lift?: number
  isSignificant: boolean
  sampleSizeReached: boolean
  recommendation: 'continue' | 'declare_winner' | 'stop_no_effect' | 'inconclusive'
}

export interface AbConfig {
  hashSalt: string
  minSamplePerVariant: number
  significanceLevel: number
  enableAllocationCache: boolean
}

const DEFAULT_CONFIG: AbConfig = {
  hashSalt: 'versa-ab-2026',
  minSamplePerVariant: 100,
  significanceLevel: 0.05,
  enableAllocationCache: true,
}

export class AbTestingFramework {
  readonly config: AbConfig
  private experiments: Map<ExperimentId, Experiment> = new Map()
  private assignments: Map<string, Assignment> = new Map()
  private exposures: Exposure[] = []
  private metricValues: Map<string, number[]> = new Map()
  private metricUniques: Map<string, Set<UserId>> = new Map()
  private startedAt = Date.now()

  constructor(config: Partial<AbConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ---- Experiment CRUD ----
  createExperiment(exp: Omit<Experiment, 'status'> & { status?: Experiment['status'] }): Experiment {
    if (this.experiments.has(exp.id)) throw new Error('experiment exists: ' + exp.id)
    const totalWeight = exp.variants.reduce((s, v) => s + v.weight, 0)
    if (totalWeight <= 0) throw new Error('variants weights must be positive')
    const full: Experiment = { status: 'draft', ...exp }
    this.experiments.set(full.id, full)
    return full
  }

  getExperiment(id: ExperimentId): Experiment | undefined {
    return this.experiments.get(id)
  }

  listExperiments(filter?: { status?: Experiment['status']; tag?: string }): Experiment[] {
    let out = [...this.experiments.values()]
    if (filter?.status) out = out.filter(e => e.status === filter.status)
    if (filter?.tag) out = out.filter(e => (e.tags ?? []).includes(filter.tag!))
    return out
  }

  startExperiment(id: ExperimentId): Experiment {
    const e = this.experiments.get(id)
    if (!e) throw new Error('experiment not found: ' + id)
    if (e.status === 'running') return e
    e.status = 'running'
    e.startedAt = Date.now()
    return e
  }

  pauseExperiment(id: ExperimentId): Experiment {
    const e = this.experiments.get(id)
    if (!e) throw new Error('experiment not found')
    e.status = 'paused'
    return e
  }

  completeExperiment(id: ExperimentId): Experiment {
    const e = this.experiments.get(id)
    if (!e) throw new Error('experiment not found')
    e.status = 'completed'
    e.endedAt = Date.now()
    return e
  }

  updateVariants(id: ExperimentId, variants: Variant[]): Experiment {
    const e = this.experiments.get(id)
    if (!e) throw new Error('experiment not found')
    if (e.status === 'running') throw new Error('cannot update variants while running')
    e.variants = variants
    return e
  }

  removeExperiment(id: ExperimentId): boolean {
    this.assignments.forEach((_a, k) => { if (k.startsWith(id + '::')) this.assignments.delete(k) })
    return this.experiments.delete(id)
  }

  // ---- Assignment ----
  assign(userId: UserId, experimentId: ExperimentId): Assignment {
    const e = this.experiments.get(experimentId)
    if (!e) throw new Error('experiment not found: ' + experimentId)
    if (e.status !== 'running') throw new Error('experiment not running: ' + experimentId)
    const key = experimentId + '::' + userId
    if (this.config.enableAllocationCache) {
      const cached = this.assignments.get(key)
      if (cached) return cached
    }
    const bucket = this.bucket(userId, experimentId)
    let acc = 0
    const total = e.variants.reduce((s, v) => s + v.weight, 0)
    let chosen: VariantId = e.variants[0].id
    for (const v of e.variants) {
      acc += v.weight / total
      if (bucket < acc) { chosen = v.id; break }
    }
    const a: Assignment = { userId, experimentId, variantId: chosen, assignedAt: Date.now(), bucket }
    this.assignments.set(key, a)
    return a
  }

  getAssignment(userId: UserId, experimentId: ExperimentId): Assignment | undefined {
    return this.assignments.get(experimentId + '::' + userId)
  }

  isAssigned(userId: UserId, experimentId: ExperimentId): boolean {
    return this.assignments.has(experimentId + '::' + userId)
  }

  // ---- Exposure & metrics ----
  trackExposure(userId: UserId, experimentId: ExperimentId, metric: string, value = 1): Exposure {
    const a = this.assignments.get(experimentId + '::' + userId)
    if (!a) throw new Error('user not assigned: ' + userId)
    const exp: Exposure = {
      id: 'exp-' + this.exposures.length + '-' + Date.now().toString(36),
      userId,
      experimentId,
      variantId: a.variantId,
      metric,
      value,
      at: Date.now(),
    }
    this.exposures.push(exp)
    const k = experimentId + '::' + a.variantId + '::' + metric
    if (!this.metricValues.has(k)) this.metricValues.set(k, [])
    this.metricValues.get(k)!.push(value)
    if (!this.metricUniques.has(k)) this.metricUniques.set(k, new Set())
    this.metricUniques.get(k)!.add(userId)
    return exp
  }

  trackExposureBatch(items: { userId: UserId; experimentId: ExperimentId; metric: string; value?: number }[]): Exposure[] {
    return items.map(i => this.trackExposure(i.userId, i.experimentId, i.metric, i.value ?? 1))
  }

  // ---- Statistical analysis ----
  analyze(experimentId: ExperimentId, metric?: string): TestResult {
    const e = this.experiments.get(experimentId)
    if (!e) throw new Error('experiment not found')
    const m = metric ?? e.metric
    const variantStats: VariantStats[] = e.variants.map(v => this.variantStats(experimentId, v.id, m))
    const result: TestResult = {
      experimentId,
      metric: m,
      variants: variantStats,
      isSignificant: false,
      sampleSizeReached: variantStats.every(v => v.uniques >= this.config.minSamplePerVariant),
      recommendation: 'inconclusive',
    }
    const control = variantStats.find(v => e.variants.find(x => x.id === v.variantId)?.isControl) ?? variantStats[0]
    const treatment = variantStats.find(v => v.variantId !== control.variantId)
    if (treatment && result.sampleSizeReached) {
      const z = twoProportionZ(control, treatment)
      const p = twoTailedP(z.zScore)
      const lift = control.mean > 0 ? (treatment.mean - control.mean) / control.mean : 0
      result.zScore = z.zScore
      result.pValue = p
      result.lift = lift
      result.isSignificant = p < this.config.significanceLevel
      if (result.isSignificant) {
        result.winner = treatment.mean > control.mean ? treatment.variantId : control.variantId
        result.recommendation = 'declare_winner'
      } else {
        result.recommendation = Math.abs(lift) < 0.01 ? 'stop_no_effect' : 'continue'
      }
    }
    return result
  }

  variantStats(experimentId: ExperimentId, variantId: VariantId, metric: string): VariantStats {
    const k = experimentId + '::' + variantId + '::' + metric
    const values = this.metricValues.get(k) ?? []
    const uniques = this.metricUniques.get(k) ?? new Set<UserId>()
    const n = values.length
    const sum = values.reduce((s, v) => s + v, 0)
    const sumSq = values.reduce((s, v) => s + v * v, 0)
    const mean = n > 0 ? sum / n : 0
    const variance = n > 1 ? (sumSq - n * mean * mean) / (n - 1) : 0
    const std = Math.sqrt(Math.max(0, variance))
    return { variantId, exposures: n, uniques: uniques.size, sum, sumOfSquares: sumSq, mean, variance, std, conversionRate: mean }
  }

  // ---- Listing & introspection ----
  listExposures(filter?: { experimentId?: ExperimentId; variantId?: VariantId; metric?: string }): Exposure[] {
    let out = this.exposures
    if (filter?.experimentId) out = out.filter(e => e.experimentId === filter.experimentId)
    if (filter?.variantId) out = out.filter(e => e.variantId === filter.variantId)
    if (filter?.metric) out = out.filter(e => e.metric === filter.metric)
    return out
  }

  listAssignments(experimentId?: ExperimentId): Assignment[] {
    const all = [...this.assignments.values()]
    return experimentId ? all.filter(a => a.experimentId === experimentId) : all
  }

  countAssignments(): number {
    return this.assignments.size
  }

  countExposures(): number {
    return this.exposures.length
  }

  uptimeMs(): number {
    return Date.now() - this.startedAt
  }

  // ---- Deterministic bucketing ----
  private bucket(userId: UserId, experimentId: ExperimentId): number {
    const s = this.config.hashSalt + ':' + experimentId + ':' + userId
    let h = 2166136261
    for (let i = 0; i < s.length; i++) {
      h = (h ^ s.charCodeAt(i)) * 16777619
    }
    return ((h >>> 0) % 10_000) / 10_000
  }
}

const twoProportionZ = (a: VariantStats, b: VariantStats): { zScore: number } => {
  const p1 = a.mean
  const p2 = b.mean
  const n1 = a.exposures
  const n2 = b.exposures
  if (n1 < 2 || n2 < 2) return { zScore: 0 }
  const pooled = (p1 * n1 + p2 * n2) / (n1 + n2)
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
  if (se === 0) return { zScore: 0 }
  return { zScore: (p2 - p1) / se }
}

const twoTailedP = (z: number): number => {
  const x = Math.abs(z)
  const t = 1 / (1 + 0.2316419 * x)
  const d = 0.3989422804014327 * Math.exp(-x * x / 2)
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  return Math.min(1, Math.max(0, 2 * p))
}

let _framework: AbTestingFramework | null = null

export const getAbFramework = (config?: Partial<AbConfig>): AbTestingFramework => {
  if (!_framework) _framework = new AbTestingFramework(config)
  return _framework
}

export const resetAbFramework = (): void => {
  _framework = null
}
