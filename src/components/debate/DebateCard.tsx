import { Link } from 'react-router-dom'
import { Flame, MessageCircle, ArrowUpRight } from 'lucide-react'
import type { Debate } from '../../data/types'
import { formatTimeAgo, formatNumber, cn } from '../../lib/utils'
import { Badge } from '../ui/Badge'
import { DivergingBar } from '../ui/Progress'

const categoryColor: Record<string, any> = {
  tech: 'nova', consumer: 'shop', social: 'debate', philosophy: 'nova', entertainment: 'news', world: 'debate', lifestyle: 'default',
}

const categoryLabel: Record<string, string> = {
  tech: '科技', consumer: '消费', social: '社会', philosophy: '哲学', entertainment: '娱乐', world: '国际', lifestyle: '生活',
}

export function DebateCard({ debate, variant = 'default' }: { debate: Debate; variant?: 'default' | 'compact' | 'feature' }) {
  if (variant === 'feature') return <DebateCardFeature debate={debate} />
  if (variant === 'compact') return <DebateCardCompact debate={debate} />
  return <DebateCardDefault debate={debate} />
}

function DebateCardDefault({ debate }: { debate: Debate }) {
  const total = debate.pros + debate.cons
  return (
    <Link
      to={`/debates/${debate.id}`}
      className="group block card-hover rounded-2xl overflow-hidden bg-white dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60"
    >
      {debate.cover && (
        <div className="aspect-[21/9] overflow-hidden bg-ink-100 dark:bg-ink-800 relative">
          <img
            src={debate.cover}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 to-transparent" />
          {debate.hot > 80 && (
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-debate-500 text-white text-[10px] font-bold">
              <Flame className="w-3 h-3" /> 热门
            </div>
          )}
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant={categoryColor[debate.category]} size="sm">{categoryLabel[debate.category]}</Badge>
          {debate.linkedNewsId && (
            <Badge variant="news" size="sm">来自资讯</Badge>
          )}
          {debate.linkedProductId && (
            <Badge variant="shop" size="sm">相关商品</Badge>
          )}
        </div>
        <h3 className="font-semibold text-lg leading-snug line-clamp-2 group-hover:text-debate-600 dark:group-hover:text-debate-400 transition-colors">
          {debate.title}
        </h3>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-2 line-clamp-2">{debate.description}</p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-nova-600 font-medium">{formatNumber(debate.pros)} 正方</span>
            <span className="text-debate-600 font-medium">{formatNumber(debate.cons)} 反方</span>
          </div>
          <DivergingBar left={debate.pros} right={debate.cons} leftColor="bg-nova-500" rightColor="bg-debate-500" />
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />{formatNumber(debate.arguments.length)} 观点
          </span>
          <span>{formatTimeAgo(debate.createdAt)}</span>
        </div>
      </div>
    </Link>
  )
}

function DebateCardFeature({ debate }: { debate: Debate }) {
  return (
    <Link
      to={`/debates/${debate.id}`}
      className="group relative block rounded-3xl overflow-hidden bg-gradient-to-br from-debate-500/10 via-nova-500/10 to-shop-500/10 border border-ink-200/60 dark:border-ink-800/60 p-6 sm:p-8 card-hover"
    >
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="debate" size="sm" icon={<Flame className="w-3 h-3" />}>热议话题</Badge>
        <Badge variant={categoryColor[debate.category]} size="sm">{categoryLabel[debate.category]}</Badge>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold leading-tight group-hover:text-debate-600 dark:group-hover:text-debate-400 transition-colors">
        {debate.title}
      </h2>
      <p className="mt-2 text-ink-600 dark:text-ink-300 max-w-2xl">{debate.description}</p>
      <div className="mt-5 flex items-center gap-4 text-sm">
        <span className="text-nova-600 font-bold">{formatNumber(debate.pros)}</span>
        <span className="text-ink-400">vs</span>
        <span className="text-debate-600 font-bold">{formatNumber(debate.cons)}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-nova-600 font-medium group-hover:gap-2 transition-all">
          参与辩论 <ArrowUpRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  )
}

function DebateCardCompact({ debate }: { debate: Debate }) {
  return (
    <Link
      to={`/debates/${debate.id}`}
      className="group block p-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-900/40 transition-colors"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Badge variant={categoryColor[debate.category]} size="sm">{categoryLabel[debate.category]}</Badge>
        {debate.hot > 80 && <Flame className="w-3 h-3 text-debate-500" />}
      </div>
      <h4 className="font-medium text-sm line-clamp-2 group-hover:text-debate-600 dark:group-hover:text-debate-400">
        {debate.title}
      </h4>
      <div className="text-xs text-ink-500 dark:text-ink-400 mt-1.5 flex items-center gap-2">
        <span className="text-nova-600 font-medium">{formatNumber(debate.pros)}</span>
        <span>·</span>
        <span className="text-debate-600 font-medium">{formatNumber(debate.cons)}</span>
        <span className="ml-auto">{formatTimeAgo(debate.createdAt)}</span>
      </div>
    </Link>
  )
}
