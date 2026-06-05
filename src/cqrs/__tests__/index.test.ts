import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CQRSBus, EventBus } from '../index'
import { EventStore, type DomainEvent } from '../../eventsrc'

const setup = () => {
  const es = new EventStore()
  const bus = new CQRSBus(es)
  es.registerAggregate('Order', (events: DomainEvent[]) => {
    const init = { items: 0, total: 0, status: 'pending' }
    for (const e of events) {
      if (e.type === 'ItemAdded') init.items += 1
      else if (e.type === 'TotalSet') init.total = e.payload as number
      else if (e.type === 'StatusChanged') init.status = e.payload as string
    }
    return init
  })
  return { es, bus }
}

describe('CQRSBus · command dispatch', () => {
  it('dispatches command + appends events', async () => {
    const { es, bus } = setup()
    bus.registerCommandHandler({ type: 'AddItem', handle: (cmd) => [{ id: '', type: 'ItemAdded', aggregateId: cmd.aggregateId, aggregateType: cmd.aggregateType, version: 0, payload: cmd.payload, metadata: { ts: Date.now() } }] })
    const r = await bus.dispatch(CQRSBus.makeCommand('AddItem', 'Order', 'o1', { sku: 'A' }))
    expect(r.ok).toBe(true)
    expect(r.events?.length).toBe(1)
    expect(es.totalEventCount()).toBe(1)
  })
  it('error in handler returns ok=false', async () => {
    const { bus } = setup()
    bus.registerCommandHandler({ type: 'Bad', handle: () => { throw new Error('boom') } })
    const r = await bus.dispatch(CQRSBus.makeCommand('Bad', 'X', 'x1', {}))
    expect(r.ok).toBe(false)
    expect(r.error).toBe('boom')
  })
  it('no handler returns error', async () => {
    const { bus } = setup()
    const r = await bus.dispatch(CQRSBus.makeCommand('Missing', 'X', 'x1', {}))
    expect(r.ok).toBe(false)
  })
  it('requiredScopes denies', async () => {
    const { bus } = setup()
    bus.registerCommandHandler({ type: 'Sec', requiredScopes: ['admin'], handle: () => [] })
    const r = await bus.dispatch({ id: 'c1', type: 'Sec', aggregateId: 'x', aggregateType: 'X', payload: {}, metadata: { ts: Date.now() } })
    expect(r.error).toContain('forbidden')
  })
  it('requiredScopes allows when matching', async () => {
    const { bus } = setup()
    bus.registerCommandHandler({ type: 'Sec', requiredScopes: ['admin'], handle: () => [] })
    const r = await bus.dispatch({ id: 'c1', type: 'Sec', aggregateId: 'x', aggregateType: 'X', payload: {}, metadata: { ts: Date.now() }, userId: 'u1', scopes: ['admin'] })
    expect(r.ok).toBe(true)
  })
})

describe('CQRSBus · middleware', () => {
  it('runs before + after middleware', async () => {
    const { bus } = setup()
    const before = vi.fn()
    const after = vi.fn()
    bus.use({ name: 'm1', before, after })
    bus.registerCommandHandler({ type: 'X', handle: () => [] })
    const r = await bus.dispatch(CQRSBus.makeCommand('X', 'A', 'a1', {}))
    expect(before).toHaveBeenCalled()
    expect(after).toHaveBeenCalled()
    expect(r.middlewareLog).toBeDefined()
  })
  it('catches middleware errors into log', async () => {
    const { bus } = setup()
    bus.use({ name: 'm1', before: () => { throw new Error('mw-fail') } })
    bus.registerCommandHandler({ type: 'X', handle: () => [] })
    const r = await bus.dispatch(CQRSBus.makeCommand('X', 'A', 'a1', {}))
    expect(r.middlewareLog[0]).toContain('m1:mw-fail')
  })
  it('unuse', () => {
    const { bus } = setup()
    bus.use({ name: 'm1' })
    expect(bus.unuse('m1')).toBe(true)
    expect(bus.unuse('m1')).toBe(false)
  })
  it('listMiddlewares', () => {
    const { bus } = setup()
    bus.use({ name: 'a' }); bus.use({ name: 'b' })
    expect(bus.listMiddlewares()).toEqual(['a', 'b'])
  })
})

describe('CQRSBus · query dispatch', () => {
  it('dispatches query', async () => {
    const { bus } = setup()
    bus.registerQueryHandler({ type: 'GetOrder', handle: () => ({ ok: 1 }) })
    const r = await bus.query(CQRSBus.makeQuery('GetOrder', { id: 'o1' }))
    expect(r.data).toEqual({ ok: 1 })
  })
  it('query error', async () => {
    const { bus } = setup()
    bus.registerQueryHandler({ type: 'BadQ', handle: () => { throw new Error('qboom') } })
    const r = await bus.query(CQRSBus.makeQuery('BadQ', {}))
    expect(r.ok).toBe(false)
  })
  it('no query handler', async () => {
    const { bus } = setup()
    const r = await bus.query(CQRSBus.makeQuery('Missing', {}))
    expect(r.ok).toBe(false)
  })
  it('cache hit on second call', async () => {
    const { bus } = setup()
    let calls = 0
    bus.registerQueryHandler({ type: 'C', handle: () => { calls++; return 42 } })
    await bus.query(CQRSBus.makeQuery('C', {}, { cacheable: true }))
    const r2 = await bus.query(CQRSBus.makeQuery('C', {}, { cacheable: true }))
    expect(r2.cacheHit).toBe(true)
    expect(calls).toBe(1)
  })
  it('invalidateQueryCache + size', async () => {
    const { bus } = setup()
    bus.registerQueryHandler({ type: 'C', handle: () => 1 })
    await bus.query(CQRSBus.makeQuery('C', {}, { cacheable: true }))
    expect(bus.queryCacheSize()).toBe(1)
    bus.invalidateQueryCache()
    expect(bus.queryCacheSize()).toBe(0)
  })
})

describe('CQRSBus · read models', () => {
  it('registerReadModel + getReadModel', () => {
    const { bus } = setup()
    bus.registerReadModel({ name: 'rm1', state: {}, position: 0, updatedAt: 0, applies: () => {} })
    expect(bus.getReadModel('rm1')?.name).toBe('rm1')
  })
  it('read model updates on event', async () => {
    const { es, bus } = setup()
    const state: Record<string, unknown> = {}
    bus.registerReadModel({ name: 'rm', state, position: 0, updatedAt: 0, applies: (events) => { for (const e of events) if (e.type === 'X') state.count = ((state.count as number) ?? 0) + 1 } })
    es.append([{ id: '', type: 'X', aggregateId: 'a', aggregateType: 'A', version: 0, payload: {}, metadata: { ts: Date.now() } }])
    expect(bus.getReadModel('rm')?.state.count).toBe(1)
  })
  it('listReadModels', () => {
    const { bus } = setup()
    bus.registerReadModel({ name: 'a', state: {}, position: 0, updatedAt: 0, applies: () => {} })
    bus.registerReadModel({ name: 'b', state: {}, position: 0, updatedAt: 0, applies: () => {} })
    expect(bus.listReadModels().length).toBe(2)
  })
})

describe('EventBus', () => {
  it('subscribe + publish', () => {
    const b = new EventBus()
    const received: unknown[] = []
    b.subscribe('X', e => received.push(e))
    b.publish({ id: '1', type: 'X', aggregateId: 'a', aggregateType: 'A', version: 1, payload: {}, metadata: { ts: 0 } })
    expect(received.length).toBe(1)
  })
  it('subscribeAll wildcard', () => {
    const b = new EventBus()
    let count = 0
    b.subscribeAll(() => count++)
    b.publish({ id: '1', type: 'X', aggregateId: 'a', aggregateType: 'A', version: 1, payload: {}, metadata: { ts: 0 } })
    expect(count).toBe(1)
  })
  it('unsubscribe', () => {
    const b = new EventBus()
    const off = b.subscribe('X', () => {})
    off()
    expect(b.subscriberCount('X')).toBe(0)
  })
  it('listTypes', () => {
    const b = new EventBus()
    b.subscribe('A', () => {})
    b.subscribe('B', () => {})
    expect(b.listTypes().sort()).toEqual(['A', 'B'])
  })
})

describe('CQRSBus · metrics + lists', () => {
  it('totalCommands + byCommandType', async () => {
    const { bus } = setup()
    bus.registerCommandHandler({ type: 'X', handle: () => [] })
    await bus.dispatch(CQRSBus.makeCommand('X', 'A', 'a1', {}))
    const m = bus.getMetrics()
    expect(m.totalCommands).toBe(1)
    expect(m.byCommandType.X?.count).toBe(1)
  })
  it('resetMetrics', async () => {
    const { bus } = setup()
    bus.resetMetrics()
    expect(bus.getMetrics().totalCommands).toBe(0)
  })
  it('listCommandHandlers + listQueryHandlers', () => {
    const { bus } = setup()
    bus.registerCommandHandler({ type: 'A', handle: () => [] })
    bus.registerQueryHandler({ type: 'B', handle: () => null })
    expect(bus.listCommandHandlers()).toContain('A')
    expect(bus.listQueryHandlers()).toContain('B')
  })
  it('dispatchWithRetry', async () => {
    const { bus } = setup()
    bus.registerCommandHandler({ type: 'X', handle: () => [] })
    const r = await bus.dispatchWithRetry(CQRSBus.makeCommand('X', 'A', 'a1', {}))
    expect(r.ok).toBe(true)
  })
})

describe('CQRSBus · static helpers', () => {
  it('makeCommand + makeQuery', () => {
    const c = CQRSBus.makeCommand('T', 'A', 'a1', { x: 1 }, 'u1')
    expect(c.type).toBe('T')
    expect(c.userId).toBe('u1')
    const q = CQRSBus.makeQuery('Q', { x: 1 }, { cacheable: true })
    expect(q.cacheable).toBe(true)
  })
})

describe('CQRSBus · singleton', () => {
  it('getCQRSBus / reset', async () => {
    const m = await import('../index')
    m.setCQRSBusEvents(new EventStore())
    const a = m.getCQRSBus()
    const b = m.getCQRSBus()
    expect(a).toBe(b)
    m.resetCQRSBus()
    m.setCQRSBusEvents(new EventStore())
    const c = m.getCQRSBus()
    expect(c).not.toBe(a)
  })
})
