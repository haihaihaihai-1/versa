import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Plus, Trash2, Sparkles, Loader2, ShoppingBag, Stethoscope, Scissors, Utensils, Heart, TrendingUp, Calendar } from 'lucide-react'
import { cn, uid, formatCurrency } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface PetExpense {
  id: string
  petId: string
  type: 'food' | 'vet' | 'grooming' | 'toy' | 'accessory' | 'training' | 'boarding' | 'other'
  item: string
  amount: number
  date: string
  recurring: boolean
  vendor: string
  notes: string
}

const STORAGE_KEY = 'versa:pet-expenses-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }

function load(): PetExpense[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: PetExpense[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): PetExpense[] {
  return [
    { id: '1', petId: '1', type: 'food', item: '皇家狗粮 5kg', amount: 380, date: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0], recurring: false, vendor: '京东', notes: '' },
    { id: '2', petId: '1', type: 'vet', item: '狂犬疫苗', amount: 120, date: new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0], recurring: false, vendor: '王医生', notes: '年免' },
    { id: '3', petId: '1', type: 'toy', item: '狗咬绳', amount: 35, date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], recurring: false, vendor: '宠物店', notes: '' },
    { id: '4', petId: '1', type: 'grooming', item: '洗澡+剪指甲', amount: 80, date: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0], recurring: false, vendor: '宠物店', notes: '' },
    { id: '5', petId: '2', type: 'food', item: '渴望猫粮 2kg', amount: 280, date: new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0], recurring: false, vendor: '淘宝', notes: '' },
  ]
}

const TYPE_META = {
  food: { label: '食物', icon: Utensils, color: 'from-amber-500 to-orange-500' },
  vet: { label: '医疗', icon: Stethoscope, color: 'from-rose-500 to-red-500' },
  grooming: { label: '美容', icon: Scissors, color: 'from-pink-500 to-fuchsia-500' },
  toy: { label: '玩具', icon: Heart, color: 'from-cyan-500 to-blue-500' },
  accessory: { label: '用品', icon: ShoppingBag, color: 'from-violet-500 to-purple-500' },
  training: { label: '训练', icon: '🎓', color: 'from-emerald-500 to-teal-500' },
  boarding: { label: '寄养', icon: '🏠', color: 'from-amber-600 to-orange-600' },
  other: { label: '其他', icon: DollarSign, color: 'from-ink-500 to-ink-600' },
} as const

function thisMonth() { const d = new Date(); return d.toISOString().slice(0, 7) }

export function PetExpenses() {
  const [expenses, setExpenses] = useState<PetExpense[]>(load())
  const [pets, setPets] = useState<{ id: string; name: string; emoji: string }[]>([])
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentPet, setCurrentPet] = useState('')
  const [filter, setFilter] = useState<'all' | PetExpense['type']>('all')
  const [type, setType] = useState<PetExpense['type']>('food')
  const [item, setItem] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayKey())
  const [vendor, setVendor] = useState('')
  const [notes, setNotes] = useState('')
  const [recurring, setRecurring] = useState(false)

  useEffect(() => {
    save(expenses)
    try {
      const p = JSON.parse(localStorage.getItem('versa:pets-v1') || '[]')
      setPets(p.map((x: any) => ({ id: x.id, name: x.name, emoji: x.emoji })))
      if (p.length > 0 && !currentPet) setCurrentPet(p[0].id)
    } catch {}
  }, [expenses])

  const month = thisMonth()
  const petExpenses = currentPet ? expenses.filter((e) => e.petId === currentPet) : expenses
  const totalAll = petExpenses.reduce((s, e) => s + e.amount, 0)
  const monthTotal = petExpenses.filter((e) => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0)
  const yearTotal = petExpenses.filter((e) => e.date.startsWith(new Date().getFullYear().toString())).reduce((s, e) => s + e.amount, 0)
  const recurringTotal = petExpenses.filter((e) => e.recurring).reduce((s, e) => s + e.amount, 0)

  // By type
  const byType: { [k: string]: number } = {}
  petExpenses.forEach((e) => { byType[e.type] = (byType[e.type] || 0) + e.amount })

  // Last 6 months
  const last6 = (() => {
    const arr: { month: string; amount: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      const monthExp = petExpenses.filter((e) => e.date.startsWith(key))
      arr.push({ month: key, amount: monthExp.reduce((s, e) => s + e.amount, 0) })
    }
    return arr
  })()
  const maxMonth = Math.max(...last6.map((m) => m.amount), 100)

  const filtered = (filter === 'all' ? petExpenses : petExpenses.filter((e) => e.type === filter))
    .sort((a, b) => b.date.localeCompare(a.date))

  const add = () => {
    if (!item.trim() || !amount || !currentPet) { toast('请填写', 'error'); return }
    const e: PetExpense = { id: uid(), petId: currentPet, type, item, amount: +amount, date, recurring, vendor, notes }
    setExpenses([e, ...expenses])
    setItem(''); setAmount(''); setVendor(''); setNotes(''); setRecurring(false)
    setAdding(false)
    toast('已记录', 'success')
  }

  const remove = (id: string) => setExpenses(expenses.filter((e) => e.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = `总 ¥${totalAll}, 本月 ¥${monthTotal}, 年 ¥${yearTotal}`
      const result = await aiComplete(`宠物开销: ${summary}. 给出 1 段 50 字内省钱建议, 中文`, '你是 Versa 宠物财务顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-5 h-5" />
          <h2 className="text-lg font-bold">宠物开销</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 类别 · 月年统计 · AI 建议</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatCurrency(monthTotal)}</p>
            <p className="text-[9px] opacity-80">本月</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatCurrency(yearTotal)}</p>
            <p className="text-[9px] opacity-80">本年</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatCurrency(totalAll)}</p>
            <p className="text-[9px] opacity-80">累计</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatCurrency(recurringTotal)}</p>
            <p className="text-[9px] opacity-80">固定</p>
          </div>
        </div>
      </div>

      {pets.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {pets.map((p) => (
            <button key={p.id} onClick={() => setCurrentPet(p.id)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0 flex items-center gap-1', currentPet === p.id ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              <span>{p.emoji}</span>{p.name}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-semibold mb-1.5">近 6 月</p>
        <div className="flex items-end justify-between h-16 gap-1">
          {last6.map((m) => {
            const pct = (m.amount / maxMonth) * 100
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full h-12 flex flex-col justify-end">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${pct}%` }} className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-teal-500" />
                </div>
                <p className="text-[9px] text-ink-500">{m.month.slice(5)}月</p>
                <p className="text-[9px] font-bold">¥{m.amount > 0 ? Math.round(m.amount) : '-'}</p>
              </div>
            )
          })}
        </div>
      </div>

      {Object.keys(byType).length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-xs font-semibold mb-1.5">分类占比</p>
          <div className="space-y-1">
            {(Object.entries(byType) as [keyof typeof TYPE_META, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([k, v]) => {
                const T = TYPE_META[k]
                const pct = (v / totalAll) * 100
                return (
                  <div key={k} className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-14 truncate font-semibold">{T.label}</span>
                    <div className="flex-1 h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                      <div className={cn('h-full bg-gradient-to-r', T.color)} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-ink-500 w-16 text-right">¥{Math.round(v)} · {pct.toFixed(0)}%</span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />记一笔
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
        <button onClick={() => setFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'all' ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === k ? `bg-gradient-to-r ${TYPE_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {TYPE_META[k].label}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有记录</p>
          </div>
        ) : filtered.slice(0, 30).map((e) => {
          const TM = TYPE_META[e.type]
          const Icon = typeof TM.icon === 'string' ? null : TM.icon
          return (
            <motion.div key={e.id} whileHover={{ y: -1 }} className="rounded-xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', TM.color)}>
                {Icon && typeof Icon === 'function' ? <Icon className="w-3.5 h-3.5" /> : <span className="text-sm">{String(TM.icon)}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{e.item}</p>
                <p className="text-[10px] text-ink-500">{e.vendor} · {e.date}</p>
              </div>
              <p className="text-sm font-bold">¥{e.amount}</p>
              <button onClick={() => remove(e.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">记一笔</h3>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">类别</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                  const T = TYPE_META[k]
                  return (
                    <button key={k} onClick={() => setType(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', type === k ? `bg-gradient-to-br ${T.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      {typeof T.icon === 'string' ? <span className="text-base">{T.icon}</span> : <T.icon className="w-3.5 h-3.5" />}
                      <span className="text-[9px]">{T.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <input value={item} onChange={(e) => setItem(e.target.value)} placeholder="物品/服务名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="金额" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="商家 (京东/宠物店)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} className="rounded" />固定支出 (如月费)
            </label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[50px]" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">记录</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
