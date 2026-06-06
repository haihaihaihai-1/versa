import { describe, it, expect, beforeEach } from 'vitest'
import { GCounter, PNCounter, GSet, TwoPSet, ORSet, LWWRegister, MVRegister, RgaText, CrdtMap, CrdtManager, getCrdtManager, resetCrdtManager } from '../index'

describe('GCounter', () => {
  it('increments', () => {
    const c = new GCounter('r1')
    c.increment()
    c.increment(5)
    expect(c.value()).toBe(6)
  })
  it('merge takes max per replica', () => {
    const a = new GCounter('r1'); a.increment(5)
    const b = new GCounter('r2'); b.increment(3)
    a.merge(b)
    expect(a.value()).toBe(8)
  })
  it('state returns per-replica counts', () => {
    const c = new GCounter('r1')
    c.increment(3)
    expect(c.state()).toEqual({ r1: 3 })
  })
})

describe('PNCounter', () => {
  it('positive + negative', () => {
    const c = new PNCounter('r1')
    c.increment(10)
    c.decrement(3)
    expect(c.value()).toBe(7)
  })
  it('merge', () => {
    const a = new PNCounter('r1'); a.increment(5)
    const b = new PNCounter('r2'); b.increment(2); b.decrement(1)
    a.merge(b)
    expect(a.value()).toBe(6)
  })
})

describe('GSet', () => {
  it('add/has/value', () => {
    const s = new GSet<string>()
    s.add('a'); s.add('b')
    expect(s.has('a')).toBe(true)
    expect(s.size()).toBe(2)
    expect(s.value()).toEqual(['a', 'b'])
  })
  it('merge unions', () => {
    const a = new GSet<string>(); a.add('x')
    const b = new GSet<string>(); b.add('y')
    a.merge(b)
    expect(a.value()).toEqual(['x', 'y'])
  })
})

describe('TwoPSet', () => {
  it('add then remove', () => {
    const s = new TwoPSet<string>()
    s.add('a'); s.remove('a')
    expect(s.has('a')).toBe(false)
  })
  it('add only', () => {
    const s = new TwoPSet<string>()
    s.add('a')
    expect(s.has('a')).toBe(true)
  })
  it('merge', () => {
    const a = new TwoPSet<string>(); a.add('x')
    const b = new TwoPSet<string>(); b.add('y'); b.add('z'); b.remove('y')
    a.merge(b)
    expect(a.value()).toEqual(['x', 'z'])
  })
})

describe('ORSet', () => {
  it('add/remove observed', () => {
    const s = new ORSet<string>('r1')
    s.add('a')
    expect(s.has('a')).toBe(true)
    s.remove('a')
    expect(s.has('a')).toBe(false)
  })
  it('merge retains both adds', () => {
    const a = new ORSet<string>('r1'); a.add('x')
    const b = new ORSet<string>('r2'); b.add('y')
    a.merge(b)
    expect(a.value()).toContain('x')
    expect(a.value()).toContain('y')
  })
  it('size', () => {
    const s = new ORSet<string>('r1')
    s.add('a'); s.add('b')
    expect(s.size()).toBe(2)
  })
})

describe('LWWRegister', () => {
  it('set/get', () => {
    const r = new LWWRegister<string>('r1')
    r.set('hello')
    expect(r.get()).toBe('hello')
  })
  it('merge newer wins', () => {
    const a = new LWWRegister<string>('r1'); a.set('old', 100)
    const b = new LWWRegister<string>('r2'); b.set('new', 200)
    a.merge(b)
    expect(a.get()).toBe('new')
  })
  it('merge tie by replicaId', () => {
    const a = new LWWRegister<string>('r1'); a.set('a', 100)
    const b = new LWWRegister<string>('r2'); b.set('b', 100)
    a.merge(b)
    expect(a.get()).toBe('b')
  })
  it('null when empty', () => {
    const r = new LWWRegister<string>('r1')
    expect(r.get()).toBeNull()
  })
})

describe('MVRegister', () => {
  it('set returns one value', () => {
    const r = new MVRegister<string>('r1')
    r.set('a')
    expect(r.get()).toEqual(['a'])
  })
  it('merge keeps concurrent', () => {
    const a = new MVRegister<string>('r1'); a.set('a', 100)
    const b = new MVRegister<string>('r2'); b.set('b', 100)
    a.merge(b)
    expect(a.get().length).toBe(2)
  })
})

describe('RgaText', () => {
  it('insert + value', () => {
    const t = new RgaText('r1')
    t.insert(0, 'h')
    t.insert(1, 'i')
    expect(t.value()).toBe('hi')
  })
  it('delete', () => {
    const t = new RgaText('r1')
    t.insert(0, 'a'); t.insert(1, 'b')
    t.delete(0)
    expect(t.value()).toBe('b')
  })
  it('length excludes deleted', () => {
    const t = new RgaText('r1')
    t.insert(0, 'a'); t.insert(1, 'b')
    t.delete(0)
    expect(t.length()).toBe(1)
  })
  it('merge two texts', () => {
    const a = new RgaText('r1'); a.insert(0, 'x')
    const b = new RgaText('r2'); b.insert(0, 'y')
    a.merge(b)
    expect(a.value().length).toBe(2)
  })
  it('applyRemote no-op on duplicate', () => {
    const t = new RgaText('r1')
    t.insert(0, 'a')
    const nodes = (t as unknown as { nodes: { id: string; char: string; deleted: boolean; origin: string }[] }).nodes
    t.applyRemote(nodes[0]!, null)
    expect(t.value()).toBe('a')
  })
})

describe('CrdtMap', () => {
  it('set/get', () => {
    const m = new CrdtMap('r1')
    m.set('a', 1)
    expect(m.get<number>('a')).toBe(1)
  })
  it('has/keys/size', () => {
    const m = new CrdtMap('r1')
    m.set('a', 1); m.set('b', 2)
    expect(m.has('a')).toBe(true)
    expect(m.keys_()).toEqual(['a', 'b'])
    expect(m.size()).toBe(2)
  })
  it('delete', () => {
    const m = new CrdtMap('r1')
    m.set('a', 1); m.delete('a')
    expect(m.has('a')).toBe(false)
  })
  it('merge with newer value wins', () => {
    const a = new CrdtMap('r1'); a.set('x', 'old')
    const b = new CrdtMap('r2'); b.set('x', 'new')
    a.merge(b)
    expect(a.get<string>('x')).toBe('new')
  })
  it('state', () => {
    const m = new CrdtMap('r1')
    m.set('a', 1); m.set('b', 2)
    expect(m.state()).toEqual({ a: 1, b: 2 })
  })
})

describe('CrdtManager - documents', () => {
  let m: CrdtManager
  beforeEach(() => { m = new CrdtManager('r1') })

  it('creates doc', () => {
    const d = m.createDoc('d1', 'Doc 1')
    expect(d.id).toBe('d1')
  })
  it('getDoc and list', () => {
    m.createDoc('d1', 'A'); m.createDoc('d2', 'B')
    expect(m.listDocs()).toHaveLength(2)
    expect(m.getDoc('d1')?.title).toBe('A')
  })
  it('deleteDoc', () => {
    m.createDoc('d1', 'A')
    expect(m.deleteDoc('d1')).toBe(true)
  })
  it('text insert/delete/get', () => {
    m.createDoc('d1', 'A')
    m.textInsert('d1', 0, 'h')
    m.textInsert('d1', 1, 'i')
    expect(m.getText('d1')).toBe('hi')
    m.textDelete('d1', 0)
    expect(m.getText('d1')).toBe('i')
  })
  it('set add/remove', () => {
    m.createDoc('d1', 'A')
    m.setAdd('d1', 'apple')
    expect(m.getSet('d1')).toContain('apple')
    m.setRemove('d1', 'apple')
    expect(m.getSet('d1')).not.toContain('apple')
  })
  it('map operations', () => {
    m.createDoc('d1', 'A')
    m.mapSet('d1', 'color', 'red')
    expect(m.mapGet<string>('d1', 'color')).toBe('red')
    m.mapDelete('d1', 'color')
    expect(m.mapGet('d1', 'color')).toBeNull()
  })
})

describe('CrdtManager - peers', () => {
  let m: CrdtManager
  beforeEach(() => { m = new CrdtManager('r1') })

  it('register and list', () => {
    m.registerPeer({ id: 'p1', name: 'Alice', online: true, lastSeen: Date.now() })
    expect(m.listPeers()).toHaveLength(1)
  })
  it('set online', () => {
    m.registerPeer({ id: 'p1', name: 'A', online: false, lastSeen: 0 })
    m.setPeerOnline('p1', true)
    expect(m.listPeers()[0]?.online).toBe(true)
  })
  it('set cursor', () => {
    m.registerPeer({ id: 'p1', name: 'A', online: true, lastSeen: Date.now() })
    m.setCursor('p1', 'd1', 5)
    expect(m.listPeers()[0]?.cursor).toEqual({ docId: 'd1', position: 5 })
  })
  it('onlinePeers', () => {
    m.registerPeer({ id: 'p1', name: 'A', online: true, lastSeen: 0 })
    m.registerPeer({ id: 'p2', name: 'B', online: false, lastSeen: 0 })
    expect(m.onlinePeers()).toHaveLength(1)
  })
  it('removePeer', () => {
    m.registerPeer({ id: 'p1', name: 'A', online: true, lastSeen: 0 })
    expect(m.removePeer('p1')).toBe(true)
  })
})

describe('CrdtManager - sync', () => {
  it('syncs doc between two managers', () => {
    const a = new CrdtManager('r1')
    const b = new CrdtManager('r2')
    a.createDoc('d1', 'A')
    b.createDoc('d1', 'A')
    a.textInsert('d1', 0, 'x')
    const delta = a.sync(b, 'd1')
    expect(delta.from).toBe('r1')
    expect(delta.to).toBe('r2')
    expect(b.getText('d1')).toBe('x')
  })
  it('throws if doc missing locally', () => {
    const a = new CrdtManager('r1')
    const b = new CrdtManager('r2')
    b.createDoc('d1', 'A')
    expect(() => a.sync(b, 'd1')).toThrow()
  })
  it('throws if doc missing on remote', () => {
    const a = new CrdtManager('r1')
    const b = new CrdtManager('r2')
    a.createDoc('d1', 'A')
    expect(() => a.sync(b, 'd1')).toThrow()
  })
  it('mergeDocs', () => {
    const m1 = new CrdtManager('r1')
    const m2 = new CrdtManager('r2')
    const a = m1.createDoc('d1', 'A')
    const b = m2.createDoc('d1', 'A')
    a.text.insert(0, 'x')
    b.text.insert(0, 'y')
    m1.mergeDocs(a, b)
    expect(a.text.value()).toContain('x')
    expect(a.text.value()).toContain('y')
  })
})

describe('CrdtManager - metrics', () => {
  it('tracks totalOps', () => {
    const m = new CrdtManager('r1')
    m.createDoc('d1', 'A')
    m.textInsert('d1', 0, 'a')
    m.setAdd('d1', 'x')
    m.mapSet('d1', 'k', 1)
    expect(m.getMetrics().totalOps).toBe(3)
  })
  it('resetMetrics', () => {
    const m = new CrdtManager('r1')
    m.createDoc('d1', 'A')
    m.textInsert('d1', 0, 'a')
    m.resetMetrics()
    expect(m.getMetrics().totalOps).toBe(0)
  })
})

describe('CrdtManager - singleton', () => {
  it('singleton', () => {
    resetCrdtManager()
    expect(getCrdtManager()).toBe(getCrdtManager())
  })
})
