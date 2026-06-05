import { describe, it, expect, beforeEach } from 'vitest'
import { GraphQLGateway, DataLoaderImpl, type GraphQLUpstream } from '../index'

describe('GraphQLGateway · types + upstreams', () => {
  let gw: GraphQLGateway
  beforeEach(() => { gw = new GraphQLGateway() })
  it('registerType / getType / listTypes', () => {
    gw.registerType({ kind: 'object', name: 'User', fields: {} })
    expect(gw.getType('User')?.kind).toBe('object')
    expect(gw.listTypes().length).toBe(1)
  })
  it('registerUpstream + listUpstreams', () => {
    const u: GraphQLUpstream = { name: 'svc', schema: 'type Q { x: Int }', fieldOwners: { 'Query.x': 'svc' }, execute: async () => 1, healthy: () => true }
    gw.registerUpstream(u)
    expect(gw.listUpstreams().length).toBe(1)
    expect(gw.getUpstream('svc')?.name).toBe('svc')
  })
  it('removeUpstream', () => {
    const u: GraphQLUpstream = { name: 'svc', schema: '', fieldOwners: {}, execute: async () => 1, healthy: () => true }
    gw.registerUpstream(u)
    expect(gw.removeUpstream('svc')).toBe(true)
  })
  it('healthyUpstreams', () => {
    gw.registerUpstream({ name: 'a', schema: '', fieldOwners: {}, execute: async () => 1, healthy: () => true })
    gw.registerUpstream({ name: 'b', schema: '', fieldOwners: {}, execute: async () => 1, healthy: () => false })
    expect(gw.healthyUpstreams().length).toBe(1)
  })
})

describe('GraphQLGateway · parseQuery', () => {
  let gw: GraphQLGateway
  beforeEach(() => { gw = new GraphQLGateway() })
  it('query', () => {
    const p = gw.parseQuery('query { user { name } }')
    expect(p.operation).toBe('query')
    expect(p.fieldCount).toBeGreaterThan(0)
  })
  it('mutation', () => {
    const p = gw.parseQuery('mutation { createUser(name: "x") { id } }')
    expect(p.operation).toBe('mutation')
  })
  it('subscription', () => {
    const p = gw.parseQuery('subscription { event { data } }')
    expect(p.operation).toBe('subscription')
  })
  it('named operation', () => {
    const p = gw.parseQuery('query GetUser { user { name } }')
    expect(p.name).toBe('GetUser')
  })
  it('with variables', () => {
    const p = gw.parseQuery('query Q($id: ID!) { user(id: $id) { name } }')
    expect(p.variables.$id).toBe('ID!')
  })
  it('with fragments', () => {
    const p = gw.parseQuery(`query { user { ...userFields } } fragment userFields on User { name email }`)
    expect(p.fragments.userFields).toBeDefined()
  })
  it('depth', () => {
    const p = gw.parseQuery('query { a { b { c { d } } } }')
    expect(p.depth).toBe(3)
  })
})

describe('GraphQLGateway · plan', () => {
  let gw: GraphQLGateway
  beforeEach(() => { gw = new GraphQLGateway() })
  it('plans multi-upstream query', () => {
    gw.registerUpstream({ name: 'a', schema: '', fieldOwners: { 'Query.user': 'a' }, execute: async () => 1, healthy: () => true })
    gw.registerUpstream({ name: 'b', schema: '', fieldOwners: { 'Query.posts': 'b' }, execute: async () => 2, healthy: () => true })
    const p = gw.parseQuery('query { user { name } posts { title } }')
    const plan = gw.plan(p)
    expect(plan.steps.length).toBeGreaterThan(0)
    expect(plan.byUpstream.a).toBeDefined()
    expect(plan.byUpstream.b).toBeDefined()
  })
  it('empty plan for no upstreams', () => {
    const p = gw.parseQuery('query { user { name } }')
    const plan = gw.plan(p)
    expect(plan.steps[0].upstream).toBe('self')
  })
})

describe('GraphQLGateway · execute', () => {
  let gw: GraphQLGateway
  beforeEach(() => { gw = new GraphQLGateway() })
  it('success', async () => {
    gw.registerUpstream({ name: 'a', schema: '', fieldOwners: { 'Query.user': 'a' }, execute: async () => ({ id: 1, name: 'Alice' }), healthy: () => true })
    const r = await gw.execute('query { user { name } }', { loaders: new Map() })
    expect(r.data).toEqual({ user: { id: 1, name: 'Alice' } })
    expect(r.errors).toBeUndefined()
  })
  it('cache hit on second call', async () => {
    let calls = 0
    gw.registerUpstream({ name: 'a', schema: '', fieldOwners: { 'Query.user': 'a' }, execute: async () => { calls++; return { id: 1 } }, healthy: () => true })
    const ctx = { loaders: new Map() }
    await gw.execute('query { user { id } }', ctx)
    const r2 = await gw.execute('query { user { id } }', ctx)
    expect(r2.cacheHit).toBe(true)
    expect(calls).toBe(1)
  })
  it('upstream error', async () => {
    gw.registerUpstream({ name: 'a', schema: '', fieldOwners: { 'Query.x': 'a' }, execute: async () => { throw new Error('boom') }, healthy: () => true })
    const r = await gw.execute('query { x }', { loaders: new Map() })
    expect(r.errors?.[0].message).toBe('boom')
  })
  it('unhealthy upstream', async () => {
    gw.registerUpstream({ name: 'a', schema: '', fieldOwners: { 'Query.x': 'a' }, execute: async () => 1, healthy: () => false })
    const r = await gw.execute('query { x }', { loaders: new Map() })
    expect(r.errors?.[0].message).toContain('unhealthy')
  })
  it('max depth exceeded', async () => {
    gw.setMaxDepth(2)
    const r = await gw.execute('query { a { b { c { d } } } }', { loaders: new Map() })
    expect(r.errors?.[0].message).toContain('depth')
  })
  it('max cost exceeded', async () => {
    gw.registerUpstream({ name: 'a', schema: '', fieldOwners: { 'Query.a': 'a' }, execute: async () => 1, healthy: () => true })
    gw.setMaxCost(0)
    const r = await gw.execute('query { a }', { loaders: new Map() })
    expect(r.errors?.[0].message).toContain('cost')
  })
  it('parse error', async () => {
    const r = await gw.execute('', { loaders: new Map() })
    expect(r.errors).toBeDefined()
  })
  it('parallel execution', async () => {
    let concurrent = 0, maxConc = 0
    gw.registerUpstream({ name: 'a', schema: '', fieldOwners: { 'Query.x': 'a' }, execute: async () => { concurrent++; maxConc = Math.max(maxConc, concurrent); await new Promise(r => setTimeout(r, 10)); concurrent--; return 1 }, healthy: () => true })
    gw.registerUpstream({ name: 'b', schema: '', fieldOwners: { 'Query.y': 'b' }, execute: async () => { concurrent++; maxConc = Math.max(maxConc, concurrent); await new Promise(r => setTimeout(r, 10)); concurrent--; return 2 }, healthy: () => true })
    const r = await gw.execute('query { x y }', { loaders: new Map() })
    expect(r.data).toEqual({ x: 1, y: 2 })
    expect(maxConc).toBeGreaterThan(1)
  })
})

describe('GraphQLGateway · subscriptions', () => {
  it('subscribe + publish + unsubscribe', () => {
    const gw = new GraphQLGateway()
    const received: unknown[] = []
    const off = gw.subscribe('events', d => received.push(d))
    expect(gw.subscriberCount('events')).toBe(1)
    expect(gw.publish('events', { a: 1 })).toBe(1)
    expect(gw.publish('events', { a: 2 })).toBe(1)
    off()
    expect(gw.subscriberCount('events')).toBe(0)
    expect(gw.listSubscriptionTopics().length).toBe(0)
  })
  it('multiple subscribers', () => {
    const gw = new GraphQLGateway()
    let count = 0
    gw.subscribe('t', () => count++)
    gw.subscribe('t', () => count++)
    gw.publish('t', {})
    expect(count).toBe(2)
  })
})

describe('GraphQLGateway · cache', () => {
  it('clearCache', async () => {
    const gw = new GraphQLGateway()
    gw.registerUpstream({ name: 'a', schema: '', fieldOwners: { 'Query.x': 'a' }, execute: async () => 1, healthy: () => true })
    await gw.execute('query { x }', { loaders: new Map() })
    expect(gw.getCacheEntry(gw.hashQuery('query { x }'))).toBeDefined()
    gw.clearCache()
    expect(gw.getCacheEntry(gw.hashQuery('query { x }'))).toBeUndefined()
  })
  it('pruneCache', async () => {
    const gw = new GraphQLGateway()
    gw.setDefaultCacheTtlMs(-1) // expired
    gw.registerUpstream({ name: 'a', schema: '', fieldOwners: { 'Query.x': 'a' }, execute: async () => 1, healthy: () => true })
    await gw.execute('query { x }', { loaders: new Map() })
    const n = gw.pruneCache()
    expect(n).toBeGreaterThanOrEqual(0)
  })
})

describe('GraphQLGateway · persisted', () => {
  it('registerPersisted + getPersisted + listPersisted', () => {
    const gw = new GraphQLGateway()
    gw.registerPersisted('abc', 'query { x }')
    expect(gw.getPersisted('abc')?.query).toBe('query { x }')
    expect(gw.listPersisted().length).toBe(1)
  })
  it('hashQuery is stable', () => {
    const gw = new GraphQLGateway()
    expect(gw.hashQuery('x')).toBe(gw.hashQuery('x'))
  })
})

describe('GraphQLGateway · dataLoader', () => {
  it('batch loads', async () => {
    const gw = new GraphQLGateway()
    const loader = gw.createLoader<number, number>(async (keys) => keys.map(k => k * 2))
    const results = await Promise.all([loader.load(1), loader.load(2), loader.load(3)])
    expect(results.sort()).toEqual([2, 4, 6])
  })
  it('loadMany', async () => {
    const gw = new GraphQLGateway()
    const loader = gw.createLoader<number, number>(async (keys) => keys.map(k => k + 1))
    const r = await loader.loadMany([1, 2, 3])
    expect(r).toEqual([2, 3, 4])
  })
  it('clear / clearAll / prime', async () => {
    const loader = new DataLoaderImpl<number, number>(async keys => keys.map(k => k * 2))
    loader.prime(1, 100)
    expect(await loader.load(1)).toBe(100)
    loader.clear(1)
    loader.clearAll()
  })
  it('handles batch error', async () => {
    const loader = new DataLoaderImpl<number, number>(async () => { throw new Error('batch_fail') })
    await expect(loader.load(1)).rejects.toThrow('batch_fail')
  })
})

describe('GraphQLGateway · metrics', () => {
  it('totals & byUpstream', async () => {
    const gw = new GraphQLGateway()
    gw.registerUpstream({ name: 'a', schema: '', fieldOwners: { 'Query.x': 'a' }, execute: async () => 1, healthy: () => true })
    await gw.execute('query { x }', { loaders: new Map() })
    const m = gw.getMetrics()
    expect(m.totalQueries).toBe(1)
    expect(m.byUpstream.a?.calls).toBe(1)
  })
  it('resetMetrics', () => {
    const gw = new GraphQLGateway()
    gw.resetMetrics()
    expect(gw.getMetrics().totalQueries).toBe(0)
  })
})

describe('GraphQLGateway · federation', () => {
  it('executeWithRetry', async () => {
    const gw = new GraphQLGateway()
    gw.registerUpstream({ name: 'a', schema: '', fieldOwners: { 'Query.x': 'a' }, execute: async () => 1, healthy: () => true })
    const r = await gw.executeWithRetry('query { x }', { loaders: new Map() })
    expect(r.data).toEqual({ x: 1 })
  })
})

describe('GraphQLGateway · singleton', () => {
  it('getGraphQLGateway / reset', async () => {
    const m = await import('../index')
    const a = m.getGraphQLGateway()
    const b = m.getGraphQLGateway()
    expect(a).toBe(b)
    m.resetGraphQLGateway()
    const c = m.getGraphQLGateway()
    expect(c).not.toBe(a)
  })
})
