import { Link } from 'react-router-dom'
import { TrendingUp, Eye, Flame, Sparkles } from 'lucide-react'
import type { NewsArticle } from '../../data/types'
import { formatNumber, cn } from '../../lib/utils'
import { Badge } from '../ui/Badge'

const categoryLabel: Record<string, string> = {
  tech: '科技', finance: '财经', culture: '文化', science: '科学', world: '国际', lifestyle: '生活',
}

interface NewsSidebarProps {
  hotArticles: NewsArticle[]
  topAuthors: { name: string; avatar: string; articles: number; reads: number }[]
  breakingTitles: string[]
}

export function NewsSidebar({ hotArticles, topAuthors, breakingTitles }: NewsSidebarProps) {
  return (
    <aside className="space-y-6 lg:sticky lg:top-20">
      {/* 热门榜 */}
      <div className="rounded-2xl border border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/40 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-200/60 dark:border-ink-800/60">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
            <Flame className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">热读榜</h3>
            <p className="text-[11px] text-ink-500">24 小时阅读</p>
          </div>
        </div>
        <div className="divide-y divide-ink-100 dark:divide-ink-800">
          {hotArticles.slice(0, 8).map((a, i) => (
            <Link
              key={a.id}
              to={`/news/${a.id}`}
              className="flex items-start gap-3 px-5 py-3 hover:bg-ink-50/60 dark:hover:bg-ink-900/40 transition-colors group"
            >
              <span
                className={cn(
                  'text-2xl font-bold leading-none flex-shrink-0 w-7 tabular-nums',
                  i < 3 ? 'text-red-500' : 'text-ink-300 dark:text-ink-600'
                )}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium line-clamp-2 group-hover:text-news-600 transition-colors">
                  {a.title}
                </h4>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-ink-500">
                  <span className="flex items-center gap-0.5">
                    <Eye className="w-3 h-3" />
                    {formatNumber(a.views)}
                  </span>
                  <Badge variant="outline" size="sm">{categoryLabel[a.category]}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 作者榜 */}
      <div className="rounded-2xl border border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/40 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-200/60 dark:border-ink-800/60">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-nova-500 to-purple-500 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">作者榜</h3>
            <p className="text-[11px] text-ink-500">本周创作</p>
          </div>
        </div>
        <div className="divide-y divide-ink-100 dark:divide-ink-800">
          {topAuthors.map((au, i) => (
            <div key={au.name} className="flex items-center gap-3 px-5 py-3">
              <span className="text-sm font-bold w-5 text-ink-400 tabular-nums">#{i + 1}</span>
              <img src={au.avatar} alt={au.name} className="w-9 h-9 rounded-full ring-2 ring-white dark:ring-ink-900" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{au.name}</div>
                <div className="text-[11px] text-ink-500 flex items-center gap-2">
                  <span>{au.articles} 篇</span>
                  <span>·</span>
                  <span>{formatNumber(au.reads)} 阅读</span>
                </div>
              </div>
              <button className="text-[11px] px-2 py-1 rounded-full border border-news-500 text-news-600 hover:bg-news-500 hover:text-white transition-colors">
                关注
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 24h 快讯流 */}
      <div className="rounded-2xl border border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/40 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-200/60 dark:border-ink-800/60">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-news-500 to-red-500 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm">实时快讯</h3>
            <p className="text-[11px] text-ink-500">持续更新</p>
          </div>
        </div>
        <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
          {breakingTitles.map((title, i) => (
            <div
              key={i}
              className="text-sm leading-relaxed py-2 px-3 rounded-lg hover:bg-ink-50/60 dark:hover:bg-ink-900/40 cursor-pointer transition-colors"
            >
              <span className="text-[10px] font-bold text-news-600 mr-1.5">最新</span>
              {title}
            </div>
          ))}
        </div>
      </div>
    </aside>
  )
}
