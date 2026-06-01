import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Sparkles, Clock, Eye, ArrowUpRight } from 'lucide-react'
import type { NewsArticle } from '../../data/types'
import { Badge } from '../ui/Badge'
import { formatNumber, formatTimeAgo, cn } from '../../lib/utils'

const categoryLabel: Record<string, string> = {
  tech: '科技', finance: '财经', culture: '文化', science: '科学', world: '国际', lifestyle: '生活',
}

export function NewsHero({ featured }: { featured: NewsArticle[] }) {
  const [active, setActive] = useState(0)
  const count = Math.min(featured.length, 3)
  if (count === 0) return null
  const main = featured[active]
  const side = [featured[1 % featured.length], featured[2 % featured.length]].filter(Boolean)

  useEffect(() => {
    const t = setInterval(() => setActive((i) => (i + 1) % count), 6000)
    return () => clearInterval(t)
  }, [count])

  return (
    <section className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-10">
      {/* 大图主推 */}
      <div className="lg:col-span-3 group relative rounded-3xl overflow-hidden bg-ink-900 aspect-[16/10]">
        {featured.slice(0, count).map((a, i) => (
          <Link
            key={a.id}
            to={`/news/${a.id}`}
            className={cn(
              'absolute inset-0 transition-opacity duration-1000',
              i === active ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none'
            )}
          >
            <img
              src={a.cover}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/50 to-transparent" />
            <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-end text-white">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="nova" size="sm" icon={<Sparkles className="w-3 h-3" />}>编辑精选</Badge>
                <Badge variant="news" size="sm">{categoryLabel[a.category]}</Badge>
                {a.isLongForm && <Badge variant="outline" size="sm" className="bg-white/10 text-white border-white/30">深度</Badge>}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight max-w-2xl text-balance">
                {a.title}
              </h1>
              <p className="text-sm sm:text-base text-ink-200 mt-3 max-w-xl line-clamp-2">
                {a.subtitle}
              </p>
              <div className="mt-4 flex items-center gap-3 text-xs text-ink-300">
                <div className="flex items-center gap-2">
                  <img src={a.author.avatar} alt="" className="w-5 h-5 rounded-full ring-1 ring-white/40" />
                  <span className="font-medium">{a.author.name}</span>
                </div>
                <span>·</span>
                <span>{formatTimeAgo(a.publishedAt)}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.readTime} 分钟</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(a.views)}</span>
              </div>
            </div>
          </Link>
        ))}
        {/* 控件 */}
        <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
          <button
            onClick={() => setActive((i) => (i - 1 + count) % count)}
            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            aria-label="上一张"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActive((i) => (i + 1) % count)}
            className="w-9 h-9 rounded-full bg-white/20 backdrop-blur hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            aria-label="下一张"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {/* dots */}
        <div className="absolute bottom-6 left-6 z-20 flex items-center gap-1.5">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                'h-1 rounded-full transition-all',
                i === active ? 'w-8 bg-white' : 'w-4 bg-white/40'
              )}
              aria-label={`第 ${i + 1} 张`}
            />
          ))}
        </div>
      </div>

      {/* 侧边次推 */}
      <div className="lg:col-span-2 flex flex-col gap-4">
        {side.map((a) => (
          <Link
            key={a.id}
            to={`/news/${a.id}`}
            className="group flex-1 relative rounded-3xl overflow-hidden bg-ink-900 min-h-[160px]"
          >
            <img src={a.cover} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
            <div className="relative h-full p-5 flex flex-col justify-end text-white">
              <div className="flex items-center gap-1.5 mb-2">
                <Badge variant="news" size="sm">{categoryLabel[a.category]}</Badge>
                {a.isLongForm && <Badge variant="outline" size="sm" className="bg-white/10 border-white/30 text-white">深度</Badge>}
              </div>
              <h3 className="text-base sm:text-lg font-bold leading-snug line-clamp-2 text-balance">
                {a.title}
              </h3>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-ink-300">
                <span>{a.author.name}</span>
                <span>·</span>
                <span>{a.readTime} 分钟</span>
              </div>
            </div>
            <ArrowUpRight className="absolute top-3 right-3 w-4 h-4 text-white/60 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </section>
  )
}
