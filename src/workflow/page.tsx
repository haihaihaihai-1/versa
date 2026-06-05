/**
 * Versa · Workflow Engine Playground (v28.0)
 * - DAG 工作流 / Handler 注册 / 执行状态 / Saga 补偿 / 调度器 / 指标
 */
import { useEffect, useMemo, useState } from 'react'
import {
  definitions, handlers, engine, eventBus, scheduler,
  persistExecutions, loadExecutions, summarizeWorkflow, nextCronFire,
  type StepDefinition, type StepKind, type WorkflowDefinition,
} from './index'

type Tab = 'definitions' | 'handlers' | 'execute' | 'saga' | 'scheduler' | 'metrics'

export function WorkflowPage() {
  const [tab, setTab] = useState<Tab>('definitions')
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(x => x + 1), 1500); return () => clearInterval(t) }, [])

  useEffect(() => {
    if (definitions.list().length === 0) seedDemo()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/30 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Workflow · v28.0
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            DAG 工作流引擎 · 步骤编排 · Saga 补偿 · 事件总线 · 调度器 · 指标
          </p>
        </header>

        <nav className="mb-6 flex gap-2 border-b border-slate-200 overflow-x-auto">
          {([
            ['definitions', '工作流定义'],
            ['handlers', 'Handler 注册'],
            ['execute', '执行'],
            ['saga', 'Saga 补偿'],
            ['scheduler', '调度器'],
            ['metrics', '指标'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                tab === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr,260px] gap-6">
          <main>
            {tab === 'definitions' && <DefinitionsTab tick={tick} />}
            {tab === 'handlers' && <HandlersTab tick={tick} />}
            {tab === 'execute' && <ExecuteTab tick={tick} />}
            {tab === 'saga' && <SagaTab tick={tick} />}
            {tab === 'scheduler' && <SchedulerTab tick={tick} />}
            {tab === 'metrics' && <MetricsTab tick={tick} />}
          </main>
          <Sidebar tick={tick} />
        </div>
      </div>
    </div>
  )
}

// ============== Definitions Tab ==============

function DefinitionsTab({ tick }: { tick: number }) {
  void tick
  const [name, setName] = useState('my-flow')
  const [version, setVersion] = useState('1.0.0')
  const [stepsJson, setStepsJson] = useState(JSON.stringify([
    { id: 's1', name: '第一步', kind: 'action', config: { handler: 'greet' }, dependsOn: [] },
    { id: 's2', name: '第二步', kind: 'action', config: { handler: 'compute' }, dependsOn: ['s1'] },
  ], null, 2))

  const defs = definitions.list()

  const add = (): void => {
    try {
      const steps: StepDefinition[] = JSON.parse(stepsJson)
      definitions.register({ id: name, name, version, steps })
    } catch (e) {
      alert(`Invalid steps JSON: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const remove = (id: string): void => { definitions.remove(id) }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">注册新工作流</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Field label="工作流 ID / 名称">
            <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="版本">
            <input value={version} onChange={e => setVersion(e.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field label="步骤 (JSON 数组)">
          <textarea
            value={stepsJson}
            onChange={e => setStepsJson(e.target.value)}
            className={`${inputClass} font-mono text-xs h-40`}
          />
        </Field>
        <div className="mt-3">
          <Btn onClick={add} variant="primary">注册工作流</Btn>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">已注册 ({defs.length})</h2>
        {defs.length === 0 && <p className="text-xs text-slate-400">暂无</p>}
        <div className="space-y-2">
          {defs.map(d => (
            <div key={d.id} className="border border-slate-200 rounded-xl p-3 hover:border-teal-300 transition">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="font-mono text-sm text-slate-800">{d.id}</span>
                  <span className="ml-2 text-xs text-slate-500">v{d.version}</span>
                </div>
                <Btn onClick={() => remove(d.id)}>删除</Btn>
              </div>
              <p className="text-xs text-slate-500 mb-2">{d.description ?? d.name}</p>
              <div className="flex flex-wrap gap-1">
                {d.steps.map(s => (
                  <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                    {s.id} · {s.kind}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ============== Handlers Tab ==============

function HandlersTab({ tick }: { tick: number }) {
  void tick
  const [name, setName] = useState('greet')
  const [output, setOutput] = useState('"hello"')
  const [behaviour, setBehaviour] = useState<'ok' | 'fail' | 'flaky'>('ok')

  const all = {
    actions: handlers.listActions(),
    compensate: handlers.listCompensates(),
    condition: handlers.listConditions(),
  }

  const addAction = (): void => {
    let parsed: unknown
    try { parsed = JSON.parse(output) } catch { parsed = output }
    handlers.registerAction(name, () => {
      if (behaviour === 'fail') throw new Error(`${name} failed`)
      if (behaviour === 'flaky') {
        const n = Math.random()
        if (n < 0.5) throw new Error('flaky')
      }
      return parsed
    })
  }

  const addComp = (): void => {
    handlers.registerCompensate(name, () => undefined)
  }

  const addCond = (): void => {
    handlers.registerCondition(name, () => true)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">注册 Handler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Field label="Handler 名称">
            <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="行为">
            <select value={behaviour} onChange={e => setBehaviour(e.target.value as 'ok' | 'fail' | 'flaky')} className={inputClass}>
              <option value="ok">成功 (返回 output)</option>
              <option value="fail">失败 (抛错)</option>
              <option value="flaky">随机失败</option>
            </select>
          </Field>
        </div>
        <Field label="返回 / 输出">
          <input value={output} onChange={e => setOutput(e.target.value)} className={`${inputClass} font-mono`} />
        </Field>
        <div className="flex gap-2 mt-3">
          <Btn onClick={addAction} variant="primary">注册 Action</Btn>
          <Btn onClick={addComp}>注册 Compensate</Btn>
          <Btn onClick={addCond}>注册 Condition</Btn>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">已注册 ({all.actions.length} action / {all.compensate.length} compensate / {all.condition.length} condition)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <h3 className="font-semibold text-slate-600 mb-2">Action</h3>
            {all.actions.map(a => <div key={a} className="font-mono text-teal-700 py-0.5">{a}</div>)}
          </div>
          <div>
            <h3 className="font-semibold text-slate-600 mb-2">Compensate</h3>
            {all.compensate.map(a => <div key={a} className="font-mono text-amber-700 py-0.5">{a}</div>)}
          </div>
          <div>
            <h3 className="font-semibold text-slate-600 mb-2">Condition</h3>
            {all.condition.map(a => <div key={a} className="font-mono text-purple-700 py-0.5">{a}</div>)}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============== Execute Tab ==============

function ExecuteTab({ tick }: { tick: number }) {
  void tick
  const defs = definitions.list()
  const [selected, setSelected] = useState(defs[0]?.id ?? '')
  const [running, setRunning] = useState(false)
  const [lastId, setLastId] = useState<string | null>(null)
  const [eventLog, setEventLog] = useState<string[]>([])

  const current = engine.get(lastId ?? '')

  const run = async (): Promise<void> => {
    if (!selected) return
    setRunning(true)
    setEventLog([])
    const off = eventBus.on('*', (e) => {
      setEventLog(prev => [...prev, `[${new Date(e.ts).toISOString().slice(11, 23)}] ${e.type} ${e.stepId ?? ''} ${e.message ?? ''}`].slice(-30))
    })
    try {
      const r = await engine.execute(selected, { input: 'demo' })
      setLastId(r.id)
    } catch (e) {
      setEventLog(prev => [...prev, `[ERROR] ${e instanceof Error ? e.message : String(e)}`])
    } finally {
      off()
      setRunning(false)
    }
  }

  const cancel = (): void => {
    if (lastId) engine.cancel(lastId)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">执行工作流</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <Field label="工作流">
              <select value={selected} onChange={e => setSelected(e.target.value)} className={inputClass}>
                <option value="">— 选择 —</option>
                {defs.map(d => <option key={d.id} value={d.id}>{d.id} (v{d.version})</option>)}
              </select>
            </Field>
          </div>
          <Btn onClick={run} variant="primary" disabled={running || !selected}>
            {running ? '执行中…' : '▶ 执行'}
          </Btn>
          <Btn onClick={cancel} disabled={!lastId}>取消</Btn>
        </div>
      </div>

      {current && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">执行结果 · {current.id.slice(-8)}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
            <Metric label="状态" value={current.status} color={statusColor(current.status)} />
            <Metric label="耗时" value={`${current.durationMs ?? '—'} ms`} />
            <Metric label="步骤数" value={String(current.steps.length)} />
            <Metric label="事件数" value={String(current.events.length)} />
          </div>
          <h3 className="text-xs font-semibold text-slate-600 mb-2">步骤</h3>
          <div className="space-y-1">
            {current.steps.map(s => (
              <div key={s.stepId} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-700">{s.stepId}</span>
                  <StatusBadge status={s.status} />
                </div>
                <div className="text-slate-500 font-mono">
                  attempts={s.attempts} {s.durationMs !== undefined && `· ${s.durationMs}ms`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {eventLog.length > 0 && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-semibold mb-2 text-slate-300">事件流</h2>
          <div className="font-mono text-[11px] space-y-0.5 max-h-64 overflow-y-auto">
            {eventLog.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}
    </div>
  )
}

// ============== Saga Tab ==============

function SagaTab({ tick }: { tick: number }) {
  void tick
  const [name, setName] = useState('saga-flow')
  const [result, setResult] = useState<string | null>(null)

  const trigger = async (mode: 'success' | 'fail'): Promise<void> => {
    handlers.registerAction('ok', () => 'ok-out')
    handlers.registerAction('boom', () => { throw new Error('intentional') })
    handlers.registerCompensate('undo', (_ctx, _step, originalOutput) => {
      setResult(`补偿执行，originalOutput=${JSON.stringify(originalOutput)}`)
    })
    definitions.register({
      id: name, name, version: '1',
      steps: [
        { id: 'a', name: 'a', kind: 'action', config: { handler: 'ok' }, dependsOn: [], compensate: 'undo' },
        { id: 'b', name: 'b', kind: 'action', config: { handler: mode === 'fail' ? 'boom' : 'ok' }, dependsOn: ['a'], compensate: 'undo' },
      ],
    })
    const r = await engine.execute(name, {})
    if (r.status === 'success') setResult(`成功: ${r.status}`)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Saga 补偿演示</h2>
        <p className="text-xs text-slate-500 mb-3">
          工作流: a (ok) → b (成功/失败). 当 b 失败时，反向补偿已成功的步骤 a。
        </p>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Field label="工作流名">
              <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Btn onClick={() => trigger('success')} variant="primary">成功路径</Btn>
          <Btn onClick={() => trigger('fail')}>失败 → 触发补偿</Btn>
        </div>
      </div>
      {result !== null && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900">
          <strong>Saga 回调：</strong> {result}
        </div>
      )}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">最近执行</h2>
        {engine.list().slice(-3).map(ex => (
          <div key={ex.id} className="border border-slate-100 rounded-lg p-2 mb-2 text-xs">
            <div className="flex justify-between mb-1">
              <span className="font-mono">{ex.id.slice(-8)}</span>
              <StatusBadge status={ex.status} />
            </div>
            <div className="text-slate-500">{ex.error ?? `${ex.steps.length} steps · ${ex.durationMs ?? 0}ms`}</div>
          </div>
        ))}
        {engine.list().length === 0 && <p className="text-xs text-slate-400">尚未执行</p>}
      </div>
    </div>
  )
}

// ============== Scheduler Tab ==============

function SchedulerTab({ tick }: { tick: number }) {
  void tick
  const [name, setName] = useState('nightly')
  const [wfId, setWfId] = useState(definitions.list()[0]?.id ?? '')
  const [type, setType] = useState<'interval' | 'once' | 'cron'>('interval')
  const [expr, setExpr] = useState('2000')
  const [lastFire, setLastFire] = useState<number | null>(null)

  const defs = definitions.list()

  useEffect(() => {
    const off = eventBus.on('workflow-start', () => setLastFire(Date.now()))
    return () => off()
  }, [])

  const add = (): void => {
    let parsedExpr: string | number = expr
    if (type === 'interval' || type === 'once') parsedExpr = Number(expr)
    scheduler.schedule(name, wfId, { type, expr: parsedExpr })
  }

  const next = useMemo(() => {
    if (type === 'cron') return nextCronFire(expr)
    if (type === 'interval') return Date.now() + Number(expr)
    if (type === 'once') return Number(expr)
    return Date.now()
  }, [type, expr])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">调度任务</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <Field label="任务名">
            <input value={name} onChange={e => setName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="工作流">
            <select value={wfId} onChange={e => setWfId(e.target.value)} className={inputClass}>
              {defs.map(d => <option key={d.id} value={d.id}>{d.id}</option>)}
            </select>
          </Field>
          <Field label="类型">
            <select value={type} onChange={e => setType(e.target.value as 'interval' | 'once' | 'cron')} className={inputClass}>
              <option value="interval">interval (ms)</option>
              <option value="once">once (timestamp ms)</option>
              <option value="cron">cron 表达式</option>
            </select>
          </Field>
          <Field label={type === 'cron' ? 'cron 表达式' : '值'}>
            <input
              value={expr}
              onChange={e => setExpr(e.target.value)}
              className={`${inputClass} font-mono`}
              placeholder={type === 'cron' ? '* * * * *' : '1000'}
            />
          </Field>
        </div>
        <div className="text-xs text-slate-500 mb-3">
          下次触发：<span className="font-mono text-slate-700">{new Date(next).toISOString()}</span>
        </div>
        <Btn onClick={add} variant="primary">添加任务</Btn>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">活跃任务 ({scheduler.size()})</h2>
        {lastFire !== null && (
          <p className="text-xs text-teal-700 mb-2">最近触发：{new Date(lastFire).toISOString()}</p>
        )}
        <div className="space-y-1">
          {scheduler.list().map(j => (
            <div key={j.id} className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-slate-50">
              <div>
                <span className="font-mono text-slate-700">{j.name}</span>
                <span className="ml-2 text-slate-500">{j.schedule} · {j.workflowId}</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="text-slate-500">runs={j.runs}</span>
                <button
                  onClick={() => scheduler.enable(j.id, !j.enabled)}
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    j.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {j.enabled ? 'enabled' : 'disabled'}
                </button>
                <Btn onClick={() => scheduler.remove(j.id)}>移除</Btn>
              </div>
            </div>
          ))}
          {scheduler.size() === 0 && <p className="text-xs text-slate-400">暂无</p>}
        </div>
      </div>
    </div>
  )
}

// ============== Metrics Tab ==============

function MetricsTab({ tick }: { tick: number }) {
  void tick
  const s = summarizeWorkflow()
  const m = s.metrics

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="总启动" value={String(m.totalStarted)} />
        <Metric label="总完成" value={String(m.totalCompleted)} />
        <Metric label="总失败" value={String(m.totalFailed)} />
        <Metric label="总补偿" value={String(m.totalCompensated)} />
        <Metric label="总取消" value={String(m.totalCancelled)} />
        <Metric label="平均耗时" value={`${m.avgDurationMs.toFixed(1)} ms`} />
        <Metric label="成功率" value={`${(m.successRate * 100).toFixed(1)}%`} color="text-teal-600" />
        <Metric label="执行中" value={String(engine.size())} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">按工作流</h2>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b">
              <th className="py-1">工作流</th>
              <th>启动</th>
              <th>成功</th>
              <th>失败</th>
              <th>平均耗时</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(m.byWorkflow).map(([wid, wm]) => (
              <tr key={wid} className="border-b border-slate-100">
                <td className="py-1 font-mono text-slate-700">{wid}</td>
                <td>{wm.started}</td>
                <td className="text-green-600">{wm.success}</td>
                <td className="text-red-600">{wm.failed}</td>
                <td className="font-mono">{wm.avgMs.toFixed(1)} ms</td>
              </tr>
            ))}
            {Object.keys(m.byWorkflow).length === 0 && (
              <tr><td colSpan={5} className="text-slate-400 py-2">暂无</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">持久化 (localStorage)</h2>
        <div className="flex gap-2 mb-2">
          <Btn onClick={() => { const n = persistExecutions(engine); alert(`已持久化 ${n} 条`) }}>保存</Btn>
          <Btn onClick={() => { const arr = loadExecutions(); alert(`已加载 ${arr.length} 条`) }}>读取</Btn>
        </div>
        <p className="text-[11px] text-slate-400">key: versa.workflow.v1</p>
      </div>
    </div>
  )
}

// ============== Sidebar ==============

function Sidebar({ tick }: { tick: number }) {
  void tick
  const s = summarizeWorkflow()
  return (
    <aside className="space-y-3 text-xs">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">工作流快照</h3>
        <Row k="已注册工作流" v={String(s.definitions)} />
        <Row k="已注册 handler" v={String(s.handlers)} />
        <Row k="活跃执行" v={String(engine.size())} />
        <Row k="调度任务" v={String(scheduler.size())} />
        <hr className="my-2 border-slate-100" />
        <Row k="总启动" v={String(s.metrics.totalStarted)} />
        <Row k="成功率" v={`${(s.metrics.successRate * 100).toFixed(1)}%`} />
        <Row k="平均耗时" v={`${s.metrics.avgDurationMs.toFixed(0)}ms`} />
      </div>
      <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl border border-teal-100 p-4">
        <h3 className="text-xs font-semibold text-teal-800 mb-1">v28.0 能力</h3>
        <ul className="text-[11px] text-teal-700 space-y-0.5">
          <li>· DAG 拓扑排序 + 依赖检查</li>
          <li>· Step: action / condition / parallel</li>
          <li>· Step: loop / subworkflow / delay</li>
          <li>· Step: emit / listen</li>
          <li>· Saga 失败补偿（反序）</li>
          <li>· per-step 指数退避重试</li>
          <li>· EventBus 节点间通信</li>
          <li>· Scheduler: cron / interval / once</li>
          <li>· 持久化 + 指标聚合</li>
        </ul>
      </div>
    </aside>
  )
}

// ============== Shared UI ==============

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-slate-500">{k}</span>
      <span className="text-slate-800 font-mono font-medium">{v}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-slate-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Btn({ children, onClick, variant, disabled }: { children: React.ReactNode; onClick: () => void; variant?: 'primary'; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition disabled:opacity-50 ${
        variant === 'primary'
          ? 'bg-teal-600 text-white hover:bg-teal-700'
          : 'bg-white border border-slate-200 text-slate-700 hover:border-teal-300'
      }`}
    >
      {children}
    </button>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold font-mono ${color ?? 'text-slate-800'}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    running: 'bg-blue-100 text-blue-700',
    pending: 'bg-slate-100 text-slate-500',
    skipped: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-slate-200 text-slate-600',
    compensated: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${colors[status] ?? 'bg-slate-100 text-slate-500'}`}>
      {status}
    </span>
  )
}

function statusColor(s: string): string {
  return ({
    success: 'text-green-600',
    failed: 'text-red-600',
    compensated: 'text-purple-600',
    cancelled: 'text-slate-500',
    running: 'text-blue-600',
  } as Record<string, string>)[s] ?? 'text-slate-800'
}

const inputClass = 'w-full px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white focus:border-teal-500 focus:ring-1 focus:ring-teal-200 outline-none'

// ============== Seed data ==============

function seedDemo(): void {
  handlers.registerAction('greet', () => ({ msg: 'hello', ts: Date.now() }))
  handlers.registerAction('compute', (ctx) => ({ doubled: (ctx.vars['n'] as number ?? 1) * 2 }))
  handlers.registerAction('fail', () => { throw new Error('demo failure') })
  handlers.registerCompensate('undo', () => undefined)

  definitions.register({
    id: 'demo-simple', name: '简单流', version: '1.0.0',
    description: '两步串联',
    steps: [
      { id: 's1', name: 'greet', kind: 'action', config: { handler: 'greet' }, dependsOn: [] },
      { id: 's2', name: 'compute', kind: 'action', config: { handler: 'compute' }, dependsOn: ['s1'] },
    ],
  })
  definitions.register({
    id: 'demo-fail', name: '失败流', version: '1.0.0',
    description: '演示失败 + 补偿',
    steps: [
      { id: 'a', name: 'greet', kind: 'action', config: { handler: 'greet' }, dependsOn: [], compensate: 'undo' },
      { id: 'b', name: 'fail', kind: 'action', config: { handler: 'fail' }, dependsOn: ['a'] },
    ],
  })
  definitions.register({
    id: 'demo-parallel', name: '并行流', version: '1.0.0',
    description: '并行 + 串行',
    steps: [
      { id: 'a', name: 'greet', kind: 'action', config: { handler: 'greet' }, dependsOn: [] },
      { id: 'b', name: 'compute', kind: 'action', config: { handler: 'compute' }, dependsOn: [] },
      { id: 'c', name: 'merge', kind: 'action', config: { handler: 'greet' }, dependsOn: ['a', 'b'] },
    ],
  })
}
