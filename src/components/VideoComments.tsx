import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, MessageCircle, X, Sparkles, Loader2, Send } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface VideoComment {
  id: string
  userId: string
  userName: string
  userAvatar: string
  text: string
  at: number
  likes: number
}

const SEED: VideoComment[] = [
  { id: 'c1', userId: 'u1', userName: '购物达人王', userAvatar: 'https://i.pravatar.cc/100?img=11', text: '外观真的很精致!', at: 3, likes: 45 },
  { id: 'c2', userId: 'u2', userName: '数码小王子', userAvatar: 'https://i.pravatar.cc/100?img=51', text: '价格 PK 环节!', at: 15, likes: 89 },
  { id: 'c3', userId: 'u3', userName: '美食家 Lily', userAvatar: 'https://i.pravatar.cc/100?img=20', text: '买买买!', at: 32, likes: 67 },
  { id: 'c4', userId: 'u4', userName: 'Influencer', userAvatar: 'https://i.pravatar.cc/100?img=44', text: '618 福利超多', at: 48, likes: 56 },
  { id: 'c5', userId: 'u5', userName: '学生党 G', userAvatar: 'https://i.pravatar.cc/100?img=99', text: '这个链接能买吗?', at: 62, likes: 34 },
  { id: 'c6', userId: 'u6', userName: 'Mia', userAvatar: 'https://i.pravatar.cc/100?img=20', text: '颜值在线!', at: 78, likes: 78 },
]

const STORAGE_KEY = 'versa:video-comments'

function load(): VideoComment[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return SEED
}

function save(c: VideoComment[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)) } catch {}
}

export function VideoComments() {
  const [comments, setComments] = useState<VideoComment[]>([])
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [duration] = useState(90)
  const [inputOpen, setInputOpen] = useState(false)
  const [input, setInput] = useState('')
  const [aiInsights, setAiInsights] = useState('')
  const [loading, setLoading] = useState(false)
  const playRef = useRef<number | null>(null)

  useEffect(() => { setComments(load()) }, [])
  useEffect(() => { if (comments.length) save(comments) }, [comments])

  useEffect(() => {
    if (playing) {
      playRef.current = window.setInterval(() => {
        setCurrent((c) => {
          if (c >= duration) { setPlaying(false); return 0 }
          return c + 0.5
        })
      }, 100)
    } else if (playRef.current) {
      clearInterval(playRef.current)
    }
    return () => { if (playRef.current) clearInterval(playRef.current) }
  }, [playing, duration])

  const send = () => {
    if (!input.trim()) return
    const c: VideoComment = {
      id: uid(), userId: 'me', userName: '我', userAvatar: 'https://i.pravatar.cc/100?img=99',
      text: input, at: current, likes: 0,
    }
    setComments([...comments, c])
    setInput('')
    setInputOpen(false)
    toast('评论已发布到 ' + Math.floor(current) + 's', 'success')
  }

  const like = (id: string) => {
    setComments((cs) => cs.map((c) => c.id === id ? { ...c, likes: c.likes + 1 } : c))
  }

  const visibleComments = comments.filter((c) => Math.abs(c.at - current) < 4)

  const generateAIInsights = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(
        `分析以下视频评论, 提取关键洞察 (100-200 字):\n${comments.slice(0, 8).map((c) => `[${c.at}s] ${c.userName}: ${c.text}`).join('\n')}`,
        '你是 Versa 评论分析助手, 客观总结, 中文'
      )
      setAiInsights(result)
    } catch (e: any) {
      toast(e?.message || '分析失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle className="w-5 h-5" />
          <h2 className="text-lg font-bold">视频评论</h2>
        </div>
        <p className="text-xs opacity-90">在特定时间点评论, 弹幕式互动</p>
      </div>

      <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
        <div className="aspect-video bg-gradient-to-br from-ink-900 to-ink-800 rounded-xl flex items-center justify-center text-white text-5xl relative overflow-hidden">
          🎬
          <AnimatePresence>
            {visibleComments.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ x: '100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 3 }}
                className="absolute bg-black/60 rounded-full px-2 py-1 text-[10px] whitespace-nowrap"
                style={{ top: `${15 + i * 14}%`, maxWidth: '60%' }}
              >
                {c.userName}: {c.text}
              </motion.div>
            ))}
          </AnimatePresence>
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] font-mono">
            {Math.floor(current)}s / {duration}s
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setPlaying(!playing)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={duration}
            value={current}
            onChange={(e) => setCurrent(+e.target.value)}
            className="flex-1 accent-rose-500"
          />
          <span className="text-[10px] text-ink-500 font-mono whitespace-nowrap">{Math.floor(current)}s</span>
        </div>

        <div className="relative h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full mt-2">
          {comments.map((c) => (
            <div
              key={c.id}
              className="absolute w-2 h-2 rounded-full bg-rose-500 -top-0.5"
              style={{ left: `calc(${(c.at / duration) * 100}% - 4px)` }}
              title={`${c.userName} @ ${c.at}s: ${c.text}`}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setInputOpen(true)}
          className="flex-1 h-9 rounded-lg bg-rose-500 text-white text-sm font-semibold flex items-center justify-center gap-1"
        >
          <MessageCircle className="w-4 h-4" />评论 {Math.floor(current)}s
        </button>
        <button
          onClick={generateAIInsights}
          disabled={loading}
          className="h-9 px-3 rounded-lg bg-violet-500 text-white text-xs font-semibold flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          AI 洞察
        </button>
      </div>

      {aiInsights && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl p-3 border border-violet-200/40">
          <p className="text-sm font-bold mb-1 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-violet-500" />AI 评论洞察
          </p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiInsights}</p>
        </div>
      )}

      <div className="space-y-1.5">
        {comments.sort((a, b) => a.at - b.at).map((c) => (
          <div key={c.id} className="flex items-start gap-2 p-2 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
            <img src={c.userAvatar} alt={c.userName} className="w-7 h-7 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-xs">
                <span className="font-semibold">{c.userName}</span>
                <span className="text-ink-400 ml-1">@ {c.at}s</span>
              </p>
              <p className="text-sm mt-0.5">{c.text}</p>
              <button onClick={() => like(c.id)} className="text-[10px] text-ink-500 hover:text-rose-500 mt-0.5">♥ {c.likes}</button>
            </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {inputOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end"
            onClick={() => setInputOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-white dark:bg-ink-900 rounded-t-2xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="font-bold">评论 @ {Math.floor(current)}s</p>
                <button onClick={() => setInputOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="这一刻你在想什么?"
                rows={3}
                autoFocus
                className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-rose-500"
              />
              <button
                onClick={send}
                className="w-full h-9 rounded-lg bg-rose-500 text-white text-sm font-semibold flex items-center justify-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />发布
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
