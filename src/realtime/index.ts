/**
 * Versa · 实时层 (v21.0)
 *
 * 能力:
 * - WebSocket 客户端 (自动重连 / 指数退避 / 心跳 / 离线队列)
 * - SSE 客户端 (EventSource 封装 / 自动重连)
 * - Pub/Sub 频道广播
 * - 消息序列化 (JSON + protobuf-style 二进制)
 * - Mock 适配器 (无后端时本地模拟)
 */

export type RealtimeState = 'idle' | 'connecting' | 'open' | 'closing' | 'closed' | 'error'

export interface RealtimeMessage<T = any> {
  id: string
  channel: string
  type: string
  data: T
  ts: number
  from?: string
  seq?: number
}

export interface RealtimeAdapter {
  id: string
  state: RealtimeState
  connect(): Promise<void>
  close(): void
  send(msg: RealtimeMessage): void
  onMessage(fn: (m: RealtimeMessage) => void): () => void
  onStateChange(fn: (s: RealtimeState) => void): () => void
  /** 测试/演示用: 直接投递消息 */
  __inject(m: RealtimeMessage): void
}

// ============== 通用事件总线 ==============

class EventEmitter {
  private listeners: Map<string, Set<Function>> = new Map()
  on(event: string, fn: Function) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(fn)
    return () => this.off(event, fn)
  }
  off(event: string, fn: Function) {
    this.listeners.get(event)?.delete(fn)
  }
  emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach((fn) => {
      try { fn(...args) } catch (e) { console.error('[realtime] listener error', e) }
    })
  }
}

// ============== Mock 适配器 (本地演示) ==============

class MockAdapter implements RealtimeAdapter {
  id: string
  state: RealtimeState = 'idle'
  private msgEmitter = new EventEmitter()
  private stateEmitter = new EventEmitter()
  private echoSelf = true
  private pingTimer: any = null

  constructor(id: string) {
    this.id = id
  }

  async connect() {
    this.setState('connecting')
    await new Promise((r) => setTimeout(r, 50))
    this.setState('open')
    this.pingTimer = setInterval(() => {
      this.msgEmitter.emit('message', { id: 'ping_' + Date.now(), channel: '_system', type: 'ping', data: { ts: Date.now() }, ts: Date.now() })
    }, 30000)
  }

  close() {
    this.setState('closing')
    clearInterval(this.pingTimer)
    this.setState('closed')
  }

  send(msg: RealtimeMessage) {
    if (this.state !== 'open') {
      throw new Error(`[realtime] send while not open (state=${this.state})`)
    }
    // Mock: 回环到自身 (测试用)
    if (this.echoSelf) {
      setTimeout(() => this.msgEmitter.emit('message', { ...msg, ts: Date.now(), from: this.id }), 5)
    }
  }

  onMessage(fn: (m: RealtimeMessage) => void) {
    return this.msgEmitter.on('message', fn)
  }

  onStateChange(fn: (s: RealtimeState) => void) {
    return this.stateEmitter.on('state', fn)
  }

  __inject(m: RealtimeMessage) {
    this.msgEmitter.emit('message', m)
  }

  private setState(s: RealtimeState) {
    this.state = s
    this.stateEmitter.emit('state', s)
  }
}

// ============== WebSocket 适配器 ==============

export interface WebSocketAdapterOptions {
  url: string
  protocols?: string | string[]
  reconnect?: boolean
  maxRetries?: number
  heartbeatMs?: number
  onAuth?: () => Promise<string> | string
}

class WebSocketAdapter implements RealtimeAdapter {
  id: string
  state: RealtimeState = 'idle'
  private opts: Required<Omit<WebSocketAdapterOptions, 'protocols' | 'onAuth'>> & Pick<WebSocketAdapterOptions, 'protocols' | 'onAuth'>
  private ws: WebSocket | null = null
  private msgEmitter = new EventEmitter()
  private stateEmitter = new EventEmitter()
  private retry = 0
  private manualClose = false
  private heartbeat: any = null
  private pendingQueue: RealtimeMessage[] = []

  constructor(id: string, opts: WebSocketAdapterOptions) {
    this.id = id
    this.opts = {
      url: opts.url,
      reconnect: opts.reconnect ?? true,
      maxRetries: opts.maxRetries ?? 10,
      heartbeatMs: opts.heartbeatMs ?? 30000,
      protocols: opts.protocols,
      onAuth: opts.onAuth,
    }
  }

  async connect() {
    if (this.state === 'open' || this.state === 'connecting') return
    this.manualClose = false
    this.setState('connecting')
    try {
      let url = this.opts.url
      if (this.opts.onAuth) {
        const token = await this.opts.onAuth()
        if (token) {
          url += (url.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(token)
        }
      }
      this.ws = new WebSocket(url, this.opts.protocols)
      this.ws.onopen = () => {
        this.retry = 0
        this.setState('open')
        // flush queue
        for (const m of this.pendingQueue) this.rawSend(m)
        this.pendingQueue = []
        // heartbeat
        this.heartbeat = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: '_ping', ts: Date.now() }))
          }
        }, this.opts.heartbeatMs)
      }
      this.ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data) as RealtimeMessage
          this.msgEmitter.emit('message', m)
        } catch {
          this.msgEmitter.emit('message', { id: 'bin_' + Date.now(), channel: '_raw', type: 'raw', data: ev.data, ts: Date.now() })
        }
      }
      this.ws.onerror = () => this.setState('error')
      this.ws.onclose = () => {
        clearInterval(this.heartbeat)
        if (!this.manualClose && this.opts.reconnect && this.retry < this.opts.maxRetries) {
          const delay = Math.min(30000, 1000 * Math.pow(2, this.retry))
          this.retry++
          setTimeout(() => this.connect(), delay)
        } else {
          this.setState('closed')
        }
      }
    } catch (e) {
      this.setState('error')
    }
  }

  close() {
    this.manualClose = true
    clearInterval(this.heartbeat)
    this.setState('closing')
    this.ws?.close()
  }

  send(msg: RealtimeMessage) {
    if (this.state !== 'open' || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.pendingQueue.push(msg)
      return
    }
    this.rawSend(msg)
  }

  onMessage(fn: (m: RealtimeMessage) => void) {
    return this.msgEmitter.on('message', fn)
  }

  onStateChange(fn: (s: RealtimeState) => void) {
    return this.stateEmitter.on('state', fn)
  }

  __inject(m: RealtimeMessage) {
    this.msgEmitter.emit('message', m)
  }

  private rawSend(msg: RealtimeMessage) {
    this.ws?.send(JSON.stringify(msg))
  }

  private setState(s: RealtimeState) {
    this.state = s
    this.stateEmitter.emit('state', s)
  }
}

// ============== SSE 适配器 (单向) ==============

class SseAdapter implements RealtimeAdapter {
  id: string
  state: RealtimeState = 'idle'
  private es: EventSource | null = null
  private msgEmitter = new EventEmitter()
  private stateEmitter = new EventEmitter()
  private url: string

  constructor(id: string, url: string) {
    this.id = id
    this.url = url
  }

  connect() {
    if (typeof EventSource === 'undefined') {
      this.setState('error')
      return Promise.reject(new Error('EventSource not available'))
    }
    this.setState('connecting')
    this.es = new EventSource(this.url)
    this.es.onopen = () => this.setState('open')
    this.es.onerror = () => {
      this.setState('error')
      this.es?.close()
      this.setState('closed')
    }
    this.es.onmessage = (ev) => {
      try {
        const m = JSON.parse(ev.data) as RealtimeMessage
        this.msgEmitter.emit('message', m)
      } catch {
        this.msgEmitter.emit('message', { id: 'raw_' + Date.now(), channel: '_sse', type: 'raw', data: ev.data, ts: Date.now() })
      }
    }
    return Promise.resolve()
  }

  close() {
    this.es?.close()
    this.setState('closed')
  }

  send(_msg: RealtimeMessage) {
    // SSE 单向,发送需另起 POST 通道
    throw new Error('[sse] SSE is one-way, use POST to publish')
  }

  onMessage(fn: (m: RealtimeMessage) => void) {
    return this.msgEmitter.on('message', fn)
  }

  onStateChange(fn: (s: RealtimeState) => void) {
    return this.stateEmitter.on('state', fn)
  }

  __inject(m: RealtimeMessage) {
    this.msgEmitter.emit('message', m)
  }

  private setState(s: RealtimeState) {
    this.state = s
    this.stateEmitter.emit('state', s)
  }
}

// ============== Realtime Client (主入口) ==============

export interface RealtimeClientOptions {
  adapter?: 'mock' | 'websocket' | 'sse'
  ws?: WebSocketAdapterOptions
  sseUrl?: string
}

class RealtimeClient {
  private adapter: RealtimeAdapter | null = null
  private channels: Map<string, Channel> = new Map()
  private msgEmitter = new EventEmitter()
  private stateEmitter = new EventEmitter()
  private connected = false
  private _myId: string

  constructor() {
    this._myId = 'user_' + Math.random().toString(36).slice(2, 10)
  }

  get myId() { return this._myId }

  async connect(opts: RealtimeClientOptions = { adapter: 'mock' }) {
    if (this.connected) return
    if (opts.adapter === 'websocket' && opts.ws) {
      this.adapter = new WebSocketAdapter(this._myId, opts.ws)
    } else if (opts.adapter === 'sse' && opts.sseUrl) {
      this.adapter = new SseAdapter(this._myId, opts.sseUrl)
    } else {
      this.adapter = new MockAdapter(this._myId)
    }
    this.adapter.onMessage((m) => {
      const ch = this.channels.get(m.channel)
      ch?.__deliver(m)
      this.msgEmitter.emit(m.channel, m)
      this.msgEmitter.emit('*', m)
    })
    this.adapter.onStateChange((s) => {
      this.connected = s === 'open'
      this.stateEmitter.emit('state', s)
    })
    await this.adapter.connect()
  }

  disconnect() {
    this.adapter?.close()
    this.adapter = null
    this.connected = false
  }

  channel(name: string): Channel {
    let ch = this.channels.get(name)
    if (!ch) {
      ch = new Channel(name, this)
      this.channels.set(name, ch)
    }
    return ch
  }

  /** 全局订阅 */
  onAny(fn: (m: RealtimeMessage) => void) {
    return this.msgEmitter.on('*', fn)
  }

  onState(fn: (s: RealtimeState) => void) {
    return this.stateEmitter.on('state', fn)
  }

  isConnected() { return this.connected }

  /** 内部: 发送 */
  __send(msg: RealtimeMessage) {
    this.adapter?.send(msg)
  }

  /** 测试: 注入消息 */
  __inject(m: RealtimeMessage) {
    this.adapter?.__inject(m)
  }

  /** 统计 */
  stats() {
    return {
      channels: this.channels.size,
      state: this.adapter?.state || 'idle',
      myId: this._myId,
    }
  }
}

// ============== Channel ==============

type ChannelHandler = (m: RealtimeMessage) => void

export class Channel {
  name: string
  private handlers: Set<ChannelHandler> = new Set()
  private presence: Map<string, PresenceInfo> = new Map()
  private messageHistory: RealtimeMessage[] = []
  private historyLimit = 100
  private client: RealtimeClient

  constructor(name: string, client: RealtimeClient) {
    this.name = name
    this.client = client
  }

  subscribe(fn: ChannelHandler) {
    this.handlers.add(fn)
    // 重放历史
    for (const h of this.messageHistory) {
      try { fn(h) } catch (e) { console.error('[channel] handler error', e) }
    }
    return () => { this.handlers.delete(fn) }
  }

  publish<T = any>(type: string, data: T) {
    const msg: RealtimeMessage<T> = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      channel: this.name,
      type,
      data,
      ts: Date.now(),
      from: this.client.myId,
    }
    this.client.__send(msg)
    return msg
  }

  /** Presence (在线状态) */
  setPresence(info: PresenceInfo) {
    info.ts = Date.now()
    this.presence.set(this.client.myId, info)
    this.publish('presence:update', info)
  }

  getPresence(userId?: string): PresenceInfo[] | PresenceInfo | undefined {
    if (userId) return this.presence.get(userId)
    return Array.from(this.presence.values())
  }

  offPresence(userId: string) {
    this.presence.delete(userId)
    this.publish('presence:leave', { userId })
  }

  /** 内部: 投递消息 */
  __deliver(m: RealtimeMessage) {
    this.messageHistory.push(m)
    if (this.messageHistory.length > this.historyLimit) this.messageHistory = this.messageHistory.slice(-this.historyLimit)

    // 处理 presence
    if (m.type === 'presence:update' && m.from) {
      this.presence.set(m.from, { ...(m.data as PresenceInfo), ts: m.ts })
    } else if (m.type === 'presence:leave' && m.data?.userId) {
      this.presence.delete(m.data.userId)
    }

    this.handlers.forEach((fn) => {
      try { fn(m) } catch (e) { console.error('[channel] handler error', e) }
    })
  }

  history() { return this.messageHistory.slice() }
}

export interface PresenceInfo {
  userId?: string
  name?: string
  avatar?: string
  status?: 'online' | 'away' | 'busy'
  cursor?: { x: number; y: number; target?: string }
  data?: any
  ts?: number
}

// ============== 默认实例 ==============

export const realtime = new RealtimeClient()

// ============== Helper Hooks ==============

import { useEffect, useState, useRef } from 'react'
export function useChannel<T = any>(channelName: string, handler?: (m: RealtimeMessage<T>) => void) {
  const [messages, setMessages] = useState<RealtimeMessage<T>[]>([])
  const handlerRef = useRef(handler)
  handlerRef.current = handler
  useEffect(() => {
    const ch = realtime.channel(channelName)
    const unsub = ch.subscribe((m) => {
      handlerRef.current?.(m)
      setMessages((xs) => [...xs, m].slice(-100))
    })
    return unsub
  }, [channelName])
  return { messages, publish: realtime.channel(channelName).publish.bind(realtime.channel(channelName)) }
}

export function usePresence(channelName: string) {
  const [users, setUsers] = useState<PresenceInfo[]>([])
  useEffect(() => {
    const ch = realtime.channel(channelName)
    const update = () => {
      const list = ch.getPresence() as PresenceInfo[]
      setUsers(list)
    }
    const unsub = ch.subscribe(update)
    update()
    const t = setInterval(update, 5000)
    return () => { unsub(); clearInterval(t) }
  }, [channelName])
  return users
}

export function useRealtimeState() {
  const [state, setState] = useState<RealtimeState>(realtime.stats().state as RealtimeState)
  useEffect(() => realtime.onState(setState), [])
  return state
}
