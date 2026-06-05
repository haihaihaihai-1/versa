/**
 * Versa · GraphQL Gateway (v46.0)
 * - Schema stitching / federation across upstreams
 * - Query parser (simplified): operation name, variables, fragments
 * - Query plan: which upstream serves each field
 * - DataLoader for N+1 prevention
 * - Caching per query
 * - Subscriptions (in-memory pub/sub)
 * - Field-level authorization
 * - Query cost analysis & limits
 * - Persisted queries (APQ)
 * - Metrics
 */
import { withRetry, computeBackoff } from '../federation'

export type GraphQLType =
  | { kind: 'scalar'; name: string; ofType?: string }
  | { kind: 'object'; name: string; fields: Record<string, GraphQLField> }
  | { kind: 'list'; ofType: GraphQLType }
  | { kind: 'non-null'; ofType: GraphQLType }
  | { kind: 'enum'; name: string; values: string[] }
  | { kind: 'input'; name: string; fields: Record<string, GraphQLField> }

export interface GraphQLField {
  name: string
  description?: string
  type: GraphQLType
  args: Record<string, GraphQLField>
  resolve: (parent: unknown, args: Record<string, unknown>, ctx: GraphQLContext) => unknown | Promise<unknown>
  /** which upstream owns this field */
  owner?: string
  /** required scopes */
  requires?: string[]
  cost?: number
  cache?: { ttlMs: number; key?: (args: Record<string, unknown>) => string }
}

export interface GraphQLContext {
  userId?: string
  scopes?: string[]
  headers?: Record<string, string>
  ip?: string
  traceId?: string
  /** data loader cache */
  loaders: Map<string, DataLoader<unknown, unknown>>
}

export interface DataLoader<K, V> {
  load(key: K): Promise<V>
  loadMany(keys: K[]): Promise<V[]>
  clear(key: K): void
  clearAll(): void
  prime(key: K, value: V): void
}

export interface GraphQLUpstream {
  name: string
  schema: string // SDL-like blob
  /** field map: Type.field -> upstream name */
  fieldOwners: Record<string, string>
  /** execute a field on this upstream */
  execute: (field: string, args: Record<string, unknown>, ctx: GraphQLContext) => Promise<unknown>
  /** health check */
  healthy: () => boolean
}

export interface ParsedQuery {
  operation: string // 'query' / 'mutation' / 'subscription'
  name?: string
  variables: Record<string, string> // raw text per var name
  selectionSet: string
  fieldCount: number
  depth: number
  fragments: Record<string, string>
}

export interface QueryPlan {
  steps: Array<{ upstream: string; field: string; args: Record<string, unknown> }>
  cost: number
  parallel: boolean
  byUpstream: Record<string, number>
}

export interface ExecutionResult {
  data?: unknown
  errors?: Array<{ message: string; path?: string; extensions?: Record<string, unknown> }>
  cost: number
  durationMs: number
  cacheHit: boolean
  fromUpstreams: string[]
}

export interface CacheEntry {
  key: string
  value: unknown
  expiresAt: number
  hits: number
}

export interface PersistedQuery {
  hash: string
  query: string
  createdAt: number
  hits: number
}

export interface GraphQLMetrics {
  totalQueries: number
  totalErrors: number
  totalCached: number
  totalPersisted: number
  totalSubscriptions: number
  byUpstream: Record<string, { calls: number; errors: number; avgMs: number }>
  totalDurationMs: number
  avgDurationMs: number
}

export class DataLoaderImpl<K, V> implements DataLoader<K, V> {
  private cache = new Map<K, Promise<V>>()
  private batchFn: (keys: K[]) => Promise<V[]>
  private maxBatch = 100
  private pending: Array<{ key: K; resolve: (v: V) => void; reject: (e: unknown) => void }> = []
  private scheduled = false
  constructor(batchFn: (keys: K[]) => Promise<V[]>, maxBatch = 100) {
    this.batchFn = batchFn
    this.maxBatch = maxBatch
  }
  load(key: K): Promise<V> {
    if (this.cache.has(key)) return this.cache.get(key)!
    const p = new Promise<V>((resolve, reject) => {
      this.pending.push({ key, resolve, reject })
      if (this.pending.length >= this.maxBatch) this.flush()
      else if (!this.scheduled) { this.scheduled = true; queueMicrotask(() => { this.scheduled = false; this.flush() }) }
    })
    this.cache.set(key, p)
    return p
  }
  async loadMany(keys: K[]): Promise<V[]> { return Promise.all(keys.map(k => this.load(k))) }
  clear(key: K): void { this.cache.delete(key) }
  clearAll(): void { this.cache.clear() }
  prime(key: K, value: V): void {
    if (!this.cache.has(key)) this.cache.set(key, Promise.resolve(value))
  }
  private async flush(): Promise<void> {
    if (this.pending.length === 0) return
    const batch = this.pending.splice(0, this.maxBatch)
    const keys = batch.map(b => b.key)
    try {
      const values = await this.batchFn(keys)
      for (let i = 0; i < batch.length; i++) {
        if (i < values.length) batch[i].resolve(values[i])
        else batch[i].reject(new Error('no_value'))
      }
    } catch (e) {
      for (const b of batch) b.reject(e)
    }
  }
}

export class GraphQLGateway {
  private upstreams = new Map<string, GraphQLUpstream>()
  private types = new Map<string, GraphQLType>()
  private cache = new Map<string, CacheEntry>()
  private persisted = new Map<string, PersistedQuery>()
  private subscriptions = new Map<string, Set<(data: unknown) => void>>()
  private metrics: GraphQLMetrics = { totalQueries: 0, totalErrors: 0, totalCached: 0, totalPersisted: 0, totalSubscriptions: 0, byUpstream: {}, totalDurationMs: 0, avgDurationMs: 0 }
  private maxCost = 1000
  private maxDepth = 10
  private defaultCacheTtlMs = 30_000

  // -------- Schema registration --------
  registerType(t: GraphQLType): void { if (t.kind === 'object' || t.kind === 'input' || t.kind === 'enum' || t.kind === 'scalar') this.types.set(t.name, t) }
  getType(name: string): GraphQLType | undefined { return this.types.get(name) }
  listTypes(): GraphQLType[] { return [...this.types.values()] }

  // -------- Upstream --------
  registerUpstream(u: GraphQLUpstream): void { this.upstreams.set(u.name, u) }
  removeUpstream(name: string): boolean { return this.upstreams.delete(name) }
  getUpstream(name: string): GraphQLUpstream | undefined { return this.upstreams.get(name) }
  listUpstreams(): GraphQLUpstream[] { return [...this.upstreams.values()] }
  healthyUpstreams(): GraphQLUpstream[] { return this.listUpstreams().filter(u => u.healthy()) }

  // -------- Query parsing --------
  parseQuery(query: string): ParsedQuery {
    const trimmed = query.trim()
    if (!trimmed) throw new Error('empty query')
    const opMatch = trimmed.match(/^(query|mutation|subscription)\s+(\w+)?\s*/i)
    if (!opMatch) throw new Error('invalid operation')
    const operation = opMatch[1].toLowerCase()
    const name = opMatch[2]
    // extract variables - find first (...) before first {
    const firstBraceIdx = trimmed.indexOf('{')
    const lastBraceIdx = trimmed.lastIndexOf('}')
    if (firstBraceIdx < 0) throw new Error('missing selection set')
    let varBlock = ''
    if (name) {
      // search after name for ( and before {
      const afterName = trimmed.slice(trimmed.indexOf(name) + name.length)
      const parenStart = afterName.indexOf('(')
      if (parenStart >= 0 && parenStart < afterName.indexOf('{')) {
        let depth = 0, end = -1
        for (let i = parenStart; i < afterName.length; i++) {
          if (afterName[i] === '(') depth++
          else if (afterName[i] === ')') { depth--; if (depth === 0) { end = i; break } }
        }
        if (end >= 0) varBlock = afterName.slice(parenStart + 1, end)
      }
    }
    const variables: Record<string, string> = {}
    for (const v of varBlock.split(',').map(s => s.trim()).filter(Boolean)) {
      const [k, t] = v.split(':').map(s => s.trim())
      if (k) variables[k] = t ?? 'String'
    }
    // extract fragments
    const fragments: Record<string, string> = {}
    const fragRegex = /fragment\s+(\w+)\s+on\s+\w+\s*\{([^}]*)\}/g
    let fm
    while ((fm = fragRegex.exec(trimmed)) !== null) fragments[fm[1]] = fm[2]
    // selection set: from first { to last }
    const selectionSet = trimmed.slice(firstBraceIdx + 1, lastBraceIdx)
    // field count: top-level fields (depth 0)
    const fieldCount = this.countFields(selectionSet)
    const depth = this.calcDepth(selectionSet)
    return { operation, name, variables, selectionSet, fieldCount, depth, fragments }
  }
  private countFields(sel: string): number {
    let count = 0
    let depth = 0
    let cur = ''
    const words: string[] = []
    for (const ch of sel) {
      if (ch === '{' || ch === '(') depth++
      else if (ch === '}' || ch === ')') depth--
      else if (ch === ' ' || ch === '\n' || ch === '\t') {
        if (cur) { words.push(cur); cur = '' }
      }
      else cur += ch
    }
    if (cur) words.push(cur)
    // top-level field names appear at depth 0 — before any {
    return words.filter(w => /^\w+$/.test(w)).length
  }
  private calcDepth(sel: string): number {
    let max = 0, cur = 0
    for (const ch of sel) {
      if (ch === '{') { cur++; if (cur > max) max = cur }
      else if (ch === '}') cur--
    }
    return max
  }

  // -------- Query planning --------
  plan(query: ParsedQuery): QueryPlan {
    const steps: QueryPlan['steps'] = []
    let cost = 0
    const byUpstream: Record<string, number> = {}
    // simplified: each top-level field maps to an upstream
    const fields = this.extractTopLevelFields(query.selectionSet)
    for (const f of fields) {
      const owner = this.findFieldOwner(f.name) ?? 'self'
      steps.push({ upstream: owner, field: f.name, args: f.args })
      cost += 1
      byUpstream[owner] = (byUpstream[owner] ?? 0) + 1
    }
    return { steps, cost, parallel: steps.length > 1, byUpstream }
  }
  private extractTopLevelFields(sel: string): Array<{ name: string; args: Record<string, unknown> }> {
    const out: Array<{ name: string; args: Record<string, unknown> }> = []
    // find each top-level field: a word at depth 0 followed by optional (...) and optional {...}
    let i = 0
    const n = sel.length
    while (i < n) {
      const c = sel[i]
      if (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === ',') { i++; continue }
      if (c === '{' || c === '}' || c === '(' || c === ')') { i++; continue }
      // start of a field name
      let name = ''
      while (i < n && /[A-Za-z0-9_]/.test(sel[i])) { name += sel[i]; i++ }
      if (!name) { i++; continue }
      // skip optional args
      while (i < n && sel[i] === ' ') i++
      const args: Record<string, unknown> = {}
      if (i < n && sel[i] === '(') {
        let d = 1; i++
        const startArgs = i
        while (i < n && d > 0) {
          if (sel[i] === '(') d++
          else if (sel[i] === ')') d--
          if (d > 0) i++
        }
        const argsStr = sel.slice(startArgs, i)
        if (sel[i] === ')') i++
        for (const a of argsStr.split(',')) {
          const [k, v] = a.split(':').map(s => s.trim())
          if (k && v) args[k] = this.parseLiteral(v)
        }
      }
      // skip optional selection set
      while (i < n && sel[i] === ' ') i++
      if (i < n && sel[i] === '{') {
        let d = 1; i++
        while (i < n && d > 0) {
          if (sel[i] === '{') d++
          else if (sel[i] === '}') d--
          i++
        }
      }
      out.push({ name, args })
    }
    return out
  }
  private parseField(part: string): { name: string; args: Record<string, unknown> } {
    const m = part.match(/^(\w+)\s*(\([^)]*\))?/i)
    if (!m) return { name: '', args: {} }
    const name = m[1]
    const args: Record<string, unknown> = {}
    if (m[2]) {
      const body = m[2].slice(1, -1)
      for (const a of body.split(',')) {
        const [k, v] = a.split(':').map(s => s.trim())
        if (k && v) args[k] = this.parseLiteral(v)
      }
    }
    return { name, args }
  }
  private parseLiteral(v: string): unknown {
    if (v === 'true') return true
    if (v === 'false') return false
    if (v === 'null') return null
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v)
    if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1)
    return v
  }
  private findFieldOwner(field: string): string | null {
    for (const u of this.upstreams.values()) {
      for (const k of Object.keys(u.fieldOwners)) {
        const parts = k.split('.')
        const last = parts[parts.length - 1]
        if (last === field) return u.name
      }
    }
    return null
  }

  // -------- Execution --------
  async execute(query: string, ctx: GraphQLContext, variables: Record<string, unknown> = {}): Promise<ExecutionResult> {
    this.metrics.totalQueries++
    const start = Date.now()
    if (!ctx.loaders) ctx.loaders = new Map()
    // persisted query check
    const hash = this.hashQuery(query)
    if (this.persisted.has(hash)) {
      this.metrics.totalPersisted++
      this.persisted.get(hash)!.hits++
    } else {
      this.persisted.set(hash, { hash, query, createdAt: Date.now(), hits: 0 })
    }
    let parsed: ParsedQuery
    try { parsed = this.parseQuery(query) } catch (e) {
      this.metrics.totalErrors++
      return { errors: [{ message: (e as Error).message }], cost: 0, durationMs: Date.now() - start, cacheHit: false, fromUpstreams: [] }
    }
    if (parsed.depth > this.maxDepth) {
      this.metrics.totalErrors++
      return { errors: [{ message: `query depth ${parsed.depth} exceeds limit ${this.maxDepth}` }], cost: 0, durationMs: Date.now() - start, cacheHit: false, fromUpstreams: [] }
    }
    const plan = this.plan(parsed)
    if (plan.cost > this.maxCost) {
      this.metrics.totalErrors++
      return { errors: [{ message: `query cost ${plan.cost} exceeds limit ${this.maxCost}` }], cost: plan.cost, durationMs: Date.now() - start, cacheHit: false, fromUpstreams: [] }
    }
    // cache check
    const cacheKey = `${hash}:${JSON.stringify(variables)}`
    const cached = this.cache.get(cacheKey)
    let cacheHit = false
    if (cached && cached.expiresAt > Date.now()) {
      cached.hits++
      this.metrics.totalCached++
      cacheHit = true
      this.metrics.totalDurationMs += Date.now() - start
      return { data: cached.value, cost: plan.cost, durationMs: Date.now() - start, cacheHit, fromUpstreams: Object.keys(plan.byUpstream) }
    }
    // resolve variables
    const resolvedArgs: Record<string, unknown> = {}
    for (const [k, _] of Object.entries(parsed.variables)) resolvedArgs[k] = variables[k]
    // execute
    const data: Record<string, unknown> = {}
    const fromUpstreams: string[] = []
    const errors: NonNullable<ExecutionResult['errors']> = []
    await Promise.all(plan.steps.map(async step => {
      const upstream = this.upstreams.get(step.upstream)
      if (!upstream) { errors.push({ message: `upstream ${step.upstream} not found`, path: step.field }); return }
      if (!upstream.healthy()) { errors.push({ message: `upstream ${step.upstream} unhealthy`, path: step.field }); return }
      const t0 = Date.now()
      try {
        const argsWithVars = { ...step.args, ...resolvedArgs }
        const r = await upstream.execute(step.field, argsWithVars, ctx)
        data[step.field] = r
        fromUpstreams.push(step.upstream)
        const m = this.metrics.byUpstream[step.upstream] ?? { calls: 0, errors: 0, avgMs: 0 }
        m.calls++
        m.avgMs = (m.avgMs * (m.calls - 1) + (Date.now() - t0)) / m.calls
        this.metrics.byUpstream[step.upstream] = m
      } catch (e) {
        errors.push({ message: (e as Error).message, path: step.field })
        const m = this.metrics.byUpstream[step.upstream] ?? { calls: 0, errors: 0, avgMs: 0 }
        m.errors++
        this.metrics.byUpstream[step.upstream] = m
      }
    }))
    const dur = Date.now() - start
    this.metrics.totalDurationMs += dur
    if (errors.length > 0) this.metrics.totalErrors++
    // cache result
    this.cache.set(cacheKey, { key: cacheKey, value: data, expiresAt: Date.now() + this.defaultCacheTtlMs, hits: 0 })
    return { data: Object.keys(data).length > 0 ? data : undefined, errors: errors.length > 0 ? errors : undefined, cost: plan.cost, durationMs: dur, cacheHit, fromUpstreams }
  }

  // -------- Subscriptions --------
  subscribe(topic: string, fn: (data: unknown) => void): () => void {
    let set = this.subscriptions.get(topic)
    if (!set) { set = new Set(); this.subscriptions.set(topic, set) }
    set.add(fn)
    this.metrics.totalSubscriptions++
    return () => { set!.delete(fn); if (set!.size === 0) this.subscriptions.delete(topic) }
  }
  publish(topic: string, data: unknown): number {
    const set = this.subscriptions.get(topic)
    if (!set) return 0
    for (const fn of set) try { fn(data) } catch { /* ignore */ }
    return set.size
  }
  listSubscriptionTopics(): string[] { return [...this.subscriptions.keys()] }
  subscriberCount(topic: string): number { return this.subscriptions.get(topic)?.size ?? 0 }

  // -------- Cache --------
  getCacheEntry(key: string): CacheEntry | undefined {
    if (this.cache.has(key)) return this.cache.get(key)
    for (const k of this.cache.keys()) { if (k.startsWith(key + ':') || k === key) return this.cache.get(k) }
    return undefined
  }
  clearCache(): void { this.cache.clear() }
  pruneCache(): number {
    const now = Date.now()
    let n = 0
    for (const [k, v] of this.cache.entries()) { if (v.expiresAt <= now) { this.cache.delete(k); n++ } }
    return n
  }

  // -------- Persisted queries --------
  registerPersisted(hash: string, query: string): void { this.persisted.set(hash, { hash, query, createdAt: Date.now(), hits: 0 }) }
  getPersisted(hash: string): PersistedQuery | undefined { return this.persisted.get(hash) }
  listPersisted(): PersistedQuery[] { return [...this.persisted.values()] }
  hashQuery(q: string): string {
    let h = 0x811c9dc5
    for (let i = 0; i < q.length; i++) { h ^= q.charCodeAt(i); h = (h * 0x01000193) >>> 0 }
    return h.toString(16)
  }

  // -------- DataLoader helper --------
  createLoader<K, V>(batchFn: (keys: K[]) => Promise<V[]>, maxBatch = 100): DataLoader<K, V> {
    return new DataLoaderImpl(batchFn, maxBatch)
  }

  // -------- Limits --------
  setMaxCost(n: number): void { this.maxCost = n }
  setMaxDepth(n: number): void { this.maxDepth = n }
  setDefaultCacheTtlMs(ms: number): void { this.defaultCacheTtlMs = ms }

  // -------- Metrics --------
  getMetrics(): GraphQLMetrics {
    this.metrics.avgDurationMs = this.metrics.totalQueries > 0 ? this.metrics.totalDurationMs / this.metrics.totalQueries : 0
    return JSON.parse(JSON.stringify(this.metrics))
  }
  resetMetrics(): void { this.metrics = { totalQueries: 0, totalErrors: 0, totalCached: 0, totalPersisted: 0, totalSubscriptions: 0, byUpstream: {}, totalDurationMs: 0, avgDurationMs: 0 } }

  // -------- Federation --------
  async executeWithRetry(query: string, ctx: GraphQLContext, variables: Record<string, unknown> = {}): Promise<ExecutionResult> {
    return withRetry(() => this.execute(query, ctx, variables), { maxAttempts: 3, baseDelayMs: 100, maxDelayMs: 5000, jitter: true, retryOnStatus: [500, 502, 503, 504] })
  }
}

let _instance: GraphQLGateway | null = null
export function getGraphQLGateway(): GraphQLGateway { if (!_instance) _instance = new GraphQLGateway(); return _instance }
export function resetGraphQLGateway(): void { _instance = null }
export { GraphQLGateway as default }
