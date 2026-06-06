import { useEffect, useState, useMemo, useCallback } from 'react'
import { TaskScheduler, type ScheduledJob, type JobRun } from './index'

const s = new TaskScheduler()
s.registerHandler('log', (p) => { console.log('[job]', p); return { logged: p, at: Date.now() } })
s.registerHandler('report', () => ({ rows: Math.floor(Math.random() * 1000) }))
s.registerHandler('cleanup', () => ({ cleaned: Math.floor(Math.random() * 100) }))
s.registerHandler('error', () => { throw new Error('synthetic failure') })

export default function SchedulerPage() {
  const [tab, setTab] = useState<'playground' | 'cron' | 'jobs' | 'runs' | 'metrics'>('playground')
  const [, force] = useState(0)
  const refresh = useCallback(() => force(x => x + 1), [])

  useEffect(() => {
    s.start(500)
    return () => s.stop()
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-indigo-400">Task Scheduler</h1>
            <p className="text-slate-400 text-sm mt-1">v51.0 · Cron · Delayed · Recurring · Misfire · Retry · Concurrency</p>
          </div>
          <div className="text-xs text-slate-500">{s.isRunning() ? '● running' : '○ stopped'} · {s.listJobs().length} jobs · {s.totalRuns()} runs</div>
        </div>

        <div className="flex gap-1 mb-4 border-b border-slate-800">
          {(['playground', 'cron', 'jobs', 'runs', 'metrics'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={'px-4 py-2 text-sm font-medium ' + (tab === t ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-slate-400 hover:text-slate-200')}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'playground' && <Playground refresh={refresh} />}
        {tab === 'cron' && <CronView />}
        {tab === 'jobs' && <JobsView refresh={refresh} />}
        {tab === 'runs' && <RunsView refresh={refresh} />}
        {tab === 'metrics' && <MetricsView />}
      </div>
    </div>
  )
}

function Playground({ refresh }: { refresh: () => void }) {
  const [name, setName] = useState('my-job')
  const [handler, setHandler] = useState('log')
  const [mode, setMode] = useState<'delay' | 'cron' | 'runAt' | 'interval'>('delay')
  const [val, setVal] = useState('1000')
  const [payload, setPayload] = useState('{"msg":"hello"}')
  const [misfire, setMisfire] = useState<'skip' | 'run-once' | 'coalesce' | 'parallel'>('skip')
  const [retries, setRetries] = useState('0')
  const [conc, setConc] = useState('1')

  const fire = () => {
    let parsed: unknown
    try { parsed = JSON.parse(payload) } catch { parsed = payload }
    try {
      const j = s.schedule({
        name, handler, payload,
        misfire, maxConcurrent: Number(conc), maxRetries: Number(retries),
        delayMs: mode === 'delay' ? Number(val) : undefined,
        cron: mode === 'cron' ? val : undefined,
        runAt: mode === 'runAt' ? Number(val) : undefined,
        intervalMs: mode === 'interval' ? Number(val) : undefined
      } as Parameters<typeof s.schedule>[0])
      alert(`Scheduled ${j.name} (id=${j.id.slice(0, 8)}), nextRunAt=${new Date(j.nextRunAt).toISOString()}`)
      refresh()
    } catch (e) { alert((e as Error).message) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-2">
        <h3 className="text-indigo-300 font-semibold">Schedule job</h3>
        <Field label="Name" value={name} onChange={setName} />
        <div>
          <label className="text-xs text-slate-400 block mb-1">Handler</label>
          <select value={handler} onChange={e => setHandler(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-emerald-300">
            {s.listHandlers().map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Mode</label>
            <select value={mode} onChange={e => setMode(e.target.value as typeof mode)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm">
              <option value="delay">delayMs</option>
              <option value="cron">cron expr</option>
              <option value="runAt">runAt (ts)</option>
              <option value="interval">intervalMs</option>
            </select>
          </div>
          <Field label="Value" value={val} onChange={setVal} />
        </div>
        <div><label className="text-xs text-slate-400 block mb-1">Payload (JSON)</label><textarea value={payload} onChange={e => setPayload(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono h-16" /></div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Misfire</label>
            <select value={misfire} onChange={e => setMisfire(e.target.value as typeof misfire)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm">
              <option>skip</option><option>run-once</option><option>coalesce</option><option>parallel</option>
            </select>
          </div>
          <Field label="Retries" value={retries} onChange={setRetries} />
          <Field label="Max concurrent" value={conc} onChange={setConc} />
        </div>
        <button onClick={fire} className="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-slate-900 font-semibold rounded">Schedule</button>
      </div>
      <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
        <h3 className="text-indigo-300 font-semibold mb-2">Cron quick reference</h3>
        <pre className="bg-slate-950 border border-slate-800 rounded p-3 text-xs text-slate-300 whitespace-pre-wrap">{`┌──────── minute (0-59)
│  ┌───── hour (0-23)
│  │  ┌── day of month (1-31)
│  │  │  ┌─ month (1-12)
│  │  │  │  ┌─ day of week (0-6, Sun=0)
│  │  │  │  │
*  *  *  *  *   every minute
0  *  *  *  *   every hour
*/15 * * * *   every 15 min
0  9  *  *  *   daily at 09:00
0  9  *  * 1-5  weekdays 09:00
0  0  1  *  *   first of month`}</pre>
        <h3 className="text-indigo-300 font-semibold mb-2 mt-4">Handlers</h3>
        <div className="space-y-1">
          {s.listHandlers().map(h => <div key={h} className="bg-slate-950 border border-slate-800 rounded p-1.5 text-xs font-mono text-emerald-300">{h}</div>)}
        </div>
      </div>
    </div>
  )
}

function CronView() {
  const [expr, setExpr] = useState('*/5 * * * *')
  const parsed = useMemo(() => { try { return s.parseCron(expr) } catch (e) { return null } }, [expr])
  const next = useMemo(() => { try { return new Date(s.nextRunTime(expr, Date.now())).toISOString() } catch { return null } }, [expr])
  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800 space-y-3">
      <h3 className="text-indigo-300 font-semibold">Cron parser</h3>
      <Field label="Expression" value={expr} onChange={setExpr} />
      {parsed && (
        <div className="grid grid-cols-5 gap-2 text-xs">
          {[['minute', parsed.minutes], ['hour', parsed.hours], ['day', parsed.daysOfMonth], ['month', parsed.months], ['dow', parsed.daysOfWeek]].map(([k, v]) => (
            <div key={k as string} className="bg-slate-950 border border-slate-800 rounded p-2">
              <div className="text-slate-500">{k}</div>
              <div className="text-emerald-300 font-mono break-all">{(v as number[]).slice(0, 12).join(',')}{(v as number[]).length > 12 ? '…' : ''}</div>
            </div>
          ))}
        </div>
      )}
      {next && <div className="text-sm text-slate-300">Next run: <span className="text-emerald-300 font-mono">{next}</span></div>}
      {!parsed && <div className="text-red-300 text-sm">Invalid expression</div>}
    </div>
  )
}

function JobsView({ refresh }: { refresh: () => void }) {
  void refresh
  return (
    <div className="space-y-2">
      {s.listJobs().length === 0 ? <div className="text-slate-500 text-sm">No jobs. Schedule one to begin.</div> : s.listJobs().map(j => (
        <div key={j.id} className="bg-slate-900 rounded-lg p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <span className="text-indigo-300 font-mono">{j.name}</span>
              <span className={'text-xs px-1.5 py-0.5 rounded ' + (j.enabled && !j.paused ? 'bg-emerald-900/40 text-emerald-300' : 'bg-slate-800 text-slate-400')}>
                {j.paused ? 'paused' : j.enabled ? 'active' : 'disabled'}
              </span>
              <span className="text-xs text-slate-500">{j.handler}</span>
            </div>
            <div className="flex gap-1">
              {j.paused ? <button onClick={() => { s.resume(j.id); refresh() }} className="text-xs px-2 py-0.5 bg-emerald-700 hover:bg-emerald-600 rounded">resume</button> : <button onClick={() => { s.pause(j.id); refresh() }} className="text-xs px-2 py-0.5 bg-amber-700 hover:bg-amber-600 rounded">pause</button>}
              {j.enabled ? <button onClick={() => { s.disable(j.id); refresh() }} className="text-xs px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded">disable</button> : <button onClick={() => { s.enable(j.id); refresh() }} className="text-xs px-2 py-0.5 bg-cyan-700 hover:bg-cyan-600 rounded">enable</button>}
              <button onClick={() => { s.triggerNow(j.id).then(() => refresh()) }} className="text-xs px-2 py-0.5 bg-indigo-700 hover:bg-indigo-600 rounded">trigger</button>
              <button onClick={() => { s.unschedule(j.id); refresh() }} className="text-xs px-2 py-0.5 bg-red-700 hover:bg-red-600 rounded">×</button>
            </div>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            next: {new Date(j.nextRunAt).toISOString()} · runs: {j.runCount} · fails: {j.failCount} · {j.cron ? 'cron=' + j.cron : j.intervalMs ? 'interval=' + j.intervalMs + 'ms' : j.runAt ? 'runAt' : 'delay=' + j.delayMs + 'ms'}
          </div>
        </div>
      ))}
    </div>
  )
}

function RunsView({ refresh }: { refresh: () => void }) {
  void refresh
  const runs = s.listRuns({ limit: 50 }).reverse()
  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
      <h3 className="text-indigo-300 font-semibold mb-2">Run history (last {runs.length})</h3>
      <div className="bg-slate-950 border border-slate-800 rounded max-h-[28rem] overflow-auto">
        {runs.length === 0 ? <div className="text-slate-500 text-sm p-3">No runs yet.</div> : runs.map(r => (
          <div key={r.id} className="px-3 py-1.5 text-xs font-mono border-b border-slate-800 last:border-0 flex items-center gap-2">
            <span className="text-slate-500">{new Date(r.finishedAt).toISOString().slice(11, 19)}</span>
            <span className={r.ok ? 'text-emerald-300' : 'text-red-300'}>{r.ok ? '✓' : '✗'}</span>
            <span className="text-indigo-300">{r.jobName}</span>
            <span className="text-slate-400">{r.durationMs}ms</span>
            <span className="text-slate-500">attempt {r.attempt}</span>
            {r.error && <span className="text-red-300 truncate flex-1">{r.error}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function MetricsView() {
  const m = s.getMetrics()
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Stat label="Total jobs" value={m.totalJobs} />
      <Stat label="Active" value={m.activeJobs} accent="emerald" />
      <Stat label="Total runs" value={m.totalRuns} />
      <Stat label="OK" value={m.totalOk} accent="emerald" />
      <Stat label="Fail" value={m.totalFail} accent="red" />
      <Stat label="Misfires" value={m.totalMisfires} accent="amber" />
      <Stat label="Retries" value={m.totalRetries} />
      <Stat label="By job" value={Object.keys(m.byJob).length} />
      <div className="col-span-2 lg:col-span-4 bg-slate-900 rounded-lg p-4 border border-slate-800">
        <div className="text-xs text-slate-400 uppercase mb-2">By job</div>
        <div className="space-y-1">
          {Object.entries(m.byJob).map(([n, v]) => (
            <div key={n} className="flex items-center gap-3 text-sm">
              <span className="w-32 text-indigo-300 font-mono">{n}</span>
              <span className="text-slate-400">{v.runs} runs</span>
              <span className="text-emerald-300">{v.ok} ok</span>
              <span className="text-red-300">{v.fail} fail</span>
              <span className="text-amber-300">{v.avgMs.toFixed(1)}ms avg</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: 'amber' | 'emerald' | 'red' }) {
  const color = accent === 'amber' ? 'text-amber-400' : accent === 'emerald' ? 'text-emerald-400' : accent === 'red' ? 'text-red-400' : 'text-slate-200'
  return <div className="bg-slate-900 rounded-lg p-4 border border-slate-800"><div className="text-xs text-slate-500 uppercase">{label}</div><div className={'text-2xl font-bold mt-1 ' + color}>{value}</div></div>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return <div><label className="text-xs text-slate-400 block mb-1">{label}</label><input value={value} onChange={e => onChange(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-sm font-mono text-emerald-300" /></div>
}
