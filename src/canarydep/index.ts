// v68.0 Canary Deployment — gradual traffic ramp-up with metrics-driven
// promotion/rollback, user whitelist, stages, error-rate monitoring

export type StageStatus = 'pending' | 'running' | 'promoted' | 'rolled-back' | 'paused'

export interface Stage {
  id: string
  name: string
  percentage: number  // 0-100
  durationMs: number  // how long to observe at this percentage
  minRequests: number  // minimum requests before evaluating
  maxErrorRate: number  // 0-1, e.g. 0.05 = 5%
  maxLatencyMs: number
}

export interface CanaryConfig {
  id: string
  version: string
  artifact: string
  stages: Stage[]
  whitelist: string[]  // user IDs always on canary
  blacklist: string[]  // user IDs never on canary
  createdAt: number
}

export interface CanaryMetrics {
  totalRequests: number
  errorCount: number
  latencySum: number
  latencyMax: number
  latencies: number[]  // for percentile
}

export interface CanaryState {
  id: string
  config: CanaryConfig
  status: StageStatus
  currentStageIndex: number
  startedAt: number
  metrics: CanaryMetrics
  history: Array<{ ts: number; action: string; details: string }>
}

// ─────────────────────────────────────────────────────────────────────────────
// Metrics

export class MetricsCollector {
  private m: CanaryMetrics = { totalRequests: 0, errorCount: 0, latencySum: 0, latencyMax: 0, latencies: [] }

  record(latencyMs: number, isError: boolean): void {
    this.m.totalRequests++
    if (isError) this.m.errorCount++
    this.m.latencySum += latencyMs
    if (latencyMs > this.m.latencyMax) this.m.latencyMax = latencyMs
    this.m.latencies.push(latencyMs)
  }

  snapshot(): CanaryMetrics { return { ...this.m, latencies: [...this.m.latencies] } }

  reset(): void {
    this.m = { totalRequests: 0, errorCount: 0, latencySum: 0, latencyMax: 0, latencies: [] }
  }

  errorRate(): number { return this.m.totalRequests === 0 ? 0 : this.m.errorCount / this.m.totalRequests }
  avgLatency(): number { return this.m.totalRequests === 0 ? 0 : this.m.latencySum / this.m.totalRequests }
  p95(): number {
    if (this.m.latencies.length === 0) return 0
    const s = [...this.m.latencies].sort((a, b) => a - b)
    return s[Math.floor(s.length * 0.95)] ?? 0
  }

  metrics(): CanaryMetrics { return this.snapshot() }
}

// ─────────────────────────────────────────────────────────────────────────────
// Canary engine

export class CanaryEngine {
  private deploys: Map<string, CanaryState> = new Map()
  private nextId = 1

  // Create a new canary deploy
  create(config: Omit<CanaryConfig, 'id' | 'createdAt'>): CanaryState {
    const id = `canary_${this.nextId++}`
    const cfg: CanaryConfig = { ...config, id, createdAt: Date.now() }
    const state: CanaryState = {
      id,
      config: cfg,
      status: 'pending',
      currentStageIndex: 0,
      startedAt: 0,
      metrics: { totalRequests: 0, errorCount: 0, latencySum: 0, latencyMax: 0, latencies: [] },
      history: [],
    }
    this.deploys.set(id, state)
    state.history.push({ ts: Date.now(), action: 'created', details: `artifact=${cfg.artifact} stages=${cfg.stages.length}` })
    return state
  }

  get(id: string): CanaryState | undefined { return this.deploys.get(id) }
  list(): CanaryState[] { return Array.from(this.deploys.values()) }
  delete(id: string): boolean { return this.deploys.delete(id) }

  // Start a canary
  start(id: string): boolean {
    const s = this.deploys.get(id)
    if (!s || s.status !== 'pending') return false
    s.status = 'running'
    s.startedAt = Date.now()
    s.currentStageIndex = 0
    s.metrics = { totalRequests: 0, errorCount: 0, latencySum: 0, latencyMax: 0, latencies: [] }
    s.history.push({ ts: Date.now(), action: 'started', details: `stage 0: ${s.config.stages[0]?.name ?? '?'}` })
    return true
  }

  pause(id: string): boolean {
    const s = this.deploys.get(id)
    if (!s || s.status !== 'running') return false
    s.status = 'paused'
    s.history.push({ ts: Date.now(), action: 'paused', details: '' })
    return true
  }

  resume(id: string): boolean {
    const s = this.deploys.get(id)
    if (!s || s.status !== 'paused') return false
    s.status = 'running'
    s.history.push({ ts: Date.now(), action: 'resumed', details: '' })
    return true
  }

  // Record a request
  record(id: string, latencyMs: number, isError: boolean): void {
    const s = this.deploys.get(id)
    if (!s) return
    s.metrics.totalRequests++
    if (isError) s.metrics.errorCount++
    s.metrics.latencySum += latencyMs
    if (latencyMs > s.metrics.latencyMax) s.metrics.latencyMax = latencyMs
    s.metrics.latencies.push(latencyMs)
    if (s.metrics.latencies.length > 10000) s.metrics.latencies.shift()
  }

  // Determine if a user should be on canary (given current stage %)
  shouldServeCanary(id: string, userId: string): boolean {
    const s = this.deploys.get(id)
    if (!s || s.status !== 'running') return false
    if (s.config.blacklist.includes(userId)) return false
    if (s.config.whitelist.includes(userId)) return true
    const stage = s.config.stages[s.currentStageIndex]
    if (!stage) return false
    return hashBucket(userId) < stage.percentage
  }

  // Evaluate current stage and decide promote/rollback
  evaluate(id: string): { action: 'promote' | 'rollback' | 'continue' | 'wait'; reason: string } {
    const s = this.deploys.get(id)
    if (!s || s.status !== 'running') return { action: 'wait', reason: 'not running' }
    const stage = s.config.stages[s.currentStageIndex]
    if (!stage) return { action: 'wait', reason: 'no stage' }
    if (s.metrics.totalRequests < stage.minRequests) return { action: 'wait', reason: `need ${stage.minRequests} reqs, have ${s.metrics.totalRequests}` }
    const errorRate = s.metrics.totalRequests === 0 ? 0 : s.metrics.errorCount / s.metrics.totalRequests
    const p95 = this.p95For(s)
    if (errorRate > stage.maxErrorRate) {
      this.rollbackCanary(id, `error-rate ${(errorRate * 100).toFixed(2)}% > ${(stage.maxErrorRate * 100).toFixed(2)}%`)
      return { action: 'rollback', reason: `error-rate ${(errorRate * 100).toFixed(2)}%` }
    }
    if (p95 > stage.maxLatencyMs) {
      this.rollbackCanary(id, `p95 ${p95}ms > ${stage.maxLatencyMs}ms`)
      return { action: 'rollback', reason: `p95 ${p95}ms` }
    }
    // Stage passed — advance
    if (s.currentStageIndex >= s.config.stages.length - 1) {
      // Last stage passed — fully promote
      s.status = 'promoted'
      s.history.push({ ts: Date.now(), action: 'promoted', details: 'all stages passed' })
      return { action: 'promote', reason: 'all stages passed' }
    }
    s.currentStageIndex++
    s.metrics = { totalRequests: 0, errorCount: 0, latencySum: 0, latencyMax: 0, latencies: [] }
    s.history.push({ ts: Date.now(), action: 'advance', details: `to stage ${s.currentStageIndex}: ${s.config.stages[s.currentStageIndex].name}` })
    return { action: 'promote', reason: `advanced to stage ${s.currentStageIndex}` }
  }

  private p95For(s: CanaryState): number {
    if (s.metrics.latencies.length === 0) return 0
    const sorted = [...s.metrics.latencies].sort((a, b) => a - b)
    return sorted[Math.floor(sorted.length * 0.95)] ?? 0
  }

  rollbackCanary(id: string, reason = 'manual'): boolean {
    const s = this.deploys.get(id)
    if (!s) return false
    s.status = 'rolled-back'
    s.history.push({ ts: Date.now(), action: 'rolled-back', details: reason })
    return true
  }

  // Force advance (skip evaluation)
  forceAdvance(id: string): boolean {
    const s = this.deploys.get(id)
    if (!s || s.status !== 'running') return false
    if (s.currentStageIndex >= s.config.stages.length - 1) {
      s.status = 'promoted'
      s.history.push({ ts: Date.now(), action: 'promoted', details: 'forced' })
    } else {
      s.currentStageIndex++
      s.metrics = { totalRequests: 0, errorCount: 0, latencySum: 0, latencyMax: 0, latencies: [] }
      s.history.push({ ts: Date.now(), action: 'force-advance', details: `to stage ${s.currentStageIndex}` })
    }
    return true
  }

  // Add a user to whitelist
  addWhitelist(id: string, userId: string): boolean {
    const s = this.deploys.get(id)
    if (!s) return false
    if (!s.config.whitelist.includes(userId)) s.config.whitelist.push(userId)
    return true
  }

  removeWhitelist(id: string, userId: string): boolean {
    const s = this.deploys.get(id)
    if (!s) return false
    s.config.whitelist = s.config.whitelist.filter(u => u !== userId)
    return true
  }

  addBlacklist(id: string, userId: string): boolean {
    const s = this.deploys.get(id)
    if (!s) return false
    if (!s.config.blacklist.includes(userId)) s.config.blacklist.push(userId)
    return true
  }

  // Metrics
  metrics(id: string): { errorRate: number; avgLatency: number; p95: number; total: number } {
    const s = this.deploys.get(id)
    if (!s) return { errorRate: 0, avgLatency: 0, p95: 0, total: 0 }
    return {
      errorRate: s.metrics.totalRequests === 0 ? 0 : s.metrics.errorCount / s.metrics.totalRequests,
      avgLatency: s.metrics.totalRequests === 0 ? 0 : s.metrics.latencySum / s.metrics.totalRequests,
      p95: this.p95For(s),
      total: s.metrics.totalRequests,
    }
  }

  metricsAll(): { total: number; running: number; promoted: number; rolledBack: number; paused: number; pending: number } {
    let running = 0, promoted = 0, rolledBack = 0, paused = 0, pending = 0
    for (const s of this.deploys.values()) {
      if (s.status === 'running') running++
      else if (s.status === 'promoted') promoted++
      else if (s.status === 'rolled-back') rolledBack++
      else if (s.status === 'paused') paused++
      else if (s.status === 'pending') pending++
    }
    return { total: this.deploys.size, running, promoted, rolledBack, paused, pending }
  }

  clear(): void {
    this.deploys.clear()
    this.nextId = 1
  }
}

function hashBucket(key: string): number {
  let h = 0
  for (let i = 0; i < key.length; i++) h = ((h << 5) - h + key.charCodeAt(i)) | 0
  return Math.abs(h) % 100
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton

let _engine: CanaryEngine | null = null
export function getCanaryEngine(): CanaryEngine {
  if (!_engine) _engine = new CanaryEngine()
  return _engine
}
export function resetCanaryEngine(): void {
  _engine?.clear()
  _engine = null
}

// ─────────────────────────────────────────────────────────────────────────────
// Default stages

export function defaultStages(): Stage[] {
  return [
    { id: 's1', name: '1% soak', percentage: 1, durationMs: 5 * 60 * 1000, minRequests: 100, maxErrorRate: 0.05, maxLatencyMs: 1000 },
    { id: 's2', name: '10%', percentage: 10, durationMs: 10 * 60 * 1000, minRequests: 500, maxErrorRate: 0.02, maxLatencyMs: 800 },
    { id: 's3', name: '50%', percentage: 50, durationMs: 15 * 60 * 1000, minRequests: 2000, maxErrorRate: 0.01, maxLatencyMs: 600 },
    { id: 's4', name: '100%', percentage: 100, durationMs: 0, minRequests: 0, maxErrorRate: 0.005, maxLatencyMs: 500 },
  ]
}
