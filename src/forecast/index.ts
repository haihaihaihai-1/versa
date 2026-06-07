// Time Series Forecasting: decomposition, moving avg, exp smoothing, linear trend, AR-lite, evaluation metrics.

export type Trend = 'up' | 'down' | 'flat'
export type Seasonality = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
export type ModelType = 'moving_avg' | 'exp_smoothing' | 'linear_trend' | 'ar' | 'naive' | 'seasonal_naive'

export interface ForecastPoint {
  step: number
  value: number
  lower: number
  upper: number
}

export interface ForecastResult {
  model: ModelType
  horizon: number
  points: ForecastPoint[]
  fitted: number[]
  residuals: number[]
  metrics: ForecastMetrics
  detectedSeasonality?: Seasonality
  detectedTrend?: Trend
}

export interface ForecastMetrics {
  mae: number
  mse: number
  rmse: number
  mape: number
  smape: number
  r2: number
}

export interface Decomposition {
  trend: number[]
  seasonal: number[]
  residual: number[]
  seasonality: Seasonality
  period: number
}

export interface ForecastConfig {
  movingAvgWindow: number
  expSmoothingAlpha: number
  expSmoothingBeta: number
  arOrder: number
  seasonalPeriod: number
  enableSeasonality: boolean
  confidenceLevel: number
  defaultModel: ModelType
  defaultHorizon: number
}

const DEFAULT_CONFIG: ForecastConfig = {
  movingAvgWindow: 5,
  expSmoothingAlpha: 0.3,
  expSmoothingBeta: 0.1,
  arOrder: 2,
  seasonalPeriod: 7,
  enableSeasonality: true,
  confidenceLevel: 0.95,
  defaultModel: 'exp_smoothing',
  defaultHorizon: 7,
}

export class TimeSeriesForecaster {
  readonly config: ForecastConfig
  private series: Map<string, number[]> = new Map()
  private startedAt = Date.now()

  constructor(config: Partial<ForecastConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ---- Series management ----
  setSeries(name: string, values: number[]): void {
    this.series.set(name, [...values])
  }

  appendSeries(name: string, values: number[]): void {
    const cur = this.series.get(name) ?? []
    this.series.set(name, [...cur, ...values])
  }

  getSeries(name: string): number[] {
    return [...(this.series.get(name) ?? [])]
  }

  listSeries(): string[] {
    return [...this.series.keys()]
  }

  // ---- Decomposition ----
  decompose(name: string, period?: number): Decomposition | null {
    const arr = this.series.get(name)
    if (!arr || arr.length < period! * 2) return null
    const p = period ?? this.config.seasonalPeriod
    const trend = movingAverage(arr, p)
    const detrended = arr.map((v, i) => v - (trend[i] ?? 0))
    const seasonal = seasonalIndices(detrended, p)
    const residual = arr.map((v, i) => v - (trend[i] ?? 0) - (seasonal[i % p] ?? 0))
    const seasonality = detectSeasonality(arr, p)
    return { trend, seasonal, residual, seasonality, period: p }
  }

  // ---- Models ----
  movingAvg(name: string, horizon?: number, window?: number): ForecastResult {
    const arr = this.series.get(name)
    if (!arr || arr.length === 0) throw new Error('series not found: ' + name)
    const w = window ?? this.config.movingAvgWindow
    const h = horizon ?? this.config.defaultHorizon
    const fitted: number[] = []
    for (let i = 0; i < arr.length; i++) {
      if (i < w) fitted.push(arr[i] ?? 0)
      else {
        const slice = arr.slice(i - w, i)
        fitted.push(slice.reduce((s, v) => s + v, 0) / w)
      }
    }
    const last = arr.slice(-w).reduce((s, v) => s + v, 0) / w
    const points = forecastConstant(h, last)
    const residuals = arr.map((v, i) => v - (fitted[i] ?? 0))
    const metrics = computeMetrics(arr, fitted)
    return { model: 'moving_avg', horizon: h, points, fitted, residuals, metrics }
  }

  expSmoothing(name: string, horizon?: number, alpha?: number): ForecastResult {
    const arr = this.series.get(name)
    if (!arr || arr.length === 0) throw new Error('series not found')
    const a = alpha ?? this.config.expSmoothingAlpha
    const h = horizon ?? this.config.defaultHorizon
    const fitted: number[] = [arr[0] ?? 0]
    for (let i = 1; i < arr.length; i++) {
      fitted.push(a * (arr[i - 1] ?? 0) + (1 - a) * (fitted[i - 1] ?? 0))
    }
    const lastObs = arr[arr.length - 1] ?? 0
    const lastFitted = fitted[fitted.length - 1] ?? 0
    const nextValue = a * lastObs + (1 - a) * lastFitted
    const points = forecastConstant(h, nextValue)
    const residuals = arr.map((v, i) => v - (fitted[i] ?? 0))
    const metrics = computeMetrics(arr, fitted)
    return { model: 'exp_smoothing', horizon: h, points, fitted, residuals, metrics }
  }

  linearTrend(name: string, horizon?: number): ForecastResult {
    const arr = this.series.get(name)
    if (!arr || arr.length < 2) throw new Error('series too short')
    const h = horizon ?? this.config.defaultHorizon
    const n = arr.length
    const xs = Array.from({ length: n }, (_, i) => i)
    const xMean = (n - 1) / 2
    const yMean = arr.reduce((s, v) => s + v, 0) / n
    let num = 0
    let den = 0
    for (let i = 0; i < n; i++) {
      num += (xs[i] - xMean) * (arr[i] - yMean)
      den += (xs[i] - xMean) ** 2
    }
    const slope = den === 0 ? 0 : num / den
    const intercept = yMean - slope * xMean
    const fitted = xs.map(x => intercept + slope * x)
    const points: ForecastPoint[] = []
    const residStd = stdDev(arr.map((v, i) => v - (fitted[i] ?? 0)))
    for (let i = 1; i <= h; i++) {
      const x = n - 1 + i
      const mean = intercept + slope * x
      const ci = 1.96 * residStd * Math.sqrt(1 + 1 / n + (x - xMean) ** 2 / (xs.reduce((s, v) => s + (v - xMean) ** 2, 0) || 1))
      points.push({ step: i, value: mean, lower: mean - ci, upper: mean + ci })
    }
    const residuals = arr.map((v, i) => v - (fitted[i] ?? 0))
    const metrics = computeMetrics(arr, fitted)
    return { model: 'linear_trend', horizon: h, points, fitted, residuals, metrics, detectedTrend: slope > 0.01 ? 'up' : slope < -0.01 ? 'down' : 'flat' }
  }

  ar(name: string, horizon?: number, order?: number): ForecastResult {
    const arr = this.series.get(name)
    if (!arr || arr.length < 2 * (order ?? this.config.arOrder) + 1) throw new Error('series too short for AR')
    const p = order ?? this.config.arOrder
    const h = horizon ?? this.config.defaultHorizon
    const coefs = leastSquaresAR(arr, p)
    const fitted: number[] = []
    for (let i = 0; i < arr.length; i++) {
      if (i < p) { fitted.push(arr[i] ?? 0); continue }
      let pred = 0
      for (let j = 0; j < p; j++) pred += coefs[j] * (arr[i - 1 - j] ?? 0)
      fitted.push(pred)
    }
    const hist = [...arr]
    const points: ForecastPoint[] = []
    for (let i = 1; i <= h; i++) {
      let pred = 0
      for (let j = 0; j < p; j++) pred += coefs[j] * (hist[hist.length - 1 - j] ?? 0)
      hist.push(pred)
      const residStd = stdDev(arr.map((v, i) => v - (fitted[i] ?? 0)))
      const ci = 1.96 * residStd * Math.sqrt(i)
      points.push({ step: i, value: pred, lower: pred - ci, upper: pred + ci })
    }
    const residuals = arr.map((v, i) => v - (fitted[i] ?? 0))
    const metrics = computeMetrics(arr, fitted)
    return { model: 'ar', horizon: h, points, fitted, residuals, metrics }
  }

  naive(name: string, horizon?: number): ForecastResult {
    const arr = this.series.get(name)
    if (!arr || arr.length === 0) throw new Error('series not found')
    const h = horizon ?? this.config.defaultHorizon
    const last = arr[arr.length - 1] ?? 0
    const fitted = arr.map(() => last)
    const points = forecastConstant(h, last)
    const residuals = arr.map(v => v - last)
    const metrics = computeMetrics(arr, fitted)
    return { model: 'naive', horizon: h, points, fitted, residuals, metrics }
  }

  seasonalNaive(name: string, horizon?: number, period?: number): ForecastResult {
    const arr = this.series.get(name)
    if (!arr || arr.length < (period ?? this.config.seasonalPeriod) * 2) throw new Error('not enough data for seasonal naive')
    const p = period ?? this.config.seasonalPeriod
    const h = horizon ?? this.config.defaultHorizon
    const fitted: number[] = []
    for (let i = 0; i < arr.length; i++) {
      if (i < p) fitted.push(arr[i] ?? 0)
      else fitted.push(arr[i - p] ?? 0)
    }
    const points: ForecastPoint[] = []
    for (let i = 1; i <= h; i++) {
      const idx = arr.length - p + ((i - 1) % p)
      const v = arr[idx] ?? 0
      const residStd = stdDev(arr.map((v, i) => v - (fitted[i] ?? 0)))
      const ci = 1.96 * residStd * Math.sqrt(i)
      points.push({ step: i, value: v, lower: v - ci, upper: v + ci })
    }
    const residuals = arr.map((v, i) => v - (fitted[i] ?? 0))
    const metrics = computeMetrics(arr, fitted)
    return { model: 'seasonal_naive', horizon: h, points, fitted, residuals, metrics, detectedSeasonality: 'daily' }
  }

  // ---- Generic forecast ----
  forecast(name: string, opts?: { model?: ModelType; horizon?: number; window?: number; alpha?: number; order?: number; period?: number }): ForecastResult {
    const m = opts?.model ?? this.config.defaultModel
    if (m === 'moving_avg') return this.movingAvg(name, opts?.horizon, opts?.window)
    if (m === 'exp_smoothing') return this.expSmoothing(name, opts?.horizon, opts?.alpha)
    if (m === 'linear_trend') return this.linearTrend(name, opts?.horizon)
    if (m === 'ar') return this.ar(name, opts?.horizon, opts?.order)
    if (m === 'naive') return this.naive(name, opts?.horizon)
    return this.seasonalNaive(name, opts?.horizon, opts?.period)
  }

  compareModels(name: string, horizon?: number): Record<ModelType, ForecastMetrics> {
    const models: ModelType[] = ['moving_avg', 'exp_smoothing', 'linear_trend', 'ar', 'naive', 'seasonal_naive']
    const out = {} as Record<ModelType, ForecastMetrics>
    for (const m of models) {
      try {
        const r = this.forecast(name, { model: m, horizon })
        out[m] = r.metrics
      } catch {
        out[m] = { mae: 0, mse: 0, rmse: 0, mape: 0, smape: 0, r2: 0 }
      }
    }
    return out
  }

  uptimeMs(): number {
    return Date.now() - this.startedAt
  }
}

const movingAverage = (arr: number[], window: number): number[] => {
  const out: number[] = []
  for (let i = 0; i < arr.length; i++) {
    if (i < window - 1) { out.push(NaN); continue }
    const slice = arr.slice(i - window + 1, i + 1)
    out.push(slice.reduce((s, v) => s + v, 0) / window)
  }
  return out
}

const seasonalIndices = (arr: number[], period: number): number[] => {
  const sums: number[] = new Array(period).fill(0)
  const counts: number[] = new Array(period).fill(0)
  for (let i = 0; i < arr.length; i++) {
    const v = arr[i]
    if (Number.isFinite(v)) {
      sums[i % period] += v
      counts[i % period] += 1
    }
  }
  const means = sums.map((s, i) => counts[i] === 0 ? 0 : s / counts[i])
  const avg = means.reduce((a, b) => a + b, 0) / period
  return means.map(m => m - avg)
}

const detectSeasonality = (arr: number[], period: number): Seasonality => {
  if (arr.length < period * 2) return 'none'
  const seasonality = seasonalIndices(arr, period)
  const variance = stdDev(arr) ** 2
  const explained = seasonality.reduce((s, v) => s + v * v, 0) / period
  if (variance === 0) return 'none'
  if (explained / variance > 0.3) return period === 7 ? 'weekly' : period === 24 ? 'daily' : period === 30 ? 'monthly' : 'daily'
  return 'none'
}

const forecastConstant = (h: number, value: number): ForecastPoint[] => {
  return Array.from({ length: h }, (_, i) => ({ step: i + 1, value, lower: value, upper: value }))
}

const stdDev = (arr: number[]): number => {
  const valid = arr.filter(v => Number.isFinite(v))
  if (valid.length === 0) return 0
  const m = valid.reduce((s, v) => s + v, 0) / valid.length
  return Math.sqrt(valid.reduce((s, v) => s + (v - m) ** 2, 0) / valid.length)
}

const leastSquaresAR = (arr: number[], p: number): number[] => {
  const n = arr.length - p
  if (n < p + 1) return new Array(p).fill(0)
  const X: number[][] = []
  const y: number[] = []
  for (let i = p; i < arr.length; i++) {
    const row: number[] = []
    for (let j = 0; j < p; j++) row.push(arr[i - 1 - j] ?? 0)
    X.push(row)
    y.push(arr[i] ?? 0)
  }
  const Xt = transpose(X)
  const XtX = matMul(Xt, X)
  const Xty = matVec(Xt, y)
  return solveLinearSystem(XtX, Xty)
}

const transpose = (m: number[][]): number[][] => m[0]?.map((_, j) => m.map(row => row[j] ?? 0)) ?? []

const matMul = (a: number[][], b: number[][]): number[][] => {
  const out: number[][] = []
  for (let i = 0; i < a.length; i++) {
    out.push([])
    for (let j = 0; j < (b[0]?.length ?? 0); j++) {
      let s = 0
      for (let k = 0; k < a[i].length; k++) s += (a[i][k] ?? 0) * (b[k]?.[j] ?? 0)
      out[i]!.push(s)
    }
  }
  return out
}

const matVec = (a: number[][], v: number[]): number[] => a.map(row => row.reduce((s, x, i) => s + x * (v[i] ?? 0), 0))

const solveLinearSystem = (a: number[][], b: number[]): number[] => {
  const n = a.length
  const M: number[][] = a.map((row, i) => [...row, b[i] ?? 0])
  for (let i = 0; i < n; i++) {
    let maxRow = i
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k]?.[i] ?? 0) > Math.abs(M[maxRow]?.[i] ?? 0)) maxRow = k
    ;[M[i], M[maxRow]] = [M[maxRow] ?? [], M[i] ?? []]
    const pivot = M[i]?.[i] ?? 0
    if (Math.abs(pivot) < 1e-9) return new Array(n).fill(0)
    for (let j = i; j <= n; j++) M[i]![j] = (M[i]?.[j] ?? 0) / pivot
    for (let k = 0; k < n; k++) {
      if (k === i) continue
      const f = M[k]?.[i] ?? 0
      for (let j = i; j <= n; j++) M[k]![j] = (M[k]?.[j] ?? 0) - f * (M[i]?.[j] ?? 0)
    }
  }
  return M.map(row => row[n] ?? 0)
}

const computeMetrics = (actual: number[], predicted: number[]): ForecastMetrics => {
  const n = actual.length
  let absSum = 0
  let sqSum = 0
  let pctSum = 0
  let smapeSum = 0
  let yMean = 0
  for (let i = 0; i < n; i++) {
    const a = actual[i] ?? 0
    const p = predicted[i] ?? 0
    absSum += Math.abs(a - p)
    sqSum += (a - p) ** 2
    if (a !== 0) pctSum += Math.abs((a - p) / a)
    smapeSum += Math.abs(a - p) / ((Math.abs(a) + Math.abs(p)) / 2 || 1)
    yMean += a
  }
  yMean /= n
  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < n; i++) {
    const a = actual[i] ?? 0
    const p = predicted[i] ?? 0
    ssRes += (a - p) ** 2
    ssTot += (a - yMean) ** 2
  }
  const mae = absSum / n
  const mse = sqSum / n
  return {
    mae,
    mse,
    rmse: Math.sqrt(mse),
    mape: (pctSum / n) * 100,
    smape: (smapeSum / n) * 100,
    r2: ssTot === 0 ? 0 : 1 - ssRes / ssTot,
  }
}

let _forecaster: TimeSeriesForecaster | null = null

export const getTimeSeriesForecaster = (config?: Partial<ForecastConfig>): TimeSeriesForecaster => {
  if (!_forecaster) _forecaster = new TimeSeriesForecaster(config)
  return _forecaster
}

export const resetTimeSeriesForecaster = (): void => {
  _forecaster = null
}
