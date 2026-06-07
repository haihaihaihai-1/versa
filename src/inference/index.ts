// Online Inference: low-latency prediction engine with versioning, feature lookup, LRU cache, A/B routing and metrics.

import { ModelRegistry } from '../modelreg'

export type PredictionInput = Record<string, number | string | boolean | null>

export interface PredictionRequest {
  traceId: string
  modelName: string
  features: PredictionInput
  version?: number
  bypassCache?: boolean
  abBucket?: number
}

export interface PredictionResponse {
  traceId: string
  modelName: string
  version: number
  prediction: number | string | boolean | number[] | Record<string, unknown> | null
  confidence?: number
  latencyMs: number
  cached: boolean
  servedAt: number
  source: 'handler' | 'fallback'
}

export type ModelHandler = (features: PredictionInput, ctx: { modelName: string; version: number; traceId: string }) => { prediction: PredictionResponse['prediction']; confidence?: number }

export interface AbRoutingRule {
  modelName: string
  splits: { version: number; weight: number }[]
}

export interface InferenceConfig {
  defaultTimeoutMs: number
  cacheMaxEntries: number
  cacheTtlMs: number
  enableCache: boolean
  enableMetrics: boolean
  enableFeatureEnrichment: boolean
}

export interface LatencyBucket {
  range: string
  count: number
}

export interface InferenceStats {
  totalRequests: number
  cacheHits: number
  cacheMisses: number
  errors: number
  byModel: Record<string, { requests: number; errors: number; avgLatencyMs: number }>
  byVersion: Record<string, { requests: number; errors: number }>
  latencyBuckets: LatencyBucket[]
  p50LatencyMs: number
  p95LatencyMs: number
  p99LatencyMs: number
  avgLatencyMs: number
  cacheSize: number
  hitRate: number
  errorRate: number
  uptimeMs: number
}

const DEFAULT_CONFIG: InferenceConfig = {
  defaultTimeoutMs: 50,
  cacheMaxEntries: 256,
  cacheTtlMs: 60_000,
  enableCache: true,
  enableMetrics: true,
  enableFeatureEnrichment: true,
}

interface CacheEntry {
  key: string
  response: PredictionResponse
  expiresAt: number
}

export class OnlineInferenceEngine {
  private handlers: Map<string, ModelHandler> = new Map()
  private abRules: Map<string, AbRoutingRule> = new Map()
  private cache: Map<string, CacheEntry> = new Map()
  private latencies: number[] = []
  private counters = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
  }
  private perModel: Map<string, { requests: number; errors: number; totalLatency: number }> = new Map()
  private perVersion: Map<string, { requests: number; errors: number }> = new Map()
  private featureProviders: Map<string, (id: string) => PredictionInput> = new Map()
  private startedAt = Date.now()
  readonly config: InferenceConfig

  constructor(registry: ModelRegistry, config: Partial<InferenceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.registry = registry
  }

  readonly registry: ModelRegistry

  // ---- Handler management ----
  registerHandler(modelName: string, handler: ModelHandler): void {
    this.handlers.set(modelName, handler)
  }

  hasHandler(modelName: string): boolean {
    return this.handlers.has(modelName)
  }

  removeHandler(modelName: string): boolean {
    return this.handlers.delete(modelName)
  }

  listHandlers(): string[] {
    return [...this.handlers.keys()]
  }

  // ---- Feature enrichment ----
  registerFeatureProvider(entity: string, provider: (id: string) => PredictionInput): void {
    this.featureProviders.set(entity, provider)
  }

  enrichFeatures(entity: string, entityId: string, base: PredictionInput): PredictionInput {
    if (!this.config.enableFeatureEnrichment) return { ...base }
    const provider = this.featureProviders.get(entity)
    if (!provider) return { ...base }
    const extra = provider(entityId)
    return { ...extra, ...base }
  }

  // ---- A/B routing ----
  setAbRule(rule: AbRoutingRule): void {
    const total = rule.splits.reduce((s, x) => s + x.weight, 0)
    if (total <= 0) throw new Error('ab rule weights must be positive')
    this.abRules.set(rule.modelName, rule)
  }

  clearAbRule(modelName: string): boolean {
    return this.abRules.delete(modelName)
  }

  pickVersion(req: PredictionRequest): number {
    if (req.version !== undefined) return req.version
    const rule = this.abRules.get(req.modelName)
    if (rule) {
      const total = rule.splits.reduce((s, x) => s + x.weight, 0)
      const bucket = req.abBucket ?? hashBucket(req.traceId)
      let acc = 0
      for (const s of rule.splits) {
        acc += s.weight / total
        if (bucket < acc) return s.version
      }
      return rule.splits[rule.splits.length - 1].version
    }
    const prod = this.registry.getProductionVersion(req.modelName)
    if (prod) return prod.version
    const versions = this.registry.listVersions(req.modelName)
    if (versions.length === 0) throw new Error('no model version registered for ' + req.modelName)
    return versions[0].version
  }

  // ---- Prediction ----
  predict(req: PredictionRequest): PredictionResponse {
    const start = Date.now()
    this.counters.totalRequests += 1
    try {
      const version = this.pickVersion(req)
      const key = this.cacheKey(req, version)
      if (this.config.enableCache && !req.bypassCache) {
        const hit = this.cache.get(key)
        if (hit && hit.expiresAt > Date.now()) {
          this.counters.cacheHits += 1
          const served: PredictionResponse = { ...hit.response, traceId: req.traceId, cached: true, latencyMs: 0 }
          this.recordLatency(0, req.modelName, version)
          return served
        }
        if (hit) this.cache.delete(key)
      }
      this.counters.cacheMisses += 1
      const handler = this.handlers.get(req.modelName)
      let prediction: PredictionResponse['prediction']
      let confidence: number | undefined
      let source: PredictionResponse['source'] = 'handler'
      if (handler) {
        const out = handler(req.features, { modelName: req.modelName, version, traceId: req.traceId })
        prediction = out.prediction
        confidence = out.confidence
      } else {
        prediction = this.fallbackPredict(req.features)
        source = 'fallback'
      }
      const latencyMs = Date.now() - start
      const resp: PredictionResponse = {
        traceId: req.traceId,
        modelName: req.modelName,
        version,
        prediction,
        confidence,
        latencyMs,
        cached: false,
        servedAt: Date.now(),
        source,
      }
      if (this.config.enableCache) {
        this.evictIfFull()
        this.cache.set(key, { key, response: resp, expiresAt: Date.now() + this.config.cacheTtlMs })
      }
      this.recordLatency(latencyMs, req.modelName, version)
      return resp
    } catch (e) {
      this.counters.errors += 1
      this.bumpModelCounter(req.modelName, true, 0)
      this.bumpVersionCounter(req.modelName + '::' + (req.version ?? -1), true)
      throw e
    }
  }

  predictBatch(reqs: PredictionRequest[]): PredictionResponse[] {
    return reqs.map(r => this.predict(r))
  }

  // ---- Cache management ----
  clearCache(): void {
    this.cache.clear()
  }

  cacheSize(): number {
    return this.cache.size
  }

  private evictIfFull(): void {
    while (this.cache.size >= this.config.cacheMaxEntries) {
      const firstKey = this.cache.keys().next().value
      if (firstKey === undefined) break
      this.cache.delete(firstKey)
    }
  }

  private cacheKey(req: PredictionRequest, version: number): string {
    const feat = Object.keys(req.features).sort().map(k => k + '=' + JSON.stringify(req.features[k])).join('&')
    return req.modelName + '::v' + version + '::' + feat
  }

  private fallbackPredict(features: PredictionInput): number {
    let s = 0
    for (const k of Object.keys(features)) {
      const v = features[k]
      if (typeof v === 'number') s += v
      else if (typeof v === 'boolean') s += v ? 1 : 0
    }
    return 1 / (1 + Math.exp(-s))
  }

  private recordLatency(ms: number, modelName: string, version: number): void {
    if (!this.config.enableMetrics) return
    this.latencies.push(ms)
    if (this.latencies.length > 5000) this.latencies.shift()
    this.bumpModelCounter(modelName, false, ms)
    this.bumpVersionCounter(modelName + '::' + version, false)
  }

  private bumpModelCounter(modelName: string, isError: boolean, latency: number): void {
    const cur = this.perModel.get(modelName) ?? { requests: 0, errors: 0, totalLatency: 0 }
    cur.requests += 1
    if (isError) cur.errors += 1
    cur.totalLatency += latency
    this.perModel.set(modelName, cur)
  }

  private bumpVersionCounter(key: string, isError: boolean): void {
    const cur = this.perVersion.get(key) ?? { requests: 0, errors: 0 }
    cur.requests += 1
    if (isError) cur.errors += 1
    this.perVersion.set(key, cur)
  }

  // ---- Stats ----
  stats(): InferenceStats {
    const byModel: InferenceStats['byModel'] = {}
    for (const [k, v] of this.perModel) {
      byModel[k] = { requests: v.requests, errors: v.errors, avgLatencyMs: v.requests > 0 ? v.totalLatency / v.requests : 0 }
    }
    const byVersion: InferenceStats['byVersion'] = {}
    for (const [k, v] of this.perVersion) {
      byVersion[k] = { requests: v.requests, errors: v.errors }
    }
    const sorted = [...this.latencies].sort((a, b) => a - b)
    const percentile = (p: number): number => {
      if (sorted.length === 0) return 0
      const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length))
      return sorted[idx]
    }
    const total = this.counters.totalRequests
    const hits = this.counters.cacheHits
    const errors = this.counters.errors
    return {
      totalRequests: total,
      cacheHits: hits,
      cacheMisses: this.counters.cacheMisses,
      errors,
      byModel,
      byVersion,
      latencyBuckets: this.bucketLatencies(sorted),
      p50LatencyMs: percentile(0.5),
      p95LatencyMs: percentile(0.95),
      p99LatencyMs: percentile(0.99),
      avgLatencyMs: sorted.length === 0 ? 0 : sorted.reduce((a, b) => a + b, 0) / sorted.length,
      cacheSize: this.cache.size,
      hitRate: total === 0 ? 0 : hits / total,
      errorRate: total === 0 ? 0 : errors / total,
      uptimeMs: Date.now() - this.startedAt,
    }
  }

  private bucketLatencies(sorted: number[]): LatencyBucket[] {
    const buckets: LatencyBucket[] = [
      { range: '0-1ms', count: 0 },
      { range: '1-5ms', count: 0 },
      { range: '5-10ms', count: 0 },
      { range: '10-50ms', count: 0 },
      { range: '50-100ms', count: 0 },
      { range: '100ms+', count: 0 },
    ]
    for (const v of sorted) {
      if (v <= 1) buckets[0].count += 1
      else if (v <= 5) buckets[1].count += 1
      else if (v <= 10) buckets[2].count += 1
      else if (v <= 50) buckets[3].count += 1
      else if (v <= 100) buckets[4].count += 1
      else buckets[5].count += 1
    }
    return buckets
  }
}

const hashBucket = (traceId: string): number => {
  let h = 2166136261
  for (let i = 0; i < traceId.length; i++) {
    h = (h ^ traceId.charCodeAt(i)) * 16777619
  }
  return ((h >>> 0) % 10_000) / 10_000
}

let _engine: OnlineInferenceEngine | null = null

export const getOnlineInference = (registry: ModelRegistry): OnlineInferenceEngine => {
  if (!_engine) _engine = new OnlineInferenceEngine(registry)
  return _engine
}

export const resetOnlineInference = (): void => {
  _engine = null
}
