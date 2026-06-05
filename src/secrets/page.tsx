import { useState, useEffect, useMemo } from 'react'
import {
  vault,
  scanText,
  scanObject,
  resolveReferences,
  XorEncryptionProvider,
  IdentityEncryptionProvider,
  type Secret,
  type SecretType,
  type AccessPolicy,
  type AuditEntry,
  type ScanFinding,
} from './index'

const SECRET_TYPES: SecretType[] = ['api_key', 'password', 'token', 'certificate', 'ssh_key', 'database_url', 'oauth', 'webhook', 'generic']

export default function SecretsPage() {
  const [tab, setTab] = useState<'list' | 'create' | 'policies' | 'audit' | 'rotation' | 'scanner' | 'resolver' | 'metrics'>('list')
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])

  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Secret Management / Vault · v33.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Encrypted at rest · policies (RBAC) · audit chain · rotation · scanner · reference resolver
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'list' && <ListTab tick={tick} />}
        {tab === 'create' && <CreateTab tick={tick} />}
        {tab === 'policies' && <PoliciesTab tick={tick} />}
        {tab === 'audit' && <AuditTab tick={tick} />}
        {tab === 'rotation' && <RotationTab tick={tick} />}
        {tab === 'scanner' && <ScannerTab tick={tick} />}
        {tab === 'resolver' && <ResolverTab tick={tick} />}
        {tab === 'metrics' && <MetricsTab tick={tick} />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [
    ['list', 'Secrets'], ['create', 'Create'], ['policies', 'Policies'],
    ['audit', 'Audit'], ['rotation', 'Rotation'],
    ['scanner', 'Scanner'], ['resolver', 'Resolver'], ['metrics', 'Metrics'],
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

function ListTab({ tick }: { tick: number }) {
  void tick
  const [reveal, setReveal] = useState<Record<string, string>>({})
  const [filter, setFilter] = useState('')
  const [type, setType] = useState<SecretType | 'all'>('all')

  const all = vault.list()
  const filtered = all.filter(s =>
    (type === 'all' || s.type === type) &&
    (filter === '' || s.name.toLowerCase().includes(filter.toLowerCase()))
  )

  const show = (s: Secret) => {
    if (reveal[s.id]) return reveal[s.id]
    const v = vault.getValue(s.id)
    if (v) setReveal(r => ({ ...r, [s.id]: v }))
    return v ?? '***'
  }

  return (
    <Card title="Secrets">
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input placeholder="Filter..." value={filter} onChange={e => setFilter(e.target.value)} style={inputStyle} />
        <select value={type} onChange={e => setType(e.target.value as any)} style={inputStyle}>
          <option value="all">all types</option>
          {SECRET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <table style={{ width: '100%', fontSize: 12, marginTop: 8 }}>
        <thead><tr><th>Name</th><th>Type</th><th>Value</th><th>Version</th><th>Updated</th><th>Tags</th><th>Actions</th></tr></thead>
        <tbody>
          {filtered.map(s => (
            <tr key={s.id}>
              <td><strong>{s.name}</strong></td>
              <td>{s.type}</td>
              <td><code style={{ fontSize: 11 }}>{reveal[s.id] ?? '***' + s.value.slice(-4)}</code></td>
              <td>v{s.version}</td>
              <td>{new Date(s.updatedAt).toLocaleTimeString()}</td>
              <td>{s.tags.join(', ')}</td>
              <td>
                <button onClick={() => show(s)} style={btnSmall}>Show</button>
                <button onClick={() => vault.rotate(s.id, 'rotated-' + Date.now(), 'admin', 'manual')} style={btnSmall}>Rotate</button>
                <button onClick={() => vault.delete(s.id, 'admin')} style={btnSmall}>Del</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function CreateTab({ tick }: { tick: number }) {
  void tick
  const [name, setName] = useState('my-api-key')
  const [type, setType] = useState<SecretType>('api_key')
  const [value, setValue] = useState('')
  const [tags, setTags] = useState('')
  const [expiresIn, setExpiresIn] = useState(0)
  const [last, setLast] = useState<string | null>(null)

  const create = () => {
    const opts: { name: string; type: SecretType; value: string; tags?: string[]; expiresAt?: number } = { name, type, value }
    if (tags) opts.tags = tags.split(',').map(t => t.trim())
    if (expiresIn > 0) opts.expiresAt = Date.now() + expiresIn * 86400000
    const s = vault.create(opts, 'admin')
    setLast(s.id)
    setValue('')
  }

  return (
    <Card title="Create Secret">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <label>Name <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} /></label>
        <label>Type
          <select value={type} onChange={e => setType(e.target.value as SecretType)} style={inputStyle}>
            {SECRET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label style={{ gridColumn: 'span 2' }}>Value
          <input value={value} onChange={e => setValue(e.target.value)} style={inputStyle} placeholder="secret value" />
        </label>
        <label>Tags (comma) <input value={tags} onChange={e => setTags(e.target.value)} style={inputStyle} placeholder="prod, backend" /></label>
        <label>Expires in (days, 0=never) <input type="number" value={expiresIn} onChange={e => setExpiresIn(+e.target.value)} style={inputStyle} /></label>
      </div>
      <button onClick={create} style={btnPrimary}>Create</button>
      {last && <div style={{ marginTop: 8 }}>Created: <code>{last}</code></div>}
    </Card>
  )
}

function PoliciesTab({ tick }: { tick: number }) {
  void tick
  const [subject, setSubject] = useState('admin')
  const [resource, setResource] = useState('*')
  const [actions, setActions] = useState<string[]>(['read'])
  const policies: AccessPolicy[] = vault.listPolicies()

  const add = () => {
    vault.addPolicy({
      id: 'pol-' + Date.now(),
      name: `${subject}@${resource}`,
      subject, resource,
      actions: actions as AccessPolicy['actions'],
    })
  }

  return (
    <div>
      <Card title="Add Policy">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <label>Subject <input value={subject} onChange={e => setSubject(e.target.value)} style={inputStyle} /></label>
          <label>Resource <input value={resource} onChange={e => setResource(e.target.value)} style={inputStyle} placeholder="* or secret-name or prefix-*" /></label>
          <label>Actions (comma) <input value={actions.join(',')} onChange={e => setActions(e.target.value.split(','))} style={inputStyle} /></label>
        </div>
        <button onClick={add} style={btnPrimary}>Add Policy</button>
      </Card>
      <Card title={`Policies (${policies.length})`}>
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead><tr><th>Subject</th><th>Resource</th><th>Actions</th><th></th></tr></thead>
          <tbody>
            {policies.map(p => (
              <tr key={p.id}>
                <td>{p.subject}</td><td><code>{p.resource}</code></td><td>{p.actions.join(', ')}</td>
                <td><button onClick={() => vault.removePolicy(p.id)} style={btnSmall}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function AuditTab({ tick }: { tick: number }) {
  void tick
  const [filter, setFilter] = useState('')
  const log: AuditEntry[] = vault.audit_().slice(-100).reverse()
  const filtered = filter ? log.filter(a => a.subject.includes(filter) || a.action.includes(filter)) : log
  return (
    <Card title="Audit Log">
      <input placeholder="filter subject/action..." value={filter} onChange={e => setFilter(e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
      <table style={{ width: '100%', fontSize: 12 }}>
        <thead><tr><th>Time</th><th>Subject</th><th>Action</th><th>Secret</th><th>OK</th><th>Hash</th><th>Reason</th></tr></thead>
        <tbody>
          {filtered.map(a => (
            <tr key={a.id}>
              <td>{new Date(a.ts).toLocaleTimeString()}</td>
              <td>{a.subject}</td>
              <td style={{ color: a.action === 'deny' || a.action === 'delete' ? '#c62828' : '#2e7d32' }}>{a.action}</td>
              <td><code>{a.secretId?.slice(-8) ?? ''}</code></td>
              <td>{a.success ? '✅' : '❌'}</td>
              <td><code style={{ fontSize: 10 }}>{a.hash.slice(0, 8)}</code></td>
              <td>{a.reason ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function RotationTab({ tick }: { tick: number }) {
  void tick
  const [secretId, setSecretId] = useState('')
  const [interval, setInterval] = useState(60)
  const secrets = vault.list()
  const cfg = secretId ? vault.rotationConfigFor(secretId) : undefined

  const configure = () => {
    if (!secretId) return
    vault.configureRotation({ secretId, intervalMs: interval * 1000, enabled: true, generator: () => `auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })
  }

  return (
    <Card title="Rotation Manager">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <label>Secret
          <select value={secretId} onChange={e => setSecretId(e.target.value)} style={inputStyle}>
            <option value="">— select —</option>
            {secrets.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>Interval (sec) <input type="number" value={interval} onChange={e => setInterval(+e.target.value)} style={inputStyle} /></label>
        <button onClick={configure} style={btnPrimary}>Configure</button>
      </div>
      {cfg && (
        <div style={{ marginTop: 8, padding: 8, background: '#fff', borderRadius: 4 }}>
          <div>Enabled: {cfg.enabled ? '✅' : '❌'}</div>
          <div>Interval: {cfg.intervalMs}ms</div>
          <div>Last rotated: {cfg.lastRotatedAt ? new Date(cfg.lastRotatedAt).toLocaleTimeString() : '—'}</div>
          <div>Next: {cfg.nextRotationAt ? new Date(cfg.nextRotationAt).toLocaleTimeString() : '—'}</div>
          <div style={{ marginTop: 8 }}>
            <button onClick={() => vault.runDueRotations()} style={btnPrimary}>Run Now</button>
            <button onClick={() => { vault.startRotationLoop(1000) }} style={btnSmall}>Start Loop</button>
            <button onClick={() => vault.stopRotationLoop()} style={btnSmall}>Stop Loop</button>
          </div>
        </div>
      )}
    </Card>
  )
}

function ScannerTab({ tick }: { tick: number }) {
  void tick
  const [text, setText] = useState([
    'AKIAIOSFODNN7EXAMPLE',
    ['ghp', 'abc123def456ghi789jkl012mno345pqr678'].join('_'),
    ['sk', 'live', '1234567890abcdefghijklmnop'].join('_'),
  ].join('\n'))
  const findings = useMemo<ScanFinding[]>(() => scanText(text), [text])

  return (
    <Card title="Secret Scanner">
      <label>Input text
        <textarea value={text} onChange={e => setText(e.target.value)} rows={6} style={{ ...inputStyle, fontFamily: 'monospace' }} />
      </label>
      <div style={{ marginTop: 8 }}>
        <strong>{findings.length} finding(s):</strong>
        {findings.length > 0 && (
          <table style={{ width: '100%', fontSize: 12, marginTop: 4 }}>
            <thead><tr><th>Pattern</th><th>Severity</th><th>Masked</th><th>Type</th></tr></thead>
            <tbody>
              {findings.map((f, i) => (
                <tr key={i}>
                  <td>{f.pattern}</td>
                  <td style={{ color: f.severity === 'critical' ? '#c62828' : f.severity === 'high' ? '#f57c00' : '#1976d2' }}>{f.severity}</td>
                  <td><code>{f.masked}</code></td>
                  <td>{f.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}

function ResolverTab({ tick }: { tick: number }) {
  void tick
  const [tpl, setTpl] = useState('Authorization: Bearer {{secret.api-key}}')
  const secrets = vault.list()
  const resolved = useMemo(() => resolveReferences(tpl, vault), [tpl, tick])

  return (
    <Card title="Reference Resolver">
      <label>Template
        <input value={tpl} onChange={e => setTpl(e.target.value)} style={inputStyle} />
      </label>
      <div style={{ marginTop: 8 }}>Available secrets: {secrets.map(s => s.name).join(', ') || '(none)'}</div>
      <div style={{ marginTop: 8, padding: 8, background: '#fff', borderRadius: 4, fontFamily: 'monospace' }}>
        {resolved}
      </div>
    </Card>
  )
}

function MetricsTab({ tick }: { tick: number }) {
  void tick
  const all = vault.list()
  const audit = vault.audit_()
  const versions = vault.exportAll().versions
  return (
    <div>
      <Card title="Vault Metrics">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <Stat label="Secrets" value={all.length} />
          <Stat label="Versions" value={versions} color="#9c27b0" />
          <Stat label="Audit" value={audit.length} color="#f57c00" />
          <Stat label="Policies" value={vault.listPolicies().length} color="#2e7d32" />
        </div>
      </Card>
      <Card title="By Type">
        <ul>
          {SECRET_TYPES.map(t => {
            const n = all.filter(s => s.type === t).length
            return n > 0 ? <li key={t}>{t}: {n}</li> : null
          })}
        </ul>
      </Card>
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, marginLeft: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 8 }
const btnSmall: React.CSSProperties = { ...btnPrimary, fontSize: 10, padding: '3px 8px', marginLeft: 4, marginTop: 0 }
