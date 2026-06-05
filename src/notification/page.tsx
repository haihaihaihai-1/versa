import { useState, useEffect, useMemo } from 'react'
import { NotificationCenter, type Notification, type Channel, type Category, type ChannelSender, type UserPreferences } from './index'

const nc = new NotificationCenter()
nc.registerSender({ channel: 'in-app', send: async () => ({ ok: true, providerId: 'inapp-' + Date.now() }) })
nc.registerSender({ channel: 'email', send: async () => ({ ok: true, providerId: 'email-' + Date.now() }) })
nc.registerSender({ channel: 'sms', send: async () => ({ ok: true, providerId: 'sms-' + Date.now() }) })
nc.registerSender({ channel: 'push', send: async () => ({ ok: true, providerId: 'push-' + Date.now() }) })
nc.registerSender({ channel: 'webhook', send: async () => ({ ok: true, providerId: 'wh-' + Date.now() }) })
nc.registerSender({ channel: 'slack', send: async () => ({ ok: true, providerId: 'slk-' + Date.now() }) })
nc.registerSender({ channel: 'discord', send: async () => ({ ok: true, providerId: 'dsc-' + Date.now() }) })

let seeded = false
function ensure() {
  if (seeded) return
  nc.createTemplate({ name: 'order-shipped', channel: 'email', category: 'order', subject: 'Your order {{orderId}} has shipped!', body: 'Hi {{name}}, your order is on the way. Track it: {{url}}', locale: 'en' })
  nc.createTemplate({ name: 'welcome', channel: 'in-app', category: 'system', body: 'Welcome to Versa, {{name}}! 👋', locale: 'en' })
  nc.getOrCreatePreferences('alice', 'en')
  nc.getOrCreatePreferences('bob', 'en')
  seeded = true
}

export default function NotificationPage() {
  const [tab, setTab] = useState<'playground' | 'inbox' | 'prefs' | 'templates' | 'metrics'>('playground')
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Notification Center · v45.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Multi-channel · templates · preferences · mute/snooze · grouping/digest · scheduling · rate-limit · i18n
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'playground' && <PlaygroundTab />}
        {tab === 'inbox' && <InboxTab />}
        {tab === 'prefs' && <PrefsTab />}
        {tab === 'templates' && <TemplatesTab />}
        {tab === 'metrics' && <MetricsTab />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [['playground', 'Playground'], ['inbox', 'Inbox'], ['prefs', 'Preferences'], ['templates', 'Templates'], ['metrics', 'Metrics']]
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
  const [userId, setUserId] = useState('alice')
  const [channel, setChannel] = useState<Channel>('email')
  const [category, setCategory] = useState<Category>('order')
  const [body, setBody] = useState('Your order has shipped!')
  const [data, setData] = useState('{"name":"Alice","orderId":"1234"}')
  const [useTemplate, setUseTemplate] = useState(true)
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [lastResult, setLastResult] = useState<Notification | null>(null)
  const fire = async () => {
    let parsed: Record<string, unknown> = {}
    try { parsed = JSON.parse(data) } catch { parsed = { name: 'Alice' } }
    const n = await nc.send({ userId, channel, category, priority, body, data: parsed, templateId: useTemplate && channel === 'email' ? 'order-shipped' : useTemplate ? 'welcome' : undefined })
    setLastResult(n)
  }
  return (
    <div>
      <Card title="Send notification">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 2fr', gap: 6 }}>
          <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="userId" style={inputStyle} />
          <select value={channel} onChange={e => setChannel(e.target.value as Channel)} style={inputStyle}>
            {['in-app', 'email', 'sms', 'push', 'webhook', 'slack', 'discord'].map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={category} onChange={e => setCategory(e.target.value as Category)} style={inputStyle}>
            {['order', 'social', 'security', 'system', 'marketing', 'transaction', 'reminder', 'mention'].map(c => <option key={c}>{c}</option>)}
          </select>
          <select value={priority} onChange={e => setPriority(e.target.value as any)} style={inputStyle}>
            {['low', 'normal', 'high', 'urgent'].map(p => <option key={p}>{p}</option>)}
          </select>
          <input value={body} onChange={e => setBody(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
          <label style={{ fontSize: 12 }}><input type="checkbox" checked={useTemplate} onChange={e => setUseTemplate(e.target.checked)} /> Use template</label>
          <input value={data} onChange={e => setData(e.target.value)} style={inputStyle} placeholder="data json" />
          <button onClick={fire} style={btnPrimary}>📤 Send</button>
        </div>
      </Card>
      {lastResult && (
        <Card title="Result">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            <Stat label="Status" value={lastResult.status} color={lastResult.status === 'sent' || lastResult.status === 'unread' ? '#2e7d32' : lastResult.status === 'failed' ? '#d32f2f' : '#f57c00'} />
            <Stat label="Channel" value={lastResult.channel} color="#9c27b0" />
            <Stat label="Attempts" value={lastResult.attempts} color="#1976d2" />
            <Stat label="Subject" value={lastResult.subject ?? '—'} color="#444" />
          </div>
          <pre style={{ background: '#fff', padding: 8, marginTop: 6, fontSize: 11 }}>{lastResult.body}</pre>
          {lastResult.failureReason && <div style={{ color: '#d32f2f', fontSize: 12 }}>Failure reason: {lastResult.failureReason}</div>}
        </Card>
      )}
    </div>
  )
}

function InboxTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  const [userId, setUserId] = useState('alice')
  const [filter, setFilter] = useState<'all' | 'unread' | 'read' | 'failed'>('all')
  void tick
  const list = nc.list({ userId, status: filter === 'all' ? undefined : filter as any, limit: 50 })
  return (
    <div>
      <Card title={`Inbox for ${userId} (${list.length})`}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle} />
          {(['all', 'unread', 'read', 'failed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ ...btnSmall, background: filter === f ? '#1976d2' : '#e0e0e0', color: filter === f ? '#fff' : '#444' }}>{f}</button>
          ))}
          <button onClick={() => { nc.markAllRead(userId); setTick(t => t + 1) }} style={btnSmall}>Mark all read</button>
        </div>
      </Card>
      <div>
        {list.slice().reverse().map(n => (
          <div key={n.id} style={{ padding: 10, border: '1px solid #e0e0e0', borderRadius: 6, marginBottom: 6, background: n.status === 'unread' ? '#fffbea' : '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <strong>{n.subject ?? n.body.slice(0, 60)}</strong>
                <div style={{ fontSize: 11, color: '#666' }}>{n.channel} · {n.category} · {n.priority} · {new Date(n.createdAt).toLocaleString()}</div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {n.status === 'unread' && <button onClick={() => { nc.markRead(n.id); setTick(t => t + 1) }} style={btnSmall}>✓ Read</button>}
                <button onClick={() => { nc.snoozeNotification(n.id, Date.now() + 3600_000); setTick(t => t + 1) }} style={btnSmall}>⏰ Snooze</button>
                <button onClick={() => { nc.muteNotification(n.id); setTick(t => t + 1) }} style={{ ...btnSmall, background: '#d32f2f' }}>🔇 Mute</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PrefsTab() {
  useEffect(() => { ensure() }, [])
  const [userId, setUserId] = useState('alice')
  const [tick, setTick] = useState(0)
  void tick
  const p = nc.getPreferences(userId) ?? nc.getOrCreatePreferences(userId)
  const toggleChannel = (c: Channel) => { p.channels[c].enabled = !p.channels[c].enabled; nc.setPreferences(p); setTick(t => t + 1) }
  const toggleCategory = (cat: Category) => { p.categories[cat].enabled = !p.categories[cat].enabled; nc.setPreferences(p); setTick(t => t + 1) }
  return (
    <div>
      <Card title="User preferences">
        <input value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle} />
      </Card>
      <Card title="Channels">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {Object.entries(p.channels).map(([c, v]) => (
            <label key={c} style={{ fontSize: 12 }}>
              <input type="checkbox" checked={v.enabled} onChange={() => toggleChannel(c as Channel)} /> {c}
            </label>
          ))}
        </div>
      </Card>
      <Card title="Categories">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
          {Object.entries(p.categories).map(([c, v]) => (
            <label key={c} style={{ fontSize: 12 }}>
              <input type="checkbox" checked={v.enabled} onChange={() => toggleCategory(c as Category)} /> {c}
            </label>
          ))}
        </div>
      </Card>
      <Card title="Rate limit">
        <div>Max/hour: {p.rateLimit.maxPerHour}, Max/day: {p.rateLimit.maxPerDay}</div>
        <div>Locale: {p.locale}</div>
        <div>Muted until: {p.mutedUntil ? new Date(p.mutedUntil).toLocaleString() : '—'}</div>
        <div>Snoozed until: {p.snoozedUntil ? new Date(p.snoozedUntil).toLocaleString() : '—'}</div>
      </Card>
    </div>
  )
}

function TemplatesTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  void tick
  const [name, setName] = useState('order-confirmed')
  const [channel, setChannel] = useState<Channel>('email')
  const [body, setBody] = useState('Hi {{name}}, your order {{orderId}} is confirmed!')
  const tpls = nc.listTemplates()
  const add = () => {
    nc.createTemplate({ name, channel, category: 'order', body, locale: 'en' })
    setTick(t => t + 1)
  }
  const preview = (id: string) => nc.render(nc.getTemplate(id)!.body, { name: 'Alice', orderId: '1234' })
  return (
    <div>
      <Card title="New template">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 3fr auto', gap: 6 }}>
          <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          <select value={channel} onChange={e => setChannel(e.target.value as Channel)} style={inputStyle}>
            {['in-app', 'email', 'sms', 'push', 'webhook', 'slack', 'discord'].map(c => <option key={c}>{c}</option>)}
          </select>
          <input value={body} onChange={e => setBody(e.target.value)} style={inputStyle} />
          <button onClick={add} style={btnPrimary}>+ Add</button>
        </div>
      </Card>
      <Card title={`Templates (${tpls.length})`}>
        {tpls.map(t => (
          <div key={t.id} style={{ padding: 8, borderBottom: '1px solid #e0e0e0', fontSize: 12 }}>
            <strong>{t.name}</strong> <span style={{ color: '#666' }}>· {t.channel} · {t.category} · vars: {t.variables.join(', ')}</span>
            <div style={{ color: '#444' }}>{t.body}</div>
            <div style={{ color: '#2e7d32', marginTop: 4 }}>Preview: {preview(t.id)}</div>
          </div>
        ))}
      </Card>
    </div>
  )
}

function MetricsTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])
  void tick
  const s = nc.getStats()
  return (
    <Card title="Delivery Stats">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <Stat label="Total" value={s.total} color="#1976d2" />
        <Stat label="Sent" value={s.sent} color="#2e7d32" />
        <Stat label="Delivered" value={s.delivered} color="#2e7d32" />
        <Stat label="Failed" value={s.failed} color="#d32f2f" />
        <Stat label="Read" value={s.read} color="#2e7d32" />
        <Stat label="Scheduled" value={s.scheduled} color="#f57c00" />
        <Stat label="Snoozed" value={s.snoozed} color="#9c27b0" />
        <Stat label="Muted" value={s.muted} color="#d32f2f" />
        <Stat label="Avg Delivery" value={`${s.avgDeliveryMs.toFixed(1)}ms`} color="#9c27b0" />
        <Stat label="Read Rate" value={`${(s.readRate * 100).toFixed(1)}%`} color="#2e7d32" />
      </div>
      <div style={{ marginTop: 12 }}>
        <strong>By channel:</strong>
        <ul style={{ fontSize: 12 }}>{Object.entries(s.byChannel).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
      </div>
      <div>
        <strong>By category:</strong>
        <ul style={{ fontSize: 12 }}>{Object.entries(s.byCategory).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
      </div>
      <div>
        <strong>By priority:</strong>
        <ul style={{ fontSize: 12 }}>{Object.entries(s.byPriority).map(([k, v]) => <li key={k}>{k}: {v}</li>)}</ul>
      </div>
    </Card>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }
const btnSmall: React.CSSProperties = { ...btnPrimary, fontSize: 10, padding: '3px 8px', marginRight: 4 }
