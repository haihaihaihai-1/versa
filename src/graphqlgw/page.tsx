import { useEffect, useState, useMemo, useCallback } from 'react'
import { GraphQLGateway, type GraphQLUpstream, type ExecutionResult } from './index'

const gw = new GraphQLGateway()
gw.registerUpstream({ name: 'users-svc', schema: 'type User { id: ID, name: String, email: String }', fieldOwners: { 'Query.user': 'users-svc', 'Query.users': 'users-svc' }, execute: async (field, args) => {
  const db: Record<string, unknown> = { user: { id: 1, name: 'Alice', email: 'alice@example.com' }, users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Carol' }] }
  return db[field]
}, healthy: () => true })
gw.registerUpstream({ name: 'posts-svc', schema: 'type Post { id: ID, title: String, author: String }', fieldOwners: { 'Query.posts': 'posts-svc', 'Query.post': 'posts-svc' }, execute: async (field) => {
  const db: Record<string, unknown> = { posts: [{ id: 1, title: 'Hello World', author: 'Alice' }, { id: 2, title: 'GraphQL 101', author: 'Bob' }], post: { id: 1, title: 'Hello World', author: 'Alice' } }
  return db[field]
}, healthy: () => true })
gw.registerType({ kind: 'object', name: 'User', fields: {} })
gw.registerType({ kind: 'object', name: 'Post', fields: {} })
gw.registerType({ kind: 'scalar', name: 'ID' })
gw.registerType({ kind: 'scalar', name: 'String' })

export default function GraphQLGatewayPage() {
  const [tab, setTab] = useState<'playground' | 'upstreams' | 'persisted' | 'subscriptions' | 'metrics'>('playground')
  const [query, setQuery] = useState('query { user { id name } posts { id title } }')
  const [result, setResult] = useState<ExecutionResult | null>(null)
  const [running, setRunning] = useState(false)
  const [topics, setTopics] = useState<string[]>(gw.listSubscriptionTopics())
  const [log, setLog] = useState<Array<{ t: number; topic: string; data: unknown }>>([])
  const [pStats, setPStats] = useState({ total: gw.listPersisted().length, hits: gw.listPersisted().reduce((s, p) => s + p.hits, 0) })

  const metrics = useMemo(() => gw.getMetrics(), [tab, result])

  const run = useCallback(async () => {
    setRunning(true)
    const r = await gw.execute(query, { userId: 'demo', scopes: ['graphql:read'], loaders: new Map() })
    setResult(r)
    setPStats({ total: gw.listPersisted().length, hits: gw.listPersisted().reduce((s, p) => s + p.hits, 0) })
    setRunning(false)
  }, [query])

  useEffect(() => {
    if (tab !== 'subscriptions') return
    const offs: Array<() => void> = []
    if (!gw.subscriberCount('events')) {
      offs.push(gw.subscribe('events', d => setLog(l => [...l.slice(-49), { t: Date.now(), topic: 'events', data: d }])))
    }
    return () => { for (const o of offs) o() }
  }, [tab])

  const fireEvent = () => {
    gw.publish('events', { type: 'tick', ts: Date.now(), n: Math.floor(Math.random() * 1000) })
    setLog(l => [...l.slice(-49), { t: Date.now(), topic: 'events (manual)', data: { type: 'manual' } }])
  }

  const plan = useMemo(() => { try { return gw.plan(gw.parseQuery(query)) } catch { return null } }, [query])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-400">GraphQL Gateway</h1>
            <p className="text-slate-400 text-sm mt-1">v46.0 · Federation across upstreams · DataLoader · Caching · Subscriptions · Persisted queries</p>
          </div>
          <div className="text-xs text-slate-500">{gw.listUpstreams().length} upstreams · {metrics.totalQueries} queries · {metrics.totalCached} cached</div>
        </div>

        <div className="flex gap-1 mb-4 border-b border-slate-800">
          {(['playground', 'upstreams', 'persisted', 'subscriptions', 'metrics'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={'px-4 py-2 text-sm font-medium ' + (tab === t ? 'text-amber-400 border-b-2 border-amber-400' : 'text-slate-400 hover:text-slate-200')}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'playground' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <label className="text-xs text-slate-400 uppercase tracking-wide">Query</label>
              <textarea value={query} onChange={e => setQuery(e.target.value)} className="w-full h-48 mt-2 bg-slate-950 border border-slate-700 rounded p-3 font-mono text-sm text-emerald-300" spellCheck={false} />
              <div className="flex gap-2 mt-3">
                <button onClick={run} disabled={running} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded disabled:opacity-50">{running ? 'Running…' : 'Execute'}</button>
                <button onClick={() => setQuery('query { users { id name } }')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm">users</button>
                <button onClick={() => setQuery('query { posts { id title author } }')} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm">posts</button>
              </div>
              {plan && (
                <div className="mt-4 text-xs text-slate-400">
                  <div className="font-semibold text-slate-300 mb-1">Plan</div>
                  <div>Cost: <span className="text-amber-300">{plan.cost}</span> · Steps: <span className="text-amber-300">{plan.steps.length}</span></div>
                  <div>By upstream: {Object.entries(plan.byUpstream).map(([u, n]) => <span key={u} className="ml-1 px-1.5 py-0.5 bg-slate-800 rounded">{u}:{n}</span>)}</div>
                </div>
              )}
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <label className="text-xs text-slate-400 uppercase tracking-wide">Result</label>
              {!result ? <div className="text-slate-500 text-sm mt-4">Click Execute to run a query.</div> : (
                <div className="mt-2 space-y-3">
                  <div className="text-xs text-slate-500">cost={result.cost} · {result.durationMs}ms · cache={result.cacheHit ? 'HIT' : 'miss'} · from={result.fromUpstreams.join(',')}</div>
                  <pre className="bg-slate-950 border border-slate-700 rounded p-3 text-xs text-slate-200 overflow-auto max-h-64">{JSON.stringify(result.data, null, 2)}</pre>
                  {result.errors && <pre className="bg-red-950/40 border border-red-900 rounded p-3 text-xs text-red-300 overflow-auto max-h-32">{JSON.stringify(result.errors, null, 2)}</pre>}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'upstreams' && (
          <div className="space-y-3">
            {gw.listUpstreams().map(u => (
              <div key={u.name} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-amber-300">{u.name}</div>
                    <div className="text-xs text-slate-500 mt-1">Fields: {Object.keys(u.fieldOwners).join(', ')}</div>
                  </div>
                  <div className={'text-xs px-2 py-1 rounded ' + (u.healthy() ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300')}>
                    {u.healthy() ? 'healthy' : 'unhealthy'}
                  </div>
                </div>
                <pre className="mt-2 text-xs text-slate-500 font-mono">{u.schema}</pre>
              </div>
            ))}
          </div>
        )}

        {tab === 'persisted' && (
          <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-950 rounded p-3 border border-slate-800">
                <div className="text-xs text-slate-500">Total</div>
                <div className="text-2xl font-bold text-amber-400">{pStats.total}</div>
              </div>
              <div className="bg-slate-950 rounded p-3 border border-slate-800">
                <div className="text-xs text-slate-500">APQ hits</div>
                <div className="text-2xl font-bold text-emerald-400">{pStats.hits}</div>
              </div>
              <div className="bg-slate-950 rounded p-3 border border-slate-800">
                <div className="text-xs text-slate-500">Cache hit rate</div>
                <div className="text-2xl font-bold text-cyan-400">{metrics.totalQueries > 0 ? Math.round((metrics.totalCached / metrics.totalQueries) * 100) : 0}%</div>
              </div>
            </div>
            <div className="text-xs text-slate-400 mb-2">Hashes</div>
            <div className="max-h-64 overflow-auto space-y-1">
              {gw.listPersisted().map(p => (
                <div key={p.hash} className="bg-slate-950 border border-slate-800 rounded p-2 text-xs font-mono flex items-center justify-between">
                  <span className="text-amber-300">{p.hash}</span>
                  <span className="text-slate-500 truncate ml-3 flex-1">{p.query.slice(0, 60)}…</span>
                  <span className="text-emerald-300 ml-2">{p.hits}×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'subscriptions' && (
          <div className="space-y-3">
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-slate-400">Topic: <span className="text-amber-300 font-mono">events</span> · {gw.subscriberCount('events')} subscribers</div>
                <button onClick={fireEvent} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold rounded text-sm">Publish event</button>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded max-h-96 overflow-auto">
                {log.length === 0 ? <div className="text-slate-500 text-sm p-4">No events yet.</div> : log.map((e, i) => (
                  <div key={i} className="px-3 py-2 text-xs font-mono border-b border-slate-800 last:border-0 flex items-center gap-3">
                    <span className="text-slate-500">{new Date(e.t).toISOString().slice(11, 19)}</span>
                    <span className="text-amber-300">{e.topic}</span>
                    <span className="text-slate-300 flex-1 truncate">{JSON.stringify(e.data)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'metrics' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Total queries" value={metrics.totalQueries} />
            <Stat label="Errors" value={metrics.totalErrors} accent={metrics.totalErrors > 0 ? 'red' : 'slate'} />
            <Stat label="Cached" value={metrics.totalCached} accent="emerald" />
            <Stat label="Persisted" value={metrics.totalPersisted} accent="cyan" />
            <Stat label="Subscriptions" value={metrics.totalSubscriptions} accent="amber" />
            <Stat label="Avg duration" value={metrics.avgDurationMs.toFixed(2) + ' ms'} />
            <Stat label="Total duration" value={metrics.totalDurationMs + ' ms'} />
            <Stat label="Upstreams" value={Object.keys(metrics.byUpstream).length} />
            <div className="col-span-2 lg:col-span-4 bg-slate-900 rounded-lg p-4 border border-slate-800">
              <div className="text-xs text-slate-400 uppercase mb-2">By upstream</div>
              {Object.entries(metrics.byUpstream).map(([u, m]) => (
                <div key={u} className="flex items-center gap-3 text-sm py-1">
                  <span className="w-32 text-amber-300 font-mono">{u}</span>
                  <span className="text-slate-400">{m.calls} calls</span>
                  <span className="text-red-300">{m.errors} err</span>
                  <span className="text-emerald-300">{m.avgMs.toFixed(1)}ms avg</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: 'amber' | 'emerald' | 'red' | 'cyan' | 'slate' }) {
  const color = accent === 'amber' ? 'text-amber-400' : accent === 'emerald' ? 'text-emerald-400' : accent === 'red' ? 'text-red-400' : accent === 'cyan' ? 'text-cyan-400' : 'text-slate-200'
  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
      <div className="text-xs text-slate-500 uppercase">{label}</div>
      <div className={'text-2xl font-bold mt-1 ' + color}>{value}</div>
    </div>
  )
}
