// Recommendation Engine: candidate generation, multi-signal scoring, blend strategies, A/B testing, metrics.

import { ModelRegistry } from '../modelreg'
import { cosine as vectorCosine } from '../vector'

export type ItemId = string
export type UserId = string
export type Score = number

export interface Item {
  id: ItemId
  title: string
  category: string
  tags: string[]
  embedding?: number[]
  popularity?: number
  metadata?: Record<string, unknown>
}

export interface UserSignal {
  userId: UserId
  itemId: ItemId
  type: 'view' | 'click' | 'purchase' | 'rating'
  value?: number
  at: number
}

export interface ScoredItem {
  itemId: ItemId
  score: Score
  reasons: string[]
  sources: string[]
}

export interface UserFeatures {
  userId: UserId
  age?: number
  country?: string
  interests?: string[]
  recentViews?: ItemId[]
  purchaseCount?: number
  ratingAvg?: number
}

export interface RecConfig {
  topK: number
  candidatePoolSize: number
  weights: {
    vector: number
    popularity: number
    categoryMatch: number
    coOccurrence: number
    userHistory: number
  }
  enableVector: boolean
  enablePopularity: boolean
  enableCategoryMatch: boolean
  enableCoOccurrence: boolean
  enableUserHistory: boolean
  abRules: { name: string; weight: number }[]
}

export interface RecStats {
  totalRequests: number
  cacheHits: number
  cacheMisses: number
  byStrategy: Record<string, number>
  avgTopK: number
  avgLatencyMs: number
  abDistribution: Record<string, number>
  itemExposure: Record<string, number>
  diversityScore: number
  hitRate: number
}

const DEFAULT_CONFIG: RecConfig = {
  topK: 10,
  candidatePoolSize: 50,
  weights: {
    vector: 0.5,
    popularity: 0.1,
    categoryMatch: 0.15,
    coOccurrence: 0.15,
    userHistory: 0.1,
  },
  enableVector: true,
  enablePopularity: true,
  enableCategoryMatch: true,
  enableCoOccurrence: true,
  enableUserHistory: true,
  abRules: [{ name: 'hybrid', weight: 1 }],
}

export interface RecommendationRequest {
  requestId: string
  user: UserFeatures
  filters?: { category?: string; exclude?: ItemId[]; minPopularity?: number }
  topK?: number
  strategy?: string
}

export interface RecommendationResponse {
  requestId: string
  userId: UserId
  recommendations: ScoredItem[]
  strategy: string
  latencyMs: number
  servedAt: number
  candidateCount: number
  cached: boolean
}

interface CacheEntry {
  key: string
  response: RecommendationResponse
  expiresAt: number
}

export class RecommendationEngine {
  readonly config: RecConfig
  private items: Map<ItemId, Item> = new Map()
  private userSignals: UserSignal[] = []
  private userItemIndex: Map<UserId, Set<ItemId>> = new Map()
  private itemCoOccurrence: Map<ItemId, Map<ItemId, number>> = new Map()
  private itemPopularity: Map<ItemId, number> = new Map()
  private categoryIndex: Map<string, Set<ItemId>> = new Map()
  private cache: Map<string, CacheEntry> = new Map()
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalTopK: 0,
    totalLatency: 0,
    byStrategy: new Map<string, number>(),
    abDistribution: new Map<string, number>(),
    itemExposure: new Map<string, number>(),
    signalCount: 0,
  }
  private abRules: { name: string; weight: number }[] = []
  private startedAt = Date.now()

  constructor(registry: ModelRegistry, config: Partial<RecConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config, weights: { ...DEFAULT_CONFIG.weights, ...(config.weights ?? {}) } }
    this.registry = registry
    this.abRules = [...this.config.abRules]
  }

  readonly registry: ModelRegistry

  // ---- Item management ----
  addItem(item: Item): void {
    this.items.set(item.id, item)
    if (!this.categoryIndex.has(item.category)) this.categoryIndex.set(item.category, new Set())
    this.categoryIndex.get(item.category)!.add(item.id)
    if (item.popularity !== undefined) this.itemPopularity.set(item.id, item.popularity)
  }

  addItems(items: Item[]): void {
    for (const it of items) this.addItem(it)
  }

  removeItem(id: ItemId): boolean {
    const it = this.items.get(id)
    if (!it) return false
    this.items.delete(id)
    this.categoryIndex.get(it.category)?.delete(id)
    this.itemPopularity.delete(id)
    this.itemCoOccurrence.delete(id)
    return true
  }

  getItem(id: ItemId): Item | undefined {
    return this.items.get(id)
  }

  listItems(): Item[] {
    return [...this.items.values()]
  }

  countItems(): number {
    return this.items.size
  }

  // ---- Signals ----
  addSignal(signal: UserSignal): void {
    this.userSignals.push(signal)
    this.stats.signalCount += 1
    if (!this.userItemIndex.has(signal.userId)) this.userItemIndex.set(signal.userId, new Set())
    this.userItemIndex.get(signal.userId)!.add(signal.itemId)
    if (signal.type === 'click' || signal.type === 'purchase') {
      const it = this.items.get(signal.itemId)
      if (it) {
        it.popularity = (it.popularity ?? 0) + 1
        this.itemPopularity.set(signal.itemId, it.popularity)
      } else {
        this.itemPopularity.set(signal.itemId, (this.itemPopularity.get(signal.itemId) ?? 0) + 1)
      }
    }
  }

  addSignals(signals: UserSignal[]): void {
    for (const s of signals) this.addSignal(s)
  }

  /** Build co-occurrence matrix: items viewed/purchased together by the same user. */
  rebuildCoOccurrence(): void {
    this.itemCoOccurrence.clear()
    for (const set of this.userItemIndex.values()) {
      const arr = [...set]
      for (let i = 0; i < arr.length; i++) {
        for (let j = i + 1; j < arr.length; j++) {
          const a = arr[i]
          const b = arr[j]
          if (!this.itemCoOccurrence.has(a)) this.itemCoOccurrence.set(a, new Map())
          if (!this.itemCoOccurrence.has(b)) this.itemCoOccurrence.set(b, new Map())
          this.itemCoOccurrence.get(a)!.set(b, (this.itemCoOccurrence.get(a)!.get(b) ?? 0) + 1)
          this.itemCoOccurrence.get(b)!.set(a, (this.itemCoOccurrence.get(b)!.get(a) ?? 0) + 1)
        }
      }
    }
  }

  // ---- Strategy ----
  setAbRules(rules: { name: string; weight: number }[]): void {
    if (rules.length > 0) {
      const total = rules.reduce((s, x) => s + x.weight, 0)
      if (total <= 0) throw new Error('ab rules weights must be positive')
    }
    this.abRules = [...rules]
  }

  getAbRules(): { name: string; weight: number }[] {
    return [...this.abRules]
  }

  pickStrategy(requestId: string): string {
    const rules = this.abRules.length > 0 ? this.abRules : this.config.abRules
    if (rules.length === 0) return 'hybrid'
    const total = rules.reduce((s, x) => s + x.weight, 0)
    const h = hashBucket(requestId) * total
    let acc = 0
    for (const r of rules) {
      acc += r.weight
      if (h < acc) return r.name
    }
    return rules[rules.length - 1].name
  }

  // ---- Recommend ----
  recommend(req: RecommendationRequest): RecommendationResponse {
    const start = Date.now()
    this.stats.totalRequests += 1
    const strategy = req.strategy ?? this.pickStrategy(req.requestId)
    this.bumpStrategyCounter(strategy)
    const cacheKey = this.cacheKey(req, strategy)
    const hit = this.cache.get(cacheKey)
    if (hit && hit.expiresAt > Date.now()) {
      this.stats.cacheHits += 1
      const served: RecommendationResponse = { ...hit.response, requestId: req.requestId, cached: true, latencyMs: 0 }
      this.recordLatency(0)
      return served
    }
    this.stats.cacheMisses += 1
    const topK = req.topK ?? this.config.topK
    const candidates = this.generateCandidates(req)
    const scored = this.scoreCandidates(candidates, req, strategy)
    const filtered = this.applyFilters(scored, req.filters)
    filtered.sort((a, b) => b.score - a.score)
    const top = filtered.slice(0, topK)
    for (const t of top) this.bumpExposure(t.itemId)
    this.stats.totalTopK += top.length
    const latencyMs = Date.now() - start
    const resp: RecommendationResponse = {
      requestId: req.requestId,
      userId: req.user.userId,
      recommendations: top,
      strategy,
      latencyMs,
      servedAt: Date.now(),
      candidateCount: candidates.length,
      cached: false,
    }
    this.cache.set(cacheKey, { key: cacheKey, response: resp, expiresAt: Date.now() + 30_000 })
    this.recordLatency(latencyMs)
    return resp
  }

  recommendBatch(reqs: RecommendationRequest[]): RecommendationResponse[] {
    return reqs.map(r => this.recommend(r))
  }

  // ---- Candidate generation ----
  private generateCandidates(req: RecommendationRequest): Item[] {
    const out: Item[] = []
    const exclude = new Set(req.filters?.exclude ?? [])
    const seen = new Set<ItemId>()
    if (this.config.enableVector) {
      const userVec = this.userToVector(req.user)
      const scored: { id: ItemId; score: number }[] = []
      for (const it of this.items.values()) {
        if (exclude.has(it.id) || !it.embedding) continue
        const sim = vectorCosine(userVec, it.embedding)
        scored.push({ id: it.id, score: sim })
      }
      scored.sort((a, b) => b.score - a.score)
      for (const r of scored.slice(0, this.config.candidatePoolSize)) {
        if (seen.has(r.id)) continue
        const it = this.items.get(r.id)
        if (it) { out.push(it); seen.add(it.id) }
      }
    }
    if (this.config.enablePopularity) {
      const popular = [...this.itemPopularity.entries()].sort((a, b) => b[1] - a[1])
      for (const [id] of popular) {
        if (exclude.has(id) || seen.has(id)) continue
        const it = this.items.get(id)
        if (it) { out.push(it); seen.add(id) }
        if (out.length >= this.config.candidatePoolSize) break
      }
    }
    if (this.config.enableCategoryMatch && req.user.interests) {
      for (const cat of req.user.interests) {
        const set = this.categoryIndex.get(cat)
        if (!set) continue
        for (const id of set) {
          if (exclude.has(id) || seen.has(id)) continue
          const it = this.items.get(id)
          if (it) { out.push(it); seen.add(id) }
        }
      }
    }
    if (out.length < this.config.candidatePoolSize) {
      for (const it of this.items.values()) {
        if (exclude.has(it.id) || seen.has(it.id)) continue
        out.push(it); seen.add(it.id)
        if (out.length >= this.config.candidatePoolSize) break
      }
    }
    return out
  }

  private userToVector(user: UserFeatures): number[] {
    if (user.recentViews && user.recentViews.length > 0) {
      const seen = new Set<ItemId>()
      const vecs: number[][] = []
      for (const id of user.recentViews) {
        if (seen.has(id)) continue
        seen.add(id)
        const it = this.items.get(id)
        if (it?.embedding) vecs.push(it.embedding)
      }
      if (vecs.length > 0) {
        const dim = vecs[0].length
        const out = new Array<number>(dim).fill(0)
        for (const v of vecs) for (let i = 0; i < dim; i++) out[i] += v[i] / vecs.length
        return out
      }
    }
    return new Array<number>(8).fill(0).map((_, i) => (user.age ?? 25) / 100 + i * 0.01)
  }

  private scoreCandidates(items: Item[], req: RecommendationRequest, strategy: string): ScoredItem[] {
    const w = this.config.weights
    const useVec = this.config.enableVector && strategy !== 'popularity-only'
    const usePop = this.config.enablePopularity && strategy !== 'vector-only'
    const useCat = this.config.enableCategoryMatch
    const useCo = this.config.enableCoOccurrence
    const useHist = this.config.enableUserHistory
    const recentSet = new Set(req.user.recentViews ?? [])
    const interests = new Set(req.user.interests ?? [])
    const maxPop = Math.max(1, ...[...this.itemPopularity.values()])
    const userVec = this.userToVector(req.user)
    return items.map(it => {
      const reasons: string[] = []
      const sources: string[] = []
      let score = 0
      if (useVec && it.embedding) {
        const sim = vectorCosine(userVec, it.embedding)
        score += sim * w.vector
        sources.push('vector')
        if (sim > 0.7) reasons.push('semantic match')
      }
      if (usePop) {
        const pop = (this.itemPopularity.get(it.id) ?? 0) / maxPop
        score += pop * w.popularity
        sources.push('popularity')
        if (pop > 0.5) reasons.push('trending')
      }
      if (useCat && interests.has(it.category)) {
        score += w.categoryMatch
        sources.push('category')
        reasons.push('matches interest ' + it.category)
      }
      if (useCo && recentSet.size > 0) {
        let coBoost = 0
        for (const rid of recentSet) {
          coBoost += this.itemCoOccurrence.get(rid)?.get(it.id) ?? 0
        }
        const norm = Math.min(1, coBoost / 5)
        score += norm * w.coOccurrence
        sources.push('co-occurrence')
        if (coBoost > 0) reasons.push('often seen with ' + [...recentSet].slice(0, 2).join(', '))
      }
      if (useHist && recentSet.has(it.id)) {
        score += w.userHistory
        sources.push('history')
        reasons.push('recently viewed')
      }
      return { itemId: it.id, score, reasons, sources }
    })
  }

  private applyFilters(items: ScoredItem[], filters?: RecommendationRequest['filters']): ScoredItem[] {
    if (!filters) return items
    let out = items
    if (filters.exclude && filters.exclude.length > 0) {
      const ex = new Set(filters.exclude)
      out = out.filter(s => !ex.has(s.itemId))
    }
    if (filters.category) {
      out = out.filter(s => this.items.get(s.itemId)?.category === filters.category)
    }
    if (filters.minPopularity !== undefined) {
      const min = filters.minPopularity
      out = out.filter(s => (this.itemPopularity.get(s.itemId) ?? 0) >= min)
    }
    return out
  }

  // ---- Stats ----
  stats_view(): RecStats {
    const avgLatency = this.stats.totalRequests === 0 ? 0 : this.stats.totalLatency / this.stats.totalRequests
    const avgTopK = this.stats.totalRequests === 0 ? 0 : this.stats.totalTopK / this.stats.totalRequests
    const byStrategy: Record<string, number> = {}
    for (const [k, v] of this.stats.byStrategy) byStrategy[k] = v
    const abDistribution: Record<string, number> = {}
    for (const [k, v] of this.stats.abDistribution) abDistribution[k] = v
    const exposure: Record<string, number> = {}
    for (const [k, v] of this.stats.itemExposure) exposure[k] = v
    const total = this.stats.totalRequests
    const hits = this.stats.cacheHits
    return {
      totalRequests: total,
      cacheHits: hits,
      cacheMisses: this.stats.cacheMisses,
      byStrategy,
      avgTopK,
      avgLatencyMs: avgLatency,
      abDistribution,
      itemExposure: exposure,
      diversityScore: this.computeDiversity(),
      hitRate: total === 0 ? 0 : hits / total,
    }
  }

  private computeDiversity(): number {
    const last = [...this.stats.itemExposure.values()]
    if (last.length === 0) return 0
    const total = last.reduce((a, b) => a + b, 0)
    if (total === 0) return 0
    let h = 0
    for (const v of last) {
      const p = v / total
      h -= p * Math.log(p)
    }
    return h
  }

  private bumpStrategyCounter(s: string): void {
    this.stats.byStrategy.set(s, (this.stats.byStrategy.get(s) ?? 0) + 1)
    this.stats.abDistribution.set(s, (this.stats.abDistribution.get(s) ?? 0) + 1)
  }

  private bumpExposure(id: ItemId): void {
    this.stats.itemExposure.set(id, (this.stats.itemExposure.get(id) ?? 0) + 1)
  }

  private recordLatency(ms: number): void {
    this.stats.totalLatency += ms
  }

  private cacheKey(req: RecommendationRequest, strategy: string): string {
    return req.user.userId + '::' + strategy + '::' + (req.topK ?? this.config.topK) + '::' + (req.filters?.category ?? '*')
  }

  clearCache(): void {
    this.cache.clear()
  }

  cacheSize(): number {
    return this.cache.size
  }

  /** Estimate recall against a ground-truth set of item ids. */
  estimateRecall(groundTruth: ItemId[], predictions: ScoredItem[]): number {
    if (groundTruth.length === 0) return 0
    const set = new Set(predictions.map(p => p.itemId))
    let hit = 0
    for (const id of groundTruth) if (set.has(id)) hit += 1
    return hit / groundTruth.length
  }

  uptimeMs(): number {
    return Date.now() - this.startedAt
  }
}

const hashBucket = (s: string): number => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h = (h ^ s.charCodeAt(i)) * 16777619
  }
  return ((h >>> 0) % 10_000) / 10_000
}

let _engine: RecommendationEngine | null = null

export const getRecommendationEngine = (registry: ModelRegistry): RecommendationEngine => {
  if (!_engine) _engine = new RecommendationEngine(registry)
  return _engine
}

export const resetRecommendationEngine = (): void => {
  _engine = null
}
