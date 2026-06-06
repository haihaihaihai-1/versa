// WebSocket Gateway: connection management, rooms, channels, broadcasting, heartbeat, presence, message routing.

export type ConnectionState = 'connecting' | 'open' | 'closing' | 'closed' | 'reconnecting' | (string & {})
export type MessageDirection = 'incoming' | 'outgoing' | (string & {})
export type MessageType = 'text' | 'binary' | 'json' | 'ping' | 'pong' | 'close' | (string & {})

export interface Connection {
  id: string
  userId?: string
  metadata?: Record<string, string>
  state: ConnectionState
  rooms: Set<string>
  channels: Set<string>
  ip?: string
  userAgent?: string
  connectedAt: number
  lastActivity: number
  lastPing: number
  missedPings: number
  bytesReceived: number
  bytesSent: number
  messagesReceived: number
  messagesSent: number
  rateLimit?: number
}

export interface GatewayMessage {
  id: string
  type: MessageType
  direction: MessageDirection
  connectionId: string
  channel?: string
  room?: string
  to?: string
  payload: unknown
  timestamp: number
  status: 'pending' | 'delivered' | 'failed' | 'acked'
  error?: string
}

export interface Room {
  id: string
  name: string
  members: Set<string>
  type: 'public' | 'private' | 'system'
  metadata?: Record<string, string>
  createdAt: number
  createdBy?: string
  maxMembers?: number
  persistent: boolean
}

export interface Channel {
  id: string
  name: string
  topic: string
  subscribers: Set<string>
  type: 'broadcast' | 'unicast' | 'multicast'
  metadata?: Record<string, string>
  createdAt: number
  messageCount: number
  lastMessageAt?: number
}

export interface HeartbeatConfig {
  intervalMs: number
  timeoutMs: number
  maxMissed: number
}

export interface GatewayConfig {
  heartbeat?: HeartbeatConfig
  maxConnections?: number
  maxMessageSize?: number
  rateLimitPerSec?: number
  enablePresence?: boolean
  onConnect?: (c: Connection) => void
  onDisconnect?: (c: Connection, reason: string) => void
  onMessage?: (c: Connection, m: GatewayMessage) => void
  onError?: (c: Connection, err: Error) => void
}

export class WebSocketGateway {
  private connections = new Map<string, Connection>()
  private rooms = new Map<string, Room>()
  private channels = new Map<string, Channel>()
  private messages: GatewayMessage[] = []
  private counters = { conn: 0, msg: 0 }
  private config: Required<Omit<GatewayConfig, 'onConnect' | 'onDisconnect' | 'onMessage' | 'onError'>> & Partial<Pick<GatewayConfig, 'onConnect' | 'onDisconnect' | 'onMessage' | 'onError'>>
  private rateWindows = new Map<string, number[]>()

  constructor(config: GatewayConfig = {}) {
    this.config = {
      heartbeat: config.heartbeat ?? { intervalMs: 30_000, timeoutMs: 60_000, maxMissed: 2 },
      maxConnections: config.maxConnections ?? 10_000,
      maxMessageSize: config.maxMessageSize ?? 1_048_576,
      rateLimitPerSec: config.rateLimitPerSec ?? 100,
      enablePresence: config.enablePresence ?? true,
      onConnect: config.onConnect,
      onDisconnect: config.onDisconnect,
      onMessage: config.onMessage,
      onError: config.onError,
    }
  }

  // ---- Connection lifecycle ----
  connect(opts: { userId?: string; metadata?: Record<string, string>; ip?: string; userAgent?: string; id?: string } = {}): Connection {
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Max connections reached')
    }
    const id = opts.id ?? `conn_${Date.now().toString(36)}_${(++this.counters.conn).toString(36)}`
    const now = Date.now()
    const conn: Connection = {
      id,
      userId: opts.userId,
      metadata: opts.metadata,
      state: 'open',
      rooms: new Set(),
      channels: new Set(),
      ip: opts.ip,
      userAgent: opts.userAgent,
      connectedAt: now,
      lastActivity: now,
      lastPing: now,
      missedPings: 0,
      bytesReceived: 0,
      bytesSent: 0,
      messagesReceived: 0,
      messagesSent: 0,
      rateLimit: this.config.rateLimitPerSec,
    }
    this.connections.set(id, conn)
    if (this.config.onConnect) this.config.onConnect(conn)
    return conn
  }

  disconnect(id: string, reason: string = 'normal'): boolean {
    const conn = this.connections.get(id)
    if (!conn) return false
    // Remove from all rooms
    for (const roomId of Array.from(conn.rooms)) this.leaveRoom(id, roomId)
    for (const chanId of Array.from(conn.channels)) this.unsubscribe(id, chanId)
    conn.state = 'closed'
    this.connections.delete(id)
    if (this.config.onDisconnect) this.config.onDisconnect(conn, reason)
    return true
  }

  getConnection(id: string): Connection | undefined {
    return this.connections.get(id)
  }

  listConnections(filter?: { userId?: string; state?: ConnectionState }): Connection[] {
    let arr = Array.from(this.connections.values())
    if (filter?.userId) arr = arr.filter(c => c.userId === filter.userId)
    if (filter?.state) arr = arr.filter(c => c.state === filter.state)
    return arr
  }

  // ---- Rooms ----
  createRoom(opts: { name: string; type?: 'public' | 'private' | 'system'; createdBy?: string; metadata?: Record<string, string>; maxMembers?: number; persistent?: boolean; id?: string }): Room {
    const id = opts.id ?? `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    const room: Room = {
      id,
      name: opts.name,
      members: new Set(),
      type: opts.type ?? 'public',
      metadata: opts.metadata,
      createdAt: Date.now(),
      createdBy: opts.createdBy,
      maxMembers: opts.maxMembers,
      persistent: opts.persistent ?? false,
    }
    this.rooms.set(id, room)
    return room
  }

  joinRoom(connectionId: string, roomId: string): boolean {
    const conn = this.connections.get(connectionId)
    const room = this.rooms.get(roomId)
    if (!conn || !room) return false
    if (room.maxMembers && room.members.size >= room.maxMembers) return false
    room.members.add(connectionId)
    conn.rooms.add(roomId)
    return true
  }

  leaveRoom(connectionId: string, roomId: string): boolean {
    const conn = this.connections.get(connectionId)
    const room = this.rooms.get(roomId)
    if (!conn || !room) return false
    room.members.delete(connectionId)
    conn.rooms.delete(roomId)
    return true
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id)
  }

  listRooms(): Room[] {
    return Array.from(this.rooms.values())
  }

  getRoomMembers(roomId: string): Connection[] {
    const room = this.rooms.get(roomId)
    if (!room) return []
    return Array.from(room.members).map(id => this.connections.get(id)).filter((c): c is Connection => !!c)
  }

  deleteRoom(id: string): boolean {
    const room = this.rooms.get(id)
    if (!room) return false
    for (const cid of Array.from(room.members)) {
      const c = this.connections.get(cid)
      if (c) c.rooms.delete(id)
    }
    this.rooms.delete(id)
    return true
  }

  // ---- Channels ----
  createChannel(opts: { name: string; topic: string; type?: 'broadcast' | 'unicast' | 'multicast'; metadata?: Record<string, string>; id?: string }): Channel {
    const id = opts.id ?? `chan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    const channel: Channel = {
      id,
      name: opts.name,
      topic: opts.topic,
      subscribers: new Set(),
      type: opts.type ?? 'broadcast',
      metadata: opts.metadata,
      createdAt: Date.now(),
      messageCount: 0,
    }
    this.channels.set(id, channel)
    return channel
  }

  subscribe(connectionId: string, channelId: string): boolean {
    const conn = this.connections.get(connectionId)
    const chan = this.channels.get(channelId)
    if (!conn || !chan) return false
    chan.subscribers.add(connectionId)
    conn.channels.add(channelId)
    return true
  }

  unsubscribe(connectionId: string, channelId: string): boolean {
    const conn = this.connections.get(connectionId)
    const chan = this.channels.get(channelId)
    if (!conn || !chan) return false
    chan.subscribers.delete(connectionId)
    conn.channels.delete(channelId)
    return true
  }

  getChannel(id: string): Channel | undefined {
    return this.channels.get(id)
  }

  listChannels(): Channel[] {
    return Array.from(this.channels.values())
  }

  // ---- Messaging ----
  send(connectionId: string, payload: unknown, opts: { type?: MessageType; channel?: string; room?: string } = {}): GatewayMessage | null {
    const conn = this.connections.get(connectionId)
    if (!conn || conn.state !== 'open') return null
    if (!this.checkRateLimit(connectionId)) return null
    const size = JSON.stringify(payload).length
    if (size > this.config.maxMessageSize) {
      if (this.config.onError) this.config.onError(conn, new Error('Message size exceeded'))
      return null
    }
    const msg: GatewayMessage = {
      id: `msg_${Date.now().toString(36)}_${(++this.counters.msg).toString(36)}`,
      type: opts.type ?? 'text',
      direction: 'outgoing',
      connectionId,
      channel: opts.channel,
      room: opts.room,
      payload,
      timestamp: Date.now(),
      status: 'delivered',
    }
    this.messages.push(msg)
    conn.messagesSent++
    conn.bytesSent += size
    conn.lastActivity = Date.now()
    return msg
  }

  receive(connectionId: string, payload: unknown, opts: { type?: MessageType; channel?: string; room?: string } = {}): GatewayMessage | null {
    const conn = this.connections.get(connectionId)
    if (!conn || conn.state !== 'open') return null
    if (!this.checkRateLimit(connectionId)) return null
    const size = JSON.stringify(payload).length
    if (size > this.config.maxMessageSize) {
      if (this.config.onError) this.config.onError(conn, new Error('Message size exceeded'))
      return null
    }
    const msg: GatewayMessage = {
      id: `msg_${Date.now().toString(36)}_${(++this.counters.msg).toString(36)}`,
      type: opts.type ?? 'text',
      direction: 'incoming',
      connectionId,
      channel: opts.channel,
      room: opts.room,
      payload,
      timestamp: Date.now(),
      status: 'pending',
    }
    this.messages.push(msg)
    conn.messagesReceived++
    conn.bytesReceived += size
    conn.lastActivity = Date.now()
    if (this.config.onMessage) this.config.onMessage(conn, msg)
    return msg
  }

  // Broadcast to a room
  broadcastRoom(roomId: string, payload: unknown, opts: { type?: MessageType; fromConnectionId?: string } = {}): GatewayMessage[] {
    const room = this.rooms.get(roomId)
    if (!room) return []
    const out: GatewayMessage[] = []
    for (const memberId of room.members) {
      const m = this.send(memberId, payload, { type: opts.type, room: roomId })
      if (m) out.push(m)
    }
    return out
  }

  // Broadcast to a channel
  broadcastChannel(channelId: string, payload: unknown, opts: { type?: MessageType; fromConnectionId?: string } = {}): GatewayMessage[] {
    const chan = this.channels.get(channelId)
    if (!chan) return []
    chan.messageCount++
    chan.lastMessageAt = Date.now()
    const out: GatewayMessage[] = []
    for (const subId of chan.subscribers) {
      const m = this.send(subId, payload, { type: opts.type, channel: channelId })
      if (m) out.push(m)
    }
    return out
  }

  // Direct message
  direct(toConnectionId: string, payload: unknown, opts: { fromConnectionId?: string; type?: MessageType } = {}): GatewayMessage | null {
    return this.send(toConnectionId, payload, { type: opts.type })
  }

  // ---- Heartbeat ----
  ping(connectionId: string): boolean {
    const conn = this.connections.get(connectionId)
    if (!conn) return false
    conn.lastPing = Date.now()
    return true
  }

  // Run heartbeat tick - should be called periodically
  heartbeatTick(): { dead: string[]; alive: number; slow: string[] } {
    const now = Date.now()
    const dead: string[] = []
    const slow: string[] = []
    let alive = 0
    for (const [id, conn] of this.connections.entries()) {
      const elapsed = now - conn.lastPing
      if (elapsed > this.config.heartbeat.timeoutMs) {
        conn.missedPings++
        if (conn.missedPings >= this.config.heartbeat.maxMissed) {
          this.disconnect(id, 'heartbeat-timeout')
          dead.push(id)
          continue
        }
        slow.push(id)
      } else {
        conn.missedPings = 0
        alive++
      }
    }
    return { dead, alive, slow }
  }

  // ---- Presence ----
  getPresence(connectionId: string): { rooms: string[]; channels: string[]; status: ConnectionState } | null {
    const conn = this.connections.get(connectionId)
    if (!conn) return null
    return {
      rooms: Array.from(conn.rooms),
      channels: Array.from(conn.channels),
      status: conn.state,
    }
  }

  isOnline(userId: string): boolean {
    for (const c of this.connections.values()) {
      if (c.userId === userId && c.state === 'open') return true
    }
    return false
  }

  listOnlineUsers(): string[] {
    const set = new Set<string>()
    for (const c of this.connections.values()) {
      if (c.userId && c.state === 'open') set.add(c.userId)
    }
    return Array.from(set)
  }

  // ---- Rate limiting ----
  private checkRateLimit(connectionId: string): boolean {
    const now = Date.now()
    const conn = this.connections.get(connectionId)
    const limit = conn?.rateLimit ?? this.config.rateLimitPerSec
    if (limit <= 0) return true
    let window = this.rateWindows.get(connectionId)
    if (!window) {
      window = []
      this.rateWindows.set(connectionId, window)
    }
    while (window.length > 0 && window[0] < now - 1000) window.shift()
    if (window.length >= limit) return false
    window.push(now)
    return true
  }

  setRateLimit(connectionId: string, limit: number): boolean {
    const conn = this.connections.get(connectionId)
    if (!conn) return false
    conn.rateLimit = limit
    return true
  }

  // ---- Query ----
  getMessages(filter: { connectionId?: string; channel?: string; room?: string; direction?: MessageDirection; since?: number; limit?: number } = {}): GatewayMessage[] {
    let arr = this.messages
    if (filter.connectionId) arr = arr.filter(m => m.connectionId === filter.connectionId)
    if (filter.channel) arr = arr.filter(m => m.channel === filter.channel)
    if (filter.room) arr = arr.filter(m => m.room === filter.room)
    if (filter.direction) arr = arr.filter(m => m.direction === filter.direction)
    if (filter.since !== undefined) arr = arr.filter(m => m.timestamp >= filter.since!)
    if (filter.limit) arr = arr.slice(-filter.limit)
    return arr
  }

  // ---- Metrics ----
  metrics(): {
    connections: number
    rooms: number
    channels: number
    messages: number
    totalBytesIn: number
    totalBytesOut: number
    onlineUsers: number
    onlineRate: number
  } {
    let bytesIn = 0, bytesOut = 0
    for (const c of this.connections.values()) {
      bytesIn += c.bytesReceived
      bytesOut += c.bytesSent
    }
    const users = this.listOnlineUsers().length
    return {
      connections: this.connections.size,
      rooms: this.rooms.size,
      channels: this.channels.size,
      messages: this.messages.length,
      totalBytesIn: bytesIn,
      totalBytesOut: bytesOut,
      onlineUsers: users,
      onlineRate: this.connections.size > 0 ? users / this.connections.size : 0,
    }
  }

  configure(cfg: Partial<GatewayConfig>): void {
    if (cfg.heartbeat) this.config.heartbeat = cfg.heartbeat
    if (cfg.maxConnections !== undefined) this.config.maxConnections = cfg.maxConnections
    if (cfg.maxMessageSize !== undefined) this.config.maxMessageSize = cfg.maxMessageSize
    if (cfg.rateLimitPerSec !== undefined) this.config.rateLimitPerSec = cfg.rateLimitPerSec
    if (cfg.enablePresence !== undefined) this.config.enablePresence = cfg.enablePresence
  }

  clear(): void {
    this.connections.clear()
    this.rooms.clear()
    this.channels.clear()
    this.messages = []
    this.rateWindows.clear()
    this.counters = { conn: 0, msg: 0 }
  }
}

let _wsSingleton: WebSocketGateway | null = null
export function getGateway(): WebSocketGateway {
  if (!_wsSingleton) _wsSingleton = new WebSocketGateway()
  return _wsSingleton
}
export function resetGateway(): void {
  if (_wsSingleton) _wsSingleton.clear()
  _wsSingleton = null
}
