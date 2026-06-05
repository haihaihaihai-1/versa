/**
 * Versa · Federation Playground (v27.0)
 * - Registry / Health / LB / Circuit Breaker / Router / Stitcher / Metrics
 */
import { useEffect, useMemo, useState } from 'react'
import {
  serviceRegistry, healthChecker, loadBalancer, circuitBreakers,
  federationRouter, graphqlStitcher, federationMetrics, federatedRequest,
  summarizeFederation,
  type Service, type RouteRule, type LoadBalanceAlgo, type CircuitState,
} from './index'

type Tab = 'services' | 'routing' | 'circuit' | 'stitch' | 'request' | 'metrics'

export function FederationPage() {
  const [tab, setTab] = useState<Tab>('services')
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])

  // Seed demo data on first mount
  useEffect(() => {
    if (serviceRegistry.size() === 0) seedDemo()
    if (graphqlStitcher.size() === 0) seedSubgraphs()
    return () => { /* keep data across tab switches */ }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Federation · v27.0
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            跨服务联邦 · Registry · Health · LB · Circuit Breaker · Router · Stitcher · Metrics
          </p>
        </header>

        <nav className="mb-6 flex gap-2 border-b border-slate-200 overflow-x-auto">
          {([
            ['services', '服务注册'],
            ['routing', '路由规则'],
            ['circuit', '熔断器'],
            ['stitch', 'GraphQL 聚合'],
            ['request', '请求模拟'],
            ['metrics', '指标'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === t ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-6">
          <main>
            {tab === 'services' && <ServicesTab tick={tick} />}
            {tab === 'routing' && <RoutingTab tick={tick} />}
            {tab === 'circuit' && <CircuitTab tick={tick} />}
            {tab === 'stitch' && <StitchTab tick={tick} />}
            {tab === 'request' && <RequestTab tick={tick} />}
            {tab === 'metrics' && <MetricsTab tick={tick} />}
          </main>
          <Sidebar tick={tick} />
        </div>
      </div>
    </div>
  )
}

// ============== Services Tab ==============

function ServicesTab({ tick }: { tick: number }) {
  void tick
  const [name, setName] = useState('payments')
  const [url, setUrl] = useState('http://payments.svc:8080')
  const [region, setRegion] = useState<Service['region']>('CN')
  const [protocol, setProtocol] = useState<Service['protocol']>('http')
  const [weight, setWeight] = useState(1)
  const [tags, setTags] = useState('core,paid')

  const services = serviceRegistry.list()

  const onAdd = () => {
    const id = `${name}-${Date.now()}`
    serviceRegistry.register({
      id, name, url, region, protocol, weight,
      tags: tags.split(',').map(s => s.trim()).filter(Boolean),
      metadata: {},
      healthCheck: { path: '/health', intervalMs: 5000, timeoutMs: 2000 },
      circuit: { failureThreshold: 3, cooldownMs: 10_000, halfOpenMaxTrials: 1 },
    })
  }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">服务注册</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Name"><input className={inputClass} value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="URL"><input className={inputClass} value={url} onChange={e => setUrl(e.target.value)} /></Field>
          <Field label="Protocol">
            <select className={inputClass} value={protocol} onChange={e => setProtocol(e.target.value as Service['protocol'])}>
              <option>http</option><option>graphql</option><option>grpc</option><option>websocket</option>
            </select>
          </Field>
          <Field label="Region">
            <select className={inputClass} value={region} onChange={e => setRegion(e.target.value as Service['region'])}>
              {['CN','US','EU','APAC','OTHER'].map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Weight"><input className={inputClass} type="number" value={weight} onChange={e => setWeight(Number(e.target.value))} /></Field>
          <Field label="Tags (逗号分隔)"><input className={inputClass} value={tags} onChange={e => setTags(e.target.value)} /></Field>
        </div>
        <div className="mt-3 flex gap-2">
          <Btn onClick={onAdd} variant="primary">+ Register</Btn>
          <Btn onClick={() => { serviceRegistry.clear() }}>清空全部</Btn>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">已注册服务 ({services.length})</h3>
        <div className="space-y-1.5 text-xs">
          {services.length === 0 && <p className="text-slate-400">(空)</p>}
          {services.map(s => {
            const health = healthChecker.get(s.id)
            const status = health?.status ?? 'unknown'
            return (
              <div key={s.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <span className={`w-2 h-2 rounded-full ${
                  status === 'healthy' ? 'bg-emerald-500' :
                  status === 'degraded' ? 'bg-amber-500' :
                  status === 'unhealthy' ? 'bg-rose-500' : 'bg-slate-300'
                }`} />
                <span className="font-medium text-slate-800">{s.name}</span>
                <span className="text-slate-500 font-mono text-[10px]">{s.id}</span>
                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px]">{s.protocol}</span>
                <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px]">{s.region}</span>
                <span className="text-slate-500">w={s.weight}</span>
                <span className="ml-auto text-slate-400 text-[10px]">{s.url}</span>
                {s.tags.length > 0 && <span className="text-slate-400 text-[10px]">[{s.tags.join(', ')}]</span>}
                <button onClick={() => serviceRegistry.unregister(s.id)} className="text-rose-500 hover:text-rose-700 text-[10px]">×</button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ============== Routing Tab ==============

function RoutingTab({ tick }: { tick: number }) {
  void tick
  const [name, setName] = useState('API v1')
  const [path, setPath] = useState('/api/v1/*')
  const [method, setMethod] = useState('ANY')
  const [service, setService] = useState('users')
  const [action, setAction] = useState<RouteRule['action']>('route')
  const [fallback, setFallback] = useState('')
  const [retries, setRetries] = useState(0)

  const [testPath, setTestPath] = useState('/api/v1/users/42')
  const [testMethod, setTestMethod] = useState('GET')
  const [testHeaders, setTestHeaders] = useState('x-tenant: acme')
  const [matchResult, setMatchResult] = useState<string>('')

  const services = serviceRegistry.list()
  const rules = federationRouter.listRules()

  const onAdd = () => {
    const rule: RouteRule = {
      id: `r${Date.now()}`,
      name,
      priority: rules.length + 1,
      enabled: true,
      matcher: {
        path: path || undefined,
        method: method === 'ANY' ? undefined : method,
        header: testHeaders ? Object.fromEntries(testHeaders.split('\n').map(l => l.split(':').map(s => s.trim()) as [string, string])) : undefined,
      },
      service,
      action,
      fallbackService: fallback || undefined,
      retries,
    }
    federationRouter.addRule(rule)
  }

  const onTest = () => {
    const headers = Object.fromEntries(testHeaders.split('\n').filter(Boolean).map(l => l.split(':').map(s => s.trim()) as [string, string])) as Record<string, string>
    const headersLower: Record<string, string> = {}
    for (const [k, v] of Object.entries(headers)) headersLower[k.toLowerCase()] = v
    const m = federationRouter.match(testMethod, testPath, headersLower, [])
    const all = federationRouter.matchAll(testMethod, testPath, headersLower, [])
    setMatchResult(JSON.stringify({ matched: m ?? null, all: all.map(r => ({ id: r.id, name: r.name, action: r.action })) }, null, 2))
  }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">路由规则</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Name"><input className={inputClass} value={name} onChange={e => setName(e.target.value)} /></Field>
          <Field label="Path">
            <input className={inputClass} value={path} onChange={e => setPath(e.target.value)} placeholder="/api/v1/*" />
          </Field>
          <Field label="Method">
            <select className={inputClass} value={method} onChange={e => setMethod(e.target.value)}>
              <option>ANY</option><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
            </select>
          </Field>
          <Field label="Service">
            <select className={inputClass} value={service} onChange={e => setService(e.target.value)}>
              {services.length === 0 && <option value="users">users (未注册)</option>}
              {services.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Action">
            <select className={inputClass} value={action} onChange={e => setAction(e.target.value as RouteRule['action'])}>
              <option>route</option><option>fallback</option><option>mirror</option><option>reject</option>
            </select>
          </Field>
          <Field label="Fallback (可选)"><input className={inputClass} value={fallback} onChange={e => setFallback(e.target.value)} /></Field>
          <Field label="Retries"><input className={inputClass} type="number" value={retries} onChange={e => setRetries(Number(e.target.value))} /></Field>
        </div>
        <div className="mt-3 flex gap-2">
          <Btn onClick={onAdd} variant="primary">+ Add Rule</Btn>
          <Btn onClick={() => federationRouter.clear()}>清空</Btn>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">测试匹配</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Method">
            <select className={inputClass} value={testMethod} onChange={e => setTestMethod(e.target.value)}>
              <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
            </select>
          </Field>
          <Field label="Path"><input className={inputClass} value={testPath} onChange={e => setTestPath(e.target.value)} /></Field>
          <Field label="Headers (k: v 每行)">
            <input className={inputClass} value={testHeaders} onChange={e => setTestHeaders(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3"><Btn onClick={onTest} variant="primary">Match</Btn></div>
        {matchResult && <pre className="mt-3 p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap break-all">{matchResult}</pre>}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">当前规则 ({rules.length})</h3>
        <div className="space-y-1 text-xs">
          {rules.length === 0 && <p className="text-slate-400">(空)</p>}
          {rules.map(r => (
            <div key={r.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px]">P{r.priority}</span>
              <span className="font-medium text-slate-800">{r.name}</span>
              <span className="font-mono text-slate-500 text-[10px]">
                {r.matcher.method || 'ANY'} {r.matcher.path || '*'} → {r.service}
              </span>
              <span className="ml-auto px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px]">{r.action}</span>
              {r.fallbackService && <span className="text-slate-500 text-[10px]">fallback={r.fallbackService}</span>}
              {!r.enabled && <span className="px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded text-[10px]">disabled</span>}
              <button onClick={() => federationRouter.removeRule(r.id)} className="text-rose-500 hover:text-rose-700 text-[10px]">×</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============== Circuit Tab ==============

function CircuitTab({ tick }: { tick: number }) {
  void tick
  const states = circuitBreakers.states_()
  const [targetSvc, setTargetSvc] = useState('')
  const services = serviceRegistry.list()

  const onTrip = () => {
    if (!targetSvc) return
    circuitBreakers.forceOpen(targetSvc)
  }
  const onReset = () => {
    if (targetSvc) circuitBreakers.reset(targetSvc)
    else circuitBreakers.reset()
  }
  const onInjectFailure = (svcId: string) => {
    const svc = serviceRegistry.get(svcId)
    if (!svc?.circuit) return
    circuitBreakers.recordFailure(svcId, svc.circuit)
  }
  const onInjectSuccess = (svcId: string) => {
    circuitBreakers.recordSuccess(svcId)
  }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">熔断器控制</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Target Service ID">
            <select className={inputClass} value={targetSvc} onChange={e => setTargetSvc(e.target.value)}>
              <option value="">(选择)</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
            </select>
          </Field>
          <div className="flex items-end gap-2 md:col-span-2">
            <Btn onClick={onTrip} disabled={!targetSvc}>Force OPEN</Btn>
            <Btn onClick={onReset}>Reset</Btn>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">所有熔断器状态 ({Object.keys(states).length})</h3>
        <div className="space-y-1.5 text-xs">
          {Object.keys(states).length === 0 && <p className="text-slate-400">(空) — 注册服务后会显示</p>}
          {Object.entries(states).map(([id, s]) => {
            const svc = serviceRegistry.get(id)
            return (
              <div key={id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  s.state === 'CLOSED' ? 'bg-emerald-100 text-emerald-700' :
                  s.state === 'OPEN' ? 'bg-rose-100 text-rose-700' :
                  'bg-amber-100 text-amber-700'
                }`}>{s.state}</span>
                <span className="font-medium text-slate-800">{svc?.name ?? id}</span>
                <span className="text-slate-500">fail={s.failures} · succ={s.successes}</span>
                {s.halfOpenTrials > 0 && <span className="text-amber-600 text-[10px]">trials={s.halfOpenTrials}</span>}
                <div className="ml-auto flex gap-1">
                  <button onClick={() => onInjectFailure(id)} className="px-1.5 py-0.5 text-[10px] bg-rose-100 text-rose-700 rounded hover:bg-rose-200">+1 fail</button>
                  <button onClick={() => onInjectSuccess(id)} className="px-1.5 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200">+1 succ</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">负载均衡演示</h3>
        <p className="text-xs text-slate-500 mb-2">对每个算法做 10 次 pick，统计分布</p>
        <LBDemo />
      </div>
    </section>
  )
}

function LBDemo() {
  const [algo, setAlgo] = useState<LoadBalanceAlgo>('round-robin')
  const services = serviceRegistry.list().slice(0, 4)
  const [results, setResults] = useState<Record<string, number>>({})

  const run = () => {
    const r: Record<string, number> = {}
    if (services.length === 0) { setResults({}); return }
    for (let i = 0; i < 20; i++) {
      const p = loadBalancer.pick(services, algo, { key: `u${i}` })
      if (p) r[p.id] = (r[p.id] ?? 0) + 1
    }
    setResults(r)
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <select className={inputClass} value={algo} onChange={e => setAlgo(e.target.value as LoadBalanceAlgo)}>
          <option>round-robin</option>
          <option>weighted</option>
          <option>least-conn</option>
          <option>consistent-hash</option>
          <option>random</option>
        </select>
        <Btn onClick={run} variant="primary">× 20 pick</Btn>
      </div>
      {Object.keys(results).length > 0 && (
        <div className="mt-3 space-y-1 text-xs">
          {Object.entries(results).map(([id, n]) => {
            const svc = serviceRegistry.get(id)
            return (
              <div key={id} className="flex items-center gap-2">
                <span className="w-32 text-slate-700 truncate">{svc?.name ?? id}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-indigo-500" style={{ width: `${(n / 20) * 100}%` }} />
                </div>
                <span className="font-mono w-8 text-right">{n}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ============== Stitch Tab ==============

function StitchTab({ tick }: { tick: number }) {
  const [, setTick] = useState(0)
  void tick
  const [service, setService] = useState('analytics')
  const [sdl, setSdl] = useState('type Query { events: [Event!]!, topUsers(limit: Int!): [User!]! }\ntype Event { id: ID!, name: String!, ts: Float! }\ntype User { id: ID!, name: String! }')

  const stitchResult = useMemo(() => graphqlStitcher.stitch(), [tick, sdl, service])

  const onAdd = () => {
    graphqlStitcher.addSubgraph({ service, sdl })
  }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">GraphQL 子图聚合</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Service Name"><input className={inputClass} value={service} onChange={e => setService(e.target.value)} /></Field>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-500">SDL</label>
            <textarea
              className={`${inputClass} font-mono text-xs h-20 mt-1`}
              value={sdl}
              onChange={e => setSdl(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Btn onClick={onAdd} variant="primary">+ Add Subgraph</Btn>
          <Btn onClick={() => {
            graphqlStitcher.removeSubgraph(service)
            setTick(x => x + 1)
          }}>Remove "{service}"</Btn>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">统一 Schema ({stitchResult.services.length} 子图)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div>
            <h4 className="font-semibold text-slate-700 mb-1">Query ({stitchResult.queries.length})</h4>
            <div className="space-y-1">
              {stitchResult.queries.map(q => (
                <div key={q.name} className="flex items-center gap-2">
                  <span className="text-indigo-600 font-mono">{q.name}</span>
                  <span className="text-slate-400 text-[10px]">→ {q.service}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-slate-700 mb-1">Mutation ({stitchResult.mutations.length})</h4>
            <div className="space-y-1">
              {stitchResult.mutations.map(m => (
                <div key={m.name} className="flex items-center gap-2">
                  <span className="text-purple-600 font-mono">{m.name}</span>
                  <span className="text-slate-400 text-[10px]">→ {m.service}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-semibold text-slate-700 mb-1">Types ({stitchResult.types.length})</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
              {stitchResult.types.map(t => (
                <div key={t.name} className="text-slate-700 flex items-center gap-1">
                  <span className="font-mono text-indigo-700">{t.name}</span>
                  <span className="text-slate-400 text-[10px]">·{t.service}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============== Request Tab ==============

function RequestTab({ tick }: { tick: number }) {
  void tick
  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('/api/v1/users/me')
  const [shouldFail, setShouldFail] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; status: number; data?: unknown; error?: string; service?: string; viaFallback: boolean; circuitState?: CircuitState; latencyMs: number } | null>(null)
  const [busy, setBusy] = useState(false)

  const onSend = async () => {
    setBusy(true)
    const r = await federatedRequest(
      { method, path },
      async () => {
        if (shouldFail) throw new Error('mock 500')
        return { status: 200, data: { ok: true, ts: Date.now(), path } }
      }
    )
    setResult(r)
    setBusy(false)
  }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">请求模拟</h2>
        <p className="text-xs text-slate-500 mb-3">先在「路由规则」中加规则 + 在「服务注册」中注册 service</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Method">
            <select className={inputClass} value={method} onChange={e => setMethod(e.target.value)}>
              <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
            </select>
          </Field>
          <Field label="Path"><input className={inputClass} value={path} onChange={e => setPath(e.target.value)} /></Field>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <label className="text-xs flex items-center gap-1">
            <input type="checkbox" checked={shouldFail} onChange={e => setShouldFail(e.target.checked)} />
            模拟失败 (触发 fallback / circuit)
          </label>
          <Btn onClick={onSend} variant="primary" disabled={busy}>{busy ? '…' : 'Send'}</Btn>
        </div>
      </div>

      {result && (
        <div className={`rounded-2xl p-4 text-xs font-mono overflow-x-auto ${result.ok ? 'bg-slate-900 text-slate-100' : 'bg-rose-900 text-rose-50'}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={result.ok ? 'text-emerald-300' : 'text-rose-300'}>
              {result.ok ? '✓' : '✗'} {result.status}
            </span>
            {result.service && <span className="text-cyan-300">via {result.service}</span>}
            {result.viaFallback && <span className="text-amber-300">[fallback]</span>}
            {result.circuitState && <span className="text-purple-300">[cb={result.circuitState}]</span>}
            <span className="text-slate-400 ml-auto">{result.latencyMs.toFixed(2)}ms</span>
          </div>
          {result.error && <div className="mt-2 text-rose-200">error: {result.error}</div>}
          {result.ok && result.data !== undefined && (
            <pre className="mt-2 whitespace-pre-wrap break-all">{JSON.stringify(result.data, null, 2)}</pre>
          )}
        </div>
      )}
    </section>
  )
}

// ============== Metrics Tab ==============

function MetricsTab({ tick }: { tick: number }) {
  void tick
  const snap = federationMetrics.snapshot()
  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">联邦指标</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <Stat label="总请求" value={snap.totalRequests} />
          <Stat label="总错误" value={snap.totalErrors} />
          <Stat label="错误率" value={`${(snap.errorRate * 100).toFixed(1)}%`} />
          <Stat label="重试" value={snap.totalRetries} />
          <Stat label="CB 跳闸" value={snap.totalCircuitTrips} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">按服务</h3>
        <div className="space-y-1 text-xs">
          {Object.keys(snap.byService).length === 0 && <p className="text-slate-400">(空) — 跑一些请求后会显示</p>}
          {Object.entries(snap.byService).map(([svc, m]) => (
            <div key={svc} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
              <span className="font-medium text-slate-800 w-24 truncate">{svc}</span>
              <span className="text-slate-600">req={m.requests}</span>
              <span className="text-rose-600">err={m.errors}</span>
              <span className="text-amber-600">retry={m.retries}</span>
              <span className="text-emerald-600">avg={m.avgLatency.toFixed(1)}ms</span>
              <span className="text-amber-600">p95={m.p95.toFixed(1)}</span>
              <span className="text-rose-600">p99={m.p99.toFixed(1)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 bg-slate-50 rounded-xl">
      <div className="text-slate-500 text-[10px] mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-800 font-mono">{value}</div>
    </div>
  )
}

// ============== Sidebar ==============

function Sidebar({ tick }: { tick: number }) {
  void tick
  const s = summarizeFederation()
  return (
    <aside className="space-y-3 text-xs">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">联邦快照</h3>
        <Row k="已注册服务" v={String(s.services)} />
        <Row k="健康" v={`${s.healthy} / ${s.services}`} />
        <Row k="不健康" v={String(s.unhealthy)} />
        <Row k="路由规则" v={String(s.rules)} />
        <Row k="熔断器" v={String(s.circuits)} />
        <Row k="子图" v={String(s.subgraphs)} />
        <hr className="my-2 border-slate-100" />
        <Row k="总请求" v={String(s.metrics.totalRequests)} />
        <Row k="错误率" v={`${(s.metrics.errorRate * 100).toFixed(1)}%`} />
        <Row k="重试" v={String(s.metrics.totalRetries)} />
        <Row k="CB 跳闸" v={String(s.metrics.totalCircuitTrips)} />
      </div>
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-4">
        <h3 className="text-xs font-semibold text-indigo-800 mb-1">v27.0 能力</h3>
        <ul className="text-[11px] text-indigo-700 space-y-0.5">
          <li>· Service Registry (name/tag/region)</li>
          <li>· Health Checker (active probing)</li>
          <li>· LB: RR / Weighted / Least-Conn</li>
          <li>· LB: Consistent-Hash / Random</li>
          <li>· Circuit Breaker (CLOSED/OPEN/HALF)</li>
          <li>· Retry + Exp Backoff + Jitter</li>
          <li>· Router (path/method/header/tag)</li>
          <li>· GraphQL Stitcher (多子图)</li>
          <li>· Federation Metrics (per-svc)</li>
          <li>· federatedRequest (含 fallback)</li>
        </ul>
      </div>
    </aside>
  )
}

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
          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
          : 'bg-white border border-slate-200 text-slate-700 hover:border-indigo-300'
      }`}
    >
      {children}
    </button>
  )
}

const inputClass = 'w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none'

// ============== Seed data ==============

function seedDemo(): void {
  const baseServices: Omit<Service, 'createdAt'>[] = [
    { id: 'auth-1', name: 'auth', url: 'http://auth.svc:8080', protocol: 'http', region: 'CN', tags: ['core'], weight: 1, metadata: {} },
    { id: 'auth-2', name: 'auth', url: 'http://auth-us.svc:8080', protocol: 'http', region: 'US', tags: ['core'], weight: 1, metadata: {} },
    { id: 'shop-1', name: 'shop', url: 'http://shop.svc:8080', protocol: 'http', region: 'CN', tags: ['product'], weight: 2, metadata: {} },
    { id: 'shop-backup-1', name: 'shop-backup', url: 'http://shop-bk.svc:8080', protocol: 'http', region: 'US', tags: ['product'], weight: 1, metadata: {} },
    { id: 'users-1', name: 'users', url: 'http://users.svc:8080', protocol: 'graphql', region: 'CN', tags: ['user'], weight: 1, metadata: {} },
  ]
  for (const s of baseServices) {
    serviceRegistry.register({
      ...s,
      healthCheck: { path: '/health', intervalMs: 30_000, timeoutMs: 2000 },
      circuit: { failureThreshold: 3, cooldownMs: 10_000, halfOpenMaxTrials: 1 },
    })
    healthChecker.setStatus({
      serviceId: s.id, serviceName: s.name, status: 'healthy',
      latencyMs: Math.random() * 30 + 5, lastCheck: Date.now(),
      consecutiveFailures: 0, consecutiveSuccesses: 100, uptime: 0.99, checks: 100,
    })
  }
  federationRouter.addRule({ id: 'seed-1', name: 'auth', priority: 1, enabled: true, matcher: { path: '/auth/*' }, service: 'auth', action: 'route' })
  federationRouter.addRule({ id: 'seed-2', name: 'shop', priority: 2, enabled: true, matcher: { path: '/shop/*' }, service: 'shop', action: 'route', fallbackService: 'shop-backup', retries: 1 })
  federationRouter.addRule({ id: 'seed-3', name: 'api v1', priority: 3, enabled: true, matcher: { path: '/api/v1/*' }, service: 'users', action: 'route' })
}

function seedSubgraphs(): void {
  graphqlStitcher.addSubgraph({
    service: 'auth',
    sdl: 'type Query { me: User, login(token: String): String, logout: Boolean } type User { id: ID, name: String, email: String }',
  })
  graphqlStitcher.addSubgraph({
    service: 'shop',
    sdl: 'type Query { products(limit: Int): [Product!]!, product(id: ID!): Product } type Mutation { addToCart(productId: ID!, qty: Int!): Cart! } type Product { id: ID!, name: String!, price: Float! } type Cart { id: ID!, items: [CartItem!]! } type CartItem { productId: ID!, qty: Int! }',
  })
  graphqlStitcher.addSubgraph({
    service: 'users',
    sdl: 'type Query { user(id: ID!): User, searchUsers(q: String!): [User!]! } type User { id: ID!, name: String!, avatar: String }',
  })
}
