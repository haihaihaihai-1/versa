import { describe, it, expect, beforeEach } from 'vitest'
import { ReplicationManager, getReplicationManager, resetReplicationManager } from '../index'

describe('ReplicationManager - DC management', () => {
  let rm: ReplicationManager
  beforeEach(() => { rm = new ReplicationManager('dc-1') })

  it('initializes with current DC', () => {
    expect(rm.currentDc().id).toBe('dc-1')
    expect(rm.listDcs()).toHaveLength(1)
  })
  it('adds DC', () => {
    const dc = rm.addDc('dc-2', 'us-east')
    expect(dc.region).toBe('us-east')
    expect(rm.listDcs()).toHaveLength(2)
  })
  it('removes DC', () => {
    rm.addDc('dc-2', 'us-east')
    expect(rm.removeDc('dc-2')).toBe(true)
    expect(rm.listDcs()).toHaveLength(1)
  })
  it('sets DC status', () => {
    rm.addDc('dc-2', 'us-east')
    rm.setDcStatus('dc-2', 'offline')
    expect(rm.getDc('dc-2')?.status).toBe('offline')
  })
  it('partition increments metric', () => {
    rm.addDc('dc-2', 'us-east')
    rm.setDcStatus('dc-2', 'partitioned')
    expect(rm.getMetrics().partitionEvents).toBe(1)
  })
})

describe('ReplicationManager - basic CRUD', () => {
  let rm: ReplicationManager
  beforeEach(() => { rm = new ReplicationManager('dc-1') })

  it('set / get', () => {
    rm.set('foo', 'bar')
    expect(rm.get('foo')?.value).toBe('bar')
  })
  it('has / keys', () => {
    rm.set('a', 1)
    rm.set('b', 2)
    expect(rm.has('a')).toBe(true)
    expect(rm.keys()).toEqual(['a', 'b'])
  })
  it('delete marks tombstone', () => {
    rm.set('a', 1)
    rm.delete('a')
    expect(rm.has('a')).toBe(false)
  })
  it('throws on missing DC for set', () => {
    expect(() => rm.set('k', 'v', 'missing')).toThrow()
  })
})

describe('ReplicationManager - vector clocks', () => {
  it('compare equal', () => {
    const a = { nodeId: 'n1', counters: { n1: 1 } }
    const b = { nodeId: 'n1', counters: { n1: 1 } }
    expect(ReplicationManager.compare(a, b)).toBe('equal')
  })
  it('compare after', () => {
    const a = { nodeId: 'n1', counters: { n1: 2 } }
    const b = { nodeId: 'n1', counters: { n1: 1 } }
    expect(ReplicationManager.compare(a, b)).toBe('after')
  })
  it('compare before', () => {
    const a = { nodeId: 'n1', counters: { n1: 1 } }
    const b = { nodeId: 'n1', counters: { n1: 2 } }
    expect(ReplicationManager.compare(a, b)).toBe('before')
  })
  it('compare concurrent', () => {
    const a = { nodeId: 'n1', counters: { n1: 2, n2: 1 } }
    const b = { nodeId: 'n1', counters: { n1: 1, n2: 2 } }
    expect(ReplicationManager.compare(a, b)).toBe('concurrent')
  })
  it('merge', () => {
    const a = { nodeId: 'n1', counters: { n1: 2, n2: 1 } }
    const b = { nodeId: 'n1', counters: { n1: 1, n2: 3, n3: 5 } }
    const m = ReplicationManager.merge(a, b)
    expect(m.counters.n1).toBe(2)
    expect(m.counters.n2).toBe(3)
    expect(m.counters.n3).toBe(5)
  })
  it('increment', () => {
    const c = { nodeId: 'n1', counters: { n1: 1 } }
    const i = ReplicationManager.increment(c, 'n1')
    expect(i.counters.n1).toBe(2)
  })
})

describe('ReplicationManager - replication', () => {
  let rm: ReplicationManager
  beforeEach(() => { rm = new ReplicationManager('dc-1') })

  it('replicates between DCs', async () => {
    rm.addDc('dc-2', 'us-east')
    rm.set('a', 1, 'dc-1')
    const synced = await rm.replicate('dc-1', 'dc-2')
    expect(synced).toBe(1)
    expect(rm.get('a', 'dc-2')?.value).toBe(1)
  })
  it('throws on missing DC', async () => {
    await expect(rm.replicate('dc-1', 'missing')).rejects.toThrow()
  })
  it('throws on offline DC', async () => {
    rm.addDc('dc-2', 'us-east')
    rm.setDcStatus('dc-2', 'offline')
    await expect(rm.replicate('dc-1', 'dc-2')).rejects.toThrow()
  })
  it('broadcast to all other DCs', async () => {
    rm.addDc('dc-2', 'us-east')
    rm.addDc('dc-3', 'eu-west')
    rm.set('x', 100, 'dc-1')
    const r = await rm.broadcast('dc-1')
    expect(r['dc-2']).toBeGreaterThan(0)
    expect(r['dc-3']).toBeGreaterThan(0)
  })
  it('respects batchSize', async () => {
    rm.addDc('dc-2', 'us-east')
    for (let i = 0; i < 10; i++) rm.set(`k${i}`, i, 'dc-1')
    const synced = await rm.replicate('dc-1', 'dc-2', { batchSize: 3 })
    expect(synced).toBe(3)
  })
})

describe('ReplicationManager - conflict resolution', () => {
  let rm: ReplicationManager
  beforeEach(() => { rm = new ReplicationManager('dc-1') })

  it('LWW picks latest', () => {
    rm.setPolicy('lww')
    const ops = [
      { id: '1', dc: 'a', key: 'k', type: 'set' as const, value: 'old', timestamp: 1, vclock: { nodeId: 'a', counters: { a: 1 } }, origin: 'a' },
      { id: '2', dc: 'b', key: 'k', type: 'set' as const, value: 'new', timestamp: 2, vclock: { nodeId: 'b', counters: { b: 1 } }, origin: 'b' }
    ]
    const r = (rm as unknown as { resolveConflict: (o: typeof ops) => typeof ops[0] }).resolveConflict(ops)
    expect(r.value).toBe('new')
  })
  it('first-write-wins picks earliest', () => {
    rm.setPolicy('first-write-wins')
    const ops = [
      { id: '1', dc: 'a', key: 'k', type: 'set' as const, value: 'old', timestamp: 1, vclock: { nodeId: 'a', counters: { a: 1 } }, origin: 'a' },
      { id: '2', dc: 'b', key: 'k', type: 'set' as const, value: 'new', timestamp: 2, vclock: { nodeId: 'b', counters: { b: 1 } }, origin: 'b' }
    ]
    const r = (rm as unknown as { resolveConflict: (o: typeof ops) => typeof ops[0] }).resolveConflict(ops)
    expect(r.value).toBe('old')
  })
  it('max picks larger numeric', () => {
    rm.setPolicy('max')
    const ops = [
      { id: '1', dc: 'a', key: 'k', type: 'set' as const, value: 5, timestamp: 0, vclock: { nodeId: 'a', counters: {} }, origin: 'a' },
      { id: '2', dc: 'b', key: 'k', type: 'set' as const, value: 10, timestamp: 0, vclock: { nodeId: 'b', counters: {} }, origin: 'b' }
    ]
    const r = (rm as unknown as { resolveConflict: (o: typeof ops) => typeof ops[0] }).resolveConflict(ops)
    expect(r.value).toBe(10)
  })
  it('min picks smaller numeric', () => {
    rm.setPolicy('min')
    const ops = [
      { id: '1', dc: 'a', key: 'k', type: 'set' as const, value: 5, timestamp: 0, vclock: { nodeId: 'a', counters: {} }, origin: 'a' },
      { id: '2', dc: 'b', key: 'k', type: 'set' as const, value: 10, timestamp: 0, vclock: { nodeId: 'b', counters: {} }, origin: 'b' }
    ]
    const r = (rm as unknown as { resolveConflict: (o: typeof ops) => typeof ops[0] }).resolveConflict(ops)
    expect(r.value).toBe(5)
  })
  it('merge combines objects', () => {
    rm.setPolicy('merge')
    const ops = [
      { id: '1', dc: 'a', key: 'k', type: 'set' as const, value: { a: 1 }, timestamp: 0, vclock: { nodeId: 'a', counters: {} }, origin: 'a' },
      { id: '2', dc: 'b', key: 'k', type: 'set' as const, value: { b: 2 }, timestamp: 0, vclock: { nodeId: 'b', counters: {} }, origin: 'b' }
    ]
    const r = (rm as unknown as { resolveConflict: (o: typeof ops) => typeof ops[0] }).resolveConflict(ops)
    expect(r.value).toEqual({ a: 1, b: 2 })
  })
  it('custom resolver', () => {
    rm.setPolicy('custom', (ops) => ops[0]!)
    const ops = [
      { id: '1', dc: 'a', key: 'k', type: 'set' as const, value: 'first', timestamp: 0, vclock: { nodeId: 'a', counters: {} }, origin: 'a' },
      { id: '2', dc: 'b', key: 'k', type: 'set' as const, value: 'second', timestamp: 0, vclock: { nodeId: 'b', counters: {} }, origin: 'b' }
    ]
    const r = (rm as unknown as { resolveConflict: (o: typeof ops) => typeof ops[0] }).resolveConflict(ops)
    expect(r.value).toBe('first')
  })
  it('listConflicts after resolve', () => {
    rm.setPolicy('lww')
    const ops = [
      { id: '1', dc: 'a', key: 'k', type: 'set' as const, value: 'a', timestamp: 1, vclock: { nodeId: 'a', counters: { a: 1 } }, origin: 'a' },
      { id: '2', dc: 'b', key: 'k', type: 'set' as const, value: 'b', timestamp: 2, vclock: { nodeId: 'b', counters: { b: 1 } }, origin: 'b' }
    ]
    ;(rm as unknown as { resolveConflict: (o: typeof ops) => typeof ops[0] }).resolveConflict(ops)
    expect(rm.listConflicts()).toHaveLength(1)
  })
  it('unresolve clears conflicts', () => {
    rm.setPolicy('lww')
    const ops = [
      { id: '1', dc: 'a', key: 'k', type: 'set' as const, value: 'a', timestamp: 1, vclock: { nodeId: 'a', counters: { a: 1 } }, origin: 'a' },
      { id: '2', dc: 'b', key: 'k', type: 'set' as const, value: 'b', timestamp: 2, vclock: { nodeId: 'b', counters: { b: 1 } }, origin: 'b' }
    ]
    ;(rm as unknown as { resolveConflict: (o: typeof ops) => typeof ops[0] }).resolveConflict(ops)
    expect(rm.unresolveConflicts()).toBe(1)
  })
})

describe('ReplicationManager - quorum', () => {
  let rm: ReplicationManager
  beforeEach(() => { rm = new ReplicationManager('dc-1') })

  it('quorumRead returns latest', async () => {
    rm.addDc('dc-2', 'us-east')
    rm.addDc('dc-3', 'eu-west')
    rm.set('k', 'a', 'dc-1')
    await rm.replicate('dc-1', 'dc-2')
    await rm.replicate('dc-1', 'dc-3')
    const r = await rm.quorumRead('k', 2)
    expect(r?.value).toBe('a')
  })
  it('quorumRead null when insufficient', async () => {
    rm.addDc('dc-2', 'us-east')
    rm.addDc('dc-3', 'eu-west')
    rm.setDcStatus('dc-2', 'offline')
    rm.setDcStatus('dc-3', 'offline')
    const r = await rm.quorumRead('k', 2)
    expect(r).toBeNull()
  })
  it('quorumWrite acks min', async () => {
    rm.addDc('dc-2', 'us-east')
    rm.addDc('dc-3', 'eu-west')
    const r = await rm.quorumWrite('k', 'v', 2)
    expect(r.ack).toBe(2)
  })
})

describe('ReplicationManager - anti-entropy', () => {
  let rm: ReplicationManager
  beforeEach(() => { rm = new ReplicationManager('dc-1') })

  it('digest returns hash', () => {
    rm.set('a', 1)
    const d = rm.digest()
    expect(d.count).toBe(1)
    expect(d.hash).toBeTruthy()
  })
  it('digest empty', () => {
    const d = rm.digest()
    expect(d.count).toBe(0)
  })
  it('sync detects missing', async () => {
    rm.addDc('dc-2', 'us-east')
    rm.set('a', 1, 'dc-1')
    rm.set('b', 2, 'dc-2')
    const r = await rm.sync('dc-2', 'dc-1')
    expect(r.missing.length).toBeGreaterThan(0)
  })
})

describe('ReplicationManager - snapshot', () => {
  let rm: ReplicationManager
  beforeEach(() => { rm = new ReplicationManager('dc-1') })

  it('snapshot and load', () => {
    rm.set('a', 1)
    rm.set('b', 2)
    const snap = rm.snapshot()
    expect(snap).toHaveLength(2)
    const rm2 = new ReplicationManager('dc-2')
    rm2.loadSnapshot(snap, 'dc-2')
    expect(rm2.get('a', 'dc-2')?.value).toBe(1)
  })
  it('snapshot empty DC', () => {
    expect(rm.snapshot('dc-1')).toEqual([])
  })
})

describe('ReplicationManager - log', () => {
  let rm: ReplicationManager
  beforeEach(() => { rm = new ReplicationManager('dc-1') })

  it('getLog filters by dc', () => {
    rm.addDc('dc-2', 'us-east')
    rm.set('a', 1, 'dc-1')
    rm.set('b', 2, 'dc-2')
    expect(rm.getLog({ dc: 'dc-1' })).toHaveLength(1)
  })
  it('getLog filters by key', () => {
    rm.set('a', 1)
    rm.set('b', 2)
    expect(rm.getLog({ key: 'a' })).toHaveLength(1)
  })
  it('getLog filters by since', () => {
    rm.set('a', 1)
    const t = Date.now()
    rm.set('b', 2)
    expect(rm.getLog({ since: t }).length).toBeGreaterThanOrEqual(1)
  })
  it('clearLog resets', () => {
    rm.set('a', 1)
    rm.clearLog()
    expect(rm.getLog()).toHaveLength(0)
  })
})

describe('ReplicationManager - metrics', () => {
  let rm: ReplicationManager
  beforeEach(() => { rm = new ReplicationManager('dc-1') })

  it('totalOps tracks', () => {
    rm.set('a', 1)
    rm.set('b', 2)
    expect(rm.getMetrics().totalOps).toBe(2)
  })
  it('byDc tracks', () => {
    rm.addDc('dc-2', 'us-east')
    rm.set('a', 1, 'dc-1')
    rm.set('b', 2, 'dc-2')
    const m = rm.getMetrics()
    expect(m.byDc['dc-1']).toBe(1)
    expect(m.byDc['dc-2']).toBe(1)
  })
  it('resetMetrics preserves log', () => {
    rm.set('a', 1)
    rm.resetMetrics()
    expect(rm.getLog()).toHaveLength(1)
  })
})

describe('ReplicationManager - singleton', () => {
  it('singleton', () => {
    resetReplicationManager()
    const a = getReplicationManager('dc-1')
    const b = getReplicationManager('dc-1')
    expect(a).toBe(b)
  })
})
