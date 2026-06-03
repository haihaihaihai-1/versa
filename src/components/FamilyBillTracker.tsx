import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Receipt, Plus, Trash2, Sparkles, Loader2, Check, DollarSign, Calendar, TrendingUp, AlertCircle, Repeat, Home, Wifi, Car, Utensils, Heart } from 'lucide-react'
import { cn, uid, formatCurrency } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Bill {
  id: string
  name: string
  amount: number
  category: 'rent' | 'utility' | 'internet' | 'phone' | 'insurance' | 'subscription' | 'loan' | 'food' | 'transport' | 'childcare' | 'other'
  dueDay: number
  frequency: 'monthly' | 'quarterly' | 'yearly' | 'weekly'
  autoPay: boolean
  paid: { [month: string]: boolean }
  notes: string
}

const STORAGE_KEY = 'versa:fam-bills-v1'

function load(): Bill[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Bill[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Bill[] {
  return [
    { id: '1', name: '房租', amount: 8000, category: 'rent', dueDay: 1, frequency: 'monthly', autoPay: true, paid: {}, notes: '押一付三' },
    { id: '2', name: '水电费', amount: 350, category: 'utility', dueDay: 15, frequency: 'monthly', autoPay: false, paid: {}, notes: '' },
    { id: '3', name: '宽带', amount: 120, category: 'internet', dueDay: 20, frequency: 'monthly', autoPay: true, paid: {}, notes: '200M' },
    { id: '4', name: '家庭保险', amount: 1200, category: 'insurance', dueDay: 10, frequency: 'quarterly', autoPay: true, paid: {}, notes: '' },
    { id: '5', name: '小宝幼儿园', amount: 4500, category: 'childcare', dueDay: 5, frequency: 'monthly', autoPay: false, paid: {}, notes: '' },
  ]
}

const CAT_META = {
  rent: { label: '房租', icon: Home, color: 'from-rose-500 to-pink-500' },
  utility: { label: '水电', icon: '💡', color: 'from-amber-500 to-orange-500' },
  internet: { label: '宽带', icon: Wifi, color: 'from-blue-500 to-cyan-500' },
  phone: { label: '话费', icon: '📱', color: 'from-cyan-500 to-teal-500' },
  insurance: { label: '保险', icon: '🛡', color: 'from-emerald-500 to-green-500' },
  subscription: { label: '订阅', icon: Repeat, color: 'from-violet-500 to-purple-500' },
  loan: { label: '贷款', icon: '🏦', color: 'from-orange-500 to-red-500' },
  food: { label: '餐费', icon: Utensils, color: 'from-yellow-500 to-orange-500' },
  transport: { label: '交通', icon: Car, color: 'from-ink-500 to-ink-600' },
  childcare: { label: '育儿', icon: Heart, color: 'from-pink-500 to-rose-500' },
  other: { label: '其他', icon: DollarSign, color: 'from-ink-500 to-ink-600' },
} as const

const FREQ_META = {
  monthly: { label: '月', multiplier: 1 },
  quarterly: { label: '季', multiplier: 3 },
  yearly: { label: '年', multiplier: 12 },
  weekly: { label: '周', multiplier: 0.25 },
} as const

function currentMonthKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
function todayKey() { return new Date().toISOString().split('T')[0] }
function daysUntilDue(dueDay: number) {
  const today = new Date()
  const due = new Date(today.getFullYear(), today.getMonth(), dueDay)
  if (due.getTime() < today.getTime()) due.setMonth(due.getMonth() + 1)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

export function FamilyBillTracker() {
  const [bills, setBills] = useState<Bill[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Bill['category']>('utility')
  const [dueDay, setDueDay] = useState('1')
  const [frequency, setFrequency] = useState<Bill['frequency']>('monthly')
  const [autoPay, setAutoPay] = useState(false)

  useEffect(() => { save(bills) }, [bills])

  const month = currentMonthKey()
  const monthlyTotal = bills.reduce((s, b) => s + b.amount * (FREQ_META[b.frequency].multiplier), 0)
  const yearlyTotal = monthlyTotal * 12
  const paidThisMonth = bills.filter((b) => b.paid[month]).length
  const overdue = bills.filter((b) => !b.paid[month] && daysUntilDue(b.dueDay) <= 0).length
  const upcoming = bills.filter((b) => !b.paid[month] && daysUntilDue(b.dueDay) <= 7).length

  const add = () => {
    if (!name.trim() || !amount) { toast('请填写', 'error'); return }
    const b: Bill = { id: uid(), name, amount: +amount, category, dueDay: +dueDay, frequency, autoPay, paid: {}, notes: '' }
    setBills([b, ...bills])
    setName(''); setAmount('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const remove = (id: string) => setBills(bills.filter((b) => b.id !== id))
  const togglePaid = (id: string) => setBills(bills.map((b) => b.id === id ? { ...b, paid: { ...b.paid, [month]: !b.paid[month] } } : b))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`家庭月度账单 ¥${monthlyTotal.toFixed(0)} (年 ¥${yearlyTotal.toFixed(0)}), 共有 ${bills.length} 项. 给出 1 段 60 字内省钱建议, 中文`, '你是 Versa 家庭理财顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const sorted = [...bills].sort((a, b) => daysUntilDue(a.dueDay) - daysUntilDue(b.dueDay))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="w-5 h-5" />
          <h2 className="text-lg font-bold">家庭账单</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">11 类别 · 周期追踪 · 自动扣缴</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatCurrency(monthlyTotal)}</p>
            <p className="text-[9px] opacity-80">月支出</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatCurrency(yearlyTotal)}</p>
            <p className="text-[9px] opacity-80">年支出</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-emerald-100">{paidThisMonth}</p>
            <p className="text-[9px] opacity-80">已付</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{upcoming}</p>
            <p className="text-[9px] opacity-80">7日内</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />加账单
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-emerald-50/40 dark:bg-emerald-900/20 rounded-xl p-2 border border-emerald-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="space-y-1.5">
        {sorted.map((b) => {
          const CM = CAT_META[b.category]
          const Icon = CM.icon
          const days = daysUntilDue(b.dueDay)
          const isOverdue = !b.paid[month] && days <= 0
          const isUrgent = !b.paid[month] && days <= 7
          const isPaid = b.paid[month]
          return (
            <motion.div key={b.id} whileHover={{ y: -1 }} className={cn('rounded-2xl p-2 border flex items-center gap-2', isPaid ? 'bg-emerald-50/40 dark:bg-emerald-900/20 border-emerald-200/40' : isOverdue ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-900/20' : isUrgent ? 'border-amber-400' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
              <button onClick={() => togglePaid(b.id)} className={cn('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0', isPaid ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300')}>
                {isPaid && <Check className="w-3 h-3 text-white" />}
              </button>
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', CM.color)}>
                {typeof Icon === 'string' ? <span className="text-base">{Icon}</span> : <Icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={cn('text-sm font-bold', isPaid && 'line-through opacity-60')}>{b.name}</p>
                  {b.autoPay && <span className="text-[9px] px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-500 font-semibold">自动</span>}
                </div>
                <p className="text-[10px] text-ink-500">{CM.label} · 每月 {b.dueDay} 号 · {FREQ_META[b.frequency].label}付</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">¥{formatCurrency(b.amount)}</p>
                {!isPaid && <p className={cn('text-[9px] font-semibold', isOverdue ? 'text-rose-500' : isUrgent ? 'text-amber-500' : 'text-ink-500')}>
                  {days === 0 ? '今天' : days > 0 ? `${days}天` : `${-days}天前`}
                </p>}
              </div>
              <button onClick={() => remove(b.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">加账单</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="金额" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="number" value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="每月几号" min="1" max="31" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">类别</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                  const C = CAT_META[k]
                  return (
                    <button key={k} onClick={() => setCategory(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', category === k ? `bg-gradient-to-br ${C.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      {typeof C.icon === 'string' ? <span className="text-base">{C.icon}</span> : <C.icon className="w-3.5 h-3.5" />}
                      <span className="text-[9px]">{C.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">频率</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(FREQ_META) as Array<keyof typeof FREQ_META>).map((k) => (
                  <button key={k} onClick={() => setFrequency(k)} className={cn('h-8 rounded-lg text-[10px] font-semibold', frequency === k ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{FREQ_META[k].label}</button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoPay} onChange={(e) => setAutoPay(e.target.checked)} className="rounded" />自动扣缴
            </label>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
