import { describe, it, expect, beforeEach } from 'vitest'
import { TimeSeriesForecaster, resetTimeSeriesForecaster, type ModelType } from '../index'

let fc: TimeSeriesForecaster

const trend = (n: number, slope = 1, noise = 0.1, sd = 7): number[] => {
  let s = sd
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  return Array.from({ length: n }, (_, i) => 50 + slope * i + (rand() - 0.5) * noise * 20)
}

const seasonal = (n: number, period = 7, sd = 7): number[] => {
  let s = sd
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  return Array.from({ length: n }, (_, i) => 50 + 10 * Math.sin(2 * Math.PI * (i % period) / period) + (rand() - 0.5) * 2)
}

beforeEach(() => {
  resetTimeSeriesForecaster()
  fc = new TimeSeriesForecaster({ defaultHorizon: 5 })
})

describe('TimeSeriesForecaster', () => {
  it('stores and retrieves series', () => {
    fc.setSeries('a', [1, 2, 3, 4])
    expect(fc.getSeries('a')).toEqual([1, 2, 3, 4])
    expect(fc.listSeries()).toContain('a')
  })

  it('appends to series', () => {
    fc.setSeries('a', [1, 2])
    fc.appendSeries('a', [3, 4])
    expect(fc.getSeries('a')).toEqual([1, 2, 3, 4])
  })

  it('throws forecast on missing series', () => {
    expect(() => fc.movingAvg('nope')).toThrow()
  })

  it('movingAvg produces forecast points', () => {
    fc.setSeries('a', trend(30))
    const r = fc.movingAvg('a', 5, 3)
    expect(r.points).toHaveLength(5)
    expect(r.fitted).toHaveLength(30)
    expect(r.model).toBe('moving_avg')
  })

  it('expSmoothing produces forecast', () => {
    fc.setSeries('a', trend(30))
    const r = fc.expSmoothing('a', 3, 0.5)
    expect(r.points).toHaveLength(3)
    expect(r.fitted[0]).toBeCloseTo(fc.getSeries('a')[0] ?? 0, 5)
  })

  it('linearTrend detects up trend', () => {
    fc.setSeries('a', trend(30, 2))
    const r = fc.linearTrend('a', 5)
    expect(r.detectedTrend).toBe('up')
    expect(r.points[0]?.value).toBeGreaterThan(50)
  })

  it('linearTrend detects down trend', () => {
    fc.setSeries('a', trend(30, -2))
    const r = fc.linearTrend('a', 5)
    expect(r.detectedTrend).toBe('down')
  })

  it('linearTrend detects flat trend', () => {
    const arr = Array.from({ length: 30 }, () => 50)
    fc.setSeries('a', arr)
    const r = fc.linearTrend('a', 5)
    expect(r.detectedTrend).toBe('flat')
  })

  it('ar model fits and forecasts', () => {
    fc.setSeries('a', trend(50))
    const r = fc.ar('a', 3, 2)
    expect(r.points).toHaveLength(3)
    expect(r.fitted).toHaveLength(50)
  })

  it('naive repeats last value', () => {
    fc.setSeries('a', [10, 20, 30, 40, 50])
    const r = fc.naive('a', 3)
    for (const p of r.points) {
      expect(p.value).toBe(50)
    }
  })

  it('seasonalNaive uses period lookback', () => {
    fc.setSeries('a', seasonal(35, 7))
    const r = fc.seasonalNaive('a', 7, 7)
    expect(r.points).toHaveLength(7)
    expect(r.detectedSeasonality).toBe('daily')
  })

  it('decompose returns components', () => {
    fc.setSeries('a', seasonal(35, 7))
    const d = fc.decompose('a', 7)
    expect(d).not.toBeNull()
    expect(d?.trend.length).toBe(35)
    expect(d?.seasonal.length).toBe(7)
  })

  it('decompose returns null for short series', () => {
    fc.setSeries('a', [1, 2, 3])
    expect(fc.decompose('a', 7)).toBeNull()
  })

  it('forecast dispatches to correct model', () => {
    fc.setSeries('a', trend(30))
    for (const m of ['moving_avg', 'exp_smoothing', 'linear_trend', 'ar', 'naive', 'seasonal_naive'] as ModelType[]) {
      const r = fc.forecast('a', { model: m, horizon: 3, period: 7 })
      expect(r.model).toBe(m)
    }
  })

  it('compareModels returns metrics for all', () => {
    fc.setSeries('a', seasonal(35, 7))
    const out = fc.compareModels('a', 5)
    expect(Object.keys(out).length).toBe(6)
    for (const m of Object.values(out)) {
      expect(typeof m.rmse).toBe('number')
    }
  })

  it('forecast metrics include MAE, RMSE, MAPE, R2', () => {
    fc.setSeries('a', trend(30))
    const r = fc.linearTrend('a', 5)
    expect(r.metrics.mae).toBeGreaterThanOrEqual(0)
    expect(r.metrics.rmse).toBeGreaterThanOrEqual(0)
    expect(r.metrics.mape).toBeGreaterThanOrEqual(0)
    expect(r.metrics.smape).toBeGreaterThanOrEqual(0)
    expect(r.metrics.r2).toBeGreaterThanOrEqual(0)
  })

  it('forecast points have confidence intervals', () => {
    fc.setSeries('a', trend(30))
    const r = fc.linearTrend('a', 3)
    for (const p of r.points) {
      expect(p.upper).toBeGreaterThanOrEqual(p.lower)
    }
  })

  it('residuals sum to approximately zero for unbiased models', () => {
    fc.setSeries('a', Array.from({ length: 30 }, () => 50))
    const r = fc.expSmoothing('a', 3)
    const sum = r.residuals.reduce((s, v) => s + v, 0)
    expect(Math.abs(sum)).toBeLessThan(r.residuals.length)
  })

  it('ar model requires enough data', () => {
    fc.setSeries('a', [1, 2, 3])
    expect(() => fc.ar('a', 2, 2)).toThrow()
  })

  it('seasonalNaive requires at least 2 periods', () => {
    fc.setSeries('a', [1, 2, 3, 4, 5])
    expect(() => fc.seasonalNaive('a', 7, 7)).toThrow()
  })

  it('expSmoothing alpha 0 repeats first value', () => {
    fc.setSeries('a', [10, 20, 30])
    const r = fc.expSmoothing('a', 2, 0)
    for (const p of r.points) {
      expect(p.value).toBe(10)
    }
  })

  it('expSmoothing alpha 1 returns prior value', () => {
    fc.setSeries('a', [10, 20, 30])
    const r = fc.expSmoothing('a', 2, 1)
    expect(r.points[0]?.value).toBe(30)
  })

  it('uptime is positive', () => {
    expect(fc.uptimeMs()).toBeGreaterThanOrEqual(0)
  })

  it('getTimeSeriesForecaster returns singleton', async () => {
    const { getTimeSeriesForecaster } = await import('../index')
    const a = getTimeSeriesForecaster()
    const b = getTimeSeriesForecaster()
    expect(a).toBe(b)
  })
})
