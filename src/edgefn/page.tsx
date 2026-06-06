import { useState } from 'react'
import { EdgeRuntime, type EdgeRequest, type Invocation } from './index'

const rt = new EdgeRuntime()

export default function EdgeFnPage() {
  const [tab, setTab] = useState<'overview' | 'functions' | 'invoke' | 'logs' | 'metrics'>('overview')
  const [fns, setFns] = useState(rt.listFunctions())
  const [name, setName] = useState('hello')
  const [version, setVersion] = useState('1.0.0')
  const [code, setCode] = useState("() => rt.jsonResponse({ msg: 'Hello from edge!' })")
  const [selectedFn, setSelectedFn] = useState('hello')
  const [method, setMethod] = useState<EdgeRequest['method']>('GET')
  const [url, setUrl] = useState('/hello')
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<{ status: number; headers: Record<string, string>; body: string } | null>(null)
  const [invocations, setInvocations] = useState<Invocation[]>(rt.listInvocations())
  const [metrics, setMetrics] = useState(rt.getMetrics())

  const refresh = () => {
    setFns(rt.listFunctions())
    setInvocations(rt.listInvocations())
    setMetrics(rt.getMetrics())
  }
  const handleCreate = () => {
    try {
      const fn = new Function('rt', `return (${code})`)(rt)
      rt.registerFunction({ name, version, handler: fn, triggers: ['http'], methods: ['GET', 'POST'] })
      refresh()
    } catch (e) { alert(String(e)) }
  }
  const handleDelete = (n: string) => { rt.deleteFunction(n); refresh() }
  const handleInvoke = async () => {
    try {
      const req = rt.parseRequest({ method, url, headers: body ? { 'content-type': 'application/json' } : {}, body })
      const r = await rt.invokeHttp(req)
      setResponse({ status: r.status, headers: r.headers, body: r.body })
      refresh()
    } catch (e) { alert(String(e)) }
  }
  const handleCron = async () => {
    await rt.invokeCron(selectedFn, { ts: Date.now() })
    refresh()
  }
  const handleQueue = async () => {
    await rt.invokeQueue(selectedFn, { msg: 'hello' })
    refresh()
  }

  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'functions', label: '函数' },
    { id: 'invoke', label: '调用' },
    { id: 'logs', label: '日志' },
    { id: 'metrics', label: '指标' }
  ] as const

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">边缘函数 / Serverless 运行时</h1>
      <p className="text-gray-500 mb-4">路由 / 路径参数 / 中间件 / 冷启动 / 触发器 / 超时 / 区域路由</p>

      <div className="flex gap-2 mb-4 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-4 py-2 whitespace-nowrap ${tab === t.id ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-500'}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'functions' && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs">Name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="border rounded px-2 py-1 w-full" />
            </div>
            <div>
              <label className="block text-xs">Version</label>
              <input value={version} onChange={e => setVersion(e.target.value)} className="border rounded px-2 py-1 w-full" />
            </div>
          </div>
          <label className="block text-xs">Handler (JavaScript expression returning fn)</label>
          <textarea value={code} onChange={e => setCode(e.target.value)} className="w-full h-20 p-2 border rounded font-mono text-xs" />
          <button onClick={handleCreate} className="mt-2 px-3 py-1 bg-blue-500 text-white rounded">注册函数</button>
          <h3 className="font-bold mt-4 mb-2">已注册函数</h3>
          <table className="w-full text-sm border">
            <thead><tr className="bg-gray-100"><th className="p-2 text-left">Name</th><th className="p-2 text-left">Version</th><th className="p-2">Triggers</th><th className="p-2">Methods</th><th className="p-2">Actions</th></tr></thead>
            <tbody>{fns.length === 0 ? <tr><td colSpan={5} className="p-3 text-center text-gray-400">尚无函数</td></tr> : fns.map(f => (
              <tr key={f.name} className="border-t"><td className="p-2 font-mono">{f.name}</td><td className="p-2">{f.version}</td><td className="p-2 text-center">{f.triggers.join(', ')}</td><td className="p-2 text-center">{f.methods?.join(', ') ?? '-'}</td><td className="p-2 text-center"><button onClick={() => handleDelete(f.name)} className="px-2 py-0.5 bg-red-500 text-white text-xs rounded">Del</button></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {tab === 'invoke' && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs">Method</label>
              <select value={method} onChange={e => setMethod(e.target.value as EdgeRequest['method'])} className="border rounded px-2 py-1 w-full"><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select>
            </div>
            <div>
              <label className="block text-xs">URL</label>
              <input value={url} onChange={e => setUrl(e.target.value)} className="border rounded px-2 py-1 w-full" />
            </div>
          </div>
          <label className="block text-xs">Body (JSON)</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} className="w-full h-20 p-2 border rounded font-mono text-xs" />
          <div className="mt-2 flex gap-2">
            <button onClick={handleInvoke} className="px-3 py-1 bg-blue-500 text-white rounded">HTTP 调用</button>
            <button onClick={handleCron} className="px-3 py-1 bg-purple-500 text-white rounded">Cron 触发</button>
            <button onClick={handleQueue} className="px-3 py-1 bg-orange-500 text-white rounded">Queue 触发</button>
          </div>
          {response && (
            <div className="mt-3 p-3 bg-gray-50 rounded">
              <div className="mb-2"><b>Status: {response.status}</b></div>
              <div className="text-xs text-gray-600 mb-2">Headers: {Object.entries(response.headers).map(([k, v]) => `${k}: ${v}`).join(' | ')}</div>
              <pre className="bg-gray-900 text-green-300 p-2 rounded text-xs overflow-auto max-h-64">{response.body}</pre>
            </div>
          )}
        </div>
      )}
      {tab === 'logs' && (
        <div>
          <h3 className="font-bold mb-2">调用日志</h3>
          {invocations.length === 0 ? <div className="text-gray-400">尚无调用记录</div> : (
            <table className="w-full text-sm border">
              <thead><tr className="bg-gray-100"><th className="p-2 text-left">Function</th><th className="p-2">Trigger</th><th className="p-2">Status</th><th className="p-2 text-right">Duration</th><th className="p-2">Cold</th><th className="p-2">Region</th><th className="p-2">Time</th></tr></thead>
              <tbody>{invocations.slice(-15).reverse().map(i => <tr key={i.id} className="border-t"><td className="p-2 font-mono">{i.functionName}</td><td className="p-2 text-center">{i.trigger}</td><td className="p-2 text-center">{i.status}</td><td className="p-2 text-right">{i.durationMs.toFixed(1)}ms</td><td className="p-2 text-center">{i.coldStart ? '❄️' : '-'}</td><td className="p-2 text-center text-xs">{i.region ?? '-'}</td><td className="p-2 text-center text-xs">{new Date(i.timestamp).toLocaleTimeString()}</td></tr>)}</tbody>
            </table>
          )}
        </div>
      )}
      {tab === 'metrics' && (
        <div className="grid grid-cols-3 gap-4">
          <Metric label="Functions" value={metrics.totalFunctions} />
          <Metric label="Invocations" value={metrics.totalInvocations} />
          <Metric label="Errors" value={metrics.totalErrors} />
          <Metric label="Cold Starts" value={metrics.totalColdStarts} />
          <Metric label="Avg Duration" value={Math.round(metrics.avgDurationMs * 10) / 10} suffix="ms" />
          <div className="col-span-3 p-4 bg-gray-50 rounded">
            <h3 className="font-bold mb-2">By Trigger</h3>
            <div className="grid grid-cols-4 gap-2">
              {(['http', 'cron', 'queue', 'event'] as const).map(t => <div key={t} className="text-center p-2 bg-white rounded border"><div className="text-2xl font-bold">{metrics.byTrigger[t]}</div><div className="text-xs text-gray-500">{t}</div></div>)}
            </div>
          </div>
          <div className="col-span-3 p-4 bg-gray-50 rounded">
            <h3 className="font-bold mb-2">By Region</h3>
            <div className="grid grid-cols-5 gap-2">
              {(['us-east', 'us-west', 'eu-central', 'ap-northeast', 'sa-east'] as const).map(r => <div key={r} className="text-center p-2 bg-white rounded border"><div className="text-2xl font-bold">{metrics.byRegion[r]}</div><div className="text-xs text-gray-500">{r}</div></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OverviewTab() {
  const features = [
    { title: '路由匹配', desc: '精确 + 路径参数 + 通配符 + 正则' },
    { title: 'HTTP 方法', desc: 'GET / POST / PUT / PATCH / DELETE / OPTIONS' },
    { title: '中间件链', desc: '全局 + 函数级，可提前返回或修改响应' },
    { title: 'Body 解析', desc: 'JSON / form-urlencoded / 文本' },
    { title: 'Cookies & CORS', desc: 'cookie 解析 + 预检头' },
    { title: '多触发器', desc: 'http / cron / queue / event' },
    { title: '冷启动追踪', desc: '首次调用标记 + 计时' },
    { title: '超时 / 区域', desc: '可配置 ms 超时 + 区域分布指标' }
  ]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {features.map(f => <div key={f.title} className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border"><div className="font-bold mb-1">{f.title}</div><div className="text-sm text-gray-600">{f.desc}</div></div>)}
    </div>
  )
}

function Metric({ label, value, suffix = '' }: { label: string; value: number; suffix?: string }) {
  return <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg border"><div className="text-sm text-gray-600">{label}</div><div className="text-3xl font-bold">{value}{suffix}</div></div>
}
