/**
 * Versa · Notification Center (v45.0)
 * - Multi-channel: in-app, email, SMS, push, webhook, slack
 * - Templates (handlebars-lite)
 * - User preferences per channel/category
 * - Delivery queue with retry
 * - Read/unread tracking
 * - Grouping & digest
 * - Localization (i18n)
 * - Rate limiting per user
 * - Scheduled send
 * - Mute / snooze
 */
import { withRetry, computeBackoff } from '../federation'

export type Channel = 'in-app' | 'email' | 'sms' | 'push' | 'webhook' | 'slack' | 'discord'

export type Priority = 'low' | 'normal' | 'high' | 'urgent'

export type Category = 'order' | 'social' | 'security' | 'system' | 'marketing' | 'transaction' | 'reminder' | 'mention'

export type Status = 'pending' | 'scheduled' | 'sent' | 'delivered' | 'failed' | 'read' | 'unread' | 'snoozed' | 'muted'

export interface NotificationTemplate {
  id: string
  name: string
  channel: Channel
  category: Category
  subject?: string
  body: string
  locale: string
  variables: string[]
  createdAt: number
}

export interface Notification {
  id: string
  userId: string
  channel: Channel
  category: Category
  priority: Priority
  subject?: string
  body: string
  data?: Record<string, unknown>
  templateId?: string
  status: Status
  attempts: number
  maxAttempts: number
  createdAt: number
  scheduledFor?: number
  sentAt?: number
  deliveredAt?: number
  readAt?: number
  failedAt?: number
  failureReason?: string
  locale: string
  groupId?: string
  expiresAt?: number
  retryAt?: number
  metadata?: Record<string, unknown>
}

export interface UserPreferences {
  userId: string
  channels: Record<Channel, { enabled: boolean; quietHoursStart?: number; quietHoursEnd?: number }>
  categories: Record<Category, { enabled: boolean; channels?: Channel[] }>
  rateLimit: { maxPerHour: number; maxPerDay: number }
  digest: { enabled: boolean; intervalMs: number; channels: Channel[] }
  snoozedUntil?: number
  mutedUntil?: number
  locale: string
  updatedAt: number
}

export interface NotificationGroup {
  id: string
  userId: string
  category: Category
  channel: Channel
  notifications: Notification[]
  digest: { lastSentAt?: number; nextDigestAt?: number }
  count: number
  unreadCount: number
  lastActivity: number
}

export interface ChannelSender {
  channel: Channel
  send: (n: Notification) => Promise<{ ok: boolean; providerId?: string; error?: string; deliveryMs?: number }>
}

export interface DeliveryStats {
  total: number
  sent: number
  delivered: number
  failed: number
  read: number
  scheduled: number
  snoozed: number
  muted: number
  byChannel: Record<Channel, number>
  byCategory: Record<Category, number>
  byPriority: Record<Priority, number>
  avgDeliveryMs: number
  readRate: number
}

const DEFAULT_CHANNELS: Channel[] = ['in-app', 'email', 'sms', 'push', 'webhook', 'slack', 'discord']

export class NotificationCenter {
  private notifications = new Map<string, Notification>()
  private templates = new Map<string, NotificationTemplate>()
  private preferences = new Map<string, UserPreferences>()
  private groups = new Map<string, NotificationGroup>()
  private senders: ChannelSender[] = []
  private stats: DeliveryStats = { total: 0, sent: 0, delivered: 0, failed: 0, read: 0, scheduled: 0, snoozed: 0, muted: 0, byChannel: {} as any, byCategory: {} as any, byPriority: {} as any, avgDeliveryMs: 0, readRate: 0 }
  private totalDur = 0
  private scheduled: ReturnType<typeof setInterval> | null = null
  private userCounters = new Map<string, { hour: number; day: number; hourResetAt: number; dayResetAt: number }>()

  // -------- Templates --------
  createTemplate(t: Omit<NotificationTemplate, 'id' | 'createdAt' | 'variables'> & { id?: string }): NotificationTemplate {
    const id = t.id ?? `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const variables = this.extractVariables(t.subject ?? '', t.body)
    const full: NotificationTemplate = { ...t, id, variables, createdAt: Date.now() }
    this.templates.set(id, full)
    return full
  }
  getTemplate(id: string): NotificationTemplate | undefined { return this.templates.get(id) }
  listTemplates(filter?: { channel?: Channel; category?: Category; locale?: string }): NotificationTemplate[] {
    let arr = [...this.templates.values()]
    if (filter?.channel) arr = arr.filter(t => t.channel === filter.channel)
    if (filter?.category) arr = arr.filter(t => t.category === filter.category)
    if (filter?.locale) arr = arr.filter(t => t.locale === filter.locale)
    return arr
  }
  updateTemplate(id: string, patch: Partial<NotificationTemplate>): NotificationTemplate | undefined {
    const t = this.templates.get(id); if (!t) return undefined
    Object.assign(t, patch)
    t.variables = this.extractVariables(t.subject ?? '', t.body)
    return t
  }
  deleteTemplate(id: string): boolean { return this.templates.delete(id) }
  private extractVariables(...texts: string[]): string[] {
    const vars = new Set<string>()
    for (const t of texts) {
      const matches = t.match(/\{\{\s*([\w.]+)\s*\}\}/g) ?? []
      for (const m of matches) vars.add(m.replace(/[{}\s]/g, ''))
    }
    return [...vars]
  }
  render(template: string, vars: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => {
      const path = k.split('.')
      let cur: any = vars
      for (const p of path) { if (cur == null) return ''; cur = cur[p] }
      return cur == null ? '' : String(cur)
    })
  }

  // -------- Preferences --------
  setPreferences(p: UserPreferences): UserPreferences {
    this.preferences.set(p.userId, p)
    return p
  }
  getPreferences(userId: string): UserPreferences | undefined { return this.preferences.get(userId) }
  getOrCreatePreferences(userId: string, locale = 'en'): UserPreferences {
    let p = this.preferences.get(userId)
    if (!p) {
      p = {
        userId,
        channels: Object.fromEntries(DEFAULT_CHANNELS.map(c => [c, { enabled: true }])) as any,
        categories: { order: { enabled: true, channels: ['in-app', 'email'] }, social: { enabled: true, channels: ['in-app'] }, security: { enabled: true, channels: ['in-app', 'email', 'sms'] }, system: { enabled: true }, marketing: { enabled: false }, transaction: { enabled: true, channels: ['in-app', 'email'] }, reminder: { enabled: true, channels: ['in-app', 'push'] }, mention: { enabled: true, channels: ['in-app', 'push'] } },
        rateLimit: { maxPerHour: 50, maxPerDay: 200 },
        digest: { enabled: false, intervalMs: 24 * 60 * 60 * 1000, channels: ['email'] },
        locale,
        updatedAt: Date.now(),
      }
      this.preferences.set(userId, p)
    }
    return p
  }
  updatePreferences(userId: string, patch: Partial<UserPreferences>): UserPreferences | undefined {
    const p = this.preferences.get(userId); if (!p) return undefined
    Object.assign(p, patch)
    p.updatedAt = Date.now()
    return p
  }
  /** Check if user accepts a notification (channels, categories, mute/snooze, rate limit) */
  isAccepted(userId: string, channel: Channel, category: Category): { accepted: boolean; reason?: string } {
    const p = this.getPreferences(userId)
    if (!p) return { accepted: true }
    if (p.mutedUntil && p.mutedUntil > Date.now()) return { accepted: false, reason: 'muted' }
    if (p.snoozedUntil && p.snoozedUntil > Date.now()) return { accepted: false, reason: 'snoozed' }
    if (!p.channels[channel]?.enabled) return { accepted: false, reason: 'channel_disabled' }
    const cat = p.categories[category]
    if (!cat?.enabled) return { accepted: false, reason: 'category_disabled' }
    if (cat.channels && !cat.channels.includes(channel)) return { accepted: false, reason: 'channel_not_in_category' }
    if (p.channels[channel].quietHoursStart != null && p.channels[channel].quietHoursEnd != null) {
      const h = new Date().getHours()
      const { quietHoursStart, quietHoursEnd } = p.channels[channel]
      const inQuiet = quietHoursStart < quietHoursEnd ? h >= quietHoursStart && h < quietHoursEnd : h >= quietHoursStart || h < quietHoursEnd
      if (inQuiet) return { accepted: false, reason: 'quiet_hours' }
    }
    const c = this.getOrCreateCounter(userId)
    if (c.hour >= p.rateLimit.maxPerHour) return { accepted: false, reason: 'rate_limit_hour' }
    if (c.day >= p.rateLimit.maxPerDay) return { accepted: false, reason: 'rate_limit_day' }
    return { accepted: true }
  }
  mute(userId: string, until: number): void { const p = this.getOrCreatePreferences(userId); p.mutedUntil = until }
  unmute(userId: string): void { const p = this.preferences.get(userId); if (p) delete p.mutedUntil }
  snooze(userId: string, until: number): void { const p = this.getOrCreatePreferences(userId); p.snoozedUntil = until }
  unsnooze(userId: string): void { const p = this.preferences.get(userId); if (p) delete p.snoozedUntil }
  private getOrCreateCounter(userId: string) {
    let c = this.userCounters.get(userId)
    const now = Date.now()
    if (!c) {
      c = { hour: 0, day: 0, hourResetAt: now + 3600_000, dayResetAt: now + 86_400_000 }
      this.userCounters.set(userId, c)
    }
    if (now > c.hourResetAt) { c.hour = 0; c.hourResetAt = now + 3600_000 }
    if (now > c.dayResetAt) { c.day = 0; c.dayResetAt = now + 86_400_000 }
    return c
  }
  private incrementCounter(userId: string): void {
    const c = this.getOrCreateCounter(userId)
    c.hour++; c.day++
  }

  // -------- Channel senders --------
  registerSender(s: ChannelSender): void { this.senders.push(s); this.senders.sort((a, b) => a.channel === b.channel ? 0 : 0) }
  unregisterSender(channel: Channel): void { this.senders = this.senders.filter(s => s.channel !== channel) }

  // -------- Send --------
  async send(input: Omit<Notification, 'id' | 'status' | 'attempts' | 'maxAttempts' | 'createdAt' | 'locale'> & { id?: string; maxAttempts?: number; locale?: string }): Promise<Notification> {
    const id = input.id ?? `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const now = Date.now()
    const n: Notification = {
      id, status: 'pending', attempts: 0, maxAttempts: input.maxAttempts ?? 3, createdAt: now, locale: input.locale ?? 'en', ...input,
    }
    this.notifications.set(id, n)
    this.stats.total++
    this.stats.byChannel[n.channel] = (this.stats.byChannel[n.channel] ?? 0) + 1
    this.stats.byCategory[n.category] = (this.stats.byCategory[n.category] ?? 0) + 1
    this.stats.byPriority[n.priority] = (this.stats.byPriority[n.priority] ?? 0) + 1
    // apply template
    if (n.templateId) {
      const t = this.templates.get(n.templateId)
      if (t) {
        const vars = n.data ?? {}
        n.subject = t.subject ? this.render(t.subject, vars) : n.subject
        n.body = this.render(t.body, vars)
      }
    }
    if (n.scheduledFor && n.scheduledFor > now) {
      n.status = 'scheduled'
      this.stats.scheduled++
      return n
    }
    // user acceptance
    const acc = this.isAccepted(n.userId, n.channel, n.category)
    if (!acc.accepted) {
      n.status = 'failed'
      n.failureReason = acc.reason
      n.failedAt = Date.now()
      this.stats.failed++
      return n
    }
    this.incrementCounter(n.userId)
    await this.deliver(n)
    this.maybeGroupNotification(n)
    return n
  }
  private async deliver(n: Notification): Promise<void> {
    const sender = this.senders.find(s => s.channel === n.channel)
    if (!sender) {
      n.status = 'failed'
      n.failureReason = 'no_sender'
      n.failedAt = Date.now()
      this.stats.failed++
      return
    }
    n.attempts++
    const start = Date.now()
    try {
      const r = await sender.send(n)
      const dur = Date.now() - start
      this.totalDur += dur
      if (r.ok) {
        n.status = 'sent'
        n.sentAt = Date.now()
        n.deliveredAt = Date.now()
        n.metadata = { ...n.metadata, providerId: r.providerId, deliveryMs: dur }
        this.stats.sent++
        this.stats.delivered++
        if (n.channel === 'in-app') n.status = 'unread'
      } else {
        await this.handleFailure(n, r.error ?? 'unknown')
      }
    } catch (e) {
      await this.handleFailure(n, (e as Error).message)
    }
  }
  private async handleFailure(n: Notification, reason: string): Promise<void> {
    if (n.attempts >= n.maxAttempts) {
      n.status = 'failed'
      n.failureReason = reason
      n.failedAt = Date.now()
      this.stats.failed++
      return
    }
    const backoff = Math.min(60_000, 1000 * Math.pow(2, n.attempts - 1))
    n.retryAt = Date.now() + backoff
    await new Promise(r => setTimeout(r, backoff))
    await this.deliver(n)
  }

  // -------- Scheduled send --------
  startScheduler(intervalMs = 5000): void {
    if (this.scheduled) return
    this.scheduled = setInterval(() => this.processScheduled(), intervalMs)
  }
  stopScheduler(): void { if (this.scheduled) { clearInterval(this.scheduled); this.scheduled = null } }
  private async processScheduled(): Promise<void> {
    const now = Date.now()
    for (const n of this.notifications.values()) {
      if (n.status === 'scheduled' && n.scheduledFor && n.scheduledFor <= now) {
        n.status = 'pending'
        await this.deliver(n)
      } else if (n.retryAt && n.retryAt <= now && n.status !== 'sent' && n.status !== 'delivered' && n.status !== 'read') {
        n.retryAt = undefined
        await this.deliver(n)
      }
    }
  }

  // -------- Read / Unread --------
  markRead(notifId: string): boolean {
    const n = this.notifications.get(notifId)
    if (!n) return false
    if (n.status === 'unread') { n.status = 'read'; n.readAt = Date.now(); this.stats.read++ }
    return true
  }
  markAllRead(userId: string, channel?: Channel): number {
    let count = 0
    for (const n of this.notifications.values()) {
      if (n.userId === userId && n.status === 'unread' && (!channel || n.channel === channel)) {
        n.status = 'read'; n.readAt = Date.now(); this.stats.read++; count++
      }
    }
    return count
  }
  snoozeNotification(notifId: string, until: number): boolean {
    const n = this.notifications.get(notifId)
    if (!n) return false
    n.status = 'snoozed'; n.metadata = { ...n.metadata, snoozedUntil: until }
    this.stats.snoozed++
    return true
  }
  muteNotification(notifId: string): boolean {
    const n = this.notifications.get(notifId)
    if (!n) return false
    n.status = 'muted'
    this.stats.muted++
    return true
  }

  // -------- List / Query --------
  get(notifId: string): Notification | undefined { return this.notifications.get(notifId) }
  list(filter?: { userId?: string; channel?: Channel; category?: Category; status?: Status; limit?: number; since?: number }): Notification[] {
    let arr = [...this.notifications.values()]
    if (filter?.userId) arr = arr.filter(n => n.userId === filter.userId)
    if (filter?.channel) arr = arr.filter(n => n.channel === filter.channel)
    if (filter?.category) arr = arr.filter(n => n.category === filter.category)
    if (filter?.status) arr = arr.filter(n => n.status === filter.status)
    if (filter?.since) arr = arr.filter(n => n.createdAt >= filter.since!)
    return arr.slice(-(filter?.limit ?? 100))
  }
  unreadCount(userId: string): number {
    return this.list({ userId, status: 'unread' }).length
  }

  // -------- Grouping / Digest --------
  private groupKey(n: Notification): string { return `${n.userId}:${n.category}:${n.channel}` }
  private maybeGroupNotification(n: Notification): void {
    if (n.channel !== 'in-app') return
    const key = this.groupKey(n)
    let g = this.groups.get(key)
    if (!g) {
      g = { id: key, userId: n.userId, category: n.category, channel: n.channel, notifications: [], digest: {}, count: 0, unreadCount: 0, lastActivity: 0 }
      this.groups.set(key, g)
    }
    g.notifications.push(n)
    g.count++
    if (n.status === 'unread') g.unreadCount++
    g.lastActivity = Math.max(g.lastActivity, n.createdAt)
  }
  listGroups(userId?: string): NotificationGroup[] {
    let arr = [...this.groups.values()]
    if (userId) arr = arr.filter(g => g.userId === userId)
    return arr.sort((a, b) => b.lastActivity - a.lastActivity)
  }
  /** Build a digest notification (single notification that summarizes a group) */
  async buildDigest(groupId: string): Promise<Notification | null> {
    const g = this.groups.get(groupId)
    if (!g) return null
    const body = `${g.count} new ${g.category} notifications:\n` + g.notifications.slice(-5).map(n => `- ${n.subject ?? n.body.slice(0, 50)}`).join('\n')
    return this.send({ userId: g.userId, channel: 'email', category: g.category, priority: 'low', subject: `${g.count} new ${g.category}`, body })
  }

  // -------- Stats --------
  getStats(): DeliveryStats {
    this.stats.avgDeliveryMs = this.stats.sent > 0 ? this.totalDur / this.stats.sent : 0
    this.stats.readRate = this.stats.delivered > 0 ? this.stats.read / this.stats.delivered : 0
    return JSON.parse(JSON.stringify(this.stats))
  }
  resetStats(): void {
    this.stats = { total: 0, sent: 0, delivered: 0, failed: 0, read: 0, scheduled: 0, snoozed: 0, muted: 0, byChannel: {} as any, byCategory: {} as any, byPriority: {} as any, avgDeliveryMs: 0, readRate: 0 }
    this.totalDur = 0
  }

  // -------- Federation --------
  async sendWithRetry(input: Parameters<NotificationCenter['send']>[0]): Promise<Notification> {
    return withRetry(() => this.send(input), { maxAttempts: input.maxAttempts ?? 3, baseDelayMs: 100, maxDelayMs: 5000, jitter: true, retryOnStatus: [500, 502, 503, 504] })
  }
  computeBackoffFor(attempt: number): number {
    return computeBackoff(attempt, { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 5000, jitter: true, retryOnStatus: [500, 502, 503, 504] })
  }
}

let _instance: NotificationCenter | null = null
export function getNotificationCenter(): NotificationCenter { if (!_instance) _instance = new NotificationCenter(); return _instance }
export function resetNotificationCenter(): void { _instance = null }
export { NotificationCenter as default }
