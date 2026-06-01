import { useState, useMemo } from 'react'
import { Crown, Quote, Check } from 'lucide-react'
import type { Debate } from '../../data/types'
import { cn } from '../../lib/utils'

export function ExpertPanel({ debate }: { debate: Debate }) {
  const [selectedStance, setSelectedStance] = useState<'all' | 'pro' | 'con' | 'neutral'>('all')

  const filtered = useMemo(() => {
    if (!debate.panelists) return []
    if (selectedStance === 'all') return debate.panelists
    return debate.panelists.filter((p) => p.stance === selectedStance)
  }, [debate.panelists, selectedStance])

  if (!debate.moderator && (!debate.panelists || debate.panelists.length === 0)) return null

  return (
    <div className="rounded-3xl bg-gradient-to-br from-news-500/5 via-amber-500/5 to-news-500/5 dark:from-news-500/10 dark:to-amber-500/10 border border-news-200/50 dark:border-news-800/50 p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-5 h-5 text-news-500" />
        <h3 className="font-bold text-lg">圆桌嘉宾</h3>
        <span className="text-xs text-ink-500">ProCon · 36氪 · 澎湃 风格</span>
      </div>

      {/* 主持人 */}
      {debate.moderator && (
        <div className="mb-4 p-4 rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-news-200/50 dark:border-news-800/50">
          <div className="flex items-start gap-3">
            <img src={debate.moderator.avatar} alt="" className="w-12 h-12 rounded-full ring-2 ring-news-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{debate.moderator.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-news-500 text-white text-[10px] font-bold">主持人</span>
                <span className="text-xs text-ink-500">{debate.moderator.title}</span>
              </div>
              <p className="text-xs text-ink-600 dark:text-ink-300 mt-1.5 italic">
                <Quote className="inline w-3 h-3 mr-0.5" />
                {debate.moderator.bio}
              </p>
              <div className="text-[10px] text-ink-500 mt-1">{debate.moderator.credential}</div>
            </div>
          </div>
        </div>
      )}

      {/* 立场筛选 */}
      {debate.panelists && debate.panelists.length > 0 && (
        <>
          <div className="flex gap-1 mb-3 bg-ink-100 dark:bg-ink-800 p-0.5 rounded-lg w-fit">
            {[
              { v: 'all', l: '全部' },
              { v: 'pro', l: '正方' },
              { v: 'con', l: '反方' },
              { v: 'neutral', l: '中立' },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => setSelectedStance(o.v as any)}
                className={cn(
                  'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                  selectedStance === o.v
                    ? 'bg-white dark:bg-ink-900 shadow-sm'
                    : 'text-ink-500'
                )}
              >
                {o.l}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((p) => (
              <div
                key={p.id}
                className={cn(
                  'p-3 rounded-2xl border-2 transition-all bg-white/60 dark:bg-ink-900/40',
                  p.stance === 'pro' ? 'border-nova-200/60 dark:border-nova-800/60' :
                  p.stance === 'con' ? 'border-debate-200/60 dark:border-debate-800/60' :
                  'border-ink-200/60 dark:border-ink-800/60'
                )}
              >
                <div className="flex items-start gap-2.5">
                  <img src={p.avatar} alt="" className="w-10 h-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm">{p.name}</span>
                      <span className={cn(
                        'px-1 py-0.5 rounded text-[10px] font-bold',
                        p.stance === 'pro' ? 'bg-nova-500 text-white' :
                        p.stance === 'con' ? 'bg-debate-500 text-white' :
                        'bg-ink-500 text-white'
                      )}>
                        {p.stance === 'pro' ? '正方' : p.stance === 'con' ? '反方' : '中立'}
                      </span>
                    </div>
                    <div className="text-xs text-ink-500 mt-0.5">{p.title}</div>
                    <p className="text-xs text-ink-600 dark:text-ink-300 mt-1.5 line-clamp-2">{p.bio}</p>
                    <div className="text-[10px] text-ink-500 mt-1">{p.credential}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
