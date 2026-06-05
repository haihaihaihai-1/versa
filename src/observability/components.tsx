/**
 * Versa · 分析/可观测性 UI (v17.0)
 */
import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, BarChart2, CheckCircle, XCircle, Zap } from 'lucide-react'
import { analytics, perfMonitor, type FunnelResult, type FunnelStep } from './analytics'
import { healthMonitor, runStandardHealthChecks, type HealthCheck } from './health'
import { errorTracker, type ErrorEvent } from './errors'
import { cn } from '../lib/utils'

export function AnalyticsDashboard() {
  const [eventCount, setEventCount] = useState(analytics.countBy('pageview'))
  const [events, setEvents] = useState(analytics.getQueue().slice(-20))
  const [perfMarks, setPerfMarks] = useState(perfMonitor.getMarks().slice(-10))
  const [errors, setErrors] = useState(errorTracker.getQueue())
  const [health, setHealth] = useState<HealthCheck[]>([])

  useEffect(() => {
    const u1 = analytics.subscribe(() => {
      setEventCount(analytics.countBy('pageview'))
      setEvents(analytics.getQueue().slice(-20))
    })
    const u2 = perfMonitor.subscribe((m) => setPerfMarks((p) => [...p.slice(-9), m]))
    const u3 = errorTracker.subscribe(() => setErrors(errorTracker.getQueue().slice()))
    const u4 = healthMonitor.subscribe((c) => setHealth(c))
    runStandardHealthChecks()
    return () => { u1(); u2(); u3(); u4() }
  }, [])

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="w-6 h-6 text-violet-500" /> 观测中心
        </h1>
        <p className="text-sm text-ink-500 mt-1">实时事件、性能、错误、健康</p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Pageviews" value={eventCount} icon={BarChart2} color="text-violet-500" />
        <Stat label="Errors" value={errors.length} icon={AlertTriangle} color="text-rose-500" />
        <Stat label="Perf Marks" value={perfMarks.length} icon={Zap} color="text-amber-500" />
        <Stat label="Health" value={healthMonitor.getOverallState()} icon={CheckCircle} color="text-emerald-500" text />
      </section>

      {/* 健康检查 */}
      <HealthPanel checks={health} />

      {/* 错误 */}
      <ErrorPanel errors={errors} />

      {/* 性能 */}
      <PerfPanel marks={perfMarks} />

      {/* 最近事件 */}
      <EventsPanel events={events} />
    </div>
  )
}

export function FunnelAnalysis({ steps, fromUserId }: { steps: FunnelStep[]; fromUserId?: string }) {
  const [result, setResult] = useState<FunnelResult[]>([])
  useEffect(() => {
    setResult(analytics.funnel(steps, { fromUserId }))
  }, [fromUserId])

  if (result.length === 0) return null

  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
      <h3 className="font-semibold mb-3">漏斗分析</h3>
      <div className="space-y-2">
        {result.map((r, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-sm">
              <span>{i + 1}. {r.step}</span>
              <span className="font-mono text-ink-500">{(r.conversionRate * 100).toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
                style={{ width: `${r.conversionRate * 100}%` }}
              />
            </div>
            <div className="text-xs text-ink-400 mt-0.5">{r.completed} / {r.entered}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, icon: Icon, color, text }: { label: string; value: any; icon: any; color: string; text?: boolean }) {
  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
      <div className="flex items-center gap-2 text-xs text-ink-500">
        <Icon className={cn('w-3.5 h-3.5', color)} />
        {label}
      </div>
      <div className={cn('mt-1 font-bold', text ? 'text-base' : 'text-2xl', color)}>
        {value}
      </div>
    </div>
  )
}

function HealthPanel({ checks }: { checks: HealthCheck[] }) {
  return (
    <section className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-emerald-500" /> 健康检查
      </h2>
      {checks.length === 0 ? (
        <p className="text-sm text-ink-500">暂无数据</p>
      ) : (
        <div className="space-y-2">
          {checks.map((c) => (
            <div key={c.name} className="flex items-center gap-3 text-sm">
              {c.state === 'healthy' ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : c.state === 'degraded' ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-500" />
              )}
              <span className="font-medium">{c.name}</span>
              <span className="text-ink-500 text-xs">{c.message}</span>
              {c.metadata?.latencyMs != null && (
                <span className="ml-auto text-xs text-ink-400">{c.metadata.latencyMs}ms</span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ErrorPanel({ errors }: { errors: readonly ErrorEvent[] }) {
  if (errors.length === 0) return null
  return (
    <section className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-rose-500" /> 错误 ({errors.length})
      </h2>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {errors.slice(-10).reverse().map((e) => (
          <details key={e.id} className="text-xs border border-ink-200/50 dark:border-ink-800/50 rounded-lg">
            <summary className="p-2 cursor-pointer flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full',
                e.severity === 'fatal' ? 'bg-rose-500' :
                e.severity === 'error' ? 'bg-orange-500' : 'bg-amber-500'
              )} />
              <span className="truncate flex-1">{e.message}</span>
              {e.count > 1 && <span className="text-ink-400">×{e.count}</span>}
            </summary>
            <pre className="p-2 text-[10px] text-ink-500 overflow-x-auto border-t border-ink-200/50 dark:border-ink-800/50">
              {e.stack || '(no stack)'}
            </pre>
          </details>
        ))}
      </div>
    </section>
  )
}

function PerfPanel({ marks }: { marks: readonly { name: string; value: number; rating?: string }[] }) {
  if (marks.length === 0) return null
  return (
    <section className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
      <h2 className="font-semibold mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-500" /> 性能标记
      </h2>
      <div className="space-y-1 text-xs">
        {marks.slice(-10).reverse().map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full',
              m.rating === 'good' ? 'bg-emerald-500' :
              m.rating === 'needs-improvement' ? 'bg-amber-500' :
              m.rating === 'poor' ? 'bg-rose-500' : 'bg-ink-300'
            )} />
            <span className="font-mono">{m.name}</span>
            <span className="text-ink-500">{typeof m.value === 'number' ? m.value.toFixed(1) : m.value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function EventsPanel({ events }: { events: readonly { id: string; name: string; ts: number; userId?: string }[] }) {
  if (events.length === 0) return null
  return (
    <section className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
      <h2 className="font-semibold mb-3">最近事件</h2>
      <div className="space-y-1 text-xs max-h-60 overflow-y-auto font-mono">
        {events.slice().reverse().map((e) => (
          <div key={e.id} className="flex items-center gap-2">
            <span className="text-ink-400">{new Date(e.ts).toLocaleTimeString()}</span>
            <span className="text-violet-500">{e.name}</span>
            {e.userId && <span className="text-ink-500">@ {e.userId}</span>}
          </div>
        ))}
      </div>
    </section>
  )
}

export { analytics, perfMonitor, healthMonitor, errorTracker }
export type { ErrorEvent, HealthCheck, FunnelResult, FunnelStep }
