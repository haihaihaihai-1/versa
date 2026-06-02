import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, Sparkles, Loader2, Plus, Trash2, X, AlertTriangle, Check, Calendar, ChevronRight, User, Briefcase, GraduationCap, Home as HomeIcon } from 'lucide-react'
import { cn, uid, formatCurrency, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Debt {
  id: string
  name: string
  type: 'credit' | 'loan' | 'mortgage' | 'personal' | 'student' | 'credit-card'
  total: number
  paid: number
  interestRate: number
  minPayment: number
  dueDate: string
  lender: string
  startDate: string
  endDate: string
  emoji: string
  color: string
  notes: string
}

const STORAGE_KEY = 'versa:debts'

function load(): Debt[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [
  { id: 'd1', name: '房贷', type: 'mortgage', total: 1200000, paid: 480000, interestRate: 4.2, minPayment: 6800, dueDate: '2026-06-15', lender: '工商银行', startDate: '2022-06-01', endDate: '2052-06-01', emoji: '🏠', color: '#3b82f6', notes: '30 年等额本息' },
  { id: 'd2', name: '招行信用卡', type: 'credit-card', total: 8500, paid: 6200, interestRate: 18.0, minPayment: 850, dueDate: '2026-06-25', lender: '招商银行', startDate: '2025-11-01', endDate: '2026-12-01', emoji: '💳', color: '#ef4444', notes: '已分 12 期' },
] }
function save(d: Debt[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const TYPE_LABEL = {
  credit: '个人信贷', loan: '消费贷', mortgage: '房贷', personal: '私人借款', student: '学生贷款', 'credit-card': '信用卡',
}

const TYPE_COLOR = {
  credit: 'from-blue-500 to-indigo-500', loan: 'from-violet-500 to-purple-500', mortgage: 'from-cyan-500 to-blue-500',
  personal: 'from-rose-500 to-pink-500', student: 'from-emerald-500 to-teal-500', 'credit-card': 'from-red-500 to-rose-500',
} as const

export function DebtTracker() {
  const [debts, setDebts] = useState<Debt[]>(load())
  const [adding, setAdding] = useState(false)
  const [paying, setPaying] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [aiAudit, setAiAudit] = useState('')
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<Debt['type']>('credit-card')
  const [newTotal, setNewTotal] = useState('')
  const [newRate, setNewRate] = useState('')
  const [newLender, setNewLender] = useState('')
  const [newEmoji, setNewEmoji] = useState('💳')
  const [newStart, setNewStart] = useState(new Date().toISOString().split('T')[0])
  const [newEnd, setNewEnd] = useState('')
  const [newMinPay, setNewMinPay] = useState('')

  useEffect(() => { save(debts) }, [debts])

  const totalDebt = debts.reduce((s, d) => s + (d.total - d.paid), 0)
  const totalOriginal = debts.reduce((s, d) => s + d.total, 0)
  const totalPaid = debts.reduce((s, d) => s + d.paid, 0)
  const monthlyTotal = debts.reduce((s, d) => s + d.minPayment, 0)
  const progressPct = totalOriginal > 0 ? Math.round((totalPaid / totalOriginal) * 100) : 0

  const makePayment = (id: string) => {
    const v = +payAmount
    if (!v || v <= 0) { toast('请输入金额', 'error'); return }
    setDebts(debts.map((d) => d.id === id ? { ...d, paid: Math.min(d.total, d.paid + v) } : d))
    setPayAmount(''); setPaying(null)
    toast('还款成功', 'success')
  }

  const remove = (id: string) => setDebts(debts.filter((d) => d.id !== id))
  const add = () => {
    if (!newName.trim() || !newTotal) { toast('请填写完整', 'error'); return }
    const d: Debt = {
      id: uid(), name: newName, type: newType, total: +newTotal, paid: 0,
      interestRate: +newRate || 0, minPayment: +newMinPay || 0,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      lender: newLender, startDate: newStart, endDate: newEnd,
      emoji: newEmoji, color: '#8b5cf6', notes: '',
    }
    setDebts([d, ...debts])
    setNewName(''); setNewTotal(''); setNewRate(''); setNewLender(''); setNewMinPay('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = debts.map((d) => `${d.name}: 还剩 ¥${(d.total - d.paid).toFixed(0)}, 利率 ${d.interestRate}%`).join(', ')
      const result = await aiComplete(`为用户的债务组合生成 1 段 60-100 字的还款建议: ${summary}`, '你是 Versa 财务顾问, 简洁实用, 中文')
      setAiAudit(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-600 via-red-500 to-orange-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-5 h-5" />
          <h2 className="text-lg font-bold">债务追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">还款进度 · 月供管理 · AI 优化</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold">¥{(totalDebt / 1000).toFixed(0)}k</p>
            <p className="text-[9px] opacity-80">剩余</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold">¥{monthlyTotal}</p>
            <p className="text-[9px] opacity-80">月供</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold">{progressPct}%</p>
            <p className="text-[9px] opacity-80">已还</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold">{debts.length}</p>
            <p className="text-[9px] opacity-80">项数</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />加债务
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiAudit && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiAudit}</p>
        </div>
      )}

      <div className="space-y-1.5">
        {debts.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">无债务 · 太棒了!</p>
          </div>
        ) : debts.sort((a, b) => (a.total - a.paid) / Math.max(1, a.total) - (b.total - b.paid) / Math.max(1, b.total)).map((d) => {
          const remaining = d.total - d.paid
          const pct = (d.paid / d.total) * 100
          const overDue = d.interestRate >= 12
          return (
            <div key={d.id} className={cn('rounded-2xl p-3 border', overDue ? 'bg-rose-50/40 dark:bg-rose-900/20 border-rose-300' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg bg-gradient-to-br flex-shrink-0', TYPE_COLOR[d.type])}>
                  {d.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{d.name}</p>
                  <p className="text-[10px] text-ink-500">{TYPE_LABEL[d.type]} · {d.lender || '未填'} · {d.interestRate}% 利率</p>
                </div>
                <button onClick={() => remove(d.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
              <div className="flex items-center justify-between text-[10px] mb-0.5">
                <span>¥{d.paid.toFixed(0)} / ¥{d.total.toFixed(0)}</span>
                <span className="font-bold">{pct.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }} className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" />
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[10px] text-ink-500">剩余</span>
                <span className="text-xs font-bold text-rose-500">¥{remaining.toFixed(0)}</span>
                <span className="text-[10px] text-ink-500 ml-1">月供</span>
                <span className="text-xs font-bold">¥{d.minPayment}</span>
                <span className="text-[10px] text-ink-500 ml-1">到期</span>
                <span className="text-[10px] font-bold">{d.dueDate}</span>
                <button onClick={() => setPaying(d.id)} className="ml-auto px-2 h-6 rounded bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-0.5">
                  <Check className="w-2.5 h-2.5" />还款
                </button>
              </div>
              {paying === d.id && (
                <div className="mt-1.5 flex gap-1.5">
                  <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="还款金额" className="flex-1 px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
                  <button onClick={() => makePayment(d.id)} className="px-2 h-7 rounded bg-emerald-500 text-white text-[10px] font-bold">确认</button>
                  <button onClick={() => setPaying(null)} className="px-2 h-7 rounded bg-ink-100 dark:bg-ink-800 text-[10px]">取消</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">添加债务</h3>
            <div className="flex gap-1.5">
              <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={2} className="w-14 h-9 text-xl text-center rounded-lg bg-ink-50 dark:bg-ink-800 outline-none" />
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="名称" className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <select value={newType} onChange={(e) => setNewType(e.target.value as any)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm">
              {(Object.keys(TYPE_LABEL) as Array<keyof typeof TYPE_LABEL>).map((k) => <option key={k} value={k}>{TYPE_LABEL[k]}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="number" value={newTotal} onChange={(e) => setNewTotal(e.target.value)} placeholder="总额" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm" />
              <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} placeholder="年利率 %" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm" step="0.1" />
              <input type="number" value={newMinPay} onChange={(e) => setNewMinPay(e.target.value)} placeholder="月供" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm" />
              <input value={newLender} onChange={(e) => setNewLender(e.target.value)} placeholder="出借方" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm" />
              <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm" />
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
