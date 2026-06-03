import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sigma, Calculator, Shuffle, Eye, EyeOff, RotateCcw } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

const PRESETS = [
  { name: 'y = x²', fn: (x: number) => x * x, range: [-5, 5] },
  { name: 'y = sin(x)', fn: (x: number) => Math.sin(x), range: [-Math.PI * 2, Math.PI * 2] },
  { name: 'y = cos(x)', fn: (x: number) => Math.cos(x), range: [-Math.PI * 2, Math.PI * 2] },
  { name: 'y = tan(x)', fn: (x: number) => Math.tan(x), range: [-Math.PI, Math.PI] },
  { name: 'y = x³', fn: (x: number) => x ** 3, range: [-3, 3] },
  { name: 'y = 1/x', fn: (x: number) => 1 / x, range: [-5, 5] },
  { name: 'y = e^x', fn: (x: number) => Math.exp(Math.min(x, 5)), range: [-3, 3] },
  { name: 'y = ln(x)', fn: (x: number) => Math.log(Math.max(x, 0.001)), range: [0.1, 10] },
  { name: 'y = |x|', fn: (x: number) => Math.abs(x), range: [-5, 5] },
]

export function GraphPlotter() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [showGrid, setShowGrid] = useState(true)
  const [showAxis, setShowAxis] = useState(true)
  const [resolution, setResolution] = useState(80)
  const [customFormula, setCustomFormula] = useState('')
  const [customRange, setCustomRange] = useState({ min: -5, max: 5 })

  const active = PRESETS[activeIdx]
  const range = active.range

  const path = useMemo(() => {
    const points: { x: number; y: number }[] = []
    const w = 320
    const h = 200
    const xMin = range[0]
    const xMax = range[1]
    const xSpan = xMax - xMin
    const yMin = -5
    const yMax = 5
    const ySpan = yMax - yMin

    for (let i = 0; i <= resolution; i++) {
      const t = i / resolution
      const x = xMin + t * xSpan
      let y: number
      try {
        y = active.fn(x)
      } catch {
        continue
      }
      if (!isFinite(y) || isNaN(y)) continue
      const px = (t * w)
      const py = h - ((y - yMin) / ySpan) * h
      if (py < -50 || py > h + 50) continue
      points.push({ x: px, y: py })
    }
    return points
  }, [active, range, resolution])

  const pathStr = path.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  const gridLines = []
  if (showGrid) {
    for (let x = range[0]; x <= range[1]; x++) {
      if (x === 0) continue
      const px = ((x - range[0]) / (range[1] - range[0])) * 320
      gridLines.push(<line key={`vx${x}`} x1={px} y1="0" x2={px} y2="200" stroke="currentColor" strokeWidth="0.3" opacity="0.3" />)
    }
    for (let y = -5; y <= 5; y++) {
      if (y === 0) continue
      const py = 200 - ((y + 5) / 10) * 200
      gridLines.push(<line key={`hy${y}`} x1="0" y1={py} x2="320" y2={py} stroke="currentColor" strokeWidth="0.3" opacity="0.3" />)
    }
  }

  const tryCustom = () => {
    if (!customFormula.trim()) { toast('请输入函数', 'error'); return }
    try {
      const fn = new Function('x', `return ${customFormula.replace(/^y\s*=\s*/, '')}`) as (x: number) => number
      const test = fn(0)
      if (typeof test !== 'number') throw new Error('not a number')
      PRESETS.push({ name: '自定义', fn, range: [customRange.min, customRange.max] as any })
      setActiveIdx(PRESETS.length - 1)
      toast('已加载', 'success')
    } catch (e) {
      toast('函数无效, 示例: x*x, Math.sin(x), Math.exp(x)', 'error')
    }
  }

  const features: { [k: string]: string[] } = {
    'y = x²': ['最低点 (0,0)', '对称轴 x=0', '开口向上', '偶函数'],
    'y = sin(x)': ['周期 2π', '值域 [-1, 1]', '奇函数', 'x=0 处 y=0'],
    'y = cos(x)': ['周期 2π', '值域 [-1, 1]', '偶函数', 'x=0 处 y=1'],
    'y = tan(x)': ['周期 π', '渐近线 x=π/2 + kπ', '值域 (-∞,+∞)', '奇函数'],
    'y = x³': ['过原点', '单调递增', '奇函数', '拐点 (0,0)'],
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sigma className="w-5 h-5" />
          <h2 className="text-lg font-bold">函数图像</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">9 预设 · 自定义函数 · 交互绘图</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{PRESETS.length}</p><p className="text-[9px] opacity-80">函数</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{path.length}</p><p className="text-[9px] opacity-80">点</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{resolution}</p><p className="text-[9px] opacity-80">精度</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{active.name}</p><p className="text-[9px] opacity-80">当前</p></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">预设函数</div>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => setActiveIdx(i)} className={cn('h-9 rounded-lg text-xs font-mono font-semibold', activeIdx === i ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600')}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white dark:bg-ink-900 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">图像</span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowGrid(!showGrid)} className={cn('w-6 h-6 rounded flex items-center justify-center text-[10px]', showGrid ? 'bg-indigo-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}><Eye className="w-3 h-3" /></button>
            <button onClick={() => setShowAxis(!showAxis)} className={cn('w-6 h-6 rounded flex items-center justify-center text-[10px]', showAxis ? 'bg-indigo-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}><EyeOff className="w-3 h-3" /></button>
          </div>
        </div>
        <svg viewBox="0 0 320 200" className="w-full h-48 text-ink-700 dark:text-ink-300" preserveAspectRatio="xMidYMid meet">
          {showGrid && gridLines}
          {showAxis && (
            <>
              <line x1="0" y1="100" x2="320" y2="100" stroke="currentColor" strokeWidth="0.5" />
              <line x1="160" y1="0" x2="160" y2="200" stroke="currentColor" strokeWidth="0.5" />
              <text x="315" y="98" fontSize="8" fill="currentColor">x</text>
              <text x="162" y="8" fontSize="8" fill="currentColor">y</text>
              <circle cx="160" cy="100" r="1.5" fill="currentColor" />
            </>
          )}
          {pathStr && <path d={pathStr} fill="none" stroke="url(#gradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">精度: {resolution} 点</span>
          <input type="range" min="20" max="200" value={resolution} onChange={(e) => setResolution(Number(e.target.value))} className="w-24 accent-indigo-500" />
        </div>
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mt-1">自定义函数 (JavaScript)</div>
        <div className="flex gap-1">
          <input value={customFormula} onChange={(e) => setCustomFormula(e.target.value)} placeholder="如: x*x*x - 2*x + 1" className="flex-1 h-8 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <button onClick={tryCustom} className="h-8 px-3 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-semibold">绘制</button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <input type="number" value={customRange.min} onChange={(e) => setCustomRange({ ...customRange, min: Number(e.target.value) })} placeholder="x 最小" className="h-8 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <input type="number" value={customRange.max} onChange={(e) => setCustomRange({ ...customRange, max: Number(e.target.value) })} placeholder="x 最大" className="h-8 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
        </div>
      </div>

      {features[active.name] && (
        <div className="rounded-2xl bg-indigo-50/40 dark:bg-indigo-900/10 border border-indigo-200/40 p-2.5">
          <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1">📚 {active.name} 的特征</div>
          <ul className="space-y-0.5">
            {features[active.name].map((f, i) => (
              <li key={i} className="text-[11px] text-ink-700 dark:text-ink-300 flex items-start gap-1">
                <span className="text-indigo-500">•</span>{f}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
