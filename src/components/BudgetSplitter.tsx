import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Receipt, Plus, Trash2, Sparkles, Loader2, Users, DollarSign, ArrowRight, Check, Calculator, Plane, Hotel, Utensils, ShoppingBag, Ticket, Shirt } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Expense {
  id: string
  desc: string
  amount: number
  paidBy: string
  splitBetween: string[]
  category: 'flight' | 'hotel' | 'food' | 'transport' | 'ticket' | 'shop' | 'other'
  date: string
}

interface Trip {
  id: string
  name: string
  members: string[]
  expenses: Expense[]
}

const STORAGE_KEY = 'versa:budgetsplit-v1'

function load(): Trip[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Trip[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Trip[] {
  return [
    {
      id: 'b1', name: '京都之旅', members: ['我', 'Alice', 'Bob'],
      expenses: [
        { id: uid(), desc: '酒店', amount: 2400, paidBy: '我', splitBetween: ['我', 'Alice', 'Bob'], category: 'hotel', date: new Date().toISOString().split('T')[0] },
        { id: uid(), desc: '晚餐', amount: 600, paidBy: 'Alice', splitBetween: ['我', 'Alice', 'Bob'], category: 'food', date: new Date().toISOString().split('T')[0] },
        { id: uid(), desc: '门票', amount: 300, paidBy: 'Bob', splitBetween: ['我', 'Alice', 'Bob'], category: 'ticket', date: new Date().toISOString().split('T')[0] },
      ],
    },
  ]
}

const CAT_META = {
  flight: { label: '交通', icon: Plane, color: 'from-blue-500 to-cyan-500' },
  hotel: { label: '住宿', icon: Hotel, color: 'from-violet-500 to-purple-500' },
  food: { label: '餐饮', icon: Utensils, color: 'from-orange-500 to-amber-500' },
  transport: { label: '车费', icon: Plane, color: 'from-cyan-500 to-teal-500' },
  ticket: { label: '门票', icon: Ticket, color: 'from-emerald-500 to-green-500' },
  shop: { label: '购物', icon: ShoppingBag, color: 'from-pink-500 to-rose-500' },
  other: { label: '其他', icon: Receipt, color: 'from-ink-500 to-ink-600' },
} as const

interface Balance { [member: string]: number }

function calcBalances(trip: Trip): { balances: Balance; settlements: { from: string; to: string; amount: number }[] } {
  const balances: Balance = {}
  trip.members.forEach((m) => { balances[m] = 0 })
  trip.expenses.forEach((e) => {
    const share = e.amount / e.splitBetween.length
    balances[e.paidBy] = (balances[e.paidBy] || 0) + e.amount
    e.splitBetween.forEach((m) => {
      balances[m] = (balances[m] || 0) - share
    })
  })
  const settlements: { from: string; to: string; amount: number }[] = []
  const debtors = Object.entries(balances).filter(([_, v]) => v < -0.01).sort((a, b) => a[1] - b[1])
  const creditors = Object.entries(balances).filter(([_, v]) => v > 0.01).sort((a, b) => b[1] - a[1])
  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const [dName, dVal] = debtors[i]
    const [cName, cVal] = creditors[j]
    const pay = Math.min(-dVal, cVal)
    settlements.push({ from: dName, to: cName, amount: Math.round(pay * 100) / 100 })
    debtors[i] = [dName, dVal + pay]
    creditors[j] = [cName, cVal - pay]
    if (Math.abs(debtors[i][1]) < 0.01) i++
    if (Math.abs(creditors[j][1]) < 0.01) j++
  }
  return { balances, settlements }
}

export function BudgetSplitter() {
  const [trips, setTrips] = useState<Trip[]>(load())
  const [activeId, setActiveId] = useState<string | null>(trips[0]?.id || null)
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [addingExp, setAddingExp] = useState(false)
  const [addingMember, setAddingMember] = useState(false)
  const [expDesc, setExpDesc] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expPaidBy, setExpPaidBy] = useState('')
  const [expCat, setExpCat] = useState<Expense['category']>('food')
  const [expSplit, setExpSplit] = useState<string[]>([])
  const [newName, setNewName] = useState('')
  const [newMembers, setNewMembers] = useState('我,Alice,Bob')
  const [newMember, setNewMember] = useState('')

  useEffect(() => { save(trips) }, [trips])

  const active = trips.find((t) => t.id === activeId)
  const total = active?.expenses.reduce((s, e) => s + e.amount, 0) || 0
  const perPerson = active && active.members.length > 0 ? total / active.members.length : 0
  const { balances, settlements } = active ? calcBalances(active) : { balances: {}, settlements: [] }

  const addTrip = () => {
    if (!newName.trim()) { toast('请输入名称', 'error'); return }
    const members = newMembers.split(/[,，]/).map((m) => m.trim()).filter(Boolean)
    if (members.length < 2) { toast('至少 2 人', 'error'); return }
    const t: Trip = { id: uid(), name: newName, members, expenses: [] }
    setTrips([t, ...trips])
    setActiveId(t.id)
    setAdding(false)
    setNewName(''); setNewMembers('我,Alice,Bob')
    toast('已创建', 'success')
  }

  const removeTrip = (id: string) => {
    setTrips(trips.filter((t) => t.id !== id))
    if (activeId === id) setActiveId(trips[0]?.id || null)
  }

  const addMember = () => {
    if (!newMember.trim() || !active) { toast('请输入', 'error'); return }
    if (active.members.includes(newMember)) { toast('已存在', 'error'); return }
    setTrips(trips.map((t) => t.id === active.id ? { ...t, members: [...t.members, newMember] } : t))
    setNewMember('')
    setAddingMember(false)
    toast('已添加', 'success')
  }

  const removeMember = (m: string) => {
    if (!active) return
    if (active.members.length <= 2) { toast('至少 2 人', 'error'); return }
    setTrips(trips.map((t) => t.id === active.id ? { ...t, members: t.members.filter((x) => x !== m) } : t))
  }

  const addExpense = () => {
    if (!expDesc.trim() || !expAmount || !expPaidBy || expSplit.length === 0 || !active) { toast('请完整填写', 'error'); return }
    const e: Expense = { id: uid(), desc: expDesc, amount: +expAmount, paidBy: expPaidBy, splitBetween: expSplit, category: expCat, date: new Date().toISOString().split('T')[0] }
    setTrips(trips.map((t) => t.id === active.id ? { ...t, expenses: [e, ...t.expenses] } : t))
    setExpDesc(''); setExpAmount(''); setExpSplit([])
    setAddingExp(false)
    toast('已记录', 'success')
  }

  const removeExp = (id: string) => {
    if (!active) return
    setTrips(trips.map((t) => t.id === active.id ? { ...t, expenses: t.expenses.filter((e) => e.id !== id) } : t))
  }

  const toggleSplit = (m: string) => {
    setExpSplit(expSplit.includes(m) ? expSplit.filter((x) => x !== m) : [...expSplit, m])
  }

  const runAI = async () => {
    if (!isAIEnabled() || !active) { toast('请先配置 AI', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`用户与 ${active.members.join('/')} 旅行, 共支出 ¥${total.toFixed(0)}. 给 1 段 50 字内省钱建议, 中文`, '你是 Versa 旅行理财顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Calculator className="w-5 h-5" />
          <h2 className="text-lg font-bold">AA 分账</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">多人记账 · 自动结算 · 优化转账</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{trips.length}</p>
            <p className="text-[9px] opacity-80">行程</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{active?.members.length || 0}</p>
            <p className="text-[9px] opacity-80">成员</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{total.toFixed(0)}</p>
            <p className="text-[9px] opacity-80">总支出</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{perPerson.toFixed(0)}</p>
            <p className="text-[9px] opacity-80">人均</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新建行程
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

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {trips.map((t) => (
          <button key={t.id} onClick={() => setActiveId(t.id)} className={cn('flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold', activeId === t.id ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {t.name}
          </button>
        ))}
      </div>

      {active ? (
        <div className="space-y-2">
          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-sm font-bold flex items-center gap-1"><Users className="w-3.5 h-3.5" />成员</p>
              <button onClick={() => removeTrip(active.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
            <div className="flex flex-wrap gap-1">
              {active.members.map((m) => (
                <span key={m} className="px-2 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 text-[10px] font-semibold flex items-center gap-1">
                  {m} ({balances[m] >= 0 ? '+' : ''}{balances[m].toFixed(0)})
                  {active.members.length > 2 && <button onClick={() => removeMember(m)} className="hover:text-rose-500">×</button>}
                </span>
              ))}
              <button onClick={() => setAddingMember(true)} className="px-2 h-6 rounded-full bg-ink-100 dark:bg-ink-800 text-[10px] font-semibold">+ 加人</button>
            </div>
          </div>

          {settlements.length > 0 && (
            <div className="rounded-2xl bg-amber-50/40 dark:bg-amber-900/20 p-2 border border-amber-300/60">
              <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">💸 结算建议</p>
              {settlements.map((s, i) => (
                <p key={i} className="text-[11px] flex items-center gap-1">
                  <span className="font-semibold">{s.from}</span>
                  <ArrowRight className="w-3 h-3 text-amber-500" />
                  <span className="font-semibold">{s.to}</span>
                  <span className="ml-auto font-bold text-amber-600">¥{s.amount.toFixed(0)}</span>
                </p>
              ))}
            </div>
          )}

          <button onClick={() => { setExpPaidBy(active.members[0]); setExpSplit(active.members); setAddingExp(true) }} className="w-full h-9 rounded-lg bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
            <Plus className="w-3.5 h-3.5" />记一笔
          </button>

          <div className="space-y-1">
            {active.expenses.length === 0 ? (
              <p className="text-center text-xs text-ink-500 py-3">还没有记录</p>
            ) : active.expenses.map((e) => {
              const M = CAT_META[e.category]
              return (
                <div key={e.id} className="rounded-xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-1.5">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br text-white', M.color)}>
                    <M.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{e.desc}</p>
                    <p className="text-[9px] text-ink-500">{e.paidBy} 付 · {e.splitBetween.length} 人分</p>
                  </div>
                  <span className="text-sm font-bold">¥{e.amount}</span>
                  <button onClick={() => removeExp(e.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-ink-500">
          <Calculator className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有行程</p>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">新建行程</h3>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="行程名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={newMembers} onChange={(e) => setNewMembers(e.target.value)} placeholder="成员 (逗号分隔)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={addTrip} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">创建</button>
          </motion.div>
        </div>
      )}

      {addingMember && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAddingMember(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">添加成员</h3>
            <input value={newMember} onChange={(e) => setNewMember(e.target.value)} placeholder="名字" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={addMember} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}

      {addingExp && active && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAddingExp(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">记一笔</h3>
            <input value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="说明" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="金额" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">类别</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                  const M = CAT_META[k]
                  return (
                    <button key={k} onClick={() => setExpCat(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', expCat === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      <M.icon className="w-3.5 h-3.5" />
                      <span className="text-[9px] mt-0.5">{M.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">付款人</p>
              <div className="flex flex-wrap gap-1">
                {active.members.map((m) => (
                  <button key={m} onClick={() => setExpPaidBy(m)} className={cn('px-3 h-7 rounded-full text-[10px] font-semibold', expPaidBy === m ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{m}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">分摊给</p>
              <div className="flex flex-wrap gap-1">
                {active.members.map((m) => (
                  <button key={m} onClick={() => toggleSplit(m)} className={cn('px-3 h-7 rounded-full text-[10px] font-semibold', expSplit.includes(m) ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                    {expSplit.includes(m) && <Check className="w-2.5 h-2.5 inline mr-0.5" />}{m}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={addExpense} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">记录</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
