import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, TrendingDown, BookOpen, Brain, Sparkles, Loader2, Calendar, Layers } from 'lucide-react'
import { cn, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface KnowledgeCard {
  id: string
  source: 'book' | 'podcast' | 'article' | 'video' | 'course' | 'note'
  title: string
  topic: string
  tags: string[]
  content: string
  rating: number
  reviewed: boolean
  reviewedAt?: number
  at: number
}

const STORAGE_KEY = 'versa:knowledge'

function load(): KnowledgeCard[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'k1', source: 'book', title: '《原子习惯》', topic: '习惯养成', tags: ['习惯', '效率'], content: '1% 的日复一日的进步, 一年后会变成 37 倍的提升', rating: 5, reviewed: true, reviewedAt: Date.now() - 86400000 * 3, at: Date.now() - 86400000 * 5 },
    { id: 'k2', source: 'podcast', title: '《商业就是这样》S03E12', topic: '商业模式', tags: ['商业', '播客'], content: '订阅制 vs 一次性销售, LTV 决定商业模式', rating: 4, reviewed: true, reviewedAt: Date.now() - 86400000 * 7, at: Date.now() - 86400000 * 10 },
    { id: 'k3', source: 'article', title: '深度学习入门指南', topic: 'AI/ML', tags: ['AI', '技术'], content: 'Transformer 架构的核心是 self-attention, 让模型并行处理序列', rating: 4, reviewed: false, at: Date.now() - 86400000 * 2 },
    { id: 'k4', source: 'video', title: 'YouTube: 极简主义', topic: '生活方式', tags: ['生活', '极简'], content: '少即是多, 拥有更少东西 = 更多自由', rating: 5, reviewed: true, reviewedAt: Date.now() - 86400000 * 14, at: Date.now() - 86400000 * 15 },
    { id: 'k5', source: 'course', title: 'Coursera: 心理学入门', topic: '心理学', tags: ['心理', '学习'], content: '认知偏差如确认偏误, 影响我们的判断', rating: 4, reviewed: false, at: Date.now() - 86400000 },
  ]
}
function save(d: KnowledgeCard[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const SOURCE_META = {
  book: { label: '书', icon: BookOpen, color: 'from-amber-500 to-orange-500', emoji: '📚' },
  podcast: { label: '播客', icon: BarChart3, color: 'from-violet-500 to-purple-500', emoji: '🎙️' },
  article: { label: '文章', icon: BookOpen, color: 'from-blue-500 to-indigo-500', emoji: '📰' },
  video: { label: '视频', icon: BookOpen, color: 'from-rose-500 to-pink-500', emoji: '🎬' },
  course: { label: '课程', icon: Brain, color: 'from-emerald-500 to-teal-500', emoji: '🎓' },
  note: { label: '笔记', icon: BookOpen, color: 'from-cyan-500 to-blue-500', emoji: '📝' },
} as const

export function KnowledgeBase() {
  const [cards, setCards] = useState<KnowledgeCard[]>(load())
  const [filter, setFilter] = useState<'all' | 'unreviewed' | 'top' | keyof typeof SOURCE_META>('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [newSource, setNewSource] = useState<keyof typeof SOURCE_META>('book')
  const [newContent, setNewContent] = useState('')
  const [newTags, setNewTags] = useState('')

  useEffect(() => { save(cards) }, [cards])

  const filtered = (() => {
    let out = cards
    if (filter === 'unreviewed') out = out.filter((c) => !c.reviewed)
    else if (filter === 'top') out = out.filter((c) => c.rating >= 4)
    else if (filter !== 'all') out = out.filter((c) => c.source === filter)
    return out
  })()

  const totalCount = cards.length
  const reviewedCount = cards.filter((c) => c.reviewed).length
  const topicsCount = new Set(cards.map((c) => c.topic)).size
  const reviewRate = totalCount > 0 ? Math.round((reviewedCount / totalCount) * 100) : 0

  const topicStats = (() => {
    const map: Record<string, number> = {}
    cards.forEach((c) => map[c.topic] = (map[c.topic] || 0) + 1)
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
  })()
  const maxTopic = Math.max(1, ...Object.values(topicStats).map(([, n]) => n).map((n) => n))

  const add = () => {
    if (!newTitle.trim() || !newContent.trim()) { toast('请填写完整', 'error'); return }
    const c: KnowledgeCard = { id: 'k' + Date.now(), source: newSource, title: newTitle, topic: newTopic, tags: newTags.split(',').map((t) => t.trim()).filter(Boolean), content: newContent, rating: 0, reviewed: false, at: Date.now() }
    setCards([c, ...cards])
    setNewTitle(''); setNewTopic(''); setNewContent(''); setNewTags('')
    setAdding(false)
    toast('已收录', 'success')
  }

  const toggleReview = (id: string) => setCards(cards.map((c) => c.id === id ? { ...c, reviewed: !c.reviewed, reviewedAt: !c.reviewed ? Date.now() : c.reviewedAt } : c))
  const rate = (id: string, r: number) => setCards(cards.map((c) => c.id === id ? { ...c, rating: r } : c))
  const remove = (id: string) => setCards(cards.filter((c) => c.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const topics = topicStats.map(([t]) => t).join('/')
      const result = await aiComplete(`基于知识库 (主题: ${topics}, ${reviewedCount}/${totalCount} 已复习) 推荐 3 个值得深入学习的方向 (50-80 字)`, '你是 Versa 学习顾问, 简洁专业, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const active = cards.find((c) => c.id === activeId)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5" />
          <h2 className="text-lg font-bold">知识库</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">卡片 · 复习 · 主题图谱</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{totalCount}</p>
            <p className="text-[10px] opacity-80">卡片</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{topicsCount}</p>
            <p className="text-[10px] opacity-80">主题</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{reviewRate}%</p>
            <p className="text-[10px] opacity-80">复习率</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          + 收录
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI
        </button>
      </div>

      {aiRec && (
        <div className="bg-amber-50/40 dark:bg-amber-900/20 rounded-xl p-2 border border-amber-200/40">
          <p className="text-[10px] leading-relaxed">{aiRec}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'unreviewed', 'top', ...Object.keys(SOURCE_META)] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f as any)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'unreviewed' ? '待复习' : f === 'top' ? '⭐ 高分' : SOURCE_META[f as keyof typeof SOURCE_META].emoji + ' ' + SOURCE_META[f as keyof typeof SOURCE_META].label}
          </button>
        ))}
      </div>

      {topicStats.length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-xs font-bold mb-1.5">主题分布</p>
          <div className="space-y-1">
            {topicStats.map(([topic, count]) => (
              <div key={topic} className="flex items-center gap-1.5">
                <span className="text-[10px] text-ink-500 w-16 truncate">{topic}</span>
                <div className="flex-1 h-3 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(count / maxTopic) * 100}%` }} className="h-full bg-gradient-to-r from-amber-500 to-orange-500" />
                </div>
                <span className="text-[10px] text-ink-500 w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Brain className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有卡片</p>
          </div>
        ) : filtered.map((c) => {
          const Meta = SOURCE_META[c.source]
          return (
            <motion.div key={c.id} whileHover={{ y: -1 }} onClick={() => setActiveId(c.id)} className={cn('rounded-2xl p-3 border cursor-pointer', c.reviewed ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-200/40' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
              <div className="flex items-start gap-2">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white text-base bg-gradient-to-br flex-shrink-0', Meta.color)}>
                  {Meta.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold truncate">{c.title}</p>
                    {c.reviewed && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500 text-white font-bold flex-shrink-0">✓</span>}
                  </div>
                  <p className="text-[10px] text-ink-500 line-clamp-2">{c.content}</p>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <span className="text-[9px] text-amber-500">{c.rating > 0 ? '⭐'.repeat(c.rating) : '—'}</span>
                    {c.tags.slice(0, 2).map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800">#{t}</span>)}
                    <span className="text-[9px] text-ink-400 ml-auto">{formatTimeAgo(new Date(c.at).toISOString())}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setActiveId(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start gap-2">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg bg-gradient-to-br', SOURCE_META[active.source].color)}>
                {SOURCE_META[active.source].emoji}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold">{active.title}</h3>
                <p className="text-xs text-ink-500">{active.topic}</p>
              </div>
            </div>
            <p className="text-sm leading-relaxed p-3 rounded-lg bg-ink-50 dark:bg-ink-800">{active.content}</p>
            <div className="flex flex-wrap gap-1">
              {active.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">#{t}</span>)}
            </div>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-ink-500">评分:</p>
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => rate(active.id, i + 1)} className={cn('text-base', i < active.rating ? 'text-amber-500' : 'text-ink-300')}>⭐</button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button onClick={() => toggleReview(active.id)} className={cn('flex-1 h-9 rounded-lg text-sm font-bold', active.reviewed ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                {active.reviewed ? '✓ 已复习' : '标记复习'}
              </button>
              <button onClick={() => remove(active.id)} className="h-9 px-3 rounded-lg bg-rose-500 text-white text-sm">删除</button>
            </div>
            {active.reviewedAt && <p className="text-[10px] text-ink-500 text-center">上次复习: {formatTimeAgo(new Date(active.reviewedAt).toISOString())}</p>}
          </motion.div>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">收录知识卡片</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(SOURCE_META) as Array<keyof typeof SOURCE_META>).map((k) => {
                const M = SOURCE_META[k]
                return (
                  <button key={k} onClick={() => setNewSource(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center gap-0.5', newSource === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    <span className="text-base">{M.emoji}</span>
                    <span className="text-[9px] font-semibold">{M.label}</span>
                  </button>
                )
              })}
            </div>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="来源标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="主题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="核心内容/摘录..." rows={3} className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none resize-none" />
            <input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="标签" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold">收录</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
