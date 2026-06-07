import { describe, it, expect, beforeEach } from 'vitest'
import { AnomalyDetector, resetAnomalyDetector } from '../index'

let det: AnomalyDetector

beforeEach(() => {
  resetAnomalyDetector()
  det = new AnomalyDetector()
})

const seed = (n: number, mean = 50, std = 5, sd = 42): number[] => {
  let s = sd
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const box = () => { const u1 = Math.max(rand(), 1e-9); const u2 = rand(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) }
  return Array.from({ length: n }, () => mean + std * box())
}

describe('AnomalyDetector', () => {
  it('pushes values and tracks series', () => {
    det.push('latency', 10)
    det.push('latency', 11)
    expect(det.getSeries('latency')).toEqual([10, 11])
    expect(det.listSeries()).toContain('latency')
  })

  it('pushBatch records multiple values', () => {
    const alerts = det.pushBatch('x', [1, 2, 3, 4, 5])
    expect(alerts).toHaveLength(5)
    expect(det.getSeries('x')).toHaveLength(5)
  })

  it('resets series', () => {
    det.push('s', 1)
    det.resetSeries('s')
    expect(det.getSeries('s')).toEqual([])
  })

  it('returns null alert for normal values', () => {
    const a = det.push('series', 50)
    expect(a).toBeNull()
  })

  it('detects z-score outlier', () => {
    for (const v of seed(100)) det.push('s', v)
    const a = det.push('s', 1000, ['zscore'])
    expect(a).not.toBeNull()
    expect(a?.method).toBe('zscore')
    expect(a?.score).toBeGreaterThan(det.config.zScoreThreshold)
  })

  it('returns null with insufficient data', () => {
    expect(det.zscore('s', 100, 0).isAnomaly).toBe(false)
    expect(det.mad('s', 100, 0).isAnomaly).toBe(false)
    expect(det.iqr('s', 100, 0).isAnomaly).toBe(false)
  })

  it('zscore returns range and threshold', () => {
    for (const v of seed(50)) det.push('s', v)
    const r = det.zscore('s', 60)
    expect(r.range.high).toBeGreaterThan(r.range.low)
    expect(r.threshold).toBe(det.config.zScoreThreshold)
  })

  it('mad detects outliers', () => {
    for (const v of seed(100)) det.push('s', v)
    const a = det.push('s', 1000, ['mad'])
    expect(a?.method).toBe('mad')
  })

  it('iqr detects outliers', () => {
    const base = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 100]
    for (const v of base) det.push('s', v)
    const stats = det.stats('s')
    expect(stats?.iqr).toBeGreaterThan(0)
  })

  it('movingAvg detects sudden spikes', () => {
    for (const v of seed(50)) det.push('s', v)
    const a = det.push('s', 1000, ['moving_avg'])
    expect(a?.method).toBe('moving_avg')
  })

  it('isolationForest flags extreme values', () => {
    for (const v of seed(60)) det.push('s', v)
    const r = det.isolationForest('s', 9999)
    expect(r.score).toBeGreaterThan(0)
  })

  it('classifySeverity maps score to severity', () => {
    expect(det.classifySeverity(1)).toBe('ok')
    expect(det.classifySeverity(3)).toBe('minor')
    expect(det.classifySeverity(5)).toBe('major')
    expect(det.classifySeverity(10)).toBe('critical')
  })

  it('stats returns null for unknown series', () => {
    expect(det.stats('nope')).toBeNull()
  })

  it('stats returns full summary for known series', () => {
    det.pushBatch('s', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    const s = det.stats('s')
    expect(s?.count).toBe(10)
    expect(s?.min).toBe(1)
    expect(s?.max).toBe(10)
    expect(s?.median).toBeGreaterThan(4)
  })

  it('listAlerts filters by series', () => {
    det.pushBatch('a', seed(30))
    det.push('a', 9999)
    det.pushBatch('b', seed(30))
    det.push('b', -9999)
    const aAlerts = det.listAlerts({ series: 'a' })
    const bAlerts = det.listAlerts({ series: 'b' })
    expect(aAlerts.length).toBeGreaterThan(0)
    expect(bAlerts.length).toBeGreaterThan(0)
  })

  it('listAlerts filters by severity', () => {
    det.pushBatch('s', seed(30))
    det.push('s', 99999)
    const severe = det.listAlerts({ severity: 'major' })
    const minor = det.listAlerts({ severity: 'minor' })
    expect(severe.length + minor.length).toBeGreaterThan(0)
  })

  it('listAlerts filters by method', () => {
    det.pushBatch('s', seed(30))
    det.push('s', 9999, ['zscore'])
    det.push('s', 8888, ['zscore'])
    const zAlerts = det.listAlerts({ method: 'zscore' })
    expect(zAlerts.length).toBeGreaterThan(0)
  })

  it('clearAlerts empties alert list', () => {
    det.pushBatch('s', seed(20))
    det.push('s', 9999)
    expect(det.countAlerts()).toBeGreaterThan(0)
    det.clearAlerts()
    expect(det.countAlerts()).toBe(0)
  })

  it('stats_view returns aggregate counts', () => {
    det.pushBatch('s', seed(30))
    det.push('s', 9999)
    const s = det.stats_view()
    expect(s.seriesCount).toBe(1)
    expect(s.totalObservations).toBeGreaterThan(0)
    expect(Object.values(s.alertsByMethod).reduce((a, b) => a + b, 0)).toBeGreaterThan(0)
  })

  it('history bounded by maxHistory', () => {
    const d = new AnomalyDetector({ maxHistory: 5 })
    d.pushBatch('s', [1, 2, 3, 4, 5, 6, 7, 8])
    expect(d.getSeries('s')).toHaveLength(5)
  })

  it('custom zScoreThreshold', () => {
    const d = new AnomalyDetector({ zScoreThreshold: 1 })
    for (const v of seed(30)) d.push('s', v)
    const a = d.push('s', 60)
    expect(a).not.toBeNull()
  })

  it('uptime is positive', () => {
    expect(det.uptimeMs()).toBeGreaterThanOrEqual(0)
  })

  it('evaluate with no fired methods returns null', () => {
    det.pushBatch('s', [1, 2, 3])
    const a = det.evaluate('s', 2, 3, ['zscore'])
    expect(a).toBeNull()
  })

  it('alert includes context with fired methods', () => {
    det.pushBatch('s', seed(30))
    const a = det.push('s', 9999)
    expect(a?.context?.fired).toBeDefined()
    expect(Array.isArray((a?.context as { fired: string[] } | undefined)?.fired)).toBe(true)
  })

  it('getAnomalyDetector returns singleton', async () => {
    const { getAnomalyDetector } = await import('../index')
    const a = getAnomalyDetector()
    const b = getAnomalyDetector()
    expect(a).toBe(b)
  })
})
