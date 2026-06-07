// Drift Detection: data drift (PSI/KS/ChiSquare/JS), prediction drift, severity classification and alerting.

export type FeatureType = 'numeric' | 'categorical'
export type DriftMetric = 'psi' | 'ks' | 'chi_square' | 'js_divergence'
export type Severity = 'ok' | 'minor' | 'major' | 'critical'

export interface NumericDistribution {
  type: 'numeric'
  histogram: { binStart: number; binEnd: number; count: number; prob: number }[]
  min: number
  max: number
  mean: number
  std: number
  n: number
  binWidth: number
}

export interface CategoricalDistribution {
  type: 'categorical'
  counts: Record<string, number>
  probs: Record<string, number>
  n: number
  categories: string[]
}

export type Distribution = NumericDistribution | CategoricalDistribution

export interface FeatureSnapshot {
  featureName: string
  featureType: FeatureType
  reference: Distribution
  current: Distribution
  computedAt: number
}

export interface DriftResult {
  featureName: string
  metric: DriftMetric
  score: number
  threshold: number
  severity: Severity
  isDrift: boolean
  details?: string
  computedAt: number
}

export interface DriftAlert {
  id: string
  featureName: string
  severity: Severity
  metric: DriftMetric
  score: number
  threshold: number
  message: string
  raisedAt: number
  acknowledged: boolean
  acknowledgedAt?: number
  acknowledgedBy?: string
}

export interface DriftMonitorConfig {
  psiThresholds: { minor: number; major: number; critical: number }
  ksThreshold: number
  chiSquareThreshold: number
  jsDivergenceThreshold: number
  defaultBins: number
  smoothingEpsilon: number
}

const DEFAULT_CONFIG: DriftMonitorConfig = {
  psiThresholds: { minor: 0.1, major: 0.2, critical: 0.3 },
  ksThreshold: 0.1,
  chiSquareThreshold: 0.05,
  jsDivergenceThreshold: 0.1,
  defaultBins: 10,
  smoothingEpsilon: 1e-6,
}

let _alertCounter = 0
const newAlertId = () => 'alert_' + Date.now().toString(36) + '_' + (++_alertCounter).toString(36).padStart(3, '0')

export const severityFromScore = (score: number, thresholds: { minor: number; major: number; critical: number }): Severity => {
  if (score >= thresholds.critical) return 'critical'
  if (score >= thresholds.major) return 'major'
  if (score >= thresholds.minor) return 'minor'
  return 'ok'
}

export class DriftMonitor {
  private snapshots = new Map<string, FeatureSnapshot>()
  private alerts: DriftAlert[] = []
  private config: DriftMonitorConfig

  constructor(config: Partial<DriftMonitorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config, psiThresholds: { ...DEFAULT_CONFIG.psiThresholds, ...(config.psiThresholds ?? {}) } }
  }

  updateConfig(patch: Partial<DriftMonitorConfig>): void {
    this.config = { ...this.config, ...patch, psiThresholds: { ...this.config.psiThresholds, ...(patch.psiThresholds ?? {}) } }
  }

  getConfig(): DriftMonitorConfig {
    return { ...this.config, psiThresholds: { ...this.config.psiThresholds } }
  }

  // ---- Distribution building ----
  buildNumericDistribution(values: number[], binCount?: number): NumericDistribution {
    const n = values.length
    if (n === 0) return { type: 'numeric', histogram: [], min: 0, max: 0, mean: 0, std: 0, n: 0, binWidth: 1 }
    const sorted = [...values].sort((a, b) => a - b)
    const min = sorted[0]
    const max = sorted[n - 1]
    const mean = values.reduce((s, v) => s + v, 0) / n
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n
    const std = Math.sqrt(variance)
    const bins = binCount ?? this.config.defaultBins
    const binWidth = max === min ? 1 : (max - min) / bins
    const histogram: { binStart: number; binEnd: number; count: number; prob: number }[] = Array.from({ length: bins }, (_, i) => ({
      binStart: min + i * binWidth,
      binEnd: min + (i + 1) * binWidth,
      count: 0,
      prob: 0,
    }))
    for (const v of values) {
      let idx = Math.floor((v - min) / binWidth)
      if (idx >= bins) idx = bins - 1
      if (idx < 0) idx = 0
      histogram[idx].count += 1
    }
    for (const h of histogram) h.prob = h.count / n
    return { type: 'numeric', histogram, min, max, mean, std, n, binWidth }
  }

  buildCategoricalDistribution(values: string[]): CategoricalDistribution {
    const n = values.length
    const counts: Record<string, number> = {}
    for (const v of values) counts[v] = (counts[v] ?? 0) + 1
    const probs: Record<string, number> = {}
    for (const k of Object.keys(counts)) probs[k] = counts[k] / n
    return { type: 'categorical', counts, probs, n, categories: Object.keys(counts).sort() }
  }

  // ---- Snapshot management ----
  setReference(featureName: string, featureType: FeatureType, values: number[] | string[]): void {
    const existing = this.snapshots.get(featureName)
    if (featureType === 'numeric') {
      const dist = this.buildNumericDistribution(values as number[])
      if (existing) {
        existing.reference = dist
        existing.featureType = featureType
        existing.computedAt = Date.now()
        if (existing.current.type === 'numeric') {
          existing.current = this.rebucketNumeric(existing.current as NumericDistribution, dist.histogram.map(h => [h.binStart, h.binEnd] as [number, number]))
        }
      } else {
        this.snapshots.set(featureName, { featureName, featureType, reference: dist, current: dist, computedAt: Date.now() })
      }
    } else {
      const dist = this.buildCategoricalDistribution(values as string[])
      if (existing) {
        existing.reference = dist
        existing.featureType = featureType
        existing.computedAt = Date.now()
      } else {
        this.snapshots.set(featureName, { featureName, featureType, reference: dist, current: dist, computedAt: Date.now() })
      }
    }
  }

  setCurrent(featureName: string, featureType: FeatureType, values: number[] | string[]): void {
    const existing = this.snapshots.get(featureName)
    if (featureType === 'numeric') {
      let dist: NumericDistribution
      if (existing && existing.reference.type === 'numeric') {
        const refBins = (existing.reference as NumericDistribution).histogram
        dist = this.rebucketValues(values as number[], refBins.map(h => [h.binStart, h.binEnd] as [number, number]))
      } else {
        dist = this.buildNumericDistribution(values as number[])
      }
      if (existing) {
        existing.current = dist
        existing.featureType = featureType
        existing.computedAt = Date.now()
      } else {
        this.snapshots.set(featureName, { featureName, featureType, reference: dist, current: dist, computedAt: Date.now() })
      }
    } else {
      const dist = this.buildCategoricalDistribution(values as string[])
      if (existing) {
        existing.current = dist
        existing.featureType = featureType
        existing.computedAt = Date.now()
      } else {
        this.snapshots.set(featureName, { featureName, featureType, reference: dist, current: dist, computedAt: Date.now() })
      }
    }
  }

  private rebucketValues(values: number[], bins: [number, number][]): NumericDistribution {
    const n = values.length
    const histogram = bins.map(([binStart, binEnd]) => ({ binStart, binEnd, count: 0, prob: 0 }))
    for (const v of values) {
      let idx = bins.findIndex(([s, e]) => v >= s && v < e)
      if (idx < 0) {
        if (v >= bins[bins.length - 1][1]) idx = bins.length - 1
        else if (v < bins[0][0]) idx = 0
      }
      if (idx >= 0) histogram[idx].count += 1
    }
    for (const h of histogram) h.prob = h.count / Math.max(n, 1)
    const min = values.length === 0 ? 0 : Math.min(...values)
    const max = values.length === 0 ? 0 : Math.max(...values)
    const mean = values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / n
    const std = values.length === 0 ? 0 : Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n)
    return { type: 'numeric', histogram, min, max, mean, std, n, binWidth: bins[0] ? bins[0][1] - bins[0][0] : 1 }
  }

  private rebucketNumeric(distribution: NumericDistribution, bins: [number, number][]): NumericDistribution {
    const n = distribution.n
    const newHist = bins.map(([binStart, binEnd]) => ({ binStart, binEnd, count: 0, prob: 0 }))
    for (const old of distribution.histogram) {
      const oldMid = (old.binStart + old.binEnd) / 2
      const idx = bins.findIndex(([s, e]) => oldMid >= s && oldMid < e)
      if (idx >= 0) newHist[idx].count += old.count
    }
    for (const h of newHist) h.prob = h.count / Math.max(n, 1)
    return { type: 'numeric', histogram: newHist, min: bins[0][0], max: bins[bins.length - 1][1], mean: distribution.mean, std: distribution.std, n, binWidth: bins[0] ? bins[0][1] - bins[0][0] : 1 }
  }

  getSnapshot(featureName: string): FeatureSnapshot | undefined {
    return this.snapshots.get(featureName)
  }

  listSnapshots(): FeatureSnapshot[] {
    return Array.from(this.snapshots.values())
  }

  removeSnapshot(featureName: string): boolean {
    return this.snapshots.delete(featureName)
  }

  // ---- PSI (Population Stability Index) ----
  computePSI(reference: Distribution, current: Distribution): number {
    const eps = this.config.smoothingEpsilon
    if (reference.type === 'numeric' && current.type === 'numeric') {
      const refBins = reference.histogram
      const curBins = current.histogram
      if (refBins.length !== curBins.length) throw new Error('PSI requires histograms with same number of bins')
      let psi = 0
      for (let i = 0; i < refBins.length; i++) {
        const p = Math.max(refBins[i].prob, eps)
        const q = Math.max(curBins[i].prob, eps)
        psi += (p - q) * Math.log(p / q)
      }
      return psi
    }
    if (reference.type === 'categorical' && current.type === 'categorical') {
      const allKeys = new Set([...reference.categories, ...current.categories])
      let psi = 0
      for (const k of allKeys) {
        const p = Math.max(reference.probs[k] ?? 0, eps)
        const q = Math.max(current.probs[k] ?? 0, eps)
        psi += (p - q) * Math.log(p / q)
      }
      return psi
    }
    throw new Error('PSI requires same type distributions')
  }

  // ---- KS statistic (numeric only) ----
  computeKS(reference: NumericDistribution, current: NumericDistribution): { statistic: number; pValueApprox: number } {
    const refCdf: number[] = []
    let acc = 0
    for (const b of reference.histogram) { acc += b.prob; refCdf.push(acc) }
    const curCdf: number[] = []
    acc = 0
    for (const b of current.histogram) { acc += b.prob; curCdf.push(acc) }
    let maxDiff = 0
    for (let i = 0; i < refCdf.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(refCdf[i] - curCdf[i]))
    }
    const ne = Math.sqrt((reference.n * current.n) / (reference.n + current.n))
    const pValueApprox = Math.exp(-2 * (ne * maxDiff) ** 2)
    return { statistic: maxDiff, pValueApprox }
  }

  // ---- Chi-square (categorical) ----
  computeChiSquare(reference: CategoricalDistribution, current: CategoricalDistribution): { statistic: number; pValueApprox: number; dof: number } {
    const allKeys = new Set([...reference.categories, ...current.categories])
    let stat = 0
    const eps = this.config.smoothingEpsilon
    for (const k of allKeys) {
      const expected = (reference.probs[k] ?? 0) * current.n
      const observed = current.counts[k] ?? 0
      const denom = Math.max(expected, eps)
      stat += (observed - expected) ** 2 / denom
    }
    const dof = allKeys.size - 1
    const pValueApprox = Math.exp(-stat / 2)
    return { statistic: stat, pValueApprox, dof }
  }

  // ---- JS divergence (symmetric KL) ----
  computeJSDivergence(reference: Distribution, current: Distribution): number {
    const eps = this.config.smoothingEpsilon
    if (reference.type !== current.type) throw new Error('JSD requires same type distributions')
    if (reference.type === 'numeric') {
      const refNum = reference as NumericDistribution
      const curNum = current as NumericDistribution
      let jsd = 0
      for (let i = 0; i < refNum.histogram.length; i++) {
        const p = Math.max(refNum.histogram[i].prob, eps)
        const q = Math.max(curNum.histogram[i].prob, eps)
        const m = (p + q) / 2
        jsd += 0.5 * p * Math.log(p / m) + 0.5 * q * Math.log(q / m)
      }
      return jsd
    }
    const refCat = reference as CategoricalDistribution
    const curCat = current as CategoricalDistribution
    const allKeys = new Set([...refCat.categories, ...curCat.categories])
    let jsd = 0
    for (const k of allKeys) {
      const p = Math.max(refCat.probs[k] ?? 0, eps)
      const q = Math.max(curCat.probs[k] ?? 0, eps)
      const m = (p + q) / 2
      jsd += 0.5 * p * Math.log(p / m) + 0.5 * q * Math.log(q / m)
    }
    return jsd
  }

  // ---- Detection ----
  detectDrift(snapshot: FeatureSnapshot, metric?: DriftMetric): DriftResult {
    const m = metric ?? (snapshot.featureType === 'numeric' ? 'psi' : 'psi')
    let score: number
    let threshold: number
    let details: string | undefined
    if (m === 'psi') {
      score = this.computePSI(snapshot.reference, snapshot.current)
      threshold = this.config.psiThresholds.minor
      const sev = severityFromScore(score, this.config.psiThresholds)
      return { featureName: snapshot.featureName, metric: m, score, threshold, severity: sev, isDrift: sev !== 'ok', computedAt: Date.now() }
    }
    if (m === 'ks') {
      if (snapshot.reference.type !== 'numeric' || snapshot.current.type !== 'numeric') {
        throw new Error('KS requires numeric distributions')
      }
      const r = this.computeKS(snapshot.reference, snapshot.current)
      score = r.statistic
      threshold = this.config.ksThreshold
      const sev: Severity = score >= threshold * 2 ? 'critical' : score >= threshold ? 'major' : score >= threshold / 2 ? 'minor' : 'ok'
      details = 'p~' + r.pValueApprox.toFixed(4)
      return { featureName: snapshot.featureName, metric: m, score, threshold, severity: sev, isDrift: sev !== 'ok', details, computedAt: Date.now() }
    }
    if (m === 'chi_square') {
      if (snapshot.reference.type !== 'categorical' || snapshot.current.type !== 'categorical') {
        throw new Error('chi_square requires categorical distributions')
      }
      const r = this.computeChiSquare(snapshot.reference, snapshot.current)
      score = r.statistic
      threshold = this.config.chiSquareThreshold
      const sev: Severity = score >= 20 ? 'critical' : score >= 10 ? 'major' : score >= threshold * 100 ? 'minor' : 'ok'
      details = 'dof=' + r.dof + ' p~' + r.pValueApprox.toFixed(4)
      return { featureName: snapshot.featureName, metric: m, score, threshold, severity: sev, isDrift: sev !== 'ok', details, computedAt: Date.now() }
    }
    if (m === 'js_divergence') {
      score = this.computeJSDivergence(snapshot.reference, snapshot.current)
      threshold = this.config.jsDivergenceThreshold
      const sev: Severity = score >= threshold * 3 ? 'critical' : score >= threshold * 2 ? 'major' : score >= threshold ? 'minor' : 'ok'
      return { featureName: snapshot.featureName, metric: m, score, threshold, severity: sev, isDrift: sev !== 'ok', computedAt: Date.now() }
    }
    throw new Error('unsupported metric: ' + m)
  }

  detectAllDrift(metric?: DriftMetric): DriftResult[] {
    return this.listSnapshots().map(s => this.detectDrift(s, metric))
  }

  // ---- Alerts ----
  raiseAlert(result: DriftResult, opts: { autoRaise?: boolean } = {}): DriftAlert | null {
    if (!result.isDrift && !opts.autoRaise) return null
    const alert: DriftAlert = {
      id: newAlertId(),
      featureName: result.featureName,
      severity: result.severity,
      metric: result.metric,
      score: result.score,
      threshold: result.threshold,
      message: 'Drift on ' + result.featureName + ' [' + result.metric + '] = ' + result.score.toFixed(4) + ' (severity=' + result.severity + ')',
      raisedAt: Date.now(),
      acknowledged: false,
    }
    this.alerts.push(alert)
    return alert
  }

  listAlerts(opts: { severity?: Severity; featureName?: string; unacknowledged?: boolean } = {}): DriftAlert[] {
    return this.alerts.filter(a => {
      if (opts.severity && a.severity !== opts.severity) return false
      if (opts.featureName && a.featureName !== opts.featureName) return false
      if (opts.unacknowledged && a.acknowledged) return false
      return true
    })
  }

  acknowledgeAlert(alertId: string, by?: string): boolean {
    const a = this.alerts.find(x => x.id === alertId)
    if (!a) return false
    a.acknowledged = true
    a.acknowledgedAt = Date.now()
    a.acknowledgedBy = by
    return true
  }

  // ---- Stats ----
  stats(): { features: number; totalAlerts: number; bySeverity: Record<Severity, number>; driftRate: number; acknowledgedRate: number } {
    const bySeverity: Record<Severity, number> = { ok: 0, minor: 0, major: 0, critical: 0 }
    let acked = 0
    for (const a of this.alerts) {
      bySeverity[a.severity] += 1
      if (a.acknowledged) acked += 1
    }
    const features = this.snapshots.size
    const results = this.detectAllDrift()
    const driftCount = results.filter(r => r.isDrift).length
    return {
      features,
      totalAlerts: this.alerts.length,
      bySeverity,
      driftRate: features === 0 ? 0 : driftCount / features,
      acknowledgedRate: this.alerts.length === 0 ? 0 : acked / this.alerts.length,
    }
  }

  clear(): void {
    this.snapshots.clear()
    this.alerts = []
  }
}

let _monitorSingleton: DriftMonitor | null = null
export function getDriftMonitor(): DriftMonitor {
  if (!_monitorSingleton) _monitorSingleton = new DriftMonitor()
  return _monitorSingleton
}
export function resetDriftMonitor(): void {
  if (_monitorSingleton) _monitorSingleton.clear()
  _monitorSingleton = null
}
