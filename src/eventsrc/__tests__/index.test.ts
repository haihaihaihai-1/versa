import { describe, it, expect, beforeEach } from 'vitest'
import { EventStore, type DomainEvent, type Saga, type EventSchema } from '../index'

const ts = () => Date.now() + Math.random()
const e = (type: string, aggregateId: string, payload: unknown, version?: number): DomainEvent => ({ id: '', type, aggregateId, aggregateType: 'Test', version: version ?? 0, payload, metadata: { ts: ts() } })

describe('EventStore · schemas', () => {
  let es: EventStore
  beforeEach(() => { es = new EventStore() })
  it('registerSchema + getSchema + latestSchema', () => {
    const s: EventSchema = { type: 'OrderCreated', version: 1, jsonSchema: { type: 'object' } }
    es.registerSchema(s)
    expect(es.getSchema('OrderCreated').length).toBe(1)
    expect(es.latestSchema('OrderCreated')?.version).toBe(1)
  })
  it('isCompatible', () => {
    es.registerSchema({ type: 'X', version: 1, jsonSchema: {} })
    es.registerSchema({ type: 'X', version: 2, jsonSchema: {}, compatibleWith: [1] })
    expect(es.isCompatible('X', 2, 1)).toBe(true)
    expect(es.isCompatible('X', 1, 2)).toBe(false)
  })
  it('listSchemas', () => {
    es.registerSchema({ type: 'A', version: 1, jsonSchema: {} })
    es.registerSchema({ type: 'B', version: 1, jsonSchema: {} })
    expect(es.listSchemas().length).toBe(2)
  })
})

describe('EventStore · aggregates + append', () => {
  let es: EventStore
  beforeEach(() => {
    es = new EventStore()
    es.registerAggregate('Counter', events => events.reduce((acc: number, ev: DomainEvent) => ev.type === 'Inc' ? acc + (ev.payload as number) : acc, 0))
  })
  it('append assigns id + version', () => {
    const recs = es.append([e('Inc', 'a', 1), e('Inc', 'a', 2), e('Inc', 'a', 3)])
    expect(recs.length).toBe(3)
    expect(recs[0].event.version).toBe(1)
    expect(recs[2].event.version).toBe(3)
    expect(recs[0].event.id).toBeTruthy()
  })
  it('optimistic concurrency', () => {
    es.append([e('Inc', 'a', 1)])
    expect(() => es.append([e('Inc', 'a', 1)], 0)).toThrow('optimistic')
  })
  it('getByPosition / getByAggregate / getByType', () => {
    es.append([e('Inc', 'a', 1), e('Inc', 'b', 2), e('Dec', 'a', 3)])
    expect(es.getByPosition(1)?.event.payload).toBe(1)
    expect(es.getByAggregate('a').length).toBe(2)
    expect(es.getByType('Inc').length).toBe(2)
  })
  it('getRange / totalEventCount / streamVersion', () => {
    es.append([e('Inc', 'a', 1), e('Inc', 'a', 2), e('Inc', 'a', 3)])
    expect(es.getRange(1, 2).length).toBe(2)
    expect(es.totalEventCount()).toBe(3)
    expect(es.streamVersion('a')).toBe(3)
  })
  it('getEvent', () => {
    const recs = es.append([e('Inc', 'a', 1)])
    expect(es.getEvent(recs[0].event.id)?.event.payload).toBe(1)
  })
  it('getAllEvents', () => {
    es.append([e('Inc', 'a', 1), e('Inc', 'b', 2)])
    expect(es.getAllEvents().length).toBe(2)
  })
  it('listAggregates', () => {
    expect(es.listAggregates()).toContain('Counter')
  })
})

describe('EventStore · rebuild + replay + time travel', () => {
  let es: EventStore
  beforeEach(() => {
    es = new EventStore()
    es.registerAggregate('Counter', events => events.reduce((acc: number, ev: DomainEvent) => ev.type === 'Inc' ? acc + (ev.payload as number) : acc, 0))
  })
  it('rebuildAggregate', () => {
    es.append([e('Inc', 'a', 1), e('Inc', 'a', 2), e('Inc', 'a', 3)])
    const s = es.rebuildAggregate<number>('Counter', 'a')
    expect(s.data).toBe(6)
    expect(s.version).toBe(3)
  })
  it('replay', () => {
    es.append([e('Inc', 'a', 1), e('Inc', 'a', 2)])
    let count = 0
    const n = es.replay('Inc', () => count++)
    expect(n).toBe(2)
    expect(count).toBe(2)
  })
  it('stateAt time travel', () => {
    es.append([e('Inc', 'a', 1), e('Inc', 'a', 2), e('Inc', 'a', 3)])
    expect(es.stateAt<number>('Counter', 'a', 1).data).toBe(1)
    expect(es.stateAt<number>('Counter', 'a', 2).data).toBe(3)
  })
  it('rebuild without rebuilder throws', () => {
    expect(() => es.rebuildAggregate('Unknown', 'a')).toThrow('no rebuilder')
  })
})

describe('EventStore · snapshots', () => {
  let es: EventStore
  beforeEach(() => {
    es = new EventStore()
    es.registerAggregate('Counter', events => events.reduce((acc: number, ev: DomainEvent) => ev.type === 'Inc' ? acc + (ev.payload as number) : acc, 0))
  })
  it('takeSnapshot + getSnapshot', () => {
    es.append([e('Inc', 'a', 1), e('Inc', 'a', 2)])
    const snap = es.takeSnapshot('a', 'Counter', 2)
    expect(snap.version).toBe(2)
    expect(es.getSnapshot('a')?.data).toBe(2)
  })
  it('rebuildWithSnapshot', () => {
    es.append([e('Inc', 'a', 1), e('Inc', 'a', 2)])
    es.takeSnapshot('a', 'Counter', 2)
    es.append([e('Inc', 'a', 3), e('Inc', 'a', 4)])
    const s = es.rebuildWithSnapshot<number>('Counter', 'a')
    expect(s.version).toBe(4)
  })
  it('listSnapshots', () => {
    es.append([e('Inc', 'a', 1)])
    es.takeSnapshot('a', 'Counter', 1)
    expect(es.listSnapshots().length).toBe(1)
  })
})

describe('EventStore · projections', () => {
  let es: EventStore
  beforeEach(() => { es = new EventStore() })
  it('registerProjection + getProjection', () => {
    es.registerProjection('p1')
    expect(es.getProjection('p1')?.name).toBe('p1')
  })
  it('setProjectionPosition', () => {
    es.registerProjection('p1')
    es.setProjectionPosition('p1', 42)
    expect(es.getProjection('p1')?.position).toBe(42)
  })
  it('rebuildProjection', () => {
    es.append([e('Inc', 'a', 1), e('Inc', 'b', 2), e('Dec', 'a', 3)])
    let count = 0
    const n = es.rebuildProjection('p1', () => count++)
    expect(n).toBe(3)
    expect(es.getProjection('p1')?.position).toBe(3)
  })
  it('listProjections', () => {
    es.registerProjection('a')
    es.registerProjection('b')
    expect(es.listProjections().length).toBe(2)
  })
})

describe('EventStore · subscriptions', () => {
  let es: EventStore
  beforeEach(() => { es = new EventStore() })
  it('subscribe + fanout on append', () => {
    const received: unknown[] = []
    es.subscribe('*', r => received.push(r))
    es.append([e('Inc', 'a', 1)])
    expect(received.length).toBe(1)
  })
  it('subscribe by type', () => {
    const received: unknown[] = []
    es.subscribe('type:Inc', r => received.push(r))
    es.append([e('Inc', 'a', 1), e('Dec', 'a', 2)])
    expect(received.length).toBe(1)
  })
  it('subscribe by aggregateId', () => {
    const received: unknown[] = []
    es.subscribe('agg:a', () => received.push(1))
    es.subscribe('agg:b', () => received.push(2))
    es.append([e('Inc', 'a', 1), e('Inc', 'b', 1)])
    expect(received).toEqual([1, 2])
  })
  it('subscribe by aggregateType', () => {
    const received: unknown[] = []
    es.subscribe('aggt:Test', () => received.push(1))
    es.append([e('Inc', 'a', 1)])
    expect(received.length).toBe(1)
  })
  it('unsubscribe', () => {
    const off = es.subscribe('*', () => {})
    expect(es.subscriberCount('*')).toBe(1)
    off()
    expect(es.subscriberCount('*')).toBe(0)
  })
  it('listSubscriptionTopics', () => {
    es.subscribe('a', () => {})
    es.subscribe('b', () => {})
    expect(es.listSubscriptionTopics().length).toBe(2)
  })
})

describe('EventStore · sagas', () => {
  let es: EventStore
  beforeEach(() => { es = new EventStore() })
  it('successful saga', async () => {
    const saga: Saga = { id: 's1', name: 'test', state: 'pending', steps: [{ name: 'a', execute: async () => {} }, { name: 'b', execute: async () => {} }], history: [], startedAt: 0 }
    const r = await es.runSaga(saga)
    expect(r.state).toBe('completed')
    expect(es.listSagas().length).toBe(1)
  })
  it('failing saga with compensation', async () => {
    let compensated = false
    const saga: Saga = { id: 's2', name: 'test', state: 'pending', steps: [{ name: 'a', execute: async () => {}, compensate: async () => { compensated = true } }, { name: 'b', execute: async () => { throw new Error('boom') } }], history: [], startedAt: 0 }
    const r = await es.runSaga(saga)
    expect(r.state).toBe('compensated')
    expect(compensated).toBe(true)
  })
  it('getSaga', async () => {
    const saga: Saga = { id: 's3', name: 'test', state: 'pending', steps: [{ name: 'a', execute: async () => {} }], history: [], startedAt: 0 }
    await es.runSaga(saga)
    expect(es.getSaga('s3')?.id).toBe('s3')
  })
})

describe('EventStore · metrics + maintenance', () => {
  let es: EventStore
  beforeEach(() => {
    es = new EventStore()
    es.registerAggregate('Counter', events => events.reduce((acc: number, ev: DomainEvent) => ev.type === 'Inc' ? acc + (ev.payload as number) : acc, 0))
  })
  it('metrics totalEvents', () => {
    es.append([e('Inc', 'a', 1), e('Inc', 'a', 2)])
    expect(es.getMetrics().totalEvents).toBe(2)
  })
  it('metrics byType / byAggregate', () => {
    es.append([e('Inc', 'a', 1), e('Dec', 'a', 2)])
    expect(es.getMetrics().byType.Inc).toBe(1)
    expect(es.getMetrics().byAggregate.a).toBe(2)
  })
  it('resetMetrics', () => {
    es.append([e('Inc', 'a', 1)])
    es.resetMetrics()
    expect(es.getMetrics().totalEvents).toBe(0)
  })
  it('clearAll', () => {
    es.append([e('Inc', 'a', 1)])
    es.clearAll()
    expect(es.totalEventCount()).toBe(0)
  })
  it('appendWithRetry', async () => {
    const recs = await es.appendWithRetry([e('Inc', 'a', 1)])
    expect(recs.length).toBe(1)
  })
})

describe('EventStore · singleton', () => {
  it('getEventStore / reset', async () => {
    const m = await import('../index')
    const a = m.getEventStore()
    const b = m.getEventStore()
    expect(a).toBe(b)
    m.resetEventStore()
    const c = m.getEventStore()
    expect(c).not.toBe(a)
  })
})
