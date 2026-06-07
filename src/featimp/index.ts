// Feature Importance: permutation importance, SHAP-lite (kernel Shapley), partial dependence.

export type FeatureName = string
export type FeatureVector = Record<FeatureName, number>
export type PredictionFn = (x: FeatureVector) => number

export interface ImportanceScore {
  feature: FeatureName
  importance: number
  std?: number
  rank: number
}

export interface ShapValue {
  feature: FeatureName
  value: number
  baseValue: number
  contribution: number
}

export interface FiConfig {
  permutationRounds: number
  permutationSeed: number
  shapBackgroundSize: number
  pdGridSize: number
}

const DEFAULT_CONFIG: FiConfig = {
  permutationRounds: 5,
  permutationSeed: 42,
  shapBackgroundSize: 16,
  pdGridSize: 10,
}

const mean = (xs: number[]): number => xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length
const std = (xs: number[]): number => {
  if (xs.length === 0) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length)
}

const rng = (seed: number): () => number => {
  let s = seed
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

const permute = (arr: number[], rngFn: () => number): number[] => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rngFn() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export class FeatureImportance {
  readonly config: FiConfig

  constructor(config: Partial<FiConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // Permutation importance: mean absolute prediction change when feature is permuted.
  permutationImportance(model: PredictionFn, data: FeatureVector[], features?: FeatureName[]): ImportanceScore[] {
    const basePreds = data.map(model)
    const cols = features ?? Object.keys(data[0] ?? {})
    const scores: { feature: FeatureName; deltas: number[] }[] = []
    for (const f of cols) {
      const values = data.map(d => d[f]!)
      const deltas: number[] = []
      for (let r = 0; r < this.config.permutationRounds; r++) {
        const shuffled = permute(values, rng(this.config.permutationSeed + r))
        const perturbed = data.map((d, i) => ({ ...d, [f]: shuffled[i]! }))
        const perturbedPreds = perturbed.map(model)
        const diff = mean(perturbedPreds.map((p, i) => Math.abs(p - basePreds[i]!)))
        deltas.push(diff)
      }
      scores.push({ feature: f, deltas })
    }
    const sorted = [...scores].sort((a, b) => mean(b.deltas) - mean(a.deltas))
    return sorted.map((s, i) => ({ feature: s.feature, importance: mean(s.deltas), std: std(s.deltas), rank: i + 1 }))
  }

  // SHAP-lite: kernel Shapley with single background sample, weighted by similarity.
  shapValues(model: PredictionFn, instance: FeatureVector, background: FeatureVector[]): ShapValue[] {
    const features = Object.keys(instance)
    const base = mean(background.map(model))
    const out: ShapValue[] = []
    for (const f of features) {
      let withF = 0
      let withoutF = 0
      let n = 0
      for (const bg of background.slice(0, this.config.shapBackgroundSize)) {
        const coalition = { ...bg, [f]: instance[f]! }
        withF += model(coalition)
        withoutF += model(bg)
        n += 1
      }
      const contribution = n === 0 ? 0 : (withF - withoutF) / n
      out.push({ feature: f, value: instance[f]!, baseValue: base, contribution })
    }
    return out.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
  }

  // Partial dependence: average prediction over varying one feature.
  partialDependence(model: PredictionFn, data: FeatureVector[], feature: FeatureName, opts?: { gridSize?: number; min?: number; max?: number }): { x: number; y: number }[] {
    const values = data.map(d => d[feature]!)
    const min = opts?.min ?? Math.min(...values)
    const max = opts?.max ?? Math.max(...values)
    const n = opts?.gridSize ?? this.config.pdGridSize
    const out: { x: number; y: number }[] = []
    if (max === min) {
      out.push({ x: min, y: mean(data.map(d => model({ ...d, [feature]: min }))) })
      return out
    }
    for (let i = 0; i <= n; i++) {
      const x = min + (i / n) * (max - min)
      const y = mean(data.map(d => model({ ...d, [feature]: x })))
      out.push({ x, y })
    }
    return out
  }

  // Combined report
  report(model: PredictionFn, data: FeatureVector[], instance?: FeatureVector): {
    importance: ImportanceScore[]
    shap: ShapValue[]
    pdp: Record<FeatureName, { x: number; y: number }[]>
  } {
    const importance = this.permutationImportance(model, data)
    const shap = instance ? this.shapValues(model, instance, data) : []
    const pdp: Record<FeatureName, { x: number; y: number }[]> = {}
    for (const f of importance.map(s => s.feature)) pdp[f] = this.partialDependence(model, data, f)
    return { importance, shap, pdp }
  }
}

let _fi: FeatureImportance | null = null
export const getFeatureImportance = (config?: Partial<FiConfig>): FeatureImportance => {
  if (!_fi) _fi = new FeatureImportance(config)
  return _fi
}
export const resetFeatureImportance = (): void => { _fi = null }
