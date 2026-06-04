/**
 * Versa · 性能监控面板 (v12.0)
 * 实时显示 Core Web Vitals + 包大小预算
 */
import { usePerformance, clearMetrics, type PerfMetric } from '../hooks/usePerformance'
import { PERF_BUDGETS, checkBudget } from '../perf/budget'
import { Trash2, Activity, Gauge, Clock, Zap } from 'lucide-react'
import { cn } from '../lib/utils'

const METRIC_DESC: Record<PerfMetric['name'], { label: string; desc: string; icon: typeof Activity }> = {
  FCP: { label: 'First Contentful Paint', desc: '首次内容绘制', icon: Clock },
  LCP: { label: 'Largest Contentful Paint', desc: '最大内容绘制', icon: Clock },
  CLS: { label: 'Cumulative Layout Shift', desc: '累计布局偏移', icon: Activity },
  INP: { label: 'Interaction to Next Paint', desc: '交互到下一次绘制', icon: Zap },
  TTFB: { label: 'Time to First Byte', desc: '首字节时间', icon: Gauge },
  FID: { label: 'First Input Delay', desc: '首次输入延迟', icon: Clock },
}

function ratingColor(r: PerfMetric['rating']): string {
  return r === 'good' ? 'text-emerald-500' : r === 'needs-improvement' ? 'text-amber-500' : 'text-rose-500'
}

function ratingBg(r: PerfMetric['rating']): string {
  return r === 'good' ? 'bg-emerald-50 dark:bg-emerald-900/20' : r === 'needs-improvement' ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-rose-50 dark:bg-rose-900/20'
}

export function PerformancePage() {
  const { summary, metrics } = usePerformance()

  const budget = checkBudget({
    jsKb: 814, // 来自 dist/assets/index-*.js, 实际值由 Vite 报告
    cssKb: 30,
    fcpMs: summary.FCP?.value,
    lcpMs: summary.LCP?.value,
    clsScore: summary.CLS?.value,
  })

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-6 h-6 text-violet-500" />
          <h1 className="text-2xl font-bold">性能监控</h1>
        </div>
        <p className="text-sm text-ink-500">实时 Core Web Vitals · 性能预算 · 历史指标</p>
      </header>

      {/* 预算卡 */}
      <section className={cn('rounded-2xl p-4 mb-6 border-2', budget.passed ? 'border-emerald-200 bg-emerald-50/30' : 'border-rose-200 bg-rose-50/30')}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">性能预算</h2>
            <p className="text-sm text-ink-500">
              {budget.passed
                ? '✅ 所有指标在预算内'
                : `❌ ${budget.violations.length} 项超预算`}
            </p>
          </div>
          {budget.passed ? (
            <span className="text-3xl">🎯</span>
          ) : (
            <span className="text-3xl">⚠️</span>
          )}
        </div>
        {!budget.passed && (
          <ul className="mt-3 space-y-1 text-sm">
            {budget.violations.map((v, i) => (
              <li key={i} className="text-rose-600">• {v}</li>
            ))}
          </ul>
        )}
      </section>

      {/* CWV 卡片 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {(['FCP', 'LCP', 'CLS', 'INP', 'TTFB', 'FID'] as PerfMetric['name'][]).map((name) => {
          const m = summary[name]
          const meta = METRIC_DESC[name]
          const Icon = meta.icon
          return (
            <div key={name} className={cn('rounded-2xl p-4 border border-ink-200/50 dark:border-ink-800/50', m ? ratingBg(m.rating) : '')}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-ink-500" />
                  <span className="text-xs font-mono font-semibold">{name}</span>
                </div>
                {m && <span className={cn('text-xs font-semibold uppercase', ratingColor(m.rating))}>{m.rating}</span>}
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold">
                  {m ? (
                    name === 'CLS' ? m.value.toFixed(3) : `${m.value.toFixed(0)}ms`
                  ) : (
                    <span className="text-ink-300">—</span>
                  )}
                </div>
                <p className="text-xs text-ink-500 mt-0.5">{meta.label}</p>
                <p className="text-xs text-ink-400">{meta.desc}</p>
              </div>
            </div>
          )
        })}
      </section>

      {/* 预算详情 */}
      <section className="rounded-2xl p-4 mb-6 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
        <h2 className="font-semibold mb-3">性能预算 · 基准</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <Budget label="JS Bundle" value={PERF_BUDGETS.maxJsBundleKb} unit="KB" actual={814} />
          <Budget label="CSS Bundle" value={PERF_BUDGETS.maxCssBundleKb} unit="KB" actual={30} />
          <Budget label="FCP" value={PERF_BUDGETS.maxFcpMs} unit="ms" actual={summary.FCP?.value} />
          <Budget label="LCP" value={PERF_BUDGETS.maxLcpMs} unit="ms" actual={summary.LCP?.value} />
          <Budget label="CLS" value={PERF_BUDGETS.maxClsScore} actual={summary.CLS?.value} fixed={3} />
          <Budget label="INP" value={PERF_BUDGETS.maxInpMs} unit="ms" actual={summary.INP?.value} />
        </div>
      </section>

      {/* 历史 */}
      <section className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">历史指标 ({metrics.length})</h2>
          <button
            onClick={() => { clearMetrics() }}
            className="flex items-center gap-1 text-xs text-ink-500 hover:text-rose-500 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空
          </button>
        </div>
        {metrics.length === 0 ? (
          <p className="text-sm text-ink-500 text-center py-8">暂无历史数据,浏览页面后将自动收集</p>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {metrics.slice().reverse().map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-ink-100 dark:border-ink-800">
                <span className="font-mono text-ink-500">{m.name}</span>
                <span className="font-mono">
                  {m.name === 'CLS' ? m.value.toFixed(3) : `${m.value.toFixed(0)}ms`}
                </span>
                <span className={cn('text-[10px] uppercase font-semibold', ratingColor(m.rating))}>{m.rating}</span>
                <span className="text-ink-400">{new Date(m.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Budget({ label, value, unit = '', actual, fixed = 0 }: { label: string; value: number; unit?: string; actual?: number; fixed?: number }) {
  const ratio = actual !== undefined ? actual / value : 0
  const status = ratio <= 0.8 ? 'good' : ratio <= 1 ? 'needs-improvement' : 'poor'
  const color = status === 'good' ? 'text-emerald-500' : status === 'needs-improvement' ? 'text-amber-500' : 'text-rose-500'
  return (
    <div className="space-y-0.5">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-sm font-semibold">{actual !== undefined ? actual.toFixed(fixed) : '—'}</span>
        <span className="text-xs text-ink-400">/ {value}{unit}</span>
      </div>
      <div className={cn('text-[10px] font-semibold uppercase', color)}>
        {status === 'good' ? '✅ GOOD' : status === 'needs-improvement' ? '⚠ WARN' : '❌ POOR'}
      </div>
    </div>
  )
}
