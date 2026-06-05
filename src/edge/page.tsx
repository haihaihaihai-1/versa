/**
 * Versa · Edge Computing Playground (v26.0)
 * - GeoIP / Cache / Function Sandbox / KV / Rate Limit / Router / Metrics
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  detectRegion, edgeCache, validateEdgeCode, runEdgeFunction, edgeKV,
  edgeRateLimiter, edgeRouter, edgeMetrics, prefetchEngine, summarizeEdge,
  buildEdgeRequest, cachedFetch, type EdgeFunctionResult, type RoutingRule,
} from './index'

type Tab = 'cache' | 'function' | 'kv' | 'router' | 'rate' | 'metrics'

const SAMPLE_FNS: { name: string; code: string }[] = [
  {
    name: 'Echo 输入',
    code: 'console.log("输入:", input); return { echoed: input, at: Date.now() }',
  },
  {
    name: 'A/B 分流',
    code: `
const variant = input.userId % 2 === 0 ? 'A' : 'B'
const weights = { A: 0.6, B: 0.4 }
return { variant, recommend: variant === 'A' ? 'cta-blue' : 'cta-red', weight: weights[variant] }
`.trim(),
  },
  {
    name: 'Geo 改价',
    code: `
const geo = ctx?.geo?.region || 'OTHER'
const base = input.price
const surcharge = geo === 'CN' ? 0 : geo === 'US' ? 0.1 : 0.05
return { base, region: geo, final: +(base * (1 + surcharge)).toFixed(2), surcharge }
`.trim(),
  },
  {
    name: 'AEO 富结果',
    code: `
const items = (input.results || []).slice(0, 5)
return {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: items.map((r, i) => ({
    '@type': 'ListItem', position: i + 1,
    item: { '@type': 'Product', name: r.title, url: r.url },
  })),
}
`.trim(),
  },
]

export function EdgePage() {
  const [tab, setTab] = useState<Tab>('cache')
  const [geo, setGeo] = useState(() => detectRegion())
  const [snapshot, setSnapshot] = useState(() => summarizeEdge())

  useEffect(() => {
    const t = setInterval(() => setSnapshot(summarizeEdge()), 1500)
    return () => clearInterval(t)
  }, [])

  const refreshGeo = () => setGeo(detectRegion())

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50/30 to-blue-50/30 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            Edge Computing · v26.0
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            浏览器侧边缘计算层 · GeoIP · Cache · Sandbox · KV · RateLimit · Router · Metrics
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-full bg-cyan-100 text-cyan-700 font-medium">
              {geo.region} · {geo.city}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono">
              {geo.tz}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono">
              {geo.lang}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-mono">
              {geo.lat.toFixed(2)}, {geo.lon.toFixed(2)}
            </span>
            <button
              onClick={refreshGeo}
              className="px-2.5 py-1 rounded-full bg-white border border-slate-200 hover:border-cyan-300 text-slate-700"
            >
              重新探测
            </button>
          </div>
        </header>

        <nav className="mb-6 flex gap-2 border-b border-slate-200 overflow-x-auto">
          {([
            ['cache', 'Cache 边缘缓存'],
            ['function', 'Function 沙箱'],
            ['kv', 'KV 键值'],
            ['router', 'Router 路由'],
            ['rate', 'Rate 限流'],
            ['metrics', 'Metrics 指标'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === t ? 'border-cyan-600 text-cyan-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-6">
          <main>
            {tab === 'cache' && <CacheTab />}
            {tab === 'function' && <FunctionTab />}
            {tab === 'kv' && <KVTab />}
            {tab === 'router' && <RouterTab />}
            {tab === 'rate' && <RateTab />}
            {tab === 'metrics' && <MetricsTab />}
          </main>
          <Sidebar snapshot={snapshot} />
        </div>
      </div>
    </div>
  )
}

// ============== Cache Tab ==============

function CacheTab() {
  const [key, setKey] = useState('product:42')
  const [value, setValue] = useState(JSON.stringify({ id: 42, name: 'iPhone', price: 5999 }, null, 2))
  const [ttl, setTtl] = useState(60_000)
  const [swrTtl, setSwrTtl] = useState(30_000)
  const [tags, setTags] = useState('product,featured')
  const [result, setResult] = useState<{ hit: boolean; value: unknown; duration: number } | null>(null)
  const [keys, setKeys] = useState<string[]>([])

  const refresh = () => setKeys(edgeCache.keys())

  useEffect(refresh, [result])

  const onSet = () => {
    try {
      const parsed = JSON.parse(value)
      const tagList = tags.split(',').map(s => s.trim()).filter(Boolean)
      edgeCache.set(key, parsed, { ttl, swrTtl, tags: tagList })
      setResult({ hit: true, value: 'set OK', duration: 0 })
    } catch (e) {
      setResult({ hit: false, value: `JSON 解析失败: ${e instanceof Error ? e.message : e}`, duration: 0 })
    }
  }

  const onGet = () => {
    const start = performance.now()
    const v = edgeCache.get(key, { allowStale: true })
    setResult({ hit: v !== undefined, value: v, duration: performance.now() - start })
  }

  const onDelete = () => {
    const ok = edgeCache.delete(key)
    setResult({ hit: ok, value: ok ? 'deleted' : 'not found', duration: 0 })
  }

  const onInvalidateTag = (tag: string) => {
    const n = edgeCache.invalidateTag(tag)
    setResult({ hit: true, value: `tag "${tag}" 失效 ${n} 条`, duration: 0 })
  }

  const onInvalidatePattern = () => {
    const n = edgeCache.invalidatePattern(/^product:/)
    setResult({ hit: true, value: `pattern /^product:/ 失效 ${n} 条`, duration: 0 })
  }

  const onCachedFetch = async () => {
    const r = await cachedFetch(key, async () => {
      await new Promise(res => setTimeout(res, 50))
      return { id: 42, fetched: Date.now() }
    }, { ttl, swrTtl, tags: tags.split(',').map(s => s.trim()).filter(Boolean) })
    setResult({ hit: r.cached, value: r.data, duration: 0 })
  }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">EdgeCache · TTL / SWR / Tag / LRU</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Key">
            <input className={inputClass} value={key} onChange={e => setKey(e.target.value)} />
          </Field>
          <Field label="Tags (逗号分隔)">
            <input className={inputClass} value={tags} onChange={e => setTags(e.target.value)} />
          </Field>
          <Field label="TTL (ms)">
            <input className={inputClass} type="number" value={ttl} onChange={e => setTtl(Number(e.target.value))} />
          </Field>
          <Field label="SWR TTL (ms)">
            <input className={inputClass} type="number" value={swrTtl} onChange={e => setSwrTtl(Number(e.target.value))} />
          </Field>
        </div>
        <div className="mt-3">
          <label className="text-xs text-slate-500">Value (JSON)</label>
          <textarea
            className={`${inputClass} font-mono text-xs h-24 mt-1`}
            value={value}
            onChange={e => setValue(e.target.value)}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn onClick={onSet} variant="primary">Set</Btn>
          <Btn onClick={onGet}>Get</Btn>
          <Btn onClick={onDelete}>Delete</Btn>
          <Btn onClick={onCachedFetch}>cachedFetch (含 SWR)</Btn>
          <Btn onClick={onInvalidatePattern}>Invalidate /^product:/</Btn>
          {['product', 'featured'].map(t => (
            <Btn key={t} onClick={() => onInvalidateTag(t)}>Invalidate tag:{t}</Btn>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">缓存条目 ({edgeCache.size()})</h3>
        <div className="max-h-48 overflow-y-auto text-xs font-mono space-y-1">
          {keys.length === 0 && <p className="text-slate-400">(空)</p>}
          {keys.map(k => {
            const e = edgeCache.getEntry(k)
            return (
              <div key={k} className="flex items-center gap-2">
                <span className="text-cyan-600">{k}</span>
                {e?.tags && e.tags.length > 0 && (
                  <span className="text-slate-400">[{e.tags.join(', ')}]</span>
                )}
                <span className="ml-auto text-slate-400">
                  {e?.etag} · 剩 {Math.max(0, e!.expiresAt - Date.now())}ms
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {result && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 text-xs font-mono overflow-x-auto">
          <div className="text-cyan-300 mb-1">
            {result.hit ? '✓ hit' : '✗ miss'} {result.duration > 0 && `· ${result.duration.toFixed(2)}ms`}
          </div>
          <pre className="whitespace-pre-wrap break-all">{JSON.stringify(result.value, null, 2)}</pre>
        </div>
      )}
    </section>
  )
}

// ============== Function Tab ==============

function FunctionTab() {
  const [code, setCode] = useState(SAMPLE_FNS[0]!.code)
  const [input, setInput] = useState('{"userId": 12345, "name": "Alice"}')
  const [env, setEnv] = useState('API_KEY=demo-secret\nFLAG=vip')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<EdgeFunctionResult | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 100); return () => clearInterval(t) }, [])
  void tick

  const validation = useMemo(() => validateEdgeCode(code), [code])
  const parsedInput = useMemo(() => { try { return JSON.parse(input) } catch { return input } }, [input])
  const envMap = useMemo(() => {
    const out: Record<string, string> = {}
    for (const line of env.split('\n')) {
      const [k, ...rest] = line.split('=')
      if (k && rest.length) out[k.trim()] = rest.join('=').trim()
    }
    return out
  }, [env])

  const onRun = async () => {
    setRunning(true)
    const r = await runEdgeFunction({ id: 'play', name: 'play', code, env: envMap }, parsedInput, { req: buildEdgeRequest('/api/x'), env: envMap })
    setResult(r)
    setRunning(false)
  }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Edge Function · 沙箱执行</h2>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {SAMPLE_FNS.map(s => (
            <button
              key={s.name}
              onClick={() => setCode(s.code)}
              className="px-2.5 py-1 text-xs rounded-full bg-slate-100 hover:bg-cyan-100 text-slate-700"
            >
              {s.name}
            </button>
          ))}
        </div>
        <label className="text-xs text-slate-500">Code</label>
        <textarea
          className={`${inputClass} font-mono text-xs h-40 mt-1`}
          value={code}
          onChange={e => setCode(e.target.value)}
        />
        <div className="mt-2 text-xs">
          {validation.valid ? (
            <span className="text-emerald-600">✓ 静态校验通过{validation.warnings?.length ? ` · 警告: ${validation.warnings.join('; ')}` : ''}</span>
          ) : (
            <span className="text-rose-600">✗ {validation.reason}</span>
          )}
          <span className="ml-3 text-slate-400">大小 {code.length} / 10000</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="text-xs text-slate-500">Input (JSON)</label>
            <textarea
              className={`${inputClass} font-mono text-xs h-20 mt-1`}
              value={input}
              onChange={e => setInput(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500">Env (KEY=value 每行一个)</label>
            <textarea
              className={`${inputClass} font-mono text-xs h-20 mt-1`}
              value={env}
              onChange={e => setEnv(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <Btn onClick={onRun} variant="primary" disabled={!validation.valid || running}>
            {running ? '执行中…' : '▶ Run in sandbox'}
          </Btn>
        </div>
      </div>

      {result && (
        <div className={`rounded-2xl p-4 text-xs font-mono overflow-x-auto ${result.ok ? 'bg-slate-900 text-slate-100' : 'bg-rose-900 text-rose-50'}`}>
          <div className="text-cyan-300 mb-1">
            {result.ok ? '✓ ok' : '✗ error'} · {result.duration.toFixed(2)}ms
          </div>
          {result.error && <pre className="whitespace-pre-wrap text-rose-200">{result.error}</pre>}
          {result.ok && <pre className="whitespace-pre-wrap break-all">{JSON.stringify(result.value, null, 2)}</pre>}
          {result.logs.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="text-slate-400 mb-1">console.log:</div>
              {result.logs.map((l, i) => <div key={i} className="text-slate-300">{l}</div>)}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ============== KV Tab ==============

function KVTab() {
  const [key, setKey] = useState('user:42:profile')
  const [value, setValue] = useState('{"name": "Bob", "vip": true}')
  const [ttl, setTtl] = useState(3600)
  const [result, setResult] = useState<string>('')
  const [list, setList] = useState<{ name: string; value: string; metadata?: Record<string, string> }[]>([])

  const refresh = async () => {
    const r = await edgeKV.list()
    setList(await Promise.all(r.keys.map(async k => ({ name: k.name, value: (await edgeKV.get(k.name)) ?? '', metadata: k.metadata }))))
  }
  useEffect(() => { refresh() }, [])

  const onPut = async () => {
    await edgeKV.put(key, value, { expirationTtl: ttl, metadata: { source: 'ui' } })
    setResult(`put ${key} (ttl ${ttl}s)`)
    refresh()
  }
  const onGet = async () => {
    const r = await edgeKV.getWithMetadata(key)
    setResult(r.value === null ? '(not found)' : JSON.stringify(r, null, 2))
  }
  const onDelete = async () => {
    const ok = await edgeKV.delete(key)
    setResult(ok ? `deleted ${key}` : 'not found')
    refresh()
  }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Edge KV · 键值存储 (含 TTL)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Key">
            <input className={inputClass} value={key} onChange={e => setKey(e.target.value)} />
          </Field>
          <Field label="TTL (秒, 0=永不过期)">
            <input className={inputClass} type="number" value={ttl} onChange={e => setTtl(Number(e.target.value))} />
          </Field>
        </div>
        <div className="mt-3">
          <label className="text-xs text-slate-500">Value</label>
          <textarea
            className={`${inputClass} font-mono text-xs h-20 mt-1`}
            value={value}
            onChange={e => setValue(e.target.value)}
          />
        </div>
        <div className="mt-3 flex gap-2">
          <Btn onClick={onPut} variant="primary">Put</Btn>
          <Btn onClick={onGet}>Get (+metadata)</Btn>
          <Btn onClick={onDelete}>Delete</Btn>
        </div>
        {result && (
          <pre className="mt-3 p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap break-all">{result}</pre>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">所有键 ({list.length})</h3>
        <div className="max-h-56 overflow-y-auto text-xs font-mono space-y-1">
          {list.length === 0 && <p className="text-slate-400">(空)</p>}
          {list.map(k => (
            <div key={k.name} className="flex items-start gap-2">
              <span className="text-cyan-600 shrink-0">{k.name}</span>
              <span className="text-slate-700 truncate flex-1">{k.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============== Router Tab ==============

function RouterTab() {
  const [reqUrl, setReqUrl] = useState('/shop/iphone')
  const [reqHeaders, setReqHeaders] = useState('user-agent: Mobile\nx-country: CN')
  const [reqCookies, setReqCookies] = useState('role=user; flags=vip,beta')
  const [reqGeo, setReqGeo] = useState('CN')
  const [result, setResult] = useState<string>('')
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 2000); return () => clearInterval(t) }, [])

  const parseKV = (s: string): Record<string, string> => {
    const out: Record<string, string> = {}
    for (const line of s.split('\n')) {
      const idx = line.indexOf(':')
      if (idx > 0) out[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim()
    }
    return out
  }

  const matchNow = () => {
    const req = {
      url: reqUrl, method: 'GET',
      headers: parseKV(reqHeaders),
      cookies: parseKV(reqCookies),
      geo: { ...detectRegion(), region: reqGeo as 'CN' | 'US' | 'EU' | 'APAC' | 'OTHER' },
    }
    const m = edgeRouter.match(req)
    const all = edgeRouter.matchAll(req)
    setResult(JSON.stringify({ matched: m ?? null, total: all.length, rules: all.map(r => r.name) }, null, 2))
  }

  const addRule = (r: Omit<RoutingRule, 'id' | 'enabled' | 'priority'>) => {
    const id = `r${Date.now()}`
    edgeRouter.addRule({ ...r, id, enabled: true, priority: edgeRouter.size() + 1 })
    setTick(x => x + 1)
  }

  const removeRule = (id: string) => {
    edgeRouter.removeRule(id)
    setTick(x => x + 1)
  }

  const clearAll = () => {
    edgeRouter.clear()
    setTick(x => x + 1)
  }

  const rules = edgeRouter.listRules()
  void tick

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Edge Router · 匹配规则</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Request URL"><input className={inputClass} value={reqUrl} onChange={e => setReqUrl(e.target.value)} /></Field>
          <Field label="模拟 Geo (覆盖)">
            <select className={inputClass} value={reqGeo} onChange={e => setReqGeo(e.target.value)}>
              {['CN','US','EU','APAC','OTHER'].map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Headers (k: v 每行)">
            <textarea className={`${inputClass} font-mono text-xs h-20 mt-1`} value={reqHeaders} onChange={e => setReqHeaders(e.target.value)} />
          </Field>
          <Field label="Cookies (k=v 每行)">
            <textarea className={`${inputClass} font-mono text-xs h-20 mt-1`} value={reqCookies} onChange={e => setReqCookies(e.target.value)} />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn onClick={matchNow} variant="primary">匹配</Btn>
          <Btn onClick={() => addRule({ name: 'CN redirect', matcher: { type: 'geo', regions: ['CN'] }, action: 'rewrite', target: '/cn' })}>+ CN → /cn</Btn>
          <Btn onClick={() => addRule({ name: 'Mobile allow', matcher: { type: 'header', name: 'user-agent', op: 'contains', value: 'Mobile' }, action: 'allow' })}>+ Mobile UA</Btn>
          <Btn onClick={() => addRule({ name: 'VIP cookie', matcher: { type: 'cookie', name: 'flags', op: 'contains', value: 'vip' }, action: 'allow' })}>+ flags contains vip</Btn>
          <Btn onClick={clearAll}>清空</Btn>
        </div>
        {result && (
          <pre className="mt-3 p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono whitespace-pre-wrap break-all">{result}</pre>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">当前规则 ({rules.length})</h3>
        <div className="space-y-1 text-xs">
          {rules.length === 0 && <p className="text-slate-400">(空) — 点击上方按钮添加</p>}
          {rules.map(r => (
            <div key={r.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
              <span className="px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded text-[10px]">P{r.priority}</span>
              <span className="font-medium text-slate-700">{r.name}</span>
              <span className="text-slate-500 font-mono">
                {r.matcher.type === 'geo' ? `geo∈[${(r.matcher as { regions: string[] }).regions.join(',')}]` : ''}
                {r.matcher.type === 'header' ? `hdr.${(r.matcher as { name: string }).name}` : ''}
                {r.matcher.type === 'cookie' ? `cookie.${(r.matcher as { name: string }).name}` : ''}
              </span>
              <span className="ml-auto px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px]">{r.action}</span>
              <button onClick={() => removeRule(r.id)} className="text-rose-500 hover:text-rose-700 text-[10px]">×</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============== Rate Tab ==============

function RateTab() {
  const [key, setKey] = useState('user:42')
  const [cost, setCost] = useState(1)
  const [results, setResults] = useState<{ ts: number; allowed: boolean; remaining: number; retry?: number }[]>([])

  const burst = (n: number) => {
    const out: { ts: number; allowed: boolean; remaining: number; retry?: number }[] = []
    for (let i = 0; i < n; i++) {
      const r = edgeRateLimiter.take(key, cost)
      out.push({ ts: Date.now(), allowed: r.allowed, remaining: r.remaining, retry: r.retryAfterMs })
    }
    setResults(prev => [...out, ...prev].slice(0, 50))
  }

  const reset = () => { edgeRateLimiter.reset(key); setResults([]) }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800 mb-3">Token Bucket · 限流</h2>
        <p className="text-xs text-slate-500 mb-3">
          容量 {edgeRateLimiter.capacity} · 补充 {edgeRateLimiter.refillRate} tok/s · 演示默认 bucket
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Bucket Key"><input className={inputClass} value={key} onChange={e => setKey(e.target.value)} /></Field>
          <Field label="Cost per request"><input className={inputClass} type="number" value={cost} onChange={e => setCost(Number(e.target.value))} /></Field>
          <div className="flex items-end gap-2">
            <Btn onClick={() => burst(5)}>×5</Btn>
            <Btn onClick={() => burst(50)} variant="primary">×50 burst</Btn>
            <Btn onClick={reset}>Reset</Btn>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">最近请求 (50)</h3>
        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
          {results.map((r, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded text-[10px] flex items-center justify-center font-mono ${
                r.allowed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
              title={r.allowed ? `ok · rem=${r.remaining}` : `deny · retry=${r.retry}ms`}
            >
              {r.allowed ? '✓' : '✗'}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-2">绿=允许 · 红=拒绝</p>
      </div>
    </section>
  )
}

// ============== Metrics Tab ==============

function MetricsTab() {
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1000); return () => clearInterval(t) }, [])
  void tick

  const counters = edgeMetrics.countersAll()
  const gauges = edgeMetrics.gaugesAll()
  const histNames = edgeMetrics.histogramNames()

  const triggerDemo = () => {
    for (let i = 0; i < 20; i++) {
      edgeMetrics.observe('demo.latency', Math.random() * 200)
    }
    edgeMetrics.inc('demo.requests', Math.floor(Math.random() * 10))
    edgeMetrics.set('demo.queue', Math.floor(Math.random() * 100))
  }

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-800">Edge Metrics</h2>
          <div className="flex gap-2">
            <Btn onClick={triggerDemo}>注入 demo 指标</Btn>
            <Btn onClick={() => edgeMetrics.reset()}>Reset</Btn>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-slate-500 mb-1">Counters</div>
            <div className="text-2xl font-bold text-slate-800">{Object.keys(counters).length}</div>
            <div className="mt-1 font-mono text-[10px] text-slate-600 max-h-20 overflow-y-auto">
              {Object.entries(counters).slice(0, 6).map(([k, v]) => <div key={k}>{k}: <b>{v}</b></div>)}
              {Object.keys(counters).length > 6 && <div>... +{Object.keys(counters).length - 6}</div>}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-slate-500 mb-1">Gauges</div>
            <div className="text-2xl font-bold text-slate-800">{Object.keys(gauges).length}</div>
            <div className="mt-1 font-mono text-[10px] text-slate-600 max-h-20 overflow-y-auto">
              {Object.entries(gauges).slice(0, 6).map(([k, v]) => <div key={k}>{k}: <b>{v}</b></div>)}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <div className="text-slate-500 mb-1">Histograms</div>
            <div className="text-2xl font-bold text-slate-800">{histNames.length}</div>
            <div className="mt-1 font-mono text-[10px] text-slate-600 max-h-20 overflow-y-auto">
              {histNames.slice(0, 6).map(k => <div key={k}>{k}</div>)}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-2">直方图分位数</h3>
        <div className="space-y-2 text-xs font-mono">
          {histNames.length === 0 && <p className="text-slate-400">(空) — 点击"注入 demo 指标"</p>}
          {histNames.map(name => {
            const h = edgeMetrics.histogram(name)
            return (
              <div key={name} className="flex items-center gap-3">
                <span className="w-32 text-slate-600 truncate">{name}</span>
                <span className="text-emerald-600">p50 <b>{h.p50.toFixed(1)}</b></span>
                <span className="text-amber-600">p95 <b>{h.p95.toFixed(1)}</b></span>
                <span className="text-rose-600">p99 <b>{h.p99.toFixed(1)}</b></span>
                <span className="ml-auto text-slate-400">n={h.count} mean={h.mean.toFixed(1)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ============== Sidebar ==============

function Sidebar({ snapshot }: { snapshot: ReturnType<typeof summarizeEdge> }) {
  return (
    <aside className="space-y-3 text-xs">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">系统快照</h3>
        <Row k="Cache 命中" v={`${snapshot.cache.hits} / ${snapshot.cache.hits + snapshot.cache.misses}`} />
        <Row k="命中率" v={`${(snapshot.cache.hitRate * 100).toFixed(1)}%`} />
        <Row k="Cache 大小" v={String(snapshot.cache.size)} />
        <Row k="Cache 驱逐" v={String(snapshot.cache.evictions)} />
        <hr className="my-2 border-slate-100" />
        <Row k="KV 键数" v={String(snapshot.kv)} />
        <Row k="Rate buckets" v={String(snapshot.rate)} />
        <Row k="路由规则" v={String(snapshot.rules)} />
        <Row k="Prefetch 触发" v={String(snapshot.prefetch.triggered)} />
        <Row k="Prefetch 完成" v={String(snapshot.prefetch.completed)} />
        <Row k="Prefetch 失败" v={String(snapshot.prefetch.failed)} />
        <hr className="my-2 border-slate-100" />
        <Row k="Counters" v={String(snapshot.metrics.counters)} />
        <Row k="Gauges" v={String(snapshot.metrics.gauges)} />
        <Row k="Histograms" v={String(snapshot.metrics.histograms)} />
      </div>
      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border border-cyan-100 p-4">
        <h3 className="text-xs font-semibold text-cyan-800 mb-1">v26.0 能力</h3>
        <ul className="text-[11px] text-cyan-700 space-y-0.5">
          <li>· GeoIP (TZ+Lang)</li>
          <li>· Cache TTL/SWR/Tag/LRU</li>
          <li>· Function 沙箱 (10KB/无 eval)</li>
          <li>· KV 存储 + 列表/分页</li>
          <li>· Rate Limit (Token+Sliding)</li>
          <li>· Router (Geo/Header/Cookie)</li>
          <li>· Metrics (Hdr/Count/Gauge)</li>
          <li>· Prefetch (visible/hover/idle)</li>
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
          ? 'bg-cyan-600 text-white hover:bg-cyan-700'
          : 'bg-white border border-slate-200 text-slate-700 hover:border-cyan-300'
      }`}
    >
      {children}
    </button>
  )
}

const inputClass = 'w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-200 outline-none'
