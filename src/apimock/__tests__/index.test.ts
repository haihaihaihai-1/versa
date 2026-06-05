import { describe, it, expect, beforeEach } from 'vitest'
import { ApiMockService, getApiMock, resetApiMock, type MockRequest, type MockRule } from '../index'

describe('ApiMockService · rule management', () => {
  let svc: ApiMockService
  beforeEach(() => { svc = new ApiMockService() })

  it('addRule stores and lists by tag', () => {
    const r1 = svc.addRule({ name: 'users', method: 'GET', path: '/users', response: { kind: 'static', status: 200, body: [] }, priority: 10, enabled: true, tags: ['users'] })
    const r2 = svc.addRule({ name: 'products', method: 'GET', path: '/products', response: { kind: 'static', status: 200, body: [] }, priority: 10, enabled: true, tags: ['products'] })
    expect(svc.listRules({ tag: 'users' }).map(r => r.id)).toEqual([r1.id])
    expect(svc.listRules().length).toBe(2)
    void r2
  })

  it('removeRule', () => {
    const r = svc.stubGet('/x', {})
    expect(svc.removeRule(r.id)).toBe(true)
    expect(svc.getRule(r.id)).toBeUndefined()
  })

  it('enableRule toggles', () => {
    const r = svc.stubGet('/x', {})
    svc.enableRule(r.id, false)
    expect(svc.getRule(r.id)!.enabled).toBe(false)
    svc.enableRule(r.id, true)
    expect(svc.getRule(r.id)!.enabled).toBe(true)
  })

  it('updateRule patches', () => {
    const r = svc.stubGet('/x', {})
    const updated = svc.updateRule(r.id, { priority: 99, name: 'renamed' })
    expect(updated?.priority).toBe(99)
    expect(updated?.name).toBe('renamed')
  })

  it('listRules filters by method', () => {
    svc.stubGet('/a', {}); svc.stubPost('/b', {})
    expect(svc.listRules({ method: 'GET' }).length).toBe(1)
    expect(svc.listRules({ method: 'POST' }).length).toBe(1)
  })

  it('listRules returns sorted by priority desc', () => {
    svc.stubGet('/low', {}, 200, { priority: 1 })
    svc.stubGet('/hi', {}, 200, { priority: 99 })
    const sorted = svc.listRules().map(r => r.path)
    expect(sorted).toEqual(['/hi', '/low'])
  })
})

describe('ApiMockService · path matching', () => {
  const svc = new ApiMockService()
  it('exact path matches', () => {
    expect(svc.matchPath('/users', '/users')).toBe(true)
    expect(svc.matchPath('/users', '/products')).toBe(false)
  })
  it('wildcard star', () => {
    expect(svc.matchPath('*', '/anything/here')).toBe(true)
  })
  it(':param captures', () => {
    expect(svc.matchPath('/users/:id', '/users/42')).toBe(true)
    expect(svc.matchPath('/users/:id', '/users/42/posts')).toBe(false)
    const params = svc.extractParams('/users/:id', '/users/42')
    expect(params).toEqual({ id: '42' })
  })
  it('multi-param', () => {
    expect(svc.matchPath('/users/:uid/posts/:pid', '/users/1/posts/2')).toBe(true)
    const p = svc.extractParams('/users/:uid/posts/:pid', '/users/1/posts/2')
    expect(p).toEqual({ uid: '1', pid: '2' })
  })
})

describe('ApiMockService · match (full request)', () => {
  let svc: ApiMockService
  beforeEach(() => { svc = new ApiMockService() })

  it('matches by method + path', () => {
    svc.stubGet('/a', { ok: true })
    expect(svc.match({ method: 'GET', path: '/a', query: {}, headers: {}, body: null })?.response).toMatchObject({ kind: 'static' })
  })

  it('does not match disabled rules', () => {
    const r = svc.stubGet('/a', {})
    svc.enableRule(r.id, false)
    expect(svc.match({ method: 'GET', path: '/a', query: {}, headers: {}, body: null })).toBeNull()
  })

  it('matches query constraint', () => {
    svc.addRule({ name: 'q', method: 'GET', path: '/q', query: { x: '1' }, response: { kind: 'static', status: 200, body: { ok: 1 } }, priority: 10, enabled: true, tags: [] })
    expect(svc.match({ method: 'GET', path: '/q', query: { x: '1' }, headers: {}, body: null })).not.toBeNull()
    expect(svc.match({ method: 'GET', path: '/q', query: { x: '2' }, headers: {}, body: null })).toBeNull()
  })

  it('matches regex query', () => {
    svc.addRule({ name: 'qr', method: 'GET', path: '/qr', query: { token: /^abc/ }, response: { kind: 'static', status: 200, body: {} }, priority: 10, enabled: true, tags: [] })
    expect(svc.match({ method: 'GET', path: '/qr', query: { token: 'abcdef' }, headers: {}, body: null })).not.toBeNull()
    expect(svc.match({ method: 'GET', path: '/qr', query: { token: 'xyz' }, headers: {}, body: null })).toBeNull()
  })

  it('matches header', () => {
    svc.addRule({ name: 'h', method: 'GET', path: '/h', headers: { 'x-api-key': 'k1' }, response: { kind: 'static', status: 200, body: {} }, priority: 10, enabled: true, tags: [] })
    expect(svc.match({ method: 'GET', path: '/h', query: {}, headers: { 'x-api-key': 'k1' }, body: null })).not.toBeNull()
    expect(svc.match({ method: 'GET', path: '/h', query: {}, headers: { 'x-api-key': 'k2' }, body: null })).toBeNull()
  })

  it('matches body exact / jsonpath / contains / regex', () => {
    svc.addRule({ name: 'be', method: 'POST', path: '/be', bodyMatch: { kind: 'exact', value: { a: 1 } }, response: { kind: 'static', status: 200, body: {} }, priority: 10, enabled: true, tags: [] })
    svc.addRule({ name: 'jp', method: 'POST', path: '/jp', bodyMatch: { kind: 'jsonpath', path: 'user.id', equals: 7 }, response: { kind: 'static', status: 200, body: {} }, priority: 10, enabled: true, tags: [] })
    svc.addRule({ name: 'cn', method: 'POST', path: '/cn', bodyMatch: { kind: 'contains', substring: 'magic' }, response: { kind: 'static', status: 200, body: {} }, priority: 10, enabled: true, tags: [] })
    svc.addRule({ name: 'rg', method: 'POST', path: '/rg', bodyMatch: { kind: 'regex', pattern: '^foo' }, response: { kind: 'static', status: 200, body: {} }, priority: 10, enabled: true, tags: [] })
    expect(svc.match({ method: 'POST', path: '/be', query: {}, headers: {}, body: { a: 1 } })).not.toBeNull()
    expect(svc.match({ method: 'POST', path: '/be', query: {}, headers: {}, body: { a: 2 } })).toBeNull()
    expect(svc.match({ method: 'POST', path: '/jp', query: {}, headers: {}, body: { user: { id: 7 } } })).not.toBeNull()
    expect(svc.match({ method: 'POST', path: '/jp', query: {}, headers: {}, body: { user: { id: 8 } } })).toBeNull()
    expect(svc.match({ method: 'POST', path: '/cn', query: {}, headers: {}, body: { text: 'hello magic world' } })).not.toBeNull()
    expect(svc.match({ method: 'POST', path: '/cn', query: {}, headers: {}, body: { text: 'boring' } })).toBeNull()
    expect(svc.match({ method: 'POST', path: '/rg', query: {}, headers: {}, body: null, bodyText: 'foobar' })).not.toBeNull()
    expect(svc.match({ method: 'POST', path: '/rg', query: {}, headers: {}, body: null, bodyText: 'barfoo' })).toBeNull()
  })
})

describe('ApiMockService · execute strategies', () => {
  let svc: ApiMockService
  beforeEach(() => { svc = new ApiMockService() })

  it('static returns body', async () => {
    svc.addRule({ name: 's', method: 'GET', path: '/s', response: { kind: 'static', status: 200, body: { hello: 'world' } }, priority: 10, enabled: true, tags: [] })
    const r = await svc.handle({ method: 'GET', path: '/s', query: {}, headers: {}, body: null })
    expect(r).toEqual({ status: 200, body: { hello: 'world' } })
  })

  it('sequence cycles + consumes', async () => {
    const rule = svc.addRule({ name: 'seq', method: 'GET', path: '/seq', response: { kind: 'sequence', status: 200, bodies: [{ n: 1 }, { n: 2 }, { n: 3 }] }, priority: 10, enabled: true, tags: [] })
    const r1 = await svc.handle({ method: 'GET', path: '/seq', query: {}, headers: {}, body: null })
    const r2 = await svc.handle({ method: 'GET', path: '/seq', query: {}, headers: {}, body: null })
    const r3 = await svc.handle({ method: 'GET', path: '/seq', query: {}, headers: {}, body: null })
    expect((r1.body as any).n).toBe(1)
    expect((r2.body as any).n).toBe(2)
    expect((r3.body as any).n).toBe(3)
    expect(r3.consumed).toBe(true)
    expect(svc.getRule(rule.id)).toBeUndefined()
  })

  it('template injects request params', async () => {
    svc.addRule({ name: 't', method: 'GET', path: '/users/:id', response: { kind: 'template', status: 200, template: (req) => ({ id: req.path.split('/')[2], method: req.method }) }, priority: 10, enabled: true, tags: [] })
    const r = await svc.handle({ method: 'GET', path: '/users/42', query: {}, headers: {}, body: null })
    expect(r.body).toEqual({ id: '42', method: 'GET' })
  })

  it('dynamic handler', async () => {
    svc.stubDynamic('/dyn', req => ({ status: 200, body: { received: req.body } }))
    const r = await svc.handle({ method: 'GET', path: '/dyn', query: {}, headers: {}, body: { hi: 1 } })
    expect(r.body).toEqual({ received: { hi: 1 } })
  })

  it('proxy builds url', async () => {
    svc.addRule({ name: 'p', method: 'GET', path: '/p', response: { kind: 'proxy', upstream: 'https://api.example.com', preservePath: true, preserveQuery: true }, priority: 10, enabled: true, tags: [] })
    const r = await svc.handle({ method: 'GET', path: '/p', query: { x: '1' }, headers: {}, body: null })
    expect((r.body as any).proxied).toBe(true)
    expect((r.body as any).url).toContain('https://api.example.com/p?x=1')
  })

  it('fault returns 5xx', async () => {
    svc.stubFault('/f', 503)
    const r = await svc.handle({ method: 'GET', path: '/f', query: {}, headers: {}, body: null })
    expect(r.status).toBe(503)
  })

  it('not matched returns 404', async () => {
    const r = await svc.handle({ method: 'GET', path: '/nope', query: {}, headers: {}, body: null })
    expect(r.status).toBe(404)
  })

  it('increments hits on rule', async () => {
    const r = svc.stubGet('/h', {})
    await svc.handle({ method: 'GET', path: '/h', query: {}, headers: {}, body: null })
    await svc.handle({ method: 'GET', path: '/h', query: {}, headers: {}, body: null })
    expect(svc.getRule(r.id)!.hits).toBe(2)
  })

  it('global latency delay', async () => {
    svc.setGlobalLatency(30)
    svc.stubGet('/d', {})
    const t0 = Date.now()
    await svc.handle({ method: 'GET', path: '/d', query: {}, headers: {}, body: null })
    expect(Date.now() - t0).toBeGreaterThanOrEqual(25)
  })

  it('rule delayMs adds to global', async () => {
    svc.setGlobalLatency(0)
    svc.addRule({ name: 'd', method: 'GET', path: '/d', response: { kind: 'static', status: 200, body: {}, delayMs: 25 }, priority: 10, enabled: true, tags: [] })
    const t0 = Date.now()
    await svc.handle({ method: 'GET', path: '/d', query: {}, headers: {}, body: null })
    expect(Date.now() - t0).toBeGreaterThanOrEqual(20)
  })
})

describe('ApiMockService · scenarios', () => {
  let svc: ApiMockService
  beforeEach(() => { svc = new ApiMockService() })

  it('createScenario + activate', () => {
    const sc = svc.createScenario({ id: 's1', name: 'login flow', rules: [] })
    expect(sc.active).toBe(true)
    svc.activateScenario('s1', false)
    expect(svc.getScenario('s1')!.active).toBe(false)
  })

  it('removeScenario', () => {
    svc.createScenario({ id: 's', name: '', rules: [] })
    expect(svc.removeScenario('s')).toBe(true)
    expect(svc.getScenario('s')).toBeUndefined()
  })

  it('record builds scenario with ordered rules', () => {
    const sc = svc.record([{ method: 'POST', path: '/login', response: { status: 200, body: { ok: true } } }, { method: 'GET', path: '/me', response: { status: 200, body: { id: 1 } } }])
    expect(sc.rules.length).toBe(2)
    expect(sc.rules[0].method).toBe('POST')
  })

  it('playback runs rules in order', async () => {
    svc.stubGet('/a', { ok: 1 })
    const sc = svc.record([{ method: 'GET', path: '/a', response: { status: 200, body: { ok: 1 } } }])
    const r = await svc.playback(sc.id)
    expect(r.length).toBe(1)
  })

  it('playback throws on missing scenario', async () => {
    await expect(svc.playback('nope')).rejects.toThrow()
  })
})

describe('ApiMockService · log', () => {
  let svc: ApiMockService
  beforeEach(() => { svc = new ApiMockService() })

  it('records matched and unmatched', async () => {
    svc.stubGet('/a', {})
    await svc.handle({ method: 'GET', path: '/a', query: {}, headers: {}, body: null })
    await svc.handle({ method: 'GET', path: '/nope', query: {}, headers: {}, body: null })
    const log = svc.getLog()
    expect(log.length).toBe(2)
    expect(log[0].matched).toBe(true)
    expect(log[1].matched).toBe(false)
  })

  it('filter by pathPrefix / matched / limit', async () => {
    svc.stubGet('/a', {}); svc.stubGet('/b', {})
    await svc.handle({ method: 'GET', path: '/a', query: {}, headers: {}, body: null })
    await svc.handle({ method: 'GET', path: '/b', query: {}, headers: {}, body: null })
    await svc.handle({ method: 'GET', path: '/nope', query: {}, headers: {}, body: null })
    expect(svc.getLog({ pathPrefix: '/a' }).length).toBe(1)
    expect(svc.getLog({ matched: false }).length).toBe(1)
    expect(svc.getLog({ limit: 2 }).length).toBe(2)
  })

  it('clearLog empties', () => {
    svc.stubGet('/a', {})
    return svc.handle({ method: 'GET', path: '/a', query: {}, headers: {}, body: null }).then(() => {
      svc.clearLog()
      expect(svc.getLog().length).toBe(0)
    })
  })

  it('maxLog caps', () => {
    svc.setMaxLog(3)
    svc.stubGet('/a', {})
    return Promise.all([1, 2, 3, 4].map(() => svc.handle({ method: 'GET', path: '/a', query: {}, headers: {}, body: null }))).then(() => {
      expect(svc.getLog().length).toBeLessThanOrEqual(3)
    })
  })
})

describe('ApiMockService · webhooks', () => {
  let svc: ApiMockService
  beforeEach(() => { svc = new ApiMockService() })

  it('triggerWebhook records call', async () => {
    const c = await svc.triggerWebhook('https://hook.example.com', { event: 'order' })
    expect(c.status).toBe(200)
    expect(svc.getWebhooks().length).toBe(1)
    svc.clearWebhooks()
    expect(svc.getWebhooks().length).toBe(0)
  })
})

describe('ApiMockService · metrics', () => {
  it('returns counts and avg latency', async () => {
    const svc = new ApiMockService()
    svc.stubGet('/a', {}); svc.stubGet('/b', {})
    await svc.handle({ method: 'GET', path: '/a', query: {}, headers: {}, body: null })
    await svc.handle({ method: 'GET', path: '/b', query: {}, headers: {}, body: null })
    await svc.handle({ method: 'GET', path: '/nope', query: {}, headers: {}, body: null })
    const m = svc.metrics()
    expect(m.rules).toBe(2)
    expect(m.matched).toBe(2)
    expect(m.unmatched).toBe(1)
    expect(m.totalRequests).toBe(3)
    expect(m.avgLatencyMs).toBeGreaterThanOrEqual(0)
  })
})

describe('ApiMockService · getApiMock / reset', () => {
  it('returns singleton', () => {
    const a = getApiMock(); const b = getApiMock()
    expect(a).toBe(b)
    resetApiMock()
    const c = getApiMock()
    expect(c).not.toBe(a)
  })
})

describe('ApiMockService · helpers', () => {
  let svc: ApiMockService
  beforeEach(() => { svc = new ApiMockService() })

  it('stubGet / stubPost / stubDynamic / stubFault', () => {
    expect(svc.stubGet('/a', { ok: 1 }).method).toBe('GET')
    expect(svc.stubPost('/b', { ok: 1 }).method).toBe('POST')
    expect(svc.stubDynamic('/c', () => ({ status: 200, body: {} })).response.kind).toBe('dynamic')
    expect(svc.stubFault('/d', 502).response).toMatchObject({ kind: 'fault', status: 502 })
  })
})
