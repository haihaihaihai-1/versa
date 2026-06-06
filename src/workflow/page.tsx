import { useState } from 'react'
import { WorkflowEngine, workflow, getEngine, resetEngine } from './index'

const TABS = ['Build', 'Sequential', 'Parallel', 'Retries', 'Compensate', 'Signals', 'Metrics'] as const
type Tab = typeof TABS[number]

export default function WorkflowPage() {
  const [tab, setTab] = useState<Tab>('Build')
  const [eng] = useState(() => {
    resetEngine()
    const e = new WorkflowEngine()
    // Pre-register a sample workflow
    e.register(workflow('sample-etl')
      .step('extract', async () => ({ output: [1, 2, 3] }))
      .step('transform', async ctx => ({ output: (ctx.input as number[] | undefined)?.map(x => x * 2) }))
      .step('load', async () => ({ output: 'loaded' }))
      .build('extract', 'load'))
    return e
  })
  const [out, setOut] = useState('')

  const show = (s: string) => setOut(o => o ? o + '\n' + s : s)

  const runSequential = async () => {
    setOut('--- sequential run ---\n')
    const run = eng.start('sample-etl')
    const r = await eng.execute(run, (id, res) => show(`  ✓ ${id} -> ${JSON.stringify(res.output)}`))
    show(`status: ${r.status}  (${r.endedAt! - r.startedAt}ms)`)
  }

  const runParallel = async () => {
    eng.register(workflow('fanout')
      .parallelStep('task-a', async () => { await new Promise(r => setTimeout(r, 20)); return { output: 'A' } })
      .parallelStep('task-b', async () => { await new Promise(r => setTimeout(r, 20)); return { output: 'B' } })
      .parallelStep('task-c', async () => { await new Promise(r => setTimeout(r, 20)); return { output: 'C' } })
      .step('join', async () => ({ output: 'joined' }))
      .build('task-a', 'join'))
    setOut('--- parallel run ---\n')
    const run = eng.start('fanout')
    const r = await eng.execute(run, (id, res) => show(`  ✓ ${id} -> ${JSON.stringify(res.output)}`))
    show(`status: ${r.status}  (${r.endedAt! - r.startedAt}ms, expect ~20ms not 60ms)`)
  }

  const runRetries = async () => {
    let n = 0
    eng.register(workflow('flaky')
      .step('flaky-step', () => { n++; return n < 3 ? { error: 'try ' + n } : { output: 'ok after ' + n + ' tries' } }, { retries: 3, backoffMs: 5 })
      .build('flaky-step'))
    setOut('--- retries run ---\n')
    const run = eng.start('flaky')
    const r = await eng.execute(run)
    show(`status: ${r.status}, attempts: ${run.stepAttempts.get('flaky-step')}`)
  }

  const runCompensate = async () => {
    let comp = false
    eng.register(workflow('saga')
      .step('debit', async () => ({ output: 'debited' }), { compensate: () => { comp = true; return { output: 'undone' } } })
      .step('credit', async () => ({ error: 'insufficient' }))
      .build('debit', 'credit'))
    setOut('--- saga/compensate run ---\n')
    const run = eng.start('saga')
    const r = await eng.execute(run)
    show(`status: ${r.status}`)
    show(`debit state: ${run.stepStates.get('debit')}  (compensated=${comp})`)
  }

  const runSignals = async () => {
    eng.register(workflow('wait-step')
      .step('wait', async ctx => {
        show('  waiting for approval signal...')
        const v = await eng.waitForSignal(ctx.runId, 'approve', 2000)
        return { output: v }
      })
      .build('wait'))
    setOut('--- signal run ---\n')
    const run = eng.start('wait-step')
    setTimeout(() => { show('  → sending signal approve=true'); eng.signal(run.id, 'approve', true) }, 50)
    const r = await eng.execute(run)
    show(`status: ${r.status}, output: ${JSON.stringify(r.stepResults.get('wait')?.output)}`)
  }

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v63.0 Workflow Engine</h1>
      <p className="text-sm text-slate-400">DAG 编排 · 步骤 / 转移 / 并行 fork/join / 补偿 saga / 重试 / 信号 / 计时器 / 持久化 / 度量</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Build' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('workflows: ' + eng.listWorkflows().join(', '))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list workflows</button>
            <button onClick={() => { eng.clear(); setOut('cleared all runs and timers') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">clear runs</button>
            <button onClick={() => setOut('metrics: ' + JSON.stringify(eng.metrics(), null, 2))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">show metrics</button>
          </div>
        </div>
      )}

      {tab === 'Sequential' && <button onClick={runSequential} className="px-4 py-2 bg-blue-700 rounded text-xs">Run sample ETL (extract → transform → load)</button>}
      {tab === 'Parallel' && <button onClick={runParallel} className="px-4 py-2 bg-blue-700 rounded text-xs">Run fanout (3 parallel tasks → join)</button>}
      {tab === 'Retries' && <button onClick={runRetries} className="px-4 py-2 bg-blue-700 rounded text-xs">Run flaky step with retries=3</button>}
      {tab === 'Compensate' && <button onClick={runCompensate} className="px-4 py-2 bg-blue-700 rounded text-xs">Run saga (debit → credit fails, compensate debit)</button>}
      {tab === 'Signals' && <button onClick={runSignals} className="px-4 py-2 bg-blue-700 rounded text-xs">Run wait step + send signal</button>}

      {tab === 'Metrics' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('metrics: ' + JSON.stringify(eng.metrics(), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">metrics</button>
            <button onClick={() => setOut('snapshot: ' + JSON.stringify(eng.snapshot(), null, 2))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">snapshot runs</button>
            <button onClick={() => setOut(eng.listRuns().map(r => `${r.id} [${r.workflowId}] ${r.status} (${r.stepResults.size} steps done)`).join('\n'))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">list runs</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see workflow operations'}</pre>
    </div>
  )
}
