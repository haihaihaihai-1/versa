import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Filter, Plus, Trash2, Sparkles, Loader2, Search, BarChart3, TrendingUp, TrendingDown, Shield, Star, Calendar, Award, AlertCircle } from 'lucide-react'
import { cn, uid, formatNumber } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Fund {
  id: string
  code: string
  name: string
  type: 'stock' | 'bond' | 'mix' | 'index' | 'qdii' | 'money'
  nav: number
  change1y: number
  change3y: number
  change5y: number
  sharpe: number
  rating: 1 | 2 | 3 | 4 | 5
  risk: 'low' | 'med' | 'high'
  aum: number
  manager: string
  watched: boolean
  holding: number
}

const STORAGE_KEY = 'versa:funds-v1'

function load(): Fund[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Fund[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Fund[] {
  return [
    { id: 'f1', code: '161725', name: '招商中证白酒', type: 'stock', nav: 1.245, change1y: -8.50, change3y: -15.20, change5y: 65.30, sharpe: 0.85, rating: 4, risk: 'high', aum: 580, manager: '侯昊', watched: true, holding: 5000 },
    { id: 'f2', code: '005827', name: '易方达蓝筹精选', type: 'stock', nav: 2.156, change1y: 5.20, change3y: -22.50, change5y: 48.20, sharpe: 0.92, rating: 5, risk: 'high', aum: 320, manager: '张坤', watched: true, holding: 3000 },
    { id: 'f3', code: '110011', name: '易方达中小盘', type: 'stock', nav: 3.456, change1y: 8.30, change3y: 12.50, change5y: 75.40, sharpe: 1.05, rating: 5, risk: 'high', aum: 280, manager: '张坤', watched: true, holding: 0 },
    { id: 'f4', code: '000300', name: '沪深 300 ETF', type: 'index', nav: 3.892, change1y: 12.30, change3y: -5.20, change5y: 25.40, sharpe: 0.65, rating: 4, risk: 'med', aum: 1200, manager: '指数', watched: true, holding: 10000 },
    { id: 'f5', code: '511010', name: '国债 ETF', type: 'bond', nav: 105.20, change1y: 4.20, change3y: 12.50, change5y: 22.10, sharpe: 1.50, rating: 4, risk: 'low', aum: 250, manager: '王健', watched: false, holding: 100 },
    { id: 'f6', code: '001102', name: '中欧医疗健康', type: 'stock', nav: 1.832, change1y: -15.20, change3y: -35.20, change5y: 15.30, sharpe: 0.45, rating: 3, risk: 'high', aum: 420, manager: '葛兰', watched: false, holding: 0 },
    { id: 'f7', code: '000198', name: '余额宝', type: 'money', nav: 1.000, change1y: 1.85, change3y: 6.20, change5y: 12.50, sharpe: 2.50, rating: 4, risk: 'low', aum: 8500, manager: '天弘', watched: true, holding: 80000 },
  ]
}

const TYPE_META = {
  stock: { label: '股票', color: 'from-rose-500 to-pink-500' },
  bond: { label: '债券', color: 'from-blue-500 to-cyan-500' },
  mix: { label: '混合', color: 'from-violet-500 to-purple-500' },
  index: { label: '指数', color: 'from-emerald-500 to-teal-500' },
  qdii: { label: 'QDII', color: 'from-amber-500 to-orange-500' },
  money: { label: '货币', color: 'from-cyan-500 to-teal-500' },
} as const

const RISK_META = { low: { label: '低', color: 'bg-emerald-500' }, med: { label: '中', color: 'bg-amber-500' }, high: { label: '高', color: 'bg-rose-500' } } as const

export function FundScreener() {
  const [funds, setFunds] = useState<Fund[]>(load())
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | Fund['type']>('all')
  const [riskFilter, setRiskFilter] = useState<'all' | Fund['risk']>('all')
  const [sort, setSort] = useState<'1y' | 'sharpe' | 'rating'>('1y')
  const [editing, setEditing] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(funds) }, [funds])

  const totalValue = funds.reduce((s, f) => s + f.nav * f.holding, 0)
  const totalReturn = funds.reduce((s, f) => {
    const cost = f.nav / (1 + f.change1y / 100)
    return s + (f.nav - cost) * f.holding
  }, 0)

  const filtered = funds.filter((f) => {
    if (search && !f.code.includes(search) && !f.name.includes(search)) return false
    if (typeFilter !== 'all' && f.type !== typeFilter) return false
    if (riskFilter !== 'all' && f.risk !== riskFilter) return false
    return true
  }).sort((a, b) => {
    if (sort === '1y') return b.change1y - a.change1y
    if (sort === 'sharpe') return b.sharpe - a.sharpe
    return b.rating - a.rating
  })

  const toggleWatch = (id: string) => setFunds(funds.map((f) => f.id === id ? { ...f, watched: !f.watched } : f))

  const saveHolding = (id: string) => {
    const v = +editAmount
    if (isNaN(v) || v < 0) { toast('无效', 'error'); return }
    setFunds(funds.map((f) => f.id === id ? { ...f, holding: v } : f))
    setEditing(null); setEditAmount('')
    toast('已更新', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const topFunds = filtered.slice(0, 3).map((f) => `${f.name} (${f.change1y}%)`).join('; ')
      const result = await aiComplete(`当前热门基金: ${topFunds}. 给出 1 段 60 字内选基建议 (风险/经理), 中文`, '你是 Versa 基金顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5" />
          <h2 className="text-lg font-bold">基金筛选</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">多维筛选 · 业绩排行 · 夏普比率</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatNumber(totalValue)}</p>
            <p className="text-[9px] opacity-80">持仓</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className={cn('text-base font-bold', totalReturn >= 0 ? 'text-emerald-100' : 'text-rose-100')}>
              {totalReturn >= 0 ? '+' : ''}{formatNumber(totalReturn)}
            </p>
            <p className="text-[9px] opacity-80">1y 收益</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{funds.filter((f) => f.holding > 0).length}</p>
            <p className="text-[9px] opacity-80">持有</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{funds.filter((f) => f.watched).length}</p>
            <p className="text-[9px] opacity-80">关注</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={runAI} disabled={loading} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 选基
        </button>
        <button onClick={() => setSort(sort === '1y' ? 'sharpe' : sort === 'sharpe' ? 'rating' : '1y')} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">
          {sort === '1y' ? '↓ 1y' : sort === 'sharpe' ? '↓ 夏普' : '↓ 评级'}
        </button>
      </div>

      {aiTip && (
        <div className="bg-cyan-50/40 dark:bg-cyan-900/20 rounded-xl p-2 border border-cyan-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索代码/名称..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setTypeFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', typeFilter === 'all' ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => (
          <button key={k} onClick={() => setTypeFilter(k as any)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', typeFilter === k ? `bg-gradient-to-r ${TYPE_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {TYPE_META[k].label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'low', 'med', 'high'] as const).map((r) => (
          <button key={r} onClick={() => setRiskFilter(r as any)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', riskFilter === r ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {r === 'all' ? '全部风险' : r === 'low' ? '🟢 低' : r === 'med' ? '🟡 中' : '🔴 高'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.map((f) => {
          const TM = TYPE_META[f.type]
          const RM = RISK_META[f.risk]
          const oneYearReturn = f.holding > 0 ? f.nav * f.holding - f.nav * f.holding / (1 + f.change1y / 100) : 0
          return (
            <motion.div key={f.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center gap-2">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', TM.color)}>
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold truncate">{f.name}</p>
                    <span className={cn('w-1.5 h-1.5 rounded-full', RM.color)} />
                    <span className="text-[9px] text-ink-500">{RM.label}风险</span>
                  </div>
                  <p className="text-[10px] text-ink-500">{f.code} · {f.manager} · {f.aum}亿</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{f.nav.toFixed(3)}</p>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn('w-2.5 h-2.5', s <= f.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                    ))}
                  </div>
                </div>
                <button onClick={() => toggleWatch(f.id)}>
                  <Star className={cn('w-4 h-4', f.watched ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                </button>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-[10px]">
                <div className={cn('rounded-lg p-1.5 text-center', f.change1y >= 0 ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500')}>
                  <p className="font-bold">{f.change1y >= 0 ? '+' : ''}{f.change1y.toFixed(1)}%</p>
                  <p className="text-[8px] opacity-80">1y</p>
                </div>
                <div className={cn('rounded-lg p-1.5 text-center', f.change3y >= 0 ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500')}>
                  <p className="font-bold">{f.change3y >= 0 ? '+' : ''}{f.change3y.toFixed(1)}%</p>
                  <p className="text-[8px] opacity-80">3y</p>
                </div>
                <div className={cn('rounded-lg p-1.5 text-center', f.change5y >= 0 ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-500' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500')}>
                  <p className="font-bold">{f.change5y >= 0 ? '+' : ''}{f.change5y.toFixed(1)}%</p>
                  <p className="text-[8px] opacity-80">5y</p>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                <span className="text-ink-500">夏普 <span className="font-bold text-ink-700 dark:text-ink-300">{f.sharpe.toFixed(2)}</span></span>
                {editing === f.id ? (
                  <>
                    <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="份数" className="flex-1 px-2 h-6 rounded bg-ink-50 dark:bg-ink-800 text-[10px] outline-none ml-1" />
                    <button onClick={() => saveHolding(f.id)} className="px-2 h-6 rounded bg-emerald-500 text-white text-[10px] font-bold">保存</button>
                  </>
                ) : f.holding > 0 ? (
                  <button onClick={() => { setEditing(f.id); setEditAmount(String(f.holding)) }} className="ml-auto px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-500 font-semibold">
                    {f.holding}份 = ¥{formatNumber(f.holding * f.nav)}
                  </button>
                ) : (
                  <button onClick={() => { setEditing(f.id); setEditAmount('') }} className="ml-auto px-2 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-ink-500 text-[10px]">+ 持仓</button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
