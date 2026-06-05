import { useState, useEffect, useMemo } from 'react'
import { RateLimiter, type LimitRule, type RequestContext, type RateLimitDecision, type Algorithm } from './index'

const rl = new RateLimiter()
let seeded = false
function ensure() {
  if (seeded) return
  rl.addRule({ name: 'API default', route: '/api/*', enabled: true, priority: 10, whitelist: [], blacklist: [], config: { algorithm: 'token-bucket', limit: 60, periodMs: 60_000, burst: 10, refillPerSec: 1 } })
  rl.addRule({ name: 'Login strict', route: '/api/login', enabled: true, priority: 100, whitelist: [], blacklist: [], config: { algorithm: 'fixed-window', limit: 5, periodMs: 60_000 } })
  rl.addRule({ name: 'Search bursty', route: '/api/search', enabled: true, priority: 50, whitelist: [], blacklist: [], config: { algorithm: 'leaky-bucket', limit: 20, periodMs: 10_000, leakPerSec: 2 } })
  rl.addRule({ name: 'Strict GCRA', route: '/api/strict', enabled: true, priority: 80, whitelist: [], blacklist: [], config: { algorithm: 'gcra', limit: 10, periodMs: 1000 } })
  rl.addToBlacklistGlobal('attacker-bot')
  rl.addToWhitelistGlobal('vip-customer')
  seeded = true
}

export default function RateLimitPage() {
  const [tab, setTab] = useState<'playground' | 'rules' | 'metrics' | 'simulate'>('playground')
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Rate Limiter · v43.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        5 algorithms · fixed / sliding / token / leaky / GCRA · per-route · whitelist · adaptive · headers · async
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'playground' && <PlaygroundTab />}
        {tab === 'rules' && <RulesTab />}
        {tab === 'metrics' && <MetricsTab />}
        {tab === 'simulate' && <SimulateTab />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [['playground', 'Playground'], ['rules', 'Rules'], ['metrics', 'Metrics'], ['simulate', 'Simulate']]
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
  useEffect(() => { ensure() }, [])
  const [key, setKey] = useState('user-1')
  const [route, setRoute] = useState('/api/users')
  const [history, setHistory] = useState<Array<{ ts: number; ctx: RequestContext; d: RateLimitDecision }>>([])
  const fire = (n = 1) => {
    const newHist: typeof history = []
    for (let i = 0; i < n; i++) {
      const ctx: RequestContext = { key, route, userId: key }
      const d = rl.check(ctx)
      newHist.push({ ts: Date.now(), ctx, d })
    }
    setHistory(h => [...newHist, ...h].slice(0, 30))
  }
  const lastD = history[0]?.d
  const headers = lastD ? rl.toHeaders(lastD) : null
  return (
    <div>
      <Card title="Fire requests">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto auto', gap: 6 }}>
          <input value={key} onChange={e => setKey(e.target.value)} placeholder="key (userId)" style={inputStyle} />
          <input value={route} onChange={e => setRoute(e.target.value)} placeholder="route" style={inputStyle} />
          <button onClick={() => fire(1)} style={btnPrimary}>+ 1</button>
          <button onClick={() => fire(10)} style={btnPrimary}>+ 10</button>
          <button onClick={() => fire(100)} style={{ ...btnPrimary, background: '#d32f2f' }}>+ 100</button>
        </div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Try keys: <code>user-1</code>, <code>vip-customer</code> (whitelisted), <code>attacker-bot</code> (blacklisted)</div>
        <div style={{ fontSize: 12, color: '#666' }}>Try routes: <code>/api/users</code>, <code>/api/login</code>, <code>/api/search</code>, <code>/api/strict</code></div>
      </Card>
      {lastD && (
        <Card title="Last decision">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            <Stat label="Allowed" value={lastD.allowed ? '✅' : '❌'} color={lastD.allowed ? '#2e7d32' : '#d32f2f'} />
            <Stat label="Remaining" value={lastD.remaining} color="#1976d2" />
            <Stat label="Limit" value={lastD.limit} color="#9c27b0" />
            <Stat label="Retry-After" value={lastD.retryAfterMs ? `${Math.ceil(lastD.retryAfterMs / 1000)}s` : '—'} color="#f57c00" />
          </div>
          {headers && <pre style={{ background: '#fff', padding: 8, marginTop: 8, fontSize: 11 }}>{JSON.stringify(headers, null, 2)}</pre>}
        </Card>
      )}
      <Card title={`History (${history.length})`}>
        <table style={{ width: '100%', fontSize: 11 }}>
          <thead><tr><th>Time</th><th>Key</th><th>Route</th><th>Alg</th><th>Allowed</th><th>Rem</th><th>Reason</th></tr></thead>
          <tbody>
            {history.map((h, i) => (
              <tr key={i} style={{ borderTop: '1px solid #eee' }}>
                <td>{new Date(h.ts).toLocaleTimeString()}</td>
                <td><code>{h.ctx.key}</code></td>
                <td><code>{h.ctx.route}</code></td>
                <td>{h.d.algorithm}</td>
                <td>{h.d.allowed ? '✅' : '❌'}</td>
                <td>{h.d.remaining}</td>
                <td>{h.d.reason ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function RulesTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  void tick
  const [newRoute, setNewRoute] = useState('/api/custom')
  const [newAlg, setNewAlg] = useState<Algorithm>('sliding-window')
  const [newLimit, setNewLimit] = useState(50)
  const [newPeriod, setNewPeriod] = useState(60_000)
  const rules = rl.listRules()
  const add = () => {
    rl.addRule({ name: `${newAlg} ${newRoute}`, route: newRoute, enabled: true, priority: 30, whitelist: [], blacklist: [], config: { algorithm: newAlg, limit: newLimit, periodMs: newPeriod } })
    setTick(t => t + 1)
  }
  const toggle = (r: LimitRule) => { rl.enableRule(r.id, !r.enabled); setTick(t => t + 1) }
  const del = (r: LimitRule) => { rl.removeRule(r.id); setTick(t => t + 1) }
  return (
    <div>
      <Card title="Add custom rule">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 100px auto', gap: 6 }}>
          <input value={newRoute} onChange={e => setNewRoute(e.target.value)} style={inputStyle} />
          <select value={newAlg} onChange={e => setNewAlg(e.target.value as Algorithm)} style={inputStyle}>
            {['fixed-window', 'sliding-window', 'token-bucket', 'leaky-bucket', 'gcra'].map(a => <option key={a}>{a}</option>)}
          </select>
          <input type="number" value={newLimit} onChange={e => setNewLimit(Number(e.target.value))} style={inputStyle} />
          <input type="number" value={newPeriod} onChange={e => setNewPeriod(Number(e.target.value))} style={inputStyle} />
          <button onClick={add} style={btnPrimary}>+ Add</button>
        </div>
      </Card>
      <Card title={`Rules (${rules.length})`}>
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead><tr><th>Name</th><th>Route</th><th>Algorithm</th><th>Limit</th><th>Period</th><th>Hits</th><th>Allowed/Denied</th><th>Actions</th></tr></thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} style={{ borderTop: '1px solid #eee' }}>
                <td>{r.name}</td>
                <td><code>{r.route}</code></td>
                <td>{r.config.algorithm}</td>
                <td>{r.config.limit}</td>
                <td>{r.config.periodMs}ms</td>
                <td>{r.hits}</td>
                <td><span style={{ color: '#2e7d32' }}>{r.allowed}</span> / <span style={{ color: '#d32f2f' }}>{r.denied}</span></td>
                <td><button onClick={() => toggle(r)} style={btnSmall}>{r.enabled ? 'Disable' : 'Enable'}</button><button onClick={() => del(r)} style={{ ...btnSmall, background: '#d32f2f' }}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function MetricsTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])
  void tick
  const m = rl.getMetrics()
  const allowRate = m.totalChecks > 0 ? ((m.totalAllowed / m.totalChecks) * 100).toFixed(1) : '—'
  return (
    <Card title="Metrics">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <Stat label="Total Checks" value={m.totalChecks} color="#1976d2" />
        <Stat label="Allowed" value={m.totalAllowed} color="#2e7d32" />
        <Stat label="Denied" value={m.totalDenied} color="#d32f2f" />
        <Stat label="Allow Rate" value={`${allowRate}%`} color="#9c27b0" />
        <Stat label="Retries" value={m.totalRetries} color="#f57c00" />
        <Stat label="Waits" value={m.totalWaits} color="#1976d2" />
        <Stat label="Active Rules" value={m.rulesActive} color="#2e7d32" />
        <Stat label="System Load" value={rl.getSystemLoad().toFixed(2)} color="#9c27b0" />
      </div>
      <div style={{ marginTop: 12 }}>
        <strong>By algorithm:</strong>
        <ul style={{ fontSize: 12 }}>{Object.entries(m.byAlgorithm).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
      </div>
      <div>
        <strong>By route:</strong>
        <ul style={{ fontSize: 12 }}>{Object.entries(m.byRoute).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
      </div>
    </Card>
  )
}

function SimulateTab() {
  useEffect(() => { ensure() }, [])
  const [concurrency, setConcurrency] = useState(20)
  const [route, setRoute] = useState('/api/strict')
  const [result, setResult] = useState<{ allowed: number; denied: number; avgDur: number } | null>(null)
  const run = async () => {
    const t0 = Date.now()
    const promises = Array.from({ length: concurrency }, () => Promise.resolve(rl.check({ key: `sim-${Math.random()}`, route })))
    const decisions = await Promise.all(promises)
    setResult({ allowed: decisions.filter(d => d.allowed).length, denied: decisions.filter(d => !d.allowed).length, avgDur: (Date.now() - t0) / concurrency })
  }
  return (
    <Card title="Concurrent simulation">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px', gap: 6 }}>
        <input value={route} onChange={e => setRoute(e.target.value)} style={inputStyle} />
        <input type="number" value={concurrency} onChange={e => setConcurrency(Number(e.target.value))} style={inputStyle} />
        <button onClick={run} style={btnPrimary}>Run {concurrency}</button>
      </div>
      {result && (
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          <Stat label="Allowed" value={result.allowed} color="#2e7d32" />
          <Stat label="Denied" value={result.denied} color="#d32f2f" />
          <Stat label="Avg Duration" value={`${result.avgDur.toFixed(2)}ms`} color="#9c27b0" />
        </div>
      )}
    </Card>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }
const btnSmall: React.CSSProperties = { ...btnPrimary, fontSize: 10, padding: '3px 8px', marginRight: 4 }
