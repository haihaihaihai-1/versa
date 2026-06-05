/**
 * Versa · 健康检查 (Liveness/Readiness) (v17.0)
 * - 服务自身健康
 * - 外部依赖探测
 * - 熔断保护
 */

export type HealthState = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'

export interface HealthCheck {
  name: string
  state: HealthState
  latencyMs?: number
  message?: string
  ts: number
  metadata?: Record<string, any>
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open'
  failures: number
  successes: number
  openedAt?: number
  nextAttemptAt?: number
}

const FAILURE_THRESHOLD = 5
const RECOVERY_TIMEOUT_MS = 30_000

class CircuitBreaker {
  private breakers = new Map<string, CircuitBreakerState>()

  get(key: string): CircuitBreakerState {
    if (!this.breakers.has(key)) {
      this.breakers.set(key, { state: 'closed', failures: 0, successes: 0 })
    }
    return this.breakers.get(key)!
  }

  /** 是否允许执行 (open 状态 → 拒绝) */
  canExecute(key: string): boolean {
    const b = this.get(key)
    if (b.state === 'closed') return true
    if (b.state === 'open') {
      if (b.nextAttemptAt && Date.now() >= b.nextAttemptAt) {
        b.state = 'half-open'
        return true
      }
      return false
    }
    // half-open: 放一个进来试
    return true
  }

  recordSuccess(key: string): void {
    const b = this.get(key)
    b.successes++
    if (b.state === 'half-open') {
      b.state = 'closed'
      b.failures = 0
    }
  }

  recordFailure(key: string): void {
    const b = this.get(key)
    b.failures++
    if (b.state === 'half-open' || b.failures >= FAILURE_THRESHOLD) {
      b.state = 'open'
      b.openedAt = Date.now()
      b.nextAttemptAt = Date.now() + RECOVERY_TIMEOUT_MS
    }
  }

  reset(key: string): void {
    this.breakers.delete(key)
  }

  resetAll(): void {
    this.breakers.clear()
  }
}

export const circuitBreaker = new CircuitBreaker()

class HealthMonitor {
  private checks: HealthCheck[] = []
  private listeners: Set<(checks: HealthCheck[]) => void> = new Set()

  /** 同步检查 */
  check(name: string, state: HealthState, message?: string, metadata?: Record<string, any>): HealthCheck {
    const c: HealthCheck = { name, state, message, metadata, ts: Date.now() }
    this.checks = [c, ...this.checks.filter((x) => x.name !== name)].slice(0, 50)
    this.listeners.forEach((fn) => fn(this.checks))
    return c
  }

  /** 异步探测 (URL ping) */
  async probe(name: string, url: string, opts: { timeout?: number; method?: string } = {}): Promise<HealthCheck> {
    const start = Date.now()
    const ctrl = new AbortController()
    const timeout = setTimeout(() => ctrl.abort(), opts.timeout ?? 5000)
    try {
      const res = await fetch(url, { method: opts.method || 'GET', signal: ctrl.signal })
      const latency = Date.now() - start
      clearTimeout(timeout)
      const state: HealthState = res.ok ? 'healthy' : 'degraded'
      return this.check(name, state, `${res.status} ${res.statusText}`, { latencyMs: latency, status: res.status })
    } catch (e: any) {
      clearTimeout(timeout)
      return this.check(name, 'unhealthy', e?.message || 'fetch failed', { latencyMs: Date.now() - start })
    }
  }

  /** 包装函数式调用, 自动熔断 */
  async call<T>(key: string, fn: () => Promise<T>, opts: { fallback?: () => T | Promise<T> } = {}): Promise<T> {
    if (!circuitBreaker.canExecute(key)) {
      if (opts.fallback) return await opts.fallback()
      throw new Error(`[circuit-breaker] ${key} is open`)
    }
    try {
      const r = await fn()
      circuitBreaker.recordSuccess(key)
      return r
    } catch (e) {
      circuitBreaker.recordFailure(key)
      if (opts.fallback) return await opts.fallback()
      throw e
    }
  }

  getChecks(): readonly HealthCheck[] { return this.checks }
  getOverallState(): HealthState {
    if (this.checks.length === 0) return 'unknown'
    if (this.checks.some((c) => c.state === 'unhealthy')) return 'unhealthy'
    if (this.checks.some((c) => c.state === 'degraded')) return 'degraded'
    return 'healthy'
  }
  subscribe(fn: (c: HealthCheck[]) => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  clear(): void { this.checks = [] }
}

export const healthMonitor = new HealthMonitor()

/** 预置检查 */
export async function runStandardHealthChecks(): Promise<HealthCheck[]> {
  const checks: HealthCheck[] = []
  checks.push(healthMonitor.check('app', 'healthy', 'SPA booted'))
  if (typeof navigator !== 'undefined') {
    checks.push(healthMonitor.check('network', navigator.onLine ? 'healthy' : 'degraded', navigator.onLine ? 'online' : 'offline'))
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem('__health__', '1')
      localStorage.removeItem('__health__')
      checks.push(healthMonitor.check('storage', 'healthy', 'localStorage OK'))
    } catch {
      checks.push(healthMonitor.check('storage', 'unhealthy', 'localStorage unavailable'))
    }
  }
  return checks
}
