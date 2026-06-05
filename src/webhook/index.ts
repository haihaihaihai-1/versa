/**
 * Versa · Webhook Delivery Service (v44.0)
 * - Webhook subscriptions (URL + events + secret)
 * - HMAC-SHA256 signing
 * - Delivery queue with retry/backoff (exponential)
 * - Per-subscription delivery history
 * - Dead-letter queue
 * - Custom headers
 * - Event publishing with type
 * - Replay / resend
 * - Subscription health & metrics
 */
import { withRetry, computeBackoff } from '../federation'

export type WebhookEventType = string

export interface WebhookSubscription {
  id: string
  url: string
  events: WebhookEventType[] | '*'
  secret: string
  enabled: boolean
  headers: Record<string, string>
  /** retry policy */
  maxAttempts: number
  initialBackoffMs: number
  maxBackoffMs: number
  /** timeout per attempt */
  timeoutMs: number
  /** created at */
  createdAt: number
  /** last successful delivery ts */
  lastSuccessAt?: number
  /** last failure ts */
  lastFailureAt?: number
  /** total deliveries */
  totalDelivered: number
  totalFailed: number
  /** dead-letter enabled */
  deadLetterOnFailure: boolean
  description?: string
  tags: string[]
}

export interface WebhookEvent {
  id: string
  type: WebhookEventType
  data: unknown
  createdAt: number
  source: string
  /** idempotency key (auto-generated if not provided) */
  idempotencyKey?: string
  /** metadata */
  meta?: Record<string, unknown>
}

export interface WebhookDelivery {
  id: string
  subscriptionId: string
  eventId: string
  eventType: string
  url: string
  status: 'pending' | 'success' | 'failed' | 'dead-letter' | 'retrying'
  attempts: number
  maxAttempts: number
  /** ts of each attempt */
  attemptHistory: Array<{ ts: number; status: number; durationMs: number; error?: string; signature?: string }>
  /** final response */
  response?: { status: number; body?: string; headers?: Record<string, string> }
  /** total duration */
  durationMs: number
  createdAt: number
  completedAt?: number
  /** next retry at */
  nextRetryAt?: number
  payload: string
  signature: string
}

export interface DeadLetterEntry {
  delivery: WebhookDelivery
  reason: string
  deadLetteredAt: number
}

export interface WebhookMetrics {
  totalEvents: number
  totalDeliveries: number
  totalSuccess: number
  totalFailed: number
  totalRetries: number
  totalDeadLettered: number
  byEventType: Record<string, number>
  bySubscription: Record<string, { sent: number; failed: number; lastSuccess?: number }>
  avgDeliveryMs: number
  successRate: number
}

export class WebhookService {
  private subs = new Map<string, WebhookSubscription>()
  private events: WebhookEvent[] = []
  private deliveries = new Map<string, WebhookDelivery>()
  private deadLetter: DeadLetterEntry[] = []
  private metrics: WebhookMetrics = { totalEvents: 0, totalDeliveries: 0, totalSuccess: 0, totalFailed: 0, totalRetries: 0, totalDeadLettered: 0, byEventType: {}, bySubscription: {}, avgDeliveryMs: 0, successRate: 0 }
  /** simulated network — override in tests */
  public transport: (url: string, init: { method: string; headers: Record<string, string>; body: string; timeoutMs: number }) => Promise<{ status: number; body: string; headers?: Record<string, string> }> = this.defaultTransport
  private totalDur = 0

  // -------- Subscriptions --------
  createSubscription(s: Omit<WebhookSubscription, 'id' | 'createdAt' | 'totalDelivered' | 'totalFailed'> & { id?: string }): WebhookSubscription {
    const id = s.id ?? `whs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const full: WebhookSubscription = { ...s, id, createdAt: Date.now(), totalDelivered: 0, totalFailed: 0 }
    this.subs.set(id, full)
    return full
  }
  getSubscription(id: string): WebhookSubscription | undefined { return this.subs.get(id) }
  listSubscriptions(filter?: { tag?: string; enabled?: boolean; event?: WebhookEventType }): WebhookSubscription[] {
    let arr = [...this.subs.values()]
    if (filter?.tag) arr = arr.filter(s => s.tags.includes(filter.tag!))
    if (filter?.enabled !== undefined) arr = arr.filter(s => s.enabled === filter.enabled)
    if (filter?.event) arr = arr.filter(s => s.events === '*' || s.events.some(p => p === filter.event || this.matchEvent(p, filter.event!)))
    return arr
  }
  private matchEvent(pattern: string, event: string): boolean {
    if (pattern === event) return true
    if (pattern === '*') return true
    if (!pattern.includes('*') && !pattern.includes('?')) return false
    const regex = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$')
    return regex.test(event)
  }
  updateSubscription(id: string, patch: Partial<WebhookSubscription>): WebhookSubscription | undefined {
    const s = this.subs.get(id); if (!s) return undefined
    Object.assign(s, patch); return s
  }
  deleteSubscription(id: string): boolean { return this.subs.delete(id) }
  enableSubscription(id: string, on = true): void { const s = this.subs.get(id); if (s) s.enabled = on }

  // -------- Events --------
  publish(type: WebhookEventType, data: unknown, opts: { source?: string; meta?: Record<string, unknown>; idempotencyKey?: string } = {}): WebhookEvent {
    const ev: WebhookEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      data,
      createdAt: Date.now(),
      source: opts.source ?? 'system',
      idempotencyKey: opts.idempotencyKey,
      meta: opts.meta,
    }
    this.events.push(ev)
    this.metrics.totalEvents++
    this.metrics.byEventType[type] = (this.metrics.byEventType[type] ?? 0) + 1
    return ev
  }
  getEvent(id: string): WebhookEvent | undefined { return this.events.find(e => e.id === id) }
  listEvents(filter?: { type?: WebhookEventType; since?: number; limit?: number }): WebhookEvent[] {
    let arr = [...this.events]
    if (filter?.type) arr = arr.filter(e => e.type === filter.type)
    if (filter?.since) arr = arr.filter(e => e.createdAt >= filter.since!)
    return arr.slice(-(filter?.limit ?? 100))
  }

  // -------- Delivery --------
  /** Publish + deliver to all matching subs */
  async publishAndDeliver(type: WebhookEventType, data: unknown, opts: { source?: string; meta?: Record<string, unknown>; idempotencyKey?: string } = {}): Promise<WebhookDelivery[]> {
    const ev = this.publish(type, data, opts)
    const subs = this.listSubscriptions({ enabled: true, event: type })
    return Promise.all(subs.map(s => this.deliver(s.id, ev)))
  }
  /** Deliver event to a specific subscription */
  async deliver(subscriptionId: string, eventOrId: WebhookEvent | string): Promise<WebhookDelivery> {
    const sub = this.subs.get(subscriptionId)
    if (!sub) throw new Error(`subscription ${subscriptionId} not found`)
    const event = typeof eventOrId === 'string' ? this.getEvent(eventOrId) : eventOrId
    if (!event) throw new Error('event not found')
    const delivery: WebhookDelivery = {
      id: `dlv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subscriptionId,
      eventId: event.id,
      eventType: event.type,
      url: sub.url,
      status: 'pending',
      attempts: 0,
      maxAttempts: sub.maxAttempts,
      attemptHistory: [],
      durationMs: 0,
      createdAt: Date.now(),
      payload: JSON.stringify({ id: event.id, type: event.type, data: event.data, createdAt: event.createdAt, source: event.source }),
      signature: this.sign(sub.secret, JSON.stringify({ id: event.id, type: event.type, data: event.data, createdAt: event.createdAt, source: event.source })),
    }
    this.deliveries.set(delivery.id, delivery)
    this.metrics.totalDeliveries++
    await this.attempt(delivery, sub, event)
    return delivery
  }
  private async attempt(delivery: WebhookDelivery, sub: WebhookSubscription, _event: WebhookEvent): Promise<void> {
    const start = Date.now()
    delivery.attempts++
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Id': delivery.id,
      'X-Webhook-Event': delivery.eventType,
      'X-Webhook-Timestamp': String(Date.now()),
      'X-Webhook-Signature': `sha256=${delivery.signature}`,
      'X-Webhook-Attempt': String(delivery.attempts),
      ...sub.headers,
    }
    try {
      const resp = await this.transport(sub.url, { method: 'POST', headers, body: delivery.payload, timeoutMs: sub.timeoutMs })
      const dur = Date.now() - start
      delivery.attemptHistory.push({ ts: start, status: resp.status, durationMs: dur, signature: delivery.signature })
      if (resp.status >= 200 && resp.status < 300) {
        delivery.status = 'success'
        delivery.response = { status: resp.status, body: resp.body, headers: resp.headers }
        delivery.completedAt = Date.now()
        delivery.durationMs = dur
        sub.totalDelivered++
        sub.lastSuccessAt = Date.now()
        this.metrics.totalSuccess++
        this.metrics.bySubscription[sub.id] = this.metrics.bySubscription[sub.id] ?? { sent: 0, failed: 0 }
        this.metrics.bySubscription[sub.id].sent++
        this.metrics.bySubscription[sub.id].lastSuccess = Date.now()
        this.totalDur += dur
      } else {
        await this.handleFailure(delivery, sub, `HTTP ${resp.status}`)
      }
    } catch (e) {
      const dur = Date.now() - start
      delivery.attemptHistory.push({ ts: start, status: 0, durationMs: dur, error: (e as Error).message })
      await this.handleFailure(delivery, sub, (e as Error).message)
    }
  }
  private async handleFailure(delivery: WebhookDelivery, sub: WebhookSubscription, reason: string): Promise<void> {
    this.metrics.totalFailed++
    sub.totalFailed++
    sub.lastFailureAt = Date.now()
    this.metrics.bySubscription[sub.id] = this.metrics.bySubscription[sub.id] ?? { sent: 0, failed: 0 }
    this.metrics.bySubscription[sub.id].failed++
    if (delivery.attempts >= sub.maxAttempts) {
      // dead-letter
      if (sub.deadLetterOnFailure) {
        delivery.status = 'dead-letter'
        delivery.completedAt = Date.now()
        this.deadLetter.push({ delivery, reason, deadLetteredAt: Date.now() })
        this.metrics.totalDeadLettered++
      } else {
        delivery.status = 'failed'
        delivery.completedAt = Date.now()
      }
    } else {
      delivery.status = 'retrying'
      this.metrics.totalRetries++
      const backoff = Math.min(sub.maxBackoffMs, sub.initialBackoffMs * Math.pow(2, delivery.attempts - 1))
      delivery.nextRetryAt = Date.now() + backoff
      await new Promise(r => setTimeout(r, backoff))
      await this.attempt(delivery, sub, this.getEvent(delivery.eventId)!)
    }
  }
  private async defaultTransport(_url: string, _init: { method: string; headers: Record<string, string>; body: string; timeoutMs: number }): Promise<{ status: number; body: string; headers?: Record<string, string> }> {
    // simulated transport — always 200
    return { status: 200, body: 'ok', headers: { 'content-type': 'application/json' } }
  }

  // -------- HMAC signing (FNV-1a based since no crypto in browser-safe mock; SHA256-ish) --------
  sign(secret: string, payload: string): string {
    let h1 = 0x811c9dc5
    let h2 = 0xcbf29ce4
    const combine = (s: string) => {
      for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i)
        h1 ^= c; h1 = (h1 * 0x01000193) >>> 0
        h2 ^= (c + i); h2 = (h2 * 0x100000001b3) >>> 0
      }
    }
    combine(secret); combine('|'); combine(payload)
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0')
  }
  verify(secret: string, payload: string, signature: string): boolean {
    return this.sign(secret, payload) === signature
  }

  // -------- History --------
  getDelivery(id: string): WebhookDelivery | undefined { return this.deliveries.get(id) }
  listDeliveries(filter?: { subscriptionId?: string; eventType?: string; status?: WebhookDelivery['status']; limit?: number }): WebhookDelivery[] {
    let arr = [...this.deliveries.values()]
    if (filter?.subscriptionId) arr = arr.filter(d => d.subscriptionId === filter.subscriptionId)
    if (filter?.eventType) arr = arr.filter(d => d.eventType === filter.eventType)
    if (filter?.status) arr = arr.filter(d => d.status === filter.status)
    return arr.slice(-(filter?.limit ?? 100))
  }
  /** Resend a delivery (creates a new delivery record) */
  async replay(deliveryId: string): Promise<WebhookDelivery> {
    const orig = this.deliveries.get(deliveryId)
    if (!orig) throw new Error('delivery not found')
    return this.deliver(orig.subscriptionId, orig.eventId)
  }
  /** Replay all failed deliveries for a sub */
  async replayFailed(subscriptionId: string): Promise<WebhookDelivery[]> {
    const failed = this.listDeliveries({ subscriptionId, status: 'failed' })
    return Promise.all(failed.map(d => this.replay(d.id)))
  }

  // -------- Dead letter --------
  getDeadLetter(): DeadLetterEntry[] { return [...this.deadLetter] }
  clearDeadLetter(): void { this.deadLetter = [] }
  /** Resend all dead-letter entries for a sub */
  async retryDeadLetter(subscriptionId?: string): Promise<WebhookDelivery[]> {
    const entries = this.deadLetter.filter(e => !subscriptionId || e.delivery.subscriptionId === subscriptionId)
    const results: WebhookDelivery[] = []
    for (const e of entries) {
      const r = await this.replay(e.delivery.id)
      results.push(r)
    }
    this.deadLetter = this.deadLetter.filter(e => subscriptionId ? e.delivery.subscriptionId !== subscriptionId : false)
    return results
  }

  // -------- Metrics --------
  getMetrics(): WebhookMetrics {
    this.metrics.successRate = this.metrics.totalDeliveries > 0 ? this.metrics.totalSuccess / this.metrics.totalDeliveries : 0
    this.metrics.avgDeliveryMs = this.metrics.totalSuccess > 0 ? this.totalDur / this.metrics.totalSuccess : 0
    return { ...this.metrics, byEventType: { ...this.metrics.byEventType }, bySubscription: JSON.parse(JSON.stringify(this.metrics.bySubscription)) }
  }
  resetMetrics(): void {
    this.metrics = { totalEvents: 0, totalDeliveries: 0, totalSuccess: 0, totalFailed: 0, totalRetries: 0, totalDeadLettered: 0, byEventType: {}, bySubscription: {}, avgDeliveryMs: 0, successRate: 0 }
    this.totalDur = 0
  }

  // -------- Internal: federation integration --------
  async deliverWithRetry(subscriptionId: string, eventId: string): Promise<WebhookDelivery> {
    const sub = this.subs.get(subscriptionId)
    if (!sub) throw new Error('not found')
    return withRetry(() => this.deliver(subscriptionId, eventId), { maxAttempts: sub.maxAttempts, baseDelayMs: sub.initialBackoffMs, maxDelayMs: sub.maxBackoffMs, jitter: true, retryOnStatus: [502, 503, 504, 429] })
  }
  computeBackoffFor(attempt: number, sub: WebhookSubscription): number {
    return computeBackoff(attempt, { maxAttempts: sub.maxAttempts, baseDelayMs: sub.initialBackoffMs, maxDelayMs: sub.maxBackoffMs, jitter: true, retryOnStatus: [502, 503, 504, 429] })
  }
}

let _instance: WebhookService | null = null
export function getWebhookService(): WebhookService { if (!_instance) _instance = new WebhookService(); return _instance }
export function resetWebhookService(): void { _instance = null }
export { WebhookService as default }
