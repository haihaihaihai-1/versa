import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, Sparkles, Loader2, Copy, Smile, Frown, Meh, Heart, Zap, TrendingUp, BarChart3, Award, Tag } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Analysis {
  id: string
  text: string
  sentiment: 'positive' | 'neutral' | 'negative'
  score: number
  emotions: { emotion: string; intensity: number }[]
  keywords: string[]
  tone: string
  aiInsight: string
  date: string
}

const STORAGE_KEY = 'versa:sentiment-v1'

function load(): Analysis[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Analysis[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

// Local heuristic sentiment
function localAnalyze(text: string): { sentiment: 'positive' | 'neutral' | 'negative'; score: number; emotions: { emotion: string; intensity: number }[]; keywords: string[]; tone: string } {
  const positive = ['好', '棒', '喜欢', '爱', '开心', '快乐', '感谢', 'amazing', 'love', 'great', 'happy', 'excellent', 'wonderful', 'best', '美好', '优秀', '幸福', '感谢', '满意', '享受', '完美', '成功', '顺利', '推荐', 'amazing', 'awesome', 'fantastic', 'cool']
  const negative = ['差', '糟', '讨厌', '恨', '生气', '难过', '失望', 'bad', 'terrible', 'hate', 'sad', 'angry', 'disappointed', 'awful', 'horrible', 'worst', '烂', '失望', '不行', '糟糕', '差劲', '失败', '难过', '伤心', '痛苦']
  const joyWords = ['开心', '快乐', '幸福', 'joy', 'happy', 'love']
  const sadWords = ['难过', '伤心', 'sad', 'cry']
  const angryWords = ['生气', '愤怒', 'angry', 'mad']
  const fearWords = ['害怕', '恐惧', 'fear', 'afraid']
  const surpriseWords = ['惊讶', '震惊', 'surprise', 'wow', 'amazing']
  const keywords: string[] = []

  let score = 50
  let posCount = 0
  let negCount = 0
  const lower = text.toLowerCase()
  positive.forEach((p) => {
    const c = (text.match(new RegExp(p, 'g')) || []).length
    posCount += c
    if (c > 0) keywords.push(p)
  })
  negative.forEach((n) => {
    const c = (text.match(new RegExp(n, 'g')) || []).length
    negCount += c
    if (c > 0) keywords.push(n)
  })
  score = Math.max(0, Math.min(100, 50 + (posCount - negCount) * 10))
  const sentiment: 'positive' | 'neutral' | 'negative' = score > 60 ? 'positive' : score < 40 ? 'negative' : 'neutral'

  const emotions: { emotion: string; intensity: number }[] = []
  const count = (words: string[]) => words.reduce((s, w) => s + ((text.match(new RegExp(w, 'gi')) || []).length), 0)
  if (count(joyWords) > 0) emotions.push({ emotion: 'joy', intensity: count(joyWords) * 25 })
  if (count(sadWords) > 0) emotions.push({ emotion: 'sadness', intensity: count(sadWords) * 25 })
  if (count(angryWords) > 0) emotions.push({ emotion: 'anger', intensity: count(angryWords) * 25 })
  if (count(fearWords) > 0) emotions.push({ emotion: 'fear', intensity: count(fearWords) * 25 })
  if (count(surpriseWords) > 0) emotions.push({ emotion: 'surprise', intensity: count(surpriseWords) * 25 })
  if (emotions.length === 0) emotions.push({ emotion: 'neutral', intensity: 50 })

  let tone = '中性'
  if (text.includes('!') || text.includes('！')) tone = '激动'
  else if (text.includes('?')) tone = '疑问'
  else if (text.length < 20) tone = '简短'
  else if (score > 70) tone = '热情'
  else if (score < 30) tone = '低落'

  return { sentiment, score, emotions, keywords: keywords.slice(0, 5), tone }
}

const SENTIMENT_META = {
  positive: { label: '积极', icon: Smile, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-500' },
  neutral: { label: '中性', icon: Meh, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-500' },
  negative: { label: '消极', icon: Frown, color: 'from-rose-500 to-red-500', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-500' },
} as const

const EMOTION_META: { [k: string]: { label: string; emoji: string; color: string } } = {
  joy: { label: '喜悦', emoji: '😊', color: 'text-amber-500' },
  sadness: { label: '悲伤', emoji: '😢', color: 'text-blue-500' },
  anger: { label: '愤怒', emoji: '😠', color: 'text-rose-500' },
  fear: { label: '恐惧', emoji: '😨', color: 'text-violet-500' },
  surprise: { label: '惊讶', emoji: '😲', color: 'text-cyan-500' },
  neutral: { label: '平静', emoji: '😐', color: 'text-ink-500' },
}

export function SentimentAnalyzer() {
  const [analyses, setAnalyses] = useState<Analysis[]>(load())
  const [text, setText] = useState('')
  const [current, setCurrent] = useState<Analysis | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => { save(analyses) }, [analyses])

  const presets = [
    { label: '😊 积极', text: '今天真是太棒了! 我非常开心, 感谢大家的陪伴! 一切都很美好!' },
    { label: '😢 消极', text: '我感到非常失望和难过, 这次经历太糟糕了, 真的很糟糕.' },
    { label: '😐 中性', text: '今天去了商店, 买了一些日用品, 下午在家休息, 晚上看了电视.' },
  ]

  const analyze = async () => {
    if (!text.trim()) { toast('请输入文本', 'error'); return }
    const local = localAnalyze(text)
    const base: Omit<Analysis, 'aiInsight'> = { id: uid(), text, sentiment: local.sentiment, score: local.score, emotions: local.emotions, keywords: local.keywords, tone: local.tone, date: new Date().toISOString() }
    setCurrent({ ...base, aiInsight: '' })
    setAnalyses([{ ...base, aiInsight: '' }, ...analyses].slice(0, 20))

    if (isAIEnabled()) {
      setAiLoading(true)
      try {
        const result = await aiComplete(`分析以下文本的情绪 (50 字内, 中文): "${text}"`, '你是 Versa 情绪分析专家, 简洁实用')
        setCurrent({ ...base, aiInsight: result })
        setAnalyses((prev) => prev.map((a) => a.id === base.id ? { ...a, aiInsight: result } : a))
      } catch (e: any) { /* silent */ } finally { setAiLoading(false) }
    }
  }

  const remove = (id: string) => setAnalyses(analyses.filter((a) => a.id !== id))

  const total = analyses.length
  const positiveCount = analyses.filter((a) => a.sentiment === 'positive').length
  const negativeCount = analyses.filter((a) => a.sentiment === 'negative').length
  const avgScore = analyses.length > 0 ? (analyses.reduce((s, a) => s + a.score, 0) / analyses.length).toFixed(0) : '0'

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5" />
          <h2 className="text-lg font-bold">情绪分析</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">本地启发式 + AI 洞察 · 6 种情绪</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">总分析</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-emerald-100">{positiveCount}</p>
            <p className="text-[9px] opacity-80">积极</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{negativeCount}</p>
            <p className="text-[9px] opacity-80">消极</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgScore}</p>
            <p className="text-[9px] opacity-80">均分</p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1.5">输入文本</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="输入要分析的文本 (中英混合)..." className="w-full px-3 py-2 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none min-h-[80px]" />
        <div className="flex gap-1.5 mt-1.5">
          {presets.map((p) => (
            <button key={p.label} onClick={() => setText(p.text)} className="px-2 h-7 rounded-full bg-ink-100 dark:bg-ink-800 text-[10px]">{p.label}</button>
          ))}
        </div>
      </div>

      <button onClick={analyze} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold flex items-center justify-center gap-1">
        <Activity className="w-3.5 h-3.5" />分析情绪
      </button>

      {current && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
          <div className="flex items-center gap-2 mb-2">
            {(() => {
              const SM = SENTIMENT_META[current.sentiment]
              const Icon = SM.icon
              return (
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', SM.color)}>
                  <Icon className="w-6 h-6" />
                </div>
              )
            })()}
            <div className="flex-1">
              <p className="text-lg font-bold">{SENTIMENT_META[current.sentiment].label}</p>
              <p className="text-xs text-ink-500">得分: {current.score}/100</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold" style={{ color: current.sentiment === 'positive' ? '#10b981' : current.sentiment === 'negative' ? '#ef4444' : '#f59e0b' }}>{current.score}</p>
            </div>
          </div>
          <div className="h-2 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden mb-2">
            <motion.div initial={{ width: 0 }} animate={{ width: `${current.score}%` }} className={cn('h-full', current.sentiment === 'positive' ? 'bg-emerald-500' : current.sentiment === 'negative' ? 'bg-rose-500' : 'bg-amber-500')} />
          </div>
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-ink-500">🎭 情绪</p>
            <div className="flex flex-wrap gap-1">
              {current.emotions.map((e) => {
                const EM = EMOTION_META[e.emotion] || { label: e.emotion, emoji: '😐', color: 'text-ink-500' }
                return (
                  <span key={e.emotion} className="px-2 py-0.5 rounded-full bg-ink-100 dark:bg-ink-800 text-[10px] flex items-center gap-0.5">
                    <span>{EM.emoji}</span> {EM.label} {e.intensity}%
                  </span>
                )
              })}
            </div>
            <p className="text-[10px] font-semibold text-ink-500 mt-1.5">🔑 关键词</p>
            <div className="flex flex-wrap gap-1">
              {current.keywords.length > 0 ? current.keywords.map((k) => (
                <span key={k} className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-500 text-[9px] font-semibold">{k}</span>
              )) : <span className="text-[9px] text-ink-400">无明显关键词</span>}
            </div>
            <p className="text-[10px] font-semibold text-ink-500 mt-1.5">🎭 语气: <span className="text-ink-700 dark:text-ink-300">{current.tone}</span></p>
            {aiLoading ? (
              <p className="text-[10px] text-violet-500 mt-1.5 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />AI 洞察生成中...</p>
            ) : current.aiInsight && (
              <div className="rounded-lg bg-violet-50/40 dark:bg-violet-900/20 p-2 mt-1.5">
                <p className="text-[10px] leading-relaxed text-violet-700 dark:text-violet-300">💡 {current.aiInsight}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {analyses.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold">历史 ({analyses.length})</p>
          {analyses.filter((a) => a.id !== current?.id).slice(0, 10).map((a) => {
            const SM = SENTIMENT_META[a.sentiment]
            return (
              <div key={a.id} className="rounded-xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', SM.color)}>
                  <SM.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{a.text}</p>
                  <p className="text-[10px] text-ink-500">{SM.label} · {a.score}分 · {a.date.split('T')[0]}</p>
                </div>
                <button onClick={() => setCurrent(a)} className="text-[10px] text-cyan-500">查看</button>
                <button onClick={() => remove(a.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
