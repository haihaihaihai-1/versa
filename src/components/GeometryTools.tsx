import { useState } from 'react'
import { motion } from 'framer-motion'
import { Triangle, Square, Circle, Box, Calculator, Copy, Info, Star } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

type Shape = 'triangle' | 'rectangle' | 'square' | 'circle' | 'ellipse' | 'trapezoid' | 'parallelogram' | 'rhombus' | 'sphere' | 'cube' | 'cylinder' | 'cone' | 'pyramid' | 'torus'

interface CalcShape {
  id: Shape
  name: string
  emoji: string
  category: '2d' | '3d'
  desc: string
  fields: { key: string; label: string; placeholder: string }[]
  formulas: (vals: Record<string, number>) => { area?: number; perimeter?: number; volume?: number; surface?: number }
  inputs: string[]
}

const SHAPES: CalcShape[] = [
  {
    id: 'triangle', name: '三角形', emoji: '△', category: '2d', desc: '三边 a, b, c',
    fields: [{ key: 'a', label: '边 a', placeholder: '3' }, { key: 'b', label: '边 b', placeholder: '4' }, { key: 'c', label: '边 c', placeholder: '5' }],
    formulas: (v) => { const s = (v.a + v.b + v.c) / 2; const area = Math.sqrt(Math.max(0, s * (s - v.a) * (s - v.b) * (s - v.c))); return { area, perimeter: v.a + v.b + v.c } },
    inputs: ['a', 'b', 'c'],
  },
  {
    id: 'rectangle', name: '矩形', emoji: '▭', category: '2d', desc: '长 l, 宽 w',
    fields: [{ key: 'l', label: '长 l', placeholder: '5' }, { key: 'w', label: '宽 w', placeholder: '3' }],
    formulas: (v) => ({ area: v.l * v.w, perimeter: 2 * (v.l + v.w) }),
    inputs: ['l', 'w'],
  },
  {
    id: 'square', name: '正方形', emoji: '□', category: '2d', desc: '边长 a',
    fields: [{ key: 'a', label: '边长 a', placeholder: '4' }],
    formulas: (v) => ({ area: v.a * v.a, perimeter: 4 * v.a }),
    inputs: ['a'],
  },
  {
    id: 'circle', name: '圆形', emoji: '○', category: '2d', desc: '半径 r',
    fields: [{ key: 'r', label: '半径 r', placeholder: '5' }],
    formulas: (v) => ({ area: Math.PI * v.r * v.r, perimeter: 2 * Math.PI * v.r }),
    inputs: ['r'],
  },
  {
    id: 'ellipse', name: '椭圆', emoji: '⬭', category: '2d', desc: '长半轴 a, 短半轴 b',
    fields: [{ key: 'a', label: '长半轴 a', placeholder: '5' }, { key: 'b', label: '短半轴 b', placeholder: '3' }],
    formulas: (v) => ({ area: Math.PI * v.a * v.b, perimeter: Math.PI * (3 * (v.a + v.b) - Math.sqrt((3 * v.a + v.b) * (v.a + 3 * v.b))) }),
    inputs: ['a', 'b'],
  },
  {
    id: 'trapezoid', name: '梯形', emoji: '⏢', category: '2d', desc: '上底 a, 下底 b, 高 h',
    fields: [{ key: 'a', label: '上底 a', placeholder: '3' }, { key: 'b', label: '下底 b', placeholder: '5' }, { key: 'h', label: '高 h', placeholder: '4' }],
    formulas: (v) => ({ area: ((v.a + v.b) / 2) * v.h }),
    inputs: ['a', 'b', 'h'],
  },
  {
    id: 'parallelogram', name: '平行四边形', emoji: '▱', category: '2d', desc: '底 b, 高 h, 斜边 a',
    fields: [{ key: 'b', label: '底 b', placeholder: '5' }, { key: 'h', label: '高 h', placeholder: '3' }, { key: 'a', label: '斜边 a', placeholder: '4' }],
    formulas: (v) => ({ area: v.b * v.h, perimeter: 2 * (v.a + v.b) }),
    inputs: ['b', 'h', 'a'],
  },
  {
    id: 'rhombus', name: '菱形', emoji: '◇', category: '2d', desc: '对角线 d1, d2, 边 a',
    fields: [{ key: 'd1', label: '对角线 d1', placeholder: '6' }, { key: 'd2', label: '对角线 d2', placeholder: '8' }, { key: 'a', label: '边 a', placeholder: '5' }],
    formulas: (v) => ({ area: (v.d1 * v.d2) / 2, perimeter: 4 * v.a }),
    inputs: ['d1', 'd2', 'a'],
  },
  {
    id: 'sphere', name: '球体', emoji: '⚽', category: '3d', desc: '半径 r',
    fields: [{ key: 'r', label: '半径 r', placeholder: '5' }],
    formulas: (v) => ({ volume: (4 / 3) * Math.PI * v.r ** 3, surface: 4 * Math.PI * v.r ** 2 }),
    inputs: ['r'],
  },
  {
    id: 'cube', name: '正方体', emoji: '🟦', category: '3d', desc: '边长 a',
    fields: [{ key: 'a', label: '边长 a', placeholder: '3' }],
    formulas: (v) => ({ volume: v.a ** 3, surface: 6 * v.a ** 2 }),
    inputs: ['a'],
  },
  {
    id: 'cylinder', name: '圆柱', emoji: '🥫', category: '3d', desc: '半径 r, 高 h',
    fields: [{ key: 'r', label: '底半径 r', placeholder: '3' }, { key: 'h', label: '高 h', placeholder: '5' }],
    formulas: (v) => ({ volume: Math.PI * v.r ** 2 * v.h, surface: 2 * Math.PI * v.r * (v.r + v.h) }),
    inputs: ['r', 'h'],
  },
  {
    id: 'cone', name: '圆锥', emoji: '🔺', category: '3d', desc: '底半径 r, 高 h',
    fields: [{ key: 'r', label: '底半径 r', placeholder: '3' }, { key: 'h', label: '高 h', placeholder: '4' }],
    formulas: (v) => ({ volume: (1 / 3) * Math.PI * v.r ** 2 * v.h, surface: Math.PI * v.r * (v.r + Math.sqrt(v.h ** 2 + v.r ** 2)) }),
    inputs: ['r', 'h'],
  },
  {
    id: 'pyramid', name: '四棱锥', emoji: '🔻', category: '3d', desc: '底长 l, 底宽 w, 高 h',
    fields: [{ key: 'l', label: '底长 l', placeholder: '4' }, { key: 'w', label: '底宽 w', placeholder: '3' }, { key: 'h', label: '高 h', placeholder: '5' }],
    formulas: (v) => ({ volume: (v.l * v.w * v.h) / 3 }),
    inputs: ['l', 'w', 'h'],
  },
  {
    id: 'torus', name: '圆环', emoji: '⭕', category: '3d', desc: '大半径 R, 小半径 r',
    fields: [{ key: 'R', label: '大半径 R', placeholder: '5' }, { key: 'r', label: '小半径 r', placeholder: '2' }],
    formulas: (v) => ({ volume: 2 * Math.PI ** 2 * v.R * v.r ** 2, surface: 4 * Math.PI ** 2 * v.R * v.r }),
    inputs: ['R', 'r'],
  },
]

export function GeometryTools() {
  const [active, setActive] = useState<Shape>('triangle')
  const [filter, setFilter] = useState<'2d' | '3d' | 'all'>('all')
  const [vals, setVals] = useState<Record<string, number>>({ a: 3, b: 4, c: 5, l: 5, w: 3, h: 4, d1: 6, d2: 8, r: 5, R: 5 })

  const shape = SHAPES.find((s) => s.id === active)!
  const result = shape.formulas(vals)
  const filtered = SHAPES.filter((s) => filter === 'all' || s.category === filter)

  const copy = () => {
    const lines = Object.entries(result).map(([k, v]) => `${k}: ${v?.toFixed(4)}`)
    navigator.clipboard?.writeText(lines.join('\n'))
    toast('已复制', 'success')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Triangle className="w-5 h-5" />
          <h2 className="text-lg font-bold">几何计算器</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">14 形状 · 2D/3D · 面积/体积/周长</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{SHAPES.filter((s) => s.category === '2d').length}</p><p className="text-[9px] opacity-80">2D 形</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{SHAPES.filter((s) => s.category === '3d').length}</p><p className="text-[9px] opacity-80">3D 体</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Object.values(result).filter((v) => v !== undefined).length}</p><p className="text-[9px] opacity-80">结果</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{shape.emoji}</p><p className="text-[9px] opacity-80">当前</p></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1">
        <button onClick={() => setFilter('all')} className={cn('h-8 rounded-lg text-[10px] font-semibold', filter === 'all' ? 'bg-violet-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600')}>全部</button>
        <button onClick={() => setFilter('2d')} className={cn('h-8 rounded-lg text-[10px] font-semibold', filter === '2d' ? 'bg-violet-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600')}>2D 平面</button>
        <button onClick={() => setFilter('3d')} className={cn('h-8 rounded-lg text-[10px] font-semibold', filter === '3d' ? 'bg-violet-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600')}>3D 立体</button>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {filtered.map((s) => (
          <button key={s.id} onClick={() => setActive(s.id)} className={cn('h-14 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all', active === s.id ? `bg-gradient-to-br ${s.category === '2d' ? 'from-violet-500 to-fuchsia-500' : 'from-purple-500 to-pink-500'} text-white shadow-md scale-105` : 'bg-white/60 dark:bg-ink-900/40 text-ink-600')}>
            <span className="text-xl">{s.emoji}</span>
            <span className="text-[9px] font-semibold">{s.name}</span>
          </button>
        ))}
      </div>

      <div className="aspect-video rounded-2xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 flex items-center justify-center text-7xl">
        {shape.emoji}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-ink-800 dark:text-ink-200">{shape.emoji} {shape.name}</h3>
          <span className="text-[10px] text-ink-500">{shape.desc}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {shape.fields.map((f) => (
            <div key={f.key}>
              <div className="text-[10px] font-semibold text-ink-600 dark:text-ink-400 mb-0.5">{f.label}</div>
              <input type="number" value={vals[f.key] || ''} onChange={(e) => setVals({ ...vals, [f.key]: Number(e.target.value) })} placeholder={f.placeholder} className="w-full h-9 px-2 text-sm font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 p-3 text-white space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold">计算结果</span>
          <button onClick={copy} className="text-[10px] bg-white/20 hover:bg-white/30 px-2 h-5 rounded flex items-center gap-0.5"><Copy className="w-2.5 h-2.5" />复制</button>
        </div>
        {result.area !== undefined && <Result label="面积" v={result.area} unit={shape.category === '2d' ? '单位²' : ''} />}
        {result.perimeter !== undefined && <Result label={shape.category === '2d' ? '周长' : '底面周长'} v={result.perimeter} unit={shape.category === '2d' ? '单位' : ''} />}
        {result.volume !== undefined && <Result label="体积" v={result.volume} unit="单位³" highlight />}
        {result.surface !== undefined && <Result label="表面积" v={result.surface} unit="单位²" highlight />}
      </div>

      <div className="rounded-2xl bg-ink-50 dark:bg-ink-900/40 p-2.5 text-[10px] font-mono text-ink-700 dark:text-ink-300">
        <p className="text-ink-500 mb-0.5">// 公式参考</p>
        {shape.id === 'triangle' && <p>海伦公式: S = √(s(s-a)(s-b)(s-c)), s = (a+b+c)/2</p>}
        {shape.id === 'rectangle' && <p>S = l × w, C = 2(l + w)</p>}
        {shape.id === 'square' && <p>S = a², C = 4a</p>}
        {shape.id === 'circle' && <p>S = πr², C = 2πr</p>}
        {shape.id === 'ellipse' && <p>S = πab, C ≈ π(3(a+b) - √((3a+b)(a+3b)))</p>}
        {shape.id === 'trapezoid' && <p>S = (a+b)h/2</p>}
        {shape.id === 'parallelogram' && <p>S = bh, C = 2(a+b)</p>}
        {shape.id === 'rhombus' && <p>S = d1·d2/2, C = 4a</p>}
        {shape.id === 'sphere' && <p>V = (4/3)πr³, S = 4πr²</p>}
        {shape.id === 'cube' && <p>V = a³, S = 6a²</p>}
        {shape.id === 'cylinder' && <p>V = πr²h, S = 2πr(r+h)</p>}
        {shape.id === 'cone' && <p>V = πr²h/3, S = πr(r+√(h²+r²))</p>}
        {shape.id === 'pyramid' && <p>V = lwh/3</p>}
        {shape.id === 'torus' && <p>V = 2π²Rr², S = 4π²Rr</p>}
      </div>
    </div>
  )
}

function Result({ label, v, unit, highlight }: { label: string; v: number; unit: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between p-1.5 rounded-lg bg-white/15">
      <span className="text-xs">{label}</span>
      <span className={cn('font-mono font-bold', highlight ? 'text-2xl' : 'text-lg')}>{v.toFixed(4).replace(/\.?0+$/, '')} <span className="text-[10px] opacity-80">{unit}</span></span>
    </div>
  )
}
