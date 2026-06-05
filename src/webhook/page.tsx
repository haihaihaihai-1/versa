import { useState, useEffect, useMemo } from 'react'
import { WebhookService, type WebhookSubscription, type WebhookDelivery, type WebhookEvent } from './index'

const svc = new WebhookService()
let seeded = false
function ensure() {
  if (seeded) return
  svc.createSubscription({ id: 'sub-orders', url: 'https://api.example.com/hooks/orders', events: ['order.*'], secret: 'secret-orders', enabled: true, headers: {}, maxAttempts: 3, initialBackoffMs: 100, maxBackoffMs: 5000, timeoutMs: 5000, deadLetterOnFailure: true, tags: ['orders', 'production'] })
  svc.createSubscription({ id: 'sub-users', url: 'https://api.example.com/hooks/users', events: ['user.*'], secret: 'secret-users', enabled: true, headers: {}, maxAttempts: 5, initialBackoffMs: 200, maxBackoffMs: 10000, timeoutMs: 5000, deadLetterOnFailure: true, tags: ['users', 'production'] })
  svc.createSubscription({ id: 'sub-wildcard', url: 'https://api.example.com/hooks/all', events: '*', secret: 'secret-all', enabled: true, headers: {}, maxAttempts: 3, initialBackoffMs: 50, maxBackoffMs: 1000, timeoutMs: 5000, deadLetterOnFailure: true, tags: ['wildcard'] })
  seeded = true
}

export default function WebhookPage() {
  const [tab, setTab] = useState<'playground' | 'subs' | 'deliveries' | 'dlq' | 'metrics'>('playground')
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Webhook Delivery · v44.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Subscriptions · HMAC signing · retry · dead-letter · replay · metrics
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'playground' && <PlaygroundTab />}
        {tab === 'subs' && <SubsTab />}
        {tab === 'deliveries' && <DeliveriesTab />}
        {tab === 'dlq' && <DLQTab />}
        {tab === 'metrics' && <MetricsTab />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [['playground', 'Playground'], ['subs', 'Subscriptions'], ['deliveries', 'Deliveries'], ['dlq', 'Dead Letter'], ['metrics', 'Metrics']]
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
  const [eventType, setEventType] = useState('order.created')
  const [payload, setPayload] = useState('{"orderId":1234,"amount":99.99}')
  const [failMode, setFailMode] = useState<'success' | 'fail' | 'flaky'>('success')
  const [result, setResult] = useState<WebhookDelivery[]>([])

  const fire = async () => {
    let attemptCount = 0
    if (failMode === 'success') svc.transport = async () => ({ status: 200, body: 'ok' })
    else if (failMode === 'fail') svc.transport = async () => ({ status: 500, body: 'fail' })
    else svc.transport = async () => { attemptCount++; return { status: attemptCount < 2 ? 500 : 200, body: 'ok' } }
    let parsed: unknown = null
    try { parsed = JSON.parse(payload) } catch { parsed = payload }
    const r = await svc.publishAndDeliver(eventType, parsed)
    setResult(r)
  }
  return (
    <div>
      <Card title="Publish event">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 6 }}>
          <input value={eventType} onChange={e => setEventType(e.target.value)} placeholder="event type" style={inputStyle} />
          <input value={payload} onChange={e => setPayload(e.target.value)} placeholder="payload (json)" style={inputStyle} />
          <select value={failMode} onChange={e => setFailMode(e.target.value as any)} style={inputStyle}>
            <option value="success">→ 200 success</option>
            <option value="fail">→ 500 fail</option>
            <option value="flaky">→ fail then success</option>
          </select>
        </div>
        <button onClick={fire} style={{ ...btnPrimary, marginTop: 6 }}>📤 Publish + Deliver</button>
        <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Try: <code>order.created</code>, <code>order.shipped</code>, <code>user.signup</code></div>
      </Card>
      {result.length > 0 && (
        <Card title={`Deliveries (${result.length})`}>
          {result.map(d => (
            <div key={d.id} style={{ padding: 8, borderBottom: '1px solid #e0e0e0', fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{d.eventType}</strong>
                <span style={{ color: d.status === 'success' ? '#2e7d32' : d.status === 'dead-letter' ? '#d32f2f' : '#f57c00' }}>{d.status}</span>
              </div>
              <div>URL: <code>{d.url}</code> · attempts: {d.attempts}/{d.maxAttempts} · duration: {d.durationMs}ms</div>
              <div>Signature: <code>{d.signature.slice(0, 16)}…</code></div>
              {d.response && <div>Response: {d.response.status} · {d.response.body}</div>}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

function SubsTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  void tick
  const [newUrl, setNewUrl] = useState('https://api.example.com/hooks')
  const [newEvents, setNewEvents] = useState('*')
  const subs = svc.listSubscriptions()
  const add = () => {
    svc.createSubscription({ url: newUrl, events: newEvents === '*' ? '*' : newEvents.split(',').map(e => e.trim()), secret: 'secret-' + Date.now(), enabled: true, headers: {}, maxAttempts: 3, initialBackoffMs: 100, maxBackoffMs: 5000, timeoutMs: 5000, deadLetterOnFailure: true, tags: ['custom'] })
    setTick(t => t + 1)
  }
  const toggle = (s: WebhookSubscription) => { svc.enableSubscription(s.id, !s.enabled); setTick(t => t + 1) }
  const del = (s: WebhookSubscription) => { svc.deleteSubscription(s.id); setTick(t => t + 1) }
  return (
    <div>
      <Card title="Add subscription">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 6 }}>
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)} style={inputStyle} placeholder="URL" />
          <input value={newEvents} onChange={e => setNewEvents(e.target.value)} style={inputStyle} placeholder="events (* or order.*,user.created)" />
          <button onClick={add} style={btnPrimary}>+ Add</button>
        </div>
      </Card>
      <Card title={`Subscriptions (${subs.length})`}>
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead><tr><th>URL</th><th>Events</th><th>Attempts</th><th>DLQ</th><th>Delivered/Failed</th><th>Actions</th></tr></thead>
          <tbody>
            {subs.map(s => (
              <tr key={s.id} style={{ borderTop: '1px solid #eee' }}>
                <td><code>{s.url}</code></td>
                <td>{(s.events as any) === '*' ? '*' : (s.events as string[]).join(', ')}</td>
                <td>{s.maxAttempts}</td>
                <td>{s.deadLetterOnFailure ? '✓' : '—'}</td>
                <td><span style={{ color: '#2e7d32' }}>{s.totalDelivered}</span> / <span style={{ color: '#d32f2f' }}>{s.totalFailed}</span></td>
                <td><button onClick={() => toggle(s)} style={btnSmall}>{s.enabled ? 'Disable' : 'Enable'}</button><button onClick={() => del(s)} style={{ ...btnSmall, background: '#d32f2f' }}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function DeliveriesTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  void tick
  const [filter, setFilter] = useState<'all' | 'success' | 'failed' | 'retrying' | 'dead-letter'>('all')
  const ds = svc.listDeliveries({ status: filter === 'all' ? undefined : filter, limit: 50 })
  return (
    <Card title={`Deliveries (${ds.length})`}>
      <div style={{ marginBottom: 6 }}>
        {(['all', 'success', 'failed', 'retrying', 'dead-letter'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ ...btnSmall, background: filter === f ? '#1976d2' : '#e0e0e0', color: filter === f ? '#fff' : '#444' }}>{f}</button>
        ))}
        <button onClick={() => setTick(t => t + 1)} style={btnSmall}>↻ Refresh</button>
      </div>
      <table style={{ width: '100%', fontSize: 11 }}>
        <thead><tr><th>ID</th><th>Event</th><th>Sub</th><th>Status</th><th>Attempts</th><th>Duration</th><th>Actions</th></tr></thead>
        <tbody>
          {ds.slice().reverse().map(d => (
            <tr key={d.id} style={{ borderTop: '1px solid #eee' }}>
              <td><code>{d.id.slice(0, 18)}</code></td>
              <td>{d.eventType}</td>
              <td><code>{d.subscriptionId.slice(0, 14)}</code></td>
              <td style={{ color: d.status === 'success' ? '#2e7d32' : d.status === 'dead-letter' ? '#d32f2f' : '#f57c00' }}>{d.status}</td>
              <td>{d.attempts}/{d.maxAttempts}</td>
              <td>{d.durationMs}ms</td>
              <td><button onClick={async () => { await svc.replay(d.id); setTick(t => t + 1) }} style={btnSmall}>↻ Replay</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function DLQTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  void tick
  const dlq = svc.getDeadLetter()
  return (
    <Card title={`Dead Letter Queue (${dlq.length})`}>
      <div style={{ marginBottom: 6 }}>
        <button onClick={async () => { svc.transport = async () => ({ status: 200, body: 'ok' }); await svc.retryDeadLetter(); setTick(t => t + 1) }} style={btnPrimary}>↻ Retry all (with 200 transport)</button>
        <button onClick={() => { svc.clearDeadLetter(); setTick(t => t + 1) }} style={{ ...btnSmall, background: '#d32f2f' }}>Clear</button>
      </div>
      <table style={{ width: '100%', fontSize: 11 }}>
        <thead><tr><th>Delivery</th><th>Event</th><th>Sub</th><th>Reason</th><th>Dead-lettered at</th></tr></thead>
        <tbody>
          {dlq.map(e => (
            <tr key={e.delivery.id} style={{ borderTop: '1px solid #eee' }}>
              <td><code>{e.delivery.id.slice(0, 18)}</code></td>
              <td>{e.delivery.eventType}</td>
              <td><code>{e.delivery.subscriptionId.slice(0, 14)}</code></td>
              <td>{e.reason}</td>
              <td>{new Date(e.deadLetteredAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function MetricsTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])
  void tick
  const m = svc.getMetrics()
  return (
    <Card title="Webhook Metrics">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <Stat label="Events" value={m.totalEvents} color="#1976d2" />
        <Stat label="Deliveries" value={m.totalDeliveries} color="#9c27b0" />
        <Stat label="Success" value={m.totalSuccess} color="#2e7d32" />
        <Stat label="Failed" value={m.totalFailed} color="#d32f2f" />
        <Stat label="Retries" value={m.totalRetries} color="#f57c00" />
        <Stat label="Dead-lettered" value={m.totalDeadLettered} color="#d32f2f" />
        <Stat label="Avg Duration" value={`${m.avgDeliveryMs.toFixed(1)}ms`} color="#9c27b0" />
        <Stat label="Success Rate" value={`${(m.successRate * 100).toFixed(1)}%`} color="#2e7d32" />
      </div>
      <div style={{ marginTop: 12 }}>
        <strong>By event type:</strong>
        <ul style={{ fontSize: 12 }}>{Object.entries(m.byEventType).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
      </div>
    </Card>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }
const btnSmall: React.CSSProperties = { ...btnPrimary, fontSize: 10, padding: '3px 8px', marginRight: 4 }
