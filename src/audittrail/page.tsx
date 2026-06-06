import { useState } from 'react'
import { AuditTrail, getAudit, resetAudit } from './index'

const TABS = ['Log', 'Query', 'History', 'Stats', 'Integrity', 'ImportExport'] as const
type Tab = typeof TABS[number]

export default function AuditTrailPage() {
  const [tab, setTab] = useState<Tab>('Log')
  const [a, setA] = useState(() => {
    resetAudit()
    const at = getAudit()
    at.log({ actor: { id: 'alice', type: 'user' }, action: 'login', resource: { type: 'session', id: 's1' }, status: 'success', severity: 'info', tags: ['auth'] })
    at.log({ actor: { id: 'alice', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1', name: 'Order 42' }, status: 'success', severity: 'info', context: { total: 99 } })
    at.log({ actor: { id: 'bob', type: 'user' }, action: 'update', resource: { type: 'doc', id: 'd1', name: 'Order 42' }, status: 'success', severity: 'info', changes: { diff: { total: { from: 99, to: 149 } } } })
    at.log({ actor: { id: 'bob', type: 'user' }, action: 'permission', resource: { type: 'doc', id: 'd1' }, status: 'denied', severity: 'warning', errorMessage: 'no write access' })
    at.log({ actor: { id: 'attacker', type: 'user' }, action: 'delete', resource: { type: 'doc', id: 'd2' }, status: 'failure', severity: 'critical', errorCode: 'AUTH_FAILED', tags: ['suspicious'] })
    return at
  })
  const [out, setOut] = useState('')

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v71.0 Audit Trail</h1>
      <p className="text-sm text-slate-400">不可变审计追踪 · 链式哈希 · 结构化查询 · 资源/操作者历史 · 完整性校验 · 保留策略</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Log' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const e = a.log({ actor: { id: 'alice', type: 'user' }, action: 'create', resource: { type: 'doc', id: `d${Date.now()}` }, status: 'success', severity: 'info' })
              setOut(`Logged: ${e.id}\nhash: ${e.hash}\nprev: ${e.prevHash}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">log new event</button>
            <button onClick={() => {
              const e = a.log({ actor: { id: 'svc', type: 'system' }, action: 'deploy', resource: { type: 'service', id: 'api' }, status: 'success', severity: 'notice', context: { version: '1.2.3' } })
              setOut(`Deploy logged: ${e.id}`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">log deploy</button>
            <button onClick={() => {
              const e = a.log({ actor: { id: 'intruder', type: 'user' }, action: 'login', resource: { type: 'session', id: 's99' }, status: 'denied', severity: 'critical', errorCode: 'BRUTE_FORCE', tags: ['security'] })
              setOut(`Security event: ${e.id}`)
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">log security</button>
          </div>
        </div>
      )}

      {tab === 'Query' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="q-actor" placeholder="actor id" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input id="q-action" placeholder="action" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input id="q-text" placeholder="text search" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const actor = (document.getElementById('q-actor') as HTMLInputElement).value || undefined
              const action = (document.getElementById('q-action') as HTMLInputElement).value || undefined
              const text = (document.getElementById('q-text') as HTMLInputElement).value || undefined
              const r = a.query({ actorId: actor, action, textSearch: text, limit: 10 })
              setOut(`total: ${r.total}\n${r.events.map(e => `[${e.actor.id}] ${e.action} ${e.resource.type}:${e.resource.id} (${e.status})`).join('\n')}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">query</button>
            <button onClick={() => setOut(JSON.stringify(a.query({ severity: 'critical', limit: 5 }), null, 2))} className="px-3 py-1.5 bg-rose-700 rounded text-xs">critical only</button>
            <button onClick={() => setOut(JSON.stringify(a.query({ tags: ['security'], limit: 5 }), null, 2))} className="px-3 py-1.5 bg-amber-700 rounded text-xs">security tag</button>
          </div>
        </div>
      )}

      {tab === 'History' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(a.getResourceHistory('doc', 'd1').map(e => `${new Date(e.timestamp).toISOString()} | ${e.action} (${e.status})`).join('\n') || '(none)')} className="px-3 py-1.5 bg-blue-700 rounded text-xs">doc d1 history</button>
            <button onClick={() => setOut(a.getActorHistory('alice', 10).map(e => `${new Date(e.timestamp).toISOString()} | ${e.action} ${e.resource.type}:${e.resource.id}`).join('\n') || '(none)')} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">alice history</button>
            <button onClick={() => setOut(a.stream().map(e => e.id).join('\n'))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">stream all</button>
          </div>
        </div>
      )}

      {tab === 'Stats' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(a.stats(), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">compute stats</button>
          </div>
        </div>
      )}

      {tab === 'Integrity' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(a.verifyIntegrity(), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">verify chain</button>
            <button onClick={() => {
              const events = a.stream()
              if (events.length > 0) {
                // Tamper
                (a as unknown as { events: any[] }).events[0].action = 'tampered'
                setOut('Tampered with first event\nverify: ' + JSON.stringify(a.verifyIntegrity(), null, 2))
              }
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">simulate tamper</button>
            <button onClick={() => { a.clear(); setOut('cleared') }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">clear all</button>
          </div>
        </div>
      )}

      {tab === 'ImportExport' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('Exported ' + a.export().length + ' events') } className="px-3 py-1.5 bg-blue-700 rounded text-xs">export</button>
            <button onClick={() => {
              const events = a.export()
              a.clear()
              a.import(events, 'replace')
              setOut('Re-imported ' + a.stream().length + ' events (replace mode)')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">round-trip test</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see audit operations'}</pre>
    </div>
  )
}
