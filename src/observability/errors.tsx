/**
 * Versa · 错误监控 (Sentry-style) (v17.0)
 *
 * - 错误捕获 (全局 + 手动)
 * - 堆栈+上下文+用户信息
 * - 面包屑 (breadcrumb)
 * - 严重程度分级
 * - 限流/采样
 * - 离线缓冲 (IndexedDB)
 * - 批量上报
 */

export type Severity = 'debug' | 'info' | 'warning' | 'error' | 'fatal'

export interface Breadcrumb {
  type: 'navigation' | 'click' | 'fetch' | 'console' | 'state' | 'custom'
  category?: string
  message: string
  data?: Record<string, any>
  ts: number
}

export interface ErrorContext {
  userId?: string
  sessionId?: string
  url?: string
  userAgent?: string
  release?: string
  environment?: string
  extra?: Record<string, any>
  tags?: Record<string, string>
}

export interface ErrorEvent {
  id: string
  message: string
  stack?: string
  severity: Severity
  source: 'global' | 'promise' | 'fetch' | 'component' | 'manual'
  context: ErrorContext
  breadcrumbs: Breadcrumb[]
  ts: number
  count: number
}

const MAX_BREADCRUMBS = 50
const MAX_QUEUE_SIZE = 100
const SAMPLE_RATE = 1.0  // 100% 采样 (开发环境)
const FLUSH_INTERVAL_MS = 30_000
const STORAGE_KEY = 'versa:errors:queue'

class ErrorTracker {
  private breadcrumbs: Breadcrumb[] = []
  private queue: ErrorEvent[] = []
  private context: ErrorContext = {}
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private listeners: Set<(e: ErrorEvent) => void> = new Set()
  private installed = false

  install(): void {
    if (this.installed || typeof window === 'undefined') return
    this.installed = true

    // 加载持久化
    this.load()

    // 全局错误
    window.addEventListener('error', (e) => {
      this.captureError(e.error || new Error(e.message), 'global', { extra: { filename: e.filename, lineno: e.lineno } })
    })

    // Promise 拒绝
    window.addEventListener('unhandledrejection', (e) => {
      const err = e.reason instanceof Error ? e.reason : new Error(String(e.reason))
      this.captureError(err, 'promise')
    })

    // fetch 拦截 (可选, 通过 patchFetch 启用)
    this.addBreadcrumb({ type: 'navigation', message: `Installed at ${window.location.href}` })

    this.start()
  }

  setContext(ctx: Partial<ErrorContext>): void {
    this.context = { ...this.context, ...ctx }
  }

  setUser(userId: string | null, data?: Record<string, any>): void {
    if (userId) {
      this.context.userId = userId
      if (data) this.context.extra = { ...this.context.extra, ...data }
    } else {
      delete this.context.userId
    }
  }

  addBreadcrumb(b: Omit<Breadcrumb, 'ts'>): void {
    this.breadcrumbs.push({ ...b, ts: Date.now() })
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs = this.breadcrumbs.slice(-MAX_BREADCRUMBS)
    }
  }

  captureError(error: Error | string, source: ErrorEvent['source'] = 'manual', extra?: Record<string, any>): string {
    if (Math.random() > SAMPLE_RATE) return ''

    const message = typeof error === 'string' ? error : error.message
    const stack = typeof error === 'string' ? undefined : error.stack

    // 查重 (按 message 匹配, 跳过 stack 因为可能每次都不同)
    const existing = this.queue.find((e) => e.message === message && e.source === source)
    if (existing) {
      existing.count++
      existing.ts = Date.now()
      this.persist()
      return existing.id
    }

    const ev: ErrorEvent = {
      id: 'err_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      message,
      stack,
      severity: 'error',
      source,
      context: {
        ...this.context,
        url: typeof location !== 'undefined' ? location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        extra: { ...this.context.extra, ...extra },
      },
      breadcrumbs: [...this.breadcrumbs],
      ts: Date.now(),
      count: 1,
    }

    this.queue.push(ev)
    if (this.queue.length > MAX_QUEUE_SIZE) {
      this.queue = this.queue.slice(-MAX_QUEUE_SIZE)
    }
    this.persist()
    this.listeners.forEach((fn) => fn(ev))
    return ev.id
  }

  captureMessage(message: string, severity: Severity = 'info', extra?: Record<string, any>): string {
    const ev: ErrorEvent = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      message,
      severity,
      source: 'manual',
      context: { ...this.context, extra: { ...this.context.extra, ...extra } },
      breadcrumbs: [...this.breadcrumbs],
      ts: Date.now(),
      count: 1,
    }
    this.queue.push(ev)
    this.persist()
    this.listeners.forEach((fn) => fn(ev))
    return ev.id
  }

  /** 异步函数包装器 */
  async withCapture<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.addBreadcrumb({ type: 'state', message: `start: ${name}` })
    try {
      const r = await fn()
      this.addBreadcrumb({ type: 'state', message: `ok: ${name}` })
      return r
    } catch (e) {
      this.captureError(e instanceof Error ? e : new Error(String(e)), 'component', { op: name })
      throw e
    }
  }

  /** 错误边界组件用的 */
  captureComponentError(error: Error, componentStack: string): string {
    return this.captureError(error, 'component', { componentStack })
  }

  getQueue(): readonly ErrorEvent[] {
    return this.queue
  }

  clear(): void {
    this.queue = []
    this.persist()
  }

  subscribe(fn: (e: ErrorEvent) => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  private start() {
    if (this.flushTimer) return
    this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL_MS)
  }

  private stop() {
    if (this.flushTimer) clearInterval(this.flushTimer)
    this.flushTimer = null
  }

  /** 模拟上报: 在生产环境替换为 fetch(SENTRY_URL) */
  async flush(): Promise<{ sent: number; dropped: number }> {
    if (this.queue.length === 0) return { sent: 0, dropped: 0 }
    const batch = this.queue.splice(0, this.queue.length)
    this.persist()
    // 真实场景: await fetch('/api/errors', { method: 'POST', body: JSON.stringify(batch) })
    // 这里我们写到 localStorage 作为"已发送"记录
    try {
      const sentRaw = localStorage.getItem('versa:errors:sent') || '[]'
      const sent = JSON.parse(sentRaw) as ErrorEvent[]
      sent.push(...batch)
      localStorage.setItem('versa:errors:sent', JSON.stringify(sent.slice(-200)))
    } catch {}
    return { sent: batch.length, dropped: 0 }
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) this.queue = JSON.parse(raw)
    } catch {}
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue))
    } catch {}
  }

  getStats() {
    const by = (key: 'severity' | 'source') => {
      const m: Record<string, number> = {}
      for (const e of this.queue) m[e[key]] = (m[e[key]] || 0) + e.count
      return m
    }
    return {
      total: this.queue.reduce((s, e) => s + e.count, 0),
      unique: this.queue.length,
      bySeverity: by('severity'),
      bySource: by('source'),
      breadcrumbCount: this.breadcrumbs.length,
    }
  }
}

export const errorTracker = new ErrorTracker()

/** 错误边界 HOC */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
): React.ComponentType<P> {
  return function Wrapped(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

import * as React from 'react'
interface ErrorBoundaryState { hasError: boolean; errorId?: string }

export class ErrorBoundary extends React.Component<{ fallback?: React.ReactNode; children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    errorTracker.captureComponentError(error, info.componentStack || '')
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 text-center">
          <p className="text-rose-500">⚠️ 出现了一个错误</p>
          <button onClick={() => this.setState({ hasError: false })} className="mt-2 text-sm text-violet-500">
            重试
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
