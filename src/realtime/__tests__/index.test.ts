import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RealtimeManager, type Message } from '../index'

describe('RealtimeManager · connections', () => {
  let rm: RealtimeManager
  beforeEach(() => { rm = new RealtimeManager() })
  it('connect + getConnection + isConnected', () => {
    const c = rm.connect({ userId: 'u1' })
    expect(rm.getConnection(c.id)?.userId).toBe('u1')
    expect(rm.isConnected(c.id)).toBe(true)
  })
  it('disconnect', () => {
    const c = rm.connect()
    rm.disconnect(c.id)
    expect(rm.isConnected(c.id)).toBe(false)
    expect(rm.countConnections()).toBe(0)
  })
  it('listConnections + countConnections', () => {
    rm.connect()
    rm.connect()
    expect(rm.listConnections().length).toBe(2)
    expect(rm.countConnections()).toBe(2)
  })
  it('getConnection returns undefined for unknown', () => {
    expect(rm.getConnection('nope')).toBeUndefined()
  })
  it('disconnect unknown is noop', () => {
    expect(() => rm.disconnect('nope')).not.toThrow()
  })
})

describe('RealtimeManager · heartbeat', () => {
  let rm: RealtimeManager
  beforeEach(() => { rm = new RealtimeManager() })
  it('ping updates lastSeen', async () => {
    const c = rm.connect()
    await new Promise(r => setTimeout(r, 5))
    expect(rm.ping(c.id)).toBe(true)
  })
  it('ping unknown returns false', () => {
    expect(rm.ping('nope')).toBe(false)
  })
  it('heartbeat removes stale', async () => {
    rm.setHeartbeatMs(20)
    const c = rm.connect()
    await new Promise(r => setTimeout(r, 60))
    rm.startHeartbeat(10)
    await new Promise(r => setTimeout(r, 50))
    rm.stopHeartbeat()
    expect(rm.isConnected(c.id)).toBe(false)
  })
  it('stopHeartbeat is idempotent', () => {
    rm.stopHeartbeat()
    rm.stopHeartbeat()
  })
})

describe('RealtimeManager · rooms + channels', () => {
  let rm: RealtimeManager
  beforeEach(() => { rm = new RealtimeManager() })
  it('createRoom + getRoom + listRooms', () => {
    rm.createRoom('r1', { private: true })
    expect(rm.getRoom('r1')?.privateRoom).toBe(true)
    expect(rm.listRooms().length).toBe(1)
  })
  it('createRoom returns existing', () => {
    rm.createRoom('r1')
    rm.createRoom('r1')
    expect(rm.listRooms().length).toBe(1)
  })
  it('destroyRoom', () => {
    rm.createRoom('r1')
    expect(rm.destroyRoom('r1')).toBe(true)
    expect(rm.destroyRoom('r1')).toBe(false)
  })
  it('join + leave', () => {
    const c = rm.connect()
    expect(rm.join(c.id, 'ch1')).toBe(true)
    expect(rm.leave(c.id, 'ch1')).toBe(true)
  })
  it('join creates room if missing', () => {
    const c = rm.connect()
    rm.join(c.id, 'auto')
    expect(rm.getRoom('auto')).toBeDefined()
  })
  it('join unknown conn', () => {
    expect(rm.join('nope', 'ch1')).toBe(false)
  })
  it('join same channel twice', () => {
    const c = rm.connect()
    rm.join(c.id, 'ch1')
    expect(rm.join(c.id, 'ch1')).toBe(false)
  })
  it('leave unknown conn / channel', () => {
    const c = rm.connect()
    expect(rm.leave('nope', 'x')).toBe(false)
    expect(rm.leave(c.id, 'x')).toBe(false)
  })
  it('listChannels + membersOf + channelCount', () => {
    const a = rm.connect()
    const b = rm.connect()
    rm.join(a.id, 'x')
    rm.join(b.id, 'x')
    expect(rm.listChannels()).toContain('x')
    expect(rm.membersOf('x').length).toBe(2)
    expect(rm.channelCount()).toBe(1)
  })
  it('disconnect leaves all channels', () => {
    const c = rm.connect()
    rm.join(c.id, 'a')
    rm.join(c.id, 'b')
    rm.disconnect(c.id)
    expect(rm.channelCount()).toBe(0)
  })
})

describe('RealtimeManager · publish + direct + buffer', () => {
  let rm: RealtimeManager
  beforeEach(() => { rm = new RealtimeManager() })
  it('publish to room', () => {
    const a = rm.connect()
    const b = rm.connect()
    rm.join(a.id, 'news')
    rm.join(b.id, 'news')
    const n = rm.publish('news', 'msg', { x: 1 })
    expect(n).toBe(2)
  })
  it('publish to non-existent room returns 0', () => {
    expect(rm.publish('nope', 'msg', {})).toBe(0)
  })
  it('sendDirect', () => {
    const a = rm.connect()
    expect(rm.sendDirect(a.id, 'e', { x: 1 })).toBe(true)
    expect(rm.bufferSize(a.id)).toBe(1)
  })
  it('sendDirect unknown', () => {
    expect(rm.sendDirect('nope', 'e', {})).toBe(false)
  })
  it('readBuffer + drain', () => {
    const a = rm.connect()
    rm.sendDirect(a.id, 'e', { x: 1 })
    rm.sendDirect(a.id, 'e', { x: 2 })
    expect(rm.readBuffer(a.id).length).toBe(2)
    expect(rm.readBuffer(a.id, true).length).toBe(2)
    expect(rm.bufferSize(a.id)).toBe(0)
  })
  it('readBuffer unknown', () => {
    expect(rm.readBuffer('nope').length).toBe(0)
  })
  it('buffer overflow drops oldest', () => {
    rm.setMaxBufferSize(3)
    const a = rm.connect()
    rm.sendDirect(a.id, 'e', 1)
    rm.sendDirect(a.id, 'e', 2)
    rm.sendDirect(a.id, 'e', 3)
    rm.sendDirect(a.id, 'e', 4)
    expect(rm.bufferSize(a.id)).toBe(3)
    const buf = rm.readBuffer(a.id)
    expect((buf[0].data as number)).toBe(2)
  })
})

describe('RealtimeManager · presence', () => {
  let rm: RealtimeManager
  beforeEach(() => { rm = new RealtimeManager() })
  it('connect creates presence', () => {
    const c = rm.connect({ userId: 'u1' })
    expect(rm.getPresence(c.id)?.userId).toBe('u1')
  })
  it('setPresence + listPresence', () => {
    const c = rm.connect({ userId: 'u1' })
    rm.setPresence(c.id, 'away', { device: 'mobile' })
    expect(rm.getPresence(c.id)?.status).toBe('away')
    expect(rm.listPresence().length).toBe(1)
  })
  it('presenceByUser', () => {
    const a = rm.connect({ userId: 'u1' })
    rm.connect({ userId: 'u1' })
    rm.connect({ userId: 'u2' })
    expect(rm.presenceByUser('u1').length).toBe(2)
    void a
  })
  it('countOnline', () => {
    rm.connect({ userId: 'u1' })
    rm.connect({ userId: 'u2' })
    expect(rm.countOnline()).toBe(2)
  })
  it('getPresence unknown', () => {
    expect(rm.getPresence('nope')).toBeUndefined()
  })
})

describe('RealtimeManager · routing', () => {
  let rm: RealtimeManager
  beforeEach(() => { rm = new RealtimeManager() })
  it('route by exact pattern', () => {
    const fn = vi.fn()
    rm.route('news:item', fn)
    const a = rm.connect()
    rm.join(a.id, 'news')
    rm.ingest(a.id, 'item', { x: 1 })
    expect(fn).toHaveBeenCalled()
  })
  it('route by wildcard', () => {
    const fn = vi.fn()
    rm.route('news:*', fn)
    const a = rm.connect()
    rm.join(a.id, 'news')
    rm.ingest(a.id, 'item', {})
    rm.ingest(a.id, 'feed', {})
    expect(fn).toHaveBeenCalledTimes(2)
  })
  it('route with required scopes', () => {
    const fn = vi.fn()
    rm.route('news:item', fn, { requiresScopes: ['news:write'] })
    const a = rm.connect({ scopes: ['news:read'] })
    rm.join(a.id, 'news')
    rm.ingest(a.id, 'item', {})
    expect(fn).not.toHaveBeenCalled()
    const b = rm.connect({ scopes: ['news:write'] })
    rm.join(b.id, 'news')
    rm.ingest(b.id, 'item', {})
    expect(fn).toHaveBeenCalledTimes(1)
  })
  it('route with rate limit', () => {
    const fn = vi.fn()
    rm.route('r:e', fn, { rateLimit: 2 })
    const a = rm.connect()
    rm.join(a.id, 'r')
    rm.ingest(a.id, 'e', 1)
    rm.ingest(a.id, 'e', 2)
    rm.ingest(a.id, 'e', 3)
    rm.ingest(a.id, 'e', 4)
    expect(fn.mock.calls.length).toBeLessThan(4)
  })
  it('unroute + listRoutes', () => {
    rm.route('a', () => {})
    rm.route('b', () => {})
    expect(rm.listRoutes().length).toBe(2)
    expect(rm.unroute('a')).toBe(1)
  })
})

describe('RealtimeManager · hooks', () => {
  it('onConnect / onDisconnect / onMessage / onJoin / onLeave', () => {
    const rm = new RealtimeManager()
    const events: string[] = []
    rm.onConnect(() => events.push('c'))
    rm.onDisconnect(() => events.push('d'))
    rm.onJoin(() => events.push('j'))
    rm.onLeave(() => events.push('l'))
    rm.onMessage(() => events.push('m'))
    const a = rm.connect()
    rm.join(a.id, 'x')
    rm.ingest(a.id, 'e', {})
    rm.leave(a.id, 'x')
    rm.disconnect(a.id)
    expect(events).toContain('c')
    expect(events).toContain('j')
    expect(events).toContain('m')
    expect(events).toContain('l')
    expect(events).toContain('d')
  })
  it('hook errors are swallowed', () => {
    const rm = new RealtimeManager()
    rm.onConnect(() => { throw new Error('x') })
    expect(() => rm.connect()).not.toThrow()
  })
})

describe('RealtimeManager · ingest + metrics', () => {
  let rm: RealtimeManager
  beforeEach(() => { rm = new RealtimeManager() })
  it('ingest for unknown conn', () => {
    expect(rm.ingest('nope', 'e', {})).toBe(0)
  })
  it('ingest with no channel uses direct', () => {
    const a = rm.connect()
    expect(rm.ingest(a.id, 'e', {})).toBe(1)
    expect(rm.bufferSize(a.id)).toBe(1)
  })
  it('ingest with channel + runRoutes', () => {
    const a = rm.connect()
    rm.join(a.id, 'ch')
    const fn = vi.fn()
    rm.route('ch:e', fn)
    rm.ingest(a.id, 'e', {})
    expect(fn).toHaveBeenCalled()
  })
  it('metrics', () => {
    const a = rm.connect()
    rm.join(a.id, 'ch')
    rm.publish('ch', 'msg', { x: 1 })
    const m = rm.getMetrics()
    expect(m.totalMessages).toBeGreaterThan(0)
    expect(m.byEvent.msg).toBe(1)
  })
  it('resetMetrics', () => {
    rm.resetMetrics()
    expect(rm.getMetrics().totalMessages).toBe(0)
  })
  it('sendDirectWithRetry', async () => {
    const a = rm.connect()
    expect(await rm.sendDirectWithRetry(a.id, 'e', {})).toBe(true)
  })
})

describe('RealtimeManager · singleton', () => {
  it('getRealtimeManager / reset', async () => {
    const m = await import('../index')
    const a = m.getRealtimeManager()
    const b = m.getRealtimeManager()
    expect(a).toBe(b)
    m.resetRealtimeManager()
    const c = m.getRealtimeManager()
    expect(c).not.toBe(a)
  })
})
