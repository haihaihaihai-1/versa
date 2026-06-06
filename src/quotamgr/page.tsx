import { useState } from 'react'
import { QuotaManager, DEFAULT_TIERS, getQuota, resetQuota } from './index'

const TABS = ['Setup', 'Record', 'Snapshot', 'TopConsumers', 'Forecast', 'Alerts'] as const
type Tab = typeof TABS[number]

export default function QuotaPage() {
  const [tab, setTab] = useState<Tab>('Setup')
  const [m, setM] = useState(() => {
    resetQuota()
    const qm = getQuota()
    qm.registerSubject({ id: 'tenant-1', tier: 'free' })
    qm.applyTier('tenant-1', 'free')
    qm.registerSubject({ id: 'tenant-2', tier: 'pro' })
    qm.applyTier('tenant-2', 'pro')
    qm.registerSubject({ id: 'tenant-3', tier: 'enterprise' })
    qm.applyTier('tenant-3', 'enterprise')
    qm.record('tenant-1', 'requests', 500)
    qm.record('tenant-2', 'requests', 30000)
    return qm
  })
  const [out, setOut] = useState('')

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v70.0 Quota Manager</h1>
      <p className="text-sm text-slate-400">租户资源配额 · 时间窗滚动 · 分层限额 · 超额限流/告警 · 用量预测</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Setup' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(m.listTiers().map(t => ({ id: t.id, limits: t.limits.length })), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list tiers</button>
            <button onClick={() => setOut(m.listSubjects().map(s => `${s.id} (${s.tier})`).join('\n'))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">list subjects</button>
            <button onClick={() => setOut(JSON.stringify(m.metrics(), null, 2))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">metrics</button>
            <button onClick={() => { m.clear(); setOut('cleared') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">clear all</button>
          </div>
          <div className="text-xs text-slate-400">Default tiers: {DEFAULT_TIERS.map(t => t.id).join(', ')}</div>
        </div>
      )}

      {tab === 'Record' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <select id="rec-tid" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
              <option value="tenant-1">tenant-1 (free)</option>
              <option value="tenant-2">tenant-2 (pro)</option>
              <option value="tenant-3">tenant-3 (enterprise)</option>
            </select>
            <input id="rec-amount" type="number" defaultValue={100} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs w-24" />
            <button onClick={() => {
              const tid = (document.getElementById('rec-tid') as HTMLSelectElement).value
              const amt = Number((document.getElementById('rec-amount') as HTMLInputElement).value)
              const r = m.record(tid, 'requests', amt)
              setOut(`record: ${r.allowed ? 'OK' : 'BLOCKED'} | state=${r.state} | remaining=${r.remaining}${r.reason ? '\nreason: ' + r.reason : ''}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">record requests</button>
            <button onClick={() => {
              const tid = (document.getElementById('rec-tid') as HTMLSelectElement).value
              const r = m.check(tid, 'requests')
              setOut(r.map(u => `${u.resource}: ${u.used}/${u.limit} (${(u.percent*100).toFixed(1)}%) [${u.state}]`).join('\n') || '(no policy)')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">check usage</button>
          </div>
        </div>
      )}

      {tab === 'Snapshot' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(m.snapshot('tenant-1'), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">tenant-1</button>
            <button onClick={() => setOut(JSON.stringify(m.snapshot('tenant-2'), null, 2))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">tenant-2</button>
            <button onClick={() => setOut(JSON.stringify(m.snapshot('tenant-3'), null, 2))} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">tenant-3</button>
          </div>
        </div>
      )}

      {tab === 'TopConsumers' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(m.topConsumers('requests', Date.now(), 10), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">top requests</button>
            <button onClick={() => {
              m.reset('tenant-1', 'requests')
              setOut('tenant-1 requests reset')
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">reset tenant-1 requests</button>
          </div>
        </div>
      )}

      {tab === 'Forecast' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <select id="fc-tid" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
              <option value="tenant-1">tenant-1</option>
              <option value="tenant-2">tenant-2</option>
              <option value="tenant-3">tenant-3</option>
            </select>
            <button onClick={() => {
              const tid = (document.getElementById('fc-tid') as HTMLSelectElement).value
              const f = m.forecast(tid, 'requests')
              setOut(`used: ${f.used}\nprojected: ${f.projected.toFixed(0)}\nwill exceed at: ${f.willExceedAt ? new Date(f.willExceedAt).toISOString() : 'never (within window)'}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">forecast requests</button>
          </div>
        </div>
      )}

      {tab === 'Alerts' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(m.getAlerts(), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">all alerts</button>
            <button onClick={() => setOut(JSON.stringify(m.getAlerts('tenant-1'), null, 2))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">tenant-1 alerts</button>
            <button onClick={() => { m.clearAlerts(); setOut('alerts cleared') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">clear alerts</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see quota operations'}</pre>
    </div>
  )
}
