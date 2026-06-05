/**
 * Versa · Event Sourcing (v47.0)
 * - Aggregates (state derived from events)
 * - Event store (append-only with optimistic concurrency)
 * - Snapshots (per-aggregate cutoff)
 * - Projections (read models, replayable)
 * - Saga / process manager (long-running workflows)
 * - Versioned stream rebuilder
 * - Subscription / live tail
 * - Time travel queries
 * - Schema registry
 * - Metrics
 */
import { withRetry } from '../federation'

export interface DomainEvent<T = unknown> {
  id: string
  type: string
  aggregateId: string
  aggregateType: string
  version: number
  payload: T
  metadata: { ts: number; userId?: string; correlationId?: string; causationId?: string; tenantId?: string; [k: string]: unknown }
}

export interface EventRecord {
  event: DomainEvent
  position: number // global position
  streamPosition: number // per-stream position
}

export interface AggregateState<T = unknown> {
  id: string
  type: string
  version: number
  data: T
  updatedAt: number
}

export interface Snapshot {
  aggregateId: string
  type: string
  version: number
  data: unknown
  takenAt: number
}

export interface ProjectionState {
  name: string
  position: number
  lastEventAt: number
  rebuilds: number
}

export interface SagaStep {
  name: string
  compensate?: () => Promise<void> | void
  execute: () => Promise<void> | void
}

export interface Saga {
  id: string
  name: string
  steps: SagaStep[]
  state: 'pending' | 'running' | 'completed' | 'failed' | 'compensated'
  history: Array<{ step: string; ok: boolean; err?: string; at: number }>
  startedAt: number
  finishedAt?: number
}

export interface EventSchema {
  type: string
  version: number
  jsonSchema: Record<string, unknown>
  compatibleWith?: number[]
}

export interface EventMetrics {
  totalEvents: number
  totalAppends: number
  totalRebuilds: number
  totalSnapshots: number
  totalSubscriptions: number
  byType: Record<string, number>
  byAggregate: Record<string, number>
  totalProjections: number
  sagasCompleted: number
  sagasFailed: number
}

export class EventStore {
  private events: EventRecord[] = []
  private streams = new Map<string, EventRecord[]>() // aggregateId -> events
  private snapshots = new Map<string, Snapshot>() // aggregateId -> latest snapshot
  private expectedVersions = new Map<string, number>() // optimistic concurrency
  private schemas = new Map<string, EventSchema[]>() // type -> versions
  private projections = new Map<string, ProjectionState>()
  private subscribers = new Map<string, Set<(rec: EventRecord) => void>>() // topic -> set
  private aggregateRebuilders = new Map<string, (events: DomainEvent[]) => unknown>()
  private sagaLog: Saga[] = []
  private metrics: EventMetrics = { totalEvents: 0, totalAppends: 0, totalRebuilds: 0, totalSnapshots: 0, totalSubscriptions: 0, byType: {}, byAggregate: {}, totalProjections: 0, sagasCompleted: 0, sagasFailed: 0 }
  private globalPos = 0

  // -------- Schema registry --------
  registerSchema(s: EventSchema): void {
    const list = this.schemas.get(s.type) ?? []
    list.push(s)
    this.schemas.set(s.type, list)
  }
  getSchema(type: string): EventSchema[] { return this.schemas.get(type) ?? [] }
  latestSchema(type: string): EventSchema | undefined {
    const list = this.schemas.get(type)
    if (!list || list.length === 0) return undefined
    return [...list].sort((a, b) => b.version - a.version)[0]
  }
  isCompatible(type: string, version: number, withVersion: number): boolean {
    const list = this.schemas.get(type)
    if (!list) return false
    const target = list.find(s => s.version === version)
    if (!target) return false
    return target.compatibleWith?.includes(withVersion) ?? version === withVersion
  }
  listSchemas(): EventSchema[] { return [...this.schemas.values()].flat() }

  // -------- Aggregate registration --------
  registerAggregate(type: string, rebuilder: (events: DomainEvent[]) => unknown): void {
    this.aggregateRebuilders.set(type, rebuilder)
  }
  listAggregates(): string[] { return [...this.aggregateRebuilders.keys()] }

  // -------- Append events --------
  append(events: DomainEvent[], expectedVersion?: number): EventRecord[] {
    const out: EventRecord[] = []
    for (const e of events) {
      if (expectedVersion !== undefined) {
        const cur = this.expectedVersions.get(e.aggregateId) ?? 0
        if (cur !== expectedVersion) throw new Error(`optimistic concurrency: expected ${expectedVersion}, got ${cur}`)
      }
      this.globalPos++
      const stream = this.streams.get(e.aggregateId) ?? []
      const streamPos = stream.length + 1
      const rec: EventRecord = { event: { ...e, id: e.id || this.genId(), version: streamPos }, position: this.globalPos, streamPosition: streamPos }
      this.events.push(rec)
      stream.push(rec)
      this.streams.set(e.aggregateId, stream)
      this.expectedVersions.set(e.aggregateId, streamPos)
      this.metrics.totalEvents++
      this.metrics.totalAppends++
      this.metrics.byType[e.type] = (this.metrics.byType[e.type] ?? 0) + 1
      this.metrics.byAggregate[e.aggregateId] = (this.metrics.byAggregate[e.aggregateId] ?? 0) + 1
      out.push(rec)
      // fan out
      this.fanout(rec)
    }
    return out
  }
  private fanout(rec: EventRecord): void {
    // type subscribers
    const typeSet = this.subscribers.get(`type:${rec.event.type}`)
    if (typeSet) for (const fn of typeSet) try { fn(rec) } catch { /* ignore */ }
    // aggregate subscribers
    const aggSet = this.subscribers.get(`agg:${rec.event.aggregateId}`)
    if (aggSet) for (const fn of aggSet) try { fn(rec) } catch { /* ignore */ }
    // aggregate type subscribers
    const aggTypeSet = this.subscribers.get(`aggt:${rec.event.aggregateType}`)
    if (aggTypeSet) for (const fn of aggTypeSet) try { fn(rec) } catch { /* ignore */ }
    // global subscribers
    const allSet = this.subscribers.get('*')
    if (allSet) for (const fn of allSet) try { fn(rec) } catch { /* ignore */ }
  }

  // -------- Queries --------
  getEvent(id: string): EventRecord | undefined { return this.events.find(r => r.event.id === id) }
  getByPosition(pos: number): EventRecord | undefined { return this.events[pos - 1] }
  getByAggregate(aggregateId: string): EventRecord[] { return this.streams.get(aggregateId) ?? [] }
  getByType(type: string): EventRecord[] { return this.events.filter(r => r.event.type === type) }
  getRange(from: number, to: number): EventRecord[] { return this.events.slice(Math.max(0, from - 1), to) }
  getAllEvents(): EventRecord[] { return [...this.events] }
  totalEventCount(): number { return this.events.length }
  streamVersion(aggregateId: string): number { return this.streams.get(aggregateId)?.length ?? 0 }

  // -------- Replay / rebuild --------
  rebuildAggregate<T = unknown>(type: string, aggregateId: string): AggregateState<T> {
    const rebuilder = this.aggregateRebuilders.get(type)
    if (!rebuilder) throw new Error(`no rebuilder for ${type}`)
    const events = this.getByAggregate(aggregateId).map(r => r.event)
    const data = rebuilder(events) as T
    this.metrics.totalRebuilds++
    return { id: aggregateId, type, version: events.length, data, updatedAt: events.length > 0 ? events[events.length - 1].metadata.ts : Date.now() }
  }
  replay(type: string, fn: (e: DomainEvent) => void): number {
    const events = this.events.filter(r => r.event.type === type).map(r => r.event)
    for (const e of events) fn(e)
    return events.length
  }

  // -------- Time travel --------
  stateAt<T = unknown>(type: string, aggregateId: string, version: number): AggregateState<T> {
    const rebuilder = this.aggregateRebuilders.get(type)
    if (!rebuilder) throw new Error(`no rebuilder for ${type}`)
    const all = this.getByAggregate(aggregateId).filter(r => r.streamPosition <= version).map(r => r.event)
    return { id: aggregateId, type, version, data: rebuilder(all) as T, updatedAt: all.length > 0 ? all[all.length - 1].metadata.ts : 0 }
  }

  // -------- Snapshots --------
  takeSnapshot(aggregateId: string, type: string, data: unknown): Snapshot {
    const stream = this.streams.get(aggregateId) ?? []
    const ver = stream.length
    const snap: Snapshot = { aggregateId, type, version: ver, data, takenAt: Date.now() }
    this.snapshots.set(aggregateId, snap)
    this.metrics.totalSnapshots++
    return snap
  }
  getSnapshot(aggregateId: string): Snapshot | undefined { return this.snapshots.get(aggregateId) }
  rebuildWithSnapshot<T = unknown>(type: string, aggregateId: string): AggregateState<T> {
    const rebuilder = this.aggregateRebuilders.get(type)
    if (!rebuilder) throw new Error(`no rebuilder for ${type}`)
    const snap = this.snapshots.get(aggregateId)
    const all = this.getByAggregate(aggregateId).map(r => r.event)
    const startFrom = snap?.version ?? 0
    const events = all.slice(startFrom)
    const data = (snap ? rebuilder([...this.getByAggregate(aggregateId).filter(r => r.streamPosition <= startFrom).map(r => r.event)]) : rebuilder([])) as T
    void events
    this.metrics.totalRebuilds++
    return { id: aggregateId, type, version: all.length, data, updatedAt: all.length > 0 ? all[all.length - 1].metadata.ts : Date.now() }
  }
  listSnapshots(): Snapshot[] { return [...this.snapshots.values()] }

  // -------- Projections --------
  registerProjection(name: string): void {
    if (!this.projections.has(name)) {
      this.projections.set(name, { name, position: 0, lastEventAt: 0, rebuilds: 0 })
      this.metrics.totalProjections++
    }
  }
  getProjection(name: string): ProjectionState | undefined { return this.projections.get(name) }
  setProjectionPosition(name: string, pos: number): void {
    const p = this.projections.get(name)
    if (p) { p.position = pos; p.lastEventAt = Date.now() }
  }
  rebuildProjection(name: string, handler: (rec: EventRecord) => void): number {
    this.registerProjection(name)
    const p = this.projections.get(name)!
    p.rebuilds++
    let count = 0
    for (const rec of this.events) { handler(rec); count++ }
    p.position = this.events.length
    p.lastEventAt = Date.now()
    return count
  }
  listProjections(): ProjectionState[] { return [...this.projections.values()] }

  // -------- Subscriptions --------
  subscribe(topic: string, fn: (rec: EventRecord) => void): () => void {
    let set = this.subscribers.get(topic)
    if (!set) { set = new Set(); this.subscribers.set(topic, set) }
    set.add(fn)
    this.metrics.totalSubscriptions++
    return () => { set!.delete(fn); if (set!.size === 0) this.subscribers.delete(topic) }
  }
  subscriberCount(topic: string): number { return this.subscribers.get(topic)?.size ?? 0 }
  listSubscriptionTopics(): string[] { return [...this.subscribers.keys()] }

  // -------- Sagas --------
  async runSaga(saga: Saga): Promise<Saga> {
    saga.state = 'running'
    saga.startedAt = Date.now()
    for (const step of saga.steps) {
      try {
        await step.execute()
        saga.history.push({ step: step.name, ok: true, at: Date.now() })
      } catch (e) {
        saga.history.push({ step: step.name, ok: false, err: (e as Error).message, at: Date.now() })
        saga.state = 'failed'
        saga.finishedAt = Date.now()
        this.metrics.sagasFailed++
        // compensate in reverse
        saga.state = 'compensated'
        for (let i = saga.steps.indexOf(step) - 1; i >= 0; i--) {
          if (saga.steps[i].compensate) try { await saga.steps[i].compensate!() } catch { /* ignore */ }
        }
        this.sagaLog.push(saga)
        return saga
      }
    }
    saga.state = 'completed'
    saga.finishedAt = Date.now()
    this.metrics.sagasCompleted++
    this.sagaLog.push(saga)
    return saga
  }
  listSagas(): Saga[] { return [...this.sagaLog] }
  getSaga(id: string): Saga | undefined { return this.sagaLog.find(s => s.id === id) }

  // -------- Metrics --------
  getMetrics(): EventMetrics { return JSON.parse(JSON.stringify(this.metrics)) }
  resetMetrics(): void { this.metrics = { totalEvents: 0, totalAppends: 0, totalRebuilds: 0, totalSnapshots: 0, totalSubscriptions: 0, byType: {}, byAggregate: {}, totalProjections: 0, sagasCompleted: 0, sagasFailed: 0 } }

  // -------- Maintenance --------
  clearAll(): void {
    this.events = []
    this.streams.clear()
    this.snapshots.clear()
    this.expectedVersions.clear()
    this.projections.clear()
    this.subscribers.clear()
    this.aggregateRebuilders.clear()
    this.sagaLog = []
    this.globalPos = 0
  }

  // -------- Federation --------
  async appendWithRetry(events: DomainEvent[], expectedVersion?: number, attempts = 3): Promise<EventRecord[]> {
    return withRetry(async () => this.append(events, expectedVersion), { maxAttempts: attempts, baseDelayMs: 50, maxDelayMs: 1000, jitter: true, retryOnStatus: [] })
  }

  // -------- helpers --------
  private genId(): string {
    let h = 0xdeadbeef
    for (let i = 0; i < 8; i++) h = (h ^ Math.floor(Math.random() * 0xffffffff)) >>> 0
    return h.toString(16)
  }
}

let _instance: EventStore | null = null
export function getEventStore(): EventStore { if (!_instance) _instance = new EventStore(); return _instance }
export function resetEventStore(): void { _instance = null }
export { EventStore as default }
