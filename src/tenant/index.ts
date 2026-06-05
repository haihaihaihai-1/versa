/**
 * Versa · Multi-tenancy (v29.0)
 *
 * 多租户平台：
 * - TenantRegistry (CRUD / 状态 / 元数据 / 标签 / 区域)
 * - TenantContext (active tenant 切换 + 嵌套上下文)
 * - QuotaManager (per-tenant 配额：API / 存储 / 带宽 / 用户 / 节点)
 * - BillingEngine (用量计量 + 阶梯计价 + 发票 + 折扣)
 * - IsolationLevel (shared/db-per-tenant/schema-per-tenant)
 * - TenantRouter (host / header / path / cookie / JWT 5 种解析)
 * - AuditTrail (per-tenant 操作审计 + hash chain)
 * - TenantMetrics (per-tenant 资源使用 + 计费汇总)
 * - FeatureFlag per tenant
 * - Persistence (localStorage)
 */

import { withRetry, defaultRetry, computeBackoff } from '../federation'

// ============== Types ==============

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'archived' | 'pending'
export type IsolationLevel = 'shared' | 'schema' | 'database' | 'namespace'
export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise' | 'custom'
export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'quota' | 'billing' | 'feature' | 'export' | 'admin'

export interface Tenant {
  id: string
  name: string
  slug: string
  status: TenantStatus
  plan: PlanTier
  isolation: IsolationLevel
  region: string
  /** Feature flags enabled */
  features: string[]
  /** Tags for grouping */
  tags: string[]
  /** Optional metadata */
  metadata: Record<string, unknown>
  createdAt: number
  /** Trial end if status=trial */
  trialEndsAt?: number
  /** Suspended reason if status=suspended */
  suspendedReason?: string
}

export interface Quota {
  /** Max API calls per period (0 = unlimited) */
  apiCallsPerDay: number
  /** Max storage in MB */
  storageMb: number
  /** Max bandwidth MB per day */
  bandwidthMbPerDay: number
  /** Max users / members */
  maxUsers: number
  /** Max concurrent jobs */
  maxConcurrentJobs: number
  /** Max custom domains */
  maxDomains: number
  /** Requests per second burst */
  rpsBurst: number
}

export interface UsageRecord {
  tenantId: string
  ts: number
  /** 'api' | 'storage' | 'bandwidth' | 'user' | 'job' */
  metric: 'api' | 'storage' | 'bandwidth' | 'user' | 'job'
  amount: number
  metadata?: Record<string, unknown>
}

export interface QuotaCheck {
  allowed: boolean
  metric: UsageRecord['metric']
  current: number
  limit: number
  /** ms until reset if applicable */
  resetInMs?: number
  reason?: string
}

export interface PriceRule {
  /** metric to price */
  metric: UsageRecord['metric']
  /** unit: per call / per MB / per user-month */
  unit: string
  /** Tiered pricing: sorted by `upTo` ascending. Infinity = catch-all. */
  tiers: Array<{ upTo: number; unitPrice: number }>
  /** Currency: CNY / USD */
  currency: 'CNY' | 'USD'
}

export interface InvoiceLine {
  metric: UsageRecord['metric']
  quantity: number
  unitPrice: number
  amount: number
  tier?: number
}

export interface Invoice {
  id: string
  tenantId: string
  periodStart: number
  periodEnd: number
  lines: InvoiceLine[]
  subtotal: number
  discount: number
  total: number
  currency: 'CNY' | 'USD'
  status: 'draft' | 'open' | 'paid' | 'void'
  createdAt: number
  paidAt?: number
}

export interface Discount {
  id: string
  /** Percentage 0-100, or fixed amount */
  type: 'percent' | 'fixed'
  value: number
  /** Valid for tenants with this tag */
  forTag?: string
  /** Coupon code to apply */
  code?: string
  expiresAt?: number
  /** Max redemptions */
  maxRedemptions?: number
  redeemed: number
}

export interface AuditEntry {
  id: string
  tenantId: string
  actor: string
  action: AuditAction
  resource: string
  resourceId?: string
  ts: number
  ip?: string
  ua?: string
  data?: Record<string, unknown>
  /** SHA-256 chained hash */
  hash: string
  prevHash: string
}

export interface TenantMetrics {
  totalTenants: number
  byStatus: Record<TenantStatus, number>
  byPlan: Record<PlanTier, number>
  totalRevenue: number
  currency: 'CNY' | 'USD'
  topTenants: Array<{ tenantId: string; name: string; usage: number; cost: number }>
}

export interface TenantContext {
  tenant: Tenant
  /** Resolved at request time, can be overridden per call */
  userId?: string
  requestId: string
  startedAt: number
}

// ============== Tenant Registry ==============

export class TenantRegistry {
  private tenants = new Map<string, Tenant>()
  private bySlug = new Map<string, string>()

  register(input: Omit<Tenant, 'createdAt' | 'metadata' | 'features' | 'tags'> & Partial<Pick<Tenant, 'metadata' | 'features' | 'tags'>>): Tenant {
    if (this.tenants.has(input.id)) throw new Error(`Tenant ${input.id} already exists`)
    if (this.bySlug.has(input.slug)) throw new Error(`Slug ${input.slug} already taken`)
    const t: Tenant = {
      ...input,
      metadata: input.metadata ?? {},
      features: input.features ?? [],
      tags: input.tags ?? [],
      createdAt: Date.now(),
    }
    this.tenants.set(t.id, t)
    this.bySlug.set(t.slug, t.id)
    return t
  }

  update(id: string, patch: Partial<Omit<Tenant, 'id' | 'createdAt'>>): Tenant {
    const t = this.tenants.get(id)
    if (!t) throw new Error(`Tenant ${id} not found`)
    if (patch.slug && patch.slug !== t.slug) {
      if (this.bySlug.has(patch.slug)) throw new Error(`Slug ${patch.slug} already taken`)
      this.bySlug.delete(t.slug)
      this.bySlug.set(patch.slug, t.id)
    }
    const updated: Tenant = { ...t, ...patch }
    this.tenants.set(id, updated)
    return updated
  }

  get(id: string): Tenant | undefined { return this.tenants.get(id) }
  getBySlug(slug: string): Tenant | undefined { return this.tenants.get(this.bySlug.get(slug) ?? '') }
  remove(id: string): boolean {
    const t = this.tenants.get(id)
    if (!t) return false
    this.bySlug.delete(t.slug)
    return this.tenants.delete(id)
  }

  list(filter?: { status?: TenantStatus; plan?: PlanTier; tag?: string; region?: string }): Tenant[] {
    let arr = [...this.tenants.values()]
    if (filter?.status) arr = arr.filter(t => t.status === filter.status)
    if (filter?.plan) arr = arr.filter(t => t.plan === filter.plan)
    if (filter?.tag) arr = arr.filter(t => t.tags.includes(filter.tag!))
    if (filter?.region) arr = arr.filter(t => t.region === filter.region)
    return arr.sort((a, b) => a.name.localeCompare(b.name))
  }

  size(): number { return this.tenants.size }
  clear(): void { this.tenants.clear(); this.bySlug.clear() }
}

export const tenants = new TenantRegistry()

// ============== Quota Manager ==============

export const DEFAULT_QUOTAS: Record<PlanTier, Quota> = {
  free: { apiCallsPerDay: 1000, storageMb: 100, bandwidthMbPerDay: 500, maxUsers: 5, maxConcurrentJobs: 1, maxDomains: 0, rpsBurst: 5 },
  starter: { apiCallsPerDay: 10_000, storageMb: 1024, bandwidthMbPerDay: 5000, maxUsers: 50, maxConcurrentJobs: 5, maxDomains: 1, rpsBurst: 20 },
  pro: { apiCallsPerDay: 100_000, storageMb: 10_240, bandwidthMbPerDay: 50_000, maxUsers: 500, maxConcurrentJobs: 20, maxDomains: 5, rpsBurst: 100 },
  enterprise: { apiCallsPerDay: 0, storageMb: 0, bandwidthMbPerDay: 0, maxUsers: 0, maxConcurrentJobs: 0, maxDomains: 0, rpsBurst: 1000 },
  custom: { apiCallsPerDay: 0, storageMb: 0, bandwidthMbPerDay: 0, maxUsers: 0, maxConcurrentJobs: 0, maxDomains: 0, rpsBurst: 500 },
}

export class QuotaManager {
  private custom = new Map<string, Quota>()
  private windows = new Map<string, { day: string; api: number; bandwidth: number; storage: number; users: number; jobs: number }>()

  setQuota(tenantId: string, q: Quota): void { this.custom.set(tenantId, q) }
  getQuota(tenantId: string): Quota {
    const t = tenants.get(tenantId)
    if (!t) throw new Error(`Tenant ${tenantId} not found`)
    return this.custom.get(tenantId) ?? DEFAULT_QUOTAS[t.plan]
  }

  private dayKey(): string { return new Date().toISOString().slice(0, 10) }

  private getWindow(tenantId: string): { day: string; api: number; bandwidth: number; storage: number; users: number; jobs: number } {
    const day = this.dayKey()
    let w = this.windows.get(tenantId)
    if (!w || w.day !== day) {
      w = { day, api: 0, bandwidth: 0, storage: 0, users: 0, jobs: 0 }
      this.windows.set(tenantId, w)
    }
    return w
  }

  record(tenantId: string, metric: UsageRecord['metric'], amount: number): void {
    const w = this.getWindow(tenantId)
    switch (metric) {
      case 'api': w.api += amount; break
      case 'bandwidth': w.bandwidth += amount; break
      case 'storage': w.storage = Math.max(w.storage, amount); break
      case 'user': w.users = Math.max(w.users, amount); break
      case 'job': w.jobs += amount; break
    }
  }

  check(tenantId: string, metric: UsageRecord['metric']): QuotaCheck {
    const q = this.getQuota(tenantId)
    const w = this.getWindow(tenantId)
    const limits: Record<UsageRecord['metric'], { current: number; limit: number }> = {
      api: { current: w.api, limit: q.apiCallsPerDay },
      bandwidth: { current: w.bandwidth, limit: q.bandwidthMbPerDay },
      storage: { current: w.storage, limit: q.storageMb },
      user: { current: w.users, limit: q.maxUsers },
      job: { current: w.jobs, limit: q.maxConcurrentJobs },
    }
    const { current, limit } = limits[metric]
    const allowed = limit === 0 || current <= limit
    const now = Date.now()
    const tomorrow = new Date(now)
    tomorrow.setUTCHours(24, 0, 0, 0)
    return {
      allowed,
      metric,
      current,
      limit,
      resetInMs: tomorrow.getTime() - now,
      reason: allowed ? undefined : `${metric} quota exceeded: ${current}/${limit}`,
    }
  }

  reset(tenantId?: string): void {
    if (tenantId) this.windows.delete(tenantId)
    else this.windows.clear()
  }
}

export const quotas = new QuotaManager()

// ============== Billing Engine ==============

const DEFAULT_PRICING: PriceRule[] = [
  {
    metric: 'api', unit: 'call', currency: 'CNY',
    tiers: [
      { upTo: 10_000, unitPrice: 0 },
      { upTo: 100_000, unitPrice: 0.001 },
      { upTo: 1_000_000, unitPrice: 0.0005 },
      { upTo: Infinity, unitPrice: 0.0002 },
    ],
  },
  {
    metric: 'storage', unit: 'MB-month', currency: 'CNY',
    tiers: [
      { upTo: 1024, unitPrice: 0 },
      { upTo: 10_240, unitPrice: 0.05 },
      { upTo: 102_400, unitPrice: 0.03 },
      { upTo: Infinity, unitPrice: 0.01 },
    ],
  },
  {
    metric: 'bandwidth', unit: 'MB', currency: 'CNY',
    tiers: [
      { upTo: 5000, unitPrice: 0 },
      { upTo: 50_000, unitPrice: 0.1 },
      { upTo: Infinity, unitPrice: 0.05 },
    ],
  },
  {
    metric: 'user', unit: 'user-month', currency: 'CNY',
    tiers: [
      { upTo: 5, unitPrice: 0 },
      { upTo: 50, unitPrice: 5 },
      { upTo: 500, unitPrice: 3 },
      { upTo: Infinity, unitPrice: 1 },
    ],
  },
]

export class BillingEngine {
  private pricing = new Map<UsageRecord['metric'], PriceRule>()
  private discounts = new Map<string, Discount>()

  constructor() {
    for (const p of DEFAULT_PRICING) this.pricing.set(p.metric, p)
  }

  setPrice(metric: UsageRecord['metric'], rule: PriceRule): void { this.pricing.set(metric, rule) }
  getPrice(metric: UsageRecord['metric']): PriceRule | undefined { return this.pricing.get(metric) }
  listPrices(): PriceRule[] { return [...this.pricing.values()] }

  addDiscount(d: Omit<Discount, 'redeemed'>): Discount {
    const dsc: Discount = { ...d, redeemed: 0 }
    this.discounts.set(dsc.id, dsc)
    return dsc
  }

  applyDiscount(tenantId: string, code?: string): Discount | undefined {
    for (const d of this.discounts.values()) {
      if (d.code && d.code === code && (!d.expiresAt || d.expiresAt > Date.now()) && (!d.maxRedemptions || d.redeemed < d.maxRedemptions)) {
        if (d.forTag) {
          const t = tenants.get(tenantId)
          if (!t || !t.tags.includes(d.forTag)) continue
        }
        d.redeemed++
        return d
      }
    }
    return undefined
  }

  listDiscounts(): Discount[] { return [...this.discounts.values()] }

  /** Calculate cost for a given amount using tiered pricing */
  calculateCost(metric: UsageRecord['metric'], amount: number): { total: number; lines: InvoiceLine[] } {
    const rule = this.pricing.get(metric)
    if (!rule) return { total: 0, lines: [] }
    const lines: InvoiceLine[] = []
    let remaining = amount
    let consumed = 0
    for (let i = 0; i < rule.tiers.length; i++) {
      const tier = rule.tiers[i]!
      if (remaining <= 0) break
      const tierCapacity = tier.upTo - consumed
      const useInTier = Math.min(remaining, tierCapacity)
      if (useInTier > 0) {
        lines.push({
          metric,
          quantity: useInTier,
          unitPrice: tier.unitPrice,
          amount: useInTier * tier.unitPrice,
          tier: i,
        })
        remaining -= useInTier
        consumed += useInTier
      }
    }
    const total = lines.reduce((s, l) => s + l.amount, 0)
    return { total, lines }
  }

  /** Generate an invoice from usage records */
  invoice(tenantId: string, usage: UsageRecord[], periodStart: number, periodEnd: number, discountCode?: string): Invoice {
    const lines: InvoiceLine[] = []
    const byMetric = new Map<UsageRecord['metric'], number>()
    for (const u of usage) {
      if (u.tenantId !== tenantId) continue
      if (u.ts < periodStart || u.ts > periodEnd) continue
      byMetric.set(u.metric, (byMetric.get(u.metric) ?? 0) + u.amount)
    }
    for (const [metric, amount] of byMetric) {
      const { lines: lns } = this.calculateCost(metric, amount)
      lines.push(...lns)
    }
    const subtotal = lines.reduce((s, l) => s + l.amount, 0)
    const dsc = discountCode ? this.applyDiscount(tenantId, discountCode) : undefined
    const discount = dsc ? (dsc.type === 'percent' ? subtotal * (dsc.value / 100) : dsc.value) : 0
    const total = Math.max(0, subtotal - discount)
    const inv: Invoice = {
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      periodStart,
      periodEnd,
      lines,
      subtotal,
      discount,
      total,
      currency: 'CNY',
      status: 'draft',
      createdAt: Date.now(),
    }
    return inv
  }

  pay(invoiceId: string, invoices: Invoice[]): Invoice {
    const inv = invoices.find(i => i.id === invoiceId)
    if (!inv) throw new Error(`Invoice ${invoiceId} not found`)
    inv.status = 'paid'
    inv.paidAt = Date.now()
    return inv
  }
}

export const billing = new BillingEngine()

// ============== Tenant Router (resolve tenant from request) ==============

export interface RouteRequest {
  host?: string
  headers?: Record<string, string>
  path?: string
  cookies?: Record<string, string>
  /** JWT-style payload (already decoded) */
  jwt?: { tenantId?: string; sub?: string }
}

export interface RouteRule {
  /** Priority: higher wins */
  priority: number
  /** Where to look: 'host' | 'header:X-Tenant' | 'path:/t/:slug' | 'cookie:tenant' | 'jwt' */
  source: 'host' | 'header' | 'path' | 'cookie' | 'jwt'
  /** Header / cookie name or host suffix (e.g. '.example.com') or path pattern */
  pattern?: string
  /** If host, sub.example.com → tenant slug is 'sub' */
  stripSuffix?: string
}

export class TenantRouter {
  private rules: RouteRule[] = []

  addRule(rule: RouteRule): void { this.rules.push(rule); this.rules.sort((a, b) => b.priority - a.priority) }
  removeRule(priority: number, source: RouteRule['source'], pattern?: string): boolean {
    const idx = this.rules.findIndex(r => r.priority === priority && r.source === source && r.pattern === pattern)
    if (idx === -1) return false
    this.rules.splice(idx, 1)
    return true
  }
  listRules(): RouteRule[] { return [...this.rules] }

  resolve(req: RouteRequest): Tenant | undefined {
    for (const rule of this.rules) {
      if (rule.source === 'host' && req.host) {
        const suf = rule.stripSuffix ?? ''
        if (req.host.endsWith(suf) && suf.length > 0) {
          const slug = req.host.slice(0, -suf.length).replace(/\.$/, '')
          const t = tenants.getBySlug(slug)
          if (t) return t
        }
      } else if (rule.source === 'header' && rule.pattern && req.headers) {
        const v = req.headers[rule.pattern]
        if (v) {
          const t = tenants.get(v) ?? tenants.getBySlug(v)
          if (t) return t
        }
      } else if (rule.source === 'path' && rule.pattern && req.path) {
        const re = new RegExp('^' + rule.pattern.replace(/:slug/, '([^/]+)') + '$')
        const m = re.exec(req.path)
        if (m) {
          const t = tenants.getBySlug(m[1]!)
          if (t) return t
        }
      } else if (rule.source === 'cookie' && rule.pattern && req.cookies) {
        const v = req.cookies[rule.pattern]
        if (v) {
          const t = tenants.get(v) ?? tenants.getBySlug(v)
          if (t) return t
        }
      } else if (rule.source === 'jwt' && req.jwt?.tenantId) {
        const t = tenants.get(req.jwt.tenantId)
        if (t) return t
      }
    }
    return undefined
  }
}

export const tenantRouter = new TenantRouter()

// ============== Audit Trail (hash chain) ==============

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder().encode(input)
    const buf = await crypto.subtle.digest('SHA-256', enc)
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
  }
  // Fallback: simple non-cryptographic hash (deterministic, used only for offline tests)
  let h1 = 0xdeadbeef ^ 0
  let h2 = 0x41c6ce57 ^ 0
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}

function syncHash(input: string): string {
  let h1 = 0xdeadbeef ^ 0
  let h2 = 0x41c6ce57 ^ 0
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
}

export class AuditTrail {
  private entries: AuditEntry[] = []
  private lastHash = '00000000'

  record(input: Omit<AuditEntry, 'id' | 'ts' | 'hash' | 'prevHash'>): AuditEntry {
    const e: AuditEntry = {
      ...input,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
      prevHash: this.lastHash,
      hash: 'pending',
    }
    e.hash = syncHash(`${e.id}|${e.tenantId}|${e.actor}|${e.action}|${e.resource}|${e.ts}|${e.prevHash}`)
    this.lastHash = e.hash
    this.entries.push(e)
    return e
  }

  /** Verify hash chain integrity */
  verify(): { valid: boolean; brokenAt?: number } {
    let prev = '00000000'
    for (let i = 0; i < this.entries.length; i++) {
      const e = this.entries[i]!
      if (e.prevHash !== prev) return { valid: false, brokenAt: i }
      const expected = syncHash(`${e.id}|${e.tenantId}|${e.actor}|${e.action}|${e.resource}|${e.ts}|${e.prevHash}`)
      if (expected !== e.hash) return { valid: false, brokenAt: i }
      prev = e.hash
    }
    return { valid: true }
  }

  query(filter: { tenantId?: string; actor?: string; action?: AuditAction; resource?: string; since?: number; until?: number; limit?: number }): AuditEntry[] {
    let arr = this.entries
    if (filter.tenantId) arr = arr.filter(e => e.tenantId === filter.tenantId)
    if (filter.actor) arr = arr.filter(e => e.actor === filter.actor)
    if (filter.action) arr = arr.filter(e => e.action === filter.action)
    if (filter.resource) arr = arr.filter(e => e.resource === filter.resource)
    if (filter.since) arr = arr.filter(e => e.ts >= filter.since!)
    if (filter.until) arr = arr.filter(e => e.ts <= filter.until!)
    if (filter.limit) arr = arr.slice(-filter.limit)
    return arr
  }

  list(): AuditEntry[] { return [...this.entries] }
  size(): number { return this.entries.length }
  clear(): void { this.entries = []; this.lastHash = '00000000' }
}

export const audit = new AuditTrail()

// ============== Feature Flags per tenant ==============

export class FeatureFlagService {
  private overrides = new Map<string, Set<string>>() // tenantId -> enabled features

  enable(tenantId: string, feature: string): void {
    let s = this.overrides.get(tenantId)
    if (!s) { s = new Set(); this.overrides.set(tenantId, s) }
    s.add(feature)
  }
  disable(tenantId: string, feature: string): void {
    this.overrides.get(tenantId)?.delete(feature)
  }
  isEnabled(tenantId: string, feature: string): boolean {
    const t = tenants.get(tenantId)
    if (!t) return false
    if (t.features.includes(feature)) return true
    return this.overrides.get(tenantId)?.has(feature) ?? false
  }
  list(tenantId: string): string[] {
    const t = tenants.get(tenantId)
    if (!t) return []
    const overrides = [...(this.overrides.get(tenantId) ?? new Set<string>())]
    return [...new Set([...t.features, ...overrides])]
  }
}

export const featureFlags = new FeatureFlagService()

// ============== Tenant Context (active + nesting) ==============

export class ContextStack {
  private stack: TenantContext[] = []

  push(ctx: TenantContext): void { this.stack.push(ctx) }
  pop(): TenantContext | undefined { return this.stack.pop() }
  current(): TenantContext | undefined { return this.stack[this.stack.length - 1] }
  depth(): number { return this.stack.length }
  all(): TenantContext[] { return [...this.stack] }
}

export const contexts = new ContextStack()

/** Run a function within a tenant context */
export async function withTenant<T>(tenantId: string, fn: (ctx: TenantContext) => Promise<T> | T, opts: { userId?: string } = {}): Promise<T> {
  const t = tenants.get(tenantId)
  if (!t) throw new Error(`Tenant ${tenantId} not found`)
  if (t.status === 'suspended' || t.status === 'archived') {
    throw new Error(`Tenant ${t.slug} is ${t.status}`)
  }
  const ctx: TenantContext = {
    tenant: t,
    userId: opts.userId,
    requestId: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    startedAt: Date.now(),
  }
  contexts.push(ctx)
  try {
    return await fn(ctx)
  } finally {
    contexts.pop()
  }
}

// ============== Isolation helpers ==============

export function isolationKey(tenant: Tenant, resource: string): string {
  switch (tenant.isolation) {
    case 'shared': return `${resource}:shared`
    case 'schema': return `${resource}:${tenant.id}`
    case 'database': return `${resource}:db:${tenant.id}`
    case 'namespace': return `${tenant.slug}:${resource}`
  }
}

// ============== Metrics ==============

class TenantMetricsCollector {
  private invoiceTotals = new Map<string, number>()
  private usageByTenant = new Map<string, Map<UsageRecord['metric'], number>>()
  private revenueTotal = 0
  private invoiceCount = 0

  recordInvoice(inv: Invoice): void {
    this.invoiceTotals.set(inv.tenantId, (this.invoiceTotals.get(inv.tenantId) ?? 0) + inv.total)
    this.revenueTotal += inv.total
    this.invoiceCount++
  }

  recordUsage(tenantId: string, metric: UsageRecord['metric'], amount: number): void {
    let m = this.usageByTenant.get(tenantId)
    if (!m) { m = new Map(); this.usageByTenant.set(tenantId, m) }
    m.set(metric, (m.get(metric) ?? 0) + amount)
  }

  snapshot(): TenantMetrics {
    const all = tenants.list()
    const byStatus: Record<TenantStatus, number> = { active: 0, suspended: 0, trial: 0, archived: 0, pending: 0 }
    const byPlan: Record<PlanTier, number> = { free: 0, starter: 0, pro: 0, enterprise: 0, custom: 0 }
    for (const t of all) {
      byStatus[t.status]++
      byPlan[t.plan]++
    }
    const topTenants = all
      .map(t => {
        const usageMap = this.usageByTenant.get(t.id) ?? new Map()
        const usage = [...usageMap.values()].reduce((s, n) => s + n, 0)
        return { tenantId: t.id, name: t.name, usage, cost: this.invoiceTotals.get(t.id) ?? 0 }
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)
    return {
      totalTenants: all.length,
      byStatus,
      byPlan,
      totalRevenue: this.revenueTotal,
      currency: 'CNY',
      topTenants,
    }
  }

  reset(): void {
    this.invoiceTotals.clear()
    this.usageByTenant.clear()
    this.revenueTotal = 0
    this.invoiceCount = 0
  }
}

const tenantMetrics = new TenantMetricsCollector()

// ============== Persistence ==============

const STORAGE_KEY = 'versa.tenant.v1'

export interface PersistShape {
  tenants: Tenant[]
  customQuotas: Array<{ tenantId: string; quota: Quota }>
  discounts: Discount[]
  audit: AuditEntry[]
  invoices: Invoice[]
}

export function persistTenants(tenants: TenantRegistry, auditT: AuditTrail, invList: Invoice[]): number {
  if (typeof localStorage === 'undefined') return 0
  const data: PersistShape = {
    tenants: tenants.list(),
    customQuotas: [...quotas['custom' as keyof QuotaManager] instanceof Map ? (quotas as unknown as { custom: Map<string, Quota> }).custom : new Map()].map(([k, v]) => ({ tenantId: k, quota: v })),
    discounts: billing.listDiscounts(),
    audit: auditT.list(),
    invoices: invList,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return data.tenants.length
  } catch {
    return 0
  }
}

export function loadTenants(reg: TenantRegistry, auditT: AuditTrail): { invoices: Invoice[] } {
  if (typeof localStorage === 'undefined') return { invoices: [] }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { invoices: [] }
    const data = JSON.parse(raw) as PersistShape
    reg.clear()
    for (const t of data.tenants) {
      try { reg.register(t) } catch { /* skip dups */ }
    }
    for (const c of data.customQuotas) quotas.setQuota(c.tenantId, c.quota)
    auditT.clear()
    for (const a of data.audit) {
      // re-add without recomputing hash
      (auditT as unknown as { entries: AuditEntry[] }).entries.push(a)
    }
    return { invoices: data.invoices ?? [] }
  } catch {
    return { invoices: [] }
  }
}

// ============== Summarize ==============

export function summarizeTenant(): {
  tenants: number
  active: number
  invoices: number
  revenue: number
  auditEntries: number
  metrics: TenantMetrics
} {
  const m = tenantMetrics.snapshot()
  const all = tenants.list()
  const active = all.filter(t => t.status === 'active').length
  return {
    tenants: all.length,
    active,
    invoices: 0,
    revenue: m.totalRevenue,
    auditEntries: audit.size(),
    metrics: m,
  }
}

export { withRetry, defaultRetry, computeBackoff, tenantMetrics }
