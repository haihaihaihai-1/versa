import { Link } from 'react-router-dom'
import { Clock, Eye, MessageCircle, Sparkles, ArrowUpRight } from 'lucide-react'
import type { NewsArticle } from '../../data/types'
import { formatTimeAgo, formatNumber, cn } from '../../lib/utils'
import { Badge } from '../ui/Badge'

const categoryColor: Record<string, any> = {
  tech: 'nova', finance: 'shop', culture: 'news', science: 'nova', world: 'debate', lifestyle: 'default',
}

const categoryLabel: Record<string, string> = {
  tech: '科技', finance: '财经', culture: '文化', science: '科学', world: '国际', lifestyle: '生活',
}

export function NewsCard({ article, variant = 'default' }: { article: NewsArticle; variant?: 'default' | 'compact' | 'feature' }) {
  if (variant === 'feature') return <NewsCardFeature article={article} />
  if (variant === 'compact') return <NewsCardCompact article={article} />
  return <NewsCardDefault article={article} />
}

function NewsCardDefault({ article }: { article: NewsArticle }) {
  return (
    <Link
      to={`/news/${article.id}`}
      className="group block card-hover rounded-2xl overflow-hidden bg-white dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60"
    >
      <div className="aspect-[16/9] overflow-hidden bg-ink-100 dark:bg-ink-800">
        <img
          src={article.cover}
          alt={article.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={categoryColor[article.category]} size="sm">{categoryLabel[article.category]}</Badge>
          {article.linkedDebateId && (
            <Badge variant="debate" size="sm" icon={<MessageCircle className="w-3 h-3" />}>有辩论</Badge>
          )}
        </div>
        <h3 className="font-semibold text-lg leading-snug line-clamp-2 group-hover:text-nova-600 dark:group-hover:text-nova-400 transition-colors">
          {article.title}
        </h3>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-2 line-clamp-2">{article.subtitle}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
          <div className="flex items-center gap-3">
            <img src={article.author.avatar} alt={article.author.name} className="w-5 h-5 rounded-full" />
            <span>{article.author.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime} 分钟</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{formatNumber(article.views)}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function NewsCardFeature({ article }: { article: NewsArticle }) {
  return (
    <Link
      to={`/news/${article.id}`}
      className="group block card-hover relative rounded-3xl overflow-hidden bg-ink-900 text-white"
    >
      <div className="absolute inset-0">
        <img
          src={article.cover}
          alt=""
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/60 to-transparent" />
      </div>
      <div className="relative aspect-[16/10] sm:aspect-[21/10] p-6 sm:p-10 flex flex-col justify-end">
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="nova" size="sm" icon={<Sparkles className="w-3 h-3" />}>编辑精选</Badge>
          <Badge variant="news" size="sm">{categoryLabel[article.category]}</Badge>
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight max-w-2xl text-balance">
          {article.title}
        </h2>
        <p className="text-sm sm:text-base text-ink-300 mt-3 max-w-xl line-clamp-2">
          {article.subtitle}
        </p>
        <div className="mt-5 flex items-center gap-4 text-xs text-ink-300">
          <div className="flex items-center gap-2">
            <img src={article.author.avatar} alt={article.author.name} className="w-6 h-6 rounded-full ring-2 ring-white/30" />
            <span className="font-medium">{article.author.name}</span>
          </div>
          <span>·</span>
          <span>{formatTimeAgo(article.publishedAt)}</span>
          <span>·</span>
          <span>{article.readTime} 分钟阅读</span>
        </div>
      </div>
    </Link>
  )
}

function NewsCardCompact({ article }: { article: NewsArticle }) {
  return (
    <Link
      to={`/news/${article.id}`}
      className="group flex gap-4 p-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-900/40 transition-colors"
    >
      <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-ink-100 dark:bg-ink-800">
        <img src={article.cover} alt="" loading="lazy" className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <Badge variant={categoryColor[article.category]} size="sm">{categoryLabel[article.category]}</Badge>
        <h4 className="font-medium text-sm mt-1 line-clamp-2 group-hover:text-nova-600 dark:group-hover:text-nova-400">
          {article.title}
        </h4>
        <div className="text-xs text-ink-500 dark:text-ink-400 mt-1 flex items-center gap-2">
          <span>{formatTimeAgo(article.publishedAt)}</span>
          <span>·</span>
          <span>{formatNumber(article.views)} 阅读</span>
        </div>
      </div>
    </Link>
  )
}
