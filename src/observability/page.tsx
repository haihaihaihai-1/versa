import { useState } from 'react'
import { Tracer, type Span, type TraceContext } from './index'

const t = new Tracer({ serviceName: 'demo' })
t.withSpan('init.app', () => 'ok')
t.withSpan('db.query', () => 'ok', { kind: 'client' })

export default function ObservabilityPage() {
  const [tab, setTab] = useState<'overview' | 'spans' | 'metrics' | 'exporter' | 'context'>('overview')
  const [spans, setSpans] = useState<Span[]>(t.getSpans())
  const [name, setName] = useState('http.request')
  const [kind, setKind] = useState<Span['kind']>('client')
  const [status, setStatus] = useState<Span['status']>('ok')
  const [metrics, setMetrics] = useState(t.getObservabilityMetrics())
  const [parent, setParent] = useState(t.encodeTraceparent({ traceId: t.newTraceId(), spanId: t.newSpanId(), flags: 1 }))
  const [decoded, setDecoded] = useState<TraceContext | null>(null)
  const [exporterLog, setExporterLog] = useState<string[]>([])

  const handleStart = () => {
    const s = t.startSpan(name, { kind })
    t.endSpan(s, { status })
    setSpans(t.getSpans())
    setMetrics(t.getObservabilityMetrics())
  }
  const handleRecordMetric = () => {
    t.counter('http.requests', 1, { route: '/x' })
    t.gauge('cpu.usage', Math.random())
    t.histogram('http.duration', Math.random() * 0.5)
    setMetrics(t.getObservabilityMetrics())
  }
  const handleDecode = () => {
    setDecoded(t.decodeTraceparent(parent))
  }
  const handleExport = async () => {
    const log: string[] = []
    t.addExporter((spans) => { for (const s of spans) log.push(`${s.name} (${s.kind}) - ${s.durationMs}ms`) })
    await t.exportAll()
    setExporterLog(log)
  }
  const handleClear = () => { t.clearSpans(); setSpans([]); setMetrics(t.getObservabilityMetrics()) }

  const tabs = [
    { id: 'overview', label: '概览' },
    { id: 'spans', label: 'Span' },
    { id: 'metrics', label: '指标' },
    { id: 'exporter', label: '导出' },
    { id: 'context', label: '上下文' }
  ] as const

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">可观测性 / 分布式追踪</h1>
      <p className="text-gray-500 mb-4">W3C traceparent · Span / Event / Link · 计数器 / 仪表 / 直方图</p>

      <div className="flex gap-2 mb-4 border-b overflow-x-auto">
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)} className={`px-4 py-2 whitespace-nowrap ${tab === tb.id ? 'border-b-2 border-blue-500 font-bold' : 'text-gray-500'}`}>{tb.label}</button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab metrics={metrics} />}
      {tab === 'spans' && (
        <div>
          <div className="flex gap-2 mb-3 items-end flex-wrap">
            <div><label className="block text-xs">Name</label><input value={name} onChange={e => setName(e.target.value)} className="border rounded px-2 py-1" /></div>
            <div><label className="block text-xs">Kind</label><select value={kind} onChange={e => setKind(e.target.value as Span['kind'])} className="border rounded px-2 py-1"><option value="client">client</option><option value="server">server</option><option value="producer">producer</option><option value="consumer">consumer</option><option value="internal">internal</option></select></div>
            <div><label className="block text-xs">Status</label><select value={status} onChange={e => setStatus(e.target.value as Span['status'])} className="border rounded px-2 py-1"><option value="ok">ok</option><option value="error">error</option><option value="unset">unset</option></select></div>
            <button onClick={handleStart} className="px-3 py-1 bg-blue-500 text-white rounded">Start + End</button>
            <button onClick={handleClear} className="px-3 py-1 bg-gray-200 rounded">Clear</button>
          </div>
          <table className="w-full text-sm border">
            <thead><tr className="bg-gray-100"><th className="p-2 text-left">Name</th><th className="p-2">Kind</th><th className="p-2">Service</th><th className="p-2 text-right">Duration</th><th className="p-2">Status</th><th className="p-2">Trace</th></tr></thead>
            <tbody>{spans.map(s => <tr key={s.spanId} className="border-t"><td className="p-2 font-mono">{s.name}</td><td className="p-2 text-center">{s.kind}</td><td className="p-2 text-center">{s.service}</td><td className="p-2 text-right">{s.durationMs ?? '-'}ms</td><td className="p-2 text-center"><span className={`px-2 py-0.5 rounded text-white text-xs ${s.status === 'ok' ? 'bg-green-500' : s.status === 'error' ? 'bg-red-500' : 'bg-gray-500'}`}>{s.status}</span></td><td className="p-2 text-xs font-mono">{s.traceId.slice(0, 8)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {tab === 'metrics' && (
        <div>
          <div className="flex gap-2 mb-3">
            <button onClick={handleRecordMetric} className="px-3 py-1 bg-blue-500 text-white rounded">记录指标</button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Metric label="Spans" value={metrics.totalSpans} />
            <Metric label="Traces" value={metrics.totalTraces} />
            <Metric label="Errors" value={metrics.totalErrors} />
            <Metric label="Sampled" value={metrics.totalSampled} />
            <Metric label="Exports" value={metrics.totalExports} />
            <Metric label="Metrics" value={metrics.totalMetrics} />
          </div>
          <div className="mt-4">
            <h3 className="font-bold mb-2">By Kind</h3>
            <div className="grid grid-cols-5 gap-2">
              {(['client', 'server', 'producer', 'consumer', 'internal'] as Span['kind'][]).map(k => <div key={k} className="text-center p-2 bg-gray-50 rounded"><div className="text-2xl font-bold">{metrics.byKind[k]}</div><div className="text-xs text-gray-500">{k}</div></div>)}
            </div>
          </div>
        </div>
      )}
      {tab === 'exporter' && (
        <div>
          <button onClick={handleExport} className="px-3 py-1 bg-blue-500 text-white rounded">导出 Span</button>
          {exporterLog.length > 0 && (
            <pre className="mt-3 bg-gray-900 text-green-300 p-3 rounded text-xs">{exporterLog.join('\n')}</pre>
          )}
        </div>
      )}
      {tab === 'context' && (
        <div>
          <div className="flex gap-2 mb-3 items-end">
            <div className="flex-1"><label className="block text-xs">traceparent</label><input value={parent} onChange={e => setParent(e.target.value)} className="border rounded px-2 py-1 w-full font-mono" /></div>
            <button onClick={handleDecode} className="px-3 py-1 bg-blue-500 text-white rounded">解码</button>
          </div>
          {decoded && <pre className="bg-gray-50 p-3 rounded">{JSON.stringify(decoded, null, 2)}</pre>}
        </div>
      )}
    </div>
  )
}

function OverviewTab({ metrics }: { metrics: ReturnType<Tracer['getObservabilityMetrics']> }) {
  const features = [
    { title: 'W3C traceparent', desc: '标准 16/8/2 段 trace/span/flags 头' },
    { title: 'Span 生命周期', desc: 'start / end / status / duration' },
    { title: 'Span 种类', desc: 'client / server / producer / consumer / internal' },
    { title: '事件 + 异常', desc: 'addEvent + recordException 自动写 status=error' },
    { title: 'Baggage / 链接', desc: '跨服务传递键值 + span links' },
    { title: '采样率', desc: '按 trace 随机丢弃降低开销' },
    { title: '指标', desc: 'Counter / Gauge / Histogram 三种类型' },
    { title: '导出器', desc: '插件式：内存 / 控制台 / 远程 OTLP' }
  ]
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {features.map(f => <div key={f.title} className="p-4 bg-gradient-to-br from-cyan-50 to-teal-50 rounded-lg border"><div className="font-bold mb-1">{f.title}</div><div className="text-sm text-gray-600">{f.desc}</div></div>)}
      </div>
      <div className="grid grid-cols-4 gap-3">
        <Metric label="Spans" value={metrics.totalSpans} />
        <Metric label="Traces" value={metrics.totalTraces} />
        <Metric label="Errors" value={metrics.totalErrors} />
        <Metric label="Sampled" value={metrics.totalSampled} />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border"><div className="text-sm text-gray-600">{label}</div><div className="text-3xl font-bold">{value}</div></div>
}
