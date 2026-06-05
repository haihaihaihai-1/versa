// v36.0 Distributed Lock (Redlock-style + fencing tokens + auto-renewal)

export interface Lock {
  key: string
  owner: string
  token: string
  fencingToken: number
  acquiredAt: number
  expiresAt: number
  renewed: number
}

export interface LockOptions {
  ttlMs?: number         // lock TTL (default 10000)
  waitMs?: number        // how long to wait (default 0 = no wait)
  retryDelayMs?: number  // retry delay while waiting (default 100)
  quorum?: number        // majority of stores (default ceil(n/2))
  autoRenew?: boolean    // start background heartbeat
  renewIntervalMs?: number
}

export interface LockStore {
  name: string
  get(key: string): Promise<Lock | null>
  setIfAbsent(key: string, owner: string, token: string, fencing: number, ttlMs: number): Promise<boolean>
  renew(key: string, owner: string, token: string, ttlMs: number): Promise<boolean>
  release(key: string, owner: string, token: string): Promise<boolean>
  ping(): Promise<boolean>
  reset?(): Promise<void>
}

// ============== In-memory lock store ==============

export class InMemoryLockStore implements LockStore {
  readonly name: string
  private data = new Map<string, { lock: Lock; timer: ReturnType<typeof setTimeout> | null }>()
  private failureRate = 0
  private latencyMs = 0
  private healthy = true
  private nextFencing: Record<string, number> = {}

  constructor(name: string) { this.name = name }

  async get(key: string): Promise<Lock | null> {
    await this.delay()
    if (!this.healthy) throw new Error(`${this.name} unhealthy`)
    const e = this.data.get(key)
    if (!e) return null
    if (e.lock.expiresAt <= Date.now()) {
      this.cleanup(key)
      return null
    }
    return { ...e.lock }
  }

  async setIfAbsent(key: string, owner: string, token: string, fencing: number, ttlMs: number): Promise<boolean> {
    await this.delay()
    if (!this.healthy) throw new Error(`${this.name} unhealthy`)
    if (Math.random() < this.failureRate) throw new Error(`${this.name} random failure`)
    const cur = this.data.get(key)
    if (cur && cur.lock.expiresAt > Date.now()) return false
    const next = (this.nextFencing[key] ?? 0) + 1
    this.nextFencing[key] = next
    const lock: Lock = {
      key, owner, token,
      fencingToken: fencing ?? next,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      renewed: 0,
    }
    this.data.set(key, { lock, timer: setTimeout(() => this.cleanup(key), ttlMs) })
    return true
  }

  async renew(key: string, owner: string, token: string, ttlMs: number): Promise<boolean> {
    await this.delay()
    if (!this.healthy) throw new Error(`${this.name} unhealthy`)
    if (Math.random() < this.failureRate) throw new Error(`${this.name} random failure`)
    const e = this.data.get(key)
    if (!e) return false
    if (e.lock.owner !== owner || e.lock.token !== token) return false
    if (e.timer) clearTimeout(e.timer)
    e.lock.expiresAt = Date.now() + ttlMs
    e.lock.renewed++
    e.timer = setTimeout(() => this.cleanup(key), ttlMs)
    return true
  }

  async release(key: string, owner: string, token: string): Promise<boolean> {
    await this.delay()
    if (!this.healthy) throw new Error(`${this.name} unhealthy`)
    const e = this.data.get(key)
    if (!e) return false
    if (e.lock.owner !== owner || e.lock.token !== token) return false
    this.cleanup(key)
    return true
  }

  async ping(): Promise<boolean> {
    await this.delay()
    return this.healthy
  }

  setHealthy(h: boolean) { this.healthy = h }
  setFailureRate(r: number) { this.failureRate = Math.max(0, Math.min(1, r)) }
  setLatency(ms: number) { this.latencyMs = Math.max(0, ms) }

  private async delay() {
    if (this.latencyMs <= 0) return
    await new Promise(r => setTimeout(r, this.latencyMs))
  }

  private cleanup(key: string) {
    const e = this.data.get(key)
    if (e?.timer) clearTimeout(e.timer)
    this.data.delete(key)
  }

  async reset() {
    for (const e of this.data.values()) if (e.timer) clearTimeout(e.timer)
    this.data.clear()
    this.nextFencing = {}
  }

  size() { return this.data.size }
}

// ============== Lock Manager (Redlock-style with fencing) ==============

export class LockManager {
  readonly stores: LockStore[]
  private renewalTimers = new Map<string, ReturnType<typeof setInterval>>()
  private holders = new Map<string, Lock>()
  private fencingSeq = 0

  constructor(stores: LockStore[]) {
    if (stores.length === 0) throw new Error('Need at least one lock store')
    this.stores = stores
  }

  async acquire(key: string, owner: string, opts: LockOptions = {}): Promise<Lock | null> {
    const ttl = opts.ttlMs ?? 10000
    const wait = opts.waitMs ?? 0
    const retry = opts.retryDelayMs ?? 100
    const quorum = opts.quorum ?? Math.floor(this.stores.length / 2) + 1
    const start = Date.now()
    const token = `${owner}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    while (true) {
      const fencing = ++this.fencingSeq
      const votes = await this.attemptAcquire(key, owner, token, fencing, ttl, quorum)
      if (votes >= quorum) {
        const lock: Lock = {
          key, owner, token, fencingToken: fencing,
          acquiredAt: Date.now(), expiresAt: Date.now() + ttl, renewed: 0,
        }
        this.holders.set(this.handleKey(key, token), lock)
        if (opts.autoRenew !== false) {
          this.startRenewal(key, owner, token, ttl, opts.renewIntervalMs ?? Math.max(1000, ttl / 3))
        }
        return lock
      }
      // rollback partial acquires
      await this.rollback(key, owner, token)
      if (Date.now() - start >= wait) return null
      await new Promise(r => setTimeout(r, retry))
    }
  }

  private async attemptAcquire(key: string, owner: string, token: string, fencing: number, ttl: number, quorum: number): Promise<number> {
    let success = 0
    await Promise.all(this.stores.map(async s => {
      try {
        if (await s.setIfAbsent(key, owner, token, fencing, ttl)) success++
      } catch { /* store down — skip */ }
    }))
    void quorum
    return success
  }

  async release(lock: Lock): Promise<boolean> {
    this.stopRenewal(lock.key, lock.token)
    let released = 0
    await Promise.all(this.stores.map(async s => {
      try {
        if (await s.release(lock.key, lock.owner, lock.token)) released++
      } catch { /* */ }
    }))
    this.holders.delete(this.handleKey(lock.key, lock.token))
    return released > 0
  }

  async renew(lock: Lock, ttlMs?: number): Promise<boolean> {
    const ttl = ttlMs ?? (lock.expiresAt - lock.acquiredAt)
    let renewed = 0
    await Promise.all(this.stores.map(async s => {
      try {
        if (await s.renew(lock.key, lock.owner, lock.token, ttl)) renewed++
      } catch { /* */ }
    }))
    if (renewed > 0) {
      lock.expiresAt = Date.now() + ttl
      lock.renewed++
      return true
    }
    return false
  }

  async runExclusive<T>(key: string, owner: string, fn: () => Promise<T>, opts: LockOptions = {}): Promise<T> {
    const lock = await this.acquire(key, owner, opts)
    if (!lock) throw new Error(`Failed to acquire lock ${key}`)
    try { return await fn() } finally { await this.release(lock) }
  }

  getHeld(key?: string, owner?: string): Lock[] {
    return [...this.holders.values()].filter(l =>
      (!key || l.key === key) && (!owner || l.owner === owner))
  }

  stopAll() {
    for (const t of this.renewalTimers.values()) clearInterval(t)
    this.renewalTimers.clear()
    this.holders.clear()
  }

  private startRenewal(key: string, owner: string, token: string, ttl: number, interval: number) {
    const h = this.handleKey(key, token)
    if (this.renewalTimers.has(h)) return
    const t = setInterval(async () => {
      const lock = this.holders.get(h)
      if (!lock) { clearInterval(t); this.renewalTimers.delete(h); return }
      const ok = await this.renew(lock, ttl)
      if (!ok) {
        clearInterval(t); this.renewalTimers.delete(h); this.holders.delete(h)
      }
    }, interval)
    this.renewalTimers.set(h, t)
  }

  private stopRenewal(key: string, token: string) {
    const h = this.handleKey(key, token)
    const t = this.renewalTimers.get(h)
    if (t) { clearInterval(t); this.renewalTimers.delete(h) }
  }

  private handleKey(key: string, token: string) { return `${key}|${token}` }

  private async rollback(key: string, owner: string, token: string) {
    await Promise.all(this.stores.map(async s => {
      try { await s.release(key, owner, token) } catch { /* */ }
    }))
  }

  // ===== Health =====
  async healthCheck(): Promise<{ store: string; healthy: boolean }[]> {
    return Promise.all(this.stores.map(async s => ({ store: s.name, healthy: await s.ping() })))
  }
}

// ============== Lock-aware resource queue ==============

export class ResourceQueue<T> {
  private waiting: Array<{ item: T; owner: string; fn: (item: T) => Promise<void>; opts: LockOptions; resolve: () => void; reject: (e: Error) => void }> = []
  private activeKeys = new Set<string>()
  private draining = false

  constructor(private readonly manager: LockManager, private readonly keyFn: (item: T) => string) {}

  async enqueue(item: T, owner: string, fn: (item: T) => Promise<void>, opts: LockOptions = {}): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.waiting.push({ item, owner, fn, opts, resolve, reject })
      void this.drain()
    })
  }

  private async drain() {
    if (this.draining) return
    this.draining = true
    try {
      while (this.waiting.length > 0) {
        const idx = this.waiting.findIndex(w => !this.activeKeys.has(this.keyFn(w.item)))
        if (idx === -1) break
        const [next] = this.waiting.splice(idx, 1)
        if (!next) break
        const key = this.keyFn(next.item)
        this.activeKeys.add(key)
        const task = this.runOne(next, key)
        task.finally(() => {
          if (this.waiting.length > 0) void this.drain()
        })
      }
    } finally {
      this.draining = false
    }
  }

  private async runOne(entry: { item: T; owner: string; fn: (item: T) => Promise<void>; opts: LockOptions; resolve: () => void; reject: (e: Error) => void }, key: string) {
    const lock = await this.manager.acquire(key, entry.owner, entry.opts)
    if (!lock) {
      this.waiting.unshift(entry)
      this.activeKeys.delete(key)
      return
    }
    try { await entry.fn(entry.item); entry.resolve() }
    catch (e) { entry.reject(e as Error) }
    finally {
      await this.manager.release(lock)
      this.activeKeys.delete(key)
    }
  }

  size() { return this.waiting.length }
  activeCount() { return this.activeKeys.size }
}

// ============== Persistence ==============

export function exportLocks(manager: LockManager): Array<Omit<Lock, 'token'>> {
  return manager.getHeld().map(({ token, ...rest }) => rest)
}

export const distlock = {
  LockManager,
  InMemoryLockStore,
  ResourceQueue,
  exportLocks,
}
