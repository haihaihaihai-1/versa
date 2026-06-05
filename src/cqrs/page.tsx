import { useEffect, useState, useMemo, useCallback } from 'react'
import { CQRSBus, type Command, type Query, type ReadModel } from './index'
import { EventStore, type DomainEvent } from '../eventsrc'

const es = new EventStore()
es.registerAggregate('Order', (events: DomainEvent[]) => {
  const init = { items: 0, total: 0, status: 'pending' }
  for (const e of events) {
    if (e.type === 'ItemAdded') init.items += 1
    else if (e.type === 'TotalSet') init.total = e.payload as number
    else if (e.type === 'StatusChanged') init.status = e.payload as string
  }
  return init
})

const bus = new CQRSBus(es)

// register sample handlers
bus.registerCommandHandler({ type: 'AddItem', description: 'Add item to order', handle: (cmd: Command) => [{ id: '', type: 'ItemAdded', aggregateId: cmd.aggregateId, aggregateType: cmd.aggregateType, version: 0, payload: cmd.payload, metadata: { ts: Date.now() } }] })
bus.registerCommandHandler({ type: 'SetTotal', description: 'Set order total', handle: (cmd: Command) => [{ id: '', type: 'TotalSet', aggregateId: cmd.aggregateId, aggregateType: cmd.aggregateType, version: 0, payload: cmd.payload, metadata: { ts: Date.now() } }] })
bus.registerCommandHandler({ type: 'ChangeStatus', description: 'Change order status', handle: (cmd: Command) => [{ id: '', type: 'StatusChanged', aggregateId: cmd.aggregateId, aggregateType: cmd.aggregateType, version: 0, payload: cmd.payload, metadata: { ts: Date.now() } }] })
bus.registerQueryHandler({ type: 'GetOrder', description: 'Get order state', handle: (_q, ctx) => ctx.services.events.rebuildAggregate('Order', 'o1') })
bus.registerQueryHandler({ type: 'ListOrders', description: 'List order aggregates', handle: (_q, ctx) => ctx.services.events.streamVersion('o1') })

// middleware
bus.use({
  name: 'audit',
  before: (cmd, ctx) => { ctx.log.push(`audit: ${cmd.type} on ${cmd.aggregateId} by ${cmd.userId ?? 'anon'}`) }
})
bus.use({
  name: 'validate',
  before: (cmd, ctx) => { if (cmd.type === 'SetTotal' && (cmd.payload as { total: number }).total < 0) throw new Error('total must be >= 0') }
})

// read model
const orderSummary: ReadModel = { name: 'orderSummary', state: { totalOrders: 0, lastStatus: 'none' }, position: 0, updatedAt: 0, applies: (events) => { for (const e of events) { if (e.type === 'StatusChanged') orderSummary.state.lastStatus = e.payload as string; if (e.type === 'ItemAdded') orderSummary.state.totalOrders = ((orderSummary.state.totalOrders as number) ?? 0) + 1 } } }
bus.registerReadModel(orderSummary)

export default function CQRSPage() {
  const [tab, setTab] = useState<'playground' | 'queries' | 'readmodels' | 'middleware' | 'metrics'>('playground')
  const [, force] = useState(0)
  const refresh = useCallback(() => force(x => x + 1), [])
  const [log, setLog] = useState<Array<{ t: number; type: 'cmd' | 'qry'; ok: boolean; text: string }>>([])

  useEffect(() => {
    // also re-render on event store changes
    const off = es.subscribe('*', () => refresh())
    return () => off()
  }, [refresh])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-fuchsia-400">CQRS Bus</h1>
            <p className="text-slate-400 text-sm mt-1">v50.0 · Commands · Queries · Middleware · Read models · Bus · Event-sourced</p>
          </div>
          <div className="text-xs text-slate-500">{es.totalEventCount()} events · {bus.listCommandHandlers().length} cmds · {bus.listQueryHandlers().length} queries · {bus.listReadModels().length} RMs</div>
        </div>

        <div className="flex gap-1 mb-4 border-b border-slate-800">
          {(['playground', 'queries', 'readmodels', 'middleware', 'metrics'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={'px-4 py-2 text-sm font-medium ' + (tab === t ? 'text-fuchsia-400 border-b-2 border-fuchsia-400' : 'text-slate-400 hover:text-slate-200')}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'playground' && <Playground log={log} setLog={setLog} refresh={refresh} />}
        {tab === 'queries' && <QueriesView refresh={refresh} />}
        {tab === 'readmodels' && <ReadModelsView refresh={refresh} />}
        {tab === 'middleware' && <MiddlewareView refresh={refresh} />}
        {tab === 'metrics' && <MetricsView />}
      </div>
    </div>
  )
}

function Playground({ log, setLog, refresh }: { log: Array<{ t: number; type: 'cmd' | 'qry'; ok: boolean; text: string }>; setLog: (fn: (l: Array<{ t: number; type: 'cmd' | 'qry'; ok: boolean; text: string }>) => Array<{ t: number; type: 'cmd' | 'qry'; ok: boolean; text: string }>) => void; refresh: () => void }) {
  const [cmdType, setCmdType] = useState('AddItem')
  const [payload, setPayload] = useState('{"sku":"X"}')
  const [aggregateId, setAggregateId] = useState('o1')

  const send = async () => {
    let parsed: unknown
    try { parsed = JSON.parse(payload) } catch { parsed = payload }
    const r = await bus.dispatch(CQRSBus.makeCommand(cmdType, 'Order', aggregateId, parsed))
    setLog(l => [...l.slice(-49), { t: Date.now(), type: 'cmd', ok: r.ok, text: `${cmdType} → ${r.ok ? 'OK (' + r.durationMs + 'ms)' : 'FAIL: ' + r.error}` }])
    refresh()
  }

  const presets = [
    { type: 'AddItem', payload: '{"sku":"book"}' },
    { type: 'AddItem', payload: '{"sku":"pen"}' },
    { type: 'SetTotal', payload: '{"total":99}' },
    { type: 'ChangeStatus', payload: '"shipped"' }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-3">
        <h3 className="text-fuchsia-300 font-semibold">Dispatch command</h3>
        <div className="space-y-2">
          <Field label="Aggregate ID" value={aggregateId} onChange={setAggregateId} />
          <Field label="Command type" value={cmdType} onChange={setCmdType} />
          <div><label className="text-xs text-slate-400 block mb-1">Payload (JSON)</label><textarea value={payload} onChange={e => setPayload(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-emerald-300 h-20" /></div>
        </div>
        <div className="flex gap-2">
          <button onClick={send} className="px-4 py-2 bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-900 font-semibold rounded">Dispatch</button>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-slate-400">Presets:</div>
          {presets.map((p, i) => <button key={i} onClick={() => { setCmdType(p.type); setPayload(p.payload) }} className="text-xs px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded mr-1">{p.type}</button>)}
        </div>
        <div className="border-t border-slate-800 pt-3">
          <h3 className="text-fuchsia-300 font-semibold">Order state (rebuilt from events)</h3>
          <pre className="bg-slate-950 border border-slate-800 rounded p-2 text-xs text-emerald-300 mt-1">{JSON.stringify(es.rebuildAggregate('Order', aggregateId).data, null, 2)}</pre>
        </div>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-fuchsia-300 font-semibold mb-2">Trace</h3>
        <div className="bg-slate-950 border border-slate-800 rounded max-h-[28rem] overflow-auto">
          {log.length === 0 ? <div className="text-slate-500 text-sm p-3">No commands dispatched.</div> : log.slice().reverse().map((l, i) => (
            <div key={i} className="px-3 py-1.5 text-xs font-mono border-b border-slate-800 last:border-0 flex items-center gap-2">
              <span className="text-slate-500">{new Date(l.t).toISOString().slice(11, 19)}</span>
              <span className={l.ok ? 'text-emerald-300' : 'text-red-300'}>{l.ok ? '✓' : '✗'}</span>
              <span className="text-slate-300">{l.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function QueriesView({ refresh }: { refresh: () => void }) {
  const [type, setType] = useState('GetOrder')
  const [payload, setPayload] = useState('{}')
  const [cacheable, setCacheable] = useState(true)
  const [result, setResult] = useState<unknown>(undefined)
  const [t0, setT0] = useState(0)
  const [dur, setDur] = useState(0)
  const [hit, setHit] = useState(false)

  const run = async () => {
    let parsed: unknown
    try { parsed = JSON.parse(payload) } catch { parsed = {} }
    const start = Date.now()
    const r = await bus.query(CQRSBus.makeQuery(type, parsed, { cacheable }))
    setDur(Date.now() - start)
    setResult(r.data)
    setHit(r.cacheHit)
    setT0(Date.now())
    void t0
    refresh()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
        <h3 className="text-fuchsia-300 font-semibold">Dispatch query</h3>
        <Field label="Query type" value={type} onChange={setType} />
        <div><label className="text-xs text-slate-400 block mb-1">Payload (JSON)</label><textarea value={payload} onChange={e => setPayload(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-emerald-300 h-16" /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cacheable} onChange={e => setCacheable(e.target.checked)} className="accent-fuchsia-400" /> <span className="text-slate-300">Cacheable</span></label>
        <button onClick={run} className="w-full px-4 py-2 bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-900 font-semibold rounded">Run query</button>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
        <h3 className="text-fuchsia-300 font-semibold">Result</h3>
        <div className="text-xs text-slate-400">{dur}ms · {hit ? 'cache HIT' : 'fresh'}</div>
        <pre className="bg-slate-950 border border-slate-800 rounded p-2 text-xs text-emerald-300 max-h-64 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      </div>
    </div>
  )
}

function ReadModelsView({ refresh }: { refresh: () => void }) {
  void refresh
  return (
    <div className="space-y-3">
      {bus.listReadModels().map(m => (
        <div key={m.name} className="bg-slate-900 rounded-lg p-4 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-fuchsia-300 font-semibold">{m.name}</h3>
            <span className="text-xs text-slate-500">pos: {m.position} · updated {new Date(m.updatedAt).toISOString()}</span>
          </div>
          <pre className="bg-slate-950 border border-slate-800 rounded p-2 text-xs text-emerald-300">{JSON.stringify(m.state, null, 2)}</pre>
        </div>
      ))}
    </div>
  )
}

function MiddlewareView({ refresh }: { refresh: () => void }) {
  const [log, setLog] = useState<string[]>([])
  void refresh
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
        <h3 className="text-fuchsia-300 font-semibold">Active middleware</h3>
        <div className="flex flex-wrap gap-2">
          {bus.listMiddlewares().map(m => <span key={m} className="text-xs px-2 py-1 bg-slate-800 text-fuchsia-300 rounded font-mono">{m}</span>)}
        </div>
        <button onClick={async () => {
          const start = Date.now()
          const r = await bus.dispatch({ id: 'test', type: 'AddItem', aggregateId: 'o1', aggregateType: 'Order', payload: { sku: 'test' }, metadata: { ts: Date.now() }, userId: 'demo' })
          setLog(l => [...l.slice(-19), `${Date.now() - start}ms · ${r.ok ? 'OK' : 'FAIL'} · middleware log: ${JSON.stringify(r.middlewareLog)}`])
        }} className="px-3 py-1.5 bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-900 font-semibold rounded text-sm">Test command with middleware</button>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-fuchsia-300 font-semibold mb-2">Execution log</h3>
        <div className="bg-slate-950 border border-slate-800 rounded max-h-64 overflow-auto">
          {log.length === 0 ? <div className="text-slate-500 text-xs p-3">Click to test middleware chain.</div> : log.slice().reverse().map((l, i) => <div key={i} className="px-3 py-1 text-xs font-mono border-b border-slate-800 last:border-0 text-slate-300">{l}</div>)}
        </div>
      </div>
    </div>
  )
}

function MetricsView() {
  const m = bus.getMetrics()
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat label="Total commands" value={m.totalCommands} />
      <Stat label="Total queries" value={m.totalQueries} />
      <Stat label="Cmd errors" value={m.totalCommandErrors} accent="red" />
      <Stat label="Qry errors" value={m.totalQueryErrors} accent="red" />
      <Stat label="Query cache hits" value={m.totalQueryCacheHits} accent="emerald" />
      <Stat label="Read models" value={m.readModels} />
      <div className="col-span-2 lg:col-span-4 bg-slate-900 rounded-lg p-4 border border-slate-800">
        <div className="text-xs text-slate-400 uppercase mb-2">By command type</div>
        <div className="space-y-1">
          {Object.entries(m.byCommandType).map(([t, s]) => (
            <div key={t} className="flex items-center gap-3 text-sm">
              <span className="w-32 text-fuchsia-300 font-mono">{t}</span>
              <span className="text-slate-400">{s.count}×</span>
              <span className="text-red-300">{s.errors} err</span>
              <span className="text-emerald-300">{s.avgMs.toFixed(1)}ms avg</span>
            </div>
          ))}
        </div>
      </div>
      <div className="col-span-2 lg:col-span-4 bg-slate-900 rounded-lg p-4 border border-slate-800">
        <div className="text-xs text-slate-400 uppercase mb-2">By query type</div>
        <div className="space-y-1">
          {Object.entries(m.byQueryType).map(([t, s]) => (
            <div key={t} className="flex items-center gap-3 text-sm">
              <span className="w-32 text-fuchsia-300 font-mono">{t}</span>
              <span className="text-slate-400">{s.count}×</span>
              <span className="text-red-300">{s.errors} err</span>
              <span className="text-emerald-300">{s.avgMs.toFixed(1)}ms avg</span>
              <span className="text-amber-300">{s.cacheHits} cache</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: 'amber' | 'emerald' | 'red' }) {
  const color = accent === 'amber' ? 'text-amber-400' : accent === 'emerald' ? 'text-emerald-400' : accent === 'red' ? 'text-red-400' : 'text-slate-200'
  return <div className="bg-slate-900 rounded-lg p-4 border border-slate-800"><div className="text-xs text-slate-500 uppercase">{label}</div><div className={'text-2xl font-bold mt-1 ' + color}>{value}</div></div>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return <div><label className="text-xs text-slate-400 block mb-1">{label}</label><input value={value} onChange={e => onChange(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-emerald-300" /></div>
}
