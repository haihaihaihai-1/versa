import { useState, useEffect } from 'react'
import { ConfigService, type ConfigEntry, type GrayRule } from './index'

const svc = new ConfigService()
let inited = false
function ensure() {
  if (inited) return
  if (!svc.has('app.theme')) svc.set('app.theme', 'light', 'admin', { description: 'UI theme', tags: ['ui'] })
  if (!svc.has('app.api.url')) svc.set('app.api.url', 'https://api.example.com', 'admin', { description: 'API endpoint', tags: ['api'] })
  if (!svc.has('feature.new-checkout')) svc.set('feature.new-checkout', false, 'pm', { description: 'New checkout', tags: ['feature'] })
  if (!svc.has('rate.limit')) svc.set('rate.limit', 100, 'ops', { description: 'Requests per minute', tags: ['limit'], schema: { min: 1, max: 10000 } })
  inited = true
}

export default function ConfigPage() {
  const [tab, setTab] = useState<'entries' | 'editor' | 'history' | 'gray' | 'watchers' | 'metrics'>('entries')
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Config Service · v39.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Centralized config · version history · watchers · gray rollout · schema validation
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'entries' && <EntriesTab />}
        {tab === 'editor' && <EditorTab />}
        {tab === 'history' && <HistoryTab />}
        {tab === 'gray' && <GrayTab />}
        {tab === 'watchers' && <WatchersTab />}
        {tab === 'metrics' && <MetricsTab />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [
    ['entries', 'Entries'], ['editor', 'Editor'],
    ['history', 'History'], ['gray', 'Gray Rollout'],
    ['watchers', 'Watchers'], ['metrics', 'Metrics'],
  ]
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ddd', flexWrap: 'wrap' }}>
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

function EntriesTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  const [tag, setTag] = useState<string>('')
  const entries = svc.listEntries(tag || undefined)
  return (
    <Card title={`Config Entries (${entries.length})`}>
      <div style={{ marginBottom: 8 }}>
        <label>Filter by tag: <input value={tag} onChange={e => setTag(e.target.value)} placeholder="(any)" style={inputStyle} /></label>
        <button onClick={() => setTick(t => t + 1)} style={btnSmall}>Refresh</button>
      </div>
      <table style={{ width: '100%', fontSize: 12 }}>
        <thead><tr><th>Key</th><th>Type</th><th>Value</th><th>Version</th><th>Updated</th><th>By</th><th>Tags</th><th>Actions</th></tr></thead>
        <tbody>
          {entries.map(e => (
            <tr key={e.key}>
              <td><code>{e.key}</code></td>
              <td>{e.type}</td>
              <td><code style={{ wordBreak: 'break-all' }}>{JSON.stringify(e.value)}</code></td>
              <td>v{e.version}</td>
              <td>{new Date(e.updatedAt).toISOString().slice(11, 19)}</td>
              <td>{e.updatedBy}</td>
              <td>{e.tags.join(', ')}</td>
              <td>
                <button onClick={() => { if (confirm(`Delete ${e.key}?`)) { svc.delete(e.key); setTick(t => t + 1) } }} style={btnSmall}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function EditorTab() {
  useEffect(() => { ensure() }, [])
  const [key, setKey] = useState('app.theme')
  const [value, setValue] = useState('"light"')
  const [msg, setMsg] = useState('')
  const [tick, setTick] = useState(0)
  const [result, setResult] = useState<string>('')

  const apply = () => {
    try {
      let v: unknown = value
      try { v = JSON.parse(value) } catch {}
      const e = svc.set(key, v, 'admin', { message: msg || 'update' })
      setResult(`✅ saved ${e.key} v${e.version}`)
      setTick(t => t + 1)
    } catch (e) { setResult(`❌ ${(e as Error).message}`) }
  }

  const read = () => {
    setValue(JSON.stringify(svc.get(key)))
  }

  return (
    <Card title="Editor">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
        <label>Key <input value={key} onChange={e => setKey(e.target.value)} style={inputStyle} /></label>
        <label>Message <input value={msg} onChange={e => setMsg(e.target.value)} style={inputStyle} /></label>
      </div>
      <label>Value (JSON or text)
        <textarea value={value} onChange={e => setValue(e.target.value)} rows={6} style={{ ...inputStyle, fontFamily: 'monospace' }} />
      </label>
      <div>
        <button onClick={apply} style={btnPrimary}>Set</button>
        <button onClick={read} style={btnSmall}>Load current</button>
      </div>
      {result && <div style={{ marginTop: 8 }}>{result}</div>}
    </Card>
  )
}

function HistoryTab() {
  useEffect(() => { ensure() }, [])
  const [key, setKey] = useState('app.theme')
  const [tick, setTick] = useState(0)
  const h = svc.history_(key)

  return (
    <Card title={`History: ${key}`}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <select value={key} onChange={e => setKey(e.target.value)} style={inputStyle}>
          {svc.listKeys().map(k => <option key={k}>{k}</option>)}
        </select>
        <button onClick={() => setTick(t => t + 1)} style={btnSmall}>Refresh</button>
      </div>
      <table style={{ width: '100%', fontSize: 11 }}>
        <thead><tr><th>Version</th><th>Value</th><th>Updated</th><th>By</th><th>Message</th><th>Rollback?</th><th>Actions</th></tr></thead>
        <tbody>
          {h.slice().reverse().map(v => (
            <tr key={v.version}>
              <td>v{v.version}</td>
              <td><code style={{ wordBreak: 'break-all' }}>{JSON.stringify(v.value)}</code></td>
              <td>{new Date(v.updatedAt).toISOString().slice(11, 19)}</td>
              <td>{v.updatedBy}</td>
              <td>{v.message}</td>
              <td>{v.isRollback ? '↩️ yes' : '—'}</td>
              <td><button onClick={() => { svc.rollback(key, v.version, 'admin'); setTick(t => t + 1) }} style={btnSmall}>⤴ rollback</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function GrayTab() {
  useEffect(() => { ensure() }, [])
  const [key, setKey] = useState('feature.new-checkout')
  const [pct, setPct] = useState(50)
  const [attr, setAttr] = useState('')
  const [tick, setTick] = useState(0)
  const grays = svc.listGrays(key)

  const add = () => {
    let attrs: Record<string, string | number | boolean> | undefined
    if (attr.trim()) {
      attrs = {}
      for (const pair of attr.split(',')) {
        const [k, v] = pair.split('=').map(s => s.trim())
        if (k && v !== undefined) (attrs as any)[k] = isNaN(+v) ? v : +v
      }
    }
    svc.setGray(key, { key, percentage: pct, bucket: 'user-id', enabled: true, attributes: attrs })
    setTick(t => t + 1)
  }

  return (
    <Card title={`Gray Rollout: ${key}`}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 8, marginBottom: 8 }}>
        <select value={key} onChange={e => setKey(e.target.value)} style={inputStyle}>
          {svc.listKeys().map(k => <option key={k}>{k}</option>)}
        </select>
        <input type="number" min="0" max="100" value={pct} onChange={e => setPct(+e.target.value)} style={inputStyle} />
        <input value={attr} onChange={e => setAttr(e.target.value)} placeholder="country=US,plan=pro" style={inputStyle} />
        <button onClick={add} style={btnPrimary}>+ Add Rule</button>
      </div>
      <table style={{ width: '100%', fontSize: 11 }}>
        <thead><tr><th>ID</th><th>%</th><th>Bucket</th><th>Attributes</th><th>Enabled</th><th>Actions</th></tr></thead>
        <tbody>
          {grays.map(g => (
            <tr key={g.id}>
              <td><code>{g.id.slice(-6)}</code></td>
              <td>{g.percentage}</td>
              <td>{g.bucket}</td>
              <td>{g.attributes ? JSON.stringify(g.attributes) : '—'}</td>
              <td>{g.enabled ? '✅' : '❌'}</td>
              <td><button onClick={() => { svc.removeGray(key, g.id); setTick(t => t + 1) }} style={btnSmall}>×</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 12 }}>
        <strong>Simulate 10 users:</strong>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
          {Array.from({ length: 10 }, (_, i) => {
            const r = svc.getForUser(key, `u${i}`, { country: 'US' })
            return (
              <div key={i} style={{ padding: 4, fontSize: 10, background: r.rule ? '#c8e6c9' : '#fff', border: '1px solid #ccc', borderRadius: 3 }}>
                u{i}: {r.rule ? '🎯' : '⏸️'}
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

function WatchersTab() {
  const [log, setLog] = useState<string[]>([])
  const [key, setKey] = useState('app.theme')
  const [pattern, setPattern] = useState<'exact' | 'prefix' | 'regex'>('exact')
  const [watcherId, setWatcherId] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const start = () => {
    if (watcherId) svc.unwatch(watcherId)
    const id = svc.watch(key, (k, nv, ov) => {
      setLog(L => [...L, `${new Date().toISOString().slice(11, 19)} ${k}: ${JSON.stringify(ov)} → ${JSON.stringify(nv)}`])
    }, pattern)
    setWatcherId(id)
    setLog([])
  }
  const stop = () => {
    if (watcherId) { svc.unwatch(watcherId); setWatcherId(null) }
  }
  const trigger = () => {
    try {
      const cur = svc.get(key)
      svc.set(key, typeof cur === 'number' ? (cur as number) + 1 : `changed-${Date.now()}`, 'admin', { message: 'trigger' })
      setTick(t => t + 1)
    } catch (e) { setLog(L => [...L, `❌ ${(e as Error).message}`]) }
  }

  return (
    <Card title="Watchers">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto auto', gap: 8, marginBottom: 8 }}>
        <input value={key} onChange={e => setKey(e.target.value)} style={inputStyle} />
        <select value={pattern} onChange={e => setPattern(e.target.value as any)} style={inputStyle}>
          <option>exact</option><option>prefix</option><option>regex</option>
        </select>
        <button onClick={start} style={btnPrimary}>Start Watch</button>
        <button onClick={stop} style={btnSmall}>Stop</button>
      </div>
      <button onClick={trigger} style={btnPrimary}>Trigger Update</button>
      <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 11, maxHeight: 200, overflow: 'auto', background: '#fff', padding: 8, borderRadius: 4 }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </Card>
  )
}

function MetricsTab() {
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])
  void tick
  const m = svc.getMetrics()
  return (
    <Card title="Metrics">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <Stat label="Reads" value={m.reads} color="#1976d2" />
        <Stat label="Writes" value={m.writes} color="#2e7d32" />
        <Stat label="Rollbacks" value={m.rollbacks} color="#9c27b0" />
        <Stat label="Watch Hits" value={m.watchHits} color="#f57c00" />
      </div>
    </Card>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, marginLeft: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }
const btnSmall: React.CSSProperties = { ...btnPrimary, fontSize: 10, padding: '3px 8px', marginLeft: 4 }
