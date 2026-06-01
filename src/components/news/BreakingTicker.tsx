import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Zap, ArrowRight } from 'lucide-react'
import { breakingNews } from '../../data/news'
import { cn } from '../../lib/utils'

const categoryLabel: Record<string, string> = {
  tech: '科技', finance: '财经', culture: '文化', science: '科学', world: '国际', lifestyle: '生活',
}

const categoryColor: Record<string, string> = {
  tech: 'text-nova-600 bg-nova-500/10',
  finance: 'text-shop-600 bg-shop-500/10',
  culture: 'text-news-600 bg-news-500/10',
  science: 'text-debate-600 bg-debate-500/10',
  world: 'text-ink-900 bg-ink-100',
  lifestyle: 'text-ink-700 bg-ink-50',
}

export function BreakingTicker() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = setInterval(() => setIndex((i) => (i + 1) % breakingNews.length), 3500)
    return () => clearInterval(t)
  }, [paused])

  const current = breakingNews[index]
  const timeAgo = getTimeAgo(current.publishedAt)

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-news-500/30 bg-gradient-to-r from-news-500/10 via-news-500/5 to-transparent"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-stretch">
        <div className="flex items-center gap-2 px-4 py-3 bg-news-500 text-white font-bold text-sm">
          <Zap className="w-4 h-4" fill="currentColor" />
          <span className="hidden sm:inline">快讯</span>
        </div>
        <div className="flex-1 flex items-center gap-3 px-4 py-3 min-w-0">
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0', categoryColor[current.category])}>
            {categoryLabel[current.category]}
          </span>
          <span className="text-xs text-ink-500 flex-shrink-0">{timeAgo}</span>
          {current.linkId ? (
            <Link
              to={`/news/${current.linkId}`}
              className="flex-1 text-sm font-medium truncate hover:text-news-600 transition-colors"
            >
              {current.title}
            </Link>
          ) : (
            <span className="flex-1 text-sm font-medium truncate">{current.title}</span>
          )}
          <div className="hidden sm:flex items-center gap-1 text-[10px] text-ink-400">
            <span>{index + 1}</span>
            <span>/</span>
            <span>{breakingNews.length}</span>
          </div>
        </div>
        <Link
          to="/news"
          className="hidden sm:flex items-center gap-1 px-4 text-xs text-news-600 hover:bg-news-500/10 transition-colors"
        >
          全部快讯 <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-news-500/20">
        <div
          key={index}
          className="h-full bg-news-500"
          style={{
            animation: paused ? 'none' : 'ticker 3.5s linear',
          }}
        />
      </div>
      <style>{`
        @keyframes ticker {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  )
}

function getTimeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  return `${Math.floor(diff / 86400)} 天前`
}
