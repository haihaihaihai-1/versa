import { useState } from 'react'
import { FeatureStore, resetFeatureStore } from './index'

const TABS = ['Setup', 'Write', 'OnlineRead', 'OfflineQuery', 'Groups', 'Stats'] as const
type Tab = typeof TABS[number]

export default function FeatureStorePage() {
  const [tab, setTab] = useState<Tab>('Setup')
  const [fs] = useState<FeatureStore>(() => {
    resetFeatureStore()
    const f = new FeatureStore()
    f.defineFeature({ name: 'age', dataType: 'int', description: 'user age' })
    f.defineFeature({ name: 'name', dataType: 'string' })
    f.defineFeature({ name: 'lifetime_value', dataType: 'float' })
    f.defineFeature({ name: 'is_active', dataType: 'bool' })
    f.upsertEntity({ id: 'u1', type: 'user' })
    f.upsertEntity({ id: 'u2', type: 'user' })
    f.upsertEntity({ id: 'u3', type: 'user' })
    f.set('age', 'u1', 25)
    f.set('age', 'u2', 30)
    f.set('age', 'u3', 28)
    f.set('name', 'u1', 'alice')
    f.set('name', 'u2', 'bob')
    f.set('lifetime_value', 'u1', 999.50)
    f.set('is_active', 'u1', true)
    return f
  })
  const [out, setOut] = useState('')

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v75.0 Feature Store</h1>
      <p className="text-sm text-slate-400">特征定义 · 实体键存储 · 版本化 · 在线/离线路径 · 点时间查询 · 特征组 · TTL</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Setup' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(fs.listDefinitions().map(d => `${d.name} v${d.version} (${d.dataType})${d.deprecated ? ' [DEPRECATED]' : ''}`).join('\n'))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list definitions</button>
            <button onClick={() => {
              fs.defineFeature({ name: 'last_login', dataType: 'int', description: 'last login ts' })
              setOut('defined: last_login')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">define new feature</button>
            <button onClick={() => {
              fs.deprecateFeature('lifetime_value')
              setOut('deprecated: lifetime_value')
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">deprecate</button>
            <button onClick={() => setOut(fs.listEntities().map(e => `${e.id} (${e.type})`).join('\n'))} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">list entities</button>
          </div>
        </div>
      )}

      {tab === 'Write' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="fs-feat" placeholder="feature" defaultValue="age" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input id="fs-ent" placeholder="entity id" defaultValue="u4" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input id="fs-val" placeholder="value" defaultValue="42" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input id="fs-ttl" type="number" placeholder="ttl ms" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs w-24" />
            <button onClick={() => {
              const f = (document.getElementById('fs-feat') as HTMLInputElement).value
              const e = (document.getElementById('fs-ent') as HTMLInputElement).value
              const v = (document.getElementById('fs-val') as HTMLInputElement).value
              const ttlStr = (document.getElementById('fs-ttl') as HTMLInputElement).value
              const ttl = ttlStr ? Number(ttlStr) : undefined
              try {
                fs.upsertEntity({ id: e, type: 'user' })
                const r = fs.set(f, e, v, { ttlMs: ttl })
                setOut(`set: ${f}=${v} for ${e}${ttl ? ` (ttl=${ttl}ms)` : ''}\nts=${r.timestamp}`)
              } catch (err) { setOut('error: ' + (err as Error).message) }
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">write</button>
            <button onClick={() => {
              const r = fs.setBatch([
                { featureName: 'age', entityId: 'u5', value: 22 },
                { featureName: 'name', entityId: 'u5', value: 'charlie' },
                { featureName: 'is_active', entityId: 'u5', value: true },
              ])
              setOut('batch wrote ' + r.length + ' values')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">batch write</button>
          </div>
          <div>
            <div className="text-xs text-slate-400 mb-1">History viewer:</div>
            <div className="flex gap-2 flex-wrap">
              <input id="fs-hist-feat" placeholder="feature" defaultValue="age" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
              <input id="fs-hist-ent" placeholder="entity" defaultValue="u1" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
              <button onClick={() => {
                const f = (document.getElementById('fs-hist-feat') as HTMLInputElement).value
                const e = (document.getElementById('fs-hist-ent') as HTMLInputElement).value
                const h = fs.history(f, e)
                setOut(h.map(v => `ts=${v.timestamp} value=${JSON.stringify(v.value)}`).join('\n') || '(no history)')
              }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">show history</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'OnlineRead' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="fs-online-ent" defaultValue="u1" placeholder="entity" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const e = (document.getElementById('fs-online-ent') as HTMLInputElement).value
              const r = fs.onlineGet(e, ['age', 'name', 'lifetime_value', 'is_active'])
              setOut(JSON.stringify(r, null, 2))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">get all features</button>
            <button onClick={() => {
              const r = fs.get('age', 'u1', { asOf: Date.now() - 100000 })
              setOut('age @ past: ' + JSON.stringify(r))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">point-in-time age</button>
          </div>
        </div>
      )}

      {tab === 'OfflineQuery' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="fs-batch-ents" defaultValue="u1,u2,u3" placeholder="comma-separated" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input id="fs-batch-feats" defaultValue="age,name,is_active" placeholder="features" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const ents = (document.getElementById('fs-batch-ents') as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean)
              const feats = (document.getElementById('fs-batch-feats') as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean)
              const r = fs.offlineQuery({ entityIds: ents, features: feats, defaultValues: { age: 0, is_active: false } })
              setOut(JSON.stringify(r, null, 2))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">offline query</button>
          </div>
        </div>
      )}

      {tab === 'Groups' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="fs-grp-name" placeholder="group name" defaultValue="user-profile" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input id="fs-grp-feats" defaultValue="age,name,is_active" placeholder="features" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const n = (document.getElementById('fs-grp-name') as HTMLInputElement).value
              const fs_str = (document.getElementById('fs-grp-feats') as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean)
              const g = fs.createGroup({ name: n, features: fs_str })
              setOut(`group: ${g.id} (${g.name})`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">create group</button>
            <button onClick={() => {
              const list = fs.listGroups().map(g => `${g.id} | ${g.name} | features=${g.features.join(',')}`).join('\n')
              setOut(list || '(none)')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">list groups</button>
            <button onClick={() => {
              const g = fs.listGroups()[0]
              if (g) {
                const r = fs.onlineGetGroup('u1', g.id)
                setOut(`group ${g.name} for u1:\n` + JSON.stringify(r, null, 2))
              }
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">onlineGetGroup u1</button>
          </div>
        </div>
      )}

      {tab === 'Stats' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(fs.stats(), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">stats</button>
            <button onClick={() => {
              const n = fs.sweep()
              setOut(`swept ${n} expired values`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">sweep expired</button>
            <button onClick={() => { fs.clear(); setOut('cleared') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">clear all</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see feature store operations'}</pre>
    </div>
  )
}
