import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Timer, Plus, Trash2, Play, Pause, RotateCcw, ChefHat, Flame, Snowflake, Egg, Coffee, Pizza, Volume2 } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface TimerSlot {
  id: string
  name: string
  duration: number
  remaining: number
  running: boolean
  type: 'boil' | 'bake' | 'fry' | 'rest' | 'steam' | 'chill'
}

const STORAGE_KEY = 'versa:kitchen-timers-v1'

function load(): TimerSlot[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: TimerSlot[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const TYPE_META = {
  boil: { label: '煮', icon: '💧', color: 'from-blue-500 to-cyan-500' },
  bake: { label: '烤', icon: '🔥', color: 'from-orange-500 to-red-500' },
  fry: { label: '炒', icon: '🍳', color: 'from-amber-500 to-orange-500' },
  rest: { label: '醒', icon: '⏰', color: 'from-violet-500 to-purple-500' },
  steam: { label: '蒸', icon: '♨️', color: 'from-cyan-500 to-teal-500' },
  chill: { label: '冷藏', icon: '❄️', color: 'from-blue-400 to-indigo-500' },
} as const

const PRESETS = [
  { name: '煮蛋 (溏心)', duration: 6 * 60, type: 'boil' as const },
  { name: '煮蛋 (全熟)', duration: 10 * 60, type: 'boil' as const },
  { name: '煮面条', duration: 8 * 60, type: 'boil' as const },
  { name: '炖汤', duration: 60 * 60, type: 'boil' as const },
  { name: '烤鸡', duration: 75 * 60, type: 'bake' as const },
  { name: '烤饼干', duration: 12 * 60, type: 'bake' as const },
  { name: '煎牛排', duration: 4 * 60, type: 'fry' as const },
  { name: '醒面', duration: 30 * 60, type: 'rest' as const },
  { name: '蒸鱼', duration: 10 * 60, type: 'steam' as const },
  { name: '蒸馒头', duration: 15 * 60, type: 'steam' as const },
]

function playBeep(duration = 300, freq = 800) {
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

function playAlarm() {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => playBeep(200, 1000), i * 400)
  }
}

export function CookingTimer() {
  const [timers, setTimers] = useState<TimerSlot[]>(load())
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [duration, setDuration] = useState('10')
  const [type, setType] = useState<TimerSlot['type']>('boil')
  const tickRef = useRef<number | undefined>(undefined)

  useEffect(() => { save(timers) }, [timers])

  useEffect(() => {
    if (timers.some((t) => t.running)) {
      tickRef.current = window.setInterval(() => {
        setTimers((ts) => ts.map((t) => {
          if (!t.running) return t
          const newRem = t.remaining - 1
          if (newRem <= 0) {
            playAlarm()
            toast(`⏰ ${t.name} 完成!`, 'success')
            return { ...t, remaining: 0, running: false }
          }
          return { ...t, remaining: newRem }
        }))
      }, 1000)
    } else if (tickRef.current) {
      window.clearInterval(tickRef.current)
    }
    return () => { if (tickRef.current) window.clearInterval(tickRef.current) }
  }, [timers.some((t) => t.running)])

  const add = () => {
    if (!name.trim() || !duration) { toast('请填写', 'error'); return }
    const dur = Math.max(1, +duration) * 60
    const t: TimerSlot = { id: uid(), name, duration: dur, remaining: dur, running: false, type }
    setTimers([...timers, t])
    setName(''); setDuration('10'); setType('boil')
    setAdding(false)
    toast('已添加', 'success')
  }

  const addPreset = (p: typeof PRESETS[number]) => {
    const t: TimerSlot = { id: uid(), name: p.name, duration: p.duration, remaining: p.duration, running: false, type: p.type }
    setTimers([...timers, t])
    toast('已添加', 'success')
  }

  const toggle = (id: string) => setTimers(timers.map((t) => t.id === id ? { ...t, running: !t.running } : t))
  const reset = (id: string) => setTimers(timers.map((t) => t.id === id ? { ...t, remaining: t.duration, running: false } : t))
  const remove = (id: string) => setTimers(timers.filter((t) => t.id !== id))
  const adjust = (id: string, delta: number) => setTimers(timers.map((t) => t.id === id ? { ...t, remaining: Math.max(0, t.remaining + delta * 60), duration: t.remaining + delta * 60 > 0 ? t.remaining + delta * 60 : t.duration } : t))

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const totalActive = timers.filter((t) => t.running).length

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Timer className="w-5 h-5" />
          <h2 className="text-lg font-bold">厨房计时</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">多任务并行 · 6 种类型 · 预设</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{timers.length}</p>
            <p className="text-[9px] opacity-80">计时器</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-emerald-100">{totalActive}</p>
            <p className="text-[9px] opacity-80">运行中</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{timers.filter((t) => t.remaining === 0).length}</p>
            <p className="text-[9px] opacity-80">完成</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{PRESETS.length}</p>
            <p className="text-[9px] opacity-80">预设</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button onClick={() => setAdding(true)} className="h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />自定义
        </button>
        <div className="text-xs text-ink-500 self-center text-center">或选预设 ↓</div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1.5">常用预设</p>
        <div className="grid grid-cols-3 gap-1.5">
          {PRESETS.map((p) => (
            <button key={p.name} onClick={() => addPreset(p)} className="h-12 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 flex flex-col items-center justify-center text-[10px] active:scale-95 transition">
              <span className="text-base">{TYPE_META[p.type].icon}</span>
              <span className="font-semibold">{p.name}</span>
              <span className="text-[9px] text-ink-500">{p.duration / 60}m</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        {timers.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Timer className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有计时器</p>
          </div>
        ) : timers.map((t) => {
          const TM = TYPE_META[t.type]
          const pct = (t.remaining / t.duration) * 100
          const isUrgent = pct < 20 && t.running
          return (
            <motion.div key={t.id} whileHover={{ y: -1 }} className={cn('rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border', isUrgent ? 'border-rose-400' : 'border-ink-200/60 dark:border-ink-800/60')}>
              <div className="flex items-center gap-2">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-2xl bg-gradient-to-br', TM.color)}>
                  {TM.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{t.name}</p>
                  <p className={cn('text-xl font-bold tabular-nums', t.remaining === 0 ? 'text-emerald-500' : isUrgent ? 'text-rose-500' : 'text-cyan-500')}>
                    {t.remaining === 0 ? '✓ 完成' : formatTime(t.remaining)}
                  </p>
                </div>
                <button onClick={() => toggle(t.id)} disabled={t.remaining === 0} className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white', TM.color, t.remaining === 0 && 'opacity-30')}>
                  {t.running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <button onClick={() => reset(t.id)} className="w-8 h-8 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
                  <RotateCcw className="w-3 h-3" />
                </button>
                <button onClick={() => remove(t.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
              {t.running && (
                <div className="mt-1.5 h-1 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${pct}%` }} className={cn('h-full', isUrgent ? 'bg-rose-500' : 'bg-cyan-500')} />
                </div>
              )}
              <div className="mt-1 flex items-center gap-1">
                <button onClick={() => adjust(t.id, -1)} className="px-2 h-5 rounded bg-ink-100 dark:bg-ink-800 text-[9px]">-1分</button>
                <button onClick={() => adjust(t.id, 1)} className="px-2 h-5 rounded bg-ink-100 dark:bg-ink-800 text-[9px]">+1分</button>
                <button onClick={() => adjust(t.id, 5)} className="px-2 h-5 rounded bg-ink-100 dark:bg-ink-800 text-[9px]">+5分</button>
                <span className="text-[9px] text-ink-500 ml-auto">{TM.label} · {formatTime(t.duration)}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">自定义计时器</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称 (如 煮意面)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">类型</p>
              <div className="grid grid-cols-6 gap-1.5">
                {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                  const M = TYPE_META[k]
                  return (
                    <button key={k} onClick={() => setType(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', type === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      <span className="text-base">{M.icon}</span>
                      <span className="text-[9px] mt-0.5">{M.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-0.5">时长 (分钟)</p>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
