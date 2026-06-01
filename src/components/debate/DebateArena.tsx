import { useState, useMemo } from 'react'
import { Scale, TrendingUp, Users, MessageCircle, Eye, Flame, Sparkles } from 'lucide-react'
import type { Debate } from '../../data/types'
import { DivergingBar } from '../ui/Progress'
import { cn, formatNumber } from '../../lib/utils'

export function DebateArena({ debate, totalVoters }: { debate: Debate; totalVoters?: number }) {
  const [myVote, setMyVote] = useState<'pro' | 'con' | null>(null)
  const basePros = debate.pros
  const baseCons = debate.cons
  const total = basePros + baseCons
  const voterTotal = totalVoters || Math.round(total / 4.5)
  const notVoted = Math.max(0, voterTotal - total)

  const livePros = basePros + (myVote === 'pro' ? 1 : 0)
  const liveCons = baseCons + (myVote === 'con' ? 1 : 0)
  const proPct = ((livePros / (livePros + liveCons)) * 100).toFixed(1)
  const conPct = ((liveCons / (livePros + liveCons)) * 100).toFixed(1)

  const dominant = parseFloat(proPct) > 50 ? 'pro' : 'con'

  const handleVote = (side: 'pro' | 'con') => {
    setMyVote(myVote === side ? null : side)
  }

  return (
    <div className={cn(
      'rounded-3xl p-5 sm:p-6 border-2 relative overflow-hidden',
      dominant === 'pro'
        ? 'bg-gradient-to-br from-nova-500/10 via-white/40 to-debate-500/5 dark:from-nova-500/10 dark:via-ink-900/40 dark:to-debate-500/5 border-nova-200/50 dark:border-nova-800/50'
        : 'bg-gradient-to-br from-debate-500/10 via-white/40 to-nova-500/5 dark:from-debate-500/10 dark:via-ink-900/40 dark:to-nova-500/5 border-debate-200/50 dark:border-debate-800/50'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-ink-700 dark:text-ink-200" />
          <h3 className="font-bold text-base sm:text-lg">投票区</h3>
          {debate.status === 'live' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          )}
          {debate.format === 'roundtable' && (
            <span className="px-2 py-0.5 rounded-full bg-news-500/10 text-news-600 text-[10px] font-medium">圆桌</span>
          )}
          {debate.format === 'oxford' && (
            <span className="px-2 py-0.5 rounded-full bg-news-500/10 text-news-600 text-[10px] font-medium">牛津</span>
          )}
        </div>
        <div className="text-xs text-ink-500">
          <Users className="inline w-3 h-3 mr-0.5" />{formatNumber(voterTotal)} 投票用户
        </div>
      </div>

      {/* 正反方立场 */}
      {(debate.proStance || debate.conStance) && (
        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          {debate.proStance && (
            <div className="p-2.5 rounded-lg bg-nova-500/10 border-l-2 border-nova-500">
              <div className="font-bold text-nova-600 mb-0.5">正方观点</div>
              <div className="text-ink-700 dark:text-ink-200">{debate.proStance}</div>
            </div>
          )}
          {debate.conStance && (
            <div className="p-2.5 rounded-lg bg-debate-500/10 border-l-2 border-debate-500">
              <div className="font-bold text-debate-600 mb-0.5">反方观点</div>
              <div className="text-ink-700 dark:text-ink-200">{debate.conStance}</div>
            </div>
          )}
        </div>
      )}

      {/* 大数字 PK */}
      <div className="grid grid-cols-2 gap-4 my-5">
        <div className="text-center">
          <div className={cn(
            'text-3xl sm:text-5xl font-bold tracking-tight',
            myVote === 'pro' && 'text-nova-600'
          )}>
            {formatNumber(livePros)}
          </div>
          <div className="text-xs text-ink-500 mt-1">正方票数</div>
          <div className="text-2xl font-bold text-nova-600 mt-1">{proPct}%</div>
        </div>
        <div className="text-center">
          <div className={cn(
            'text-3xl sm:text-5xl font-bold tracking-tight',
            myVote === 'con' && 'text-debate-600'
          )}>
            {formatNumber(liveCons)}
          </div>
          <div className="text-xs text-ink-500 mt-1">反方票数</div>
          <div className="text-2xl font-bold text-debate-600 mt-1">{conPct}%</div>
        </div>
      </div>

      {/* 进度条 */}
      <DivergingBar
        left={livePros}
        right={liveCons}
        leftColor="bg-nova-500"
        rightColor="bg-debate-500"
        className="h-3 mb-1"
      />
      <div className="text-center text-xs text-ink-500 my-3">
        共 {formatNumber(livePros + liveCons)} 票 · {notVoted > 0 && `未投票 ${formatNumber(notVoted)} 人`}
      </div>

      {/* 投票按钮 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleVote('pro')}
          className={cn(
            'h-14 rounded-2xl font-semibold text-base transition-all flex items-center justify-center gap-2',
            myVote === 'pro'
              ? 'bg-gradient-to-r from-nova-500 to-nova-600 text-white shadow-lg shadow-nova-500/30'
              : 'border-2 border-nova-300 dark:border-nova-700 hover:bg-nova-50 dark:hover:bg-nova-500/10 text-nova-600'
          )}
        >
          {myVote === 'pro' && <Sparkles className="w-4 h-4" />}
          我站正方 {myVote === 'pro' && '✓'}
        </button>
        <button
          onClick={() => handleVote('con')}
          className={cn(
            'h-14 rounded-2xl font-semibold text-base transition-all flex items-center justify-center gap-2',
            myVote === 'con'
              ? 'bg-gradient-to-r from-debate-500 to-debate-600 text-white shadow-lg shadow-debate-500/30'
              : 'border-2 border-debate-300 dark:border-debate-700 hover:bg-debate-50 dark:hover:bg-debate-500/10 text-debate-600'
          )}
        >
          {myVote === 'con' && <Sparkles className="w-4 h-4" />}
          我站反方 {myVote === 'con' && '✓'}
        </button>
      </div>

      {/* 实时统计 */}
      <div className="mt-4 pt-4 border-t border-ink-200/60 dark:border-ink-800/60 grid grid-cols-3 gap-2 text-center text-xs">
        <div>
          <div className="font-bold text-base text-ink-700 dark:text-ink-200">{formatNumber(debate.views)}</div>
          <div className="text-ink-500">浏览</div>
        </div>
        <div>
          <div className="font-bold text-base text-ink-700 dark:text-ink-200">{formatNumber(debate.arguments.length)}</div>
          <div className="text-ink-500">观点</div>
        </div>
        <div>
          <div className="font-bold text-base text-ink-700 dark:text-ink-200">{debate.hot}</div>
          <div className="text-ink-500">热度</div>
        </div>
      </div>
    </div>
  )
}
