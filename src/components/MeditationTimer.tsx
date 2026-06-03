import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Brain, Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Loader2, Cloud, TreePine, Waves, Flame, Wind, Bell, Clock, Check } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Session {
  id: string
  type: 'guided' | 'silent' | 'mantra' | 'body-scan' | 'loving-kindness'
  duration: number
  date: string
  moodBefore: 1 | 2 | 3 | 4 | 5
  moodAfter: 1 | 2 | 3 | 4 | 5
  notes: string
}

const STORAGE_KEY = 'versa:meditation-v1'

function load(): Session[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Session[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Session[] {
  const now = Date.now()
  return [
    { id: '1', type: 'guided', duration: 10, date: new Date(now - 86400000).toISOString().split('T')[0], moodBefore: 2, moodAfter: 4, notes: '平静下来' },
    { id: '2', type: 'silent', duration: 15, date: new Date(now - 86400000 * 2).toISOString().split('T')[0], moodBefore: 3, moodAfter: 5, notes: '深度放松' },
    { id: '3', type: 'body-scan', duration: 20, date: new Date(now - 86400000 * 3).toISOString().split('T')[0], moodBefore: 2, moodAfter: 4, notes: '' },
  ]
}

const TYPE_META = {
  guided: { label: '引导冥想', icon: Brain, desc: '跟随语音指令' },
  silent: { label: '静坐冥想', icon: Sparkles, desc: '纯静默练习' },
  mantra: { label: '咒语冥想', icon: Bell, desc: '重复咒语' },
  'body-scan': { label: '身体扫描', icon: Check, desc: '从头到脚放松' },
  'loving-kindness': { label: '慈心禅', icon: Sparkles, desc: '送爱给自己和他人' },
} as const

const PRESETS = [
  { duration: 5, label: '入门', desc: '5 分钟快速放松' },
  { duration: 10, label: '经典', desc: '10 分钟平衡身心' },
  { duration: 15, label: '深度', desc: '15 分钟深潜' },
  { duration: 20, label: '专家', desc: '20 分钟全面静修' },
  { duration: 30, label: '大师', desc: '30 分钟高阶练习' },
]

const SCRIPT_SAMPLES: { [k: string]: { [phase: string]: string } } = {
  guided: {
    start: '找一个舒适的坐姿, 轻轻闭上眼睛...',
    middle: '感受呼吸的节奏, 让杂念自然流过...',
    end: '慢慢睁开眼睛, 感受这份宁静...',
  },
  'body-scan': {
    start: '从头顶开始, 逐步感受身体的每一部分...',
    middle: '将注意力带到脚趾, 感受那里的温度与触感...',
    end: '全身都充满了觉察与平静...',
  },
  'loving-kindness': {
    start: '愿我平安, 愿我健康, 愿我自在...',
    middle: '将这份爱送给亲人, 愿他们也平安健康...',
    end: '愿一切众生都远离痛苦, 获得快乐...',
  },
  mantra: {
    start: '吸气时说"嗡", 呼气时说"嘛"...',
    middle: '保持咒语的节奏, 让心专注...',
    end: '感受咒语的余韵在心中回荡...',
  },
  silent: {
    start: '...',
    middle: '...',
    end: '...',
  },
}

function playBell(freq = 528, duration = 1500) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = freq
    g.gain.setValueAtTime(0.1, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)
    o.start(); o.stop(ctx.currentTime + duration / 1000)
  } catch {}
}

function playChime() {
  playBell(528, 1000)
  setTimeout(() => playBell(660, 1000), 100)
}

export function MeditationTimer() {
  const [sessions, setSessions] = useState<Session[]>(load())
  const [running, setRunning] = useState(false)
  const [paused, setPaused] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [total, setTotal] = useState(0)
  const [type, setType] = useState<Session['type']>('guided')
  const [preset, setPreset] = useState(PRESETS[1])
  const [voice, setVoice] = useState(true)
  const [moodBefore, setMoodBefore] = useState<Session['moodBefore']>(3)
  const [moodAfter, setMoodAfter] = useState<Session['moodAfter']>(4)
  const [phase, setPhase] = useState<'start' | 'middle' | 'end'>('start')
  const [notes, setNotes] = useState('')
  const tickRef = useRef<number | undefined>(undefined)

  useEffect(() => { save(sessions) }, [sessions])

  const totalMinutes = sessions.reduce((s, x) => s + x.duration, 0)
  const today = new Date().toISOString().split('T')[0]
  const todaySessions = sessions.filter((s) => s.date === today)
  const todayMinutes = todaySessions.reduce((s, x) => s + x.duration, 0)
  const avgMoodImprovement = sessions.length > 0 ? (sessions.reduce((s, x) => s + (x.moodAfter - x.moodBefore), 0) / sessions.length).toFixed(1) : '0'

  // streak
  const streak = (() => {
    let count = 0
    let cursor = new Date()
    for (let i = 0; i < 365; i++) {
      const d = cursor.toISOString().split('T')[0]
      if (sessions.some((s) => s.date === d)) { count++; cursor.setDate(cursor.getDate() - 1) } else break
    }
    return count
  })()

  const start = () => {
    setTotal(preset.duration * 60)
    setRemaining(preset.duration * 60)
    setRunning(true)
    setPaused(false)
    setPhase('start')
    if (voice) playChime()
  }

  const pause = () => {
    if (paused) {
      setPaused(false)
      setRunning(true)
    } else {
      setPaused(true)
      setRunning(false)
    }
  }

  const stop = () => {
    setRunning(false)
    setPaused(false)
    setRemaining(0)
    setTotal(0)
  }

  useEffect(() => {
    if (running && !paused) {
      tickRef.current = window.setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false)
            playChime()
            // save session
            const s: Session = { id: uid(), type, duration: total / 60, date: today, moodBefore, moodAfter, notes }
            setSessions([s, ...sessions])
            toast(`✓ 冥想 ${Math.round(total / 60)} 分钟完成`, 'success')
            setPhase('end')
            return 0
          }
          const newR = r - 1
          const elapsed = total - newR
          const pct = elapsed / total
          if (pct > 0.1 && pct < 0.9 && phase !== 'middle') setPhase('middle')
          else if (pct >= 0.9 && phase !== 'end') setPhase('end')
          if (voice && newR % 300 === 0 && newR > 0) playBell(440, 500)
          return newR
        })
      }, 1000)
    } else if (tickRef.current) {
      window.clearInterval(tickRef.current)
    }
    return () => { if (tickRef.current) window.clearInterval(tickRef.current) }
  }, [running, paused, total, type, moodBefore, moodAfter, notes, today, sessions, phase])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const progress = total > 0 ? ((total - remaining) / total) * 100 : 0

  const TypeIcon = TYPE_META[type].icon

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5" />
          <h2 className="text-lg font-bold">冥想计时</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">引导词 · 情绪追踪 · 连续打卡</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{sessions.length}</p>
            <p className="text-[9px] opacity-80">总次</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{todayMinutes}m</p>
            <p className="text-[9px] opacity-80">今日</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold flex items-center justify-center gap-0.5">{streak} 🔥</p>
            <p className="text-[9px] opacity-80">连续</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">+{avgMoodImprovement}</p>
            <p className="text-[9px] opacity-80">心情</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        {!running ? (
          <>
            <div className="mb-3">
              <p className="text-xs font-semibold mb-1.5">时长预设</p>
              <div className="grid grid-cols-5 gap-1.5">
                {PRESETS.map((p) => (
                  <button key={p.duration} onClick={() => setPreset(p)} className={cn('h-12 rounded-xl text-[10px] font-semibold flex flex-col items-center justify-center', preset.duration === p.duration ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                    <Clock className="w-3 h-3 mb-0.5" />{p.duration}m
                    <span className="text-[9px] opacity-80">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-3">
              <p className="text-xs font-semibold mb-1.5">冥想类型</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                  const M = TYPE_META[k]
                  return (
                    <button key={k} onClick={() => setType(k)} className={cn('h-10 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1', type === k ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                      <M.icon className="w-3 h-3" />{M.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="mb-3">
              <p className="text-xs font-semibold mb-1.5">当前心情</p>
              <div className="flex gap-1.5">
                {(['😢', '😕', '😐', '😊', '🤩'] as const).map((e, i) => (
                  <button key={i} onClick={() => setMoodBefore((i + 1) as any)} className={cn('flex-1 h-9 rounded-lg text-xl', moodBefore === i + 1 ? 'bg-indigo-500 scale-110' : 'bg-ink-100 dark:bg-ink-800')}>{e}</button>
                ))}
              </div>
            </div>
            <button onClick={start} className="w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-base font-bold flex items-center justify-center gap-2">
              <Play className="w-5 h-5" />开始 {preset.duration} 分钟
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center mb-3">
              <div className="relative w-32 h-32 mb-2">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" className="text-ink-200 dark:text-ink-800" strokeWidth="6" />
                  <circle cx="60" cy="60" r="48" fill="none" stroke="url(#g)" strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 48} strokeDashoffset={2 * Math.PI * 48 * (1 - progress / 100)} />
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <TypeIcon className="w-5 h-5 text-violet-500" />
                  <p className="text-2xl font-bold tabular-nums">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</p>
                </div>
              </div>
              <p className="text-xs text-violet-500 italic text-center max-w-xs">"{SCRIPT_SAMPLES[type]?.[phase] || '专注于呼吸...'}"</p>
            </div>
            <div className="flex items-center justify-center gap-2">
              <button onClick={stop} className="w-10 h-10 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={pause} className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-lg">
                {paused ? <Play className="w-6 h-6 ml-0.5" /> : <Pause className="w-6 h-6" />}
              </button>
              <button onClick={() => setVoice(!voice)} className={cn('w-10 h-10 rounded-full flex items-center justify-center', voice ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500' : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}>
                {voice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-semibold mb-1.5">最近记录</p>
        {sessions.length === 0 ? (
          <p className="text-center text-xs text-ink-500 py-3">还没有记录</p>
        ) : (
          <div className="space-y-1">
            {sessions.slice(0, 5).map((s) => {
              const M = TYPE_META[s.type]
              const Icon = M.icon
              return (
                <div key={s.id} className="flex items-center gap-1.5 text-[10px] py-0.5">
                  <Icon className="w-3 h-3 text-indigo-500" />
                  <span className="font-semibold">{M.label}</span>
                  <span className="text-ink-500">{s.duration}m</span>
                  <span className="text-ink-500">{s.date}</span>
                  <span className="ml-auto text-ink-400">{['😢', '😕', '😐', '😊', '🤩'][s.moodBefore - 1]}→{['😢', '😕', '😐', '😊', '🤩'][s.moodAfter - 1]}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
