import { useState } from 'react'
import { DriftMonitor, resetDriftMonitor, severityFromScore, type Severity, type DriftMetric } from './index'

const TABS = ['Setup', 'Numeric', 'Categorical', 'Severity', 'Alerts', 'Stats'] as const
type Tab = typeof TABS[number]

const SEVERITIES: Severity[] = ['ok', 'minor', 'major', 'critical']
const METRICS: DriftMetric[] = ['psi', 'ks', 'chi_square', 'js_divergence']

const sampleNumeric = (mean: number, std: number, n: number, seed = 42): number[] => {
  let s = seed
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  const box = () => {
    const u1 = Math.max(rand(), 1e-9)
    const u2 = rand()
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  }
  return Array.from({ length: n }, () => mean + std * box())
}

const sampleCategorical = (labels: string[], n: number, seed = 99): string[] => {
  let s = seed
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  return Array.from({ length: n }, () => labels[Math.floor(rand() * labels.length)])
}

const seedDemo = (m: DriftMonitor) => {
  m.setReference('age', 'numeric', sampleNumeric(35, 10, 1000))
  m.setCurrent('age', 'numeric', sampleNumeric(35, 10, 1000, 7))
  m.setReference('country', 'categorical', sampleCategorical(['US', 'CN', 'JP', 'DE'], 1000))
  m.setCurrent('country', 'categorical', sampleCategorical(['US', 'CN', 'JP', 'DE'], 1000, 7))
  m.setReference('price', 'numeric', sampleNumeric(50, 5, 800))
  m.setCurrent('price', 'numeric', sampleNumeric(70, 5, 800))
}

const severityColor = (s: Severity): string => {
  if (s === 'ok') return 'text-emerald-400'
  if (s === 'minor') return 'text-amber-400'
  if (s === 'major') return 'text-orange-400'
  return 'text-red-400'
}

export default function DriftPage() {
  const [tab, setTab] = useState<Tab>('Setup')
  const [monitor] = useState<DriftMonitor>(() => {
    resetDriftMonitor()
    const m = new DriftMonitor()
    seedDemo(m)
    return m
  })
  const [out, setOut] = useState('')
  const [feature, setFeature] = useState('age')
  const [metric, setMetric] = useState<DriftMetric>('psi')
  const [ack, setAck] = useState('')

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v78.0 Drift Detection</h1>
      <p className="text-sm text-slate-400">数据漂移监控 · PSI / KS / Chi-square / JS Divergence · 严重度分级 · 告警</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={'px-3 py-1.5 text-xs rounded-t ' + (tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}>{t}</button>
        ))}
      </div>

      {tab === 'Setup' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="drift-feature" value={feature} onChange={e => setFeature(e.target.value)} placeholder="feature name" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <select id="drift-metric" value={metric} onChange={e => setMetric(e.target.value as DriftMetric)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
              {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => {
              const snap = monitor.getSnapshot(feature)
              if (!snap) { setOut('no snapshot for ' + feature); return }
              const r = monitor.detectDrift(snap, metric)
              setOut('drift(' + metric + ') on ' + feature + ':\n' + JSON.stringify(r, null, 2))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">detect drift</button>
            <button onClick={() => setOut('tracked features: ' + monitor.listSnapshots().map(s => s.featureName).join(', '))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">list features</button>
            <button onClick={() => {
              const out: string[] = []
              for (const s of monitor.listSnapshots()) {
                const r = monitor.detectDrift(s, 'psi')
                out.push(s.featureName + ' -> ' + r.severity + ' (psi=' + r.score.toFixed(4) + ')')
              }
              setOut(out.join('\n'))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">scan all (psi)</button>
          </div>
        </div>
      )}

      {tab === 'Numeric' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('age ref mean=' + (monitor.getSnapshot('age')?.reference.type === 'numeric' ? (monitor.getSnapshot('age')!.reference as { mean: number }).mean.toFixed(2) : '-') + ' std=' + (monitor.getSnapshot('age')?.reference.type === 'numeric' ? (monitor.getSnapshot('age')!.reference as { std: number }).std.toFixed(2) : '-'))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">age ref stats</button>
            <button onClick={() => setOut('price ref mean=' + (monitor.getSnapshot('price')?.reference.type === 'numeric' ? (monitor.getSnapshot('price')!.reference as { mean: number }).mean.toFixed(2) : '-') + ' std=' + (monitor.getSnapshot('price')?.reference.type === 'numeric' ? (monitor.getSnapshot('price')!.reference as { std: number }).std.toFixed(2) : '-'))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">price ref stats</button>
            <button onClick={() => {
              const a = monitor.getSnapshot('age')
              const p = monitor.getSnapshot('price')
              if (!a || !p) { setOut('missing snapshots'); return }
              setOut('age psi: ' + monitor.detectDrift(a, 'psi').score.toFixed(4) + '\nprice psi: ' + monitor.detectDrift(p, 'psi').score.toFixed(4) + '\nage ks: ' + monitor.detectDrift(a, 'ks').score.toFixed(4))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">compare age vs price</button>
            <button onClick={() => {
              const a = monitor.getSnapshot('age')
              if (!a) { setOut('no age'); return }
              setOut('age chi_square (binned): ' + monitor.detectDrift(a, 'chi_square').score.toFixed(4) + '\nage js_divergence: ' + monitor.detectDrift(a, 'js_divergence').score.toFixed(4))
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">age alt metrics</button>
          </div>
        </div>
      )}

      {tab === 'Categorical' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const c = monitor.getSnapshot('country')
              if (!c) { setOut('no country'); return }
              setOut('country psi: ' + monitor.detectDrift(c, 'psi').score.toFixed(4) + '\ncountry chi_square: ' + monitor.detectDrift(c, 'chi_square').score.toFixed(4))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">country drift</button>
            <button onClick={() => setOut('country ref dist: ' + JSON.stringify(monitor.getSnapshot('country')?.reference.type === 'categorical' ? (monitor.getSnapshot('country')!.reference as { probs: Record<string, number> }).probs : {}))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">country ref probs</button>
            <button onClick={() => {
              monitor.setReference('category_drift', 'categorical', sampleCategorical(['A', 'B', 'C', 'D'], 1000, 1))
              monitor.setCurrent('category_drift', 'categorical', sampleCategorical(['A', 'A', 'B', 'C'], 1000, 2))
              const s = monitor.getSnapshot('category_drift')!
              setOut('strong shift category_drift psi: ' + monitor.detectDrift(s, 'psi').score.toFixed(4))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">inject strong shift</button>
          </div>
        </div>
      )}

      {tab === 'Severity' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input id="drift-thr" defaultValue="0.1" placeholder="threshold" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs w-20" />
            <button onClick={() => {
              const thr = parseFloat((document.getElementById('drift-thr') as HTMLInputElement).value)
              const sev = severityFromScore(thr, monitor.getConfig().psiThresholds)
              setOut('score ' + thr + ' -> ' + sev)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">classify</button>
            <button onClick={() => {
              const out: string[] = []
              const thr = monitor.getConfig().psiThresholds
              for (const s of SEVERITIES) {
                const sampleScore = s === 'ok' ? 0.05 : s === 'minor' ? 0.15 : s === 'major' ? 0.25 : 0.4
                out.push('score ' + sampleScore + ' -> ' + severityFromScore(sampleScore, thr))
              }
              setOut(out.join('\n'))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">map all severities</button>
            <button onClick={() => setOut('thresholds: ' + JSON.stringify(monitor.getConfig().psiThresholds, null, 2))} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">show thresholds</button>
          </div>
        </div>
      )}

      {tab === 'Alerts' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const s = monitor.getSnapshot('price')
              if (!s) { setOut('no price snapshot'); return }
              const r = monitor.detectDrift(s, 'psi')
              const a = monitor.raiseAlert(r)
              setOut(a ? 'raised alert: ' + a.id + ' severity=' + a.severity : 'no alert (no drift)')
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">raise alert (price)</button>
            <button onClick={() => {
              const s = monitor.getSnapshot('age')
              if (!s) { setOut('no age snapshot'); return }
              const r = monitor.detectDrift(s, 'psi')
              if (!r.isDrift) { setOut('no drift on age'); return }
              const a = monitor.raiseAlert(r)
              setOut(a ? 'raised alert: ' + a.id + ' severity=' + a.severity + ' feature=' + a.featureName : 'raise failed')
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">raise alert (age)</button>
            <button onClick={() => setOut('alerts: ' + monitor.listAlerts().map(a => a.id + '[' + a.severity + ']').join(', '))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">list all alerts</button>
            <button onClick={() => {
              const out: string[] = []
              for (const sev of SEVERITIES) {
                out.push(sev + ': ' + monitor.listAlerts({ severity: sev }).length)
              }
              setOut('alerts by severity:\n' + out.join('\n'))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">count by severity</button>
            <button onClick={() => {
              const out: string[] = []
              for (const s of monitor.listSnapshots()) {
                out.push(s.featureName + ': ' + monitor.listAlerts({ featureName: s.featureName }).length)
              }
              setOut('alerts by feature:\n' + out.join('\n'))
            }} className="px-3 py-1.5 bg-violet-700 rounded text-xs">count by feature</button>
          </div>
          <div className="flex gap-2 flex-wrap items-end">
            <input id="drift-ack" value={ack} onChange={e => setAck(e.target.value)} placeholder="alert id" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const id = (document.getElementById('drift-ack') as HTMLInputElement).value
              const ok = monitor.acknowledgeAlert(id, 'demo')
              setOut(ok ? 'acknowledged ' + id : 'alert not found')
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">acknowledge</button>
            <button onClick={() => setOut('unack: ' + monitor.listAlerts({ unacknowledged: true }).length + ' / ack: ' + monitor.listAlerts({ unacknowledged: false }).length)} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">ack stats</button>
          </div>
        </div>
      )}

      {tab === 'Stats' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const stats = monitor.stats()
              setOut('drift rate: ' + (stats.driftRate * 100).toFixed(1) + '%\ntotal alerts: ' + stats.totalAlerts + '\nfeatures: ' + stats.features + '\nby severity: ' + JSON.stringify(stats.bySeverity) + '\nack rate: ' + (stats.acknowledgedRate * 100).toFixed(1) + '%')
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">monitor stats</button>
            <button onClick={() => {
              const r = monitor.detectAllDrift('psi')
              setOut('detectAllDrift results=' + r.length + ' drifted=' + r.filter(x => x.isDrift).length)
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">detect all</button>
            <button onClick={() => {
              const out: string[] = []
              const stats = monitor.stats()
              for (const k of Object.keys(stats.bySeverity)) {
                out.push(k + ': ' + stats.bySeverity[k as Severity])
              }
              setText(out)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">severity breakdown</button>
            <button onClick={() => setText(monitor.getConfig())} className="px-3 py-1.5 bg-amber-700 rounded text-xs">config dump</button>
          </div>
        </div>
      )}

      <pre className={'p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap ' + severityColor(SEVERITIES.find(s => out.includes('severity=' + s)) ?? 'ok')}>{out || '// click a tab to see drift detection operations'}</pre>
    </div>
  )

  function setText(v: unknown) { setOut(typeof v === 'string' ? v : JSON.stringify(v, null, 2)) }
}
