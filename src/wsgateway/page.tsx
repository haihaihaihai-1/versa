import { useState } from 'react'
import { WebSocketGateway, getGateway, resetGateway } from './index'

const TABS = ['Connections', 'Rooms', 'Channels', 'Messaging', 'Heartbeat', 'Metrics'] as const
type Tab = typeof TABS[number]

export default function WSGatewayPage() {
  const [tab, setTab] = useState<Tab>('Connections')
  const [g, setG] = useState(() => {
    resetGateway()
    const gw = getGateway()
    gw.connect({ userId: 'alice', ip: '127.0.0.1' })
    gw.connect({ userId: 'bob', ip: '127.0.0.2' })
    gw.connect({ userId: 'carol' })
    const r = gw.createRoom({ name: 'lobby' })
    const c1 = gw.connect({ userId: 'dave' })
    const c2 = gw.connect({ userId: 'eve' })
    gw.joinRoom(c1.id, r.id)
    gw.joinRoom(c2.id, r.id)
    const chan = gw.createChannel({ name: 'announcements', topic: 'site-news' })
    return gw
  })
  const [out, setOut] = useState('')

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v72.0 WebSocket Gateway</h1>
      <p className="text-sm text-slate-400">连接管理 · 房间 · 频道 · 广播 · 心跳 · 在线状态 · 速率限制 · 消息路由</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Connections' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="ws-uid" placeholder="userId" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const uid = (document.getElementById('ws-uid') as HTMLInputElement).value || 'anon'
              const c = g.connect({ userId: uid })
              setOut(`connected: ${c.id} (user=${c.userId})`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">connect</button>
            <button onClick={() => {
              const list = g.listConnections()
              setOut(list.map(c => `${c.id} | user=${c.userId || '-'} | state=${c.state} | sent=${c.messagesSent} recv=${c.messagesReceived}`).join('\n'))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">list all</button>
            <button onClick={() => {
              const c = g.listConnections()[0]
              if (c) { g.disconnect(c.id); setOut(`disconnected: ${c.id}`) }
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">disconnect first</button>
          </div>
        </div>
      )}

      {tab === 'Rooms' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="rm-name" placeholder="room name" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input id="rm-max" type="number" placeholder="max members" defaultValue={10} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs w-32" />
            <button onClick={() => {
              const name = (document.getElementById('rm-name') as HTMLInputElement).value || 'unnamed'
              const max = Number((document.getElementById('rm-max') as HTMLInputElement).value) || undefined
              const r = g.createRoom({ name, maxMembers: max })
              setOut(`room: ${r.id} (${r.name})`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">create</button>
            <button onClick={() => setOut(g.listRooms().map(r => `${r.id} | ${r.name} | members=${r.members.size}`).join('\n'))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">list rooms</button>
            <button onClick={() => {
              const c = g.listConnections()[0]
              const ch = g.listChannels()[0]
              if (c && ch) {
                g.subscribe(c.id, ch.id)
                setOut('subscribed')
              }
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">subscribe</button>
            <button onClick={() => {
              const ch = g.listChannels()[0]
              if (ch) {
                const msgs = g.broadcastChannel(ch.id, { announcement: 'Hello everyone!', ts: Date.now() })
                setOut(`broadcast to ${msgs.length} subscribers`)
              }
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">broadcast</button>
          </div>
        </div>
      )}

      {tab === 'Messaging' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="m-payload" placeholder='{"text":"hi"}' className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const c = g.listConnections()[0]
              if (!c) { setOut('no connections'); return }
              try {
                const payload = JSON.parse((document.getElementById('m-payload') as HTMLInputElement).value || 'null')
                const m = g.send(c.id, payload)
                setOut(m ? `sent: ${m.id}` : 'rate-limited or failed')
              } catch (e) { setOut('invalid JSON: ' + (e as Error).message) }
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">send</button>
            <button onClick={() => {
              const c = g.listConnections()[0]
              if (!c) return
              g.receive(c.id, { from: 'client', text: 'hello server' })
              setOut('received echo')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">receive echo</button>
            <button onClick={() => {
              const c1 = g.listConnections()[0]
              const c2 = g.listConnections()[1]
              if (c1 && c2) {
                const m = g.direct(c2.id, { dm: 'private msg' }, { fromConnectionId: c1.id })
                setOut(m ? 'DM sent' : 'failed')
              }
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">DM conn1→conn2</button>
            <button onClick={() => {
              const r = g.listRooms()[0]
              if (r) {
                const msgs = g.broadcastRoom(r.id, { room: 'announcement' })
                setOut(`broadcast to ${msgs.length} members`)
              }
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">room broadcast</button>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Recent messages:</div>
            <button onClick={() => {
              const msgs = g.getMessages({ limit: 5 })
              setOut(msgs.map(m => `[${m.direction}] ${m.connectionId.slice(0, 12)}.. payload=${JSON.stringify(m.payload).slice(0, 60)}`).join('\n'))
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">show last 5</button>
          </div>
        </div>
      )}

      {tab === 'Heartbeat' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const c = g.listConnections()[0]
              if (c) { g.ping(c.id); setOut(`pinged: ${c.id}`) }
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">ping first</button>
            <button onClick={() => {
              const r = g.heartbeatTick()
              setOut(`alive: ${r.alive}\ndead: ${r.dead.length}\nslow: ${r.slow.length}`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">run tick</button>
            <button onClick={() => {
              const online = g.listOnlineUsers()
              setOut(online.join(', ') || '(no one online)')
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">list online</button>
          </div>
        </div>
      )}

      {tab === 'Metrics' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(g.metrics(), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">metrics</button>
            <button onClick={() => { g.clear(); setOut('cleared') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">clear all</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see gateway operations'}</pre>
    </div>
  )
}
