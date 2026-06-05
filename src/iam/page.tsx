import { useState, useEffect } from 'react'
import { IamService, type PolicyDocument } from './index'

const svc = new IamService()
let inited = false
function ensure() {
  if (inited) return
  if (svc.listUsers().length === 0) {
    const alice = svc.createUser({ name: 'alice', email: 'alice@versa.io' })
    const bob = svc.createUser({ name: 'bob', email: 'bob@versa.io' })
    const svcAcct = svc.createUser({ name: 'svc-pipeline', email: 'pipeline@versa.io', type: 'service' })

    const adminPol: PolicyDocument = { version: '2012-10-17', statements: [{ effect: 'Allow', actions: ['*'], resources: ['*'] }] }
    const readPol: PolicyDocument = { version: '2012-10-17', statements: [{ effect: 'Allow', actions: ['s3:Get*', 's3:List*'], resources: ['arn:aws:s3:::*'] }] }
    const ops = svc.createPolicy('ops-admin', adminPol, 'Full admin')
    const reader = svc.createPolicy('reader', readPol, 'Read-only')
    svc.attachUserPolicy(alice.id, ops.id)
    svc.attachUserPolicy(bob.id, reader.id)
    svc.createAccessKey(svcAcct.id)

    const devGroup = svc.createGroup('developers')
    svc.attachGroupPolicy(devGroup.id, reader.id)
    svc.addUserToGroup(bob.id, devGroup.id)

    svc.setResourceOwner('reports/q4.pdf', alice.id)
    svc.grant('reports/q4.pdf', 'developers', 'group', ['read'])
  }
  inited = true
}

export default function IamPage() {
  const [tab, setTab] = useState<'users' | 'groups' | 'roles' | 'policies' | 'sessions' | 'authorize' | 'resources' | 'metrics'>('users')
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>IAM · v40.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        Users · groups · roles · policies · sessions · MFA · condition-based authorization · resource ACLs
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'users' && <UsersTab />}
        {tab === 'groups' && <GroupsTab />}
        {tab === 'roles' && <RolesTab />}
        {tab === 'policies' && <PoliciesTab />}
        {tab === 'sessions' && <SessionsTab />}
        {tab === 'authorize' && <AuthorizeTab />}
        {tab === 'resources' && <ResourcesTab />}
        {tab === 'metrics' && <MetricsTab />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [
    ['users', 'Users'], ['groups', 'Groups'], ['roles', 'Roles'], ['policies', 'Policies'],
    ['sessions', 'Sessions'], ['authorize', 'Authorize'], ['resources', 'Resources'], ['metrics', 'Metrics'],
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

function UsersTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const users = svc.listUsers()

  const add = () => {
    try { svc.createUser({ name, email }); setName(''); setEmail(''); setTick(t => t + 1) }
    catch (e) { alert((e as Error).message) }
  }
  const del = (id: string) => { if (confirm('Delete user?')) { svc.deleteUser(id); setTick(t => t + 1) } }
  const mfa = (id: string) => { svc.enableMfa(id); setTick(t => t + 1) }

  return (
    <Card title="Users">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: 8, marginBottom: 8 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="name" style={inputStyle} />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="email" style={inputStyle} />
        <button onClick={add} style={btnPrimary}>+ Add</button>
      </div>
      <table style={{ width: '100%', fontSize: 12 }}>
        <thead><tr><th>Name</th><th>Email</th><th>Type</th><th>Groups</th><th>Policies</th><th>MFA</th><th>Actions</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td><strong>{u.name}</strong></td>
              <td>{u.email}</td>
              <td>{u.type}</td>
              <td>{u.groups.length}</td>
              <td>{u.attachedPolicies.length}</td>
              <td>{u.mfaEnabled ? '✅' : '❌'}</td>
              <td>
                {!u.mfaEnabled && <button onClick={() => mfa(u.id)} style={btnSmall}>MFA</button>}
                <button onClick={() => del(u.id)} style={btnSmall}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function GroupsTab() {
  useEffect(() => { ensure() }, [])
  const [tick, setTick] = useState(0)
  const [name, setName] = useState('')
  const groups = [...(svc as any).groups.values()] as any[]

  const add = () => {
    try { svc.createGroup(name); setName(''); setTick(t => t + 1) } catch (e) { alert((e as Error).message) }
  }

  return (
    <Card title="Groups">
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="group name" style={inputStyle} />
        <button onClick={add} style={btnPrimary}>+ Add</button>
      </div>
      <table style={{ width: '100%', fontSize: 12 }}>
        <thead><tr><th>Name</th><th>Members</th><th>Policies</th></tr></thead>
        <tbody>
          {groups.map((g: any) => (
            <tr key={g.id}>
              <td><strong>{g.name}</strong></td>
              <td>{g.members.length}</td>
              <td>{g.attachedPolicies.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function RolesTab() {
  useEffect(() => { ensure() }, [])
  const [name, setName] = useState('admin')
  const [doc, setDoc] = useState(JSON.stringify({ version: '2012-10-17', statements: [{ effect: 'Allow', actions: ['*'], resources: ['*'] }] }, null, 2))
  const [duration, setDuration] = useState(3600)
  const [tick, setTick] = useState(0)
  const roles = svc.listRoles()

  const add = () => {
    try { svc.createRole(name, JSON.parse(doc), { maxSessionDuration: duration }); setTick(t => t + 1) }
    catch (e) { alert((e as Error).message) }
  }

  return (
    <Card title="Roles">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="role name" style={inputStyle} />
        <input type="number" min="900" max="43200" value={duration} onChange={e => setDuration(+e.target.value)} style={inputStyle} />
        <input value="assume role policy" disabled style={inputStyle} />
        <button onClick={add} style={btnPrimary}>+ Add</button>
      </div>
      <textarea value={doc} onChange={e => setDoc(e.target.value)} rows={5} style={{ ...inputStyle, fontFamily: 'monospace' }} />
      <table style={{ width: '100%', fontSize: 12, marginTop: 8 }}>
        <thead><tr><th>Name</th><th>Description</th><th>Max Session (s)</th><th>Policies</th></tr></thead>
        <tbody>
          {roles.map(r => (
            <tr key={r.id}>
              <td><strong>{r.name}</strong></td>
              <td>{r.description || '—'}</td>
              <td>{r.maxSessionDuration}</td>
              <td>{r.attachedPolicies.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function PoliciesTab() {
  useEffect(() => { ensure() }, [])
  const policies = svc.listPolicies()
  return (
    <Card title="Policies">
      <table style={{ width: '100%', fontSize: 11 }}>
        <thead><tr><th>Name</th><th>Description</th><th>Statements</th><th>Version</th></tr></thead>
        <tbody>
          {policies.map(p => (
            <tr key={p.id}>
              <td><strong>{p.name}</strong></td>
              <td>{p.description}</td>
              <td>{p.document.statements.length}</td>
              <td>{p.version}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function SessionsTab() {
  useEffect(() => { ensure() }, [])
  const [userId, setUserId] = useState(svc.getUserByName('alice')?.id ?? '')
  const [mfa, setMfa] = useState(false)
  const [duration, setDuration] = useState(3600)
  const [ip, setIp] = useState('10.0.0.1')
  const [token, setToken] = useState('')
  const [log, setLog] = useState<string[]>([])

  const start = () => {
    try {
      const sess = svc.createSession(userId, { mfaPresent: mfa, durationSec: duration, sourceIp: ip })
      setToken(sess.sessionToken)
      setLog(L => [...L, `session ${sess.id.slice(-6)} expires ${new Date(sess.expiresAt).toISOString().slice(11, 19)}`])
    } catch (e) { alert((e as Error).message) }
  }

  return (
    <Card title="Sessions">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
        <select value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle}>
          {svc.listUsers().map(u => <option key={u.id} value={u.id}>{u.name} ({u.type})</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={mfa} onChange={e => setMfa(e.target.checked)} /> MFA</label>
        <input type="number" value={duration} onChange={e => setDuration(+e.target.value)} placeholder="seconds" style={inputStyle} />
        <input value={ip} onChange={e => setIp(e.target.value)} placeholder="source IP" style={inputStyle} />
        <button onClick={start} style={btnPrimary}>Start</button>
      </div>
      {token && <div>Token: <code style={{ wordBreak: 'break-all', fontSize: 10 }}>{token}</code></div>}
      <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 11, maxHeight: 150, overflow: 'auto', background: '#fff', padding: 8, borderRadius: 4 }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </Card>
  )
}

function AuthorizeTab() {
  useEffect(() => { ensure() }, [])
  const [userId, setUserId] = useState(svc.getUserByName('alice')?.id ?? '')
  const [action, setAction] = useState('s3:GetObject')
  const [resource, setResource] = useState('arn:aws:s3:::reports/q4.pdf')
  const [ip, setIp] = useState('')
  const [mfa, setMfa] = useState(false)
  const [result, setResult] = useState<{ allowed: boolean; matched: any[] } | null>(null)

  const check = () => {
    const r = svc.authorize(userId, action, resource, { sourceIp: ip || undefined, mfaPresent: mfa || undefined })
    setResult({ allowed: r.allowed, matched: r.matchedStatements })
  }

  return (
    <Card title="Authorize Simulator">
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr', gap: 8 }}>
        <label>User <select value={userId} onChange={e => setUserId(e.target.value)} style={inputStyle}>{svc.listUsers().map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
        <label>Action <input value={action} onChange={e => setAction(e.target.value)} style={inputStyle} /></label>
        <label>Resource <input value={resource} onChange={e => setResource(e.target.value)} style={inputStyle} /></label>
        <label>Source IP <input value={ip} onChange={e => setIp(e.target.value)} placeholder="optional" style={inputStyle} /></label>
        <label style={{ display: 'flex', alignItems: 'center' }}><input type="checkbox" checked={mfa} onChange={e => setMfa(e.target.checked)} /> MFA Present</label>
        <div></div>
      </div>
      <button onClick={check} style={btnPrimary}>Check</button>
      {result && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: result.allowed ? '#2e7d32' : '#d32f2f' }}>
            {result.allowed ? '✅ ALLOW' : '❌ DENY'}
          </div>
          {result.matched.length > 0 && (
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <strong>Matched statements:</strong>
              <ul>
                {result.matched.map((m, i) => <li key={i}>policy=<code>{m.policyId.slice(-6)}</code> sid=<code>{m.statementSid ?? '—'}</code> effect={m.effect}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function ResourcesTab() {
  useEffect(() => { ensure() }, [])
  const [resourceId, setResourceId] = useState('reports/q4.pdf')
  const [grantee, setGrantee] = useState('bob')
  const [granteeType, setGranteeType] = useState<'user' | 'role' | 'group' | 'public'>('user')
  const [perms, setPerms] = useState('read')
  const [tick, setTick] = useState(0)
  const ownership = svc.getResourceOwner(resourceId)

  const grant = () => {
    if (!ownership) { svc.setResourceOwner(resourceId, svc.getUserByName('alice')!.id) }
    svc.grant(resourceId, grantee, granteeType, perms.split(',').map(s => s.trim()))
    setTick(t => t + 1)
  }
  const revoke = () => { svc.revoke(resourceId, grantee); setTick(t => t + 1) }
  const check = (perm: string) => svc.hasResourcePermission(resourceId, grantee, perm)

  return (
    <Card title={`Resource: ${resourceId}`}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto auto', gap: 8, marginBottom: 8 }}>
        <input value={resourceId} onChange={e => setResourceId(e.target.value)} style={inputStyle} />
        <input value={grantee} onChange={e => setGrantee(e.target.value)} placeholder="grantee" style={inputStyle} />
        <select value={granteeType} onChange={e => setGranteeType(e.target.value as any)} style={inputStyle}>
          <option>user</option><option>role</option><option>group</option><option>public</option>
        </select>
        <input value={perms} onChange={e => setPerms(e.target.value)} placeholder="read,write" style={inputStyle} />
        <button onClick={grant} style={btnPrimary}>Grant</button>
        <button onClick={revoke} style={btnSmall}>Revoke</button>
      </div>
      {ownership && (
        <div>
          <div>Owner: <code>{ownership.ownerId}</code></div>
          <table style={{ width: '100%', fontSize: 11, marginTop: 8 }}>
            <thead><tr><th>Grantee</th><th>Type</th><th>Permissions</th><th>Check</th></tr></thead>
            <tbody>
              {ownership.acl.map((a, i) => (
                <tr key={i}>
                  <td><code>{a.grantee}</code></td>
                  <td>{a.granteeType}</td>
                  <td>{a.permissions.join(', ')}</td>
                  <td>
                    {a.permissions.map(p => (
                      <span key={p} style={{ marginRight: 4, color: check(p) ? '#2e7d32' : '#d32f2f' }}>
                        {check(p) ? '✅' : '❌'} {p}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
        <Stat label="Auth Checks" value={m.authChecks} color="#1976d2" />
        <Stat label="Allows" value={m.allows} color="#2e7d32" />
        <Stat label="Denies" value={m.denies} color="#d32f2f" />
        <Stat label="Sessions" value={m.sessionsCreated} color="#9c27b0" />
      </div>
    </Card>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, marginLeft: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }
const btnSmall: React.CSSProperties = { ...btnPrimary, fontSize: 10, padding: '3px 8px', marginLeft: 4 }
