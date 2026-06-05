import { useState, useEffect, useMemo } from 'react'
import {
  flags,
  segments,
  experiments,
  evaluator,
  bucket,
  type Flag,
  type Segment,
  type UserContext,
  type RolloutStrategy,
  type Experiment,
} from './index'

export default function FeatflagPage() {
  const [tab, setTab] = useState<'flags' | 'segments' | 'experiments' | 'evaluate' | 'metrics'>('flags')
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Feature Flags · v35.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Targeting · segments · A/B experiments · consistent-hash rollout · overrides
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'flags' && <FlagsTab tick={tick} />}
        {tab === 'segments' && <SegmentsTab tick={tick} />}
        {tab === 'experiments' && <ExperimentsTab tick={tick} />}
        {tab === 'evaluate' && <EvaluateTab tick={tick} />}
        {tab === 'metrics' && <MetricsTab tick={tick} />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [
    ['flags', 'Flags'], ['segments', 'Segments'],
    ['experiments', 'Experiments'], ['evaluate', 'Evaluate'], ['metrics', 'Metrics'],
  ]
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ddd' }}>
      {tabs.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} style={{
          padding: '8px 14px', border: 'none', background: 'transparent',
          borderBottom: current === k ? '2px solid #1976d2' : '2px solid transparent',
          color: current === k ? '#1976d2' : '#444', fontWeight: current === k ? 600 : 400, cursor: 'pointer',
        }}>{label}</button>
      ))}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 16, marginBottom: 12, background: '#fafafa' }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{title}</h3>
      {children}
    </div>
  )
}

function Stat({ label, value, color = '#1976d2' }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ padding: 8, background: '#fff', borderRadius: 6, border: '1px solid #e0e0e0' }}>
      <div style={{ fontSize: 12, color: '#666' }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function ensureDemo() {
  if (flags.size() === 0) {
    flags.create({ key: 'new-checkout', type: 'boolean', description: 'New checkout flow', defaultValue: false, strategy: 'percent', rolloutPercent: 50, variants: [{ key: 'on', value: true, weight: 1 }], tags: ['checkout'], enabled: true })
    flags.create({ key: 'dark-mode', type: 'boolean', description: 'Dark mode UI', defaultValue: true, strategy: 'all', tags: ['ui'], enabled: true })
    const seg = segments.create({ name: 'us-pro', rules: [{ attribute: 'country', op: 'eq', value: 'US' }, { attribute: 'plan', op: 'eq', value: 'pro' }] })
    flags.create({ key: 'us-pro-feature', type: 'string', description: 'Feature for US pro users', defaultValue: 'control', strategy: 'segment', segmentIds: [seg.id], tags: ['targeting'], enabled: true })
  }
}

function FlagsTab({ tick }: { tick: number }) {
  void tick
  useEffect(() => { ensureDemo() }, [])
  const [key, setKey] = useState('my-flag')
  const [strategy, setStrategy] = useState<RolloutStrategy>('all')
  const [defaultVal, setDefaultVal] = useState('false')
  const [rolloutPct, setRolloutPct] = useState(50)

  const add = () => {
    try {
      let dv: unknown = defaultVal
      if (defaultVal === 'true') dv = true
      else if (defaultVal === 'false') dv = false
      else if (!isNaN(+defaultVal) && defaultVal !== '') dv = +defaultVal
      flags.create({
        key, type: 'boolean', description: '',
        defaultValue: dv, strategy, rolloutPercent: rolloutPct,
        tags: ['custom'], enabled: true,
        ...(strategy === 'percent' ? { variants: [{ key: 'on', value: !dv, weight: 1 }] } : {}),
      } as any)
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <div>
      <Card title="Create Flag">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <label>Key <input value={key} onChange={e => setKey(e.target.value)} style={inputStyle} /></label>
          <label>Strategy
            <select value={strategy} onChange={e => setStrategy(e.target.value as RolloutStrategy)} style={inputStyle}>
              <option>all</option><option>none</option><option>percent</option>
              <option>segment</option><option>whitelist</option><option>expression</option><option>experiment</option>
            </select>
          </label>
          <label>Default value <input value={defaultVal} onChange={e => setDefaultVal(e.target.value)} style={inputStyle} /></label>
          {strategy === 'percent' && <label>Rollout % <input type="number" min="0" max="100" value={rolloutPct} onChange={e => setRolloutPct(+e.target.value)} style={inputStyle} /></label>}
        </div>
        <button onClick={add} style={btnPrimary}>Create</button>
      </Card>
      <Card title={`Flags (${flags.size()})`}>
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead><tr><th>Key</th><th>Strategy</th><th>Default</th><th>Tags</th><th>Enabled</th><th></th></tr></thead>
          <tbody>
            {flags.list().map(f => (
              <tr key={f.id}>
                <td><code>{f.key}</code></td>
                <td>{f.strategy}{f.rolloutPercent !== undefined ? ` (${f.rolloutPercent}%)` : ''}</td>
                <td><code>{JSON.stringify(f.defaultValue)}</code></td>
                <td>{f.tags.join(', ')}</td>
                <td><button onClick={() => flags.toggle(f.key)} style={btnSmall}>{f.enabled ? '✅' : '❌'}</button></td>
                <td><button onClick={() => flags.remove(f.id)} style={btnSmall}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function SegmentsTab({ tick }: { tick: number }) {
  void tick
  useEffect(() => { ensureDemo() }, [])
  const all: Segment[] = segments.list()
  return (
    <Card title={`Segments (${all.length})`}>
      <table style={{ width: '100%', fontSize: 12 }}>
        <thead><tr><th>Name</th><th>Rules</th><th>User IDs</th></tr></thead>
        <tbody>
          {all.map(s => (
            <tr key={s.id}>
              <td><strong>{s.name}</strong></td>
              <td>{s.rules.map(r => `${r.attribute} ${r.op} ${JSON.stringify(r.value)}`).join(', ') || '—'}</td>
              <td>{(s.userIds ?? []).join(', ') || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function ExperimentsTab({ tick }: { tick: number }) {
  void tick
  const all: Experiment[] = experiments.list()
  return (
    <div>
      <Card title={`Experiments (${all.length})`}>
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead><tr><th>Key</th><th>Flag</th><th>Variants</th><th>Status</th><th>Exposures</th><th>Conversions</th><th>Actions</th></tr></thead>
          <tbody>
            {all.map(e => (
              <tr key={e.id}>
                <td><code>{e.key}</code></td>
                <td>{e.flagKey}</td>
                <td>{e.variants.map(v => `${v.key}:${v.weight}%`).join(', ')}</td>
                <td>{e.status}</td>
                <td>{Object.entries(e.exposures).map(([k, n]) => `${k}:${n}`).join(', ') || '—'}</td>
                <td>{Object.entries(e.conversions).map(([k, n]) => `${k}:${n}`).join(', ') || '—'}</td>
                <td>
                  {e.status === 'draft' && <button onClick={() => experiments.start(e.id)} style={btnSmall}>Start</button>}
                  {e.status === 'running' && <button onClick={() => experiments.pause(e.id)} style={btnSmall}>Pause</button>}
                  {e.status === 'paused' && <button onClick={() => experiments.start(e.id)} style={btnSmall}>Resume</button>}
                  {e.status !== 'completed' && <button onClick={() => experiments.complete(e.id)} style={btnSmall}>End</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function EvaluateTab({ tick }: { tick: number }) {
  void tick
  useEffect(() => { ensureDemo() }, [])
  const [flagKey, setFlagKey] = useState('new-checkout')
  const [userId, setUserId] = useState('user-1')
  const [attrs, setAttrs] = useState('{"country": "US", "plan": "pro"}')
  const [overrides, setOverrides] = useState('{}')
  const [result, setResult] = useState<{ value: unknown; reason: string; variant?: string } | null>(null)

  const evaluate = () => {
    let a: Record<string, unknown> = {}
    let o: Record<string, unknown> = {}
    try { a = JSON.parse(attrs) } catch { return }
    try { o = JSON.parse(overrides) } catch {}
    const u: UserContext = { userId, attributes: a, overrides: o }
    const e = evaluator.evaluate(flagKey, u)
    setResult({ value: e.value, reason: e.reason, variant: e.variant })
  }

  return (
    <Card title="Evaluate Flag">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <label>Flag
          <select value={flagKey} onChange={e => setFlagKey(e.target.value)} style={inputStyle}>
            {flags.list().map(f => <option key={f.id} value={f.key}>{f.key}</option>)}
          </select>
        </label>
        <label>User ID <input value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle} /></label>
        <label>Attributes (JSON) <textarea value={attrs} onChange={e => setAttrs(e.target.value)} rows={3} style={{ ...inputStyle, fontFamily: 'monospace' }} /></label>
        <label>Overrides (JSON) <textarea value={overrides} onChange={e => setOverrides(e.target.value)} rows={3} style={{ ...inputStyle, fontFamily: 'monospace' }} /></label>
      </div>
      <button onClick={evaluate} style={btnPrimary}>Evaluate</button>
      {result && (
        <div style={{ marginTop: 12, padding: 8, background: '#fff', borderRadius: 4 }}>
          <div>Value: <strong><code>{JSON.stringify(result.value)}</code></strong></div>
          <div>Reason: <span style={{ color: '#2e7d32' }}>{result.reason}</span></div>
          {result.variant && <div>Variant: <code>{result.variant}</code></div>}
        </div>
      )}
    </Card>
  )
}

function MetricsTab({ tick }: { tick: number }) {
  void tick
  const all = flags.list()
  const evals = evaluator.evalCounts_()
  return (
    <div>
      <Card title="Flag Metrics">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Stat label="Flags" value={flags.size()} />
          <Stat label="Segments" value={segments.list().length} color="#9c27b0" />
          <Stat label="Experiments" value={experiments.list().length} color="#f57c00" />
          <Stat label="Total Evals" value={Object.values(evals).reduce((s, n) => s + n, 0)} color="#2e7d32" />
        </div>
      </Card>
      <Card title="Evaluation Counts by Flag">
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead><tr><th>Flag</th><th>Count</th><th>Bucket (u1)</th></tr></thead>
          <tbody>
            {all.map(f => (
              <tr key={f.id}>
                <td><code>{f.key}</code></td>
                <td>{evals[f.key] ?? 0}</td>
                <td>{bucket('u1', f.key).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, marginLeft: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 8 }
const btnSmall: React.CSSProperties = { ...btnPrimary, fontSize: 10, padding: '3px 8px', marginLeft: 4, marginTop: 0 }
