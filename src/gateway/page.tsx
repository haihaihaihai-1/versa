import { useState, useEffect } from 'react'
import {
  routes,
  gateway,
  AuthMiddleware,
  RateLimitMiddleware,
  CorsMiddleware,
  CacheMiddleware,
  TransformMiddleware,
  ValidatorMiddleware,
  mockHandler,
  echoHandler,
  type Request,
  type Response,
  type Route,
  type HttpMethod,
} from './index'

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']

export default function GatewayPage() {
  const [tab, setTab] = useState<'routes' | 'playground' | 'logs' | 'metrics' | 'docs'>('routes')
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>API Gateway · v34.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Routes · middleware chain (auth/rate-limit/cors/cache/transform/validate) · metrics
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'routes' && <RoutesTab tick={tick} />}
        {tab === 'playground' && <PlaygroundTab tick={tick} />}
        {tab === 'logs' && <LogsTab tick={tick} />}
        {tab === 'metrics' && <MetricsTab tick={tick} />}
        {tab === 'docs' && <DocsTab tick={tick} />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [
    ['routes', 'Routes'], ['playground', 'Playground'], ['logs', 'Logs'],
    ['metrics', 'Metrics'], ['docs', 'Docs'],
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
  if (routes.list().length === 0) {
    const cache = new CacheMiddleware({ ttl: 60000 })
    routes.add({ method: 'GET', path: '/api/echo', handler: echoHandler(), middleware: [cache], enabled: true, tags: ['demo'] })
    routes.add({
      method: 'GET', path: '/api/users/:id', handler: mockHandler({ body: { id: 1, name: 'Alice' } }),
      middleware: [
        new CorsMiddleware({ origins: ['*'] }),
        new RateLimitMiddleware(10, 60000),
      ],
      enabled: true, tags: ['demo', 'users'],
    })
    routes.add({
      method: 'POST', path: '/api/users', handler: mockHandler({ status: 201, body: { created: true } }),
      middleware: [
        new ValidatorMiddleware([{ field: 'body.email', type: 'email', required: true }, { field: 'body.name', type: 'string', min: 2 }]),
      ],
      enabled: true, tags: ['demo', 'users'],
    })
    routes.add({
      method: 'GET', path: '/api/secure', handler: echoHandler(),
      middleware: [new AuthMiddleware({ type: 'bearer', required: true, validCredentials: ['demo-token'] })],
      enabled: true, tags: ['demo', 'auth'],
    })
  }
}

function RoutesTab({ tick }: { tick: number }) {
  void tick
  useEffect(() => { ensureDemo() }, [])
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [path, setPath] = useState('/api/test')
  const [body, setBody] = useState('{"x": 1}')
  const [auth, setAuth] = useState(false)
  const [cache, setCache] = useState(false)
  const [rate, setRate] = useState(false)

  const add = () => {
    const mw: any[] = []
    if (auth) mw.push(new AuthMiddleware({ type: 'bearer', required: true, validCredentials: ['demo-token'] }))
    if (cache) mw.push(new CacheMiddleware({ ttl: 60000 }))
    if (rate) mw.push(new RateLimitMiddleware(100, 60000))
    let parsed: unknown = null
    try { parsed = JSON.parse(body) } catch {}
    routes.add({ method, path, handler: mockHandler({ body: parsed ?? { ok: true } }), middleware: mw, enabled: true, tags: ['custom'] })
  }

  const all = routes.list()

  return (
    <div>
      <Card title="Add Route">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <label>Method
            <select value={method} onChange={e => setMethod(e.target.value as HttpMethod)} style={inputStyle}>
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label style={{ gridColumn: 'span 3' }}>Path
            <input value={path} onChange={e => setPath(e.target.value)} style={inputStyle} placeholder="/api/resource/:id" />
          </label>
          <label style={{ gridColumn: 'span 4' }}>Body (JSON)
            <input value={body} onChange={e => setBody(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </label>
          <label><input type="checkbox" checked={auth} onChange={e => setAuth(e.target.checked)} /> Auth</label>
          <label><input type="checkbox" checked={cache} onChange={e => setCache(e.target.checked)} /> Cache</label>
          <label><input type="checkbox" checked={rate} onChange={e => setRate(e.target.checked)} /> Rate limit</label>
        </div>
        <button onClick={add} style={btnPrimary}>Add Route</button>
      </Card>
      <Card title={`Registered Routes (${all.length})`}>
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead><tr><th>Method</th><th>Path</th><th>Tags</th><th>Middleware</th><th>Enabled</th><th></th></tr></thead>
          <tbody>
            {all.map(r => (
              <tr key={r.id}>
                <td style={{ color: r.method === 'GET' ? '#2e7d32' : '#1976d2', fontWeight: 600 }}>{r.method}</td>
                <td><code>{r.path}</code></td>
                <td>{(r.tags ?? []).join(', ')}</td>
                <td>{r.middleware.map(m => m.name).join(', ') || '—'}</td>
                <td>{r.enabled ? '✅' : '❌'}</td>
                <td><button onClick={() => routes.remove(r.id)} style={btnSmall}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function PlaygroundTab({ tick }: { tick: number }) {
  void tick
  useEffect(() => { ensureDemo() }, [])
  const [method, setMethod] = useState<HttpMethod>('GET')
  const [path, setPath] = useState('/api/echo')
  const [headers, setHeaders] = useState('{}')
  const [body, setBody] = useState('')
  const [result, setResult] = useState<{ status: number; headers: Record<string, string>; body: unknown } | null>(null)

  const send = async () => {
    let h: Record<string, string> = {}
    try { h = JSON.parse(headers) } catch { setResult({ status: 0, headers: {}, body: { error: 'invalid headers JSON' } }); return }
    const req: Request = {
      id: 'r-' + Date.now(), method, path, query: {}, headers: h,
      body: body ? (() => { try { return JSON.parse(body) } catch { return body } })() : null,
      ip: '127.0.0.1', timestamp: Date.now(),
    }
    const res = await gateway.handle(req)
    setResult({ status: res.status, headers: res.headers, body: res.body })
  }

  return (
    <Card title="Playground">
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8 }}>
        <label>Method
          <select value={method} onChange={e => setMethod(e.target.value as HttpMethod)} style={inputStyle}>
            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label>Path <input value={path} onChange={e => setPath(e.target.value)} style={inputStyle} /></label>
        <label style={{ gridColumn: 'span 2' }}>Headers (JSON)
          <input value={headers} onChange={e => setHeaders(e.target.value)} style={{ ...inputStyle, fontFamily: 'monospace' }} />
        </label>
        <label style={{ gridColumn: 'span 2' }}>Body (JSON or string)
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} style={{ ...inputStyle, fontFamily: 'monospace' }} />
        </label>
      </div>
      <button onClick={send} style={btnPrimary}>Send</button>
      {result && (
        <div style={{ marginTop: 12 }}>
          <div style={{ padding: 8, background: result.status >= 400 ? '#ffebee' : '#e8f5e9', borderRadius: 4, marginBottom: 8 }}>
            <strong>Status: {result.status}</strong>
          </div>
          <details>
            <summary>Headers ({Object.keys(result.headers).length})</summary>
            <pre style={{ background: '#fff', padding: 8, borderRadius: 4, fontSize: 11 }}>{JSON.stringify(result.headers, null, 2)}</pre>
          </details>
          <details open>
            <summary>Body</summary>
            <pre style={{ background: '#fff', padding: 8, borderRadius: 4, fontSize: 11 }}>{JSON.stringify(result.body, null, 2)}</pre>
          </details>
        </div>
      )}
    </Card>
  )
}

function LogsTab({ tick }: { tick: number }) {
  void tick
  const logs = gateway.getLogs().slice(-50).reverse()
  return (
    <Card title="Request Logs">
      <table style={{ width: '100%', fontSize: 12 }}>
        <thead><tr><th>Time</th><th>Method</th><th>Path</th><th>Status</th><th>Duration</th><th>IP</th></tr></thead>
        <tbody>
          {logs.map((l, i) => (
            <tr key={i}>
              <td>{new Date(l.ts).toLocaleTimeString()}</td>
              <td>{l.method}</td>
              <td><code>{l.path}</code></td>
              <td style={{ color: l.status >= 400 ? '#c62828' : '#2e7d32' }}>{l.status}</td>
              <td>{l.durationMs}ms</td>
              <td>{l.ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function MetricsTab({ tick }: { tick: number }) {
  void tick
  const snap = gateway.snapshot()
  return (
    <div>
      <Card title="Gateway Metrics">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Stat label="Total" value={snap.totalRequests} />
          <Stat label="Avg Latency" value={`${Math.round(snap.avgLatencyMs)}ms`} color="#f57c00" />
          <Stat label="Error Rate" value={`${(snap.errorRate * 100).toFixed(1)}%`} color="#c62828" />
          <Stat label="Routes" value={Object.keys(snap.byRoute).length} color="#9c27b0" />
        </div>
      </Card>
      <Card title="By Method">
        <ul>{Object.entries(snap.byMethod).map(([m, n]) => <li key={m}>{m}: {n}</li>)}</ul>
      </Card>
      <Card title="By Status">
        <ul>{Object.entries(snap.byStatus).map(([s, n]) => <li key={s}>{s}: {n}</li>)}</ul>
      </Card>
    </div>
  )
}

function DocsTab({ tick }: { tick: number }) {
  void tick
  return (
    <Card title="API Gateway Documentation">
      <h4>Core Concepts</h4>
      <ul>
        <li><strong>Route</strong>: A (method, path) → handler mapping with optional middleware</li>
        <li><strong>Middleware</strong>: Pre/post hooks (auth, rate-limit, cors, cache, transform, validate)</li>
        <li><strong>Handler</strong>: Function returning a Response (or async)</li>
      </ul>
      <h4>Middleware</h4>
      <ul>
        <li><code>AuthMiddleware</code> — bearer / api_key / basic / jwt</li>
        <li><code>RateLimitMiddleware</code> — token bucket</li>
        <li><code>CorsMiddleware</code> — CORS headers + OPTIONS short-circuit</li>
        <li><code>CacheMiddleware</code> — GET response cache with ETag</li>
        <li><code>TransformMiddleware</code> — add/remove headers</li>
        <li><code>ValidatorMiddleware</code> — body/query/headers validation</li>
      </ul>
      <h4>Path Parameters</h4>
      <p>Use <code>:name</code> in paths. Example: <code>/users/:id</code> matches <code>/users/42</code> and injects <code>id: 42</code> into query.</p>
    </Card>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, marginLeft: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 8 }
const btnSmall: React.CSSProperties = { ...btnPrimary, fontSize: 10, padding: '3px 8px', marginLeft: 4, marginTop: 0 }
