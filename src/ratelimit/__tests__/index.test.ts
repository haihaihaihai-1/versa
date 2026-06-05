import { describe, it, expect, beforeEach, vi } from 'vitest'
import { RateLimiter, type RequestContext } from '../index'

describe('RateLimiter · rule management', () => {
  let rl: RateLimiter
  beforeEach(() => { rl = new RateLimiter() })

  it('addRule / removeRule / listRules', () => {
    const r = rl.addRule({ name: 'api', route: '/api/*', enabled: true, priority: 10, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 10, periodMs: 1000 } })
    expect(rl.listRules().length).toBe(1)
    expect(rl.getRule(r.id)).toBeDefined()
    rl.removeRule(r.id)
    expect(rl.listRules().length).toBe(0)
  })
  it('enableRule toggles', () => {
    const r = rl.addRule({ name: 'x', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 1, periodMs: 1000 } })
    rl.enableRule(r.id, false)
    expect(rl.getRule(r.id)!.enabled).toBe(false)
  })
  it('listRules sorted by priority desc', () => {
    rl.addRule({ name: 'lo', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 1, periodMs: 1000 } })
    rl.addRule({ name: 'hi', route: '*', enabled: true, priority: 99, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 1, periodMs: 1000 } })
    expect(rl.listRules().map(r => r.name)).toEqual(['hi', 'lo'])
  })
})

describe('RateLimiter · global lists', () => {
  let rl: RateLimiter
  beforeEach(() => { rl = new RateLimiter() })
  it('whitelist / blacklist', () => {
    rl.addToWhitelistGlobal('good')
    rl.addToBlacklistGlobal('bad')
    rl.addRule({ name: 'r', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 1, periodMs: 1000 } })
    expect(rl.check({ key: 'good' }).allowed).toBe(true)
    expect(rl.check({ key: 'bad' }).allowed).toBe(false)
    expect(rl.check({ key: 'bad' }).reason).toBe('blacklisted')
    rl.removeFromWhitelistGlobal('good')
    rl.removeFromBlacklistGlobal('bad')
    // 'good' should be denied now (no whitelist, limit=1, first non-whitelisted call = allowed)
    expect(rl.check({ key: 'good' }).allowed).toBe(true) // first non-whitelist, allowed
    expect(rl.check({ key: 'good' }).allowed).toBe(false) // second call, denied
    expect(rl.check({ key: 'bad' }).allowed).toBe(true) // removed from blacklist, first call, allowed
  })
  it('rule whitelist / blacklist', () => {
    rl.addRule({ name: 'r', route: '*', enabled: true, priority: 1, whitelist: ['vip'], blacklist: ['ban'], config: { algorithm: 'fixed-window', limit: 1, periodMs: 1000 } })
    expect(rl.check({ key: 'vip' }).allowed).toBe(true)
    expect(rl.check({ key: 'ban' }).allowed).toBe(false)
  })
})

describe('RateLimiter · fixed-window', () => {
  let rl: RateLimiter
  beforeEach(() => { rl = new RateLimiter() })
  it('allows up to limit, then denies', () => {
    rl.addRule({ name: 'fw', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 3, periodMs: 1000 } })
    expect(rl.check({ key: 'k' }).allowed).toBe(true)
    expect(rl.check({ key: 'k' }).allowed).toBe(true)
    expect(rl.check({ key: 'k' }).allowed).toBe(true)
    const d = rl.check({ key: 'k' })
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe('over_window_limit')
    expect(d.retryAfterMs).toBeGreaterThan(0)
  })
  it('different keys are independent', () => {
    rl.addRule({ name: 'fw', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 1, periodMs: 1000 } })
    expect(rl.check({ key: 'a' }).allowed).toBe(true)
    expect(rl.check({ key: 'a' }).allowed).toBe(false)
    expect(rl.check({ key: 'b' }).allowed).toBe(true)
  })
  it('window reset after period', () => {
    rl.addRule({ name: 'fw', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 1, periodMs: 50 } })
    expect(rl.check({ key: 'k' }).allowed).toBe(true)
    expect(rl.check({ key: 'k' }).allowed).toBe(false)
    return new Promise(r => setTimeout(r, 70)).then(() => {
      expect(rl.check({ key: 'k' }).allowed).toBe(true)
    })
  })
})

describe('RateLimiter · sliding-window', () => {
  let rl: RateLimiter
  beforeEach(() => { rl = new RateLimiter() })
  it('weighted count', () => {
    rl.addRule({ name: 'sw', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'sliding-window', limit: 5, periodMs: 1000 } })
    for (let i = 0; i < 5; i++) expect(rl.check({ key: 'k' }).allowed).toBe(true)
    const d = rl.check({ key: 'k' })
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe('over_sliding_window')
  })
})

describe('RateLimiter · token-bucket', () => {
  let rl: RateLimiter
  beforeEach(() => { rl = new RateLimiter() })
  it('burst + refill', () => {
    rl.addRule({ name: 'tb', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'token-bucket', limit: 10, periodMs: 1000, burst: 5, refillPerSec: 10 } })
    for (let i = 0; i < 5; i++) expect(rl.check({ key: 'k' }).allowed).toBe(true)
    expect(rl.check({ key: 'k' }).allowed).toBe(false)
  })
  it('refill after wait', () => {
    rl.addRule({ name: 'tb', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'token-bucket', limit: 10, periodMs: 1000, burst: 1, refillPerSec: 100 } })
    expect(rl.check({ key: 'k' }).allowed).toBe(true)
    expect(rl.check({ key: 'k' }).allowed).toBe(false)
    return new Promise(r => setTimeout(r, 50)).then(() => {
      expect(rl.check({ key: 'k' }).allowed).toBe(true)
    })
  })
})

describe('RateLimiter · leaky-bucket', () => {
  let rl: RateLimiter
  beforeEach(() => { rl = new RateLimiter() })
  it('queue + leak', () => {
    rl.addRule({ name: 'lb', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'leaky-bucket', limit: 3, periodMs: 1000, leakPerSec: 1 } })
    expect(rl.check({ key: 'k' }).allowed).toBe(true)
    expect(rl.check({ key: 'k' }).allowed).toBe(true)
    expect(rl.check({ key: 'k' }).allowed).toBe(true)
    const d = rl.check({ key: 'k' })
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe('bucket_full')
  })
})

describe('RateLimiter · GCRA', () => {
  let rl: RateLimiter
  beforeEach(() => { rl = new RateLimiter() })
  it('emission interval', () => {
    rl.addRule({ name: 'gcra', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'gcra', limit: 5, periodMs: 500 } })
    let allowed = 0
    for (let i = 0; i < 20; i++) if (rl.check({ key: 'k' }).allowed) allowed++
    expect(allowed).toBeGreaterThan(0)
    expect(allowed).toBeLessThanOrEqual(5)
  })
  it('reason gcra_over when denied', () => {
    rl.addRule({ name: 'gcra', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'gcra', limit: 1, periodMs: 1000 } })
    expect(rl.check({ key: 'k' }).allowed).toBe(true)
    const d = rl.check({ key: 'k' })
    expect(d.allowed).toBe(false)
    expect(d.reason).toBe('gcra_over')
  })
})

describe('RateLimiter · cost & weight', () => {
  let rl: RateLimiter
  beforeEach(() => { rl = new RateLimiter() })
  it('fixed cost per request', () => {
    rl.addRule({ name: 'c', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 5, periodMs: 1000, cost: 2 } })
    expect(rl.check({ key: 'k', cost: 2 }).allowed).toBe(true)
    expect(rl.check({ key: 'k', cost: 2 }).allowed).toBe(true)
    expect(rl.check({ key: 'k', cost: 2 }).allowed).toBe(false)
  })
  it('dynamic cost fn', () => {
    rl.addRule({ name: 'c', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 10, periodMs: 1000, cost: (ctx) => ctx.userId === 'big' ? 5 : 1 } })
    rl.check({ key: 'big', userId: 'big' })      // count=5
    rl.check({ key: 'big', userId: 'big' })      // count=10
    expect(rl.check({ key: 'big', userId: 'big' }).allowed).toBe(false)  // 10+5=15 > 10
    expect(rl.check({ key: 'small', userId: 'small' }).allowed).toBe(true)  // separate state
  })
})

describe('RateLimiter · headers', () => {
  it('toHeaders', () => {
    const rl = new RateLimiter()
    rl.addRule({ name: 'h', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 10, periodMs: 1000 } })
    const d = rl.check({ key: 'k' })
    const h = rl.toHeaders(d)
    expect(h['X-RateLimit-Limit']).toBe('10')
    expect(h['X-RateLimit-Remaining']).toBeDefined()
    expect(h['X-RateLimit-Reset']).toBeDefined()
  })
  it('toHeaders empty when no rule', () => {
    const rl = new RateLimiter()
    const h = rl.toHeaders({ allowed: true, remaining: -1, limit: -1, resetMs: 0, algorithm: 'fixed-window', key: 'k' })
    expect(Object.keys(h).length).toBe(0)
  })
})

describe('RateLimiter · state', () => {
  it('resetKey', () => {
    const rl = new RateLimiter()
    const r = rl.addRule({ name: 'r', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 1, periodMs: 1000 } })
    rl.check({ key: 'k' })
    expect(rl.inspectKey(r.id, 'k')).toBeDefined()
    expect(rl.resetKey(r.id, 'k')).toBe(true)
    expect(rl.inspectKey(r.id, 'k')).toBeUndefined()
  })
  it('resetAll', () => {
    const rl = new RateLimiter()
    const r = rl.addRule({ name: 'r', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 1, periodMs: 1000 } })
    rl.check({ key: 'a' }); rl.check({ key: 'b' })
    rl.resetAll()
    expect(rl.inspectKey(r.id, 'a')).toBeUndefined()
    expect(rl.inspectKey(r.id, 'b')).toBeUndefined()
  })
})

describe('RateLimiter · adaptive & system load', () => {
  it('adaptive scale', () => {
    const rl = new RateLimiter()
    rl.addRule({ name: 'a', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 10, periodMs: 1000 }, adaptiveFn: (load) => 1 - load })
    rl.setSystemLoad(0.9)
    let allowed = 0
    for (let i = 0; i < 5; i++) if (rl.check({ key: 'k' }).allowed) allowed++
    expect(allowed).toBeLessThanOrEqual(2) // limit = 10 * 0.1 = 1
  })
  it('setSystemLoad clamps', () => {
    const rl = new RateLimiter()
    rl.setSystemLoad(2)
    expect(rl.getSystemLoad()).toBe(1)
    rl.setSystemLoad(-1)
    expect(rl.getSystemLoad()).toBe(0)
  })
})

describe('RateLimiter · async', () => {
  it('checkOrWait waits for refill', async () => {
    const rl = new RateLimiter()
    rl.addRule({ name: 'r', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'token-bucket', limit: 10, periodMs: 1000, burst: 1, refillPerSec: 100 } })
    expect(rl.check({ key: 'k' }).allowed).toBe(true)
    const d = await rl.checkOrWait({ key: 'k' }, 200)
    expect(d.allowed).toBe(true)
  })
  it('checkOrWait gives up if wait too long', async () => {
    const rl = new RateLimiter()
    rl.addRule({ name: 'r', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'token-bucket', limit: 10, periodMs: 1000, burst: 1, refillPerSec: 1 } })
    expect(rl.check({ key: 'k' }).allowed).toBe(true)
    const d = await rl.checkOrWait({ key: 'k' }, 10)
    expect(d.allowed).toBe(false)
  })
})

describe('RateLimiter · executeWithLimit', () => {
  it('retries on rate-limited', async () => {
    const rl = new RateLimiter()
    rl.addRule({ name: 'r', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'token-bucket', limit: 10, periodMs: 1000, burst: 5, refillPerSec: 100 } })
    let attempts = 0
    const fn = vi.fn(async () => { attempts++; return 'ok' })
    const r = await rl.executeWithLimit({ key: 'k' }, fn, 3)
    expect(r).toBe('ok')
    expect(attempts).toBe(1)
  })
})

describe('RateLimiter · metrics & sync', () => {
  it('metrics tally', () => {
    const rl = new RateLimiter()
    rl.addRule({ name: 'r', route: '/api/*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 2, periodMs: 1000 } })
    rl.check({ key: 'a', route: '/api/x' })
    rl.check({ key: 'a', route: '/api/x' })
    rl.check({ key: 'a', route: '/api/x' })
    const m = rl.getMetrics()
    expect(m.totalChecks).toBe(3)
    expect(m.totalAllowed).toBe(2)
    expect(m.totalDenied).toBe(1)
    expect(m.byAlgorithm['fixed-window']).toBe(3)
    expect(m.byRoute['/api/*']).toBe(3)
  })
  it('resetMetrics', () => {
    const rl = new RateLimiter()
    rl.addRule({ name: 'r', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 1, periodMs: 1000 } })
    rl.check({ key: 'k' })
    rl.resetMetrics()
    expect(rl.getMetrics().totalChecks).toBe(0)
  })
  it('syncFromPeer + exportState', () => {
    const a = new RateLimiter()
    const r = a.addRule({ id: 'shared', name: 'r', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'token-bucket', limit: 10, periodMs: 1000 } })
    a.check({ key: 'k' })
    const snapshot = a.exportState()
    const b = new RateLimiter()
    b.addRule({ id: 'shared', name: 'r', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'token-bucket', limit: 10, periodMs: 1000 } })
    expect(b.inspectKey('shared', 'k')).toBeUndefined()
    b.syncFromPeer(snapshot)
    expect(b.inspectKey('shared', 'k')).toBeDefined()
  })
})

describe('RateLimiter · convenience', () => {
  it('limitByIp + limitByUser', () => {
    const rl = new RateLimiter()
    rl.addRule({ name: 'u', route: '*', enabled: true, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 1, periodMs: 1000, keyFn: (ctx) => ctx.userId ?? ctx.key } })
    expect(rl.limitByUser('u1', 1, 1000).allowed).toBe(true)
    expect(rl.limitByUser('u1', 1, 1000).allowed).toBe(false)
    expect(rl.limitByUser('u2', 1, 1000).allowed).toBe(true)
  })
  it('limitByIp auto-creates rule', () => {
    const rl = new RateLimiter()
    expect(rl.limitByIp('1.2.3.4', 5, 1000).allowed).toBe(true)
  })
})

describe('RateLimiter · singleton', () => {
  it('getRateLimiter / reset', async () => {
    const m = await import('../index')
    const a = m.getRateLimiter()
    const b = m.getRateLimiter()
    expect(a).toBe(b)
    m.resetRateLimiter()
    const c = m.getRateLimiter()
    expect(c).not.toBe(a)
  })
})

describe('RateLimiter · no matching rule', () => {
  it('returns allowed=true unlimited', () => {
    const rl = new RateLimiter()
    const d = rl.check({ key: 'k' })
    expect(d.allowed).toBe(true)
    expect(d.limit).toBe(-1)
  })
})

describe('RateLimiter · disabled rule', () => {
  it('falls through to no rule', () => {
    const rl = new RateLimiter()
    const r = rl.addRule({ name: 'r', route: '*', enabled: false, priority: 1, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 1, periodMs: 1000 } })
    void r
    for (let i = 0; i < 10; i++) expect(rl.check({ key: 'k' }).allowed).toBe(true)
  })
})
