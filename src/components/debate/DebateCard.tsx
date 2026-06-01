import { Link } from 'react-router-dom'
import { Flame, MessageCircle, ArrowUpRight, Quote, Users } from 'lucide-react'
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

export function DebateCard({ debate, variant = 'default' }: { debate: Debate; variant?: 'default' | 'compact' | 'feature' | 'split' }) {
  if (variant === 'feature') return <DebateCardFeature debate={debate} />
  if (variant === 'compact') return <DebateCardCompact debate={debate} />
  if (variant === 'split') return <DebateCardSplit debate={debate} />
  return <DebateCardDefault debate={debate} />
}

function DebateCardDefault({ debate }: { debate: Debate }) {
  const total = debate.pros + debate.cons
  const proPct = total > 0 ? Math.round((debate.pros / total) * 100) : 50
  return (
    <Link
      to={`/debates/${debate.id}`}
      className="group block rounded-2xl overflow-hidden bg-white dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 transition-all duration-500 hover:shadow-2xl hover:shadow-debate-500/10 hover:-translate-y-1"
    >
      {debate.cover && (
        <div className="aspect-[21/9] overflow-hidden bg-ink-100 dark:bg-ink-800 relative">
          <img
            src={debate.cover}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/20 to-transparent" />
          {/* 顶部标签 */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <Badge variant={categoryColor[debate.category]} size="sm" className="backdrop-blur-md shadow-lg">
              {categoryLabel[debate.category]}
            </Badge>
            {debate.hot > 80 && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-debate-500 to-orange-500 text-white text-[10px] font-bold shadow-lg">
                <Flame className="w-3 h-3 fill-current" />热门
              </div>
            )}
          </div>
          {/* 关联模块标签 */}
          {(debate.linkedNewsId || debate.linkedProductId) && (
            <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
              {debate.linkedNewsId && (
                <div className="px-2 py-0.5 rounded-full bg-news-500/90 backdrop-blur-md text-white text-[10px] font-semibold shadow-lg">
                  来自资讯
                </div>
              )}
              {debate.linkedProductId && (
                <div className="px-2 py-0.5 rounded-full bg-shop-500/90 backdrop-blur-md text-white text-[10px] font-semibold shadow-lg">
                  相关商品
                </div>
              )}
            </div>
          )}
          {/* 底部 PRO/CON 对比分隔 */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 flex">
            <div className="bg-gradient-to-r from-nova-400 to-nova-500 transition-all" style={{ width: `${proPct}%` }} />
            <div className="bg-gradient-to-l from-debate-400 to-debate-500 transition-all flex-1" />
          </div>
        </div>
      )}
      <div className="p-5">
        <h3 className="font-bold text-lg leading-snug line-clamp-2 group-hover:text-debate-600 dark:group-hover:text-debate-400 transition-colors">
          {debate.title}
        </h3>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-2 line-clamp-2">{debate.description}</p>

        {/* PRO vs CON 对比 */}
        <div className="mt-4 rounded-xl overflow-hidden border border-ink-200/60 dark:border-ink-800/60">
          <div className="grid grid-cols-2 divide-x divide-ink-200/60 dark:divide-ink-800/60">
            <div className="p-3 bg-gradient-to-br from-nova-500/5 to-transparent">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-nova-600">{formatNumber(debate.pros)}</span>
                <span className="text-[10px] text-nova-600/70 font-semibold">{proPct}%</span>
              </div>
              <div className="text-[10px] text-ink-500 font-medium mt-0.5">正方支持</div>
            </div>
            <div className="p-3 bg-gradient-to-bl from-debate-500/5 to-transparent">
              <div className="flex items-baseline gap-1 justify-end">
                <span className="text-[10px] text-debate-600/70 font-semibold">{100 - proPct}%</span>
                <span className="text-xl font-bold text-debate-600">{formatNumber(debate.cons)}</span>
              </div>
              <div className="text-[10px] text-ink-500 font-medium mt-0.5 text-right">反方支持</div>
            </div>
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
  const total = debate.pros + debate.cons
  const proPct = total > 0 ? Math.round((debate.pros / total) * 100) : 50
  return (
    <Link
      to={`/debates/${debate.id}`}
      className="group relative block rounded-3xl overflow-hidden bg-gradient-to-br from-debate-500/10 via-nova-500/10 to-shop-500/10 border border-ink-200/60 dark:border-ink-800/60 p-6 sm:p-8 transition-all duration-500 hover:shadow-2xl hover:shadow-debate-500/20"
    >
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="debate" size="sm" icon={<Flame className="w-3 h-3" />}>热议话题</Badge>
        <Badge variant={categoryColor[debate.category]} size="sm">{categoryLabel[debate.category]}</Badge>
      </div>
      <h2 className="text-2xl sm:text-3xl font-bold leading-tight group-hover:text-debate-600 dark:group-hover:text-debate-400 transition-colors">
        {debate.title}
      </h2>
      <p className="mt-2 text-ink-600 dark:text-ink-300 max-w-2xl">{debate.description}</p>

      {/* PRO vs CON 大对比 */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4 bg-gradient-to-br from-nova-500/15 to-nova-500/5 border border-nova-500/30">
          <div className="flex items-center gap-1 text-[10px] text-nova-700 font-bold mb-1.5">
            <Quote className="w-3 h-3" />正方
          </div>
          <div className="text-3xl font-bold text-nova-600">{formatNumber(debate.pros)}</div>
          <div className="text-xs text-nova-600/80 mt-1">支持率 {proPct}%</div>
        </div>
        <div className="rounded-2xl p-4 bg-gradient-to-br from-debate-500/15 to-debate-500/5 border border-debate-500/30">
          <div className="flex items-center gap-1 text-[10px] text-debate-700 font-bold mb-1.5 justify-end">
            反方<Quote className="w-3 h-3 scale-x-[-1]" />
          </div>
          <div className="text-3xl font-bold text-debate-600 text-right">{formatNumber(debate.cons)}</div>
          <div className="text-xs text-debate-600/80 mt-1 text-right">支持率 {100 - proPct}%</div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-ink-500">
          <Users className="w-3.5 h-3.5" />{formatNumber(total)} 已投票
        </span>
        <span className="flex items-center gap-1.5 text-ink-500">
          <MessageCircle className="w-3.5 h-3.5" />{formatNumber(debate.arguments.length)} 观点
        </span>
        <span className="ml-auto inline-flex items-center gap-1 text-debate-600 font-bold group-hover:gap-2 transition-all">
          参与辩论 <ArrowUpRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  )
}

function DebateCardCompact({ debate }: { debate: Debate }) {
  const total = debate.pros + debate.cons
  const proPct = total > 0 ? Math.round((debate.pros / total) * 100) : 50
  return (
    <Link
      to={`/debates/${debate.id}`}
      className="group block p-3 rounded-xl hover:bg-gradient-to-r hover:from-nova-500/5 hover:to-debate-500/5 transition-all border border-transparent hover:border-ink-200/60 dark:hover:border-ink-800/60"
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Badge variant={categoryColor[debate.category]} size="sm">{categoryLabel[debate.category]}</Badge>
        {debate.hot > 80 && <Flame className="w-3 h-3 text-debate-500" />}
      </div>
      <h4 className="font-medium text-sm line-clamp-2 group-hover:text-debate-600 dark:group-hover:text-debate-400">
        {debate.title}
      </h4>
      <div className="mt-1.5 flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
        <span className="text-nova-600 font-medium">{formatNumber(debate.pros)} 正 · {proPct}%</span>
        <span className="text-debate-600 font-medium">· {formatNumber(debate.cons)} 反</span>
        <span className="ml-auto">{formatTimeAgo(debate.createdAt)}</span>
      </div>
    </Link>
  )
}

function DebateCardSplit({ debate }: { debate: Debate }) {
  const total = debate.pros + debate.cons
  const proPct = total > 0 ? Math.round((debate.pros / total) * 100) : 50
  return (
    <Link
      to={`/debates/${debate.id}`}
      className="group block rounded-3xl overflow-hidden bg-white dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 transition-all duration-500 hover:shadow-2xl hover:shadow-debate-500/10 hover:-translate-y-1"
    >
      <div className="grid grid-cols-2 divide-x divide-ink-200/60 dark:divide-ink-800/60">
        {/* 正方侧 - 绿色/蓝色调 */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-nova-500/20 via-nova-500/10 to-transparent">
          {debate.cover && (
            <img src={debate.cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity group-hover:scale-110 transition-transform duration-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-nova-500/30 to-transparent" />
          <div className="relative h-full flex flex-col justify-between p-4">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-nova-500 text-white text-[10px] font-bold w-fit">
              <Quote className="w-3 h-3" />正方
            </div>
            <div>
              <div className="text-3xl font-bold text-nova-700 dark:text-nova-400">{proPct}%</div>
              <div className="text-[10px] text-nova-700/80 font-semibold">{formatNumber(debate.pros)} 票</div>
            </div>
          </div>
        </div>
        {/* 反方侧 - 红色/紫色调 */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-bl from-debate-500/20 via-debate-500/10 to-transparent">
          {debate.cover && (
            <img src={debate.cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity scale-x-[-1] group-hover:scale-x-[-110%] transition-transform duration-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-debate-500/30 to-transparent" />
          <div className="relative h-full flex flex-col justify-between p-4 items-end">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-debate-500 text-white text-[10px] font-bold w-fit">
              反方<Quote className="w-3 h-3 scale-x-[-1]" />
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-debate-700 dark:text-debate-400">{100 - proPct}%</div>
              <div className="text-[10px] text-debate-700/80 font-semibold">{formatNumber(debate.cons)} 票</div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={categoryColor[debate.category]} size="sm">{categoryLabel[debate.category]}</Badge>
          {debate.hot > 80 && <Badge variant="nova" size="sm" icon={<Flame className="w-3 h-3" />}>HOT</Badge>}
        </div>
        <h3 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-debate-600 dark:group-hover:text-debate-400 transition-colors">
          {debate.title}
        </h3>
        <div className="mt-3 flex items-center justify-between text-xs text-ink-500 dark:text-ink-400">
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />{formatNumber(debate.arguments.length)} 观点
          </span>
          <span>{formatTimeAgo(debate.createdAt)}</span>
        </div>
      </div>
    </Link>
  )
}
