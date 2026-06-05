import { describe, it, expect, beforeEach } from 'vitest'
import {
  RouteRegistry,
  Gateway,
  AuthMiddleware,
  RateLimitMiddleware,
  CorsMiddleware,
  CacheMiddleware,
  TransformMiddleware,
  ValidatorMiddleware,
  LoggingMiddleware,
  mockHandler,
  echoHandler,
  routes,
  gateway,
  type Request,
  type Response,
  type Middleware,
  type Route,
} from '../index'

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    id: 'req-' + Date.now(),
    method: 'GET',
    path: '/test',
    query: {},
    headers: {},
    body: null,
    ip: '127.0.0.1',
    timestamp: Date.now(),
    ...overrides,
  }
}

beforeEach(() => {
  routes.clear()
})

// ============== Route Registry ==============

describe('RouteRegistry', () => {
  it('adds a route', () => {
    const r = routes.add({ method: 'GET', path: '/x', handler: echoHandler(), middleware: [], enabled: true })
    expect(r.id).toBeDefined()
  })
  it('finds exact match', () => {
    routes.add({ method: 'GET', path: '/users', handler: echoHandler(), middleware: [], enabled: true })
    const f = routes.find('GET', '/users')
    expect(f).toBeDefined()
  })
  it('returns undefined for missing', () => {
    expect(routes.find('GET', '/nope')).toBeUndefined()
  })
  it('extracts path params', () => {
    routes.add({ method: 'GET', path: '/users/:id', handler: echoHandler(), middleware: [], enabled: true })
    const f = routes.find('GET', '/users/42')
    expect(f!.params.id).toBe('42')
  })
  it('matches method', () => {
    routes.add({ method: 'POST', path: '/x', handler: echoHandler(), middleware: [], enabled: true })
    expect(routes.find('GET', '/x')).toBeUndefined()
  })
  it('respects enabled flag', () => {
    routes.add({ method: 'GET', path: '/x', handler: echoHandler(), middleware: [], enabled: false })
    expect(routes.find('GET', '/x')).toBeUndefined()
  })
  it('lists routes', () => {
    routes.add({ method: 'GET', path: '/a', handler: echoHandler(), middleware: [], enabled: true })
    routes.add({ method: 'POST', path: '/b', handler: echoHandler(), middleware: [], enabled: true })
    expect(routes.list().length).toBe(2)
  })
  it('lists filtered by method', () => {
    routes.add({ method: 'GET', path: '/a', handler: echoHandler(), middleware: [], enabled: true })
    routes.add({ method: 'POST', path: '/b', handler: echoHandler(), middleware: [], enabled: true })
    expect(routes.list({ method: 'GET' }).length).toBe(1)
  })
  it('lists filtered by tag', () => {
    routes.add({ method: 'GET', path: '/a', handler: echoHandler(), middleware: [], enabled: true, tags: ['api'] })
    expect(routes.list({ tag: 'api' }).length).toBe(1)
  })
  it('removes a route', () => {
    const r = routes.add({ method: 'GET', path: '/x', handler: echoHandler(), middleware: [], enabled: true })
    expect(routes.remove(r.id)).toBe(true)
    expect(routes.get(r.id)).toBeUndefined()
  })
  it('updates a route', () => {
    const r = routes.add({ method: 'GET', path: '/x', handler: echoHandler(), middleware: [], enabled: true })
    const updated = routes.update(r.id, { description: 'new' })
    expect(updated!.description).toBe('new')
  })
  it('get returns undefined for missing', () => {
    expect(routes.get('nope')).toBeUndefined()
  })
  it('update returns undefined for missing', () => {
    expect(routes.update('nope', {})).toBeUndefined()
  })
  it('clear empties all', () => {
    routes.add({ method: 'GET', path: '/a', handler: echoHandler(), middleware: [], enabled: true })
    routes.clear()
    expect(routes.list().length).toBe(0)
  })
  it('multiple params', () => {
    routes.add({ method: 'GET', path: '/users/:userId/posts/:postId', handler: echoHandler(), middleware: [], enabled: true })
    const f = routes.find('GET', '/users/u1/posts/p2')
    expect(f!.params.userId).toBe('u1')
    expect(f!.params.postId).toBe('p2')
  })
})

// ============== Auth Middleware ==============

describe('AuthMiddleware', () => {
  it('bearer missing required', async () => {
    const mw = new AuthMiddleware({ type: 'bearer', required: true })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq(), res, async () => res)
    expect(r.status).toBe(401)
  })
  it('bearer valid', async () => {
    const mw = new AuthMiddleware({ type: 'bearer', required: true, validCredentials: ['abc'] })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ headers: { authorization: 'Bearer abc' } }), res, async () => res)
    expect(r.status).toBe(200)
  })
  it('bearer invalid', async () => {
    const mw = new AuthMiddleware({ type: 'bearer', required: true, validCredentials: ['abc'] })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ headers: { authorization: 'Bearer wrong' } }), res, async () => res)
    expect(r.status).toBe(403)
  })
  it('bearer missing not required', async () => {
    const mw = new AuthMiddleware({ type: 'bearer' })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq(), res, async () => res)
    expect(r.status).toBe(200)
  })
  it('api key valid', async () => {
    const mw = new AuthMiddleware({ type: 'api_key', required: true, validCredentials: ['k1'] })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ headers: { 'x-api-key': 'k1' } }), res, async () => res)
    expect(r.status).toBe(200)
  })
  it('api key from query', async () => {
    const mw = new AuthMiddleware({ type: 'api_key', required: true, validCredentials: ['k1'] })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ query: { api_key: 'k1' } }), res, async () => res)
    expect(r.status).toBe(200)
  })
  it('api key missing', async () => {
    const mw = new AuthMiddleware({ type: 'api_key', required: true })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq(), res, async () => res)
    expect(r.status).toBe(401)
  })
  it('basic auth', async () => {
    const creds = Buffer.from('user:pass').toString('base64')
    const mw = new AuthMiddleware({ type: 'basic', required: true, validCredentials: ['user:pass'] })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ headers: { authorization: 'Basic ' + creds } }), res, async () => res)
    expect(r.status).toBe(200)
  })
  it('basic missing', async () => {
    const mw = new AuthMiddleware({ type: 'basic', required: true })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq(), res, async () => res)
    expect(r.status).toBe(401)
  })
  it('jwt', async () => {
    const payload = Buffer.from(JSON.stringify({ sub: 'user-1' })).toString('base64')
    const token = `aaa.${payload}.bbb`
    const mw = new AuthMiddleware({ type: 'jwt', required: true })
    const res: Response = { status: 200, headers: {}, body: null }
    const req = makeReq({ headers: { authorization: 'Bearer ' + token } })
    const r = await mw.handle(req, res, async () => res)
    expect(r.status).toBe(200)
    expect(req.userId).toBe('user-1')
  })
  it('jwt malformed', async () => {
    const mw = new AuthMiddleware({ type: 'jwt', required: true })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ headers: { authorization: 'Bearer bad' } }), res, async () => res)
    expect(r.status).toBe(401)
  })
  it('jwt missing', async () => {
    const mw = new AuthMiddleware({ type: 'jwt', required: true })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq(), res, async () => res)
    expect(r.status).toBe(401)
  })
  it('none passes through', async () => {
    const mw = new AuthMiddleware({ type: 'none' })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq(), res, async () => res)
    expect(r.status).toBe(200)
  })
})

// ============== Rate Limit ==============

describe('RateLimitMiddleware', () => {
  it('allows under limit', async () => {
    const mw = new RateLimitMiddleware(5, 1000)
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq(), res, async () => res)
    expect(r.status).toBe(200)
    expect(r.headers['x-ratelimit-remaining']).toBe('4')
  })
  it('blocks over limit', async () => {
    const mw = new RateLimitMiddleware(2, 1000)
    const res: Response = { status: 200, headers: {}, body: null }
    await mw.handle(makeReq(), res, async () => res)
    await mw.handle(makeReq(), res, async () => res)
    const r = await mw.handle(makeReq(), res, async () => res)
    expect(r.status).toBe(429)
  })
  it('reset clears', async () => {
    const mw = new RateLimitMiddleware(1, 1000)
    const res: Response = { status: 200, headers: {}, body: null }
    await mw.handle(makeReq(), res, async () => res)
    mw.reset()
    const r = await mw.handle(makeReq(), res, async () => res)
    expect(r.status).toBe(200)
  })
  it('reset specific key', async () => {
    const mw = new RateLimitMiddleware(1, 1000)
    const res: Response = { status: 200, headers: {}, body: null }
    await mw.handle(makeReq({ ip: 'a' }), res, async () => res)
    mw.reset('a')
    const r = await mw.handle(makeReq({ ip: 'a' }), res, async () => res)
    expect(r.status).toBe(200)
  })
})

// ============== CORS ==============

describe('CorsMiddleware', () => {
  it('sets allow origin *', async () => {
    const mw = new CorsMiddleware({ origins: ['*'] })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq(), res, async () => res)
    expect(r.headers['access-control-allow-origin']).toBe('*')
  })
  it('matches specific origin', async () => {
    const mw = new CorsMiddleware({ origins: ['https://example.com'] })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ headers: { origin: 'https://example.com' } }), res, async () => res)
    expect(r.headers['access-control-allow-origin']).toBe('https://example.com')
  })
  it('rejects non-matching origin', async () => {
    const mw = new CorsMiddleware({ origins: ['https://example.com'] })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ headers: { origin: 'https://evil.com' } }), res, async () => res)
    expect(r.headers['access-control-allow-origin']).toBeUndefined()
  })
  it('handles OPTIONS', async () => {
    const mw = new CorsMiddleware({ origins: ['*'] })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ method: 'OPTIONS' }), res, async () => res)
    expect(r.status).toBe(204)
  })
})

// ============== Cache ==============

describe('CacheMiddleware', () => {
  it('caches GET response', async () => {
    const mw = new CacheMiddleware({ ttl: 60000 })
    const res: Response = { status: 200, headers: {}, body: { x: 1 } }
    const r1 = await mw.handle(makeReq(), res, async () => res)
    expect(r1.headers['x-cache']).toBe('MISS')
    const r2 = await mw.handle(makeReq(), res, async () => res)
    expect(r2.headers['x-cache']).toBe('HIT')
  })
  it('does not cache POST', async () => {
    const mw = new CacheMiddleware({ ttl: 60000 })
    const res: Response = { status: 200, headers: {}, body: {} }
    const r1 = await mw.handle(makeReq({ method: 'POST' }), res, async () => res)
    expect(r1.headers['x-cache']).toBeUndefined()
  })
  it('respects If-None-Match', async () => {
    const mw = new CacheMiddleware({ ttl: 60000 })
    const res: Response = { status: 200, headers: {}, body: { x: 1 } }
    const r1 = await mw.handle(makeReq(), res, async () => res)
    const etag = r1.headers['etag']!
    const r2 = await mw.handle(makeReq({ headers: { 'if-none-match': etag } }), res, async () => res)
    expect(r2.status).toBe(304)
  })
  it('invalidate clears all', () => {
    const mw = new CacheMiddleware({ ttl: 60000 })
    mw.invalidate()
    expect(mw.size()).toBe(0)
  })
  it('invalidate by pattern', async () => {
    const mw = new CacheMiddleware({ ttl: 60000 })
    const res: Response = { status: 200, headers: {}, body: {} }
    await mw.handle(makeReq({ path: '/users/1' }), res, async () => res)
    await mw.handle(makeReq({ path: '/posts/1' }), res, async () => res)
    const n = mw.invalidate(/^\w+:\/users/)
    expect(n).toBe(1)
  })
})

// ============== Transform ==============

describe('TransformMiddleware', () => {
  it('adds response header', async () => {
    const mw = new TransformMiddleware({ responseHeaders: { 'x-custom': 'value' } })
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq(), res, async () => res)
    expect(r.headers['x-custom']).toBe('value')
  })
  it('removes response header', async () => {
    const mw = new TransformMiddleware({ removeResponseHeaders: ['x-internal'] })
    const res: Response = { status: 200, headers: { 'x-internal': 'secret' }, body: null }
    const r = await mw.handle(makeReq(), res, async () => res)
    expect(r.headers['x-internal']).toBeUndefined()
  })
  it('adds request header', async () => {
    const mw = new TransformMiddleware({ requestHeaders: { 'x-trace': 'abc' } })
    const res: Response = { status: 200, headers: {}, body: null }
    const req = makeReq()
    await mw.handle(req, res, async () => res)
    expect(req.headers['x-trace']).toBe('abc')
  })
})

// ============== Validator ==============

describe('ValidatorMiddleware', () => {
  it('validates required field', async () => {
    const mw = new ValidatorMiddleware([{ field: 'body.email', type: 'email', required: true }])
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ body: {} }), res, async () => res)
    expect(r.status).toBe(400)
  })
  it('accepts valid email', async () => {
    const mw = new ValidatorMiddleware([{ field: 'body.email', type: 'email', required: true }])
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ body: { email: 'a@b.com' } }), res, async () => res)
    expect(r.status).toBe(200)
  })
  it('rejects invalid email', async () => {
    const mw = new ValidatorMiddleware([{ field: 'body.email', type: 'email', required: true }])
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ body: { email: 'not-email' } }), res, async () => res)
    expect(r.status).toBe(400)
  })
  it('validates uuid', async () => {
    const mw = new ValidatorMiddleware([{ field: 'body.id', type: 'uuid' }])
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ body: { id: '12345678-1234-1234-1234-123456789012' } }), res, async () => res)
    expect(r.status).toBe(200)
  })
  it('rejects invalid uuid', async () => {
    const mw = new ValidatorMiddleware([{ field: 'body.id', type: 'uuid' }])
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ body: { id: 'not-uuid' } }), res, async () => res)
    expect(r.status).toBe(400)
  })
  it('min length', async () => {
    const mw = new ValidatorMiddleware([{ field: 'body.name', type: 'string', min: 3 }])
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ body: { name: 'a' } }), res, async () => res)
    expect(r.status).toBe(400)
  })
  it('max length', async () => {
    const mw = new ValidatorMiddleware([{ field: 'body.name', type: 'string', max: 5 }])
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ body: { name: 'abcdefgh' } }), res, async () => res)
    expect(r.status).toBe(400)
  })
  it('regex pattern', async () => {
    const mw = new ValidatorMiddleware([{ field: 'body.code', type: 'regex', pattern: '^[A-Z]{3}$' }])
    const res: Response = { status: 200, headers: {}, body: null }
    const r = await mw.handle(makeReq({ body: { code: 'abc' } }), res, async () => res)
    expect(r.status).toBe(400)
  })
})

// ============== Mock Handlers ==============

describe('mockHandler', () => {
  it('returns canned response', async () => {
    const h = mockHandler({ body: { ok: true } })
    const r = await h(makeReq())
    expect(r.body).toEqual({ ok: true })
  })
  it('defaults to 200', async () => {
    const h = mockHandler({ body: null })
    const r = await h(makeReq())
    expect(r.status).toBe(200)
  })
})

describe('echoHandler', () => {
  it('returns request info', async () => {
    const h = echoHandler()
    const r = await h(makeReq({ method: 'POST', path: '/x', body: { a: 1 } }))
    expect((r.body as { method: string }).method).toBe('POST')
    expect((r.body as { body: { a: number } }).body.a).toBe(1)
  })
})

// ============== Logging ==============

describe('LoggingMiddleware', () => {
  it('logs request', async () => {
    const mw = new LoggingMiddleware()
    const res: Response = { status: 200, headers: {}, body: null }
    await mw.handle(makeReq(), res, async () => res)
    expect(mw.get().length).toBe(1)
  })
  it('filter by method', async () => {
    const mw = new LoggingMiddleware()
    const res: Response = { status: 200, headers: {}, body: null }
    await mw.handle(makeReq({ method: 'GET' }), res, async () => res)
    await mw.handle(makeReq({ method: 'POST' }), res, async () => res)
    expect(mw.get({ method: 'GET' }).length).toBe(1)
  })
  it('clear empties', async () => {
    const mw = new LoggingMiddleware()
    const res: Response = { status: 200, headers: {}, body: null }
    await mw.handle(makeReq(), res, async () => res)
    mw.clear()
    expect(mw.get().length).toBe(0)
  })
})

// ============== Gateway ==============

describe('Gateway', () => {
  it('returns 404 for unknown route', async () => {
    const r = await gateway.handle(makeReq({ path: '/missing' }))
    expect(r.status).toBe(404)
  })
  it('handles registered route', async () => {
    routes.add({ method: 'GET', path: '/echo', handler: echoHandler(), middleware: [], enabled: true })
    const r = await gateway.handle(makeReq({ path: '/echo' }))
    expect(r.status).toBe(200)
  })
  it('passes path params', async () => {
    routes.add({ method: 'GET', path: '/users/:id', handler: echoHandler(), middleware: [], enabled: true })
    const r = await gateway.handle(makeReq({ path: '/users/42' }))
    expect((r.body as { query: { id: string } }).query.id).toBe('42')
  })
  it('runs middleware chain', async () => {
    const auth = new AuthMiddleware({ type: 'bearer', required: true, validCredentials: ['t1'] })
    routes.add({ method: 'GET', path: '/secure', handler: echoHandler(), middleware: [auth], enabled: true })
    const r1 = await gateway.handle(makeReq({ path: '/secure' }))
    expect(r1.status).toBe(401)
    const r2 = await gateway.handle(makeReq({ path: '/secure', headers: { authorization: 'Bearer t1' } }))
    expect(r2.status).toBe(200)
  })
  it('records metrics', async () => {
    const r = routes.add({ method: 'GET', path: '/metrics-test', handler: echoHandler(), middleware: [], enabled: true })
    await gateway.handle(makeReq({ path: '/metrics-test' }))
    const m = gateway.getMetrics(r.id)
    expect(m!.count).toBeGreaterThan(0)
  })
  it('snapshot aggregates', async () => {
    routes.add({ method: 'GET', path: '/a', handler: echoHandler(), middleware: [], enabled: true })
    await gateway.handle(makeReq({ path: '/a' }))
    const s = gateway.snapshot()
    expect(s.totalRequests).toBeGreaterThanOrEqual(1)
  })
  it('handles handler error', async () => {
    routes.add({ method: 'GET', path: '/err', handler: async () => { throw new Error('boom') }, middleware: [], enabled: true })
    const r = await gateway.handle(makeReq({ path: '/err' }))
    expect(r.status).toBe(500)
  })
  it('returns request id header', async () => {
    routes.add({ method: 'GET', path: '/id', handler: echoHandler(), middleware: [], enabled: true })
    const r = await gateway.handle(makeReq({ path: '/id', id: 'r-123' }))
    expect(r.headers['x-request-id']).toBe('r-123')
  })
})

// ============== Middleware execution order ==============

describe('Middleware chain order', () => {
  it('executes pre before handler', async () => {
    const order: string[] = []
    const pre: Middleware = { name: 'p', phase: 'pre', handle: async (r, res, next) => { order.push('pre'); return next(r, res) } }
    routes.add({ method: 'GET', path: '/order', handler: async () => { order.push('h'); return { status: 200, headers: {}, body: null } }, middleware: [pre], enabled: true })
    await gateway.handle(makeReq({ path: '/order' }))
    expect(order).toEqual(['pre', 'h'])
  })
})
