import { useState, useEffect, useMemo } from 'react'
import { ApiMockService, type MockRule, type MockRequest, type MockResponse, type ResponseStrategy } from './index'

const svc = new ApiMockService()
let seeded = false
function ensureSeed() {
  if (seeded) return
  svc.stubGet('/api/users', [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }], 200, { tags: ['users', 'demo'] })
  svc.stubGet('/api/users/:id', { id: 1, name: 'Alice', email: 'alice@example.com' }, 200, { tags: ['users', 'demo'] })
  svc.stubPost('/api/users', { created: true, id: 99 })
  svc.stubFault('/api/_error', 503)
  svc.stubDynamic('/api/echo', req => ({ status: 200, body: { echo: req.body, ts: Date.now() } }), { tags: ['echo'] })
  svc.addRule({
    name: 'sequence login flow', method: 'GET', path: '/api/seq', priority: 80, enabled: true, tags: ['sequence'],
    response: { kind: 'sequence', status: 200, bodies: [{ step: 1 }, { step: 2 }, { step: 3 }] },
  })
  svc.addRule({
    name: 'regex query', method: 'GET', path: '/api/search', priority: 70, enabled: true, tags: ['regex'],
    query: { q: /^[a-z]+$/ },
    response: { kind: 'template', status: 200, template: (req) => ({ query: req.query.q, results: ['a', 'b'] }) },
  })
  svc.setGlobalLatency(15)
  seeded = true
}

export default function ApiMockPage() {
  const [tab, setTab] = useState<'playground' | 'rules' | 'scenarios' | 'log' | 'metrics'>('playground')
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>API Mock Service · v42.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        HTTP request stubbing · static / sequence / template / dynamic / proxy / fault · request matching · scenarios · log
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'playground' && <PlaygroundTab />}
        {tab === 'rules' && <RulesTab />}
        {tab === 'scenarios' && <ScenariosTab />}
        {tab === 'log' && <LogTab />}
        {tab === 'metrics' && <MetricsTab />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [['playground', 'Playground'], ['rules', 'Rules'], ['scenarios', 'Scenarios'], ['log', 'Log'], ['metrics', 'Metrics']]
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #ddd', flexWrap: 'wrap' }}>
      {tabs.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)} style={{ padding: '8px 14px', border: 'none', background: 'transparent', borderBottom: current === k ? '2px solid #1976d2' : '2px solid transparent', color: current === k ? '#1976d2' : '#444', fontWeight: current === k ? 600 : 400, cursor: 'pointer' }}>{label}</button>
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

function PlaygroundTab() {
  useEffect(() => { ensureSeed() }, [])
  const examples = [
    { label: 'GET /api/users', method: 'GET', path: '/api/users' },
    { label: 'GET /api/users/1', method: 'GET', path: '/api/users/1' },
    { label: 'GET /api/seq', method: 'GET', path: '/api/seq' },
    { label: 'GET /api/seq (2)', method: 'GET', path: '/api/seq' },
    { label: 'GET /api/search?q=hello', method: 'GET', path: '/api/search?q=hello' },
    { label: 'GET /api/_error (503)', method: 'GET', path: '/api/_error' },
    { label: 'GET /api/nope (404)', method: 'GET', path: '/api/nope' },
  ]
  const [last, setLast] = useState<{ req: MockRequest; resp: MockResponse; dur: number } | null>(null)
  const [body, setBody] = useState('{"foo":"bar"}')
  const call = async (method: string, path: string) => {
    const [p, q] = path.split('?')
    const query: Record<string, string> = {}
    if (q) for (const kv of q.split('&')) { const [k, v] = kv.split('='); query[k] = decodeURIComponent(v ?? '') }
    const req: MockRequest = { method: method as any, path: p, query, headers: {}, body: method === 'GET' ? null : (() => { try { return JSON.parse(body) } catch { return body } })() }
    const t0 = Date.now()
    const resp = await svc.handle(req)
    setLast({ req, resp, dur: Date.now() - t0 })
  }
  return (
    <div>
      <Card title="Try the pre-seeded mocks">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {examples.map((e, i) => (
            <button key={i} onClick={() => call(e.method, e.path)} style={{ padding: '6px 10px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>{e.label}</button>
          ))}
        </div>
      </Card>
      <Card title="Custom call (POST)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 100px', gap: 8 }}>
          <input id="cp" defaultValue="/api/echo" style={inputStyle} />
          <input value={body} onChange={e => setBody(e.target.value)} style={inputStyle} />
          <button onClick={() => { const v = (document.getElementById('cp') as HTMLInputElement).value; call('POST', v) }} style={btnPrimary}>POST</button>
        </div>
      </Card>
      {last && (
        <Card title={`Last response (${last.dur}ms)`}>
          <div style={{ fontSize: 12, color: '#666' }}>{last.req.method} {last.req.path}</div>
          <pre style={{ background: '#fff', padding: 8, borderRadius: 4, fontSize: 12, overflow: 'auto' }}>{JSON.stringify(last.resp, null, 2)}</pre>
        </Card>
      )}
    </div>
  )
}

function RulesTab() {
  useEffect(() => { ensureSeed() }, [])
  const [tick, setTick] = useState(0)
  void tick
  const [newPath, setNewPath] = useState('/api/new')
  const [newMethod, setNewMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET')
  const [newBody, setNewBody] = useState('{"ok":true}')
  const [newStatus, setNewStatus] = useState(200)
  const [tagFilter, setTagFilter] = useState('')
  const rules = svc.listRules().filter(r => !tagFilter || r.tags.includes(tagFilter))
  const allTags = useMemo(() => [...new Set(svc.listRules().flatMap(r => r.tags))], [tick])

  const add = () => {
    try {
      let parsed: unknown = null
      try { parsed = JSON.parse(newBody) } catch { parsed = newBody }
      svc.addRule({ name: `${newMethod} ${newPath}`, method: newMethod, path: newPath, response: { kind: 'static', status: newStatus, body: parsed }, priority: 50, enabled: true, tags: ['custom'] })
      setTick(t => t + 1)
    } catch (e) { alert((e as Error).message) }
  }
  const toggle = (r: MockRule) => { svc.enableRule(r.id, !r.enabled); setTick(t => t + 1) }
  const del = (r: MockRule) => { svc.removeRule(r.id); setTick(t => t + 1) }
  const stratLabel = (r: MockRule): string => {
    const s = r.response as ResponseStrategy
    return `${s.kind}${s.kind === 'sequence' ? ` (${(s as any).bodies.length})` : s.kind === 'fault' ? ` (${(s as any).status})` : ''}`
  }

  return (
    <div>
      <Card title="Add custom mock">
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 70px 2fr 80px', gap: 6 }}>
          <select value={newMethod} onChange={e => setNewMethod(e.target.value as any)} style={inputStyle}>{['GET', 'POST', 'PUT', 'DELETE'].map(m => <option key={m}>{m}</option>)}</select>
          <input value={newPath} onChange={e => setNewPath(e.target.value)} style={inputStyle} placeholder="path" />
          <input type="number" value={newStatus} onChange={e => setNewStatus(Number(e.target.value))} style={inputStyle} />
          <input value={newBody} onChange={e => setNewBody(e.target.value)} style={inputStyle} placeholder="body json" />
          <button onClick={add} style={btnPrimary}>+ Add</button>
        </div>
        <div style={{ marginTop: 6, fontSize: 12 }}>Tags: {allTags.map(t => <button key={t} onClick={() => setTagFilter(t)} style={{ marginLeft: 4, padding: '2px 6px', fontSize: 10, background: tagFilter === t ? '#1976d2' : '#e0e0e0', color: tagFilter === t ? '#fff' : '#444', border: 'none', borderRadius: 3, cursor: 'pointer' }}>#{t}</button>)}</div>
      </Card>
      <Card title={`Rules (${rules.length})`}>
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead><tr><th>Method</th><th>Path</th><th>Strategy</th><th>Hits</th><th>Tags</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                <td><code>{r.method}</code></td>
                <td><code>{r.path}</code></td>
                <td>{stratLabel(r)}</td>
                <td>{r.hits}</td>
                <td>{r.tags.map(t => <span key={t} style={{ fontSize: 9, background: '#eee', padding: '1px 4px', borderRadius: 3, marginRight: 2 }}>#{t}</span>)}</td>
                <td>{r.enabled ? '🟢' : '⚪'}</td>
                <td><button onClick={() => toggle(r)} style={btnSmall}>{r.enabled ? 'Disable' : 'Enable'}</button><button onClick={() => del(r)} style={{ ...btnSmall, background: '#d32f2f' }}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function ScenariosTab() {
  useEffect(() => { ensureSeed() }, [])
  const [tick, setTick] = useState(0)
  void tick
  const [results, setResults] = useState<string>('')
  const scenarios = svc.listScenarios()
  const recordDemo = () => {
    const sc = svc.record([
      { method: 'POST', path: '/api/login', response: { status: 200, body: { token: 'abc' } } },
      { method: 'GET', path: '/api/me', response: { status: 200, body: { id: 1, name: 'Alice' } } },
      { method: 'POST', path: '/api/logout', response: { status: 200, body: { ok: true } } },
    ], { source: 'demo' })
    setTick(t => t + 1)
    return sc
  }
  const play = async (id: string) => {
    const r = await svc.playback(id)
    setResults(JSON.stringify(r, null, 2))
  }
  return (
    <div>
      <Card title="Scenarios">
        <button onClick={() => { recordDemo(); setTick(t => t + 1) }} style={btnPrimary}>+ Record demo (login → me → logout)</button>
        <table style={{ width: '100%', fontSize: 12, marginTop: 8 }}>
          <thead><tr><th>ID</th><th>Name</th><th>Rules</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {scenarios.map(s => (
              <tr key={s.id} style={{ borderTop: '1px solid #eee' }}>
                <td><code>{s.id}</code></td>
                <td>{s.name}</td>
                <td>{s.rules.length}</td>
                <td>{s.active ? '🟢' : '⚪'}</td>
                <td><button onClick={() => play(s.id)} style={btnSmall}>▶ Playback</button><button onClick={() => { svc.activateScenario(s.id, !s.active); setTick(t => t + 1) }} style={btnSmall}>{s.active ? 'Pause' : 'Resume'}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {results && <Card title="Playback results"><pre style={{ fontSize: 11, background: '#fff', padding: 8 }}>{results}</pre></Card>}
    </div>
  )
}

function LogTab() {
  useEffect(() => { ensureSeed() }, [])
  const [tick, setTick] = useState(0)
  void tick
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all')
  const log = svc.getLog({ matched: filter === 'all' ? undefined : filter === 'matched', limit: 50 })
  return (
    <Card title={`Request Log (${log.length})`}>
      <div style={{ marginBottom: 6 }}>
        {(['all', 'matched', 'unmatched'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...btnSmall, background: filter === f ? '#1976d2' : '#e0e0e0', color: filter === f ? '#fff' : '#444' }}>{f}</button>
        ))}
        <button onClick={() => { svc.clearLog(); setTick(t => t + 1) }} style={{ ...btnSmall, background: '#d32f2f' }}>Clear</button>
        <button onClick={() => setTick(t => t + 1)} style={btnSmall}>↻ Refresh</button>
      </div>
      <table style={{ width: '100%', fontSize: 11 }}>
        <thead><tr><th>Time</th><th>Method</th><th>Path</th><th>Rule</th><th>Status</th><th>Dur</th></tr></thead>
        <tbody>
          {log.slice().reverse().map((e, i) => (
            <tr key={i} style={{ borderTop: '1px solid #eee' }}>
              <td>{new Date(e.ts).toLocaleTimeString()}</td>
              <td><code>{e.method}</code></td>
              <td><code>{e.path}</code></td>
              <td>{e.ruleId ? '✓' : '✗'}</td>
              <td>{e.response.status}</td>
              <td>{e.durationMs}ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function MetricsTab() {
  useEffect(() => { ensureSeed() }, [])
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])
  void tick
  const m = svc.metrics()
  return (
    <Card title="Service Metrics">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <Stat label="Rules" value={m.rules} color="#1976d2" />
        <Stat label="Scenarios" value={m.scenarios} color="#2e7d32" />
        <Stat label="Total Requests" value={m.totalRequests} color="#9c27b0" />
        <Stat label="Matched" value={m.matched} color="#2e7d32" />
        <Stat label="Unmatched" value={m.unmatched} color="#d32f2f" />
        <Stat label="Avg Latency" value={`${m.avgLatencyMs.toFixed(1)}ms`} color="#f57c00" />
        <Stat label="Webhooks" value={m.webhooks} color="#1976d2" />
        <Stat label="Match Rate" value={m.totalRequests > 0 ? `${((m.matched / m.totalRequests) * 100).toFixed(1)}%` : '—'} color="#2e7d32" />
      </div>
    </Card>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }
const btnSmall: React.CSSProperties = { ...btnPrimary, fontSize: 10, padding: '3px 8px', marginRight: 4 }
