import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, Play, Pause, Square, Plus, Trash2, Tag, BarChart3, Sparkles, Loader2, Clock, Edit3 } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface TimeEntry {
  id: string
  task: string
  tags: string[]
  start: number
  end: number
  duration: number
  note: string
}

const STORAGE_KEY = 'versa:time-tracker'

function load(): TimeEntry[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: TimeEntry[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const TAG_PRESETS = ['工作', '学习', '会议', '写作', '编程', '阅读', '运动', '休息']

export function TimeTracker() {
  const [entries, setEntries] = useState<TimeEntry[]>(load())
  const [activeTask, setActiveTask] = useState<string>('')
  const [activeTags, setActiveTags] = useState<string[]>([])
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | string>('today')
  const [adding, setAdding] = useState(false)
  const [aiReport, setAiReport] = useState('')
  const [loading, setLoading] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [newTags, setNewTags] = useState<string[]>([])
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [newNote, setNewNote] = useState('')
  const intervalRef = useRef<number | undefined>(undefined)

  useEffect(() => { save(entries) }, [entries])

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current) }
  }, [running, startTime])

  const start = () => {
    if (!activeTask.trim()) { toast('请先输入任务', 'error'); return }
    setStartTime(Date.now() - elapsed * 1000)
    setRunning(true)
  }
  const pause = () => setRunning(false)
  const stop = () => {
    if (!activeTask) return
    const e: TimeEntry = { id: uid(), task: activeTask, tags: activeTags, start: startTime, end: Date.now(), duration: Math.floor((Date.now() - startTime) / 1000), note: '' }
    setEntries([e, ...entries])
    toast(`已记录 ${Math.floor(e.duration / 60)} 分钟`, 'success')
    setActiveTask(''); setActiveTags([]); setElapsed(0); setRunning(false)
  }
  const discard = () => { setActiveTask(''); setActiveTags([]); setElapsed(0); setRunning(false) }

  const addManual = () => {
    if (!newTask.trim() || !newStart || !newEnd) { toast('请填写完整', 'error'); return }
    const start = new Date(newStart).getTime()
    const end = new Date(newEnd).getTime()
    if (end <= start) { toast('结束时间需晚于开始', 'error'); return }
    const e: TimeEntry = { id: uid(), task: newTask, tags: newTags, start, end, duration: Math.floor((end - start) / 1000), note: newNote }
    setEntries([e, ...entries])
    setNewTask(''); setNewTags([]); setNewStart(''); setNewEnd(''); setNewNote('')
    setAdding(false)
    toast('已记录', 'success')
  }

  const remove = (id: string) => setEntries(entries.filter((e) => e.id !== id))

  const filtered = (() => {
    const now = Date.now()
    if (filter === 'today') return entries.filter((e) => new Date(e.start).toDateString() === new Date(now).toDateString())
    if (filter === 'week') return entries.filter((e) => now - e.start < 7 * 86400000)
    if (filter !== 'all') return entries.filter((e) => e.tags.includes(filter))
    return entries
  })()

  const todayTotal = entries.filter((e) => new Date(e.start).toDateString() === new Date().toDateString()).reduce((s, e) => s + e.duration, 0)
  const weekTotal = entries.filter((e) => Date.now() - e.start < 7 * 86400000).reduce((s, e) => s + e.duration, 0)
  const tagStats = (() => {
    const map: Record<string, number> = {}
    entries.forEach((e) => e.tags.forEach((t) => map[t] = (map[t] || 0) + e.duration))
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
  })()

  const last7 = (() => {
    const out: { day: string; secs: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const total = entries.filter((e) => new Date(e.start).toDateString() === d.toDateString()).reduce((s, e) => s + e.duration, 0)
      out.push({ day: ['日', '一', '二', '三', '四', '五', '六'][d.getDay()], secs: total })
    }
    return out
  })()

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`分析用户时间使用并给出 1 段 60-80 字建议, 总时长 ${Math.round(weekTotal / 60)} 分钟, 重点: ${tagStats.slice(0, 3).map(([t]) => t).join('/')}`, '你是 Versa 效率分析师, 简洁专业, 中文')
      setAiReport(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const hours = Math.floor(elapsed / 3600)
  const mins = Math.floor((elapsed % 3600) / 60)
  const secs = elapsed % 60
  const allTags = Array.from(new Set(entries.flatMap((e) => e.tags)))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Timer className="w-5 h-5" />
          <h2 className="text-lg font-bold">时间追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">任务计时 · 标签 · 周报</p>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{Math.round(todayTotal / 60)}m</p>
            <p className="text-[10px] opacity-80">今日</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{Math.round(weekTotal / 60)}m</p>
            <p className="text-[10px] opacity-80">本周</p>
          </div>
        </div>
      </div>

      <div className={cn('rounded-2xl p-4 text-white bg-gradient-to-br', running ? 'from-emerald-500 to-teal-500' : 'from-slate-700 to-slate-900')}>
        <input value={activeTask} onChange={(e) => setActiveTask(e.target.value)} placeholder="在做什么?" className="w-full px-3 h-9 rounded-lg bg-white/15 backdrop-blur text-sm placeholder-white/60 outline-none focus:bg-white/25" />
        <div className="flex flex-wrap gap-1 mt-2 mb-3">
          {TAG_PRESETS.map((t) => (
            <button key={t} onClick={() => setActiveTags(activeTags.includes(t) ? activeTags.filter((x) => x !== t) : [...activeTags, t])} className={cn('px-2 h-6 rounded-full text-[10px] font-semibold', activeTags.includes(t) ? 'bg-white text-slate-900' : 'bg-white/20 text-white')}>
              {t}
            </button>
          ))}
        </div>
        <p className="text-3xl font-bold font-mono text-center my-2">{String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</p>
        <div className="flex justify-center gap-1.5">
          {!running ? (
            <button onClick={start} className="w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center"><Play className="w-4 h-4 ml-0.5" /></button>
          ) : (
            <button onClick={pause} className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center"><Pause className="w-4 h-4" /></button>
          )}
          <button onClick={stop} disabled={elapsed < 5} className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center disabled:opacity-50"><Square className="w-4 h-4" /></button>
          {elapsed > 0 && <button onClick={discard} className="px-3 h-10 rounded-full bg-rose-500 text-white text-xs">放弃</button>}
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-8 rounded-lg bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />手动添加
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 报告
        </button>
      </div>

      {aiReport && (
        <div className="bg-blue-50/40 dark:bg-blue-900/20 rounded-xl p-2 border border-blue-200/40">
          <p className="text-[10px] leading-relaxed">{aiReport}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" />近 7 天</p>
        <div className="flex items-end gap-1.5 h-16">
          {last7.map((d, i) => {
            const max = Math.max(1, ...last7.map((x) => x.secs))
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex-1 w-full flex items-end">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${(d.secs / max) * 100}%` }} className="w-full bg-gradient-to-t from-blue-500 to-cyan-500 rounded-t" />
                </div>
                <p className="text-[9px] text-ink-500">{d.day}</p>
              </div>
            )
          })}
        </div>
      </div>

      {tagStats.length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-xs font-bold mb-1.5">本周分类 TOP 5</p>
          <div className="space-y-1">
            {tagStats.map(([tag, secs], i) => {
              const max = Math.max(...tagStats.map(([_, s]) => s))
              return (
                <div key={tag} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-ink-500 w-12">{tag}</span>
                  <div className="flex-1 h-4 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(secs / max) * 100}%` }} className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" />
                  </div>
                  <span className="text-[10px] text-ink-500 w-12 text-right">{Math.round(secs / 60)}m</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'today', 'week', ...allTags] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f as any)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'today' ? '今日' : f === 'week' ? '本周' : `#${f}`}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有记录</p>
          </div>
        ) : filtered.slice(0, 15).map((e) => {
          const hours = Math.floor(e.duration / 3600)
          const mins = Math.floor((e.duration % 3600) / 60)
          return (
            <div key={e.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {hours > 0 ? `${hours}h` : `${mins}m`}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{e.task}</p>
                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                  {e.tags.map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">#{t}</span>)}
                  <span className="text-[9px] text-ink-500 ml-auto">{formatTimeAgo(new Date(e.start).toISOString())}</span>
                </div>
              </div>
              <button onClick={() => remove(e.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">手动添加</h3>
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="任务" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs" />
              <input type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs" />
            </div>
            <div className="flex flex-wrap gap-1">
              {TAG_PRESETS.map((t) => (
                <button key={t} onClick={() => setNewTags(newTags.includes(t) ? newTags.filter((x) => x !== t) : [...newTags, t])} className={cn('px-2 h-6 rounded-full text-[10px] font-semibold', newTags.includes(t) ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{t}</button>
              ))}
            </div>
            <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="备注" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={addManual} className="w-full h-9 rounded-lg bg-blue-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
