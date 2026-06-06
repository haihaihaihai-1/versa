import { describe, it, expect, vi } from 'vitest'
import { QuotaManager, DEFAULT_TIERS, getQuota, resetQuota } from '../index'

describe('QuotaManager', () => {
  describe('tier configuration', () => {
    it('defines a tier', () => {
      const m = new QuotaManager()
      const t = m.defineTier({ id: 'gold', name: 'Gold', limits: [] })
      expect(t.id).toBe('gold')
      expect(m.listTiers()).toHaveLength(1)
    })

    it('lists multiple tiers', () => {
      const m = new QuotaManager()
      m.defineTier({ id: 'a', name: 'A', limits: [] })
      m.defineTier({ id: 'b', name: 'B', limits: [] })
      expect(m.listTiers()).toHaveLength(2)
    })
  })

  describe('subject registration', () => {
    it('registers a subject', () => {
      const m = new QuotaManager()
      const s = m.registerSubject({ id: 'u1', tier: 'free' })
      expect(s.id).toBe('u1')
      expect(m.listSubjects()).toHaveLength(1)
    })

    it('retrieves a subject', () => {
      const m = new QuotaManager()
      m.registerSubject({ id: 'u1', tier: 'free' })
      expect(m.getSubject('u1')?.tier).toBe('free')
    })
  })

  describe('policy CRUD', () => {
    it('creates a policy', () => {
      const m = new QuotaManager()
      const p = m.createPolicy({ name: 'api-limit', resource: 'requests', limit: 100, window: 'month', enforcement: 'block', enabled: true })
      expect(p.id).toMatch(/^pol_/)
      expect(p.limit).toBe(100)
    })

    it('gets a policy', () => {
      const m = new QuotaManager()
      const p = m.createPolicy({ name: 'a', resource: 'r', limit: 1, window: 'month', enforcement: 'block', enabled: true })
      expect(m.getPolicy(p.id)?.name).toBe('a')
    })

    it('updates a policy', () => {
      const m = new QuotaManager()
      const p = m.createPolicy({ name: 'a', resource: 'r', limit: 1, window: 'month', enforcement: 'block', enabled: true })
      const updated = m.updatePolicy(p.id, { limit: 999 })
      expect(updated?.limit).toBe(999)
    })

    it('deletes a policy', () => {
      const m = new QuotaManager()
      const p = m.createPolicy({ name: 'a', resource: 'r', limit: 1, window: 'month', enforcement: 'block', enabled: true })
      expect(m.deletePolicy(p.id)).toBe(true)
      expect(m.getPolicy(p.id)).toBeUndefined()
    })

    it('lists policies', () => {
      const m = new QuotaManager()
      m.createPolicy({ name: 'a', resource: 'r', limit: 1, window: 'month', enforcement: 'block', enabled: true })
      m.createPolicy({ name: 'b', resource: 'r', limit: 2, window: 'month', enforcement: 'block', enabled: true })
      expect(m.listPolicies()).toHaveLength(2)
    })
  })

  describe('applyTier', () => {
    it('assigns tier policies', () => {
      const m = new QuotaManager()
      m.defineTier({ id: 'basic', name: 'Basic', limits: [
        { resource: 'requests', limit: 50, window: 'month', enforcement: 'block' },
      ] })
      m.registerSubject({ id: 'u1', tier: 'free' })
      const ok = m.applyTier('u1', 'basic')
      expect(ok).toBe(true)
      expect(m.getSubjectPolicies('u1')).toHaveLength(1)
      expect(m.getSubject('u1')?.tier).toBe('basic')
    })

    it('returns false for unknown tier', () => {
      const m = new QuotaManager()
      m.registerSubject({ id: 'u1', tier: 'free' })
      expect(m.applyTier('u1', 'unknown')).toBe(false)
    })

    it('applies default tier templates via singleton', () => {
      resetQuota()
      const m = getQuota()
      expect(m.listTiers().map(t => t.id)).toEqual(['free', 'pro', 'enterprise'])
    })
  })

  describe('record and check', () => {
    it('allows when no policy exists', () => {
      const m = new QuotaManager()
      m.registerSubject({ id: 'u1', tier: 'free' })
      const r = m.record('u1', 'requests', 100)
      expect(r.allowed).toBe(true)
    })

    it('tracks usage', () => {
      const m = new QuotaManager()
      m.registerSubject({ id: 'u1', tier: 'free' })
      m.createPolicy({ name: 'p', resource: 'requests', limit: 100, window: 'month', enforcement: 'block', enabled: true })
      m.assignPolicy('u1', m.listPolicies()[0].id)
      m.record('u1', 'requests', 30)
      m.record('u1', 'requests', 50)
      const usages = m.check('u1', 'requests')
      expect(usages[0].used).toBe(80)
      expect(usages[0].remaining).toBe(20)
    })

    it('blocks when over limit', () => {
      const m = new QuotaManager()
      m.registerSubject({ id: 'u1', tier: 'free' })
      const p = m.createPolicy({ name: 'p', resource: 'requests', limit: 100, window: 'month', enforcement: 'block', enabled: true })
      m.assignPolicy('u1', p.id)
      const r1 = m.record('u1', 'requests', 80)
      expect(r1.allowed).toBe(true)
      const r2 = m.record('u1', 'requests', 50)
      expect(r2.allowed).toBe(false)
    })

    it('warns at threshold', () => {
      const m = new QuotaManager({ warnThreshold: 0.8 })
      m.registerSubject({ id: 'u1', tier: 'free' })
      const p = m.createPolicy({ name: 'p', resource: 'requests', limit: 100, window: 'month', enforcement: 'warn', warnThreshold: 0.8, enabled: true })
      m.assignPolicy('u1', p.id)
      m.record('u1', 'requests', 85)
      const usages = m.check('u1', 'requests')
      expect(usages[0].state).toBe('warn')
    })

    it('warn enforcement does not block', () => {
      const m = new QuotaManager()
      m.registerSubject({ id: 'u1', tier: 'free' })
      const p = m.createPolicy({ name: 'p', resource: 'requests', limit: 10, window: 'month', enforcement: 'warn', enabled: true })
      m.assignPolicy('u1', p.id)
      const r = m.record('u1', 'requests', 100)
      expect(r.allowed).toBe(true)
      expect(r.state).toBe('exceeded')
    })

    it('throttle enforcement reduces amount to fit', () => {
      const m = new QuotaManager({ defaultEnforcement: 'throttle' })
      m.registerSubject({ id: 'u1', tier: 'free' })
      const p = m.createPolicy({ name: 'p', resource: 'requests', limit: 100, window: 'month', enforcement: 'throttle', enabled: true })
      m.assignPolicy('u1', p.id)
      m.record('u1', 'requests', 80)
      const r = m.record('u1', 'requests', 50)
      // Throttle should still allow
      expect(r.allowed).toBe(true)
    })

    it('triggers alert callback', () => {
      const onAlert = vi.fn()
      const m = new QuotaManager({ onAlert })
      m.registerSubject({ id: 'u1', tier: 'free' })
      const p = m.createPolicy({ name: 'p', resource: 'requests', limit: 10, window: 'month', enforcement: 'warn', warnThreshold: 0.5, enabled: true })
      m.assignPolicy('u1', p.id)
      m.record('u1', 'requests', 6)
      expect(onAlert).toHaveBeenCalled()
    })
  })

  describe('setUsage / reset', () => {
    it('sets usage directly', () => {
      const m = new QuotaManager()
      m.registerSubject({ id: 'u1', tier: 'free' })
      const p = m.createPolicy({ name: 'p', resource: 'requests', limit: 100, window: 'month', enforcement: 'block', enabled: true })
      m.assignPolicy('u1', p.id)
      m.setUsage('u1', 'requests', 50)
      expect(m.check('u1', 'requests')[0].used).toBe(50)
    })

    it('resets all subject usage', () => {
      const m = new QuotaManager()
      m.registerSubject({ id: 'u1', tier: 'free' })
      const p = m.createPolicy({ name: 'p', resource: 'requests', limit: 100, window: 'month', enforcement: 'block', enabled: true })
      m.assignPolicy('u1', p.id)
      m.record('u1', 'requests', 30)
      const n = m.reset('u1')
      expect(n).toBeGreaterThan(0)
      expect(m.check('u1', 'requests')[0].used).toBe(0)
    })

    it('resets specific resource', () => {
      const m = new QuotaManager()
      m.registerSubject({ id: 'u1', tier: 'free' })
      const p = m.createPolicy({ name: 'p', resource: 'requests', limit: 100, window: 'month', enforcement: 'block', enabled: true })
      m.assignPolicy('u1', p.id)
      m.record('u1', 'requests', 30)
      const n = m.reset('u1', 'requests')
      expect(n).toBe(1)
    })
  })

  describe('snapshot & top consumers', () => {
    it('snapshot returns usage summary', () => {
      const m = new QuotaManager()
      m.defineTier({ id: 'basic', name: 'Basic', limits: [
        { resource: 'requests', limit: 100, window: 'month', enforcement: 'block' },
        { resource: 'storage', limit: 1000, window: 'month', enforcement: 'block' },
      ] })
      m.registerSubject({ id: 'u1', tier: 'basic' })
      m.applyTier('u1', 'basic')
      m.record('u1', 'requests', 25)
      m.record('u1', 'storage', 100)
      const snap = m.snapshot('u1')
      expect(snap.usages).toHaveLength(2)
      expect(snap.totalUsed).toBe(125)
      expect(snap.totalLimit).toBe(1100)
    })

    it('top consumers', () => {
      const m = new QuotaManager()
      m.defineTier({ id: 'basic', name: 'B', limits: [{ resource: 'requests', limit: 100, window: 'month', enforcement: 'block' }] })
      m.registerSubject({ id: 'u1', tier: 'basic' })
      m.registerSubject({ id: 'u2', tier: 'basic' })
      m.applyTier('u1', 'basic')
      m.applyTier('u2', 'basic')
      m.record('u1', 'requests', 30)
      m.record('u2', 'requests', 80)
      const top = m.topConsumers('requests', Date.now(), 5)
      expect(top[0].subjectId).toBe('u2')
      expect(top[0].used).toBe(80)
    })
  })

  describe('forecast & alerts', () => {
    it('forecast projects future usage', () => {
      const m = new QuotaManager()
      m.registerSubject({ id: 'u1', tier: 'free' })
      const p = m.createPolicy({ name: 'p', resource: 'requests', limit: 100, window: 'month', enforcement: 'block', enabled: true })
      m.assignPolicy('u1', p.id)
      // Set used 50% of the way through the window
      const now = Date.now()
      const start = m['windowStart'](now, 'month')
      m.setUsage('u1', 'requests', 50, start + (now - start) / 2)
      const f = m.forecast('u1', 'requests', now)
      expect(f.projected).toBeGreaterThan(f.used)
    })

    it('records alert history', () => {
      const m = new QuotaManager()
      m.registerSubject({ id: 'u1', tier: 'free' })
      const p = m.createPolicy({ name: 'p', resource: 'requests', limit: 10, window: 'month', enforcement: 'warn', warnThreshold: 0.5, enabled: true })
      m.assignPolicy('u1', p.id)
      m.record('u1', 'requests', 6)
      const alerts = m.getAlerts('u1')
      expect(alerts.length).toBeGreaterThan(0)
      expect(alerts[0].state).toBe('warn')
    })

    it('clears alerts', () => {
      const m = new QuotaManager()
      m.registerSubject({ id: 'u1', tier: 'free' })
      m.clearAlerts()
      expect(m.getAlerts()).toHaveLength(0)
    })
  })

  describe('metrics & lifecycle', () => {
    it('returns aggregate metrics', () => {
      const m = new QuotaManager()
      m.defineTier({ id: 'a', name: 'A', limits: [] })
      m.registerSubject({ id: 'u1', tier: 'a' })
      m.createPolicy({ name: 'p', resource: 'r', limit: 1, window: 'month', enforcement: 'block', enabled: true })
      const m0 = m.metrics()
      expect(m0.subjects).toBe(1)
      expect(m0.policies).toBe(1)
      expect(m0.tiers).toBe(1)
    })

    it('clears all data', () => {
      const m = new QuotaManager()
      m.registerSubject({ id: 'u1', tier: 'free' })
      m.clear()
      expect(m.listSubjects()).toHaveLength(0)
    })

    it('singleton lifecycle', () => {
      resetQuota()
      const m1 = getQuota()
      const m2 = getQuota()
      expect(m1).toBe(m2)
      resetQuota()
      const m3 = getQuota()
      expect(m3).not.toBe(m1)
    })
  })
})
