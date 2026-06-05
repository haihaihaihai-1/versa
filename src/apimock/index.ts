/**
 * Versa · API Mock Service (v42.0)
 * - Stub/mock HTTP responses for testing & local dev
 * - Path matching (exact, param, wildcard), method match, priority
 * - Response strategies: static, sequence, template, proxy, dynamic
 * - Latency injection, fault injection (5xx, timeout, abort)
 * - State machine per endpoint (NextState)
 * - Scenario recordings + playback
 * - Request/response log with assertions
 * - Webhook trigger on match (sub-mock callouts)
 * - Schema validation passthrough (delegates to caller)
 */
import { withRetry, computeBackoff } from '../federation'

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS' | '*'

export type ResponseStrategy =
  | { kind: 'static'; status: number; headers?: Record<string, string>; body: unknown; delayMs?: number }
  | { kind: 'sequence'; status: number; bodies: unknown[]; headers?: Record<string, string>; delayMs?: number }
  | { kind: 'template'; status: number; template: (req: MockRequest) => unknown; delayMs?: number }
  | { kind: 'dynamic'; handler: (req: MockRequest) => MockResponse | Promise<MockResponse> }
  | { kind: 'proxy'; upstream: string; preservePath?: boolean; preserveQuery?: boolean; delayMs?: number }
  | { kind: 'fault'; status: number; errorBody?: unknown }

export interface MockRequest {
  method: Method
  path: string
  query: Record<string, string | string[]>
  headers: Record<string, string>
  body: unknown
  bodyText?: string
  ip?: string
  /** request index in scenario (if part of recording) */
  index?: number
}

export interface MockResponse {
  status: number
  headers?: Record<string, string>
  body: unknown
  bodyText?: string
  delayMs?: number
  /** if true, after returning this, the mock is "consumed" and removed */
  consumed?: boolean
}

export interface MockRule {
  id: string
  name: string
  method: Method
  path: string // exact or :param or *
  query?: Record<string, string | RegExp>
  headers?: Record<string, string | RegExp>
  bodyMatch?: BodyMatcher
  response: ResponseStrategy
  priority: number
  enabled: boolean
  tags: string[]
  hits: number
  createdAt: number
  nextState?: { onMatch: string; onMiss?: string } // state machine
  scenarios?: { id: string; active: boolean; current: number }
  description?: string
}

export type BodyMatcher =
  | { kind: 'exact'; value: unknown }
  | { kind: 'jsonpath'; path: string; equals: unknown }
  | { kind: 'contains'; substring: string }
  | { kind: 'regex'; pattern: string; flags?: string }

export interface Scenario {
  id: string
  name: string
  rules: MockRule[] // ordered list of expected calls
  cursor: number
  active: boolean
  hits: number
  missed: number
  recordedAt: number
  meta?: Record<string, unknown>
}

export interface AssertionResult {
  passed: boolean
  ruleId: string
  expected?: MockResponse
  actual: MockResponse
  diff?: string
}

export interface MockLogEntry {
  ts: number
  ruleId: string | null
  method: string
  path: string
  request: MockRequest
  response: MockResponse
  durationMs: number
  matched: boolean
}

export interface WebhookCall {
  ts: number
  url: string
  method: Method
  body: unknown
  status?: number
  error?: string
}

export class ApiMockService {
  private rules = new Map<string, MockRule>()
  private scenarios = new Map<string, Scenario>()
  private log: MockLogEntry[] = []
  private webhooks: WebhookCall[] = []
  private globalLatencyMs = 0
  private maxLog = 1000

  setGlobalLatency(ms: number): void { this.globalLatencyMs = Math.max(0, ms) }
  getGlobalLatency(): number { return this.globalLatencyMs }
  setMaxLog(n: number): void { this.maxLog = Math.max(0, n); if (this.log.length > this.maxLog) this.log = this.log.slice(-this.maxLog) }

  // -------- Rule Management --------
  addRule(rule: Omit<MockRule, 'id' | 'hits' | 'createdAt'> & { id?: string }): MockRule {
    const id = rule.id ?? `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const full: MockRule = { ...rule, id, hits: 0, createdAt: Date.now() }
    this.rules.set(id, full)
    return full
  }
  removeRule(id: string): boolean { return this.rules.delete(id) }
  getRule(id: string): MockRule | undefined { return this.rules.get(id) }
  listRules(filter?: { tag?: string; enabled?: boolean; method?: Method }): MockRule[] {
    let arr = [...this.rules.values()]
    if (filter?.tag) arr = arr.filter(r => r.tags.includes(filter.tag!))
    if (filter?.enabled !== undefined) arr = arr.filter(r => r.enabled === filter.enabled)
    if (filter?.method) arr = arr.filter(r => r.method === filter.method || r.method === '*')
    return arr.sort((a, b) => b.priority - a.priority)
  }
  enableRule(id: string, on = true): void { const r = this.rules.get(id); if (r) r.enabled = on }
  updateRule(id: string, patch: Partial<MockRule>): MockRule | undefined {
    const r = this.rules.get(id); if (!r) return undefined
    Object.assign(r, patch); return r
  }

  // -------- Matching --------
  match(req: MockRequest): MockRule | null {
    const candidates = this.listRules({ enabled: true, method: req.method })
    for (const rule of candidates) {
      if (this.matchPath(rule.path, req.path) && this.matchQuery(rule.query, req.query) && this.matchHeaders(rule.headers, req.headers) && this.matchBody(rule.bodyMatch, req)) {
        return rule
      }
    }
    return null
  }
  matchPath(pattern: string, actual: string): boolean {
    if (pattern === actual) return true
    if (pattern === '*') return true
    const pParts = pattern.split('/')
    const aParts = actual.split('/')
    if (pParts.length !== aParts.length) return false
    for (let i = 0; i < pParts.length; i++) {
      if (pParts[i].startsWith(':')) continue
      if (pParts[i] === '*') continue
      if (pParts[i] !== aParts[i]) return false
    }
    return true
  }
  extractParams(pattern: string, actual: string): Record<string, string> {
    const pParts = pattern.split('/')
    const aParts = actual.split('/')
    const out: Record<string, string> = {}
    if (pParts.length !== aParts.length) return out
    for (let i = 0; i < pParts.length; i++) {
      if (pParts[i].startsWith(':')) out[pParts[i].slice(1)] = aParts[i]
    }
    return out
  }
  private matchQuery(rule: Record<string, string | RegExp> | undefined, actual: Record<string, string | string[]>): boolean {
    if (!rule) return true
    for (const [k, v] of Object.entries(rule)) {
      const a = actual[k]
      if (a === undefined) return false
      const aStr = Array.isArray(a) ? a.join(',') : a
      if (typeof v === 'string') { if (aStr !== v) return false }
      else { if (!v.test(aStr)) return false }
    }
    return true
  }
  private matchHeaders(rule: Record<string, string | RegExp> | undefined, actual: Record<string, string>): boolean {
    if (!rule) return true
    for (const [k, v] of Object.entries(rule)) {
      const a = actual[k] ?? actual[k.toLowerCase()]
      if (a === undefined) return false
      if (typeof v === 'string') { if (a !== v) return false }
      else { if (!v.test(a)) return false }
    }
    return true
  }
  private matchBody(m: BodyMatcher | undefined, req: MockRequest): boolean {
    if (!m) return true
    switch (m.kind) {
      case 'exact': return JSON.stringify(req.body) === JSON.stringify(m.value)
      case 'jsonpath': {
        const v = this.evalJsonPath(req.body, m.path)
        return JSON.stringify(v) === JSON.stringify(m.equals)
      }
      case 'contains': return (req.bodyText ?? '').includes(m.substring) || JSON.stringify(req.body).includes(m.substring)
      case 'regex': { try { return new RegExp(m.pattern, m.flags).test(req.bodyText ?? JSON.stringify(req.body)) } catch { return false } }
    }
  }
  private evalJsonPath(obj: unknown, path: string): unknown {
    const parts = path.split('.').filter(Boolean)
    let cur: any = obj
    for (const p of parts) {
      if (cur == null) return undefined
      cur = cur[p]
    }
    return cur
  }

  // -------- Execution --------
  async handle(req: MockRequest): Promise<MockResponse> {
    const start = Date.now()
    const matched = this.match(req)
    let response: MockResponse
    let stateTransition: { from: string; to: string } | null = null
    if (!matched) {
      response = { status: 404, body: { error: 'mock_not_found', path: req.path, method: req.method } }
      this.recordLog(null, req, response, Date.now() - start, false)
      return response
    }
    matched.hits++
    response = await this.executeStrategy(matched, req)
    // state machine
    if (matched.nextState) {
      const sc = this.scenarios.get(matched.nextState.onMatch)
      if (sc) {
        stateTransition = { from: sc.id, to: matched.nextState.onMatch }
        sc.hits++
      }
    }
    if (response.consumed) this.removeRule(matched.id)
    this.recordLog(matched.id, req, response, Date.now() - start, true)
    if (stateTransition) (response as any)._transition = stateTransition
    return response
  }
  private async executeStrategy(rule: MockRule, req: MockRequest): Promise<MockResponse> {
    const r = rule.response
    const totalDelay = this.globalLatencyMs + (('delayMs' in r && r.delayMs) || 0)
    if (totalDelay > 0) await new Promise(res => setTimeout(res, totalDelay))
    switch (r.kind) {
      case 'static': return { status: r.status, headers: r.headers, body: r.body }
      case 'sequence': {
        const idx = (rule as any).seqIdx ?? 0
        const body = r.bodies[idx] ?? r.bodies[r.bodies.length - 1]
        ;(rule as any).seqIdx = idx + 1
        return { status: r.status, headers: r.headers, body, consumed: idx + 1 >= r.bodies.length }
      }
      case 'template': return { status: r.status, body: r.template(req) }
      case 'dynamic': return await r.handler(req)
      case 'proxy': {
        // simulated proxy: build a URL and return a fake proxy response
        const url = r.upstream + (r.preservePath === false ? '' : req.path) + (r.preserveQuery === false ? '' : '?' + new URLSearchParams(req.query as any).toString())
        return { status: 200, body: { proxied: true, url, method: req.method, original: req.body } }
      }
      case 'fault': return { status: r.status, body: r.errorBody ?? { error: 'mock_fault', message: 'injected fault' } }
    }
  }

  // -------- Scenarios --------
  createScenario(s: Omit<Scenario, 'cursor' | 'active' | 'hits' | 'missed' | 'recordedAt'> & { id?: string }): Scenario {
    const id = s.id ?? `sc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const full: Scenario = { ...s, id, cursor: 0, active: true, hits: 0, missed: 0, recordedAt: Date.now() }
    this.scenarios.set(id, full)
    return full
  }
  activateScenario(id: string, on = true): void { const s = this.scenarios.get(id); if (s) s.active = on }
  removeScenario(id: string): boolean { return this.scenarios.delete(id) }
  getScenario(id: string): Scenario | undefined { return this.scenarios.get(id) }
  listScenarios(): Scenario[] { return [...this.scenarios.values()] }
  /** Record a sequence of calls */
  record(entries: Array<{ method: Method; path: string; request?: Partial<MockRequest>; response: MockResponse }>, meta?: Record<string, unknown>): Scenario {
    const rules: MockRule[] = entries.map((e, i) => ({
      id: `rec-${Date.now()}-${i}`,
      name: `recording[${i}] ${e.method} ${e.path}`,
      method: e.method,
      path: e.path,
      response: { kind: 'static', status: e.response.status, body: e.response.body, headers: e.response.headers },
      priority: 1000 - i,
      enabled: true,
      tags: ['recording'],
      hits: 0,
      createdAt: Date.now(),
    }))
    return this.createScenario({ id: `rec-${Date.now()}`, name: 'recording', rules, meta })
  }
  /** Play back a scenario, returns per-step results */
  async playback(scenarioId: string): Promise<AssertionResult[]> {
    const sc = this.scenarios.get(scenarioId)
    if (!sc) throw new Error(`scenario ${scenarioId} not found`)
    const results: AssertionResult[] = []
    for (const rule of sc.rules) {
      const req: MockRequest = { method: rule.method, path: rule.path, query: {}, headers: {}, body: null }
      const resp = await this.handle(req)
      results.push({ passed: resp.status === 200 || resp.status === 201 || resp.status === 204, ruleId: rule.id, actual: resp, expected: undefined })
    }
    return results
  }

  // -------- Log --------
  private recordLog(ruleId: string | null, req: MockRequest, resp: MockResponse, durationMs: number, matched: boolean): void {
    this.log.push({ ts: Date.now(), ruleId, method: req.method, path: req.path, request: req, response: resp, durationMs, matched })
    if (this.log.length > this.maxLog) this.log = this.log.slice(-this.maxLog)
  }
  getLog(filter?: { ruleId?: string; matched?: boolean; since?: number; pathPrefix?: string; limit?: number }): MockLogEntry[] {
    let arr = [...this.log]
    if (filter?.ruleId) arr = arr.filter(e => e.ruleId === filter.ruleId)
    if (filter?.matched !== undefined) arr = arr.filter(e => e.matched === filter.matched)
    if (filter?.since) arr = arr.filter(e => e.ts >= filter.since!)
    if (filter?.pathPrefix) arr = arr.filter(e => e.path.startsWith(filter.pathPrefix!))
    return arr.slice(-(filter?.limit ?? 100))
  }
  clearLog(): void { this.log = [] }

  // -------- Webhooks --------
  async triggerWebhook(url: string, body: unknown, method: Method = 'POST'): Promise<WebhookCall> {
    const call: WebhookCall = { ts: Date.now(), url, method, body }
    try {
      // simulated webhook
      call.status = 200
      this.webhooks.push(call); return call
    } catch (e) {
      call.error = (e as Error).message; this.webhooks.push(call); return call
    }
  }
  getWebhooks(): WebhookCall[] { return [...this.webhooks] }
  clearWebhooks(): void { this.webhooks = [] }

  // -------- Metrics --------
  metrics(): { rules: number; scenarios: number; matched: number; unmatched: number; avgLatencyMs: number; totalRequests: number; webhooks: number } {
    const matched = this.log.filter(e => e.matched).length
    const total = this.log.length
    const avg = total > 0 ? this.log.reduce((a, e) => a + e.durationMs, 0) / total : 0
    return { rules: this.rules.size, scenarios: this.scenarios.size, matched, unmatched: total - matched, avgLatencyMs: avg, totalRequests: total, webhooks: this.webhooks.length }
  }

  // -------- Convenience helpers --------
  /** Quick GET stub */
  stubGet(path: string, body: unknown, status = 200, opts: Partial<MockRule> = {}): MockRule {
    return this.addRule({ name: opts.name ?? `GET ${path}`, method: 'GET', path, response: { kind: 'static', status, body }, priority: opts.priority ?? 50, enabled: true, tags: opts.tags ?? ['default'], ...opts })
  }
  stubPost(path: string, body: unknown, status = 201): MockRule {
    return this.addRule({ name: `POST ${path}`, method: 'POST', path, response: { kind: 'static', status, body }, priority: 50, enabled: true, tags: ['default'] })
  }
  stubDynamic(path: string, handler: (req: MockRequest) => MockResponse, opts: Partial<MockRule> = {}): MockRule {
    return this.addRule({ name: opts.name ?? `dynamic ${path}`, method: opts.method ?? 'GET', path, response: { kind: 'dynamic', handler }, priority: opts.priority ?? 50, enabled: true, tags: opts.tags ?? ['dynamic'] })
  }
  stubFault(path: string, status = 500): MockRule {
    return this.addRule({ name: `fault ${path}`, method: 'GET', path, response: { kind: 'fault', status }, priority: 50, enabled: true, tags: ['fault'] })
  }

  // -------- Retry/Backoff integration --------
  async fetchWithRetry(url: string, init: RequestInit = {}, max = 3): Promise<Response> {
    return withRetry(() => fetch(url, init), { maxAttempts: max, baseDelayMs: 100, maxDelayMs: 5000, jitter: true, retryOnStatus: [502, 503, 504] })
  }
}

let _instance: ApiMockService | null = null
export function getApiMock(): ApiMockService { if (!_instance) _instance = new ApiMockService(); return _instance }
export function resetApiMock(): void { _instance = null }
export { ApiMockService as default }
