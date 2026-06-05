/**
 * Versa · Federation Layer (v27.0)
 *
 * 跨服务联邦 / 服务网格核心：
 * - Service Registry (CRUD + tags + weight + region + metadata)
 * - Health Checker (active probing + status FSM + uptime)
 * - Load Balancer (RR / Weighted / Least-Conn / Consistent-Hash / Random)
 * - Circuit Breaker (CLOSED/OPEN/HALF_OPEN, per-service 阈值)
 * - Retry Policy (exponential backoff + jitter + budget)
 * - Federation Router (path/method/header matcher + 路由/回退/镜像)
 * - GraphQL Stitcher (多 SDL → 统一 schema)
 * - Federation Metrics (per-service latency / error rate / throughput)
 */

import { detectRegion, type Region } from '../edge'

// ============== Types ==============

export type ServiceProtocol = 'http' | 'graphql' | 'grpc' | 'websocket'
export type ServiceStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown'
export type LoadBalanceAlgo = 'round-robin' | 'weighted' | 'least-conn' | 'consistent-hash' | 'random'
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface ServiceHealthCheck {
  path?: string
  intervalMs: number
  timeoutMs: number
  expectedStatus?: number
}

export interface ServiceCircuit {
  failureThreshold: number
  cooldownMs: number
  halfOpenMaxTrials: number
}

export interface Service {
  id: string
  name: string
  url: string
  protocol: ServiceProtocol
  region: Region
  tags: string[]
  weight: number
  metadata: Record<string, string>
  healthCheck?: ServiceHealthCheck
  circuit?: ServiceCircuit
  createdAt: number
}

export interface HealthStatus {
  serviceId: string
  serviceName: string
  status: ServiceStatus
  latencyMs: number
  lastCheck: number
  lastError?: string
  consecutiveFailures: number
  consecutiveSuccesses: number
  uptime: number  // 0-1
  checks: number
}

export interface RouteRule {
  id: string
  name: string
  priority: number
  enabled: boolean
  matcher: {
    path?: string
    method?: string
    header?: Record<string, string>
    tag?: string
  }
  service: string  // service name
  action: 'route' | 'fallback' | 'mirror' | 'reject'
  fallbackService?: string
  retries?: number
  timeoutMs?: number
}

export interface CircuitBreakerState {
  state: CircuitState
  failures: number
  successes: number
  openedAt?: number
  halfOpenTrials: number
  lastFailure?: number
  lastSuccess?: number
}

export interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  jitter: boolean
  retryOnStatus: number[]
}

export interface FederationMetrics {
  totalRequests: number
  totalErrors: number
  totalRetries: number
  totalCircuitTrips: number
  errorRate: number
  byService: Record<string, {
    requests: number; errors: number; retries: number; avgLatency: number; p95: number; p99: number
  }>
}

export interface StitchedField {
  type: 'Query' | 'Mutation' | 'Subscription'
  name: string
  service: string
  args: string[]
  returns: string
}

export interface StitchedSchema {
  types: { name: string; kind: string; service: string; fields?: string[] }[]
  queries: StitchedField[]
  mutations: StitchedField[]
  subscriptions: StitchedField[]
  services: string[]
  stitchedAt: number
}

// ============== Service Registry ==============

export class ServiceRegistry {
  private services = new Map<string, Service>()
  private byName = new Map<string, Set<string>>()
  private byTag = new Map<string, Set<string>>()
  private byRegion = new Map<Region, Set<string>>()

  register(svc: Omit<Service, 'createdAt'>): Service {
    const full: Service = { ...svc, createdAt: Date.now() }
    if (this.services.has(svc.id)) throw new Error(`Service id ${svc.id} already exists`)
    this.services.set(svc.id, full)
    if (!this.byName.has(svc.name)) this.byName.set(svc.name, new Set())
    this.byName.get(svc.name)!.add(svc.id)
    for (const tag of svc.tags) {
      if (!this.byTag.has(tag)) this.byTag.set(tag, new Set())
      this.byTag.get(tag)!.add(svc.id)
    }
    if (!this.byRegion.has(svc.region)) this.byRegion.set(svc.region, new Set())
    this.byRegion.get(svc.region)!.add(svc.id)
    return full
  }

  unregister(id: string): boolean {
    const s = this.services.get(id)
    if (!s) return false
    this.services.delete(id)
    this.byName.get(s.name)?.delete(id)
    for (const t of s.tags) this.byTag.get(t)?.delete(id)
    this.byRegion.get(s.region)?.delete(id)
    return true
  }

  get(id: string): Service | undefined { return this.services.get(id) }
  getByName(name: string): Service[] {
    const ids = this.byName.get(name)
    if (!ids) return []
    return [...ids].map(id => this.services.get(id)!).filter(Boolean)
  }
  getByTag(tag: string): Service[] {
    const ids = this.byTag.get(tag)
    if (!ids) return []
    return [...ids].map(id => this.services.get(id)!).filter(Boolean)
  }
  getByRegion(region: Region): Service[] {
    const ids = this.byRegion.get(region)
    if (!ids) return []
    return [...ids].map(id => this.services.get(id)!).filter(Boolean)
  }
  list(): Service[] { return [...this.services.values()] }
  size(): number { return this.services.size }
  clear(): void { this.services.clear(); this.byName.clear(); this.byTag.clear(); this.byRegion.clear() }
  tags(): string[] { return [...this.byTag.keys()] }
  regions(): Region[] { return [...this.byRegion.keys()] }
}

export const serviceRegistry = new ServiceRegistry()

// ============== Health Checker ==============

type HealthProber = (svc: Service) => Promise<{ ok: boolean; latencyMs: number; error?: string }>

export class HealthChecker {
  private statuses = new Map<string, HealthStatus>()
  private timers = new Map<string, ReturnType<typeof setInterval>>()
  private prober: HealthProber

  constructor(prober?: HealthProber) {
    this.prober = prober ?? this.defaultProber
  }

  setProber(p: HealthProber): void { this.prober = p }

  start(svc: Service): void {
    if (!svc.healthCheck) return
    if (this.timers.has(svc.id)) return
    const tick = async () => {
      const cur = this.statuses.get(svc.id) ?? {
        serviceId: svc.id, serviceName: svc.name, status: 'unknown' as ServiceStatus,
        latencyMs: 0, lastCheck: 0, consecutiveFailures: 0, consecutiveSuccesses: 0,
        uptime: 0, checks: 0,
      }
      const result = await this.prober(svc)
      const newChecks = cur.checks + 1
      const newStatus: HealthStatus = {
        ...cur,
        lastCheck: Date.now(),
        latencyMs: result.latencyMs,
        lastError: result.error,
        checks: newChecks,
        status: result.ok
          ? (cur.consecutiveFailures === 0 ? 'healthy' : 'degraded')
          : (cur.consecutiveFailures + 1 >= 3 ? 'unhealthy' : 'degraded'),
        consecutiveFailures: result.ok ? 0 : cur.consecutiveFailures + 1,
        consecutiveSuccesses: result.ok ? cur.consecutiveSuccesses + 1 : 0,
        uptime: result.ok
          ? (cur.uptime * cur.checks + 1) / newChecks
          : (cur.uptime * cur.checks) / newChecks,
      }
      this.statuses.set(svc.id, newStatus)
    }
    void tick()
    this.timers.set(svc.id, setInterval(tick, svc.healthCheck.intervalMs))
  }

  stop(serviceId: string): void {
    const t = this.timers.get(serviceId)
    if (t) { clearInterval(t); this.timers.delete(serviceId) }
  }

  stopAll(): void { for (const id of [...this.timers.keys()]) this.stop(id) }

  get(serviceId: string): HealthStatus | undefined { return this.statuses.get(serviceId) }
  getAll(): HealthStatus[] { return [...this.statuses.values()] }
  setStatus(s: HealthStatus): void { this.statuses.set(s.serviceId, s) }

  private async defaultProber(svc: Service): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    const start = performance.now()
    try {
      const url = svc.healthCheck?.path ? svc.url.replace(/\/?$/, svc.healthCheck.path) : svc.url
      const ctrl = new AbortController()
      const timeout = setTimeout(() => ctrl.abort(), svc.healthCheck?.timeoutMs ?? 3000)
      const res = await fetch(url, { method: 'GET', signal: ctrl.signal })
      clearTimeout(timeout)
      const expected = svc.healthCheck?.expectedStatus ?? 200
      return { ok: res.status === expected, latencyMs: performance.now() - start, error: res.status === expected ? undefined : `HTTP ${res.status}` }
    } catch (e) {
      return { ok: false, latencyMs: performance.now() - start, error: e instanceof Error ? e.message : String(e) }
    }
  }
}

export const healthChecker = new HealthChecker()

// ============== Load Balancer ==============

export class LoadBalancer {
  private counters = new Map<string, number>()  // round-robin
  private conns = new Map<string, number>()  // least-conn
  private hashRing = new Map<string, { vnode: number; svc: Service }[]>()  // consistent-hash

  pick(services: Service[], algo: LoadBalanceAlgo, ctx?: { key?: string; region?: Region }): Service | undefined {
    const pool = services.filter(s => s.weight > 0)
    if (pool.length === 0) return undefined
    if (pool.length === 1) return pool[0]
    if (algo === 'round-robin') {
      const key = pool.map(s => s.id).sort().join('|')
      const i = this.counters.get(key) ?? 0
      this.counters.set(key, i + 1)
      return pool[i % pool.length]
    }
    if (algo === 'weighted') {
      const total = pool.reduce((s, x) => s + x.weight, 0)
      let r = Math.random() * total
      for (const s of pool) { r -= s.weight; if (r <= 0) return s }
      return pool[pool.length - 1]
    }
    if (algo === 'least-conn') {
      let best = pool[0]!
      let min = this.conns.get(best.id) ?? 0
      for (const s of pool) {
        const c = this.conns.get(s.id) ?? 0
        if (c < min) { min = c; best = s }
      }
      return best
    }
    if (algo === 'consistent-hash') {
      const key = ctx?.key ?? ctx?.region ?? 'default'
      const ring = this.getOrBuildRing(key, pool)
      if (ring.length === 0) return pool[0]
      const h = fnv1a(key)
      const node = ring.find(r => r.vnode >= h % 4096) ?? ring[0]
      return node.svc
    }
    // random
    return pool[Math.floor(Math.random() * pool.length)]
  }

  acquire(svc: Service): void {
    this.conns.set(svc.id, (this.conns.get(svc.id) ?? 0) + 1)
  }
  release(svc: Service): void {
    this.conns.set(svc.id, Math.max(0, (this.conns.get(svc.id) ?? 0) - 1))
  }

  reset(): void { this.counters.clear(); this.conns.clear(); this.hashRing.clear() }

  private getOrBuildRing(key: string, services: Service[]): { vnode: number; svc: Service }[] {
    if (this.hashRing.has(key)) return this.hashRing.get(key)!
    const ring: { vnode: number; svc: Service }[] = []
    for (const s of services) {
      const vnodeCount = Math.max(1, Math.round(s.weight * 16))
      for (let i = 0; i < vnodeCount; i++) {
        const v = fnv1a(`${s.id}#${i}`) % 4096
        ring.push({ vnode: v, svc: s })
      }
    }
    ring.sort((a, b) => a.vnode - b.vnode)
    this.hashRing.set(key, ring)
    return ring
  }
}

function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h
}

export const loadBalancer = new LoadBalancer()

// ============== Circuit Breaker ==============

export class CircuitBreakerManager {
  private states = new Map<string, CircuitBreakerState>()

  get(serviceId: string): CircuitBreakerState {
    let s = this.states.get(serviceId)
    if (!s) { s = { state: 'CLOSED', failures: 0, successes: 0, halfOpenTrials: 0 }; this.states.set(serviceId, s) }
    return s
  }

  recordSuccess(serviceId: string): void {
    const s = this.get(serviceId)
    s.successes++
    s.failures = 0
    s.lastSuccess = Date.now()
    if (s.state === 'HALF_OPEN') { s.state = 'CLOSED'; s.halfOpenTrials = 0 }
  }

  recordFailure(serviceId: string, cfg: ServiceCircuit): void {
    const s = this.get(serviceId)
    s.failures++
    s.lastFailure = Date.now()
    if (s.state === 'HALF_OPEN') {
      s.state = 'OPEN'
      s.openedAt = Date.now()
      s.halfOpenTrials = 0
    } else if (s.state === 'CLOSED' && s.failures >= cfg.failureThreshold) {
      s.state = 'OPEN'
      s.openedAt = Date.now()
    }
  }

  allowRequest(serviceId: string, cfg: ServiceCircuit): boolean {
    const s = this.get(serviceId)
    if (s.state === 'CLOSED') return true
    if (s.state === 'OPEN') {
      if (s.openedAt && Date.now() - s.openedAt >= cfg.cooldownMs) {
        s.state = 'HALF_OPEN'
        s.halfOpenTrials++
        return true
      }
      return false
    }
    // HALF_OPEN
    if (s.halfOpenTrials < cfg.halfOpenMaxTrials) {
      s.halfOpenTrials++
      return true
    }
    return false
  }

  forceOpen(serviceId: string): void { const s = this.get(serviceId); s.state = 'OPEN'; s.openedAt = Date.now() }
  forceClose(serviceId: string): void { const s = this.get(serviceId); s.state = 'CLOSED'; s.failures = 0; s.halfOpenTrials = 0 }
  reset(serviceId?: string): void { if (serviceId) this.states.delete(serviceId); else this.states.clear() }
  states_(): Record<string, CircuitBreakerState> { return Object.fromEntries(this.states) }
}

export const circuitBreakers = new CircuitBreakerManager()

// ============== Retry Policy ==============

export function computeBackoff(attempt: number, cfg: RetryConfig): number {
  const base = Math.min(cfg.maxDelayMs, cfg.baseDelayMs * Math.pow(2, attempt - 1))
  if (!cfg.jitter) return base
  return Math.floor(base * (0.5 + Math.random() * 0.5))
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  cfg: RetryConfig,
  shouldRetry?: (err: unknown, attempt: number) => boolean
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      return await fn(attempt)
    } catch (e) {
      lastErr = e
      if (attempt === cfg.maxAttempts) break
      if (shouldRetry && !shouldRetry(e, attempt)) break
      await new Promise(r => setTimeout(r, computeBackoff(attempt, cfg)))
    }
  }
  throw lastErr
}

export const defaultRetry: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
  jitter: true,
  retryOnStatus: [502, 503, 504, 429],
}

// ============== Federation Router ==============

export class FederationRouter {
  private rules: RouteRule[] = []

  addRule(rule: RouteRule): void { this.rules.push(rule); this.sort() }
  removeRule(id: string): boolean {
    const n = this.rules.length
    this.rules = this.rules.filter(r => r.id !== id)
    return this.rules.length < n
  }
  listRules(): RouteRule[] { return [...this.rules] }
  clear(): void { this.rules = [] }
  size(): number { return this.rules.length }

  match(method: string, path: string, headers: Record<string, string>, tags: string[]): RouteRule | undefined {
    for (const r of this.rules) {
      if (!r.enabled) continue
      if (!this.matches(r, method, path, headers, tags)) continue
      return r
    }
    return undefined
  }

  matchAll(method: string, path: string, headers: Record<string, string>, tags: string[]): RouteRule[] {
    return this.rules.filter(r => r.enabled && this.matches(r, method, path, headers, tags))
  }

  private matches(r: RouteRule, method: string, path: string, headers: Record<string, string>, tags: string[]): boolean {
    if (r.matcher.method && r.matcher.method.toUpperCase() !== method.toUpperCase()) return false
    if (r.matcher.path) {
      const re = pathToRegex(r.matcher.path)
      if (!re.test(path)) return false
    }
    if (r.matcher.header) {
      for (const [k, v] of Object.entries(r.matcher.header)) {
        if (headers[k.toLowerCase()] !== v) return false
      }
    }
    if (r.matcher.tag && !tags.includes(r.matcher.tag)) return false
    return true
  }

  private sort(): void { this.rules.sort((a, b) => a.priority - b.priority) }
}

function pathToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '([^/]+)')
    .replace(/\*/g, '.*')
  return new RegExp('^' + escaped + '$')
}

export const federationRouter = new FederationRouter()

// ============== GraphQL Stitcher ==============

export interface SubgraphSchema {
  service: string
  sdl: string
}

export class GraphQLStitcher {
  private subgraphs = new Map<string, SubgraphSchema>()

  addSubgraph(s: SubgraphSchema): void { this.subgraphs.set(s.service, s) }
  removeSubgraph(service: string): boolean { return this.subgraphs.delete(service) }
  listSubgraphs(): string[] { return [...this.subgraphs.keys()] }
  size(): number { return this.subgraphs.size }

  stitch(): StitchedSchema {
    const types: StitchedSchema['types'] = []
    const queries: StitchedField[] = []
    const mutations: StitchedField[] = []
    const subscriptions: StitchedField[] = []

    for (const [service, { sdl }] of this.subgraphs) {
      const typeBlock = /type\s+(\w+)\s*\{([^}]*)\}/g
      let m: RegExpExecArray | null
      while ((m = typeBlock.exec(sdl)) !== null) {
        const name = m[1]!
        const body = m[2]!
        const fields = body.split('\n').map(l => l.trim()).filter(Boolean).map(l => l.split(':')[0]!.split('(')[0]!.trim())
        const kind = (name === 'Query' || name === 'Mutation' || name === 'Subscription') ? name : 'Object'
        if (kind === 'Query' || kind === 'Mutation' || kind === 'Subscription') {
          for (const f of fields) {
            const entry: StitchedField = { type: kind, name: f, service, args: [], returns: 'Unknown' }
            if (kind === 'Query') queries.push(entry)
            else if (kind === 'Mutation') mutations.push(entry)
            else subscriptions.push(entry)
          }
        } else {
          types.push({ name, kind, service, fields })
        }
      }
    }

    return {
      types,
      queries,
      mutations,
      subscriptions,
      services: [...this.subgraphs.keys()],
      stitchedAt: Date.now(),
    }
  }

  resolveField(type: 'Query' | 'Mutation' | 'Subscription', name: string): { service: string; subgraph: SubgraphSchema } | undefined {
    for (const [service, sub] of this.subgraphs) {
      if (sub.sdl.includes(`type ${type}`) && new RegExp(`type\\s+${type}\\s*\\{[^}]*\\b${name}\\s*[(:]`).test(sub.sdl)) {
        return { service, subgraph: sub }
      }
    }
    return undefined
  }
}

export const graphqlStitcher = new GraphQLStitcher()

// ============== Federation Metrics ==============

export class FederationMetricsCollector {
  private counters = new Map<string, number>()
  private histograms = new Map<string, number[]>()

  inc(name: string, n = 1): void { this.counters.set(name, (this.counters.get(name) ?? 0) + n) }
  observe(name: string, v: number): void {
    const arr = this.histograms.get(name) ?? []
    arr.push(v)
    if (arr.length > 2000) arr.shift()
    this.histograms.set(name, arr)
  }

  counter(name: string): number { return this.counters.get(name) ?? 0 }
  histogram(name: string): { p50: number; p95: number; p99: number; count: number; mean: number } {
    const arr = this.histograms.get(name) ?? []
    if (arr.length === 0) return { p50: 0, p95: 0, p99: 0, count: 0, mean: 0 }
    const sorted = [...arr].sort((a, b) => a - b)
    const total = arr.reduce((s, v) => s + v, 0)
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)]!,
      p95: sorted[Math.floor(sorted.length * 0.95)]!,
      p99: sorted[Math.floor(sorted.length * 0.99)]!,
      count: arr.length, mean: total / arr.length,
    }
  }

  snapshot(): FederationMetrics {
    const total = this.counter('fed.req')
    const errors = this.counter('fed.err')
    const byService: FederationMetrics['byService'] = {}
    for (const [k, v] of this.counters) {
      const m = /^fed\.req\.(.+)$/.exec(k)
      if (m) {
        const svc = m[1]!
        const h = this.histogram(`fed.lat.${svc}`) ?? { mean: 0 }
        const errKey = `fed.err.${svc}`
        byService[svc] = {
          requests: v, errors: this.counters.get(errKey) ?? 0,
          retries: this.counters.get(`fed.retry.${svc}`) ?? 0,
          avgLatency: h.mean, p95: h.p95, p99: h.p99,
        }
      }
    }
    return {
      totalRequests: total,
      totalErrors: errors,
      totalRetries: this.counter('fed.retry'),
      totalCircuitTrips: this.counter('fed.cb.trip'),
      errorRate: total === 0 ? 0 : errors / total,
      byService,
    }
  }

  reset(): void { this.counters.clear(); this.histograms.clear() }
}

export const federationMetrics = new FederationMetricsCollector()

// ============== High-level: federatedRequest ==============

export interface FederationRequest {
  method: string
  path: string
  headers?: Record<string, string>
  body?: unknown
  tags?: string[]
  key?: string  // for consistent-hash
  algo?: LoadBalanceAlgo
}

export interface FederationResponse<T = unknown> {
  ok: boolean
  status: number
  data?: T
  error?: string
  service?: string
  attempts: number
  circuitState?: CircuitState
  latencyMs: number
  viaFallback: boolean
}

export async function federatedRequest<T = unknown>(
  req: FederationRequest,
  fetcher: (svc: Service, req: FederationRequest) => Promise<{ status: number; data: T }>
): Promise<FederationResponse<T>> {
  const start = performance.now()
  federationMetrics.inc('fed.req')
  const tags = req.tags ?? []
  const headers = (req.headers ?? {}) as Record<string, string>
  const headersLower: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) headersLower[k.toLowerCase()] = v

  const rule = federationRouter.match(req.method, req.path, headersLower, tags)
  if (!rule) {
    federationMetrics.inc('fed.err')
    return { ok: false, status: 404, error: 'no matching route', attempts: 0, latencyMs: performance.now() - start, viaFallback: false }
  }
  if (rule.action === 'reject') {
    federationMetrics.inc('fed.err')
    return { ok: false, status: 403, error: 'rejected by route', attempts: 0, latencyMs: performance.now() - start, viaFallback: false }
  }

  const tryService = async (svc: Service, isFallback: boolean): Promise<FederationResponse<T>> => {
    const cb = svc.circuit ?? { failureThreshold: 5, cooldownMs: 30_000, halfOpenMaxTrials: 1 }
    if (!circuitBreakers.allowRequest(svc.id, cb)) {
      federationMetrics.inc('fed.cb.trip')
      return { ok: false, status: 503, error: `circuit open for ${svc.name}`, attempts: 0, circuitState: 'OPEN', latencyMs: 0, viaFallback: isFallback }
    }
    loadBalancer.acquire(svc)
    const attempts = (rule.retries ?? 0) + 1
    try {
      const result = await withRetry(
        async () => fetcher(svc, req),
        { ...defaultRetry, maxAttempts: attempts },
        () => true
      )
      circuitBreakers.recordSuccess(svc.id)
      federationMetrics.inc(`fed.req.${svc.name}`)
      federationMetrics.observe(`fed.lat.${svc.name}`, performance.now() - start)
      return { ok: result.status >= 200 && result.status < 300, status: result.status, data: result.data, service: svc.name, attempts, circuitState: circuitBreakers.get(svc.id).state, latencyMs: performance.now() - start, viaFallback: isFallback }
    } catch (e) {
      circuitBreakers.recordFailure(svc.id, cb)
      federationMetrics.inc('fed.err')
      federationMetrics.inc(`fed.err.${svc.name}`)
      return { ok: false, status: 500, error: e instanceof Error ? e.message : String(e), service: svc.name, attempts, circuitState: circuitBreakers.get(svc.id).state, latencyMs: performance.now() - start, viaFallback: isFallback }
    } finally {
      loadBalancer.release(svc)
    }
  }

  const primary = serviceRegistry.getByName(rule.service)
  if (primary.length === 0) {
    federationMetrics.inc('fed.err')
    return { ok: false, status: 502, error: `service ${rule.service} not found`, attempts: 0, latencyMs: performance.now() - start, viaFallback: false }
  }
  const picked = loadBalancer.pick(primary, req.algo ?? 'round-robin', { key: req.key, region: detectRegion().region })
  if (!picked) {
    federationMetrics.inc('fed.err')
    return { ok: false, status: 502, error: 'load balancer returned no service', attempts: 0, latencyMs: performance.now() - start, viaFallback: false }
  }
  const r = await tryService(picked, false)
  if (!r.ok && rule.fallbackService) {
    const fb = serviceRegistry.getByName(rule.fallbackService)
    const fbPicked = loadBalancer.pick(fb, req.algo ?? 'round-robin')
    if (fbPicked) {
      const rfb = await tryService(fbPicked, true)
      return rfb
    }
  }
  return r
}

// ============== Summarize ==============

export function summarizeFederation() {
  return {
    services: serviceRegistry.size(),
    healthy: healthChecker.getAll().filter(s => s.status === 'healthy').length,
    unhealthy: healthChecker.getAll().filter(s => s.status === 'unhealthy').length,
    rules: federationRouter.size(),
    circuits: Object.keys(circuitBreakers.states_()).length,
    subgraphs: graphqlStitcher.size(),
    metrics: federationMetrics.snapshot(),
  }
}
