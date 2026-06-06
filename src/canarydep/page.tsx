import { useState } from 'react'
import { CanaryEngine, defaultStages, getCanaryEngine, resetCanaryEngine } from './index'

const TABS = ['Create', 'Traffic', 'Evaluate', 'Whitelist', 'List', 'History'] as const
type Tab = typeof TABS[number]

export default function CanaryPage() {
  const [tab, setTab] = useState<Tab>('Create')
  const [eng] = useState(() => {
    resetCanaryEngine()
    const e = new CanaryEngine()
    // Pre-create a sample canary
    const c = e.create({ version: 'v2.0.0', artifact: 'app:v2.0.0', stages: defaultStages(), whitelist: [], blacklist: [] })
    e.start(c.id)
    return e
  })
  const [out, setOut] = useState('')
  const [canaryId, setCanaryId] = useState(eng.list()[0]?.id ?? '')

  const cur = eng.get(canaryId)

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v68.0 Canary Deployment</h1>
      <p className="text-sm text-slate-400">灰度发布 · 阶段推进 · 错误率监控 · 白/黑名单 · 自动提升/回滚 · 流量分配</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      <div className="flex gap-2 items-end">
        <label className="text-xs text-slate-400">Canary</label>
        <select value={canaryId} onChange={e => setCanaryId(e.target.value)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
          {eng.list().map(c => <option key={c.id} value={c.id}>{c.id} ({c.config.version}, {c.status})</option>)}
        </select>
        {cur && (
          <div className="text-xs text-slate-400">
            stage {cur.currentStageIndex + 1}/{cur.config.stages.length} · {cur.config.stages[cur.currentStageIndex]?.name} · {cur.metrics.totalRequests} reqs · {cur.metrics.errorCount} errs
          </div>
        )}
      </div>

      {tab === 'Create' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const c = eng.create({ version: `v3.${Date.now() % 1000}`, artifact: `app:v3.${Date.now() % 1000}`, stages: defaultStages(), whitelist: [], blacklist: [] })
              setCanaryId(c.id)
              setOut(`Created: ${c.id} (${c.config.version})`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">create canary</button>
            <button onClick={() => {
              const ok = eng.start(canaryId)
              setOut(ok ? 'Started' : 'cannot start (not pending)')
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">start</button>
            <button onClick={() => {
              const ok = eng.pause(canaryId)
              setOut(ok ? 'Paused' : 'not running')
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">pause</button>
            <button onClick={() => {
              const ok = eng.resume(canaryId)
              setOut(ok ? 'Resumed' : 'not paused')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">resume</button>
            <button onClick={() => {
              const ok = eng.rollbackCanary(canaryId, 'manual')
              setOut(ok ? 'Rolled back' : 'not found')
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">rollback</button>
          </div>
        </div>
      )}

      {tab === 'Traffic' && cur && (
        <div className="space-y-3">
          <div className="text-xs text-slate-400">Current stage: {cur.config.stages[cur.currentStageIndex]?.name} ({cur.config.stages[cur.currentStageIndex]?.percentage}%)</div>
          <div className="flex gap-2 flex-wrap items-end">
            <input id="tr-user" defaultValue="user-42" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const u = (document.getElementById('tr-user') as HTMLInputElement).value
              setOut(`[${u}] on canary: ${eng.shouldServeCanary(canaryId, u)}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">check user</button>
            <button onClick={() => {
              let on = 0, off = 0
              for (let i = 0; i < 1000; i++) if (eng.shouldServeCanary(canaryId, `user${i}`)) on++; else off++
              setOut(`Simulated 1000 users:\non canary: ${on}\non stable: ${off}`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">simulate 1000 users</button>
            <button onClick={() => {
              for (let i = 0; i < 50; i++) eng.record(canaryId, Math.random() * 200, Math.random() < 0.01)
              const m = eng.metrics(canaryId)
              setOut(`Recorded 50 reqs\nTotal: ${m.total}\nError rate: ${(m.errorRate * 100).toFixed(2)}%\nAvg latency: ${m.avgLatency.toFixed(1)}ms\nP95: ${m.p95}ms`)
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">record 50 good</button>
            <button onClick={() => {
              for (let i = 0; i < 30; i++) eng.record(canaryId, Math.random() * 200, Math.random() < 0.5)
              setOut('Recorded 30 with 50% errors')
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">record 30 bad</button>
          </div>
        </div>
      )}

      {tab === 'Evaluate' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const r = eng.evaluate(canaryId)
              setOut(`Action: ${r.action}\nReason: ${r.reason}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">evaluate</button>
            <button onClick={() => {
              const ok = eng.forceAdvance(canaryId)
              setOut(ok ? 'force-advanced' : 'cannot advance')
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">force advance</button>
            <button onClick={() => {
              const m = eng.metrics(canaryId)
              setOut(`Metrics:\nTotal: ${m.total}\nError rate: ${(m.errorRate * 100).toFixed(2)}%\nAvg: ${m.avgLatency.toFixed(1)}ms\nP95: ${m.p95}ms`)
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">metrics</button>
          </div>
        </div>
      )}

      {tab === 'Whitelist' && cur && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="wl-user" defaultValue="user-vip-1" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const u = (document.getElementById('wl-user') as HTMLInputElement).value
              eng.addWhitelist(canaryId, u)
              setOut(`Added to whitelist: ${u}\nWhitelist: ${cur.config.whitelist.join(', ')}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">add to whitelist</button>
            <button onClick={() => {
              const u = (document.getElementById('wl-user') as HTMLInputElement).value
              eng.addBlacklist(canaryId, u)
              setOut(`Added to blacklist: ${u}\nBlacklist: ${cur.config.blacklist.join(', ')}`)
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">add to blacklist</button>
            <button onClick={() => {
              setOut(`Whitelist: ${cur.config.whitelist.join(', ') || '(empty)'}\nBlacklist: ${cur.config.blacklist.join(', ') || '(empty)'}`)
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">list</button>
          </div>
        </div>
      )}

      {tab === 'List' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(eng.list().map(c => `${c.id} [${c.config.version}] ${c.status} stage=${c.currentStageIndex + 1}/${c.config.stages.length} reqs=${c.metrics.totalRequests} errs=${c.metrics.errorCount}`).join('\n'))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list canaries</button>
            <button onClick={() => setOut('Summary: ' + JSON.stringify(eng.metricsAll()))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">summary</button>
          </div>
        </div>
      )}

      {tab === 'History' && cur && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(cur.history.map(h => `${new Date(h.ts).toISOString()} [${h.action}] ${h.details}`).join('\n'))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">show history</button>
            <button onClick={() => {
              const lines = cur.config.stages.map((s, i) => `${i + 1}. ${s.name} (${s.percentage}%) — min ${s.minRequests} reqs, max error ${(s.maxErrorRate * 100).toFixed(1)}%, max p95 ${s.maxLatencyMs}ms`)
              setOut('Stages:\n' + lines.join('\n'))
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">show stages</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see canary deployment operations'}</pre>
    </div>
  )
}
