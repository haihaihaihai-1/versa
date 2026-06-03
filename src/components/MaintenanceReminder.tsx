import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wrench, Plus, Trash2, Check, Clock, AlertTriangle, Calendar, DollarSign, RotateCw, Settings, CircleDot, Droplet } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Task {
  id: string
  name: string
  category: 'oil' | 'tire' | 'brake' | 'battery' | 'filter' | 'inspection' | 'clean' | 'other'
  intervalKm: number
  intervalMonths: number
  lastKm: number
  lastDate: string
  cost: number
  note: string
  done: boolean
}

const CAT_META = {
  oil: { label: '机油', icon: Droplet, color: 'from-amber-500 to-orange-500' },
  tire: { label: '轮胎', icon: CircleDot, color: 'from-slate-500 to-zinc-600' },
  brake: { label: '刹车', icon: AlertTriangle, color: 'from-red-500 to-rose-500' },
  battery: { label: '电池', icon: Settings, color: 'from-yellow-500 to-amber-500' },
  filter: { label: '滤芯', icon: RotateCw, color: 'from-cyan-500 to-blue-500' },
  inspection: { label: '年检', icon: Check, color: 'from-emerald-500 to-green-500' },
  clean: { label: '清洁', icon: Settings, color: 'from-violet-500 to-purple-500' },
  other: { label: '其他', icon: Wrench, color: 'from-zinc-500 to-zinc-600' },
} as const

const STORAGE_KEY = 'versa:car-maintenance-v1'

function load(): Task[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Task[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Task[] {
  return [
    { id: '1', name: '更换机油 + 机油滤', category: 'oil', intervalKm: 5000, intervalMonths: 6, lastKm: 10000, lastDate: '2025-12-15', cost: 480, note: '全合成 5W-30', done: false },
    { id: '2', name: '空调滤清器', category: 'filter', intervalKm: 10000, intervalMonths: 12, lastKm: 8000, lastDate: '2025-08-20', cost: 80, note: '活性炭滤', done: false },
    { id: '3', name: '空气滤清器', category: 'filter', intervalKm: 20000, intervalMonths: 24, lastKm: 5000, lastDate: '2024-10-10', cost: 60, note: '', done: false },
    { id: '4', name: '轮胎换位', category: 'tire', intervalKm: 10000, intervalMonths: 12, lastKm: 9000, lastDate: '2025-11-05', cost: 100, note: '前后互换', done: false },
    { id: '5', name: '刹车片检查', category: 'brake', intervalKm: 20000, intervalMonths: 24, lastKm: 0, lastDate: '', cost: 200, note: '前片磨损快', done: false },
    { id: '6', name: '电瓶检测', category: 'battery', intervalKm: 30000, intervalMonths: 36, lastKm: 0, lastDate: '2024-06-01', cost: 0, note: '原厂电瓶', done: true },
    { id: '7', name: '年检', category: 'inspection', intervalKm: 0, intervalMonths: 24, lastKm: 0, lastDate: '2024-09-20', cost: 500, note: '上线检测', done: false },
  ]
}

export function MaintenanceReminder() {
  const [list, setList] = useState<Task[]>(load())
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<keyof typeof CAT_META | 'all' | 'urgent'>('all')
  const [draft, setDraft] = useState<Omit<Task, 'id' | 'done'>>({ name: '', category: 'oil', intervalKm: 5000, intervalMonths: 6, lastKm: 0, lastDate: new Date().toISOString().slice(0, 10), cost: 0, note: '' })

  useEffect(() => { save(list) }, [list])

  const today = new Date()
  const enriched = list.map((t) => {
    const monthsSince = t.lastDate ? (today.getFullYear() - new Date(t.lastDate).getFullYear()) * 12 + today.getMonth() - new Date(t.lastDate).getMonth() : 0
    const kmProgress = t.intervalKm > 0 ? (12500 - t.lastKm) / t.intervalKm : 0
    const monthProgress = t.intervalMonths > 0 ? monthsSince / t.intervalMonths : 0
    const progress = Math.max(kmProgress, monthProgress)
    const urgent = progress >= 0.9
    return { ...t, progress, urgent, monthsSince }
  })

  const filtered = filter === 'all' ? enriched : filter === 'urgent' ? enriched.filter((t) => t.urgent && !t.done) : enriched.filter((t) => t.category === filter)
  const urgentCount = enriched.filter((t) => t.urgent && !t.done).length
  const totalCost = list.reduce((s, t) => s + t.cost, 0)

  const add = () => {
    if (!draft.name) { toast('请填写名称', 'error'); return }
    setList([{ id: uid(), done: false, ...draft }, ...list])
    setShowForm(false)
    setDraft({ ...draft, name: '', cost: 0, note: '' })
    toast('已添加', 'success')
  }

  const toggleDone = (id: string) => setList(list.map((t) => t.id === id ? { ...t, done: !t.done } : t))
  const del = (id: string) => { setList(list.filter((t) => t.id !== id)); toast('已删除', 'success') }
  const reset = (id: string) => {
    setList(list.map((t) => t.id === id ? { ...t, lastKm: 12500, lastDate: new Date().toISOString().slice(0, 10), done: false } : t))
    toast('已重置周期', 'success')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="w-5 h-5" />
          <h2 className="text-lg font-bold">保养提醒</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">按里程/时间双维度 · 8 类保养</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{list.length}</p><p className="text-[9px] opacity-80">项目</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{urgentCount}</p><p className="text-[9px] opacity-80">即将</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{list.filter((t) => t.done).length}</p><p className="text-[9px] opacity-80">已完成</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">¥{totalCost}</p><p className="text-[9px] opacity-80">累计</p></div>
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '添加项目'}
      </button>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="项目名称 (如: 更换火花塞)" className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <div className="grid grid-cols-4 gap-1">
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
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">里程周期 (km, 0=不限)</div>
              <input type="number" value={draft.intervalKm} onChange={(e) => setDraft({ ...draft, intervalKm: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">时间周期 (月)</div>
              <input type="number" value={draft.intervalMonths} onChange={(e) => setDraft({ ...draft, intervalMonths: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">上次里程</div>
              <input type="number" value={draft.lastKm} onChange={(e) => setDraft({ ...draft, lastKm: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">上次日期</div>
              <input type="date" value={draft.lastDate} onChange={(e) => setDraft({ ...draft, lastDate: e.target.value })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div className="col-span-2">
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">费用 (¥)</div>
              <input type="number" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
          </div>
          <button onClick={add} className="w-full h-9 rounded-lg bg-amber-500 text-white text-xs font-semibold">保存</button>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['all', 'urgent', ...Object.keys(CAT_META)] as const).map((c) => (
          <button key={c} onClick={() => setFilter(c as any)} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0', filter === c ? 'bg-amber-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
            {c === 'all' ? '全部' : c === 'urgent' ? '⚠️ 即将' : CAT_META[c as keyof typeof CAT_META].label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.map((t) => {
          const Icon = CAT_META[t.category].icon
          return (
            <div key={t.id} className={cn('p-2.5 rounded-xl border', t.done ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-200/40 opacity-70' : t.urgent ? 'bg-rose-50/40 dark:bg-rose-900/10 border-rose-300/60' : 'bg-white/60 dark:bg-ink-900/40 border-ink-200/40 dark:border-ink-800/40')}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 flex-1">
                  <div className={cn('w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br text-white', CAT_META[t.category].color)}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className={cn('text-xs font-bold text-ink-800 dark:text-ink-200', t.done && 'line-through')}>{t.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleDone(t.id)} className={cn('w-6 h-6 rounded flex items-center justify-center', t.done ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}><Check className="w-3 h-3" /></button>
                  <button onClick={() => reset(t.id)} className="w-6 h-6 rounded bg-ink-100 dark:bg-ink-800 text-ink-400 flex items-center justify-center"><RotateCw className="w-3 h-3" /></button>
                  <button onClick={() => del(t.id)} className="w-6 h-6 rounded bg-ink-100 dark:bg-ink-800 text-ink-400 hover:text-rose-500 flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              {(t.intervalKm > 0 || t.intervalMonths > 0) && (
                <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden mb-1">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, t.progress * 100)}%` }} className={cn('h-full', t.urgent ? 'bg-gradient-to-r from-rose-500 to-red-500' : 'bg-gradient-to-r from-amber-400 to-orange-500')} />
                </div>
              )}
              <div className="grid grid-cols-3 gap-1 text-[10px] text-ink-600 dark:text-ink-300">
                {t.intervalKm > 0 && <div>每 {t.intervalKm}km</div>}
                {t.intervalMonths > 0 && <div>每 {t.intervalMonths}月</div>}
                <div className="font-mono font-bold text-emerald-500">¥{t.cost}</div>
              </div>
              {t.lastDate && <p className="text-[10px] text-ink-500 mt-1">上次: {t.lastDate} @ {t.lastKm}km ({t.monthsSince}月前)</p>}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <Wrench className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>暂无保养项目</p>
        </div>
      )}
    </div>
  )
}
