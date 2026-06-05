/**
 * Versa · Federation Layer (v27.0) — 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  ServiceRegistry, serviceRegistry,
  HealthChecker, healthChecker,
  LoadBalancer, loadBalancer,
  CircuitBreakerManager, circuitBreakers,
  computeBackoff, withRetry, defaultRetry,
  FederationRouter, federationRouter,
  GraphQLStitcher, graphqlStitcher,
  FederationMetricsCollector, federationMetrics,
  federatedRequest, summarizeFederation,
  type Service, type RouteRule, type SubgraphSchema,
} from '../index'

// ============== ServiceRegistry ==============

describe('ServiceRegistry', () => {
  let r: ServiceRegistry
  beforeEach(() => { r = new ServiceRegistry() })

  it('registers and retrieves by id', () => {
    const s = r.register({ id: 's1', name: 'auth', url: 'http://a', protocol: 'http', region: 'CN', tags: ['core'], weight: 1, metadata: {} })
    expect(s.id).toBe('s1')
    expect(r.get('s1')?.name).toBe('auth')
  })

  it('rejects duplicate id', () => {
    r.register({ id: 's1', name: 'a', url: 'u', protocol: 'http', region: 'CN', tags: [], weight: 1, metadata: {} })
    expect(() => r.register({ id: 's1', name: 'b', url: 'u', protocol: 'http', region: 'CN', tags: [], weight: 1, metadata: {} })).toThrow()
  })

  it('indexes by name / tag / region', () => {
    r.register({ id: 's1', name: 'auth', url: 'u', protocol: 'http', region: 'CN', tags: ['core', 'user'], weight: 1, metadata: {} })
    r.register({ id: 's2', name: 'auth', url: 'u', protocol: 'http', region: 'US', tags: ['core'], weight: 2, metadata: {} })
    r.register({ id: 's3', name: 'shop', url: 'u', protocol: 'http', region: 'CN', tags: ['product'], weight: 1, metadata: {} })
    expect(r.getByName('auth')).toHaveLength(2)
    expect(r.getByTag('core')).toHaveLength(2)
    expect(r.getByRegion('CN')).toHaveLength(2)
  })

  it('unregister cleans up indexes', () => {
    r.register({ id: 's1', name: 'auth', url: 'u', protocol: 'http', region: 'CN', tags: ['core'], weight: 1, metadata: {} })
    expect(r.unregister('s1')).toBe(true)
    expect(r.getByName('auth')).toHaveLength(0)
    expect(r.getByTag('core')).toHaveLength(0)
  })

  it('list / size / tags / regions / clear', () => {
    r.register({ id: 's1', name: 'a', url: 'u', protocol: 'http', region: 'CN', tags: ['t1'], weight: 1, metadata: {} })
    r.register({ id: 's2', name: 'b', url: 'u', protocol: 'http', region: 'US', tags: ['t2'], weight: 1, metadata: {} })
    expect(r.size()).toBe(2)
    expect(r.list()).toHaveLength(2)
    expect(r.tags().sort()).toEqual(['t1', 't2'])
    expect(r.regions().sort()).toEqual(['CN', 'US'])
    r.clear()
    expect(r.size()).toBe(0)
  })

  it('non-existent returns empty', () => {
    expect(r.getByName('nope')).toEqual([])
    expect(r.getByTag('nope')).toEqual([])
  })
})

// ============== HealthChecker ==============

describe('HealthChecker', () => {
  let h: HealthChecker
  beforeEach(() => { h = new HealthChecker() })

  it('stores manually set status', () => {
    h.setStatus({ serviceId: 's1', serviceName: 'a', status: 'healthy', latencyMs: 5, lastCheck: Date.now(), consecutiveFailures: 0, consecutiveSuccesses: 10, uptime: 1, checks: 10 })
    expect(h.get('s1')?.status).toBe('healthy')
    expect(h.getAll()).toHaveLength(1)
  })

  it('uses injected prober', async () => {
    const prober = vi.fn().mockResolvedValue({ ok: true, latencyMs: 7 })
    h.setProber(prober)
    const svc: Service = { id: 's1', name: 'a', url: 'http://a', protocol: 'http', region: 'CN', tags: [], weight: 1, metadata: {}, healthCheck: { path: '/health', intervalMs: 1000, timeoutMs: 500 }, createdAt: Date.now() }
    h.start(svc)
    await new Promise(r => setTimeout(r, 50))
    h.stop('s1')
    expect(prober).toHaveBeenCalled()
  })

  it('stopAll clears all timers', () => {
    const svc: Service = { id: 's1', name: 'a', url: 'http://a', protocol: 'http', region: 'CN', tags: [], weight: 1, metadata: {}, healthCheck: { intervalMs: 1000, timeoutMs: 500 }, createdAt: Date.now() }
    h.start(svc)
    h.stopAll()
    expect(h.get('s1')).toBeUndefined()
  })
})

// ============== LoadBalancer ==============

describe('LoadBalancer', () => {
  const mk = (id: string, weight: number): Service => ({ id, name: id, url: 'u', protocol: 'http', region: 'CN', tags: [], weight, metadata: {}, createdAt: Date.now() })

  it('returns undefined for empty pool', () => {
    expect(new LoadBalancer().pick([], 'round-robin')).toBeUndefined()
  })

  it('returns the only service when pool has one', () => {
    const lb = new LoadBalancer()
    const s = mk('a', 1)
    expect(lb.pick([s], 'round-robin')?.id).toBe('a')
  })

  it('round-robin cycles through all', () => {
    const lb = new LoadBalancer()
    const pool = [mk('a', 1), mk('b', 1), mk('c', 1)]
    const seen = new Set<string>()
    for (let i = 0; i < 9; i++) seen.add(lb.pick(pool, 'round-robin')!.id)
    expect(seen).toEqual(new Set(['a', 'b', 'c']))
  })

  it('weighted roughly proportional', () => {
    const lb = new LoadBalancer()
    const pool = [mk('a', 1), mk('b', 9)]
    const counts: Record<string, number> = { a: 0, b: 0 }
    for (let i = 0; i < 1000; i++) counts[lb.pick(pool, 'weighted')!.id]!++
    expect(counts.b).toBeGreaterThan(counts.a! * 5)
  })

  it('least-conn picks lowest connection count', () => {
    const lb = new LoadBalancer()
    const pool = [mk('a', 1), mk('b', 1)]
    lb.acquire(pool[1]!)
    expect(lb.pick(pool, 'least-conn')?.id).toBe('a')
    lb.release(pool[1]!)
  })

  it('consistent-hash is deterministic for same key', () => {
    const lb = new LoadBalancer()
    const pool = [mk('a', 1), mk('b', 1), mk('c', 1)]
    const r1 = lb.pick(pool, 'consistent-hash', { key: 'user:42' })?.id
    const r2 = lb.pick(pool, 'consistent-hash', { key: 'user:42' })?.id
    expect(r1).toBe(r2)
  })

  it('random covers all', () => {
    const lb = new LoadBalancer()
    const pool = [mk('a', 1), mk('b', 1), mk('c', 1)]
    const seen = new Set<string>()
    for (let i = 0; i < 30; i++) seen.add(lb.pick(pool, 'random')!.id)
    expect(seen.size).toBeGreaterThan(1)
  })

  it('acquire/release changes conn count', () => {
    const lb = new LoadBalancer()
    const s = mk('a', 1)
    lb.acquire(s)
    expect(lb['conns'].get(s.id)).toBe(1)
    lb.release(s)
    expect(lb['conns'].get(s.id)).toBe(0)
  })

  it('reset clears counters', () => {
    const lb = new LoadBalancer()
    lb.pick([mk('a', 1), mk('b', 1)], 'round-robin')
    lb.reset()
    expect(lb['counters'].size).toBe(0)
  })
})

// ============== Circuit Breaker ==============

describe('CircuitBreakerManager', () => {
  const cfg = { failureThreshold: 3, cooldownMs: 1000, halfOpenMaxTrials: 1 }
  let cb: CircuitBreakerManager
  beforeEach(() => { cb = new CircuitBreakerManager() })

  it('starts CLOSED and allows requests', () => {
    expect(cb.get('s1').state).toBe('CLOSED')
    expect(cb.allowRequest('s1', cfg)).toBe(true)
  })

  it('opens after failure threshold', () => {
    cb.recordFailure('s1', cfg); cb.recordFailure('s1', cfg); cb.recordFailure('s1', cfg)
    expect(cb.get('s1').state).toBe('OPEN')
    expect(cb.allowRequest('s1', cfg)).toBe(false)
  })

  it('transitions to HALF_OPEN after cooldown and allows trial', async () => {
    cb.recordFailure('s1', cfg); cb.recordFailure('s1', cfg); cb.recordFailure('s1', cfg)
    await new Promise(r => setTimeout(r, 1100))
    expect(cb.allowRequest('s1', cfg)).toBe(true)
    expect(cb.get('s1').state).toBe('HALF_OPEN')
  })

  it('HALF_OPEN success → CLOSED', async () => {
    cb.recordFailure('s1', cfg); cb.recordFailure('s1', cfg); cb.recordFailure('s1', cfg)
    await new Promise(r => setTimeout(r, 1100))
    cb.allowRequest('s1', cfg)
    cb.recordSuccess('s1')
    expect(cb.get('s1').state).toBe('CLOSED')
  })

  it('HALF_OPEN failure → OPEN', async () => {
    cb.recordFailure('s1', cfg); cb.recordFailure('s1', cfg); cb.recordFailure('s1', cfg)
    await new Promise(r => setTimeout(r, 1100))
    cb.allowRequest('s1', cfg)
    cb.recordFailure('s1', cfg)
    expect(cb.get('s1').state).toBe('OPEN')
  })

  it('HALF_OPEN respects max trials', async () => {
    cb.recordFailure('s1', cfg); cb.recordFailure('s1', cfg); cb.recordFailure('s1', cfg)
    await new Promise(r => setTimeout(r, 1100))
    expect(cb.allowRequest('s1', cfg)).toBe(true)
    expect(cb.allowRequest('s1', cfg)).toBe(false)
  })

  it('forceOpen and forceClose', () => {
    cb.forceOpen('s1')
    expect(cb.get('s1').state).toBe('OPEN')
    cb.forceClose('s1')
    expect(cb.get('s1').state).toBe('CLOSED')
  })

  it('reset clears state', () => {
    cb.recordFailure('s1', cfg)
    cb.reset('s1')
    expect(cb.get('s1').state).toBe('CLOSED')
  })
})

// ============== Retry ==============

describe('withRetry', () => {
  it('succeeds on first try', async () => {
    const fn = vi.fn().mockResolvedValue(42)
    expect(await withRetry(fn, { ...defaultRetry, maxAttempts: 3 })).toBe(42)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries until success', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValueOnce('ok')
    expect(await withRetry(fn, { ...defaultRetry, maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1, jitter: false })).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fail'))
    await expect(withRetry(fn, { ...defaultRetry, maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 1, jitter: false })).rejects.toThrow('always fail')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('respects shouldRetry', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('x'))
    const shouldRetry = vi.fn().mockReturnValue(false)
    await expect(withRetry(fn, { ...defaultRetry, maxAttempts: 5, baseDelayMs: 1 }, shouldRetry)).rejects.toThrow()
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('computeBackoff', () => {
  it('grows exponentially', () => {
    const cfg = { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 10_000, jitter: false, retryOnStatus: [] }
    expect(computeBackoff(1, cfg)).toBe(100)
    expect(computeBackoff(2, cfg)).toBe(200)
    expect(computeBackoff(3, cfg)).toBe(400)
    expect(computeBackoff(4, cfg)).toBe(800)
  })
  it('caps at maxDelayMs', () => {
    const cfg = { maxAttempts: 20, baseDelayMs: 100, maxDelayMs: 500, jitter: false, retryOnStatus: [] }
    expect(computeBackoff(20, cfg)).toBe(500)
  })
  it('jitter adds randomness in [0.5, 1.0)', () => {
    const cfg = { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 100, jitter: true, retryOnStatus: [] }
    for (let i = 0; i < 20; i++) {
      const v = computeBackoff(1, cfg)
      expect(v).toBeGreaterThanOrEqual(50)
      expect(v).toBeLessThan(100)
    }
  })
})

// ============== FederationRouter ==============

function makeRouter(): FederationRouter {
  const r = new FederationRouter()
  r.addRule({ id: 'r1', name: 'auth path', priority: 1, enabled: true, matcher: { path: '/auth/*' }, service: 'auth', action: 'route' })
  r.addRule({ id: 'r2', name: 'POST shop', priority: 2, enabled: true, matcher: { path: '/shop/*', method: 'POST' }, service: 'shop', action: 'route', fallbackService: 'shop-backup', retries: 2 })
  r.addRule({ id: 'r3', name: 'tagged', priority: 3, enabled: true, matcher: { tag: 'premium' }, service: 'premium', action: 'route' })
  r.addRule({ id: 'r4', name: 'header', priority: 4, enabled: true, matcher: { header: { 'x-region': 'cn' } }, service: 'cn-svc', action: 'route' })
  r.addRule({ id: 'r5', name: 'reject', priority: 5, enabled: true, matcher: { path: '/admin/*' }, service: 'admin', action: 'reject' })
  r.addRule({ id: 'r6', name: 'disabled', priority: 6, enabled: false, matcher: { path: '/off/*' }, service: 'off', action: 'route' })
  return r
}

describe('FederationRouter', () => {
  it('matches by path', () => {
    const r = makeRouter()
    expect(r.match('GET', '/auth/me', {}, [])?.id).toBe('r1')
  })
  it('matches by method + path', () => {
    const r = makeRouter()
    expect(r.match('POST', '/shop/cart', {}, [])?.id).toBe('r2')
  })
  it('matches by tag', () => {
    const r = makeRouter()
    expect(r.match('GET', '/whatever', {}, ['premium'])?.id).toBe('r3')
  })
  it('matches by header', () => {
    const r = makeRouter()
    expect(r.match('GET', '/x', { 'x-region': 'cn' }, [])?.id).toBe('r4')
  })
  it('rejects on action=reject', () => {
    const r = makeRouter()
    expect(r.match('GET', '/admin/users', {}, [])?.action).toBe('reject')
  })
  it('ignores disabled rules', () => {
    const r = makeRouter()
    expect(r.match('GET', '/off/x', {}, [])).toBeUndefined()
  })
  it('returns undefined for no match', () => {
    const r = makeRouter()
    expect(r.match('GET', '/unknown', {}, [])).toBeUndefined()
  })
  it('matchAll returns multiple', () => {
    const r = new FederationRouter()
    r.addRule({ id: 'a', name: 'a', priority: 1, enabled: true, matcher: { path: '/x' }, service: 'a', action: 'route' })
    r.addRule({ id: 'b', name: 'b', priority: 2, enabled: true, matcher: { tag: 'x' }, service: 'b', action: 'route' })
    expect(r.matchAll('GET', '/x', {}, ['x'])).toHaveLength(2)
  })
  it('removeRule / size / clear', () => {
    const r = new FederationRouter()
    r.addRule({ id: 'a', name: 'a', priority: 1, enabled: true, matcher: { path: '/x' }, service: 'a', action: 'route' })
    expect(r.removeRule('a')).toBe(true)
    expect(r.size()).toBe(0)
    r.addRule({ id: 'b', name: 'b', priority: 1, enabled: true, matcher: { path: '/x' }, service: 'b', action: 'route' })
    r.clear()
    expect(r.size()).toBe(0)
  })
  it('path params: /users/:id matches /users/42', () => {
    const r = new FederationRouter()
    r.addRule({ id: 'u', name: 'u', priority: 1, enabled: true, matcher: { path: '/users/:id' }, service: 'users', action: 'route' })
    expect(r.match('GET', '/users/42', {}, [])?.id).toBe('u')
    expect(r.match('GET', '/users/42/posts', {}, [])).toBeUndefined()
  })
  it('wildcard path: /api/*', () => {
    const r = new FederationRouter()
    r.addRule({ id: 'a', name: 'a', priority: 1, enabled: true, matcher: { path: '/api/*' }, service: 'api', action: 'route' })
    expect(r.match('GET', '/api/v1/users', {}, [])?.id).toBe('a')
  })
})

// ============== GraphQLStitcher ==============

describe('GraphQLStitcher', () => {
  it('stitches two subgraphs', () => {
    const s = new GraphQLStitcher()
    s.addSubgraph({ service: 'auth', sdl: 'type Query { me: User, login(token: String): String } type User { id: ID, name: String }' })
    s.addSubgraph({ service: 'shop', sdl: 'type Query { products: [Product] } type Mutation { addToCart(id: ID): Cart } type Product { id: ID, name: String } type Cart { id: ID }' })
    const r = s.stitch()
    expect(r.services.sort()).toEqual(['auth', 'shop'])
    expect(r.queries.find(q => q.name === 'me')?.service).toBe('auth')
    expect(r.queries.find(q => q.name === 'products')?.service).toBe('shop')
    expect(r.mutations.find(m => m.name === 'addToCart')?.service).toBe('shop')
    expect(r.types.find(t => t.name === 'User')?.service).toBe('auth')
  })

  it('removeSubgraph', () => {
    const s = new GraphQLStitcher()
    s.addSubgraph({ service: 'a', sdl: 'type Query { x: String }' })
    expect(s.removeSubgraph('a')).toBe(true)
    expect(s.size()).toBe(0)
  })

  it('resolveField finds owner service', () => {
    const s = new GraphQLStitcher()
    s.addSubgraph({ service: 'auth', sdl: 'type Query { me: User }' })
    s.addSubgraph({ service: 'shop', sdl: 'type Query { products: [Product] }' })
    expect(s.resolveField('Query', 'me')?.service).toBe('auth')
    expect(s.resolveField('Query', 'products')?.service).toBe('shop')
    expect(s.resolveField('Query', 'nope')).toBeUndefined()
  })
})

// ============== FederationMetrics ==============

describe('FederationMetricsCollector', () => {
  let m: FederationMetricsCollector
  beforeEach(() => { m = new FederationMetricsCollector() })

  it('tracks counters and histograms', () => {
    m.inc('fed.req')
    m.inc('fed.req.auth')
    m.observe('fed.lat.auth', 10)
    m.observe('fed.lat.auth', 20)
    m.observe('fed.lat.auth', 30)
    const s = m.snapshot()
    expect(s.totalRequests).toBe(1)
    expect(s.byService.auth?.requests).toBe(1)
    expect(s.byService.auth?.avgLatency).toBeCloseTo(20, 0)
  })

  it('errorRate is 0 when no requests', () => {
    expect(m.snapshot().errorRate).toBe(0)
  })

  it('reset clears', () => {
    m.inc('x')
    m.reset()
    expect(m.counter('x')).toBe(0)
  })
})

// ============== federatedRequest ==============

describe('federatedRequest', () => {
  beforeEach(() => {
    serviceRegistry.clear()
    federationRouter.clear()
    federationMetrics.reset()
    circuitBreakers.reset()
    loadBalancer.reset()
  })

  it('returns 404 when no route matches', async () => {
    const r = await federatedRequest({ method: 'GET', path: '/nope' }, async () => ({ status: 200, data: {} }))
    expect(r.ok).toBe(false)
    expect(r.status).toBe(404)
  })

  it('returns 403 when route rejects', async () => {
    federationRouter.addRule({ id: 'x', name: 'x', priority: 1, enabled: true, matcher: { path: '/admin' }, service: 'admin', action: 'reject' })
    const r = await federatedRequest({ method: 'GET', path: '/admin' }, async () => ({ status: 200, data: {} }))
    expect(r.status).toBe(403)
  })

  it('returns 502 when service not registered', async () => {
    federationRouter.addRule({ id: 'x', name: 'x', priority: 1, enabled: true, matcher: { path: '/x' }, service: 'missing', action: 'route' })
    const r = await federatedRequest({ method: 'GET', path: '/x' }, async () => ({ status: 200, data: {} }))
    expect(r.status).toBe(502)
  })

  it('routes to service and returns data', async () => {
    serviceRegistry.register({ id: 's1', name: 'auth', url: 'http://a', protocol: 'http', region: 'CN', tags: [], weight: 1, metadata: {} })
    federationRouter.addRule({ id: 'x', name: 'x', priority: 1, enabled: true, matcher: { path: '/me' }, service: 'auth', action: 'route' })
    const r = await federatedRequest({ method: 'GET', path: '/me' }, async () => ({ status: 200, data: { id: 1 } }))
    expect(r, JSON.stringify(r)).toEqual(expect.objectContaining({ ok: true, data: { id: 1 }, service: 'auth' }))
  })

  it('uses fallback on failure', async () => {
    serviceRegistry.register({ id: 'p', name: 'p', url: 'http://p', protocol: 'http', region: 'CN', tags: [], weight: 1, metadata: {} })
    serviceRegistry.register({ id: 'f', name: 'f', url: 'http://f', protocol: 'http', region: 'CN', tags: [], weight: 1, metadata: {} })
    federationRouter.addRule({ id: 'x', name: 'x', priority: 1, enabled: true, matcher: { path: '/x' }, service: 'p', action: 'route', fallbackService: 'f' })
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ status: 200, data: { via: 'f' } })
    const r = await federatedRequest({ method: 'GET', path: '/x' }, fetcher as any)
    expect(r.viaFallback).toBe(true)
    expect(r.data).toEqual({ via: 'f' })
  })

  it('opens circuit after repeated failures', async () => {
    serviceRegistry.register({ id: 's1', name: 's', url: 'u', protocol: 'http', region: 'CN', tags: [], weight: 1, metadata: {}, circuit: { failureThreshold: 2, cooldownMs: 60_000, halfOpenMaxTrials: 1 } })
    federationRouter.addRule({ id: 'x', name: 'x', priority: 1, enabled: true, matcher: { path: '/x' }, service: 's', action: 'route' })
    const fetcher = vi.fn().mockRejectedValue(new Error('boom'))
    await federatedRequest({ method: 'GET', path: '/x' }, fetcher as any)
    await federatedRequest({ method: 'GET', path: '/x' }, fetcher as any)
    const r = await federatedRequest({ method: 'GET', path: '/x' }, fetcher as any)
    expect(r.circuitState).toBe('OPEN')
    expect(r.status).toBe(503)
  })
})

// ============== summarizeFederation ==============

describe('summarizeFederation', () => {
  beforeEach(() => {
    serviceRegistry.clear()
    healthChecker.stopAll()
    graphqlStitcher.removeSubgraph('a')
    graphqlStitcher.removeSubgraph('b')
  })
  it('returns aggregated snapshot', () => {
    serviceRegistry.register({ id: 's1', name: 'a', url: 'u', protocol: 'http', region: 'CN', tags: [], weight: 1, metadata: {} })
    healthChecker.setStatus({ serviceId: 's1', serviceName: 'a', status: 'healthy', latencyMs: 5, lastCheck: Date.now(), consecutiveFailures: 0, consecutiveSuccesses: 1, uptime: 1, checks: 1 })
    graphqlStitcher.addSubgraph({ service: 'a', sdl: 'type Query { x: String }' })
    const s = summarizeFederation()
    expect(s.services).toBe(1)
    expect(s.healthy).toBe(1)
    expect(s.subgraphs).toBe(1)
    expect(s.metrics).toBeDefined()
  })
})
