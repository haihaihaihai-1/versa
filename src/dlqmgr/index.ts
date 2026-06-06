// v69.0 Dead Letter Queue Manager — messages that failed delivery, retry with
// backoff, max attempts, parking (set aside for manual review), alerts,
// bulk replay, expiration cleanup

export type DLQStatus = 'pending' | 'retrying' | 'parked' | 'replayed' | 'expired' | 'discarded'

export interface DLQMessage<T = unknown> {
  id: string
  payload: T
  source: string
  error: string
  attempts: number
  maxAttempts: number
  status: DLQStatus
  createdAt: number
  updatedAt: number
  nextRetryAt?: number
  metadata?: Record<string, unknown>
  tags?: string[]
}

export interface DLQConfig {
  defaultMaxAttempts: number
  defaultBackoffMs: (attempt: number) => number
  expirationMs: number
  maxQueueSize: number
  // When a message is parked, emit alert
  onAlert?: (msg: DLQMessage, reason: string) => void
}

const DEFAULT_BACKOFF = (attempt: number) => Math.min(60_000, 1000 * Math.pow(2, attempt - 1))

// ─────────────────────────────────────────────────────────────────────────────
// DLQ Manager

export class DLQManager {
  private queue: Map<string, DLQMessage> = new Map()
  private cfg: DLQConfig
  private nextId = 1
  private retryTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(cfg: Partial<DLQConfig> = {}) {
    this.cfg = {
      defaultMaxAttempts: cfg.defaultMaxAttempts ?? 5,
      defaultBackoffMs: cfg.defaultBackoffMs ?? DEFAULT_BACKOFF,
      expirationMs: cfg.expirationMs ?? 7 * 24 * 60 * 60 * 1000,  // 7 days
      maxQueueSize: cfg.maxQueueSize ?? 100_000,
      onAlert: cfg.onAlert,
    }
  }

  // Add a failed message to the queue
  add<T>(payload: T, source: string, error: string, options: { maxAttempts?: number; metadata?: Record<string, unknown>; tags?: string[] } = {}): DLQMessage<T> {
    if (this.queue.size >= this.cfg.maxQueueSize) {
      throw new Error('DLQ is full')
    }
    const id = `dlq_${Date.now()}_${this.nextId++}`
    const now = Date.now()
    const msg: DLQMessage<T> = {
      id,
      payload,
      source,
      error,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? this.cfg.defaultMaxAttempts,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      metadata: options.metadata,
      tags: options.tags,
    }
    this.queue.set(id, msg)
    this.scheduleRetry(msg)
    return msg
  }

  private scheduleRetry(msg: DLQMessage): void {
    if (msg.attempts >= msg.maxAttempts) {
      this.park(msg.id, 'max-attempts-reached')
      return
    }
    const delay = this.cfg.defaultBackoffMs(msg.attempts + 1)
    msg.nextRetryAt = Date.now() + delay
    msg.status = 'pending'
    const t = setTimeout(() => this.attemptRetry(msg.id), delay)
    this.retryTimers.set(msg.id, t)
  }

  // Trigger a retry (called by timer)
  attemptRetry(id: string): boolean {
    const msg = this.queue.get(id)
    if (!msg || msg.status === 'parked' || msg.status === 'replayed' || msg.status === 'discarded' || msg.status === 'expired') return false
    msg.attempts++
    msg.status = 'retrying'
    msg.updatedAt = Date.now()
    // Caller is responsible for calling success() or fail() on the result
    return true
  }

  // Mark retry as successful → remove from queue
  success(id: string): boolean {
    const msg = this.queue.get(id)
    if (!msg) return false
    msg.status = 'replayed'
    msg.updatedAt = Date.now()
    this.cancelTimer(id)
    this.queue.delete(id)
    return true
  }

  // Mark retry as failed → schedule next attempt
  fail(id: string, newError: string): boolean {
    const msg = this.queue.get(id)
    if (!msg) return false
    msg.error = newError
    msg.updatedAt = Date.now()
    this.scheduleRetry(msg)
    return true
  }

  // Park a message (no more retries; manual review required)
  park(id: string, reason: string): boolean {
    const msg = this.queue.get(id)
    if (!msg) return false
    msg.status = 'parked'
    msg.updatedAt = Date.now()
    this.cancelTimer(id)
    this.cfg.onAlert?.(msg, reason)
    return true
  }

  // Unpark (reset for retry)
  unpark(id: string): boolean {
    const msg = this.queue.get(id)
    if (!msg || msg.status !== 'parked') return false
    msg.attempts = 0
    msg.status = 'pending'
    msg.updatedAt = Date.now()
    this.scheduleRetry(msg)
    return true
  }

  // Discard (delete) a message
  discard(id: string): boolean {
    const msg = this.queue.get(id)
    if (!msg) return false
    msg.status = 'discarded'
    this.cancelTimer(id)
    this.queue.delete(id)
    return true
  }

  // Get a single message
  get(id: string): DLQMessage | undefined { return this.queue.get(id) }

  // List messages, filterable
  list(filter?: { status?: DLQStatus; source?: string; tag?: string }): DLQMessage[] {
    let arr = Array.from(this.queue.values())
    if (filter?.status) arr = arr.filter(m => m.status === filter.status)
    if (filter?.source) arr = arr.filter(m => m.source === filter.source)
    if (filter?.tag) arr = arr.filter(m => m.tags?.includes(filter.tag!))
    return arr
  }

  // Bulk replay all parked or all with same source
  bulkReplay(filter: { status?: DLQStatus; source?: string } = {}): number {
    const targets = this.list(filter).filter(m => m.status === 'parked' || m.status === 'pending')
    for (const m of targets) {
      m.attempts = 0
      m.status = 'pending'
      m.updatedAt = Date.now()
      this.scheduleRetry(m)
    }
    return targets.length
  }

  // Run expiration sweep: remove messages older than expirationMs
  expire(now = Date.now()): number {
    let removed = 0
    for (const [id, msg] of this.queue) {
      if (now - msg.createdAt > this.cfg.expirationMs) {
        msg.status = 'expired'
        this.cancelTimer(id)
        this.queue.delete(id)
        removed++
      }
    }
    return removed
  }

  // Get retry-eligible messages (those with scheduled retry time passed)
  readyToRetry(now = Date.now()): DLQMessage[] {
    return Array.from(this.queue.values())
      .filter(m => (m.status === 'pending' || m.status === 'retrying') && m.nextRetryAt !== undefined && m.nextRetryAt <= now)
  }

  // Force a retry attempt immediately (for testing)
  forceRetry(id: string): boolean {
    this.cancelTimer(id)
    return this.attemptRetry(id)
  }

  // Update config
  configure(cfg: Partial<DLQConfig>): void {
    this.cfg = { ...this.cfg, ...cfg }
  }

  // Metrics
  metrics(): { total: number; pending: number; retrying: number; parked: number; replayed: number; expired: number; discarded: number; oldestAgeMs: number } {
    let pending = 0, retrying = 0, parked = 0, replayed = 0, expired = 0, discarded = 0
    let oldest = Date.now()
    for (const m of this.queue.values()) {
      if (m.status === 'pending') pending++
      else if (m.status === 'retrying') retrying++
      else if (m.status === 'parked') parked++
      else if (m.status === 'replayed') replayed++
      else if (m.status === 'expired') expired++
      else if (m.status === 'discarded') discarded++
      if (m.createdAt < oldest) oldest = m.createdAt
    }
    return {
      total: this.queue.size,
      pending, retrying, parked, replayed, expired, discarded,
      oldestAgeMs: this.queue.size === 0 ? 0 : Date.now() - oldest,
    }
  }

  private cancelTimer(id: string): void {
    const t = this.retryTimers.get(id)
    if (t) {
      clearTimeout(t)
      this.retryTimers.delete(id)
    }
  }

  clear(): void {
    for (const id of this.retryTimers.keys()) this.cancelTimer(id)
    this.queue.clear()
    this.nextId = 1
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton

let _dlq: DLQManager | null = null
export function getDLQ(): DLQManager {
  if (!_dlq) _dlq = new DLQManager()
  return _dlq
}
export function resetDLQ(): void {
  _dlq?.clear()
  _dlq = null
}
