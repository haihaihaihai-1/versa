import { useEffect, useState, useMemo, useCallback } from 'react'
import { CacheLayer, type EvictionPolicy } from './index'

const cache = new CacheLayer({ maxSize: 100, defaultTtlMs: 30_000 })

export default function CachePage() {
  const [tab, setTab] = useState<'playground' | 'policies' | 'namespaces' | 'singleflight' | 'memoize' | 'invalidations' | 'stats'>('playground')
  const [, force] = useState(0)
  const refresh = useCallback(() => force(x => x + 1), [])

  useEffect(() => {
    const off = cache.subscribe(() => refresh())
    return () => off()
  }, [refresh])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">Cache Layer</h1>
            <p className="text-slate-400 text-sm mt-1">v49.0 · LRU/LFU/FIFO/TTL · Namespaces · Tags · Singleflight · Stale-while-revalidate · Bus</p>
          </div>
          <div className="text-xs text-slate-500">{cache.getStats().keys} keys · {(cache.getStats().hitRate * 100).toFixed(0)}% hit rate</div>
        </div>

        <div className="flex gap-1 mb-4 border-b border-slate-800 overflow-auto">
          {(['playground', 'policies', 'namespaces', 'singleflight', 'memoize', 'invalidations', 'stats'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={'px-4 py-2 text-sm font-medium whitespace-nowrap ' + (tab === t ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-200')}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'playground' && <Playground onAct={refresh} />}
        {tab === 'policies' && <Policies onAct={refresh} />}
        {tab === 'namespaces' && <NamespacesView onAct={refresh} />}
        {tab === 'singleflight' && <SingleflightView onAct={refresh} />}
        {tab === 'memoize' && <MemoizeView onAct={refresh} />}
        {tab === 'invalidations' && <InvalidationsView onAct={refresh} />}
        {tab === 'stats' && <StatsView />}
      </div>
    </div>
  )
}

function Playground({ onAct }: { onAct: () => void }) {
  const [key, setKey] = useState('user:1')
  const [val, setVal] = useState('Alice')
  const [ttl, setTtl] = useState('30')
  const [ns, setNs] = useState('default')
  const [tag, setTag] = useState('')
  const [result, setResult] = useState<unknown>(undefined)
  const [log, setLog] = useState<string[]>([])

  const set = () => {
    let parsed: unknown = val
    try { parsed = JSON.parse(val) } catch { /* keep as string */ }
    cache.set(key, parsed, { ttlMs: Number(ttl), namespace: ns, tags: tag ? tag.split(',').map(t => t.trim()) : [] })
    setLog(l => [...l.slice(-19), `SET ${ns}::${key} = ${val}`])
    onAct()
  }
  const get = () => {
    const v = cache.get(key, ns)
    setResult(v)
    setLog(l => [...l.slice(-19), `GET ${ns}::${key} → ${JSON.stringify(v)}`])
    onAct()
  }
  const del = () => {
    cache.delete(key, ns)
    setLog(l => [...l.slice(-19), `DEL ${ns}::${key}`])
    setResult(undefined)
    onAct()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
        <h3 className="text-cyan-300 font-semibold">Operation</h3>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Namespace" value={ns} onChange={setNs} />
          <Field label="Key" value={key} onChange={setKey} />
          <Field label="Value (JSON)" value={val} onChange={setVal} />
          <Field label="TTL (ms)" value={ttl} onChange={setTtl} />
          <Field label="Tags (csv)" value={tag} onChange={setTag} />
        </div>
        <div className="flex gap-2">
          <button onClick={set} className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded text-sm">SET</button>
          <button onClick={get} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded text-sm">GET</button>
          <button onClick={del} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-sm">DEL</button>
        </div>
        {result !== undefined && <div className="bg-slate-950 border border-slate-800 rounded p-2"><pre className="text-emerald-300 text-xs overflow-auto max-h-40">{JSON.stringify(result, null, 2)}</pre></div>}
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-cyan-300 font-semibold mb-2">Log</h3>
        <div className="bg-slate-950 border border-slate-800 rounded max-h-96 overflow-auto">
          {log.length === 0 ? <div className="text-slate-500 text-sm p-3">No operations yet.</div> : log.slice().reverse().map((l, i) => <div key={i} className="px-3 py-1 text-xs font-mono border-b border-slate-800 last:border-0 text-slate-300">{l}</div>)}
        </div>
      </div>
    </div>
  )
}

function Policies({ onAct }: { onAct: () => void }) {
  const localCache = useMemo(() => new CacheLayer({ maxSize: 3, defaultTtlMs: 60_000 }), [])
  const [policy, setPolicy] = useState<EvictionPolicy>('lru')
  const [fill, setFill] = useState('a,b,c,d,e')

  const usePolicy = (p: EvictionPolicy) => {
    setPolicy(p)
    localCache.setPolicy(p)
    const keys = fill.split(',').map(s => s.trim()).filter(Boolean)
    localCache.clear()
    for (const k of keys) localCache.set(k, k.toUpperCase())
    onAct()
  }
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
        <h3 className="text-cyan-300 font-semibold">Eviction demo (max=3)</h3>
        <Field label="Keys (csv)" value={fill} onChange={setFill} />
        <div className="flex gap-2">
          {(['lru', 'lfu', 'fifo', 'ttl'] as const).map(p => (
            <button key={p} onClick={() => usePolicy(p)} className={'px-3 py-1.5 rounded text-sm ' + (policy === p ? 'bg-cyan-500 text-slate-900' : 'bg-slate-800 text-slate-300')}>{p.toUpperCase()}</button>
          ))}
        </div>
        <div className="text-xs text-slate-400">Keys inserted in order, evictions may differ by policy.</div>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-cyan-300 font-semibold mb-2">Cache state</h3>
        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
          {['a', 'b', 'c', 'd', 'e'].map(k => (
            <div key={k} className={'border rounded p-2 ' + (localCache.has(k) ? 'bg-slate-950 border-emerald-700' : 'bg-slate-900/40 border-slate-800 opacity-40')}>
              <div className="text-xs text-slate-500">{k}</div>
              <div className="text-sm font-mono">{localCache.has(k) ? localCache.get<string>(k) : '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NamespacesView({ onAct }: { onAct: () => void }) {
  const [ns, setNs] = useState('users')
  const seed = () => {
    cache.set('1', { name: 'Alice' }, { namespace: 'users' })
    cache.set('2', { name: 'Bob' }, { namespace: 'users' })
    cache.set('1', { title: 'Hello' }, { namespace: 'posts' })
    cache.set('2', { title: 'World' }, { namespace: 'posts' })
    onAct()
  }
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-cyan-300 font-semibold mb-3">Namespace viewer</h3>
        <div className="flex gap-2 mb-3">
          <button onClick={seed} className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded text-sm">Seed (users + posts)</button>
          <Field label="Active namespace" value={ns} onChange={setNs} />
          <button onClick={() => { cache.clear(ns); onAct() }} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-sm">Clear "{ns}"</button>
        </div>
        <div className="space-y-2">
          {cache.listNamespaces().map(n => (
            <div key={n} className="bg-slate-950 border border-slate-800 rounded p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-cyan-300 font-mono">{n}</span>
                <span className="text-xs text-slate-500">{cache.namespaceSize(n)} keys</span>
              </div>
              <div className="text-xs text-slate-300 font-mono">{cache.namespaceKeys(n).join(', ')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SingleflightView({ onAct }: { onAct: () => void }) {
  const [key, setKey] = useState('user:42')
  const [value, setValue] = useState<string>('—')
  const [log, setLog] = useState<string[]>([])
  const fire = async () => {
    const t0 = Date.now()
    const r = await Promise.all([
      cache.singleflight(key, async () => { await new Promise(r => setTimeout(r, 100)); return 'computed-' + Date.now() }),
      cache.singleflight(key, async () => { await new Promise(r => setTimeout(r, 100)); return 'computed-' + Date.now() }),
      cache.singleflight(key, async () => { await new Promise(r => setTimeout(r, 100)); return 'computed-' + Date.now() })
    ])
    setValue(r[0].value)
    setLog(l => [...l.slice(-9), `${Date.now() - t0}ms · 3 concurrent · value=${r[0].value} (computedBy=${r[0].computedBy}, #2=${r[1].computedBy})`])
    onAct()
  }
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
        <h3 className="text-cyan-300 font-semibold">Stampede protection</h3>
        <Field label="Key" value={key} onChange={setKey} />
        <button onClick={fire} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded">Fire 3 concurrent calls</button>
        <div className="text-sm text-slate-300">Result: <span className="text-emerald-300 font-mono">{value}</span></div>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-cyan-300 font-semibold mb-2">Trace</h3>
        <div className="bg-slate-950 border border-slate-800 rounded max-h-64 overflow-auto">
          {log.length === 0 ? <div className="text-slate-500 text-xs p-3">Click to test.</div> : log.slice().reverse().map((l, i) => <div key={i} className="px-3 py-1 text-xs font-mono border-b border-slate-800 last:border-0 text-slate-300">{l}</div>)}
        </div>
      </div>
    </div>
  )
}

function MemoizeView({ onAct }: { onAct: () => void }) {
  const [n, setN] = useState('5')
  const [calls, setCalls] = useState(0)
  const [result, setResult] = useState<number | null>(null)
  const memoFib = useMemo(() => cache.memoize((x: number): number => { setCalls(c => c + 1); return x < 2 ? x : memoFib(x - 1) + memoFib(x - 2) }, { keyFn: x => 'fib:' + x }), [])
  const run = () => {
    const v = memoFib(Number(n))
    setResult(v)
    onAct()
  }
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
        <h3 className="text-cyan-300 font-semibold">Memoized Fibonacci</h3>
        <div className="flex gap-2">
          <Field label="N" value={n} onChange={setN} />
          <button onClick={run} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded self-end">Compute</button>
        </div>
        {result !== null && <div className="text-sm text-slate-300">fib({n}) = <span className="text-emerald-300 font-mono">{result}</span></div>}
        <div className="text-xs text-slate-400">Fn body called <span className="text-amber-300">{calls}</span>×</div>
      </div>
    </div>
  )
}

function InvalidationsView({ onAct }: { onAct: () => void }) {
  const [pattern, setPattern] = useState('user:*')
  const [tag, setTag] = useState('hot')
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
        <h3 className="text-cyan-300 font-semibold">Seed batch</h3>
        <button onClick={() => {
          cache.set('user:1', { name: 'A' }, { tags: ['hot'] })
          cache.set('user:2', { name: 'B' }, { tags: ['hot', 'admin'] })
          cache.set('user:3', { name: 'C' }, { tags: ['cold'] })
          cache.set('post:1', { name: 'P1' }, { tags: ['hot'] })
          onAct()
        }} className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded text-sm">Seed 4 entries</button>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
        <h3 className="text-cyan-300 font-semibold">By pattern</h3>
        <div className="flex gap-2">
          <Field label="Pattern" value={pattern} onChange={setPattern} />
          <button onClick={() => { cache.invalidateByPattern(pattern); onAct() }} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-sm self-end">Invalidate</button>
        </div>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
        <h3 className="text-cyan-300 font-semibold">By tag</h3>
        <div className="flex gap-2">
          <Field label="Tag" value={tag} onChange={setTag} />
          <button onClick={() => { cache.invalidateByTag(tag); onAct() }} className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded text-sm self-end">Invalidate</button>
        </div>
      </div>
    </div>
  )
}

function StatsView() {
  const m = cache.getStats()
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat label="Hits" value={m.hits} accent="emerald" />
      <Stat label="Misses" value={m.misses} />
      <Stat label="Hit rate" value={(m.hitRate * 100).toFixed(1) + '%'} accent="cyan" />
      <Stat label="Keys" value={m.keys} />
      <Stat label="Bytes" value={m.bytes} />
      <Stat label="Sets" value={m.sets} />
      <Stat label="Gets" value={m.gets} />
      <Stat label="Deletes" value={m.deletes} />
      <Stat label="Evictions" value={m.evictions} accent="amber" />
      <Stat label="Expirations" value={m.expirations} />
      <Stat label="Invalidations" value={m.invalidations} />
      <Stat label="Namespaces" value={m.namespaces} />
      <div className="col-span-2 lg:col-span-4 bg-slate-900 rounded-lg p-4 border border-slate-800">
        <div className="text-xs text-slate-400 uppercase mb-2">By namespace</div>
        <div className="space-y-1">
          {Object.entries(m.byNamespace).map(([n, s]) => (
            <div key={n} className="flex items-center gap-3 text-sm">
              <span className="w-24 text-cyan-300 font-mono">{n}</span>
              <span className="text-emerald-300">{s.hits} hits</span>
              <span className="text-slate-400">{s.misses} misses</span>
              <span className="text-amber-300">{s.sets} sets</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: 'amber' | 'emerald' | 'red' | 'cyan' }) {
  const color = accent === 'amber' ? 'text-amber-400' : accent === 'emerald' ? 'text-emerald-400' : accent === 'red' ? 'text-red-400' : accent === 'cyan' ? 'text-cyan-400' : 'text-slate-200'
  return <div className="bg-slate-900 rounded-lg p-4 border border-slate-800"><div className="text-xs text-slate-500 uppercase">{label}</div><div className={'text-2xl font-bold mt-1 ' + color}>{value}</div></div>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return <div><label className="text-xs text-slate-400 block mb-1">{label}</label><input value={value} onChange={e => onChange(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-emerald-300" /></div>
}
