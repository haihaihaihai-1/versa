import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Calendar, Clock, FileText, Trash2, Edit3, Check, X, Sparkles, Loader2, Play, Pause, Repeat } from 'lucide-react'
import { cn, formatTimeAgo, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Draft {
  id: string
  type: 'text' | 'image' | 'video' | 'poll' | 'link'
  title: string
  body: string
  thumbnail?: string
  tags: string[]
  createdAt: number
}

interface Scheduled {
  id: string
  draftId: string
  title: string
  body: string
  scheduledAt: number
  published: boolean
  repeat: 'none' | 'daily' | 'weekly' | 'monthly'
  views?: number
}

const STORAGE_KEY_DRAFTS = 'versa:post-drafts'
const STORAGE_KEY_SCHED = 'versa:post-scheduled'

function loadDrafts(): Draft[] { try { const s = localStorage.getItem(STORAGE_KEY_DRAFTS); if (s) return JSON.parse(s) } catch {} return [] }
function saveDrafts(d: Draft[]) { try { localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(d)) } catch {} }
function loadSched(): Scheduled[] { try { const s = localStorage.getItem(STORAGE_KEY_SCHED); if (s) return JSON.parse(s) } catch {} return [] }
function saveSched(d: Scheduled[]) { try { localStorage.setItem(STORAGE_KEY_SCHED, JSON.stringify(d)) } catch {} }

const TYPES: Array<{ k: Draft['type']; label: string; emoji: string; color: string }> = [
  { k: 'text', label: '图文', emoji: '📝', color: 'from-blue-500 to-indigo-500' },
  { k: 'image', label: '图片', emoji: '🖼️', color: 'from-rose-500 to-pink-500' },
  { k: 'video', label: '视频', emoji: '🎬', color: 'from-violet-500 to-purple-500' },
  { k: 'poll', label: '投票', emoji: '📊', color: 'from-emerald-500 to-teal-500' },
  { k: 'link', label: '链接', emoji: '🔗', color: 'from-amber-500 to-orange-500' },
]

export function PostScheduler() {
  const [drafts, setDrafts] = useState<Draft[]>(loadDrafts())
  const [sched, setSched] = useState<Scheduled[]>(loadSched())
  const [view, setView] = useState<'drafts' | 'scheduled' | 'editor' | 'calendar'>('drafts')
  const [editing, setEditing] = useState<Draft | null>(null)
  const [scheduling, setScheduling] = useState<Draft | null>(null)
  const [schedDate, setSchedDate] = useState('')
  const [schedTime, setSchedTime] = useState('20:00')
  const [schedRepeat, setSchedRepeat] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none')
  const [calendarView, setCalendarView] = useState(new Date())
  const [aiTitle, setAiTitle] = useState('')
  const [aiBody, setAiBody] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { saveDrafts(drafts) }, [drafts])
  useEffect(() => { saveSched(sched) }, [sched])

  const saveDraft = () => {
    if (!editing) return
    if (!editing.title.trim() || !editing.body.trim()) { toast('请填写完整', 'error'); return }
    if (editing.id) {
      setDrafts(drafts.map((d) => d.id === editing.id ? editing : d))
    } else {
      setDrafts([{ ...editing, id: uid(), createdAt: Date.now() }, ...drafts])
    }
    setEditing(null)
    setView('drafts')
    toast('已保存草稿', 'success')
  }

  const newDraft = () => {
    setEditing({ id: '', type: 'text', title: '', body: '', tags: [], createdAt: Date.now() })
    setView('editor')
  }

  const deleteDraft = (id: string) => setDrafts(drafts.filter((d) => d.id !== id))

  const schedule = () => {
    if (!scheduling || !schedDate) { toast('请选择时间', 'error'); return }
    const dt = new Date(`${schedDate}T${schedTime}:00`)
    if (dt.getTime() < Date.now()) { toast('时间不能早于现在', 'error'); return }
    const s: Scheduled = { id: uid(), draftId: scheduling.id, title: scheduling.title, body: scheduling.body, scheduledAt: dt.getTime(), published: false, repeat: schedRepeat }
    setSched([s, ...sched])
    setScheduling(null); setSchedDate(''); setSchedTime('20:00'); setSchedRepeat('none')
    toast('定时发布已设置', 'success')
  }

  const cancelSched = (id: string) => setSched(sched.filter((s) => s.id !== id))

  const publishNow = (id: string) => {
    setSched(sched.map((s) => s.id === id ? { ...s, published: true, views: Math.floor(Math.random() * 1000) } : s))
    toast('已发布', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为 Versa 动态推荐 1 个吸引人的标题 (15-25 字) + 1 段 50 字的正文 (美食主题)', '你是 Versa 内容创作助手, 简洁有吸引力, 中文')
      const titleMatch = result.match(/标题[:：]\s*(.+)/) || result.match(/^#\s*(.+)/m)
      const bodyMatch = result.match(/正文[:：]\s*(.+)/s) || result.split('\n').slice(1).join('\n')
      setAiTitle(titleMatch?.[1]?.trim() || result.split('\n')[0])
      setAiBody(bodyMatch?.[1]?.trim() || result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const monthStart = new Date(calendarView.getFullYear(), calendarView.getMonth(), 1)
  const monthEnd = new Date(calendarView.getFullYear(), calendarView.getMonth() + 1, 0)
  const days = monthEnd.getDate()
  const firstDay = monthStart.getDay()
  const cells: ({ date: string; current: boolean } | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= days; d++) {
    const ds = `${calendarView.getFullYear()}-${String(calendarView.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date: ds, current: true })
  }
  while (cells.length % 7) cells.push(null)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Send className="w-5 h-5" />
          <h2 className="text-lg font-bold">定时发布</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">草稿箱 · 定时任务 · 周期发布</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{drafts.length}</p>
            <p className="text-[10px] opacity-80">草稿</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{sched.filter((s) => !s.published).length}</p>
            <p className="text-[10px] opacity-80">待发</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{sched.filter((s) => s.published).length}</p>
            <p className="text-[10px] opacity-80">已发</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setView('drafts')} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', view === 'drafts' ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>草稿</button>
        <button onClick={() => setView('scheduled')} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', view === 'scheduled' ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>定时</button>
        <button onClick={() => setView('calendar')} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', view === 'calendar' ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>日历</button>
        <button onClick={newDraft} className="px-2.5 h-8 rounded-lg bg-emerald-500 text-white text-xs font-semibold">+ 新</button>
      </div>

      {view === 'editor' && editing && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">编辑草稿</h3>
            <button onClick={() => setEditing(null)}><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {TYPES.map((t) => (
              <button key={t.k} onClick={() => setEditing({ ...editing, type: t.k })} className={cn('h-12 rounded-xl flex flex-col items-center justify-center gap-0.5', editing.type === t.k ? `bg-gradient-to-br ${t.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                <span className="text-base">{t.emoji}</span>
                <span className="text-[9px] font-semibold">{t.label}</span>
              </button>
            ))}
          </div>
          <button onClick={runAI} disabled={loading} className="w-full h-8 rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 帮我写
          </button>
          {(aiTitle || aiBody) && (
            <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-2 border border-violet-200/40 space-y-1">
              <p className="text-[10px] font-bold text-violet-500">AI 建议</p>
              {aiTitle && <p className="text-xs font-semibold">{aiTitle}</p>}
              {aiBody && <p className="text-[10px] leading-relaxed">{aiBody}</p>}
              <div className="flex gap-1">
                <button onClick={() => { setEditing({ ...editing, title: aiTitle || editing.title, body: aiBody || editing.body }); setAiTitle(''); setAiBody('') }} className="px-2 h-6 rounded bg-violet-500 text-white text-[10px]">应用</button>
                <button onClick={() => { setAiTitle(''); setAiBody('') }} className="px-2 h-6 rounded bg-ink-200 dark:bg-ink-800 text-[10px]">丢弃</button>
              </div>
            </div>
          )}
          <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
          <textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} placeholder="正文..." rows={4} className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          <input value={editing.tags.join(',')} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })} placeholder="标签 (逗号分隔)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
          <div className="flex gap-1.5">
            <button onClick={saveDraft} className="flex-1 h-9 rounded-lg bg-violet-500 text-white text-sm font-semibold">保存草稿</button>
            <button onClick={() => setScheduling(editing)} className="flex-1 h-9 rounded-lg bg-amber-500 text-white text-sm font-semibold flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" />定时发布
            </button>
          </div>
        </div>
      )}

      {view === 'drafts' && (
        <div className="space-y-1.5">
          {drafts.length === 0 ? (
            <div className="text-center py-8 text-ink-500">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">草稿箱是空的</p>
              <p className="text-[10px]">点击"+ 新"开始写作</p>
            </div>
          ) : drafts.map((d) => {
            const Meta = TYPES.find((t) => t.k === d.type)!
            return (
              <div key={d.id} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
                <div className="flex items-start gap-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', Meta.color)}>
                    <span className="text-base">{Meta.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{d.title}</p>
                    <p className="text-[10px] text-ink-500 line-clamp-2">{d.body}</p>
                    <p className="text-[9px] text-ink-400 mt-0.5">{formatTimeAgo(new Date(d.createdAt).toISOString())}</p>
                  </div>
                  <button onClick={() => { setEditing(d); setView('editor') }} className="text-ink-400 hover:text-violet-500"><Edit3 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setScheduling(d)} className="text-ink-400 hover:text-amber-500"><Clock className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteDraft(d.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'scheduled' && (
        <div className="space-y-1.5">
          {sched.length === 0 ? (
            <div className="text-center py-8 text-ink-500">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">还没有定时任务</p>
            </div>
          ) : sched.map((s) => (
            <div key={s.id} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-start gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-white flex-shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold line-clamp-1">{s.title}</p>
                  <p className="text-[10px] text-ink-500 line-clamp-1">{s.body}</p>
                  <p className="text-[10px] text-amber-500 font-bold mt-0.5 flex items-center gap-0.5">
                    <Calendar className="w-2.5 h-2.5" />
                    {new Date(s.scheduledAt).toLocaleString('zh-CN')}
                    {s.repeat !== 'none' && <span className="ml-1 text-violet-500 flex items-center gap-0.5"><Repeat className="w-2.5 h-2.5" />{s.repeat}</span>}
                    {s.published && <span className="ml-1 text-emerald-500">✓ 已发</span>}
                  </p>
                </div>
                {!s.published && <button onClick={() => publishNow(s.id)} className="px-2 h-7 rounded-lg bg-emerald-500 text-white text-[10px] font-bold">立即</button>}
                <button onClick={() => cancelSched(s.id)} className="text-ink-400 hover:text-rose-500"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'calendar' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setCalendarView(new Date(calendarView.getFullYear(), calendarView.getMonth() - 1, 1))} className="w-7 h-7 rounded-full bg-ink-100 dark:bg-ink-800">‹</button>
            <p className="text-sm font-bold">{calendarView.getFullYear()} 年 {calendarView.getMonth() + 1} 月</p>
            <button onClick={() => setCalendarView(new Date(calendarView.getFullYear(), calendarView.getMonth() + 1, 1))} className="w-7 h-7 rounded-full bg-ink-100 dark:bg-ink-800">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {['日', '一', '二', '三', '四', '五', '六'].map((d) => <div key={d} className="text-center text-[10px] text-ink-500 font-semibold py-1">{d}</div>)}
            {cells.map((c, i) => {
              if (!c) return <div key={i} className="aspect-square" />
              const daySched = sched.filter((s) => new Date(s.scheduledAt).toDateString() === new Date(c.date).toDateString())
              return (
                <div key={i} className="aspect-square rounded-lg bg-ink-50/30 dark:bg-ink-900/30 p-0.5">
                  <p className="text-[10px] font-semibold">{parseInt(c.date.split('-')[2])}</p>
                  {daySched.slice(0, 2).map((s) => <div key={s.id} className="text-[8px] truncate bg-violet-500 text-white rounded px-0.5">{s.title}</div>)}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {scheduling && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setScheduling(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <h3 className="font-bold">定时发布: {scheduling.title}</h3>
            <input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input type="time" value={schedTime} onChange={(e) => setSchedTime(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-xs text-ink-500 mb-1">重复</p>
              <div className="grid grid-cols-4 gap-1">
                {(['none', 'daily', 'weekly', 'monthly'] as const).map((r) => (
                  <button key={r} onClick={() => setSchedRepeat(r)} className={cn('h-8 rounded-lg text-xs font-semibold', schedRepeat === r ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{r === 'none' ? '不' : r === 'daily' ? '每天' : r === 'weekly' ? '每周' : '每月'}</button>
                ))}
              </div>
            </div>
            <button onClick={schedule} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5" />设定定时发布
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
