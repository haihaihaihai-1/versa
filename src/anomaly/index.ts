// Anomaly Detection: z-score, MAD, IQR, isolation forest (lite), rolling window detectors, alerting.

export type DetectorMethod = 'zscore' | 'mad' | 'iqr' | 'isolation_forest' | 'moving_avg'
export type Severity = 'ok' | 'minor' | 'major' | 'critical'

export interface AnomalyAlert {
  id: string
  series: string
  index: number
  value: number
  score: number
  method: DetectorMethod
  severity: Severity
  expectedRange: { low: number; high: number }
  at: number
  context?: Record<string, unknown>
}

export interface AnomalyConfig {
  zScoreThreshold: number
  madThreshold: number
  iqrMultiplier: number
  iforestTrees: number
  iforestSampleSize: number
  iforestThreshold: number
  movingAvgWindow: number
  movingAvgDeviation: number
  enableHistory: boolean
  maxHistory: number
}

const DEFAULT_CONFIG: AnomalyConfig = {
  zScoreThreshold: 3,
  madThreshold: 3.5,
  iqrMultiplier: 1.5,
  iforestTrees: 50,
  iforestSampleSize: 64,
  iforestThreshold: 0.6,
  movingAvgWindow: 20,
  movingAvgDeviation: 3,
  enableHistory: true,
  maxHistory: 5000,
}

export interface SeriesStats {
  count: number
  mean: number
  std: number
  median: number
  min: number
  max: number
  q1: number
  q3: number
  iqr: number
  mad: number
}

export interface DetectorStats {
  seriesCount: number
  totalObservations: number
  alertsByMethod: Record<DetectorMethod, number>
  alertsBySeverity: Record<Severity, number>
  alertRate: number
}

export class AnomalyDetector {
  readonly config: AnomalyConfig
  private series: Map<string, number[]> = new Map()
  private alerts: AnomalyAlert[] = []
  private alertIdCounter = 0
  private startedAt = Date.now()

  constructor(config: Partial<AnomalyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ---- Series management ----
  push(series: string, value: number, methods: DetectorMethod[] = ['zscore', 'mad', 'iqr']): AnomalyAlert | null {
    if (!this.series.has(series)) this.series.set(series, [])
    const arr = this.series.get(series)!
    arr.push(value)
    if (this.config.enableHistory && arr.length > this.config.maxHistory) arr.shift()
    return this.evaluate(series, value, arr.length - 1, methods)
  }

  pushBatch(series: string, values: number[], methods: DetectorMethod[] = ['zscore', 'mad', 'iqr']): (AnomalyAlert | null)[] {
    return values.map(v => this.push(series, v, methods))
  }

  getSeries(name: string): number[] {
    return [...(this.series.get(name) ?? [])]
  }

  listSeries(): string[] {
    return [...this.series.keys()]
  }

  resetSeries(name: string): void {
    this.series.set(name, [])
  }

  // ---- Statistics ----
  stats(name: string): SeriesStats | null {
    const arr = this.series.get(name)
    if (!arr || arr.length === 0) return null
    return computeStats(arr)
  }

  // ---- Detection methods ----
  zscore(name: string, value: number, idx?: number): { score: number; isAnomaly: boolean; threshold: number; range: { low: number; high: number } } {
    const arr = this.series.get(name) ?? []
    const use = idx !== undefined ? arr.slice(0, idx) : arr
    if (use.length < 2) return { score: 0, isAnomaly: false, threshold: this.config.zScoreThreshold, range: { low: 0, high: 0 } }
    const s = computeStats(use)
    const z = s.std > 0 ? (value - s.mean) / s.std : 0
    return { score: Math.abs(z), isAnomaly: Math.abs(z) > this.config.zScoreThreshold, threshold: this.config.zScoreThreshold, range: { low: s.mean - this.config.zScoreThreshold * s.std, high: s.mean + this.config.zScoreThreshold * s.std } }
  }

  mad(name: string, value: number, idx?: number): { score: number; isAnomaly: boolean; threshold: number; range: { low: number; high: number } } {
    const arr = this.series.get(name) ?? []
    const use = idx !== undefined ? arr.slice(0, idx) : arr
    if (use.length < 2) return { score: 0, isAnomaly: false, threshold: this.config.madThreshold, range: { low: 0, high: 0 } }
    const s = computeStats(use)
    const z = s.mad > 0 ? 0.6745 * (value - s.median) / s.mad : 0
    return { score: Math.abs(z), isAnomaly: Math.abs(z) > this.config.madThreshold, threshold: this.config.madThreshold, range: { low: s.median - (this.config.madThreshold / 0.6745) * s.mad, high: s.median + (this.config.madThreshold / 0.6745) * s.mad } }
  }

  iqr(name: string, value: number, idx?: number): { score: number; isAnomaly: boolean; threshold: number; range: { low: number; high: number } } {
    const arr = this.series.get(name) ?? []
    const use = idx !== undefined ? arr.slice(0, idx) : arr
    if (use.length < 4) return { score: 0, isAnomaly: false, threshold: this.config.iqrMultiplier, range: { low: 0, high: 0 } }
    const s = computeStats(use)
    const low = s.q1 - this.config.iqrMultiplier * s.iqr
    const high = s.q3 + this.config.iqrMultiplier * s.iqr
    const isAnomaly = value < low || value > high
    const score = isAnomaly ? (value < low ? (s.q1 - value) / s.iqr : (value - s.q3) / s.iqr) : 0
    return { score: Math.abs(score), isAnomaly, threshold: this.config.iqrMultiplier, range: { low, high } }
  }

  movingAvg(name: string, value: number, idx?: number): { score: number; isAnomaly: boolean; threshold: number; range: { low: number; high: number } } {
    const arr = this.series.get(name) ?? []
    const use = idx !== undefined ? arr.slice(0, idx) : arr
    const w = this.config.movingAvgWindow
    if (use.length < w) return { score: 0, isAnomaly: false, threshold: this.config.movingAvgDeviation, range: { low: 0, high: 0 } }
    const window = use.slice(-w)
    const mean = window.reduce((s, v) => s + v, 0) / w
    const std = Math.sqrt(window.reduce((s, v) => s + (v - mean) ** 2, 0) / w)
    const z = std > 0 ? (value - mean) / std : 0
    return { score: Math.abs(z), isAnomaly: Math.abs(z) > this.config.movingAvgDeviation, threshold: this.config.movingAvgDeviation, range: { low: mean - this.config.movingAvgDeviation * std, high: mean + this.config.movingAvgDeviation * std } }
  }

  isolationForest(name: string, value: number, idx?: number): { score: number; isAnomaly: boolean; threshold: number; range: { low: number; high: number } } {
    const arr = this.series.get(name) ?? []
    const use = idx !== undefined ? arr.slice(0, idx + 1) : arr
    if (use.length < 4) return { score: 0, isAnomaly: false, threshold: this.config.iforestThreshold, range: { low: 0, high: 0 } }
    const sample = use.length > this.config.iforestSampleSize ? use.slice(-this.config.iforestSampleSize) : use
    const allVals = [...sample, value]
    const min = Math.min(...allVals)
    const max = Math.max(...allVals)
    const range = max - min || 1
    const points = sample.map(v => [(v - min) / range])
    const target = [(value - min) / range]
    let avgPath = 0
    for (let t = 0; t < this.config.iforestTrees; t++) {
      avgPath += isolationPath(points, target[0], t)
    }
    avgPath /= this.config.iforestTrees
    const c = expectedPathLength(sample.length)
    const score = c > 0 ? Math.pow(2, -avgPath / c) : 0
    return { score, isAnomaly: score > this.config.iforestThreshold, threshold: this.config.iforestThreshold, range: { low: min, high: max } }
  }

  // ---- Evaluation ----
  evaluate(series: string, value: number, idx: number, methods: DetectorMethod[] = ['zscore', 'mad', 'iqr']): AnomalyAlert | null {
    const detectors: { method: DetectorMethod; result: { score: number; isAnomaly: boolean; range: { low: number; high: number } } }[] = []
    for (const m of methods) {
      let r: { score: number; isAnomaly: boolean; range: { low: number; high: number } }
      if (m === 'zscore') r = this.zscore(series, value, idx)
      else if (m === 'mad') r = this.mad(series, value, idx)
      else if (m === 'iqr') r = this.iqr(series, value, idx)
      else if (m === 'moving_avg') r = this.movingAvg(series, value, idx)
      else r = this.isolationForest(series, value, idx)
      detectors.push({ method: m, result: r })
    }
    const fired = detectors.filter(d => d.result.isAnomaly)
    if (fired.length === 0) return null
    const best = fired.reduce((a, b) => (a.result.score > b.result.score ? a : b))
    const sev = this.classifySeverity(best.result.score)
    const alert: AnomalyAlert = {
      id: 'anom-' + (++this.alertIdCounter) + '-' + Date.now().toString(36),
      series,
      index: idx,
      value,
      score: best.result.score,
      method: best.method,
      severity: sev,
      expectedRange: best.result.range,
      at: Date.now(),
      context: { fired: fired.map(f => f.method) },
    }
    this.alerts.push(alert)
    return alert
  }

  classifySeverity(score: number): Severity {
    if (score >= 8) return 'critical'
    if (score >= 5) return 'major'
    if (score >= 3) return 'minor'
    return 'ok'
  }

  // ---- Alerts ----
  listAlerts(filter?: { series?: string; severity?: Severity; method?: DetectorMethod }): AnomalyAlert[] {
    let out = this.alerts
    if (filter?.series) out = out.filter(a => a.series === filter.series)
    if (filter?.severity) out = out.filter(a => a.severity === filter.severity)
    if (filter?.method) out = out.filter(a => a.method === filter.method)
    return out
  }

  countAlerts(): number {
    return this.alerts.length
  }

  clearAlerts(): void {
    this.alerts = []
  }

  // ---- Stats ----
  stats_view(): DetectorStats {
    const total = this.alerts.length
    const byMethod: Record<DetectorMethod, number> = { zscore: 0, mad: 0, iqr: 0, isolation_forest: 0, moving_avg: 0 }
    const bySeverity: Record<Severity, number> = { ok: 0, minor: 0, major: 0, critical: 0 }
    for (const a of this.alerts) {
      byMethod[a.method] = (byMethod[a.method] ?? 0) + 1
      bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1
    }
    const totalObs = [...this.series.values()].reduce((s, v) => s + v.length, 0)
    return {
      seriesCount: this.series.size,
      totalObservations: totalObs,
      alertsByMethod: byMethod,
      alertsBySeverity: bySeverity,
      alertRate: totalObs === 0 ? 0 : total / totalObs,
    }
  }

  uptimeMs(): number {
    return Date.now() - this.startedAt
  }
}

const computeStats = (arr: number[]): SeriesStats => {
  const sorted = [...arr].sort((a, b) => a - b)
  const n = sorted.length
  const sum = arr.reduce((s, v) => s + v, 0)
  const mean = sum / n
  const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, n - 1)
  const std = Math.sqrt(variance)
  const q = (p: number): number => {
    const idx = Math.min(n - 1, Math.floor(p * n))
    return sorted[idx]
  }
  const q1 = q(0.25)
  const median = q(0.5)
  const q3 = q(0.75)
  const iqr = q3 - q1
  const abs = arr.map(v => Math.abs(v - median)).sort((a, b) => a - b)
  const mad = abs[Math.floor(abs.length / 2)] ?? 0
  return { count: n, mean, std, median, min: sorted[0], max: sorted[n - 1], q1, q3, iqr, mad }
}

const isolationPath = (points: number[][], target: number, seed: number): number => {
  let rng = seed * 9301 + 49297
  const rand = (): number => {
    rng = (rng * 9301 + 49297) % 233280
    return rng / 233280
  }
  const current = target
  let depth = 0
  const maxDepth = Math.ceil(Math.log2(Math.max(2, points.length)))
  while (depth < maxDepth) {
    const min = Math.min(...points.map(p => p[0]))
    const max = Math.max(...points.map(p => p[0]))
    if (max - min < 1e-9) return depth
    const split = min + rand() * (max - min)
    if (current < split) {
      points = points.filter(p => p[0] < split)
    } else {
      points = points.filter(p => p[0] >= split)
    }
    depth += 1
  }
  return depth
}

const expectedPathLength = (n: number): number => {
  if (n <= 1) return 0
  const gamma = 0.5772156649
  return 2 * (Math.log(n - 1) + gamma) - 2 * (n - 1) / n
}

let _detector: AnomalyDetector | null = null

export const getAnomalyDetector = (config?: Partial<AnomalyConfig>): AnomalyDetector => {
  if (!_detector) _detector = new AnomalyDetector(config)
  return _detector
}

export const resetAnomalyDetector = (): void => {
  _detector = null
}
