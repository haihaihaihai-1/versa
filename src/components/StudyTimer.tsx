import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Clock, Play, Pause, RotateCcw, Plus, Trash2, Sparkles, Loader2, BookOpen, Coffee, Target, Check, Flame, BarChart3, Brain, Zap } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Subject {
  id: string
  name: string
  color: string
  target: number
  done: number
}

interface Session {
  id: string
  subjectId: string
  duration: number
  date: string
  type: 'focus' | 'break'
  completed: boolean
}

const STORAGE_KEY = 'versa:study-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }
function loadSubjects(): Subject[] { try { const s = localStorage.getItem(STORAGE_KEY + ':sub'); if (s) return JSON.parse(s) } catch {} return seedSubjects() }
function saveSubjects(d: Subject[]) { try { localStorage.setItem(STORAGE_KEY + ':sub', JSON.stringify(d)) } catch {} }
function loadSessions(): Session[] { try { const s = localStorage.getItem(STORAGE_KEY + ':ses'); if (s) return JSON.parse(s) } catch {} return [] }
function saveSessions(d: Session[]) { try { localStorage.setItem(STORAGE_KEY + ':ses', JSON.stringify(d)) } catch {} }

function seedSubjects(): Subject[] {
  return [
    { id: 'sub1', name: '英语', color: '#10b981', target: 60, done: 0 },
    { id: 'sub2', name: '数学', color: '#3b82f6', target: 90, done: 0 },
    { id: 'sub3', name: '专业课', color: '#8b5cf6', target: 120, done: 0 },
  ]
}

const PRESETS = [
  { name: '25/5', focus: 25, break: 5, label: '经典' },
  { name: '50/10', focus: 50, break: 10, label: '深度' },
  { name: '90/20', focus: 90, break: 20, label: '超长' },
  { name: '15/3', focus: 15, break: 3, label: '冲刺' },
] as const

function playBeep(freq = 800, duration = 200) {
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

export function StudyTimer() {
  const [subjects, setSubjects] = useState<Subject[]>(loadSubjects())
  const [sessions, setSessions] = useState<Session[]>(loadSessions())
  const [activeSub, setActiveSub] = useState<string | null>(subjects[0]?.id || null)
  const [preset, setPreset] = useState<typeof PRESETS[number]>(PRESETS[0])
  const [mode, setMode] = useState<'focus' | 'break'>('focus')
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(PRESETS[0].focus * 60)
  const [todayFocus, setTodayFocus] = useState(0)
  const [streak, setStreak] = useState(0)
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#10b981')
  const [newTarget, setNewTarget] = useState('60')
  const tickRef = useRef<number | undefined>(undefined)

  useEffect(() => { saveSubjects(subjects) }, [subjects])
  useEffect(() => { saveSessions(sessions) }, [sessions])

  // compute today's minutes per subject
  useEffect(() => {
    const today = todayKey()
    const todaySess = sessions.filter((s) => s.date === today && s.type === 'focus' && s.completed)
    setTodayFocus(todaySess.reduce((s, x) => s + x.duration, 0))
    const updated = subjects.map((sub) => ({
      ...sub,
      done: todaySess.filter((s) => s.subjectId === sub.id).reduce((s, x) => s + x.duration, 0)
    }))
    setSubjects(updated)
    // compute streak
    let cursor = new Date()
    let count = 0
    for (let i = 0; i < 365; i++) {
      const d = cursor.toISOString().split('T')[0]
      const has = sessions.some((s) => s.date === d && s.type === 'focus' && s.completed)
      if (has) { count++; cursor.setDate(cursor.getDate() - 1) } else break
    }
    setStreak(count)
  }, [sessions])

  useEffect(() => {
    if (running) {
      tickRef.current = window.setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            setRunning(false)
            if (mode === 'focus' && activeSub) {
              playBeep(1200, 400)
              setSessions((ss) => [{ id: uid(), subjectId: activeSub, duration: preset.focus, date: new Date().toISOString().split('T')[0], type: 'focus', completed: true }, ...ss])
              toast(`✓ ${preset.focus} 分钟完成!`, 'success')
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
    } else if (tickRef.current) {
      window.clearInterval(tickRef.current)
    }
    return () => { if (tickRef.current) window.clearInterval(tickRef.current) }
  }, [running, mode, preset, activeSub])

  const addSub = () => {
    if (!newName.trim()) { toast('请输入', 'error'); return }
    const s: Subject = { id: uid(), name: newName, color: newColor, target: +newTarget, done: 0 }
    setSubjects([s, ...subjects])
    setActiveSub(s.id)
    setAdding(false)
    setNewName(''); setNewTarget('60'); setNewColor('#10b981')
    toast('已添加', 'success')
  }

  const removeSub = (id: string) => {
    setSubjects(subjects.filter((s) => s.id !== id))
    if (activeSub === id) setActiveSub(subjects[0]?.id || null)
  }

  const switchPreset = (p: typeof PRESETS[number]) => {
    if (running) { toast('请先暂停', 'error'); return }
    setPreset(p); setRemaining(p.focus * 60); setMode('focus')
  }

  const reset = () => {
    setRunning(false); setRemaining(preset.focus * 60); setMode('focus')
  }

  const today = todayKey()
  const todaySess = sessions.filter((s) => s.date === today && s.type === 'focus' && s.completed)
  const totalToday = todaySess.reduce((s, x) => s + x.duration, 0)
  const totalAll = sessions.filter((s) => s.type === 'focus' && s.completed).reduce((s, x) => s + x.duration, 0)
  const targetTotal = subjects.reduce((s, x) => s + x.target, 0)
  const totalProgress = targetTotal > 0 ? Math.min(100, (totalToday / targetTotal) * 100) : 0

  // Last 7 days
  const last7 = (() => {
    const arr: { date: string; minutes: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const minutes = sessions.filter((s) => s.date === key && s.type === 'focus' && s.completed).reduce((s, x) => s + x.duration, 0)
      arr.push({ date: key, minutes })
    }
    return arr
  })()
  const maxMin = Math.max(...last7.map((d) => d.minutes), 60)

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`用户今日学习 ${totalToday} 分钟, 目标 ${targetTotal} 分钟. 给出 1 段 60 字内学习建议, 中文`, '你是 Versa 学习教练, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const totalSec = (mode === 'focus' ? preset.focus : preset.break) * 60
  const progress = ((totalSec - remaining) / totalSec) * 100

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5" />
          <h2 className="text-lg font-bold">学习计时</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">番茄钟 · 学科管理 · 连续打卡</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalToday}m</p>
            <p className="text-[9px] opacity-80">今日</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{Math.round(totalProgress)}%</p>
            <p className="text-[9px] opacity-80">完成度</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold flex items-center justify-center gap-0.5">
              <Flame className="w-3.5 h-3.5" />{streak}
            </p>
            <p className="text-[9px] opacity-80">连续天</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{(totalAll / 60).toFixed(0)}h</p>
            <p className="text-[9px] opacity-80">累计</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex flex-col items-center">
          <div className="relative w-32 h-32 mb-2">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="48" fill="none" stroke="currentColor" className="text-ink-200 dark:text-ink-800" strokeWidth="6" />
              <circle cx="60" cy="60" r="48" fill="none" stroke={mode === 'focus' ? '#10b981' : '#f59e0b'} strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 48} strokeDashoffset={2 * Math.PI * 48 * (1 - progress / 100)} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-bold tabular-nums">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</p>
              <p className={cn('text-[10px] font-semibold', mode === 'focus' ? 'text-emerald-500' : 'text-amber-500')}>
                {mode === 'focus' ? '🎯 专注' : '☕ 休息'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="w-10 h-10 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </button>
            <button onClick={() => setRunning(!running)} className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 text-white flex items-center justify-center shadow-lg">
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
            <button key={p.name} onClick={() => switchPreset(p)} className={cn('h-12 rounded-xl text-[10px] font-semibold flex flex-col items-center justify-center', preset.name === p.name ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              <Zap className="w-3 h-3 mb-0.5" />{p.label}
              <span className="text-[9px] opacity-80">{p.focus}/{p.break}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加学科
        </button>
      </div>

      {aiTip && (
        <div className="bg-emerald-50/40 dark:bg-emerald-900/20 rounded-xl p-2 border border-emerald-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-semibold mb-1.5">近 7 天</p>
        <div className="flex items-end justify-between h-16 gap-1">
          {last7.map((d) => {
            const pct = (d.minutes / maxMin) * 100
            const day = new Date(d.date).toLocaleDateString('zh-CN', { weekday: 'short' })
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full h-12 flex flex-col justify-end">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${pct}%` }} className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-teal-500" />
                </div>
                <p className="text-[9px] text-ink-500">{day}</p>
                <p className="text-[9px] font-bold">{d.minutes > 0 ? d.minutes : '-'}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold">学科</p>
        {subjects.length === 0 ? (
          <p className="text-center text-xs text-ink-500 py-3">还没有学科</p>
        ) : subjects.map((s) => {
          const pct = Math.min(100, (s.done / s.target) * 100)
          const isActive = activeSub === s.id
          return (
            <div key={s.id} onClick={() => setActiveSub(s.id)} className={cn('rounded-xl p-2 border cursor-pointer transition-all', isActive ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-900/20' : 'border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/30')}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                <p className="text-sm font-bold flex-1">{s.name}</p>
                <p className="text-[10px] text-ink-500">{s.done}/{s.target}m</p>
                <button onClick={(e) => { e.stopPropagation(); removeSub(s.id) }} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
              <div className="mt-1 h-1 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${pct}%`, background: s.color }} />
              </div>
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">添加学科</h3>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="学科名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">颜色</p>
                <div className="flex gap-1">
                  {['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'].map((c) => (
                    <button key={c} onClick={() => setNewColor(c)} className={cn('w-7 h-7 rounded-full', newColor === c && 'ring-2 ring-offset-2 ring-ink-400')} style={{ background: c }} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">目标 (分钟)</p>
                <input type="number" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <button onClick={addSub} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
