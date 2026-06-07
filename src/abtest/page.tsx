import { useState } from 'react'
import { AbTestingFramework, type TestResult } from './index'

const TABS = ['Setup', 'Experiments', 'Assignment', 'Exposures', 'Analysis', 'Stats'] as const
type Tab = typeof TABS[number]

const buildFramework = (): AbTestingFramework => {
  const ab = new AbTestingFramework({ minSamplePerVariant: 50 })
  ab.createExperiment({
    id: 'homepage_cta',
    name: 'homepage_cta',
    description: 'new CTA color',
    variants: [
      { id: 'control', name: 'Control', weight: 1, isControl: true },
      { id: 'treatment', name: 'Treatment', weight: 1 },
    ],
    metric: 'click',
    tags: ['homepage'],
  })
  ab.createExperiment({
    id: 'checkout_flow',
    name: 'checkout_flow',
    description: 'one-page vs multi-step',
    variants: [
      { id: 'onepage', name: 'One-page', weight: 1, isControl: true },
      { id: 'multistep', name: 'Multi-step', weight: 1 },
    ],
    metric: 'purchase',
    tags: ['checkout'],
  })
  ab.startExperiment('homepage_cta')
  ab.startExperiment('checkout_flow')
  return ab
}

const formatResult = (r: TestResult): string => {
  const lines: string[] = []
  lines.push('experiment: ' + r.experimentId + ' metric=' + r.metric)
  lines.push('sample size reached: ' + r.sampleSizeReached)
  lines.push('variants:')
  for (const v of r.variants) {
    lines.push('  ' + v.variantId + ': exposures=' + v.exposures + ' uniques=' + v.uniques + ' mean=' + v.mean.toFixed(4) + ' std=' + v.std.toFixed(4))
  }
  if (r.zScore !== undefined) {
    lines.push('z-score: ' + r.zScore.toFixed(3))
    lines.push('p-value: ' + (r.pValue ?? 0).toFixed(4))
    lines.push('lift: ' + ((r.lift ?? 0) * 100).toFixed(2) + '%')
    lines.push('significant: ' + r.isSignificant)
    if (r.winner) lines.push('winner: ' + r.winner)
  }
  lines.push('recommendation: ' + r.recommendation)
  return lines.join('\n')
}

export default function AbTestPage() {
  const [tab, setTab] = useState<Tab>('Setup')
  const [ab] = useState(buildFramework)
  const [out, setOut] = useState('')
  const [expId, setExpId] = useState('homepage_cta')
  const [userId, setUserId] = useState('u1')
  const [metric, setMetric] = useState('click')
  const [value, setValue] = useState('1')

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v81.0 A/B Testing Framework</h1>
      <p className="text-sm text-slate-400">实验管理 · 变体配置 · 确定性分流 · 曝光追踪 · 显著性检验（双比例 z-test）</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={'px-3 py-1.5 text-xs rounded-t ' + (tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}>{t}</button>
        ))}
      </div>

      {tab === 'Setup' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('experiments:\n' + ab.listExperiments().map(e => '  ' + e.id + ' ' + e.name + ' [' + e.status + '] metric=' + e.metric + ' variants=' + e.variants.length).join('\n'))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list experiments</button>
            <button onClick={() => {
              try {
                ab.createExperiment({
                  id: 'new_exp_' + Date.now().toString(36).slice(-4),
                  name: 'new experiment',
                  variants: [
                    { id: 'a', name: 'A', weight: 1, isControl: true },
                    { id: 'b', name: 'B', weight: 1 },
                  ],
                  metric: 'conversion',
                })
                setOut('created new experiment')
              } catch (e) { setOut('error: ' + (e as Error).message) }
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">create new</button>
            <button onClick={() => {
              const e = ab.getExperiment('homepage_cta')
              if (!e) return
              ab.pauseExperiment('homepage_cta')
              setOut('paused homepage_cta, status=' + ab.getExperiment('homepage_cta')?.status)
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">pause homepage</button>
            <button onClick={() => {
              ab.startExperiment('homepage_cta')
              setOut('resumed homepage_cta, status=' + ab.getExperiment('homepage_cta')?.status)
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">resume homepage</button>
          </div>
        </div>
      )}

      {tab === 'Experiments' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('homepage_cta variants:\n' + (ab.getExperiment('homepage_cta')?.variants ?? []).map(v => '  ' + v.id + ' ' + v.name + ' weight=' + v.weight + (v.isControl ? ' (control)' : '')).join('\n'))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">homepage variants</button>
            <button onClick={() => setOut('checkout_flow variants:\n' + (ab.getExperiment('checkout_flow')?.variants ?? []).map(v => '  ' + v.id + ' ' + v.name).join('\n'))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">checkout variants</button>
            <button onClick={() => setOut('running: ' + ab.listExperiments({ status: 'running' }).map(e => e.id).join(', ') + '\npaused: ' + ab.listExperiments({ status: 'paused' }).length + '\ncompleted: ' + ab.listExperiments({ status: 'completed' }).length)} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">by status</button>
            <button onClick={() => setOut('homepage tag: ' + ab.listExperiments({ tag: 'homepage' }).map(e => e.id).join(', ') + '\ncheckout tag: ' + ab.listExperiments({ tag: 'checkout' }).map(e => e.id).join(','))} className="px-3 py-1.5 bg-violet-700 rounded text-xs">by tag</button>
          </div>
        </div>
      )}

      {tab === 'Assignment' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">user id<input value={userId} onChange={e => setUserId(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">experiment id<input value={expId} onChange={e => setExpId(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              try {
                const a = ab.assign(userId, expId)
                setOut('assigned: ' + a.userId + ' -> ' + a.variantId + ' (bucket=' + a.bucket.toFixed(4) + ')')
              } catch (e) { setOut('error: ' + (e as Error).message) }
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">assign single</button>
            <button onClick={() => {
              const counts: Record<string, number> = {}
              for (let i = 0; i < 500; i++) {
                const a = ab.assign('user-' + i, expId)
                counts[a.variantId] = (counts[a.variantId] ?? 0) + 1
              }
              setOut('500 assignments:\n' + Object.entries(counts).map(([k, v]) => '  ' + k + ': ' + v + ' (' + (v / 500 * 100).toFixed(1) + '%)').join('\n'))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">assign 500</button>
            <button onClick={() => {
              const a = ab.assign(userId, expId)
              const b = ab.assign(userId, expId)
              setOut('deterministic check:\nfirst:  ' + a.variantId + ' bucket=' + a.bucket.toFixed(4) + '\nsecond: ' + b.variantId + ' bucket=' + b.bucket.toFixed(4) + '\nmatch: ' + (a.variantId === b.variantId))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">deterministic</button>
            <button onClick={() => setOut('total assignments: ' + ab.countAssignments() + '\nfor homepage_cta: ' + ab.listAssignments('homepage_cta').length + '\nfor checkout_flow: ' + ab.listAssignments('checkout_flow').length)} className="px-3 py-1.5 bg-amber-700 rounded text-xs">assignment counts</button>
          </div>
        </div>
      )}

      {tab === 'Exposures' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-slate-400">user<input value={userId} onChange={e => setUserId(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">metric<input value={metric} onChange={e => setMetric(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">value<input value={value} onChange={e => setValue(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              try {
                ab.assign(userId, expId)
                const exp = ab.trackExposure(userId, expId, metric, parseFloat(value))
                setOut('tracked: ' + exp.id + ' ' + exp.userId + ' variant=' + exp.variantId + ' metric=' + exp.metric + ' value=' + exp.value)
              } catch (e) { setOut('error: ' + (e as Error).message) }
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">track single</button>
            <button onClick={() => {
              const exp = ab.getExperiment(expId)
              if (!exp) { setOut('no exp'); return }
              const ass = ab.listAssignments(expId)
              let tracked = 0
              for (const a of ass) {
                const v = a.variantId === 'treatment' || a.variantId === exp.variants[1]?.id ? parseFloat(value) : 0
                try { ab.trackExposure(a.userId, expId, metric, v); tracked += 1 } catch { /* skip */ }
              }
              setOut('tracked ' + tracked + ' exposures for ' + expId)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">bulk track</button>
            <button onClick={() => setOut('total exposures: ' + ab.countExposures() + '\nfor ' + expId + ': ' + ab.listExposures({ experimentId: expId }).length)} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">count</button>
            <button onClick={() => {
              const filtered = ab.listExposures({ experimentId: expId, metric })
              setOut('last 5 exposures for ' + expId + '/' + metric + ':\n' + filtered.slice(-5).map(e => '  ' + e.userId + ' variant=' + e.variantId + ' value=' + e.value).join('\n'))
            }} className="px-3 py-1.5 bg-violet-700 rounded text-xs">recent</button>
          </div>
        </div>
      )}

      {tab === 'Analysis' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              try {
                const r = ab.analyze(expId)
                setOut(formatResult(r))
              } catch (e) { setOut('error: ' + (e as Error).message) }
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">analyze ' + expId</button>
            <button onClick={() => {
              const r1 = ab.analyze('homepage_cta')
              const r2 = ab.analyze('checkout_flow')
              setOut(formatResult(r1) + '\n\n---\n\n' + formatResult(r2))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">analyze both</button>
            <button onClick={() => {
              const r = ab.analyze(expId)
              const winnerLine = r.winner ? 'WINNER: ' + r.winner : 'no winner yet'
              setOut(winnerLine + '\nrecommendation: ' + r.recommendation)
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">just winner</button>
            <button onClick={() => {
              const e = ab.getExperiment(expId)
              if (!e) { setOut('no exp'); return }
              for (const v of e.variants) {
                const stats = ab.variantStats(expId, v.id, e.metric)
                setOut('variant ' + v.id + ' stats: ' + JSON.stringify(stats, null, 2))
                break
              }
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">raw variant stats</button>
          </div>
        </div>
      )}

      {tab === 'Stats' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('total assignments: ' + ab.countAssignments() + '\ntotal exposures: ' + ab.countExposures() + '\nrunning experiments: ' + ab.listExperiments({ status: 'running' }).length + '\nuptime: ' + ab.uptimeMs() + 'ms')} className="px-3 py-1.5 bg-blue-700 rounded text-xs">framework stats</button>
            <button onClick={() => setOut('config:\n' + JSON.stringify(ab.config, null, 2))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">config</button>
            <button onClick={() => {
              const e = ab.getExperiment('homepage_cta')
              if (!e) return
              ab.completeExperiment('homepage_cta')
              setOut('homepage_cta marked complete, status=' + ab.getExperiment('homepage_cta')?.status)
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">complete homepage</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see A/B testing operations'}</pre>
    </div>
  )
}
