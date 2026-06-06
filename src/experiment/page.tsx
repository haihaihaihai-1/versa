import { useState } from 'react'
import { ExperimentService, type Experiment, type ExperimentStatus, type Variant } from './index'

const svc = new ExperimentService()

const sampleExp: Omit<Experiment, 'createdAt' | 'updatedAt'> = {
  key: 'checkout_button',
  name: 'Checkout Button Color',
  description: 'Test green vs orange CTA',
  status: 'running',
  variants: [
    { name: 'control', weight: 50, config: { color: 'blue', text: 'Buy Now' }, description: 'Original blue' },
    { name: 'treatment', weight: 50, config: { color: 'green', text: 'Get Yours' }, description: 'New green' }
  ],
  rampPercent: 100,
  tags: ['homepage', 'cta'],
  ownerId: 'alice'
}

export default function ExperimentPage() {
  const [tab, setTab] = useState<'overview' | 'experiments' | 'assign' | 'results' | 'metrics'>('overview')
  const [exps, setExps] = useState<Experiment[]>(svc.listExperiments())
  const [selectedKey, setSelectedKey] = useState<string>(sampleExp.key)
  const [userId, setUserId] = useState('user-42')
  const [country, setCountry] = useState('US')
  const [assignment, setAssignment] = useState<{ variant: string; source: string; config: Record<string, unknown> } | null>(null)
  const [results, setResults] = useState<{ variant: string; exposures: number; conversions: number; conversionRate: number; uniqueUsers: number; totalValue: number }[] | null>(null)
  const [metrics, setMetrics] = useState(svc.getMetrics())
  const [newExp, setNewExp] = useState({ key: 'new_exp', name: 'New Experiment', variantA: 'control', variantB: 'treatment' })

  const ensureSample = () => {
    if (svc.getExperiment(sampleExp.key) == null) {
      svc.createExperiment(sampleExp)
    }
    setExps(svc.listExperiments())
    setMetrics(svc.getMetrics())
  }

  const handleAssign = () => {
    ensureSample()
    const r = svc.assign(selectedKey, { userId, attributes: { country } })
    if (r) setAssignment({ variant: r.variant, source: r.source, config: r.config })
    else setAssignment(null)
  }
  const handleTrack = () => {
    if (assignment) {
      svc.trackConversion({ experimentKey: selectedKey, variant: assignment.variant, userId, metric: 'goal' })
      setMetrics(svc.getMetrics())
    }
  }
  const handleResults = () => {
    ensureSample()
    const r = svc.computeResults(selectedKey)
    setResults(r ? r.variantStats : null)
  }
  const handleCreate = () => {
    try {
      svc.createExperiment({ key: newExp.key, name: newExp.name, status: 'running', variants: [{ name: newExp.variantA, weight: 50, config: {} }, { name: newExp.variantB, weight: 50, config: {} }] })
      setExps(svc.listExperiments())
      setMetrics(svc.getMetrics())
    } catch (e) { alert(String(e)) }
  }
  const handleStart = (k: string) => { svc.startExperiment(k); setExps(svc.listExperiments()); setMetrics(svc.getMetrics()) }
  const handlePause = (k: string) => { svc.pauseExperiment(k); setExps(svc.listExperiments()); setMetrics(svc.getMetrics()) }
  const handleComplete = (k: string) => { svc.completeExperiment(k); setExps(svc.listExperiments()); setMetrics(svc.getMetrics()) }
  const handleDelete = (k: string) => { svc.deleteExperiment(k); setExps(svc.listExperiments()); setMetrics(svc.getMetrics()) }

  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'experiments', label: '实验' },
    { id: 'assign', label: '分配' },
    { id: 'results', label: '结果' },
    { id: 'metrics', label: '指标' }
  ] as const

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">功能实验 / A-B 测试</h1>
      <p className="text-gray-500 mb-4">确定性哈希分桶 · 多变量 · 流量分阶段提升 · 显著性检验</p>

      <div className="flex gap-2 mb-4 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 whitespace-nowrap ${tab === t.id ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-500'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'experiments' && (
        <div>
          <div className="flex gap-2 mb-3 items-end flex-wrap">
            <div><label className="block text-xs">Key</label><input value={newExp.key} onChange={e => setNewExp({ ...newExp, key: e.target.value })} className="border rounded px-2 py-1" /></div>
            <div><label className="block text-xs">Name</label><input value={newExp.name} onChange={e => setNewExp({ ...newExp, name: e.target.value })} className="border rounded px-2 py-1" /></div>
            <div><label className="block text-xs">Variant A</label><input value={newExp.variantA} onChange={e => setNewExp({ ...newExp, variantA: e.target.value })} className="border rounded px-2 py-1" /></div>
            <div><label className="block text-xs">Variant B</label><input value={newExp.variantB} onChange={e => setNewExp({ ...newExp, variantB: e.target.value })} className="border rounded px-2 py-1" /></div>
            <button onClick={handleCreate} className="px-3 py-1 bg-blue-500 text-white rounded">创建</button>
            <button onClick={ensureSample} className="px-3 py-1 bg-gray-200 rounded">加载示例</button>
          </div>
          <table className="w-full text-sm border">
            <thead><tr className="bg-gray-100"><th className="p-2 text-left">Key</th><th className="p-2 text-left">Name</th><th className="p-2">Variants</th><th className="p-2">Status</th><th className="p-2">Tags</th><th className="p-2">Actions</th></tr></thead>
            <tbody>{exps.length === 0 ? <tr><td colSpan={6} className="p-3 text-center text-gray-400">No experiments. Click "Load sample" or create one.</td></tr> : exps.map(e => (
              <tr key={e.key} className="border-t"><td className="p-2 font-mono">{e.key}</td><td className="p-2">{e.name}</td><td className="p-2 text-center">{e.variants.length}</td><td className="p-2 text-center"><StatusBadge status={e.status} /></td><td className="p-2 text-xs">{e.tags?.join(', ')}</td><td className="p-2 text-center space-x-1">
                {e.status === 'draft' && <button onClick={() => handleStart(e.key)} className="px-2 py-0.5 bg-green-500 text-white text-xs rounded">Start</button>}
                {e.status === 'running' && <button onClick={() => handlePause(e.key)} className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded">Pause</button>}
                {(e.status === 'paused' || e.status === 'running') && <button onClick={() => handleComplete(e.key)} className="px-2 py-0.5 bg-gray-500 text-white text-xs rounded">Complete</button>}
                <button onClick={() => handleDelete(e.key)} className="px-2 py-0.5 bg-red-500 text-white text-xs rounded">Del</button>
              </td></tr>
            ))}</tbody>
          </table>
        </div>
      )}

      {tab === 'assign' && (
        <div>
          <div className="flex gap-2 mb-3 items-end flex-wrap">
            <div><label className="block text-xs">Experiment</label><select value={selectedKey} onChange={e => setSelectedKey(e.target.value)} className="border rounded px-2 py-1">{exps.map(e => <option key={e.key} value={e.key}>{e.key}</option>)}</select></div>
            <div><label className="block text-xs">User ID</label><input value={userId} onChange={e => setUserId(e.target.value)} className="border rounded px-2 py-1" /></div>
            <div><label className="block text-xs">Country</label><input value={country} onChange={e => setCountry(e.target.value)} className="border rounded px-2 py-1" /></div>
            <button onClick={handleAssign} className="px-3 py-1 bg-blue-500 text-white rounded">分配</button>
            {assignment && <button onClick={handleTrack} className="px-3 py-1 bg-green-500 text-white rounded">记录转化</button>}
          </div>
          {assignment && (
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded border">
              <div className="text-2xl font-bold">{assignment.variant}</div>
              <div className="text-sm text-gray-500">source: {assignment.source}</div>
              <pre className="mt-2 bg-white p-2 rounded text-xs">{JSON.stringify(assignment.config, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      {tab === 'results' && (
        <div>
          <div className="flex gap-2 mb-3 items-end">
            <select value={selectedKey} onChange={e => setSelectedKey(e.target.value)} className="border rounded px-2 py-1">{exps.map(e => <option key={e.key} value={e.key}>{e.key}</option>)}</select>
            <button onClick={handleResults} className="px-3 py-1 bg-blue-500 text-white rounded">计算结果</button>
          </div>
          {results && (
            <table className="w-full text-sm border">
              <thead><tr className="bg-gray-100"><th className="p-2 text-left">Variant</th><th className="p-2 text-right">Exposures</th><th className="p-2 text-right">Conversions</th><th className="p-2 text-right">Rate</th><th className="p-2 text-right">Unique</th><th className="p-2 text-right">Value</th></tr></thead>
              <tbody>{results.map((r, i) => <tr key={i} className="border-t"><td className="p-2 font-bold">{r.variant}</td><td className="p-2 text-right">{r.exposures}</td><td className="p-2 text-right">{r.conversions}</td><td className="p-2 text-right">{(r.conversionRate * 100).toFixed(2)}%</td><td className="p-2 text-right">{r.uniqueUsers}</td><td className="p-2 text-right">{r.totalValue}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'metrics' && (
        <div className="grid grid-cols-3 gap-4">
          <Metric label="Experiments" value={metrics.totalExperiments} />
          <Metric label="Assignments" value={metrics.totalAssignments} />
          <Metric label="Conversions" value={metrics.totalConversions} />
          <Metric label="Users Exposed" value={metrics.totalExposureUsers} />
          <div className="col-span-3 p-4 bg-gray-50 rounded">
            <h3 className="font-bold mb-2">By Status</h3>
            <div className="grid grid-cols-5 gap-2">
              {(['draft', 'running', 'paused', 'completed', 'archived'] as ExperimentStatus[]).map(s => <div key={s} className="text-center"><div className="text-2xl font-bold">{metrics.byStatus[s]}</div><div className="text-xs text-gray-500">{s}</div></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ExperimentStatus }) {
  const colors: Record<ExperimentStatus, string> = { draft: 'bg-gray-300', running: 'bg-green-500', paused: 'bg-yellow-500', completed: 'bg-blue-500', archived: 'bg-gray-500' }
  return <span className={`px-2 py-0.5 rounded text-white text-xs ${colors[status]}`}>{status}</span>
}

function OverviewTab() {
  const features = [
    { title: '确定性分桶', desc: 'SHA-256 哈希保证用户始终落在同一桶' },
    { title: '权重分配', desc: 'A/B/n 多变量，自定义权重比例' },
    { title: '流量分阶段提升', desc: '0-100% 渐进式灰度发布' },
    { title: '强制覆盖', desc: '白名单用户强制分配到指定变体' },
    { title: '保留对照组', desc: 'Holdout 防止所有用户被实验污染' },
    { title: '定向条件', desc: 'match-all / match-attrs / and / or / not 树形规则' },
    { title: '转化追踪', desc: '多指标、多用户、事件级时间戳' },
    { title: '显著性检验', desc: '双比例 z 检验，p < 0.05 显著' }
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {features.map(f => <div key={f.title} className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border"><div className="font-bold mb-1">{f.title}</div><div className="text-sm text-gray-600">{f.desc}</div></div>)}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border"><div className="text-sm text-gray-600">{label}</div><div className="text-3xl font-bold">{value}</div></div>
}
