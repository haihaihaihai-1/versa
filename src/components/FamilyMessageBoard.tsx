import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { StickyNote, Plus, Trash2, Sparkles, Loader2, Pin, Heart, Bell, MessageCircle, Calendar, User, Edit, Send, Cake, AlertCircle, CheckSquare, BellRing } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface BoardMessage {
  id: string
  type: 'note' | 'announcement' | 'reminder' | 'todo' | 'love'
  title: string
  content: string
  author: string
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple'
  pinned: boolean
  reactions: { [emoji: string]: number }
  date: string
}

const STORAGE_KEY = 'versa:fam-board-v1'

function load(): BoardMessage[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: BoardMessage[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): BoardMessage[] {
  return [
    { id: '1', type: 'announcement', title: '家庭会议通知', content: '本周日上午 10 点, 全家在客厅开会, 讨论下月旅行计划.', author: '妈妈', color: 'blue', pinned: true, reactions: { '👍': 3, '❤️': 2 }, date: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: '2', type: 'todo', title: '周末待办', content: '打扫卫生 / 买菜 / 修灯泡 / 倒垃圾', author: '爸爸', color: 'green', pinned: false, reactions: { '✅': 2 }, date: new Date(Date.now() - 86400000).toISOString() },
    { id: '3', type: 'love', title: '小宝想说', content: '我爱爸爸妈妈爷爷奶奶, 谢谢你们每天照顾我!', author: '小宝', color: 'pink', pinned: true, reactions: { '❤️': 5, '🥰': 3 }, date: new Date(Date.now() - 3600000 * 4).toISOString() },
    { id: '4', type: 'reminder', title: '小宝明天有画画课', content: '记得带水彩笔和素描本', author: '妈妈', color: 'yellow', pinned: false, reactions: { '📝': 1 }, date: new Date().toISOString() },
  ]
}

const TYPE_META = {
  note: { label: '便签', icon: StickyNote, color: 'bg-amber-400' },
  announcement: { label: '公告', icon: BellRing, color: 'bg-blue-500' },
  reminder: { label: '提醒', icon: Bell, color: 'bg-orange-500' },
  todo: { label: '待办', icon: CheckSquare, color: 'bg-emerald-500' },
  love: { label: '爱心', icon: Heart, color: 'bg-rose-500' },
} as const

const COLORS = {
  yellow: { bg: 'bg-amber-100 dark:bg-amber-900/30', border: 'border-amber-300 dark:border-amber-700', text: 'text-amber-800 dark:text-amber-200' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-700', text: 'text-pink-800 dark:text-pink-200' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700', text: 'text-blue-800 dark:text-blue-200' },
  green: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', border: 'border-emerald-300 dark:border-emerald-700', text: 'text-emerald-800 dark:text-emerald-200' },
  purple: { bg: 'bg-violet-100 dark:bg-violet-900/30', border: 'border-violet-300 dark:border-violet-700', text: 'text-violet-800 dark:text-violet-200' },
} as const

const REACTIONS = ['👍', '❤️', '😄', '🥰', '🙏', '✅', '🎉', '💯']

export function FamilyMessageBoard() {
  const [messages, setMessages] = useState<BoardMessage[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | BoardMessage['type'] | 'pinned'>('all')
  const [type, setType] = useState<BoardMessage['type']>('note')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [author, setAuthor] = useState('')
  const [color, setColor] = useState<BoardMessage['color']>('yellow')

  useEffect(() => { save(messages) }, [messages])

  const total = messages.length
  const pinned = messages.filter((m) => m.pinned).length
  const today = new Date().toISOString().split('T')[0]
  const todayCount = messages.filter((m) => m.date.startsWith(today)).length
  const totalReactions = messages.reduce((s, m) => s + Object.values(m.reactions).reduce((sum, n) => sum + n, 0), 0)

  const filtered = (filter === 'all' ? messages : filter === 'pinned' ? messages.filter((m) => m.pinned) : messages.filter((m) => m.type === filter))
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (b.pinned && !a.pinned) return 1
      return b.date.localeCompare(a.date)
    })

  const add = () => {
    if (!title.trim() || !author) { toast('请填写', 'error'); return }
    const m: BoardMessage = { id: uid(), type, title, content, author, color, pinned: false, reactions: {}, date: new Date().toISOString() }
    setMessages([m, ...messages])
    setTitle(''); setContent('')
    setAdding(false)
    toast('已发布', 'success')
  }

  const remove = (id: string) => setMessages(messages.filter((m) => m.id !== id))
  const togglePin = (id: string) => setMessages(messages.map((m) => m.id === id ? { ...m, pinned: !m.pinned } : m))
  const react = (id: string, emoji: string) => setMessages(messages.map((m) => m.id === id ? { ...m, reactions: { ...m.reactions, [emoji]: (m.reactions[emoji] || 0) + 1 } } : m))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`家庭公告板, 生成 1 条温馨的家庭公告, 30 字内, 中文`, '你是 Versa 家庭编辑, 温馨亲切, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <StickyNote className="w-5 h-5" />
          <h2 className="text-lg font-bold">家庭留言板</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">5 类型 · 8 表情 · 多人互动</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">留言</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-amber-100">{pinned}</p>
            <p className="text-[9px] opacity-80">置顶</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{todayCount}</p>
            <p className="text-[9px] opacity-80">今日</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalReactions}</p>
            <p className="text-[9px] opacity-80">反应</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />发留言
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-amber-50/40 dark:bg-amber-900/20 rounded-xl p-2 border border-amber-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'all' ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        <button onClick={() => setFilter('pinned')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'pinned' ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>📌 置顶</button>
        {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
          const T = TYPE_META[k]
          return (
            <button key={k} onClick={() => setFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === k ? `${T.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
              {T.label}
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {filtered.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-ink-500">
            <StickyNote className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有留言</p>
          </div>
        ) : filtered.map((m) => {
          const TM = TYPE_META[m.type]
          const CM = COLORS[m.color]
          return (
            <motion.div
              key={m.id}
              whileHover={{ y: -2, rotate: 0.5 }}
              className={cn('rounded-xl p-2 border-2 shadow-sm', CM.bg, CM.border)}
              style={{ transform: `rotate(${(m.id.charCodeAt(0) % 5) - 2}deg)` }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {m.pinned && <Pin className="w-3 h-3 fill-current" />}
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded text-white font-bold', TM.color)}>{TM.label}</span>
                <button onClick={() => togglePin(m.id)} className="ml-auto opacity-60 hover:opacity-100">
                  <Pin className="w-3 h-3" />
                </button>
                <button onClick={() => remove(m.id)} className="opacity-60 hover:opacity-100 text-xs">×</button>
              </div>
              <p className={cn('text-sm font-bold leading-snug', CM.text)}>{m.title}</p>
              {m.content && <p className={cn('text-[10px] mt-1 leading-relaxed', CM.text)}>{m.content}</p>}
              <div className="mt-1.5 flex items-center justify-between">
                <p className={cn('text-[9px]', CM.text, 'opacity-70')}>— {m.author} · {formatTimeAgo(m.date)}</p>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                {Object.entries(m.reactions).map(([emoji, count]) => (
                  <button key={emoji} onClick={() => react(m.id, emoji)} className="px-1.5 py-0.5 rounded-full bg-white/60 dark:bg-black/30 text-[10px]">
                    {emoji} {count}
                  </button>
                ))}
                <div className="relative group">
                  <button className="px-1 py-0.5 rounded-full bg-white/40 dark:bg-black/20 text-[10px]">+</button>
                  <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex bg-white dark:bg-ink-800 rounded-lg shadow-lg p-1 z-10">
                    {REACTIONS.map((e) => (
                      <button key={e} onClick={() => react(m.id, e)} className="hover:scale-125 transition text-sm">{e}</button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">发留言</h3>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">类型</p>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                  const T = TYPE_META[k]
                  return (
                    <button key={k} onClick={() => setType(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', type === k ? `${T.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      <T.icon className="w-3.5 h-3.5" />
                      <span className="text-[9px]">{T.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="内容" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[80px]" />
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="作者" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">颜色</p>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(COLORS) as Array<keyof typeof COLORS>).map((c) => (
                  <button key={c} onClick={() => setColor(c)} className={cn('h-8 rounded-lg text-[10px] font-semibold border-2', COLORS[c].bg, color === c ? COLORS[c].border : 'border-transparent')}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold">发布</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
