import { useState, useMemo } from 'react'
import { ThumbsUp, ThumbsDown, Check, Star, Quote, Crown, BookOpen, ExternalLink } from 'lucide-react'
import type { Debate, DebateArgument, Citation } from '../../data/types'
import { cn, formatNumber, formatTimeAgo } from '../../lib/utils'

const sortOptions = [
  { value: 'featured', label: '推荐排序' },
  { value: 'votes', label: '最受欢迎' },
  { value: 'newest', label: '最新发布' },
  { value: 'expert', label: '专家观点' },
]

export function ArgumentList({ debate, arguments: args }: { debate: Debate; arguments: DebateArgument[] }) {
  const [sort, setSort] = useState('featured')

  const sorted = useMemo(() => {
    let r = [...args]
    if (sort === 'votes') r.sort((a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes))
    if (sort === 'newest') r.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    if (sort === 'expert') r.sort((a, b) => (b.isExpert ? 1 : 0) - (a.isExpert ? 1 : 0))
    if (sort === 'featured') r.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0))
    return r
  }, [args, sort])

  const proCount = sorted.filter((a) => a.side === 'pro').length
  const conCount = sorted.filter((a) => a.side === 'con').length

  return (
    <div>
      {/* 排序 + 计数 */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold">观点交锋</h3>
          <span className="text-sm text-ink-500">
            <span className="text-nova-600 font-semibold">{proCount}</span> 正 ·
            <span className="text-debate-600 font-semibold ml-1">{conCount}</span> 反
            · <span className="font-semibold">{sorted.length}</span> 条
          </span>
        </div>
        <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 p-0.5 rounded-lg">
          {sortOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => setSort(o.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                sort === o.value
                  ? 'bg-white dark:bg-ink-900 shadow-sm'
                  : 'text-ink-500 hover:text-ink-900 dark:hover:text-white'
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* 列表 */}
      <div className="space-y-3">
        {sorted.map((a) => <ArgumentItem key={a.id} arg={a} />)}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-12 text-sm text-ink-500">
          暂无观点，期待你的声音
        </div>
      )}
    </div>
  )
}

function ArgumentItem({ arg }: { arg: DebateArgument }) {
  const [vote, setVote] = useState(0)
  const score = arg.upvotes - arg.downvotes + (vote === 1 ? 1 : vote === -1 ? -1 : 0)
  const isPro = arg.side === 'pro'

  return (
    <div
      className={cn(
        'rounded-2xl p-4 border-2 transition-all',
        arg.isFeatured
          ? isPro
            ? 'border-nova-300 dark:border-nova-700 bg-gradient-to-br from-nova-50 to-white dark:from-nova-500/10 dark:to-ink-900/40'
            : 'border-debate-300 dark:border-debate-700 bg-gradient-to-br from-debate-50 to-white dark:from-debate-500/10 dark:to-ink-900/40'
          : isPro
            ? 'border-nova-200/60 dark:border-nova-800/60 bg-white/60 dark:bg-ink-900/40'
            : 'border-debate-200/60 dark:border-debate-800/60 bg-white/60 dark:bg-ink-900/40',
        arg.isExpert && 'shadow-sm'
      )}
    >
      <div className="flex items-start gap-3">
        <img src={arg.authorAvatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{arg.authorName}</span>
            {arg.isExpert && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-gradient-to-r from-news-500 to-news-600 text-white text-[10px] font-bold">
                <Crown className="w-2.5 h-2.5" />专家
              </span>
            )}
            <span className={cn(
              'px-1.5 py-0.5 rounded text-[10px] font-bold',
              isPro ? 'bg-nova-500 text-white' : 'bg-debate-500 text-white'
            )}>
              {isPro ? '正方' : '反方'}
            </span>
            {arg.isFeatured && (
              <span className="px-1.5 py-0.5 rounded bg-news-500/10 text-news-600 text-[10px] font-medium">
                <Star className="inline w-2.5 h-2.5" />精选
              </span>
            )}
            <span className="text-ink-400 text-xs">· {formatTimeAgo(arg.createdAt)}</span>
          </div>
          <p className="text-sm mt-2 leading-relaxed text-ink-800 dark:text-ink-200">{arg.content}</p>

          {/* 引用 - ProCon 风格 */}
          {arg.citations && arg.citations.length > 0 && (
            <div className="mt-3 space-y-2">
              {arg.citations.map((cit) => <CitationItem key={cit.id} citation={cit} />)}
            </div>
          )}

          {/* 互动 */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            <button
              onClick={() => setVote(vote === 1 ? 0 : 1)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors',
                vote === 1
                  ? isPro ? 'bg-nova-500 text-white' : 'bg-debate-500 text-white'
                  : 'hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500'
              )}
            >
              <ThumbsUp className="w-3 h-3" /> 支持
            </button>
            <button
              onClick={() => setVote(vote === -1 ? 0 : -1)}
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors',
                vote === -1
                  ? isPro ? 'bg-debate-500 text-white' : 'bg-nova-500 text-white'
                  : 'hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500'
              )}
            >
              <ThumbsDown className="w-3 h-3" /> 反对
            </button>
            <span className="text-ink-500">得分 <strong className={cn(isPro ? 'text-nova-600' : 'text-debate-600')}>{score}</strong></span>
            <button className="ml-auto px-2 py-1 rounded-md hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500">回复</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CitationItem({ citation }: { citation: Citation }) {
  return (
    <div className="flex gap-2 p-2.5 rounded-lg bg-ink-50/80 dark:bg-ink-800/40 border-l-2 border-news-500">
      <Quote className="w-3.5 h-3.5 text-news-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-ink-700 dark:text-ink-200 italic leading-relaxed line-clamp-3">
          "{citation.quote}"
        </p>
        <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-500">
          <BookOpen className="w-2.5 h-2.5" />
          <span className="font-medium">— {citation.source}</span>
          {citation.url && (
            <a href={citation.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-news-600 hover:underline">
              原文 <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
