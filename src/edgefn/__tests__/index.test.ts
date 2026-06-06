import { describe, it, expect, beforeEach } from 'vitest'
import { EdgeRuntime, getEdgeRuntime, resetEdgeRuntime, type EdgeRequest } from '../index'

describe('EdgeRuntime - registration', () => {
  let rt: EdgeRuntime
  beforeEach(() => { rt = new EdgeRuntime() })

  it('registers function', () => {
    const f = rt.registerFunction({ name: 'hello', version: '1', handler: () => rt.jsonResponse({ ok: true }), triggers: ['http'], methods: ['GET'] })
    expect(f.name).toBe('hello')
    expect(rt.getFunction('hello')).toBeDefined()
  })
  it('updates function', () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'] })
    const u = rt.updateFunction('a', { alias: 'primary' })
    expect(u.alias).toBe('primary')
  })
  it('update throws on missing', () => {
    expect(() => rt.updateFunction('nope', {})).toThrow()
  })
  it('deletes function', () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'] })
    expect(rt.deleteFunction('a')).toBe(true)
  })
  it('lists functions', () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'] })
    rt.registerFunction({ name: 'b', version: '1', handler: () => rt.emptyResponse(), triggers: ['cron'] })
    expect(rt.listFunctions()).toHaveLength(2)
  })
  it('alias resolves', () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'], alias: 'primary' })
    expect(rt.resolveAlias('primary')?.name).toBe('a')
  })
  it('alias undefined for missing', () => {
    expect(rt.resolveAlias('nope')).toBeUndefined()
  })
})

describe('EdgeRuntime - route matching', () => {
  let rt: EdgeRuntime
  beforeEach(() => { rt = new EdgeRuntime() })

  it('matches exact route', async () => {
    rt.registerFunction({ name: 'hello', version: '1', handler: () => rt.jsonResponse({ msg: 'hi' }), triggers: ['http'], methods: ['GET'] })
    const r = await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/hello', headers: {} }))
    expect(r.status).toBe(200)
    expect(r.jsonBody).toEqual({ msg: 'hi' })
  })
  it('extracts path params', async () => {
    let captured: EdgeRequest | undefined
    rt.registerFunction({ name: 'users/:id', version: '1', handler: (req) => { captured = req; return rt.jsonResponse({ id: req.params.id }) }, triggers: ['http'], methods: ['GET'] })
    await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/users/42', headers: {} }))
    expect(captured?.params.id).toBe('42')
  })
  it('method mismatch returns 404', async () => {
    rt.registerFunction({ name: 'hello', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'], methods: ['GET'] })
    const r = await rt.invokeHttp(rt.parseRequest({ method: 'POST', url: '/hello', headers: {} }))
    expect(r.status).toBe(404)
  })
  it('404 for unknown route', async () => {
    const r = await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/missing', headers: {} }))
    expect(r.status).toBe(404)
  })
  it('lists routes', () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'], methods: ['GET', 'POST'] })
    expect(rt.listRoutes()).toHaveLength(2)
  })
})

describe('EdgeRuntime - parseRequest', () => {
  let rt: EdgeRuntime
  beforeEach(() => { rt = new EdgeRuntime() })

  it('parses query string', () => {
    const r = rt.parseRequest({ method: 'GET', url: '/x?a=1&b=2', headers: {} })
    expect(r.query.a).toBe('1')
    expect(r.query.b).toBe('2')
  })
  it('parses JSON body', () => {
    const r = rt.parseRequest({ method: 'POST', url: '/x', headers: { 'content-type': 'application/json' }, body: '{"a":1}' })
    expect(r.jsonBody).toEqual({ a: 1 })
  })
  it('parses form body', () => {
    const r = rt.parseRequest({ method: 'POST', url: '/x', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=1&b=2' })
    expect(r.formBody).toEqual({ a: '1', b: '2' })
  })
  it('parses cookies', () => {
    const r = rt.parseRequest({ method: 'GET', url: '/x', headers: { cookie: 'sid=abc; uid=42' } })
    expect(r.cookies?.sid).toBe('abc')
    expect(r.cookies?.uid).toBe('42')
  })
})

describe('EdgeRuntime - response helpers', () => {
  let rt: EdgeRuntime
  beforeEach(() => { rt = new EdgeRuntime() })

  it('json', () => {
    const r = rt.jsonResponse({ ok: true })
    expect(r.headers['content-type']).toBe('application/json')
    expect(r.jsonBody).toEqual({ ok: true })
  })
  it('text', () => {
    const r = rt.textResponse('hello')
    expect(r.body).toBe('hello')
  })
  it('html', () => {
    const r = rt.htmlResponse('<p>hi</p>')
    expect(r.headers['content-type']).toBe('text/html')
  })
  it('empty 204', () => {
    const r = rt.emptyResponse()
    expect(r.status).toBe(204)
    expect(r.body).toBe('')
  })
  it('corsHeaders', () => {
    const h = rt.corsHeaders()
    expect(h['access-control-allow-origin']).toBe('*')
  })
})

describe('EdgeRuntime - middleware', () => {
  let rt: EdgeRuntime
  beforeEach(() => { rt = new EdgeRuntime() })

  it('global middleware', async () => {
    rt.use(async (req, next) => { const r = await next(); r.headers['x-custom'] = 'global'; return r })
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.jsonResponse({}), triggers: ['http'], methods: ['GET'] })
    const r = await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/a', headers: {} }))
    expect(r.headers['x-custom']).toBe('global')
  })
  it('function middleware', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.jsonResponse({}), triggers: ['http'], methods: ['GET'], middleware: [async (req, next) => { const r = await next(); r.headers['x-fmw'] = 'yes'; return r }] })
    const r = await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/a', headers: {} }))
    expect(r.headers['x-fmw']).toBe('yes')
  })
})

describe('EdgeRuntime - triggers', () => {
  let rt: EdgeRuntime
  beforeEach(() => { rt = new EdgeRuntime() })

  it('cron trigger', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.jsonResponse({ ok: true }), triggers: ['cron'] })
    const r = await rt.invokeCron('a', { tick: 1 })
    expect(r.status).toBe(200)
  })
  it('queue trigger', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.jsonResponse({ ok: true }), triggers: ['queue'] })
    const r = await rt.invokeQueue('a', { msg: 'hi' })
    expect(r.status).toBe(200)
  })
  it('event trigger', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: (req) => rt.jsonResponse({ event: req.headers['x-event-name'] }), triggers: ['event'] })
    const r = await rt.invokeEvent('a', 'user.created', { uid: 1 })
    expect(r.jsonBody).toEqual({ event: 'user.created' })
  })
  it('cron returns 404 for missing', async () => {
    const r = await rt.invokeCron('missing', {})
    expect(r.status).toBe(404)
  })
  it('queue 404 for missing', async () => {
    const r = await rt.invokeQueue('missing', {})
    expect(r.status).toBe(404)
  })
  it('event 404 for missing', async () => {
    const r = await rt.invokeEvent('missing', 'x', {})
    expect(r.status).toBe(404)
  })
})

describe('EdgeRuntime - timeout and error', () => {
  let rt: EdgeRuntime
  beforeEach(() => { rt = new EdgeRuntime() })

  it('handles thrown error', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => { throw new Error('boom') }, triggers: ['http'], methods: ['GET'] })
    const r = await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/a', headers: {} }))
    expect(r.status).toBe(500)
  })
  it('times out', async () => {
    rt.registerFunction({ name: 'slow', version: '1', handler: () => new Promise(r => setTimeout(() => r(rt.emptyResponse()), 500)), triggers: ['http'], methods: ['GET'], timeoutMs: 50 })
    const r = await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/slow', headers: {} }))
    expect(r.status).toBe(500)
  })
  it('cold start tracking', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'], methods: ['GET'] })
    await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/a', headers: {} }))
    await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/a', headers: {} }))
    const invs = rt.listInvocations({ functionName: 'a' })
    expect(invs[0]?.coldStart).toBe(true)
    expect(invs[1]?.coldStart).toBe(false)
  })
})

describe('EdgeRuntime - invocations query', () => {
  let rt: EdgeRuntime
  beforeEach(() => { rt = new EdgeRuntime() })

  it('lists invocations', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'], methods: ['GET'] })
    await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/a', headers: {} }))
    expect(rt.listInvocations()).toHaveLength(1)
  })
  it('filters by function', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'], methods: ['GET'] })
    rt.registerFunction({ name: 'b', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'], methods: ['GET'] })
    await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/a', headers: {} }))
    expect(rt.listInvocations({ functionName: 'b' })).toHaveLength(0)
  })
  it('filters by status', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(404), triggers: ['http'], methods: ['GET'] })
    await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/a', headers: {} }))
    expect(rt.listInvocations({ status: 404 })).toHaveLength(1)
  })
  it('filters by since', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'], methods: ['GET'] })
    await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/a', headers: {} }))
    const t = Date.now() + 1000
    expect(rt.listInvocations({ since: t })).toHaveLength(0)
  })
  it('getInvocation by id', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'], methods: ['GET'] })
    await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/a', headers: {} }))
    const id = rt.listInvocations()[0]!.id
    expect(rt.getInvocation(id)?.id).toBe(id)
  })
  it('getInvocation undefined', () => {
    expect(rt.getInvocation('nope')).toBeUndefined()
  })
})

describe('EdgeRuntime - metrics', () => {
  let rt: EdgeRuntime
  beforeEach(() => { rt = new EdgeRuntime() })

  it('totalFunctions', () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'] })
    expect(rt.getMetrics().totalFunctions).toBe(1)
  })
  it('totalInvocations', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'], methods: ['GET'] })
    await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/a', headers: {} }))
    expect(rt.getMetrics().totalInvocations).toBe(1)
  })
  it('byTrigger', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http', 'cron'] })
    await rt.invokeHttp(rt.parseRequest({ method: 'GET', url: '/a', headers: {} }))
    await rt.invokeCron('a', {})
    const m = rt.getMetrics()
    expect(m.byTrigger.http).toBe(1)
    expect(m.byTrigger.cron).toBe(1)
  })
  it('byRegion', async () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'], methods: ['GET'] })
    const req = rt.parseRequest({ method: 'GET', url: '/a', headers: {} })
    req.region = 'eu-central'
    await rt.invokeHttp(req)
    expect(rt.getMetrics().byRegion['eu-central']).toBe(1)
  })
  it('resetMetrics', () => {
    rt.registerFunction({ name: 'a', version: '1', handler: () => rt.emptyResponse(), triggers: ['http'] })
    rt.resetMetrics()
    expect(rt.getMetrics().totalInvocations).toBe(0)
  })
})

describe('EdgeRuntime - singleton', () => {
  it('singleton', () => {
    resetEdgeRuntime()
    expect(getEdgeRuntime()).toBe(getEdgeRuntime())
  })
})
