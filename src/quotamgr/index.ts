// Quota Manager: per-tenant / per-user resource usage tracking with tiered limits, sliding windows, and enforcement.

export type QuotaResource = 'requests' | 'storage' | 'bandwidth' | 'compute' | 'writes' | 'reads' | 'emails' | 'webhooks' | (string & {})
export type QuotaTier = 'free' | 'starter' | 'pro' | 'enterprise' | (string & {})
export type QuotaWindow = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year' | (string & {})
export type QuotaEnforcement = 'block' | 'warn' | 'throttle' | (string & {})

export interface QuotaUsagePoint {
  ts: number
  amount: number
}

export interface QuotaPolicy {
  id: string
  name: string
  resource: QuotaResource
  limit: number
  window: QuotaWindow
  enforcement: QuotaEnforcement
  warnThreshold?: number
  overage?: number
  enabled: boolean
  metadata?: Record<string, string>
  createdAt: number
}

export interface QuotaSubject {
  id: string
  tier: QuotaTier
  metadata?: Record<string, string>
}

export interface QuotaUsage {
  subjectId: string
  resource: QuotaResource
  used: number
  limit: number
  remaining: number
  window: QuotaWindow
  windowStart: number
  windowEnd: number
  percent: number
  overage: number
  state: 'ok' | 'warn' | 'exceeded'
}

export interface QuotaCheckResult {
  allowed: boolean
  amount: number
  remaining: number
  state: 'ok' | 'warn' | 'exceeded'
  reason?: string
}

export interface QuotaSnapshot {
  subjectId: string
  tier: QuotaTier
  usages: QuotaUsage[]
  totalUsed: number
  totalLimit: number
  generatedAt: number
}

export interface QuotaAlert {
  id: string
  subjectId: string
  resource: QuotaResource
  amount: number
  limit: number
  state: 'warn' | 'exceeded'
  timestamp: number
}

export interface QuotaTierConfig {
  id: QuotaTier
  name: string
  limits: { resource: QuotaResource; limit: number; window: QuotaWindow; enforcement: QuotaEnforcement; warnThreshold?: number }[]
  description?: string
}

export interface QuotaManagerConfig {
  defaultEnforcement?: QuotaEnforcement
  warnThreshold?: number
  onAlert?: (a: QuotaAlert) => void
  enableForecasting?: boolean
}

export class QuotaManager {
  private policies = new Map<string, QuotaPolicy>()
  private tierConfigs = new Map<QuotaTier, QuotaTierConfig>()
  private subjects = new Map<string, QuotaSubject>()
  // usageBuckets: key = `${subjectId}::${resource}::${bucketStart}` -> amount
  private usageBuckets = new Map<string, number>()
  // subjectPolicies: subjectId -> set of policy ids
  private subjectPolicies = new Map<string, Set<string>>()
  private policySubject = new Map<string, string>()
  private alertHistory: QuotaAlert[] = []
  private alertState = new Map<string, 'ok' | 'warn' | 'exceeded'>()
  private config: Required<Omit<QuotaManagerConfig, 'onAlert'>> & { onAlert?: (a: QuotaAlert) => void }

  constructor(config: QuotaManagerConfig = {}) {
    this.config = {
      defaultEnforcement: config.defaultEnforcement ?? 'block',
      warnThreshold: config.warnThreshold ?? 0.8,
      onAlert: config.onAlert,
      enableForecasting: config.enableForecasting ?? true,
    }
  }

  // ---- Tier config ----
  defineTier(cfg: QuotaTierConfig): QuotaTierConfig {
    this.tierConfigs.set(cfg.id, { ...cfg })
    return cfg
  }

  getTier(id: QuotaTier): QuotaTierConfig | undefined {
    return this.tierConfigs.get(id)
  }

  listTiers(): QuotaTierConfig[] {
    return Array.from(this.tierConfigs.values())
  }

  // ---- Subjects ----
  registerSubject(s: QuotaSubject): QuotaSubject {
    this.subjects.set(s.id, { ...s })
    if (!this.subjectPolicies.has(s.id)) this.subjectPolicies.set(s.id, new Set())
    return s
  }

  getSubject(id: string): QuotaSubject | undefined {
    return this.subjects.get(id)
  }

  listSubjects(): QuotaSubject[] {
    return Array.from(this.subjects.values())
  }

  // ---- Policies ----
  createPolicy(p: Omit<QuotaPolicy, 'id' | 'createdAt'> & { id?: string }): QuotaPolicy {
    const id = p.id ?? `pol_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    const policy: QuotaPolicy = { ...p, id, createdAt: Date.now() }
    this.policies.set(id, policy)
    return policy
  }

  getPolicy(id: string): QuotaPolicy | undefined {
    return this.policies.get(id)
  }

  listPolicies(): QuotaPolicy[] {
    return Array.from(this.policies.values())
  }

  updatePolicy(id: string, patch: Partial<Omit<QuotaPolicy, 'id' | 'createdAt'>>): QuotaPolicy | undefined {
    const p = this.policies.get(id)
    if (!p) return undefined
    Object.assign(p, patch)
    return p
  }

  deletePolicy(id: string): boolean {
    const p = this.policies.get(id)
    if (!p) return false
    // Remove from all subjects
    for (const set of this.subjectPolicies.values()) set.delete(id)
    this.policySubject.delete(id)
    this.policies.delete(id)
    this.alertState.delete(id)
    return true
  }

  // Assign policy to subject
  assignPolicy(subjectId: string, policyId: string): boolean {
    if (!this.policies.has(policyId)) return false
    const set = this.subjectPolicies.get(subjectId) ?? new Set<string>()
    set.add(policyId)
    this.subjectPolicies.set(subjectId, set)
    this.policySubject.set(policyId, subjectId)
    return true
  }

  unassignPolicy(subjectId: string, policyId: string): boolean {
    const set = this.subjectPolicies.get(subjectId)
    if (!set || !set.has(policyId)) return false
    set.delete(policyId)
    this.policySubject.delete(policyId)
    return true
  }

  // Apply tier policies to a subject (mass assign from tier config)
  applyTier(subjectId: string, tier: QuotaTier): boolean {
    const cfg = this.tierConfigs.get(tier)
    if (!cfg) return false
    const subject = this.subjects.get(subjectId)
    if (subject) subject.tier = tier
    for (const limit of cfg.limits) {
      const p = this.createPolicy({
        name: `${tier}-${limit.resource}`,
        resource: limit.resource,
        limit: limit.limit,
        window: limit.window,
        enforcement: limit.enforcement,
        warnThreshold: limit.warnThreshold,
        enabled: true,
      })
      this.assignPolicy(subjectId, p.id)
    }
    return true
  }

  getSubjectPolicies(subjectId: string): QuotaPolicy[] {
    const ids = this.subjectPolicies.get(subjectId)
    if (!ids) return []
    return Array.from(ids).map(id => this.policies.get(id)).filter((p): p is QuotaPolicy => !!p)
  }

  // ---- Window calculation ----
  private windowStart(now: number, window: QuotaWindow): number {
    const d = new Date(now)
    if (window === 'minute') return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()).getTime()
    if (window === 'hour') return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()).getTime()
    if (window === 'day') return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    if (window === 'week') {
      const day = d.getDay()
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day)
      return start.getTime()
    }
    if (window === 'month') return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
    if (window === 'year') return new Date(d.getFullYear(), 0, 1).getTime()
    return Math.floor(now / 60000) * 60000
  }

  private windowMs(window: QuotaWindow): number {
    const map: Record<string, number> = {
      minute: 60_000,
      hour: 3_600_000,
      day: 86_400_000,
      week: 604_800_000,
      month: 2_629_800_000,
      year: 31_557_600_000,
    }
    return map[window] ?? 60_000
  }

  private bucketKey(subjectId: string, resource: QuotaResource, start: number): string {
    return `${subjectId}::${resource}::${start}`
  }

  // ---- Tracking ----
  // Record usage (incremental)
  record(subjectId: string, resource: QuotaResource, amount: number, at: number = Date.now()): QuotaCheckResult {
    const policies = this.getSubjectPolicies(subjectId).filter(p => p.resource === resource && p.enabled)
    if (policies.length === 0) {
      return { allowed: true, amount, remaining: Infinity, state: 'ok' }
    }
    // Use the most restrictive (lowest remaining) policy
    let bestResult: QuotaCheckResult = { allowed: true, amount, remaining: Infinity, state: 'ok' }
    for (const policy of policies) {
      const start = this.windowStart(at, policy.window)
      const key = this.bucketKey(subjectId, resource, start)
      const used = this.usageBuckets.get(key) ?? 0
      const remaining = policy.limit - used
      const newUsed = used + amount
      const newRemaining = policy.limit - newUsed
      const state: 'ok' | 'warn' | 'exceeded' = newUsed > policy.limit ? 'exceeded' : newUsed >= policy.limit * (policy.warnThreshold ?? this.config.warnThreshold) ? 'warn' : 'ok'

      if (policy.enforcement === 'block' && newUsed > policy.limit) {
        bestResult = { allowed: false, amount, remaining: newRemaining, state, reason: `Policy ${policy.name} exceeded: ${newUsed}/${policy.limit}` }
        break
      } else {
        if (newRemaining < bestResult.remaining) {
          bestResult = { allowed: true, amount, remaining: newRemaining, state }
        }
      }
    }
    if (bestResult.allowed) {
      // Commit the usage to first matching policy's bucket
      const policy = policies[0]
      const start = this.windowStart(at, policy.window)
      const key = this.bucketKey(subjectId, resource, start)
      this.usageBuckets.set(key, (this.usageBuckets.get(key) ?? 0) + amount)
      // Fire alert if state changed
      const alertKey = `${subjectId}::${resource}::${policy.id}`
      const prevState = this.alertState.get(alertKey) ?? 'ok'
      if (bestResult.state !== prevState) {
        this.alertState.set(alertKey, bestResult.state)
        if (bestResult.state === 'warn' || bestResult.state === 'exceeded') {
          const alert: QuotaAlert = {
            id: `alert_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
            subjectId,
            resource,
            amount: (this.usageBuckets.get(key) ?? 0),
            limit: policy.limit,
            state: bestResult.state,
            timestamp: Date.now(),
          }
          this.alertHistory.push(alert)
          if (this.config.onAlert) this.config.onAlert(alert)
        }
      }
    }
    return bestResult
  }

  // Check without recording
  check(subjectId: string, resource: QuotaResource, at: number = Date.now()): QuotaUsage[] {
    const policies = this.getSubjectPolicies(subjectId).filter(p => p.resource === resource && p.enabled)
    return policies.map(p => {
      const start = this.windowStart(at, p.window)
      const used = this.usageBuckets.get(this.bucketKey(subjectId, resource, start)) ?? 0
      const remaining = p.limit - used
      const percent = p.limit > 0 ? Math.min(1, used / p.limit) : 0
      const overage = used > p.limit ? used - p.limit : 0
      const state: 'ok' | 'warn' | 'exceeded' = overage > 0 ? 'exceeded' : percent >= (p.warnThreshold ?? this.config.warnThreshold) ? 'warn' : 'ok'
      return {
        subjectId,
        resource,
        used,
        limit: p.limit,
        remaining,
        window: p.window,
        windowStart: start,
        windowEnd: start + this.windowMs(p.window),
        percent,
        overage,
        state,
      }
    })
  }

  // Set usage directly (e.g., reading from external source)
  setUsage(subjectId: string, resource: QuotaResource, used: number, at: number = Date.now()): void {
    const policies = this.getSubjectPolicies(subjectId).filter(p => p.resource === resource)
    if (policies.length === 0) return
    const policy = policies[0]
    const start = this.windowStart(at, policy.window)
    this.usageBuckets.set(this.bucketKey(subjectId, resource, start), used)
  }

  // Reset a subject's usage
  reset(subjectId: string, resource?: QuotaResource): number {
    let n = 0
    for (const key of Array.from(this.usageBuckets.keys())) {
      if (resource) {
        const [sid, res] = key.split('::')
        if (sid === subjectId && res === resource) { this.usageBuckets.delete(key); n++ }
      } else if (key.startsWith(`${subjectId}::`)) {
        this.usageBuckets.delete(key); n++
      }
    }
    return n
  }

  // ---- Snapshot & reporting ----
  snapshot(subjectId: string, at: number = Date.now()): QuotaSnapshot {
    const subject = this.subjects.get(subjectId)
    if (!subject) {
      return { subjectId, tier: 'free', usages: [], totalUsed: 0, totalLimit: 0, generatedAt: at }
    }
    const policies = this.getSubjectPolicies(subjectId).filter(p => p.enabled)
    const usages = policies.map(p => this.check(subjectId, p.resource, at)).flat()
    const totalUsed = usages.reduce((s, u) => s + u.used, 0)
    const totalLimit = usages.reduce((s, u) => s + u.limit, 0)
    return { subjectId, tier: subject.tier, usages, totalUsed, totalLimit, generatedAt: at }
  }

  // Top consumers by resource
  topConsumers(resource: QuotaResource, at: number = Date.now(), limit = 10): { subjectId: string; tier: QuotaTier; used: number; percent: number }[] {
    const entries: { subjectId: string; tier: QuotaTier; used: number; percent: number }[] = []
    for (const [subjectId, subject] of this.subjects.entries()) {
      const usages = this.check(subjectId, resource, at)
      if (usages.length === 0) continue
      const total = usages.reduce((s, u) => s + u.used, 0)
      const pct = usages.reduce((s, u) => s + u.percent, 0) / usages.length
      entries.push({ subjectId, tier: subject.tier, used: total, percent: pct })
    }
    return entries.sort((a, b) => b.used - a.used).slice(0, limit)
  }

  // Forecast projected usage (linear extrapolation)
  forecast(subjectId: string, resource: QuotaResource, at: number = Date.now()): { used: number; projected: number; willExceedAt: number | null } {
    if (!this.config.enableForecasting) return { used: 0, projected: 0, willExceedAt: null }
    const usages = this.check(subjectId, resource, at)
    if (usages.length === 0) return { used: 0, projected: 0, willExceedAt: null }
    const usage = usages[0]
    const elapsed = at - usage.windowStart
    if (elapsed <= 0) return { used: usage.used, projected: usage.used, willExceedAt: null }
    const rate = usage.used / elapsed
    const totalWindowMs = usage.windowEnd - usage.windowStart
    const projected = rate * totalWindowMs
    const willExceedAt = rate > 0 ? usage.windowStart + usage.limit / rate : null
    return { used: usage.used, projected, willExceedAt }
  }

  // Alerts
  getAlerts(subjectId?: string): QuotaAlert[] {
    return subjectId ? this.alertHistory.filter(a => a.subjectId === subjectId) : [...this.alertHistory]
  }

  clearAlerts(): void {
    this.alertHistory = []
    this.alertState.clear()
  }

  // Aggregate metrics
  metrics(): {
    subjects: number
    policies: number
    tiers: number
    totalBuckets: number
    totalAlerts: number
    totalUsage: number
  } {
    let total = 0
    for (const v of this.usageBuckets.values()) total += v
    return {
      subjects: this.subjects.size,
      policies: this.policies.size,
      tiers: this.tierConfigs.size,
      totalBuckets: this.usageBuckets.size,
      totalAlerts: this.alertHistory.length,
      totalUsage: total,
    }
  }

  clear(): void {
    this.policies.clear()
    this.subjects.clear()
    this.usageBuckets.clear()
    this.subjectPolicies.clear()
    this.policySubject.clear()
    this.tierConfigs.clear()
    this.alertHistory = []
    this.alertState.clear()
  }
}

// Default tier templates
export const DEFAULT_TIERS: QuotaTierConfig[] = [
  {
    id: 'free',
    name: 'Free',
    limits: [
      { resource: 'requests', limit: 1000, window: 'month', enforcement: 'block', warnThreshold: 0.8 },
      { resource: 'storage', limit: 100, window: 'month', enforcement: 'block' },
      { resource: 'bandwidth', limit: 1024, window: 'month', enforcement: 'block' },
    ],
    description: 'Free tier for evaluation',
  },
  {
    id: 'pro',
    name: 'Pro',
    limits: [
      { resource: 'requests', limit: 100_000, window: 'month', enforcement: 'block', warnThreshold: 0.8 },
      { resource: 'storage', limit: 10_000, window: 'month', enforcement: 'block' },
      { resource: 'bandwidth', limit: 102_400, window: 'month', enforcement: 'block' },
    ],
    description: 'Professional tier',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    limits: [
      { resource: 'requests', limit: 10_000_000, window: 'month', enforcement: 'warn', warnThreshold: 0.9 },
      { resource: 'storage', limit: 1_000_000, window: 'month', enforcement: 'warn' },
      { resource: 'bandwidth', limit: 10_485_760, window: 'month', enforcement: 'warn' },
    ],
    description: 'Enterprise tier (soft limits)',
  },
]

let _quotaSingleton: QuotaManager | null = null
export function getQuota(): QuotaManager {
  if (!_quotaSingleton) {
    _quotaSingleton = new QuotaManager()
    for (const t of DEFAULT_TIERS) _quotaSingleton.defineTier(t)
  }
  return _quotaSingleton
}
export function resetQuota(): void {
  if (_quotaSingleton) _quotaSingleton.clear()
  _quotaSingleton = null
}
