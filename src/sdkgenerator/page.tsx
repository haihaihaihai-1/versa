import { useState, useMemo } from 'react'
import { SdkGenerator, type ApiSpec, type Language, type ApiOperation, type ApiType } from './index'

const gen = new SdkGenerator()

const sampleSpec: ApiSpec = {
  title: 'Pet Store',
  version: '1.0.0',
  baseUrl: 'https://petstore.example.com/v1',
  auth: [{ type: 'bearer', name: 'apiKey' }],
  operations: [
    { id: 'listPets', method: 'GET', path: '/pets', summary: 'List all pets', tags: ['pets'], parameters: [{ name: 'limit', in: 'query', type: 'integer', required: false }, { name: 'status', in: 'query', type: 'string', required: false }], responses: [{ status: 200, type: 'application/json' }], auth: ['apiKey'] },
    { id: 'createPet', method: 'POST', path: '/pets', summary: 'Create a pet', tags: ['pets'], parameters: [], requestBody: { type: 'application/json', required: true }, responses: [{ status: 201 }], auth: ['apiKey'] },
    { id: 'getPet', method: 'GET', path: '/pets/{id}', summary: 'Get pet by id', tags: ['pets'], parameters: [{ name: 'id', in: 'path', type: 'string', required: true }], responses: [{ status: 200, type: 'application/json' }], auth: ['apiKey'] },
    { id: 'deletePet', method: 'DELETE', path: '/pets/{id}', summary: 'Delete pet', tags: ['pets'], parameters: [{ name: 'id', in: 'path', type: 'string', required: true }], responses: [{ status: 204 }], auth: ['apiKey'] }
  ],
  types: [
    { name: 'Pet', kind: 'object', fields: { id: { type: 'string' }, name: { type: 'string' }, tag: { type: 'string', optional: true } } },
    { name: 'Status', kind: 'enum', values: ['available', 'pending', 'sold'] }
  ]
}

const openApiDoc = `{
  "info": { "title": "Pet Store", "version": "1.0.0" },
  "servers": [{ "url": "https://petstore.example.com/v1" }],
  "paths": {
    "/pets": {
      "get": { "operationId": "listPets", "summary": "List all pets", "parameters": [{ "name": "limit", "in": "query", "schema": { "type": "integer" } }], "responses": { "200": { "content": { "application/json": { "schema": { "type": "array" } } } } } }
    }
  },
  "components": { "securitySchemes": { "apiKey": { "type": "http" } }, "schemas": { "Pet": { "type": "object", "properties": { "id": { "type": "string" }, "name": { "type": "string" } }, "required": ["id"] } } }
}`

const graphqlSdl = `
type User { id: ID! name: String email: String }
type Query {
  user(id: ID!): User
  users(limit: Int): [User]
}
enum Role { ADMIN USER GUEST }
`

const LANGUAGES: Language[] = ['typescript', 'javascript', 'python', 'go', 'curl']

export default function SdkGeneratorPage() {
  const [tab, setTab] = useState<'overview' | 'parser' | 'generate' | 'history' | 'metrics'>('overview')
  const [spec, setSpec] = useState<ApiSpec>(sampleSpec)
  const [language, setLanguage] = useState<Language>('typescript')
  const [clientName, setClientName] = useState('PetStore')
  const [output, setOutput] = useState<{ filename: string; content: string; bytes: number; lineCount: number } | null>(null)
  const [openApiInput, setOpenApiInput] = useState(openApiDoc)
  const [parsedSpec, setParsedSpec] = useState<ApiSpec | null>(null)
  const [graphqlInput, setGraphqlInput] = useState(graphqlSdl)
  const [parsedGraphql, setParsedGraphql] = useState<{ queries: unknown[]; types: unknown[] } | null>(null)
  const [metrics, setMetrics] = useState(gen.getMetrics())
  const [history, setHistory] = useState<Array<{ filename: string; language: string; bytes: number; lineCount: number }>>([])

  const handleGenerate = () => {
    if (!spec) return
    try {
      gen.ingest(spec)
      const f = gen.generate(spec.title, language, { clientName })
      setOutput({ filename: f.filename, content: f.content, bytes: f.bytes, lineCount: f.lineCount })
      setMetrics(gen.getMetrics())
      setHistory(h => [{ filename: f.filename, language, bytes: f.bytes, lineCount: f.lineCount }, ...h].slice(0, 20))
    } catch (e) {
      setOutput({ filename: 'error', content: String(e), bytes: 0, lineCount: 0 })
    }
  }

  const handleParseOpenApi = () => {
    try {
      const doc = JSON.parse(openApiInput)
      const g = new SdkGenerator()
      const s = g.parseOpenAPI(doc)
      setParsedSpec(s)
    } catch (e) {
      setParsedSpec(null)
      alert('Parse error: ' + String(e))
    }
  }
  const handleParseGraphql = () => {
    try {
      const g = new SdkGenerator()
      const r = g.parseGraphQLSDL(graphqlInput)
      setParsedGraphql({ queries: r.queries, types: r.types })
    } catch (e) {
      setParsedGraphql(null)
      alert('Parse error: ' + String(e))
    }
  }

  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'parser', label: '解析器' },
    { id: 'generate', label: '生成' },
    { id: 'history', label: '历史' },
    { id: 'metrics', label: '指标' }
  ] as const

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">API 客户端 SDK 生成器</h1>
      <p className="text-gray-500 mb-4">从 OpenAPI 3.0 / GraphQL SDL 生成 TypeScript、JavaScript、Python、Go、cURL 客户端</p>

      <div className="flex gap-2 mb-4 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 whitespace-nowrap ${tab === t.id ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-500'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'parser' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-bold mb-2">OpenAPI 3.0 解析</h3>
            <textarea value={openApiInput} onChange={e => setOpenApiInput(e.target.value)} className="w-full h-64 p-2 border rounded font-mono text-xs" />
            <button onClick={handleParseOpenApi} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">解析</button>
            {parsedSpec && <SpecView spec={parsedSpec} />}
          </div>
          <div>
            <h3 className="font-bold mb-2">GraphQL SDL 解析</h3>
            <textarea value={graphqlInput} onChange={e => setGraphqlInput(e.target.value)} className="w-full h-64 p-2 border rounded font-mono text-xs" />
            <button onClick={handleParseGraphql} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">解析</button>
            {parsedGraphql && (
              <div className="mt-2 p-3 bg-gray-50 rounded">
                <div><b>Queries ({parsedGraphql.queries.length}):</b></div>
                <ul className="list-disc list-inside text-sm">{parsedGraphql.queries.map((q: unknown, i) => <li key={i}>{String((q as { name: string }).name)}: {String((q as { returns: string }).returns)}</li>)}</ul>
                <div className="mt-2"><b>Types ({parsedGraphql.types.length}):</b></div>
                <ul className="list-disc list-inside text-sm">{parsedGraphql.types.map((t: unknown, i) => <li key={i}>{String((t as { name: string }).name)} ({String((t as { kind: string }).kind)})</li>)}</ul>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'generate' && (
        <div>
          <div className="flex gap-2 mb-4">
            <select value={language} onChange={e => setLanguage(e.target.value as Language)} className="border rounded px-3 py-2">
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name" className="border rounded px-3 py-2" />
            <button onClick={handleGenerate} className="px-4 py-2 bg-blue-500 text-white rounded">生成</button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-bold mb-2">Spec ({spec.operations.length} operations, {spec.types.length} types)</h3>
              <div className="bg-gray-50 p-3 rounded max-h-96 overflow-auto text-xs">
                {spec.operations.map(o => <div key={o.id} className="mb-1"><b>{o.method}</b> {o.path} — {o.summary ?? o.id}</div>)}
              </div>
            </div>
            <div>
              {output && (
                <>
                  <div className="text-sm mb-2"><b>{output.filename}</b> · {output.bytes} bytes · {output.lineCount} lines</div>
                  <pre className="bg-gray-900 text-green-300 p-3 rounded text-xs overflow-auto max-h-96">{output.content}</pre>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div>
          <h3 className="font-bold mb-2">生成历史</h3>
          {history.length === 0 ? <div className="text-gray-400">尚无生成记录</div> : (
            <table className="w-full text-sm border">
              <thead><tr className="bg-gray-100"><th className="p-2 text-left">Filename</th><th className="p-2">Language</th><th className="p-2">Bytes</th><th className="p-2">Lines</th></tr></thead>
              <tbody>{history.map((h, i) => <tr key={i} className="border-t"><td className="p-2 font-mono">{h.filename}</td><td className="p-2 text-center">{h.language}</td><td className="p-2 text-right">{h.bytes}</td><td className="p-2 text-right">{h.lineCount}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'metrics' && (
        <div className="grid grid-cols-2 gap-4">
          <Metric label="Specs" value={metrics.totalSpecs} />
          <Metric label="Generations" value={metrics.totalGenerations} />
          <Metric label="Operations" value={metrics.totalOperations} />
          <Metric label="Types" value={metrics.totalTypes} />
          <div className="col-span-2 p-4 bg-gray-50 rounded">
            <h3 className="font-bold mb-2">By Language</h3>
            <div className="grid grid-cols-5 gap-2">
              {LANGUAGES.map(l => <div key={l} className="text-center"><div className="text-2xl font-bold">{metrics.byLanguage[l]}</div><div className="text-xs text-gray-500">{l}</div></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OverviewTab() {
  const features = [
    { title: 'OpenAPI 3.0', desc: '解析 paths / components / security schemes / schemas' },
    { title: 'GraphQL SDL', desc: '解析 type / enum / query / mutation / 参数' },
    { title: '多语言生成', desc: 'TypeScript / JavaScript / Python / Go / cURL' },
    { title: '类型映射', desc: 'string/integer/boolean/array/object 跨语言转换' },
    { title: '认证', desc: 'apiKey / bearer / basic 在 header/query 中' },
    { title: '路径/查询参数', desc: '{id} 替换 + URLSearchParams 序列化' },
    { title: '请求体', desc: 'JSON body 序列化与 Content-Type 头' },
    { title: '指标', desc: '按语言统计生成次数 / 字节 / 行数' }
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {features.map(f => <div key={f.title} className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border"><div className="font-bold mb-1">{f.title}</div><div className="text-sm text-gray-600">{f.desc}</div></div>)}
    </div>
  )
}

function SpecView({ spec }: { spec: ApiSpec }) {
  return (
    <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
      <div><b>{spec.title}</b> v{spec.version}</div>
      <div className="text-gray-500 text-xs">{spec.baseUrl}</div>
      <div className="mt-1"><b>Operations ({spec.operations.length}):</b></div>
      <ul className="list-disc list-inside text-xs">{spec.operations.map((o: ApiOperation) => <li key={o.id}><b>{o.method}</b> {o.path}</li>)}</ul>
      <div className="mt-1"><b>Types ({spec.types.length}):</b></div>
      <ul className="list-disc list-inside text-xs">{spec.types.map((t: ApiType) => <li key={t.name}>{t.name} ({t.kind})</li>)}</ul>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border"><div className="text-sm text-gray-600">{label}</div><div className="text-3xl font-bold">{value}</div></div>
}
