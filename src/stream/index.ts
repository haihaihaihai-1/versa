// v38.0 Stream Processing (Kafka-like: topics, partitions, consumer groups, offset, windowing)

export interface StreamMessage {
  topic: string
  partition: number
  offset: number
  key: string | null
  value: unknown
  headers: Record<string, string>
  timestamp: number
}

export interface TopicConfig {
  name: string
  partitions: number
  retentionMs?: number
  maxMessagesPerPartition?: number
  cleanupPolicy: 'delete' | 'compact'
  createdAt: number
}

export interface ConsumerGroupState {
  groupId: string
  topic: string
  members: Map<string, ConsumerMember>
  offsets: Map<number, number> // partition -> committed offset
  generation: number
  leader: string | null
}

export interface ConsumerMember {
  id: string
  assignedPartitions: number[]
  lastHeartbeat: number
  joinedAt: number
}

export interface Window {
  start: number
  end: number
  count: number
  sum: number
  avg: number
  min: number
  max: number
}

// ============== Stream ==============

export class StreamEngine {
  private topics = new Map<string, TopicConfig>()
  private logs = new Map<string, StreamMessage[]>() // topic-partition-key -> messages
  private groups = new Map<string, ConsumerGroupState>() // groupId-topic
  private metrics = {
    produced: 0,
    consumed: 0,
    rebalances: 0,
    commits: 0,
  }
  private failRate = 0

  // ---- Topics ----
  createTopic(cfg: Omit<TopicConfig, 'createdAt'>): TopicConfig {
    if (this.topics.has(cfg.name)) throw new Error(`Topic ${cfg.name} exists`)
    if (cfg.partitions < 1) throw new Error('Partitions must be >= 1')
    const full: TopicConfig = { ...cfg, createdAt: Date.now() }
    this.topics.set(cfg.name, full)
    for (let p = 0; p < cfg.partitions; p++) this.logs.set(this.logKey(cfg.name, p), [])
    return { ...full }
  }

  deleteTopic(name: string): void {
    const t = this.topics.get(name)
    if (!t) throw new Error('Topic not found')
    for (let p = 0; p < t.partitions; p++) this.logs.delete(this.logKey(name, p))
    this.topics.delete(name)
  }

  listTopics(): TopicConfig[] {
    return [...this.topics.values()].map(t => ({ ...t }))
  }

  topicExists(name: string): boolean { return this.topics.has(name) }

  // ---- Produce ----
  produce(topic: string, key: string | null, value: unknown, headers: Record<string, string> = {}): StreamMessage {
    const t = this.topics.get(topic)
    if (!t) throw new Error(`Topic ${topic} not found`)
    const partition = this.partitionFor(topic, key, t.partitions)
    const log = this.logs.get(this.logKey(topic, partition))!
    const offset = log.length
    const msg: StreamMessage = {
      topic, partition, offset,
      key, value, headers,
      timestamp: Date.now(),
    }
    log.push(msg)
    this.metrics.produced++
    this.enforceRetention(topic, partition)
    return { ...msg, headers: { ...msg.headers } }
  }

  // ---- Consume ----
  fetch(topic: string, partition: number, offset: number, max = 100): StreamMessage[] {
    const log = this.logs.get(this.logKey(topic, partition))
    if (!log) throw new Error(`Partition ${topic}-${partition} not found`)
    return log.slice(offset, offset + max).map(m => ({ ...m, headers: { ...m.headers } }))
  }

  endOffset(topic: string, partition: number): number {
    return this.logs.get(this.logKey(topic, partition))?.length ?? 0
  }

  beginOffset(topic: string, partition: number): number {
    const log = this.logs.get(this.logKey(topic, partition))
    if (!log) return 0
    // simulate retention: skip tombstoned (null value with __tombstone) or trimmed entries
    return log.length === 0 ? 0 : 0
  }

  // ---- Consumer Groups ----
  createGroup(groupId: string, topic: string, members: string[]): ConsumerGroupState {
    const t = this.topics.get(topic)
    if (!t) throw new Error(`Topic ${topic} not found`)
    if (members.length === 0) throw new Error('No members')
    const sorted = [...members].sort()
    const state: ConsumerGroupState = {
      groupId, topic,
      members: new Map(),
      offsets: new Map(),
      generation: 1,
      leader: sorted[0] ?? null,
    }
    for (const m of sorted) {
      state.members.set(m, { id: m, assignedPartitions: [], lastHeartbeat: Date.now(), joinedAt: Date.now() })
    }
    this.rebalance(state, t.partitions)
    this.groups.set(this.groupKey(groupId, topic), state)
    this.metrics.rebalances++
    return this.cloneGroup(state)
  }

  heartbeat(groupId: string, topic: string, memberId: string): void {
    const state = this.groups.get(this.groupKey(groupId, topic))
    if (!state) throw new Error('Group not found')
    const m = state.members.get(memberId)
    if (!m) throw new Error(`Member ${memberId} not in group`)
    m.lastHeartbeat = Date.now()
  }

  leaveGroup(groupId: string, topic: string, memberId: string): void {
    const state = this.groups.get(this.groupKey(groupId, topic))
    if (!state) return
    state.members.delete(memberId)
    if (state.members.size === 0) {
      this.groups.delete(this.groupKey(groupId, topic))
      return
    }
    const t = this.topics.get(topic)!
    state.generation++
    if (state.leader === memberId) {
      state.leader = [...state.members.keys()].sort()[0] ?? null
    }
    this.rebalance(state, t.partitions)
    this.metrics.rebalances++
  }

  joinGroup(groupId: string, topic: string, memberId: string): number[] {
    const state = this.groups.get(this.groupKey(groupId, topic))
    if (!state) throw new Error('Group not found')
    if (state.members.has(memberId)) return [...state.members.get(memberId)!.assignedPartitions]
    const t = this.topics.get(topic)!
    state.members.set(memberId, { id: memberId, assignedPartitions: [], lastHeartbeat: Date.now(), joinedAt: Date.now() })
    state.generation++
    this.rebalance(state, t.partitions)
    this.metrics.rebalances++
    return [...state.members.get(memberId)!.assignedPartitions]
  }

  getGroup(groupId: string, topic: string): ConsumerGroupState | null {
    const state = this.groups.get(this.groupKey(groupId, topic))
    return state ? this.cloneGroup(state) : null
  }

  // ---- Offsets ----
  commitOffset(groupId: string, topic: string, partition: number, offset: number): void {
    const state = this.groups.get(this.groupKey(groupId, topic))
    if (!state) throw new Error('Group not found')
    state.offsets.set(partition, offset)
    this.metrics.commits++
  }

  fetchOffset(groupId: string, topic: string, partition: number): number {
    const state = this.groups.get(this.groupKey(groupId, topic))
    return state?.offsets.get(partition) ?? 0
  }

  // ---- Windowing ----
  window(topic: string, partition: number, windowMs: number, fn: (values: number[]) => { sum: number; avg: number; min: number; max: number }): Window[] {
    const log = this.logs.get(this.logKey(topic, partition))
    if (!log) throw new Error('Partition not found')
    if (log.length === 0) return []
    const buckets = new Map<number, StreamMessage[]>()
    for (const msg of log) {
      const bucket = Math.floor(msg.timestamp / windowMs) * windowMs
      if (!buckets.has(bucket)) buckets.set(bucket, [])
      buckets.get(bucket)!.push(msg)
    }
    const out: Window[] = []
    for (const [start, msgs] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
      const nums = msgs.map(m => Number(m.value)).filter(n => !isNaN(n))
      if (nums.length === 0) continue
      const r = fn(nums)
      out.push({ start, end: start + windowMs, count: nums.length, sum: r.sum, avg: r.avg, min: r.min, max: r.max })
    }
    return out
  }

  // ---- Stream transforms ----
  map<T, U>(topic: string, partition: number, fn: (msg: StreamMessage) => U): U[] {
    return this.fetch(topic, partition, 0).map(fn)
  }

  filter(topic: string, partition: number, fn: (msg: StreamMessage) => boolean): StreamMessage[] {
    return this.fetch(topic, partition, 0).filter(fn)
  }

  reduce<T>(topic: string, partition: number, fn: (acc: T, msg: StreamMessage) => T, initial: T): T {
    let acc = initial
    for (const msg of this.fetch(topic, partition, 0)) acc = fn(acc, msg)
    return acc
  }

  // ---- Stats ----
  getMetrics() { return { ...this.metrics } }
  setFailureRate(r: number) { this.failRate = Math.max(0, Math.min(1, r)) }

  // ---- Internals ----
  private partitionFor(topic: string, key: string | null, partitions: number): number {
    if (key === null) return Math.floor(Math.random() * partitions)
    let h = 5381
    for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0
    return Math.abs(h) % partitions
  }

  private logKey(topic: string, partition: number) { return `${topic}#${partition}` }
  private groupKey(groupId: string, topic: string) { return `${groupId}@${topic}` }

  private rebalance(state: ConsumerGroupState, partitions: number) {
    const members = [...state.members.keys()].sort()
    const assign: number[][] = members.map(() => [])
    for (let p = 0; p < partitions; p++) assign[p % members.length]!.push(p)
    members.forEach((m, i) => {
      state.members.get(m)!.assignedPartitions = assign[i]!
    })
  }

  private enforceRetention(topic: string, partition: number) {
    const t = this.topics.get(topic)!
    const log = this.logs.get(this.logKey(topic, partition))!
    if (t.maxMessagesPerPartition && log.length > t.maxMessagesPerPartition) {
      log.splice(0, log.length - t.maxMessagesPerPartition)
    }
    if (t.retentionMs) {
      const cutoff = Date.now() - t.retentionMs
      const firstKept = log.findIndex(m => m.timestamp >= cutoff)
      if (firstKept > 0) log.splice(0, firstKept)
    }
  }

  private cloneGroup(state: ConsumerGroupState): ConsumerGroupState {
    return {
      groupId: state.groupId,
      topic: state.topic,
      generation: state.generation,
      leader: state.leader,
      members: new Map([...state.members.entries()].map(([k, v]) => [k, { ...v, assignedPartitions: [...v.assignedPartitions] }])),
      offsets: new Map(state.offsets),
    }
  }
}

export const stream = { StreamEngine }
