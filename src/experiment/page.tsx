import { useState } from 'react'
import { ExperimentTracker, getExperimentTracker, type Run, type RunStatus } from './index'

const seed = (t: ExperimentTracker): void => {
  if (t.totalRuns() > 0) return
  const r1 = t.startRun({ name: 'mlp-baseline', params: { lr: 0.01, batch: 32 }, tags: ['baseline'] })
  t.logMetric(r1.id, 'acc', 0.82)
  t.logMetric(r1.id, 'loss', 0.45)
  t.finishRun(r1.id)
  const r2 = t.startRun({ name: 'cnn-v1', params: { lr: 0.001, batch: 64 }, tags: ['cnn'] })
  t.logMetric(r2.id, 'acc', 0.91)
  t.logMetric(r2.id, 'loss', 0.22)
  t.finishRun(r2.id)
}

const tracker = getExperimentTracker()
seed(tracker)

type Tab = 'list' | 'create' | 'best' | 'compare'

export const ExperimentPage = () => {
  const [tab, setTab] = useState<Tab>('list')
  const [out, setOut] = useState<string>('')
  const [runs, setRuns] = useState<Run[]>(tracker.listRuns())

  const refresh = () => setRuns(tracker.listRuns())

  return (
    <div style={{ padding: 24 }}>
      <h2>Experiment Tracking v88.0</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['list', 'create', 'best', 'compare'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} data-active={tab === t} style={{ padding: '4px 12px' }}>{t}</button>
        ))}
        <button onClick={refresh} style={{ marginLeft: 'auto', padding: '4px 12px' }}>Refresh</button>
      </div>
      {tab === 'list' && <ListTab runs={runs} setOut={setOut} />}
      {tab === 'create' && <CreateTab setOut={setOut} onCreated={refresh} />}
      {tab === 'best' && <BestTab setOut={setOut} />}
      {tab === 'compare' && <CompareTab setOut={setOut} />}
      <pre style={{ background: '#111', color: '#cfc', padding: 12, marginTop: 16, maxHeight: 300, overflow: 'auto' }}>{out}</pre>
    </div>
  )
}

const ListTab = ({ setOut }: { runs: Run[]; setOut: (s: string) => void }) => {
  const [statusFilter, setStatusFilter] = useState<RunStatus | ''>('')
  const [tagFilter, setTagFilter] = useState('')
  const filtered = tracker.listRuns({
    status: statusFilter || undefined,
    tag: tagFilter || undefined,
  })
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as RunStatus | '')}>
          <option value="">all</option>
          <option value="running">running</option>
          <option value="completed">completed</option>
          <option value="failed">failed</option>
        </select>
        <input value={tagFilter} onChange={e => setTagFilter(e.target.value)} placeholder="tag" />
        <button onClick={() => setOut(JSON.stringify(filtered, null, 2))}>Show</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th>id</th><th>name</th><th>status</th><th>params</th><th>metrics</th><th>tags</th></tr>
        </thead>
        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td><code style={{ fontSize: 11 }}>{r.id.slice(0, 16)}</code></td>
              <td>{r.name}</td>
              <td>{r.status}</td>
              <td><code style={{ fontSize: 11 }}>{JSON.stringify(r.params)}</code></td>
              <td><code style={{ fontSize: 11 }}>{JSON.stringify(r.metrics)}</code></td>
              <td>{r.tags.join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const CreateTab = ({ setOut, onCreated }: { setOut: (s: string) => void; onCreated: () => void }) => {
  const [name, setName] = useState('exp-3')
  const [params, setParams] = useState('lr:0.005,batch:16')
  const [tags, setTags] = useState('experiment')
  const [metric, setMetric] = useState('acc:0.85')
  const create = () => {
    const r = tracker.startRun({ name, params: parseObj(params), tags: tags.split(',').map(x => x.trim()).filter(Boolean) })
    const [k, v] = metric.split(':')
    tracker.logMetric(r.id, k, Number(v))
    tracker.finishRun(r.id)
    setOut(JSON.stringify(r, null, 2))
    onCreated()
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="name" />
        <input value={params} onChange={e => setParams(e.target.value)} placeholder="params (k:v,k:v)" />
        <input value={tags} onChange={e => setTags(e.target.value)} placeholder="tags" />
        <input value={metric} onChange={e => setMetric(e.target.value)} placeholder="metric (k:v)" />
        <button onClick={create}>Create + Finish</button>
      </div>
    </div>
  )
}

const BestTab = ({ setOut }: { setOut: (s: string) => void }) => {
  const [metric, setMetric] = useState('acc')
  const [dir, setDir] = useState<'max' | 'min'>('max')
  const show = () => {
    const r = tracker.bestRun(metric, dir)
    setOut(r ? JSON.stringify(r, null, 2) : 'no completed runs')
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={metric} onChange={e => setMetric(e.target.value)} />
        <select value={dir} onChange={e => setDir(e.target.value as 'max' | 'min')}>
          <option value="max">max</option>
          <option value="min">min</option>
        </select>
        <button onClick={show}>Find Best</button>
      </div>
    </div>
  )
}

const CompareTab = ({ setOut }: { setOut: (s: string) => void }) => {
  const [ids, setIds] = useState('')
  const [metrics, setMetrics] = useState('acc,loss')
  const show = () => {
    const c = tracker.compare(ids.split(',').map(x => x.trim()).filter(Boolean), metrics.split(',').map(x => x.trim()).filter(Boolean))
    setOut(JSON.stringify(c, null, 2))
  }
  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input value={ids} onChange={e => setIds(e.target.value)} placeholder="run ids (comma-sep)" style={{ flex: 1 }} />
        <input value={metrics} onChange={e => setMetrics(e.target.value)} placeholder="metrics" style={{ flex: 1 }} />
        <button onClick={show}>Compare</button>
      </div>
    </div>
  )
}

const parseObj = (s: string): Record<string, string | number | boolean> => {
  const out: Record<string, string | number | boolean> = {}
  for (const part of s.split(',').map(p => p.trim()).filter(Boolean)) {
    const [k, v] = part.split(':')
    if (!k) continue
    const n = Number(v)
    out[k] = !isNaN(n) && v !== '' ? n : (v ?? '')
  }
  return out
}
