/**
 * Versa · Edge Computing Layer (v26.0)
 *
 * 浏览器侧边缘计算模拟层（无需服务端），覆盖现代边缘平台核心能力：
 * - GeoIP 解析 (timezone + accept-language)
 * - Edge Cache (TTL / SWR / tag 失效 / pattern 失效 / LRU)
 * - Edge Function 沙箱 (受限 Function 构造器执行)
 * - Edge KV (KV 存储 + TTL)
 * - Edge Rate Limiter (Token Bucket)
 * - Edge Router (geo / header / cookie matcher)
 * - Edge Metrics (histogram / counter / gauge, p50/p95/p99)
 * - Prefetch Engine (visible / hover / idle trigger + 去重)
 * - 高阶 cachedFetch 包装
 */

// ============== Types ==============

export type Region = 'CN' | 'US' | 'EU' | 'APAC' | 'OTHER'

export interface GeoInfo {
  region: Region
  tz: string
  lang: string
  lat: number
  lon: number
  city?: string
}

export interface CacheEntry<T> {
  value: T
  expiresAt: number
  staleUntil?: number
  tags?: string[]
  etag?: string
  createdAt: number
}

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  evictions: number
  size: number
  hitRate: number
}

export interface EdgeFunction {
  id: string
  name: string
  code: string
  timeout?: number
  env?: Record<string, string>
}

export interface EdgeFunctionResult {
  ok: boolean
  value?: unknown
  error?: string
  duration: number
  logs: string[]
}

export interface PrefetchStats {
  triggered: number
  completed: number
  failed: number
  bytesLoaded: number
  avgLatency: number
  inflight: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  limit: number
  retryAfterMs?: number
}

export type Matcher = GeoMatcher | HeaderMatcher | CookieMatcher

export interface GeoMatcher { type: 'geo'; regions: Region[] }
export interface HeaderMatcher { type: 'header'; name: string; op: 'eq' | 'contains' | 'regex'; value: string }
export interface CookieMatcher { type: 'cookie'; name: string; op: 'exists' | 'eq' | 'contains'; value?: string }

export interface RoutingRule {
  id: string
  name: string
  matcher: Matcher
  action: 'allow' | 'deny' | 'redirect' | 'rewrite'
  target?: string
  enabled: boolean
  priority: number
}

export interface EdgeMetrics {
  p50: number
  p95: number
  p99: number
  count: number
  total: number
  min: number
  max: number
  mean: number
}

export interface EdgeRequest {
  url: string
  method: string
  headers: Record<string, string>
  cookies: Record<string, string>
  geo: GeoInfo
}

// ============== GeoIP ==============

const TZ_TO_REGION: Record<string, Region> = {
  'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'CN', 'Asia/Taipei': 'CN', 'Asia/Chongqing': 'CN', 'Asia/Urumqi': 'CN',
  'Asia/Tokyo': 'APAC', 'Asia/Seoul': 'APAC', 'Asia/Singapore': 'APAC', 'Asia/Bangkok': 'APAC', 'Asia/Jakarta': 'APAC',
  'America/New_York': 'US', 'America/Los_Angeles': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Phoenix': 'US',
  'Europe/London': 'EU', 'Europe/Paris': 'EU', 'Europe/Berlin': 'EU', 'Europe/Madrid': 'EU', 'Europe/Rome': 'EU', 'Europe/Amsterdam': 'EU',
}
const LANG_TO_REGION: Record<string, Region> = {
  'zh': 'CN', 'zh-CN': 'CN', 'zh-TW': 'CN', 'zh-HK': 'CN',
  'ja': 'APAC', 'ko': 'APAC', 'th': 'APAC', 'vi': 'APAC', 'id': 'APAC', 'ms': 'APAC',
  'en-US': 'US', 'es-MX': 'US', 'fr-CA': 'US',
  'en-GB': 'EU', 'de': 'EU', 'fr': 'EU', 'es': 'EU', 'it': 'EU', 'nl': 'EU', 'pt': 'EU',
}
const REGION_COORDS: Record<Region, [number, number, string]> = {
  CN: [39.9042, 116.4074, '北京'],
  US: [37.0902, -95.7129, '堪萨斯'],
  EU: [50.1109, 8.6821, '法兰克福'],
  APAC: [22.3193, 114.1694, '香港'],
  OTHER: [0, 0, '未知'],
}

export function detectRegion(opts?: { tz?: string; lang?: string }): GeoInfo {
  const tz = opts?.tz ?? (typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC') ?? 'UTC'
  const lang = opts?.lang ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US') ?? 'en-US'
  let region: Region = TZ_TO_REGION[tz] ?? 'OTHER'
  if (region === 'OTHER') {
    region = LANG_TO_REGION[lang] ?? LANG_TO_REGION[lang.split('-')[0] ?? ''] ?? 'OTHER'
  }
  const [lat, lon, city] = REGION_COORDS[region]
  return { region, tz, lang, lat, lon, city }
}

export function isRegionMatch(info: GeoInfo, regions: Region[]): boolean {
  return regions.includes(info.region)
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(x)))
}

export function nearestRegion(from: { lat: number; lon: number }): Region {
  let best: Region = 'OTHER'
  let bestD = Infinity
  for (const [r, [lat, lon]] of Object.entries(REGION_COORDS) as [Region, [number, number, string]][]) {
    const d = distanceKm(from, { lat, lon })
    if (d < bestD) { bestD = d; best = r }
  }
  return best
}

// ============== Edge Cache ==============

function fnv1a(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0
  }
  return h.toString(36)
}

export class EdgeCache {
  private store = new Map<string, CacheEntry<unknown>>()
  private tagIndex = new Map<string, Set<string>>()
  private stats: CacheStats = { hits: 0, misses: 0, sets: 0, evictions: 0, size: 0, hitRate: 0 }

  constructor(public maxSize = 1000) {}

  get<T>(key: string, opts?: { allowStale?: boolean }): T | undefined {
    const entry = this.store.get(key) as CacheEntry<T> | undefined
    if (!entry) { this.recordMiss(); return undefined }
    const now = Date.now()
    if (entry.expiresAt <= now) {
      const stillStale = entry.staleUntil !== undefined && entry.staleUntil > now
      if (opts?.allowStale && stillStale) {
        this.recordHit(); return entry.value
      }
      // Truly expired (or no stale window) — drop the entry
      this.store.delete(key); this.unindexTags(key, entry.tags); this.recordMiss()
      return undefined
    }
    // LRU bump
    this.store.delete(key); this.store.set(key, entry as CacheEntry<unknown>)
    this.recordHit(); return entry.value
  }

  set<T>(key: string, value: T, opts: { ttl: number; swrTtl?: number; tags?: string[] }): void {
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const oldest = this.store.keys().next().value
      if (oldest) {
        const ev = this.store.get(oldest)
        this.store.delete(oldest)
        if (ev) this.unindexTags(oldest, ev.tags)
        this.stats.evictions++
      }
    }
    const now = Date.now()
    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + opts.ttl,
      staleUntil: opts.swrTtl ? now + opts.ttl + opts.swrTtl : undefined,
      tags: opts.tags,
      etag: 'v1-' + fnv1a(typeof value === 'string' ? value : JSON.stringify(value)),
      createdAt: now,
    }
    this.store.set(key, entry as CacheEntry<unknown>)
    this.indexTags(key, opts.tags)
    this.stats.sets++
    this.stats.size = this.store.size
  }

  has(key: string): boolean {
    const e = this.store.get(key)
    return !!e && e.expiresAt > Date.now()
  }

  delete(key: string): boolean {
    const e = this.store.get(key)
    if (!e) return false
    this.store.delete(key)
    this.unindexTags(key, e.tags)
    this.stats.size = this.store.size
    return true
  }

  invalidateTag(tag: string): number {
    const keys = this.tagIndex.get(tag)
    if (!keys) return 0
    let n = 0
    for (const k of [...keys]) if (this.delete(k)) n++
    this.tagIndex.delete(tag)
    return n
  }

  invalidateTags(tags: string[]): number {
    return tags.reduce((sum, t) => sum + this.invalidateTag(t), 0)
  }

  invalidatePattern(regex: RegExp): number {
    let n = 0
    for (const k of [...this.store.keys()]) if (regex.test(k) && this.delete(k)) n++
    return n
  }

  clear(): void {
    this.store.clear(); this.tagIndex.clear()
    this.stats.size = 0
  }

  keys(): string[] { return [...this.store.keys()] }
  size(): number { return this.store.size }
  getStats(): CacheStats { return { ...this.stats, hitRate: this.stats.hitRate } }
  resetStats(): void { this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0, size: this.store.size, hitRate: 0 } }

  getEntry<T>(key: string): CacheEntry<T> | undefined { return this.store.get(key) as CacheEntry<T> | undefined }

  private recordHit(): void { this.stats.hits++; this.updateRate() }
  private recordMiss(): void { this.stats.misses++; this.updateRate() }
  private updateRate(): void {
    const t = this.stats.hits + this.stats.misses
    this.stats.hitRate = t === 0 ? 0 : this.stats.hits / t
  }
  private indexTags(key: string, tags?: string[]): void {
    if (!tags) return
    for (const t of tags) {
      let s = this.tagIndex.get(t)
      if (!s) { s = new Set(); this.tagIndex.set(t, s) }
      s.add(key)
    }
  }
  private unindexTags(key: string, tags?: string[]): void {
    if (!tags) return
    for (const t of tags) this.tagIndex.get(t)?.delete(key)
  }
}

export const edgeCache = new EdgeCache()

// ============== Edge Function Sandbox ==============

const ALLOWED_GLOBALS = new Set([
  'Math', 'Date', 'JSON', 'String', 'Number', 'Array', 'Object', 'Boolean',
  'RegExp', 'Map', 'Set', 'Promise', 'Symbol', 'Error', 'TypeError', 'RangeError',
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent',
  'ArrayBuffer', 'Uint8Array', 'Int8Array', 'Float32Array', 'Float64Array', 'DataView',
])

const FORBIDDEN_KEYWORDS = [
  'eval', 'Function(', 'new Function',
  'importScripts', 'document.write',
  'window.', 'self.', 'globalThis',
  'localStorage', 'sessionStorage', 'indexedDB',
  'fetch(', 'XMLHttpRequest', 'WebSocket',
  'navigator', 'process.',
]

export function validateEdgeCode(code: string): { valid: boolean; reason?: string; warnings?: string[] } {
  const warnings: string[] = []
  if (code.length === 0) return { valid: false, reason: '代码为空' }
  if (code.length > 10_000) return { valid: false, reason: `代码超过 10KB 限制 (${code.length} chars)` }
  for (const kw of FORBIDDEN_KEYWORDS) {
    if (code.includes(kw)) return { valid: false, reason: `禁用 API: ${kw.replace(/[().]/g, '')}` }
  }
  if (/(?:while\s*\(\s*true\s*\))|(?:for\s*\(\s*;\s*;\s*\))|(?:while\s*\(\s*1\s*\))/i.test(code)) {
    return { valid: false, reason: '禁止无限循环' }
  }
  if (/__proto__|constructor\s*\[/.test(code)) {
    warnings.push('检测到原型链访问，已沙箱化')
  }
  return { valid: true, warnings }
}

export async function runEdgeFunction(
  fn: EdgeFunction | string,
  input: unknown,
  ctx?: { req?: EdgeRequest; env?: Record<string, string> }
): Promise<EdgeFunctionResult> {
  const start = performance.now()
  const code = typeof fn === 'string' ? fn : fn.code
  const fnEnv = (typeof fn === 'object' ? fn.env : undefined) ?? {}
  const mergedEnv = { ...fnEnv, ...(ctx?.env ?? {}) }
  const logs: string[] = []
  const sandboxConsole = {
    log: (...a: unknown[]) => logs.push(a.map(stringify).join(' ')),
    info: (...a: unknown[]) => logs.push('[INFO] ' + a.map(stringify).join(' ')),
    warn: (...a: unknown[]) => logs.push('[WARN] ' + a.map(stringify).join(' ')),
    error: (...a: unknown[]) => logs.push('[ERROR] ' + a.map(stringify).join(' ')),
  }
  try {
    const envKeys = Object.keys(mergedEnv)
    const fnConstructor = new Function(
      'input', 'ctx', 'console', 'env',
      ...envKeys,
      `"use strict"; return (function() { ${code} })();`
    )
    const sandbox: Record<string, unknown> = {}
    for (const g of ALLOWED_GLOBALS) (sandbox as Record<string, unknown>)[g] = (globalThis as Record<string, unknown>)[g]
    const envValues = envKeys.map(k => mergedEnv[k])
    const result = fnConstructor.call(sandbox, input, ctx?.req ?? null, sandboxConsole, mergedEnv, ...envValues)
    const value = await Promise.resolve(result)
    return { ok: true, value, duration: performance.now() - start, logs }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), duration: performance.now() - start, logs }
  }
}

function stringify(v: unknown): string {
  if (typeof v === 'string') return v
  if (v === null || v === undefined) return String(v)
  if (typeof v === 'object') { try { return JSON.stringify(v) } catch { return '[Object]' } }
  return String(v)
}

// ============== Edge KV ==============

interface KVEntry { value: string; expiresAt?: number; createdAt: number; metadata?: Record<string, string> }

export class EdgeKV {
  private store = new Map<string, KVEntry>()

  async get(key: string): Promise<string | null> {
    const e = this.store.get(key)
    if (!e) return null
    if (e.expiresAt && e.expiresAt < Date.now()) { this.store.delete(key); return null }
    return e.value
  }

  async put(key: string, value: string, opts?: { expirationTtl?: number; metadata?: Record<string, string> }): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: opts?.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : undefined,
      createdAt: Date.now(),
      metadata: opts?.metadata,
    })
  }

  async delete(key: string): Promise<boolean> { return this.store.delete(key) }

  async list(prefix?: string, opts?: { limit?: number; cursor?: string }): Promise<{ keys: { name: string; expiration?: number; metadata?: Record<string, string> }[]; cursor?: string }> {
    const out: { name: string; expiration?: number; metadata?: Record<string, string> }[] = []
    let i = 0
    let skipped = 0
    const cursorIdx = opts?.cursor ? parseInt(opts.cursor, 10) : 0
    for (const [k, v] of this.store) {
      if (prefix && !k.startsWith(prefix)) continue
      if (skipped < cursorIdx) { skipped++; continue }
      if (opts?.limit && out.length >= opts.limit) {
        return { keys: out, cursor: String(cursorIdx + out.length) }
      }
      out.push({ name: k, expiration: v.expiresAt ? Math.floor(v.expiresAt / 1000) : undefined, metadata: v.metadata })
      i++
    }
    return { keys: out }
  }

  async getWithMetadata(key: string): Promise<{ value: string | null; metadata: Record<string, string> | null }> {
    const e = this.store.get(key)
    if (!e) return { value: null, metadata: null }
    return { value: e.value, metadata: e.metadata ?? null }
  }

  size(): number { return this.store.size }
  clear(): void { this.store.clear() }
}

export const edgeKV = new EdgeKV()

// ============== Edge Rate Limiter (Token Bucket) ==============

interface Bucket { tokens: number; lastRefill: number }

export class TokenBucket {
  private buckets = new Map<string, Bucket>()

  constructor(public capacity: number, public refillRate: number) {}

  take(key: string, cost = 1): RateLimitResult {
    const now = Date.now()
    let b = this.buckets.get(key)
    if (!b) { b = { tokens: this.capacity, lastRefill: now }; this.buckets.set(key, b) }
    const elapsed = (now - b.lastRefill) / 1000
    b.tokens = Math.min(this.capacity, b.tokens + elapsed * this.refillRate)
    b.lastRefill = now
    if (b.tokens >= cost) {
      b.tokens -= cost
      return { allowed: true, remaining: Math.floor(b.tokens), resetAt: 0, limit: this.capacity }
    }
    const need = cost - b.tokens
    const retryMs = Math.ceil((need / this.refillRate) * 1000)
    return { allowed: false, remaining: Math.floor(b.tokens), resetAt: now + retryMs, limit: this.capacity, retryAfterMs: retryMs }
  }

  reset(key?: string): void {
    if (key) this.buckets.delete(key)
    else this.buckets.clear()
  }

  inspect(key: string): { tokens: number; capacity: number } | undefined {
    const b = this.buckets.get(key)
    if (!b) return undefined
    return { tokens: b.tokens, capacity: this.capacity }
  }
}

export class SlidingWindow {
  private windows = new Map<string, number[]>()

  constructor(public max: number, public windowMs: number) {}

  take(key: string, now = Date.now()): RateLimitResult {
    const cutoff = now - this.windowMs
    const arr = (this.windows.get(key) ?? []).filter(t => t > cutoff)
    if (arr.length >= this.max) {
      const oldest = arr[0]!
      return { allowed: false, remaining: 0, resetAt: oldest + this.windowMs, limit: this.max, retryAfterMs: oldest + this.windowMs - now }
    }
    arr.push(now)
    this.windows.set(key, arr)
    return { allowed: true, remaining: this.max - arr.length, resetAt: now + this.windowMs, limit: this.max }
  }

  reset(key?: string): void {
    if (key) this.windows.delete(key)
    else this.windows.clear()
  }
}

export const edgeRateLimiter = new TokenBucket(100, 10)

// ============== Edge Router ==============

export class EdgeRouter {
  private rules: RoutingRule[] = []

  addRule(rule: RoutingRule): void { this.rules.push(rule); this.sort() }
  removeRule(id: string): boolean {
    const before = this.rules.length
    this.rules = this.rules.filter(r => r.id !== id)
    return this.rules.length < before
  }
  updateRule(id: string, patch: Partial<RoutingRule>): boolean {
    const idx = this.rules.findIndex(r => r.id === id)
    if (idx === -1) return false
    this.rules[idx] = { ...this.rules[idx]!, ...patch, id }
    this.sort()
    return true
  }
  listRules(): RoutingRule[] { return [...this.rules] }
  clear(): void { this.rules = [] }
  size(): number { return this.rules.length }

  match(req: EdgeRequest): RoutingRule | undefined {
    for (const rule of this.rules) {
      if (!rule.enabled) continue
      if (this.matcherMatches(rule.matcher, req)) return rule
    }
    return undefined
  }

  matchAll(req: EdgeRequest): RoutingRule[] {
    return this.rules.filter(r => r.enabled && this.matcherMatches(r.matcher, req))
  }

  private matcherMatches(m: Matcher, req: EdgeRequest): boolean {
    if (m.type === 'geo') return isRegionMatch(req.geo, m.regions)
    if (m.type === 'header') {
      const v = req.headers[m.name.toLowerCase()]
      if (v === undefined) return false
      if (m.op === 'eq') return v === m.value
      if (m.op === 'contains') return v.includes(m.value)
      if (m.op === 'regex') { try { return new RegExp(m.value).test(v) } catch { return false } }
    }
    if (m.type === 'cookie') {
      const v = req.cookies[m.name]
      if (m.op === 'exists') return v !== undefined
      if (v === undefined) return false
      if (m.op === 'eq') return v === m.value
      if (m.op === 'contains') return v.includes(m.value ?? '')
    }
    return false
  }

  private sort(): void { this.rules.sort((a, b) => a.priority - b.priority) }
}

export const edgeRouter = new EdgeRouter()

// ============== Edge Metrics ==============

export class EdgeMetricsCollector {
  private histograms = new Map<string, number[]>()
  private counters = new Map<string, number>()
  private gauges = new Map<string, number>()

  observe(name: string, value: number): void {
    let arr = this.histograms.get(name)
    if (!arr) { arr = []; this.histograms.set(name, arr) }
    arr.push(value)
    if (arr.length > 2000) arr.shift()
  }

  inc(name: string, n = 1): void { this.counters.set(name, (this.counters.get(name) ?? 0) + n) }
  dec(name: string, n = 1): void { this.counters.set(name, (this.counters.get(name) ?? 0) - n) }

  set(name: string, value: number): void { this.gauges.set(name, value) }

  histogram(name: string): EdgeMetrics {
    const arr = this.histograms.get(name) ?? []
    if (arr.length === 0) return { p50: 0, p95: 0, p99: 0, count: 0, total: 0, min: 0, max: 0, mean: 0 }
    const sorted = [...arr].sort((a, b) => a - b)
    const p = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]!
    const total = arr.reduce((s, v) => s + v, 0)
    return {
      p50: p(0.5), p95: p(0.95), p99: p(0.99),
      count: arr.length, total,
      min: sorted[0]!, max: sorted[sorted.length - 1]!, mean: total / arr.length,
    }
  }

  counter(name: string): number { return this.counters.get(name) ?? 0 }
  gauge(name: string): number { return this.gauges.get(name) ?? 0 }

  countersAll(): Record<string, number> { return Object.fromEntries(this.counters) }
  gaugesAll(): Record<string, number> { return Object.fromEntries(this.gauges) }
  histogramNames(): string[] { return [...this.histograms.keys()] }

  reset(): void { this.histograms.clear(); this.counters.clear(); this.gauges.clear() }
  export(): { histograms: Record<string, number[]>; counters: Record<string, number>; gauges: Record<string, number> } {
    return {
      histograms: Object.fromEntries(this.histograms),
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
    }
  }
}

export const edgeMetrics = new EdgeMetricsCollector()

// ============== Prefetch Engine ==============

export class PrefetchEngine {
  private cache = new Map<string, Promise<unknown>>()
  private stats: PrefetchStats = { triggered: 0, completed: 0, failed: 0, bytesLoaded: 0, avgLatency: 0, inflight: 0 }
  private totalLatency = 0
  private observer?: IntersectionObserver

  prefetch<T>(key: string, fetcher: () => Promise<T>, opts?: { priority?: number; ttl?: number }): Promise<T> | undefined {
    if (this.cache.has(key)) return this.cache.get(key) as Promise<T>
    this.stats.triggered++
    this.stats.inflight++
    const start = performance.now()
    const p = fetcher()
      .then(v => {
        this.stats.completed++
        this.stats.inflight--
        try { this.stats.bytesLoaded += JSON.stringify(v).length } catch { /* circular */ }
        this.totalLatency += performance.now() - start
        this.stats.avgLatency = this.totalLatency / this.stats.completed
        return v
      })
      .catch(e => {
        this.stats.failed++
        this.stats.inflight--
        this.cache.delete(key)
        throw e
      })
    this.cache.set(key, p as Promise<unknown>)
    if (opts?.ttl) setTimeout(() => this.cache.delete(key), opts.ttl)
    return p
  }

  get<T>(key: string): Promise<T> | undefined { return this.cache.get(key) as Promise<T> | undefined }
  has(key: string): boolean { return this.cache.has(key) }
  clear(): void { this.cache.clear() }
  size(): number { return this.cache.size }
  getStats(): PrefetchStats { return { ...this.stats } }

  attachVisible(el: Element, key: string, fetcher: () => Promise<unknown>, rootMargin = '50px'): () => void {
    if (typeof IntersectionObserver === 'undefined') return () => {}
    this.observer ??= new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) this.prefetch(key, fetcher)
    }, { rootMargin })
    this.observer.observe(el)
    return () => { this.observer?.unobserve(el) }
  }

  attachHover(el: Element, key: string, fetcher: () => Promise<unknown>, delay = 80): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onEnter = () => { timer = setTimeout(() => this.prefetch(key, fetcher), delay) }
    const onLeave = () => { if (timer) clearTimeout(timer) }
    el.addEventListener('mouseenter', onEnter)
    el.addEventListener('mouseleave', onLeave)
    el.addEventListener('touchstart', onEnter, { passive: true })
    return () => {
      el.removeEventListener('mouseenter', onEnter)
      el.removeEventListener('mouseleave', onLeave)
      el.removeEventListener('touchstart', onEnter)
      if (timer) clearTimeout(timer)
    }
  }

  attachIdle(key: string, fetcher: () => Promise<unknown>): () => void {
    const ric = (cb: () => void) => (typeof (globalThis as any).requestIdleCallback === 'function'
      ? (globalThis as any).requestIdleCallback(cb, { timeout: 2000 })
      : setTimeout(cb, 1500))
    const id = ric(() => this.prefetch(key, fetcher))
    return () => {
      if (typeof (globalThis as any).cancelIdleCallback === 'function') (globalThis as any).cancelIdleCallback(id)
      else clearTimeout(id)
    }
  }
}

export const prefetchEngine = new PrefetchEngine()

// ============== High-level helpers ==============

export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  opts: { ttl?: number; swrTtl?: number; tags?: string[]; forceRefresh?: boolean } = {}
): Promise<{ data: T; cached: boolean; etag?: string }> {
  const ttl = opts.ttl ?? 60_000
  edgeMetrics.inc('edge.cache.requests')
  if (!opts.forceRefresh) {
    const hit = edgeCache.get<T>(key, { allowStale: true })
    if (hit !== undefined) {
      edgeMetrics.inc('edge.cache.hits')
      return { data: hit, cached: true }
    }
    edgeMetrics.inc('edge.cache.misses')
  }
  const start = performance.now()
  const data = await fetcher()
  edgeMetrics.observe('edge.cache.fetchMs', performance.now() - start)
  edgeCache.set(key, data, { ttl, swrTtl: opts.swrTtl, tags: opts.tags })
  return { data, cached: false, etag: edgeCache.getEntry<T>(key)?.etag }
}

export function buildEdgeRequest(url = '/'): EdgeRequest {
  const headers: Record<string, string> = {}
  if (typeof navigator !== 'undefined') {
    headers['accept-language'] = navigator.language
    headers['user-agent'] = navigator.userAgent
    headers['sec-ch-ua-platform'] = (navigator as unknown as { platform?: string }).platform ?? 'unknown'
  }
  const cookies: Record<string, string> = {}
  if (typeof document !== 'undefined') {
    for (const part of document.cookie.split(';')) {
      const idx = part.indexOf('=')
      if (idx > 0) cookies[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
    }
  }
  return { url, method: 'GET', headers, cookies, geo: detectRegion() }
}

export function summarizeEdge(): {
  cache: CacheStats
  kv: number
  rate: number
  rules: number
  metrics: { counters: number; gauges: number; histograms: number }
  prefetch: PrefetchStats
} {
  return {
    cache: edgeCache.getStats(),
    kv: edgeKV.size(),
    rate: edgeRateLimiter['buckets'].size,
    rules: edgeRouter.size(),
    metrics: {
      counters: edgeMetrics.countersAll ? Object.keys(edgeMetrics.countersAll()).length : 0,
      gauges: edgeMetrics.gaugesAll ? Object.keys(edgeMetrics.gaugesAll()).length : 0,
      histograms: edgeMetrics.histogramNames().length,
    },
    prefetch: prefetchEngine.getStats(),
  }
}
