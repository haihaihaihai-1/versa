import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Flame, Sparkles, Loader2, Plus, Trash2, X, Target, Trophy, Calendar, Award } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Habit {
  id: string
  name: string
  emoji: string
  category: 'health' | 'study' | 'work' | 'life'
  goal: number
  color: string
  createdAt: number
  history: string[]
}

const STORAGE_KEY = 'versa:habits'

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function load(): Habit[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'h1', name: '早起', emoji: '🌅', category: 'health', goal: 30, color: 'from-amber-500 to-orange-500', createdAt: Date.now() - 86400000 * 10, history: [todayStr(), '2026-06-01', '2026-05-31', '2026-05-30', '2026-05-29', '2026-05-28'] },
    { id: 'h2', name: '阅读 30 分钟', emoji: '📚', category: 'study', goal: 60, color: 'from-blue-500 to-indigo-500', createdAt: Date.now() - 86400000 * 5, history: [todayStr(), '2026-06-01', '2026-05-31'] },
    { id: 'h3', name: '运动', emoji: '🏃', category: 'health', goal: 20, color: 'from-emerald-500 to-teal-500', createdAt: Date.now() - 86400000 * 7, history: ['2026-06-01', '2026-05-30', '2026-05-29', '2026-05-28', '2026-05-27'] },
    { id: 'h4', name: '冥想', emoji: '🧘', category: 'health', goal: 7, color: 'from-violet-500 to-purple-500', createdAt: Date.now() - 86400000 * 3, history: [todayStr()] },
  ]
}
function save(d: Habit[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CATEGORIES: Record<Habit['category'], { label: string; color: string }> = {
  health: { label: '健康', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' },
  study: { label: '学习', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' },
  work: { label: '工作', color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30' },
  life: { label: '生活', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' },
}

function calcStreak(history: string[]): number {
  if (history.length === 0) return 0
  const sorted = [...history].sort().reverse()
  let streak = 0
  const today = new Date()
  for (let i = 0; i < 365; i++) {
    const d = new Date(today.getTime() - i * 86400000)
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (sorted.includes(ds)) streak++
    else if (i > 0) break
  }
  return streak
}

export function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>(load())
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState<Habit['category']>('health')
  const [newEmoji, setNewEmoji] = useState('✨')
  const [newGoal, setNewGoal] = useState(30)
  const [aiSuggest, setAiSuggest] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(habits) }, [habits])

  const toggleToday = (id: string) => {
    const today = todayStr()
    setHabits(habits.map((h) => h.id === id ? { ...h, history: h.history.includes(today) ? h.history.filter((d) => d !== today) : [...h.history, today] } : h))
  }

  const remove = (id: string) => setHabits(habits.filter((h) => h.id !== id))

  const add = () => {
    if (!newName.trim()) { toast('请填写习惯名', 'error'); return }
    const h: Habit = { id: uid(), name: newName, emoji: newEmoji, category: newCat, goal: newGoal, color: 'from-nova-500 to-pink-500', createdAt: Date.now(), history: [] }
    setHabits([h, ...habits])
    setNewName(''); setNewEmoji('✨'); setNewCat('health'); setNewGoal(30); setAdding(false)
    toast('已添加', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 5 个值得养成的微习惯 (50-80 字, 含 emoji)', '你是 Versa 习惯导师, 简洁实用, 中文')
      setAiSuggest(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const totalDone = habits.filter((h) => h.history.includes(todayStr())).length
  const longestStreak = Math.max(0, ...habits.map((h) => calcStreak(h.history)))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-5 h-5" />
          <h2 className="text-lg font-bold">习惯追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">每天打卡 · 坚持 21 天</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{totalDone}/{habits.length}</p>
            <p className="text-[10px] opacity-80">今日</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{longestStreak}</p>
            <p className="text-[10px] opacity-80">最长连击</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{habits.length}</p>
            <p className="text-[10px] opacity-80">习惯数</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新习惯
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI
        </button>
      </div>

      {aiSuggest && (
        <div className="bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-900/20 dark:to-rose-900/20 rounded-2xl p-3 border border-orange-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-orange-500"><Sparkles className="w-3.5 h-3.5" />AI 建议</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiSuggest}</p>
        </div>
      )}

      <div className="space-y-1.5">
        {habits.map((h) => {
          const today = todayStr()
          const done = h.history.includes(today)
          const streak = calcStreak(h.history)
          const progress = Math.min(100, (h.history.length / h.goal) * 100)
          return (
            <div key={h.id} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center gap-2 mb-1.5">
                <button onClick={() => toggleToday(h.id)} className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-lg transition', done ? `bg-gradient-to-br ${h.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                  {done ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4 text-ink-400" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <span>{h.emoji}</span>{h.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded', CATEGORIES[h.category].color)}>{CATEGORIES[h.category].label}</span>
                    {streak > 0 && <span className="text-[10px] text-orange-500 font-bold flex items-center gap-0.5"><Flame className="w-2.5 h-2.5" />{streak}</span>}
                  </div>
                </div>
                <button onClick={() => remove(h.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-ink-500">
                <span>目标 {h.goal} 天</span>
                <div className="flex-1 h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={cn('h-full bg-gradient-to-r', h.color)} />
                </div>
                <span>{h.history.length}/{h.goal}</span>
              </div>
              <div className="mt-1.5 flex gap-0.5">
                {Array.from({ length: 7 }).map((_, i) => {
                  const d = new Date(Date.now() - (6 - i) * 86400000)
                  const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
                  const isDone = h.history.includes(ds)
                  return <div key={i} className={cn('flex-1 h-2 rounded-full', isDone ? `bg-gradient-to-r ${h.color}` : 'bg-ink-100 dark:bg-ink-800')} />
                })}
              </div>
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <h3 className="font-bold">添加习惯</h3>
            <div className="flex gap-1.5">
              <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={2} className="w-14 h-10 text-2xl text-center rounded-lg bg-ink-50 dark:bg-ink-800 outline-none" />
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="习惯名" className="flex-1 px-3 h-10 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map((k) => (
                <button key={k} onClick={() => setNewCat(k)} className={cn('h-8 rounded-lg text-xs font-semibold', newCat === k ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  {CATEGORIES[k].label}
                </button>
              ))}
            </div>
            <div>
              <p className="text-xs text-ink-500 mb-1">目标天数: {newGoal}</p>
              <input type="range" min="7" max="365" value={newGoal} onChange={(e) => setNewGoal(+e.target.value)} className="w-full accent-orange-500" />
            </div>
            <button onClick={add} className="w-full h-10 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-bold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
