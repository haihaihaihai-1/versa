/**
 * Versa · Realtime Manager (v48.0)
 * - WebSocket-style connection management (in-memory)
 * - Rooms / channels with publish/subscribe
 * - Presence (join/leave/heartbeat)
 * - Direct messages (peer to peer)
 * - Message routing with pattern matching (channel:event)
 * - Backpressure (per-connection buffer + overflow)
 * - Heartbeat / ping-pong
 * - Auth token per connection
 * - Broadcast stats
 * - Hooks (onMessage/onConnect/onDisconnect/onJoin/onLeave)
 * - Metrics
 */
import { withRetry } from '../federation'

export interface Connection {
  id: string
  userId?: string
  scopes?: string[]
  ip?: string
  connectedAt: number
  lastSeen: number
  channels: Set<string>
  status: 'connected' | 'idle' | 'disconnected'
  buffer: Message[]
  metadata: Record<string, unknown>
  token?: string
}

export interface Message {
  id: string
  channel: string
  event: string
  data: unknown
  from?: string
  ts: number
}

export interface Presence {
  connectionId: string
  userId?: string
  status: 'online' | 'away' | 'offline'
  joinedAt: number
  lastSeen: number
  data?: Record<string, unknown>
}

export interface Room {
  name: string
  createdAt: number
  members: Set<string>
  messages: number
  privateRoom: boolean
  metadata: Record<string, unknown>
}

export interface RouteRule {
  pattern: string
  handler: (msg: Message, conn: Connection) => void | Promise<void>
  requiresScopes?: string[]
  rateLimit?: number // msg/sec
}

export interface RealtimeMetrics {
  totalConnections: number
  totalDisconnects: number
  totalMessages: number
  totalBytes: number
  totalRooms: number
  totalChannels: number
  totalRoutes: number
  totalBroadcast: number
  totalErrors: number
  byEvent: Record<string, number>
  byChannel: Record<string, number>
  activeConnections: number
}

export type ConnHook = (conn: Connection) => void | Promise<void>
export type MsgHook = (msg: Message, conn: Connection) => void | Promise<void>
export type LeaveHook = (conn: Connection, channel: string) => void | Promise<void>

export class RealtimeManager {
  private connections = new Map<string, Connection>()
  private rooms = new Map<string, Room>()
  private presence = new Map<string, Presence>()
  private routes: RouteRule[] = []
  private rateBuckets = new Map<string, { tokens: number; lastRefill: number }>()
  private hooks = { onConnect: [] as ConnHook[], onDisconnect: [] as ConnHook[], onMessage: [] as MsgHook[], onJoin: [] as ConnHook[], onLeave: [] as LeaveHook[] }
  private metrics: RealtimeMetrics = { totalConnections: 0, totalDisconnects: 0, totalMessages: 0, totalBytes: 0, totalRooms: 0, totalChannels: 0, totalRoutes: 0, totalBroadcast: 0, totalErrors: 0, byEvent: {}, byChannel: {}, activeConnections: 0 }
  private heartbeatMs = 30_000
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private maxBufferSize = 1000

  // -------- Connection lifecycle --------
  connect(opts: { id?: string; userId?: string; scopes?: string[]; ip?: string; token?: string; metadata?: Record<string, unknown> } = {}): Connection {
    const id = opts.id ?? this.genId()
    const conn: Connection = { id, userId: opts.userId, scopes: opts.scopes, ip: opts.ip, token: opts.token, connectedAt: Date.now(), lastSeen: Date.now(), channels: new Set(), status: 'connected', buffer: [], metadata: opts.metadata ?? {} }
    this.connections.set(id, conn)
    this.metrics.totalConnections++
    this.metrics.activeConnections++
    if (opts.userId) this.presence.set(id, { connectionId: id, userId: opts.userId, status: 'online', joinedAt: Date.now(), lastSeen: Date.now() })
    for (const h of this.hooks.onConnect) try { void h(conn) } catch { /* ignore */ }
    return conn
  }
  disconnect(id: string, reason = 'normal'): void {
    const conn = this.connections.get(id)
    if (!conn) return
    // leave all channels
    for (const ch of [...conn.channels]) this.leave(id, ch)
    conn.status = 'disconnected'
    this.connections.delete(id)
    this.presence.delete(id)
    this.metrics.totalDisconnects++
    this.metrics.activeConnections = Math.max(0, this.metrics.activeConnections - 1)
    void reason
    for (const h of this.hooks.onDisconnect) try { void h(conn) } catch { /* ignore */ }
  }
  getConnection(id: string): Connection | undefined { return this.connections.get(id) }
  listConnections(): Connection[] { return [...this.connections.values()] }
  isConnected(id: string): boolean { return this.connections.has(id) }
  countConnections(): number { return this.connections.size }

  // -------- Heartbeat --------
  startHeartbeat(intervalMs?: number): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    const ms = intervalMs ?? this.heartbeatMs
    this.heartbeatTimer = setInterval(() => this.heartbeat(), ms)
  }
  stopHeartbeat(): void { if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null } }
  private heartbeat(): void {
    const now = Date.now()
    const stale: string[] = []
    for (const c of this.connections.values()) { if (now - c.lastSeen > this.heartbeatMs * 2) stale.push(c.id) }
    for (const id of stale) this.disconnect(id, 'heartbeat_timeout')
  }
  ping(id: string): boolean {
    const c = this.connections.get(id)
    if (!c) return false
    c.lastSeen = Date.now()
    return true
  }

  // -------- Rooms --------
  createRoom(name: string, opts: { private?: boolean; metadata?: Record<string, unknown> } = {}): Room {
    if (this.rooms.has(name)) return this.rooms.get(name)!
    const r: Room = { name, createdAt: Date.now(), members: new Set(), messages: 0, privateRoom: opts.private ?? false, metadata: opts.metadata ?? {} }
    this.rooms.set(name, r)
    this.metrics.totalRooms++
    return r
  }
  destroyRoom(name: string): boolean { return this.rooms.delete(name) }
  getRoom(name: string): Room | undefined { return this.rooms.get(name) }
  listRooms(): Room[] { return [...this.rooms.values()] }

  // -------- Channels --------
  join(connId: string, channel: string): boolean {
    const conn = this.connections.get(connId)
    if (!conn) return false
    if (conn.channels.has(channel)) return false
    conn.channels.add(channel)
    let room = this.rooms.get(channel)
    if (!room) room = this.createRoom(channel)
    room.members.add(connId)
    this.metrics.totalChannels++
    for (const h of this.hooks.onJoin) try { void h(conn) } catch { /* ignore */ }
    return true
  }
  leave(connId: string, channel: string): boolean {
    const conn = this.connections.get(connId)
    if (!conn) return false
    if (!conn.channels.has(channel)) return false
    conn.channels.delete(channel)
    const room = this.rooms.get(channel)
    if (room) { room.members.delete(connId); if (room.members.size === 0) { this.rooms.delete(channel); this.metrics.totalChannels-- } }
    for (const h of this.hooks.onLeave) try { void h(conn, channel) } catch { /* ignore */ }
    return true
  }
  listChannels(): string[] { return [...this.rooms.keys()] }
  membersOf(channel: string): string[] { return [...(this.rooms.get(channel)?.members ?? [])] }
  channelCount(): number { return this.rooms.size }

  // -------- Publish / Broadcast --------
  publish(channel: string, event: string, data: unknown, from?: string): number {
    const room = this.rooms.get(channel)
    if (!room) return 0
    const msg: Message = { id: this.genId(), channel, event, data, from, ts: Date.now() }
    let sent = 0
    for (const connId of room.members) {
      const conn = this.connections.get(connId)
      if (!conn) continue
      if (!this.sendToBuffer(conn, msg)) continue
      sent++
    }
    room.messages++
    this.metrics.totalMessages++
    this.metrics.totalBroadcast += sent
    this.metrics.byEvent[event] = (this.metrics.byEvent[event] ?? 0) + 1
    this.metrics.byChannel[channel] = (this.metrics.byChannel[channel] ?? 0) + 1
    this.metrics.totalBytes += JSON.stringify(msg).length
    this.runRoutes(msg, this.connections.get(from ?? '') ?? this.synthesizeConn(from))
    return sent
  }
  private sendToBuffer(conn: Connection, msg: Message): boolean {
    if (conn.buffer.length >= this.maxBufferSize) {
      // drop oldest
      conn.buffer.shift()
    }
    conn.buffer.push(msg)
    conn.lastSeen = Date.now()
    return true
  }
  private synthesizeConn(fromId: string | undefined): Connection {
    return { id: fromId ?? 'system', connectedAt: 0, lastSeen: 0, channels: new Set(), status: 'disconnected', buffer: [], metadata: {} }
  }
  sendDirect(connId: string, event: string, data: unknown): boolean {
    const conn = this.connections.get(connId)
    if (!conn) return false
    const msg: Message = { id: this.genId(), channel: '@direct', event, data, ts: Date.now() }
    return this.sendToBuffer(conn, msg)
  }
  readBuffer(connId: string, drain = false): Message[] {
    const conn = this.connections.get(connId)
    if (!conn) return []
    const out = [...conn.buffer]
    if (drain) conn.buffer = []
    return out
  }
  bufferSize(connId: string): number { return this.connections.get(connId)?.buffer.length ?? 0 }

  // -------- Presence --------
  setPresence(connId: string, status: 'online' | 'away' | 'offline', data?: Record<string, unknown>): void {
    const p = this.presence.get(connId) ?? { connectionId: connId, status: 'online', joinedAt: Date.now(), lastSeen: Date.now() }
    p.status = status
    p.lastSeen = Date.now()
    if (data) p.data = data
    this.presence.set(connId, p)
  }
  getPresence(connId: string): Presence | undefined { return this.presence.get(connId) }
  listPresence(): Presence[] { return [...this.presence.values()] }
  presenceByUser(userId: string): Presence[] { return [...this.presence.values()].filter(p => p.userId === userId) }
  countOnline(): number { return this.presence.size }

  // -------- Routing --------
  route(pattern: string, handler: (msg: Message, conn: Connection) => void | Promise<void>, opts: { requiresScopes?: string[]; rateLimit?: number } = {}): void {
    this.routes.push({ pattern, handler, requiresScopes: opts.requiresScopes, rateLimit: opts.rateLimit })
    this.metrics.totalRoutes = this.routes.length
  }
  unroute(pattern: string): number {
    const before = this.routes.length
    this.routes = this.routes.filter(r => r.pattern !== pattern)
    this.metrics.totalRoutes = this.routes.length
    return before - this.routes.length
  }
  listRoutes(): string[] { return this.routes.map(r => r.pattern) }
  private runRoutes(msg: Message, conn: Connection): void {
    for (const r of this.routes) {
      if (!this.matchRoute(r.pattern, msg.channel + ':' + msg.event) && !this.matchRoute(r.pattern, msg.channel)) continue
      if (r.requiresScopes && (!conn.scopes || !r.requiresScopes.every(s => conn.scopes!.includes(s)))) continue
      if (r.rateLimit !== undefined && !this.allowRoute(msg.channel + ':' + msg.event, r.rateLimit)) continue
      try { void r.handler(msg, conn) } catch { this.metrics.totalErrors++ }
    }
  }
  private matchRoute(pattern: string, target: string): boolean {
    if (pattern === target) return true
    if (pattern === '*') return true
    if (pattern.endsWith(':*')) return target.startsWith(pattern.slice(0, -1))
    if (pattern.includes('*')) {
      const re = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$')
      return re.test(target)
    }
    return false
  }
  private allowRoute(key: string, rate: number): boolean {
    const now = Date.now()
    const b = this.rateBuckets.get(key) ?? { tokens: rate, lastRefill: now }
    const elapsed = (now - b.lastRefill) / 1000
    b.tokens = Math.min(rate, b.tokens + elapsed * rate)
    b.lastRefill = now
    if (b.tokens < 1) { this.rateBuckets.set(key, b); return false }
    b.tokens -= 1
    this.rateBuckets.set(key, b)
    return true
  }

  // -------- Hooks --------
  onConnect(fn: ConnHook): void { this.hooks.onConnect.push(fn) }
  onDisconnect(fn: ConnHook): void { this.hooks.onDisconnect.push(fn) }
  onMessage(fn: MsgHook): void { this.hooks.onMessage.push(fn) }
  onJoin(fn: ConnHook): void { this.hooks.onJoin.push(fn) }
  onLeave(fn: LeaveHook): void { this.hooks.onLeave.push(fn) }

  // -------- Ingest (for testing) --------
  ingest(connId: string, event: string, data: unknown, channel?: string): number {
    const conn = this.connections.get(connId)
    if (!conn) return 0
    const ch = channel ?? [...conn.channels][0] ?? '@direct'
    const msg: Message = { id: this.genId(), channel: ch, event, data, from: connId, ts: Date.now() }
    this.sendToBuffer(conn, msg)
    this.metrics.totalMessages++
    this.metrics.byEvent[event] = (this.metrics.byEvent[event] ?? 0) + 1
    this.runRoutes(msg, conn)
    for (const h of this.hooks.onMessage) try { void h(msg, conn) } catch { /* ignore */ }
    return 1
  }

  // -------- Settings --------
  setHeartbeatMs(ms: number): void { this.heartbeatMs = ms }
  setMaxBufferSize(n: number): void { this.maxBufferSize = n }

  // -------- Metrics --------
  getMetrics(): RealtimeMetrics { return JSON.parse(JSON.stringify(this.metrics)) }
  resetMetrics(): void { this.metrics = { totalConnections: 0, totalDisconnects: 0, totalMessages: 0, totalBytes: 0, totalRooms: 0, totalChannels: 0, totalRoutes: 0, totalBroadcast: 0, totalErrors: 0, byEvent: {}, byChannel: {}, activeConnections: 0 } }

  // -------- Federation --------
  async sendDirectWithRetry(connId: string, event: string, data: unknown): Promise<boolean> {
    return withRetry(async () => this.sendDirect(connId, event, data), { maxAttempts: 3, baseDelayMs: 50, maxDelayMs: 1000, jitter: true, retryOnStatus: [] })
  }

  // -------- helpers --------
  private genId(): string {
    let h = 0xa5a5a5a5
    for (let i = 0; i < 8; i++) h = (h ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
    return h.toString(16)
  }
}

let _instance: RealtimeManager | null = null
export function getRealtimeManager(): RealtimeManager { if (!_instance) _instance = new RealtimeManager(); return _instance }
export function resetRealtimeManager(): void { _instance = null }
export { RealtimeManager as default }
