import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Sparkles, Loader2, Plus, Trash2, Edit3, AlertTriangle, Check, TrendingDown, TrendingUp, Target, Calendar, X } from 'lucide-react'
import { cn, uid, formatCurrency } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Budget {
  id: string
  category: string
  amount: number
  spent: number
  color: string
  emoji: string
  period: 'weekly' | 'monthly' | 'yearly'
  rollover: boolean
}

const STORAGE_KEY = 'versa:budgets'

function load(): Budget[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [
  { id: 'b1', category: '餐饮', amount: 2000, spent: 1480, color: '#f97316', emoji: '🍜', period: 'monthly', rollover: false },
  { id: 'b2', category: '购物', amount: 1500, spent: 2100, color: '#ec4899', emoji: '🛍️', period: 'monthly', rollover: false },
  { id: 'b3', category: '交通', amount: 800, spent: 620, color: '#3b82f6', emoji: '🚗', period: 'monthly', rollover: false },
  { id: 'b4', category: '娱乐', amount: 500, spent: 380, color: '#8b5cf6', emoji: '🎬', period: 'monthly', rollover: false },
  { id: 'b5', category: '学习', amount: 600, spent: 250, color: '#06b6d4', emoji: '📚', period: 'monthly', rollover: false },
] }
function save(d: Budget[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const DEFAULT_CATS = [
  { category: '餐饮', color: '#f97316', emoji: '🍜' },
  { category: '购物', color: '#ec4899', emoji: '🛍️' },
  { category: '交通', color: '#3b82f6', emoji: '🚗' },
  { category: '娱乐', color: '#8b5cf6', emoji: '🎬' },
  { category: '学习', color: '#06b6d4', emoji: '📚' },
  { category: '居家', color: '#10b981', emoji: '🏠' },
  { category: '医疗', color: '#ef4444', emoji: '💊' },
  { category: '旅行', color: '#3b82f6', emoji: '✈️' },
  { category: '其他', color: '#6b7280', emoji: '📦' },
]

export function BudgetPlanner() {
  const [budgets, setBudgets] = useState<Budget[]>(load())
  const [adding, setAdding] = useState(false)
  const [newCategory, setNewCategory] = useState('餐饮')
  const [newAmount, setNewAmount] = useState('')
  const [newEmoji, setNewEmoji] = useState('🍜')
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(budgets) }, [budgets])

  const total = budgets.reduce((s, b) => s + b.amount, 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)
  const totalPct = total > 0 ? Math.round((totalSpent / total) * 100) : 0
  const overBudget = budgets.filter((b) => b.spent > b.amount).length

  const setSpent = (id: string, s: number) => setBudgets(budgets.map((b) => b.id === id ? { ...b, spent: Math.max(0, s) } : b))
  const setAmount = (id: string, a: number) => setBudgets(budgets.map((b) => b.id === id ? { ...b, amount: Math.max(0, a) } : b))
  const remove = (id: string) => setBudgets(budgets.filter((b) => b.id !== id))

  const add = () => {
    if (!newAmount) { toast('请填写金额', 'error'); return }
    if (budgets.find((b) => b.category === newCategory)) { toast('已存在此类别', 'error'); return }
    const cat = DEFAULT_CATS.find((c) => c.category === newCategory)!
    const b: Budget = { id: uid(), category: newCategory, amount: +newAmount, spent: 0, color: cat.color, emoji: cat.emoji, period: 'monthly', rollover: false }
    setBudgets([...budgets, b])
    setNewAmount('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = budgets.map((b) => `${b.category}: ¥${b.spent}/¥${b.amount} (${Math.round(b.spent / b.amount * 100)}%)`).join(', ')
      const result = await aiComplete(`为用户的预算执行情况生成 60-100 字建议: ${summary}`, '你是 Versa 财务顾问, 简洁实用, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const remaining = total - totalSpent
  const usedColors = budgets.map((b) => b.category)
  const availableCats = DEFAULT_CATS.filter((c) => !usedColors.includes(c.category))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5" />
          <h2 className="text-lg font-bold">预算规划</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">分类预算 · 进度追踪 · 超支警告</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">¥{total.toFixed(0)}</p>
            <p className="text-[10px] opacity-80">总预算</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">¥{totalSpent.toFixed(0)}</p>
            <p className="text-[10px] opacity-80">已花</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">¥{remaining.toFixed(0)}</p>
            <p className="text-[10px] opacity-80">剩余</p>
          </div>
        </div>
        <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, totalPct)}%` }} className={cn('h-full', totalPct > 80 ? 'bg-rose-300' : 'bg-white')} />
        </div>
        <p className="text-[10px] text-center opacity-90 mt-1">{totalPct}% 已用 {overBudget > 0 && `· ${overBudget} 项超支`}</p>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />加预算
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiRec && (
        <div className="bg-emerald-50/40 dark:bg-emerald-900/20 rounded-xl p-2 border border-emerald-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiRec}</p>
        </div>
      )}

      <div className="space-y-2">
        {budgets.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有预算</p>
          </div>
        ) : budgets.sort((a, b) => b.spent / Math.max(1, b.amount) - a.spent / Math.max(1, a.amount)).map((b) => {
          const pct = (b.spent / Math.max(1, b.amount)) * 100
          const over = b.spent > b.amount
          return (
            <div key={b.id} className={cn('rounded-2xl p-3 border', over ? 'bg-rose-50/40 dark:bg-rose-900/20 border-rose-300' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: b.color + '20' }}>{b.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{b.category}</p>
                  <p className="text-[10px] text-ink-500">月预算</p>
                </div>
                {over && <span className="text-[10px] font-bold text-rose-500 flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" />超 ¥{(b.spent - b.amount).toFixed(0)}</span>}
                <button onClick={() => remove(b.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] mb-0.5">
                <span>¥</span>
                <input type="number" value={b.spent} onChange={(e) => setSpent(b.id, +e.target.value)} className="w-16 px-1 h-6 rounded bg-ink-50 dark:bg-ink-800 text-center" />
                <span>/ ¥</span>
                <input type="number" value={b.amount} onChange={(e) => setAmount(b.id, +e.target.value)} className="w-16 px-1 h-6 rounded bg-ink-50 dark:bg-ink-800 text-center" />
                <span className="ml-auto font-bold" style={{ color: over ? '#ef4444' : b.color }}>{pct.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }} className="h-full" style={{ background: over ? '#ef4444' : b.color }} />
              </div>
              {pct > 80 && !over && <p className="text-[10px] text-amber-500 mt-0.5">⚠ 接近预算上限</p>}
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">添加预算</h3>
            {availableCats.length === 0 ? (
              <p className="text-xs text-ink-500 text-center py-2">所有类别已添加</p>
            ) : (
              <>
                <select value={newCategory} onChange={(e) => { setNewCategory(e.target.value); setNewEmoji(availableCats.find((c) => c.category === e.target.value)?.emoji || '📦') }} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm">
                  {availableCats.map((c) => <option key={c.category} value={c.category}>{c.emoji} {c.category}</option>)}
                </select>
                <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="月预算金额" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
                <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">添加</button>
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}
