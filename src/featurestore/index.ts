// Feature Store: feature definitions, entity-keyed storage, versioned values, online/offline paths, point-in-time joins.

export type FeatureDataType = 'int' | 'float' | 'string' | 'bool' | 'json' | 'vector' | string

export interface FeatureDefinition {
  name: string
  version: number
  dataType: FeatureDataType
  description?: string
  owner?: string
  tags?: string[]
  defaultValue?: unknown
  deprecated?: boolean
  createdAt: number
  updatedAt: number
}

export interface FeatureValue {
  entityId: string
  featureName: string
  version: number
  value: unknown
  timestamp: number
  ttlMs?: number
  metadata?: Record<string, string>
}

export interface FeatureGroup {
  id: string
  name: string
  description?: string
  features: string[] // feature names
  owner?: string
  createdAt: number
  updatedAt: number
}

export interface Entity {
  id: string
  type: string
  metadata?: Record<string, string>
  createdAt: number
}

export interface FeatureQuery {
  entityIds: string[]
  features: string[] // feature names
  asOf?: number // point-in-time
  includeMetadata?: boolean
  defaultValues?: Record<string, unknown>
}

export interface FeatureVector {
  entityId: string
  features: Record<string, unknown>
  timestamp: number
  missing: string[]
}

export interface FeatureStoreStats {
  definitions: number
  entities: number
  values: number
  groups: number
  totalStorageBytes: number
}

export class FeatureStore {
  private definitions = new Map<string, FeatureDefinition>()
  private values = new Map<string, FeatureValue[]>() // key = `${entityId}::${featureName}::${version}`
  private groups = new Map<string, FeatureGroup>()
  private entities = new Map<string, Entity>()

  // ---- Definitions ----
  defineFeature(def: Omit<FeatureDefinition, 'createdAt' | 'updatedAt' | 'version'> & { name: string; version?: number }): FeatureDefinition {
    const key = `${def.name}::${def.version ?? 1}`
    const now = Date.now()
    const existing = this.definitions.get(key)
    const stored: FeatureDefinition = {
      ...def,
      version: def.version ?? 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    this.definitions.set(key, stored)
    return stored
  }

  getDefinition(name: string, version: number = 1): FeatureDefinition | undefined {
    return this.definitions.get(`${name}::${version}`)
  }

  listDefinitions(): FeatureDefinition[] {
    return Array.from(this.definitions.values())
  }

  deprecateFeature(name: string, version: number = 1): boolean {
    const d = this.getDefinition(name, version)
    if (!d) return false
    d.deprecated = true
    d.updatedAt = Date.now()
    return true
  }

  // ---- Entities ----
  upsertEntity(e: Omit<Entity, 'createdAt'> & { id: string }): Entity {
    const existing = this.entities.get(e.id)
    if (existing) {
      Object.assign(existing, e, { createdAt: existing.createdAt })
      return existing
    }
    const ent: Entity = { ...e, createdAt: Date.now() }
    this.entities.set(e.id, ent)
    return ent
  }

  getEntity(id: string): Entity | undefined {
    return this.entities.get(id)
  }

  listEntities(type?: string): Entity[] {
    const all = Array.from(this.entities.values())
    return type ? all.filter(e => e.type === type) : all
  }

  // ---- Write feature values ----
  set(featureName: string, entityId: string, value: unknown, opts: { version?: number; timestamp?: number; ttlMs?: number; metadata?: Record<string, string> } = {}): FeatureValue {
    const version = opts.version ?? 1
    const def = this.getDefinition(featureName, version)
    if (!def) throw new Error(`Feature ${featureName} v${version} not defined`)
    if (def.deprecated) throw new Error(`Feature ${featureName} v${version} is deprecated`)
    const key = `${entityId}::${featureName}::${version}`
    const arr = this.values.get(key) ?? []
    const fv: FeatureValue = {
      entityId,
      featureName,
      version,
      value,
      timestamp: opts.timestamp ?? Date.now(),
      ttlMs: opts.ttlMs,
      metadata: opts.metadata,
    }
    arr.push(fv)
    this.values.set(key, arr)
    return fv
  }

  setBatch(items: { featureName: string; entityId: string; value: unknown; version?: number; timestamp?: number; ttlMs?: number }[]): FeatureValue[] {
    return items.map(i => this.set(i.featureName, i.entityId, i.value, { version: i.version, timestamp: i.timestamp, ttlMs: i.ttlMs }))
  }

  // ---- Read feature values ----
  get(featureName: string, entityId: string, opts: { version?: number; asOf?: number } = {}): unknown {
    const version = opts.version ?? 1
    const key = `${entityId}::${featureName}::${version}`
    const arr = this.values.get(key)
    if (!arr || arr.length === 0) return undefined
    if (opts.asOf !== undefined) {
      // Return latest value with timestamp <= asOf (point-in-time)
      const eligible = arr.filter(v => v.timestamp <= opts.asOf! && (v.ttlMs === undefined || v.timestamp + v.ttlMs > opts.asOf!))
      if (eligible.length === 0) return undefined
      return eligible[eligible.length - 1].value
    }
    // Return latest non-expired
    const now = Date.now()
    const eligible = arr.filter(v => v.ttlMs === undefined || v.timestamp + v.ttlMs > now)
    if (eligible.length === 0) return undefined
    return eligible[eligible.length - 1].value
  }

  // Get full history for an entity-feature
  history(featureName: string, entityId: string, version: number = 1): FeatureValue[] {
    return this.values.get(`${entityId}::${featureName}::${version}`) ?? []
  }

  // ---- Online path: query multiple features for an entity ----
  onlineGet(entityId: string, features: string[]): Record<string, unknown> {
    const out: Record<string, unknown> = {}
    for (const f of features) {
      const def = this.getDefinition(f)
      if (!def) continue
      out[f] = this.get(f, entityId, { version: def.version })
    }
    return out
  }

  // ---- Offline path: batch point-in-time ----
  offlineQuery(q: FeatureQuery): FeatureVector[] {
    const asOf = q.asOf ?? Date.now()
    return q.entityIds.map(entityId => {
      const features: Record<string, unknown> = {}
      const missing: string[] = []
      for (const f of q.features) {
        const def = this.getDefinition(f)
        if (!def) {
          missing.push(f)
          continue
        }
        const v = this.get(f, entityId, { version: def.version, asOf })
        if (v === undefined) {
          missing.push(f)
          if (q.defaultValues && f in q.defaultValues) {
            features[f] = q.defaultValues[f]
          } else {
            features[f] = def.defaultValue
          }
        } else {
          features[f] = v
        }
      }
      return { entityId, features, timestamp: asOf, missing }
    })
  }

  // ---- Groups ----
  createGroup(g: Omit<FeatureGroup, 'createdAt' | 'updatedAt' | 'id'> & { id?: string; name: string }): FeatureGroup {
    const id = g.id ?? `grp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
    const now = Date.now()
    const group: FeatureGroup = { ...g, id, createdAt: now, updatedAt: now }
    this.groups.set(id, group)
    return group
  }

  getGroup(id: string): FeatureGroup | undefined {
    return this.groups.get(id)
  }

  listGroups(): FeatureGroup[] {
    return Array.from(this.groups.values())
  }

  deleteGroup(id: string): boolean {
    return this.groups.delete(id)
  }

  addFeatureToGroup(groupId: string, featureName: string): boolean {
    const g = this.groups.get(groupId)
    if (!g) return false
    if (!g.features.includes(featureName)) {
      g.features.push(featureName)
      g.updatedAt = Date.now()
    }
    return true
  }

  // ---- Online group fetch ----
  onlineGetGroup(entityId: string, groupId: string): Record<string, unknown> {
    const g = this.groups.get(groupId)
    if (!g) return {}
    return this.onlineGet(entityId, g.features)
  }

  // ---- Storage sweep ----
  // Remove expired values
  sweep(at: number = Date.now()): number {
    let removed = 0
    for (const [key, arr] of this.values.entries()) {
      const filtered = arr.filter(v => v.ttlMs === undefined || v.timestamp + v.ttlMs > at)
      const n = arr.length - filtered.length
      if (n > 0) {
        removed += n
        if (filtered.length === 0) this.values.delete(key)
        else this.values.set(key, filtered)
      }
    }
    return removed
  }

  // ---- Stats ----
  stats(): FeatureStoreStats {
    let totalSize = 0
    for (const arr of this.values.values()) {
      for (const v of arr) {
        totalSize += JSON.stringify(v.value).length + 200
      }
    }
    return {
      definitions: this.definitions.size,
      entities: this.entities.size,
      values: Array.from(this.values.values()).reduce((s, a) => s + a.length, 0),
      groups: this.groups.size,
      totalStorageBytes: totalSize,
    }
  }

  clear(): void {
    this.definitions.clear()
    this.values.clear()
    this.groups.clear()
    this.entities.clear()
  }
}

let _fsSingleton: FeatureStore | null = null
export function getFeatureStore(): FeatureStore {
  if (!_fsSingleton) _fsSingleton = new FeatureStore()
  return _fsSingleton
}
export function resetFeatureStore(): void {
  if (_fsSingleton) _fsSingleton.clear()
  _fsSingleton = null
}
