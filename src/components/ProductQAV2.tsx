import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageCircle, ThumbsUp, ThumbsDown, Video, Camera, CheckCircle, Sparkles, Loader2, ChevronRight } from 'lucide-react'
import { cn, formatTimeAgo, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Question {
  id: string
  productId: string
  userId: string
  userName: string
  userAvatar: string
  text: string
  videoUrl?: string
  imageUrls?: string[]
  at: number
  likes: number
  dislikes: number
  answers: Answer[]
  answered: boolean
}

interface Answer {
  id: string
  userId: string
  userName: string
  userAvatar: string
  isMerchant: boolean
  text: string
  at: number
  likes: number
  videoUrl?: string
  isAI?: boolean
}

const SEED: Question[] = [
  {
    id: 'q1', productId: 'p1', userId: 'u1', userName: '购物达人王', userAvatar: 'https://i.pravatar.cc/100?img=11',
    text: '请问 iPhone 16 Pro 的电池续航比 15 Pro 提升了多少? 实际使用能用一整天吗?',
    imageUrls: ['https://picsum.photos/seed/q1/200/200'],
    at: Date.now() - 3600000 * 2, likes: 234, dislikes: 5, answered: true,
    answers: [
      { id: 'a1', userId: 'mer1', userName: 'Apple 旗舰店', userAvatar: 'https://picsum.photos/seed/apple/100/100', isMerchant: true, text: '官方数据: 视频播放最长 27 小时, 比 15 Pro 提升约 4 小时。日常使用一整天没问题。', at: Date.now() - 3600000, likes: 89 },
      { id: 'a2', userId: 'u2', userName: '数码小王子', userAvatar: 'https://i.pravatar.cc/100?img=51', isMerchant: false, text: '实测: 中度使用(微信+视频+音乐)从早 7 点到晚 10 点剩 30%, 重度游戏会更快。', at: Date.now() - 1800000, likes: 56 },
    ],
  },
  {
    id: 'q2', productId: 'p2', userId: 'u3', userName: '美食家 Lily', userAvatar: 'https://i.pravatar.cc/100?img=20',
    text: 'AirPods Pro 2 主动降噪在地铁里效果怎么样?',
    at: Date.now() - 3600000 * 6, likes: 156, dislikes: 3, answered: true,
    answers: [
      { id: 'a3', userId: 'mer2', userName: 'Apple 旗舰店', userAvatar: 'https://picsum.photos/seed/apple/100/100', isMerchant: true, text: 'H2 芯片降噪能力比一代提升 2 倍, 地铁场景可消除约 95% 低频噪音。', at: Date.now() - 3600000 * 5, likes: 124 },
    ],
  },
  {
    id: 'q3', productId: 'p3', userId: 'u4', userName: '运动爱好者', userAvatar: 'https://i.pravatar.cc/100?img=22',
    text: 'Apple Watch S10 跑步时心率监测准吗? 跟心率带比差多少?',
    videoUrl: 'https://example.com/video.mp4',
    at: Date.now() - 86400000, likes: 89, dislikes: 2, answered: false,
    answers: [],
  },
]

const STORAGE_KEY = 'versa:product-qa-v2'

function load(): Question[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return SEED
}

function save(qs: Question[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(qs)) } catch {}
}

export function ProductQAV2({ productId }: { productId: string }) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [filter, setFilter] = useState<'all' | 'answered' | 'video'>('all')
  const [askOpen, setAskOpen] = useState(false)
  const [newQ, setNewQ] = useState('')
  const [aiAnswering, setAiAnswering] = useState<string | null>(null)

  useEffect(() => {
    setQuestions(load())
  }, [])

  useEffect(() => { if (questions.length) save(questions) }, [questions])

  const filtered = questions.filter((q) => {
    if (filter === 'answered') return q.answered
    if (filter === 'video') return !!q.videoUrl
    return true
  })

  const ask = () => {
    if (!newQ.trim()) return
    const q: Question = {
      id: uid(), productId, userId: 'me', userName: '我', userAvatar: 'https://i.pravatar.cc/100?img=99',
      text: newQ, at: Date.now(), likes: 0, dislikes: 0, answered: false, answers: [],
    }
    setQuestions([q, ...questions])
    setNewQ('')
    setAskOpen(false)
    toast('问题已发布', 'success')
  }

  const like = (qid: string) => {
    setQuestions((qs) => qs.map((q) => q.id === qid ? { ...q, likes: q.likes + 1 } : q))
  }

  const askAI = async (q: Question) => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setAiAnswering(q.id)
    try {
      const result = await aiComplete(
        `作为商品专家, 用 50-150 字回答: ${q.text}`,
        '你是 Versa 商品问答助手, 客观专业, 中文回答'
      )
      const answer: Answer = {
        id: uid(), userId: 'ai', userName: 'AI 助手', userAvatar: '🤖', isMerchant: false, isAI: true,
        text: result, at: Date.now(), likes: 0,
      }
      setQuestions((qs) => qs.map((x) => x.id === q.id ? { ...x, answers: [...x.answers, answer], answered: true } : x))
    } catch (e: any) {
      toast(e?.message || 'AI 回答失败', 'error')
    } finally {
      setAiAnswering(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-nova-500" />商品问答
          <span className="text-xs text-ink-500 font-normal">{questions.length} 个问题</span>
        </h3>
        <button onClick={() => setAskOpen(true)} className="px-3 h-7 rounded-full bg-nova-500 text-white text-xs font-semibold">
          提问
        </button>
      </div>

      <div className="flex gap-1">
        {[
          { key: 'all', label: '全部' },
          { key: 'answered', label: '已回答' },
          { key: 'video', label: '视频问' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={cn('px-3 h-7 rounded-full text-xs font-medium', filter === f.key ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((q) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60"
          >
            <div className="flex items-start gap-2">
              <img src={q.userAvatar} alt={q.userName} className="w-8 h-8 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-xs">
                  <span className="font-semibold">{q.userName}</span>
                  <span className="text-ink-400">· {formatTimeAgo(new Date(q.at).toISOString())}</span>
                  {q.answered && (
                    <span className="ml-auto flex items-center gap-0.5 text-[10px] text-emerald-500">
                      <CheckCircle className="w-3 h-3" />已答
                    </span>
                  )}
                </div>
                <p className="text-sm mt-1 leading-relaxed">{q.text}</p>
                {q.imageUrls && q.imageUrls.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {q.imageUrls.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-16 h-16 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
                {q.videoUrl && (
                  <div className="mt-1.5 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-500 text-xs w-fit">
                    <Video className="w-3.5 h-3.5" />视频问答
                  </div>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-ink-500">
                  <button onClick={() => like(q.id)} className="flex items-center gap-0.5 hover:text-nova-500">
                    <ThumbsUp className="w-3.5 h-3.5" />{q.likes}
                  </button>
                  <span className="flex items-center gap-0.5"><ThumbsDown className="w-3.5 h-3.5" />{q.dislikes}</span>
                  <span>{q.answers.length} 回答</span>
                  {!q.answered && isAIEnabled() && (
                    <button
                      onClick={() => askAI(q)}
                      disabled={aiAnswering === q.id}
                      className="ml-auto flex items-center gap-0.5 text-nova-500 hover:underline"
                    >
                      {aiAnswering === q.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI 答
                    </button>
                  )}
                </div>

                {q.answers.length > 0 && (
                  <div className="mt-2 space-y-1.5 pl-3 border-l-2 border-nova-200">
                    {q.answers.map((a) => (
                      <div key={a.id} className="text-sm">
                        <div className="flex items-center gap-1 text-xs">
                          <span className={cn('font-semibold', a.isMerchant ? 'text-rose-500' : a.isAI ? 'text-nova-500' : '')}>
                            {a.userName}
                          </span>
                          {a.isMerchant && <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500 text-white">官方</span>}
                          {a.isAI && <span className="text-[9px] px-1 py-0.5 rounded bg-nova-500 text-white">AI</span>}
                          <span className="text-ink-400">· {formatTimeAgo(new Date(a.at).toISOString())}</span>
                        </div>
                        <p className="text-sm mt-0.5 leading-relaxed">{a.text}</p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-500">
                          <ThumbsUp className="w-2.5 h-2.5" />{a.likes} 赞
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {askOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAskOpen(false)}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3"
          >
            <h3 className="font-bold">向其他买家提问</h3>
            <textarea
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              placeholder="详细描述你的疑问, 越具体越容易得到解答..."
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500"
            />
            <div className="flex gap-2">
              <button className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-sm flex items-center justify-center gap-1">
                <Camera className="w-3.5 h-3.5" />添加图片
              </button>
              <button className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-sm flex items-center justify-center gap-1">
                <Video className="w-3.5 h-3.5" />录视频问
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setAskOpen(false)} className="flex-1 h-9 rounded-lg border border-ink-200 dark:border-ink-800 text-sm">取消</button>
              <button onClick={ask} className="flex-1 h-9 rounded-lg bg-nova-500 text-white text-sm font-semibold">发布</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
