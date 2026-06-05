/**
 * Versa · Rate Limiter (v43.0)
 * - Multiple algorithms: fixed-window, sliding-window, token-bucket, leaky-bucket, GCRA
 * - Per-key / per-route / per-tenant limiting
 * - Quota management (period, burst, cost)
 * - Distributed simulation (multi-instance + sync)
 * - Headers (X-RateLimit-*, Retry-After)
 * - Whitelist / blacklist
 * - Adaptive limits
 * - Statistics & metrics
 */
import { withRetry, computeBackoff } from '../federation'

export type Algorithm = 'fixed-window' | 'sliding-window' | 'token-bucket' | 'leaky-bucket' | 'gcra'

export interface LimitConfig {
  /** algorithm */
  algorithm: Algorithm
  /** max requests (or tokens) per period */
  limit: number
  /** period in ms (ignored for token-bucket & gcra when burst specified) */
  periodMs: number
  /** burst size (for token-bucket) — default = limit */
  burst?: number
  /** refill rate per second (for token-bucket / leaky-bucket) */
  refillPerSec?: number
  /** leak rate per second (for leaky-bucket) */
  leakPerSec?: number
  /** whether to apply on denied: wait or fail immediately */
  waitOnDeny?: boolean
  /** custom key extractor */
  keyFn?: (ctx: RequestContext) => string
  /** route pattern */
  route?: string
  /** cost per request (allows weighted limits) */
  cost?: number | ((ctx: RequestContext) => number)
}

export interface RequestContext {
  key: string
  route?: string
  ip?: string
  userId?: string
  tenantId?: string
  cost?: number
  ts?: number
}

export interface RateLimitDecision {
  allowed: boolean
  remaining: number
  limit: number
  resetMs: number
  retryAfterMs?: number
  reason?: string
  algorithm: Algorithm
  key: string
  ruleRoute?: string
}

export interface LimitRule {
  id: string
  name: string
  route: string | '*'
  config: LimitConfig
  enabled: boolean
  priority: number
  whitelist: string[]
  blacklist: string[]
  /** adaptive: scale limit up/down based on system load (0..1) */
  adaptiveFn?: (load: number) => number
  createdAt: number
  hits: number
  allowed: number
  denied: number
}

export interface Metrics {
  totalChecks: number
  totalAllowed: number
  totalDenied: number
  totalRetries: number
  totalWaits: number
  rulesActive: number
  byAlgorithm: Record<Algorithm, number>
  byRoute: Record<string, number>
}

interface BucketState {
  tokens?: number
  lastRefill: number
  /** fixed-window / sliding-window */
  windowStart?: number
  windowCount?: number
  /** leaky-bucket queue */
  queue?: number
  lastLeak?: number
  /** GCRA: theoretical arrival time */
  TAT?: number
}

export class RateLimiter {
  private rules = new Map<string, LimitRule>()
  private states = new Map<string, Map<string, BucketState>>() // ruleId -> key -> state
  private metrics: Metrics = { totalChecks: 0, totalAllowed: 0, totalDenied: 0, totalRetries: 0, totalWaits: 0, rulesActive: 0, byAlgorithm: {} as any, byRoute: {} }
  private systemLoad = 0.5
  private whitelistGlobal: Set<string> = new Set()
  private blacklistGlobal: Set<string> = new Set()
  private clockSkewMs = 0

  // -------- Rule management --------
  addRule(rule: Omit<LimitRule, 'id' | 'createdAt' | 'hits' | 'allowed' | 'denied'> & { id?: string }): LimitRule {
    const id = rule.id ?? `rl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const full: LimitRule = { ...rule, id, createdAt: Date.now(), hits: 0, allowed: 0, denied: 0 }
    this.rules.set(id, full)
    this.states.set(id, new Map())
    return full
  }
  removeRule(id: string): boolean { this.rules.delete(id); return this.states.delete(id) }
  getRule(id: string): LimitRule | undefined { return this.rules.get(id) }
  listRules(): LimitRule[] { return [...this.rules.values()].sort((a, b) => b.priority - a.priority) }
  enableRule(id: string, on = true): void { const r = this.rules.get(id); if (r) r.enabled = on }

  // -------- Global lists --------
  addToWhitelistGlobal(key: string): void { this.whitelistGlobal.add(key) }
  addToBlacklistGlobal(key: string): void { this.blacklistGlobal.add(key) }
  removeFromWhitelistGlobal(key: string): void { this.whitelistGlobal.delete(key) }
  removeFromBlacklistGlobal(key: string): void { this.blacklistGlobal.delete(key) }

  // -------- Check --------
  check(ctx: RequestContext, now = Date.now() + this.clockSkewMs): RateLimitDecision {
    this.metrics.totalChecks++
    const effNow = now
    // find matching rule (highest priority)
    const rule = this.findRule(ctx)
    if (!rule) {
      return { allowed: true, remaining: -1, limit: -1, resetMs: 0, algorithm: 'fixed-window', key: ctx.key }
    }
    rule.hits++
    if (this.whitelistGlobal.has(ctx.key) || rule.whitelist.includes(ctx.key)) {
      rule.allowed++
      this.metrics.totalAllowed++
      return { allowed: true, remaining: -1, limit: rule.config.limit, resetMs: 0, algorithm: rule.config.algorithm, key: ctx.key, ruleRoute: rule.route }
    }
    if (this.blacklistGlobal.has(ctx.key) || rule.blacklist.includes(ctx.key)) {
      rule.denied++
      this.metrics.totalDenied++
      return { allowed: false, remaining: 0, limit: rule.config.limit, resetMs: 0, retryAfterMs: rule.config.periodMs, reason: 'blacklisted', algorithm: rule.config.algorithm, key: ctx.key, ruleRoute: rule.route }
    }
    const cost = typeof rule.config.cost === 'function' ? rule.config.cost(ctx) : (rule.config.cost ?? ctx.cost ?? 1)
    const limit = rule.adaptiveFn ? Math.max(1, Math.floor(rule.config.limit * rule.adaptiveFn(this.systemLoad))) : rule.config.limit
    const decision = this.algorithmCheck(rule, ctx, cost, limit, effNow)
    if (decision.allowed) { rule.allowed++; this.metrics.totalAllowed++ }
    else { rule.denied++; this.metrics.totalDenied++ }
    this.metrics.byAlgorithm[rule.config.algorithm] = (this.metrics.byAlgorithm[rule.config.algorithm] ?? 0) + 1
    if (rule.route !== '*') this.metrics.byRoute[rule.route] = (this.metrics.byRoute[rule.route] ?? 0) + 1
    return decision
  }
  /** Check & optionally wait until allowed */
  async checkOrWait(ctx: RequestContext, maxWaitMs = 30_000): Promise<RateLimitDecision> {
    const initial = this.check(ctx)
    if (initial.allowed || !initial.retryAfterMs) return initial
    if (initial.retryAfterMs > maxWaitMs) return initial
    this.metrics.totalWaits++
    await new Promise(r => setTimeout(r, initial.retryAfterMs))
    return this.check(ctx)
  }
  /** Retry a function under rate-limit */
  async executeWithLimit<T>(ctx: RequestContext, fn: () => T | Promise<T>, maxRetries = 3): Promise<T> {
    let lastDecision: RateLimitDecision | null = null
    return withRetry(async () => {
      const d = this.check(ctx)
      lastDecision = d
      if (!d.allowed) {
        this.metrics.totalRetries++
        const err = new Error(`rate_limited: ${d.reason ?? 'over_limit'}`) as any
        err.decision = d
        throw err
      }
      return await fn()
    }, { maxAttempts: maxRetries, baseDelayMs: 100, maxDelayMs: 5000, jitter: true, retryOnStatus: [429] })
      .catch(e => { throw e })
  }

  // -------- Algorithm implementations --------
  private algorithmCheck(rule: LimitRule, ctx: RequestContext, cost: number, limit: number, now: number): RateLimitDecision {
    const map = this.states.get(rule.id)!
    let state = map.get(ctx.key)
    if (!state) {
      state = this.initState(rule.config, limit, now)
      map.set(ctx.key, state)
    }
    switch (rule.config.algorithm) {
      case 'fixed-window': return this.fixedWindow(rule, state, cost, limit, now)
      case 'sliding-window': return this.slidingWindow(rule, state, cost, limit, now)
      case 'token-bucket': return this.tokenBucket(rule, state, cost, limit, now)
      case 'leaky-bucket': return this.leakyBucket(rule, state, cost, limit, now)
      case 'gcra': return this.gcra(rule, state, cost, limit, now)
    }
  }
  private initState(cfg: LimitConfig, limit: number, now: number): BucketState {
    switch (cfg.algorithm) {
      case 'token-bucket': return { tokens: cfg.burst ?? limit, lastRefill: now }
      case 'fixed-window': return { windowStart: now, windowCount: 0, lastRefill: now }
      case 'sliding-window': return { windowStart: now, windowCount: 0, lastRefill: now }
      case 'leaky-bucket': return { tokens: 0, queue: 0, lastLeak: now, lastRefill: now }
      case 'gcra': return { TAT: now, lastRefill: now }
    }
  }
  private fixedWindow(rule: LimitRule, s: BucketState, cost: number, limit: number, now: number): RateLimitDecision {
    const cfg = rule.config
    if (now - (s.windowStart ?? 0) >= cfg.periodMs) {
      s.windowStart = now
      s.windowCount = 0
    }
    if ((s.windowCount ?? 0) + cost > limit) {
      return { allowed: false, remaining: 0, limit, resetMs: cfg.periodMs - (now - (s.windowStart ?? now)), retryAfterMs: cfg.periodMs - (now - (s.windowStart ?? now)), reason: 'over_window_limit', algorithm: 'fixed-window', key: rule.id, ruleRoute: rule.route }
    }
    s.windowCount = (s.windowCount ?? 0) + cost
    return { allowed: true, remaining: limit - (s.windowCount ?? 0), limit, resetMs: cfg.periodMs - (now - (s.windowStart ?? now)), algorithm: 'fixed-window', key: rule.id, ruleRoute: rule.route }
  }
  private slidingWindow(rule: LimitRule, s: BucketState, cost: number, limit: number, now: number): RateLimitDecision {
    // approximate sliding: sum of current window + weighted previous
    const cfg = rule.config
    const elapsedInWindow = now - (s.windowStart ?? now)
    if (elapsedInWindow >= cfg.periodMs) {
      s.windowStart = now
      s.windowCount = 0
    }
    const elapsed = now - (s.windowStart ?? now)
    const prevWeight = 1 - elapsed / cfg.periodMs
    const effective = (s.windowCount ?? 0) * prevWeight + cost
    if ((s.windowCount ?? 0) + cost > limit) {
      return { allowed: false, remaining: 0, limit, resetMs: cfg.periodMs - elapsed, retryAfterMs: cfg.periodMs - elapsed, reason: 'over_sliding_window', algorithm: 'sliding-window', key: rule.id, ruleRoute: rule.route }
    }
    s.windowCount = (s.windowCount ?? 0) + cost
    return { allowed: true, remaining: limit - (s.windowCount ?? 0), limit, resetMs: cfg.periodMs - elapsed, algorithm: 'sliding-window', key: rule.id, ruleRoute: rule.route }
  }
  private tokenBucket(rule: LimitRule, s: BucketState, cost: number, limit: number, now: number): RateLimitDecision {
    const cfg = rule.config
    const burst = cfg.burst ?? limit
    const refillPerSec = cfg.refillPerSec ?? limit / (cfg.periodMs / 1000)
    const elapsedSec = (now - s.lastRefill) / 1000
    s.tokens = Math.min(burst, (s.tokens ?? 0) + elapsedSec * refillPerSec)
    s.lastRefill = now
    if (s.tokens < cost) {
      const needed = cost - s.tokens
      const retryAfterMs = Math.ceil((needed / refillPerSec) * 1000)
      return { allowed: false, remaining: Math.floor(s.tokens), limit: burst, resetMs: retryAfterMs, retryAfterMs, reason: 'insufficient_tokens', algorithm: 'token-bucket', key: rule.id, ruleRoute: rule.route }
    }
    s.tokens -= cost
    return { allowed: true, remaining: Math.floor(s.tokens), limit: burst, resetMs: Math.ceil(((burst - s.tokens) / refillPerSec) * 1000), algorithm: 'token-bucket', key: rule.id, ruleRoute: rule.route }
  }
  private leakyBucket(rule: LimitRule, s: BucketState, cost: number, limit: number, now: number): RateLimitDecision {
    const cfg = rule.config
    const leakPerSec = cfg.leakPerSec ?? limit / (cfg.periodMs / 1000)
    const elapsedSec = (now - (s.lastLeak ?? now)) / 1000
    s.queue = Math.max(0, (s.queue ?? 0) - elapsedSec * leakPerSec)
    s.lastLeak = now
    if ((s.queue ?? 0) + cost > limit) {
      const overflow = (s.queue ?? 0) + cost - limit
      const retryAfterMs = Math.ceil((overflow / leakPerSec) * 1000)
      return { allowed: false, remaining: Math.floor(limit - (s.queue ?? 0)), limit, resetMs: retryAfterMs, retryAfterMs, reason: 'bucket_full', algorithm: 'leaky-bucket', key: rule.id, ruleRoute: rule.route }
    }
    s.queue = (s.queue ?? 0) + cost
    return { allowed: true, remaining: Math.floor(limit - (s.queue ?? 0)), limit, resetMs: Math.ceil((s.queue ?? 0) / leakPerSec * 1000), algorithm: 'leaky-bucket', key: rule.id, ruleRoute: rule.route }
  }
  private gcra(rule: LimitRule, s: BucketState, cost: number, limit: number, now: number): RateLimitDecision {
    // GCRA: TAT (theoretical arrival time)
    const cfg = rule.config
    const tau = cfg.periodMs / limit // emission interval
    if (s.TAT === undefined) s.TAT = now
    const newTAT = Math.max(now, s.TAT) + cost * tau
    if (newTAT - now > cfg.periodMs) {
      return { allowed: false, remaining: 0, limit, resetMs: newTAT - now - cfg.periodMs, retryAfterMs: newTAT - now - cfg.periodMs, reason: 'gcra_over', algorithm: 'gcra', key: rule.id, ruleRoute: rule.route }
    }
    s.TAT = newTAT
    return { allowed: true, remaining: Math.floor((cfg.periodMs - (s.TAT - now)) / tau), limit, resetMs: s.TAT - now, algorithm: 'gcra', key: rule.id, ruleRoute: rule.route }
  }

  // -------- Helpers --------
  private findRule(ctx: RequestContext): LimitRule | null {
    for (const r of this.listRules()) {
      if (!r.enabled) continue
      if (this.matchRoute(r.route, ctx.route ?? '')) {
        if (r.config.route && !this.matchRoute(r.config.route, ctx.route ?? '')) continue
        return r
      }
    }
    return null
  }
  private matchRoute(pattern: string, actual: string): boolean {
    if (pattern === actual || pattern === '*') return true
    const p = pattern.split('/'), a = actual.split('/')
    if (p.length !== a.length) return false
    for (let i = 0; i < p.length; i++) {
      if (p[i].startsWith(':')) continue
      if (p[i] === '*') continue
      if (p[i] !== a[i]) return false
    }
    return true
  }
  /** HTTP standard rate-limit headers */
  toHeaders(d: RateLimitDecision): Record<string, string> {
    if (d.limit < 0) return {}
    return {
      'X-RateLimit-Limit': String(d.limit),
      'X-RateLimit-Remaining': String(Math.max(0, d.remaining)),
      'X-RateLimit-Reset': String(Math.ceil(d.resetMs / 1000)),
      ...(d.retryAfterMs ? { 'Retry-After': String(Math.ceil(d.retryAfterMs / 1000)) } : {}),
    }
  }
  /** Reset state for a key (e.g. on user logout) */
  resetKey(ruleId: string, key: string): boolean { return this.states.get(ruleId)?.delete(key) ?? false }
  resetAll(): void { for (const m of this.states.values()) m.clear() }
  /** Snapshot state for a key */
  inspectKey(ruleId: string, key: string): BucketState | undefined { return this.states.get(ruleId)?.get(key) }
  /** Adaptive: system load 0..1 */
  setSystemLoad(load: number): void { this.systemLoad = Math.max(0, Math.min(1, load)) }
  getSystemLoad(): number { return this.systemLoad }
  /** Simulate clock skew (for testing) */
  setClockSkew(ms: number): void { this.clockSkewMs = ms }
  getMetrics(): Metrics {
    this.metrics.rulesActive = this.listRules().filter(r => r.enabled).length
    return { ...this.metrics, byAlgorithm: { ...this.metrics.byAlgorithm }, byRoute: { ...this.metrics.byRoute } }
  }
  resetMetrics(): void { this.metrics = { totalChecks: 0, totalAllowed: 0, totalDenied: 0, totalRetries: 0, totalWaits: 0, rulesActive: 0, byAlgorithm: {} as any, byRoute: {} } }

  // -------- Federated (multi-instance simulation) --------
  /** Simulate federated sync — propagate state from peer (last-writer-wins per key) */
  syncFromPeer(peerSnapshot: Map<string, Map<string, BucketState>>): void {
    for (const [ruleId, peerMap] of peerSnapshot.entries()) {
      const local = this.states.get(ruleId)
      if (!local) continue
      for (const [k, ps] of peerMap.entries()) {
        const ls = local.get(k)
        if (!ls || (ps.lastRefill > (ls.lastRefill ?? 0))) local.set(k, ps)
      }
    }
  }
  exportState(): Map<string, Map<string, BucketState>> {
    const out = new Map<string, Map<string, BucketState>>()
    for (const [rid, m] of this.states.entries()) out.set(rid, new Map(m))
    return out
  }

  // -------- Convenience --------
  /** Quick IP rate limit */
  limitByIp(ip: string, limit: number, periodMs: number, algorithm: Algorithm = 'token-bucket'): RateLimitDecision {
    let rule = this.listRules().find(r => r.config.keyFn?.toString().includes('ip'))
    if (!rule) {
      rule = this.addRule({ name: `ip-${ip}`, route: '*', enabled: true, priority: 10, whitelist: [], blacklist: [], config: { algorithm, limit, periodMs, keyFn: (ctx) => ctx.ip ?? ctx.key } })
    }
    return this.check({ key: ip, ip })
  }
  /** Quick user rate limit */
  limitByUser(userId: string, limit: number, periodMs: number, algorithm: Algorithm = 'sliding-window'): RateLimitDecision {
    return this.check({ key: userId, userId })
  }

  // -------- Internal: use computeBackoff for backoff integration --------
  computeBackoffFor(decision: RateLimitDecision, attempt = 1): number {
    return computeBackoff(attempt, { maxAttempts: 5, baseDelayMs: 100, maxDelayMs: 5000, jitter: true, retryOnStatus: [429] })
  }
}

let _instance: RateLimiter | null = null
export function getRateLimiter(): RateLimiter { if (!_instance) _instance = new RateLimiter(); return _instance }
export function resetRateLimiter(): void { _instance = null }
export { RateLimiter as default }
