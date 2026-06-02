import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Cookie, Sparkles, Loader2, RefreshCw, Shuffle, Heart, Star, Calendar, X, Plus, History } from 'lucide-react'
import { cn, formatTimeAgo, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

const FORTUNES = [
  { text: '今天会遇到让你开心的小事 🌸', category: 'love', lucky: 7 },
  { text: '坚持是最好的答案 💪', category: 'career', lucky: 9 },
  { text: '意外的收获正在路上 🎁', category: 'money', lucky: 6 },
  { text: '微笑会带来好运气 😊', category: 'love', lucky: 8 },
  { text: '今天的努力明天会有回报 🌱', category: 'career', lucky: 8 },
  { text: '一杯热茶能解决烦恼 🍵', category: 'life', lucky: 7 },
  { text: '听一首老歌会有惊喜 🎵', category: 'life', lucky: 6 },
  { text: '勇敢说出你的想法 💬', category: 'career', lucky: 9 },
  { text: '晚上会有好梦 🌙', category: 'life', lucky: 7 },
  { text: '远方有美好的相遇 ✈️', category: 'travel', lucky: 8 },
  { text: '放下执念, 自由会来 🕊️', category: 'mindset', lucky: 9 },
  { text: '今天适合尝试新事物 ✨', category: 'adventure', lucky: 7 },
  { text: '一本好书正等着你 📚', category: 'study', lucky: 6 },
  { text: '给老朋友发个消息 📱', category: 'love', lucky: 8 },
  { text: '运动会让状态更好 🏃', category: 'health', lucky: 7 },
  { text: '吃一顿好饭是种幸福 🍜', category: 'food', lucky: 8 },
]

const STORAGE_KEY = 'versa:fortunes'

interface Entry { id: string; fortune: string; category: string; lucky: number; note: string; at: number; aiReading?: string }

function load(): Entry[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Entry[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function FortuneCookie() {
  const [entries, setEntries] = useState<Entry[]>(load())
  const [cracking, setCracking] = useState(false)
  const [current, setCurrent] = useState<Entry | null>(null)
  const [aiReading, setAiReading] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => { save(entries) }, [entries])

  const crack = () => {
    setCracking(true)
    setTimeout(() => {
      const f = FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
      const e: Entry = { id: uid(), fortune: f.text, category: f.category, lucky: f.lucky, note: '', at: Date.now() }
      setCurrent(e)
      setCracking(false)
    }, 1200)
  }

  const saveCurrent = () => {
    if (!current) return
    const final: Entry = { ...current, note, aiReading: aiReading || current.aiReading }
    setEntries([final, ...entries])
    setCurrent(null); setNote(''); setAiReading('')
    toast('已保存', 'success')
  }

  const remove = (id: string) => setEntries(entries.filter((e) => e.id !== id))

  const runAI = async () => {
    if (!current || !isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setAiLoading(true)
    try {
      const result = await aiComplete(`为这则签文生成 60-100 字的详细解读: "${current.fortune}"`, '你是 Versa 心灵导师, 温柔治愈, 中文')
      setAiReading(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setAiLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Cookie className="w-5 h-5" />
          <h2 className="text-lg font-bold">幸运饼干</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">每日一签 · AI 解读 · 收藏</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{FORTUNES.length}</p>
            <p className="text-[10px] opacity-80">签文</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{entries.length}</p>
            <p className="text-[10px] opacity-80">已收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{Math.round(entries.reduce((s, e) => s + e.lucky, 0) / Math.max(1, entries.length)) || 7}</p>
            <p className="text-[10px] opacity-80">平均运气</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center my-3">
        <motion.button
          onClick={cracking || current ? undefined : crack}
          disabled={cracking}
          animate={cracking ? { rotate: [0, -20, 20, -20, 20, 0], scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 1.2 }}
          className={cn('w-44 h-44 rounded-full flex flex-col items-center justify-center text-6xl shadow-2xl', cracking ? 'bg-amber-100' : 'bg-gradient-to-br from-amber-300 via-orange-300 to-rose-300')}
        >
          {cracking ? '🥢' : current ? current.fortune.split(' ')[0] : '🥠'}
          {!cracking && !current && <p className="text-xs font-bold text-amber-900 mt-1">点击</p>}
        </motion.button>
      </div>

      <div className="flex justify-center">
        <button onClick={crack} disabled={cracking} className="px-6 h-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg disabled:opacity-50">
          {cracking ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cookie className="w-4 h-4" />}
          {cracking ? '打开中...' : '再开一个'}
        </button>
      </div>

      {current && !cracking && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-4 border-2 border-amber-300">
          <p className="text-center text-base font-semibold text-amber-900 dark:text-amber-200 mb-2">{current.fortune}</p>
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="text-[10px] text-amber-700 dark:text-amber-300">幸运值:</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <Star key={i} className={cn('w-3 h-3', i < current.lucky ? 'fill-amber-400 text-amber-400' : 'text-amber-200')} />
              ))}
            </div>
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold">{current.lucky}/10</span>
          </div>
          <button onClick={runAI} disabled={aiLoading} className="w-full h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
            {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 详细解读
          </button>
          {aiReading && <p className="mt-2 text-xs italic text-amber-800 dark:text-amber-200 leading-relaxed">{aiReading}</p>}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="我的感受..." className="mt-2 w-full px-2 h-7 rounded bg-white dark:bg-ink-900 text-xs outline-none" />
          <div className="flex gap-1.5 mt-2">
            <button onClick={saveCurrent} className="flex-1 h-8 rounded-lg bg-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1">
              <Heart className="w-3 h-3" />收藏
            </button>
            <button onClick={() => { setCurrent(null); setNote(''); setAiReading('') }} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">丢弃</button>
          </div>
        </motion.div>
      )}

      {entries.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-bold">我的签文 ({entries.length})</p>
          {entries.slice(0, 5).map((e) => (
            <div key={e.id} className="p-2 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 flex items-start gap-2">
              <Cookie className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs line-clamp-1">{e.fortune}</p>
                {e.note && <p className="text-[10px] text-ink-500 line-clamp-1">💭 {e.note}</p>}
                <p className="text-[9px] text-ink-400 mt-0.5">{formatTimeAgo(new Date(e.at).toISOString())}</p>
              </div>
              <button onClick={() => remove(e.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
