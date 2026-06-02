import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Coffee, Car, Home, Heart, Tv, Book, Sparkles, Loader2, Calendar } from 'lucide-react'
import { cn, formatCurrency, formatNumber } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Expense {
  id: string
  amount: number
  category: 'food' | 'shop' | 'transport' | 'home' | 'entertainment' | 'health' | 'edu' | 'other'
  note: string
  date: string
}

const STORAGE_KEY = 'versa:expenses'

function load(): Expense[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'e1', amount: 89, category: 'shop', note: 'iPhone 16 Pro', date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0] },
    { id: 'e2', amount: 38, category: 'food', note: '午餐', date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
    { id: 'e3', amount: 22, category: 'food', note: '咖啡', date: new Date().toISOString().split('T')[0] },
    { id: 'e4', amount: 120, category: 'transport', note: '高铁票', date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0] },
    { id: 'e5', amount: 200, category: 'entertainment', note: '演唱会', date: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0] },
    { id: 'e6', amount: 56, category: 'food', note: '聚餐', date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0] },
    { id: 'e7', amount: 280, category: 'shop', note: '连衣裙', date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0] },
    { id: 'e8', amount: 88, category: 'edu', note: '电子书', date: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0] },
    { id: 'e9', amount: 45, category: 'health', note: '维生素', date: new Date(Date.now() - 86400000 * 8).toISOString().split('T')[0] },
  ]
}
function save(d: Expense[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CAT_META = {
  food: { label: '餐饮', icon: Coffee, color: 'from-orange-500 to-rose-500' },
  shop: { label: '购物', icon: ShoppingBag, color: 'from-pink-500 to-rose-500' },
  transport: { label: '交通', icon: Car, color: 'from-blue-500 to-indigo-500' },
  home: { label: '居家', icon: Home, color: 'from-emerald-500 to-teal-500' },
  entertainment: { label: '娱乐', icon: Tv, color: 'from-violet-500 to-purple-500' },
  health: { label: '健康', icon: Heart, color: 'from-rose-500 to-pink-500' },
  edu: { label: '教育', icon: Book, color: 'from-cyan-500 to-blue-500' },
  other: { label: '其他', icon: DollarSign, color: 'from-ink-500 to-ink-300' },
} as const

const BUDGET = 3000

export function SpendingStats() {
  const [expenses, setExpenses] = useState<Expense[]>(load())
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('month')
  const [adding, setAdding] = useState(false)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [newAmount, setNewAmount] = useState('')
  const [newCat, setNewCat] = useState<keyof typeof CAT_META>('food')
  const [newNote, setNewNote] = useState('')

  useEffect(() => { save(expenses) }, [expenses])

  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const now = new Date()
  const inView = expenses.filter((e) => {
    const d = new Date(e.date)
    if (view === 'day') return d.toDateString() === now.toDateString()
    if (view === 'week') return Date.now() - d.getTime() < 7 * 86400000
    if (view === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    return d.getFullYear() === now.getFullYear()
  })
  const viewTotal = inView.reduce((s, e) => s + e.amount, 0)

  const catStats = (() => {
    const map: Record<string, number> = {}
    inView.forEach((e) => map[e.category] = (map[e.category] || 0) + e.amount)
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  })()
  const topCat = catStats[0]

  const dailyData = (() => {
    const days = view === 'year' ? 12 : view === 'month' ? 30 : view === 'week' ? 7 : 1
    const out: { label: string; total: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const ds = d.toISOString().split('T')[0]
      const total = expenses.filter((e) => e.date === ds).reduce((s, e) => s + e.amount, 0)
      out.push({ label: view === 'year' ? `${d.getMonth() + 1}月` : `${d.getDate()}`, total })
    }
    return out
  })()

  const add = () => {
    if (!newAmount || +newAmount <= 0) { toast('请输入金额', 'error'); return }
    const e: Expense = { id: 'e' + Date.now(), amount: +newAmount, category: newCat, note: newNote, date: new Date().toISOString().split('T')[0] }
    setExpenses([e, ...expenses])
    setNewAmount(''); setNewNote('')
    setAdding(false)
    toast('已记录', 'success')
  }

  const remove = (id: string) => setExpenses(expenses.filter((e) => e.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`分析用户消费, 总支出 ¥${viewTotal}, 最多: ${topCat?.[0]}, 给出 60-80 字节省建议`, '你是 Versa 理财顾问, 简洁实用, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const maxDaily = Math.max(1, ...dailyData.map((d) => d.total))
  const budgetUsed = Math.min(100, (viewTotal / BUDGET) * 100)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5" />
          <h2 className="text-lg font-bold">消费统计</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">分类 · 趋势 · 预算</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">¥{viewTotal}</p>
            <p className="text-[10px] opacity-80">{view === 'day' ? '今日' : view === 'week' ? '本周' : view === 'month' ? '本月' : '本年'}</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{inView.length}</p>
            <p className="text-[10px] opacity-80">笔数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{topCat ? CAT_META[topCat[0] as keyof typeof CAT_META].label : '—'}</p>
            <p className="text-[10px] opacity-80">最大类</p>
          </div>
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] opacity-80 mb-1">
            <span>月度预算 ¥{BUDGET}</span>
            <span>{budgetUsed.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className={cn('h-full', budgetUsed > 80 ? 'bg-rose-300' : 'bg-white')} style={{ width: `${budgetUsed}%` }} />
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        {(['day', 'week', 'month', 'year'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', view === v ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {v === 'day' ? '日' : v === 'week' ? '周' : v === 'month' ? '月' : '年'}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-8 rounded-lg bg-rose-500 text-white text-xs font-semibold">+ 记账</button>
        <button onClick={runAI} disabled={loading} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI
        </button>
      </div>

      {aiRec && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] leading-relaxed">{aiRec}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-bold mb-1.5">趋势</p>
        <div className="flex items-end gap-0.5 h-20">
          {dailyData.slice(-20).map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 w-full flex items-end">
                <motion.div initial={{ height: 0 }} animate={{ height: `${(d.total / maxDaily) * 100}%` }} className="w-full bg-gradient-to-t from-rose-500 to-pink-500 rounded-t min-h-[2px]" />
              </div>
              {(i % 5 === 0 || i === dailyData.length - 1) && <p className="text-[8px] text-ink-500">{d.label}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-bold mb-1.5">分类</p>
        <div className="space-y-1">
          {catStats.map(([cat, amt]) => {
            const Meta = CAT_META[cat as keyof typeof CAT_META]
            const Icon = Meta.icon
            const pct = (amt / viewTotal) * 100
            return (
              <div key={cat} className="flex items-center gap-1.5">
                <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', Meta.color)}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="text-xs flex-1">{Meta.label}</span>
                <span className="text-[10px] text-ink-500 w-12 text-right">¥{amt}</span>
                <div className="w-16 h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <div className={cn('h-full bg-gradient-to-r', Meta.color)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        {inView.slice(0, 8).map((e) => {
          const Meta = CAT_META[e.category]
          return (
            <div key={e.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', Meta.color)}>
                <Meta.icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{e.note}</p>
                <p className="text-[10px] text-ink-500">{e.date}</p>
              </div>
              <p className="text-sm font-bold text-rose-500">-¥{e.amount}</p>
              <button onClick={() => remove(e.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">记一笔</h3>
            <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="金额" className="w-full px-3 h-12 rounded-lg bg-ink-50 dark:bg-ink-800 text-2xl font-bold outline-none text-center" />
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                const M = CAT_META[k]
                const Icon = M.icon
                return (
                  <button key={k} onClick={() => setNewCat(k)} className={cn('h-12 rounded-xl flex flex-col items-center justify-center gap-0.5', newCat === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-semibold">{M.label}</span>
                  </button>
                )
              })}
            </div>
            <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="备注" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-rose-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
