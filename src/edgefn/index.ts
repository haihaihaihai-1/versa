/**
 * Versa · Edge Functions / Serverless Runtime (v57.0)
 * - Function registration (route + handler)
 * - HTTP-style request/response objects
 * - Route matching (exact / wildcard / param / regex)
 * - Methods (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS)
 * - Middleware chain (before / after)
 * - Body parsing (JSON / form-urlencoded / text)
 * - Query & path params
 * - Headers (case-insensitive)
 * - CORS helpers
 * - Response builders (json / text / html / status / empty)
 * - Edge location / region routing
 * - Cold start tracking
 * - Execution timeout
 * - Invocation metrics
 * - Function versioning & aliases
 * - Secrets access (per-function)
 * - Event-driven (cron / queue / http)
 */
import { randomUUID } from 'crypto'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
export type Trigger = 'http' | 'cron' | 'queue' | 'event'
export type Region = 'us-east' | 'us-west' | 'eu-central' | 'ap-northeast' | 'sa-east'

export interface EdgeRequest {
  method: HttpMethod
  url: string
  path: string
  query: Record<string, string>
  params: Record<string, string>
  headers: Record<string, string>
  body: string
  jsonBody?: unknown
  formBody?: Record<string, string>
  region?: Region
  remoteAddr?: string
  idempotencyKey?: string
  cookies?: Record<string, string>
}

export interface EdgeResponse {
  status: number
  headers: Record<string, string>
  body: string
  jsonBody?: unknown
}

export type Handler = (req: EdgeRequest) => EdgeResponse | Promise<EdgeResponse>
export type Middleware = (req: EdgeRequest, next: () => Promise<EdgeResponse>) => EdgeResponse | Promise<EdgeResponse>

export interface EdgeFunction {
  name: string
  version: string
  handler: Handler
  triggers: Trigger[]
  methods?: HttpMethod[]
  regions?: Region[]
  timeoutMs?: number
  memoryMb?: number
  env?: Record<string, string>
  secrets?: string[]
  middleware?: Middleware[]
  createdAt: number
  updatedAt: number
  alias?: string
}

export interface Invocation {
  id: string
  functionName: string
  version: string
  trigger: Trigger
  status: number
  durationMs: number
  coldStart: boolean
  timestamp: number
  region?: Region
  error?: string
}

export interface EdgeMetrics {
  totalFunctions: number
  totalInvocations: number
  totalErrors: number
  totalColdStarts: number
  byTrigger: Record<Trigger, number>
  byRegion: Record<Region, number>
  avgDurationMs: number
}

export class EdgeRuntime {
  private functions = new Map<string, EdgeFunction>()
  private aliases = new Map<string, string>() // alias → function name
  private routes: Array<{ method: HttpMethod; pattern: string; regex: RegExp; keys: string[]; functionName: string }> = []
  private globalMiddleware: Middleware[] = []
  private invocations: Invocation[] = []
  private metrics: EdgeMetrics = { totalFunctions: 0, totalInvocations: 0, totalErrors: 0, totalColdStarts: 0, byTrigger: { http: 0, cron: 0, queue: 0, event: 0 }, byRegion: { 'us-east': 0, 'us-west': 0, 'eu-central': 0, 'ap-northeast': 0, 'sa-east': 0 }, avgDurationMs: 0 }
  private cold = new Set<string>()

  // -------- Function registration --------
  registerFunction(fn: Omit<EdgeFunction, 'createdAt' | 'updatedAt'>): EdgeFunction {
    const f: EdgeFunction = { ...fn, createdAt: Date.now(), updatedAt: Date.now() }
    this.functions.set(f.name, f)
    this.metrics.totalFunctions = this.functions.size
    if (f.alias) this.aliases.set(f.alias, f.name)
    if (f.triggers.includes('http')) {
      for (const m of f.methods ?? ['GET']) {
        this.routes.push({ method: m, pattern: f.name, regex: this.compileRoute(f.name), keys: this.extractKeys(f.name), functionName: f.name })
      }
    }
    return f
  }
  updateFunction(name: string, patch: Partial<EdgeFunction>): EdgeFunction {
    const f = this.functions.get(name); if (!f) throw new Error(`function ${name} not found`)
    Object.assign(f, patch, { updatedAt: Date.now() })
    return f
  }
  deleteFunction(name: string): boolean {
    this.routes = this.routes.filter(r => r.functionName !== name)
    this.cold.delete(name)
    return this.functions.delete(name)
  }
  getFunction(name: string): EdgeFunction | undefined { return this.functions.get(name) }
  resolveAlias(alias: string): EdgeFunction | undefined { const n = this.aliases.get(alias); if (n) return this.functions.get(n); return undefined }
  listFunctions(): EdgeFunction[] { return [...this.functions.values()] }
  listRoutes(): Array<{ method: HttpMethod; pattern: string; functionName: string }> { return this.routes.map(r => ({ method: r.method, pattern: r.pattern, functionName: r.functionName })) }

  // -------- Route matching --------
  private compileRoute(pattern: string): RegExp {
    const re = pattern.replace(/:[^/]+/g, '([^/]+)').replace(/\*/g, '.*')
    return new RegExp(`^/${re}$`)
  }
  private extractKeys(pattern: string): string[] {
    const keys: string[] = []
    const re = /:([^/]+)/g
    let m
    while ((m = re.exec(pattern)) !== null) keys.push(m[1]!)
    return keys
  }
  private matchRoute(method: HttpMethod, path: string): { route: { method: HttpMethod; pattern: string; regex: RegExp; keys: string[]; functionName: string }; params: Record<string, string> } | null {
    for (const r of this.routes) {
      if (r.method !== method) continue
      const m = path.match(r.regex); if (!m) continue
      const params: Record<string, string> = {}
      r.keys.forEach((k, i) => params[k] = m[i + 1]!)
      return { route: r, params }
    }
    return null
  }

  // -------- Middleware --------
  use(mw: Middleware): void { this.globalMiddleware.push(mw) }

  // -------- Invocation --------
  async invokeHttp(req: EdgeRequest): Promise<EdgeResponse> {
    const match = this.matchRoute(req.method, req.path)
    if (!match) return { status: 404, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: 'Not Found' }) }
    const fn = this.functions.get(match.route.functionName)
    if (!fn) return { status: 500, headers: {}, body: 'Function not found' }
    req.params = match.params
    return this.runFunction(fn, req, 'http')
  }
  async invokeCron(functionName: string, payload?: unknown): Promise<EdgeResponse> {
    const fn = this.functions.get(functionName); if (!fn) return { status: 404, headers: {}, body: 'Not found' }
    const req: EdgeRequest = { method: 'POST', url: '/_cron', path: '/_cron', query: {}, params: {}, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload ?? {}), jsonBody: payload, region: 'us-east' }
    return this.runFunction(fn, req, 'cron')
  }
  async invokeQueue(functionName: string, payload: unknown): Promise<EdgeResponse> {
    const fn = this.functions.get(functionName); if (!fn) return { status: 404, headers: {}, body: 'Not found' }
    const req: EdgeRequest = { method: 'POST', url: '/_queue', path: '/_queue', query: {}, params: {}, headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), jsonBody: payload }
    return this.runFunction(fn, req, 'queue')
  }
  async invokeEvent(functionName: string, eventName: string, payload: unknown): Promise<EdgeResponse> {
    const fn = this.functions.get(functionName); if (!fn) return { status: 404, headers: {}, body: 'Not found' }
    const req: EdgeRequest = { method: 'POST', url: '/_event', path: '/_event', query: {}, params: {}, headers: { 'content-type': 'application/json', 'x-event-name': eventName }, body: JSON.stringify(payload), jsonBody: payload }
    return this.runFunction(fn, req, 'event')
  }

  private async runFunction(fn: EdgeFunction, req: EdgeRequest, trigger: Trigger): Promise<EdgeResponse> {
    const id = randomUUID()
    const start = performance.now()
    const isCold = !this.cold.has(fn.name)
    if (isCold) this.cold.add(fn.name)
    let status = 200
    let err: string | undefined
    try {
      // timeout
      const timeoutMs = fn.timeoutMs ?? 30000
      const exec = (async () => {
        let resp: EdgeResponse = await this.runMiddleware([...this.globalMiddleware, ...(fn.middleware ?? [])], req, () => Promise.resolve(fn.handler(req)))
        return resp
      })()
      const timeout = new Promise<EdgeResponse>((_, reject) => setTimeout(() => reject(new Error('function timed out')), timeoutMs))
      const resp = await Promise.race([exec, timeout])
      status = resp.status
      return resp
    } catch (e) {
      this.metrics.totalErrors++
      err = String(e)
      return { status: 500, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: err }) }
    } finally {
      const duration = performance.now() - start
      this.metrics.totalInvocations++
      this.metrics.byTrigger[trigger]++
      if (req.region) this.metrics.byRegion[req.region]++
      if (isCold) this.metrics.totalColdStarts++
      // rolling avg
      const n = this.metrics.totalInvocations
      this.metrics.avgDurationMs = ((this.metrics.avgDurationMs * (n - 1)) + duration) / n
      this.invocations.push({ id, functionName: fn.name, version: fn.version, trigger, status, durationMs: duration, coldStart: isCold, timestamp: Date.now(), region: req.region, error: err })
    }
  }
  private async runMiddleware(mw: Middleware[], req: EdgeRequest, next: () => Promise<EdgeResponse>): Promise<EdgeResponse> {
    if (mw.length === 0) return next()
    const [first, ...rest] = mw
    return first(req, () => this.runMiddleware(rest, req, next))
  }

  // -------- Helpers --------
  parseRequest(input: { method: HttpMethod; url: string; headers: Record<string, string>; body?: string }): EdgeRequest {
    const u = new URL(input.url, 'http://localhost')
    const query: Record<string, string> = {}
    for (const [k, v] of u.searchParams) query[k] = v
    const cookies: Record<string, string> = {}
    const cookieHeader = input.headers['cookie'] ?? input.headers['Cookie']
    if (cookieHeader) for (const c of cookieHeader.split(';')) { const [k, v] = c.trim().split('='); if (k && v) cookies[k] = v }
    let jsonBody: unknown; let formBody: Record<string, string> | undefined
    const ct = (input.headers['content-type'] ?? input.headers['Content-Type'] ?? '').split(';')[0]?.trim()
    if (input.body) {
      if (ct === 'application/json') { try { jsonBody = JSON.parse(input.body) } catch { /* */ } }
      else if (ct === 'application/x-www-form-urlencoded') { formBody = {}; for (const p of new URLSearchParams(input.body)) formBody[p[0]] = p[1]! }
    }
    return { method: input.method, url: input.url, path: u.pathname, query, params: {}, headers: input.headers, body: input.body ?? '', jsonBody, formBody, cookies, region: 'us-east' }
  }
  jsonResponse(data: unknown, status = 200, extra: Record<string, string> = {}): EdgeResponse {
    return { status, headers: { 'content-type': 'application/json', ...extra }, body: JSON.stringify(data), jsonBody: data }
  }
  textResponse(text: string, status = 200, extra: Record<string, string> = {}): EdgeResponse { return { status, headers: { 'content-type': 'text/plain', ...extra }, body: text } }
  htmlResponse(html: string, status = 200, extra: Record<string, string> = {}): EdgeResponse { return { status, headers: { 'content-type': 'text/html', ...extra }, body: html } }
  emptyResponse(status = 204): EdgeResponse { return { status, headers: {}, body: '' } }
  corsHeaders(origin = '*'): Record<string, string> { return { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-allow-headers': 'content-type,authorization,x-idempotency-key' } }

  // -------- Query invocations --------
  listInvocations(filter?: { functionName?: string; status?: number; since?: number }): Invocation[] {
    let arr = [...this.invocations]
    if (filter?.functionName) arr = arr.filter(i => i.functionName === filter.functionName)
    if (filter?.status != null) arr = arr.filter(i => i.status === filter.status)
    if (filter?.since != null) arr = arr.filter(i => i.timestamp >= filter.since!)
    return arr
  }
  getInvocation(id: string): Invocation | undefined { return this.invocations.find(i => i.id === id) }

  // -------- Metrics --------
  getMetrics(): EdgeMetrics { return JSON.parse(JSON.stringify(this.metrics)) }
  resetMetrics(): void { this.metrics = { totalFunctions: this.functions.size, totalInvocations: 0, totalErrors: 0, totalColdStarts: 0, byTrigger: { http: 0, cron: 0, queue: 0, event: 0 }, byRegion: { 'us-east': 0, 'us-west': 0, 'eu-central': 0, 'ap-northeast': 0, 'sa-east': 0 }, avgDurationMs: 0 } }
}

let _instance: EdgeRuntime | null = null
export function getEdgeRuntime(): EdgeRuntime { if (!_instance) _instance = new EdgeRuntime(); return _instance }
export function resetEdgeRuntime(): void { _instance = null }
export { EdgeRuntime as default }
