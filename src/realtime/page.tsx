import { useEffect, useState, useMemo, useCallback } from 'react'
import { RealtimeManager, type Message } from './index'

const rm = new RealtimeManager()

export default function RealtimePage() {
  const [tab, setTab] = useState<'playground' | 'rooms' | 'presence' | 'routing' | 'metrics'>('playground')
  const [, force] = useState(0)
  const refresh = useCallback(() => force(x => x + 1), [])
  const [conns, setConns] = useState<{ id: string; userId?: string }[]>([])

  useEffect(() => {
    rm.startHeartbeat(15_000)
    return () => rm.stopHeartbeat()
  }, [])

  const addConn = () => {
    const c = rm.connect({ userId: 'user-' + Math.floor(Math.random() * 1000), ip: '127.0.0.1' })
    setConns(prev => [...prev, { id: c.id, userId: c.userId }])
  }
  const removeConn = (id: string) => {
    rm.disconnect(id)
    setConns(prev => prev.filter(c => c.id !== id))
  }
  const join = (id: string, ch: string) => rm.join(id, ch)
  const leave = (id: string, ch: string) => rm.leave(id, ch)
  const publish = (ch: string, ev: string, data: string) => {
    let parsed: unknown
    try { parsed = JSON.parse(data) } catch { parsed = data }
    const n = rm.publish(ch, ev, parsed)
    return n
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-violet-400">Realtime Manager</h1>
            <p className="text-slate-400 text-sm mt-1">v48.0 · WebSocket-style connections · Rooms · Presence · Routing · Hooks · Heartbeat</p>
          </div>
          <div className="text-xs text-slate-500">{rm.countConnections()} connections · {rm.channelCount()} channels · {rm.countOnline()} online</div>
        </div>

        <div className="flex gap-1 mb-4 border-b border-slate-800">
          {(['playground', 'rooms', 'presence', 'routing', 'metrics'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={'px-4 py-2 text-sm font-medium ' + (tab === t ? 'text-violet-400 border-b-2 border-violet-400' : 'text-slate-400 hover:text-slate-200')}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'playground' && (
          <Playground conns={conns} addConn={addConn} removeConn={removeConn} join={join} leave={leave} publish={publish} refresh={refresh} />
        )}
        {tab === 'rooms' && <RoomsView />}
        {tab === 'presence' && <PresenceView />}
        {tab === 'routing' && <RoutingView refresh={refresh} />}
        {tab === 'metrics' && <MetricsView />}
      </div>
    </div>
  )
}

function Playground({ conns, addConn, removeConn, join, leave, publish, refresh }: { conns: { id: string; userId?: string }[]; addConn: () => void; removeConn: (id: string) => void; join: (id: string, ch: string) => void; leave: (id: string, ch: string) => void; publish: (ch: string, ev: string, data: string) => number; refresh: () => void }) {
  const [channel, setChannel] = useState('chat')
  const [event, setEvent] = useState('message')
  const [data, setData] = useState('{"text":"hello"}')
  const [chForConn, setChForConn] = useState('chat')

  const fire = () => {
    const n = publish(channel, event, data)
    refresh()
    alert(`Delivered to ${n} connection(s)`)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-violet-300 font-semibold">Connections</h3>
          <button onClick={addConn} className="px-3 py-1 bg-violet-500 hover:bg-violet-400 text-slate-900 font-semibold rounded text-sm">+ Add</button>
        </div>
        <div className="space-y-2 max-h-80 overflow-auto">
          {conns.length === 0 ? <div className="text-slate-500 text-sm">No connections. Add one to start.</div> : conns.map(c => {
            const conn = rm.getConnection(c.id)
            return (
              <div key={c.id} className="bg-slate-950 border border-slate-800 rounded p-2 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-violet-300 font-mono text-xs">{c.id.slice(0, 8)}</span>
                  <span className="text-slate-400 text-xs">{c.userId}</span>
                  <span className="text-emerald-300 text-xs ml-auto">●</span>
                  <button onClick={() => removeConn(c.id)} className="text-xs text-red-300 hover:text-red-200">×</button>
                </div>
                <div className="text-xs text-slate-500">Channels: {[...(conn?.channels ?? [])].join(', ') || 'none'}</div>
                <div className="flex gap-1 mt-1">
                  <input value={chForConn} onChange={e => setChForConn(e.target.value)} className="bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs flex-1 font-mono" />
                  <button onClick={() => { join(c.id, chForConn); refresh() }} className="text-xs px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 rounded">join</button>
                  <button onClick={() => { leave(c.id, chForConn); refresh() }} className="text-xs px-2 py-0.5 bg-amber-700 hover:bg-amber-600 rounded">leave</button>
                </div>
                <div className="text-xs text-slate-500 mt-1">Buffer: {rm.bufferSize(c.id)} msg</div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-3">
        <h3 className="text-violet-300 font-semibold">Publish</h3>
        <div className="space-y-2">
          <div><label className="text-xs text-slate-400">Channel</label><input value={channel} onChange={e => setChannel(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono" /></div>
          <div><label className="text-xs text-slate-400">Event</label><input value={event} onChange={e => setEvent(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono" /></div>
          <div><label className="text-xs text-slate-400">Data (JSON)</label><textarea value={data} onChange={e => setData(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono h-20" /></div>
        </div>
        <button onClick={fire} className="w-full px-4 py-2 bg-violet-500 hover:bg-violet-400 text-slate-900 font-semibold rounded">Publish to "{channel}"</button>
        <h3 className="text-violet-300 font-semibold pt-2">Inbox (first connection)</h3>
        <div className="bg-slate-950 border border-slate-800 rounded max-h-48 overflow-auto">
          {conns.length === 0 ? <div className="text-slate-500 text-xs p-3">No connections.</div> : rm.readBuffer(conns[0].id, false).slice(-20).reverse().map(m => (
            <div key={m.id} className="px-3 py-1 text-xs font-mono border-b border-slate-800 last:border-0 flex items-center gap-2">
              <span className="text-slate-500">{new Date(m.ts).toISOString().slice(11, 19)}</span>
              <span className="text-violet-300">{m.event}</span>
              <span className="text-slate-300 truncate flex-1">{JSON.stringify(m.data)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RoomsView() {
  const [, force] = useState(0)
  useEffect(() => { const t = setInterval(() => force(x => x + 1), 1000); return () => clearInterval(t) }, [])
  return (
    <div className="space-y-2">
      {rm.listRooms().length === 0 ? <div className="text-slate-500 text-sm">No rooms yet. Add a connection and join a channel.</div> : rm.listRooms().map(r => (
        <div key={r.name} className="bg-slate-900 rounded-lg p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <span className="text-violet-300 font-mono">{r.name}</span>
            <span className="text-xs text-slate-500">{r.members.size} members · {r.messages} msgs</span>
          </div>
          <div className="text-xs text-slate-400">Members: {rm.membersOf(r.name).map(m => rm.getConnection(m)?.userId ?? m).join(', ')}</div>
        </div>
      ))}
    </div>
  )
}

function PresenceView() {
  const [, force] = useState(0)
  useEffect(() => { const t = setInterval(() => force(x => x + 1), 1000); return () => clearInterval(t) }, [])
  return (
    <div className="space-y-2">
      {rm.listPresence().length === 0 ? <div className="text-slate-500 text-sm">No presence data. Connections with userId auto-register presence.</div> : rm.listPresence().map(p => (
        <div key={p.connectionId} className="bg-slate-900 rounded-lg p-3 border border-slate-800 flex items-center gap-3">
          <span className={'w-2 h-2 rounded-full ' + (p.status === 'online' ? 'bg-emerald-400' : p.status === 'away' ? 'bg-amber-400' : 'bg-slate-500')} />
          <span className="text-violet-300 font-mono text-sm">{p.userId ?? p.connectionId}</span>
          <span className="text-xs text-slate-500">{p.status}</span>
          <span className="text-xs text-slate-500 ml-auto">last seen {Math.floor((Date.now() - p.lastSeen) / 1000)}s ago</span>
        </div>
      ))}
    </div>
  )
}

function RoutingView({ refresh }: { refresh: () => void }) {
  const [pattern, setPattern] = useState('orders:*')
  const [log, setLog] = useState<string[]>([])
  const install = () => {
    rm.route(pattern, (msg: Message) => setLog(l => [...l.slice(-49), `[${new Date(msg.ts).toISOString().slice(11, 19)}] ${msg.channel}:${msg.event} → ${JSON.stringify(msg.data)}`]))
    refresh()
  }
  const remove = () => { rm.unroute(pattern); refresh() }
  return (
    <div className="space-y-3">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
        <h3 className="text-violet-300 font-semibold">Route installer</h3>
        <div className="flex gap-2">
          <input value={pattern} onChange={e => setPattern(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono" />
          <button onClick={install} className="px-3 py-1 bg-violet-500 hover:bg-violet-400 text-slate-900 font-semibold rounded text-sm">Install</button>
          <button onClick={remove} className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white font-semibold rounded text-sm">Remove</button>
        </div>
        <div className="text-xs text-slate-400">Patterns: <code className="text-emerald-300">*</code> (all) · <code className="text-emerald-300">ch:*</code> (prefix) · <code className="text-emerald-300">ch:ev</code> (exact) · <code className="text-emerald-300">ch.*</code> (regex glob)</div>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-violet-300 font-semibold mb-2">Active routes</h3>
        <div className="space-y-1">
          {rm.listRoutes().map(r => <div key={r} className="bg-slate-950 border border-slate-800 rounded p-1.5 text-xs font-mono text-amber-300">{r}</div>)}
        </div>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-violet-300 font-semibold mb-2">Route log</h3>
        <div className="bg-slate-950 border border-slate-800 rounded max-h-64 overflow-auto">
          {log.length === 0 ? <div className="text-slate-500 text-xs p-3">No routes fired yet.</div> : log.slice().reverse().map((l, i) => <div key={i} className="px-3 py-1 text-xs font-mono border-b border-slate-800 last:border-0 text-slate-300">{l}</div>)}
        </div>
      </div>
    </div>
  )
}

function MetricsView() {
  const m = useMemo(() => rm.getMetrics(), [rm.countConnections(), rm.channelCount()])
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat label="Connections" value={m.totalConnections} />
      <Stat label="Disconnects" value={m.totalDisconnects} />
      <Stat label="Messages" value={m.totalMessages} />
      <Stat label="Bytes" value={m.totalBytes} accent="amber" />
      <Stat label="Rooms" value={m.totalRooms} />
      <Stat label="Channels" value={m.totalChannels} />
      <Stat label="Routes" value={m.totalRoutes} />
      <Stat label="Broadcast" value={m.totalBroadcast} />
      <Stat label="Active" value={m.activeConnections} accent="emerald" />
      <Stat label="Errors" value={m.totalErrors} accent="red" />
      <div className="col-span-2 lg:col-span-4 bg-slate-900 rounded-lg p-4 border border-slate-800">
        <div className="text-xs text-slate-400 uppercase mb-2">By event</div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
          {Object.entries(m.byEvent).map(([e, c]) => <div key={e} className="bg-slate-950 border border-slate-800 rounded p-2"><div className="text-xs text-slate-500">{e}</div><div className="text-xl font-bold text-violet-300">{c}</div></div>)}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: 'amber' | 'emerald' | 'red' }) {
  const color = accent === 'amber' ? 'text-amber-400' : accent === 'emerald' ? 'text-emerald-400' : accent === 'red' ? 'text-red-400' : 'text-slate-200'
  return <div className="bg-slate-900 rounded-lg p-4 border border-slate-800"><div className="text-xs text-slate-500 uppercase">{label}</div><div className={'text-2xl font-bold mt-1 ' + color}>{value}</div></div>
}
