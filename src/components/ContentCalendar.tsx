import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, Plus, X, ChevronLeft, ChevronRight, Sparkles, Loader2, Trash2, Image, Video, FileText } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface CalendarEntry {
  id: string
  date: string
  type: 'post' | 'live' | 'video' | 'note'
  title: string
  status: 'idea' | 'draft' | 'scheduled' | 'published'
  notes?: string
}

const TYPE_META = {
  post: { label: '图文', icon: FileText, color: 'bg-blue-500' },
  live: { label: '直播', icon: Video, color: 'bg-rose-500' },
  video: { label: '视频', icon: Video, color: 'bg-violet-500' },
  note: { label: '笔记', icon: FileText, color: 'bg-emerald-500' },
} as const

const STATUS_META = {
  idea: { label: '灵感', color: 'bg-ink-200 text-ink-700' },
  draft: { label: '草稿', color: 'bg-amber-100 text-amber-700' },
  scheduled: { label: '已排期', color: 'bg-blue-100 text-blue-700' },
  published: { label: '已发布', color: 'bg-emerald-100 text-emerald-700' },
} as const

const SEED: CalendarEntry[] = [
  { id: 'e1', date: todayStr(), type: 'live', title: '618 数码直播', status: 'scheduled' },
  { id: 'e2', date: todayStr(1), type: 'post', title: '夏日穿搭合集', status: 'draft' },
  { id: 'e3', date: todayStr(3), type: 'video', title: 'iPhone 16 评测', status: 'published' },
  { id: 'e4', date: todayStr(7), type: 'note', title: '美妆教程笔记', status: 'idea' },
]

function todayStr(add = 0) {
  const d = new Date(Date.now() + add * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const STORAGE_KEY = 'versa:content-calendar'

function load(): CalendarEntry[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return SEED }
function save(d: CalendarEntry[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function ContentCalendar() {
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [view, setView] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [newType, setNewType] = useState<CalendarEntry['type']>('post')
  const [newTitle, setNewTitle] = useState('')
  const [newStatus, setNewStatus] = useState<CalendarEntry['status']>('idea')
  const [aiPlan, setAiPlan] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { setEntries(load()) }, [])
  useEffect(() => { if (entries.length) save(entries) }, [entries])

  const monthStart = new Date(view.getFullYear(), view.getMonth(), 1)
  const monthEnd = new Date(view.getFullYear(), view.getMonth() + 1, 0)
  const days = monthEnd.getDate()
  const firstDay = monthStart.getDay()
  const cells: ({ date: string; current: boolean } | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= days; d++) {
    const ds = `${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: ds, current: true })
  }
  while (cells.length % 7) cells.push(null)

  const addEntry = () => {
    if (!newTitle.trim() || !selectedDate) { toast('请填写标题', 'error'); return }
    const e: CalendarEntry = { id: uid(), date: selectedDate, type: newType, title: newTitle, status: newStatus }
    setEntries([e, ...entries])
    setNewTitle(''); setAddOpen(false)
    toast('已添加', 'success')
  }

  const remove = (id: string) => setEntries(entries.filter((e) => e.id !== id))

  const aiPlanWeek = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为美食 + 数码创作者规划未来 7 天内容日历 (每天 1-2 个内容), 简洁 (100-150 字)', '你是 Versa 内容策略师, 简洁专业, 中文')
      setAiPlan(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const monthEntries = entries.filter((e) => e.date.startsWith(`${view.getFullYear()}-${String(view.getMonth() + 1).padStart(2, '0')}`))
  const dayEntries = selectedDate ? entries.filter((e) => e.date === selectedDate) : []

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-5 h-5" />
          <h2 className="text-lg font-bold">内容日历</h2>
        </div>
        <p className="text-xs opacity-90">规划你的内容发布节奏</p>
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="w-7 h-7 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <p className="text-sm font-bold">{view.getFullYear()} 年 {view.getMonth() + 1} 月</p>
        <button onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="w-7 h-7 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
          <div key={d} className="text-center text-[10px] text-ink-500 font-semibold py-1">{d}</div>
        ))}
        {cells.map((c, i) => {
          if (!c) return <div key={i} className="aspect-square" />
          const dayEntries = entries.filter((e) => e.date === c.date)
          const isToday = c.date === todayStr()
          const isSelected = c.date === selectedDate
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(c.date)}
              className={cn('aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative', isSelected ? 'bg-blue-500 text-white' : isToday ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-ink-50 dark:hover:bg-ink-800')}
            >
              <span className="font-semibold">{parseInt(c.date.split('-')[2])}</span>
              {dayEntries.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEntries.slice(0, 3).map((e) => (
                    <div key={e.id} className={cn('w-1 h-1 rounded-full', TYPE_META[e.type].color)} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <button onClick={aiPlanWeek} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        AI 规划下周内容
      </button>

      {aiPlan && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-3 border border-blue-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-blue-500"><Sparkles className="w-3.5 h-3.5" />AI 内容规划</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiPlan}</p>
        </div>
      )}

      {selectedDate && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{selectedDate} 的内容</p>
            <button onClick={() => setAddOpen(true)} className="px-2.5 h-7 rounded-full bg-blue-500 text-white text-xs font-semibold flex items-center gap-0.5">
              <Plus className="w-3 h-3" />添加
            </button>
          </div>

          {dayEntries.length === 0 ? (
            <p className="text-xs text-ink-500 text-center py-4">这一天还没有内容计划</p>
          ) : (
            dayEntries.map((e) => {
              const Icon = TYPE_META[e.type].icon
              return (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60"
                >
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white', TYPE_META[e.type].color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{e.title}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded', STATUS_META[e.status].color)}>{STATUS_META[e.status].label}</span>
                      <span className="text-[10px] text-ink-500">{TYPE_META[e.type].label}</span>
                    </div>
                  </div>
                  <button onClick={() => remove(e.id)} className="text-ink-400 hover:text-rose-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )
            })
          )}
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAddOpen(false)}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3"
          >
            <h3 className="font-bold">添加内容计划</h3>
            <p className="text-xs text-ink-500">日期: {selectedDate}</p>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                const Meta = TYPE_META[k]
                const Icon = Meta.icon
                return (
                  <button
                    key={k}
                    onClick={() => setNewType(k)}
                    className={cn('h-12 rounded-xl flex flex-col items-center justify-center gap-0.5', newType === k ? `${Meta.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold">{Meta.label}</span>
                  </button>
                )
              })}
            </div>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="内容标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(STATUS_META) as Array<keyof typeof STATUS_META>).map((k) => (
                <button
                  key={k}
                  onClick={() => setNewStatus(k)}
                  className={cn('h-7 rounded-lg text-xs font-semibold', newStatus === k ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
                >
                  {STATUS_META[k].label}
                </button>
              ))}
            </div>
            <button onClick={addEntry} className="w-full h-9 rounded-lg bg-blue-500 text-white text-sm font-semibold">确认添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
