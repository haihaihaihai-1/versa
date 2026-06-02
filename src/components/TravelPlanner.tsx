import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plane, MapPin, Calendar, DollarSign, Plus, Trash2, Sparkles, Loader2, Sun, Cloud, CloudRain, CloudSnow, Wind, Compass, Hotel, Camera, Utensils, ShoppingBag, Mountain } from 'lucide-react'
import { cn, uid, formatCurrency } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface ItineraryItem {
  id: string
  day: number
  time: string
  type: 'flight' | 'hotel' | 'food' | 'sight' | 'shopping' | 'transport'
  title: string
  location: string
  cost: number
  notes?: string
  weather?: 'sun' | 'cloud' | 'rain' | 'snow'
}

interface Trip {
  id: string
  name: string
  destination: string
  cover: string
  startDate: string
  endDate: string
  budget: number
  spent: number
  items: ItineraryItem[]
  status: 'planning' | 'active' | 'completed'
}

const STORAGE_KEY = 'versa:trips'

function load(): Trip[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 't1', name: '京都赏樱 5 日游', destination: '日本 京都', cover: 'https://picsum.photos/seed/kyoto/600/400', startDate: '2026-04-01', endDate: '2026-04-05', budget: 12000, spent: 8450, status: 'planning', items: [
      { id: 'i1', day: 1, time: '08:00', type: 'flight', title: '上海 → 大阪', location: '关西机场', cost: 2500 },
      { id: 'i2', day: 1, time: '14:00', type: 'transport', title: '机场 → 京都', location: 'JR 京都站', cost: 200 },
      { id: 'i3', day: 1, time: '16:00', type: 'hotel', title: '入住京都酒店', location: '祇园', cost: 1200 },
      { id: 'i4', day: 2, time: '09:00', type: 'sight', title: '清水寺赏樱', location: '东山', cost: 0, weather: 'sun' },
      { id: 'i5', day: 2, time: '12:00', type: 'food', title: '豆腐料理', location: '清水寺附近', cost: 150 },
      { id: 'i6', day: 3, time: '10:00', type: 'sight', title: '岚山竹林', location: '岚山', cost: 0, weather: 'cloud' },
      { id: 'i7', day: 4, time: '14:00', type: 'shopping', title: '锦市场', location: '四条', cost: 800 },
    ] },
    { id: 't2', name: '东京美食 7 日', destination: '日本 东京', cover: 'https://picsum.photos/seed/tokyo/600/400', startDate: '2026-05-15', endDate: '2026-05-22', budget: 18000, spent: 3200, status: 'planning', items: [] },
  ]
}
function save(d: Trip[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const TYPE_META = {
  flight: { label: '航班', icon: Plane, color: 'from-blue-500 to-cyan-500' },
  hotel: { label: '酒店', icon: Hotel, color: 'from-violet-500 to-purple-500' },
  food: { label: '美食', icon: Utensils, color: 'from-orange-500 to-rose-500' },
  sight: { label: '景点', icon: Camera, color: 'from-emerald-500 to-teal-500' },
  shopping: { label: '购物', icon: ShoppingBag, color: 'from-pink-500 to-rose-500' },
  transport: { label: '交通', icon: Compass, color: 'from-amber-500 to-orange-500' },
} as const

const WEATHER_META = {
  sun: { label: '晴', icon: Sun, color: 'text-amber-500' },
  cloud: { label: '多云', icon: Cloud, color: 'text-ink-500' },
  rain: { label: '雨', icon: CloudRain, color: 'text-blue-500' },
  snow: { label: '雪', icon: CloudSnow, color: 'text-cyan-500' },
} as const

export function TravelPlanner() {
  const [trips, setTrips] = useState<Trip[]>(load())
  const [activeId, setActiveId] = useState<string | null>(trips[0]?.id ?? null)
  const [adding, setAdding] = useState(false)
  const [aiPlan, setAiPlan] = useState('')
  const [loading, setLoading] = useState(false)
  const [newType, setNewType] = useState<ItineraryItem['type']>('sight')
  const [newTitle, setNewTitle] = useState('')
  const [newDay, setNewDay] = useState(1)
  const [newTime, setNewTime] = useState('10:00')
  const [newCost, setNewCost] = useState('0')

  useEffect(() => { save(trips) }, [trips])

  const active = trips.find((t) => t.id === activeId) || trips[0]

  const totalDays = active ? Math.ceil((new Date(active.endDate).getTime() - new Date(active.startDate).getTime()) / 86400000) + 1 : 0

  const addItem = () => {
    if (!active || !newTitle.trim()) { toast('请填写标题', 'error'); return }
    const item: ItineraryItem = { id: uid(), day: newDay, time: newTime, type: newType, title: newTitle, location: '', cost: +newCost }
    setTrips(trips.map((t) => t.id === active.id ? { ...t, items: [...t.items, item].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time)), spent: t.spent + item.cost } : t))
    setNewTitle(''); setNewCost('0'); setAdding(false)
    toast('已添加', 'success')
  }

  const removeItem = (id: string) => {
    if (!active) return
    setTrips(trips.map((t) => t.id === active.id ? { ...t, items: t.items.filter((i) => i.id !== id) } : t))
  }

  const runAI = async () => {
    if (!isAIEnabled() || !active) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`为 ${active.destination} ${totalDays} 日游推荐 5 个必去景点 + 美食 (60-100 字)`, '你是 Versa 旅行规划师, 简洁实用, 中文')
      setAiPlan(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  if (!active) {
    return <div className="text-center py-8 text-ink-500">还没有旅行计划</div>
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden">
        <img src={active.cover} alt={active.destination} className="w-full h-32 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3 text-white">
          <p className="text-xs opacity-80 flex items-center gap-1"><MapPin className="w-3 h-3" />{active.destination}</p>
          <h2 className="text-lg font-bold">{active.name}</h2>
        </div>
        <div className="absolute top-2 right-2 flex gap-1">
          {trips.map((t) => (
            <button key={t.id} onClick={() => setActiveId(t.id)} className={cn('w-2 h-2 rounded-full', t.id === active.id ? 'bg-white' : 'bg-white/40')} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2.5 border border-ink-200/60 dark:border-ink-800/60 text-center">
          <p className="text-[10px] text-ink-500">天数</p>
          <p className="text-lg font-bold">{totalDays}</p>
        </div>
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2.5 border border-ink-200/60 dark:border-ink-800/60 text-center">
          <p className="text-[10px] text-ink-500">预算</p>
          <p className="text-lg font-bold text-blue-500">¥{active.budget}</p>
        </div>
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2.5 border border-ink-200/60 dark:border-ink-800/60 text-center">
          <p className="text-[10px] text-ink-500">已花</p>
          <p className="text-lg font-bold text-rose-500">¥{active.spent}</p>
        </div>
      </div>

      <div className="h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (active.spent / active.budget) * 100)}%` }} className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加行程
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 行程
        </button>
      </div>

      {aiPlan && (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl p-3 border border-cyan-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-cyan-500"><Sparkles className="w-3.5 h-3.5" />AI 推荐</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiPlan}</p>
        </div>
      )}

      <div className="space-y-1.5">
        {Array.from({ length: totalDays }).map((_, i) => {
          const day = i + 1
          const dayItems = active.items.filter((it) => it.day === day)
          if (dayItems.length === 0) return null
          return (
            <div key={day}>
              <p className="text-xs font-bold mb-1 text-ink-500">Day {day}</p>
              <div className="space-y-1.5">
                {dayItems.map((it) => {
                  const Meta = TYPE_META[it.type]
                  const Icon = Meta.icon
                  return (
                    <div key={it.id} className="flex items-center gap-2 p-2 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', Meta.color)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{it.title}</p>
                        <p className="text-[10px] text-ink-500">{it.time} · {it.location || Meta.label}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold">{it.cost > 0 ? `¥${it.cost}` : '免费'}</p>
                        {it.weather && <p className={cn('text-[9px]', WEATHER_META[it.weather].color)}>{it.weather === 'sun' ? '☀' : it.weather === 'cloud' ? '☁' : it.weather === 'rain' ? '☂' : '❄'} {WEATHER_META[it.weather].label}</p>}
                      </div>
                      <button onClick={() => removeItem(it.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <h3 className="font-bold">添加行程</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                const M = TYPE_META[k]
                const Icon = M.icon
                return (
                  <button key={k} onClick={() => setNewType(k)} className={cn('h-12 rounded-xl flex flex-col items-center justify-center gap-0.5', newType === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-semibold">{M.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <select value={newDay} onChange={(e) => setNewDay(+e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs">
                {Array.from({ length: totalDays }).map((_, i) => <option key={i} value={i + 1}>Day {i + 1}</option>)}
              </select>
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs" />
              <input type="number" value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="花费" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs" />
            </div>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
            <button onClick={addItem} className="w-full h-9 rounded-lg bg-cyan-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
