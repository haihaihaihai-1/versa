import { describe, it, expect, beforeEach } from 'vitest'
import { RecommendationEngine, resetRecommendationEngine, type Item, type UserSignal, type UserFeatures } from '../index'
import { ModelRegistry } from '../../modelreg'

let engine: RecommendationEngine
let registry: ModelRegistry

const makeItems = (): Item[] => {
  return [
    { id: 'i1', title: 'AI Handbook', category: 'tech', tags: ['ai', 'ml'], embedding: [0.9, 0.1, 0.0], popularity: 100 },
    { id: 'i2', title: 'Web Dev 101', category: 'tech', tags: ['web'], embedding: [0.1, 0.9, 0.0], popularity: 80 },
    { id: 'i3', title: 'Cooking Italian', category: 'food', tags: ['cooking'], embedding: [0.0, 0.1, 0.9], popularity: 60 },
    { id: 'i4', title: 'Travel Japan', category: 'travel', tags: ['japan'], embedding: [0.0, 0.0, 0.9], popularity: 40 },
    { id: 'i5', title: 'Deep Learning', category: 'tech', tags: ['ai', 'dl'], embedding: [0.85, 0.2, 0.0], popularity: 200 },
    { id: 'i6', title: 'Gardening', category: 'home', tags: ['plants'], embedding: [0.0, 0.1, 0.8], popularity: 30 },
    { id: 'i7', title: 'Yoga', category: 'health', tags: ['fitness'], embedding: [0.1, 0.0, 0.7], popularity: 50 },
    { id: 'i8', title: 'Photography', category: 'tech', tags: ['photo'], embedding: [0.3, 0.6, 0.1], popularity: 70 },
  ]
}

const user = (over: Partial<UserFeatures> = {}): UserFeatures => ({
  userId: 'u1',
  age: 30,
  country: 'US',
  interests: ['tech'],
  recentViews: ['i1'],
  ...over,
})

beforeEach(() => {
  resetRecommendationEngine()
  registry = new ModelRegistry()
  engine = new RecommendationEngine(registry, { topK: 3, candidatePoolSize: 8 })
  engine.addItems(makeItems())
})

describe('RecommendationEngine', () => {
  it('adds and retrieves items', () => {
    expect(engine.countItems()).toBe(8)
    expect(engine.getItem('i1')?.title).toBe('AI Handbook')
  })

  it('removes items and updates indices', () => {
    expect(engine.removeItem('i1')).toBe(true)
    expect(engine.countItems()).toBe(7)
    expect(engine.getItem('i1')).toBeUndefined()
    expect(engine.removeItem('missing')).toBe(false)
  })

  it('listItems returns all added items', () => {
    expect(engine.listItems()).toHaveLength(8)
  })

  it('respects topK parameter', () => {
    const r = engine.recommend({ requestId: 'r1', user: user(), topK: 2 })
    expect(r.recommendations).toHaveLength(2)
  })

  it('falls back to default topK', () => {
    const r = engine.recommend({ requestId: 'r2', user: user() })
    expect(r.recommendations.length).toBeLessThanOrEqual(3)
  })

  it('filters by category', () => {
    const r = engine.recommend({ requestId: 'r3', user: user(), filters: { category: 'tech' } })
    for (const rec of r.recommendations) {
      expect(engine.getItem(rec.itemId)?.category).toBe('tech')
    }
  })

  it('excludes specified items', () => {
    const r = engine.recommend({ requestId: 'r4', user: user(), filters: { exclude: ['i1', 'i2'] } })
    for (const rec of r.recommendations) {
      expect(['i1', 'i2']).not.toContain(rec.itemId)
    }
  })

  it('filters by minPopularity', () => {
    const r = engine.recommend({ requestId: 'r5', user: user(), filters: { minPopularity: 60 } })
    for (const rec of r.recommendations) {
      const pop = engine.getItem(rec.itemId)?.popularity ?? 0
      expect(pop).toBeGreaterThanOrEqual(60)
    }
  })

  it('returns scored items with reasons and sources', () => {
    const r = engine.recommend({ requestId: 'r6', user: user() })
    for (const rec of r.recommendations) {
      expect(typeof rec.score).toBe('number')
      expect(Array.isArray(rec.reasons)).toBe(true)
      expect(Array.isArray(rec.sources)).toBe(true)
    }
  })

  it('assigns higher score to similar items via vector', () => {
    const similar = engine.recommend({ requestId: 'r7', user: user({ recentViews: ['i5'] }) })
    expect(similar.recommendations[0].sources).toContain('vector')
  })

  it('respects categoryMatch source', () => {
    const r = engine.recommend({ requestId: 'r8', user: user({ interests: ['tech', 'food'] }) })
    for (const rec of r.recommendations) {
      expect(rec.sources).toContain('category')
    }
  })

  it('builds co-occurrence from signals', () => {
    const signals: UserSignal[] = [
      { userId: 'u1', itemId: 'i1', type: 'view', at: 1 },
      { userId: 'u1', itemId: 'i5', type: 'view', at: 2 },
      { userId: 'u1', itemId: 'i2', type: 'view', at: 3 },
      { userId: 'u2', itemId: 'i1', type: 'view', at: 4 },
      { userId: 'u2', itemId: 'i5', type: 'view', at: 5 },
    ]
    engine.addSignals(signals)
    engine.rebuildCoOccurrence()
    const r = engine.recommend({ requestId: 'r9', user: user({ recentViews: ['i1'] }) })
    expect(r.recommendations.some(x => x.sources.includes('co-occurrence'))).toBe(true)
  })

  it('history source for recently viewed items', () => {
    const r = engine.recommend({ requestId: 'rh', user: user({ recentViews: ['i1'] }) })
    const rec = r.recommendations.find(x => x.itemId === 'i1')
    if (rec) {
      expect(rec.sources).toContain('history')
      expect(rec.reasons).toContain('recently viewed')
    }
  })

  it('popularity source when popularity is high', () => {
    const r = engine.recommend({ requestId: 'rp', user: user() })
    expect(r.recommendations.some(x => x.sources.includes('popularity'))).toBe(true)
  })

  it('signal tracking increments popularity', () => {
    const before = engine.getItem('i3')?.popularity ?? 0
    engine.addSignal({ userId: 'u9', itemId: 'i3', type: 'purchase', at: Date.now() })
    expect(engine.getItem('i3')?.popularity).toBe(before + 1)
  })

  it('A/B strategy selection', () => {
    engine.setAbRules([
      { name: 'vector-only', weight: 1 },
      { name: 'popularity-only', weight: 1 },
    ])
    const counts: Record<string, number> = {}
    for (let i = 0; i < 200; i++) {
      const r = engine.recommend({ requestId: 'ab-' + i, user: user() })
      counts[r.strategy] = (counts[r.strategy] ?? 0) + 1
    }
    expect(counts['vector-only']).toBeGreaterThan(50)
    expect(counts['popularity-only']).toBeGreaterThan(50)
  })

  it('throws on invalid ab rules', () => {
    expect(() => engine.setAbRules([{ name: 'x', weight: 0 }])).toThrow()
    expect(() => engine.setAbRules([{ name: 'x', weight: -1 }])).toThrow()
  })

  it('getAbRules returns current rules', () => {
    engine.setAbRules([{ name: 'hybrid', weight: 1 }, { name: 'vector-only', weight: 2 }])
    expect(engine.getAbRules()).toHaveLength(2)
  })

  it('respects explicit strategy override', () => {
    const r = engine.recommend({ requestId: 'rso', user: user(), strategy: 'vector-only' })
    expect(r.strategy).toBe('vector-only')
  })

  it('falls back to hybrid when no rules and no strategy', () => {
    engine.setAbRules([])
    const r = engine.recommend({ requestId: 'fh', user: user() })
    expect(r.strategy).toBe('hybrid')
  })

  it('caches recommendations', () => {
    engine.recommend({ requestId: 'c1', user: user() })
    const b = engine.recommend({ requestId: 'c1', user: user() })
    expect(b.cached).toBe(true)
  })

  it('clearCache empties cache', () => {
    engine.recommend({ requestId: 'c2', user: user() })
    expect(engine.cacheSize()).toBeGreaterThan(0)
    engine.clearCache()
    expect(engine.cacheSize()).toBe(0)
  })

  it('recommendBatch returns aligned responses', () => {
    const res = engine.recommendBatch([
      { requestId: 'b1', user: user() },
      { requestId: 'b2', user: user() },
    ])
    expect(res.map(r => r.requestId)).toEqual(['b1', 'b2'])
  })

  it('tracks exposure for returned items', () => {
    const r = engine.recommend({ requestId: 'e1', user: user() })
    const stats = engine.stats_view()
    for (const rec of r.recommendations) {
      expect(stats.itemExposure[rec.itemId]).toBeGreaterThan(0)
    }
  })

  it('computes diversity score', () => {
    for (let i = 0; i < 20; i++) {
      engine.recommend({ requestId: 'd-' + i, user: user() })
    }
    const stats = engine.stats_view()
    expect(stats.diversityScore).toBeGreaterThan(0)
  })

  it('reports strategy distribution in stats', () => {
    engine.recommend({ requestId: 's1', user: user() })
    engine.recommend({ requestId: 's2', user: user(), strategy: 'vector-only' })
    const stats = engine.stats_view()
    expect(stats.byStrategy['hybrid']).toBeGreaterThan(0)
    expect(stats.byStrategy['vector-only']).toBeGreaterThan(0)
  })

  it('computes hit rate', () => {
    engine.recommend({ requestId: 'h1', user: user() })
    engine.recommend({ requestId: 'h1', user: user() })
    const stats = engine.stats_view()
    expect(stats.hitRate).toBeGreaterThan(0)
  })

  it('average topK and latency are computed', () => {
    engine.recommend({ requestId: 'avg', user: user() })
    const stats = engine.stats_view()
    expect(stats.avgTopK).toBeGreaterThan(0)
    expect(stats.avgLatencyMs).toBeGreaterThanOrEqual(0)
  })

  it('estimateRecall measures overlap with ground truth', () => {
    const r = engine.recommend({ requestId: 'recall', user: user() })
    const recall = engine.estimateRecall(['i1', 'i5'], r.recommendations)
    expect(recall).toBeGreaterThan(0)
  })

  it('estimateRecall returns 0 for empty ground truth', () => {
    const r = engine.recommend({ requestId: 'r0', user: user() })
    expect(engine.estimateRecall([], r.recommendations)).toBe(0)
  })

  it('uptime is positive', () => {
    expect(engine.uptimeMs()).toBeGreaterThanOrEqual(0)
  })

  it('user with no recent views uses fallback vector', () => {
    const r = engine.recommend({ requestId: 'fb', user: user({ recentViews: [] }) })
    expect(r.recommendations.length).toBeGreaterThan(0)
  })

  it('getRecommendationEngine returns singleton', async () => {
    const { getRecommendationEngine } = await import('../index')
    const a = getRecommendationEngine(registry)
    const b = getRecommendationEngine(registry)
    expect(a).toBe(b)
  })
})
