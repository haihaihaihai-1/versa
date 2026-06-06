import { useState } from 'react'
import { BlueGreenDeployer, getDeployer, resetDeployer } from './index'

const TABS = ['Status', 'Deploy', 'Switch', 'Rollback', 'History'] as const
type Tab = typeof TABS[number]

export default function BlueGreenPage() {
  const [tab, setTab] = useState<Tab>('Status')
  const [deployer] = useState(() => {
    resetDeployer()
    return new BlueGreenDeployer()
  })
  const [out, setOut] = useState('')
  const [artifact, setArtifact] = useState('app:v1.0.0')
  const [targetEnv, setTargetEnv] = useState<'blue' | 'green'>('green')

  const show = (s: string) => setOut(o => o ? o + '\n' + s : s)

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v67.0 Blue-Green Deployment</h1>
      <p className="text-sm text-slate-400">蓝绿环境 · 流量切换 · 健康检查 · 自动回滚 · 部署历史 · 路由模拟</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Status' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {(['blue', 'green'] as const).map(env => {
              const s = deployer.getState(env)
              return (
                <div key={env} className="p-3 bg-slate-800 rounded border border-slate-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`text-sm font-bold ${env === 'blue' ? 'text-blue-400' : 'text-green-400'}`}>{env.toUpperCase()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${s.status === 'active' ? 'bg-emerald-900 text-emerald-300' : s.status === 'deploying' ? 'bg-amber-900 text-amber-300' : 'bg-slate-700'}`}>{s.status}</span>
                  </div>
                  <div className="text-xs space-y-1 text-slate-300">
                    <div>weight: <b>{s.weight}%</b></div>
                    <div>active: {s.activeVersion?.artifact ?? '(none)'}</div>
                    <div>previous: {s.previousVersion?.artifact ?? '(none)'}</div>
                    <div>deploying: {s.deploying?.artifact ?? '(none)'}</div>
                  </div>
                </div>
              )
            })}
          </div>
          <button onClick={() => setOut(JSON.stringify(deployer.healthSnapshot(), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">show snapshot</button>
        </div>
      )}

      {tab === 'Deploy' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <select value={targetEnv} onChange={e => setTargetEnv(e.target.value as 'blue' | 'green')} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
              <option value="blue">blue</option>
              <option value="green">green</option>
            </select>
            <input value={artifact} onChange={e => setArtifact(e.target.value)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const v = deployer.deploy(targetEnv, artifact)
              setOut(`Deployed: ${v.id} → ${v.artifact} to ${targetEnv}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">deploy</button>
            <button onClick={() => {
              const s = deployer.getState(targetEnv)
              if (!s.deploying) { setOut('no deploying version'); return }
              deployer.markDeploySuccess(targetEnv, s.deploying.id, Math.random() * 50 + 5)
              deployer.markDeploySuccess(targetEnv, s.deploying.id, Math.random() * 50 + 5)
              setOut('Simulated 2 successful health checks')
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">simulate 2 healthy</button>
            <button onClick={() => {
              const s = deployer.getState(targetEnv)
              if (!s.deploying) { setOut('no deploying version'); return }
              deployer.markDeployFailure(targetEnv, s.deploying.id, 'simulated crash')
              setOut('Simulated failure (auto-rollback triggered if enabled)')
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">simulate failure</button>
            <button onClick={() => {
              const ok = deployer.promote(targetEnv)
              setOut(ok ? `Promoted ${targetEnv}` : 'promote failed (no deploying or unhealthy)')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">promote</button>
          </div>
        </div>
      )}

      {tab === 'Switch' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { deployer.setTrafficWeight('blue', 100); setOut('100% → blue') }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">100% blue</button>
            <button onClick={() => { deployer.setTrafficWeight('blue', 0); setOut('100% → green') }} className="px-3 py-1.5 bg-green-700 rounded text-xs">100% green</button>
            <button onClick={() => { deployer.setTrafficWeight('blue', 50); setOut('50/50 split') }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">50/50</button>
            <button onClick={() => {
              const counts: Record<string, number> = { blue: 0, green: 0 }
              for (let i = 0; i < 1000; i++) counts[deployer.routeRequest()]++
              setOut(`Routed 1000 reqs (current weights):\nblue: ${counts.blue}\ngreen: ${counts.green}`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">simulate 1000 requests</button>
            <button onClick={() => {
              deployer.disable('blue')
              setOut('blue disabled, all traffic → green')
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">disable blue</button>
          </div>
        </div>
      )}

      {tab === 'Rollback' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const ok = deployer.rollback('blue', 'manual')
              setOut(ok ? 'Rolled back blue' : 'no previous version')
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">rollback blue</button>
            <button onClick={() => {
              const ok = deployer.rollback('green', 'manual')
              setOut(ok ? 'Rolled back green' : 'no previous version')
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">rollback green</button>
          </div>
        </div>
      )}

      {tab === 'History' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(deployer.historyList().map(h => `${new Date(h.ts).toISOString()} [${h.action}] ${h.env}${h.version ? ' ' + h.version : ''}${h.details ? ' — ' + h.details : ''}`).join('\n'))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">show history</button>
            <button onClick={() => setOut('Metrics: ' + JSON.stringify(deployer.metrics()))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">metrics</button>
            <button onClick={() => { deployer.reset(); setOut('reset') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">reset</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see deployment operations'}</pre>
    </div>
  )
}
