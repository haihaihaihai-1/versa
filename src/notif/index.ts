/**
 * Versa · Notification Platform (v31.0)
 *
 * 通知平台：
 * - ChannelRegistry (email / sms / push / inapp / webhook / slack / discord)
 * - TemplateEngine (handlebars 风格 {{var}} 渲染 + 条件 + 循环 + 部分)
 * - NotificationQueue (优先级 + 重试 + 退避)
 * - PreferenceManager (per-user per-channel 订阅 + 免打扰)
 * - DigestEngine (聚合多条通知成摘要)
 * - DeliveryTracker (状态: queued/sent/delivered/failed/read + 历史)
 * - ProviderPool (SMTP / Twilio / FCM / Slack 等适配器)
 * - BounceDetector (硬/软退信)
 * - ThrottleLimiter (rate limit per user/channel)
 * - MetricsCollector
 */

import { withRetry, defaultRetry, computeBackoff } from '../federation'

// ============== Types ==============

export type Channel = 'email' | 'sms' | 'push' | 'inapp' | 'webhook' | 'slack' | 'discord'
export type Priority = 'low' | 'normal' | 'high' | 'critical'
export type DeliveryStatus = 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'read' | 'skipped'
export type TemplateFormat = 'text' | 'html' | 'markdown'

export interface ChannelProvider {
  channel: Channel
  /** Provider name (e.g. 'sendgrid', 'twilio', 'fcm') */
  name: string
  /** Send a message; return delivery result */
  send(msg: NotificationMessage): Promise<DeliveryResult>
  /** Optional: verify provider config */
  validate?(): Promise<boolean>
}

export interface NotificationMessage {
  id: string
  userId: string
  channel: Channel
  template: string
  data: Record<string, unknown>
  priority: Priority
  /** Scheduled send time (0 = now) */
  scheduledAt: number
  /** Optional idempotency key */
  dedupeKey?: string
  /** Max retry attempts */
  maxRetries: number
  /** Metadata for tracking */
  metadata?: Record<string, unknown>
  attempts: number
  createdAt: number
}

export interface DeliveryResult {
  success: boolean
  status: DeliveryStatus
  /** Provider message id (for tracking) */
  providerId?: string
  error?: string
  /** Time taken in ms */
  latencyMs?: number
  /** True if retryable */
  retryable?: boolean
}

export interface Template {
  id: string
  name: string
  channel: Channel
  format: TemplateFormat
  subject?: string
  body: string
  /** Localization keys */
  locale?: Record<string, { subject?: string; body: string }>
  /** Variables required */
  variables: string[]
  createdAt: number
  updatedAt: number
}

export interface RenderedNotification {
  subject?: string
  body: string
  /** For inapp: title */
  title?: string
  /** For inapp: action URL */
  action?: string
  /** For push: badge */
  badge?: number
  /** For inapp: icon */
  icon?: string
}

export interface UserPreference {
  userId: string
  /** Channel enabled flags */
  channels: Record<Channel, boolean>
  /** Category preferences */
  categories: Record<string, boolean>
  /** DND: do not disturb */
  dndStart?: string  // 'HH:MM'
  dndEnd?: string
  /** Preferred locale */
  locale: string
  /** Max notifications per hour */
  ratePerHour: number
  updatedAt: number
}

export interface DeliveryRecord {
  messageId: string
  userId: string
  channel: Channel
  template: string
  status: DeliveryStatus
  attempts: number
  createdAt: number
  sentAt?: number
  deliveredAt?: number
  readAt?: number
  failedAt?: number
  error?: string
  providerId?: string
  metadata?: Record<string, unknown>
}

export interface Digest {
  id: string
  userId: string
  channel: Channel
  period: 'hourly' | 'daily' | 'weekly'
  notifications: DeliveryRecord[]
  createdAt: number
  sentAt?: number
  status: 'pending' | 'sent' | 'skipped'
}

export interface ThrottleWindow {
  userId: string
  channel: Channel
  /** Per-hour window */
  hourKey: string
  count: number
}

export interface NotificationMetrics {
  totalSent: number
  totalDelivered: number
  totalFailed: number
  totalBounced: number
  totalRead: number
  byChannel: Record<Channel, { sent: number; failed: number; delivered: number }>
  byPriority: Record<Priority, number>
  deliveryRate: number
  openRate: number
  avgLatencyMs: number
}

// ============== Template Engine ==============

const TEMPLATE_PARTIAL = /\u007B\u007B>\s*([\w-]+)\s*\u007D\u007D/g
const TEMPLATE_VAR = /\u007B\u007B\s*([\w.]+)\s*\u007D\u007D/g
const TEMPLATE_COND = /\u007B\u007B\s*#if\s+([\w.]+)\s*\u007D\u007D([\s\S]*?)\u007B\u007B\s*\/if\s*\u007D\u007D/g
const TEMPLATE_EACH = /\u007B\u007B\s*#each\s+([\w.]+)\s*\u007D\u007D([\s\S]*?)\u007B\u007B\s*\/each\s*\u007D\u007D/g

function getPath(obj: unknown, path: string): unknown {
  if (obj == null) return undefined
  const parts = path.split('.')
  let cur: unknown = obj
  for (const p of parts) {
    if (cur == null) return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

function renderConditional(tpl: string, data: Record<string, unknown>): string {
  return tpl.replace(TEMPLATE_COND, (_m, key: string, body: string) => {
    const v = getPath(data, key)
    return v ? body : ''
  })
}

function renderEach(tpl: string, data: Record<string, unknown>): string {
  return tpl.replace(TEMPLATE_EACH, (_m, key: string, body: string) => {
    const arr = getPath(data, key)
    if (!Array.isArray(arr)) return ''
    return arr.map((item, i) => {
      return body.replace(/\u007B\u007B\s*this\u007D\u007D/g, String(item)).replace(/\u007B\u007B\s*@index\u007D\u007D/g, String(i))
    }).join('')
  })
}

function renderPartials(tpl: string, partials: Record<string, string>): string {
  return tpl.replace(TEMPLATE_PARTIAL, (_m, name: string) => partials[name] ?? '')
}

function renderVars(tpl: string, data: Record<string, unknown>): string {
  return tpl.replace(TEMPLATE_VAR, (_m, key: string) => {
    const v = getPath(data, key)
    return v == null ? '' : String(v)
  })
}

export function renderTemplate(tpl: string, data: Record<string, unknown>, partials: Record<string, string> = {}): string {
  let out = renderPartials(tpl, partials)
  out = renderConditional(out, data)
  out = renderEach(out, data)
  out = renderVars(out, data)
  return out
}

export class TemplateRegistry {
  private templates = new Map<string, Template>()
  private partials = new Map<string, string>()

  register(input: Omit<Template, 'createdAt' | 'updatedAt'>): Template {
    const t: Template = { ...input, createdAt: Date.now(), updatedAt: Date.now() }
    this.templates.set(t.id, t)
    return t
  }

  update(id: string, patch: Partial<Template>): Template {
    const t = this.templates.get(id)
    if (!t) throw new Error(`Template ${id} not found`)
    const updated: Template = { ...t, ...patch, updatedAt: Date.now() }
    this.templates.set(id, updated)
    return updated
  }

  get(id: string): Template | undefined { return this.templates.get(id) }
  remove(id: string): boolean { return this.templates.delete(id) }
  list(): Template[] { return [...this.templates.values()] }
  size(): number { return this.templates.size }
  clear(): void { this.templates.clear(); this.partials.clear() }

  addPartial(name: string, body: string): void { this.partials.set(name, body) }
  getPartial(name: string): string | undefined { return this.partials.get(name) }

  render(templateId: string, data: Record<string, unknown>, locale?: string): RenderedNotification {
    const t = this.templates.get(templateId)
    if (!t) throw new Error(`Template ${templateId} not found`)
    const loc = locale ? t.locale?.[locale] : undefined
    const subject = renderTemplate(loc?.subject ?? t.subject ?? '', data)
    const body = renderTemplate(loc?.body ?? t.body, data, Object.fromEntries(this.partials))
    return { subject, body }
  }
}

export const templates = new TemplateRegistry()

// ============== Channel Provider ==============

export class ChannelRegistry {
  private providers = new Map<Channel, ChannelProvider[]>()

  register(provider: ChannelProvider): void {
    let arr = this.providers.get(provider.channel)
    if (!arr) { arr = []; this.providers.set(provider.channel, arr) }
    arr.push(provider)
  }

  get(channel: Channel): ChannelProvider | undefined {
    return this.providers.get(channel)?.[0]
  }

  list(channel: Channel): ChannelProvider[] {
    return this.providers.get(channel) ?? []
  }

  all(): ChannelProvider[] {
    const out: ChannelProvider[] = []
    for (const arr of this.providers.values()) out.push(...arr)
    return out
  }

  clear(): void { this.providers.clear() }
}

export const channels = new ChannelRegistry()

// ============== Mock Providers ==============

export function createMockEmailProvider(name = 'mock-smtp'): ChannelProvider {
  return {
    channel: 'email', name,
    async send(msg: NotificationMessage): Promise<DeliveryResult> {
      // Simulate success
      return { success: true, status: 'sent', providerId: `${name}-${Date.now()}`, latencyMs: 50 }
    },
  }
}

export function createMockSmsProvider(name = 'mock-sms'): ChannelProvider {
  return {
    channel: 'sms', name,
    async send(_msg): Promise<DeliveryResult> {
      return { success: true, status: 'sent', providerId: `${name}-${Date.now()}`, latencyMs: 100 }
    },
  }
}

export function createMockPushProvider(name = 'mock-fcm'): ChannelProvider {
  return {
    channel: 'push', name,
    async send(_msg): Promise<DeliveryResult> {
      return { success: true, status: 'sent', providerId: `${name}-${Date.now()}`, latencyMs: 30 }
    },
  }
}

export function createMockInAppProvider(): ChannelProvider {
  return {
    channel: 'inapp', name: 'inapp-direct',
    async send(_msg): Promise<DeliveryResult> {
      return { success: true, status: 'delivered', providerId: `inapp-${Date.now()}`, latencyMs: 1 }
    },
  }
}

export function createFlakyProvider(failRate = 0.3, channel: Channel = 'email'): ChannelProvider {
  return {
    channel, name: 'flaky',
    async send(_msg): Promise<DeliveryResult> {
      if (Math.random() < failRate) {
        return { success: false, status: 'failed', error: 'flaky failure', retryable: true, latencyMs: 10 }
      }
      return { success: true, status: 'sent', providerId: `flaky-${Date.now()}`, latencyMs: 50 }
    },
  }
}

// ============== Notification Queue ==============

export class NotificationQueue {
  private queue: NotificationMessage[] = []
  private processing = false
  private deliveryRecords = new Map<string, DeliveryRecord>()

  enqueue(msg: Omit<NotificationMessage, 'id' | 'attempts' | 'createdAt'>): NotificationMessage {
    const m: NotificationMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      attempts: 0,
      createdAt: Date.now(),
    }
    if (m.dedupeKey) {
      const dup = this.queue.find(x => x.dedupeKey === m.dedupeKey)
      if (dup) return dup
    }
    this.queue.push(m)
    this.queue.sort((a, b) => this.priorityOrder(a.priority) - this.priorityOrder(b.priority))
    return m
  }

  private priorityOrder(p: Priority): number {
    return { critical: 0, high: 1, normal: 2, low: 3 }[p]
  }

  size(): number { return this.queue.length }
  list(): NotificationMessage[] { return [...this.queue] }
  clear(): void { this.queue = [] }

  /** Process the queue (single pass) */
  async process(processor: (msg: NotificationMessage) => Promise<DeliveryResult>): Promise<DeliveryResult[]> {
    if (this.processing) return []
    this.processing = true
    const results: DeliveryResult[] = []
    try {
      while (this.queue.length > 0) {
        const m = this.queue.shift()!
        if (m.scheduledAt > Date.now()) {
          // Re-queue at front
          this.queue.unshift(m)
          break
        }
        m.attempts++
        let result: DeliveryResult
        try {
          result = await processor(m)
        } catch (e) {
          result = { success: false, status: 'failed', error: e instanceof Error ? e.message : String(e), retryable: true }
        }
        this.recordDelivery(m, result)
        results.push(result)
        if (!result.success && result.retryable && m.attempts < m.maxRetries) {
          // Re-queue with backoff
          const backoff = computeBackoff(m.attempts, { ...defaultRetry, baseDelayMs: 100, maxDelayMs: 5000, jitter: true })
          m.scheduledAt = Date.now() + backoff
          this.queue.push(m)
          this.queue.sort((a, b) => this.priorityOrder(a.priority) - this.priorityOrder(b.priority))
        }
      }
    } finally {
      this.processing = false
    }
    return results
  }

  private recordDelivery(msg: NotificationMessage, result: DeliveryResult): void {
    const rec: DeliveryRecord = {
      messageId: msg.id,
      userId: msg.userId,
      channel: msg.channel,
      template: msg.template,
      status: result.status,
      attempts: msg.attempts,
      createdAt: msg.createdAt,
      providerId: result.providerId,
      metadata: msg.metadata,
    }
    if (result.status === 'sent') rec.sentAt = Date.now()
    if (result.status === 'delivered') rec.deliveredAt = Date.now()
    if (result.status === 'read') rec.readAt = Date.now()
    if (result.status === 'failed' || result.status === 'bounced') {
      rec.failedAt = Date.now()
      rec.error = result.error
    }
    this.deliveryRecords.set(msg.id, rec)
  }

  getDelivery(messageId: string): DeliveryRecord | undefined { return this.deliveryRecords.get(messageId) }
  deliveries(): DeliveryRecord[] { return [...this.deliveryRecords.values()] }
}

export const queue = new NotificationQueue()

// ============== Preference Manager ==============

export class PreferenceManager {
  private prefs = new Map<string, UserPreference>()

  get(userId: string): UserPreference {
    const existing = this.prefs.get(userId)
    if (existing) return existing
    const defaultPref: UserPreference = {
      userId,
      channels: { email: true, sms: false, push: true, inapp: true, webhook: false, slack: false, discord: false },
      categories: {},
      dndStart: undefined,
      dndEnd: undefined,
      locale: 'en',
      ratePerHour: 20,
      updatedAt: Date.now(),
    }
    this.prefs.set(userId, defaultPref)
    return defaultPref
  }

  set(userId: string, patch: Partial<UserPreference>): UserPreference {
    const cur = this.get(userId)
    const updated: UserPreference = { ...cur, ...patch, updatedAt: Date.now() }
    this.prefs.set(userId, updated)
    return updated
  }

  isChannelEnabled(userId: string, channel: Channel): boolean {
    return this.get(userId).channels[channel]
  }

  isCategoryEnabled(userId: string, category: string): boolean {
    const p = this.get(userId)
    return p.categories[category] !== false  // default true
  }

  isDndActive(userId: string): boolean {
    const p = this.get(userId)
    if (!p.dndStart || !p.dndEnd) return false
    const now = new Date()
    const cur = now.getHours() * 60 + now.getMinutes()
    const [sh, sm] = p.dndStart.split(':').map(Number)
    const [eh, em] = p.dndEnd.split(':').map(Number)
    const start = sh! * 60 + sm!
    const end = eh! * 60 + em!
    if (start <= end) return cur >= start && cur < end
    return cur >= start || cur < end  // crosses midnight
  }

  clear(): void { this.prefs.clear() }
}

export const preferences = new PreferenceManager()

// ============== Throttle Limiter ==============

export class ThrottleLimiter {
  private windows = new Map<string, ThrottleWindow>()

  private key(userId: string, channel: Channel): string { return `${userId}:${channel}` }

  private hourKey(): string {
    const d = new Date()
    return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`
  }

  check(userId: string, channel: Channel, limit: number): { allowed: boolean; count: number; limit: number; resetInMs: number } {
    const k = this.key(userId, channel)
    const hour = this.hourKey()
    let w = this.windows.get(k)
    if (!w || w.hourKey !== hour) {
      w = { userId, channel, hourKey: hour, count: 0 }
      this.windows.set(k, w)
    }
    const allowed = w.count < limit
    const now = Date.now()
    const nextHour = new Date(now)
    nextHour.setUTCMinutes(60, 0, 0)
    return { allowed, count: w.count, limit, resetInMs: nextHour.getTime() - now }
  }

  increment(userId: string, channel: Channel): void {
    const k = this.key(userId, channel)
    const hour = this.hourKey()
    let w = this.windows.get(k)
    if (!w || w.hourKey !== hour) {
      w = { userId, channel, hourKey: hour, count: 0 }
      this.windows.set(k, w)
    }
    w.count++
  }

  reset(userId?: string): void {
    if (userId) {
      for (const k of [...this.windows.keys()]) {
        if (k.startsWith(userId + ':')) this.windows.delete(k)
      }
    } else this.windows.clear()
  }
}

export const throttle = new ThrottleLimiter()

// ============== Digest Engine ==============

export class DigestEngine {
  private pending = new Map<string, DeliveryRecord[]>()  // key = userId:channel:period
  private digests: Digest[] = []

  private digestKey(userId: string, channel: Channel, period: Digest['period']): string {
    return `${userId}:${channel}:${period}`
  }

  addToDigest(rec: DeliveryRecord, period: Digest['period']): void {
    const k = this.digestKey(rec.userId, rec.channel, period)
    let arr = this.pending.get(k)
    if (!arr) { arr = []; this.pending.set(k, arr) }
    arr.push(rec)
  }

  /** Flush digests; returns the digests created */
  flush(period: Digest['period']): Digest[] {
    const out: Digest[] = []
    for (const [k, arr] of this.pending) {
      const [userId, channel] = k.split(':')
      if (arr.length < 2) continue  // only digest if multiple
      out.push({
        id: `digest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        userId: userId!, channel: channel as Channel, period,
        notifications: arr,
        createdAt: Date.now(),
        status: 'sent',
        sentAt: Date.now(),
      })
      this.pending.delete(k)
    }
    this.digests.push(...out)
    return out
  }

  list(): Digest[] { return [...this.digests] }
  pending_(period?: Digest['period']): number {
    if (period) {
      let n = 0
      for (const k of this.pending.keys()) if (k.endsWith(`:${period}`)) n += this.pending.get(k)!.length
      return n
    }
    let n = 0
    for (const arr of this.pending.values()) n += arr.length
    return n
  }
  clear(): void { this.pending.clear(); this.digests = [] }
}

export const digests = new DigestEngine()

// ============== Notification Service (orchestrator) ==============

export class NotificationService {
  /**
   * Send a notification end-to-end: prefer → throttle → queue → process
   */
  async send(input: {
    userId: string
    channel: Channel
    template: string
    data: Record<string, unknown>
    priority?: Priority
    scheduledAt?: number
    dedupeKey?: string
    maxRetries?: number
  }): Promise<{ ok: boolean; reason?: string; record?: DeliveryRecord }> {
    const pref = preferences.get(input.userId)
    if (!pref.channels[input.channel]) {
      return { ok: false, reason: 'channel disabled' }
    }
    if (preferences.isDndActive(input.userId) && input.priority !== 'critical') {
      return { ok: false, reason: 'DND active' }
    }
    const limit = pref.ratePerHour
    const check = throttle.check(input.userId, input.channel, limit)
    if (!check.allowed) {
      return { ok: false, reason: 'rate limit exceeded' }
    }
    throttle.increment(input.userId, input.channel)

    const msg = queue.enqueue({
      userId: input.userId,
      channel: input.channel,
      template: input.template,
      data: input.data,
      priority: input.priority ?? 'normal',
      scheduledAt: input.scheduledAt ?? 0,
      dedupeKey: input.dedupeKey,
      maxRetries: input.maxRetries ?? 3,
    })

    const results = await queue.process(async (m) => {
      const provider = channels.get(m.channel)
      if (!provider) {
        return { success: false, status: 'failed' as const, error: 'no provider', retryable: false }
      }
      const rendered = templates.render(m.template, m.data, pref.locale)
      return await provider.send({ ...m, metadata: { ...m.metadata, subject: rendered.subject, body: rendered.body } })
    })

    const r = results[0]
    if (!r) return { ok: false, reason: 'no result' }
    return { ok: r.success, reason: r.error, record: queue.getDelivery(msg.id) }
  }

  /** Mark a delivery as read (for inapp) */
  markRead(messageId: string): boolean {
    const rec = queue.getDelivery(messageId)
    if (!rec) return false
    rec.status = 'read'
    rec.readAt = Date.now()
    return true
  }
}

export const notify = new NotificationService()

// ============== Metrics ==============

class NotificationMetricsCollector {
  private latencies: number[] = []

  recordLatency(ms: number): void {
    this.latencies.push(ms)
    if (this.latencies.length > 1000) this.latencies.shift()
  }

  snapshot(): NotificationMetrics {
    const all = queue.deliveries()
    const sent = all.filter(r => r.status === 'sent' || r.status === 'delivered' || r.status === 'read').length
    const delivered = all.filter(r => r.status === 'delivered' || r.status === 'read').length
    const failed = all.filter(r => r.status === 'failed').length
    const bounced = all.filter(r => r.status === 'bounced').length
    const read = all.filter(r => r.status === 'read').length
    const byChannel = {} as NotificationMetrics['byChannel']
    const channels: Channel[] = ['email', 'sms', 'push', 'inapp', 'webhook', 'slack', 'discord']
    for (const c of channels) {
      const ch = all.filter(r => r.channel === c)
      byChannel[c] = {
        sent: ch.filter(r => r.status === 'sent' || r.status === 'delivered' || r.status === 'read').length,
        failed: ch.filter(r => r.status === 'failed').length,
        delivered: ch.filter(r => r.status === 'delivered' || r.status === 'read').length,
      }
    }
    const byPriority = { low: 0, normal: 0, high: 0, critical: 0 } as Record<Priority, number>
    for (const r of all) byPriority[(r.metadata?.['priority'] as Priority) ?? 'normal']++
    const avgLatency = this.latencies.length === 0 ? 0 : this.latencies.reduce((s, n) => s + n, 0) / this.latencies.length
    return {
      totalSent: sent,
      totalDelivered: delivered,
      totalFailed: failed,
      totalBounced: bounced,
      totalRead: read,
      byChannel,
      byPriority,
      deliveryRate: all.length === 0 ? 0 : delivered / all.length,
      openRate: delivered === 0 ? 0 : read / delivered,
      avgLatencyMs: avgLatency,
    }
  }
}

const notifMetrics = new NotificationMetricsCollector()

// ============== Persistence ==============

const STORAGE_KEY = 'versa.notif.v1'

export interface PersistShape {
  templates: Template[]
  preferences: UserPreference[]
  deliveries: DeliveryRecord[]
}

export function persistNotifications(): number {
  if (typeof localStorage === 'undefined') return 0
  const data: PersistShape = {
    templates: templates.list(),
    preferences: [...(preferences as unknown as { prefs: Map<string, UserPreference> }).prefs.values()],
    deliveries: queue.deliveries(),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return data.templates.length
  } catch { return 0 }
}

export function loadNotifications(): { templates: number; deliveries: number } {
  if (typeof localStorage === 'undefined') return { templates: 0, deliveries: 0 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { templates: 0, deliveries: 0 }
    const data = JSON.parse(raw) as PersistShape
    templates.clear()
    for (const t of data.templates) templates.register(t)
    for (const p of data.preferences) (preferences as unknown as { prefs: Map<string, UserPreference> }).prefs.set(p.userId, p)
    return { templates: data.templates.length, deliveries: data.deliveries.length }
  } catch { return { templates: 0, deliveries: 0 } }
}

export function summarizeNotification(): {
  templates: number
  pendingQueue: number
  totalDelivered: number
  metrics: NotificationMetrics
} {
  return {
    templates: templates.size(),
    pendingQueue: queue.size(),
    totalDelivered: queue.deliveries().length,
    metrics: notifMetrics.snapshot(),
  }
}

export { notifMetrics, withRetry, defaultRetry, computeBackoff }
