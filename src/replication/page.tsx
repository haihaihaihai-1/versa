import { useState } from 'react'
import { ReplicationManager } from './index'

const rm = new ReplicationManager('dc-1')
rm.addDc('dc-2', 'us-east')
rm.addDc('dc-3', 'eu-west')

export default function ReplicationPage() {
  const [tab, setTab] = useState<'overview' | 'dcs' | 'data' | 'replicate' | 'conflicts' | 'metrics'>('overview')
  const [dcs, setDcs] = useState(rm.listDcs())
  const [selectedDc, setSelectedDc] = useState('dc-1')
  const [key, setKey] = useState('user:42')
  const [value, setValue] = useState('Alice')
  const [stored, setStored] = useState<{ key: string; value: unknown } | null>(null)
  const [replicateResult, setReplicateResult] = useState<{ from: string; to: string; synced: number } | null>(null)
  const [conflicts, setConflicts] = useState(rm.listConflicts())
  const [policy, setPolicy] = useState<'lww' | 'first-write-wins' | 'max' | 'min' | 'merge'>('lww')
  const [metrics, setMetrics] = useState(rm.getMetrics())
  const [digest, setDigest] = useState<{ count: number; hash: string } | null>(null)

  const refresh = () => {
    setDcs(rm.listDcs())
    setMetrics(rm.getMetrics())
    setConflicts(rm.listConflicts())
  }

  const handleSet = () => {
    rm.set(key, value, selectedDc)
    refresh()
  }
  const handleDelete = () => {
    rm.delete(key, selectedDc)
    refresh()
  }
  const handleGet = () => {
    const v = rm.get(key, selectedDc)
    setStored(v ? { key, value: v.value } : null)
  }
  const handleReplicate = async () => {
    const target = dcs.find(d => d.id !== selectedDc)
    if (!target) return
    const synced = await rm.replicate(selectedDc, target.id)
    setReplicateResult({ from: selectedDc, to: target.id, synced })
    refresh()
  }
  const handleBroadcast = async () => {
    await rm.broadcast(selectedDc)
    refresh()
  }
  const handleSetPolicy = () => {
    rm.setPolicy(policy)
    refresh()
  }
  const handleDigest = () => {
    setDigest(rm.digest(selectedDc))
  }
  const handlePartition = () => {
    const target = dcs.find(d => d.id !== selectedDc)
    if (target) {
      rm.setDcStatus(target.id, target.status === 'partitioned' ? 'online' : 'partitioned')
      refresh()
    }
  }

  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'dcs', label: '数据中心' },
    { id: 'data', label: '数据' },
    { id: 'replicate', label: '同步' },
    { id: 'conflicts', label: '冲突' },
    { id: 'metrics', label: '指标' }
  ] as const

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">多数据中心复制 / 冲突解决</h1>
      <p className="text-gray-500 mb-4">向量时钟 · LWW/Max/Min/Merge 冲突策略 · Quorum · 反熵同步</p>

      <div className="flex gap-2 mb-4 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 whitespace-nowrap ${tab === t.id ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-500'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'dcs' && (
        <div>
          <table className="w-full text-sm border">
            <thead><tr className="bg-gray-100"><th className="p-2 text-left">ID</th><th className="p-2 text-left">Region</th><th className="p-2">Status</th><th className="p-2">Last Seen</th><th className="p-2 text-right">Keys</th><th className="p-2">Actions</th></tr></thead>
            <tbody>{dcs.map(d => <tr key={d.id} className="border-t"><td className="p-2 font-mono">{d.id}</td><td className="p-2">{d.region}</td><td className="p-2 text-center"><StatusBadge status={d.status} /></td><td className="p-2 text-center text-xs">{new Date(d.lastSeen).toLocaleTimeString()}</td><td className="p-2 text-right">{d.storage.size}</td><td className="p-2 text-center"><button onClick={handlePartition} className="px-2 py-0.5 bg-orange-500 text-white text-xs rounded">Toggle Partition</button></td></tr>)}</tbody>
          </table>
        </div>
      )}
      {tab === 'data' && (
        <div>
          <div className="flex gap-2 mb-3 items-end flex-wrap">
            <div><label className="block text-xs">DC</label><select value={selectedDc} onChange={e => setSelectedDc(e.target.value)} className="border rounded px-2 py-1">{dcs.map(d => <option key={d.id} value={d.id}>{d.id}</option>)}</select></div>
            <div><label className="block text-xs">Key</label><input value={key} onChange={e => setKey(e.target.value)} className="border rounded px-2 py-1" /></div>
            <div><label className="block text-xs">Value</label><input value={value} onChange={e => setValue(e.target.value)} className="border rounded px-2 py-1" /></div>
            <button onClick={handleSet} className="px-3 py-1 bg-blue-500 text-white rounded">Set</button>
            <button onClick={handleGet} className="px-3 py-1 bg-gray-200 rounded">Get</button>
            <button onClick={handleDelete} className="px-3 py-1 bg-red-500 text-white rounded">Delete</button>
          </div>
          {stored && <div className="p-3 bg-gray-50 rounded"><b>{stored.key}</b> = {String(stored.value)}</div>}
          <div className="mt-4">
            <h3 className="font-bold mb-2">{selectedDc} 上的键</h3>
            <div className="bg-gray-50 p-2 rounded text-xs max-h-64 overflow-auto">
              {rm.snapshot(selectedDc).map(({ key: k, value: v }) => <div key={k}>{k} = {String(v)}</div>)}
            </div>
          </div>
        </div>
      )}
      {tab === 'replicate' && (
        <div>
          <div className="flex gap-2 mb-3 items-end">
            <div><label className="block text-xs">From</label><select value={selectedDc} onChange={e => setSelectedDc(e.target.value)} className="border rounded px-2 py-1">{dcs.map(d => <option key={d.id} value={d.id}>{d.id}</option>)}</select></div>
            <button onClick={handleReplicate} className="px-3 py-1 bg-blue-500 text-white rounded">同步到下一个</button>
            <button onClick={handleBroadcast} className="px-3 py-1 bg-purple-500 text-white rounded">广播全部</button>
            <button onClick={handleDigest} className="px-3 py-1 bg-gray-200 rounded">计算摘要</button>
          </div>
          {replicateResult && <div className="p-3 bg-green-50 rounded mb-2">从 <b>{replicateResult.from}</b> 同步到 <b>{replicateResult.to}</b>: <b>{replicateResult.synced}</b> 个键</div>}
          {digest && <div className="p-3 bg-blue-50 rounded">摘要 ({selectedDc}): <b>{digest.hash}</b> ({digest.count} keys)</div>}
          <h3 className="font-bold mt-4 mb-2">所有 DC 键分布</h3>
          <table className="w-full text-sm border">
            <thead><tr className="bg-gray-100"><th className="p-2 text-left">DC</th><th className="p-2 text-right">Keys</th></tr></thead>
            <tbody>{dcs.map(d => <tr key={d.id} className="border-t"><td className="p-2 font-mono">{d.id}</td><td className="p-2 text-right">{d.storage.size}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {tab === 'conflicts' && (
        <div>
          <div className="flex gap-2 mb-3 items-end">
            <div><label className="block text-xs">Policy</label><select value={policy} onChange={e => setPolicy(e.target.value as typeof policy)} className="border rounded px-2 py-1"><option value="lww">LWW (Last-Write-Wins)</option><option value="first-write-wins">First-Write-Wins</option><option value="max">Max (numeric)</option><option value="min">Min (numeric)</option><option value="merge">Merge (objects)</option></select></div>
            <button onClick={handleSetPolicy} className="px-3 py-1 bg-blue-500 text-white rounded">应用</button>
          </div>
          <p className="text-sm text-gray-500 mb-2">当前策略: <b>{rm.getPolicy()}</b></p>
          {conflicts.length === 0 ? <div className="text-gray-400">尚无冲突 (在两个 DC 并发写同一 key 后同步即可触发)</div> : (
            <table className="w-full text-sm border">
              <thead><tr className="bg-gray-100"><th className="p-2 text-left">Key</th><th className="p-2">Ops</th><th className="p-2">Resolution</th><th className="p-2">Winner</th></tr></thead>
              <tbody>{conflicts.slice(-10).map((c, i) => <tr key={i} className="border-t"><td className="p-2 font-mono">{c.key}</td><td className="p-2 text-center">{c.ops.length}</td><td className="p-2 text-center">{c.resolution}</td><td className="p-2 text-center">{c.winner ? String(c.winner.value) : '-'}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}
      {tab === 'metrics' && (
        <div className="grid grid-cols-3 gap-4">
          <Metric label="Total Ops" value={metrics.totalOps} />
          <Metric label="Conflicts" value={metrics.totalConflicts} />
          <Metric label="Auto-Resolved" value={metrics.autoResolved} />
          <Metric label="Synced" value={metrics.syncedOps} />
          <Metric label="Partitions" value={metrics.partitionEvents} />
          <Metric label="DCs" value={dcs.length} />
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: 'online' | 'offline' | 'partitioned' }) {
  const colors = { online: 'bg-green-500', offline: 'bg-red-500', partitioned: 'bg-orange-500' }
  return <span className={`px-2 py-0.5 rounded text-white text-xs ${colors[status]}`}>{status}</span>
}

function OverviewTab() {
  const features = [
    { title: '向量时钟', desc: '跟踪分布式因果关系 (before/after/concurrent)' },
    { title: '最后写入胜出', desc: 'LWW 默认策略按时间戳' },
    { title: '多策略', desc: 'LWW / First-Write / Max / Min / Merge / Custom' },
    { title: '广播复制', desc: '从当前 DC 推送到所有其他 DC' },
    { title: 'Quorum 读/写', desc: '多数派读写保证一致性' },
    { title: '反熵同步', desc: 'Merkle 摘要对比检测差异' },
    { title: '分区模拟', desc: 'partitioned 状态触发隔离与恢复' },
    { title: '冲突日志', desc: '记录所有冲突及其自动解决方案' }
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {features.map(f => <div key={f.title} className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border"><div className="font-bold mb-1">{f.title}</div><div className="text-sm text-gray-600">{f.desc}</div></div>)}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border"><div className="text-sm text-gray-600">{label}</div><div className="text-3xl font-bold">{value}</div></div>
}
