import { useState, useMemo } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useVersa, versa } from '../store/versa'
import { products } from '../data'
import { Button } from '../components/ui/Button'
import { cn, formatTimeAgo } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import {
  ArrowLeft, MessageCircle, ThumbsUp, Send, ShieldCheck, Sparkles,
  CheckCircle2, HelpCircle, ChevronRight, Plus
} from 'lucide-react'

type Filter = 'all' | 'answered' | 'unanswered'

export function ProductQAPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const productId = params.get('productId')
  const { productQAs, user } = useVersa()

  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<'helpful' | 'recent'>('helpful')
  const [askOpen, setAskOpen] = useState(false)
  const [askText, setAskText] = useState('')
  const [answerOpen, setAnswerOpen] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [helpfulIds, setHelpfulIds] = useState<Set<string>>(new Set())

  const product = products.find((p) => p.id === productId)

  const filtered = useMemo(() => {
    let list = productId
      ? productQAs.filter((q) => q.productId === productId)
      : productQAs
    if (filter === 'answered') list = list.filter((q) => q.answer)
    if (filter === 'unanswered') list = list.filter((q) => !q.answer)
    list = [...list].sort((a, b) =>
      sort === 'helpful'
        ? b.helpful - a.helpful
        : new Date(b.askedAt).getTime() - new Date(a.askedAt).getTime()
    )
    return list
  }, [productQAs, productId, filter, sort])

  const stats = useMemo(() => {
    const list = productId
      ? productQAs.filter((q) => q.productId === productId)
      : productQAs
    return {
      total: list.length,
      answered: list.filter((q) => q.answer).length,
      unanswered: list.filter((q) => !q.answer).length,
    }
  }, [productQAs, productId])

  const handleAsk = () => {
    if (askText.trim().length < 5) {
      toast('问题至少 5 个字', 'error')
      return
    }
    if (!productId) {
      toast('请在商品详情页提问', 'error')
      return
    }
    versa.askProductQuestion(
      productId,
      askText.trim(),
      user.displayName || user.username || '匿名用户'
    )
    setAskText('')
    setAskOpen(false)
    toast('问题已提交，商家回复后通知你 ✨', 'success')
  }

  const handleAnswer = (qaId: string) => {
    if (answerText.trim().length < 2) {
      toast('回答太短', 'error')
      return
    }
    versa.answerProductQuestion(qaId, answerText.trim(), user.displayName || '我', false)
    setAnswerText('')
    setAnswerOpen(null)
    toast('回答已发布', 'success')
  }

  const handleHelpful = (id: string) => {
    if (helpfulIds.has(id)) {
      toast('已点赞过', 'info')
      return
    }
    versa.markQAHelpful(id)
    setHelpfulIds((s) => new Set([...s, id]))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-nova-500 via-purple-500 to-fuchsia-500 p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs mb-3">
              <MessageCircle className="w-3 h-3" />
              问大家
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {product ? product.name : '商品问答'}
            </h1>
            <p className="text-white/90 max-w-xl">
              已购买用户的真实问答 · 商家认证回复 · 帮你打消购物顾虑
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/15 backdrop-blur rounded-2xl p-3">
              <div className="text-2xl font-black">{stats.total}</div>
              <div className="text-xs text-white/80">问题</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-3">
              <div className="text-2xl font-black">{stats.answered}</div>
              <div className="text-xs text-white/80">已答</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-3">
              <div className="text-2xl font-black">
                {stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0}%
              </div>
              <div className="text-xs text-white/80">回复率</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all', label: '全部' },
          { key: 'answered', label: '已回答' },
          { key: 'unanswered', label: '待回答' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as Filter)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition',
              filter === f.key
                ? 'bg-nova-500 text-white shadow'
                : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300'
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-ink-500">排序</span>
          <button
            onClick={() => setSort('helpful')}
            className={cn(
              'px-2.5 py-1 rounded text-xs',
              sort === 'helpful' ? 'bg-nova-500 text-white' : 'text-ink-500'
            )}
          >
            有用
          </button>
          <button
            onClick={() => setSort('recent')}
            className={cn(
              'px-2.5 py-1 rounded text-xs',
              sort === 'recent' ? 'bg-nova-500 text-white' : 'text-ink-500'
            )}
          >
            最新
          </button>
        </div>
        {productId && (
          <Button size="sm" onClick={() => setAskOpen(!askOpen)} leftIcon={<Plus className="w-4 h-4" />}>
            我要提问
          </Button>
        )}
      </div>

      {/* Ask form */}
      {askOpen && productId && (
        <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-nova-300/60 dark:border-nova-700/60 p-4 space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-nova-500" />
            提问：{product?.name}
          </h3>
          <textarea
            value={askText}
            onChange={(e) => setAskText(e.target.value)}
            placeholder="输入你想了解的细节...（5-200 字）"
            rows={3}
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm border border-ink-200 dark:border-ink-700 focus:outline-none focus:border-nova-500 resize-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-500">{askText.length} / 200</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setAskOpen(false)}>
                取消
              </Button>
              <Button size="sm" onClick={handleAsk}>
                <Send className="w-3.5 h-3.5 mr-1" />
                发布
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-ink-500">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无问答</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((qa) => {
            const isAnswering = answerOpen === qa.id
            const p = products.find((x) => x.id === qa.productId)
            return (
              <div
                key={qa.id}
                className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-4"
              >
                {/* Question */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nova-400 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    ?
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm">{qa.authorName}</span>
                      {qa.verified && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-2.5 h-2.5" />已购买
                        </span>
                      )}
                      <span className="text-xs text-ink-400">· {formatTimeAgo(qa.askedAt)}</span>
                      {p && !productId && (
                        <Link
                          to={`/qa?productId=${p.id}`}
                          className="text-xs text-shop-600 hover:underline"
                        >
                          · {p.name.slice(0, 16)}
                        </Link>
                      )}
                    </div>
                    <p className="text-sm text-ink-700 dark:text-ink-200 mt-1.5 font-medium">
                      {qa.question}
                    </p>

                    {/* Answer */}
                    {qa.answer ? (
                      <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-nova-50 to-fuchsia-50 dark:from-nova-950/30 dark:to-fuchsia-950/30 border border-nova-200/40 dark:border-nova-800/40">
                        <div className="flex items-center gap-1.5 text-xs text-nova-600 dark:text-nova-400 mb-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span className="font-medium">{qa.answeredBy || '官方'}</span>
                          <span className="text-ink-400">· 商家回复 · {formatTimeAgo(qa.answerAt || qa.askedAt)}</span>
                        </div>
                        <p className="text-sm text-ink-700 dark:text-ink-200">{qa.answer}</p>
                      </div>
                    ) : (
                      <div className="mt-3 p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50 text-sm text-ink-500">
                        <Sparkles className="w-4 h-4 inline mr-1 text-amber-500" />
                        暂无商家回复，试试自己回答
                      </div>
                    )}

                    {/* Additional answers */}
                    {qa.answers && qa.answers.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        {qa.answers.map((a) => (
                          <div
                            key={a.id}
                            className={cn(
                              'ml-3 p-2.5 rounded-lg text-sm',
                              a.isOfficial
                                ? 'bg-nova-50 dark:bg-nova-950/30 border-l-2 border-nova-500'
                                : 'bg-ink-50 dark:bg-ink-800/50'
                            )}
                          >
                            <div className="flex items-center gap-1 text-xs text-ink-500 mb-0.5">
                              <span className="font-medium text-ink-700 dark:text-ink-200">{a.fromName}</span>
                              {a.isOfficial && <span className="text-nova-500 text-[10px]">官方</span>}
                              <span>· {formatTimeAgo(a.at)}</span>
                            </div>
                            <p className="text-ink-700 dark:text-ink-200">{a.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Answer input */}
                    {isAnswering && (
                      <div className="mt-3 flex gap-2">
                        <input
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          placeholder="分享你的经验..."
                          className="flex-1 px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm border border-ink-200 dark:border-ink-700 focus:outline-none focus:border-nova-500"
                        />
                        <Button size="sm" onClick={() => handleAnswer(qa.id)}>
                          回答
                        </Button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-ink-500">
                      <button
                        onClick={() => handleHelpful(qa.id)}
                        className={cn(
                          'flex items-center gap-1 hover:text-shop-600 transition',
                          helpfulIds.has(qa.id) && 'text-shop-600 font-bold'
                        )}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        有用 ({qa.helpful})
                      </button>
                      <button
                        onClick={() => {
                          setAnswerOpen(isAnswering ? null : qa.id)
                          setAnswerText('')
                        }}
                        className="flex items-center gap-1 hover:text-nova-600 transition"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                        我来回答
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
