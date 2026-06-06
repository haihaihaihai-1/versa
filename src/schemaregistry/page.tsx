import { useState } from 'react'
import { SchemaRegistry, SchemaParser, SchemaMigration, SchemaCodec, getRegistry, resetRegistry } from './index'

const TABS = ['Register', 'List', 'Compatibility', 'Migration', 'Codec', 'Refs'] as const
type Tab = typeof TABS[number]

const COMPAT_MODES = ['BACKWARD', 'FORWARD', 'FULL', 'NONE'] as const

export default function SchemaRegistryPage() {
  const [tab, setTab] = useState<Tab>('Register')
  const [reg] = useState(() => {
    resetRegistry()
    const r = new SchemaRegistry()
    // Pre-register a sample schema
    r.register({
      type: 'object',
      properties: { id: { type: 'int' }, name: { type: 'string' }, email: { type: 'string' } },
      required: ['id', 'name'],
    }, 'json-schema', 'User')
    return r
  })
  const [out, setOut] = useState('')

  const sampleSchemas = {
    jsonUser: { type: 'object', properties: { id: { type: 'int' }, name: { type: 'string' } }, required: ['id', 'name'] },
    jsonUserV2: { type: 'object', properties: { id: { type: 'int' }, name: { type: 'string' }, age: { type: 'int' } }, required: ['id', 'name'] },
    avroOrder: { type: 'record', name: 'Order', fields: [{ name: 'id', type: 'long' }, { name: 'total', type: 'double' }] },
  }

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v65.0 Schema Registry</h1>
      <p className="text-sm text-slate-400">模式注册 · 版本管理 · 兼容性检查 (BACKWARD/FORWARD/FULL/NONE) · 字段索引 · 引用解析 · 迁移映射 · 编解码</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Register' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const s = reg.register(sampleSchemas.jsonUser, 'json-schema', 'User')
              setOut(`Registered: id=${s.id}, version=${s.version}, name=${s.name}, fields=${s.fields.length}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">register User v1</button>
            <button onClick={() => {
              const result = reg.evolve(sampleSchemas.jsonUserV2, 'json-schema', 'User', 'BACKWARD')
              setOut(`Evolved User v${result.schema.version}\nCompatible: ${result.compatible}\nIssues: ${result.issues.join(', ') || 'none'}`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">evolve User v2 (BACKWARD)</button>
            <button onClick={() => {
              const s = reg.register(sampleSchemas.avroOrder, 'avro', 'Order')
              setOut(`Registered Avro: ${s.name} v${s.version}, fields: ${s.fields.map(f => f.name).join(', ')}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">register Avro Order</button>
          </div>
        </div>
      )}

      {tab === 'List' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const all = reg.listAll()
              setOut(all.map(s => `[${s.id}] ${s.name} v${s.version} (${s.type}) — ${s.fields.length} fields`).join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list all</button>
            <button onClick={() => {
              setOut('User versions: ' + reg.listByName('User').join(', '))
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">list User</button>
            <button onClick={() => {
              const found = reg.findField('User', 'name')
              setOut(found ? `Found in schema [${found.schema.id}] v${found.schema.version}: ${found.field.name}:${found.field.type}` : 'not found')
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">findField name</button>
            <button onClick={() => {
              const found = reg.searchFields('id')
              setOut(found.map(f => `${f.schema.name}[${f.schema.id}].${f.field.name}: ${f.field.type}`).join('\n'))
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">search 'id'</button>
            <button onClick={() => setOut('Metrics: ' + JSON.stringify(reg.metrics()))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">metrics</button>
          </div>
        </div>
      )}

      {tab === 'Compatibility' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <select id="compat-mode" defaultValue="BACKWARD" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
              {COMPAT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => {
              const mode = (document.getElementById('compat-mode') as HTMLSelectElement).value as 'BACKWARD' | 'FORWARD' | 'FULL' | 'NONE'
              // Build two schemas on the fly
              const a = SchemaParser.parse({ properties: { x: { type: 'int' } }, required: ['x'] }, 'json-schema', 'Comp')
              const b = SchemaParser.parse({ properties: { x: { type: 'int' }, y: { type: 'string' } } }, 'json-schema', 'Comp')
              const r = reg.checkCompatibility(a, b, mode)
              setOut(`[${mode}] a→b: compatible=${r.compatible}\nIssues: ${r.issues.join(', ') || 'none'}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">check a→b (add optional)</button>
            <button onClick={() => {
              const mode = (document.getElementById('compat-mode') as HTMLSelectElement).value as 'BACKWARD' | 'FORWARD' | 'FULL' | 'NONE'
              const a = SchemaParser.parse({ properties: { x: { type: 'int' } }, required: ['x'] }, 'json-schema', 'Comp')
              const b = SchemaParser.parse({ properties: {} }, 'json-schema', 'Comp')
              const r = reg.checkCompatibility(a, b, mode)
              setOut(`[${mode}] a→b (remove required): compatible=${r.compatible}\nIssues: ${r.issues.join(', ') || 'none'}`)
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">check a→b (remove required)</button>
            <button onClick={() => {
              const mode = (document.getElementById('compat-mode') as HTMLSelectElement).value as 'BACKWARD' | 'FORWARD' | 'FULL' | 'NONE'
              const a = SchemaParser.parse({ properties: { x: { type: 'int' } } }, 'json-schema', 'Comp')
              const b = SchemaParser.parse({ properties: { x: { type: 'string' } } }, 'json-schema', 'Comp')
              const r = reg.checkCompatibility(a, b, mode)
              setOut(`[${mode}] a→b (type change): compatible=${r.compatible}\nIssues: ${r.issues.join(', ') || 'none'}`)
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">check a→b (type change)</button>
          </div>
        </div>
      )}

      {tab === 'Migration' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <button onClick={() => {
              const m = new SchemaMigration(1, 2).map('user_name', 'username').map('email_addr', 'email', v => String(v).toLowerCase())
              const out = m.apply({ user_name: 'Alice', email_addr: 'A@B.COM', other: 'kept' })
              setOut('v1 record → v2:\n' + JSON.stringify(out, null, 2))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">migrate v1→v2</button>
            <button onClick={() => {
              const m = new SchemaMigration(2, 3).map('total', 'total_cents', v => Math.round((v as number) * 100))
              const out = m.apply({ total: 19.99, currency: 'USD' })
              setOut('Multiply by 100:\n' + JSON.stringify(out, null, 2))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">migrate v2→v3 (multiply)</button>
          </div>
        </div>
      )}

      {tab === 'Codec' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const s = SchemaParser.parse({ properties: { id: { type: 'int' }, name: { type: 'string' } }, required: ['id', 'name'] })
              const r = SchemaCodec.encode({ id: 1, name: 'alice' }, s)
              setOut('Encode valid: ' + JSON.stringify(r))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">encode valid</button>
            <button onClick={() => {
              const s = SchemaParser.parse({ properties: { id: { type: 'int' }, name: { type: 'string' } }, required: ['id', 'name'] })
              const r = SchemaCodec.encode({ name: 'alice' }, s)
              setOut('Encode invalid (missing id): ' + JSON.stringify(r))
            }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">encode missing field</button>
            <button onClick={() => {
              const s = SchemaParser.parse({ properties: { x: { type: 'int', default: 42 } } })
              const r = SchemaCodec.encode({}, s)
              setOut('Encode with default: ' + JSON.stringify(r))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">encode with default</button>
            <button onClick={() => {
              const s = SchemaParser.parse({ properties: { val: { type: 'int|string' } } })
              setOut('union type:\n  int 5: ' + JSON.stringify(SchemaCodec.validate({ val: 5 }, s)) + '\n  string "x": ' + JSON.stringify(SchemaCodec.validate({ val: 'x' }, s)))
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">validate union</button>
          </div>
        </div>
      )}

      {tab === 'Refs' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const addr = SchemaParser.parse({ properties: { city: { type: 'string' }, zip: { type: 'string' } } })
              reg.addReference('Address', addr)
              setOut('Added reference: Address with fields: ' + addr.fields.map(f => f.name).join(', '))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">add Address ref</button>
            <button onClick={() => {
              const resolved = reg.resolveRef('schema:Address')
              setOut(resolved ? `Resolved: ${resolved.name} (${resolved.fields.length} fields)` : 'not found')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">resolve schema:Address</button>
            <button onClick={() => {
              const resolved = reg.resolveRef('#/definitions/Address')
              setOut(resolved ? `Resolved: ${resolved.name}` : 'not found')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">resolve #/definitions/Address</button>
            <button onClick={() => setOut('Refs: ' + reg.metrics().references)} className="px-3 py-1.5 bg-slate-700 rounded text-xs">count refs</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see schema registry operations'}</pre>
    </div>
  )
}
