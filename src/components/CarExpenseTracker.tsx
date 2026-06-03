import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { DollarSign, Plus, Trash2, TrendingUp, Fuel, Wrench, Shield, FileText, ParkingCircle, Calendar, BarChart3, PieChart as PieIcon, Calculator } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Expense {
  id: string
  date: string
  category: 'fuel' | 'maintenance' | 'insurance' | 'parking' | 'toll' | 'fine' | 'wash' | 'tax' | 'other'
  amount: number
  odometer: number
  note: string
}

const CAT_META = {
  fuel: { label: '油费', icon: Fuel, color: 'from-rose-500 to-pink-500' },
  maintenance: { label: '保养', icon: Wrench, color: 'from-amber-500 to-orange-500' },
  insurance: { label: '保险', icon: Shield, color: 'from-blue-500 to-indigo-500' },
  parking: { label: '停车', icon: ParkingCircle, color: 'from-cyan-500 to-blue-500' },
  toll: { label: '过路', icon: Calculator, color: 'from-violet-500 to-purple-500' },
  fine: { label: '罚款', icon: FileText, color: 'from-red-500 to-rose-500' },
  wash: { label: '洗车', icon: Calculator, color: 'from-sky-500 to-cyan-500' },
  tax: { label: '税费', icon: FileText, color: 'from-emerald-500 to-green-500' },
  other: { label: '其他', icon: DollarSign, color: 'from-zinc-500 to-zinc-600' },
} as const

const STORAGE_KEY = 'versa:car-expense-v1'

function load(): Expense[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Expense[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Expense[] {
  return [
    { id: '1', date: '2026-05-28', category: 'fuel', amount: 335, odometer: 12500, note: '42.5L × 7.89' },
    { id: '2', date: '2026-05-15', category: 'fuel', amount: 298, odometer: 12180, note: '38.2L × 7.79' },
    { id: '3', date: '2026-05-10', category: 'parking', amount: 30, odometer: 12100, note: '商场 4h' },
    { id: '4', date: '2026-05-05', category: 'toll', amount: 45, odometer: 12050, note: '高速 ETC' },
    { id: '5', date: '2026-04-28', category: 'wash', amount: 50, odometer: 12000, note: '人工内外' },
    { id: '6', date: '2026-04-15', category: 'maintenance', amount: 480, odometer: 11800, note: '机油机滤' },
    { id: '7', date: '2026-04-01', category: 'insurance', amount: 3500, odometer: 11500, note: '交强 + 三者' },
  ]
}

export function CarExpenseTracker() {
  const [list, setList] = useState<Expense[]>(load())
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<keyof typeof CAT_META | 'all' | 'month'>('all')
  const [draft, setDraft] = useState<Omit<Expense, 'id'>>({ date: new Date().toISOString().slice(0, 10), category: 'fuel', amount: 0, odometer: 0, note: '' })

  useEffect(() => { save(list) }, [list])

  const today = new Date()
  const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
  const thisMonth = list.filter((e) => new Date(e.date) >= monthAgo)

  const filtered = useMemo(() => {
    if (filter === 'month') return thisMonth
    if (filter === 'all') return list
    return list.filter((e) => e.category === filter)
  }, [list, filter, thisMonth])

  const total = filtered.reduce((s, e) => s + e.amount, 0)
  const monthTotal = thisMonth.reduce((s, e) => s + e.amount, 0)
  const avgPerMonth = monthTotal

  const byCat = useMemo(() => {
    const map = new Map<string, number>()
    list.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + e.amount))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [list])
  const top = byCat[0]
  const topColor = top ? CAT_META[top[0] as keyof typeof CAT_META].color : 'from-ink-500 to-ink-600'

  const add = () => {
    if (draft.amount <= 0) { toast('请填写金额', 'error'); return }
    setList([{ id: uid(), ...draft }, ...list])
    setShowForm(false)
    setDraft({ ...draft, amount: 0, note: '' })
    toast('已添加', 'success')
  }
  const del = (id: string) => { setList(list.filter((e) => e.id !== id)); toast('已删除', 'success') }

  const recent6 = [...list].sort((a, b) => a.date.localeCompare(b.date)).slice(-6)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-5 h-5" />
          <h2 className="text-lg font-bold">车辆开销</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">9 类支出 · 月度统计 · 占比分析</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">¥{list.reduce((s, e) => s + e.amount, 0).toFixed(0)}</p><p className="text-[9px] opacity-80">总开销</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">¥{monthTotal.toFixed(0)}</p><p className="text-[9px] opacity-80">本月</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{list.length}</p><p className="text-[9px] opacity-80">笔数</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{byCat.length}</p><p className="text-[9px] opacity-80">类别</p></div>
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '记一笔'}
      </button>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <input type="number" step="0.01" value={draft.amount || ''} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} placeholder="金额" className="h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          </div>
          <div className="grid grid-cols-5 gap-1">
            {(Object.keys(CAT_META) as (keyof typeof CAT_META)[]).map((c) => {
              const Icon = CAT_META[c].icon
              return (
                <button key={c} onClick={() => setDraft({ ...draft, category: c })} className={cn('h-9 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[9px]', draft.category === c ? `bg-gradient-to-br ${CAT_META[c].color} text-white` : 'bg-ink-50 dark:bg-ink-800 text-ink-600')}>
                  <Icon className="w-3 h-3" />{CAT_META[c].label}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <input type="number" value={draft.odometer} onChange={(e) => setDraft({ ...draft, odometer: Number(e.target.value) })} placeholder="里程 (km)" className="h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="备注" className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          </div>
          <button onClick={add} className="w-full h-9 rounded-lg bg-emerald-500 text-white text-xs font-semibold">保存</button>
        </div>
      )}

      {top && (
        <div className={cn('rounded-2xl p-2.5 text-white bg-gradient-to-br', topColor)}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] opacity-90">最大开销</p>
              <p className="text-base font-bold">{CAT_META[top[0] as keyof typeof CAT_META].label} ¥{top[1].toFixed(0)}</p>
              <p className="text-[9px] opacity-80">占 {((top[1] / list.reduce((s, e) => s + e.amount, 0)) * 100).toFixed(0)}%</p>
            </div>
            <PieIcon className="w-8 h-8 opacity-30" />
          </div>
        </div>
      )}

      {recent6.length > 1 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" />月度趋势</div>
          <div className="flex items-end gap-1 h-16">
            {recent6.map((e, i) => {
              const h = Math.min(100, (e.amount / Math.max(...recent6.map((x) => x.amount))) * 100)
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-green-400" />
                  <span className="text-[8px] text-ink-500">¥{e.amount.toFixed(0)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['all', 'month', ...Object.keys(CAT_META)] as const).map((c) => (
          <button key={c} onClick={() => setFilter(c as any)} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0', filter === c ? 'bg-emerald-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
            {c === 'all' ? '全部' : c === 'month' ? '📅 本月' : CAT_META[c as keyof typeof CAT_META].label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.map((e) => {
          const meta = CAT_META[e.category]
          const Icon = meta.icon
          return (
            <div key={e.id} className="p-2.5 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 dark:border-ink-800/40">
              <div className="flex items-center gap-1.5">
                <div className={cn('w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br text-white', meta.color)}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-ink-800 dark:text-ink-200">{meta.label}</p>
                  <p className="text-[10px] text-ink-500 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{e.date} {e.odometer > 0 && `· ${e.odometer}km`}</p>
                </div>
                <p className="text-base font-mono font-bold text-emerald-500">¥{e.amount}</p>
                <button onClick={() => del(e.id)} className="text-ink-300 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
              </div>
              {e.note && <p className="text-[10px] text-ink-500 mt-1 ml-7">💬 {e.note}</p>}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>暂无开销记录</p>
        </div>
      )}
    </div>
  )
}
