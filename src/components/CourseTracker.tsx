import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookMarked, Plus, Trash2, Sparkles, Loader2, Play, Check, Clock, Star, Target, Award, ChevronRight, Calendar, FileText, Layers } from 'lucide-react'
import { cn, uid, formatNumber } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Lesson {
  id: string
  title: string
  done: boolean
  duration: number
}

interface Course {
  id: string
  name: string
  platform: string
  category: 'programming' | 'language' | 'design' | 'business' | 'math' | 'science' | 'art' | 'other'
  totalLessons: number
  completedLessons: number
  hours: number
  completedHours: number
  deadline: string
  startDate: string
  instructor: string
  rating: 1 | 2 | 3 | 4 | 5
  cost: number
  status: 'wishlist' | 'active' | 'paused' | 'completed'
  notes: string
  lessons: Lesson[]
}

const STORAGE_KEY = 'versa:courses-v1'

function load(): Course[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Course[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Course[] {
  return [
    { id: 'c1', name: 'CS50 计算机科学导论', platform: 'edX', category: 'programming', totalLessons: 22, completedLessons: 8, hours: 100, completedHours: 36, deadline: '2026-12-31', startDate: '2026-03-01', instructor: 'David Malan', rating: 5, cost: 0, status: 'active', notes: '哈佛经典', lessons: [
      { id: uid(), title: '第 1 周: 计算思维', done: true, duration: 120 },
      { id: uid(), title: '第 2 周: C 语言', done: true, duration: 90 },
      { id: uid(), title: '第 3 周: 算法', done: true, duration: 110 },
      { id: uid(), title: '第 4 周: 内存', done: true, duration: 100 },
      { id: uid(), title: '第 5 周: 数据结构', done: false, duration: 130 },
    ] },
    { id: 'c2', name: '深度学习专项课', platform: 'Coursera', category: 'programming', totalLessons: 60, completedLessons: 12, hours: 180, completedHours: 36, deadline: '2026-10-15', startDate: '2026-02-01', instructor: 'Andrew Ng', rating: 5, cost: 399, status: 'active', notes: '5 门课程, 进度需加快', lessons: [] },
    { id: 'c3', name: '设计基础', platform: 'Skillshare', category: 'design', totalLessons: 25, completedLessons: 25, hours: 30, completedHours: 30, deadline: '', startDate: '2025-09-01', instructor: '设计师 Lily', rating: 4, cost: 199, status: 'completed', notes: '已完结', lessons: [] },
    { id: 'c4', name: '商务英语口语', platform: '多邻国', category: 'language', totalLessons: 100, completedLessons: 30, hours: 50, completedHours: 15, deadline: '', startDate: '2026-04-01', instructor: 'Duolingo', rating: 3, cost: 0, status: 'paused', notes: '暂缓', lessons: [] },
  ]
}

const CAT_META = {
  programming: { label: '编程', icon: '💻', color: 'from-emerald-500 to-green-500' },
  language: { label: '语言', icon: '🌐', color: 'from-blue-500 to-cyan-500' },
  design: { label: '设计', icon: '🎨', color: 'from-pink-500 to-rose-500' },
  business: { label: '商业', icon: '💼', color: 'from-violet-500 to-purple-500' },
  math: { label: '数学', icon: '🔢', color: 'from-amber-500 to-orange-500' },
  science: { label: '科学', icon: '🔬', color: 'from-cyan-500 to-teal-500' },
  art: { label: '艺术', icon: '🖼️', color: 'from-rose-500 to-pink-500' },
  other: { label: '其他', icon: '📚', color: 'from-ink-500 to-ink-600' },
} as const

const STATUS_META = {
  wishlist: { label: '想学', color: 'bg-ink-400' },
  active: { label: '在学', color: 'bg-emerald-500' },
  paused: { label: '暂停', color: 'bg-amber-500' },
  completed: { label: '完成', color: 'bg-blue-500' },
} as const

export function CourseTracker() {
  const [courses, setCourses] = useState<Course[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | Course['status']>('active')
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState('Coursera')
  const [category, setCategory] = useState<Course['category']>('programming')
  const [totalLessons, setTotalLessons] = useState('20')
  const [hours, setHours] = useState('40')
  const [deadline, setDeadline] = useState('')
  const [instructor, setInstructor] = useState('')
  const [cost, setCost] = useState('0')
  const [status, setStatus] = useState<Course['status']>('wishlist')

  useEffect(() => { save(courses) }, [courses])

  const totalCourses = courses.length
  const activeCourses = courses.filter((c) => c.status === 'active').length
  const completedCourses = courses.filter((c) => c.status === 'completed').length
  const totalHours = courses.reduce((s, c) => s + c.completedHours, 0)
  const totalCost = courses.reduce((s, c) => s + c.cost, 0)
  const avgProgress = courses.length > 0 ? (courses.reduce((s, c) => s + c.completedLessons / Math.max(1, c.totalLessons), 0) / courses.length) * 100 : 0

  const filtered = (filter === 'all' ? courses : courses.filter((c) => c.status === filter)).sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1
    if (b.status === 'active' && a.status !== 'active') return 1
    if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline)
    return 0
  })

  const toggleLesson = (courseId: string, lessonId: string) => {
    setCourses(courses.map((c) => {
      if (c.id !== courseId) return c
      const lessons = c.lessons.map((l) => l.id === lessonId ? { ...l, done: !l.done } : l)
      const completedLessons = lessons.filter((l) => l.done).length
      const completedHours = Math.round(lessons.filter((l) => l.done).reduce((s, l) => s + l.duration / 60, 0))
      const newStatus = completedLessons === c.totalLessons ? 'completed' : c.status
      return { ...c, lessons, completedLessons, completedHours, status: newStatus }
    }))
  }

  const removeCourse = (id: string) => setCourses(courses.filter((c) => c.id !== id))

  const add = () => {
    if (!name.trim()) { toast('请输入课程名', 'error'); return }
    const c: Course = { id: uid(), name, platform, category, totalLessons: +totalLessons, completedLessons: 0, hours: +hours, completedHours: 0, deadline, startDate: new Date().toISOString().split('T')[0], instructor, rating: 3, cost: +cost, status, notes: '', lessons: [] }
    setCourses([c, ...courses])
    setName(''); setTotalLessons('20'); setHours('40'); setDeadline(''); setInstructor(''); setCost('0')
    setAdding(false)
    toast('已添加', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = courses.filter((c) => c.status === 'active').map((c) => `${c.name} ${Math.round((c.completedLessons / c.totalLessons) * 100)}%`).join('; ')
      const result = await aiComplete(`用户在学课程: ${summary}. 给出 1 段 60 字内学习路径建议, 中文`, '你是 Versa 学习规划师, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BookMarked className="w-5 h-5" />
          <h2 className="text-lg font-bold">课程追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">进度管理 · 截止提醒 · 课时统计</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalCourses}</p>
            <p className="text-[9px] opacity-80">课程</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{activeCourses}</p>
            <p className="text-[9px] opacity-80">在学</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{Math.round(avgProgress)}%</p>
            <p className="text-[9px] opacity-80">平均</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalHours}h</p>
            <p className="text-[9px] opacity-80">学习时</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加课程
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-blue-50/40 dark:bg-blue-900/20 rounded-xl p-2 border border-blue-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['active', 'wishlist', 'paused', 'completed', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : STATUS_META[f].label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <BookMarked className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有课程</p>
          </div>
        ) : filtered.map((c) => {
          const pct = (c.completedLessons / c.totalLessons) * 100
          const daysLeft = c.deadline ? Math.ceil((new Date(c.deadline).getTime() - Date.now()) / 86400000) : 0
          const onTrack = daysLeft > 0 && pct > 0
          const urgent = daysLeft > 0 && daysLeft < 30 && pct < 80
          const CM = CAT_META[c.category]
          const SM = STATUS_META[c.status]
          return (
            <motion.div key={c.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center gap-2">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br', CM.color)}>
                  <span className="text-xl">{CM.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold truncate">{c.name}</p>
                    <span className={cn('text-[9px] px-1 py-0.5 rounded text-white font-semibold', SM.color)}>{SM.label}</span>
                  </div>
                  <p className="text-[10px] text-ink-500">{c.platform} · {c.instructor} · ⭐{c.rating}</p>
                </div>
                {c.cost > 0 && <span className="text-[10px] text-amber-500 font-bold">¥{c.cost}</span>}
                <button onClick={() => removeCourse(c.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <div className="flex-1 h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className={cn('h-full bg-gradient-to-r', CM.color)} />
                </div>
                <span className="text-[10px] font-bold">{Math.round(pct)}%</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-ink-500">
                <span>📚 {c.completedLessons}/{c.totalLessons} 节</span>
                <span>⏱️ {c.completedHours}h/{c.hours}h</span>
                {c.deadline && (
                  <span className={cn('ml-auto', urgent ? 'text-rose-500 font-bold' : '')}>
                    {daysLeft > 0 ? `📅 ${daysLeft} 天` : '⏰ 已过'}
                  </span>
                )}
              </div>
              {c.lessons.length > 0 && (
                <div className="mt-1.5 space-y-0.5 max-h-32 overflow-y-auto">
                  {c.lessons.slice(0, 5).map((l) => (
                    <button key={l.id} onClick={() => toggleLesson(c.id, l.id)} className="w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-left hover:bg-ink-50 dark:hover:bg-ink-800/50">
                      <div className={cn('w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0', l.done ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300')}>
                        {l.done && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={cn('text-[10px] flex-1', l.done && 'line-through opacity-60')}>{l.title}</span>
                      <span className="text-[9px] text-ink-400">{l.duration}m</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">添加课程</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="课程名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="平台" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={instructor} onChange={(e) => setInstructor(e.target.value)} placeholder="讲师" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">分类</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                  const M = CAT_META[k]
                  return (
                    <button key={k} onClick={() => setCategory(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold', category === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      <span className="text-base">{M.icon}</span>
                      <span className="text-[9px]">{M.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">总课时</p>
                <input type="number" value={totalLessons} onChange={(e) => setTotalLessons(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">总小时</p>
                <input type="number" value={hours} onChange={(e) => setHours(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">截止日</p>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">费用</p>
                <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map((k) => (
                <button key={k} onClick={() => setStatus(k as any)} className={cn('h-9 rounded-lg text-[10px] font-semibold', status === k ? `${STATUS_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>{STATUS_META[k].label}</button>
              ))}
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
