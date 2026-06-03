import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Footprints, Plus, Trash2, Sparkles, Loader2, MapPin, Clock, Activity, Flame, Star, Calendar, Award, TrendingUp, Heart, Dog } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Walk {
  id: string
  petId: string
  date: string
  time: string
  duration: number
  distance: number
  location: string
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snow'
  mood: 1 | 2 | 3 | 4 | 5
  notes: string
}

const STORAGE_KEY = 'versa:pet-walks-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }

function load(): Walk[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Walk[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Walk[] {
  const today = todayKey()
  return [
    { id: '1', petId: '1', date: today, time: '07:00', duration: 30, distance: 2.5, location: '小区花园', weather: 'sunny', mood: 5, notes: '跑得很欢' },
    { id: '2', petId: '1', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], time: '19:00', duration: 45, distance: 3.2, location: '滨江步道', weather: 'cloudy', mood: 4, notes: '遇见了金毛' },
    { id: '3', petId: '1', date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], time: '07:30', duration: 20, distance: 1.5, location: '小区花园', weather: 'rainy', mood: 2, notes: '下雨很快回家' },
  ]
}

const WEATHER_META = {
  sunny: { label: '晴', emoji: '☀️' },
  cloudy: { label: '多云', emoji: '☁️' },
  rainy: { label: '雨', emoji: '🌧' },
  snow: { label: '雪', emoji: '❄️' },
} as const

function caloriesForWalk(duration: number, weight: number): number {
  return Math.round(duration * weight * 0.5)
}

export function WalkTracker() {
  const [walks, setWalks] = useState<Walk[]>(load())
  const [pets, setPets] = useState<{ id: string; name: string; emoji: string; weight: number }[]>([])
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentPet, setCurrentPet] = useState('')
  const [date, setDate] = useState(todayKey())
  const [time, setTime] = useState(() => {
    const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [duration, setDuration] = useState('30')
  const [distance, setDistance] = useState('2')
  const [location, setLocation] = useState('')
  const [weather, setWeather] = useState<Walk['weather']>('sunny')
  const [mood, setMood] = useState<Walk['mood']>(4)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    save(walks)
    try {
      const p = JSON.parse(localStorage.getItem('versa:pets-v1') || '[]')
      setPets(p.map((x: any) => ({ id: x.id, name: x.name, emoji: x.emoji, weight: x.weight || 5 })))
      if (p.length > 0 && !currentPet) setCurrentPet(p[0].id)
    } catch {}
  }, [walks])

  const today = todayKey()
  const petWalks = currentPet ? walks.filter((w) => w.petId === currentPet) : walks
  const todayWalks = petWalks.filter((w) => w.date === today)
  const totalDistance = petWalks.reduce((s, w) => s + w.distance, 0)
  const totalDuration = petWalks.reduce((s, w) => s + w.duration, 0)
  const avgDistance = petWalks.length > 0 ? (totalDistance / petWalks.length).toFixed(1) : '0'
  const currentPetData = pets.find((p) => p.id === currentPet)
  const totalCalories = petWalks.reduce((s, w) => s + caloriesForWalk(w.duration, currentPetData?.weight || 5), 0)

  // Last 7 days distance
  const last7 = (() => {
    const arr: { date: string; distance: number; duration: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const dayWalks = petWalks.filter((w) => w.date === key)
      arr.push({ date: key, distance: dayWalks.reduce((s, w) => s + w.distance, 0), duration: dayWalks.reduce((s, w) => s + w.duration, 0) })
    }
    return arr
  })()
  const maxDist = Math.max(...last7.map((d) => d.distance), 5)

  const add = () => {
    if (!currentPet || !duration) { toast('请填写', 'error'); return }
    const w: Walk = { id: uid(), petId: currentPet, date, time, duration: +duration, distance: +distance, location, weather, mood, notes }
    setWalks([w, ...walks])
    setDuration('30'); setDistance('2'); setLocation(''); setNotes('')
    setAdding(false)
    toast('已记录', 'success')
  }

  const remove = (id: string) => setWalks(walks.filter((w) => w.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = `共 ${petWalks.length} 次, 总距离 ${totalDistance.toFixed(1)}km, 总时长 ${totalDuration} 分钟, 消耗 ${totalCalories} 卡`
      const result = await aiComplete(`宠物运动: ${summary}. 给出 1 段 50 字内运动建议, 中文`, '你是 Versa 宠物健康顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Footprints className="w-5 h-5" />
          <h2 className="text-lg font-bold">遛弯追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">距离 · 时长 · 7 天趋势</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{petWalks.length}</p>
            <p className="text-[9px] opacity-80">总次</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalDistance.toFixed(1)}</p>
            <p className="text-[9px] opacity-80">总km</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgDistance}</p>
            <p className="text-[9px] opacity-80">均km</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold flex items-center justify-center gap-0.5"><Flame className="w-3 h-3" />{totalCalories}</p>
            <p className="text-[9px] opacity-80">卡路里</p>
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
        <p className="text-xs font-semibold mb-1.5">近 7 天距离</p>
        <div className="flex items-end justify-between h-16 gap-1">
          {last7.map((d) => {
            const pct = (d.distance / maxDist) * 100
            const day = new Date(d.date).toLocaleDateString('zh-CN', { weekday: 'short' })
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full h-12 flex flex-col justify-end">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${pct}%` }} className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-teal-500" />
                </div>
                <p className="text-[9px] text-ink-500">{day}</p>
                <p className="text-[9px] font-bold">{d.distance > 0 ? d.distance.toFixed(1) : '-'}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />记一次
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
        {petWalks.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Footprints className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有记录</p>
          </div>
        ) : petWalks.slice(0, 20).map((w) => {
          const W = WEATHER_META[w.weather]
          return (
            <motion.div key={w.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white flex-shrink-0">
                <Footprints className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{w.distance} km · {w.duration} 分钟</p>
                <p className="text-[10px] text-ink-500 flex items-center gap-1.5">
                  <span>{W.emoji} {w.weather}</span>
                  <span>· {w.date} {w.time}</span>
                  {w.location && <span>· 📍 {w.location}</span>}
                </p>
              </div>
              <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5">
                <Flame className="w-3 h-3" />{caloriesForWalk(w.duration, currentPetData?.weight || 5)}
              </span>
              <button onClick={() => remove(w.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">记一次遛弯</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">时长 (分钟)</p>
                <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">距离 (km)</p>
                <input type="number" step="0.1" value={distance} onChange={(e) => setDistance(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="地点" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">天气</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(WEATHER_META) as Array<keyof typeof WEATHER_META>).map((k) => (
                  <button key={k} onClick={() => setWeather(k)} className={cn('h-9 rounded-lg text-base', weather === k ? 'bg-emerald-500' : 'bg-ink-100 dark:bg-ink-800')}>
                    {WEATHER_META[k].emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">心情</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((m) => (
                  <button key={m} onClick={() => setMood(m as any)} className={cn('flex-1 h-8 rounded-lg text-base', mood >= m ? 'bg-amber-500' : 'bg-ink-100 dark:bg-ink-800')}>⭐</button>
                ))}
              </div>
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">记录</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
