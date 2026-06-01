import { useState } from 'react'
import { Star, ThumbsUp, MessageCircle, Image as ImageIcon } from 'lucide-react'
import type { Review } from '../../data/types'
import { cn, formatTimeAgo, formatNumber } from '../../lib/utils'

const tagFilters = ['全部', '做工好', '包装仔细', '快递快', '性价比', '稳定', '够用', '颜值高', '会回购']

export function ReviewList({ reviews, rating, reviewCount }: { reviews: Review[]; rating: number; reviewCount: number }) {
  const [tag, setTag] = useState('全部')
  const [onlyImage, setOnlyImage] = useState(false)

  const tagCounts = reviews.reduce<Record<string, number>>((acc, r) => {
    r.tags.forEach((t) => { acc[t] = (acc[t] || 0) + 1 })
    return acc
  }, {})

  const filtered = reviews.filter((r) => {
    if (onlyImage && r.images.length === 0) return false
    if (tag === '全部') return true
    return r.tags.includes(tag)
  })

  const distCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => Math.round(r.rating) === star).length,
  }))

  return (
    <div>
      {/* 评价概览 - 淘宝风 */}
      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-5 mb-4">
        <div className="flex items-center gap-6 mb-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-shop-600">{rating.toFixed(1)}</div>
            <div className="text-xs text-ink-500 mt-1">综合评分</div>
          </div>
          <div className="flex-1 space-y-1">
            {distCounts.map((d) => (
              <div key={d.star} className="flex items-center gap-2 text-xs">
                <span className="w-6 text-ink-500">{d.star}星</span>
                <div className="flex-1 h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                  <div
                    className="h-full bg-news-500"
                    style={{ width: `${reviews.length ? (d.count / reviews.length) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-8 text-right text-ink-500">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-ink-500">
          <span>共 {formatNumber(reviewCount)} 条评价 · {reviews.length} 条展示</span>
          <button
            onClick={() => setOnlyImage((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors',
              onlyImage ? 'bg-shop-500 text-white' : 'bg-ink-100 dark:bg-ink-800 hover:bg-ink-200'
            )}
          >
            <ImageIcon className="w-3.5 h-3.5" />只看带图
          </button>
        </div>
      </div>

      {/* 标签筛选 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tagFilters.map((t) => (
          <button
            key={t}
            onClick={() => setTag(t)}
            className={cn(
              'px-3 h-7 rounded-full text-xs font-medium transition-colors',
              tag === t
                ? 'bg-shop-500 text-white'
                : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-ink-200'
            )}
          >
            {t}{tagCounts[t] ? ` (${tagCounts[t]})` : ''}
          </button>
        ))}
      </div>

      {/* 评价列表 */}
      <div className="space-y-4">
        {filtered.map((r) => <ReviewItem key={r.id} review={r} />)}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-ink-500">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          没有符合条件的评价
        </div>
      )}
    </div>
  )
}

function ReviewItem({ review }: { review: Review }) {
  const [helpful, setHelpful] = useState(false)
  return (
    <div className="p-4 rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
      <div className="flex items-center gap-3 mb-2">
        <img src={review.authorAvatar} alt="" className="w-9 h-9 rounded-full" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{review.authorName}</span>
            <div className="flex">
              {Array.from({ length: 5 }).map((_, j) => (
                <Star key={j} className={cn('w-3.5 h-3.5', j < review.rating ? 'fill-news-500 text-news-500' : 'text-ink-300')} />
              ))}
            </div>
          </div>
          <div className="text-[10px] text-ink-500 mt-0.5">
            {review.sku} · {formatTimeAgo(review.createdAt)}
          </div>
        </div>
      </div>
      <p className="text-sm text-ink-800 dark:text-ink-200 leading-relaxed">{review.content}</p>
      {review.images.length > 0 && (
        <div className="mt-3 flex gap-2">
          {review.images.map((img, i) => (
            <div key={i} className="w-20 h-20 rounded-lg overflow-hidden bg-ink-100">
              <img src={img} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        {review.tags.map((t) => (
          <span key={t} className="px-2 py-0.5 rounded-full bg-shop-50 dark:bg-shop-500/10 text-shop-600 text-[10px]">
            {t}
          </span>
        ))}
      </div>
      {review.reply && (
        <div className="mt-3 p-2.5 rounded-lg bg-ink-50 dark:bg-ink-800/40 text-xs">
          <span className="text-shop-600 font-semibold">{review.reply.from}：</span>
          <span className="text-ink-700 dark:text-ink-300">{review.reply.content}</span>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-xs">
        <button
          onClick={() => setHelpful((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded transition-colors',
            helpful ? 'bg-shop-500 text-white' : 'hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500'
          )}
        >
          <ThumbsUp className={cn('w-3 h-3', helpful && 'fill-current')} />
          有用 {review.helpful + (helpful ? 1 : 0)}
        </button>
      </div>
    </div>
  )
}
