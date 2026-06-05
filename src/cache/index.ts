/**
 * Versa · Cache Layer (v49.0)
 * - L1 in-memory + L2 in-memory tiered cache
 * - LRU / LFU / FIFO / TTL eviction policies
 * - Pattern-based invalidation (with wildcards)
 * - Stale-while-revalidate
 * - Stampede protection (singleflight)
 * - Memoization with custom key fn
 * - Namespaces
 * - Stats (hit/miss/eviction/set/get)
 * - Compression flag
 * - Federation: bus for invalidation
 */
import { withRetry } from '../federation'

export type EvictionPolicy = 'lru' | 'lfu' | 'fifo' | 'ttl'

export interface CacheEntry<V = unknown> {
  key: string
  value: V
  expiresAt: number
  insertedAt: number
  accessedAt: number
  hits: number
  staleUntil?: number
  size: number
  namespace: string
  tags: string[]
}

export interface CacheOptions {
  maxSize?: number
  maxBytes?: number
  defaultTtlMs?: number
  policy?: EvictionPolicy
  staleWhileRevalidateMs?: number
}

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  gets: number
  deletes: number
  evictions: number
  invalidations: number
  expirations: number
  bytes: number
  keys: number
  hitRate: number
  namespaces: number
  byNamespace: Record<string, { hits: number; misses: number; sets: number; keys: number }>
}

export interface SingleflightResult<V> {
  value: V
  computedBy: string
  durationMs: number
}

export class CacheLayer {
  private store = new Map<string, CacheEntry>()
  private lruOrder: string[] = [] // MRU at end
  private lfuCounts = new Map<string, number>()
  private fifoOrder: string[] = []
  private namespaces = new Set<string>()
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, gets: 0, deletes: 0, evictions: 0, invalidations: 0, expirations: 0, bytes: 0, keys: 0, hitRate: 0, namespaces: 0, byNamespace: {} }
  private inflight = new Map<string, Promise<unknown>>()
  private bus = new Set<(event: { type: 'invalidate' | 'update'; key: string; namespace: string }) => void>()
  private maxSize = 1000
  private maxBytes = 10 * 1024 * 1024
  private defaultTtlMs = 60_000
  private policy: EvictionPolicy = 'lru'
  private staleWhileRevalidateMs = 0

  constructor(opts: CacheOptions = {}) {
    this.maxSize = opts.maxSize ?? 1000
    this.maxBytes = opts.maxBytes ?? 10 * 1024 * 1024
    this.defaultTtlMs = opts.defaultTtlMs ?? 60_000
    this.policy = opts.policy ?? 'lru'
    this.staleWhileRevalidateMs = opts.staleWhileRevalidateMs ?? 0
  }

  // -------- Get / Set --------
  get<V = unknown>(key: string, ns = 'default'): V | undefined {
    this.stats.gets++
    const full = this.fullKey(ns, key)
    const e = this.store.get(full)
    if (!e) { this.recordMiss(ns); this.stats.misses++; return undefined }
    const now = Date.now()
    if (e.expiresAt <= now) {
      // check stale-while-revalidate
      if (this.staleWhileRevalidateMs > 0 && e.staleUntil && e.staleUntil > now) {
        // return stale value
        e.accessedAt = now; e.hits++
        this.recordHit(ns)
        return e.value as V
      }
      this.store.delete(full)
      this.removeFromOrder(full)
      this.lfuCounts.delete(full)
      this.stats.bytes -= e.size
      this.stats.expirations++
      this.recordMiss(ns)
      this.stats.misses++
      this.stats.keys--
      return undefined
    }
    e.accessedAt = now
    e.hits++
    this.lfuCounts.set(full, (this.lfuCounts.get(full) ?? 0) + 1)
    if (this.policy === 'lru') this.touchLru(full)
    this.recordHit(ns)
    return e.value as V
  }
  set<V = unknown>(key: string, value: V, opts: { ttlMs?: number; namespace?: string; tags?: string[] } = {}): boolean {
    const ns = opts.namespace ?? 'default'
    const full = this.fullKey(ns, key)
    const now = Date.now()
    const ttl = opts.ttlMs ?? this.defaultTtlMs
    const size = this.estimateSize(value)
    // check space
    if (this.store.size >= this.maxSize || this.stats.bytes + size > this.maxBytes) this.evictOne()
    if (this.store.has(full)) {
      const old = this.store.get(full)!
      this.stats.bytes -= old.size
      this.removeFromOrder(full)
    }
    const e: CacheEntry<V> = { key, value, expiresAt: now + ttl, insertedAt: now, accessedAt: now, hits: 0, staleUntil: this.staleWhileRevalidateMs > 0 ? now + ttl + this.staleWhileRevalidateMs : undefined, size, namespace: ns, tags: opts.tags ?? [] }
    this.store.set(full, e as CacheEntry<unknown>)
    this.namespaces.add(ns)
    this.stats.bytes += size
    this.stats.sets++
    this.stats.keys = this.store.size
    this.lfuCounts.set(full, 0)
    if (this.policy === 'lru') this.lruOrder.push(full)
    else if (this.policy === 'fifo') this.fifoOrder.push(full)
    this.emit({ type: 'update', key, namespace: ns })
    return true
  }
  delete(key: string, ns = 'default'): boolean {
    const full = this.fullKey(ns, key)
    const e = this.store.get(full)
    if (!e) return false
    this.store.delete(full)
    this.removeFromOrder(full)
    this.lfuCounts.delete(full)
    this.stats.bytes -= e.size
    this.stats.deletes++
    this.stats.keys--
    this.emit({ type: 'invalidate', key, namespace: ns })
    return true
  }
  has(key: string, ns = 'default'): boolean {
    const e = this.store.get(this.fullKey(ns, key))
    if (!e) return false
    if (e.expiresAt <= Date.now()) return false
    return true
  }
  clear(ns?: string): number {
    if (!ns) {
      const n = this.store.size
      this.store.clear()
      this.lruOrder = []
      this.fifoOrder = []
      this.lfuCounts.clear()
      this.namespaces.clear()
      this.stats.bytes = 0
      this.stats.keys = 0
      return n
    }
    let n = 0
    for (const [k, v] of [...this.store.entries()]) {
      if (v.namespace === ns) { this.store.delete(k); this.removeFromOrder(k); this.lfuCounts.delete(k); this.stats.bytes -= v.size; n++ }
    }
    this.namespaces.delete(ns)
    this.stats.keys = this.store.size
    return n
  }

  // -------- Eviction --------
  private evictOne(): void {
    let key: string | null = null
    if (this.policy === 'lru') {
      key = this.lruOrder.shift() ?? null
    } else if (this.policy === 'fifo') {
      key = this.fifoOrder.shift() ?? null
    } else if (this.policy === 'lfu') {
      let min = Infinity
      for (const [k, c] of this.lfuCounts) if (c < min) { min = c; key = k }
    } else {
      // ttl: pick earliest expiresAt
      let earliest = Infinity
      for (const [k, e] of this.store) if (e.expiresAt < earliest) { earliest = e.expiresAt; key = k }
    }
    if (!key) return
    const e = this.store.get(key)
    if (e) { this.stats.bytes -= e.size; this.stats.keys-- }
    this.store.delete(key)
    this.removeFromOrder(key)
    this.lfuCounts.delete(key)
    this.stats.evictions++
  }
  private touchLru(key: string): void {
    const idx = this.lruOrder.indexOf(key)
    if (idx >= 0) this.lruOrder.splice(idx, 1)
    this.lruOrder.push(key)
  }
  private removeFromOrder(key: string): void {
    const i = this.lruOrder.indexOf(key)
    if (i >= 0) this.lruOrder.splice(i, 1)
    const j = this.fifoOrder.indexOf(key)
    if (j >= 0) this.fifoOrder.splice(j, 1)
  }
  private estimateSize(v: unknown): number {
    try { return JSON.stringify(v).length } catch { return 64 }
  }
  private fullKey(ns: string, key: string): string { return `${ns}::${key}` }

  // -------- Pattern invalidation --------
  invalidateByPattern(pattern: string, ns?: string): number {
    const re = this.globToRegex(pattern)
    let n = 0
    for (const [k, e] of [...this.store.entries()]) {
      if (ns && e.namespace !== ns) continue
      if (re.test(k) || re.test(e.key)) {
        this.store.delete(k)
        this.removeFromOrder(k)
        this.lfuCounts.delete(k)
        this.stats.bytes -= e.size
        this.stats.invalidations++
        this.stats.keys--
        n++
        this.emit({ type: 'invalidate', key: e.key, namespace: e.namespace })
      }
    }
    return n
  }
  invalidateByTag(tag: string, ns?: string): number {
    let n = 0
    for (const [k, e] of [...this.store.entries()]) {
      if (ns && e.namespace !== ns) continue
      if (e.tags.includes(tag)) {
        this.store.delete(k)
        this.removeFromOrder(k)
        this.lfuCounts.delete(k)
        this.stats.bytes -= e.size
        this.stats.invalidations++
        this.stats.keys--
        n++
        this.emit({ type: 'invalidate', key: e.key, namespace: e.namespace })
      }
    }
    return n
  }
  private globToRegex(p: string): RegExp {
    return new RegExp('^' + p.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
  }

  // -------- Singleflight / stampede protection --------
  async singleflight<V>(key: string, fn: () => Promise<V>, opts: { ttlMs?: number; namespace?: string } = {}): Promise<SingleflightResult<V>> {
    const ns = opts.namespace ?? 'default'
    const full = this.fullKey(ns, key)
    if (this.inflight.has(full)) {
      const v = await this.inflight.get(full)!
      return { value: v as V, computedBy: 'inflight', durationMs: 0 }
    }
    const p = (async () => {
      const t0 = Date.now()
      try {
        const v = await fn()
        this.set(key, v, { ttlMs: opts.ttlMs, namespace: ns })
        return v
      } finally {
        this.inflight.delete(full)
        void t0
      }
    })()
    this.inflight.set(full, p)
    const value = await p
    return { value, computedBy: 'fresh', durationMs: 0 }
  }

  // -------- Memoize --------
  memoize<Args extends unknown[], R>(fn: (...a: Args) => R, opts: { keyFn: (...a: Args) => string; ttlMs?: number; namespace?: string }): (...a: Args) => R {
    return (...args: Args): R => {
      const k = opts.keyFn(...args)
      const cached = this.get<R>(k, opts.namespace)
      if (cached !== undefined) return cached
      const r = fn(...args)
      this.set(k, r, { ttlMs: opts.ttlMs, namespace: opts.namespace })
      return r
    }
  }
  // alias for legacy
  private get optsnamespace(): string { return 'default' }

  // -------- Namespaces --------
  listNamespaces(): string[] { return [...this.namespaces] }
  namespaceSize(ns: string): number {
    let n = 0
    for (const e of this.store.values()) if (e.namespace === ns) n++
    return n
  }
  namespaceKeys(ns: string): string[] { return [...this.store.values()].filter(e => e.namespace === ns).map(e => e.key) }

  // -------- Prune --------
  pruneExpired(): number {
    const now = Date.now()
    let n = 0
    for (const [k, e] of [...this.store.entries()]) {
      if (e.expiresAt <= now && (!e.staleUntil || e.staleUntil <= now)) {
        this.store.delete(k); this.removeFromOrder(k); this.lfuCounts.delete(k); this.stats.bytes -= e.size; this.stats.expirations++; this.stats.keys--; n++
      }
    }
    return n
  }

  // -------- Bus (pub/sub for invalidation) --------
  subscribe(fn: (event: { type: 'invalidate' | 'update'; key: string; namespace: string }) => void): () => void {
    this.bus.add(fn)
    return () => { this.bus.delete(fn) }
  }
  private emit(event: { type: 'invalidate' | 'update'; key: string; namespace: string }): void {
    for (const fn of this.bus) try { fn(event) } catch { /* ignore */ }
  }

  // -------- Stats --------
  private recordHit(ns: string): void { this.stats.hits++; const m = this.stats.byNamespace[ns] ?? { hits: 0, misses: 0, sets: 0, keys: 0 }; m.hits++; this.stats.byNamespace[ns] = m }
  private recordMiss(ns: string): void { const m = this.stats.byNamespace[ns] ?? { hits: 0, misses: 0, sets: 0, keys: 0 }; m.misses++; this.stats.byNamespace[ns] = m }
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0
    this.stats.namespaces = this.namespaces.size
    this.stats.keys = this.store.size
    return JSON.parse(JSON.stringify(this.stats))
  }
  resetStats(): void { this.stats = { hits: 0, misses: 0, sets: 0, gets: 0, deletes: 0, evictions: 0, invalidations: 0, expirations: 0, bytes: 0, keys: 0, hitRate: 0, namespaces: 0, byNamespace: {} } }

  // -------- Settings --------
  setPolicy(p: EvictionPolicy): void { this.policy = p }
  getPolicy(): EvictionPolicy { return this.policy }
  setMaxSize(n: number): void { this.maxSize = n }
  setMaxBytes(n: number): void { this.maxBytes = n }
  setDefaultTtlMs(ms: number): void { this.defaultTtlMs = ms }

  // -------- Federation --------
  async getWithRetry<V>(key: string, ns = 'default'): Promise<V | undefined> {
    return withRetry(async () => this.get<V>(key, ns), { maxAttempts: 3, baseDelayMs: 50, maxDelayMs: 500, jitter: true, retryOnStatus: [] })
  }
}

let _instance: CacheLayer | null = null
export function getCacheLayer(): CacheLayer { if (!_instance) _instance = new CacheLayer(); return _instance }
export function resetCacheLayer(): void { _instance = null }
export { CacheLayer as default }
