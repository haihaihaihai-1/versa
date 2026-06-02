import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, ThumbsUp, MessageCircle, Share2, Flame, Crown } from 'lucide-react'
import { cn, formatNumber, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Highlight {
  id: string
  liveId: string
  hostName: string
  hostAvatar: string
  startTime: number
  endTime: number
  text: string
  likes: number
  type: 'funny' | 'wow' | 'question' | 'product'
  comments: { id: string; user: string; text: string }[]
}

const DANMAKU_POOL = [
  { text: '这个价格也太划算了吧!', type: 'wow' as const, weight: 0.25 },
  { text: '哈哈哈笑死我了 😂', type: 'funny' as const, weight: 0.2 },
  { text: '有链接吗? 求', type: 'question' as const, weight: 0.15 },
  { text: '已下单 3 件!', type: 'product' as const, weight: 0.15 },
  { text: '颜值高! 想要!', type: 'wow' as const, weight: 0.1 },
  { text: '主播真专业', type: 'wow' as const, weight: 0.05 },
  { text: '这个颜色好好看', type: 'wow' as const, weight: 0.05 },
  { text: '等了好久终于开播', type: 'wow' as const, weight: 0.05 },
]

const TYPE_META = {
  funny: { label: '搞笑', color: 'from-amber-500 to-orange-500' },
  wow: { label: '惊叹', color: 'from-violet-500 to-purple-500' },
  question: { label: '提问', color: 'from-blue-500 to-indigo-500' },
  product: { label: '商品', color: 'from-rose-500 to-pink-500' },
} as const

const STORAGE_KEY = 'versa:live-highlights'

function load(): Highlight[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) return JSON.parse(s)
  } catch {}
  const out: Highlight[] = []
  for (let i = 0; i < 8; i++) {
    const pool = DANMAKU_POOL[Math.floor(Math.random() * DANMAKU_POOL.length)]
    out.push({
      id: uid(), liveId: 'l1', hostName: '数码小王子', hostAvatar: 'https://i.pravatar.cc/100?img=51',
      startTime: Math.floor(Math.random() * 3500), endTime: 0, text: pool.text, type: pool.type,
      likes: Math.floor(Math.random() * 800) + 50,
      comments: [],
    })
  }
  out.forEach((h, i) => h.endTime = h.startTime + 8)
  return out.sort((a, b) => b.likes - a.likes)
}
function save(d: Highlight[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function LiveHighlight() {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [filter, setFilter] = useState<'all' | keyof typeof TYPE_META>('all')
  const [aiSummary, setAiSummary] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { setHighlights(load()) }, [])
  useEffect(() => { if (highlights.length) save(highlights) }, [highlights])

  const like = (id: string) => setHighlights((hs) => hs.map((h) => h.id === id ? { ...h, likes: h.likes + 1 } : h))

  const aiSummaryRun = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(
        `为以下直播弹幕高光生成一段 50-80 字的有趣总结: ${highlights.slice(0, 5).map((h) => `「${h.text}」(${h.likes}赞)`).join('; ')}`,
        '你是 Versa 直播内容运营, 活泼有梗, 中文'
      )
      setAiSummary(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const filtered = filter === 'all' ? highlights : highlights.filter((h) => h.type === filter)
  const topOne = highlights[0]
  const stats = {
    total: highlights.length,
    likes: highlights.reduce((s, h) => s + h.likes, 0),
    types: Object.keys(TYPE_META).length,
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">弹幕高光</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">回顾直播精彩瞬间</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{stats.total}</p>
            <p className="text-[10px] opacity-80">高光</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{formatNumber(stats.likes)}</p>
            <p className="text-[10px] opacity-80">总赞数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{stats.types}</p>
            <p className="text-[10px] opacity-80">类型</p>
          </div>
        </div>
      </div>

      {topOne && (
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-3 border-2 border-amber-300"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Crown className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300">本期最赞</span>
          </div>
          <p className="text-base font-bold text-amber-900 dark:text-amber-200">"{topOne.text}"</p>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-amber-700 dark:text-amber-300">
            <span>{formatNumber(topOne.likes)} 赞</span>
            <span>·</span>
            <span>{Math.floor(topOne.startTime / 60)}分{topOne.startTime % 60}秒</span>
          </div>
        </motion.div>
      )}

      <button onClick={aiSummaryRun} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        AI 高光总结
      </button>

      {aiSummary && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-3 border border-amber-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-amber-500"><Sparkles className="w-3.5 h-3.5" />AI 总结</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiSummary}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => setFilter('all')}
          className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'all' ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
        >
          全部 ({highlights.length})
        </button>
        {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === k ? `bg-gradient-to-r ${TYPE_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}
          >
            {TYPE_META[k].label} ({highlights.filter((h) => h.type === k).length})
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.map((h, i) => (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ x: 4 }}
            className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-2.5 border border-ink-200/60 dark:border-ink-800/60"
          >
            <div className="flex items-start gap-2">
              <div className={cn('w-1 h-12 rounded-full bg-gradient-to-b', TYPE_META[h.type].color)} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">"{h.text}"</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-ink-500">
                  <span className={cn('px-1.5 py-0.5 rounded text-white font-bold text-[9px]', `bg-gradient-to-r ${TYPE_META[h.type].color}`)}>{TYPE_META[h.type].label}</span>
                  <span>{Math.floor(h.startTime / 60)}:{(h.startTime % 60).toString().padStart(2, '0')}</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5"><ThumbsUp className="w-2.5 h-2.5" />{formatNumber(h.likes)}</span>
                </div>
              </div>
              <button onClick={() => like(h.id)} className="text-ink-400 hover:text-rose-500 flex flex-col items-center">
                <ThumbsUp className="w-3.5 h-3.5" />
                <span className="text-[9px] mt-0.5">赞</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
