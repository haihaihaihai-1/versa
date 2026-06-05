import { useState, useEffect, useMemo } from 'react'
import {
  templates,
  channels,
  queue,
  preferences,
  throttle,
  digests,
  notify,
  createMockEmailProvider,
  createMockSmsProvider,
  createMockPushProvider,
  createMockInAppProvider,
  createFlakyProvider,
  renderTemplate,
  type Channel,
  type Priority,
  type DeliveryRecord,
  type Template,
} from './index'

const CHANNELS: Channel[] = ['email', 'sms', 'push', 'inapp', 'webhook', 'slack', 'discord']

export default function NotifPage() {
  const [tab, setTab] = useState<'send' | 'templates' | 'queue' | 'prefs' | 'digests' | 'throttle' | 'providers' | 'digest' | 'metrics'>('send')
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Notification Platform · v31.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Multi-channel · templates · preferences · throttle · digests · retries
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'send' && <SendTab tick={tick} />}
        {tab === 'templates' && <TemplatesTab tick={tick} />}
        {tab === 'queue' && <QueueTab tick={tick} />}
        {tab === 'prefs' && <PrefsTab tick={tick} />}
        {tab === 'digests' && <DigestsTab tick={tick} />}
        {tab === 'throttle' && <ThrottleTab tick={tick} />}
        {tab === 'providers' && <ProvidersTab tick={tick} />}
        {tab === 'digest' && <DigestEngineTab tick={tick} />}
        {tab === 'metrics' && <MetricsTab tick={tick} />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [
    ['send', 'Send'], ['templates', 'Templates'], ['queue', 'Queue'],
    ['prefs', 'Preferences'], ['digests', 'Digests'], ['throttle', 'Throttle'],
    ['providers', 'Providers'], ['digest', 'Engine'], ['metrics', 'Metrics'],
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

function SendTab({ tick }: { tick: number }) {
  const [userId, setUserId] = useState('user-1')
  const [channel, setChannel] = useState<Channel>('email')
  const [template, setTemplate] = useState('welcome')
  const [data, setData] = useState('{"name": "Alice"}')
  const [priority, setPriority] = useState<Priority>('normal')
  const [result, setResult] = useState<{ ok: boolean; reason?: string; status?: string } | null>(null)

  // ensure default provider + template
  useEffect(() => {
    if (!channels.get('email')) channels.register(createMockEmailProvider())
    if (!channels.get('sms')) channels.register(createMockSmsProvider())
    if (!channels.get('push')) channels.register(createMockPushProvider())
    if (!channels.get('inapp')) channels.register(createMockInAppProvider())
    if (!templates.get('welcome')) {
      templates.register({ id: 'welcome', name: 'Welcome', channel: 'email', format: 'text', body: 'Hi {{name}}!', variables: ['name'] })
    }
    if (!templates.get('verify')) {
      templates.register({ id: 'verify', name: 'Verify', channel: 'sms', format: 'text', body: 'Code: {{code}}', variables: ['code'] })
    }
  }, [])

  const send = async () => {
    let parsed: Record<string, unknown> = {}
    try { parsed = JSON.parse(data) } catch { setResult({ ok: false, reason: 'invalid JSON' }); return }
    const r = await notify.send({ userId, channel, template, data: parsed, priority })
    setResult({ ok: r.ok, reason: r.reason, status: r.record?.status })
  }

  return (
    <Card title="Send Notification">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <label>User ID <input value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle} /></label>
        <label>Channel
          <select value={channel} onChange={e => setChannel(e.target.value as Channel)} style={inputStyle}>
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label>Template <input value={template} onChange={e => setTemplate(e.target.value)} style={inputStyle} /></label>
        <label>Priority
          <select value={priority} onChange={e => setPriority(e.target.value as Priority)} style={inputStyle}>
            {['low', 'normal', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <label style={{ display: 'block', marginTop: 8 }}>Data (JSON)
        <textarea value={data} onChange={e => setData(e.target.value)} rows={3} style={{ ...inputStyle, fontFamily: 'monospace' }} />
      </label>
      <button onClick={send} style={btnPrimary}>Send</button>
      {result && (
        <div style={{ marginTop: 12, padding: 8, background: result.ok ? '#e8f5e9' : '#ffebee', borderRadius: 4 }}>
          {result.ok ? '✅ Sent' : '❌ Failed'} {result.status ? `(status: ${result.status})` : ''} {result.reason ? `· ${result.reason}` : ''}
        </div>
      )}
    </Card>
  )
}

function TemplatesTab({ tick }: { tick: number }) {
  void tick
  const [name, setName] = useState('new-template')
  const [body, setBody] = useState('Hello {{name}}!')
  const [preview, setPreview] = useState('')

  const add = () => {
    if (templates.get(name)) return
    templates.register({ id: name, name, channel: 'email', format: 'text', body, variables: ['name'] })
    setName('new-template')
  }
  const previewIt = () => {
    setPreview(renderTemplate(body, { name: 'World' }))
  }
  return (
    <Card title="Template Registry">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label>ID <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} /></label>
          <label style={{ display: 'block' }}>Body
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </label>
          <button onClick={add} style={btnPrimary}>Register</button>
          <button onClick={previewIt} style={btnSecondary}>Preview</button>
        </div>
        <div>
          <strong>Rendered:</strong>
          <pre style={{ background: '#fff', padding: 8, borderRadius: 4, minHeight: 60 }}>{preview || '— click Preview —'}</pre>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <strong>Templates ({templates.size()}):</strong>
        <ul style={{ marginTop: 4 }}>
          {templates.list().map(t => <li key={t.id}>{t.id} · {t.channel} · <code>{t.body}</code></li>)}
        </ul>
      </div>
    </Card>
  )
}

function QueueTab({ tick }: { tick: number }) {
  void tick
  const [userId, setUserId] = useState('user-1')
  const [ch, setCh] = useState<Channel>('email')
  const [count, setCount] = useState(5)
  const [flaky, setFlaky] = useState(false)
  const deliveries: DeliveryRecord[] = queue.deliveries().slice(-30).reverse()

  const burst = () => {
    for (let i = 0; i < count; i++) {
      queue.enqueue({ userId, channel: ch, template: 'welcome', data: { name: `U${i}` }, priority: 'normal', scheduledAt: 0, maxRetries: 2 })
    }
  }
  const process = async () => {
    const provider = flaky ? createFlakyProvider(0.5, ch) : channels.get(ch) ?? createMockEmailProvider()
    await queue.process(async (m) => provider.send(m))
  }
  return (
    <div>
      <Card title="Queue">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label>User <input value={userId} onChange={e => setUserId(e.target.value)} style={{ ...inputStyle, width: 120 }} /></label>
          <label>Channel
            <select value={ch} onChange={e => setCh(e.target.value as Channel)} style={inputStyle}>{CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}</select>
          </label>
          <label>Count <input type="number" value={count} onChange={e => setCount(+e.target.value)} style={{ ...inputStyle, width: 60 }} /></label>
          <label><input type="checkbox" checked={flaky} onChange={e => setFlaky(e.target.checked)} /> Flaky</label>
          <button onClick={burst} style={btnPrimary}>Burst Enqueue</button>
          <button onClick={process} style={btnSecondary}>Process</button>
        </div>
        <div style={{ marginTop: 8 }}>Queue size: <strong>{queue.size()}</strong></div>
      </Card>
      <Card title={`Recent Deliveries (${queue.deliveries().length})`}>
        <table style={{ width: '100%', fontSize: 13 }}>
          <thead><tr><th>ID</th><th>User</th><th>Ch</th><th>Tpl</th><th>Status</th><th>Att</th></tr></thead>
          <tbody>
            {deliveries.map(d => (
              <tr key={d.messageId}>
                <td><code>{d.messageId.slice(-8)}</code></td>
                <td>{d.userId}</td><td>{d.channel}</td><td>{d.template}</td>
                <td><span style={{ color: d.status === 'failed' ? '#c62828' : '#2e7d32' }}>{d.status}</span></td>
                <td>{d.attempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function PrefsTab({ tick }: { tick: number }) {
  void tick
  const [userId, setUserId] = useState('user-1')
  const pref = preferences.get(userId)
  return (
    <Card title="User Preferences">
      <label>User ID <input value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle} /></label>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {CHANNELS.map(c => (
          <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={pref.channels[c]} onChange={e => {
              preferences.set(userId, { channels: { ...pref.channels, [c]: e.target.checked } })
            }} /> {c}
          </label>
        ))}
      </div>
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <label>DND Start <input value={pref.dndStart ?? ''} onChange={e => preferences.set(userId, { dndStart: e.target.value })} style={{ ...inputStyle, width: 100 }} /></label>
        <label>DND End <input value={pref.dndEnd ?? ''} onChange={e => preferences.set(userId, { dndEnd: e.target.value })} style={{ ...inputStyle, width: 100 }} /></label>
        <label>Locale <input value={pref.locale} onChange={e => preferences.set(userId, { locale: e.target.value })} style={{ ...inputStyle, width: 80 }} /></label>
        <label>Rate/h <input type="number" value={pref.ratePerHour} onChange={e => preferences.set(userId, { ratePerHour: +e.target.value })} style={{ ...inputStyle, width: 80 }} /></label>
      </div>
      <div style={{ marginTop: 8, padding: 8, background: '#fff', borderRadius: 4 }}>
        <strong>Status:</strong> channels enabled: {CHANNELS.filter(c => pref.channels[c]).join(', ') || 'none'};
        DND: {preferences.isDndActive(userId) ? '🛑 active' : 'off'}
      </div>
    </Card>
  )
}

function DigestsTab({ tick }: { tick: number }) {
  void tick
  const [userId, setUserId] = useState('user-1')
  return (
    <Card title="Digests">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>User <input value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle} /></label>
        <button onClick={() => {
          ['hourly', 'daily', 'weekly'].forEach(p => digests.flush(p as any))
        }} style={btnPrimary}>Flush All</button>
      </div>
      <div style={{ marginTop: 8 }}>
        Pending: {digests.pending_()} | Sent: {digests.list().length}
      </div>
      <ul style={{ marginTop: 8 }}>
        {digests.list().map(d => (
          <li key={d.id}><code>{d.id.slice(-8)}</code> · {d.userId} · {d.channel} · {d.period} · {d.notifications.length} msgs</li>
        ))}
      </ul>
    </Card>
  )
}

function ThrottleTab({ tick }: { tick: number }) {
  void tick
  const [userId, setUserId] = useState('user-1')
  const [ch, setCh] = useState<Channel>('email')
  const c = throttle.check(userId, ch, 20)
  return (
    <Card title="Throttle Limiter">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>User <input value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle} /></label>
        <label>Channel
          <select value={ch} onChange={e => setCh(e.target.value as Channel)} style={inputStyle}>{CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}</select>
        </label>
        <button onClick={() => throttle.increment(userId, ch)} style={btnPrimary}>+1</button>
        <button onClick={() => throttle.reset(userId)} style={btnSecondary}>Reset User</button>
      </div>
      <div style={{ marginTop: 8 }}>
        {c.count}/{c.limit} ({c.allowed ? 'allowed' : 'blocked'}) · reset in {Math.round(c.resetInMs / 1000)}s
      </div>
    </Card>
  )
}

function ProvidersTab({ tick }: { tick: number }) {
  void tick
  return (
    <div>
      <Card title="Channel Providers">
        <button onClick={() => { channels.clear(); channels.register(createMockEmailProvider()); channels.register(createMockSmsProvider()); channels.register(createMockPushProvider()); channels.register(createMockInAppProvider()) }} style={btnPrimary}>Reset Mocks</button>
        <button onClick={() => channels.register(createFlakyProvider(0.5))} style={btnSecondary}>Add Flaky (email 50%)</button>
        <ul style={{ marginTop: 12 }}>
          {CHANNELS.map(c => (
            <li key={c}>{c}: {channels.list(c as Channel).map(p => p.name).join(', ') || <em>none</em>}</li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

function DigestEngineTab({ tick }: { tick: number }) {
  void tick
  const [userId, setUserId] = useState('user-1')
  const add = (period: 'hourly' | 'daily' | 'weekly') => {
    const rec: DeliveryRecord = { messageId: `m-${Date.now()}`, userId, channel: 'email', template: 't', status: 'sent', attempts: 1, createdAt: Date.now() }
    digests.addToDigest(rec, period)
  }
  return (
    <Card title="Digest Engine">
      <input value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle} />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button onClick={() => add('hourly')} style={btnPrimary}>+ Hourly</button>
        <button onClick={() => add('daily')} style={btnPrimary}>+ Daily</button>
        <button onClick={() => add('weekly')} style={btnPrimary}>+ Weekly</button>
        <button onClick={() => ['hourly', 'daily', 'weekly'].forEach(p => digests.flush(p as any))} style={btnSecondary}>Flush</button>
      </div>
      <div style={{ marginTop: 8 }}>Pending: hourly={digests.pending_('hourly')} daily={digests.pending_('daily')} weekly={digests.pending_('weekly')}</div>
    </Card>
  )
}

function MetricsTab({ tick }: { tick: number }) {
  void tick
  const all = queue.deliveries()
  const sent = all.filter(d => d.status === 'sent' || d.status === 'delivered' || d.status === 'read').length
  const failed = all.filter(d => d.status === 'failed').length
  const delivered = all.filter(d => d.status === 'delivered' || d.status === 'read').length
  return (
    <Card title="Notification Metrics">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <Stat label="Total" value={all.length} />
        <Stat label="Sent" value={sent} color="#2e7d32" />
        <Stat label="Delivered" value={delivered} color="#1976d2" />
        <Stat label="Failed" value={failed} color="#c62828" />
      </div>
      <div style={{ marginTop: 12 }}>
        <strong>By Channel:</strong>
        <ul>
          {CHANNELS.map(c => {
            const ch = all.filter(d => d.channel === c)
            return <li key={c}>{c}: {ch.length} (sent: {ch.filter(d => d.status !== 'failed').length}, fail: {ch.filter(d => d.status === 'failed').length})</li>
          })}
        </ul>
      </div>
    </Card>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, marginLeft: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 8 }
const btnSecondary: React.CSSProperties = { ...btnPrimary, background: '#666', marginLeft: 4 }
