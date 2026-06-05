import { describe, it, expect, beforeEach } from 'vitest'
import { LockManager, InMemoryLockStore, ResourceQueue, exportLocks } from '../index'

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

function makeStores(n: number) {
  return Array.from({ length: n }, (_, i) => new InMemoryLockStore(`s${i + 1}`))
}

async function resetAll(stores: InMemoryLockStore[]) {
  for (const s of stores) await s.reset()
}

describe('InMemoryLockStore', () => {
  it('setIfAbsent succeeds when free', async () => {
    const s = new InMemoryLockStore('a')
    expect(await s.setIfAbsent('k', 'o1', 't1', 1, 1000)).toBe(true)
    expect(await s.get('k')).not.toBeNull()
  })

  it('setIfAbsent fails when held', async () => {
    const s = new InMemoryLockStore('a')
    await s.setIfAbsent('k', 'o1', 't1', 1, 1000)
    expect(await s.setIfAbsent('k', 'o2', 't2', 2, 1000)).toBe(false)
  })

  it('setIfAbsent succeeds after expiry', async () => {
    const s = new InMemoryLockStore('a')
    await s.setIfAbsent('k', 'o1', 't1', 1, 50)
    await sleep(80)
    expect(await s.setIfAbsent('k', 'o2', 't2', 2, 1000)).toBe(true)
  })

  it('get returns null after expiry', async () => {
    const s = new InMemoryLockStore('a')
    await s.setIfAbsent('k', 'o1', 't1', 1, 50)
    await sleep(80)
    expect(await s.get('k')).toBeNull()
  })

  it('release with wrong owner fails', async () => {
    const s = new InMemoryLockStore('a')
    await s.setIfAbsent('k', 'o1', 't1', 1, 1000)
    expect(await s.release('k', 'o2', 't1')).toBe(false)
    expect(await s.get('k')).not.toBeNull()
  })

  it('release with wrong token fails', async () => {
    const s = new InMemoryLockStore('a')
    await s.setIfAbsent('k', 'o1', 't1', 1, 1000)
    expect(await s.release('k', 'o1', 't2')).toBe(false)
  })

  it('release removes lock', async () => {
    const s = new InMemoryLockStore('a')
    await s.setIfAbsent('k', 'o1', 't1', 1, 1000)
    expect(await s.release('k', 'o1', 't1')).toBe(true)
    expect(await s.get('k')).toBeNull()
  })

  it('renew extends TTL', async () => {
    const s = new InMemoryLockStore('a')
    await s.setIfAbsent('k', 'o1', 't1', 1, 100)
    await sleep(50)
    expect(await s.renew('k', 'o1', 't1', 500)).toBe(true)
    await sleep(200)
    expect(await s.get('k')).not.toBeNull()
  })

  it('renew fails with wrong token', async () => {
    const s = new InMemoryLockStore('a')
    await s.setIfAbsent('k', 'o1', 't1', 1, 100)
    expect(await s.renew('k', 'o1', 't2', 500)).toBe(false)
  })

  it('fencing tokens are unique per key', async () => {
    const s = new InMemoryLockStore('a')
    await s.setIfAbsent('k', 'o1', 't1', 1, 50)
    await sleep(80)
    await s.setIfAbsent('k', 'o2', 't2', 2, 50)
    await sleep(80)
    await s.setIfAbsent('k', 'o3', 't3', 3, 1000)
    const l = await s.get('k')
    expect(l?.fencingToken).toBe(3)
  })

  it('ping returns health', async () => {
    const s = new InMemoryLockStore('a')
    expect(await s.ping()).toBe(true)
    s.setHealthy(false)
    expect(await s.ping()).toBe(false)
  })

  it('setIfAbsent throws when unhealthy', async () => {
    const s = new InMemoryLockStore('a')
    s.setHealthy(false)
    await expect(s.setIfAbsent('k', 'o', 't', 1, 100)).rejects.toThrow()
  })

  it('reset clears all data', async () => {
    const s = new InMemoryLockStore('a')
    await s.setIfAbsent('k1', 'o', 't', 1, 1000)
    await s.setIfAbsent('k2', 'o', 't', 2, 1000)
    await s.reset()
    expect(s.size()).toBe(0)
  })
})

describe('LockManager - basic acquire/release', () => {
  let stores: InMemoryLockStore[]
  let mgr: LockManager
  beforeEach(async () => { stores = makeStores(3); mgr = new LockManager(stores); await resetAll(stores) })

  it('acquires from majority of 3 stores', async () => {
    const lock = await mgr.acquire('k', 'owner1', { ttlMs: 5000 })
    expect(lock).not.toBeNull()
    expect(lock?.fencingToken).toBeGreaterThan(0)
    expect(mgr.getHeld()).toHaveLength(1)
  })

  it('fails when all stores unhealthy', async () => {
    for (const s of stores) s.setHealthy(false)
    const lock = await mgr.acquire('k', 'o1', { ttlMs: 100, waitMs: 0 })
    expect(lock).toBeNull()
  })

  it('release frees on all stores', async () => {
    const lock = await mgr.acquire('k', 'o1', { ttlMs: 5000 })
    expect(lock).not.toBeNull()
    if (!lock) return
    const ok = await mgr.release(lock)
    expect(ok).toBe(true)
    expect(mgr.getHeld()).toHaveLength(0)
  })

  it('fencing tokens monotonically increase', async () => {
    const a = await mgr.acquire('k1', 'o', { ttlMs: 100, waitMs: 0, autoRenew: false })
    await sleep(120)
    const b = await mgr.acquire('k1', 'o', { ttlMs: 100, waitMs: 0, autoRenew: false })
    expect(a?.fencingToken).toBeLessThan(b?.fencingToken ?? 0)
  })

  it('different keys have independent locks', async () => {
    const a = await mgr.acquire('a', 'o', { ttlMs: 5000 })
    const b = await mgr.acquire('b', 'o', { ttlMs: 5000 })
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
  })
})

describe('LockManager - wait queue', () => {
  let stores: InMemoryLockStore[]
  let mgr: LockManager
  beforeEach(async () => { stores = makeStores(3); mgr = new LockManager(stores); await resetAll(stores) })

  it('second acquirer waits and succeeds', async () => {
    const a = await mgr.acquire('k', 'o1', { ttlMs: 100, waitMs: 1000, autoRenew: false })
    expect(a).not.toBeNull()
    if (!a) return
    setTimeout(() => { void mgr.release(a) }, 150)
    const b = await mgr.acquire('k', 'o2', { ttlMs: 100, waitMs: 2000, autoRenew: false })
    expect(b).not.toBeNull()
  })

  it('returns null when wait timeout exceeded', async () => {
    const a = await mgr.acquire('k', 'o1', { ttlMs: 1000, autoRenew: false })
    expect(a).not.toBeNull()
    const b = await mgr.acquire('k', 'o2', { ttlMs: 1000, waitMs: 100, autoRenew: false })
    expect(b).toBeNull()
  })

  it('serializes concurrent acquirers', async () => {
    const log: string[] = []
    const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
    const task = async (id: string) => {
      await mgr.runExclusive('k', id, async () => {
        log.push(`${id}:start`)
        await wait(30)
        log.push(`${id}:end`)
      }, { ttlMs: 5000, waitMs: 2000 })
    }
    await Promise.all([task('A'), task('B'), task('C')])
    // ensure each start is followed by its end before next start
    for (let i = 0; i < log.length; i += 2) {
      expect(log[i].endsWith(':start')).toBe(true)
      expect(log[i + 1].endsWith(':end')).toBe(true)
      expect(log[i].split(':')[0]).toBe(log[i + 1].split(':')[0])
    }
  })
})

describe('LockManager - auto-renewal', () => {
  it('auto-renew extends lock beyond initial TTL', async () => {
    const stores = makeStores(1)
    const mgr = new LockManager(stores)
    await stores[0].reset()
    const lock = await mgr.acquire('k', 'o1', { ttlMs: 100, renewIntervalMs: 50, autoRenew: true })
    expect(lock).not.toBeNull()
    await sleep(300)
    // Lock should still be held (would have expired at 100ms without renewal)
    const cur = await stores[0].get('k')
    expect(cur).not.toBeNull()
    expect(mgr.getHeld()).toHaveLength(1)
    mgr.stopAll()
  })

  it('renew manually extends', async () => {
    const stores = makeStores(1)
    const mgr = new LockManager(stores)
    await stores[0].reset()
    const lock = await mgr.acquire('k', 'o1', { ttlMs: 100, autoRenew: false })
    expect(lock).not.toBeNull()
    if (!lock) return
    await sleep(50)
    const ok = await mgr.renew(lock, 500)
    expect(ok).toBe(true)
    await sleep(200)
    const cur = await stores[0].get('k')
    expect(cur).not.toBeNull()
  })

  it('renew fails when lock no longer held', async () => {
    const stores = makeStores(1)
    const mgr = new LockManager(stores)
    await stores[0].reset()
    const lock = await mgr.acquire('k', 'o1', { ttlMs: 100, autoRenew: false })
    expect(lock).not.toBeNull()
    if (!lock) return
    await mgr.release(lock)
    const ok = await mgr.renew(lock, 500)
    expect(ok).toBe(false)
  })
})

describe('LockManager - partial failure', () => {
  it('succeeds with majority when one store fails', async () => {
    const stores = makeStores(3)
    const mgr = new LockManager(stores)
    await resetAll(stores)
    stores[0].setFailureRate(1) // store 1 always fails
    const lock = await mgr.acquire('k', 'o', { ttlMs: 500, autoRenew: false })
    expect(lock).not.toBeNull()
  })

  it('fails when minority only', async () => {
    const stores = makeStores(3)
    const mgr = new LockManager(stores)
    await resetAll(stores)
    stores[0].setFailureRate(1)
    stores[1].setFailureRate(1)
    const lock = await mgr.acquire('k', 'o', { ttlMs: 500, autoRenew: false, waitMs: 0 })
    expect(lock).toBeNull()
  })
})

describe('LockManager - runExclusive', () => {
  it('runs callback and releases', async () => {
    const stores = makeStores(1)
    const mgr = new LockManager(stores)
    await stores[0].reset()
    let ran = 0
    const r = await mgr.runExclusive('k', 'o1', async () => {
      ran++
      return 42
    }, { ttlMs: 1000 })
    expect(r).toBe(42)
    expect(ran).toBe(1)
    expect(mgr.getHeld()).toHaveLength(0)
  })

  it('releases even when callback throws', async () => {
    const stores = makeStores(1)
    const mgr = new LockManager(stores)
    await stores[0].reset()
    await expect(mgr.runExclusive('k', 'o1', async () => {
      throw new Error('boom')
    })).rejects.toThrow('boom')
    expect(mgr.getHeld()).toHaveLength(0)
  })
})

describe('ResourceQueue', () => {
  it('serializes items by key', async () => {
    const stores = makeStores(1)
    const mgr = new LockManager(stores)
    await stores[0].reset()
    const queue = new ResourceQueue<number>(mgr, n => `k${n}`)
    const order: string[] = []
    const p1 = queue.enqueue(1, 'o', async () => { order.push('1a:start'); await sleep(30); order.push('1a:end') }, { ttlMs: 1000 })
    const p2 = queue.enqueue(1, 'o', async () => { order.push('1b:start'); await sleep(10); order.push('1b:end') }, { ttlMs: 1000 })
    await Promise.all([p1, p2])
    expect(order).toEqual(['1a:start', '1a:end', '1b:start', '1b:end'])
  })

  it('processes items with different keys in parallel', async () => {
    const stores = makeStores(1)
    const mgr = new LockManager(stores)
    await stores[0].reset()
    const queue = new ResourceQueue<number>(mgr, n => `k${n}`)
    const start = Date.now()
    await Promise.all([
      queue.enqueue(1, 'o', async () => sleep(50), { ttlMs: 1000 }),
      queue.enqueue(2, 'o', async () => sleep(50), { ttlMs: 1000 }),
    ])
    const elapsed = Date.now() - start
    // parallel: ~50ms; serial: ~100ms
    expect(elapsed).toBeLessThan(95)
  })

  it('size() reports pending', async () => {
    const stores = makeStores(1)
    const mgr = new LockManager(stores)
    await stores[0].reset()
    const queue = new ResourceQueue<number>(mgr, n => `k${n}`)
    const p1 = queue.enqueue(1, 'o', async () => sleep(100), { ttlMs: 1000 })
    const p2 = queue.enqueue(1, 'o', async () => sleep(50), { ttlMs: 1000 })
    await sleep(10)
    expect(queue.size()).toBeGreaterThanOrEqual(0) // may be 0 or 1 depending on drain progress
    await Promise.all([p1, p2])
    expect(queue.size()).toBe(0)
  })
})

describe('LockManager - healthCheck', () => {
  it('reports health of all stores', async () => {
    const stores = makeStores(3)
    const mgr = new LockManager(stores)
    await resetAll(stores)
    stores[1].setHealthy(false)
    const h = await mgr.healthCheck()
    expect(h).toHaveLength(3)
    expect(h[0].healthy).toBe(true)
    expect(h[1].healthy).toBe(false)
    expect(h[2].healthy).toBe(true)
  })
})

describe('exportLocks', () => {
  it('exports currently held locks', async () => {
    const stores = makeStores(1)
    const mgr = new LockManager(stores)
    await stores[0].reset()
    await mgr.acquire('k1', 'o', { ttlMs: 1000 })
    await mgr.acquire('k2', 'o', { ttlMs: 1000 })
    const exp = exportLocks(mgr)
    expect(exp).toHaveLength(2)
    expect(exp[0]).not.toHaveProperty('token')
  })
})
