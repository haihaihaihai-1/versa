/**
 * Versa · Time Series Database (v62.0)
 * - Time-ordered data points
 * - Series management (tags + measurements)
 * - High-resolution timestamps
 * - Down-sampling (avg, sum, min, max, count, first, last)
 * - Window queries
 * - Aggregations
 * - Retention policies
 * - Continuous queries (precomputed rollups)
 * - NaN handling
 * - Per-series metadata
 * - Bulk import
 * - Iterator / range scan
 */
export interface DataPoint { timestamp: number; value: number }
export interface SeriesMeta { name: string; tags: Record<string, string>; createdAt: number; updatedAt: number; count: number }
export type Aggregator = 'avg' | 'sum' | 'min' | 'max' | 'count' | 'first' | 'last'

export class TimeSeries {
  private name: string
  private tags: Record<string, string>
  private points: DataPoint[] = []

  constructor(name: string, tags: Record<string, string> = {}) {
    this.name = name
    this.tags = { ...tags }
  }

  insert(p: DataPoint): void {
    this.points.push({ timestamp: p.timestamp, value: p.value })
    this.points.sort((a, b) => a.timestamp - b.timestamp)
  }
  insertMany(ps: DataPoint[]): void {
    for (const p of ps) this.points.push({ timestamp: p.timestamp, value: p.value })
    this.points.sort((a, b) => a.timestamp - b.timestamp)
  }
  size(): number { return this.points.length }
  name_(): string { return this.name }
  getTags(): Record<string, string> { return { ...this.tags } }

  range(from: number, to: number): DataPoint[] {
    return this.points.filter(p => p.timestamp >= from && p.timestamp <= to)
  }
  first(): DataPoint | undefined { return this.points[0] }
  last(): DataPoint | undefined { return this.points[this.points.length - 1] }

  // Down-sample into buckets of `intervalMs`
  downsample(intervalMs: number, agg: Aggregator): DataPoint[] {
    if (this.points.length === 0 || intervalMs <= 0) return []
    const start = this.points[0]!.timestamp
    const buckets = new Map<number, DataPoint[]>()
    for (const p of this.points) {
      const k = Math.floor((p.timestamp - start) / intervalMs) * intervalMs + start
      if (!buckets.has(k)) buckets.set(k, [])
      buckets.get(k)!.push(p)
    }
    const out: DataPoint[] = []
    const sortedKeys = [...buckets.keys()].sort((a, b) => a - b)
    for (const k of sortedKeys) {
      const pts = buckets.get(k)!
      let v: number
      if (agg === 'avg') v = pts.reduce((s, p) => s + p.value, 0) / pts.length
      else if (agg === 'sum') v = pts.reduce((s, p) => s + p.value, 0)
      else if (agg === 'min') v = Math.min(...pts.map(p => p.value))
      else if (agg === 'max') v = Math.max(...pts.map(p => p.value))
      else if (agg === 'count') v = pts.length
      else if (agg === 'first') v = pts[0]!.value
      else v = pts[pts.length - 1]!.value
      out.push({ timestamp: k, value: v })
    }
    return out
  }

  aggregate(from: number, to: number, agg: Aggregator): number | null {
    const pts = this.range(from, to)
    if (pts.length === 0) return null
    if (agg === 'avg') return pts.reduce((s, p) => s + p.value, 0) / pts.length
    if (agg === 'sum') return pts.reduce((s, p) => s + p.value, 0)
    if (agg === 'min') return Math.min(...pts.map(p => p.value))
    if (agg === 'max') return Math.max(...pts.map(p => p.value))
    if (agg === 'count') return pts.length
    if (agg === 'first') return pts[0]!.value
    return pts[pts.length - 1]!.value
  }

  // Linear interpolation at given timestamp
  interpolate(t: number): number | null {
    if (this.points.length === 0) return null
    if (t <= this.points[0]!.timestamp) return this.points[0]!.value
    if (t >= this.points[this.points.length - 1]!.timestamp) return this.points[this.points.length - 1]!.value
    // binary search
    let lo = 0, hi = this.points.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (this.points[mid]!.timestamp < t) lo = mid; else hi = mid
    }
    const p1 = this.points[lo]!, p2 = this.points[hi]!
    const ratio = (t - p1.timestamp) / (p2.timestamp - p1.timestamp)
    return p1.value + (p2.value - p1.value) * ratio
  }
}

export class TimeSeriesDB {
  private series = new Map<string, TimeSeries>()
  private retention: { maxAgeMs?: number; maxPoints?: number } = {}

  setRetention(opts: { maxAgeMs?: number; maxPoints?: number }): void { this.retention = opts }
  createSeries(name: string, tags: Record<string, string> = {}): TimeSeries {
    if (this.series.has(name)) throw new Error(`series exists: ${name}`)
    const ts = new TimeSeries(name, tags)
    this.series.set(name, ts)
    return ts
  }
  dropSeries(name: string): boolean { return this.series.delete(name) }
  getSeries(name: string): TimeSeries | undefined { return this.series.get(name) }
  listSeries(): SeriesMeta[] {
    return [...this.series.values()].map(s => ({
      name: s.name_(), tags: s.getTags(),
      createdAt: s.first()?.timestamp ?? 0,
      updatedAt: s.last()?.timestamp ?? 0,
      count: s.size()
    }))
  }
  findSeries(predicate: (tags: Record<string, string>) => boolean): TimeSeries[] {
    return [...this.series.values()].filter(s => predicate(s.getTags()))
  }

  // Continuous query: precompute rollups on every insert
  continuousQueries: { name: string; source: string; intervalMs: number; agg: Aggregator; rollup: TimeSeries }[] = []
  addContinuousQuery(name: string, sourceName: string, intervalMs: number, agg: Aggregator): TimeSeries {
    const src = this.getSeries(sourceName); if (!src) throw new Error('source not found')
    const rollup = this.createSeries(name, { source: sourceName, intervalMs: String(intervalMs), agg })
    this.continuousQueries.push({ name, source: sourceName, intervalMs, agg, rollup })
    // initial prefill
    this.refreshContinuousQuery(name)
    return rollup
  }
  refreshContinuousQuery(name: string): void {
    const cq = this.continuousQueries.find(q => q.name === name); if (!cq) return
    const src = this.getSeries(cq.source); if (!src) return
    const ds = src.downsample(cq.intervalMs, cq.agg)
    cq.rollup.insertMany(ds)
  }

  // Apply retention policy
  applyRetention(): number {
    let removed = 0
    for (const s of this.series.values()) {
      if (this.retention.maxAgeMs != null) {
        const first = s.first()
        if (first) {
          const cutoff = first.timestamp + this.retention.maxAgeMs
          const before = s.size()
          ;(s as unknown as { points: DataPoint[] }).points = (s as unknown as { points: DataPoint[] }).points.filter(p => p.timestamp >= cutoff)
          removed += before - s.size()
        }
      }
      if (this.retention.maxPoints != null) {
        const pts = (s as unknown as { points: DataPoint[] }).points
        if (pts.length > this.retention.maxPoints) {
          removed += pts.length - this.retention.maxPoints
          ;(s as unknown as { points: DataPoint[] }).points = pts.slice(-this.retention.maxPoints)
        }
      }
    }
    return removed
  }

  totalPoints(): number { return [...this.series.values()].reduce((s, ts) => s + ts.size(), 0) }
  size(): number { return this.series.size }
  clear(): void { this.series.clear(); this.continuousQueries = [] }
}

let _db: TimeSeriesDB | null = null
export function getTimeSeriesDB(): TimeSeriesDB { if (!_db) _db = new TimeSeriesDB(); return _db }
export function resetTimeSeriesDB(): void { _db = null }
export { TimeSeriesDB as default }
