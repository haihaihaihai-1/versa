import { describe, it, expect, vi } from 'vitest'
import { WebSocketGateway, getGateway, resetGateway } from '../index'

describe('WebSocketGateway', () => {
  describe('connection lifecycle', () => {
    it('connects a client', () => {
      const g = new WebSocketGateway()
      const c = g.connect({ userId: 'u1' })
      expect(c.id).toMatch(/^conn_/)
      expect(c.state).toBe('open')
      expect(c.userId).toBe('u1')
      expect(g.listConnections()).toHaveLength(1)
    })

    it('disconnects a client', () => {
      const g = new WebSocketGateway()
      const c = g.connect()
      expect(g.disconnect(c.id)).toBe(true)
      expect(g.getConnection(c.id)).toBeUndefined()
    })

    it('enforces max connections', () => {
      const g = new WebSocketGateway({ maxConnections: 2 })
      g.connect()
      g.connect()
      expect(() => g.connect()).toThrow()
    })

    it('listens to onConnect / onDisconnect', () => {
      const onConnect = vi.fn()
      const onDisconnect = vi.fn()
      const g = new WebSocketGateway({ onConnect, onDisconnect })
      const c = g.connect()
      expect(onConnect).toHaveBeenCalled()
      g.disconnect(c.id)
      expect(onDisconnect).toHaveBeenCalled()
    })

    it('filters connections by userId', () => {
      const g = new WebSocketGateway()
      g.connect({ userId: 'u1' })
      g.connect({ userId: 'u2' })
      g.connect({ userId: 'u1' })
      expect(g.listConnections({ userId: 'u1' })).toHaveLength(2)
    })
  })

  describe('rooms', () => {
    it('creates a room', () => {
      const g = new WebSocketGateway()
      const r = g.createRoom({ name: 'general' })
      expect(r.id).toMatch(/^room_/)
      expect(r.members.size).toBe(0)
    })

    it('joins and leaves room', () => {
      const g = new WebSocketGateway()
      const c = g.connect()
      const r = g.createRoom({ name: 'r' })
      expect(g.joinRoom(c.id, r.id)).toBe(true)
      expect(r.members.size).toBe(1)
      expect(g.leaveRoom(c.id, r.id)).toBe(true)
      expect(r.members.size).toBe(0)
    })

    it('enforces max members', () => {
      const g = new WebSocketGateway()
      const c1 = g.connect()
      const c2 = g.connect()
      const c3 = g.connect()
      const r = g.createRoom({ name: 'r', maxMembers: 2 })
      g.joinRoom(c1.id, r.id)
      g.joinRoom(c2.id, r.id)
      expect(g.joinRoom(c3.id, r.id)).toBe(false)
    })

    it('disconnect removes from all rooms', () => {
      const g = new WebSocketGateway()
      const c = g.connect()
      const r1 = g.createRoom({ name: 'r1' })
      const r2 = g.createRoom({ name: 'r2' })
      g.joinRoom(c.id, r1.id)
      g.joinRoom(c.id, r2.id)
      g.disconnect(c.id)
      expect(r1.members.size).toBe(0)
      expect(r2.members.size).toBe(0)
    })

    it('gets room members', () => {
      const g = new WebSocketGateway()
      const c1 = g.connect()
      const c2 = g.connect()
      const r = g.createRoom({ name: 'r' })
      g.joinRoom(c1.id, r.id)
      g.joinRoom(c2.id, r.id)
      const members = g.getRoomMembers(r.id)
      expect(members).toHaveLength(2)
    })

    it('deletes room', () => {
      const g = new WebSocketGateway()
      const r = g.createRoom({ name: 'r' })
      expect(g.deleteRoom(r.id)).toBe(true)
      expect(g.getRoom(r.id)).toBeUndefined()
    })
  })

  describe('channels', () => {
    it('creates a channel', () => {
      const g = new WebSocketGateway()
      const c = g.createChannel({ name: 'news', topic: 'general-news' })
      expect(c.id).toMatch(/^chan_/)
      expect(c.messageCount).toBe(0)
    })

    it('subscribes and unsubscribes', () => {
      const g = new WebSocketGateway()
      const conn = g.connect()
      const c = g.createChannel({ name: 'n', topic: 't' })
      g.subscribe(conn.id, c.id)
      expect(c.subscribers.size).toBe(1)
      g.unsubscribe(conn.id, c.id)
      expect(c.subscribers.size).toBe(0)
    })

    it('broadcasts to channel', () => {
      const g = new WebSocketGateway()
      const c1 = g.connect()
      const c2 = g.connect()
      const chan = g.createChannel({ name: 'n', topic: 't' })
      g.subscribe(c1.id, chan.id)
      g.subscribe(c2.id, chan.id)
      const msgs = g.broadcastChannel(chan.id, { news: 'hello' })
      expect(msgs).toHaveLength(2)
      expect(chan.messageCount).toBe(1)
    })
  })

  describe('messaging', () => {
    it('sends a message', () => {
      const g = new WebSocketGateway()
      const c = g.connect()
      const m = g.send(c.id, { msg: 'hi' })
      expect(m?.status).toBe('delivered')
      expect(c.messagesSent).toBe(1)
    })

    it('receive message fires onMessage', () => {
      const onMessage = vi.fn()
      const g = new WebSocketGateway({ onMessage })
      const c = g.connect()
      g.receive(c.id, 'hello')
      expect(onMessage).toHaveBeenCalled()
    })

    it('rejects oversized message', () => {
      const onError = vi.fn()
      const g = new WebSocketGateway({ maxMessageSize: 10, onError })
      const c = g.connect()
      const m = g.send(c.id, { big: 'x'.repeat(100) })
      expect(m).toBeNull()
      expect(onError).toHaveBeenCalled()
    })

    it('rejects send to closed connection', () => {
      const g = new WebSocketGateway()
      const c = g.connect()
      g.disconnect(c.id)
      expect(g.send(c.id, 'hi')).toBeNull()
    })

    it('broadcasts to room', () => {
      const g = new WebSocketGateway()
      const c1 = g.connect()
      const c2 = g.connect()
      const r = g.createRoom({ name: 'r' })
      g.joinRoom(c1.id, r.id)
      g.joinRoom(c2.id, r.id)
      const msgs = g.broadcastRoom(r.id, { msg: 'hi' })
      expect(msgs).toHaveLength(2)
    })

    it('direct message', () => {
      const g = new WebSocketGateway()
      const c1 = g.connect()
      const c2 = g.connect()
      const m = g.direct(c2.id, { msg: 'hi' }, { fromConnectionId: c1.id })
      expect(m?.connectionId).toBe(c2.id)
    })
  })

  describe('rate limiting', () => {
    it('limits per second', () => {
      const g = new WebSocketGateway({ rateLimitPerSec: 2 })
      const c = g.connect()
      expect(g.send(c.id, 'a')?.id).toBeTruthy()
      expect(g.send(c.id, 'b')?.id).toBeTruthy()
      expect(g.send(c.id, 'c')).toBeNull()
    })

    it('per-connection custom rate limit', () => {
      const g = new WebSocketGateway({ rateLimitPerSec: 100 })
      const c = g.connect()
      g.setRateLimit(c.id, 1)
      expect(g.send(c.id, 'a')?.id).toBeTruthy()
      expect(g.send(c.id, 'b')).toBeNull()
    })
  })

  describe('heartbeat', () => {
    it('disconnects after max missed pings', () => {
      const g = new WebSocketGateway({ heartbeat: { intervalMs: 100, timeoutMs: 50, maxMissed: 1 } })
      const c = g.connect()
      g.disconnect(c.id)
      const result = g.heartbeatTick()
      expect(result.dead).toHaveLength(0)
    })

    it('pings and updates lastPing', () => {
      const g = new WebSocketGateway()
      const c = g.connect()
      const before = c.lastPing
      // Wait a moment
      const after = Date.now()
      g.ping(c.id)
      expect(c.lastPing).toBeGreaterThanOrEqual(before)
    })
  })

  describe('presence', () => {
    it('getPresence', () => {
      const g = new WebSocketGateway()
      const c = g.connect({ userId: 'u1' })
      const r = g.createRoom({ name: 'r' })
      g.joinRoom(c.id, r.id)
      const p = g.getPresence(c.id)
      expect(p?.rooms).toContain(r.id)
    })

    it('isOnline / listOnlineUsers', () => {
      const g = new WebSocketGateway()
      g.connect({ userId: 'u1' })
      g.connect({ userId: 'u2' })
      g.connect({ userId: 'u1' })
      expect(g.isOnline('u1')).toBe(true)
      expect(g.listOnlineUsers().sort()).toEqual(['u1', 'u2'])
    })
  })

  describe('messages query', () => {
    it('filters messages by connectionId', () => {
      const g = new WebSocketGateway()
      const c1 = g.connect()
      const c2 = g.connect()
      g.send(c1.id, 'a')
      g.send(c2.id, 'b')
      const msgs = g.getMessages({ connectionId: c1.id })
      expect(msgs).toHaveLength(1)
    })

    it('filters by direction', () => {
      const g = new WebSocketGateway()
      const c = g.connect()
      g.send(c.id, 'a')
      g.receive(c.id, 'b')
      const incoming = g.getMessages({ direction: 'incoming' })
      expect(incoming).toHaveLength(1)
    })
  })

  describe('metrics & lifecycle', () => {
    it('aggregate metrics', () => {
      const g = new WebSocketGateway()
      const c = g.connect({ userId: 'u1' })
      g.send(c.id, 'hello')
      const m = g.metrics()
      expect(m.connections).toBe(1)
      expect(m.messages).toBe(1)
      expect(m.totalBytesOut).toBeGreaterThan(0)
    })

    it('clear all', () => {
      const g = new WebSocketGateway()
      g.connect()
      g.createRoom({ name: 'r' })
      g.clear()
      expect(g.listConnections()).toHaveLength(0)
      expect(g.listRooms()).toHaveLength(0)
    })

    it('singleton lifecycle', () => {
      resetGateway()
      const g1 = getGateway()
      const g2 = getGateway()
      expect(g1).toBe(g2)
      resetGateway()
    })
  })
})
