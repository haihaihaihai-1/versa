/**
 * Versa · Multi-tenancy Tests (v29.0)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  tenants, quotas, billing, tenantRouter, audit, featureFlags, contexts,
  withTenant, isolationKey, persistTenants, loadTenants, summarizeTenant,
  DEFAULT_QUOTAS, DEFAULT_PRICING, tenantMetrics,
  type Tenant, type Quota, type UsageRecord, type Invoice, type RouteRequest,
} from '../index'

// ============== TenantRegistry ==============

describe('TenantRegistry', () => {
  beforeEach(() => {
    tenants.clear()
    audit.clear()
    quotas.reset()
  })

  it('registers a tenant with required fields', () => {
    const t = tenants.register({
      id: 't1', name: 'Acme', slug: 'acme', status: 'active',
      plan: 'pro', isolation: 'schema', region: 'CN', features: [], tags: [],
    })
    expect(t.id).toBe('t1')
    expect(t.createdAt).toBeGreaterThan(0)
    expect(tenants.size()).toBe(1)
  })

  it('rejects duplicate id or slug', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    expect(() => tenants.register({ id: 't1', name: 'A2', slug: 'a2', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })).toThrow(/already exists/)
    expect(() => tenants.register({ id: 't2', name: 'A3', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })).toThrow(/already taken/)
  })

  it('updates tenant fields', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    const t = tenants.update('t1', { name: 'A2', plan: 'pro' })
    expect(t.name).toBe('A2')
    expect(t.plan).toBe('pro')
  })

  it('updates slug with uniqueness check', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    tenants.register({ id: 't2', name: 'B', slug: 'b', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    expect(() => tenants.update('t1', { slug: 'b' })).toThrow(/already taken/)
    expect(tenants.update('t1', { slug: 'c' }).slug).toBe('c')
  })

  it('list filters by status, plan, tag, region', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: ['x'] })
    tenants.register({ id: 't2', name: 'B', slug: 'b', status: 'trial', plan: 'pro', isolation: 'schema', region: 'US', features: [], tags: ['y'] })
    tenants.register({ id: 't3', name: 'C', slug: 'c', status: 'active', plan: 'pro', isolation: 'shared', region: 'CN', features: [], tags: ['x', 'y'] })
    expect(tenants.list({ status: 'active' })).toHaveLength(2)
    expect(tenants.list({ plan: 'pro' })).toHaveLength(2)
    expect(tenants.list({ tag: 'x' })).toHaveLength(2)
    expect(tenants.list({ region: 'CN' })).toHaveLength(2)
  })

  it('getBySlug resolves correctly', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'acme', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    expect(tenants.getBySlug('acme')?.id).toBe('t1')
    expect(tenants.getBySlug('nope')).toBeUndefined()
  })

  it('remove cleans up slug index', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    expect(tenants.remove('t1')).toBe(true)
    expect(tenants.getBySlug('a')).toBeUndefined()
    expect(tenants.remove('t1')).toBe(false)
  })
})

// ============== QuotaManager ==============

describe('QuotaManager', () => {
  beforeEach(() => {
    tenants.clear()
    quotas.reset()
  })

  it('returns default quota based on plan', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    expect(quotas.getQuota('t1').apiCallsPerDay).toBe(DEFAULT_QUOTAS.free.apiCallsPerDay)
  })

  it('enterprise plan has unlimited quotas (0)', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'enterprise', isolation: 'shared', region: 'CN', features: [], tags: [] })
    const q = quotas.getQuota('t1')
    expect(q.apiCallsPerDay).toBe(0)
    expect(q.storageMb).toBe(0)
  })

  it('checks quota under limit (allowed)', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    quotas.record('t1', 'api', 100)
    const c = quotas.check('t1', 'api')
    expect(c.allowed).toBe(true)
    expect(c.current).toBe(100)
  })

  it('checks quota over limit (denied)', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    quotas.record('t1', 'api', 2000)
    const c = quotas.check('t1', 'api')
    expect(c.allowed).toBe(false)
    expect(c.reason).toContain('exceeded')
    expect(c.resetInMs).toBeGreaterThan(0)
  })

  it('custom quota overrides default', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    quotas.setQuota('t1', { ...DEFAULT_QUOTAS.free, apiCallsPerDay: 5000 })
    expect(quotas.getQuota('t1').apiCallsPerDay).toBe(5000)
  })

  it('storage is a max gauge not a sum', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    quotas.record('t1', 'storage', 50)
    quotas.record('t1', 'storage', 30)
    expect(quotas.check('t1', 'storage').current).toBe(50)
  })
})

// ============== BillingEngine ==============

describe('BillingEngine', () => {
  beforeEach(() => {
    tenants.clear()
  })

  it('tiered pricing: first 10k API calls free', () => {
    const { total, lines } = billing.calculateCost('api', 5000)
    expect(total).toBe(0)
    expect(lines).toHaveLength(1)
    expect(lines[0]!.tier).toBe(0)
  })

  it('tiered pricing: 50k calls uses 2 tiers', () => {
    const { total, lines } = billing.calculateCost('api', 50_000)
    expect(total).toBeGreaterThan(0)
    expect(lines).toHaveLength(2)
    // first 10k free, next 40k * 0.001 = 40
    expect(total).toBeCloseTo(40, 1)
  })

  it('custom price rule overrides default', () => {
    billing.setPrice('api', { metric: 'api', unit: 'call', currency: 'CNY', tiers: [{ upTo: Infinity, unitPrice: 0.01 }] })
    const { total } = billing.calculateCost('api', 1000)
    expect(total).toBeCloseTo(10, 1)
  })

  it('generates invoice from usage records with discount', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'pro', isolation: 'shared', region: 'CN', features: [], tags: ['vip'] })
    const usage: UsageRecord[] = [
      { tenantId: 't1', ts: Date.now(), metric: 'api', amount: 50_000 },
      { tenantId: 't1', ts: Date.now(), metric: 'bandwidth', amount: 10_000 },
    ]
    billing.addDiscount({ id: 'd1', type: 'percent', value: 10, forTag: 'vip', code: 'VIP10' })
    const inv = billing.invoice('t1', usage, Date.now() - 86_400_000, Date.now(), 'VIP10')
    expect(inv.subtotal).toBeGreaterThan(0)
    expect(inv.discount).toBeGreaterThan(0)
    expect(inv.total).toBeLessThan(inv.subtotal)
    expect(inv.currency).toBe('CNY')
  })

  it('pays invoice', () => {
    const inv: Invoice = { id: 'inv1', tenantId: 't1', periodStart: 0, periodEnd: 0, lines: [], subtotal: 100, discount: 0, total: 100, currency: 'CNY', status: 'open', createdAt: 0 }
    const paid = billing.pay('inv1', [inv])
    expect(paid.status).toBe('paid')
    expect(paid.paidAt).toBeGreaterThan(0)
  })
})

// ============== TenantRouter ==============

describe('TenantRouter', () => {
  beforeEach(() => {
    tenants.clear()
  })

  it('resolves tenant by host suffix', () => {
    tenants.register({ id: 't1', name: 'Acme', slug: 'acme', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    tenantRouter.addRule({ priority: 10, source: 'host', stripSuffix: '.versa.app' })
    const t = tenantRouter.resolve({ host: 'acme.versa.app' })
    expect(t?.id).toBe('t1')
  })

  it('resolves tenant by header', () => {
    tenants.register({ id: 't1', name: 'Acme', slug: 'acme', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    tenantRouter.addRule({ priority: 10, source: 'header', pattern: 'X-Tenant' })
    const t = tenantRouter.resolve({ headers: { 'X-Tenant': 't1' } })
    expect(t?.id).toBe('t1')
  })

  it('resolves tenant by path', () => {
    tenants.register({ id: 't1', name: 'Acme', slug: 'acme', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    tenantRouter.addRule({ priority: 10, source: 'path', pattern: '/t/:slug' })
    const t = tenantRouter.resolve({ path: '/t/acme' })
    expect(t?.id).toBe('t1')
  })

  it('resolves tenant by cookie', () => {
    tenants.register({ id: 't1', name: 'Acme', slug: 'acme', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    tenantRouter.addRule({ priority: 10, source: 'cookie', pattern: 'tenant' })
    const t = tenantRouter.resolve({ cookies: { tenant: 't1' } })
    expect(t?.id).toBe('t1')
  })

  it('resolves tenant by jwt', () => {
    tenants.register({ id: 't1', name: 'Acme', slug: 'acme', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    tenantRouter.addRule({ priority: 10, source: 'jwt' })
    const t = tenantRouter.resolve({ jwt: { tenantId: 't1', sub: 'u1' } })
    expect(t?.id).toBe('t1')
  })

  it('higher priority rules win', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    tenants.register({ id: 't2', name: 'B', slug: 'b', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    tenantRouter.addRule({ priority: 5, source: 'header', pattern: 'X-Tenant' })
    tenantRouter.addRule({ priority: 20, source: 'jwt' })
    const t = tenantRouter.resolve({ headers: { 'X-Tenant': 't1' }, jwt: { tenantId: 't2' } })
    expect(t?.id).toBe('t2')
  })

  it('returns undefined when no rule matches', () => {
    expect(tenantRouter.resolve({ host: 'unknown.com' })).toBeUndefined()
  })
})

// ============== AuditTrail ==============

describe('AuditTrail', () => {
  beforeEach(() => { audit.clear() })

  it('records entry with hash chain', () => {
    const e1 = audit.record({ tenantId: 't1', actor: 'u1', action: 'create', resource: 'post' })
    const e2 = audit.record({ tenantId: 't1', actor: 'u1', action: 'update', resource: 'post', resourceId: 'p1' })
    expect(e1.prevHash).toBe('00000000')
    expect(e2.prevHash).toBe(e1.hash)
    expect(e1.hash).not.toBe(e2.hash)
  })

  it('verifies intact chain', () => {
    audit.record({ tenantId: 't1', actor: 'u1', action: 'create', resource: 'a' })
    audit.record({ tenantId: 't1', actor: 'u1', action: 'update', resource: 'a' })
    audit.record({ tenantId: 't1', actor: 'u1', action: 'delete', resource: 'a' })
    const v = audit.verify()
    expect(v.valid).toBe(true)
  })

  it('detects tampering', () => {
    audit.record({ tenantId: 't1', actor: 'u1', action: 'create', resource: 'a' })
    audit.record({ tenantId: 't1', actor: 'u1', action: 'update', resource: 'a' })
    // tamper with an entry
    const list = audit.list()
    list[1]!.actor = 'attacker'
    const v = audit.verify()
    expect(v.valid).toBe(false)
    expect(v.brokenAt).toBe(1)
  })

  it('queries by tenant, actor, action', () => {
    audit.record({ tenantId: 't1', actor: 'u1', action: 'create', resource: 'a' })
    audit.record({ tenantId: 't2', actor: 'u2', action: 'update', resource: 'b' })
    audit.record({ tenantId: 't1', actor: 'u2', action: 'delete', resource: 'a' })
    expect(audit.query({ tenantId: 't1' })).toHaveLength(2)
    expect(audit.query({ actor: 'u2' })).toHaveLength(2)
    expect(audit.query({ action: 'delete' })).toHaveLength(1)
  })

  it('limit query', () => {
    for (let i = 0; i < 5; i++) audit.record({ tenantId: 't1', actor: 'u1', action: 'read', resource: 'a' })
    expect(audit.query({ limit: 3 })).toHaveLength(3)
  })
})

// ============== FeatureFlagService ==============

describe('FeatureFlagService', () => {
  beforeEach(() => {
    tenants.clear()
  })

  it('enables features from tenant.features list', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'pro', isolation: 'shared', region: 'CN', features: ['f1', 'f2'], tags: [] })
    expect(featureFlags.isEnabled('t1', 'f1')).toBe(true)
    expect(featureFlags.isEnabled('t1', 'f3')).toBe(false)
  })

  it('adds runtime overrides', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    featureFlags.enable('t1', 'beta')
    expect(featureFlags.isEnabled('t1', 'beta')).toBe(true)
    featureFlags.disable('t1', 'beta')
    expect(featureFlags.isEnabled('t1', 'beta')).toBe(false)
  })

  it('list returns all enabled', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: ['f1'], tags: [] })
    featureFlags.enable('t1', 'f2')
    expect(featureFlags.list('t1').sort()).toEqual(['f1', 'f2'])
  })
})

// ============== TenantContext ==============

describe('withTenant + ContextStack', () => {
  beforeEach(() => {
    tenants.clear()
    while (contexts.depth() > 0) contexts.pop()
  })

  it('pushes and pops context', async () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    await withTenant('t1', (ctx) => {
      expect(ctx.tenant.id).toBe('t1')
      expect(contexts.current()?.tenant.id).toBe('t1')
      expect(contexts.depth()).toBe(1)
    })
    expect(contexts.depth()).toBe(0)
  })

  it('rejects suspended tenant', async () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'suspended', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    await expect(withTenant('t1', () => 1)).rejects.toThrow(/suspended/)
  })

  it('supports nested contexts', async () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    tenants.register({ id: 't2', name: 'B', slug: 'b', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    await withTenant('t1', async () => {
      expect(contexts.depth()).toBe(1)
      await withTenant('t2', () => {
        expect(contexts.depth()).toBe(2)
        expect(contexts.current()?.tenant.id).toBe('t2')
      })
      expect(contexts.depth()).toBe(1)
    })
  })
})

// ============== Isolation ==============

describe('isolationKey', () => {
  it('returns correct key per isolation level', () => {
    const t: Tenant = { id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [], createdAt: 0 }
    expect(isolationKey({ ...t, isolation: 'shared' }, 'users')).toBe('users:shared')
    expect(isolationKey({ ...t, isolation: 'schema' }, 'users')).toBe('users:t1')
    expect(isolationKey({ ...t, isolation: 'database' }, 'users')).toBe('users:db:t1')
    expect(isolationKey({ ...t, isolation: 'namespace' }, 'users')).toBe('a:users')
  })
})

// ============== Persistence ==============

describe('persistence', () => {
  beforeEach(() => {
    tenants.clear()
    audit.clear()
    if (typeof localStorage !== 'undefined') localStorage.removeItem('versa.tenant.v1')
  })

  it('loadTenants returns empty when no data', () => {
    const result = loadTenants(tenants, audit)
    expect(result.invoices).toEqual([])
  })

  it('persistTenants returns count and round-trips', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    if (typeof localStorage === 'undefined') return
    const n = persistTenants(tenants, audit, [])
    expect(n).toBe(1)
    tenants.clear()
    const result = loadTenants(tenants, audit)
    expect(tenants.size()).toBe(1)
  })
})

// ============== Summarize ==============

describe('summarizeTenant', () => {
  beforeEach(() => {
    tenants.clear()
    audit.clear()
  })

  it('returns aggregated snapshot', () => {
    tenants.register({ id: 't1', name: 'A', slug: 'a', status: 'active', plan: 'pro', isolation: 'shared', region: 'CN', features: [], tags: [] })
    tenants.register({ id: 't2', name: 'B', slug: 'b', status: 'trial', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })
    const s = summarizeTenant()
    expect(s.tenants).toBe(2)
    expect(s.active).toBe(1)
    expect(s.metrics.totalTenants).toBe(2)
    expect(s.metrics.byPlan.pro).toBe(1)
  })
})
