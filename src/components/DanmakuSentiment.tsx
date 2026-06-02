import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Smile, Frown, Zap, Eye, TrendingUp, Sparkles, MessageCircle } from 'lucide-react'
import { cn, uid } from '../lib/utils'

interface Danmaku {
  id: string
  text: string
  user: string
  at: number
  sentiment: 'positive' | 'neutral' | 'negative'
}

const DANMAKU_POOL: Omit<Danmaku, 'id' | 'at'>[] = [
  { text: '主播好棒!', user: '粉丝 A', sentiment: 'positive' },
  { text: '这个价格太香了', user: '购物达人', sentiment: 'positive' },
  { text: '买买买!', user: '学生党', sentiment: 'positive' },
  { text: '618 福利满满', user: 'Influencer', sentiment: 'positive' },
  { text: '颜值高', user: 'Mia', sentiment: 'positive' },
  { text: '已下单', user: '老板 L', sentiment: 'positive' },
  { text: '求链接!', user: '小红', sentiment: 'neutral' },
  { text: '包邮吗?', user: '小明', sentiment: 'neutral' },
  { text: '发货快吗?', user: '阿花', sentiment: 'neutral' },
  { text: '这个能便宜点吗', user: '理性派', sentiment: 'neutral' },
  { text: '好像一般', user: '毒舌 K', sentiment: 'negative' },
  { text: '价格虚高', user: '价格党', sentiment: 'negative' },
]

const KEYWORDS = {
  positive: ['好', '棒', '香', '买', '福利', '颜值', '下单', '强', '推荐', '值得'],
  neutral: ['?', '求', '能', '多', '多', '大', '吗', '链接'],
  negative: ['贵', '差', '高', '虚', '一般', '不', '不推荐'],
}

export function DanmakuSentiment() {
  const [danmaku, setDanmaku] = useState<Danmaku[]>([])
  const [stats, setStats] = useState({ positive: 0, neutral: 0, negative: 0, total: 0 })
  const [topWords, setTopWords] = useState<{ word: string; count: number; sentiment: string }[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    const init: Danmaku[] = Array.from({ length: 8 }, () => {
      const tpl = DANMAKU_POOL[Math.floor(Math.random() * DANMAKU_POOL.length)]
      return { id: uid(), ...tpl, at: Date.now() - Math.random() * 60000 }
    })
    setDanmaku(init)

    timerRef.current = window.setInterval(() => {
      const tpl = DANMAKU_POOL[Math.floor(Math.random() * DANMAKU_POOL.length)]
      const newD: Danmaku = { id: uid(), ...tpl, at: Date.now() }
      setDanmaku((d) => [...d.slice(-30), newD])
    }, 1500)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  useEffect(() => {
    const positive = danmaku.filter((d) => d.sentiment === 'positive').length
    const neutral = danmaku.filter((d) => d.sentiment === 'neutral').length
    const negative = danmaku.filter((d) => d.sentiment === 'negative').length
    setStats({ positive, neutral, negative, total: danmaku.length })

    const wordCount: Record<string, { count: number; sentiment: string }> = {}
    danmaku.forEach((d) => {
      const allWords = [...KEYWORDS.positive, ...KEYWORDS.neutral, ...KEYWORDS.negative]
      allWords.forEach((w) => {
        if (d.text.includes(w)) {
          if (!wordCount[w]) wordCount[w] = { count: 0, sentiment: d.sentiment }
          wordCount[w].count += 1
        }
      })
    })
    const sorted = Object.entries(wordCount)
      .map(([word, v]) => ({ word, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
    setTopWords(sorted)
  }, [danmaku])

  const positiveP = stats.total ? (stats.positive / stats.total) * 100 : 0
  const neutralP = stats.total ? (stats.neutral / stats.total) * 100 : 0
  const negativeP = stats.total ? (stats.negative / stats.total) * 100 : 0

  const SENTIMENT_COLOR: Record<Danmaku['sentiment'], string> = {
    positive: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    neutral: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20',
    negative: 'border-rose-500 bg-rose-50 dark:bg-rose-900/20',
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">弹幕情感分析</h2>
        </div>
        <p className="text-xs opacity-90">实时分析直播弹幕情绪分布</p>
      </div>

      <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-2xl font-bold text-emerald-500">{positiveP.toFixed(0)}%</p>
            <p className="text-[10px] text-ink-500 flex items-center justify-center gap-0.5"><Smile className="w-3 h-3" />积极</p>
            <p className="text-[9px] text-ink-400">{stats.positive} 条</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-500">{neutralP.toFixed(0)}%</p>
            <p className="text-[10px] text-ink-500 flex items-center justify-center gap-0.5"><Eye className="w-3 h-3" />中性</p>
            <p className="text-[9px] text-ink-400">{stats.neutral} 条</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-rose-500">{negativeP.toFixed(0)}%</p>
            <p className="text-[10px] text-ink-500 flex items-center justify-center gap-0.5"><Frown className="w-3 h-3" />消极</p>
            <p className="text-[9px] text-ink-400">{stats.negative} 条</p>
          </div>
        </div>

        <div className="mt-3 h-3 rounded-full overflow-hidden flex bg-ink-100 dark:bg-ink-800">
          <div className="bg-emerald-500 transition-all" style={{ width: `${positiveP}%` }} />
          <div className="bg-blue-500 transition-all" style={{ width: `${neutralP}%` }} />
          <div className="bg-rose-500 transition-all" style={{ width: `${negativeP}%` }} />
        </div>

        <div className="mt-2 text-center text-[10px] text-ink-500">
          共分析 {stats.total} 条弹幕 · 总体情绪 <span className={cn('font-bold', positiveP > 50 ? 'text-emerald-500' : negativeP > 20 ? 'text-rose-500' : 'text-blue-500')}>
            {positiveP > 50 ? '😊 偏正面' : negativeP > 20 ? '😟 偏负面' : '😐 较中性'}
          </span>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-sm font-bold mb-2 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-rose-500" />热门关键词</p>
        <div className="flex flex-wrap gap-1.5">
          {topWords.map((w) => {
            const size = Math.max(10, Math.min(20, 10 + w.count * 2))
            const color = w.sentiment === 'positive' ? 'text-emerald-500' : w.sentiment === 'negative' ? 'text-rose-500' : 'text-blue-500'
            return (
              <span
                key={w.word}
                className={cn('px-2 py-0.5 rounded-full bg-ink-50 dark:bg-ink-900/40 font-semibold', color)}
                style={{ fontSize: `${size}px` }}
              >
                {w.word} <span className="text-[9px] text-ink-400">{w.count}</span>
              </span>
            )
          })}
        </div>
      </div>

      <div className="bg-gradient-to-b from-violet-50/30 to-rose-50/30 dark:from-violet-900/10 dark:to-rose-900/10 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 overflow-hidden h-64 relative">
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 text-white text-[10px] z-10">
          实时弹幕 ({danmaku.length})
        </div>
        <AnimatePresence>
          {danmaku.slice(-12).map((d) => (
            <motion.div
              key={d.id}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 4 }}
              className={cn('absolute px-2 py-1 rounded text-xs border-l-2', SENTIMENT_COLOR[d.sentiment])}
              style={{ top: `${(parseInt(d.id.slice(-2), 36) % 80) + 10}%` }}
            >
              <span className="font-bold text-[10px] text-ink-500">{d.user}:</span> {d.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-xl p-2 border border-ink-200/60 dark:border-ink-800/60">
          <Zap className="w-4 h-4 text-amber-500 mx-auto" />
          <p className="text-base font-bold mt-0.5">{stats.total}/min</p>
          <p className="text-[9px] text-ink-500">弹幕速率</p>
        </div>
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-xl p-2 border border-ink-200/60 dark:border-ink-800/60">
          <Heart className="w-4 h-4 text-rose-500 mx-auto" />
          <p className="text-base font-bold mt-0.5">{stats.positive}</p>
          <p className="text-[9px] text-ink-500">正面互动</p>
        </div>
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-xl p-2 border border-ink-200/60 dark:border-ink-800/60">
          <MessageCircle className="w-4 h-4 text-blue-500 mx-auto" />
          <p className="text-base font-bold mt-0.5">{stats.neutral + stats.negative}</p>
          <p className="text-[9px] text-ink-500">提问反馈</p>
        </div>
      </div>
    </div>
  )
}
