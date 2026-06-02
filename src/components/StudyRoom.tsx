import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, Play, Pause, RotateCcw, Coffee, BookOpen, Sparkles, Loader2, Volume2, VolumeX, BarChart3, Clock, Music, X } from 'lucide-react'
import { cn, formatTimeAgo, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

type Phase = 'focus' | 'short-break' | 'long-break'

interface Session {
  id: string
  type: Phase
  duration: number
  completed: boolean
  at: number
  task: string
}

const PHASE_META: Record<Phase, { label: string; mins: number; color: string; emoji: string }> = {
  focus: { label: '专注', mins: 25, color: 'from-rose-500 to-pink-500', emoji: '🍅' },
  'short-break': { label: '短休息', mins: 5, color: 'from-emerald-500 to-teal-500', emoji: '☕' },
  'long-break': { label: '长休息', mins: 15, color: 'from-blue-500 to-indigo-500', emoji: '🌳' },
}

const STORAGE_KEY = 'versa:study-sessions'

function load(): Session[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Session[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const TASK_PRESETS = ['读书', '写作', '编程', '学习', '会议', '冥想', '翻译', '设计']

export function StudyRoom() {
  const [phase, setPhase] = useState<Phase>('focus')
  const [seconds, setSeconds] = useState(PHASE_META.focus.mins * 60)
  const [running, setRunning] = useState(false)
  const [task, setTask] = useState('读书')
  const [sessions, setSessions] = useState<Session[]>(load())
  const [soundOn, setSoundOn] = useState(true)
  const [showStats, setShowStats] = useState(false)
  const [aiTask, setAiTask] = useState('')
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<number | undefined>(undefined)
  const startTimeRef = useRef<number>(0)

  useEffect(() => { save(sessions) }, [sessions])

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            setRunning(false)
            playSound()
            const completed = true
            const sess: Session = { id: uid(), type: phase, duration: PHASE_META[phase].mins * 60, completed, at: Date.now(), task }
            setSessions((ss) => [sess, ...ss])
            toast(`${PHASE_META[phase].emoji} ${PHASE_META[phase].label}完成!`, 'success')
            return PHASE_META.focus.mins * 60
          }
          return s - 1
        })
      }, 1000)
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = undefined
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current) }
  }, [running, phase, task])

  const switchPhase = (p: Phase) => {
    setPhase(p)
    setSeconds(PHASE_META[p].mins * 60)
    setRunning(false)
  }

  const start = () => {
    if (!running) startTimeRef.current = Date.now()
    setRunning(true)
  }
  const pause = () => setRunning(false)
  const reset = () => {
    setRunning(false)
    setSeconds(PHASE_META[phase].mins * 60)
  }

  const playSound = () => {
    if (!soundOn) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 800
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为番茄工作法推荐 5 个适合的深度工作场景 (50-80 字)', '你是 Versa 效率教练, 简洁实用, 中文')
      setAiTask(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const today = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()
  const todayFocus = sessions.filter((s) => s.type === 'focus' && s.completed && new Date(s.at).toDateString() === new Date(today).toDateString()).length
  const todayMinutes = sessions.filter((s) => s.type === 'focus' && s.completed && new Date(s.at).toDateString() === new Date(today).toDateString()).reduce((sum, s) => sum + s.duration / 60, 0)
  const totalFocus = sessions.filter((s) => s.type === 'focus' && s.completed).length
  const last7 = (() => {
    const out: { day: string; count: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const ds = d.toDateString()
      const count = sessions.filter((s) => s.type === 'focus' && s.completed && new Date(s.at).toDateString() === ds).length
      out.push({ day: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()], count })
    }
    return out
  })()

  const Meta = PHASE_META[phase]
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const progress = ((PHASE_META[phase].mins * 60 - seconds) / (PHASE_META[phase].mins * 60)) * 100

  return (
    <div className="space-y-3">
      <div className={cn('rounded-2xl p-3 text-white bg-gradient-to-br', Meta.color)}>
        <div className="flex items-center gap-2 mb-1">
          <Timer className="w-5 h-5" />
          <h2 className="text-lg font-bold">番茄工作法</h2>
          <button onClick={() => setSoundOn(!soundOn)} className="ml-auto">
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs opacity-90 mb-2">25min 专注 · 5min 休息</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{todayFocus}</p>
            <p className="text-[10px] opacity-80">今日番茄</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{Math.round(todayMinutes)}</p>
            <p className="text-[10px] opacity-80">专注分</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{totalFocus}</p>
            <p className="text-[10px] opacity-80">累计</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-6 border border-ink-200/60 dark:border-ink-800/60 text-center">
        <div className="relative w-44 h-44 mx-auto mb-3">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="6" className="text-ink-100 dark:text-ink-800" />
            <circle
              cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="6"
              className={cn('text-nova-500', Meta.color.includes('rose') ? 'text-rose-500' : Meta.color.includes('emerald') ? 'text-emerald-500' : 'text-blue-500')}
              strokeDasharray={`${2 * Math.PI * 44}`}
              strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-5xl font-bold font-mono">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</p>
            <p className="text-sm font-semibold mt-1">{Meta.emoji} {Meta.label}</p>
          </div>
        </div>

        <input value={task} onChange={(e) => setTask(e.target.value)} placeholder="任务名" className="w-full max-w-xs mx-auto px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm text-center outline-none focus:ring-2 focus:ring-nova-500" />

        <div className="flex justify-center gap-1.5 mt-3">
          {running ? (
            <button onClick={pause} className="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center">
              <Pause className="w-5 h-5" />
            </button>
          ) : (
            <button onClick={start} className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center">
              <Play className="w-5 h-5 ml-0.5" />
            </button>
          )}
          <button onClick={reset} className="w-12 h-12 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5">
        {(['focus', 'short-break', 'long-break'] as Phase[]).map((p) => {
          const M = PHASE_META[p]
          return (
            <button key={p} onClick={() => switchPhase(p)} className={cn('flex-1 h-9 rounded-xl text-xs font-semibold border', phase === p ? `bg-gradient-to-br ${M.color} text-white border-transparent` : 'bg-ink-100 dark:bg-ink-800 border-ink-200/60 dark:border-ink-800/60')}>
              {M.emoji} {M.label} ({M.mins}m)
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TASK_PRESETS.map((t) => (
          <button key={t} onClick={() => setTask(t)} className={cn('px-2.5 h-7 rounded-full text-xs font-semibold', task === t ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{t}</button>
        ))}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-bold flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" />近 7 天</p>
          <button onClick={() => setShowStats(!showStats)} className="text-[10px] text-nova-500 font-bold">{showStats ? '收起' : '展开'}</button>
        </div>
        <div className="flex items-end gap-1.5 h-20">
          {last7.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 w-full flex items-end">
                <motion.div initial={{ height: 0 }} animate={{ height: `${Math.min(100, d.count * 25)}%` }} className="w-full bg-gradient-to-t from-rose-500 to-pink-500 rounded-t" />
              </div>
              <p className="text-[9px] text-ink-500">{d.day}</p>
            </div>
          ))}
        </div>
        {showStats && (
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="bg-ink-50 dark:bg-ink-800 rounded p-1.5">
              <p className="font-bold">{last7.reduce((s, d) => s + d.count, 0)}</p>
              <p className="text-ink-500">周总计</p>
            </div>
            <div className="bg-ink-50 dark:bg-ink-800 rounded p-1.5">
              <p className="font-bold">{(last7.reduce((s, d) => s + d.count, 0) / 7).toFixed(1)}</p>
              <p className="text-ink-500">日均</p>
            </div>
            <div className="bg-ink-50 dark:bg-ink-800 rounded p-1.5">
              <p className="font-bold">{Math.max(...last7.map((d) => d.count))}</p>
              <p className="text-ink-500">单日最高</p>
            </div>
          </div>
        )}
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 推荐场景
      </button>

      {aiTask && (
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl p-3 border border-rose-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-rose-500"><Sparkles className="w-3.5 h-3.5" />AI 建议</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiTask}</p>
        </div>
      )}
    </div>
  )
}
