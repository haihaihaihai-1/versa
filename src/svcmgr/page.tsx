import { useState } from 'react'
import { ServiceMesh, getMesh, resetMesh } from './index'

const TABS = ['Services', 'Instances', 'LoadBalance', 'Circuit', 'Route', 'Stats'] as const
type Tab = typeof TABS[number]

export default function ServiceMeshPage() {
  const [tab, setTab] = useState<Tab>('Services')
  const [m, setM] = useState(() => {
    resetMesh()
    const mesh = new ServiceMesh({ defaultLoadBalancing: 'round-robin' })
    mesh.defineService({ name: 'api', loadBalancing: 'round-robin' })
    mesh.defineService({ name: 'auth', loadBalancing: 'least-conn' })
    mesh.registerInstance({ service: 'api', host: '10.0.0.1', port: 3000 })
    mesh.registerInstance({ service: 'api', host: '10.0.0.2', port: 3000 })
    mesh.registerInstance({ service: 'api', host: '10.0.0.3', port: 3000, weight: 200 })
    mesh.registerInstance({ service: 'auth', host: '10.0.1.1', port: 4000 })
    return mesh
  })
  const [out, setOut] = useState('')

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v73.0 Service Mesh</h1>
      <p className="text-sm text-slate-400">服务注册 · 负载均衡 · 熔断器 · 重试 · 流量镜像 · 健康检查</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Services' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(m.listServiceDefinitions().map(s => `${s.name} | lb=${s.loadBalancing}`).join('\n'))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list services</button>
            <button onClick={() => {
              m.defineService({ name: 'payments', loadBalancing: 'weighted' })
              setOut('defined: payments')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">define payments</button>
            <button onClick={() => setOut(JSON.stringify(m.metrics(), null, 2))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">mesh metrics</button>
          </div>
        </div>
      )}

      {tab === 'Instances' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="svc-svc" placeholder="service" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input id="svc-host" placeholder="host" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input id="svc-port" type="number" placeholder="port" defaultValue={3000} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs w-20" />
            <button onClick={() => {
              const svc = (document.getElementById('svc-svc') as HTMLInputElement).value
              const host = (document.getElementById('svc-host') as HTMLInputElement).value
              const port = Number((document.getElementById('svc-port') as HTMLInputElement).value)
              const i = m.registerInstance({ service: svc, host, port })
              setOut(`instance: ${i.id}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">add instance</button>
            <button onClick={() => setOut(m.listInstances().map(i => `${i.service} | ${i.host}:${i.port} | ${i.health} | conn=${i.activeConnections} | w=${i.weight}`).join('\n'))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">list all</button>
            <button onClick={() => {
              const insts = m.listInstances()
              if (insts.length > 0) {
                m.recordHealthCheck(insts[0].id, insts[0].health === 'healthy' ? 'unhealthy' : 'healthy')
                setOut(`toggled health of ${insts[0].id}`)
              }
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">toggle first health</button>
          </div>
        </div>
      )}

      {tab === 'LoadBalance' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const out: string[] = []
              for (let i = 0; i < 6; i++) {
                const inst = m.selectInstance('api')
                out.push(`pick ${i + 1}: ${inst?.host}:${inst?.port}`)
              }
              setOut(out.join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">6 picks round-robin</button>
            <button onClick={() => {
              const inst = m.selectInstance('api', { sourceIp: '192.168.1.100' })
              setOut(`ip-hash for 192.168.1.100: ${inst?.host}:${inst?.port}`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">ip-hash pick</button>
            <button onClick={() => {
              const counts: Record<string, number> = {}
              for (let i = 0; i < 1000; i++) {
                const inst = m.selectInstance('api')
                if (inst) counts[inst.host] = (counts[inst.host] ?? 0) + 1
              }
              setOut(JSON.stringify(counts, null, 2))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">weighted 1000 picks</button>
          </div>
        </div>
      )}

      {tab === 'Circuit' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              setOut('circuit api: ' + m.getCircuitState('api') + '\ncircuit auth: ' + m.getCircuitState('auth'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">get states</button>
            <button onClick={async () => {
              const r = await m.route({ service: 'api' }, () => Promise.resolve({ status: 200 }))
              setOut(`route result: success=${r.success} status=${r.status} attempts=${r.attempts} dur=${r.durationMs}ms`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">route OK</button>
            <button onClick={async () => {
              const r = await m.route({ service: 'api' }, () => Promise.resolve({ status: 500 }))
              setOut(`route 500: success=${r.success} status=${r.status} attempts=${r.attempts}`)
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">route 500</button>
            <button onClick={async () => {
              for (let i = 0; i < 7; i++) {
                await m.route({ service: 'api' }, () => Promise.resolve({ status: 500 })).catch(() => null)
              }
              setOut('after 7 failures: circuit=' + m.getCircuitState('api'))
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">trip circuit</button>
          </div>
        </div>
      )}

      {tab === 'Route' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={async () => {
              const r = await m.route({ service: 'api', path: '/users' }, () => Promise.resolve({ status: 200, body: { users: [] } }))
              setOut(`route api/users: status=${r.status} success=${r.success} attempts=${r.attempts} on ${r.instance.host}:${r.instance.port}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">route api/users</button>
            <button onClick={async () => {
              const r = await m.route({ service: 'auth', path: '/token' }, () => Promise.resolve({ status: 200, body: { token: 'abc' } }))
              setOut(`route auth/token: status=${r.status} on ${r.instance.host}:${r.instance.port}`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">route auth/token</button>
            <button onClick={async () => {
              let attempts = 0
              const r = await m.route({ service: 'api' }, () => { attempts++; return Promise.resolve({ status: attempts < 2 ? 500 : 200 }) })
              setOut(`retried: attempts=${r.attempts} (saw ${attempts} calls)`)
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">retry test</button>
          </div>
        </div>
      )}

      {tab === 'Stats' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(m.serviceStats('api'), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">api stats</button>
            <button onClick={() => setOut(JSON.stringify(m.serviceStats('auth'), null, 2))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">auth stats</button>
            <button onClick={() => {
              m.configureMirroring('api', 50, m.listInstances('api').map(i => i.id))
              setOut('mirroring configured 50% to all api instances')
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">configure mirror</button>
            <button onClick={() => { m.clear(); setOut('cleared') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">clear all</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see service mesh operations'}</pre>
    </div>
  )
}
