import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CacheLayer } from '../index'

describe('CacheLayer · basic get/set/delete', () => {
  let c: CacheLayer
  beforeEach(() => { c = new CacheLayer() })
  it('set + get', () => {
    c.set('k', 1)
    expect(c.get('k')).toBe(1)
  })
  it('get missing', () => {
    expect(c.get('nope')).toBeUndefined()
  })
  it('has', () => {
    c.set('k', 1)
    expect(c.has('k')).toBe(true)
    expect(c.has('nope')).toBe(false)
  })
  it('delete', () => {
    c.set('k', 1)
    expect(c.delete('k')).toBe(true)
    expect(c.get('k')).toBeUndefined()
  })
  it('delete missing', () => {
    expect(c.delete('nope')).toBe(false)
  })
  it('clear all', () => {
    c.set('a', 1); c.set('b', 2)
    expect(c.clear()).toBe(2)
  })
  it('clear by namespace', () => {
    c.set('a', 1, { namespace: 'x' })
    c.set('b', 2, { namespace: 'y' })
    expect(c.clear('x')).toBe(1)
  })
  it('TTL expiration', async () => {
    c.set('k', 1, { ttlMs: 10 })
    expect(c.get('k')).toBe(1)
    await new Promise(r => setTimeout(r, 20))
    expect(c.get('k')).toBeUndefined()
  })
  it('update existing', () => {
    c.set('k', 1)
    c.set('k', 2)
    expect(c.get('k')).toBe(2)
  })
})

describe('CacheLayer · namespaces', () => {
  let c: CacheLayer
  beforeEach(() => { c = new CacheLayer() })
  it('listNamespaces', () => {
    c.set('a', 1, { namespace: 'x' })
    c.set('b', 2, { namespace: 'y' })
    expect(c.listNamespaces().sort()).toEqual(['x', 'y'])
  })
  it('namespaceSize + namespaceKeys', () => {
    c.set('a', 1, { namespace: 'x' })
    c.set('b', 2, { namespace: 'x' })
    c.set('c', 3, { namespace: 'y' })
    expect(c.namespaceSize('x')).toBe(2)
    expect(c.namespaceKeys('x').sort()).toEqual(['a', 'b'])
  })
  it('isolation between namespaces', () => {
    c.set('k', 1, { namespace: 'x' })
    c.set('k', 2, { namespace: 'y' })
    expect(c.get('k', 'x')).toBe(1)
    expect(c.get('k', 'y')).toBe(2)
  })
})

describe('CacheLayer · eviction policies', () => {
  it('lru', () => {
    const c = new CacheLayer({ maxSize: 3, policy: 'lru' })
    c.set('a', 1); c.set('b', 2); c.set('c', 3)
    c.get('a'); c.get('a') // touch a
    c.set('d', 4) // should evict b
    expect(c.has('a')).toBe(true)
    expect(c.has('b')).toBe(false)
    expect(c.has('c')).toBe(true)
    expect(c.has('d')).toBe(true)
  })
  it('fifo', () => {
    const c = new CacheLayer({ maxSize: 3, policy: 'fifo' })
    c.set('a', 1); c.set('b', 2); c.set('c', 3)
    c.set('d', 4) // evict a (first in)
    expect(c.has('a')).toBe(false)
    expect(c.has('d')).toBe(true)
  })
  it('lfu', () => {
    const c = new CacheLayer({ maxSize: 3, policy: 'lfu' })
    c.set('a', 1); c.set('b', 2); c.set('c', 3)
    c.get('b'); c.get('b'); c.get('c')
    c.set('d', 4) // evict a (least frequent)
    expect(c.has('a')).toBe(false)
    expect(c.has('d')).toBe(true)
  })
  it('ttl eviction', () => {
    const c = new CacheLayer({ maxSize: 3, policy: 'ttl' })
    c.set('a', 1, { ttlMs: 100 })
    c.set('b', 2, { ttlMs: 10 })
    c.set('c', 3, { ttlMs: 100 })
    c.set('d', 4, { ttlMs: 100 }) // evict b
    expect(c.has('b')).toBe(false)
  })
  it('maxBytes eviction', () => {
    const c = new CacheLayer({ maxSize: 100, maxBytes: 30, policy: 'fifo' })
    c.set('a', 'x'.repeat(15))
    c.set('b', 'y'.repeat(15))
    c.set('c', 'z'.repeat(15)) // evict a
    expect(c.has('a')).toBe(false)
  })
  it('setPolicy / getPolicy', () => {
    const c = new CacheLayer()
    c.setPolicy('lfu')
    expect(c.getPolicy()).toBe('lfu')
  })
})

describe('CacheLayer · pattern + tag invalidation', () => {
  let c: CacheLayer
  beforeEach(() => { c = new CacheLayer() })
  it('invalidateByPattern *', () => {
    c.set('user:1', { id: 1 }); c.set('user:2', { id: 2 }); c.set('post:1', { id: 1 })
    expect(c.invalidateByPattern('user:*')).toBe(2)
  })
  it('invalidateByPattern with namespace', () => {
    c.set('a', 1, { namespace: 'x' })
    c.set('a', 2, { namespace: 'y' })
    expect(c.invalidateByPattern('a', 'x')).toBe(1)
  })
  it('invalidateByTag', () => {
    c.set('a', 1, { tags: ['hot'] })
    c.set('b', 2, { tags: ['cold'] })
    c.set('c', 3, { tags: ['hot'] })
    expect(c.invalidateByTag('hot')).toBe(2)
  })
  it('invalidateByTag with namespace', () => {
    c.set('a', 1, { tags: ['hot'], namespace: 'x' })
    c.set('b', 2, { tags: ['hot'], namespace: 'y' })
    expect(c.invalidateByTag('hot', 'x')).toBe(1)
  })
})

describe('CacheLayer · singleflight', () => {
  it('coalesces concurrent loads', async () => {
    const c = new CacheLayer()
    let calls = 0
    const fn = async () => { calls++; await new Promise(r => setTimeout(r, 10)); return 42 }
    const [a, b] = await Promise.all([c.singleflight('k', fn), c.singleflight('k', fn)])
    expect(a.value).toBe(42)
    expect(b.value).toBe(42)
    expect(calls).toBe(1)
  })
  it('caches result', async () => {
    const c = new CacheLayer()
    let calls = 0
    const fn = async () => { calls++; return 'v' }
    await c.singleflight('k', fn)
    expect(c.get('k')).toBe('v')
  })
  it('serializes different keys', async () => {
    const c = new CacheLayer()
    const r1 = await c.singleflight('k1', async () => 1)
    const r2 = await c.singleflight('k2', async () => 2)
    expect(r1.value).toBe(1)
    expect(r2.value).toBe(2)
  })
})

describe('CacheLayer · memoize', () => {
  it('basic memoization', () => {
    const c = new CacheLayer()
    let calls = 0
    const fn = (x: number) => { calls++; return x * 2 }
    const m = c.memoize(fn, { keyFn: x => 'k' + x })
    expect(m(5)).toBe(10)
    expect(m(5)).toBe(10)
    expect(m(6)).toBe(12)
    expect(calls).toBe(2)
  })
})

describe('CacheLayer · stale-while-revalidate', () => {
  it('returns stale value past ttl', async () => {
    const c = new CacheLayer({ defaultTtlMs: 10, staleWhileRevalidateMs: 100 })
    c.set('k', 'v')
    await new Promise(r => setTimeout(r, 20))
    expect(c.get('k')).toBe('v')
  })
  it('returns undefined after stale', async () => {
    const c = new CacheLayer({ defaultTtlMs: 10, staleWhileRevalidateMs: 5 })
    c.set('k', 'v')
    await new Promise(r => setTimeout(r, 20))
    expect(c.get('k')).toBeUndefined()
  })
})

describe('CacheLayer · prune + bus + stats', () => {
  let c: CacheLayer
  beforeEach(() => { c = new CacheLayer() })
  it('pruneExpired', async () => {
    c.set('a', 1, { ttlMs: 10 })
    c.set('b', 2, { ttlMs: 100 })
    await new Promise(r => setTimeout(r, 20))
    expect(c.pruneExpired()).toBe(1)
  })
  it('subscribe / emit', () => {
    const events: string[] = []
    c.subscribe(e => events.push(`${e.type}:${e.namespace}:${e.key}`))
    c.set('k', 1, { namespace: 'x' })
    c.delete('k', 'x')
    expect(events.length).toBe(2)
  })
  it('unsubscribe', () => {
    const off = c.subscribe(() => {})
    off()
  })
  it('stats + resetStats', () => {
    c.set('a', 1)
    c.get('a')
    c.get('b')
    const s = c.getStats()
    expect(s.hits).toBe(1)
    expect(s.misses).toBe(1)
    c.resetStats()
    expect(c.getStats().hits).toBe(0)
  })
  it('hitRate', () => {
    c.set('a', 1)
    c.get('a')
    c.get('a')
    c.get('b')
    expect(c.getStats().hitRate).toBeCloseTo(0.666, 2)
  })
  it('getWithRetry', async () => {
    c.set('k', 1)
    expect(await c.getWithRetry('k')).toBe(1)
  })
})

describe('CacheLayer · settings', () => {
  it('setMaxSize / setMaxBytes / setDefaultTtlMs', () => {
    const c = new CacheLayer()
    c.setMaxSize(5)
    c.setMaxBytes(1000)
    c.setDefaultTtlMs(100)
    expect(c.getPolicy()).toBe('lru') // default
  })
})

describe('CacheLayer · singleton', () => {
  it('getCacheLayer / reset', async () => {
    const m = await import('../index')
    const a = m.getCacheLayer()
    const b = m.getCacheLayer()
    expect(a).toBe(b)
    m.resetCacheLayer()
    const c = m.getCacheLayer()
    expect(c).not.toBe(a)
  })
})
