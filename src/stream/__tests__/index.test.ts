import { describe, it, expect, beforeEach } from 'vitest'
import { StreamEngine } from '../index'

describe('StreamEngine - topics', () => {
  let s: StreamEngine
  beforeEach(() => { s = new StreamEngine() })

  it('create and list', () => {
    s.createTopic({ name: 't1', partitions: 3, cleanupPolicy: 'delete' })
    expect(s.listTopics()).toHaveLength(1)
    expect(s.topicExists('t1')).toBe(true)
  })

  it('create duplicate throws', () => {
    s.createTopic({ name: 't1', partitions: 1, cleanupPolicy: 'delete' })
    expect(() => s.createTopic({ name: 't1', partitions: 1, cleanupPolicy: 'delete' })).toThrow()
  })

  it('partitions must be >= 1', () => {
    expect(() => s.createTopic({ name: 't1', partitions: 0, cleanupPolicy: 'delete' })).toThrow()
  })

  it('delete topic', () => {
    s.createTopic({ name: 't1', partitions: 2, cleanupPolicy: 'delete' })
    s.deleteTopic('t1')
    expect(s.topicExists('t1')).toBe(false)
  })

  it('delete missing topic throws', () => {
    expect(() => s.deleteTopic('nope')).toThrow()
  })
})

describe('StreamEngine - produce / consume', () => {
  let s: StreamEngine
  beforeEach(() => { s = new StreamEngine(); s.createTopic({ name: 't', partitions: 3, cleanupPolicy: 'delete' }) })

  it('produce assigns partition by key hash', () => {
    const m1 = s.produce('t', 'key1', 'v1')
    const m2 = s.produce('t', 'key1', 'v2')
    expect(m1.partition).toBe(m2.partition)
    expect(m1.offset).toBe(0)
    expect(m2.offset).toBe(1)
  })

  it('same key always same partition', () => {
    const ps = new Set<number>()
    for (let i = 0; i < 20; i++) ps.add(s.produce('t', 'stable', i).partition)
    expect(ps.size).toBe(1)
  })

  it('null key distributes randomly', () => {
    const ps = new Set<number>()
    for (let i = 0; i < 30; i++) ps.add(s.produce('t', null, i).partition)
    expect(ps.size).toBeGreaterThan(1)
  })

  it('fetch returns messages from offset', () => {
    s.produce('t', 'k', 'a')
    s.produce('t', 'k', 'b')
    s.produce('t', 'k', 'c')
    const partition = s.produce('t', 'k', 'd').partition
    const msgs = s.fetch('t', partition, 0, 10)
    expect(msgs.map(m => m.value)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('fetch respects max', () => {
    for (let i = 0; i < 10; i++) s.produce('t', 'k', i)
    const p = s.produce('t', 'k', 'x').partition
    expect(s.fetch('t', p, 0, 3)).toHaveLength(3)
  })

  it('endOffset tracks log length', () => {
    for (let i = 0; i < 5; i++) s.produce('t', 'k', i)
    const p = s.produce('t', 'k', 'x').partition
    expect(s.endOffset('t', p)).toBe(6)
  })

  it('produce increments metrics', () => {
    s.produce('t', 'k', 1)
    s.produce('t', 'k', 2)
    expect(s.getMetrics().produced).toBe(2)
  })

  it('fetch from missing partition throws', () => {
    s.createTopic({ name: 'other', partitions: 1, cleanupPolicy: 'delete' })
    expect(() => s.fetch('other', 5, 0)).toThrow()
  })

  it('endOffset for missing partition returns 0', () => {
    s.createTopic({ name: 'other', partitions: 1, cleanupPolicy: 'delete' })
    expect(s.endOffset('other', 99)).toBe(0)
  })
})

describe('StreamEngine - consumer groups', () => {
  let s: StreamEngine
  beforeEach(() => { s = new StreamEngine(); s.createTopic({ name: 't', partitions: 6, cleanupPolicy: 'delete' }) })

  it('createGroup assigns partitions evenly', () => {
    const g = s.createGroup('g1', 't', ['a', 'b', 'c'])
    expect(g.generation).toBe(1)
    expect(g.leader).toBe('a')
    // round-robin: 6 partitions / 3 members = 2 each
    expect(g.members.get('a')!.assignedPartitions).toEqual([0, 3])
    expect(g.members.get('b')!.assignedPartitions).toEqual([1, 4])
    expect(g.members.get('c')!.assignedPartitions).toEqual([2, 5])
  })

  it('empty members throws', () => {
    expect(() => s.createGroup('g1', 't', [])).toThrow(/No members/)
  })

  it('topic not found throws', () => {
    expect(() => s.createGroup('g1', 'missing', ['a'])).toThrow(/Topic/)
  })

  it('joinGroup adds new member and rebalances', () => {
    s.createGroup('g1', 't', ['a', 'b'])
    const assigned = s.joinGroup('g1', 't', 'c')
    const g = s.getGroup('g1', 't')!
    expect(g.members.size).toBe(3)
    expect(g.generation).toBe(2)
    // round-robin with 6 partitions across 3 members: a=[0,3], b=[1,4], c=[2,5]
    expect(assigned).toEqual([2, 5])
  })

  it('joinGroup existing member returns current assignment', () => {
    s.createGroup('g1', 't', ['a', 'b'])
    const a = s.joinGroup('g1', 't', 'a')
    // round-robin: 6 partitions / 2 members = 3 each
    expect(a).toEqual([0, 2, 4])
  })

  it('leaveGroup removes member and rebalances', () => {
    s.createGroup('g1', 't', ['a', 'b', 'c'])
    s.leaveGroup('g1', 't', 'c')
    const g = s.getGroup('g1', 't')!
    expect(g.members.size).toBe(2)
    expect(g.generation).toBe(2)
  })

  it('leaveGroup last member deletes group', () => {
    s.createGroup('g1', 't', ['a'])
    s.leaveGroup('g1', 't', 'a')
    expect(s.getGroup('g1', 't')).toBeNull()
  })

  it('leaveGroup promotes new leader', () => {
    s.createGroup('g1', 't', ['a', 'b', 'c'])
    s.leaveGroup('g1', 't', 'a')
    expect(s.getGroup('g1', 't')!.leader).toBe('b')
  })

  it('heartbeat updates timestamp', () => {
    s.createGroup('g1', 't', ['a', 'b'])
    const before = s.getGroup('g1', 't')!.members.get('a')!.lastHeartbeat
    return new Promise<void>(resolve => setTimeout(() => {
      s.heartbeat('g1', 't', 'a')
      const after = s.getGroup('g1', 't')!.members.get('a')!.lastHeartbeat
      expect(after).toBeGreaterThan(before)
      resolve()
    }, 10))
  })

  it('commitOffset and fetchOffset', () => {
    s.createGroup('g1', 't', ['a'])
    s.commitOffset('g1', 't', 0, 42)
    expect(s.fetchOffset('g1', 't', 0)).toBe(42)
  })

  it('fetchOffset default 0', () => {
    s.createGroup('g1', 't', ['a'])
    expect(s.fetchOffset('g1', 't', 0)).toBe(0)
  })

  it('commitOffset increments metric', () => {
    s.createGroup('g1', 't', ['a'])
    s.commitOffset('g1', 't', 0, 1)
    s.commitOffset('g1', 't', 1, 2)
    expect(s.getMetrics().commits).toBe(2)
  })
})

describe('StreamEngine - windowing', () => {
  let s: StreamEngine
  beforeEach(() => {
    s = new StreamEngine()
    s.createTopic({ name: 't', partitions: 1, cleanupPolicy: 'delete' })
  })

  it('window aggregates by time bucket', () => {
    s.produce('t', 'k', 10)
    s.produce('t', 'k', 20)
    s.produce('t', 'k', 30)
    const p = 0
    const windows = s.window('t', p, 60_000, nums => ({
      sum: nums.reduce((a, b) => a + b, 0),
      avg: nums.reduce((a, b) => a + b, 0) / nums.length,
      min: Math.min(...nums),
      max: Math.max(...nums),
    }))
    expect(windows).toHaveLength(1)
    expect(windows[0].sum).toBe(60)
    expect(windows[0].avg).toBe(20)
    expect(windows[0].min).toBe(10)
    expect(windows[0].max).toBe(30)
  })

  it('window with no messages returns empty', () => {
    const windows = s.window('t', 0, 60_000, () => ({ sum: 0, avg: 0, min: 0, max: 0 }))
    expect(windows).toHaveLength(0)
  })

  it('window skips non-numeric values', () => {
    s.produce('t', 'k', 10)
    s.produce('t', 'k', 'oops')
    s.produce('t', 'k', 20)
    const windows = s.window('t', 0, 60_000, nums => ({
      sum: nums.reduce((a, b) => a + b, 0),
      avg: nums.reduce((a, b) => a + b, 0) / nums.length,
      min: Math.min(...nums),
      max: Math.max(...nums),
    }))
    expect(windows[0].sum).toBe(30)
    expect(windows[0].count).toBe(2)
  })
})

describe('StreamEngine - transforms', () => {
  let s: StreamEngine
  beforeEach(() => {
    s = new StreamEngine()
    s.createTopic({ name: 't', partitions: 1, cleanupPolicy: 'delete' })
    for (let i = 0; i < 5; i++) s.produce('t', 'k', i)
  })

  it('map transforms values', () => {
    const out = s.map('t', 0, m => (m.value as number) * 2)
    expect(out).toEqual([0, 2, 4, 6, 8])
  })

  it('filter keeps matching', () => {
    const out = s.filter('t', 0, m => (m.value as number) % 2 === 0)
    expect(out.map(m => m.value)).toEqual([0, 2, 4])
  })

  it('reduce aggregates', () => {
    const sum = s.reduce('t', 0, (acc, m) => acc + (m.value as number), 0)
    expect(sum).toBe(10)
  })
})

describe('StreamEngine - retention', () => {
  it('maxMessagesPerPartition caps log size', () => {
    const s = new StreamEngine()
    s.createTopic({ name: 't', partitions: 1, cleanupPolicy: 'delete', maxMessagesPerPartition: 3 })
    for (let i = 0; i < 10; i++) s.produce('t', 'k', i)
    expect(s.endOffset('t', 0)).toBe(3)
  })
})

describe('StreamEngine - metrics', () => {
  it('rebalances metric', () => {
    const s = new StreamEngine()
    s.createTopic({ name: 't', partitions: 1, cleanupPolicy: 'delete' })
    s.createGroup('g', 't', ['a', 'b'])
    s.joinGroup('g', 't', 'c')
    s.leaveGroup('g', 't', 'a')
    expect(s.getMetrics().rebalances).toBeGreaterThanOrEqual(3)
  })
})
