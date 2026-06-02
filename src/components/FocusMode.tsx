import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Focus, Play, Pause, RotateCcw, Plus, Trash2, Sparkles, Loader2, Volume2, VolumeX, Check, Coffee, Brain, Zap } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface FocusTask {
  id: string
  text: string
  done: boolean
  pomos: number
  addedAt: number
}

interface FocusSession {
  date: string
  pomos: number
  minutes: number
}

const STORAGE_KEY = 'versa:focus-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }

function loadTasks(): FocusTask[] { try { const s = localStorage.getItem(STORAGE_KEY + ':tasks'); if (s) return JSON.parse(s) } catch {} return [
  { id: uid(), text: '回复重要邮件', done: false, pomos: 0, addedAt: Date.now() },
  { id: uid(), text: '完成项目报告', done: false, pomos: 0, addedAt: Date.now() },
] }
function saveTasks(d: FocusTask[]) { try { localStorage.setItem(STORAGE_KEY + ':tasks', JSON.stringify(d)) } catch {} }

function loadSessions(): FocusSession[] { try { const s = localStorage.getItem(STORAGE_KEY + ':sessions'); if (s) return JSON.parse(s) } catch {} return [] }
function saveSessions(d: FocusSession[]) { try { localStorage.setItem(STORAGE_KEY + ':sessions', JSON.stringify(d)) } catch {} }

const AMBIENT_OPTIONS = [
  { id: 'rain', label: '雨声', icon: '🌧' },
  { id: 'forest', label: '森林', icon: '🌲' },
  { id: 'cafe', label: '咖啡馆', icon: '☕' },
  { id: 'ocean', label: '海浪', icon: '🌊' },
  { id: 'fire', label: '篝火', icon: '🔥' },
  { id: 'silence', label: '静音', icon: '🔇' },
] as const

const PRESETS = [
  { name: '经典', focus: 25, break: 5, color: 'from-violet-500 to-purple-500' },
  { name: '深度', focus: 50, break: 10, color: 'from-rose-500 to-pink-500' },
  { name: '冲刺', focus: 15, break: 3, color: 'from-amber-500 to-orange-500' },
  { name: '超长', focus: 90, break: 20, color: 'from-emerald-500 to-teal-500' },
]

function playBeep(freq = 800, duration = 200) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = freq
    g.gain.setValueAtTime(0.1, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)
    o.start()
    o.stop(ctx.currentTime + duration / 1000)
  } catch {}
}

export function FocusMode() {
  const [tasks, setTasks] = useState<FocusTask[]>(loadTasks())
  const [sessions, setSessions] = useState<FocusSession[]>(loadSessions())
  const [preset, setPreset] = useState(PRESETS[0])
  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(PRESETS[0].focus * 60)
  const [ambient, setAmbient] = useState<typeof AMBIENT_OPTIONS[number]['id']>('silence')
  const [volume, setVolume] = useState(30)
  const [aiPlan, setAiPlan] = useState('')
  const [loading, setLoading] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [activeTask, setActiveTask] = useState<string | null>(null)
  const tickRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number>(0)

  useEffect(() => { saveTasks(tasks) }, [tasks])
  useEffect(() => { saveSessions(sessions) }, [sessions])

  useEffect(() => {
    if (running) {
      tickRef.current = window.setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false)
            if (mode === 'focus') {
              playBeep(1200, 400)
              const today = todayKey()
              setSessions((ss) => {
                const idx = ss.findIndex((s) => s.date === today)
                if (idx >= 0) {
                  const next = [...ss]
                  next[idx] = { ...next[idx], pomos: next[idx].pomos + 1, minutes: next[idx].minutes + preset.focus }
                  return next
                }
                return [...ss, { date: today, pomos: 1, minutes: preset.focus }]
              })
              if (activeTask) {
                setTasks((ts) => ts.map((t) => t.id === activeTask ? { ...t, pomos: t.pomos + 1 } : t))
              }
              toast('✓ 专注完成!休息一下', 'success')
              setMode('break')
              return preset.break * 60
            } else {
              playBeep(600, 200)
              toast('休息结束!', 'success')
              setMode('focus')
              return preset.focus * 60
            }
          }
          return r - 1
        })
      }, 1000)
      startTimeRef.current = Date.now()
    } else if (tickRef.current) {
      window.clearInterval(tickRef.current)
    }
    return () => { if (tickRef.current) window.clearInterval(tickRef.current) }
  }, [running, mode, preset, activeTask])

  const switchPreset = (p: typeof PRESETS[number]) => {
    if (running) { toast('请先暂停', 'error'); return }
    setPreset(p)
    setRemaining(p.focus * 60)
    setMode('focus')
  }

  const reset = () => {
    setRunning(false)
    setRemaining(preset.focus * 60)
    setMode('focus')
  }

  const addTask = () => {
    if (!newTask.trim()) return
    setTasks([{ id: uid(), text: newTask, done: false, pomos: 0, addedAt: Date.now() }, ...tasks])
    setNewTask('')
  }

  const toggleTask = (id: string) => setTasks(tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t))
  const removeTask = (id: string) => setTasks(tasks.filter((t) => t.id !== id))

  const today = todayKey()
  const todaySession = sessions.find((s) => s.date === today)
  const todayPomos = todaySession?.pomos || 0
  const todayMinutes = todaySession?.minutes || 0
  const streak = (() => {
    let count = 0
    const sorted = [...sessions].sort((a, b) => (a.date < b.date ? 1 : -1))
    let cursor = new Date()
    for (const s of sorted) {
      const d = new Date(s.date)
      if (d.toISOString().split('T')[0] === cursor.toISOString().split('T')[0]) {
        count++
        cursor.setDate(cursor.getDate() - 1)
      } else break
    }
    return count
  })()

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const taskList = tasks.filter((t) => !t.done).map((t) => t.text).join('; ') || '无'
      const result = await aiComplete(`用户未完成任务: ${taskList}. 给出 1 段 60 字内时间分配建议, 中文`, '你是 Versa 效率教练, 简洁实用, 中文')
      setAiPlan(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const totalSec = (mode === 'focus' ? preset.focus : preset.break) * 60
  const progress = ((totalSec - remaining) / totalSec) * 100

  const ringR = 50
  const circ = 2 * Math.PI * ringR
  const offset = circ * (1 - progress / 100)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Focus className="w-5 h-5" />
          <h2 className="text-lg font-bold">专注模式</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">番茄钟 · 任务管理 · 环境音</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{todayPomos}</p>
            <p className="text-[9px] opacity-80">今日番茄</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{todayMinutes}m</p>
            <p className="text-[9px] opacity-80">专注时长</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{streak}</p>
            <p className="text-[9px] opacity-80">连续天</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{tasks.filter((t) => !t.done).length}</p>
            <p className="text-[9px] opacity-80">待办</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex flex-col items-center">
          <div className="relative w-36 h-36 mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={ringR} fill="none" stroke="currentColor" className="text-ink-200 dark:text-ink-800" strokeWidth="6" />
              <motion.circle cx="60" cy="60" r={ringR} fill="none" stroke="url(#g)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} />
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={mode === 'focus' ? '#8b5cf6' : '#10b981'} />
                  <stop offset="100%" stopColor={mode === 'focus' ? '#ec4899' : '#14b8a6'} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-3xl font-bold tabular-nums">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</p>
              <p className={cn('text-[10px] font-semibold mt-0.5', mode === 'focus' ? 'text-violet-500' : 'text-emerald-500')}>
                {mode === 'focus' ? '🎯 专注' : '☕ 休息'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="w-10 h-10 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => setRunning(!running)} className={cn('w-14 h-14 rounded-full text-white flex items-center justify-center shadow-lg', preset.color)}>
              {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
            </button>
            <button onClick={() => { if (running) return; setMode(mode === 'focus' ? 'break' : 'focus'); setRemaining((mode === 'focus' ? preset.break : preset.focus) * 60) }} className="w-10 h-10 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
              {mode === 'focus' ? <Coffee className="w-4 h-4" /> : <Brain className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1.5">预设</p>
        <div className="grid grid-cols-4 gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => switchPreset(p)} className={cn('h-12 rounded-xl text-[10px] font-semibold flex flex-col items-center justify-center', preset.name === p.name ? `bg-gradient-to-br ${p.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
              <Zap className="w-3 h-3 mb-0.5" />{p.name}
              <span className="text-[9px] opacity-80">{p.focus}/{p.break}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1.5">环境音</p>
        <div className="grid grid-cols-6 gap-1.5">
          {AMBIENT_OPTIONS.map((a) => (
            <button key={a.id} onClick={() => setAmbient(a.id)} className={cn('h-12 rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold', ambient === a.id ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              <span className="text-base">{a.icon}</span>
              <span className="text-[8px] mt-0.5">{a.label}</span>
            </button>
          ))}
        </div>
        {ambient !== 'silence' && (
          <div className="mt-1.5 flex items-center gap-2">
            <Volume2 className="w-3 h-3 text-ink-500" />
            <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(+e.target.value)} className="flex-1" />
            <span className="text-[10px] text-ink-500 w-8">{volume}%</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex items-center gap-1.5 mb-1.5">
          <input value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTask()} placeholder="添加任务..." className="flex-1 px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs outline-none" />
          <button onClick={addTask} className="px-2 h-7 rounded bg-violet-500 text-white text-[10px] font-bold flex items-center gap-0.5"><Plus className="w-3 h-3" /></button>
          <button onClick={runAI} disabled={loading} className="px-2 h-7 rounded bg-ink-100 dark:bg-ink-800 text-[10px] font-semibold flex items-center gap-0.5">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          </button>
        </div>
        {aiPlan && <p className="text-[10px] bg-violet-50 dark:bg-violet-900/20 p-1.5 rounded mb-1.5">{aiPlan}</p>}
        {tasks.length === 0 ? (
          <p className="text-center text-xs text-ink-500 py-3">还没有任务</p>
        ) : (
          <div className="space-y-1">
            {tasks.map((t) => (
              <div key={t.id} className={cn('flex items-center gap-1.5 p-1.5 rounded-lg', activeTask === t.id ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-ink-50 dark:bg-ink-800/50', t.done && 'opacity-50')}>
                <button onClick={() => toggleTask(t.id)} className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0', t.done ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300')}>
                  {t.done && <Check className="w-2.5 h-2.5 text-white" />}
                </button>
                <button onClick={() => setActiveTask(t.id === activeTask ? null : t.id)} className="flex-1 text-left">
                  <p className={cn('text-xs', t.done && 'line-through')}>{t.text}</p>
                  <p className="text-[9px] text-ink-500">🍅 {t.pomos} 个</p>
                </button>
                {activeTask === t.id && <span className="text-[9px] px-1 py-0.5 rounded bg-violet-500 text-white">进行中</span>}
                <button onClick={() => removeTask(t.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
