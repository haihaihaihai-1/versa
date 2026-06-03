import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Plus, Trash2, Sparkles, Loader2, Clock, MapPin, ChevronLeft, ChevronRight, Cake, PartyPopper, Briefcase, GraduationCap, Heart, Repeat } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Event {
  id: string
  title: string
  date: string
  time: string
  type: 'birthday' | 'anniversary' | 'school' | 'work' | 'medical' | 'social' | 'holiday' | 'other'
  attendees: string[]
  location: string
  notes: string
  reminder: boolean
  recurring: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
}

const STORAGE_KEY = 'versa:fam-calendar-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }

function load(): Event[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Event[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Event[] {
  const today = todayKey()
  return [
    { id: '1', title: '小宝家长会', date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], time: '18:00', type: 'school', attendees: ['妈妈', '爸爸'], location: '学校会议室', notes: '带成绩单', reminder: true, recurring: 'none' },
    { id: '2', title: '小宝生日', date: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], time: '00:00', type: 'birthday', attendees: ['全家'], location: '家里', notes: '订蛋糕', reminder: true, recurring: 'yearly' },
    { id: '3', title: '爸爸体检', date: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], time: '09:00', type: 'medical', attendees: ['爸爸'], location: '中心医院', notes: '空腹', reminder: true, recurring: 'none' },
    { id: '4', title: '结婚纪念日', date: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0], time: '00:00', type: 'anniversary', attendees: ['妈妈', '爸爸'], location: '', notes: '', reminder: true, recurring: 'yearly' },
  ]
}

const TYPE_META = {
  birthday: { label: '生日', icon: Cake, color: 'from-pink-500 to-rose-500' },
  anniversary: { label: '纪念日', icon: Heart, color: 'from-rose-500 to-red-500' },
  school: { label: '学校', icon: GraduationCap, color: 'from-amber-500 to-orange-500' },
  work: { label: '工作', icon: Briefcase, color: 'from-blue-500 to-cyan-500' },
  medical: { label: '医疗', icon: '⚕️', color: 'from-emerald-500 to-teal-500' },
  social: { label: '社交', icon: PartyPopper, color: 'from-violet-500 to-purple-500' },
  holiday: { label: '节日', icon: '🎉', color: 'from-orange-500 to-red-500' },
  other: { label: '其他', icon: Calendar, color: 'from-ink-500 to-ink-600' },
} as const

const RECUR_META = {
  none: { label: '不重复', icon: '—' },
  daily: { label: '每天', icon: '📅' },
  weekly: { label: '每周', icon: '🗓' },
  monthly: { label: '每月', icon: '📆' },
  yearly: { label: '每年', icon: '🎂' },
} as const

export function FamilyCalendar() {
  const [events, setEvents] = useState<Event[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'today' | 'past'>('upcoming')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayKey())
  const [time, setTime] = useState('09:00')
  const [type, setType] = useState<Event['type']>('other')
  const [attendees, setAttendees] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')
  const [recurring, setRecurring] = useState<Event['recurring']>('none')
  const [members, setMembers] = useState<string[]>([])

  useEffect(() => {
    save(events)
    try {
      const fam = JSON.parse(localStorage.getItem('versa:family-v1') || '[]')
      setMembers(Array.from(new Set(fam.map((m: any) => m.name))))
    } catch {}
  }, [events])

  const total = events.length
  const today = todayKey()
  const todayEvents = events.filter((e) => e.date === today)
  const upcoming = events.filter((e) => e.date > today).sort((a, b) => a.date.localeCompare(b.date))
  const past = events.filter((e) => e.date < today)
  const birthdays = events.filter((e) => e.type === 'birthday' || e.type === 'anniversary')

  const filtered = (() => {
    if (filter === 'upcoming') return upcoming
    if (filter === 'today') return todayEvents
    if (filter === 'past') return past.sort((a, b) => b.date.localeCompare(a.date))
    return [...events].sort((a, b) => a.date.localeCompare(b.date))
  })()

  const add = () => {
    if (!title.trim()) { toast('请输入', 'error'); return }
    const e: Event = { id: uid(), title, date, time, type, attendees, location, notes, reminder: true, recurring }
    setEvents([e, ...events])
    setTitle(''); setLocation(''); setNotes(''); setAttendees([]); setRecurring('none')
    setAdding(false)
    toast('已添加', 'success')
  }

  const remove = (id: string) => setEvents(events.filter((e) => e.id !== id))

  const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - new Date(today).getTime()) / 86400000)

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`家庭最近事件: ${upcoming.slice(0, 3).map((e) => e.title).join('、')}. 给出 1 段 50 字内家庭活动建议, 中文`, '你是 Versa 家庭顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-5 h-5" />
          <h2 className="text-lg font-bold">家庭日历</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 事件类型 · 重复提醒 · 参与者</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">总事件</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{todayEvents.length}</p>
            <p className="text-[9px] opacity-80">今日</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{upcoming.length}</p>
            <p className="text-[9px] opacity-80">未来</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{birthdays.length}</p>
            <p className="text-[9px] opacity-80">纪念</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新事件
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
        {(['upcoming', 'today', 'past', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-indigo-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'upcoming' ? '📅 未来' : f === 'today' ? '今天' : f === 'past' ? '过去' : '全部'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有事件</p>
          </div>
        ) : filtered.slice(0, 20).map((e) => {
          const TM = TYPE_META[e.type]
          const Icon = typeof TM.icon === 'string' ? null : TM.icon
          const days = daysUntil(e.date)
          const isUrgent = days <= 3 && days >= 0
          return (
            <motion.div key={e.id} whileHover={{ y: -1 }} className={cn('rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border flex items-center gap-2', isUrgent ? 'border-amber-400' : 'border-ink-200/60 dark:border-ink-800/60')}>
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', TM.color)}>
                {Icon && typeof Icon === 'function' ? <Icon className="w-4 h-4" /> : <span className="text-base">{String(TM.icon)}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold truncate">{e.title}</p>
                  {e.recurring !== 'none' && <Repeat className="w-3 h-3 text-blue-500" />}
                </div>
                <p className="text-[10px] text-ink-500 flex items-center gap-1.5">
                  <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{e.time}</span>
                  {e.location && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{e.location}</span>}
                  <span>· {e.attendees.join('、')}</span>
                </p>
              </div>
              <div className="text-right">
                <p className={cn('text-[10px] font-bold', isUrgent ? 'text-amber-500' : 'text-ink-500')}>
                  {days === 0 ? '今天' : days > 0 ? `${days}天` : `${-days}天前`}
                </p>
                <p className="text-[9px] text-ink-400">{e.date}</p>
              </div>
              <button onClick={() => remove(e.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">新事件</h3>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="事件名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">类型</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                  const T = TYPE_META[k]
                  return (
                    <button key={k} onClick={() => setType(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold', type === k ? `bg-gradient-to-br ${T.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      <span className="text-base">{typeof T.icon === 'string' ? T.icon : '📅'}</span>
                      <span>{T.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="地点" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">参与者</p>
              <div className="flex flex-wrap gap-1">
                {members.map((m) => (
                  <button key={m} onClick={() => setAttendees(attendees.includes(m) ? attendees.filter((x) => x !== m) : [...attendees, m])} className={cn('px-2 h-7 rounded-full text-[10px] font-semibold', attendees.includes(m) ? 'bg-indigo-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">重复</p>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(RECUR_META) as Array<keyof typeof RECUR_META>).map((k) => (
                  <button key={k} onClick={() => setRecurring(k)} className={cn('h-8 rounded-lg text-[10px] font-semibold', recurring === k ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{RECUR_META[k].label}</button>
                ))}
              </div>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[50px]" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
