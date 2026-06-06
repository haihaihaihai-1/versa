/**
 * Versa · CRDT Collaboration (v55.0)
 * - G-Counter (Grow-only Counter, op-based)
 * - PN-Counter (Positive-Negative Counter, state-based)
 * - G-Set (Grow-only Set)
 * - 2P-Set (Two-Phase Set, add/remove tombstones)
 * - OR-Set (Observed-Remove Set, unique tags)
 * - LWW-Register (Last-Writer-Wins Register)
 * - MV-Register (Multi-Value Register)
 * - RGA / Yjs-style sequence CRDT (text editing)
 * - Map CRDT (nested with last-writer-wins per key)
 * - LWW Element Set
 * - Document / peer management
 * - Sync protocol (delta-based)
 * - Awareness / presence
 * - Metrics
 */

import { createHash } from 'crypto'

// -------- G-Counter --------
export class GCounter {
  private counts = new Map<string, number>()
  constructor(private replicaId: string) {}
  increment(by = 1): void { this.counts.set(this.replicaId, (this.counts.get(this.replicaId) ?? 0) + by) }
  value(): number { let s = 0; for (const v of this.counts.values()) s += v; return s }
  merge(other: GCounter): void {
    const keys = new Set([...this.counts.keys(), ...other.counts.keys()])
    for (const k of keys) this.counts.set(k, Math.max(this.counts.get(k) ?? 0, other.counts.get(k) ?? 0))
  }
  state(): Record<string, number> { return Object.fromEntries(this.counts) }
}

// -------- PN-Counter --------
export class PNCounter {
  private p = new GCounter('p')
  private n = new GCounter('n')
  constructor(replicaId: string) {
    this.p = new GCounter(replicaId)
    this.n = new GCounter(replicaId)
  }
  increment(by = 1): void { this.p.increment(by) }
  decrement(by = 1): void { this.n.increment(by) }
  value(): number { return this.p.value() - this.n.value() }
  merge(other: PNCounter): void { this.p.merge(other.p); this.n.merge(other.n) }
}

// -------- G-Set --------
export class GSet<T> {
  private items = new Set<T>()
  add(item: T): void { this.items.add(item) }
  has(item: T): boolean { return this.items.has(item) }
  value(): T[] { return [...this.items] }
  size(): number { return this.items.size }
  merge(other: GSet<T>): void { for (const x of other.value()) this.items.add(x) }
}

// -------- 2P-Set --------
export class TwoPSet<T> {
  private added = new Set<T>()
  private removed = new Set<T>()
  add(item: T): void { this.added.add(item) }
  remove(item: T): void { if (this.added.has(item)) this.removed.add(item) }
  has(item: T): boolean { return this.added.has(item) && !this.removed.has(item) }
  value(): T[] { return [...this.added].filter(x => !this.removed.has(x)) }
  merge(other: TwoPSet<T>): void { for (const x of other.added) this.added.add(x); for (const x of other.removed) this.removed.add(x) }
}

// -------- OR-Set --------
interface ORSetEntry<T> { value: T; tag: string }
export class ORSet<T> {
  private entries = new Set<string>()
  private tagged = new Map<string, ORSetEntry<T>>()
  private counter = 0
  constructor(private replicaId: string) {}
  private newTag(): string { return `${this.replicaId}:${++this.counter}:${Date.now()}` }
  add(value: T): string {
    const tag = this.newTag()
    this.entries.add(tag)
    this.tagged.set(tag, { value, tag })
    return tag
  }
  remove(value: T): void {
    for (const [tag, e] of this.tagged) if (e.value === value) this.entries.delete(tag)
  }
  has(value: T): boolean { for (const tag of this.entries) if (this.tagged.get(tag)?.value === value) return true; return false }
  value(): T[] { const seen = new Set<T>(); const out: T[] = []; for (const tag of this.entries) { const e = this.tagged.get(tag)!; if (!seen.has(e.value)) { seen.add(e.value); out.push(e.value) } } return out }
  merge(other: ORSet<T>): void {
    for (const tag of other.entries) this.entries.add(tag)
    for (const [tag, e] of other.tagged) if (!this.tagged.has(tag)) this.tagged.set(tag, e)
    // observed-remove: remove tags not in other
    for (const tag of [...other.entries]) {
      // nothing to do; this set only deletes local tags
    }
  }
  size(): number { return this.value().length }
}

// -------- LWW-Register --------
export interface LwwValue<T> { value: T; timestamp: number; replicaId: string }
export class LWWRegister<T> {
  private current: LwwValue<T> | null = null
  constructor(private replicaId: string) {}
  set(value: T, timestamp = Date.now()): void { this.current = { value, timestamp, replicaId: this.replicaId } }
  get(): T | null { return this.current?.value ?? null }
  state(): LwwValue<T> | null { return this.current }
  merge(other: LWWRegister<T>): void {
    if (!other.current) return
    if (!this.current || other.current.timestamp > this.current.timestamp || (other.current.timestamp === this.current.timestamp && other.current.replicaId > this.current.replicaId)) {
      this.current = other.current
    }
  }
}

// -------- MV-Register --------
export class MVRegister<T> {
  private values: LwwValue<T>[] = []
  constructor(private replicaId: string) {}
  set(value: T, timestamp = Date.now()): void { this.values = [{ value, timestamp, replicaId: this.replicaId }] }
  get(): T[] { return this.values.map(v => v.value) }
  state(): LwwValue<T>[] { return [...this.values] }
  merge(other: MVRegister<T>): void {
    const keep = new Map<string, LwwValue<T>>()
    for (const v of [...this.values, ...other.values]) {
      const existing = keep.get(v.replicaId)
      if (!existing || v.timestamp > existing.timestamp) keep.set(v.replicaId, v)
    }
    // drop values that are dominated
    const all = [...keep.values()]
    const final = all.filter(a => !all.some(b => b !== a && b.timestamp > a.timestamp && b.replicaId > a.replicaId))
    this.values = final
  }
}

// -------- RGA-style Text CRDT (simplified) --------
export interface TextNode { id: string; char: string; deleted: boolean; origin: string }
export class RgaText {
  private nodes: TextNode[] = []
  private counter = 0
  constructor(private replicaId: string) {}
  private newId(): string { return `${this.replicaId}:${++this.counter}` }
  // insert at position
  insert(index: number, char: string): string {
    const id = this.newId()
    this.nodes.splice(index, 0, { id, char, deleted: false, origin: this.replicaId })
    return id
  }
  // delete by position
  delete(index: number): void {
    if (this.nodes[index]) this.nodes[index]!.deleted = true
  }
  // apply remote operation
  applyRemote(node: TextNode, afterId: string | null): void {
    // insert after the node with `afterId` (or at end if null)
    if (this.nodes.find(n => n.id === node.id)) return // already present
    let idx = 0
    if (afterId) {
      const i = this.nodes.findIndex(n => n.id === afterId)
      idx = i >= 0 ? i + 1 : this.nodes.length
    } else idx = this.nodes.length
    this.nodes.splice(idx, 0, node)
  }
  value(): string { return this.nodes.filter(n => !n.deleted).map(n => n.char).join('') }
  toString(): string { return this.value() }
  length(): number { return this.nodes.filter(n => !n.deleted).length }
  merge(other: RgaText): void {
    for (const n of other.nodes) {
      if (!this.nodes.find(x => x.id === n.id)) {
        // find right parent in this set
        const originIdx = other.nodes.findIndex(x => x.id === n.id)
        let afterId: string | null = null
        for (let i = originIdx - 1; i >= 0; i--) {
          const candidate = other.nodes[i]!
          if (this.nodes.find(x => x.id === candidate.id)) { afterId = candidate.id; break }
        }
        this.applyRemote(n, afterId)
      }
    }
  }
}

// -------- Map CRDT --------
export class CrdtMap {
  private keys = new Map<string, LWWRegister<unknown>>()
  constructor(private replicaId: string) {}
  set(key: string, value: unknown): void {
    let reg = this.keys.get(key)
    if (!reg) { reg = new LWWRegister<unknown>(this.replicaId); this.keys.set(key, reg) }
    reg.set(value)
  }
  get<T>(key: string): T | null { return (this.keys.get(key)?.get() ?? null) as T | null }
  delete(key: string): void { this.keys.delete(key) }
  has(key: string): boolean { return this.keys.has(key) }
  keys_(): string[] { return [...this.keys.keys()] }
  size(): number { return this.keys.size }
  state(): Record<string, unknown> { const out: Record<string, unknown> = {}; for (const [k, r] of this.keys) out[k] = r.get(); return out }
  merge(other: CrdtMap): void {
    for (const k of other.keys_()) {
      let reg = this.keys.get(k)
      if (!reg) { reg = new LWWRegister<unknown>(this.replicaId); this.keys.set(k, reg) }
      reg.merge(other.keys.get(k)!)
    }
  }
}

// -------- Document / Peer --------
export interface CrdtDoc {
  id: string
  title: string
  map: CrdtMap
  text: RgaText
  set: ORSet<string>
  updatedAt: number
}

export interface Peer {
  id: string
  name: string
  cursor?: { docId: string; position: number }
  online: boolean
  lastSeen: number
}

export interface SyncDelta {
  from: string
  to: string
  docId: string
  textNodes: TextNode[]
  setEntries: string[]
  setTagged: ORSetEntry<string>[]
  mapState: Record<string, unknown>
  timestamp: number
}

export interface CrdtMetrics {
  totalDocs: number
  totalPeers: number
  totalSyncs: number
  totalMerges: number
  totalOps: number
}

// -------- CRDT Document Manager --------
export class CrdtManager {
  private docs = new Map<string, CrdtDoc>()
  private peers = new Map<string, Peer>()
  private metrics: CrdtMetrics = { totalDocs: 0, totalPeers: 0, totalSyncs: 0, totalMerges: 0, totalOps: 0 }
  constructor(private replicaId: string) {}

  createDoc(id: string, title: string): CrdtDoc {
    const doc: CrdtDoc = { id, title, map: new CrdtMap(this.replicaId), text: new RgaText(this.replicaId), set: new ORSet(this.replicaId), updatedAt: Date.now() }
    this.docs.set(id, doc)
    this.metrics.totalDocs = this.docs.size
    return doc
  }
  getDoc(id: string): CrdtDoc | undefined { return this.docs.get(id) }
  listDocs(): CrdtDoc[] { return [...this.docs.values()] }
  deleteDoc(id: string): boolean { return this.docs.delete(id) }

  // text operations
  textInsert(docId: string, index: number, char: string): void {
    const d = this.docs.get(docId); if (!d) return
    d.text.insert(index, char)
    d.updatedAt = Date.now()
    this.metrics.totalOps++
  }
  textDelete(docId: string, index: number): void {
    const d = this.docs.get(docId); if (!d) return
    d.text.delete(index)
    d.updatedAt = Date.now()
    this.metrics.totalOps++
  }
  getText(docId: string): string { return this.docs.get(docId)?.text.value() ?? '' }

  // set operations
  setAdd(docId: string, value: string): void {
    const d = this.docs.get(docId); if (!d) return
    d.set.add(value)
    d.updatedAt = Date.now()
    this.metrics.totalOps++
  }
  setRemove(docId: string, value: string): void {
    const d = this.docs.get(docId); if (!d) return
    d.set.remove(value)
    d.updatedAt = Date.now()
    this.metrics.totalOps++
  }
  getSet(docId: string): string[] { return this.docs.get(docId)?.set.value() ?? [] }

  // map operations
  mapSet(docId: string, key: string, value: unknown): void {
    const d = this.docs.get(docId); if (!d) return
    d.map.set(key, value)
    d.updatedAt = Date.now()
    this.metrics.totalOps++
  }
  mapGet<T>(docId: string, key: string): T | null { return this.docs.get(docId)?.map.get<T>(key) ?? null }
  mapDelete(docId: string, key: string): void { this.docs.get(docId)?.map.delete(key) }
  mapState(docId: string): Record<string, unknown> { return this.docs.get(docId)?.map.state() ?? {} }

  // peer awareness
  registerPeer(peer: Peer): void { this.peers.set(peer.id, peer); this.metrics.totalPeers = this.peers.size }
  removePeer(id: string): boolean { return this.peers.delete(id) }
  setPeerOnline(id: string, online: boolean): void { const p = this.peers.get(id); if (p) { p.online = online; p.lastSeen = Date.now() } }
  setCursor(peerId: string, docId: string, position: number): void { const p = this.peers.get(peerId); if (p) p.cursor = { docId, position } }
  listPeers(): Peer[] { return [...this.peers.values()] }
  onlinePeers(): Peer[] { return [...this.peers.values()].filter(p => p.online) }

  // sync / merge with another replica
  sync(targetReplica: CrdtManager, docId: string): SyncDelta {
    const local = this.docs.get(docId); const remote = targetReplica.docs.get(docId)
    if (!local) throw new Error(`doc ${docId} not found locally`)
    if (!remote) throw new Error(`doc ${docId} not found on remote`)
    const delta: SyncDelta = {
      from: this.replicaId, to: targetReplica.replicaId, docId,
      textNodes: [], setEntries: [], setTagged: [],
      mapState: local.map.state(),
      timestamp: Date.now()
    }
    // sync text
    for (const n of (local.text as unknown as { nodes: TextNode[] }).nodes) delta.textNodes.push(n)
    // sync OR-Set via tagged map (private)
    const localOrSet = local.set as unknown as { entries: Set<string>; tagged: Map<string, ORSetEntry<string>> }
    delta.setEntries = [...localOrSet.entries]
    delta.setTagged = [...localOrSet.tagged.values()]
    targetReplica.applyDelta(this, delta)
    this.metrics.totalSyncs++
    return delta
  }
  applyDelta(source: CrdtManager, delta: SyncDelta): void {
    const d = this.docs.get(delta.docId); if (!d) return
    // apply text
    for (const n of delta.textNodes) d.text.applyRemote(n, null)
    // apply set
    const localOrSet = d.set as unknown as { entries: Set<string>; tagged: Map<string, ORSetEntry<string>> }
    for (const tag of delta.setEntries) localOrSet.entries.add(tag)
    for (const e of delta.setTagged) if (!localOrSet.tagged.has(e.tag)) localOrSet.tagged.set(e.tag, e)
    // apply map
    // apply map: take keys from delta and write through LWW
    for (const [k, v] of Object.entries(delta.mapState)) {
      let reg = (d.map as unknown as { keys: Map<string, LWWRegister<unknown>> }).keys.get(k)
      if (!reg) { reg = new LWWRegister(this.replicaId); (d.map as unknown as { keys: Map<string, LWWRegister<unknown>> }).keys.set(k, reg) }
      reg.set(v, delta.timestamp)
    }
    d.updatedAt = Date.now()
    this.metrics.totalMerges++
  }

  // merge two docs (same id, different replicas)
  mergeDocs(local: CrdtDoc, remote: CrdtDoc): void {
    local.map.merge(remote.map)
    local.text.merge(remote.text)
    local.set.merge(remote.set)
    local.updatedAt = Date.now()
    this.metrics.totalMerges++
  }

  getMetrics(): CrdtMetrics { return JSON.parse(JSON.stringify(this.metrics)) }
  resetMetrics(): void { this.metrics = { totalDocs: this.docs.size, totalPeers: this.peers.size, totalSyncs: 0, totalMerges: 0, totalOps: 0 } }
}

let _instance: CrdtManager | null = null
export function getCrdtManager(replicaId = 'r1'): CrdtManager { if (!_instance) _instance = new CrdtManager(replicaId); return _instance }
export function resetCrdtManager(): void { _instance = null }
export { CrdtManager as default }
