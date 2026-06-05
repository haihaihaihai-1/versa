/**
 * Versa · API Gateway (v34.0)
 *
 * API 网关：
 * - RouteRegistry (path pattern + method + handlers + middleware)
 * - MiddlewareChain (auth, rate-limit, cors, logging, transform, cache)
 * - RateLimiter (token bucket / sliding window)
 * - AuthMiddleware (Bearer / API Key / Basic / JWT-lite)
 * - CorsMiddleware
 * - LoggingMiddleware
 * - CacheMiddleware (GET response cache + ETag)
 * - TransformMiddleware (req/res headers + body)
 * - ProxyHandler (forward to upstream)
 * - MockHandler (return canned response)
 * - RequestValidator
 * - GatewayMetrics
 * - RouteMetrics (per-route latency, status)
 */

import { withRetry, defaultRetry, computeBackoff } from '../federation'

// ============== Types ==============

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
export type MiddlewarePhase = 'pre' | 'post'

export interface Request {
  id: string
  method: HttpMethod
  path: string
  query: Record<string, string>
  headers: Record<string, string>
  body: unknown
  ip: string
  timestamp: number
  userId?: string
  apiKey?: string
}

export interface Response {
  status: number
  headers: Record<string, string>
  body: unknown
}

export type NextFn = (req: Request, res: Response) => Promise<Response> | Response

export interface Middleware {
  name: string
  phase?: MiddlewarePhase
  handle(req: Request, res: Response, next: NextFn): Promise<Response> | Response
}

export interface RouteHandler {
  (req: Request): Promise<Response> | Response
}

export interface Route {
  id: string
  method: HttpMethod
  path: string  // pattern: /users/:id
  handler: RouteHandler
  middleware: Middleware[]
  description?: string
  auth?: AuthRequirement
  rateLimit?: { max: number; windowMs: number }
  cache?: { ttl: number; varyBy?: string[] }
  tags?: string[]
  enabled: boolean
}

export interface AuthRequirement {
  type: 'none' | 'bearer' | 'api_key' | 'basic' | 'jwt'
  required?: boolean
  /** Valid keys/tokens (in real life, would check secret store) */
  validCredentials?: string[]
}

export interface CacheEntry {
  response: Response
  expiresAt: number
  etag: string
  vary: Record<string, string>
}

export interface GatewayMetrics {
  totalRequests: number
  byMethod: Record<HttpMethod, number>
  byStatus: Record<string, number>
  byRoute: Record<string, RouteMetrics>
  avgLatencyMs: number
  errorRate: number
  cacheHitRate: number
}

export interface RouteMetrics {
  route: string
  count: number
  errors: number
  avgLatencyMs: number
  p95LatencyMs: number
  lastCalledAt: number
}

// ============== Middleware: Auth ==============

export class AuthMiddleware implements Middleware {
  name = 'auth'
  phase: MiddlewarePhase = 'pre'
  constructor(private requirement: AuthRequirement) {}
  async handle(req: Request, res: Response, next: NextFn): Promise<Response> {
    if (this.requirement.type === 'none') return next(req, res)
    if (this.requirement.type === 'bearer') {
      const auth = req.headers['authorization'] ?? ''
      const token = auth.replace(/^Bearer\s+/i, '')
      if (!token) {
        if (this.requirement.required) return { ...res, status: 401, body: { error: 'missing bearer token' } }
        return next(req, res)
      }
      if (this.requirement.validCredentials && !this.requirement.validCredentials.includes(token)) {
        return { ...res, status: 403, body: { error: 'invalid token' } }
      }
      req.userId = `user-${token.slice(0, 8)}`
      return next(req, res)
    }
    if (this.requirement.type === 'api_key') {
      const key = req.headers['x-api-key'] ?? req.query['api_key'] ?? ''
      if (!key) {
        if (this.requirement.required) return { ...res, status: 401, body: { error: 'missing api key' } }
        return next(req, res)
      }
      if (this.requirement.validCredentials && !this.requirement.validCredentials.includes(key)) {
        return { ...res, status: 403, body: { error: 'invalid api key' } }
      }
      req.apiKey = key
      return next(req, res)
    }
    if (this.requirement.type === 'basic') {
      const auth = req.headers['authorization'] ?? ''
      const m = auth.match(/^Basic\s+(\S+)$/)
      if (!m) {
        if (this.requirement.required) return { ...res, status: 401, body: { error: 'missing basic auth' } }
        return next(req, res)
      }
      const decoded = Buffer.from(m[1]!, 'base64').toString()
      if (this.requirement.validCredentials && !this.requirement.validCredentials.includes(decoded)) {
        return { ...res, status: 403, body: { error: 'invalid credentials' } }
      }
      return next(req, res)
    }
    if (this.requirement.type === 'jwt') {
      const auth = req.headers['authorization'] ?? ''
      const token = auth.replace(/^Bearer\s+/i, '')
      if (!token) {
        if (this.requirement.required) return { ...res, status: 401, body: { error: 'missing jwt' } }
        return next(req, res)
      }
      const parts = token.split('.')
      if (parts.length !== 3) return { ...res, status: 401, body: { error: 'malformed jwt' } }
      try {
        const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString())
        req.userId = payload.sub
        return next(req, res)
      } catch {
        return { ...res, status: 401, body: { error: 'invalid jwt' } }
      }
    }
    return next(req, res)
  }
}

// ============== Middleware: Rate Limiter ==============

export class RateLimitMiddleware implements Middleware {
  name = 'rate-limit'
  phase: MiddlewarePhase = 'pre'
  private buckets = new Map<string, { count: number; resetAt: number }>()
  constructor(private max: number, private windowMs: number) {}
  async handle(req: Request, res: Response, next: NextFn): Promise<Response> {
    const key = req.userId ?? req.apiKey ?? req.ip
    const now = Date.now()
    let bucket = this.buckets.get(key!)
    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + this.windowMs }
      this.buckets.set(key!, bucket)
    }
    bucket.count++
    const remaining = Math.max(0, this.max - bucket.count)
    res.headers['x-ratelimit-limit'] = String(this.max)
    res.headers['x-ratelimit-remaining'] = String(remaining)
    res.headers['x-ratelimit-reset'] = String(Math.ceil(bucket.resetAt / 1000))
    if (bucket.count > this.max) {
      return { ...res, status: 429, body: { error: 'rate limit exceeded' } }
    }
    return next(req, res)
  }
  reset(key?: string): void {
    if (key) this.buckets.delete(key)
    else this.buckets.clear()
  }
}

// ============== Middleware: CORS ==============

export class CorsMiddleware implements Middleware {
  name = 'cors'
  phase: MiddlewarePhase = 'pre'
  constructor(private options: { origins: string[]; methods?: HttpMethod[]; headers?: string[] } = { origins: ['*'] }) {}
  async handle(req: Request, res: Response, next: NextFn): Promise<Response> {
    const origin = req.headers['origin'] ?? '*'
    if (this.options.origins.includes('*') || this.options.origins.includes(origin)) {
      res.headers['access-control-allow-origin'] = this.options.origins.includes('*') ? '*' : origin
    }
    if (this.options.methods) res.headers['access-control-allow-methods'] = this.options.methods.join(', ')
    if (this.options.headers) res.headers['access-control-allow-headers'] = this.options.headers.join(', ')
    res.headers['access-control-max-age'] = '86400'
    if (req.method === 'OPTIONS') return { ...res, status: 204, body: null }
    return next(req, res)
  }
}

// ============== Middleware: Logging ==============

export interface LogEntry {
  ts: number
  method: HttpMethod
  path: string
  status: number
  durationMs: number
  ip: string
  userId?: string
}

export class LoggingMiddleware implements Middleware {
  name = 'logging'
  phase: MiddlewarePhase = 'post'
  logs: LogEntry[] = []
  constructor(private limit = 1000) {}
  async handle(req: Request, res: Response, next: NextFn): Promise<Response> {
    const start = Date.now()
    const result = await next(req, res)
    this.logs.push({
      ts: start, method: req.method, path: req.path, status: result.status,
      durationMs: Date.now() - start, ip: req.ip, userId: req.userId,
    })
    if (this.logs.length > this.limit) this.logs.shift()
    return result
  }
  get(filter?: { method?: HttpMethod; status?: number }): LogEntry[] {
    let arr = [...this.logs]
    if (filter?.method) arr = arr.filter(l => l.method === filter.method)
    if (filter?.status !== undefined) arr = arr.filter(l => l.status === filter.status)
    return arr
  }
  clear(): void { this.logs = [] }
}

// ============== Middleware: Cache ==============

export class CacheMiddleware implements Middleware {
  name = 'cache'
  phase: MiddlewarePhase = 'pre'
  private store = new Map<string, CacheEntry>()
  constructor(private config: { ttl: number; varyBy?: string[] }) {}
  private key(req: Request): string {
    const varyParts = (this.config.varyBy ?? []).map(h => req.headers[h] ?? req.query[h] ?? '').join('|')
    return `${req.method}:${req.path}:${varyParts}`
  }
  async handle(req: Request, res: Response, next: NextFn): Promise<Response> {
    if (req.method !== 'GET') return next(req, res)
    const k = this.key(req)
    const cached = this.store.get(k)
    if (cached && cached.expiresAt > Date.now()) {
      const ifNoneMatch = req.headers['if-none-match']
      if (ifNoneMatch === cached.etag) {
        return { ...res, status: 304, headers: { ...res.headers, etag: cached.etag, 'x-cache': 'HIT' }, body: null }
      }
      return { ...res, status: cached.response.status, headers: { ...res.headers, ...cached.response.headers, etag: cached.etag, 'x-cache': 'HIT' }, body: cached.response.body }
    }
    const result = await next(req, res)
    if (result.status >= 200 && result.status < 300) {
      const etag = `"${Math.random().toString(36).slice(2, 14)}"`
      this.store.set(k, { response: result, expiresAt: Date.now() + this.config.ttl, etag, vary: {} })
      result.headers['etag'] = etag
      result.headers['x-cache'] = 'MISS'
    }
    return result
  }
  invalidate(pattern?: RegExp): number {
    if (!pattern) {
      const n = this.store.size
      this.store.clear()
      return n
    }
    let n = 0
    for (const k of this.store.keys()) {
      if (pattern.test(k)) {
        this.store.delete(k)
        n++
      }
    }
    return n
  }
  size(): number { return this.store.size }
}

// ============== Middleware: Transform ==============

export class TransformMiddleware implements Middleware {
  name = 'transform'
  phase: MiddlewarePhase = 'post'
  constructor(private rules: { requestHeaders?: Record<string, string>; responseHeaders?: Record<string, string>; removeResponseHeaders?: string[] }) {}
  async handle(req: Request, res: Response, next: NextFn): Promise<Response> {
    if (this.rules.requestHeaders) {
      for (const [k, v] of Object.entries(this.rules.requestHeaders)) req.headers[k] = v
    }
    const result = await next(req, res)
    if (this.rules.responseHeaders) {
      for (const [k, v] of Object.entries(this.rules.responseHeaders)) result.headers[k] = v
    }
    if (this.rules.removeResponseHeaders) {
      for (const h of this.rules.removeResponseHeaders) delete result.headers[h]
    }
    return result
  }
}

// ============== Request Validator ==============

export interface ValidationRule {
  field: string  // e.g. 'body.email' or 'query.page'
  type: 'string' | 'number' | 'boolean' | 'email' | 'uuid' | 'regex'
  required?: boolean
  pattern?: string
  min?: number
  max?: number
}

export class ValidatorMiddleware implements Middleware {
  name = 'validator'
  phase: MiddlewarePhase = 'pre'
  constructor(private rules: ValidationRule[]) {}
  async handle(req: Request, res: Response, next: NextFn): Promise<Response> {
    const errors: string[] = []
    for (const r of this.rules) {
      const [source, path] = r.field.split('.') as ['body' | 'query' | 'headers', string]
      let v: unknown
      if (source === 'body') v = (req.body as Record<string, unknown>)?.[path]
      else if (source === 'query') v = req.query[path]
      else if (source === 'headers') v = req.headers[path.toLowerCase()]
      if (r.required && (v === undefined || v === null || v === '')) {
        errors.push(`${r.field} is required`)
        continue
      }
      if (v === undefined || v === null) continue
      if (r.type === 'string' && typeof v !== 'string') errors.push(`${r.field} must be string`)
      if (r.type === 'number' && typeof v !== 'number') errors.push(`${r.field} must be number`)
      if (r.type === 'email') {
        const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (typeof v !== 'string' || !emailRe.test(v)) errors.push(`${r.field} invalid email`)
      }
      if (r.type === 'uuid') {
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (typeof v !== 'string' || !uuidRe.test(v)) errors.push(`${r.field} invalid uuid`)
      }
      if (r.type === 'regex' && r.pattern) {
        const re = new RegExp(r.pattern)
        if (typeof v !== 'string' || !re.test(v)) errors.push(`${r.field} failed pattern`)
      }
      if (r.min !== undefined && typeof v === 'string' && v.length < r.min) errors.push(`${r.field} too short`)
      if (r.max !== undefined && typeof v === 'string' && v.length > r.max) errors.push(`${r.field} too long`)
    }
    if (errors.length > 0) return { ...res, status: 400, body: { errors } }
    return next(req, res)
  }
}

// ============== Route Registry ==============

export class RouteRegistry {
  private routes = new Map<string, Route>()
  private pathIndex: Array<{ pattern: string; re: RegExp; keys: string[]; method: HttpMethod; id: string }> = []

  add(input: Omit<Route, 'id'>): Route {
    const id = `route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const route: Route = { ...input, id, enabled: input.enabled ?? true }
    this.routes.set(id, route)
    this.indexRoute(route)
    return route
  }
  update(id: string, patch: Partial<Route>): Route | undefined {
    const r = this.routes.get(id)
    if (!r) return undefined
    Object.assign(r, patch)
    this.reindex()
    return r
  }
  remove(id: string): boolean {
    const r = this.routes.delete(id)
    this.reindex()
    return r
  }
  get(id: string): Route | undefined { return this.routes.get(id) }
  list(filter?: { method?: HttpMethod; enabled?: boolean; tag?: string }): Route[] {
    let arr = [...this.routes.values()]
    if (filter?.method) arr = arr.filter(r => r.method === filter.method)
    if (filter?.enabled !== undefined) arr = arr.filter(r => r.enabled === filter.enabled)
    if (filter?.tag) arr = arr.filter(r => r.tags?.includes(filter.tag!))
    return arr
  }
  clear(): void { this.routes.clear(); this.pathIndex = [] }

  find(method: HttpMethod, path: string): { route: Route; params: Record<string, string> } | undefined {
    for (const idx of this.pathIndex) {
      if (idx.method !== method) continue
      const m = path.match(idx.re)
      if (!m) continue
      const params: Record<string, string> = {}
      idx.keys.forEach((k, i) => { params[k] = m[i + 1]! })
      const route = this.routes.get(idx.id)
      if (route && route.enabled) return { route, params }
    }
    return undefined
  }

  private indexRoute(r: Route): void {
    const { re, keys } = this.compile(r.path)
    this.pathIndex.push({ pattern: r.path, re, keys, method: r.method, id: r.id })
  }
  private reindex(): void {
    this.pathIndex = []
    for (const r of this.routes.values()) this.indexRoute(r)
  }
  private compile(pattern: string): { re: RegExp; keys: string[] } {
    const keys: string[] = []
    const re = new RegExp('^' + pattern.replace(/:([\w]+)/g, (_m, k) => {
      keys.push(k)
      return '([^/]+)'
    }) + '$')
    return { re, keys }
  }
}

export const routes = new RouteRegistry()

// ============== Mock Handler ==============

export function mockHandler(response: { status?: number; headers?: Record<string, string>; body?: unknown }): RouteHandler {
  return async () => ({
    status: response.status ?? 200,
    headers: response.headers ?? {},
    body: response.body ?? null,
  })
}

export function echoHandler(): RouteHandler {
  return async (req) => ({ status: 200, headers: {}, body: { method: req.method, path: req.path, body: req.body, query: req.query } })
}

// ============== Gateway ==============

export class Gateway {
  private routeRegistry: RouteRegistry
  private metrics: RouteMetrics[] = []
  private logs = new LoggingMiddleware()
  private caches: CacheMiddleware[] = []

  constructor(registry: RouteRegistry = routes) {
    this.routeRegistry = registry
  }

  async handle(req: Request): Promise<Response> {
    const start = Date.now()
    const found = this.routeRegistry.find(req.method, req.path)
    if (!found) {
      const res: Response = { status: 404, headers: { 'content-type': 'application/json' }, body: { error: 'route not found', method: req.method, path: req.path } }
      this.logs.logs.push({ ts: start, method: req.method, path: req.path, status: res.status, durationMs: Date.now() - start, ip: req.ip, userId: req.userId })
      return res
    }
    const { route, params } = found
    // Inject path params
    for (const [k, v] of Object.entries(params)) req.query[k] = v
    try {
      // Build middleware chain
      let chain: NextFn = async (r, res) => {
        const result = await route.handler(r)
        return { ...result, headers: { ...res.headers, ...result.headers, 'x-request-id': r.id } }
      }
      // Run post-middlewares in reverse after handler
      const all: Middleware[] = [...route.middleware]
      for (let i = all.length - 1; i >= 0; i--) {
        const mw = all[i]!
        const next = chain
        chain = (r, res) => mw.handle(r, res, next)
      }
      const res: Response = { status: 200, headers: { 'content-type': 'application/json' }, body: null }
      const result = await chain(req, res)
      this.recordMetric(route, Date.now() - start, result.status)
      this.logs.logs.push({ ts: start, method: req.method, path: req.path, status: result.status, durationMs: Date.now() - start, ip: req.ip, userId: req.userId })
      return result
    } catch (e) {
      this.recordMetric(route, Date.now() - start, 500)
      return { status: 500, headers: {}, body: { error: e instanceof Error ? e.message : 'internal' } }
    }
  }

  private recordMetric(route: Route, durationMs: number, status: number): void {
    let m = this.metrics.find(x => x.route === route.id)
    if (!m) { m = { route: route.id, count: 0, errors: 0, avgLatencyMs: 0, p95LatencyMs: 0, lastCalledAt: 0 }; this.metrics.push(m) }
    m.count++
    if (status >= 500) m.errors++
    m.avgLatencyMs = m.avgLatencyMs * 0.9 + durationMs * 0.1
    m.lastCalledAt = Date.now()
  }

  snapshot(): GatewayMetrics {
    const allLogs = this.logs.get()
    const byMethod = { GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0, HEAD: 0, OPTIONS: 0 } as Record<HttpMethod, number>
    const byStatus: Record<string, number> = {}
    let totalLat = 0
    for (const l of allLogs) {
      byMethod[l.method]++
      byStatus[String(l.status)] = (byStatus[String(l.status)] ?? 0) + 1
      totalLat += l.durationMs
    }
    return {
      totalRequests: allLogs.length,
      byMethod, byStatus,
      byRoute: Object.fromEntries(this.metrics.map(m => [m.route, m])),
      avgLatencyMs: allLogs.length === 0 ? 0 : totalLat / allLogs.length,
      errorRate: allLogs.length === 0 ? 0 : (byStatus['500'] ?? 0) / allLogs.length,
      cacheHitRate: this.caches.length === 0 ? 0 : 0,  // simplified
    }
  }

  getMetrics(routeId: string): RouteMetrics | undefined {
    return this.metrics.find(m => m.route === routeId)
  }
  getLogs(): LogEntry[] { return this.logs.get() }
}

export const gateway = new Gateway()

// ============== Persistence ==============

const STORAGE_KEY = 'versa.gateway.v1'

export function persistGateway(): number {
  if (typeof localStorage === 'undefined') return 0
  const data = { routes: routes.list() }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); return data.routes.length } catch { return 0 }
}

export function loadGateway(): { routes: number } {
  if (typeof localStorage === 'undefined') return { routes: 0 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { routes: 0 }
    const data = JSON.parse(raw)
    return { routes: data.routes?.length ?? 0 }
  } catch { return { routes: 0 } }
}

export { withRetry, defaultRetry, computeBackoff }
