// Knowledge Graph: entities, relations, traversal, path-finding, subgraph extraction, queries.

export type EntityId = string
export type RelationId = string

export type Value = string | number | boolean | null

export interface Entity {
  id: EntityId
  type: string
  label: string
  properties: Record<string, Value>
  createdAt: number
}

export interface Relation {
  id: RelationId
  type: string
  from: EntityId
  to: EntityId
  weight: number
  properties: Record<string, Value>
  createdAt: number
}

export interface GraphQuery {
  type?: string
  propertyFilters?: { key: string; op: 'eq' | 'gt' | 'lt' | 'in' | 'contains'; value: Value | Value[] }[]
  limit?: number
}

export interface Path {
  nodes: EntityId[]
  relations: RelationId[]
  totalWeight: number
  length: number
}

export interface GraphStats {
  entityCount: number
  relationCount: number
  entityTypes: Record<string, number>
  relationTypes: Record<string, number>
  avgDegree: number
  density: number
  components: number
}

export interface KgConfig {
  allowSelfLoop: boolean
  defaultWeight: number
  enableInverseIndex: boolean
  maxTraversalDepth: number
}

const DEFAULT_CONFIG: KgConfig = {
  allowSelfLoop: false,
  defaultWeight: 1,
  enableInverseIndex: true,
  maxTraversalDepth: 6,
}

export class KnowledgeGraph {
  readonly config: KgConfig
  private entities: Map<EntityId, Entity> = new Map()
  private relations: Map<RelationId, Relation> = new Map()
  private outIndex: Map<EntityId, Relation[]> = new Map()
  private inIndex: Map<EntityId, Relation[]> = new Map()
  private typeIndex: Map<string, Set<EntityId>> = new Map()
  private relTypeIndex: Map<string, Set<RelationId>> = new Map()
  private startedAt = Date.now()

  constructor(config: Partial<KgConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ---- Entity CRUD ----
  addEntity(e: Omit<Entity, 'createdAt'> & { createdAt?: number }): Entity {
    if (this.entities.has(e.id)) throw new Error('entity exists: ' + e.id)
    const full: Entity = { createdAt: Date.now(), ...e }
    this.entities.set(full.id, full)
    if (!this.typeIndex.has(full.type)) this.typeIndex.set(full.type, new Set())
    this.typeIndex.get(full.type)!.add(full.id)
    return full
  }

  getEntity(id: EntityId): Entity | undefined {
    return this.entities.get(id)
  }

  hasEntity(id: EntityId): boolean {
    return this.entities.has(id)
  }

  updateEntity(id: EntityId, updates: Partial<Pick<Entity, 'label' | 'properties' | 'type'>>): Entity {
    const e = this.entities.get(id)
    if (!e) throw new Error('entity not found: ' + id)
    if (updates.type && updates.type !== e.type) {
      this.typeIndex.get(e.type)?.delete(id)
      if (!this.typeIndex.has(updates.type)) this.typeIndex.set(updates.type, new Set())
      this.typeIndex.get(updates.type)!.add(id)
    }
    if (updates.label !== undefined) e.label = updates.label
    if (updates.type !== undefined) e.type = updates.type
    if (updates.properties) e.properties = { ...e.properties, ...updates.properties }
    return e
  }

  removeEntity(id: EntityId): boolean {
    const e = this.entities.get(id)
    if (!e) return false
    const rels = this.outIndex.get(id) ?? []
    const inRels = this.inIndex.get(id) ?? []
    for (const r of [...rels, ...inRels]) this.removeRelation(r.id)
    this.entities.delete(id)
    this.typeIndex.get(e.type)?.delete(id)
    return true
  }

  // ---- Relation CRUD ----
  addRelation(r: Omit<Relation, 'createdAt' | 'weight' | 'properties'> & { weight?: number; properties?: Record<string, Value>; createdAt?: number }): Relation {
    if (this.relations.has(r.id)) throw new Error('relation exists: ' + r.id)
    if (!this.config.allowSelfLoop && r.from === r.to) throw new Error('self-loop not allowed')
    if (!this.entities.has(r.from)) throw new Error('from entity not found: ' + r.from)
    if (!this.entities.has(r.to)) throw new Error('to entity not found: ' + r.to)
    const full: Relation = { weight: this.config.defaultWeight, properties: {}, createdAt: Date.now(), ...r }
    this.relations.set(full.id, full)
    if (!this.outIndex.has(full.from)) this.outIndex.set(full.from, [])
    if (!this.inIndex.has(full.to)) this.inIndex.set(full.to, [])
    this.outIndex.get(full.from)!.push(full)
    this.inIndex.get(full.to)!.push(full)
    if (!this.relTypeIndex.has(full.type)) this.relTypeIndex.set(full.type, new Set())
    this.relTypeIndex.get(full.type)!.add(full.id)
    return full
  }

  getRelation(id: RelationId): Relation | undefined {
    return this.relations.get(id)
  }

  removeRelation(id: RelationId): boolean {
    const r = this.relations.get(id)
    if (!r) return false
    this.relations.delete(id)
    this.relTypeIndex.get(r.type)?.delete(id)
    const outList = this.outIndex.get(r.from)
    if (outList) this.outIndex.set(r.from, outList.filter(x => x.id !== id))
    const inList = this.inIndex.get(r.to)
    if (inList) this.inIndex.set(r.to, inList.filter(x => x.id !== id))
    return true
  }

  // ---- Queries ----
  queryEntities(q: GraphQuery): Entity[] {
    let out = [...this.entities.values()]
    if (q.type) out = out.filter(e => e.type === q.type)
    if (q.propertyFilters) {
      out = out.filter(e => {
        for (const f of q.propertyFilters!) {
          const v = e.properties[f.key]
          if (f.op === 'eq') { if (v !== f.value) return false }
          else if (f.op === 'gt') {
            if (typeof v !== 'number' || typeof f.value !== 'number') return false
            if (!(v > f.value)) return false
          }
          else if (f.op === 'lt') {
            if (typeof v !== 'number' || typeof f.value !== 'number') return false
            if (!(v < f.value)) return false
          }
          else if (f.op === 'in') {
            if (!Array.isArray(f.value) || !f.value.includes(v as Value)) return false
          }
          else if (f.op === 'contains') {
            if (typeof v !== 'string' || typeof f.value !== 'string') return false
            if (!v.includes(f.value)) return false
          }
        }
        return true
      })
    }
    if (q.limit !== undefined) out = out.slice(0, q.limit)
    return out
  }

  getOutgoing(id: EntityId, relType?: string): Relation[] {
    const list = this.outIndex.get(id) ?? []
    return relType ? list.filter(r => r.type === relType) : [...list]
  }

  getIncoming(id: EntityId, relType?: string): Relation[] {
    const list = this.inIndex.get(id) ?? []
    return relType ? list.filter(r => r.type === relType) : [...list]
  }

  getNeighbors(id: EntityId, relType?: string): EntityId[] {
    const out = new Set<EntityId>()
    for (const r of this.getOutgoing(id, relType)) out.add(r.to)
    for (const r of this.getIncoming(id, relType)) out.add(r.from)
    return [...out]
  }

  // ---- Traversal ----
  bfs(start: EntityId, opts?: { maxDepth?: number; relType?: string }): EntityId[] {
    const max = opts?.maxDepth ?? this.config.maxTraversalDepth
    const visited = new Set<EntityId>([start])
    const queue: { id: EntityId; depth: number }[] = [{ id: start, depth: 0 }]
    const order: EntityId[] = [start]
    while (queue.length > 0) {
      const cur = queue.shift()!
      if (cur.depth >= max) continue
      for (const n of this.getNeighbors(cur.id, opts?.relType)) {
        if (!visited.has(n)) { visited.add(n); order.push(n); queue.push({ id: n, depth: cur.depth + 1 }) }
      }
    }
    return order
  }

  // ---- Path finding (Dijkstra) ----
  findPath(from: EntityId, to: EntityId, opts?: { relType?: string; maxHops?: number }): Path | null {
    if (!this.entities.has(from) || !this.entities.has(to)) return null
    if (from === to) return { nodes: [from], relations: [], totalWeight: 0, length: 0 }
    const maxHops = opts?.maxHops ?? 6
    const dist: Map<EntityId, number> = new Map([[from, 0]])
    const prev: Map<EntityId, { node: EntityId; rel: Relation }> = new Map()
    const visited = new Set<EntityId>()
    type PQEntry = { id: EntityId; dist: number }
    const pq: PQEntry[] = [{ id: from, dist: 0 }]
    while (pq.length > 0) {
      pq.sort((a, b) => a.dist - b.dist)
      const cur = pq.shift()!
      if (visited.has(cur.id)) continue
      visited.add(cur.id)
      if (cur.id === to) break
      const depth = cur.dist === 0 ? 0 : this.pathDepth(prev, from, cur.id)
      if (depth >= maxHops) continue
      for (const r of this.getOutgoing(cur.id, opts?.relType)) {
        const nd = cur.dist + r.weight
        if (nd < (dist.get(r.to) ?? Infinity)) {
          dist.set(r.to, nd)
          prev.set(r.to, { node: cur.id, rel: r })
          pq.push({ id: r.to, dist: nd })
        }
      }
    }
    if (!dist.has(to)) return null
    const nodes: EntityId[] = []
    const relations: RelationId[] = []
    let cur: EntityId = to
    while (cur !== from) {
      nodes.unshift(cur)
      const p = prev.get(cur)
      if (!p) return null
      relations.unshift(p.rel.id)
      cur = p.node
    }
    nodes.unshift(from)
    return { nodes, relations, totalWeight: dist.get(to) ?? 0, length: nodes.length - 1 }
  }

  private pathDepth(prev: Map<EntityId, { node: EntityId; rel: Relation }>, from: EntityId, to: EntityId): number {
    let d = 0
    let cur: EntityId = to
    while (cur !== from) {
      const p = prev.get(cur)
      if (!p) return Infinity
      cur = p.node
      d += 1
    }
    return d
  }

  // ---- Subgraph ----
  extractSubgraph(rootIds: EntityId[], depth = 1): { entities: Entity[]; relations: Relation[] } {
    const entitySet = new Set<EntityId>()
    const relSet = new Set<RelationId>()
    const queue = rootIds.map(id => ({ id, d: 0 }))
    while (queue.length > 0) {
      const { id, d } = queue.shift()!
      if (entitySet.has(id)) continue
      entitySet.add(id)
      if (d >= depth) continue
      for (const r of this.getOutgoing(id)) { relSet.add(r.id); if (!entitySet.has(r.to)) queue.push({ id: r.to, d: d + 1 }) }
      for (const r of this.getIncoming(id)) { relSet.add(r.id); if (!entitySet.has(r.from)) queue.push({ id: r.from, d: d + 1 }) }
    }
    return {
      entities: [...entitySet].map(id => this.entities.get(id)!).filter(Boolean),
      relations: [...relSet].map(id => this.relations.get(id)!).filter(Boolean),
    }
  }

  // ---- Stats ----
  stats(): GraphStats {
    const entityTypes: Record<string, number> = {}
    for (const e of this.entities.values()) entityTypes[e.type] = (entityTypes[e.type] ?? 0) + 1
    const relationTypes: Record<string, number> = {}
    for (const r of this.relations.values()) relationTypes[r.type] = (relationTypes[r.type] ?? 0) + 1
    const e = this.entities.size
    const r = this.relations.size
    const maxEdges = e * (e - 1)
    const density = maxEdges === 0 ? 0 : r / maxEdges
    const components = this.countComponents()
    return {
      entityCount: e,
      relationCount: r,
      entityTypes,
      relationTypes,
      avgDegree: e === 0 ? 0 : (2 * r) / e,
      density,
      components,
    }
  }

  countComponents(): number {
    const visited = new Set<EntityId>()
    let count = 0
    for (const id of this.entities.keys()) {
      if (visited.has(id)) continue
      count += 1
      for (const n of this.bfs(id, { maxDepth: 999 })) visited.add(n)
    }
    return count
  }

  countEntities(): number {
    return this.entities.size
  }

  countRelations(): number {
    return this.relations.size
  }

  uptimeMs(): number {
    return Date.now() - this.startedAt
  }
}

let _kg: KnowledgeGraph | null = null

export const getKnowledgeGraph = (config?: Partial<KgConfig>): KnowledgeGraph => {
  if (!_kg) _kg = new KnowledgeGraph(config)
  return _kg
}

export const resetKnowledgeGraph = (): void => {
  _kg = null
}
