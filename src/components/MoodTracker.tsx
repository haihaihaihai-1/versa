import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Smile, Plus, Trash2, Sparkles, Loader2, Calendar, TrendingUp, Tag, Cloud, Sun, CloudRain, Zap, Heart, Activity, Brain } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface MoodEntry {
  id: string
  date: string
  time: string
  mood: 1 | 2 | 3 | 4 | 5
  energy: 1 | 2 | 3 | 4 | 5
  weather: 'sunny' | 'cloudy' | 'rainy' | 'stormy'
  triggers: string[]
  notes: string
  activities: string[]
}

const STORAGE_KEY = 'versa:mood-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }

function load(): MoodEntry[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: MoodEntry[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): MoodEntry[] {
  const now = Date.now()
  return [
    { id: '1', date: new Date(now - 86400000 * 0).toISOString().split('T')[0], time: '09:00', mood: 4, energy: 4, weather: 'sunny', triggers: ['工作进展顺利'], notes: '心情不错', activities: ['运动', '阅读'] },
    { id: '2', date: new Date(now - 86400000 * 1).toISOString().split('T')[0], time: '20:00', mood: 2, energy: 2, weather: 'rainy', triggers: ['项目延期'], notes: '压力较大', activities: ['工作'] },
    { id: '3', date: new Date(now - 86400000 * 2).toISOString().split('T')[0], time: '12:00', mood: 5, energy: 5, weather: 'sunny', triggers: ['朋友聚会'], notes: '超开心!', activities: ['社交', '美食'] },
  ]
}

const MOOD_META = [
  { mood: 1 as const, emoji: '😢', label: '很差', color: 'bg-rose-500' },
  { mood: 2 as const, emoji: '😕', label: '不好', color: 'bg-orange-500' },
  { mood: 3 as const, emoji: '😐', label: '一般', color: 'bg-amber-500' },
  { mood: 4 as const, emoji: '😊', label: '好', color: 'bg-emerald-500' },
  { mood: 5 as const, emoji: '🤩', label: '超棒', color: 'bg-cyan-500' },
] as const

const WEATHER_META = {
  sunny: { label: '晴', icon: Sun, color: 'text-amber-500' },
  cloudy: { label: '多云', icon: Cloud, color: 'text-ink-500' },
  rainy: { label: '雨', icon: CloudRain, color: 'text-blue-500' },
  stormy: { label: '雷', icon: Zap, color: 'text-violet-500' },
} as const

const TRIGGER_OPTIONS = ['工作', '家庭', '社交', '运动', '睡眠', '饮食', '健康', '财务', '天气', '学习']
const ACTIVITY_OPTIONS = ['工作', '学习', '运动', '冥想', '阅读', '社交', '游戏', '美食', '音乐', '睡眠']

export function MoodTracker() {
  const [entries, setEntries] = useState<MoodEntry[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [mood, setMood] = useState<MoodEntry['mood']>(4)
  const [energy, setEnergy] = useState<MoodEntry['energy']>(3)
  const [weather, setWeather] = useState<MoodEntry['weather']>('sunny')
  const [triggers, setTriggers] = useState<string[]>([])
  const [activities, setActivities] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  useEffect(() => { save(entries) }, [entries])

  const today = todayKey()
  const todayEntries = entries.filter((e) => e.date === today)
  const avgMood = entries.length > 0 ? (entries.reduce((s, e) => s + e.mood, 0) / entries.length).toFixed(1) : '0'
  const avgEnergy = entries.length > 0 ? (entries.reduce((s, e) => s + e.energy, 0) / entries.length).toFixed(1) : '0'
  const totalEntries = entries.length

  // Last 7 days mood chart
  const last7 = (() => {
    const arr: { date: string; mood: number; energy: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const dayEntries = entries.filter((e) => e.date === key)
      const mood = dayEntries.length > 0 ? dayEntries.reduce((s, e) => s + e.mood, 0) / dayEntries.length : 0
      const energy = dayEntries.length > 0 ? dayEntries.reduce((s, e) => s + e.energy, 0) / dayEntries.length : 0
      arr.push({ date: key, mood, energy })
    }
    return arr
  })()

  // Trigger analysis
  const triggerStats: { [k: string]: { count: number; avgMood: number; total: number } } = {}
  entries.forEach((e) => {
    e.triggers.forEach((t) => {
      if (!triggerStats[t]) triggerStats[t] = { count: 0, avgMood: 0, total: 0 }
      triggerStats[t].count++
      triggerStats[t].total += e.mood
      triggerStats[t].avgMood = triggerStats[t].total / triggerStats[t].count
    })
  })

  const add = () => {
    const e: MoodEntry = { id: uid(), date: today, time: new Date().toTimeString().slice(0, 5), mood, energy, weather, triggers, activities, notes }
    setEntries([e, ...entries])
    setTriggers([]); setActivities([]); setNotes('')
    setAdding(false)
    toast('已记录', 'success')
  }

  const remove = (id: string) => setEntries(entries.filter((e) => e.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = `平均心情 ${avgMood}/5, 能量 ${avgEnergy}/5, 总记录 ${totalEntries}`
      const result = await aiComplete(`用户情绪: ${summary}. 给出 1 段 60 字内情绪调节建议, 中文`, '你是 Versa 心理顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Smile className="w-5 h-5" />
          <h2 className="text-lg font-bold">心情追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">心情 + 能量 + 触发 · 7 天趋势</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{todayEntries.length}</p>
            <p className="text-[9px] opacity-80">今日</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgMood}</p>
            <p className="text-[9px] opacity-80">均心情</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgEnergy}</p>
            <p className="text-[9px] opacity-80">均能量</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalEntries}</p>
            <p className="text-[9px] opacity-80">总记录</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />记心情
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-pink-50/40 dark:bg-pink-900/20 rounded-xl p-2 border border-pink-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-semibold mb-1.5">近 7 天心情 (●) 能量 (○)</p>
        <div className="flex items-end justify-between h-16 gap-1">
          {last7.map((d) => {
            const day = new Date(d.date).toLocaleDateString('zh-CN', { weekday: 'short' })
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full h-12 flex flex-col justify-end relative">
                  {d.mood > 0 && (
                    <div className="absolute left-0 right-0 mx-auto w-3 h-3 rounded-full bg-rose-500" style={{ bottom: `${(d.mood / 5) * 100}%` }} />
                  )}
                  {d.energy > 0 && (
                    <div className="absolute left-0 right-0 mx-auto w-3 h-3 rounded-full border-2 border-amber-500" style={{ bottom: `${(d.energy / 5) * 100}%`, left: '60%' }} />
                  )}
                </div>
                <p className="text-[9px] text-ink-500">{day}</p>
              </div>
            )
          })}
        </div>
      </div>

      {Object.keys(triggerStats).length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-xs font-semibold mb-1.5">🎯 触发因素影响</p>
          <div className="space-y-1">
            {Object.entries(triggerStats).sort((a, b) => b[1].avgMood - a[1].avgMood).slice(0, 5).map(([t, s]) => (
              <div key={t} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-16 truncate">{t}</span>
                <div className="flex-1 h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500" style={{ width: `${(s.avgMood / 5) * 100}%` }} />
                </div>
                <span className="font-bold w-10 text-right">{s.avgMood.toFixed(1)}</span>
                <span className="text-ink-500 w-8 text-right">×{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Smile className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有记录</p>
          </div>
        ) : entries.map((e) => {
          const M = MOOD_META.find((m) => m.mood === e.mood)!
          const W = WEATHER_META[e.weather]
          return (
            <motion.div key={e.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-start gap-2">
                <div className="text-3xl">{M.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold">{M.label}</p>
                    <span className="text-[10px] text-ink-500">⚡{e.energy}/5</span>
                    <W.icon className={cn('w-3 h-3', W.color)} />
                    <span className="text-[10px] text-ink-500 ml-auto">{e.date} {e.time}</span>
                  </div>
                  {e.notes && <p className="text-[10px] text-ink-500 mt-0.5">💭 {e.notes}</p>}
                  {e.triggers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {e.triggers.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-500 text-[9px] font-semibold">{t}</span>
                      ))}
                    </div>
                  )}
                  {e.activities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {e.activities.map((a) => (
                        <span key={a} className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-500 text-[9px] font-semibold">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => remove(e.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">记录心情</h3>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">心情</p>
              <div className="flex gap-1.5">
                {MOOD_META.map((M) => (
                  <button key={M.mood} onClick={() => setMood(M.mood)} className={cn('flex-1 h-12 rounded-lg text-2xl flex items-center justify-center', mood === M.mood ? `${M.color} scale-110` : 'bg-ink-100 dark:bg-ink-800')}>
                    {M.emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">能量水平</p>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((e) => (
                  <button key={e} onClick={() => setEnergy(e as any)} className={cn('flex-1 h-9 rounded-lg text-[10px] font-semibold', energy >= e ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                    ⚡{e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">天气</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(WEATHER_META) as Array<keyof typeof WEATHER_META>).map((k) => {
                  const W = WEATHER_META[k]
                  return (
                    <button key={k} onClick={() => setWeather(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', weather === k ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                      <W.icon className="w-3.5 h-3.5" />
                      <span className="text-[9px]">{W.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">触发因素 (多选)</p>
              <div className="flex flex-wrap gap-1">
                {TRIGGER_OPTIONS.map((t) => (
                  <button key={t} onClick={() => setTriggers(triggers.includes(t) ? triggers.filter((x) => x !== t) : [...triggers, t])} className={cn('px-2 h-7 rounded-full text-[10px] font-semibold', triggers.includes(t) ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">活动 (多选)</p>
              <div className="flex flex-wrap gap-1">
                {ACTIVITY_OPTIONS.map((a) => (
                  <button key={a} onClick={() => setActivities(activities.includes(a) ? activities.filter((x) => x !== a) : [...activities, a])} className={cn('px-2 h-7 rounded-full text-[10px] font-semibold', activities.includes(a) ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注 (可选)" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[50px]" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold">记录</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
