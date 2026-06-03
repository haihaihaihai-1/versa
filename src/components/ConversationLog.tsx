import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, Sparkles, Loader2, Copy, Star, Trash2, Edit, Send, Bot, User, Tag, Search, Plus, ChevronDown, RefreshCw, Save, Download } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  rating: 1 | 2 | 3 | 4 | 5
  tokens: number
  time: string
}

interface Conversation {
  id: string
  title: string
  category: 'brainstorm' | 'learning' | 'work' | 'creative' | 'support' | 'general'
  messages: Message[]
  tags: string[]
  favorite: boolean
  pinned: boolean
  date: string
  totalTokens: number
}

const STORAGE_KEY = 'versa:conversations-v1'

function load(): Conversation[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Conversation[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Conversation[] {
  const t1 = new Date(Date.now() - 3600_000).toISOString()
  return [
    {
      id: '1',
      title: '产品命名头脑风暴',
      category: 'brainstorm',
      messages: [
        { id: 'm1', role: 'user', content: '帮我为一款 AI 助眠 App 想 5 个名字', rating: 3, tokens: 18, time: t1 },
        { id: 'm2', role: 'assistant', content: '1. 梦舟 DreamBoat\n2. 月光宝盒 MoonBox\n3. 安息岛 RestIsland\n4. 夜曲 Nocturne\n5. 静境 StillMind', rating: 5, tokens: 65, time: t1 },
      ],
      tags: ['产品', '命名', 'AI'],
      favorite: true,
      pinned: true,
      date: t1,
      totalTokens: 83,
    },
  ]
}

const CAT_META = {
  brainstorm: { label: '头脑风暴', icon: Sparkles, color: 'from-amber-500 to-orange-500' },
  learning: { label: '学习', icon: Star, color: 'from-blue-500 to-cyan-500' },
  work: { label: '工作', icon: MessageSquare, color: 'from-violet-500 to-purple-500' },
  creative: { label: '创意', icon: Sparkles, color: 'from-pink-500 to-rose-500' },
  support: { label: '咨询', icon: MessageSquare, color: 'from-emerald-500 to-teal-500' },
  general: { label: '闲聊', icon: MessageSquare, color: 'from-zinc-500 to-zinc-600' },
} as const

const QUICK_PROMPTS = [
  '解释一下量子计算的基本原理',
  '帮我写一封求职信, 应聘前端工程师',
  '推荐 3 本关于时间管理的书',
  '如何提高英语口语水平?',
  '分析下当前 AI 行业的趋势',
]

const SUGGESTED_REPLIES = ['详细说明', '举例', '总结', '换种说法', '应用场景']

export function ConversationLog() {
  const [convos, setConvos] = useState<Conversation[]>(load())
  const [activeId, setActiveId] = useState<string | null>(convos[0]?.id || null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCat, setNewCat] = useState<keyof typeof CAT_META>('general')
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<keyof typeof CAT_META | 'all' | 'fav'>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const chatRef = useChatScroll(convos, activeId)

  useEffect(() => { save(convos) }, [convos])

  const active = convos.find((c) => c.id === activeId) || null

  const create = () => {
    if (!newTitle.trim()) { toast('请输入标题', 'error'); return }
    const c: Conversation = { id: uid(), title: newTitle.trim(), category: newCat, messages: [], tags: [], favorite: false, pinned: false, date: new Date().toISOString(), totalTokens: 0 }
    setConvos([c, ...convos])
    setActiveId(c.id)
    setCreating(false); setNewTitle('')
    toast('会话已创建', 'success')
  }

  const send = async () => {
    if (!input.trim() || !active) return
    if (!isAIEnabled()) { toast('请先在 .env.local 配置 VITE_MIMO_API_KEY', 'error'); return }
    const userMsg: Message = { id: uid(), role: 'user', content: input.trim(), rating: 3, tokens: Math.ceil(input.length / 2), time: new Date().toISOString() }
    const updated = convos.map((c) => c.id === activeId ? { ...c, messages: [...c.messages, userMsg], date: new Date().toISOString(), totalTokens: c.totalTokens + userMsg.tokens } : c)
    setConvos(updated)
    setInput('')
    setLoading(true)
    try {
      const history = active.messages.slice(-6).map((m) => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`).join('\n')
      const reply = await aiComplete(`[对话历史]\n${history}\n\n[用户新消息]\n${userMsg.content}`, '你是一个友好、专业的 AI 助手, 回答简洁有深度, 使用中文.', { model: 'mimo-2.5' })
      const aiMsg: Message = { id: uid(), role: 'assistant', content: reply, rating: 3, tokens: Math.ceil(reply.length / 2), time: new Date().toISOString() }
      setConvos((prev) => prev.map((c) => c.id === activeId ? { ...c, messages: [...c.messages, aiMsg], totalTokens: c.totalTokens + aiMsg.tokens } : c))
    } catch (e: any) {
      toast(e?.message || 'AI 调用失败', 'error')
    } finally { setLoading(false) }
  }

  const rate = (msgId: string, r: 1 | 2 | 3 | 4 | 5) => {
    if (!active) return
    setConvos(convos.map((c) => c.id === activeId ? { ...c, messages: c.messages.map((m) => m.id === msgId ? { ...m, rating: r } : m) } : c))
  }

  const del = (id: string) => { setConvos(convos.filter((c) => c.id !== id)); if (activeId === id) setActiveId(null); toast('已删除', 'success') }
  const toggleFav = (id: string) => setConvos(convos.map((c) => c.id === id ? { ...c, favorite: !c.favorite } : c))
  const togglePin = (id: string) => setConvos(convos.map((c) => c.id === id ? { ...c, pinned: !c.pinned } : c))
  const copy = (val: string) => { navigator.clipboard?.writeText(val); toast('已复制', 'success') }
  const exportTxt = (c: Conversation) => {
    const txt = c.messages.map((m) => `[${m.time}] ${m.role === 'user' ? '我' : 'AI'}:\n${m.content}`).join('\n\n')
    const blob = new Blob([txt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${c.title}.txt`; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = convos
    .filter((c) => {
      if (filterCat === 'fav' && !c.favorite) return false
      if (filterCat !== 'all' && filterCat !== 'fav' && c.category !== filterCat) return false
      if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <MessageSquare className="w-5 h-5" />
          <h2 className="text-lg font-bold">对话日志</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">分类管理 · 评分 · 导出</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{convos.length}</p><p className="text-[9px] opacity-80">会话</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{convos.filter((c) => c.favorite).length}</p><p className="text-[9px] opacity-80">收藏</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{convos.reduce((s, c) => s + c.messages.length, 0)}</p><p className="text-[9px] opacity-80">消息</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{(convos.reduce((s, c) => s + c.totalTokens, 0) / 1000).toFixed(1)}k</p><p className="text-[9px] opacity-80">Tokens</p></div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-5 space-y-1.5">
          <button onClick={() => setCreating(true)} className="w-full h-9 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
            <Plus className="w-3.5 h-3.5" />新会话
          </button>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索..." className="w-full h-7 pl-7 pr-2 text-[10px] bg-white/60 dark:bg-ink-900/40 rounded-lg border border-ink-200/40 dark:border-ink-800/40" />
          </div>
          <div className="flex gap-1 overflow-x-auto pb-0.5">
            {(['all', 'fav', ...Object.keys(CAT_META)] as const).map((c) => (
              <button key={c} onClick={() => setFilterCat(c as any)} className={cn('px-2 h-6 rounded-full text-[9px] font-semibold whitespace-nowrap shrink-0', filterCat === c ? 'bg-violet-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
                {c === 'all' ? '全部' : c === 'fav' ? '★' : CAT_META[c as keyof typeof CAT_META].label}
              </button>
            ))}
          </div>
          <div className="space-y-1 max-h-[480px] overflow-y-auto">
            {filtered.length === 0 && <p className="text-[10px] text-ink-400 text-center py-4">暂无会话</p>}
            {filtered.map((c) => {
              const meta = CAT_META[c.category]
              const Icon = meta.icon
              return (
                <button key={c.id} onClick={() => setActiveId(c.id)} className={cn('w-full p-2 rounded-xl text-left border transition-all', activeId === c.id ? 'border-violet-400 bg-violet-50/40 dark:bg-violet-900/20' : 'border-ink-200/40 dark:border-ink-800/40 bg-white/40 dark:bg-ink-900/30')}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className={cn('w-4 h-4 rounded-md flex items-center justify-center bg-gradient-to-br text-white shrink-0', meta.color)}>
                      <Icon className="w-2.5 h-2.5" />
                    </div>
                    <span className="text-[11px] font-semibold text-ink-800 dark:text-ink-200 truncate flex-1">{c.pinned && '📌 '}{c.favorite && '★ '}{c.title}</span>
                  </div>
                  <p className="text-[9px] text-ink-500 truncate">{c.messages.length} 消息 · {formatTimeAgo(c.date)}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="col-span-7 rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 dark:border-ink-800/40 flex flex-col" style={{ minHeight: 480 }}>
          {active ? (
            <>
              <div className="p-2.5 border-b border-ink-200/40 dark:border-ink-800/40 flex items-center gap-1.5">
                {editingId === active.id ? (
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} onBlur={() => { if (editTitle.trim()) { setConvos(convos.map((c) => c.id === active.id ? { ...c, title: editTitle.trim() } : c)); setEditingId(null); toast('已重命名', 'success') } }} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} autoFocus className="flex-1 h-7 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-violet-400 focus:outline-none" />
                ) : (
                  <h3 onClick={() => { setEditingId(active.id); setEditTitle(active.title) }} className="flex-1 text-sm font-bold text-ink-800 dark:text-ink-200 truncate cursor-pointer">{active.title}</h3>
                )}
                <button onClick={() => togglePin(active.id)} className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-xs', active.pinned ? 'bg-amber-100 text-amber-600' : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}>📌</button>
                <button onClick={() => toggleFav(active.id)} className={cn('w-7 h-7 rounded-lg flex items-center justify-center', active.favorite ? 'bg-rose-100 text-rose-500' : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}>
                  <Star className={cn('w-3.5 h-3.5', active.favorite && 'fill-current')} />
                </button>
                <button onClick={() => exportTxt(active)} className="w-7 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-400 flex items-center justify-center"><Download className="w-3.5 h-3.5" /></button>
                <button onClick={() => del(active.id)} className="w-7 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-400 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div ref={chatRef} className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {active.messages.length === 0 && (
                  <div className="text-center py-6">
                    <Bot className="w-8 h-8 mx-auto mb-2 text-violet-300" />
                    <p className="text-xs text-ink-500">开始你的对话</p>
                    <div className="mt-2 flex flex-wrap gap-1 justify-center">
                      {QUICK_PROMPTS.slice(0, 3).map((p) => (
                        <button key={p} onClick={() => setInput(p)} className="px-2 h-6 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 text-[10px]">{p}</button>
                      ))}
                    </div>
                  </div>
                )}
                {active.messages.map((m) => (
                  <div key={m.id} className={cn('flex gap-1.5', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {m.role === 'assistant' && <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0"><Bot className="w-3 h-3 text-white" /></div>}
                    <div className={cn('max-w-[80%] rounded-2xl px-2.5 py-1.5 text-xs', m.role === 'user' ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white' : 'bg-ink-100/60 dark:bg-ink-800/40 text-ink-800 dark:text-ink-200')}>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                      <div className={cn('flex items-center gap-1 mt-0.5 text-[9px]', m.role === 'user' ? 'text-white/70' : 'text-ink-400')}>
                        <span>{formatTimeAgo(m.time)}</span>
                        {m.role === 'assistant' && (
                          <>
                            <span>·</span>
                            <span>{m.tokens} tok</span>
                            <button onClick={() => copy(m.content)} className="hover:text-nova-500"><Copy className="w-2.5 h-2.5" /></button>
                            <span>·</span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map((r) => (
                                <button key={r} onClick={() => rate(m.id, r as 1 | 2 | 3 | 4 | 5)} className={cn('text-[10px]', r <= m.rating ? 'text-amber-400' : 'text-ink-300 dark:text-ink-600')}>★</button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {m.role === 'user' && <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0"><User className="w-3 h-3 text-white" /></div>}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0"><Bot className="w-3 h-3 text-white" /></div>
                    <div className="bg-ink-100/60 dark:bg-ink-800/40 rounded-2xl px-3 py-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-ink-200/40 dark:border-ink-800/40">
                <div className="flex gap-1 mb-1">
                  {QUICK_PROMPTS.slice(0, 3).map((p) => (
                    <button key={p} onClick={() => setInput(p)} className="px-1.5 h-5 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 text-[9px] truncate max-w-[80px]">{p}</button>
                  ))}
                </div>
                <div className="flex gap-1">
                  <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())} placeholder="输入消息..." className="flex-1 h-9 px-2 py-1.5 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 dark:border-ink-800/40 focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none" />
                  <button onClick={send} disabled={loading || !input.trim()} className="h-9 w-9 flex items-center justify-center rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white disabled:opacity-50"><Send className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-ink-400 text-xs">选择或创建会话</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {creating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCreating(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="w-80 rounded-2xl bg-white dark:bg-ink-900 p-4 space-y-2">
              <h3 className="text-sm font-bold">新建会话</h3>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="会话标题..." className="w-full h-9 px-3 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 dark:border-ink-800/40 focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
              <div className="grid grid-cols-3 gap-1">
                {Object.entries(CAT_META).map(([k, m]) => (
                  <button key={k} onClick={() => setNewCat(k as keyof typeof CAT_META)} className={cn('h-9 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold', newCat === k ? `bg-gradient-to-br ${m.color} text-white` : 'bg-ink-100 dark:bg-ink-800 text-ink-600')}>
                    <m.icon className="w-3 h-3" />{m.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setCreating(false)} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">取消</button>
                <button onClick={create} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold">创建</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

import { useRef } from 'react'

function useChatScroll(convos: Conversation[], activeId: string | null) {
  const ref = useRef<HTMLDivElement>(null)
  const prev = useRef<string | null>(null)
  useEffect(() => {
    if (!ref.current || !activeId) return
    const active = convos.find((c) => c.id === activeId)
    if (active && active.messages.length > 0) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [convos, activeId])
  return ref
}
