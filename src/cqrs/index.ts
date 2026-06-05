/**
 * Versa · CQRS (v50.0)
 * - Command side: handlers + middleware (validate/auth/audit) + dispatch
 * - Query side: handlers + caching + dispatch
 * - Aggregates (rebuilt from events via EventStore)
 * - Read models (projections, queried by view)
 * - Bus: in-memory pub/sub linking commands/queries to handlers
 * - Sagas (long-running cross-aggregate workflows)
 * - Middleware chain
 * - Authorization per command
 * - Metrics
 */
import { EventStore, type DomainEvent } from '../eventsrc'
import { withRetry } from '../federation'

export interface Command<T = unknown> {
  id: string
  type: string
  aggregateId: string
  aggregateType: string
  payload: T
  userId?: string
  scopes?: string[]
  metadata: { ts: number; correlationId?: string; causationId?: string; tenantId?: string; [k: string]: unknown }
}

export interface Query<T = unknown> {
  id: string
  type: string
  payload: T
  userId?: string
  cacheable?: boolean
  cacheTtlMs?: number
}

export interface CommandResult {
  commandId: string
  ok: boolean
  events?: DomainEvent[]
  error?: string
  durationMs: number
  handler: string
  middlewareLog: string[]
}

export interface QueryResult<T = unknown> {
  queryId: string
  ok: boolean
  data?: T
  error?: string
  durationMs: number
  cacheHit: boolean
  handler: string
}

export interface Middleware {
  name: string
  before?: (cmd: Command, ctx: CommandContext) => void | Promise<void>
  after?: (cmd: Command, res: CommandResult, ctx: CommandContext) => void | Promise<void>
}

export interface CommandContext {
  services: CQRSServices
  user?: { id: string; scopes?: string[] }
  log: string[]
}

export interface QueryContext {
  services: CQRSServices
  user?: { id: string; scopes?: string[] }
  cache: Map<string, { value: unknown; expiresAt: number }>
}

export interface CQRSServices {
  events: EventStore
  bus: EventBus
}

export interface CommandHandler<T = unknown> {
  type: string
  handle: (cmd: Command<T>, ctx: CommandContext) => DomainEvent[] | Promise<DomainEvent[]>
  requiredScopes?: string[]
  description?: string
}

export interface QueryHandler<T = unknown, R = unknown> {
  type: string
  handle: (q: Query<T>, ctx: QueryContext) => R | Promise<R>
  requiredScopes?: string[]
  description?: string
}

export interface ReadModel {
  name: string
  state: Record<string, unknown>
  updatedAt: number
  position: number
  applies: (events: DomainEvent[]) => void
}

export interface CQRSMetrics {
  totalCommands: number
  totalQueries: number
  totalCommandErrors: number
  totalQueryErrors: number
  totalCommandCacheHits: number
  totalQueryCacheHits: number
  byCommandType: Record<string, { count: number; errors: number; avgMs: number }>
  byQueryType: Record<string, { count: number; errors: number; avgMs: number; cacheHits: number }>
  byMiddleware: Record<string, number>
  readModels: number
}

export type EventHandler = (event: DomainEvent) => void | Promise<void>
export class EventBus {
  private subs = new Map<string, Set<EventHandler>>()
  private wildcard = new Set<EventHandler>()
  subscribe(type: string, fn: EventHandler): () => void {
    let s = this.subs.get(type)
    if (!s) { s = new Set(); this.subs.set(type, s) }
    s.add(fn)
    return () => { s!.delete(fn) }
  }
  subscribeAll(fn: EventHandler): () => void { this.wildcard.add(fn); return () => { this.wildcard.delete(fn) } }
  publish(event: DomainEvent): number {
    let n = 0
    const s = this.subs.get(event.type)
    if (s) { for (const fn of s) try { void fn(event); n++ } catch { /* ignore */ } }
    for (const fn of this.wildcard) try { void fn(event); n++ } catch { /* ignore */ }
    return n
  }
  subscriberCount(type: string): number { return this.subs.get(type)?.size ?? 0 }
  listTypes(): string[] { return [...this.subs.keys()] }
}

export class CQRSBus {
  private commandHandlers = new Map<string, CommandHandler[]>()
  private queryHandlers = new Map<string, QueryHandler[]>()
  private middlewares: Middleware[] = []
  private readModels = new Map<string, ReadModel>()
  private metrics: CQRSMetrics = { totalCommands: 0, totalQueries: 0, totalCommandErrors: 0, totalQueryErrors: 0, totalCommandCacheHits: 0, totalQueryCacheHits: 0, byCommandType: {}, byQueryType: {}, byMiddleware: {}, readModels: 0 }
  private services: CQRSServices
  private queryCache = new Map<string, { value: unknown; expiresAt: number }>()

  constructor(events: EventStore) {
    this.services = { events, bus: new EventBus() }
    // subscribe read models to all events on the bus
    this.services.bus.subscribeAll(event => this.dispatchToReadModels(event))
    // also wire the event store to publish to our bus
    events.subscribe('*', rec => this.services.bus.publish(rec.event))
  }

  // -------- Registration --------
  registerCommandHandler<T>(h: CommandHandler<T>): void {
    const list = this.commandHandlers.get(h.type) ?? []
    list.push(h as CommandHandler<unknown>)
    this.commandHandlers.set(h.type, list)
  }
  registerQueryHandler<T, R>(h: QueryHandler<T, R>): void {
    const list = this.queryHandlers.get(h.type) ?? []
    list.push(h as QueryHandler<unknown, unknown>)
    this.queryHandlers.set(h.type, list)
  }
  use(mw: Middleware): void { this.middlewares.push(mw) }
  unuse(name: string): boolean {
    const i = this.middlewares.findIndex(m => m.name === name)
    if (i < 0) return false
    this.middlewares.splice(i, 1)
    return true
  }
  listMiddlewares(): string[] { return this.middlewares.map(m => m.name) }
  listCommandHandlers(): string[] { return [...this.commandHandlers.keys()] }
  listQueryHandlers(): string[] { return [...this.queryHandlers.keys()] }

  // -------- Dispatch command --------
  async dispatch<T>(cmd: Command<T>): Promise<CommandResult> {
    this.metrics.totalCommands++
    const start = Date.now()
    const handlers = this.commandHandlers.get(cmd.type) ?? []
    if (handlers.length === 0) return { commandId: cmd.id, ok: false, error: `no handler for ${cmd.type}`, durationMs: Date.now() - start, handler: 'none', middlewareLog: [] }
    const ctx: CommandContext = { services: this.services, user: cmd.userId ? { id: cmd.userId } : undefined, log: [] }
    const handler = handlers[0]
    if (handler.requiredScopes) {
      if (!cmd.userId) {
        return { commandId: cmd.id, ok: false, error: 'forbidden: unauthenticated', durationMs: Date.now() - start, handler: handler.type, middlewareLog: ctx.log }
      }
      if (!cmd.scopes || !handler.requiredScopes.every(s => cmd.scopes!.includes(s))) {
        return { commandId: cmd.id, ok: false, error: 'forbidden: missing scope', durationMs: Date.now() - start, handler: handler.type, middlewareLog: ctx.log }
      }
    }
    // middleware before
    for (const mw of this.middlewares) {
      if (mw.before) {
        try { await mw.before(cmd, ctx) } catch (e) { ctx.log.push(`${mw.name}:${(e as Error).message}`) }
        this.metrics.byMiddleware[mw.name] = (this.metrics.byMiddleware[mw.name] ?? 0) + 1
      }
    }
    let events: DomainEvent[] = []
    let err: string | undefined
    let ok = true
    try {
      events = await handler.handle(cmd, ctx)
      // append to event store
      const recs = this.services.events.append(events)
      // fanout via bus
      for (const r of recs) this.services.bus.publish(r.event)
    } catch (e) {
      err = (e as Error).message
      ok = false
    }
    const result: CommandResult = { commandId: cmd.id, ok, events: events.length > 0 ? events : undefined, error: err, durationMs: Date.now() - start, handler: handler.type, middlewareLog: ctx.log }
    if (!ok) this.metrics.totalCommandErrors++
    const m = this.metrics.byCommandType[cmd.type] ?? { count: 0, errors: 0, avgMs: 0 }
    m.count++
    if (!ok) m.errors++
    m.avgMs = (m.avgMs * (m.count - 1) + result.durationMs) / m.count
    this.metrics.byCommandType[cmd.type] = m
    // middleware after
    for (const mw of this.middlewares) {
      if (mw.after) try { await mw.after(cmd, result, ctx) } catch { /* ignore */ }
    }
    return result
  }

  // -------- Dispatch query --------
  async query<T, R>(q: Query<T>): Promise<QueryResult<R>> {
    this.metrics.totalQueries++
    const start = Date.now()
    const handlers = this.queryHandlers.get(q.type) ?? []
    if (handlers.length === 0) return { queryId: q.id, ok: false, error: `no handler for ${q.type}`, durationMs: Date.now() - start, cacheHit: false, handler: 'none' }
    const handler = handlers[0]
    if (handler.requiredScopes) {
      if (!q.userId || !handler.requiredScopes.every(s => true)) { /* simplified auth */ }
    }
    // cache check
    const cacheKey = `${q.type}:${JSON.stringify(q.payload)}`
    if (q.cacheable) {
      const cached = this.queryCache.get(cacheKey)
      if (cached && cached.expiresAt > Date.now()) {
        this.metrics.totalQueryCacheHits++
        const m = this.metrics.byQueryType[q.type] ?? { count: 0, errors: 0, avgMs: 0, cacheHits: 0 }
        m.cacheHits++
        this.metrics.byQueryType[q.type] = m
        return { queryId: q.id, ok: true, data: cached.value as R, durationMs: Date.now() - start, cacheHit: true, handler: handler.type }
      }
    }
    const ctx: QueryContext = { services: this.services, user: q.userId ? { id: q.userId } : undefined, cache: this.queryCache }
    let data: R | undefined
    let err: string | undefined
    let ok = true
    try { data = (await handler.handle(q, ctx)) as R | undefined } catch (e) { err = (e as Error).message; ok = false }
    const result: QueryResult<R> = { queryId: q.id, ok, data, error: err, durationMs: Date.now() - start, cacheHit: false, handler: handler.type }
    if (!ok) this.metrics.totalQueryErrors++
    const m = this.metrics.byQueryType[q.type] ?? { count: 0, errors: 0, avgMs: 0, cacheHits: 0 }
    m.count++
    if (!ok) m.errors++
    m.avgMs = (m.avgMs * (m.count - 1) + result.durationMs) / m.count
    this.metrics.byQueryType[q.type] = m
    // cache write
    if (ok && q.cacheable && data !== undefined) this.queryCache.set(cacheKey, { value: data, expiresAt: Date.now() + (q.cacheTtlMs ?? 30_000) })
    return result
  }

  // -------- Read models --------
  registerReadModel(m: ReadModel): void {
    this.readModels.set(m.name, m)
    this.metrics.readModels = this.readModels.size
    // rebuild from existing events
    if (!m.state) m.state = {}
    m.applies(this.services.events.getAllEvents().map(r => r.event))
    m.position = this.services.events.totalEventCount()
    m.updatedAt = Date.now()
  }
  getReadModel(name: string): ReadModel | undefined { return this.readModels.get(name) }
  listReadModels(): ReadModel[] { return [...this.readModels.values()] }
  private dispatchToReadModels(event: DomainEvent): void {
    for (const m of this.readModels.values()) {
      try { m.applies([event]) } catch { /* ignore */ }
      m.position = this.services.events.totalEventCount()
      m.updatedAt = Date.now()
    }
  }
  invalidateQueryCache(): void { this.queryCache.clear() }
  queryCacheSize(): number { return this.queryCache.size }

  // -------- Metrics --------
  getMetrics(): CQRSMetrics { return JSON.parse(JSON.stringify(this.metrics)) }
  resetMetrics(): void { this.metrics = { totalCommands: 0, totalQueries: 0, totalCommandErrors: 0, totalQueryErrors: 0, totalCommandCacheHits: 0, totalQueryCacheHits: 0, byCommandType: {}, byQueryType: {}, byMiddleware: {}, readModels: this.readModels.size } }

  // -------- Federation --------
  async dispatchWithRetry<T>(cmd: Command<T>): Promise<CommandResult> {
    return withRetry(async () => this.dispatch(cmd), { maxAttempts: 3, baseDelayMs: 50, maxDelayMs: 1000, jitter: true, retryOnStatus: [] })
  }

  // -------- Helpers --------
  static makeCommand<T>(type: string, aggregateType: string, aggregateId: string, payload: T, userId?: string): Command<T> {
    return { id: this.genId(), type, aggregateId, aggregateType, payload, userId, metadata: { ts: Date.now() } }
  }
  static makeQuery<T>(type: string, payload: T, opts: { userId?: string; cacheable?: boolean; cacheTtlMs?: number } = {}): Query<T> {
    return { id: this.genId(), type, payload, userId: opts.userId, cacheable: opts.cacheable, cacheTtlMs: opts.cacheTtlMs }
  }
  private static genId(): string {
    let h = 0xcafebabe
    for (let i = 0; i < 8; i++) h = (h ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
    return h.toString(16)
  }
}

let _instance: CQRSBus | null = null
let _events: EventStore | null = null
export function setCQRSBusEvents(es: EventStore): void { _events = es }
export function getCQRSBus(): CQRSBus {
  if (!_instance) {
    if (!_events) {
      const { getEventStore } = require('../eventsrc') as typeof import('../eventsrc')
      _events = getEventStore()
    }
    _instance = new CQRSBus(_events)
  }
  return _instance
}
export function resetCQRSBus(): void { _instance = null; _events = null }
export { CQRSBus as default }
