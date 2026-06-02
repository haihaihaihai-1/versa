import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Crown, Medal, Award, Sparkles, Heart } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface Supporter {
  id: string
  userId: string
  userName: string
  avatar: string
  totalCoins: number
  giftCount: number
  rank: number
  badge?: 'top' | 'fan' | 'new'
}

const SEED_SUPPORTERS: Supporter[] = [
  { id: 's1', userId: 'u1', userName: '钻石王老五', avatar: '👑', totalCoins: 89432, giftCount: 234, rank: 1, badge: 'top' },
  { id: 's2', userId: 'u2', userName: '小美爱买', avatar: '💎', totalCoins: 65200, giftCount: 187, rank: 2, badge: 'top' },
  { id: 's3', userId: 'u3', userName: '土豪小张', avatar: '🎁', totalCoins: 48920, giftCount: 156, rank: 3, badge: 'top' },
  { id: 's4', userId: 'u4', userName: '追剧达人', avatar: '⭐', totalCoins: 32100, giftCount: 98, rank: 4, badge: 'fan' },
  { id: 's5', userId: 'u5', userName: '美食家老王', avatar: '🍔', totalCoins: 28500, giftCount: 87, rank: 5, badge: 'fan' },
  { id: 's6', userId: 'u6', userName: '数码宅', avatar: '📱', totalCoins: 19800, giftCount: 65, rank: 6 },
  { id: 's7', userId: 'u7', userName: '设计师Lily', avatar: '🎨', totalCoins: 15400, giftCount: 52, rank: 7 },
  { id: 's8', userId: 'u8', userName: '旅行家 Leo', avatar: '✈️', totalCoins: 12200, giftCount: 41, rank: 8 },
]

const RANK_COLORS = [
  'from-yellow-400 to-amber-500',
  'from-slate-300 to-slate-400',
  'from-orange-400 to-orange-500',
]

const RANK_ICONS = [Crown, Medal, Award]

interface Props {
  roomId?: string
  limit?: number
  compact?: boolean
  className?: string
}

export function LiveLeaderboard({ roomId, limit = 5, compact = false, className }: Props) {
  const [supporters, setSupporters] = useState<Supporter[]>(SEED_SUPPORTERS)

  useEffect(() => {
    if (!roomId) return
    const t = setInterval(() => {
      setSupporters((arr) =>
        arr
          .map((s) => ({ ...s, totalCoins: s.totalCoins + Math.floor(Math.random() * 50), giftCount: s.giftCount + (Math.random() > 0.7 ? 1 : 0) }))
          .sort((a, b) => b.totalCoins - a.totalCoins)
          .map((s, i) => ({ ...s, rank: i + 1 }))
      )
    }, 3000)
    return () => clearInterval(t)
  }, [roomId])

  if (compact) {
    return (
      <div className={cn('space-y-1', className)}>
        {supporters.slice(0, limit).map((s) => (
          <div key={s.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/50">
            <div
              className={cn(
                'flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white',
                s.rank <= 3 ? `bg-gradient-to-br ${RANK_COLORS[s.rank - 1]}` : 'bg-ink-200 dark:bg-ink-700 text-ink-600 dark:text-ink-300'
              )}
            >
              {s.rank}
            </div>
            <div className="text-lg">{s.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate flex items-center gap-1">
                {s.userName}
                {s.badge === 'top' && <Crown className="w-3 h-3 text-amber-500" />}
              </div>
              <div className="text-[10px] text-ink-500">{s.giftCount} 件礼物</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-orange-500">{s.totalCoins.toLocaleString()}</div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('rounded-2xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-4 backdrop-blur-md', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" />
          本场打赏榜
        </h3>
        <span className="text-[10px] text-ink-500 flex items-center gap-0.5">
          <span className="w-1.5 h-1.5 bg-shop-500 rounded-full animate-pulse" />
          实时
        </span>
      </div>

      {/* TOP 3 podium */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {supporters.slice(0, 3).map((s, i) => {
          const Icon = RANK_ICONS[i]
          return (
            <motion.div
              key={s.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={cn(
                'flex flex-col items-center p-3 rounded-2xl bg-gradient-to-br text-white relative overflow-hidden',
                RANK_COLORS[i]
              )}
            >
              {i === 0 && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute -top-4 -right-4 text-4xl opacity-30"
                >
                  <Sparkles className="w-12 h-12" />
                </motion.div>
              )}
              <Icon className="w-5 h-5 mb-1" />
              <div className="text-2xl mb-1">{s.avatar}</div>
              <div className="text-xs font-bold truncate max-w-full">{s.userName}</div>
              <div className="text-[10px] opacity-80">{s.totalCoins.toLocaleString()} 币</div>
              <div className="absolute top-1 left-1 text-[10px] font-bold">#{s.rank}</div>
            </motion.div>
          )
        })}
      </div>

      <div className="space-y-1">
        {supporters.slice(3, limit).map((s) => (
          <div key={s.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/50">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center text-[10px] font-bold text-ink-600 dark:text-ink-300">
              {s.rank}
            </div>
            <div className="text-lg">{s.avatar}</div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold truncate">{s.userName}</div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-orange-500">{s.totalCoins.toLocaleString()}</div>
              <div className="text-[10px] text-ink-400">{s.giftCount} 件</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
