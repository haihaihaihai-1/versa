import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Calculator, Sigma, Search, Copy, Star, Bookmark, ChevronDown, BookOpen, Hash, TrendingUp, Grid3x3, Activity, Eye } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Formula {
  id: string
  name: string
  category: 'algebra' | 'geometry' | 'calculus' | 'trig' | 'stats' | 'probability' | 'matrix' | 'number' | 'other'
  formula: string
  description: string
  variables: { name: string; desc: string }[]
  example: string
  bookmarked: boolean
}

const STORAGE_KEY = 'versa:formulas-v1'

function load(): Formula[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Formula[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Formula[] {
  return [
    { id: '1', name: '二次方程求根', category: 'algebra', formula: 'x = (-b ± √(b² - 4ac)) / 2a', description: '求解 ax² + bx + c = 0 形式的二次方程', variables: [{ name: 'a', desc: '二次项系数' }, { name: 'b', desc: '一次项系数' }, { name: 'c', desc: '常数项' }], example: 'x² - 5x + 6 = 0 → x = 2 或 x = 3', bookmarked: true },
    { id: '2', name: '勾股定理', category: 'geometry', formula: 'a² + b² = c²', description: '直角三角形中, 斜边长的平方等于两直角边平方之和', variables: [{ name: 'a, b', desc: '两直角边' }, { name: 'c', desc: '斜边' }], example: '3, 4, 5: 3² + 4² = 5²', bookmarked: true },
    { id: '3', name: '圆的面积', category: 'geometry', formula: 'S = πr²', description: '圆的面积等于 π 乘以半径的平方', variables: [{ name: 'r', desc: '半径' }], example: 'r = 5: S = 25π ≈ 78.54', bookmarked: false },
    { id: '4', name: '球的体积', category: 'geometry', formula: 'V = (4/3)πr³', description: '球体的体积公式', variables: [{ name: 'r', desc: '球半径' }], example: 'r = 3: V = 36π ≈ 113.1', bookmarked: false },
    { id: '5', name: '导数 (幂函数)', category: 'calculus', formula: "d(xⁿ)/dx = nxⁿ⁻¹", description: '幂函数的导数等于指数乘以 x 的指数减 1 次方', variables: [{ name: 'n', desc: '指数' }], example: "d(x³)/dx = 3x²", bookmarked: true },
    { id: '6', name: '积分 (幂函数)', category: 'calculus', formula: '∫xⁿdx = xⁿ⁺¹/(n+1) + C', description: '幂函数的不定积分', variables: [{ name: 'n', desc: '指数 (n ≠ -1)' }], example: '∫x²dx = x³/3 + C', bookmarked: false },
    { id: '7', name: '正弦定理', category: 'trig', formula: 'a/sin A = b/sin B = c/sin C = 2R', description: '三角形中, 边长与对角的正弦值成正比', variables: [{ name: 'a, b, c', desc: '三角形三边' }, { name: 'A, B, C', desc: '对应顶角' }, { name: 'R', desc: '外接圆半径' }], example: 'a=2, A=30° → 2R = 4, R = 2', bookmarked: false },
    { id: '8', name: '余弦定理', category: 'trig', formula: 'c² = a² + b² - 2ab·cos C', description: '三角形中任一边长的平方等于其他两边平方和减去两倍两边与他们夹角余弦的积', variables: [{ name: 'a, b', desc: '两邻边' }, { name: 'c', desc: '对边' }, { name: 'C', desc: 'c 对应的角' }], example: 'a=3, b=4, C=60° → c² = 25 - 12 = 13, c ≈ 3.6', bookmarked: true },
    { id: '9', name: '均值 (算术)', category: 'stats', formula: 'x̄ = (x₁ + x₂ + ... + xₙ) / n', description: 'n 个数值的算术平均', variables: [{ name: 'xᵢ', desc: '第 i 个数值' }, { name: 'n', desc: '样本数' }], example: '1, 2, 3, 4, 5 → x̄ = 3', bookmarked: false },
    { id: '10', name: '标准差', category: 'stats', formula: 'σ = √(Σ(xᵢ - x̄)² / n)', description: '衡量数据离散程度的指标', variables: [{ name: 'xᵢ', desc: '第 i 个数据' }, { name: 'x̄', desc: '均值' }, { name: 'n', desc: '样本数' }], example: '2, 4, 4, 4, 5, 5, 7, 9 → σ = 2', bookmarked: true },
    { id: '11', name: '二项式定理', category: 'algebra', formula: '(a + b)ⁿ = Σ C(n,k)·aⁿ⁻ᵏ·bᵏ', description: '二项式的 n 次方展开', variables: [{ name: 'n', desc: '幂次' }, { name: 'k', desc: '项数' }], example: '(a+b)² = a² + 2ab + b²', bookmarked: false },
    { id: '12', name: '贝叶斯定理', category: 'probability', formula: 'P(A|B) = P(B|A)·P(A) / P(B)', description: '在 B 发生的条件下 A 发生的概率', variables: [{ name: 'P(A)', desc: 'A 的先验概率' }, { name: 'P(B|A)', desc: 'A 发生时 B 的概率' }], example: '医学检测, 垃圾邮件分类等', bookmarked: true },
    { id: '13', name: '欧拉公式', category: 'other', formula: 'e^(iπ) + 1 = 0', description: '被誉为数学上最美的公式, 联结 5 个基本常数', variables: [], example: 'e^(iπ) = -1', bookmarked: true },
    { id: '14', name: '矩阵乘法', category: 'matrix', formula: 'C(i,j) = Σ A(i,k)·B(k,j)', description: '矩阵 A (m×n) 与 B (n×p) 相乘得 C (m×p)', variables: [{ name: 'i, j, k', desc: '下标' }], example: '2x2 矩阵: 5 次乘 + 4 次加', bookmarked: false },
  ]
}

const CAT_META = {
  algebra: { label: '代数', icon: Sigma, color: 'from-blue-500 to-cyan-500' },
  geometry: { label: '几何', icon: Grid3x3, color: 'from-emerald-500 to-teal-500' },
  calculus: { label: '微积分', icon: TrendingUp, color: 'from-violet-500 to-purple-500' },
  trig: { label: '三角', icon: Activity, color: 'from-rose-500 to-pink-500' },
  stats: { label: '统计', icon: BarChart, color: 'from-amber-500 to-orange-500' },
  probability: { label: '概率', icon: Hash, color: 'from-cyan-500 to-blue-500' },
  matrix: { label: '矩阵', icon: Grid3x3, color: 'from-pink-500 to-fuchsia-500' },
  number: { label: '数论', icon: Hash, color: 'from-yellow-500 to-amber-500' },
  other: { label: '其他', icon: BookOpen, color: 'from-zinc-500 to-zinc-600' },
} as const

function BarChart(props: { className?: string }) { return <TrendingUp className={props.className || 'w-3 h-3'} /> }

export function FormulaLibrary() {
  const [list, setList] = useState<Formula[]>(load())
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<keyof typeof CAT_META | 'all' | 'book'>('all')
  const [activeId, setActiveId] = useState<string | null>(list[0]?.id || null)

  useEffect(() => { save(list) }, [list])
  const active = list.find((f) => f.id === activeId) || null

  const filtered = useMemo(() => {
    return list.filter((f) => {
      if (filterCat === 'book' && !f.bookmarked) return false
      if (filterCat !== 'all' && filterCat !== 'book' && f.category !== filterCat) return false
      if (search) {
        const s = search.toLowerCase()
        if (!f.name.toLowerCase().includes(s) && !f.formula.toLowerCase().includes(s) && !f.description.toLowerCase().includes(s)) return false
      }
      return true
    })
  }, [list, search, filterCat])

  const toggleBook = (id: string) => setList(list.map((f) => f.id === id ? { ...f, bookmarked: !f.bookmarked } : f))
  const copy = (val: string) => { navigator.clipboard?.writeText(val); toast('已复制', 'success') }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="w-5 h-5" />
          <h2 className="text-lg font-bold">数学公式</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">9 分类 · 变量说明 · 例题演示</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{list.length}</p><p className="text-[9px] opacity-80">公式</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{list.filter((f) => f.bookmarked).length}</p><p className="text-[9px] opacity-80">收藏</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Object.keys(CAT_META).length}</p><p className="text-[9px] opacity-80">分类</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{filtered.length}</p><p className="text-[9px] opacity-80">筛选</p></div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索公式..." className="w-full h-9 pl-8 pr-3 text-xs bg-white/60 dark:bg-ink-900/40 rounded-lg border border-ink-200/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['all', 'book', ...Object.keys(CAT_META)] as const).map((c) => {
          const meta = c === 'all' || c === 'book' ? null : CAT_META[c as keyof typeof CAT_META]
          const Icon = meta?.icon
          return (
            <button key={c} onClick={() => setFilterCat(c as any)} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap flex items-center gap-1 shrink-0', filterCat === c ? 'bg-blue-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
              {c === 'all' ? '全部' : c === 'book' ? '★' : Icon ? <Icon className="w-3 h-3" /> : null}
              {c === 'all' ? '全部' : c === 'book' ? '收藏' : meta?.label}
            </button>
          )
        })}
      </div>

      {active && (
        <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-3 border border-blue-200/40 dark:border-blue-800/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink-800 dark:text-ink-200">{active.name}</h3>
            <button onClick={() => toggleBook(active.id)} className={cn('w-7 h-7 rounded-full flex items-center justify-center', active.bookmarked ? 'bg-amber-400 text-white' : 'bg-white/60 dark:bg-ink-800 text-ink-400')}>
              <Star className={cn('w-3.5 h-3.5', active.bookmarked && 'fill-current')} />
            </button>
          </div>
          <div className="rounded-xl bg-white/80 dark:bg-ink-900/60 p-3 font-mono text-lg text-center font-bold text-blue-600 dark:text-blue-300 overflow-x-auto">
            {active.formula}
          </div>
          <p className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed">{active.description}</p>
          {active.variables.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-ink-600 dark:text-ink-400 mb-0.5">变量说明</p>
              <div className="space-y-0.5">
                {active.variables.map((v) => (
                  <div key={v.name} className="flex items-baseline gap-1.5 text-[11px]">
                    <code className="font-mono font-bold text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 px-1 rounded text-[10px]">{v.name}</code>
                    <span className="text-ink-700 dark:text-ink-300">{v.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {active.example && (
            <div className="p-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/20 text-[11px] text-emerald-700 dark:text-emerald-300">
              <span className="font-semibold">例: </span>{active.example}
            </div>
          )}
          <button onClick={() => copy(active.formula)} className="w-full h-8 rounded-lg bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
            <Copy className="w-3 h-3" />复制 LaTeX/公式
          </button>
        </div>
      )}

      <div className="space-y-1.5">
        {filtered.map((f) => {
          const meta = CAT_META[f.category]
          return (
            <button key={f.id} onClick={() => setActiveId(f.id)} className={cn('w-full p-2.5 rounded-xl text-left border transition-all', activeId === f.id ? 'border-blue-400 bg-blue-50/40 dark:bg-blue-900/20' : 'border-ink-200/40 dark:border-ink-800/40 bg-white/40 dark:bg-ink-900/30')}>
              <div className="flex items-center gap-1.5 mb-0.5">
                <div className={cn('w-5 h-5 rounded-md flex items-center justify-center bg-gradient-to-br text-white', meta.color)}>
                  <meta.icon className="w-3 h-3" />
                </div>
                <span className="text-[11px] font-bold text-ink-800 dark:text-ink-200 flex-1 truncate">{f.name}</span>
                {f.bookmarked && <Star className="w-3 h-3 text-amber-400 fill-current" />}
              </div>
              <p className="font-mono text-[10px] text-blue-600 dark:text-blue-300 truncate">{f.formula}</p>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 && <p className="text-center text-ink-400 text-xs py-4">无匹配公式</p>}
    </div>
  )
}
