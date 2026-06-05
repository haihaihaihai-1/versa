/**
 * Versa · 事件分析 (GA-style) (v17.0)
 *
 * - 事件追踪 (pageview / click / custom)
 * - 用户识别
 * - 会话管理
 * - 漏斗 (funnel)
 * - 留存矩阵
 * - 队列 + 批量上报
 */

export type EventName = string

export interface AnalyticsEvent {
  id: string
  name: EventName
  properties?: Record<string, any>
  userId?: string
  sessionId: string
  ts: number
  url?: string
}

export interface FunnelStep {
  name: string
  event: string
}

export interface FunnelResult {
  step: string
  entered: number
  completed: number
  conversionRate: number
}

const SESSION_KEY = 'versa:analytics:session'
const USER_KEY = 'versa:analytics:user'
const QUEUE_KEY = 'versa:analytics:queue'
const SESSION_TIMEOUT_MS = 30 * 60 * 1000

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

class Analytics {
  private queue: AnalyticsEvent[] = []
  private listeners: Set<(e: AnalyticsEvent) => void> = new Set()
  private sessionId: string
  private userId: string | null = null
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private installed = false

  constructor() {
    this.sessionId = this.loadOrCreateSession()
    if (typeof window !== 'undefined') {
      this.userId = localStorage.getItem(USER_KEY)
    }
  }

  install(): void {
    if (this.installed || typeof window === 'undefined') return
    this.installed = true
    this.load()
    this.start()
  }

  identify(userId: string, traits?: Record<string, any>): void {
    this.userId = userId
    try { localStorage.setItem(USER_KEY, userId) } catch {}
    this.track('identify', { userId, ...traits })
  }

  reset(): void {
    this.userId = null
    try {
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(SESSION_KEY)
    } catch {}
    this.sessionId = this.createSession()
  }

  track(name: EventName, properties?: Record<string, any>): void {
    if (!name) return
    const ev: AnalyticsEvent = {
      id: uid('ev'),
      name,
      properties,
      userId: this.userId || undefined,
      sessionId: this.sessionId,
      ts: Date.now(),
      url: typeof location !== 'undefined' ? location.href : undefined,
    }
    this.queue.push(ev)
    this.persist()
    this.listeners.forEach((fn) => fn(ev))
  }

  page(name?: string, properties?: Record<string, any>): void {
    this.track('pageview', { name: name || (typeof location !== 'undefined' ? location.pathname : '/'), ...properties })
    this.maybeRolloverSession()
  }

  private maybeRolloverSession() {
    try {
      const last = Number(localStorage.getItem('versa:analytics:last') || 0)
      if (last && Date.now() - last > SESSION_TIMEOUT_MS) {
        this.sessionId = this.createSession()
      }
      localStorage.setItem('versa:analytics:last', String(Date.now()))
    } catch {}
  }

  /** 漏斗分析 */
  funnel(steps: FunnelStep[], opts: { fromUserId?: string; fromTs?: number; toTs?: number } = {}): FunnelResult[] {
    const filtered = this.queue.filter((e) => {
      if (opts.fromUserId && e.userId !== opts.fromUserId) return false
      if (opts.fromTs && e.ts < opts.fromTs) return false
      if (opts.toTs && e.ts > opts.toTs) return false
      return true
    })
    const results: FunnelResult[] = []
    let prevUsers: Set<string> = new Set()
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]
      const matched = filtered.filter((e) => e.name === step.event)
      const users = new Set(matched.map((e) => e.userId || e.sessionId))
      if (i > 0) {
        // 必须是完成了上一步的用户
        const intersected = new Set<string>()
        for (const u of users) if (prevUsers.has(u)) intersected.add(u)
        prevUsers = intersected
      } else {
        prevUsers = users
      }
      const completed = prevUsers.size
      const entered = i === 0 ? users.size : results[i - 1].entered
      results.push({
        step: step.name,
        entered,
        completed,
        conversionRate: entered === 0 ? 0 : completed / entered,
      })
    }
    return results
  }

  /** 留存: 第 N 天回访率 */
  retention(cohort: { startTs: number; userIds: string[] }, day: number): { cohortSize: number; returned: number; rate: number } {
    const targetTs = cohort.startTs + day * 24 * 60 * 60 * 1000
    const targetEnd = targetTs + 24 * 60 * 60 * 1000
    const cohortSet = new Set(cohort.userIds)
    const returners = new Set<string>()
    for (const e of this.queue) {
      if (!e.userId) continue
      if (!cohortSet.has(e.userId)) continue
      if (e.ts >= targetTs && e.ts < targetEnd) {
        returners.add(e.userId)
      }
    }
    return { cohortSize: cohort.userIds.length, returned: returners.size, rate: returners.size / cohort.userIds.length }
  }

  /** 事件统计 */
  countBy(name: EventName, fromTs?: number): number {
    return this.queue.filter((e) => e.name === name && (!fromTs || e.ts >= fromTs)).length
  }

  groupBy<T = number>(name: EventName, key: string, fromTs?: number): Record<string, T> {
    const result: Record<string, T> = {}
    for (const e of this.queue) {
      if (e.name !== name) continue
      if (fromTs && e.ts < fromTs) continue
      const v = e.properties?.[key] as string
      if (v == null) continue
      result[v] = ((result[v] as any) || 0) + 1 as any
    }
    return result
  }

  getQueue(): readonly AnalyticsEvent[] {
    return this.queue
  }

  subscribe(fn: (e: AnalyticsEvent) => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  clear(): void {
    this.queue = []
    this.persist()
  }

  async flush(): Promise<{ sent: number }> {
    if (this.queue.length === 0) return { sent: 0 }
    const batch = this.queue.splice(0, this.queue.length)
    this.persist()
    // 真实场景: await fetch('/api/analytics', { method: 'POST', body: JSON.stringify(batch) })
    return { sent: batch.length }
  }

  private createSession(): string {
    const id = uid('sess')
    try { localStorage.setItem(SESSION_KEY, id) } catch {}
    return id
  }

  private loadOrCreateSession(): string {
    try {
      const existing = localStorage.getItem(SESSION_KEY)
      if (existing) return existing
    } catch {}
    return this.createSession()
  }

  private load() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY)
      if (raw) this.queue = JSON.parse(raw)
    } catch {}
  }

  private persist() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue.slice(-500)))
    } catch {}
  }

  private start() {
    if (this.flushTimer) return
    this.flushTimer = setInterval(() => this.flush().catch(() => {}), 30_000)
  }
}

export const analytics = new Analytics()

/** React Hook 简化调用 */
export function useTrack() {
  return {
    track: analytics.track.bind(analytics),
    page: analytics.page.bind(analytics),
    identify: analytics.identify.bind(analytics),
  }
}

/** 性能监控 (Web Vitals) */
export interface PerformanceMark {
  name: string
  value: number
  ts: number
  rating?: 'good' | 'needs-improvement' | 'poor'
}

class PerformanceMonitor {
  private marks: PerformanceMark[] = []
  private listeners: Set<(m: PerformanceMark) => void> = new Set()

  record(name: string, value: number, rating?: PerformanceMark['rating']): void {
    const m = { name, value, ts: Date.now(), rating }
    this.marks.push(m)
    if (this.marks.length > 200) this.marks = this.marks.slice(-200)
    this.listeners.forEach((fn) => fn(m))
    try {
      const raw = localStorage.getItem('versa:perf:marks') || '[]'
      const arr = JSON.parse(raw) as PerformanceMark[]
      arr.push(m)
      localStorage.setItem('versa:perf:marks', JSON.stringify(arr.slice(-200)))
    } catch {}
  }

  /** Web Vitals 阈值 (ms) */
  static thresholds = {
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    FID: { good: 100, poor: 300 },
    CLS: { good: 0.1, poor: 0.25 },
    TTFB: { good: 800, poor: 1800 },
  }

  static rate(metric: keyof typeof PerformanceMonitor.thresholds, value: number): PerformanceMark['rating'] {
    const t = PerformanceMonitor.thresholds[metric]
    if (value <= t.good) return 'good'
    if (value <= t.poor) return 'needs-improvement'
    return 'poor'
  }

  getMarks(): readonly PerformanceMark[] { return this.marks }
  subscribe(fn: (m: PerformanceMark) => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
}

export const perfMonitor = new PerformanceMonitor()
export { PerformanceMonitor }
