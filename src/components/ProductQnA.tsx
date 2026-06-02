import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, ThumbsUp, Check, Send, X, Reply, ChevronDown, ChevronUp } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import { cn, formatTimeAgo, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

const STORAGE_KEY = 'versa:product-qa-v2'

export interface QnAItem {
  id: string
  productId: string
  question: string
  authorId: string
  authorName: string
  authorAvatar: string
  createdAt: number
  helpful: number
  answers: AnswerItem[]
  acceptedAnswerId?: string
}

export interface AnswerItem {
  id: string
  questionId: string
  content: string
  authorId: string
  authorName: string
  authorAvatar: string
  isSeller: boolean
  createdAt: number
  helpful: number
}

function load(): QnAItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return []
}

function save(qa: QnAItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(qa)) } catch {}
}

function seed(productId: string): QnAItem[] {
  return [
    {
      id: 'qa1', productId, question: '这款产品保修多久? 保修期内是免费维修吗?',
      authorId: 'u1', authorName: '购物达人王', authorAvatar: 'https://i.pravatar.cc/100?img=11', createdAt: Date.now() - 86400000 * 2,
      helpful: 23,
      answers: [
        { id: 'a1', questionId: 'qa1', content: '整机保修 1 年, 电池单独保修半年。保修期内非人为损坏免费维修。', authorId: 's1', authorName: '官方旗舰店', authorAvatar: 'https://i.pravatar.cc/100?img=68', isSeller: true, createdAt: Date.now() - 86400000, helpful: 45 },
        { id: 'a2', questionId: 'qa1', content: '我已经用了半年, 上个月免费换了一个零件, 速度很快当天就修好了。', authorId: 'u2', authorName: '老用户007', authorAvatar: 'https://i.pravatar.cc/100?img=15', isSeller: false, createdAt: Date.now() - 3600000 * 5, helpful: 12 },
      ],
      acceptedAnswerId: 'a1',
    },
    {
      id: 'qa2', productId, question: '尺寸偏大还是偏小? 平时穿 M 码的应该选什么?',
      authorId: 'u3', authorName: '小仙女 Lily', authorAvatar: 'https://i.pravatar.cc/100?img=20', createdAt: Date.now() - 86400000,
      helpful: 8,
      answers: [
        { id: 'a3', questionId: 'qa2', content: '尺码标准, M 码对应的即可。客服回复很及时, 强烈建议咨询客服。', authorId: 'u4', authorName: '穿衣显瘦达人', authorAvatar: 'https://i.pravatar.cc/100?img=33', isSeller: false, createdAt: Date.now() - 3600000 * 12, helpful: 6 },
      ],
    },
    {
      id: 'qa3', productId, question: '和 XX 款有什么区别? 哪个更值得买?',
      authorId: 'u5', authorName: '比价专家', authorAvatar: 'https://i.pravatar.cc/100?img=25', createdAt: Date.now() - 3600000 * 6,
      helpful: 15,
      answers: [],
    },
  ]
}

export function ProductQnA({ productId }: { productId: string }) {
  const { user } = useAuth()
  const [qa, setQA] = useState<QnAItem[]>([])
  const [askOpen, setAskOpen] = useState(false)
  const [askText, setAskText] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sort, setSort] = useState<'helpful' | 'new'>('helpful')
  const [expandedQ, setExpandedQ] = useState<Set<string>>(new Set())

  useEffect(() => {
    const stored = load()
    const forProduct = stored.filter((q) => q.productId === productId)
    if (forProduct.length === 0) {
      const seeded = seed(productId)
      setQA(seeded)
      const otherProduct = stored.filter((q) => q.productId !== productId)
      save([...otherProduct, ...seeded])
    } else {
      setQA(forProduct)
    }
  }, [productId])

  const persist = (next: QnAItem[]) => {
    setQA(next)
    const otherProduct = load().filter((q) => q.productId !== productId)
    save([...otherProduct, ...next])
  }

  const ask = () => {
    if (!user) { toast('请先登录', 'error'); return }
    if (!askText.trim()) { toast('问题不能为空', 'error'); return }
    const item: QnAItem = {
      id: uid('q'),
      productId,
      question: askText,
      authorId: user.id,
      authorName: user.displayName,
      authorAvatar: user.avatar,
      createdAt: Date.now(),
      helpful: 0,
      answers: [],
    }
    persist([item, ...qa])
    setAskText('')
    setAskOpen(false)
    toast('已提交问题', 'success')
  }

  const reply = (qid: string) => {
    if (!user) { toast('请先登录', 'error'); return }
    if (!replyText.trim()) { toast('回答不能为空', 'error'); return }
    const a: AnswerItem = {
      id: uid('a'),
      questionId: qid,
      content: replyText,
      authorId: user.id,
      authorName: user.displayName,
      authorAvatar: user.avatar,
      isSeller: user.role === 'creator' || user.role === 'admin',
      createdAt: Date.now(),
      helpful: 0,
    }
    persist(qa.map((q) => (q.id === qid ? { ...q, answers: [...q.answers, a] } : q)))
    setReplyTo(null)
    setReplyText('')
    toast('回答已发布', 'success')
  }

  const accept = (qid: string, aid: string) => {
    persist(qa.map((q) => (q.id === qid ? { ...q, acceptedAnswerId: aid } : q)))
    toast('已采纳回答', 'success')
  }

  const helpful = (qid: string, aid?: string) => {
    persist(qa.map((q) => {
      if (q.id !== qid) return q
      if (!aid) return { ...q, helpful: q.helpful + 1 }
      return { ...q, answers: q.answers.map((a) => (a.id === aid ? { ...a, helpful: a.helpful + 1 } : a)) }
    }))
  }

  const sortedQA = [...qa].sort((a, b) => sort === 'helpful' ? b.helpful - a.helpful : b.createdAt - a.createdAt)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold flex items-center gap-1.5">
          <HelpCircle className="w-5 h-5 text-nova-500" />
          问大家
          <span className="text-xs text-ink-500 font-normal">({qa.length} 个问题)</span>
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSort(sort === 'helpful' ? 'new' : 'helpful')}
            className="text-xs px-2 h-7 rounded-full bg-ink-100 dark:bg-ink-800"
          >
            {sort === 'helpful' ? '最有用' : '最新'}
          </button>
          <button
            onClick={() => setAskOpen(true)}
            className="text-xs px-3 h-7 rounded-full bg-gradient-to-r from-nova-500 to-pink-500 text-white font-medium"
          >
            我要提问
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {sortedQA.map((q) => {
          const expanded = expandedQ.has(q.id)
          const bestAnswer = q.answers.find((a) => a.id === q.acceptedAnswerId) || q.answers.sort((a, b) => b.helpful - a.helpful)[0]
          return (
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-3 space-y-2"
            >
              <div className="flex items-start gap-2">
                <img src={q.authorAvatar} alt={q.authorName} className="w-7 h-7 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold">{q.authorName}</span>
                    <span className="text-[10px] text-ink-400">{formatTimeAgo(new Date(q.createdAt).toISOString())}</span>
                    <button onClick={() => helpful(q.id)} className="ml-auto flex items-center gap-0.5 text-[10px] text-ink-500 hover:text-nova-500">
                      <ThumbsUp className="w-3 h-3" />{q.helpful}
                    </button>
                  </div>
                  <p className="text-sm text-ink-900 dark:text-ink-100 mt-1">{q.question}</p>
                </div>
              </div>

              {bestAnswer && (
                <div className="ml-9 bg-emerald-50 dark:bg-emerald-900/20 border-l-2 border-emerald-500 rounded-r-lg p-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-300 mb-1">
                    {q.acceptedAnswerId === bestAnswer.id ? (
                      <><Check className="w-3 h-3" />提问者已采纳</>
                    ) : (
                      <><ThumbsUp className="w-3 h-3" />最有帮助的回答</>
                    )}
                  </div>
                  <div className="flex items-start gap-2">
                    <img src={bestAnswer.authorAvatar} alt={bestAnswer.authorName} className="w-6 h-6 rounded-full" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-medium">{bestAnswer.authorName}</span>
                        {bestAnswer.isSeller && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500 text-white font-bold">官方</span>
                        )}
                      </div>
                      <p className="text-xs text-ink-700 dark:text-ink-300 mt-0.5">{bestAnswer.content}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-500">
                        <button onClick={() => helpful(q.id, bestAnswer.id)} className="flex items-center gap-0.5 hover:text-nova-500">
                          <ThumbsUp className="w-2.5 h-2.5" />{bestAnswer.helpful}
                        </button>
                        <span>{formatTimeAgo(new Date(bestAnswer.createdAt).toISOString())}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {expanded && q.answers.filter((a) => a.id !== bestAnswer?.id).length > 0 && (
                <div className="ml-9 space-y-2 border-t border-ink-200 dark:border-ink-800 pt-2">
                  {q.answers.filter((a) => a.id !== bestAnswer?.id).map((a) => (
                    <div key={a.id} className="flex items-start gap-2">
                      <img src={a.authorAvatar} alt={a.authorName} className="w-6 h-6 rounded-full" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-medium">{a.authorName}</span>
                          {a.isSeller && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500 text-white font-bold">官方</span>
                          )}
                          <span className="text-[10px] text-ink-400">{formatTimeAgo(new Date(a.createdAt).toISOString())}</span>
                          {user && user.id === q.authorId && !q.acceptedAnswerId && (
                            <button
                              onClick={() => accept(q.id, a.id)}
                              className="ml-auto text-[10px] text-emerald-500 hover:underline"
                            >
                              采纳
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-ink-700 dark:text-ink-300">{a.content}</p>
                        <button onClick={() => helpful(q.id, a.id)} className="text-[10px] text-ink-500 hover:text-nova-500 flex items-center gap-0.5 mt-0.5">
                          <ThumbsUp className="w-2.5 h-2.5" />{a.helpful}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {q.answers.length > 1 && (
                  <button
                    onClick={() => {
                      const next = new Set(expandedQ)
                      if (expanded) next.delete(q.id)
                      else next.add(q.id)
                      setExpandedQ(next)
                    }}
                    className="text-[10px] text-nova-500 flex items-center gap-0.5"
                  >
                    {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {expanded ? '收起' : `展开 ${q.answers.length - 1} 条回答`}
                  </button>
                )}
                <button
                  onClick={() => setReplyTo(replyTo === q.id ? null : q.id)}
                  className="ml-auto text-[10px] text-ink-500 flex items-center gap-0.5 hover:text-nova-500"
                >
                  <Reply className="w-3 h-3" />回答
                </button>
              </div>

              <AnimatePresence>
                {replyTo === q.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="写下你的回答..."
                        className="flex-1 px-3 h-8 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none focus:ring-1 focus:ring-nova-500"
                        onKeyDown={(e) => e.key === 'Enter' && reply(q.id)}
                      />
                      <button onClick={() => reply(q.id)} className="px-3 h-8 rounded-lg bg-nova-500 text-white text-xs">
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )
        })}
      </div>

      {askOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={() => setAskOpen(false)}>
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-ink-900 rounded-2xl p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-1.5"><HelpCircle className="w-4 h-4" />提问</h3>
              <button onClick={() => setAskOpen(false)} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded"><X className="w-4 h-4" /></button>
            </div>
            <textarea
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
              rows={4}
              placeholder="把你的问题写在 15 字以上, 越详细越容易得到回答"
              className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500 resize-none"
            />
            <button onClick={ask} className="w-full h-10 rounded-xl bg-gradient-to-r from-nova-500 to-pink-500 text-white font-semibold">
              发布问题
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
