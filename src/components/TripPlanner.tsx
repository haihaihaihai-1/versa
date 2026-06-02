import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Map, Plus, Trash2, Sparkles, Loader2, MapPin, Calendar, Clock, ChevronDown, ChevronUp, Plane, Hotel, Utensils, Camera, ShoppingBag, Mountain, Ticket } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Activity {
  id: string
  time: string
  title: string
  type: 'flight' | 'hotel' | 'food' | 'sight' | 'shop' | 'other'
  location: string
  cost: number
  notes: string
  done: boolean
}

interface Trip {
  id: string
  destination: string
  startDate: string
  endDate: string
  budget: number
  currency: string
  activities: Activity[]
  cover: string
}

const STORAGE_KEY = 'versa:trips-v1'

function load(): Trip[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Trip[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Trip[] {
  return [
    {
      id: 't1', destination: '京都', startDate: '2026-09-10', endDate: '2026-09-15', budget: 15000, currency: 'CNY', cover: 'https://picsum.photos/seed/kyoto/600/300',
      activities: [
        { id: uid(), time: '08:00', title: '上海 → 京都', type: 'flight', location: '关西机场 KIX', cost: 2500, notes: 'NH 952', done: false },
        { id: uid(), time: '14:00', title: '入住旅馆', type: 'hotel', location: '祇园', cost: 800, notes: '3 晚', done: false },
        { id: uid(), time: '17:00', title: '清水寺', type: 'sight', location: '东山', cost: 400, notes: '夕阳', done: false },
        { id: uid(), time: '19:30', title: '怀石料理', type: 'food', location: '先斗町', cost: 1200, notes: '预约 19:00', done: false },
      ],
    },
    {
      id: 't2', destination: '清迈', startDate: '2026-11-20', endDate: '2026-11-25', budget: 8000, currency: 'CNY', cover: 'https://picsum.photos/seed/chiangmai/600/300',
      activities: [
        { id: uid(), time: '09:00', title: '古城寺庙游', type: 'sight', location: '塔佩门', cost: 100, notes: '租摩托车', done: false },
      ],
    },
  ]
}

const TYPE_META = {
  flight: { label: '交通', icon: Plane, color: 'from-blue-500 to-cyan-500' },
  hotel: { label: '住宿', icon: Hotel, color: 'from-violet-500 to-purple-500' },
  food: { label: '餐饮', icon: Utensils, color: 'from-orange-500 to-amber-500' },
  sight: { label: '景点', icon: Camera, color: 'from-emerald-500 to-teal-500' },
  shop: { label: '购物', icon: ShoppingBag, color: 'from-pink-500 to-rose-500' },
  other: { label: '其他', icon: Ticket, color: 'from-ink-500 to-ink-600' },
} as const

export function TripPlanner() {
  const [trips, setTrips] = useState<Trip[]>(load())
  const [activeId, setActiveId] = useState<string | null>(trips[0]?.id || null)
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [addingAct, setAddingAct] = useState(false)
  const [actTime, setActTime] = useState('09:00')
  const [actTitle, setActTitle] = useState('')
  const [actType, setActType] = useState<Activity['type']>('sight')
  const [actLoc, setActLoc] = useState('')
  const [actCost, setActCost] = useState('')
  const [newDest, setNewDest] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [newBudget, setNewBudget] = useState('10000')

  useEffect(() => { save(trips) }, [trips])

  const active = trips.find((t) => t.id === activeId)
  const totalDays = active ? Math.ceil((new Date(active.endDate).getTime() - new Date(active.startDate).getTime()) / 86400000) + 1 : 0
  const totalCost = active?.activities.reduce((s, a) => s + a.cost, 0) || 0
  const doneCount = active?.activities.filter((a) => a.done).length || 0

  const addTrip = () => {
    if (!newDest.trim() || !newStart || !newEnd) { toast('请填写完整', 'error'); return }
    const t: Trip = { id: uid(), destination: newDest, startDate: newStart, endDate: newEnd, budget: +newBudget, currency: 'CNY', cover: `https://picsum.photos/seed/${Date.now()}/600/300`, activities: [] }
    setTrips([t, ...trips])
    setActiveId(t.id)
    setAdding(false)
    setNewDest(''); setNewStart(''); setNewEnd(''); setNewBudget('10000')
    toast('行程已创建', 'success')
  }

  const removeTrip = (id: string) => {
    setTrips(trips.filter((t) => t.id !== id))
    if (activeId === id) setActiveId(trips[0]?.id || null)
  }

  const addActivity = () => {
    if (!actTitle.trim() || !active) { toast('请填写', 'error'); return }
    const a: Activity = { id: uid(), time: actTime, title: actTitle, type: actType, location: actLoc, cost: +actCost || 0, notes: '', done: false }
    setTrips(trips.map((t) => t.id === active.id ? { ...t, activities: [...t.activities, a].sort((x, y) => x.time.localeCompare(y.time)) } : t))
    setActTitle(''); setActLoc(''); setActCost('')
    setAddingAct(false)
    toast('已添加', 'success')
  }

  const toggleAct = (actId: string) => {
    if (!active) return
    setTrips(trips.map((t) => t.id === active.id ? { ...t, activities: t.activities.map((a) => a.id === actId ? { ...a, done: !a.done } : a) } : t))
  }

  const removeAct = (actId: string) => {
    if (!active) return
    setTrips(trips.map((t) => t.id === active.id ? { ...t, activities: t.activities.filter((a) => a.id !== actId) } : t))
  }

  const runAI = async () => {
    if (!isAIEnabled() || !active) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`为 ${active.destination} 旅行 (${active.startDate} 至 ${active.endDate}, ${totalDays}天, 预算 ${active.budget} CNY) 推荐 5 个必玩景点, 中文, 每条 30 字`, '你是 Versa 旅行顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Map className="w-5 h-5" />
          <h2 className="text-lg font-bold">行程规划</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">多行程 · 每日活动 · 预算管理</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{trips.length}</p>
            <p className="text-[9px] opacity-80">行程</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalDays}</p>
            <p className="text-[9px] opacity-80">天数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{totalCost}</p>
            <p className="text-[9px] opacity-80">已花</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{doneCount}</p>
            <p className="text-[9px] opacity-80">已完成</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新建行程
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-blue-50/40 dark:bg-blue-900/20 rounded-xl p-2 border border-blue-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {trips.map((t) => (
          <button key={t.id} onClick={() => setActiveId(t.id)} className={cn('flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold', activeId === t.id ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {t.destination}
          </button>
        ))}
      </div>

      {active ? (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
          <div className="relative h-32">
            <img src={active.cover} alt={active.destination} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-white">
              <p className="text-lg font-bold flex items-center gap-1"><MapPin className="w-4 h-4" />{active.destination}</p>
              <p className="text-[10px] opacity-80">{active.startDate} ~ {active.endDate} · 预算 ¥{active.budget}</p>
            </div>
            <button onClick={() => removeTrip(active.id)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div className="p-2">
            <button onClick={() => setAddingAct(true)} className="w-full h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 text-xs font-semibold flex items-center justify-center gap-1">
              <Plus className="w-3.5 h-3.5" />添加活动
            </button>
            {active.activities.length === 0 ? (
              <p className="text-center text-xs text-ink-500 py-3">还没有活动</p>
            ) : (
              <div className="mt-1.5 space-y-1">
                {active.activities.map((a) => {
                  const M = TYPE_META[a.type]
                  const Icon = M.icon
                  return (
                    <div key={a.id} className={cn('flex items-center gap-1.5 p-1.5 rounded-lg', a.done ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-ink-50 dark:bg-ink-800/50')}>
                      <button onClick={() => toggleAct(a.id)} className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br text-white', M.color)}>
                        {a.done ? '✓' : <Icon className="w-3.5 h-3.5" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs font-semibold', a.done && 'line-through opacity-60')}>{a.time} · {a.title}</p>
                        <p className="text-[9px] text-ink-500">{a.location} {a.notes && `· ${a.notes}`}</p>
                      </div>
                      <span className="text-[10px] font-bold text-blue-500">¥{a.cost}</span>
                      <button onClick={() => removeAct(a.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-ink-500">
          <Map className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有行程</p>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">新建行程</h3>
            <input value={newDest} onChange={(e) => setNewDest(e.target.value)} placeholder="目的地" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-0.5">预算 (CNY)</p>
              <input type="number" value={newBudget} onChange={(e) => setNewBudget(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <button onClick={addTrip} className="w-full h-9 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold">创建</button>
          </motion.div>
        </div>
      )}

      {addingAct && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAddingAct(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">添加活动</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                const M = TYPE_META[k]
                return (
                  <button key={k} onClick={() => setActType(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', actType === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    <M.icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] mt-0.5">{M.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <input type="time" value={actTime} onChange={(e) => setActTime(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={actTitle} onChange={(e) => setActTitle(e.target.value)} placeholder="活动名" className="col-span-2 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <input value={actLoc} onChange={(e) => setActLoc(e.target.value)} placeholder="地点" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input type="number" value={actCost} onChange={(e) => setActCost(e.target.value)} placeholder="费用 (CNY)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={addActivity} className="w-full h-9 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
