import { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useVersa, versa } from '../store/versa'
import { products } from '../data'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'
import { formatTimeAgo } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import {
  ArrowLeft, Star, ThumbsUp, MessageCircle, Image as ImageIcon,
  Filter, CheckCircle2, Reply, Plus, ShieldCheck, X, Camera
} from 'lucide-react'
import type { ProductReview } from '../data/types'

type TabKey = 'all' | 'good' | 'mid' | 'bad' | 'image' | 'tags'

export function ReviewsPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const productId = params.get('productId')
  const { reviews, user } = useVersa()

  const [tab, setTab] = useState<TabKey>('all')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [appendTo, setAppendTo] = useState<string | null>(null)
  const [appendText, setAppendText] = useState('')
  const [helpfulIds, setHelpfulIds] = useState<Set<string>>(new Set())

  const product = products.find((p) => p.id === productId)

  const filtered = useMemo(() => {
    let list = productId ? reviews.filter((r) => r.productId === productId) : reviews
    if (tab === 'good') list = list.filter((r) => r.rating >= 4)
    else if (tab === 'mid') list = list.filter((r) => r.rating === 3)
    else if (tab === 'bad') list = list.filter((r) => r.rating <= 2)
    else if (tab === 'image') list = list.filter((r) => r.images && r.images.length > 0)
    else if (tab === 'tags') list = list.filter((r) => r.tags && r.tags.length > 0)
    if (activeTag) list = list.filter((r) => r.tags?.includes(activeTag))
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [reviews, productId, tab, activeTag])

  // Stats
  const stats = useMemo(() => {
    const list = productId ? reviews.filter((r) => r.productId === productId) : reviews
    const total = list.length
    const good = list.filter((r) => r.rating >= 4).length
    const mid = list.filter((r) => r.rating === 3).length
    const bad = list.filter((r) => r.rating <= 2).length
    const withImg = list.filter((r) => r.images && r.images.length > 0).length
    const avg = total === 0 ? 0 : list.reduce((s, r) => s + r.rating, 0) / total
    const tagCount: Record<string, number> = {}
    list.forEach((r) => r.tags?.forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1)))
    const topTags = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
    return { total, good, mid, bad, withImg, avg, topTags }
  }, [reviews, productId])

  const renderRating = (n: number) => (
    <div className="inline-flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn('w-3.5 h-3.5', i <= n ? 'fill-amber-400 text-amber-400' : 'text-ink-300')}
        />
      ))}
    </div>
  )

  const handleHelpful = (id: string) => {
    if (helpfulIds.has(id)) {
      toast('你已经点过赞了', 'info')
      return
    }
    versa.markReviewHelpful(id)
    setHelpfulIds((s) => new Set([...s, id]))
  }

  const handleReply = (reviewId: string) => {
    if (replyText.trim().length < 2) {
      toast('回复内容太短', 'error')
      return
    }
    versa.addReviewReply(reviewId, replyText.trim(), user.displayName || user.username || '匿名用户', 'user')
    setReplyText('')
    setReplyingTo(null)
    toast('回复成功', 'success')
  }

  const handleAppend = (reviewId: string) => {
    if (appendText.trim().length < 5) {
      toast('追评内容至少 5 个字', 'error')
      return
    }
    versa.appendReview(reviewId, appendText.trim())
    setAppendText('')
    setAppendTo(null)
    toast('追评成功', 'success')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-shop-500 p-8 text-white shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="flex-1">
            <p className="text-white/80 text-sm mb-2">评价中心</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              {product ? product.name : '所有商品评价'}
            </h1>
            <p className="text-white/90 max-w-2xl">
              真实用户评价 · 商家回复 · 追评 · 标签筛选 · 有图评价
            </p>
          </div>
          {product && (
            <div className="text-right">
              <div className="text-6xl font-black">{stats.avg.toFixed(1)}</div>
              <div className="flex items-center justify-end gap-0.5 mt-2">
                {renderRating(Math.round(stats.avg))}
              </div>
              <p className="text-white/80 text-sm mt-1">{stats.total} 条评价</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatPill label="总评" value={stats.total} color="text-ink-700 dark:text-ink-200" />
        <StatPill label="好评" value={stats.good} color="text-emerald-500" />
        <StatPill label="中评" value={stats.mid} color="text-amber-500" />
        <StatPill label="差评" value={stats.bad} color="text-rose-500" />
        <StatPill label="有图" value={stats.withImg} color="text-nova-500" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-ink-200 dark:border-ink-800 pb-3">
        {[
          { key: 'all', label: '全部' },
          { key: 'good', label: '好评' },
          { key: 'mid', label: '中评' },
          { key: 'bad', label: '差评' },
          { key: 'image', label: '有图' },
          { key: 'tags', label: '有标签' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key as TabKey)
              setActiveTag(null)
            }}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition',
              tab === t.key
                ? 'bg-amber-500 text-white shadow'
                : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Top tags */}
      {stats.topTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-ink-500 flex items-center gap-1">
            <Filter className="w-3 h-3" /> 热门标签：
          </span>
          {stats.topTags.map(([tag, count]) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition',
                activeTag === tag
                  ? 'bg-shop-500 text-white border-shop-500'
                  : 'bg-white dark:bg-ink-900 text-ink-600 dark:text-ink-300 border-ink-200 dark:border-ink-700 hover:border-shop-500'
              )}
            >
              {tag} <span className="opacity-70">({count})</span>
            </button>
          ))}
          {activeTag && (
            <button
              onClick={() => setActiveTag(null)}
              className="text-xs text-ink-400 hover:text-ink-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> 清除
            </button>
          )}
        </div>
      )}

      {/* Reviews list */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center text-ink-500">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无符合条件的评价</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => {
            const p = products.find((x) => x.id === r.productId)
            const initial = r.anonymous ? '匿' : 'U'
            return (
              <div
                key={r.id}
                className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nova-400 to-debate-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">
                        {r.anonymous ? '匿名用户' : `用户${r.id.slice(-4)}`}
                      </span>
                      {renderRating(r.rating)}
                      <span className="text-xs text-ink-400">{formatTimeAgo(r.createdAt)}</span>
                      {p && !productId && (
                        <span className="text-xs text-ink-500 ml-1">
                          · <button onClick={() => navigate(`/reviews?productId=${p.id}`)}                           className="hover:text-shop-600">{p.name.slice(0, 16)}</button>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-700 dark:text-ink-200 mt-2 leading-relaxed">
                      {r.content}
                    </p>

                    {r.tags && r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {r.tags.map((t) => (
                          <span
                            key={t}
                            className="text-xs px-2 py-0.5 rounded-full bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    {r.images && r.images.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {r.images.map((img, i) => (
                          <div
                            key={i}
                            className="w-20 h-20 rounded-xl bg-ink-100 dark:bg-ink-800 flex items-center justify-center text-ink-400"
                          >
                            <Camera className="w-6 h-6" />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Append (追评) */}
                    {r.append && (
                      <div className="mt-3 p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50">
                        <div className="flex items-center gap-1.5 text-xs text-ink-500 mb-1">
                          <Plus className="w-3 h-3" />
                          <span>追评 · {formatTimeAgo(r.append.at)}</span>
                        </div>
                        <p className="text-sm text-ink-700 dark:text-ink-200">{r.append.content}</p>
                      </div>
                    )}

                    {/* Seller reply (主商家回复) */}
                    {r.reply && (
                      <div className="mt-3 p-3 rounded-xl bg-gradient-to-br from-shop-50 to-news-50 dark:from-shop-950/30 dark:to-news-950/30 border border-shop-200/40 dark:border-shop-800/40">
                        <div className="flex items-center gap-1.5 text-xs text-shop-600 dark:text-shop-400 mb-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span className="font-medium">{r.reply.sellerName}</span>
                          <span className="text-ink-400">· 商家回复 · {formatTimeAgo(r.reply.at)}</span>
                        </div>
                        <p className="text-sm text-ink-700 dark:text-ink-200">{r.reply.content}</p>
                      </div>
                    )}

                    {/* Additional replies */}
                    {r.replies && r.replies.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {r.replies.map((rp) => (
                          <div
                            key={rp.id}
                            className={cn(
                              'ml-3 p-2.5 rounded-lg text-sm',
                              rp.isOfficial
                                ? 'bg-nova-50 dark:bg-nova-950/30 border-l-2 border-nova-500'
                                : 'bg-ink-50 dark:bg-ink-800/50'
                            )}
                          >
                            <div className="flex items-center gap-1.5 text-xs text-ink-500 mb-0.5">
                              <span className="font-medium text-ink-700 dark:text-ink-200">
                                {rp.fromName}
                              </span>
                              {rp.isOfficial && (
                                <span className="text-nova-500 text-[10px]">官方</span>
                              )}
                              <span>· {formatTimeAgo(rp.at)}</span>
                            </div>
                            <p className="text-ink-700 dark:text-ink-200">{rp.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-ink-500">
                      <button
                        onClick={() => handleHelpful(r.id)}
                        className={cn(
                          'flex items-center gap-1 hover:text-shop-600 transition',
                          helpfulIds.has(r.id) && 'text-shop-600 font-bold'
                        )}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        有用 ({r.helpful || 0})
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(replyingTo === r.id ? null : r.id)
                          setReplyText('')
                        }}
                        className="flex items-center gap-1 hover:text-nova-600 transition"
                      >
                        <Reply className="w-3.5 h-3.5" />
                        回复
                      </button>
                      {!r.append && (
                        <button
                          onClick={() => {
                            setAppendTo(appendTo === r.id ? null : r.id)
                            setAppendText('')
                          }}
                          className="flex items-center gap-1 hover:text-debate-600 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          追评
                        </button>
                      )}
                    </div>

                    {/* Reply input */}
                    {replyingTo === r.id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="写下你的回复..."
                          className="flex-1 px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm border border-ink-200 dark:border-ink-700 focus:outline-none focus:border-nova-500"
                        />
                        <Button size="sm" onClick={() => handleReply(r.id)}>
                          发送
                        </Button>
                      </div>
                    )}

                    {/* Append input */}
                    {appendTo === r.id && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={appendText}
                          onChange={(e) => setAppendText(e.target.value)}
                          placeholder="分享你后续的使用感受（≥5字）..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm border border-ink-200 dark:border-ink-700 focus:outline-none focus:border-debate-500 resize-none"
                        />
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setAppendTo(null)}>
                            取消
                          </Button>
                          <Button size="sm" onClick={() => handleAppend(r.id)}>
                            提交追评
                          </Button>
                        </div>
                      </div>
                    )}
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

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-4 text-center">
      <div className={cn('text-2xl font-bold', color)}>{value}</div>
      <div className="text-xs text-ink-500 mt-1">{label}</div>
    </div>
  )
}
