import { useState } from 'react'
import { getValidator, type Schema, type ValidationResult } from './index'

const sampleSchema: Schema = {
  name: { type: 'string', required: true, min: 1, max: 50 },
  age: { type: 'integer', required: true, min: 0, max: 150 },
  email: { type: 'email', required: true },
  role: { type: 'enum', enum: ['admin', 'user', 'guest'], required: true },
  score: { type: 'number', min: 0, max: 100, default: 0 },
}

const v = getValidator()

type Tab = 'single' | 'batch' | 'schema' | 'coerce'

export const ValidatePage = () => {
  const [tab, setTab] = useState<Tab>('single')
  const [out, setOut] = useState<string>('')

  return (
    <div style={{ padding: 24 }}>
      <h2>Data Validation v89.0</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {(['single', 'batch', 'schema', 'coerce'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} data-active={tab === t} style={{ padding: '4px 12px' }}>{t}</button>
        ))}
      </div>
      {tab === 'single' && <SingleTab setOut={setOut} />}
      {tab === 'batch' && <BatchTab setOut={setOut} />}
      {tab === 'schema' && <SchemaTab setOut={setOut} />}
      {tab === 'coerce' && <CoerceTab setOut={setOut} />}
      <pre style={{ background: '#111', color: '#cfc', padding: 12, marginTop: 16, maxHeight: 300, overflow: 'auto' }}>{out}</pre>
    </div>
  )
}

const SingleTab = ({ setOut }: { setOut: (s: string) => void }) => {
  const [json, setJson] = useState('{"name":"Alice","age":30,"email":"a@b.com","role":"admin"}')
  const run = () => {
    try {
      const r = v.validate(sampleSchema, JSON.parse(json))
      setOut(JSON.stringify(r, null, 2))
    } catch (e) { setOut('Error: ' + (e as Error).message) }
  }
  return (
    <div>
      <textarea value={json} onChange={e => setJson(e.target.value)} rows={6} style={{ width: '100%', padding: 8, fontFamily: 'monospace' }} />
      <button onClick={run} style={{ marginTop: 8, padding: '8px 16px' }}>Validate</button>
    </div>
  )
}

const BatchTab = ({ setOut }: { setOut: (s: string) => void }) => {
  const run = () => {
    const records = [
      { name: 'Alice', age: 30, email: 'a@b.com', role: 'admin' },
      { name: 'Bob', age: 25, email: 'invalid', role: 'user' },
      { name: 'Carol', age: 200, email: 'c@d.com', role: 'guest' },
    ]
    const b = v.validateBatch(sampleSchema, records)
    setOut(JSON.stringify({ okCount: b.okCount, failCount: b.failCount, results: b.results.map((r: ValidationResult) => ({ ok: r.ok, errors: r.errors })) }, null, 2))
  }
  return <button onClick={run}>Run Batch</button>
}

const SchemaTab = ({ setOut }: { setOut: (s: string) => void }) => {
  const show = () => setOut(JSON.stringify(sampleSchema, null, 2))
  return (
    <div>
      <p>Sample schema:</p>
      <button onClick={show}>Show Schema</button>
    </div>
  )
}

const CoerceTab = ({ setOut }: { setOut: (s: string) => void }) => {
  const run = () => {
    const r = v.validate({ n: { type: 'integer' }, b: { type: 'boolean' }, s: { type: 'string' } }, { n: '42', b: 'true', s: 100 })
    setOut(JSON.stringify(r.cleaned, null, 2))
  }
  return <button onClick={run}>Test Coercion</button>
}
