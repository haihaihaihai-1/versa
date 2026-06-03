import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Stethoscope, Plus, Trash2, Sparkles, Loader2, Pill, Syringe, AlertCircle, Check, Calendar, Heart, Activity, Shield, FileText } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface HealthRecord {
  id: string
  petId: string
  type: 'vaccine' | 'checkup' | 'medication' | 'surgery' | 'dental' | 'parasite' | 'other'
  title: string
  date: string
  nextDate: string
  vet: string
  cost: number
  notes: string
  reminder: boolean
  completed: boolean
}

const STORAGE_KEY = 'versa:pet-health-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }
function daysFromNow(date: string) { return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000) }

function load(): HealthRecord[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: HealthRecord[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): HealthRecord[] {
  const today = todayKey()
  return [
    { id: '1', petId: '1', type: 'vaccine', title: '狂犬疫苗', date: new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0], nextDate: new Date(Date.now() + 185 * 86400000).toISOString().split('T')[0], vet: '王医生', cost: 120, notes: '无不良反应', reminder: true, completed: true },
    { id: '2', petId: '1', type: 'parasite', title: '体内驱虫', date: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0], nextDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], vet: '王医生', cost: 80, notes: '', reminder: true, completed: true },
    { id: '3', petId: '2', type: 'vaccine', title: '三联疫苗', date: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0], nextDate: new Date(Date.now() + 275 * 86400000).toISOString().split('T')[0], vet: '李医生', cost: 100, notes: '', reminder: true, completed: true },
    { id: '4', petId: '1', type: 'checkup', title: '年度体检', date: today, nextDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0], vet: '王医生', cost: 300, notes: '下次年检', reminder: true, completed: false },
  ]
}

const TYPE_META = {
  vaccine: { label: '疫苗', icon: Shield, color: 'from-blue-500 to-cyan-500' },
  checkup: { label: '体检', icon: Stethoscope, color: 'from-emerald-500 to-teal-500' },
  medication: { label: '用药', icon: Pill, color: 'from-orange-500 to-amber-500' },
  surgery: { label: '手术', icon: Activity, color: 'from-rose-500 to-red-500' },
  dental: { label: '口腔', icon: '🦷', color: 'from-violet-500 to-purple-500' },
  parasite: { label: '驱虫', icon: '🪱', color: 'from-yellow-500 to-orange-500' },
  other: { label: '其他', icon: FileText, color: 'from-ink-500 to-ink-600' },
} as const

export function PetHealthTracker() {
  const [records, setRecords] = useState<HealthRecord[]>(load())
  const [pets, setPets] = useState<{ id: string; name: string; emoji: string }[]>([])
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'done' | 'overdue'>('upcoming')
  const [currentPet, setCurrentPet] = useState<string>('')
  const [type, setType] = useState<HealthRecord['type']>('vaccine')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayKey())
  const [nextDate, setNextDate] = useState('')
  const [vet, setVet] = useState('')
  const [cost, setCost] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    save(records)
    try {
      const p = JSON.parse(localStorage.getItem('versa:pets-v1') || '[]')
      setPets(p.map((x: any) => ({ id: x.id, name: x.name, emoji: x.emoji })))
      if (p.length > 0 && !currentPet) setCurrentPet(p[0].id)
    } catch {}
  }, [records])

  const today = todayKey()
  const filtered = records.filter((r) => {
    if (currentPet && r.petId !== currentPet) return false
    if (filter === 'upcoming') return daysFromNow(r.nextDate) >= 0 && daysFromNow(r.nextDate) <= 30
    if (filter === 'done') return r.completed
    if (filter === 'overdue') return daysFromNow(r.nextDate) < 0 && !r.completed
    return true
  })

  const totalRecords = records.length
  const upcoming = records.filter((r) => daysFromNow(r.nextDate) >= 0 && daysFromNow(r.nextDate) <= 30).length
  const overdue = records.filter((r) => daysFromNow(r.nextDate) < 0 && !r.completed).length
  const totalCost = records.reduce((s, r) => s + r.cost, 0)

  const add = () => {
    if (!title.trim() || !currentPet) { toast('请填写', 'error'); return }
    const r: HealthRecord = { id: uid(), petId: currentPet, type, title, date, nextDate, vet, cost: +cost || 0, notes, reminder: true, completed: true }
    setRecords([r, ...records])
    setTitle(''); setVet(''); setCost(''); setNotes(''); setNextDate('')
    setAdding(false)
    toast('已记录', 'success')
  }

  const remove = (id: string) => setRecords(records.filter((r) => r.id !== id))
  const toggleComplete = (id: string) => setRecords(records.map((r) => r.id === id ? { ...r, completed: !r.completed } : r))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = records.slice(0, 5).map((r) => `${r.title} (${r.date})`).join('、')
      const result = await aiComplete(`宠物医疗记录: ${summary}. 给出 1 段 60 字内健康提醒, 中文`, '你是 Versa 兽医顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope className="w-5 h-5" />
          <h2 className="text-lg font-bold">健康管理</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">疫苗 · 体检 · 用药 · 提醒</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalRecords}</p>
            <p className="text-[9px] opacity-80">总记录</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-amber-100">{upcoming}</p>
            <p className="text-[9px] opacity-80">将到期</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{overdue}</p>
            <p className="text-[9px] opacity-80">逾期</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{totalCost}</p>
            <p className="text-[9px] opacity-80">总花费</p>
          </div>
        </div>
      </div>

      {pets.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCurrentPet('')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', !currentPet ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
          {pets.map((p) => (
            <button key={p.id} onClick={() => setCurrentPet(p.id)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0 flex items-center gap-1', currentPet === p.id ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              <span>{p.emoji}</span>{p.name}
            </button>
          ))}
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
        {(['upcoming', 'overdue', 'done', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'upcoming' ? '📅 即将' : f === 'overdue' ? '⚠️ 逾期' : f === 'done' ? '✓ 已完' : '全部'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Stethoscope className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有记录</p>
          </div>
        ) : filtered.map((r) => {
          const TM = TYPE_META[r.type]
          const Icon = typeof TM.icon === 'string' ? null : TM.icon
          const days = daysFromNow(r.nextDate)
          const isOverdue = days < 0 && !r.completed
          const isUrgent = days >= 0 && days <= 7
          const pet = pets.find((p) => p.id === r.petId)
          return (
            <motion.div key={r.id} whileHover={{ y: -1 }} className={cn('rounded-2xl p-2 border flex items-center gap-2', isOverdue ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-900/20' : isUrgent ? 'border-amber-400' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', TM.color)}>
                {Icon && typeof Icon === 'function' ? <Icon className="w-4 h-4" /> : <span className="text-base">{String(TM.icon)}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold truncate">{r.title}</p>
                  {pet && <span className="text-[10px]">{pet.emoji}</span>}
                </div>
                <p className="text-[10px] text-ink-500">{TM.label} · 📅 {r.date}{r.vet && ` · ${r.vet}`}</p>
              </div>
              <div className="text-right">
                <p className={cn('text-[10px] font-bold', isOverdue ? 'text-rose-500' : isUrgent ? 'text-amber-500' : 'text-ink-500')}>
                  {days === 0 ? '今天' : days > 0 ? `${days}天` : `${-days}天前`}
                </p>
                {r.cost > 0 && <p className="text-[9px] text-ink-400">¥{r.cost}</p>}
              </div>
              <button onClick={() => remove(r.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">健康记录</h3>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">类型</p>
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
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="项目 (如 狂犬疫苗)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} placeholder="下次" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={vet} onChange={(e) => setVet(e.target.value)} placeholder="医生" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="费用" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[50px]" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">记录</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
