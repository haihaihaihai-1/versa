import { useState } from 'react'
import { AnomalyDetector, type AnomalyAlert, type DetectorMethod, type SeriesStats } from './index'

const TABS = ['Setup', 'Series', 'Methods', 'Alerts', 'Stats'] as const
type Tab = typeof TABS[number]

const METHODS: DetectorMethod[] = ['zscore', 'mad', 'iqr', 'isolation_forest', 'moving_avg']

const buildDetector = (): AnomalyDetector => {
  const d = new AnomalyDetector()
  let s = 42
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const box = () => { const u1 = Math.max(rand(), 1e-9); const u2 = rand(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) }
  for (let i = 0; i < 50; i++) d.push('latency_ms', 50 + 5 * box())
  for (let i = 0; i < 50; i++) d.push('qps', 1000 + 50 * box())
  for (let i = 0; i < 50; i++) d.push('error_rate', 0.01 + 0.005 * box())
  return d
}

export default function AnomalyPage() {
  const [tab, setTab] = useState<Tab>('Setup')
  const [det] = useState(buildDetector)
  const [out, setOut] = useState('')
  const [series, setSeries] = useState('latency_ms')
  const [value, setValue] = useState('999')
  const [method, setMethod] = useState<DetectorMethod>('zscore')

  const push = (methods: DetectorMethod[] = [method]) => {
    const v = parseFloat(value)
    const a = det.push(series, v, methods)
    setOut(a ? 'ANOMALY: ' + a.method + ' severity=' + a.severity + ' score=' + a.score.toFixed(2) + ' value=' + a.value + ' range=[' + a.expectedRange.low.toFixed(2) + ',' + a.expectedRange.high.toFixed(2) + ']' : 'normal: ' + v)
  }

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v82.0 Anomaly Detection</h1>
      <p className="text-sm text-slate-400">时序异常检测 · z-score · MAD · IQR · 移动平均 · 隔离森林 · 严重度</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={'px-3 py-1.5 text-xs rounded-t ' + (tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}>{t}</button>
        ))}
      </div>

      {tab === 'Setup' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('series: ' + det.listSeries().join(', '))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list series</button>
            <button onClick={() => {
              const stats: Record<string, SeriesStats | null> = {}
              for (const s of det.listSeries()) stats[s] = det.stats(s)
              setOut('series stats:\n' + Object.entries(stats).map(([k, v]) => '  ' + k + ': mean=' + (v?.mean.toFixed(2) ?? '-') + ' std=' + (v?.std.toFixed(2) ?? '-') + ' n=' + (v?.count ?? 0)).join('\n'))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">all stats</button>
            <button onClick={() => {
              const s = det.stats(series)
              if (!s) { setOut('no series ' + series); return }
              setOut(series + ' stats:\n  count=' + s.count + '\n  mean=' + s.mean.toFixed(2) + '\n  std=' + s.std.toFixed(2) + '\n  min=' + s.min + '\n  max=' + s.max + '\n  q1=' + s.q1 + ' median=' + s.median + ' q3=' + s.q3 + '\n  iqr=' + s.iqr + '\n  mad=' + s.mad)
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">series detail</button>
            <button onClick={() => {
              det.clearAlerts()
              setOut('alerts cleared, count=' + det.countAlerts())
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">clear alerts</button>
          </div>
        </div>
      )}

      {tab === 'Series' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('latency_ms last 10: ' + det.getSeries('latency_ms').slice(-10).map(v => v.toFixed(1)).join(', '))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">latency tail</button>
            <button onClick={() => setOut('qps last 10: ' + det.getSeries('qps').slice(-10).map(v => v.toFixed(0)).join(', '))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">qps tail</button>
            <button onClick={() => {
              det.resetSeries('latency_ms')
              for (let i = 0; i < 50; i++) det.push('latency_ms', 50 + (Math.random() - 0.5) * 10)
              setOut('latency_ms reseeded, count=' + det.getSeries('latency_ms').length)
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">reseed latency</button>
            <button onClick={() => {
              det.resetSeries('error_rate')
              for (let i = 0; i < 30; i++) det.push('error_rate', 0.01)
              setOut('error_rate reset to baseline')
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">reset error_rate</button>
          </div>
        </div>
      )}

      {tab === 'Methods' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-slate-400">series<input value={series} onChange={e => setSeries(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">value<input value={value} onChange={e => setValue(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">method<select value={method} onChange={e => setMethod(e.target.value as DetectorMethod)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">{METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></label>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => push([method])} className="px-3 py-1.5 bg-blue-700 rounded text-xs">test single</button>
            <button onClick={() => push(['zscore', 'mad', 'iqr'])} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">test zscore+mad+iqr</button>
            <button onClick={() => push(['moving_avg'])} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">moving_avg</button>
            <button onClick={() => push(['isolation_forest'])} className="px-3 py-1.5 bg-amber-700 rounded text-xs">isolation_forest</button>
            <button onClick={() => {
              const out: string[] = []
              for (const m of METHODS) {
                const v = parseFloat(value)
                const r = m === 'zscore' ? det.zscore(series, v)
                  : m === 'mad' ? det.mad(series, v)
                  : m === 'iqr' ? det.iqr(series, v)
                  : m === 'moving_avg' ? det.movingAvg(series, v)
                  : det.isolationForest(series, v)
                out.push(m + ': score=' + r.score.toFixed(3) + ' anomaly=' + r.isAnomaly)
              }
              setOut(out.join('\n'))
            }} className="px-3 py-1.5 bg-violet-700 rounded text-xs">compare all</button>
          </div>
        </div>
      )}

      {tab === 'Alerts' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const out: string[] = []
              out.push('total alerts: ' + det.countAlerts())
              for (const sev of ['minor', 'major', 'critical'] as const) {
                out.push(sev + ': ' + det.listAlerts({ severity: sev }).length)
              }
              setOut(out.join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">summary</button>
            <button onClick={() => {
              const a = det.listAlerts({ severity: 'critical' })
              setOut('critical alerts (' + a.length + '):\n' + a.slice(-5).map((al: AnomalyAlert) => '  ' + al.series + ' v=' + al.value + ' score=' + al.score.toFixed(2)).join('\n'))
            }} className="px-3 py-1.5 bg-red-700 rounded text-xs">critical</button>
            <button onClick={() => {
              const a = det.listAlerts({ series })
              setOut('alerts for ' + series + ': ' + a.length + '\n' + a.slice(-5).map((al: AnomalyAlert) => '  ' + al.method + ' v=' + al.value + ' score=' + al.score.toFixed(2)).join('\n'))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">by series</button>
            <button onClick={() => {
              const a = det.listAlerts({ method: 'zscore' })
              setOut('zscore alerts: ' + a.length)
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">by method</button>
          </div>
        </div>
      )}

      {tab === 'Stats' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const s = det.stats_view()
              setOut('series: ' + s.seriesCount + '\nobservations: ' + s.totalObservations + '\nalerts: ' + det.countAlerts() + '\nalert rate: ' + (s.alertRate * 100).toFixed(2) + '%\nuptime: ' + det.uptimeMs() + 'ms')
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">overall</button>
            <button onClick={() => {
              const s = det.stats_view()
              setOut('alerts by method:\n' + Object.entries(s.alertsByMethod).map(([k, v]) => '  ' + k + ': ' + v).join('\n'))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">by method</button>
            <button onClick={() => {
              const s = det.stats_view()
              setOut('alerts by severity:\n' + Object.entries(s.alertsBySeverity).map(([k, v]) => '  ' + k + ': ' + v).join('\n'))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">by severity</button>
            <button onClick={() => setOut('config:\n' + JSON.stringify(det.config, null, 2))} className="px-3 py-1.5 bg-amber-700 rounded text-xs">config</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see anomaly detection operations'}</pre>
    </div>
  )
}
