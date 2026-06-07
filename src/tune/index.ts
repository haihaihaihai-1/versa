// Hyperparameter Tuning: search spaces, trials, grid/random/bayesian-lite, early stopping.

export type ParamValue = number | string | boolean
export type ParamDomain =
  | { type: 'int'; min: number; max: number; step?: number }
  | { type: 'float'; min: number; max: number; log?: boolean }
  | { type: 'categorical'; values: ParamValue[] }

export type SearchSpace = Record<string, ParamDomain>

export type TrialParams = Record<string, ParamValue>

export interface TrialResult {
  id: string
  params: TrialParams
  score: number
  metrics: Record<string, number>
  status: 'pending' | 'running' | 'completed' | 'pruned' | 'failed'
  durationMs: number
  startedAt: number
  finishedAt?: number
}

export type Sampler = 'grid' | 'random' | 'bayesian'
export type Objective = (params: TrialParams) => Promise<number> | number

export interface TuningConfig {
  sampler: Sampler
  maxTrials: number
  earlyStoppingRounds?: number
  seed: number
  explorationWeight: number
  direction: 'maximize' | 'minimize'
  timeoutMs?: number
}

const DEFAULT_CONFIG: TuningConfig = {
  sampler: 'random',
  maxTrials: 20,
  seed: 42,
  explorationWeight: 1.5,
  direction: 'maximize',
}

export const sampleValue = (domain: ParamDomain, rng: () => number): ParamValue => {
  if (domain.type === 'int') {
    const step = domain.step ?? 1
    const span = Math.floor((domain.max - domain.min) / step)
    return domain.min + Math.floor(rng() * (span + 1)) * step
  }
  if (domain.type === 'float') {
    if (domain.log) return Math.exp(Math.log(domain.min) + rng() * (Math.log(domain.max) - Math.log(domain.min)))
    return domain.min + rng() * (domain.max - domain.min)
  }
  return domain.values[Math.floor(rng() * domain.values.length)]!
}

export const gridSamples = (space: SearchSpace): TrialParams[] => {
  const keys = Object.keys(space)
  if (keys.length === 0) return [{}]
  const out: TrialParams[] = [{}]
  for (const k of keys) {
    const d = space[k]!
    const next: TrialParams[] = []
    if (d.type === 'int') {
      const step = d.step ?? 1
      for (let v = d.min; v <= d.max; v += step) for (const o of out) next.push({ ...o, [k]: v })
    } else if (d.type === 'float') {
      for (let i = 0; i <= 5; i++) {
        const v = d.min + (i / 5) * (d.max - d.min)
        for (const o of out) next.push({ ...o, [k]: v })
      }
    } else {
      for (const v of d.values) for (const o of out) next.push({ ...o, [k]: v })
    }
    out.splice(0, out.length, ...next)
  }
  return out
}

export class Tuner {
  readonly config: TuningConfig
  private space: SearchSpace
  private trials: TrialResult[] = []
  private bestScore = -Infinity
  private bestParams: TrialParams | null = null
  private rngState: number

  constructor(space: SearchSpace, config: Partial<TuningConfig> = {}) {
    this.space = space
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.rngState = this.config.seed
  }

  private rand(): number {
    this.rngState = (this.rngState * 9301 + 49297) % 233280
    return this.rngState / 233280
  }

  trialsCompleted(): TrialResult[] {
    return this.trials.filter(t => t.status === 'completed' || t.status === 'pruned')
  }

  best(): TrialResult | null {
    return this.trials.length === 0 ? null : this.trials.reduce((a, b) => this.better(a, b) ? a : b, this.trials[0]!)
  }

  private better(a: TrialResult, b: TrialResult): boolean {
    if (a.status !== 'completed' && b.status !== 'completed') return false
    if (a.status !== 'completed') return false
    if (b.status !== 'completed') return true
    return this.config.direction === 'maximize' ? a.score > b.score : a.score < b.score
  }

  private suggestRandom(): TrialParams {
    const out: TrialParams = {}
    const rng = (): number => this.rand()
    for (const k of Object.keys(this.space)) out[k] = sampleValue(this.space[k]!, rng)
    return out
  }

  // Bayesian-lite: pick top-K trials by score, sample around best param values.
  private suggestBayesian(): TrialParams {
    const completed = this.trialsCompleted()
    if (completed.length === 0) return this.suggestRandom()
    const completedSorted = [...completed].sort((a, b) => this.config.direction === 'maximize' ? b.score - a.score : a.score - b.score)
    const best = completedSorted[0]!
    const out: TrialParams = { ...best.params }
    for (const k of Object.keys(this.space)) {
      if (this.rand() < 0.5) {
        const d = this.space[k]!
        if (d.type === 'int' || d.type === 'float') {
          const span = (d.max - d.min) * 0.2
          const center = Number(best.params[k])
          let n = center + (this.rand() - 0.5) * 2 * span
          if (d.type === 'int') n = Math.round(n)
          n = Math.max(d.min, Math.min(d.max, n))
          out[k] = n
        } else {
          out[k] = d.values[Math.floor(this.rand() * d.values.length)]!
        }
      }
    }
    return out
  }

  private shouldEarlyStop(): boolean {
    if (!this.config.earlyStoppingRounds) return false
    const completed = this.trialsCompleted()
    if (completed.length < this.config.earlyStoppingRounds) return false
    const sorted = [...completed].sort((a, b) => this.config.direction === 'maximize' ? b.score - a.score : a.score - b.score)
    const headBest = sorted[0]!.score
    const bestIdx = completed.findIndex(t => t.score === headBest)
    if (bestIdx < 0) return false
    return bestIdx + this.config.earlyStoppingRounds <= completed.length
  }

  async tune(objective: Objective): Promise<{ best: TrialResult | null; trials: TrialResult[] }> {
    this.trials = []
    this.bestScore = this.config.direction === 'maximize' ? -Infinity : Infinity
    this.bestParams = null
    let candidates: TrialParams[]
    if (this.config.sampler === 'grid') candidates = gridSamples(this.space)
    else if (this.config.sampler === 'bayesian') candidates = Array.from({ length: this.config.maxTrials }, () => this.suggestBayesian())
    else candidates = Array.from({ length: this.config.maxTrials }, () => this.suggestRandom())
    const cap = Math.min(candidates.length, this.config.maxTrials)
    for (let i = 0; i < cap; i++) {
      this.trials.push({ id: `t${i}`, params: candidates[i]!, score: 0, metrics: {}, status: 'pending', durationMs: 0, startedAt: Date.now() })
    }
    for (let i = 0; i < cap; i++) {
      const trial = this.trials[i]!
      trial.status = 'running'
      try {
        const start = Date.now()
        const score = await objective(trial.params)
        trial.durationMs = Date.now() - start
        trial.finishedAt = Date.now()
        trial.score = score
        trial.metrics = { score }
        trial.status = 'completed'
        if (this.config.direction === 'maximize' ? score > this.bestScore : score < this.bestScore) {
          this.bestScore = score
          this.bestParams = trial.params
        }
      } catch {
        trial.status = 'failed'
        trial.finishedAt = Date.now()
      }
      if (this.shouldEarlyStop()) {
        for (let j = i + 1; j < cap; j++) this.trials[j]!.status = 'pruned'
        break
      }
    }
    return { best: this.best(), trials: this.trials }
  }
}

let _tuner: Tuner | null = null
export const getTuner = (space?: SearchSpace, config?: Partial<TuningConfig>): Tuner => {
  if (!_tuner && space) _tuner = new Tuner(space, config)
  if (!_tuner) throw new Error('getTuner requires space on first call')
  return _tuner
}
export const resetTuner = (): void => { _tuner = null }
