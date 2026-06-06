// v67.0 Blue-Green Deployment — environment management, traffic switching,
// health checks, version rollback, state tracking, deploy slots

export type Environment = 'blue' | 'green'
export type EnvironmentStatus = 'idle' | 'deploying' | 'active' | 'draining' | 'failed' | 'disabled'

export interface Version {
  id: string
  artifact: string  // docker image, build hash, etc.
  deployedAt: number
  healthStatus: 'healthy' | 'unhealthy' | 'unknown'
  healthChecks: Array<{ ts: number; ok: boolean; latencyMs: number; error?: string }>
  metadata?: Record<string, unknown>
}

export interface EnvironmentState {
  env: Environment
  status: EnvironmentStatus
  activeVersion: Version | null
  previousVersion: Version | null
  weight: number  // 0-100, percentage of traffic
  deploying: Version | null
  lastSwitchAt: number
}

export interface HealthCheckConfig {
  endpoint?: string
  intervalMs: number
  timeoutMs: number
  healthyThreshold: number  // consecutive successes to mark healthy
  unhealthyThreshold: number  // consecutive failures to mark unhealthy
}

export interface BlueGreenConfig {
  healthCheck: HealthCheckConfig
  // Drain timeout when switching away from an env
  drainTimeoutMs: number
  // Auto-rollback on unhealthy
  autoRollback: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// HealthChecker

export class HealthChecker {
  private checks: Map<string, Array<{ ts: number; ok: boolean; latencyMs: number; error?: string }>> = new Map()
  private configs: Map<string, HealthCheckConfig> = new Map()

  configure(envId: string, config: HealthCheckConfig): void {
    this.configs.set(envId, config)
  }

  record(envId: string, ok: boolean, latencyMs: number, error?: string): void {
    let arr = this.checks.get(envId)
    if (!arr) { arr = []; this.checks.set(envId, arr) }
    arr.push({ ts: Date.now(), ok, latencyMs, error })
    const cfg = this.configs.get(envId)
    if (cfg && arr.length > 100) arr.splice(0, arr.length - 100)
  }

  getChecks(envId: string): Array<{ ts: number; ok: boolean; latencyMs: number; error?: string }> {
    return this.checks.get(envId) ?? []
  }

  status(envId: string): 'healthy' | 'unhealthy' | 'unknown' {
    const cfg = this.configs.get(envId)
    if (!cfg) return 'unknown'
    const arr = this.checks.get(envId) ?? []
    if (arr.length === 0) return 'unknown'
    // Look at recent consecutive results
    let consecutiveOk = 0
    let consecutiveFail = 0
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i].ok) {
        consecutiveOk++
        consecutiveFail = 0
        if (consecutiveOk >= cfg.healthyThreshold) return 'healthy'
      } else {
        consecutiveFail++
        consecutiveOk = 0
        if (consecutiveFail >= cfg.unhealthyThreshold) return 'unhealthy'
      }
    }
    return arr[arr.length - 1].ok ? 'healthy' : 'unhealthy'
  }

  metrics(envId: string): { total: number; success: number; failed: number; avgLatency: number; p95: number } {
    const arr = this.checks.get(envId) ?? []
    if (arr.length === 0) return { total: 0, success: 0, failed: 0, avgLatency: 0, p95: 0 }
    let success = 0, sumLat = 0
    for (const c of arr) {
      if (c.ok) success++
      sumLat += c.latencyMs
    }
    const sorted = arr.map(c => c.latencyMs).sort((a, b) => a - b)
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
    return {
      total: arr.length,
      success,
      failed: arr.length - success,
      avgLatency: sumLat / arr.length,
      p95,
    }
  }

  clear(envId?: string): void {
    if (envId) this.checks.delete(envId)
    else this.checks.clear()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Deployer

export class BlueGreenDeployer {
  private envs: Map<Environment, EnvironmentState> = new Map()
  private history: Array<{ ts: number; action: string; env: Environment; version?: string; details?: string }> = []
  private cfg: BlueGreenConfig
  public health: HealthChecker
  private nextVersion = 1

  constructor(cfg: Partial<BlueGreenConfig> = {}) {
    this.cfg = {
      healthCheck: cfg.healthCheck ?? { intervalMs: 5000, timeoutMs: 2000, healthyThreshold: 2, unhealthyThreshold: 3 },
      drainTimeoutMs: cfg.drainTimeoutMs ?? 30000,
      autoRollback: cfg.autoRollback ?? true,
    }
    this.health = new HealthChecker()
    this.envs.set('blue', this.createInitialState('blue'))
    this.envs.set('green', this.createInitialState('green'))
  }

  private createInitialState(env: Environment): EnvironmentState {
    return { env, status: 'idle', activeVersion: null, previousVersion: null, weight: env === 'blue' ? 100 : 0, deploying: null, lastSwitchAt: 0 }
  }

  getState(env: Environment): EnvironmentState {
    return this.envs.get(env) || this.createInitialState(env)
  }

  listEnvironments(): EnvironmentState[] {
    return Array.from(this.envs.values())
  }

  // Deploy a new version to a target environment
  deploy(env: Environment, artifact: string, metadata?: Record<string, unknown>): Version {
    const state = this.getState(env)
    const v: Version = {
      id: `v${this.nextVersion++}`,
      artifact,
      deployedAt: Date.now(),
      healthStatus: 'unknown',
      healthChecks: [],
      metadata,
    }
    state.deploying = v
    state.status = 'deploying'
    this.health.configure(`${env}:${v.id}`, this.cfg.healthCheck)
    this.history.push({ ts: Date.now(), action: 'deploy', env, version: v.id, details: artifact })
    return v
  }

  // Mark deploy as successful (simulating health checks passing)
  markDeploySuccess(env: Environment, versionId: string, latencyMs = 10): void {
    const state = this.getState(env)
    if (!state.deploying || state.deploying.id !== versionId) return
    this.health.record(`${env}:${versionId}`, true, latencyMs)
    state.deploying.healthChecks = this.health.getChecks(`${env}:${versionId}`)
  }

  markDeployFailure(env: Environment, versionId: string, error: string, latencyMs = 5000): void {
    const state = this.getState(env)
    if (!state.deploying || state.deploying.id !== versionId) return
    this.health.record(`${env}:${versionId}`, false, latencyMs, error)
    state.deploying.healthChecks = this.health.getChecks(`${env}:${versionId}`)
    if (this.cfg.autoRollback) {
      this.rollback(env, `health-check-fail: ${error}`)
    }
  }

  // Promote deploying version to active (switch traffic)
  promote(env: Environment): boolean {
    const state = this.getState(env)
    if (!state.deploying) return false
    if (state.deploying.healthStatus === 'unhealthy') return false
    const other = this.getState(env === 'blue' ? 'green' : 'blue')

    // Move current active to previous
    if (state.activeVersion) state.previousVersion = state.activeVersion
    state.activeVersion = state.deploying
    state.deploying = null
    state.status = 'active'
    state.lastSwitchAt = Date.now()

    // Drain the other env
    other.status = 'draining'
    other.weight = 0
    state.weight = 100

    this.history.push({ ts: Date.now(), action: 'promote', env, version: state.activeVersion.id })
    return true
  }

  // Switch traffic to a specific env (0-100%)
  setTrafficWeight(env: Environment, weight: number): void {
    const clamped = Math.max(0, Math.min(100, weight))
    const state = this.getState(env)
    state.weight = clamped
    const other = this.getState(env === 'blue' ? 'green' : 'blue')
    other.weight = 100 - clamped
    if (clamped === 100) { state.status = 'active'; other.status = 'idle' }
    else if (clamped === 0) { state.status = 'idle'; other.status = 'active' }
    else { state.status = 'active'; other.status = 'active' }
    state.lastSwitchAt = Date.now()
    this.history.push({ ts: Date.now(), action: 'traffic', env, details: `weight=${clamped}` })
  }

  // Switch 100% traffic to env
  switchTo(env: Environment): boolean {
    this.setTrafficWeight(env, 100)
    return true
  }

  // Roll back to previous version
  rollback(env: Environment, reason = 'manual'): boolean {
    const state = this.getState(env)
    if (!state.activeVersion) return false
    if (!state.previousVersion) {
      this.history.push({ ts: Date.now(), action: 'rollback-fail', env, details: 'no previous version' })
      return false
    }
    const oldActive = state.activeVersion
    state.activeVersion = state.previousVersion
    state.previousVersion = oldActive
    state.lastSwitchAt = Date.now()
    state.status = 'active'
    this.history.push({ ts: Date.now(), action: 'rollback', env, version: state.activeVersion.id, details: reason })
    return true
  }

  // Disable an env
  disable(env: Environment): void {
    const state = this.getState(env)
    state.status = 'disabled'
    state.weight = 0
    const other = this.getState(env === 'blue' ? 'green' : 'blue')
    other.weight = 100
    other.status = 'active'
    this.history.push({ ts: Date.now(), action: 'disable', env })
  }

  // Get the env that should receive a request (based on weights)
  routeRequest(): Environment {
    const blue = this.getState('blue')
    const green = this.getState('green')
    const total = blue.weight + green.weight
    if (total === 0) return 'blue'
    if (Math.random() * 100 < blue.weight) return 'blue'
    return 'green'
  }

  // List deploy history
  historyList(): typeof this.history { return [...this.history] }

  // Current health snapshot
  healthSnapshot(): { blue: { status: string; weight: number; version: string | null; health: 'healthy' | 'unhealthy' | 'unknown' }; green: { status: string; weight: number; version: string | null; health: 'healthy' | 'unhealthy' | 'unknown' } } {
    const blue = this.getState('blue')
    const green = this.getState('green')
    return {
      blue: { status: blue.status, weight: blue.weight, version: blue.activeVersion?.id ?? null, health: blue.activeVersion?.healthStatus ?? 'unknown' },
      green: { status: green.status, weight: green.weight, version: green.activeVersion?.id ?? null, health: green.activeVersion?.healthStatus ?? 'unknown' },
    }
  }

  metrics(): { deploys: number; promotes: number; rollbacks: number; switches: number } {
    let promotes = 0, rollbacks = 0, switches = 0, deploys = 0
    for (const h of this.history) {
      if (h.action === 'deploy') deploys++
      else if (h.action === 'promote') promotes++
      else if (h.action === 'rollback') rollbacks++
      else if (h.action === 'traffic' || h.action === 'disable') switches++
    }
    return { deploys, promotes, rollbacks, switches }
  }

  reset(): void {
    this.envs.set('blue', this.createInitialState('blue'))
    this.envs.set('green', this.createInitialState('green'))
    this.history = []
    this.health.clear()
    this.nextVersion = 1
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton

let _deployer: BlueGreenDeployer | null = null
export function getDeployer(): BlueGreenDeployer {
  if (!_deployer) _deployer = new BlueGreenDeployer()
  return _deployer
}
export function resetDeployer(): void {
  _deployer?.reset()
  _deployer = null
}
