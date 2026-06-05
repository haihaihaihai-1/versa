/**
 * Versa · Multi-tenancy Playground (v29.0)
 * - Tenants / Quotas / Billing / Router / Audit / Features / Metrics
 */
import { useEffect, useMemo, useState } from 'react'
import {
  tenants, quotas, billing, tenantRouter, audit, featureFlags, contexts,
  withTenant, persistTenants, loadTenants, summarizeTenant,
  type Tenant, type TenantStatus, type PlanTier, type IsolationLevel, type RouteRule,
} from './index'

type Tab = 'tenants' | 'quotas' | 'billing' | 'router' | 'audit' | 'features' | 'metrics'

export function TenantPage() {
  const [tab, setTab] = useState<Tab>('tenants')
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])

  useEffect(() => {
    if (tenants.size() === 0) seedDemo()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50/30 to-amber-50/30 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent">
            Multi-tenancy · v29.0
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            多租户平台 · 注册表 · 配额 · 计费 · 路由 · 审计 · 特性开关 · 指标
          </p>
        </header>

        <nav className="mb-6 flex gap-2 border-b border-slate-200 overflow-x-auto">
          {([
            ['tenants', '租户'],
            ['quotas', '配额'],
            ['billing', '计费'],
            ['router', '租户路由'],
            ['audit', '审计'],
            ['features', '特性开关'],
            ['metrics', '指标'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === t ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-6">
          <main>
            {tab === 'tenants' && <TenantsTab tick={tick} />}
            {tab === 'quotas' && <QuotasTab tick={tick} />}
            {tab === 'billing' && <BillingTab tick={tick} />}
            {tab === 'router' && <RouterTab tick={tick} />}
            {tab === 'audit' && <AuditTab tick={tick} />}
            {tab === 'features' && <FeaturesTab tick={tick} />}
            {tab === 'metrics' && <MetricsTab tick={tick} />}
          </main>
          <Sidebar tick={tick} />
        </div>
      </div>
    </div>
  )
}

// ============== Tenants Tab ==============

function TenantsTab({ tick }: { tick: number }) {
  void tick
  const [name, setName] = useState('New Tenant')
  const [slug, setSlug] = useState('new-tenant')
  const [plan, setPlan] = useState<PlanTier>('pro')
  const [isolation, setIsolation] = useState<IsolationLevel>('schema')
  const [status, setStatus] = useState<TenantStatus>('active')
  const [region, setRegion] = useState('CN')
  const [tags, setTags] = useState('')

  const all = tenants.list()

  const add = (): void => {
    try {
      tenants.register({
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        name, slug, plan, isolation, status, region,
        features: [], tags: tags.split(',').map(s => s.trim()).filter(Boolean),
      })
      setName('New Tenant'); setSlug('new-tenant'); setTags('')
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    }
  }

  const remove = (id: string): void => { tenants.remove(id) }
  const setStatus_ = (id: string, s: TenantStatus): void => { tenants.update(id, { status: s }) }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">注册租户</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Field label="名称"><input value={name} onChange={e => setName(e.target.value)} className={inputClass} /></Field>
          <Field label="Slug"><input value={slug} onChange={e => setSlug(e.target.value)} className={inputClass} /></Field>
          <Field label="区域"><input value={region} onChange={e => setRegion(e.target.value)} className={inputClass} /></Field>
          <Field label="套餐">
            <select value={plan} onChange={e => setPlan(e.target.value as PlanTier)} className={inputClass}>
              {['free', 'starter', 'pro', 'enterprise', 'custom'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="隔离">
            <select value={isolation} onChange={e => setIsolation(e.target.value as IsolationLevel)} className={inputClass}>
              {['shared', 'schema', 'database', 'namespace'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="状态">
            <select value={status} onChange={e => setStatus(e.target.value as TenantStatus)} className={inputClass}>
              {['active', 'trial', 'suspended', 'pending', 'archived'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="标签 (逗号分隔)"><input value={tags} onChange={e => setTags(e.target.value)} className={inputClass} placeholder="vip, beta" /></Field>
        </div>
        <Btn onClick={add} variant="primary">注册</Btn>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">已注册 ({all.length})</h2>
        <div className="space-y-2">
          {all.map(t => (
            <div key={t.id} className="border border-slate-200 rounded-xl p-3 hover:border-rose-300 transition">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-slate-800">{t.name}</span>
                  <span className="text-xs text-slate-500">@{t.slug}</span>
                  <StatusBadge status={t.status} />
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{t.plan}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{t.isolation}</span>
                </div>
                <div className="flex gap-1">
                  {t.status === 'active'
                    ? <Btn onClick={() => setStatus_(t.id, 'suspended')}>暂停</Btn>
                    : <Btn onClick={() => setStatus_(t.id, 'active')}>启用</Btn>}
                  <Btn onClick={() => remove(t.id)}>删除</Btn>
                </div>
              </div>
              <div className="flex gap-1 text-[10px] text-slate-500">
                <span>{t.region}</span>
                {t.tags.map(tag => <span key={tag} className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">{tag}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============== Quotas Tab ==============

function QuotasTab({ tick }: { tick: number }) {
  void tick
  const [selected, setSelected] = useState(tenants.list()[0]?.id ?? '')
  const [amount, setAmount] = useState('100')
  const [metric, setMetric] = useState<'api' | 'bandwidth' | 'storage' | 'user' | 'job'>('api')
  const tenant = tenants.get(selected)
  const quota = tenant ? quotas.getQuota(tenant.id) : null
  const check = tenant ? quotas.check(tenant.id, metric) : null

  const all = tenants.list()

  const record = (): void => {
    if (tenant) quotas.record(tenant.id, metric, Number(amount))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">配额查询</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Field label="租户">
            <select value={selected} onChange={e => setSelected(e.target.value)} className={inputClass}>
              <option value="">— 选择 —</option>
              {all.map(t => <option key={t.id} value={t.id}>{t.name} ({t.plan})</option>)}
            </select>
          </Field>
          <Field label="指标">
            <select value={metric} onChange={e => setMetric(e.target.value as 'api' | 'bandwidth' | 'storage' | 'user' | 'job')} className={inputClass}>
              {['api', 'bandwidth', 'storage', 'user', 'job'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="用量 (record)">
            <div className="flex gap-2">
              <input value={amount} onChange={e => setAmount(e.target.value)} className={inputClass} />
              <Btn onClick={record} variant="primary">记录</Btn>
            </div>
          </Field>
        </div>
      </div>

      {tenant && quota && check && (
        <>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">{tenant.name} 的配额</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <QuotaCard label="API/天" current={quotas.check(tenant.id, 'api').current} limit={quota.apiCallsPerDay} />
              <QuotaCard label="带宽 MB/天" current={quotas.check(tenant.id, 'bandwidth').current} limit={quota.bandwidthMbPerDay} />
              <QuotaCard label="存储 MB" current={quotas.check(tenant.id, 'storage').current} limit={quota.storageMb} />
              <QuotaCard label="用户" current={quotas.check(tenant.id, 'user').current} limit={quota.maxUsers} />
              <QuotaCard label="并发任务" current={quotas.check(tenant.id, 'job').current} limit={quota.maxConcurrentJobs} />
              <QuotaCard label="自定义域名" current={0} limit={quota.maxDomains} />
            </div>
          </div>
          <div className={`rounded-2xl p-4 text-sm border ${check.allowed ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
            <strong>{metric}</strong> 配额：{check.current} / {check.limit === 0 ? '∞' : check.limit} — {check.allowed ? '✓ 允许' : '✗ 超限'}
            {check.reason && <div className="text-xs mt-1">{check.reason}</div>}
          </div>
        </>
      )}
    </div>
  )
}

function QuotaCard({ label, current, limit }: { label: string; current: number; limit: number }) {
  const pct = limit === 0 ? 0 : Math.min(100, (current / limit) * 100)
  return (
    <div className="border border-slate-200 rounded-lg p-2">
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-slate-500">{label}</span>
        <span className="font-mono text-slate-700">{current} / {limit === 0 ? '∞' : limit}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ============== Billing Tab ==============

function BillingTab({ tick }: { tick: number }) {
  void tick
  const [tenantId, setTenantId] = useState(tenants.list()[0]?.id ?? '')
  const [code, setCode] = useState('')
  const [lastInvoice, setLastInvoice] = useState<ReturnType<typeof billing.invoice> | null>(null)
  const all = tenants.list()

  const calc = (metric: 'api' | 'bandwidth' | 'storage' | 'user', amount: number): void => {
    const r = billing.calculateCost(metric, amount)
    setLastInvoice({
      id: `demo-${Date.now()}`,
      tenantId, periodStart: 0, periodEnd: 0,
      lines: r.lines, subtotal: r.total, discount: 0, total: r.total,
      currency: 'CNY', status: 'draft', createdAt: Date.now(),
    })
  }

  const fullInvoice = (): void => {
    if (!tenantId) return
    const usage = [
      { tenantId, ts: Date.now(), metric: 'api' as const, amount: 50_000 },
      { tenantId, ts: Date.now(), metric: 'storage' as const, amount: 5000 },
      { tenantId, ts: Date.now(), metric: 'bandwidth' as const, amount: 20_000 },
    ]
    const inv = billing.invoice(tenantId, usage, Date.now() - 30 * 86_400_000, Date.now(), code || undefined)
    setLastInvoice(inv)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">阶梯计价预览</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {(['api', 'storage', 'bandwidth', 'user'] as const).map(m => (
            <Btn key={m} onClick={() => calc(m, 50_000)}>{m} · 50k</Btn>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <Field label="租户">
            <select value={tenantId} onChange={e => setTenantId(e.target.value)} className={inputClass}>
              <option value="">— 选择 —</option>
              {all.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="折扣码">
            <input value={code} onChange={e => setCode(e.target.value)} className={inputClass} placeholder="VIP10" />
          </Field>
          <Field label=" ">
            <Btn onClick={fullInvoice} variant="primary">生成完整发票</Btn>
          </Field>
        </div>
      </div>

      {lastInvoice && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">发票 · {lastInvoice.id.slice(-8)}</h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-1">指标</th><th>数量</th><th>单价</th><th>金额</th>
              </tr>
            </thead>
            <tbody>
              {lastInvoice.lines.map((l, i) => (
                <tr key={i} className="border-b border-slate-100">
                  <td className="py-1 font-mono text-slate-700">{l.metric} (tier {l.tier})</td>
                  <td>{l.quantity}</td>
                  <td className="font-mono">¥{l.unitPrice.toFixed(4)}</td>
                  <td className="font-mono">¥{l.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={3} className="text-right py-2">小计</td><td className="font-mono">¥{lastInvoice.subtotal.toFixed(2)}</td></tr>
              <tr><td colSpan={3} className="text-right">折扣</td><td className="font-mono text-red-600">-¥{lastInvoice.discount.toFixed(2)}</td></tr>
              <tr><td colSpan={3} className="text-right font-bold">总计</td><td className="font-mono font-bold">¥{lastInvoice.total.toFixed(2)}</td></tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ============== Router Tab ==============

function RouterTab({ tick }: { tick: number }) {
  void tick
  const [host, setHost] = useState('acme.versa.app')
  const [header, setHeader] = useState('X-Tenant')
  const [headerVal, setHeaderVal] = useState('')
  const [path, setPath] = useState('/t/acme')
  const [cookie, setCookie] = useState('')
  const [jwt, setJwt] = useState('')
  const [resolved, setResolved] = useState<Tenant | undefined>(undefined)

  const all = tenants.list()
  const rules = tenantRouter.listRules()

  const tryHost = (): void => {
    setResolved(tenantRouter.resolve({ host }))
  }
  const tryHeader = (): void => {
    setResolved(tenantRouter.resolve({ headers: { [header]: headerVal } }))
  }
  const tryPath = (): void => {
    setResolved(tenantRouter.resolve({ path }))
  }
  const tryCookie = (): void => {
    setResolved(tenantRouter.resolve({ cookies: { tenant: cookie } }))
  }
  const tryJwt = (): void => {
    setResolved(tenantRouter.resolve({ jwt: { tenantId: jwt, sub: 'u1' } }))
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">5 种解析方式</h2>
        <div className="space-y-2">
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Field label="host (例: acme.versa.app)"><input value={host} onChange={e => setHost(e.target.value)} className={inputClass} /></Field></div>
            <Btn onClick={tryHost} variant="primary">解析 host</Btn>
          </div>
          <div className="flex gap-2 items-end">
            <div className="w-32"><Field label="header 名"><input value={header} onChange={e => setHeader(e.target.value)} className={inputClass} /></Field></div>
            <div className="flex-1"><Field label="header 值"><input value={headerVal} onChange={e => setHeaderVal(e.target.value)} className={inputClass} placeholder="t1 或 acme" /></Field></div>
            <Btn onClick={tryHeader}>解析 header</Btn>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Field label="path (例: /t/acme)"><input value={path} onChange={e => setPath(e.target.value)} className={inputClass} /></Field></div>
            <Btn onClick={tryPath}>解析 path</Btn>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Field label="cookie tenant=值"><input value={cookie} onChange={e => setCookie(e.target.value)} className={inputClass} placeholder="t1" /></Field></div>
            <Btn onClick={tryCookie}>解析 cookie</Btn>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Field label="JWT tenantId"><input value={jwt} onChange={e => setJwt(e.target.value)} className={inputClass} placeholder="t1" /></Field></div>
            <Btn onClick={tryJwt}>解析 JWT</Btn>
          </div>
        </div>
      </div>

      {resolved && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-sm text-green-900">
          <strong>解析结果：</strong> {resolved.name} (@{resolved.slug}, {resolved.plan}, {resolved.status})
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">活跃路由规则 ({rules.length})</h2>
        <div className="space-y-1 text-xs">
          {rules.map((r, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
              <span className="font-mono text-slate-500">p={r.priority}</span>
              <span className="font-mono text-slate-700">{r.source}</span>
              {r.pattern && <span className="text-slate-500">{r.pattern}</span>}
              {r.stripSuffix && <span className="text-slate-500">strip={r.stripSuffix}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============== Audit Tab ==============

function AuditTab({ tick }: { tick: number }) {
  void tick
  const [tenantId, setTenantId] = useState(tenants.list()[0]?.id ?? '')
  const [action, setAction] = useState<ReturnType<typeof billing.invoice> extends never ? never : 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout' | 'quota' | 'billing' | 'feature' | 'export' | 'admin'>('create')
  const [resource, setResource] = useState('demo')
  const [actor, setActor] = useState('user-1')
  const all = tenants.list()

  const record = (): void => {
    if (!tenantId) return
    audit.record({ tenantId, actor, action, resource })
  }
  const verify = audit.verify()
  const list = audit.query({ tenantId: tenantId || undefined }).slice(-20).reverse()

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">记录审计</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <Field label="租户">
            <select value={tenantId} onChange={e => setTenantId(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {all.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="操作">
            <select value={action} onChange={e => setAction(e.target.value as typeof action)} className={inputClass}>
              {['create', 'read', 'update', 'delete', 'login', 'logout', 'quota', 'billing', 'feature', 'export', 'admin'].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="资源"><input value={resource} onChange={e => setResource(e.target.value)} className={inputClass} /></Field>
          <Field label="执行者"><input value={actor} onChange={e => setActor(e.target.value)} className={inputClass} /></Field>
        </div>
        <Btn onClick={record} variant="primary">记录</Btn>
        <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${verify.valid ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          哈希链验证：{verify.valid ? `✓ 完整 (${audit.size()} 条)` : `✗ 损坏 @${verify.brokenAt}`}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">最近 20 条 (tenant: {tenantId || '全部'})</h2>
        <div className="space-y-1 font-mono text-[11px] max-h-96 overflow-y-auto">
          {list.map(e => (
            <div key={e.id} className="px-2 py-1 bg-slate-50 rounded">
              <span className="text-slate-500">{new Date(e.ts).toISOString().slice(11, 19)}</span>{' '}
              <span className="text-rose-700">{e.action}</span>{' '}
              <span className="text-slate-700">{e.resource}</span>{' '}
              <span className="text-slate-500">by {e.actor}</span>
              <div className="text-slate-400 truncate">hash={e.hash.slice(0, 12)}… prev={e.prevHash.slice(0, 8)}…</div>
            </div>
          ))}
          {list.length === 0 && <p className="text-slate-400 text-xs">暂无</p>}
        </div>
      </div>
    </div>
  )
}

// ============== Features Tab ==============

function FeaturesTab({ tick }: { tick: number }) {
  void tick
  const [tenantId, setTenantId] = useState(tenants.list()[0]?.id ?? '')
  const [feature, setFeature] = useState('beta-search')
  const all = tenants.list()
  const tenant = tenants.get(tenantId)
  const flags = tenant ? featureFlags.list(tenant.id) : []

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">特性开关</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <Field label="租户">
            <select value={tenantId} onChange={e => setTenantId(e.target.value)} className={inputClass}>
              <option value="">— 选择 —</option>
              {all.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="特性名"><input value={feature} onChange={e => setFeature(e.target.value)} className={inputClass} /></Field>
          <Field label=" ">
            <div className="flex gap-2">
              <Btn onClick={() => featureFlags.enable(tenantId, feature)} variant="primary">开启</Btn>
              <Btn onClick={() => featureFlags.disable(tenantId, feature)}>关闭</Btn>
            </div>
          </Field>
        </div>
        <div className="mt-3 text-xs">
          <strong className="text-slate-700">已启用 ({flags.length})：</strong>
          {flags.length === 0 ? <span className="text-slate-400 ml-2">无</span> : (
            <div className="flex flex-wrap gap-1 mt-1">
              {flags.map(f => <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-100">{f}</span>)}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">withTenant 上下文</h2>
        <p className="text-xs text-slate-500 mb-3">在租户上下文中执行，自动审计 + 隔离</p>
        <Btn onClick={async () => {
          try {
            const result = await withTenant(tenantId, async (ctx) => {
              audit.record({ tenantId: ctx.tenant.id, actor: 'system', action: 'read', resource: 'context-test' })
              return `✓ ran in ${ctx.tenant.name} (req ${ctx.requestId.slice(-6)})`
            })
            alert(result)
          } catch (e) {
            alert(`✗ ${e instanceof Error ? e.message : String(e)}`)
          }
        }} variant="primary">运行 withTenant</Btn>
        <p className="text-[11px] text-slate-500 mt-2">当前栈深度: {contexts.depth()}</p>
      </div>
    </div>
  )
}

// ============== Metrics Tab ==============

function MetricsTab({ tick }: { tick: number }) {
  void tick
  const s = summarizeTenant()
  const m = s.metrics

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="总租户" value={String(m.totalTenants)} />
        <Metric label="活跃" value={String(m.byStatus.active)} />
        <Metric label="试用" value={String(m.byStatus.trial)} />
        <Metric label="暂停" value={String(m.byStatus.suspended)} />
        <Metric label="Pro 套餐" value={String(m.byPlan.pro)} />
        <Metric label="免费" value={String(m.byPlan.free)} />
        <Metric label="企业" value={String(m.byPlan.enterprise)} />
        <Metric label="总收入" value={`¥${m.totalRevenue.toFixed(0)}`} color="text-rose-600" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Top 10 营收租户</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-1">租户</th><th>用量</th><th>营收</th>
            </tr>
          </thead>
          <tbody>
            {m.topTenants.map(t => (
              <tr key={t.tenantId} className="border-b border-slate-100">
                <td className="py-1 font-mono text-slate-700">{t.name}</td>
                <td className="font-mono">{t.usage}</td>
                <td className="font-mono text-rose-700">¥{t.cost.toFixed(2)}</td>
              </tr>
            ))}
            {m.topTenants.length === 0 && <tr><td colSpan={3} className="text-slate-400 py-2">暂无</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">持久化 (localStorage)</h2>
        <div className="flex gap-2 mb-2">
          <Btn onClick={() => { const n = persistTenants(tenants, audit, []); alert(`已持久化 ${n} 个租户`) }}>保存</Btn>
          <Btn onClick={() => { const r = loadTenants(tenants, audit); alert(`已加载 ${tenants.size()} 个租户`) }}>读取</Btn>
        </div>
        <p className="text-[11px] text-slate-400">key: versa.tenant.v1</p>
      </div>
    </div>
  )
}

// ============== Sidebar ==============

function Sidebar({ tick }: { tick: number }) {
  void tick
  const s = summarizeTenant()
  return (
    <aside className="space-y-3 text-xs">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">租户快照</h3>
        <Row k="总租户" v={String(s.tenants)} />
        <Row k="活跃" v={String(s.active)} />
        <Row k="审计条数" v={String(s.auditEntries)} />
        <hr className="my-2 border-slate-100" />
        <Row k="Pro" v={String(s.metrics.byPlan.pro)} />
        <Row k="企业" v={String(s.metrics.byPlan.enterprise)} />
        <Row k="免费" v={String(s.metrics.byPlan.free)} />
        <Row k="总收入" v={`¥${s.metrics.totalRevenue.toFixed(0)}`} />
      </div>
      <div className="bg-gradient-to-br from-rose-50 to-amber-50 rounded-2xl border border-rose-100 p-4">
        <h3 className="text-xs font-semibold text-rose-800 mb-1">v29.0 能力</h3>
        <ul className="text-[11px] text-rose-700 space-y-0.5">
          <li>· TenantRegistry (CRUD / slug)</li>
          <li>· QuotaManager (5 指标 / 套餐)</li>
          <li>· BillingEngine (阶梯计价)</li>
          <li>· Discount + 发票</li>
          <li>· TenantRouter (5 解析源)</li>
          <li>· AuditTrail (哈希链验证)</li>
          <li>· FeatureFlag per tenant</li>
          <li>· 4 种隔离级别</li>
          <li>· withTenant 上下文嵌套</li>
        </ul>
      </div>
    </aside>
  )
}

// ============== Shared UI ==============

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-500">{k}</span>
      <span className="text-slate-800 font-mono font-medium">{v}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Btn({ children, onClick, variant, disabled }: { children: React.ReactNode; onClick: () => void; variant?: 'primary'; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition disabled:opacity-50 ${
        variant === 'primary'
          ? 'bg-rose-600 text-white hover:bg-rose-700'
          : 'bg-white border border-slate-200 text-slate-700 hover:border-rose-300'
      }`}
    >
      {children}
    </button>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${color ?? 'text-slate-800'}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    trial: 'bg-blue-100 text-blue-700',
    suspended: 'bg-red-100 text-red-700',
    archived: 'bg-slate-200 text-slate-600',
    pending: 'bg-amber-100 text-amber-700',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  )
}

const inputClass = 'w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white focus:border-rose-500 focus:ring-1 focus:ring-rose-200 outline-none'

// ============== Seed data ==============

function seedDemo(): void {
  tenants.register({ id: 't-acme', name: 'Acme Corp', slug: 'acme', status: 'active', plan: 'enterprise', isolation: 'database', region: 'CN', features: ['analytics', 'sso'], tags: ['vip', 'enterprise'] })
  tenants.register({ id: 't-globex', name: 'Globex', slug: 'globex', status: 'active', plan: 'pro', isolation: 'schema', region: 'US', features: ['analytics'], tags: ['beta'] })
  tenants.register({ id: 't-initech', name: 'Initech', slug: 'initech', status: 'trial', plan: 'starter', isolation: 'schema', region: 'CN', features: [], tags: [] })
  tenants.register({ id: 't-hooli', name: 'Hooli', slug: 'hooli', status: 'suspended', plan: 'pro', isolation: 'shared', region: 'US', features: [], tags: ['vip'], suspendedReason: 'payment failed' })
  tenants.register({ id: 't-umbrella', name: 'Umbrella', slug: 'umbrella', status: 'active', plan: 'free', isolation: 'shared', region: 'CN', features: [], tags: [] })

  tenantRouter.addRule({ priority: 100, source: 'host', stripSuffix: '.versa.app' })
  tenantRouter.addRule({ priority: 80, source: 'header', pattern: 'X-Tenant' })
  tenantRouter.addRule({ priority: 60, source: 'path', pattern: '/t/:slug' })
  tenantRouter.addRule({ priority: 40, source: 'cookie', pattern: 'tenant' })
  tenantRouter.addRule({ priority: 20, source: 'jwt' })

  billing.addDiscount({ id: 'd-vip10', type: 'percent', value: 10, forTag: 'vip', code: 'VIP10' })
  billing.addDiscount({ id: 'd-new20', type: 'percent', value: 20, code: 'NEW20' })
}
