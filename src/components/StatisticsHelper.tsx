import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sigma, TrendingUp, Activity, BarChart3, Hash, Calculator, Shuffle, Sparkles, ChevronRight } from 'lucide-react'
import { cn } from '../lib/utils'

type Stat = { value: number }

function calculate(data: number[]) {
  if (data.length === 0) return null
  const n = data.length
  const sum = data.reduce((a, b) => a + b, 0)
  const mean = sum / n
  const sorted = [...data].sort((a, b) => a - b)
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]
  const min = sorted[0]
  const max = sorted[n - 1]
  const range = max - min
  const variance = data.reduce((s, x) => s + (x - mean) ** 2, 0) / n
  const std = Math.sqrt(variance)
  const skewness = data.reduce((s, x) => s + ((x - mean) / std) ** 3, 0) / n
  const mode = (() => {
    const m = new Map<number, number>()
    data.forEach((d) => m.set(d, (m.get(d) || 0) + 1))
    let best = sorted[0], bestCount = 0
    m.forEach((v, k) => { if (v > bestCount) { bestCount = v; best = k } })
    return best
  })()
  const q1 = sorted[Math.floor(n * 0.25)]
  const q3 = sorted[Math.floor(n * 0.75)]
  const iqr = q3 - q1
  return { n, sum, mean, median, min, max, range, variance, std, skewness, mode, q1, q3, iqr, sorted }
}

const SAMPLES = {
  '考试成绩': [85, 92, 78, 95, 88, 76, 90, 82, 89, 91, 75, 84, 87, 93, 80],
  '温度数据': [18, 22, 25, 28, 30, 32, 35, 33, 29, 26, 24, 21, 19, 23, 27],
  '销售业绩': [1200, 1450, 980, 1680, 1320, 1150, 1750, 1290, 1420, 1380, 1560, 1230],
  '身高 cm': [165, 172, 168, 175, 170, 178, 162, 169, 173, 166, 171, 174, 167],
  '反应时间 ms': [245, 312, 198, 285, 267, 224, 256, 289, 234, 278, 251, 268, 241, 295],
}

export function StatisticsHelper() {
  const [input, setInput] = useState('85, 92, 78, 95, 88, 76, 90, 82, 89, 91, 75, 84, 87, 93, 80')
  const [decimals, setDecimals] = useState(2)

  const data = useMemo(() => input.split(/[,\s\n]+/).map((x) => parseFloat(x)).filter((x) => !isNaN(x)), [input])
  const stats = useMemo(() => calculate(data), [data])

  const useSample = (key: keyof typeof SAMPLES) => setInput(SAMPLES[key].join(', '))
  const randomData = () => {
    const arr: number[] = []
    for (let i = 0; i < 15; i++) arr.push(Math.floor(Math.random() * 50) + 50)
    setInput(arr.join(', '))
  }
  const fmt = (v: number) => v.toFixed(decimals)
  const clear = () => setInput('')

  const max = stats ? Math.max(...data) : 1
  const min = stats ? Math.min(...data) : 0
  const range = max - min || 1

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5" />
          <h2 className="text-lg font-bold">统计助手</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">均值/中位数/标准差 · 直方图 · 数据分布</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{data.length}</p><p className="text-[9px] opacity-80">样本数</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats ? fmt(stats.mean) : '-'}</p><p className="text-[9px] opacity-80">均值</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats ? fmt(stats.median) : '-'}</p><p className="text-[9px] opacity-80">中位数</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats ? fmt(stats.std) : '-'}</p><p className="text-[9px] opacity-80">标准差</p></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">数据 (逗号或空格分隔)</span>
          <div className="flex items-center gap-1">
            <button onClick={randomData} className="text-[10px] text-amber-600 hover:underline flex items-center gap-0.5"><Shuffle className="w-3 h-3" />随机</button>
            <button onClick={clear} className="text-[10px] text-rose-500 hover:underline">清空</button>
          </div>
        </div>
        <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full h-16 p-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 focus:outline-none focus:ring-2 focus:ring-amber-500/40 resize-none font-mono" placeholder="例如: 1, 2, 3, 4, 5" />
        <div className="flex flex-wrap gap-1">
          {Object.entries(SAMPLES).map(([k]) => (
            <button key={k} onClick={() => useSample(k as any)} className="px-2 h-5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 text-[10px]">{k}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-[10px] text-ink-600">
          <span>精度:</span>
          {[0, 1, 2, 3, 4].map((d) => (
            <button key={d} onClick={() => setDecimals(d)} className={cn('px-1.5 h-5 rounded', decimals === d ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{d}</button>
          ))}
        </div>
      </div>

      {stats && (
        <>
          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
            <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-amber-500" />数据分布</div>
            <div className="flex items-end gap-0.5 h-24">
              {data.map((d, i) => {
                const h = ((d - min) / range) * 100
                return (
                  <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${Math.max(5, h)}%` }} className="flex-1 rounded-t bg-gradient-to-t from-amber-500 to-orange-400" />
                )
              })}
            </div>
            <div className="flex justify-between text-[9px] text-ink-500 mt-0.5">
              <span>{min}</span>
              <span>{stats.mean.toFixed(1)}</span>
              <span>{max}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
            <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5 flex items-center gap-1.5"><Sigma className="w-3.5 h-3.5 text-amber-500" />统计指标</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <Cell label="样本数 (n)" v={fmt(stats.n)} />
              <Cell label="总和 (Σ)" v={fmt(stats.sum)} />
              <Cell label="均值 (x̄)" v={fmt(stats.mean)} highlight />
              <Cell label="中位数" v={fmt(stats.median)} highlight />
              <Cell label="众数" v={fmt(stats.mode)} />
              <Cell label="最小值" v={fmt(stats.min)} />
              <Cell label="最大值" v={fmt(stats.max)} />
              <Cell label="极差" v={fmt(stats.range)} />
              <Cell label="Q1" v={fmt(stats.q1)} />
              <Cell label="Q3" v={fmt(stats.q3)} />
              <Cell label="IQR" v={fmt(stats.iqr)} />
              <Cell label="方差 (σ²)" v={fmt(stats.variance)} />
              <Cell label="标准差 (σ)" v={fmt(stats.std)} highlight />
              <Cell label="偏度" v={fmt(stats.skewness)} />
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-2.5 border border-amber-200/40 dark:border-amber-800/40 space-y-1">
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />分析洞察</div>
            <p className="text-[11px] text-ink-700 dark:text-ink-300 leading-relaxed">
              {stats.mean > stats.median ? '📈 均值 > 中位数, 数据可能右偏 (有较大值)' : stats.mean < stats.median ? '📉 均值 < 中位数, 数据可能左偏 (有较小值)' : '⚖️ 均值 ≈ 中位数, 数据较对称'}
              {stats.std / stats.mean < 0.1 ? ', 离散程度低, 数据稳定' : stats.std / stats.mean > 0.3 ? ', 离散程度高, 数据波动大' : ', 离散程度适中'}
              。
              {Math.abs(stats.skewness) > 1 ? ' 偏度较大, 分布不对称。' : ' 偏度较小, 接近正态分布。'}
            </p>
          </div>
        </>
      )}

      {!stats && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <Calculator className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>输入数字开始计算</p>
        </div>
      )}
    </div>
  )
}

function Cell({ label, v, highlight }: { label: string; v: string; highlight?: boolean }) {
  return (
    <div className={cn('p-1.5 rounded-lg', highlight ? 'bg-amber-50/60 dark:bg-amber-900/20' : 'bg-ink-50/60 dark:bg-ink-800/40')}>
      <p className="text-[9px] text-ink-500">{label}</p>
      <p className={cn('font-mono font-bold', highlight ? 'text-amber-600 dark:text-amber-300' : 'text-ink-800 dark:text-ink-200')}>{v}</p>
    </div>
  )
}
