// Service Mesh: service registry, health checks, load balancing, circuit breaker, retries, traffic mirroring, fault injection.

export type ServiceHealth = 'healthy' | 'degraded' | 'unhealthy' | 'unknown' | (string & {})
export type LoadBalancingStrategy = 'round-robin' | 'least-conn' | 'random' | 'weighted' | 'ip-hash' | (string & {})
export type CircuitState = 'closed' | 'open' | 'half-open' | (string & {})

export interface ServiceInstance {
  id: string
  service: string
  host: string
  port: number
  version?: string
  zone?: string
  tags?: string[]
  metadata?: Record<string, string>
  weight: number
  activeConnections: number
  health: ServiceHealth
  registeredAt: number
  lastHealthCheck?: number
}

export interface ServiceDefinition {
  name: string
  loadBalancing: LoadBalancingStrategy
  healthCheckIntervalMs?: number
  healthCheckTimeoutMs?: number
  circuitBreaker?: CircuitBreakerConfig
  retryPolicy?: RetryPolicy
  timeoutMs?: number
  metadata?: Record<string, string>
}

export interface CircuitBreakerConfig {
  failureThreshold: number
  successThreshold: number
  openTimeoutMs: number
  halfOpenMaxRequests: number
}

export interface RetryPolicy {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  retryOn: string[]
}

export interface RequestContext {
  service: string
  method?: string
  path?: string
  headers?: Record<string, string>
  body?: unknown
  sourceIp?: string
  deadline?: number
}

export interface ResponseContext {
  instance: ServiceInstance
  status: number
  durationMs: number
  success: boolean
  attempts: number
  body?: unknown
  error?: string
  mirrored?: boolean
}

export interface ServiceMeshConfig {
  defaultLoadBalancing?: LoadBalancingStrategy
  defaultCircuitBreaker?: CircuitBreakerConfig
  defaultRetry?: RetryPolicy
  defaultTimeoutMs?: number
  enableMirroring?: boolean
}

interface CircuitState_ {
  state: CircuitState
  failures: number
  successes: number
  openedAt: number
  halfOpenRequests: number
}

export class ServiceMesh {
  private instances = new Map<string, ServiceInstance>()
  private definitions = new Map<string, ServiceDefinition>()
  private rrCounters = new Map<string, number>()
  private circuitStates = new Map<string, CircuitState_>()
  private requestHistory: { service: string; instance: string; success: boolean; durationMs: number; timestamp: number; status: number; error?: string }[] = []
  private mirrors: { service: string; percentage: number; instanceIds: string[] }[] = []
  private config: Required<Omit<ServiceMeshConfig, 'enableMirroring'>> & { enableMirroring: boolean }

  constructor(config: ServiceMeshConfig = {}) {
    this.config = {
      defaultLoadBalancing: config.defaultLoadBalancing ?? 'round-robin',
      defaultCircuitBreaker: config.defaultCircuitBreaker ?? { failureThreshold: 5, successThreshold: 2, openTimeoutMs: 30_000, halfOpenMaxRequests: 3 },
      defaultRetry: config.defaultRetry ?? { maxAttempts: 3, initialDelayMs: 100, maxDelayMs: 5000, backoffMultiplier: 2, retryOn: ['timeout', '5xx', 'connection-error'] },
      defaultTimeoutMs: config.defaultTimeoutMs ?? 30_000,
      enableMirroring: config.enableMirroring ?? true,
    }
  }

  // ---- Service definitions ----
  defineService(def: ServiceDefinition): ServiceDefinition {
    this.definitions.set(def.name, { ...def })
    this.rrCounters.set(def.name, 0)
    this.circuitStates.set(def.name, { state: 'closed', failures: 0, successes: 0, openedAt: 0, halfOpenRequests: 0 })
    return def
  }

  getServiceDefinition(name: string): ServiceDefinition | undefined {
    return this.definitions.get(name)
  }

  listServiceDefinitions(): ServiceDefinition[] {
    return Array.from(this.definitions.values())
  }

  // ---- Instance registration ----
  registerInstance(instance: Omit<ServiceInstance, 'id' | 'weight' | 'activeConnections' | 'health' | 'registeredAt' | 'lastHealthCheck'> & { id?: string; health?: ServiceHealth; weight?: number }): ServiceInstance {
    const id = instance.id ?? `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    const fullInstance: ServiceInstance = {
      ...instance,
      id,
      weight: instance.weight ?? 100,
      activeConnections: 0,
      health: instance.health ?? 'healthy',
      registeredAt: Date.now(),
    }
    this.instances.set(id, fullInstance)
    return fullInstance
  }

  deregisterInstance(id: string): boolean {
    return this.instances.delete(id)
  }

  getInstance(id: string): ServiceInstance | undefined {
    return this.instances.get(id)
  }

  listInstances(service?: string): ServiceInstance[] {
    const all = Array.from(this.instances.values())
    return service ? all.filter(i => i.service === service) : all
  }

  // ---- Health checks ----
  recordHealthCheck(id: string, health: ServiceHealth, at: number = Date.now()): boolean {
    const inst = this.instances.get(id)
    if (!inst) return false
    inst.health = health
    inst.lastHealthCheck = at
    return true
  }

  // Periodic sweep
  healthCheckTick(at: number = Date.now()): { checked: number; unhealthy: string[]; recovered: string[] } {
    let checked = 0
    const unhealthy: string[] = []
    const recovered: string[] = []
    for (const [id, inst] of this.instances.entries()) {
      const def = this.definitions.get(inst.service)
      if (!def) continue
      if (def.healthCheckIntervalMs && inst.lastHealthCheck && (at - inst.lastHealthCheck) >= def.healthCheckIntervalMs) {
        // Simulate health determination
        checked++
        const wasUnhealthy = inst.health === 'unhealthy'
        // (Real implementation would probe; here we keep the existing state but reset lastHealthCheck)
        inst.lastHealthCheck = at
        if (wasUnhealthy && inst.health !== 'unhealthy') recovered.push(id)
        else if (inst.health === 'unhealthy') unhealthy.push(id)
      }
    }
    return { checked, unhealthy, recovered }
  }

  // ---- Load balancing ----
  selectInstance(service: string, ctx: { sourceIp?: string } = {}): ServiceInstance | null {
    const candidates = this.listInstances(service).filter(i => i.health === 'healthy' || i.health === 'degraded')
    if (candidates.length === 0) return null
    const def = this.definitions.get(service)
    const strategy = def?.loadBalancing ?? this.config.defaultLoadBalancing
    if (strategy === 'round-robin') {
      const counter = this.rrCounters.get(service) ?? 0
      const picked = candidates[counter % candidates.length]
      this.rrCounters.set(service, counter + 1)
      return picked
    }
    if (strategy === 'least-conn') {
      return candidates.reduce((a, b) => a.activeConnections < b.activeConnections ? a : b)
    }
    if (strategy === 'random') {
      return candidates[Math.floor(Math.random() * candidates.length)]
    }
    if (strategy === 'weighted') {
      const totalWeight = candidates.reduce((s, c) => s + c.weight, 0)
      let r = Math.random() * totalWeight
      for (const c of candidates) {
        r -= c.weight
        if (r <= 0) return c
      }
      return candidates[candidates.length - 1]
    }
    if (strategy === 'ip-hash' && ctx.sourceIp) {
      let hash = 0
      for (let i = 0; i < ctx.sourceIp.length; i++) hash = ((hash << 5) - hash + ctx.sourceIp.charCodeAt(i)) >>> 0
      return candidates[hash % candidates.length]
    }
    return candidates[0]
  }

  // ---- Circuit breaker ----
  private getCircuit(service: string): CircuitState_ {
    let s = this.circuitStates.get(service)
    if (!s) {
      s = { state: 'closed', failures: 0, successes: 0, openedAt: 0, halfOpenRequests: 0 }
      this.circuitStates.set(service, s)
    }
    return s
  }

  getCircuitState(service: string): CircuitState {
    return this.getCircuit(service).state
  }

  private recordSuccess(service: string): void {
    const c = this.getCircuit(service)
    if (c.state === 'half-open') {
      c.successes++
      const def = this.definitions.get(service)
      const threshold = def?.circuitBreaker?.successThreshold ?? this.config.defaultCircuitBreaker.successThreshold
      if (c.successes >= threshold) {
        c.state = 'closed'
        c.failures = 0
        c.successes = 0
        c.halfOpenRequests = 0
      }
    } else if (c.state === 'closed') {
      c.failures = 0
    }
  }

  private recordFailure(service: string): void {
    const c = this.getCircuit(service)
    const def = this.definitions.get(service)
    const threshold = def?.circuitBreaker?.failureThreshold ?? this.config.defaultCircuitBreaker.failureThreshold
    if (c.state === 'half-open' || c.state === 'closed') {
      c.failures++
      if (c.failures >= threshold) {
        c.state = 'open'
        c.openedAt = Date.now()
        c.successes = 0
        c.halfOpenRequests = 0
      }
    }
  }

  private isCircuitOpen(service: string): boolean {
    const c = this.getCircuit(service)
    if (c.state === 'open') {
      const def = this.definitions.get(service)
      const openTimeout = def?.circuitBreaker?.openTimeoutMs ?? this.config.defaultCircuitBreaker.openTimeoutMs
      if (Date.now() - c.openedAt >= openTimeout) {
        c.state = 'half-open'
        c.halfOpenRequests = 0
        c.successes = 0
        c.failures = 0
        return false
      }
      return true
    }
    if (c.state === 'half-open') {
      const def = this.definitions.get(service)
      const max = def?.circuitBreaker?.halfOpenMaxRequests ?? this.config.defaultCircuitBreaker.halfOpenMaxRequests
      if (c.halfOpenRequests >= max) return true
      c.halfOpenRequests++
    }
    return false
  }

  // ---- Retry ----
  private computeDelay(attempt: number, policy: RetryPolicy): number {
    const delay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1)
    return Math.min(delay, policy.maxDelayMs)
  }

  shouldRetry(error: string, status: number, policy: RetryPolicy, attempt: number): boolean {
    if (attempt >= policy.maxAttempts) return false
    if (error && policy.retryOn.includes('timeout') && error.includes('timeout')) return true
    if (error && policy.retryOn.includes('connection-error') && (error.includes('econnrefused') || error.includes('econnreset'))) return true
    if (status >= 500 && policy.retryOn.includes('5xx')) return true
    if (status === 429 && policy.retryOn.includes('429')) return true
    return false
  }

  // ---- Routing ----
  // High-level: select, call, record, retry
  // The actual network call is delegated via `invoke` (synchronous simulated or async)
  async route(ctx: RequestContext, invoke: (instance: ServiceInstance, ctx: RequestContext) => Promise<{ status: number; body?: unknown; error?: string }>): Promise<ResponseContext> {
    const def = this.definitions.get(ctx.service)
    if (!def) throw new Error(`Unknown service: ${ctx.service}`)
    if (this.isCircuitOpen(ctx.service)) {
      throw new Error(`Circuit open for ${ctx.service}`)
    }
    const policy = def.retryPolicy ?? this.config.defaultRetry
    const timeout = def.timeoutMs ?? this.config.defaultTimeoutMs
    let lastResult: ResponseContext | null = null
    for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
      const instance = this.selectInstance(ctx.service, { sourceIp: ctx.sourceIp })
      if (!instance) {
        throw new Error(`No healthy instances for ${ctx.service}`)
      }
      instance.activeConnections++
      const start = Date.now()
      let result: { status: number; body?: unknown; error?: string }
      try {
        const timeoutPromise = new Promise<{ status: number; error: string }>((_, rej) => {
          setTimeout(() => rej(new Error('timeout')), timeout)
        })
        result = await Promise.race([
          invoke(instance, ctx).catch((e: Error) => ({ status: 0, error: e.message })),
          timeoutPromise,
        ]) as { status: number; body?: unknown; error?: string }
      } catch (e) {
        result = { status: 0, error: (e as Error).message }
      }
      const durationMs = Date.now() - start
      instance.activeConnections = Math.max(0, instance.activeConnections - 1)
      const success = result.status >= 200 && result.status < 400 && !result.error
      const resp: ResponseContext = { instance, status: result.status, durationMs, success, attempts: attempt, body: result.body, error: result.error }
      this.requestHistory.push({ service: ctx.service, instance: instance.id, success, durationMs, timestamp: start, status: result.status, error: result.error })
      if (success) {
        this.recordSuccess(ctx.service)
        // Mirror if configured
        if (this.config.enableMirroring) this.tryMirror(ctx.service, instance, ctx, invoke, result)
        return resp
      }
      this.recordFailure(ctx.service)
      if (this.shouldRetry(result.error ?? '', result.status, policy, attempt)) {
        const delay = this.computeDelay(attempt, policy)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      lastResult = resp
      break
    }
    if (lastResult) return lastResult
    throw new Error('Request failed after all retries')
  }

  // ---- Traffic mirroring ----
  configureMirroring(service: string, percentage: number, instanceIds: string[]): void {
    const idx = this.mirrors.findIndex(m => m.service === service)
    const entry = { service, percentage, instanceIds }
    if (idx >= 0) this.mirrors[idx] = entry
    else this.mirrors.push(entry)
  }

  private tryMirror(service: string, primary: ServiceInstance, ctx: RequestContext, invoke: (i: ServiceInstance, c: RequestContext) => Promise<{ status: number; body?: unknown; error?: string }>, _result: { status: number; body?: unknown; error?: string }): void {
    const mirror = this.mirrors.find(m => m.service === service)
    if (!mirror || mirror.percentage <= 0) return
    if (Math.random() * 100 > mirror.percentage) return
    for (const instId of mirror.instanceIds) {
      if (instId === primary.id) continue
      const inst = this.instances.get(instId)
      if (!inst || inst.health === 'unhealthy') continue
      // Fire-and-forget (don't await)
      invoke(inst, ctx).catch(() => {/* swallow */})
    }
  }

  // ---- Stats ----
  serviceStats(service: string): { total: number; success: number; failure: number; avgDurationMs: number; p95DurationMs: number; byStatus: Record<number, number> } {
    const h = this.requestHistory.filter(r => r.service === service)
    const success = h.filter(r => r.success).length
    const failure = h.length - success
    const durations = h.map(r => r.durationMs).sort((a, b) => a - b)
    const avgDurationMs = durations.length > 0 ? durations.reduce((s, d) => s + d, 0) / durations.length : 0
    const p95 = durations.length > 0 ? durations[Math.floor(durations.length * 0.95)] : 0
    const byStatus: Record<number, number> = {}
    for (const r of h) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
    return { total: h.length, success, failure, avgDurationMs, p95DurationMs: p95, byStatus }
  }

  // ---- Metrics ----
  metrics(): {
    services: number
    instances: number
    totalRequests: number
    openCircuits: number
    halfOpenCircuits: number
    mirrors: number
  } {
    let open = 0, half = 0
    for (const c of this.circuitStates.values()) {
      if (c.state === 'open') open++
      else if (c.state === 'half-open') half++
    }
    return {
      services: this.definitions.size,
      instances: this.instances.size,
      totalRequests: this.requestHistory.length,
      openCircuits: open,
      halfOpenCircuits: half,
      mirrors: this.mirrors.length,
    }
  }

  clear(): void {
    this.instances.clear()
    this.definitions.clear()
    this.rrCounters.clear()
    this.circuitStates.clear()
    this.requestHistory = []
    this.mirrors = []
  }
}

let _meshSingleton: ServiceMesh | null = null
export function getMesh(): ServiceMesh {
  if (!_meshSingleton) _meshSingleton = new ServiceMesh()
  return _meshSingleton
}
export function resetMesh(): void {
  if (_meshSingleton) _meshSingleton.clear()
  _meshSingleton = null
}
