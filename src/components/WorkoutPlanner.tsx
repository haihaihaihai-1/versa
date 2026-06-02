import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Dumbbell, Plus, Trash2, Check, Sparkles, Loader2, Activity, Trophy, Flame, Clock, Zap, Heart, X, ChevronRight, BarChart3, Calendar as CalendarIcon } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Exercise {
  id: string
  name: string
  category: 'chest' | 'back' | 'legs' | 'arms' | 'core' | 'cardio'
  sets: number
  reps: number
  weight: number
  duration?: number
  calories: number
  muscle: string
}

interface WorkoutEntry {
  id: string
  date: string
  duration: number
  calories: number
  exercises: Exercise[]
  note: string
}

const STORAGE_KEY = 'versa:workouts'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function load(): WorkoutEntry[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: WorkoutEntry[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CAT_META = {
  chest: { label: '胸', emoji: '💪', color: 'from-rose-500 to-pink-500' },
  back: { label: '背', emoji: '🏋️', color: 'from-blue-500 to-indigo-500' },
  legs: { label: '腿', emoji: '🦵', color: 'from-amber-500 to-orange-500' },
  arms: { label: '臂', emoji: '💪', color: 'from-violet-500 to-purple-500' },
  core: { label: '核心', emoji: '🔥', color: 'from-emerald-500 to-teal-500' },
  cardio: { label: '有氧', emoji: '🏃', color: 'from-cyan-500 to-blue-500' },
} as const

const EXERCISES: Record<keyof typeof CAT_META, { name: string; muscle: string }[]> = {
  chest: [{ name: '卧推', muscle: '胸大肌' }, { name: '哑铃飞鸟', muscle: '胸大肌' }, { name: '俯卧撑', muscle: '胸/三头' }],
  back: [{ name: '引体向上', muscle: '背阔肌' }, { name: '划船', muscle: '背阔肌' }, { name: '硬拉', muscle: '下背' }],
  legs: [{ name: '深蹲', muscle: '股四头' }, { name: '硬拉', muscle: '腘绳肌' }, { name: '弓步蹲', muscle: '股四头' }],
  arms: [{ name: '弯举', muscle: '二头' }, { name: '三头下压', muscle: '三头' }, { name: '锤式弯举', muscle: '前臂' }],
  core: [{ name: '平板支撑', muscle: '腹横肌' }, { name: '卷腹', muscle: '腹直肌' }, { name: '俄罗斯转体', muscle: '腹斜肌' }],
  cardio: [{ name: '跑步', muscle: '全身' }, { name: '动感单车', muscle: '腿部' }, { name: '跳绳', muscle: '小腿' }],
}

export function WorkoutPlanner() {
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>(load())
  const [activeEntry, setActiveEntry] = useState<WorkoutEntry | null>(null)
  const [tab, setTab] = useState<'today' | 'history' | 'plan'>('today')
  const [aiPlan, setAiPlan] = useState('')
  const [loading, setLoading] = useState(false)
  const [newEx, setNewEx] = useState<{ name: string; sets: number; reps: number; weight: number; category: keyof typeof CAT_META }>({ name: '深蹲', sets: 3, reps: 12, weight: 20, category: 'legs' })
  const [view, setView] = useState(new Date())

  useEffect(() => { save(workouts) }, [workouts])

  const today = todayStr()
  const todayEntry = workouts.find((w) => w.date === today) || { id: '', date: today, duration: 0, calories: 0, exercises: [], note: '' }
  const totalCalories = workouts.reduce((s, w) => s + w.calories, 0)
  const totalDuration = workouts.reduce((s, w) => s + w.duration, 0)

  const addExercise = () => {
    const ex: Exercise = { id: uid(), name: newEx.name, category: newEx.category, sets: newEx.sets, reps: newEx.reps, weight: newEx.weight, calories: newEx.sets * newEx.reps * 2, muscle: EXERCISES[newEx.category].find((e) => e.name === newEx.name)?.muscle || '' }
    if (todayEntry.id) {
      setWorkouts(workouts.map((w) => w.id === todayEntry.id ? { ...w, exercises: [...w.exercises, ex], calories: w.calories + ex.calories } : w))
    } else {
      const entry: WorkoutEntry = { id: uid(), date: today, duration: 0, calories: ex.calories, exercises: [ex], note: '' }
      setWorkouts([entry, ...workouts])
    }
    toast('已记录', 'success')
  }

  const removeExercise = (exId: string) => {
    if (!todayEntry.id) return
    setWorkouts(workouts.map((w) => w.id === todayEntry.id ? { ...w, exercises: w.exercises.filter((e) => e.id !== exId) } : w))
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为初学者推荐 1 周 3 练的健身计划, 每次 45 分钟 (60-100 字)', '你是 Versa 健身教练, 简洁专业, 中文')
      setAiPlan(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const last7 = (() => {
    const out: { day: string; cal: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const w = workouts.find((x) => x.date === ds)
      out.push({ day: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()], cal: w?.calories || 0 })
    }
    return out
  })()

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Dumbbell className="w-5 h-5" />
          <h2 className="text-lg font-bold">健身计划</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">动作记录 · 热量 · 周训练</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{todayEntry.exercises.length}</p>
            <p className="text-[10px] opacity-80">今日动作</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{totalCalories}</p>
            <p className="text-[10px] opacity-80">总卡路里</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{Math.round(totalDuration / 60)}h</p>
            <p className="text-[10px] opacity-80">总时长</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setTab('today')} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', tab === 'today' ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>今日</button>
        <button onClick={() => setTab('history')} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', tab === 'history' ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>历史</button>
        <button onClick={() => setTab('plan')} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', tab === 'plan' ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>AI 计划</button>
      </div>

      {tab === 'today' && (
        <>
          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
            <p className="text-xs font-bold">记录动作</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                const M = CAT_META[k]
                return (
                  <button key={k} onClick={() => setNewEx({ ...newEx, category: k, name: EXERCISES[k][0].name })} className={cn('h-10 rounded-lg flex flex-col items-center justify-center gap-0.5', newEx.category === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    <span className="text-base">{M.emoji}</span>
                    <span className="text-[10px] font-semibold">{M.label}</span>
                  </button>
                )
              })}
            </div>
            <select value={newEx.name} onChange={(e) => setNewEx({ ...newEx, name: e.target.value })} className="w-full px-2 h-8 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs">
              {EXERCISES[newEx.category].map((e) => <option key={e.name} value={e.name}>{e.name} ({e.muscle})</option>)}
            </select>
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <p className="text-[9px] text-ink-500 mb-0.5">组数</p>
                <input type="number" value={newEx.sets} onChange={(e) => setNewEx({ ...newEx, sets: +e.target.value })} className="w-full px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs text-center" />
              </div>
              <div>
                <p className="text-[9px] text-ink-500 mb-0.5">次数</p>
                <input type="number" value={newEx.reps} onChange={(e) => setNewEx({ ...newEx, reps: +e.target.value })} className="w-full px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs text-center" />
              </div>
              <div>
                <p className="text-[9px] text-ink-500 mb-0.5">重量(kg)</p>
                <input type="number" value={newEx.weight} onChange={(e) => setNewEx({ ...newEx, weight: +e.target.value })} className="w-full px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs text-center" />
              </div>
            </div>
            <button onClick={addExercise} className="w-full h-8 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1">
              <Plus className="w-3.5 h-3.5" />记录动作
            </button>
          </div>

          <div className="space-y-1.5">
            {todayEntry.exercises.length === 0 ? (
              <div className="text-center py-6 text-ink-500">
                <Dumbbell className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">今天还没有训练</p>
              </div>
            ) : todayEntry.exercises.map((ex) => {
              const M = CAT_META[ex.category]
              return (
                <div key={ex.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br', M.color)}>
                    <span className="text-base">{M.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{ex.name}</p>
                    <p className="text-[10px] text-ink-500">{ex.sets} 组 × {ex.reps} 次 {ex.weight > 0 ? `· ${ex.weight}kg` : ''} · {ex.calories} 卡</p>
                  </div>
                  <button onClick={() => removeExercise(ex.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'history' && (
        <>
          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
            <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" />近 7 天热量</p>
            <div className="flex items-end gap-1.5 h-20">
              {last7.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex-1 w-full flex items-end">
                    <motion.div initial={{ height: 0 }} animate={{ height: `${Math.min(100, d.cal / 8)}%` }} className="w-full bg-gradient-to-t from-orange-500 to-rose-500 rounded-t" />
                  </div>
                  <p className="text-[9px] text-ink-500">{d.day}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            {workouts.filter((w) => w.exercises.length > 0).slice(0, 10).map((w) => (
              <div key={w.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center text-white">
                  <Activity className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{w.date}</p>
                  <p className="text-[10px] text-ink-500">{w.exercises.length} 个动作 · {w.calories} 卡</p>
                </div>
                <button onClick={() => removeExercise(w.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'plan' && (
        <>
          <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 生成周计划
          </button>
          {aiPlan && (
            <div className="bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-900/20 dark:to-rose-900/20 rounded-2xl p-3 border border-orange-200/40">
              <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-orange-500"><Sparkles className="w-3.5 h-3.5" />AI 周计划</p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiPlan}</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
