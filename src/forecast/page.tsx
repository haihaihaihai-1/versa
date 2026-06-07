import { useState } from 'react'
import { TimeSeriesForecaster, type ModelType, type ForecastResult } from './index'

const TABS = ['Setup', 'Models', 'Forecast', 'Decompose', 'Compare', 'Stats'] as const
type Tab = typeof TABS[number]

const MODELS: ModelType[] = ['moving_avg', 'exp_smoothing', 'linear_trend', 'ar', 'naive', 'seasonal_naive']

const buildForecaster = (): TimeSeriesForecaster => {
  const fc = new TimeSeriesForecaster({ defaultHorizon: 7, seasonalPeriod: 7 })
  let s = 7
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const daily = Array.from({ length: 35 }, (_, i) => 100 + 20 * Math.sin(2 * Math.PI * (i % 7) / 7) + (rand() - 0.5) * 5)
  fc.setSeries('daily_traffic', daily)
  const trend = Array.from({ length: 30 }, (_, i) => 50 + 1.5 * i + (rand() - 0.5) * 3)
  fc.setSeries('user_growth', trend)
  fc.setSeries('flat_metric', Array.from({ length: 20 }, () => 42))
  return fc
}

const formatResult = (r: ForecastResult): string => {
  const lines: string[] = []
  lines.push('model: ' + r.model + ' horizon=' + r.horizon)
  if (r.detectedTrend) lines.push('trend: ' + r.detectedTrend)
  if (r.detectedSeasonality) lines.push('seasonality: ' + r.detectedSeasonality)
  lines.push('metrics: MAE=' + r.metrics.mae.toFixed(2) + ' RMSE=' + r.metrics.rmse.toFixed(2) + ' MAPE=' + r.metrics.mape.toFixed(2) + '% R2=' + r.metrics.r2.toFixed(3))
  lines.push('next predictions:')
  for (const p of r.points.slice(0, 5)) {
    lines.push('  step ' + p.step + ': ' + p.value.toFixed(2) + ' [' + p.lower.toFixed(2) + ', ' + p.upper.toFixed(2) + ']')
  }
  return lines.join('\n')
}

export default function ForecastPage() {
  const [tab, setTab] = useState<Tab>('Setup')
  const [fc] = useState(buildForecaster)
  const [out, setOut] = useState('')
  const [series, setSeries] = useState('daily_traffic')
  const [model, setModel] = useState<ModelType>('exp_smoothing')
  const [horizon, setHorizon] = useState('7')
  const [alpha, setAlpha] = useState('0.3')
  const [window, setWindow] = useState('5')

  const run = (): ForecastResult | null => {
    try {
      return fc.forecast(series, {
        model,
        horizon: parseInt(horizon, 10),
        alpha: parseFloat(alpha),
        window: parseInt(window, 10),
        period: 7,
      })
    } catch (e) { setOut('error: ' + (e as Error).message); return null }
  }

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v83.0 Time Series Forecasting</h1>
      <p className="text-sm text-slate-400">时序预测 · 移动平均 · 指数平滑 · 线性趋势 · AR · 季节朴素 · 评估</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={'px-3 py-1.5 text-xs rounded-t ' + (tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}>{t}</button>
        ))}
      </div>

      {tab === 'Setup' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('series: ' + fc.listSeries().join(', '))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list series</button>
            <button onClick={() => {
              const a = fc.getSeries('daily_traffic')
              setOut('daily_traffic (35 pts):\n  range ' + Math.min(...a).toFixed(2) + ' - ' + Math.max(...a).toFixed(2) + '\n  last 5: ' + a.slice(-5).map(v => v.toFixed(1)).join(', '))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">daily_traffic</button>
            <button onClick={() => {
              const a = fc.getSeries('user_growth')
              setOut('user_growth (30 pts):\n  range ' + Math.min(...a).toFixed(2) + ' - ' + Math.max(...a).toFixed(2) + '\n  first 3: ' + a.slice(0, 3).map(v => v.toFixed(1)).join(', ') + '\n  last 3: ' + a.slice(-3).map(v => v.toFixed(1)).join(', '))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">user_growth</button>
            <button onClick={() => {
              const a = fc.getSeries('flat_metric')
              setOut('flat_metric (20 pts): all ' + a[0])
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">flat_metric</button>
          </div>
        </div>
      )}

      {tab === 'Models' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { const r = fc.movingAvg('daily_traffic', 7, 5); setOut(formatResult(r)) }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">moving_avg(5)</button>
            <button onClick={() => { const r = fc.expSmoothing('daily_traffic', 7); setOut(formatResult(r)) }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">exp_smoothing</button>
            <button onClick={() => { const r = fc.linearTrend('user_growth', 7); setOut(formatResult(r)) }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">linear_trend</button>
            <button onClick={() => { const r = fc.ar('user_growth', 7, 2); setOut(formatResult(r)) }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">ar(2)</button>
            <button onClick={() => { const r = fc.naive('flat_metric', 5); setOut(formatResult(r)) }} className="px-3 py-1.5 bg-violet-700 rounded text-xs">naive</button>
            <button onClick={() => { const r = fc.seasonalNaive('daily_traffic', 7, 7); setOut(formatResult(r)) }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">seasonal_naive</button>
          </div>
        </div>
      )}

      {tab === 'Forecast' && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-slate-400">series<input value={series} onChange={e => setSeries(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">model<select value={model} onChange={e => setModel(e.target.value as ModelType)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">{MODELS.map(m => <option key={m} value={m}>{m}</option>)}</select></label>
            <label className="text-xs text-slate-400">horizon<input value={horizon} onChange={e => setHorizon(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">alpha<input value={alpha} onChange={e => setAlpha(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
            <label className="text-xs text-slate-400">window<input value={window} onChange={e => setWindow(e.target.value)} className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" /></label>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { const r = run(); if (r) setOut(formatResult(r)) }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">forecast</button>
            <button onClick={() => {
              const a = parseFloat(alpha)
              const r = fc.expSmoothing(series, parseInt(horizon, 10), a)
              setOut('alpha=' + a + ' forecast:\n' + formatResult(r))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">sweep alpha</button>
            <button onClick={() => {
              const r = fc.linearTrend(series, parseInt(horizon, 10))
              setOut('linear trend:\n' + formatResult(r))
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">force linear</button>
          </div>
        </div>
      )}

      {tab === 'Decompose' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const d = fc.decompose('daily_traffic', 7)
              if (!d) { setOut('cannot decompose'); return }
              setOut('daily_traffic decomposition:\nseasonality: ' + d.seasonality + '\nperiod: ' + d.period + '\ntrend (first 10): ' + d.trend.slice(0, 10).map(v => isNaN(v) ? 'null' : v.toFixed(2)).join(', ') + '\nseasonal: ' + d.seasonal.map(v => v.toFixed(2)).join(', ') + '\nresidual mean: ' + (d.residual.reduce((s, v) => s + v, 0) / d.residual.length).toFixed(2))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">decompose daily</button>
            <button onClick={() => {
              const d = fc.decompose('user_growth', 7)
              if (!d) { setOut('cannot decompose'); return }
              setOut('user_growth decomp:\ntrend slope: ' + ((d.trend[d.trend.length - 1] ?? 0) - (d.trend[0] ?? 0)).toFixed(2) + '\nseasonal amplitude: ' + Math.max(...d.seasonal.map(Math.abs)).toFixed(2))
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">decompose growth</button>
          </div>
        </div>
      )}

      {tab === 'Compare' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              const c = fc.compareModels(series, 5)
              setOut('model comparison on ' + series + ':\n' + Object.entries(c).map(([k, v]) => '  ' + k + ': MAE=' + v.mae.toFixed(2) + ' RMSE=' + v.rmse.toFixed(2) + ' R2=' + v.r2.toFixed(3)).join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">compare all models</button>
            <button onClick={() => {
              const c = fc.compareModels('user_growth', 5)
              const best = Object.entries(c).reduce((a, b) => a[1].rmse < b[1].rmse ? a : b)
              setOut('best for user_growth: ' + best[0] + ' (RMSE=' + best[1].rmse.toFixed(2) + ')')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">best for user_growth</button>
            <button onClick={() => {
              const c = fc.compareModels('daily_traffic', 5)
              const best = Object.entries(c).reduce((a, b) => a[1].rmse < b[1].rmse ? a : b)
              setOut('best for daily_traffic: ' + best[0] + ' (RMSE=' + best[1].rmse.toFixed(2) + ')')
            }} className="px-3 py-1.5 bg-emerald-700 rounded text-xs">best for daily_traffic</button>
          </div>
        </div>
      )}

      {tab === 'Stats' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut('config:\n' + JSON.stringify(fc.config, null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">config</button>
            <button onClick={() => setOut('uptime: ' + fc.uptimeMs() + 'ms') } className="px-3 py-1.5 bg-cyan-700 rounded text-xs">uptime</button>
            <button onClick={() => {
              const r = fc.forecast(series, { model, horizon: parseInt(horizon, 10), alpha: parseFloat(alpha), window: parseInt(window, 10), period: 7 })
              setOut('residuals (first 10):\n' + r.residuals.slice(0, 10).map(v => v.toFixed(2)).join(', ') + '\nresiduals mean: ' + (r.residuals.reduce((s, v) => s + v, 0) / r.residuals.length).toFixed(2))
            }} className="px-3 py-1.5 bg-amber-700 rounded text-xs">residuals</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out || '// click a tab to see time series forecasting'}</pre>
    </div>
  )
}
