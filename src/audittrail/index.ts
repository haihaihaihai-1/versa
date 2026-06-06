// Audit Trail: immutable, append-only event log with chain-of-custody hashing, structured query, and retention.

export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'permission' | 'export' | 'import' | 'config' | 'deploy' | 'execute' | (string & {})
export type AuditStatus = 'success' | 'failure' | 'denied' | 'pending' | (string & {})
export type AuditSeverity = 'info' | 'notice' | 'warning' | 'error' | 'critical' | (string & {})

export interface AuditEvent {
  id: string
  timestamp: number
  actor: { id: string; type: 'user' | 'system' | 'api' | 'admin' | (string & {}); ip?: string; userAgent?: string; sessionId?: string }
  action: AuditAction
  resource: { type: string; id: string; name?: string; parent?: { type: string; id: string } }
  status: AuditStatus
  severity: AuditSeverity
  outcome?: string
  errorCode?: string
  errorMessage?: string
  changes?: { before?: unknown; after?: unknown; diff?: Record<string, { from: unknown; to: unknown }> }
  context?: Record<string, unknown>
  metadata?: Record<string, string>
  prevHash: string
  hash: string
  signature?: string
  tags?: string[]
}

export interface AuditQuery {
  actorId?: string
  action?: AuditAction | AuditAction[]
  resourceType?: string
  resourceId?: string
  status?: AuditStatus
  severity?: AuditSeverity
  from?: number
  to?: number
  tags?: string[]
  textSearch?: string
  limit?: number
  offset?: number
  sortOrder?: 'asc' | 'desc'
}

export interface AuditQueryResult {
  events: AuditEvent[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
}

export interface AuditStats {
  total: number
  byAction: Record<string, number>
  byStatus: Record<string, number>
  bySeverity: Record<string, number>
  byActor: Record<string, number>
  oldest?: number
  newest?: number
  integrityValid: boolean
}

export interface AuditRetentionConfig {
  maxEvents?: number
  maxAgeMs?: number
  enabled: boolean
}

export interface AuditConfig {
  retention?: AuditRetentionConfig
  hashAlgorithm?: 'simple' | 'sha-like'
  signingSecret?: string
  onWrite?: (e: AuditEvent) => void
}

export class AuditTrail {
  private events: AuditEvent[] = []
  private config: Required<Omit<AuditConfig, 'onWrite' | 'signingSecret'>> & { onWrite?: (e: AuditEvent) => void; signingSecret?: string }
  private counter = 0
  private cursor = 0
  private actorIndex = new Map<string, number[]>()
  private resourceIndex = new Map<string, number[]>()
  private actionIndex = new Map<string, number[]>()
  private statusIndex = new Map<string, number[]>()
  private tagIndex = new Map<string, number[]>()

  constructor(config: AuditConfig = {}) {
    this.config = {
      retention: config.retention ?? { enabled: false },
      hashAlgorithm: config.hashAlgorithm ?? 'simple',
      signingSecret: config.signingSecret,
      onWrite: config.onWrite,
    }
  }

  // ---- Hash function (chain of custody) ----
  private hash(payload: string): string {
    if (this.config.hashAlgorithm === 'sha-like') {
      // FNV-1a 32-bit
      let h = 0x811c9dc5
      for (let i = 0; i < payload.length; i++) {
        h ^= payload.charCodeAt(i)
        h = Math.imul(h, 0x01000193) >>> 0
      }
      return h.toString(16).padStart(8, '0')
    }
    // Simple djb2
    let h = 5381
    for (let i = 0; i < payload.length; i++) h = ((h << 5) + h + payload.charCodeAt(i)) >>> 0
    return h.toString(36)
  }

  // ---- Write ----
  log(partial: Omit<AuditEvent, 'id' | 'timestamp' | 'prevHash' | 'hash' | 'signature'>): AuditEvent {
    const id = `ev_${Date.now().toString(36)}_${(++this.counter).toString(36)}`
    const timestamp = Date.now()
    const prev = this.events[this.events.length - 1]
    const prevHash = prev ? prev.hash : 'genesis'
    const payload = JSON.stringify({ id, timestamp, ...partial, prevHash })
    const hash = this.hash(payload + (this.config.signingSecret ?? ''))
    const signature = this.config.signingSecret ? this.hash(hash + this.config.signingSecret) : undefined
    const event: AuditEvent = {
      id,
      timestamp,
      prevHash,
      hash,
      signature,
      ...partial,
    }
    this.events.push(event)
    const idx = this.events.length - 1
    this.cursor = idx
    // Index
    const aIdx = this.actorIndex.get(partial.actor.id) ?? []
    aIdx.push(idx); this.actorIndex.set(partial.actor.id, aIdx)
    const rKey = `${partial.resource.type}:${partial.resource.id}`
    const rIdx = this.resourceIndex.get(rKey) ?? []
    rIdx.push(idx); this.resourceIndex.set(rKey, rIdx)
    const acIdx = this.actionIndex.get(partial.action) ?? []
    acIdx.push(idx); this.actionIndex.set(partial.action, acIdx)
    const stIdx = this.statusIndex.get(partial.status) ?? []
    stIdx.push(idx); this.statusIndex.set(partial.status, stIdx)
    if (partial.tags) {
      for (const t of partial.tags) {
        const ti = this.tagIndex.get(t) ?? []
        ti.push(idx); this.tagIndex.set(t, ti)
      }
    }
    this.enforceRetention()
    if (this.config.onWrite) this.config.onWrite(event)
    return event
  }

  // ---- Read ----
  get(id: string): AuditEvent | undefined {
    return this.events.find(e => e.id === id)
  }

  query(q: AuditQuery = {}): AuditQueryResult {
    let candidates: number[] = this.events.map((_, i) => i)
    if (q.actorId) {
      candidates = candidates.filter(i => this.events[i].actor.id === q.actorId)
    }
    if (q.action) {
      const actions = Array.isArray(q.action) ? q.action : [q.action]
      candidates = candidates.filter(i => actions.includes(this.events[i].action))
    }
    if (q.resourceType) {
      candidates = candidates.filter(i => this.events[i].resource.type === q.resourceType)
    }
    if (q.resourceId) {
      candidates = candidates.filter(i => this.events[i].resource.id === q.resourceId)
    }
    if (q.status) {
      candidates = candidates.filter(i => this.events[i].status === q.status)
    }
    if (q.severity) {
      candidates = candidates.filter(i => this.events[i].severity === q.severity)
    }
    if (q.from !== undefined) {
      candidates = candidates.filter(i => this.events[i].timestamp >= q.from!)
    }
    if (q.to !== undefined) {
      candidates = candidates.filter(i => this.events[i].timestamp <= q.to!)
    }
    if (q.tags && q.tags.length > 0) {
      const tagSet = new Set(q.tags)
      candidates = candidates.filter(i => {
        const ev = this.events[i]
        return ev.tags && ev.tags.some(t => tagSet.has(t))
      })
    }
    if (q.textSearch) {
      const needle = q.textSearch.toLowerCase()
      candidates = candidates.filter(i => {
        const e = this.events[i]
        const blob = [
          e.actor.id, e.action, e.resource.type, e.resource.id,
          e.resource.name, e.outcome, e.errorMessage, JSON.stringify(e.context),
        ].filter(Boolean).join(' ').toLowerCase()
        return blob.includes(needle)
      })
    }
    const total = candidates.length
    const sort = q.sortOrder ?? 'desc'
    candidates.sort((a, b) => {
      const ea = this.events[a]
      const eb = this.events[b]
      const td = sort === 'asc' ? ea.timestamp - eb.timestamp : eb.timestamp - ea.timestamp
      return td !== 0 ? td : (sort === 'asc' ? a - b : b - a)
    })
    const offset = q.offset ?? 0
    const limit = q.limit ?? 100
    const slice = candidates.slice(offset, offset + limit)
    return {
      events: slice.map(i => this.events[i]),
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    }
  }

  // Stream all events (in chronological order)
  stream(): AuditEvent[] {
    return [...this.events]
  }

  // Resource history
  getResourceHistory(type: string, id: string): AuditEvent[] {
    const key = `${type}:${id}`
    const idxs = this.resourceIndex.get(key) ?? []
    return idxs.map(i => this.events[i])
  }

  // Actor history
  getActorHistory(actorId: string, limit = 100): AuditEvent[] {
    const idxs = (this.actorIndex.get(actorId) ?? []).slice(-limit)
    return idxs.map(i => this.events[i])
  }

  // ---- Integrity ----
  verifyIntegrity(): { valid: boolean; brokenAt?: number; reason?: string } {
    let prevHash = 'genesis'
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i]
      if (e.prevHash !== prevHash) {
        return { valid: false, brokenAt: i, reason: `chain mismatch at ${i}: expected prevHash=${prevHash}, got ${e.prevHash}` }
      }
      const payload = JSON.stringify({ id: e.id, timestamp: e.timestamp, actor: e.actor, action: e.action, resource: e.resource, status: e.status, severity: e.severity, outcome: e.outcome, errorCode: e.errorCode, errorMessage: e.errorMessage, changes: e.changes, context: e.context, metadata: e.metadata, tags: e.tags, prevHash })
      const expected = this.hash(payload + (this.config.signingSecret ?? ''))
      if (expected !== e.hash) {
        return { valid: false, brokenAt: i, reason: `hash mismatch at ${i}` }
      }
      prevHash = e.hash
    }
    return { valid: true }
  }

  // ---- Stats ----
  stats(): AuditStats {
    const byAction: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    const bySeverity: Record<string, number> = {}
    const byActor: Record<string, number> = {}
    let oldest: number | undefined
    let newest: number | undefined
    for (const e of this.events) {
      byAction[e.action] = (byAction[e.action] ?? 0) + 1
      byStatus[e.status] = (byStatus[e.status] ?? 0) + 1
      bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1
      byActor[e.actor.id] = (byActor[e.actor.id] ?? 0) + 1
      if (oldest === undefined || e.timestamp < oldest) oldest = e.timestamp
      if (newest === undefined || e.timestamp > newest) newest = e.timestamp
    }
    const integ = this.verifyIntegrity()
    return { total: this.events.length, byAction, byStatus, bySeverity, byActor, oldest, newest, integrityValid: integ.valid }
  }

  // ---- Retention ----
  private enforceRetention(): void {
    if (!this.config.retention.enabled) return
    const r = this.config.retention
    let i = 0
    if (r.maxAgeMs !== undefined) {
      const cutoff = Date.now() - r.maxAgeMs
      while (i < this.events.length && this.events[i].timestamp < cutoff) i++
    }
    if (r.maxEvents !== undefined && this.events.length - i > r.maxEvents) {
      i = Math.max(i, this.events.length - r.maxEvents)
    }
    if (i > 0) {
      this.events.splice(0, i)
      this.rebuildIndexes()
    }
  }

  private rebuildIndexes(): void {
    this.actorIndex.clear()
    this.resourceIndex.clear()
    this.actionIndex.clear()
    this.statusIndex.clear()
    this.tagIndex.clear()
    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i]
      const aIdx = this.actorIndex.get(e.actor.id) ?? []; aIdx.push(i); this.actorIndex.set(e.actor.id, aIdx)
      const rKey = `${e.resource.type}:${e.resource.id}`
      const rIdx = this.resourceIndex.get(rKey) ?? []; rIdx.push(i); this.resourceIndex.set(rKey, rIdx)
      const acIdx = this.actionIndex.get(e.action) ?? []; acIdx.push(i); this.actionIndex.set(e.action, acIdx)
      const stIdx = this.statusIndex.get(e.status) ?? []; stIdx.push(i); this.statusIndex.set(e.status, stIdx)
      if (e.tags) for (const t of e.tags) {
        const ti = this.tagIndex.get(t) ?? []; ti.push(i); this.tagIndex.set(t, ti)
      }
    }
  }

  configure(cfg: Partial<AuditConfig>): void {
    if (cfg.retention) this.config.retention = cfg.retention
    if (cfg.hashAlgorithm) this.config.hashAlgorithm = cfg.hashAlgorithm
    if (cfg.signingSecret !== undefined) this.config.signingSecret = cfg.signingSecret
    if (cfg.onWrite !== undefined) this.config.onWrite = cfg.onWrite
  }

  clear(): void {
    this.events = []
    this.counter = 0
    this.cursor = 0
    this.actorIndex.clear()
    this.resourceIndex.clear()
    this.actionIndex.clear()
    this.statusIndex.clear()
    this.tagIndex.clear()
  }

  // Export all events as JSON
  export(): AuditEvent[] {
    return this.events.map(e => ({ ...e }))
  }

  // Import events (for restore / migration)
  import(events: AuditEvent[], mode: 'append' | 'replace' = 'append'): void {
    if (mode === 'replace') this.clear()
    for (const e of events) this.events.push(e)
    this.rebuildIndexes()
  }
}

let _auditSingleton: AuditTrail | null = null
export function getAudit(): AuditTrail {
  if (!_auditSingleton) _auditSingleton = new AuditTrail()
  return _auditSingleton
}
export function resetAudit(): void {
  if (_auditSingleton) _auditSingleton.clear()
  _auditSingleton = null
}
