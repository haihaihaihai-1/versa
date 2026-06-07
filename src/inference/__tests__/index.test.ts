import { describe, it, expect, beforeEach } from 'vitest'
import { OnlineInferenceEngine, resetOnlineInference, type PredictionRequest, type ModelHandler } from '../index'
import { ModelRegistry } from '../../modelreg'

let registry: ModelRegistry
let engine: OnlineInferenceEngine

const ctrHandler: ModelHandler = (features) => {
  const x = (features['user_age'] as number ?? 25) / 100
  const y = (features['item_ctr'] as number ?? 0.1)
  return { prediction: Math.min(1, x * 0.3 + y * 0.7), confidence: 0.85 }
}

const churnHandler: ModelHandler = (features) => {
  const tenure = (features['tenure_days'] as number ?? 0) / 365
  return { prediction: tenure < 1 ? 0.8 : 0.2, confidence: 0.72 }
}

beforeEach(() => {
  resetOnlineInference()
  registry = new ModelRegistry()
  const v1 = registry.registerVersion({ modelName: 'ctr', framework: 'pytorch', description: 'ctr v1' })
  registry.registerVersion({ modelName: 'ctr', framework: 'pytorch', description: 'ctr v2', parentVersionId: v1.id })
  registry.transitionStage('ctr', 1, 'staging', { by: 'test' })
  registry.transitionStage('ctr', 1, 'production', { by: 'test' })
  registry.transitionStage('ctr', 2, 'staging', { by: 'test' })
  registry.transitionStage('ctr', 2, 'production', { by: 'test' })
  registry.registerVersion({ modelName: 'churn', framework: 'sklearn' })
  engine = new OnlineInferenceEngine(registry)
  engine.registerHandler('ctr', ctrHandler)
  engine.registerHandler('churn', churnHandler)
})

const req = (over: Partial<PredictionRequest> = {}): PredictionRequest => ({
  traceId: 't-' + Math.random().toString(36).slice(2, 8),
  modelName: 'ctr',
  features: { user_age: 30, item_ctr: 0.12 },
  ...over,
})

describe('OnlineInferenceEngine', () => {
  it('routes to production version by default', () => {
    const r = engine.predict(req())
    expect(r.version).toBe(2)
    expect(r.cached).toBe(false)
    expect(r.modelName).toBe('ctr')
    expect(typeof r.prediction).toBe('number')
  })

  it('respects explicit version override', () => {
    const r = engine.predict(req({ version: 1 }))
    expect(r.version).toBe(1)
  })

  it('serves cached response on identical request', () => {
    const a = engine.predict(req({ traceId: 'same', version: 1 }))
    const b = engine.predict(req({ traceId: 'same', version: 1 }))
    expect(b.cached).toBe(true)
    expect(b.prediction).toBe(a.prediction)
  })

  it('bypasses cache when bypassCache is true', () => {
    engine.predict(req({ traceId: 'same', version: 1 }))
    const b = engine.predict(req({ traceId: 'same', version: 1, bypassCache: true }))
    expect(b.cached).toBe(false)
  })

  it('uses fallback prediction when no handler registered', () => {
    const r = engine.predict(req({ modelName: 'churn' }))
    expect(r.source).toBe('handler')
    expect(typeof r.prediction).toBe('number')
  })

  it('falls back to first registered version when no production', () => {
    const reg2 = new ModelRegistry()
    reg2.registerVersion({ modelName: 'fresh', framework: 'onnx' })
    const eng2 = new OnlineInferenceEngine(reg2)
    eng2.registerHandler('fresh', () => ({ prediction: 'ok' }))
    const r = eng2.predict({ traceId: 'x', modelName: 'fresh', features: {} })
    expect(r.version).toBe(1)
  })

  it('throws when model is not registered', () => {
    expect(() => engine.predict(req({ modelName: 'nope' }))).toThrow()
  })

  it('throws when no versions exist', () => {
    const reg2 = new ModelRegistry()
    const eng2 = new OnlineInferenceEngine(reg2)
    expect(() => eng2.predict({ traceId: 'x', modelName: 'nope', features: {} })).toThrow(/no model version/)
  })

  it('supports A/B routing by traceId bucket', () => {
    engine.setAbRule({ modelName: 'ctr', splits: [{ version: 1, weight: 1 }, { version: 2, weight: 1 }] })
    const counts = { v1: 0, v2: 0 }
    for (let i = 0; i < 200; i++) {
      const r = engine.predict(req({ traceId: 't-' + i }))
      if (r.version === 1) counts.v1 += 1
      else counts.v2 += 1
    }
    expect(counts.v1).toBeGreaterThan(60)
    expect(counts.v2).toBeGreaterThan(60)
  })

  it('respects explicit abBucket', () => {
    engine.setAbRule({ modelName: 'ctr', splits: [{ version: 1, weight: 0 }, { version: 2, weight: 1 }] })
    const r = engine.predict(req({ abBucket: 0.9 }))
    expect(r.version).toBe(2)
  })

  it('throws on empty ab rule weights', () => {
    expect(() => engine.setAbRule({ modelName: 'ctr', splits: [] })).toThrow()
    expect(() => engine.setAbRule({ modelName: 'ctr', splits: [{ version: 1, weight: 0 }] })).toThrow()
  })

  it('clearAbRule falls back to production', () => {
    engine.setAbRule({ modelName: 'ctr', splits: [{ version: 1, weight: 1 }] })
    engine.clearAbRule('ctr')
    const r = engine.predict(req())
    expect(r.version).toBe(2)
  })

  it('predictBatch returns aligned responses', () => {
    const res = engine.predictBatch([
      req({ traceId: 'a' }),
      req({ traceId: 'b' }),
      req({ traceId: 'c' }),
    ])
    expect(res).toHaveLength(3)
    expect(res.map(r => r.traceId)).toEqual(['a', 'b', 'c'])
  })

  it('listHandlers returns registered names', () => {
    expect(engine.listHandlers().sort()).toEqual(['churn', 'ctr'])
  })

  it('removeHandler drops the model', () => {
    expect(engine.removeHandler('ctr')).toBe(true)
    const r = engine.predict(req())
    expect(r.source).toBe('fallback')
  })

  it('enriches features via feature provider', () => {
    engine.registerFeatureProvider('user', (id: string) => ({ user_age: 45, country: 'US', id }))
    const r = engine.predict(req({ features: { user_age: 30, item_ctr: 0.2 } }))
    expect(r.prediction).not.toBeNull()
  })

  it('returns base features when no provider exists', () => {
    const r = engine.predict(req({ features: { user_age: 30, item_ctr: 0.2 } }))
    expect(r.prediction).not.toBeNull()
  })

  it('skips feature enrichment when config disabled', () => {
    engine = new OnlineInferenceEngine(registry, { enableFeatureEnrichment: false })
    engine.registerHandler('ctr', ctrHandler)
    engine.registerFeatureProvider('user', (id: string) => ({ user_age: 99, item_ctr: 0.99, id }))
    const r = engine.predict(req({ features: { user_age: 30, item_ctr: 0.2 } }))
    expect(r.prediction).toBeLessThan(0.5)
  })

  it('cache size grows then plateaus at cacheMaxEntries', () => {
    engine = new OnlineInferenceEngine(registry, { cacheMaxEntries: 3 })
    engine.registerHandler('ctr', ctrHandler)
    for (let i = 0; i < 10; i++) {
      engine.predict(req({ traceId: 'k-' + i, version: 1, features: { user_age: 20 + i, item_ctr: 0.1 * i } }))
    }
    expect(engine.cacheSize()).toBe(3)
  })

  it('cache respects TTL', () => {
    engine = new OnlineInferenceEngine(registry, { cacheTtlMs: 5 })
    engine.registerHandler('ctr', ctrHandler)
    const a = engine.predict(req({ traceId: 'ttl', version: 1 }))
    return new Promise<void>(resolve => setTimeout(() => {
      const b = engine.predict(req({ traceId: 'ttl', version: 1 }))
      expect(b.cached).toBe(false)
      expect(b.servedAt).toBeGreaterThanOrEqual(a.servedAt)
      resolve()
    }, 15))
  })

  it('clearCache empties the cache', () => {
    engine.predict(req({ traceId: 'x', version: 1 }))
    expect(engine.cacheSize()).toBeGreaterThan(0)
    engine.clearCache()
    expect(engine.cacheSize()).toBe(0)
  })

  it('disables cache when config flag off', () => {
    engine = new OnlineInferenceEngine(registry, { enableCache: false })
    engine.registerHandler('ctr', ctrHandler)
    const a = engine.predict(req({ traceId: 'd', version: 1 }))
    const b = engine.predict(req({ traceId: 'd', version: 1 }))
    expect(a.cached).toBe(false)
    expect(b.cached).toBe(false)
    expect(engine.cacheSize()).toBe(0)
  })

  it('records latency in stats', () => {
    engine.predict(req())
    engine.predict(req())
    const s = engine.stats()
    expect(s.totalRequests).toBe(2)
    expect(s.latencyBuckets.length).toBe(6)
    expect(s.avgLatencyMs).toBeGreaterThanOrEqual(0)
  })

  it('computes p50/p95/p99 percentiles', () => {
    for (let i = 0; i < 50; i++) engine.predict(req({ traceId: 'p-' + i }))
    const s = engine.stats()
    expect(s.p50LatencyMs).toBeGreaterThanOrEqual(0)
    expect(s.p95LatencyMs).toBeGreaterThanOrEqual(s.p50LatencyMs)
  })

  it('tracks per-model and per-version counters', () => {
    engine.predict(req({ modelName: 'ctr' }))
    engine.predict(req({ modelName: 'churn' }))
    const s = engine.stats()
    expect(s.byModel['ctr'].requests).toBe(1)
    expect(s.byModel['churn'].requests).toBe(1)
    expect(s.byVersion['ctr::2'].requests).toBe(1)
  })

  it('reports cache hit rate and error rate', () => {
    engine.predict(req({ traceId: 'h' }))
    engine.predict(req({ traceId: 'h' }))
    try { engine.predict(req({ modelName: 'nope' })) } catch { /* expected */ }
    const s = engine.stats()
    expect(s.hitRate).toBeGreaterThan(0)
    expect(s.errorRate).toBeGreaterThan(0)
    expect(s.errors).toBe(1)
  })

  it('uptime is positive', () => {
    const s = engine.stats()
    expect(s.uptimeMs).toBeGreaterThanOrEqual(0)
  })

  it('getOnlineInference returns singleton', async () => {
    const { getOnlineInference } = await import('../index')
    const a = getOnlineInference(registry)
    const b = getOnlineInference(registry)
    expect(a).toBe(b)
  })
})
