import { useState } from 'react'
import { FeaturePipelineEngine, resetFeaturePipeline, type PipelineRun } from './index'

const TABS = ['Setup', 'Define', 'Run', 'History', 'Stats'] as const
type Tab = typeof TABS[number]

export default function FeaturePipelinePage() {
  const [tab, setTab] = useState<Tab>('Setup')
  const [engine] = useState<FeaturePipelineEngine>(() => {
    resetFeaturePipeline()
    const e = new FeaturePipelineEngine()
    e.registerHandler('identity', (input: unknown) => input)
    e.registerHandler('addOne', (input: unknown) => (typeof input === 'number' ? input + 1 : 0))
    e.registerHandler('constOne', () => 1)
    e.registerHandler('toString', (input: unknown) => String(input))
    e.registerHandler('fail', () => { throw new Error('handler failure') })
    e.define({
      id: 'demo_user_features',
      name: 'user_features_v1',
      description: 'Demo pipeline: source 1 -> +1 -> string -> sink',
      materialization: 'full',
      tags: ['demo', 'user'],
      schedule: '0 * * * *',
      nodes: [
        { id: 'src', name: 'source_count', type: 'source', config: {}, dependsOn: [], handler: 'constOne' },
        { id: 'inc', name: 'increment', type: 'transform', config: {}, dependsOn: ['src'], handler: 'addOne' },
        { id: 'fmt', name: 'format', type: 'transform', config: {}, dependsOn: ['inc'], handler: 'toString' },
        { id: 'sink', name: 'feature_store_sink', type: 'sink', config: {}, dependsOn: ['fmt'], handler: 'identity' },
      ],
    })
    return e
  })
  const [out, setOut] = useState('')
  const [busy, setBusy] = useState(false)

  const handleRun = async (pipelineId: string) => {
    setBusy(true)
    setOut('running...')
    try {
      const run = await engine.run(pipelineId, { trigger: 'manual' })
      const lines: string[] = []
      lines.push('run id: ' + run.id)
      lines.push('status: ' + run.status)
      lines.push('duration: ' + (run.durationMs ?? 0) + 'ms')
      lines.push('order: ' + run.executionOrder.join(' -> '))
      lines.push('')
      lines.push('node states:')
      for (const id of run.executionOrder) {
        const s = run.nodeStates[id]
        lines.push('  ' + id + ' [' + s.status + '] attempts=' + s.attempts + (s.error ? ' err=' + s.error : ''))
      }
      setOut(lines.join('\n'))
    } catch (err) {
      setOut('error: ' + (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const renderRun = (r: PipelineRun) => {
    return '[' + r.status + '] ' + r.id + ' (' + (r.durationMs ?? 0) + 'ms, ' + r.executionOrder.length + ' nodes)'
  }

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v76.0 Feature Pipeline</h1>
      <p className="text-sm text-slate-400">DAG 编排 · 拓扑排序 · 重试 · 上下游 · 校验 · 运行历史 · 统计</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={'px-3 py-1.5 text-xs rounded-t ' + (tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}>{t}</button>
        ))}
      </div>

      {tab === 'Setup' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('handlers: ' + engine.listHandlers().join(', '))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list handlers</button>
            <button onClick={() => setOut('pipelines: ' + engine.list().map(p => p.id).join(', '))} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">list pipelines</button>
            <button onClick={() => { engine.clear(); setOut('cleared (and re-initialized demo pipeline + handlers in next tab)') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">clear</button>
          </div>
        </div>
      )}

      {tab === 'Define' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const p = engine.list()[0]
              if (!p) { setOut('no pipeline'); return }
              const issues = engine.validate(p)
              setOut(issues.length === 0 ? 'valid' : issues.map(i => '[' + i.severity + '] ' + (i.nodeId ? i.nodeId + ': ' : '') + i.message).join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">validate</button>
            <button onClick={() => {
              const p = engine.list()[0]
              if (!p) { setOut('no pipeline'); return }
              try {
                const order = engine.topologicalOrder(p)
                setOut('topo: ' + order.join(' -> '))
              } catch (e) { setOut('error: ' + (e as Error).message) }
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">topological order</button>
            <button onClick={() => {
              const p = engine.list()[0]
              if (!p) { setOut('no pipeline'); return }
              setOut('downstream of src: ' + engine.downstream(p, 'src').join(', '))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">downstream(src)</button>
            <button onClick={() => {
              const p = engine.list()[0]
              if (!p) { setOut('no pipeline'); return }
              setOut('upstream of sink: ' + engine.upstream(p, 'sink').join(', '))
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">upstream(sink)</button>
          </div>
        </div>
      )}

      {tab === 'Run' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button disabled={busy} onClick={() => handleRun('demo_user_features')} className="px-3 py-1.5 bg-blue-700 rounded text-xs disabled:opacity-50">run demo pipeline</button>
            <button onClick={() => {
              engine.define({
                id: 'bad_pipe_' + Date.now(),
                name: 'bad',
                materialization: 'full',
                tags: [],
                nodes: [
                  { id: 'a', name: 'a', type: 'transform', config: {}, dependsOn: ['ghost'], handler: 'identity' },
                ],
              })
              const last = engine.list()[engine.list().length - 1]
              setOut('created ' + last.id + ' with missing dependency')
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">add broken pipeline</button>
          </div>
        </div>
      )}

      {tab === 'History' && (
        <div className="space-y-3">
          <button onClick={() => {
            const runs = engine.listRuns('demo_user_features', 20)
            if (runs.length === 0) { setOut('(no runs yet)'); return }
            setOut(runs.map(renderRun).join('\n'))
          }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">show last 20 runs</button>
        </div>
      )}

      {tab === 'Stats' && (
        <div className="space-y-3">
          <button onClick={() => setOut(JSON.stringify(engine.stats('demo_user_features'), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">stats for demo pipeline</button>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see feature pipeline operations'}</pre>
    </div>
  )
}
