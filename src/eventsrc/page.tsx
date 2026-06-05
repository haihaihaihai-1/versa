import { useEffect, useMemo, useState, useCallback } from 'react'
import { EventStore, type DomainEvent, type EventRecord } from './index'

const es = new EventStore()
es.registerAggregate('Counter', events => events.reduce((acc: number, ev: DomainEvent) => ev.type === 'Inc' ? acc + (ev.payload as number) : acc, 0))
es.registerAggregate('Order', events => {
  const init = { status: 'pending', total: 0, items: 0 }
  for (const ev of events) {
    if (ev.type === 'ItemAdded') init.items += 1
    else if (ev.type === 'TotalSet') init.total = ev.payload as number
    else if (ev.type === 'StatusChanged') init.status = ev.payload as string
  }
  return init
})
es.registerSchema({ type: 'Inc', version: 1, jsonSchema: { type: 'object' } })
es.registerSchema({ type: 'Dec', version: 1, jsonSchema: { type: 'object' } })
es.registerSchema({ type: 'ItemAdded', version: 1, jsonSchema: { type: 'object' } })
es.registerSchema({ type: 'TotalSet', version: 2, jsonSchema: { type: 'object' }, compatibleWith: [1] })

let liveOff: (() => void) | null = null

export default function EventSourcingPage() {
  const [tab, setTab] = useState<'playground' | 'aggregates' | 'projections' | 'snapshots' | 'sagas' | 'schemas' | 'metrics'>('playground')
  const [, force] = useState(0)
  const refresh = useCallback(() => force(x => x + 1), [])

  useEffect(() => {
    liveOff = es.subscribe('*', () => refresh())
    return () => { if (liveOff) liveOff(); liveOff = null }
  }, [refresh])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-pink-400">Event Sourcing</h1>
            <p className="text-slate-400 text-sm mt-1">v47.0 · Aggregate · Snapshot · Projection · Saga · Schema · Time travel</p>
          </div>
          <div className="text-xs text-slate-500">{es.totalEventCount()} events · {es.listAggregates().length} aggregates · {es.listProjections().length} projections</div>
        </div>

        <div className="flex gap-1 mb-4 border-b border-slate-800 overflow-auto">
          {(['playground', 'aggregates', 'projections', 'snapshots', 'sagas', 'schemas', 'metrics'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={'px-4 py-2 text-sm font-medium whitespace-nowrap ' + (tab === t ? 'text-pink-400 border-b-2 border-pink-400' : 'text-slate-400 hover:text-slate-200')}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'playground' && <Playground onAct={refresh} />}
        {tab === 'aggregates' && <Aggregates onAct={refresh} />}
        {tab === 'projections' && <Projections onAct={refresh} />}
        {tab === 'snapshots' && <Snapshots onAct={refresh} />}
        {tab === 'sagas' && <Sagas onAct={refresh} />}
        {tab === 'schemas' && <Schemas onAct={refresh} />}
        {tab === 'metrics' && <MetricsView />}
      </div>
    </div>
  )
}

function Playground({ onAct }: { onAct: () => void }) {
  const [aggregateId, setAggregateId] = useState('a')
  const [type, setType] = useState('Inc')
  const [payload, setPayload] = useState('1')
  const [aggType, setAggType] = useState('Counter')
  const [version, setVersion] = useState('1')

  const all = es.getAllEvents()
  const counter = useMemo(() => {
    try { return es.rebuildAggregate<number>('Counter', aggregateId).data } catch { return 0 }
  }, [aggregateId, all.length])

  const send = () => {
    let parsed: unknown
    try { parsed = JSON.parse(payload) } catch { parsed = Number(payload) || payload }
    es.append([{ id: '', type, aggregateId, aggregateType: aggType, version: 0, payload: parsed, metadata: { ts: Date.now() } }])
    onAct()
  }
  const rebuild = () => {
    const s = es.rebuildAggregate<{ status: string; total: number; items: number }>(aggType, aggregateId)
    alert(`version=${s.version} data=${JSON.stringify(s.data)}`)
  }
  const timeTravel = () => {
    const v = Number(version)
    try {
      const s = es.stateAt<{ status: string; total: number; items: number }>(aggType, aggregateId, v)
      alert(`@v${v}: ${JSON.stringify(s.data)}`)
    } catch (e) { alert((e as Error).message) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-3">
        <h3 className="text-pink-300 font-semibold">Append event</h3>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Aggregate type" value={aggType} onChange={setAggType} />
          <Field label="Aggregate ID" value={aggregateId} onChange={setAggregateId} />
          <Field label="Event type" value={type} onChange={setType} />
          <Field label="Payload (JSON)" value={payload} onChange={setPayload} />
        </div>
        <div className="flex gap-2">
          <button onClick={send} className="px-4 py-2 bg-pink-500 hover:bg-pink-400 text-slate-900 font-semibold rounded">Append</button>
          <button onClick={rebuild} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm">Rebuild</button>
        </div>
        <div className="border-t border-slate-800 pt-3">
          <h3 className="text-pink-300 font-semibold mb-2">Time travel</h3>
          <div className="flex gap-2">
            <Field label="Version" value={version} onChange={setVersion} />
            <button onClick={timeTravel} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded self-end">Query @v</button>
          </div>
        </div>
        <div className="text-xs text-slate-400">Counter <span className="text-amber-300 font-mono">{aggregateId}</span> = <span className="text-emerald-300 font-mono">{counter}</span></div>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-pink-300 font-semibold mb-2">Event log</h3>
        <div className="bg-slate-950 border border-slate-800 rounded max-h-96 overflow-auto">
          {all.length === 0 ? <div className="text-slate-500 text-sm p-4">No events yet.</div> : all.slice(-100).reverse().map(r => (
            <div key={r.event.id} className="px-3 py-2 text-xs font-mono border-b border-slate-800 last:border-0 flex items-center gap-3">
              <span className="text-slate-500">#{r.position}</span>
              <span className="text-pink-300">{r.event.type}</span>
              <span className="text-cyan-300">{r.event.aggregateId}</span>
              <span className="text-slate-500">v{r.streamPosition}</span>
              <span className="text-slate-300 flex-1 truncate">{JSON.stringify(r.event.payload)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Aggregates({ onAct }: { onAct: () => void }) {
  const [aggId, setAggId] = useState('a')
  const [aggType, setAggType] = useState('Order')
  const state = useMemo(() => { try { return es.rebuildAggregate(aggType, aggId) } catch { return null } }, [aggId, aggType, es.totalEventCount()])
  const events = es.getByAggregate(aggId)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
        <h3 className="text-pink-300 font-semibold">Aggregate inspector</h3>
        <Field label="Type" value={aggType} onChange={setAggType} />
        <Field label="ID" value={aggId} onChange={setAggId} />
        {state && (
          <div className="bg-slate-950 border border-slate-800 rounded p-3">
            <div className="text-xs text-slate-500">Version {state.version} · updated {new Date(state.updatedAt).toISOString()}</div>
            <pre className="text-emerald-300 text-sm mt-2">{JSON.stringify(state.data, null, 2)}</pre>
          </div>
        )}
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-pink-300 font-semibold mb-2">Stream</h3>
        <div className="bg-slate-950 border border-slate-800 rounded max-h-96 overflow-auto">
          {events.length === 0 ? <div className="text-slate-500 text-sm p-4">No events for this aggregate.</div> : events.map(r => (
            <div key={r.event.id} className="px-3 py-2 text-xs font-mono border-b border-slate-800 last:border-0 flex items-center gap-3">
              <span className="text-slate-500">v{r.streamPosition}</span>
              <span className="text-pink-300">{r.event.type}</span>
              <span className="text-slate-300 flex-1 truncate">{JSON.stringify(r.event.payload)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Projections({ onAct }: { onAct: () => void }) {
  const [name, setName] = useState('p1')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const rebuild = () => {
    const counter: Record<string, number> = {}
    const n = es.rebuildProjection(name, r => { counter[r.event.type] = (counter[r.event.type] ?? 0) + 1 })
    setCounts(counter)
    void n
    onAct()
  }
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-pink-300 font-semibold mb-3">Projection builder</h3>
        <div className="flex gap-2">
          <Field label="Name" value={name} onChange={setName} />
          <button onClick={rebuild} className="px-4 py-2 bg-pink-500 hover:bg-pink-400 text-slate-900 font-semibold rounded self-end">Rebuild</button>
        </div>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-pink-300 font-semibold mb-2">By event type</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {Object.entries(counts).map(([k, v]) => (
            <div key={k} className="bg-slate-950 border border-slate-800 rounded p-2">
              <div className="text-xs text-slate-500">{k}</div>
              <div className="text-xl font-bold text-amber-300">{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-pink-300 font-semibold mb-2">Projections</h3>
        <div className="space-y-1">
          {es.listProjections().map(p => (
            <div key={p.name} className="bg-slate-950 border border-slate-800 rounded p-2 text-sm flex items-center gap-4">
              <span className="text-amber-300 font-mono">{p.name}</span>
              <span className="text-slate-400">pos: <span className="text-emerald-300">{p.position}</span></span>
              <span className="text-slate-400">rebuilds: <span className="text-emerald-300">{p.rebuilds}</span></span>
              <span className="text-slate-500 text-xs">last: {p.lastEventAt > 0 ? new Date(p.lastEventAt).toISOString() : '-'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Snapshots({ onAct }: { onAct: () => void }) {
  const [aggId, setAggId] = useState('a')
  const [type, setType] = useState('Counter')
  const snap = () => {
    try {
      const data = es.rebuildAggregate(type, aggId).data
      es.takeSnapshot(aggId, type, data)
      onAct()
    } catch (e) { alert((e as Error).message) }
  }
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-pink-300 font-semibold mb-3">Snapshot</h3>
        <div className="flex gap-2">
          <Field label="Type" value={type} onChange={setType} />
          <Field label="Aggregate ID" value={aggId} onChange={setAggId} />
          <button onClick={snap} className="px-4 py-2 bg-pink-500 hover:bg-pink-400 text-slate-900 font-semibold rounded self-end">Take</button>
        </div>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-pink-300 font-semibold mb-2">All snapshots</h3>
        <div className="space-y-1">
          {es.listSnapshots().map(s => (
            <div key={s.aggregateId} className="bg-slate-950 border border-slate-800 rounded p-2 text-sm flex items-center gap-3">
              <span className="text-amber-300 font-mono">{s.aggregateId}</span>
              <span className="text-cyan-300">v{s.version}</span>
              <span className="text-slate-300 truncate flex-1">{JSON.stringify(s.data)}</span>
              <span className="text-slate-500 text-xs">{new Date(s.takenAt).toISOString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Sagas({ onAct }: { onAct: () => void }) {
  const [shouldFail, setShouldFail] = useState(false)
  const run = async () => {
    let compensated = false
    const saga: import('./index').Saga = { id: 's' + Date.now(), name: 'order-flow', state: 'pending', history: [], startedAt: 0, steps: [
      { name: 'reserve', execute: async () => { if (shouldFail) throw new Error('reserve fail') }, compensate: async () => { compensated = true } },
      { name: 'charge', execute: async () => { if (shouldFail) throw new Error('charge fail') }, compensate: async () => { compensated = true } },
      { name: 'ship', execute: async () => {} }
    ] }
    const r = await es.runSaga(saga)
    alert(`saga ${r.state}${r.state === 'compensated' ? ' (compensated=' + compensated + ')' : ''}`)
    onAct()
  }
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-pink-300 font-semibold mb-3">Saga runner</h3>
        <label className="flex items-center gap-2 text-sm mb-3">
          <input type="checkbox" checked={shouldFail} onChange={e => setShouldFail(e.target.checked)} className="accent-pink-400" />
          <span className="text-slate-300">Force failure on first step</span>
        </label>
        <button onClick={run} className="px-4 py-2 bg-pink-500 hover:bg-pink-400 text-slate-900 font-semibold rounded">Run order-flow saga</button>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-pink-300 font-semibold mb-2">Saga history</h3>
        <div className="space-y-1">
          {es.listSagas().map(s => (
            <div key={s.id} className="bg-slate-950 border border-slate-800 rounded p-2 text-sm">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-amber-300 font-mono">{s.name}</span>
                <span className={'text-xs px-1.5 py-0.5 rounded ' + (s.state === 'completed' ? 'bg-emerald-900/40 text-emerald-300' : s.state === 'compensated' ? 'bg-amber-900/40 text-amber-300' : 'bg-red-900/40 text-red-300')}>{s.state}</span>
                <span className="text-slate-500 text-xs">{s.steps.length} steps</span>
              </div>
              <div className="text-xs space-y-0.5">
                {s.history.map((h, i) => <div key={i} className="flex gap-2"><span className="text-slate-500">{h.at ? new Date(h.at).toISOString().slice(11, 19) : ''}</span><span className="text-cyan-300">{h.step}</span><span className={h.ok ? 'text-emerald-300' : 'text-red-300'}>{h.ok ? 'OK' : 'FAIL: ' + h.err}</span></div>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Schemas({ onAct }: { onAct: () => void }) {
  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
      <h3 className="text-pink-300 font-semibold mb-3">Schema registry</h3>
      <div className="space-y-1">
        {es.listSchemas().map(s => (
          <div key={s.type + ':' + s.version} className="bg-slate-950 border border-slate-800 rounded p-2 text-sm flex items-center gap-3">
            <span className="text-amber-300 font-mono">{s.type}</span>
            <span className="text-cyan-300">v{s.version}</span>
            {s.compatibleWith && <span className="text-slate-400 text-xs">compat: [{s.compatibleWith.join(',')}]</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricsView() {
  const m = es.getMetrics()
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat label="Total events" value={m.totalEvents} />
      <Stat label="Appends" value={m.totalAppends} />
      <Stat label="Rebuilds" value={m.totalRebuilds} />
      <Stat label="Snapshots" value={m.totalSnapshots} />
      <Stat label="Subscriptions" value={m.totalSubscriptions} />
      <Stat label="Projections" value={m.totalProjections} />
      <Stat label="Sagas OK" value={m.sagasCompleted} accent="emerald" />
      <Stat label="Sagas failed" value={m.sagasFailed} accent="red" />
      <div className="col-span-2 lg:col-span-4 bg-slate-900 rounded-lg p-4 border border-slate-800">
        <div className="text-xs text-slate-400 uppercase mb-2">By event type</div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {Object.entries(m.byType).map(([t, c]) => <div key={t} className="bg-slate-950 border border-slate-800 rounded p-2"><div className="text-xs text-slate-500">{t}</div><div className="text-xl font-bold text-pink-300">{c}</div></div>)}
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
