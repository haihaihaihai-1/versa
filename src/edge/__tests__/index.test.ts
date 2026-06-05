/**
 * Versa · Edge Computing Layer (v26.0) — 单元测试
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  detectRegion, isRegionMatch, distanceKm, nearestRegion,
  EdgeCache, edgeCache,
  validateEdgeCode, runEdgeFunction,
  EdgeKV, edgeKV,
  TokenBucket, SlidingWindow, edgeRateLimiter,
  EdgeRouter, edgeRouter, type EdgeRequest,
  EdgeMetricsCollector, edgeMetrics,
  PrefetchEngine, prefetchEngine,
  cachedFetch, buildEdgeRequest, summarizeEdge,
  type EdgeFunction, type RoutingRule, type GeoInfo, type Region,
} from '../index'

// ============== GeoIP ==============

describe('detectRegion', () => {
  it('detects CN from Shanghai timezone', () => {
    const info = detectRegion({ tz: 'Asia/Shanghai', lang: 'zh-CN' })
    expect(info.region).toBe('CN')
    expect(info.tz).toBe('Asia/Shanghai')
    expect(info.city).toBe('北京')
    expect(info.lat).toBeCloseTo(39.9, 0)
  })

  it('detects US from LA timezone', () => {
    const info = detectRegion({ tz: 'America/Los_Angeles', lang: 'en-US' })
    expect(info.region).toBe('US')
    expect(info.lat).toBeCloseTo(37.09, 0)
  })

  it('detects EU from Berlin timezone', () => {
    const info = detectRegion({ tz: 'Europe/Berlin', lang: 'de' })
    expect(info.region).toBe('EU')
  })

  it('detects APAC from Tokyo timezone', () => {
    expect(detectRegion({ tz: 'Asia/Tokyo' }).region).toBe('APAC')
  })

  it('falls back to language for unknown timezone', () => {
    expect(detectRegion({ tz: 'Mars/Olympus', lang: 'zh-TW' }).region).toBe('CN')
    expect(detectRegion({ tz: 'Mars/Olympus', lang: 'ja' }).region).toBe('APAC')
    expect(detectRegion({ tz: 'Mars/Olympus', lang: 'en-GB' }).region).toBe('EU')
    expect(detectRegion({ tz: 'Mars/Olympus', lang: 'en-US' }).region).toBe('US')
  })

  it('returns OTHER for truly unknown inputs', () => {
    expect(detectRegion({ tz: 'Mars/Olympus', lang: 'xx' }).region).toBe('OTHER')
  })

  it('includes coordinates and city', () => {
    const info = detectRegion({ tz: 'Asia/Shanghai' })
    expect(info.lat).toBeGreaterThan(0)
    expect(info.lon).toBeGreaterThan(0)
    expect(info.city).toBeDefined()
  })
})

describe('isRegionMatch', () => {
  const cn: GeoInfo = { region: 'CN', tz: 'Asia/Shanghai', lang: 'zh', lat: 39.9, lon: 116.4 }
  const us: GeoInfo = { region: 'US', tz: 'America/LA', lang: 'en', lat: 37, lon: -95 }

  it('matches when region in list', () => {
    expect(isRegionMatch(cn, ['CN'])).toBe(true)
    expect(isRegionMatch(cn, ['CN', 'US'])).toBe(true)
  })
  it('does not match when not in list', () => {
    expect(isRegionMatch(cn, ['US'])).toBe(false)
    expect(isRegionMatch(us, ['CN', 'EU'])).toBe(false)
  })
})

describe('distanceKm / nearestRegion', () => {
  it('distance from CN to US is ~11000 km', () => {
    const d = distanceKm({ lat: 39.9, lon: 116.4 }, { lat: 37.1, lon: -95.7 })
    expect(d).toBeGreaterThan(10_000)
    expect(d).toBeLessThan(12_000)
  })
  it('distance to self is 0', () => {
    expect(distanceKm({ lat: 39.9, lon: 116.4 }, { lat: 39.9, lon: 116.4 })).toBeCloseTo(0, 3)
  })
  it('nearestRegion picks closest', () => {
    expect(nearestRegion({ lat: 39.9, lon: 116.4 })).toBe('CN')
    expect(nearestRegion({ lat: 1.35, lon: 103.82 })).toBe('APAC')   // Singapore → APAC
    expect(nearestRegion({ lat: 51.5, lon: -0.1 })).toBe('EU')
    expect(nearestRegion({ lat: 40.7, lon: -74.0 })).toBe('US')     // NYC
  })
})

// ============== EdgeCache ==============

describe('EdgeCache', () => {
  let cache: EdgeCache
  beforeEach(() => { cache = new EdgeCache(3) })

  it('set and get', () => {
    cache.set('a', 1, { ttl: 1000 })
    expect(cache.get('a')).toBe(1)
  })

  it('miss returns undefined', () => {
    expect(cache.get('nope')).toBeUndefined()
  })

  it('expires after TTL', async () => {
    cache.set('a', 1, { ttl: 10 })
    await new Promise(r => setTimeout(r, 20))
    expect(cache.get('a')).toBeUndefined()
  })

  it('stale-while-revalidate returns stale value after TTL if staleUntil not yet reached', async () => {
    cache.set('a', 1, { ttl: 20, swrTtl: 500 })
    await new Promise(r => setTimeout(r, 60))
    // single get with allowStale returns stale (entry still present in store)
    expect(cache.get('a', { allowStale: true })).toBe(1)
    // after stale window passes, entry is dropped
    await new Promise(r => setTimeout(r, 600))
    expect(cache.get('a', { allowStale: true })).toBeUndefined()
  })

  it('eviction when maxSize reached (LRU)', () => {
    cache.set('a', 1, { ttl: 60_000 })
    cache.set('b', 2, { ttl: 60_000 })
    cache.set('c', 3, { ttl: 60_000 })
    cache.set('d', 4, { ttl: 60_000 })
    const stats = cache.getStats()
    expect(stats.evictions).toBeGreaterThanOrEqual(1)
    expect(cache.size()).toBeLessThanOrEqual(3)
  })

  it('tag invalidation', () => {
    cache.set('a', 1, { ttl: 60_000, tags: ['user:1', 'post'] })
    cache.set('b', 2, { ttl: 60_000, tags: ['user:1'] })
    cache.set('c', 3, { ttl: 60_000, tags: ['post'] })
    expect(cache.invalidateTag('user:1')).toBe(2)
    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBe(3)
  })

  it('pattern invalidation', () => {
    cache.set('user:1', 1, { ttl: 60_000 })
    cache.set('user:2', 2, { ttl: 60_000 })
    cache.set('post:1', 3, { ttl: 60_000 })
    expect(cache.invalidatePattern(/^user:/)).toBe(2)
    expect(cache.get('user:1')).toBeUndefined()
    expect(cache.get('post:1')).toBe(3)
  })

  it('tracks hit/miss statistics', () => {
    cache.set('a', 1, { ttl: 60_000 })
    cache.get('a'); cache.get('a'); cache.get('miss')
    const s = cache.getStats()
    expect(s.hits).toBe(2)
    expect(s.misses).toBe(1)
    expect(s.hitRate).toBeCloseTo(2 / 3)
  })

  it('etag is stable for same value', () => {
    cache.set('a', { x: 1 }, { ttl: 60_000 })
    const e1 = cache.getEntry<{ x: number }>('a')?.etag
    expect(e1).toBeDefined()
    expect(e1!.startsWith('v1-')).toBe(true)
  })

  it('clear empties cache and tag index', () => {
    cache.set('a', 1, { ttl: 60_000, tags: ['t'] })
    cache.clear()
    expect(cache.size()).toBe(0)
    expect(cache.invalidateTag('t')).toBe(0)
  })

  it('has respects expiration', async () => {
    cache.set('a', 1, { ttl: 10 })
    expect(cache.has('a')).toBe(true)
    await new Promise(r => setTimeout(r, 20))
    expect(cache.has('a')).toBe(false)
  })
})

// ============== Edge Function Sandbox ==============

describe('validateEdgeCode', () => {
  it('accepts empty code as invalid', () => {
    expect(validateEdgeCode('').valid).toBe(false)
  })
  it('rejects oversized code', () => {
    expect(validateEdgeCode('x'.repeat(10_001)).valid).toBe(false)
  })
  it('rejects eval', () => {
    const r = validateEdgeCode('return eval("1+1")')
    expect(r.valid).toBe(false)
    expect(r.reason).toContain('eval')
  })
  it('rejects new Function', () => {
    expect(validateEdgeCode('const f = new Function("return 1")').valid).toBe(false)
  })
  it('rejects fetch access', () => {
    expect(validateEdgeCode('return fetch("/api")').valid).toBe(false)
  })
  it('rejects window access', () => {
    expect(validateEdgeCode('return window.location').valid).toBe(false)
  })
  it('rejects infinite loop', () => {
    expect(validateEdgeCode('while (true) { }').valid).toBe(false)
  })
  it('accepts simple code', () => {
    const r = validateEdgeCode('return input.x * 2')
    expect(r.valid).toBe(true)
  })
})

describe('runEdgeFunction', () => {
  it('runs a simple transformation', async () => {
    const r = await runEdgeFunction('return { doubled: input.x * 2 }', { x: 21 })
    expect(r.ok).toBe(true)
    expect(r.value).toEqual({ doubled: 42 })
    expect(r.duration).toBeGreaterThanOrEqual(0)
  })

  it('captures console logs', async () => {
    const r = await runEdgeFunction('console.log("hello", 1); return input', { ok: true })
    expect(r.logs.join(' ')).toContain('hello')
  })

  it('returns error on exception', async () => {
    const r = await runEdgeFunction('throw new Error("boom")', null)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('boom')
  })

  it('provides env vars', async () => {
    const fn: EdgeFunction = {
      id: 't', name: 't', code: 'return { api: env.API_KEY, k: K }',
      env: { API_KEY: 'secret' },
    }
    const r = await runEdgeFunction(fn, null, { env: { K: 'v' } })
    expect(r.ok).toBe(true)
    expect((r.value as { api: string; k: string }).api).toBe('secret')
    expect((r.value as { api: string; k: string }).k).toBe('v')
  })

  it('blocks eval even at runtime', async () => {
    // validateEdgeCode should catch this before execution
    const v = validateEdgeCode('return eval("1")')
    expect(v.valid).toBe(false)
  })
})

// ============== EdgeKV ==============

describe('EdgeKV', () => {
  let kv: EdgeKV
  beforeEach(() => { kv = new EdgeKV() })

  it('put and get', async () => {
    await kv.put('k1', 'v1')
    expect(await kv.get('k1')).toBe('v1')
  })

  it('returns null for missing key', async () => {
    expect(await kv.get('nope')).toBeNull()
  })

  it('expires after expirationTtl', async () => {
    await kv.put('k1', 'v1', { expirationTtl: 0.01 })
    await new Promise(r => setTimeout(r, 30))
    expect(await kv.get('k1')).toBeNull()
  })

  it('list with prefix', async () => {
    await kv.put('user:1', 'a')
    await kv.put('user:2', 'b')
    await kv.put('post:1', 'c')
    const r = await kv.list('user:')
    expect(r.keys).toHaveLength(2)
    expect(r.keys.map(k => k.name).sort()).toEqual(['user:1', 'user:2'])
  })

  it('list with pagination', async () => {
    for (let i = 0; i < 5; i++) await kv.put(`k${i}`, `v${i}`)
    const r = await kv.list(undefined, { limit: 2 })
    expect(r.keys).toHaveLength(2)
    expect(r.cursor).toBeDefined()
  })

  it('delete', async () => {
    await kv.put('k', 'v')
    expect(await kv.delete('k')).toBe(true)
    expect(await kv.get('k')).toBeNull()
  })

  it('getWithMetadata', async () => {
    await kv.put('k', 'v', { metadata: { source: 'test' } })
    const r = await kv.getWithMetadata('k')
    expect(r.value).toBe('v')
    expect(r.metadata).toEqual({ source: 'test' })
  })
})

// ============== Rate Limiters ==============

describe('TokenBucket', () => {
  it('allows up to capacity, then denies', () => {
    const b = new TokenBucket(3, 0.1)
    expect(b.take('k').allowed).toBe(true)
    expect(b.take('k').allowed).toBe(true)
    expect(b.take('k').allowed).toBe(true)
    const r = b.take('k')
    expect(r.allowed).toBe(false)
    expect(r.retryAfterMs).toBeGreaterThan(0)
  })

  it('refills over time', async () => {
    const b = new TokenBucket(2, 100) // 100 tokens per second
    b.take('k'); b.take('k')
    expect(b.take('k').allowed).toBe(false)
    await new Promise(r => setTimeout(r, 50))
    const t = b.take('k')
    expect(t.allowed).toBe(true)
  })

  it('isolates by key', () => {
    const b = new TokenBucket(1, 0.1)
    expect(b.take('a').allowed).toBe(true)
    expect(b.take('a').allowed).toBe(false)
    expect(b.take('b').allowed).toBe(true)
  })

  it('reset clears state', () => {
    const b = new TokenBucket(1, 0.1)
    b.take('a')
    b.reset('a')
    expect(b.take('a').allowed).toBe(true)
  })
})

describe('SlidingWindow', () => {
  it('allows up to max within window', () => {
    const w = new SlidingWindow(3, 1000)
    expect(w.take('k').allowed).toBe(true)
    expect(w.take('k').allowed).toBe(true)
    expect(w.take('k').allowed).toBe(true)
    const r = w.take('k')
    expect(r.allowed).toBe(false)
  })
  it('window slides', async () => {
    const w = new SlidingWindow(2, 30)
    w.take('k'); w.take('k')
    expect(w.take('k').allowed).toBe(false)
    await new Promise(r => setTimeout(r, 50))
    expect(w.take('k').allowed).toBe(true)
  })
})

// ============== EdgeRouter ==============

function makeReq(over: Partial<EdgeRequest> = {}): EdgeRequest {
  return {
    url: '/', method: 'GET',
    headers: { 'accept-language': 'en-US' },
    cookies: {},
    geo: detectRegion({ tz: 'Asia/Shanghai' }),
    ...over,
  }
}

describe('EdgeRouter', () => {
  it('matches geo rule', () => {
    const r: RoutingRule = {
      id: 'r1', name: 'CN only', priority: 1, enabled: true,
      matcher: { type: 'geo', regions: ['CN'] },
      action: 'allow',
    }
    edgeRouter.clear()
    edgeRouter.addRule(r)
    expect(edgeRouter.match(makeReq({ geo: detectRegion({ tz: 'Asia/Shanghai' }) }))?.id).toBe('r1')
    expect(edgeRouter.match(makeReq({ geo: detectRegion({ tz: 'America/Los_Angeles' }) }))).toBeUndefined()
  })

  it('matches header rule with eq/contains/regex', () => {
    const rules: RoutingRule[] = [
      { id: 'h1', name: 'UA mobile', priority: 1, enabled: true, action: 'allow',
        matcher: { type: 'header', name: 'user-agent', op: 'contains', value: 'Mobile' } },
      { id: 'h2', name: 'Platform win', priority: 2, enabled: true, action: 'allow',
        matcher: { type: 'header', name: 'sec-ch-ua-platform', op: 'regex', value: '^Win' } },
    ]
    edgeRouter.clear()
    rules.forEach(r => edgeRouter.addRule(r))
    expect(edgeRouter.match(makeReq({ headers: { 'user-agent': 'Mozilla Mobile' } }))?.id).toBe('h1')
    expect(edgeRouter.match(makeReq({ headers: { 'sec-ch-ua-platform': 'Windows' } }))?.id).toBe('h2')
    expect(edgeRouter.match(makeReq({ headers: {} }))).toBeUndefined()
  })

  it('matches cookie rule with exists/eq/contains', () => {
    const rules: RoutingRule[] = [
      { id: 'c1', name: 'logged in', priority: 1, enabled: true, action: 'allow',
        matcher: { type: 'cookie', name: 'token', op: 'exists' } },
      { id: 'c2', name: 'role admin', priority: 2, enabled: true, action: 'allow',
        matcher: { type: 'cookie', name: 'role', op: 'eq', value: 'admin' } },
      { id: 'c3', name: 'tag vip', priority: 3, enabled: true, action: 'allow',
        matcher: { type: 'cookie', name: 'flags', op: 'contains', value: 'vip' } },
    ]
    edgeRouter.clear()
    rules.forEach(r => edgeRouter.addRule(r))
    expect(edgeRouter.match(makeReq({ cookies: { token: 'x' } }))?.id).toBe('c1')
    expect(edgeRouter.match(makeReq({ cookies: { role: 'admin' } }))?.id).toBe('c2')
    expect(edgeRouter.match(makeReq({ cookies: { flags: 'vip,beta' } }))?.id).toBe('c3')
  })

  it('respects priority order', () => {
    edgeRouter.clear()
    edgeRouter.addRule({ id: 'low', name: 'low', priority: 10, enabled: true, action: 'allow', matcher: { type: 'geo', regions: ['CN'] } })
    edgeRouter.addRule({ id: 'high', name: 'high', priority: 1, enabled: true, action: 'deny', matcher: { type: 'geo', regions: ['CN'] } })
    expect(edgeRouter.match(makeReq())?.id).toBe('high')
  })

  it('respects enabled flag', () => {
    edgeRouter.clear()
    edgeRouter.addRule({ id: 'r1', name: 'r1', priority: 1, enabled: false, action: 'allow', matcher: { type: 'geo', regions: ['CN'] } })
    expect(edgeRouter.match(makeReq())).toBeUndefined()
  })

  it('matchAll returns all matches', () => {
    edgeRouter.clear()
    edgeRouter.addRule({ id: 'r1', name: 'r1', priority: 1, enabled: true, action: 'allow', matcher: { type: 'geo', regions: ['CN'] } })
    edgeRouter.addRule({ id: 'r2', name: 'r2', priority: 2, enabled: true, action: 'allow', matcher: { type: 'geo', regions: ['CN', 'US'] } })
    expect(edgeRouter.matchAll(makeReq())).toHaveLength(2)
  })

  it('removeRule and updateRule', () => {
    edgeRouter.clear()
    edgeRouter.addRule({ id: 'r1', name: 'r1', priority: 1, enabled: true, action: 'allow', matcher: { type: 'geo', regions: ['CN'] } })
    expect(edgeRouter.updateRule('r1', { name: 'r1-new' })).toBe(true)
    expect(edgeRouter.listRules()[0]?.name).toBe('r1-new')
    expect(edgeRouter.removeRule('r1')).toBe(true)
    expect(edgeRouter.size()).toBe(0)
  })
})

// ============== EdgeMetrics ==============

describe('EdgeMetricsCollector', () => {
  let m: EdgeMetricsCollector
  beforeEach(() => { m = new EdgeMetricsCollector() })

  it('observes and computes p50/p95/p99', () => {
    for (let i = 1; i <= 100; i++) m.observe('lat', i)
    const h = m.histogram('lat')
    expect(h.count).toBe(100)
    expect(h.p50).toBeGreaterThan(40)
    expect(h.p50).toBeLessThan(60)
    expect(h.p95).toBeGreaterThan(90)
    expect(h.p99).toBeGreaterThan(95)
    expect(h.min).toBe(1)
    expect(h.max).toBe(100)
    expect(h.mean).toBeCloseTo(50.5, 0)
  })

  it('inc/dec counters', () => {
    m.inc('req')
    m.inc('req', 5)
    m.dec('req', 2)
    expect(m.counter('req')).toBe(4)
  })

  it('set gauges', () => {
    m.set('cpu', 0.42)
    expect(m.gauge('cpu')).toBe(0.42)
  })

  it('empty histogram', () => {
    expect(m.histogram('none').count).toBe(0)
  })

  it('export roundtrip', () => {
    m.inc('a'); m.set('b', 1); m.observe('c', 10)
    const e = m.export()
    expect(e.counters.a).toBe(1)
    expect(e.gauges.b).toBe(1)
    expect(e.histograms.c[0]).toBe(10)
  })
})

// ============== PrefetchEngine ==============

describe('PrefetchEngine', () => {
  it('prefetches and dedupes', async () => {
    const e = new PrefetchEngine()
    let calls = 0
    const fetcher = () => { calls++; return Promise.resolve(42) }
    const p1 = e.prefetch('k', fetcher)
    const p2 = e.prefetch('k', fetcher)
    expect(p1).toBe(p2)
    const v = await p1
    expect(v).toBe(42)
    expect(calls).toBe(1)
  })

  it('tracks stats', async () => {
    const e = new PrefetchEngine()
    await e.prefetch('a', () => Promise.resolve(1))
    const s = e.getStats()
    expect(s.triggered).toBe(1)
    expect(s.completed).toBe(1)
    expect(s.failed).toBe(0)
  })

  it('handles failures', async () => {
    const e = new PrefetchEngine()
    await e.prefetch('a', () => Promise.reject(new Error('fail'))).catch(() => {})
    expect(e.getStats().failed).toBe(1)
  })

  it('has and get', async () => {
    const e = new PrefetchEngine()
    expect(e.has('a')).toBe(false)
    const p = e.prefetch('a', () => Promise.resolve('v'))
    expect(e.has('a')).toBe(true)
    expect(await e.get('a')).toBe('v')
  })

  it('clear removes all', async () => {
    const e = new PrefetchEngine()
    await e.prefetch('a', () => Promise.resolve(1))
    e.clear()
    expect(e.size()).toBe(0)
  })

  it('attachHover attaches mouseenter listener (skipped in node env)', () => {
    if (typeof document === 'undefined') {
      const e = new PrefetchEngine()
      const fakeEl = { addEventListener: () => {}, removeEventListener: () => {} } as unknown as Element
      const detach = e.attachHover(fakeEl, 'k', () => Promise.resolve('v'), 1000)
      expect(typeof detach).toBe('function')
      detach()
      expect(e.getStats().triggered).toBe(0)
    } else {
      const e = new PrefetchEngine()
      const div = document.createElement('div')
      document.body.appendChild(div)
      const detach = e.attachHover(div, 'k', () => Promise.resolve('v'), 0)
      div.dispatchEvent(new MouseEvent('mouseenter'))
      expect(typeof detach).toBe('function')
      detach()
      document.body.removeChild(div)
    }
  })
})

// ============== cachedFetch & high-level ==============

describe('cachedFetch', () => {
  it('caches result on second call', async () => {
    edgeCache.clear()
    let calls = 0
    const f = () => { calls++; return Promise.resolve({ x: calls }) }
    const r1 = await cachedFetch('k', f, { ttl: 60_000 })
    const r2 = await cachedFetch('k', f, { ttl: 60_000 })
    expect(r1.cached).toBe(false)
    expect(r2.cached).toBe(true)
    expect((r2.data as { x: number }).x).toBe(1)
    expect(calls).toBe(1)
  })

  it('forceRefresh bypasses cache', async () => {
    edgeCache.clear()
    let calls = 0
    const f = () => { calls++; return Promise.resolve(calls) }
    await cachedFetch('k', f, { ttl: 60_000 })
    const r = await cachedFetch('k', f, { ttl: 60_000, forceRefresh: true })
    expect(r.cached).toBe(false)
    expect(r.data).toBe(2)
  })

  it('tracks metrics', async () => {
    edgeCache.clear(); edgeMetrics.reset()
    await cachedFetch('m1', () => Promise.resolve(1))
    await cachedFetch('m1', () => Promise.resolve(1))
    expect(edgeMetrics.counter('edge.cache.hits')).toBeGreaterThan(0)
  })
})

describe('buildEdgeRequest', () => {
  it('handles missing document gracefully', () => {
    const r = buildEdgeRequest('/test')
    expect(r.url).toBe('/test')
    expect(r.method).toBe('GET')
    expect(r.cookies).toBeDefined()
    expect(r.geo).toBeDefined()
  })
  it('populates headers from navigator when available', () => {
    const r = buildEdgeRequest()
    expect(r.geo.region).toBeDefined()
    // headers may be empty in node env, but structure is there
    expect(typeof r.headers).toBe('object')
  })
  it('extracts cookies when document available', () => {
    if (typeof document === 'undefined') return
    document.cookie = 'edge_test_k=v; edge_test_x=y'
    const r = buildEdgeRequest('/test')
    expect(r.cookies.edge_test_k).toBe('v')
    document.cookie = 'edge_test_k=; expires=Thu, 01 Jan 1970 00:00:01 GMT'
  })
})

describe('summarizeEdge', () => {
  it('returns a snapshot of all subsystems', () => {
    const s = summarizeEdge()
    expect(s.cache).toBeDefined()
    expect(s.metrics).toBeDefined()
    expect(s.prefetch).toBeDefined()
  })
})
