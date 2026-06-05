import { useState, useEffect } from 'react'
import { ObjectStore, FileStorage, type BucketPolicy, type LifecycleRule } from './index'

export default function FilestorePage() {
  const [tab, setTab] = useState<'buckets' | 'objects' | 'multipart' | 'policy' | 'lifecycle' | 'presign'>('buckets')
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>File Storage · v37.0</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>
        S3-compatible buckets · multipart upload · IAM-style policies · lifecycle rules · presigned URLs
      </p>
      <Tabs current={tab} onChange={setTab} />
      <div style={{ marginTop: 16 }}>
        {tab === 'buckets' && <BucketsTab />}
        {tab === 'objects' && <ObjectsTab />}
        {tab === 'multipart' && <MultipartTab />}
        {tab === 'policy' && <PolicyTab />}
        {tab === 'lifecycle' && <LifecycleTab />}
        {tab === 'presign' && <PresignTab />}
      </div>
    </div>
  )
}

function Tabs({ current, onChange }: { current: string; onChange: (t: any) => void }) {
  const tabs: Array<[string, string]> = [
    ['buckets', 'Buckets'], ['objects', 'Objects'],
    ['multipart', 'Multipart'], ['policy', 'Policy'],
    ['lifecycle', 'Lifecycle'], ['presign', 'Presigned URL'],
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

const fs = new FileStorage()
let ensured = false
function ensure() {
  if (ensured) return
  if (!fs.store.bucketExists('demo')) fs.store.createBucket('demo', 'alice')
  if (fs.store.objectCount('demo') === 0) {
    fs.putText('demo', 'readme.md', '# Hello\nS3-compatible demo', 'alice', { contentType: 'text/markdown' })
    fs.putText('demo', 'data/users.json', JSON.stringify([{ id: 1, name: 'Alice' }], null, 2), 'alice', { contentType: 'application/json' })
  }
  ensured = true
}

function BucketsTab() {
  useEffect(() => { ensure() }, [])
  const [name, setName] = useState('my-bucket')
  const [buckets, setBuckets] = useState<string[]>([])

  const refresh = () => setBuckets(fs.store.listBuckets())
  useEffect(() => { refresh() }, [])

  return (
    <Card title="Buckets">
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="bucket name" style={inputStyle} />
        <button onClick={() => { try { fs.store.createBucket(name, 'alice'); refresh() } catch (e) { alert((e as Error).message) } }} style={btnPrimary}>Create</button>
      </div>
      <table style={{ width: '100%', fontSize: 12 }}>
        <thead><tr><th>Name</th><th>Objects</th><th>Total Size</th><th>Actions</th></tr></thead>
        <tbody>
          {buckets.map(b => (
            <tr key={b}>
              <td><strong>{b}</strong></td>
              <td>{fs.store.objectCount(b)}</td>
              <td>{fs.store.totalSize(b)} B</td>
              <td><button onClick={() => { try { fs.store.deleteBucket(b); refresh() } catch (e) { alert((e as Error).message) } }} style={btnSmall}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function ObjectsTab() {
  useEffect(() => { ensure() }, [])
  const [bucket, setBucket] = useState('demo')
  const [key, setKey] = useState('new-file.txt')
  const [content, setContent] = useState('Hello S3!')
  const [objects, setObjects] = useState<{ key: string; size: number; ct: string }[]>([])

  const refresh = () => setObjects(fs.store.listObjects(bucket).map(o => ({ key: o.key, size: o.size, ct: o.contentType })))
  useEffect(() => { refresh() }, [bucket])

  return (
    <div>
      <Card title="Put / Get / List">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8, marginBottom: 8 }}>
          <label>Bucket <input value={bucket} onChange={e => setBucket(e.target.value)} style={inputStyle} /></label>
          <label>Key <input value={key} onChange={e => setKey(e.target.value)} style={inputStyle} /></label>
        </div>
        <textarea value={content} onChange={e => setContent(e.target.value)} rows={4} style={{ ...inputStyle, fontFamily: 'monospace' }} />
        <button onClick={() => { try { fs.putText(bucket, key, content, 'alice', { contentType: 'text/plain' }); refresh() } catch (e) { alert((e as Error).message) } }} style={btnPrimary}>Put Object</button>
      </Card>
      <Card title={`Objects in ${bucket}`}>
        <table style={{ width: '100%', fontSize: 12 }}>
          <thead><tr><th>Key</th><th>Size</th><th>Type</th><th>Actions</th></tr></thead>
          <tbody>
            {objects.map(o => (
              <tr key={o.key}>
                <td><code>{o.key}</code></td>
                <td>{o.size} B</td>
                <td>{o.ct}</td>
                <td>
                  <button onClick={() => { try { const t = fs.getText(bucket, o.key); alert(t) } catch (e) { alert((e as Error).message) } }} style={btnSmall}>Get</button>
                  <button onClick={() => { fs.store.deleteObject(bucket, o.key); refresh() }} style={btnSmall}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function MultipartTab() {
  const [bucket, setBucket] = useState('demo')
  const [key, setKey] = useState('big.bin')
  const [chunks, setChunks] = useState(3)
  const [chunkSize, setChunkSize] = useState(16)
  const [log, setLog] = useState<string[]>([])

  const upload = () => {
    if (!fs.store.bucketExists(bucket)) { fs.store.createBucket(bucket, 'alice') }
    const t0 = Date.now()
    const data = new Uint8Array(chunks * chunkSize)
    for (let i = 0; i < data.length; i++) data[i] = i & 0xff
    const arr: Uint8Array[] = []
    for (let i = 0; i < chunks; i++) arr.push(data.slice(i * chunkSize, (i + 1) * chunkSize))
    const meta = fs.uploadMultipart(bucket, key, 'alice', arr)
    setLog(L => [...L, `uploaded ${chunks}×${chunkSize}B → ${key} (${meta.size}B, ${Date.now() - t0}ms)`])
  }

  return (
    <Card title="Multipart Upload">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        <label>Bucket <input value={bucket} onChange={e => setBucket(e.target.value)} style={inputStyle} /></label>
        <label>Key <input value={key} onChange={e => setKey(e.target.value)} style={inputStyle} /></label>
        <label>Chunks <input type="number" min="1" max="100" value={chunks} onChange={e => setChunks(+e.target.value)} style={inputStyle} /></label>
        <label>Chunk Size (B) <input type="number" min="1" value={chunkSize} onChange={e => setChunkSize(+e.target.value)} style={inputStyle} /></label>
      </div>
      <button onClick={upload} style={btnPrimary}>Upload</button>
      <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 11, maxHeight: 200, overflow: 'auto', background: '#fff', padding: 8, borderRadius: 4 }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </Card>
  )
}

function PolicyTab() {
  useEffect(() => { ensure() }, [])
  const [bucket, setBucket] = useState('demo')
  const [policyText, setPolicyText] = useState(JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      { Sid: 'deny-eve', Effect: 'Deny', Principal: 'eve', Action: 's3:*', Resource: 'arn:aws:s3:::' + bucket + '/*' },
    ],
  }, null, 2))
  const [allowed, setAllowed] = useState<{ p: string; a: string; ok: boolean } | null>(null)
  const [testP, setTestP] = useState('alice')
  const [testA, setTestA] = useState('s3:GetObject')

  const apply = () => {
    try {
      const p: BucketPolicy = { bucket, version: '2012-10-17', statements: JSON.parse(policyText).Statement }
      fs.store.setPolicy(bucket, p)
      alert('Policy applied')
    } catch (e) { alert((e as Error).message) }
  }

  const test = () => {
    const ok = fs.store.checkPermission(bucket, 'readme.md', testA, testP)
    setAllowed({ p: testP, a: testA, ok })
  }

  return (
    <Card title="Bucket Policy (IAM-style)">
      <label>Bucket <input value={bucket} onChange={e => setBucket(e.target.value)} style={inputStyle} /></label>
      <textarea value={policyText} onChange={e => setPolicyText(e.target.value)} rows={8} style={{ ...inputStyle, fontFamily: 'monospace' }} />
      <button onClick={apply} style={btnPrimary}>Apply Policy</button>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input value={testP} onChange={e => setTestP(e.target.value)} placeholder="principal" style={inputStyle} />
        <input value={testA} onChange={e => setTestA(e.target.value)} placeholder="action" style={inputStyle} />
        <button onClick={test} style={btnPrimary}>Check</button>
      </div>
      {allowed && <div style={{ marginTop: 8 }}>Result: <strong>{allowed.ok ? '✅ Allow' : '❌ Deny'}</strong> for {allowed.p} → {allowed.a}</div>}
    </Card>
  )
}

function LifecycleTab() {
  useEffect(() => { ensure() }, [])
  const [bucket, setBucket] = useState('demo')
  const [rules, setRules] = useState<LifecycleRule[]>([
    { id: 'r1', prefix: 'tmp/', expirationDays: 30, enabled: true },
    { id: 'r2', prefix: 'logs/', transitionToArchiveDays: 90, enabled: true },
  ])
  const [log, setLog] = useState<string[]>([])

  const run = () => {
    fs.store.setLifecycle(bucket, rules)
    const r = fs.store.runLifecycle(bucket)
    setLog(L => [...L, JSON.stringify(r)])
  }

  return (
    <Card title="Lifecycle Rules">
      <label>Bucket <input value={bucket} onChange={e => setBucket(e.target.value)} style={inputStyle} /></label>
      <pre style={{ fontSize: 11, background: '#fff', padding: 8, borderRadius: 4, overflow: 'auto' }}>{JSON.stringify(rules, null, 2)}</pre>
      <button onClick={run} style={btnPrimary}>Apply & Run Now</button>
      <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 11, maxHeight: 150, overflow: 'auto', background: '#fff', padding: 8, borderRadius: 4 }}>
        {log.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </Card>
  )
}

function PresignTab() {
  const [bucket, setBucket] = useState('demo')
  const [key, setKey] = useState('readme.md')
  const [method, setMethod] = useState<'GET' | 'PUT' | 'DELETE'>('GET')
  const [expires, setExpires] = useState(3600)
  const [secret, setSecret] = useState('my-secret-key')
  const [presigned, setPresigned] = useState<{ url: string; signature: string; expiresAt: number } | null>(null)
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null)

  const generate = () => {
    if (!fs.store.bucketExists(bucket)) { fs.store.createBucket(bucket, 'alice') }
    const p = fs.store.generatePresignedUrl({ bucket, key, method, expiresIn: expires }, secret)
    setPresigned(p)
    setVerifyResult(null)
  }

  const verify = () => {
    if (!presigned) return
    setVerifyResult(fs.store.verifyPresignedUrl(presigned.url, method, secret))
  }

  return (
    <Card title="Presigned URL">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        <label>Bucket <input value={bucket} onChange={e => setBucket(e.target.value)} style={inputStyle} /></label>
        <label>Key <input value={key} onChange={e => setKey(e.target.value)} style={inputStyle} /></label>
        <label>Method
          <select value={method} onChange={e => setMethod(e.target.value as any)} style={inputStyle}>
            <option>GET</option><option>PUT</option><option>DELETE</option>
          </select>
        </label>
        <label>Expires (s) <input type="number" value={expires} onChange={e => setExpires(+e.target.value)} style={inputStyle} /></label>
        <label>Secret <input value={secret} onChange={e => setSecret(e.target.value)} style={inputStyle} /></label>
      </div>
      <button onClick={generate} style={btnPrimary}>Generate</button>
      {presigned && (
        <div style={{ marginTop: 12, background: '#fff', padding: 8, borderRadius: 4 }}>
          <div>URL: <code style={{ wordBreak: 'break-all', fontSize: 11 }}>{presigned.url}</code></div>
          <div>Signature: <code>{presigned.signature}</code></div>
          <div>Expires: {new Date(presigned.expiresAt).toISOString()}</div>
        </div>
      )}
      {presigned && <button onClick={verify} style={btnPrimary}>Verify</button>}
      {verifyResult !== null && <div style={{ marginTop: 8 }}>Verification: <strong>{verifyResult ? '✅ Valid' : '❌ Invalid'}</strong></div>}
    </Card>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, marginLeft: 4 }
const btnPrimary: React.CSSProperties = { padding: '6px 14px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', marginTop: 8 }
const btnSmall: React.CSSProperties = { ...btnPrimary, fontSize: 10, padding: '3px 8px', marginLeft: 4, marginTop: 0 }
