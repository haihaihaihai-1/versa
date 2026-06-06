import { useState } from 'react'
import { TimeSeriesDB } from './index'
import type { Aggregator } from './index'

const TABS = ['Series', 'Insert', 'Range', 'Downsample', 'Aggregate', 'Continuous', 'Retention', 'List'] as const
type Tab = typeof TABS[number]

const AGGS: Aggregator[] = ['avg', 'sum', 'min', 'max', 'count', 'first', 'last']

export default function TimeSeriesPage() {
  const [tab, setTab] = useState<Tab>('Series')
  const [db] = useState(() => new TimeSeriesDB())
  const [seriesName, setSeriesName] = useState('temperature')
  const [series, setSeries] = useState('temperature')
  const [value, setValue] = useState('25')
  const [from, setFrom] = useState('0')
  const [to, setTo] = useState('100')
  const [interval, setInterval] = useState('1000')
  const [agg, setAgg] = useState<Aggregator>('avg')
  const [out, setOut] = useState('')

  return (
    <div className="p-6 space-y-4 text-slate-100">
      <h1 className="text-2xl font-bold">v62.0 Time Series Database</h1>
      <p className="text-sm text-slate-400">时序数据 · 时间戳排序 · 7 种聚合（avg/sum/min/max/count/first/last）· 降采样 · 连续查询 · 保留策略</p>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 text-xs rounded-t ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>{t}</button>
        ))}
      </div>

      {tab === 'Series' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input value={seriesName} onChange={e => setSeriesName(e.target.value)} placeholder="series name" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => { db.createSeries(seriesName); setOut('created: ' + seriesName) }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">create</button>
            <button onClick={() => { db.dropSeries(seriesName); setOut('dropped: ' + seriesName) }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">drop</button>
            <button onClick={() => setOut('get: ' + JSON.stringify(db.getSeries(seriesName)?.size() ?? null))} className="px-3 py-1.5 bg-slate-700 rounded text-xs">get size</button>
            <button onClick={() => setOut('total series: ' + db.size() + ', total points: ' + db.totalPoints())} className="px-3 py-1.5 bg-slate-700 rounded text-xs">db stats</button>
          </div>
        </div>
      )}

      {tab === 'Insert' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input value={series} onChange={e => setSeries(e.target.value)} placeholder="series" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input value={value} onChange={e => setValue(e.target.value)} placeholder="value" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const s = db.getSeries(series); if (!s) { setOut('series not found'); return }
              s.insert({ timestamp: Date.now(), value: Number(value) })
              setOut('inserted, size: ' + s.size())
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">insert (now)</button>
            <button onClick={() => {
              const s = db.getSeries(series); if (!s) { setOut('series not found'); return }
              const now = Date.now()
              s.insertMany(Array.from({ length: 10 }, (_, i) => ({ timestamp: now - (10 - i) * 60000, value: 20 + Math.random() * 5 })))
              setOut('inserted 10, size: ' + s.size())
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">insert 10 random</button>
            <button onClick={() => {
              const s = db.getSeries(series); if (!s) return setOut('no series')
              const f = s.first(); const l = s.last()
              setOut(`first: ${JSON.stringify(f)}\nlast: ${JSON.stringify(l)}`)
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">first/last</button>
          </div>
        </div>
      )}

      {tab === 'Range' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input value={series} onChange={e => setSeries(e.target.value)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input value={from} onChange={e => setFrom(e.target.value)} placeholder="from" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input value={to} onChange={e => setTo(e.target.value)} placeholder="to" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => {
              const s = db.getSeries(series); if (!s) return setOut('no series')
              const r = s.range(Number(from), Number(to))
              setOut(`range[${from},${to}]: ${r.length} points\n` + r.slice(0, 5).map(p => `${p.timestamp}:${p.value.toFixed(2)}`).join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">range query</button>
            <button onClick={() => {
              const s = db.getSeries(series); if (!s) return setOut('no series')
              setOut(`interpolate @ ${from}: ${s.interpolate(Number(from))}`)
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">interpolate</button>
          </div>
        </div>
      )}

      {tab === 'Downsample' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input value={series} onChange={e => setSeries(e.target.value)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input value={interval} onChange={e => setInterval(e.target.value)} placeholder="interval" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <select value={agg} onChange={e => setAgg(e.target.value as Aggregator)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
              {AGGS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => {
              const s = db.getSeries(series); if (!s) return setOut('no series')
              const ds = s.downsample(Number(interval), agg)
              setOut(`downsample(${interval}, ${agg}): ${ds.length} buckets\n` + ds.slice(0, 10).map(p => `${p.timestamp}:${p.value.toFixed(2)}`).join('\n'))
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">downsample</button>
          </div>
        </div>
      )}

      {tab === 'Aggregate' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input value={series} onChange={e => setSeries(e.target.value)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input value={from} onChange={e => setFrom(e.target.value)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input value={to} onChange={e => setTo(e.target.value)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <select value={agg} onChange={e => setAgg(e.target.value as Aggregator)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
              {AGGS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => {
              const s = db.getSeries(series); if (!s) return setOut('no series')
              setOut(`aggregate(${agg}, [${from},${to}]): ${s.aggregate(Number(from), Number(to), agg)}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">aggregate</button>
          </div>
        </div>
      )}

      {tab === 'Continuous' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input value={series} onChange={e => setSeries(e.target.value)} placeholder="source" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input defaultValue="hourly" id="cq-name" placeholder="rollup name" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <input value={interval} onChange={e => setInterval(e.target.value)} placeholder="interval" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <select value={agg} onChange={e => setAgg(e.target.value as Aggregator)} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs">
              {AGGS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={() => {
              const name = (document.getElementById('cq-name') as HTMLInputElement).value
              const r = db.addContinuousQuery(name, series, Number(interval), agg)
              setOut(`created rollup "${name}", size: ${r.size()}`)
            }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">add CQ</button>
            <button onClick={() => {
              const list = db.continuousQueries.map(cq => `${cq.name} <- ${cq.source} (${cq.agg}/${cq.intervalMs}ms, ${cq.rollup.size()} pts)`)
              setOut(list.join('\n'))
            }} className="px-3 py-1.5 bg-slate-700 rounded text-xs">list CQs</button>
            <button onClick={() => {
              db.continuousQueries.forEach(cq => db.refreshContinuousQuery(cq.name))
              setOut('refreshed all')
            }} className="px-3 py-1.5 bg-cyan-700 rounded text-xs">refresh all</button>
          </div>
        </div>
      )}

      {tab === 'Retention' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap items-end">
            <input value={from} onChange={e => setFrom(e.target.value)} placeholder="maxAgeMs" className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs" />
            <button onClick={() => { db.setRetention({ maxAgeMs: Number(from) }); setOut('set maxAgeMs=' + from) }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">set maxAge</button>
            <button onClick={() => { db.setRetention({ maxPoints: Number(from) }); setOut('set maxPoints=' + from) }} className="px-3 py-1.5 bg-blue-700 rounded text-xs">set maxPoints</button>
            <button onClick={() => setOut('removed: ' + db.applyRetention() + ' points') } className="px-3 py-1.5 bg-amber-700 rounded text-xs">apply</button>
          </div>
        </div>
      )}

      {tab === 'List' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setOut(JSON.stringify(db.listSeries().map(m => ({ name: m.name, tags: m.tags, count: m.count })), null, 2))} className="px-3 py-1.5 bg-blue-700 rounded text-xs">list all</button>
            <button onClick={() => setOut('total: ' + db.totalPoints() + ' points, ' + db.size() + ' series')} className="px-3 py-1.5 bg-slate-700 rounded text-xs">stats</button>
            <button onClick={() => { db.clear(); setOut('cleared') }} className="px-3 py-1.5 bg-rose-700 rounded text-xs">clear all</button>
          </div>
        </div>
      )}

      <pre className="p-3 bg-slate-900 border border-slate-700 rounded text-xs overflow-auto max-h-96 whitespace-pre-wrap">{out}</pre>
    </div>
  )
}
