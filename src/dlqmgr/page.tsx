import { useState } from 'react'
import { DLQManager, getDLQ, resetDLQ } from './index'

const TABS = ['Add', 'List', 'Retry', 'Bulk', 'Metrics'] as const
type Tab = typeof TABS[number]

export default function DLQPage() {
  const [tab, setTab] = useState<Tab>('Add')
  const [dlq] = useState(() => {
    resetDLQ()
    const d = new DLQManager({ defaultMaxAttempts: 3, defaultBackoffMs: a => 200 * a })
    // Pre-populate with some failures
    d.add({ orderId: 1, total: 99 }, 'webhook', 'timeout')
    d.add({ orderId: 2, total: 149 }, 'webhook', '500')
    d.add({ email: 'a@b.com' }, 'email', 'bounce')
    return d
  })
  const [out, setOut] = useState('')
  const [alerts, setAlerts] = useState<string[]>([])

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v69.0 Dead Letter Queue Manager</h1>
      <p className="text-sm text-slate-400">失败消息暂存 · 指数退避 · 最大尝试 · 搁置 park · 批量重放 · 过期清理</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Add' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const msg = dlq.add({ data: 'example' }, 'webhook', 'simulated failure', { tags: ['urgent'] })
              setOut(`Added: ${msg.id} (${msg.status})`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">add webhook failure</button>
            <button onClick={() => {
              const msg = dlq.add({ to: 'user@x.com' }, 'email', 'SMTP error', { tags: ['email'] })
              setOut(`Added: ${msg.id} (${msg.status})`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">add email failure</button>
            <button onClick={() => {
              const msg = dlq.add({ event: 'click' }, 'webhook', 'connection refused', { maxAttempts: 1 })
              setOut(`Added: ${msg.id} (maxAttempts=1)`)
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">add (max 1 attempt)</button>
            <button onClick={() => {
              const d = new DLQManager({ maxQueueSize: 2 })
              d.add({}, 'a', 'e')
              d.add({}, 'a', 'e')
              try { d.add({}, 'a', 'e') } catch (err) { setOut('Expected error: ' + (err as Error).message) }
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">test capacity limit</button>
          </div>
        </div>
      )}

      {tab === 'List' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(dlq.list().map(m => `[${m.id}] ${m.source}: ${m.error} | attempts=${m.attempts}/${m.maxAttempts} status=${m.status}`).join('\n'))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list all</button>
            <button onClick={() => setOut(dlq.list({ status: 'parked' }).map(m => `[${m.id}] ${m.source} parked after ${m.attempts} attempts`).join('\n') || '(no parked)')} className="px-3 py-1.5 bg-amber-700 rounded text-xs">list parked</button>
            <button onClick={() => setOut(dlq.list({ source: 'webhook' }).map(m => `[${m.id}] ${m.error}`).join('\n') || '(no webhooks)')} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">list webhooks</button>
            <button onClick={() => setOut(dlq.list({ tag: 'urgent' }).map(m => `[${m.id}] ${m.error}`).join('\n') || '(none urgent)')} className="px-3 py-1.5 bg-slate-700 rounded text-xs">list urgent</button>
          </div>
        </div>
      )}

      {tab === 'Retry' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="retry-id" placeholder="message id" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const id = (document.getElementById('retry-id') as HTMLInputElement).value
              const ok = dlq.forceRetry(id)
              setOut(ok ? `Forced retry: ${id}` : 'failed')
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">force retry</button>
            <button onClick={() => {
              const id = (document.getElementById('retry-id') as HTMLInputElement).value
              const ok = dlq.success(id)
              setOut(ok ? 'Replay succeeded → removed' : 'failed')
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">mark success</button>
            <button onClick={() => {
              const id = (document.getElementById('retry-id') as HTMLInputElement).value
              const ok = dlq.fail(id, 'manual fail')
              setOut(ok ? 'Marked failed (rescheduled)' : 'failed')
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">mark fail</button>
            <button onClick={() => {
              const id = (document.getElementById('retry-id') as HTMLInputElement).value
              const ok = dlq.park(id, 'manual')
              setOut(ok ? 'Parked' : 'failed')
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">park</button>
            <button onClick={() => {
              const id = (document.getElementById('retry-id') as HTMLInputElement).value
              const ok = dlq.unpark(id)
              setOut(ok ? 'Unparked' : 'failed')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">unpark</button>
            <button onClick={() => {
              const id = (document.getElementById('retry-id') as HTMLInputElement).value
              const ok = dlq.discard(id)
              setOut(ok ? 'Discarded' : 'failed')
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">discard</button>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">Alerts fired:</div>
            <ul className="text-xs space-y-0.5">
              {alerts.length === 0 ? <li className="text-slate-500">(no alerts yet)</li> : alerts.map((a, i) => <li key={i} className="text-amber-300">{a}</li>)}
            </ul>
          </div>
        </div>
      )}

      {tab === 'Bulk' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const n = dlq.bulkReplay({ source: 'webhook' })
              setOut(`Replayed ${n} webhook messages`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">bulk replay webhooks</button>
            <button onClick={() => {
              const n = dlq.bulkReplay({ status: 'parked' })
              setOut(`Replayed ${n} parked messages`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">bulk replay parked</button>
            <button onClick={() => {
              const n = dlq.expire()
              setOut(`Expired ${n} messages`)
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">run expiration</button>
            <button onClick={() => {
              setOut('Ready to retry: ' + dlq.readyToRetry(Date.now() + 10000).length + ' (looking 10s ahead)')
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">check ready</button>
          </div>
        </div>
      )}

      {tab === 'Metrics' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(dlq.metrics(), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">metrics</button>
            <button onClick={() => { dlq.clear(); setOut('cleared') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">clear all</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see DLQ operations'}</pre>
    </div>
  )
}
