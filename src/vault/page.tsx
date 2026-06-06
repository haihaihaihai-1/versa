import { useState } from 'react'
import { SecretVault } from './index'

const TABS = ['CRUD', 'Encryption', 'Rotation', 'Dynamic', 'Templates', 'Policies', 'Audit', 'Backup', 'Bulk', 'Metrics'] as const
type Tab = typeof TABS[number]

function newVault() { return new SecretVault({ masterKey: 'demo-master' }) }

export default function VaultPage() {
  const [tab, setTab] = useState<Tab>('CRUD')
  const [vault] = useState(newVault)
  const [out, setOut] = useState('')
  const [path, setPath] = useState('db/password')
  const [val, setVal] = useState('s3cret-1234')

  const log = (m: any) => setOut(typeof m === 'string' ? m : JSON.stringify(m, null, 2))

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v58.0 Secret Vault</h1>
      <p className="text-sm text-slate-400">PBKDF2 + AES-256-GCM 加密 · 策略 RBAC · 动态凭据 · 模板展开 · 审计 + 备份</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'CRUD' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input value={path} onChange={e => setPath(e.target.value)} placeholder="path" className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input value={val} onChange={e => setVal(e.target.value)} placeholder="value" className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { vault.write(path, { value: val }); log('written v' + vault.read(path)?.version) }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">write</button>
            <button onClick={() => log(vault.read(path) ?? 'null')} className="px-3 py-1.5 bg-blue-700 rounded text-xs">read</button>
            <button onClick={() => { vault.delete(path); log('soft-deleted') }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">delete</button>
            <button onClick={() => log(vault.undelete(path) ? 'undeleted' : 'no-op')} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">undelete</button>
            <button onClick={() => log('history: ' + JSON.stringify(vault.history(path)))} className="px-3 py-1.5 bg-indigo-700 rounded text-xs">history</button>
            <button onClick={() => log('list: ' + JSON.stringify(vault.list('')))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">list</button>
          </div>
        </div>
      )}

      {tab === 'Encryption' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input id="encIn" defaultValue="hello world" className="flex-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const v = (document.getElementById('encIn') as HTMLInputElement).value
              const enc = (vault as unknown as { encrypt: (s: string) => any }).encrypt(v)
              log({ encrypted: enc, decrypted: (vault as unknown as { decrypt: (p: any) => string }).decrypt(enc) })
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">encrypt + decrypt</button>
            <button onClick={() => {
              try { (vault as unknown as { encrypt: (s: string) => any }).encrypt('x'); (vault as unknown as { encrypt: (s: string) => any }).encrypt('y'); log('ok') } catch (e) { log('tamper detected: ' + (e as Error).message) }
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">verify checksum</button>
          </div>
        </div>
      )}

      {tab === 'Rotation' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => { vault.write('rot/x', { value: 'old' }, { rotationIntervalSec: 1 }); log('written, 1s rotation') }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">seed (1s rotation)</button>
            <button onClick={() => { vault.rotate('rot/x', { value: 'new-' + Date.now() }); log('rotated, v' + vault.read('rot/x')?.version) }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">rotate now</button>
            <button onClick={() => log('rotated ' + vault.rotateIfDue() + ' due') } className="px-3 py-1.5 bg-cyan-700 rounded text-xs">rotateIfDue</button>
          </div>
        </div>
      )}

      {tab === 'Dynamic' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => log(vault.createDynamicSecret('lease/db', { user: 'temp_' + Date.now() }, { ttlSec: 60 }))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">create dynamic (60s)</button>
            <button onClick={() => log('revoked: ' + vault.revokeDynamicSecret('lease/db'))} className="px-3 py-1.5 bg-rose-700 rounded text-xs">revoke</button>
            <button onClick={() => log('active: ' + JSON.stringify(vault.listDynamicSecrets()))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">list active</button>
          </div>
        </div>
      )}

      {tab === 'Templates' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <button onClick={() => {
              vault.write('db', { host: 'localhost', port: '5432' })
              vault.write('creds', { user: 'admin', pass: 'x' })
              log('cfg: ' + vault.expandTemplate('{{db}}') + '\ntmpl: ' + vault.resolveTemplate('jdbc:{{db/host}}:{{db/port}}', p => vault.read(p)?.data[Object.keys(vault.read(p)?.data || {})[0]]))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">expand templates</button>
          </div>
        </div>
      )}

      {tab === 'Policies' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { vault.addPolicy({ path: 'prod/', capabilities: [{ actor: 'alice', ops: ['read', 'write'] }] }); log('policy: alice → prod/ read+write') }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">add policy (alice)</button>
            <button onClick={() => { vault.addPolicy({ path: 'dev/', capabilities: [{ actor: 'bob', ops: ['read', 'write', 'delete'] }] }); log('policy: bob → dev/ all') }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">add policy (bob)</button>
            <button onClick={() => log(JSON.stringify(vault.listPolicies()))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">list</button>
            <button onClick={() => { try { vault.write('prod/x', { v: 'p' }, { actor: 'alice' }) } catch (e) { log('alice: ' + (e as Error).message) } try { vault.write('prod/x', { v: 'p2' }, { actor: 'bob' }) } catch (e) { log('bob: ' + (e as Error).message) } }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">test write (alice ok, bob denied)</button>
            <button onClick={() => { vault.removePolicy('prod/'); log('removed prod/') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">remove prod/</button>
          </div>
        </div>
      )}

      {tab === 'Audit' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => log(vault.getAuditLog({ event: 'write' }))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">filter write</button>
            <button onClick={() => log(vault.getAuditLog({ event: 'read' }))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">filter read</button>
            <button onClick={() => log(vault.getAuditLog({ actor: 'alice' }))} className="px-3 py-1.5 bg-indigo-700 rounded text-xs">filter alice</button>
            <button onClick={() => log(vault.getAuditLog({ since: Date.now() - 60_000 }))} className="px-3 py-1.5 bg-amber-700 rounded text-xs">last 60s</button>
            <button onClick={() => { vault.clearAudit(); log('cleared') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">clear</button>
          </div>
        </div>
      )}

      {tab === 'Backup' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              vault.write('b/1', { x: '1' }); vault.write('b/2', { x: '2' })
              const snap = vault.backup()
              vault.write('b/1', { x: 'changed' })
              vault.restore(snap)
              log('restored → b/1=' + JSON.stringify(vault.read('b/1')?.data))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">backup + restore</button>
            <button onClick={() => log('restored tampered: ' + vault.restore('garbage'))} className="px-3 py-1.5 bg-rose-700 rounded text-xs">try restore (bad mac)</button>
          </div>
        </div>
      )}

      {tab === 'Bulk' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => log('wrote: ' + String(vault.bulkWrite([{ path: 'k1', data: { a: '1' } }, { path: 'k2', data: { b: '2' } }, { path: 'k3', data: { c: '3' } }])))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">bulkWrite 3</button>
            <button onClick={() => log('deleted: ' + String(vault.bulkDelete(['k1', 'k2', 'k3'])))} className="px-3 py-1.5 bg-rose-700 rounded text-xs">bulkDelete 3</button>
            <button onClick={() => log('export: ' + String(vault.exportAll().length) + ' secrets')} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">exportAll</button>
          </div>
        </div>
      )}

      {tab === 'Metrics' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => log(vault.getMetrics())} className="px-3 py-1.5 bg-blue-700 rounded text-xs">show metrics</button>
            <button onClick={() => { vault.resetMetrics(); log('reset') }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">reset</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out}</pre>
    </div>
  )
}
