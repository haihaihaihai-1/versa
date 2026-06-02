import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useVersa } from '../store/versa'
import { allBadges, moduleMeta } from '../data/users'
import { cn } from '../lib/utils'
import {
  ArrowLeft, Trophy, Crown, Sparkles, Heart, Mic, BookOpen,
  MessageSquare, ShoppingBag, Infinity as InfinityIcon, Award,
  TrendingUp, Medal, Users, Star, ChevronRight, Lock
} from 'lucide-react'

const ICON_MAP: Record<string, any> = {
  sparkles: Sparkles,
  'book-open': BookOpen,
  'message-square': MessageSquare,
  mic: Mic,
  trophy: Trophy,
  heart: Heart,
  'shopping-bag': ShoppingBag,
  infinity: InfinityIcon,
  crown: Crown,
}

// Seed leaderboard
const SEED_LEADERBOARD = [
  { id: 'u1', name: '陈小春', avatar: 'https://i.pravatar.cc/120?img=1', points: 58420, level: 8, title: '资深买手', growth: 12 },
  { id: 'u2', name: '林佳慧', avatar: 'https://i.pravatar.cc/120?img=5', points: 42180, level: 7, title: '辩论专家', growth: 8 },
  { id: 'u3', name: '李思源', avatar: 'https://i.pravatar.cc/120?img=3', points: 38290, level: 6, title: '资讯达人', growth: 5 },
  { id: 'u4', name: '赵敏', avatar: 'https://i.pravatar.cc/120?img=8', points: 31050, level: 5, title: '理性消费', growth: -2 },
  { id: 'u5', name: '钱学森', avatar: 'https://i.pravatar.cc/120?img=12', points: 28430, level: 5, title: '活跃用户', growth: 15 },
  { id: 'u6', name: '孙小美', avatar: 'https://i.pravatar.cc/120?img=9', points: 23120, level: 4, title: '新晋用户', growth: 22 },
  { id: 'u7', name: '周海', avatar: 'https://i.pravatar.cc/120?img=11', points: 18450, level: 4, title: '探索者', growth: 3 },
  { id: 'u8', name: '吴芳', avatar: 'https://i.pravatar.cc/120?img=10', points: 15200, level: 3, title: '路人甲', growth: -1 },
]

const TITLES = [
  { range: [0, 1000], title: '初识 Versa', icon: Sparkles, color: 'from-slate-400 to-slate-500' },
  { range: [1000, 5000], title: '探索者', icon: Heart, color: 'from-pink-400 to-rose-500' },
  { range: [5000, 15000], title: '活跃用户', icon: Star, color: 'from-amber-400 to-orange-500' },
  { range: [15000, 30000], title: '资深买手', icon: Trophy, color: 'from-cyan-400 to-blue-500' },
  { range: [30000, 60000], title: '辩论专家', icon: Mic, color: 'from-violet-400 to-purple-500' },
  { range: [60000, Infinity], title: 'Versa 传奇', icon: Crown, color: 'from-amber-500 to-rose-600' },
]

function getTitle(points: number) {
  return [...TITLES].reverse().find((t) => points >= t.range[0]) || TITLES[0]
}

function getNextTitle(points: number) {
  return TITLES.find((t) => points < t.range[1])
}

export function AchievementsPage() {
  const navigate = useNavigate()
  const { user } = useVersa()
  const points = user.points || 0
  const [tab, setTab] = useState<'all' | 'earned' | 'locked'>('all')

  const title = getTitle(points)
  const nextTitle = getNextTitle(points)
  const TitleIcon = title.icon
  const NextIcon = nextTitle?.icon

  const earned = allBadges.filter((b) => b.earnedAt)
  const locked = allBadges.filter((b) => !b.earnedAt)

  const filtered = useMemo(() => {
    if (tab === 'earned') return earned
    if (tab === 'locked') return locked
    return allBadges
  }, [tab])

  // Insert my position in leaderboard
  const myEntry = { id: 'me', name: '我', avatar: user.avatar, points, level: user.level || 1, title: title.title, growth: 5 }
  const myRank = SEED_LEADERBOARD.filter((u) => u.points > points).length + 1
  const fullLeaderboard = [...SEED_LEADERBOARD, myEntry]
    .sort((a, b) => b.points - a.points)
    .map((u, i) => ({ ...u, rank: i + 1 }))

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      {/* Hero: my level */}
      <div className={cn('rounded-3xl bg-gradient-to-br p-8 text-white shadow-2xl relative overflow-hidden', title.color)}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className={cn('w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl', title.color)}>
            <TitleIcon className="w-12 h-12" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-white/80 mb-1">当前称号</p>
            <h1 className="text-4xl font-black mb-2">{title.title}</h1>
            <p className="text-white/90">Lv.{user.level || 1} · {points.toLocaleString()} 积分</p>
            {nextTitle && (
              <div className="mt-4 max-w-md">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1">
                    {NextIcon && <NextIcon className="w-3 h-3" />} 距离 {nextTitle.title}
                  </span>
                  <span>{points.toLocaleString()} / {nextTitle.range[1].toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (points / nextTitle.range[1]) * 100)}%` }}
                    transition={{ duration: 1 }}
                    className="h-full bg-white"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-white/80">我的排名</p>
            <p className="text-5xl font-black">#{myRank}</p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatBlock label="已获成就" value={earned.length} icon={Award} color="from-emerald-500 to-green-500" />
        <StatBlock label="未解锁" value={locked.length} icon={Lock} color="from-ink-400 to-ink-500" />
        <StatBlock label="今日积分" value={+128} icon={Sparkles} color="from-amber-500 to-orange-500" suffix="+" />
        <StatBlock label="连续签到" value={12} icon={Trophy} color="from-rose-500 to-pink-500" suffix="天" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-ink-200 dark:border-ink-800 pb-3">
        {[
          { key: 'all', label: '全部' },
          { key: 'earned', label: `已获得 (${earned.length})` },
          { key: 'locked', label: `未解锁 (${locked.length})` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium transition',
              tab === t.key
                ? 'bg-nova-500 text-white shadow'
                : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Badges grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((b) => {
          const Icon = ICON_MAP[b.icon] || Award
          const isEarned = !!b.earnedAt
          return (
            <motion.div
              key={b.id}
              whileHover={{ y: -2 }}
              className={cn(
                'rounded-2xl p-4 border',
                isEarned
                  ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-200/60 dark:border-amber-800/60'
                  : 'bg-ink-50/50 dark:bg-ink-900/40 border-ink-200/60 dark:border-ink-800/60 opacity-60'
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                    isEarned
                      ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow'
                      : 'bg-ink-200 dark:bg-ink-800 text-ink-400'
                  )}
                >
                  {isEarned ? <Icon className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{b.name}</h3>
                  <p className="text-xs text-ink-500 mt-0.5 line-clamp-2">{b.description}</p>
                  {isEarned ? (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5">
                      ✓ {new Date(b.earnedAt).toLocaleDateString()} 获得
                    </p>
                  ) : (
                    <p className="text-[10px] text-ink-400 mt-1.5">未解锁</p>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            积分排行榜
          </h2>
          <p className="text-xs text-ink-500">每日 0 点更新</p>
        </div>
        <div className="space-y-1.5">
          {fullLeaderboard.map((u) => {
            const isMe = u.id === 'me'
            const isTop3 = u.rank <= 3
            const rankColor =
              u.rank === 1
                ? 'from-amber-400 to-yellow-500'
                : u.rank === 2
                ? 'from-slate-300 to-slate-400'
                : u.rank === 3
                ? 'from-amber-600 to-orange-700'
                : 'from-ink-200 to-ink-300'
            return (
              <div
                key={u.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl transition',
                  isMe
                    ? 'bg-gradient-to-r from-nova-100 to-fuchsia-100 dark:from-nova-950/30 dark:to-fuchsia-950/30 ring-2 ring-nova-500/40'
                    : 'hover:bg-ink-50 dark:hover:bg-ink-800/50'
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
                    rankColor
                  )}
                >
                  {u.rank}
                </div>
                <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm flex items-center gap-1.5">
                    {u.name}
                    {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-nova-500 text-white">我</span>}
                    {u.level >= 6 && <Crown className="w-3 h-3 text-amber-500" />}
                  </p>
                  <p className="text-xs text-ink-500">{u.title} · Lv.{u.level}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm">{u.points.toLocaleString()}</p>
                  <p
                    className={cn(
                      'text-[10px] flex items-center gap-0.5 justify-end',
                      u.growth > 0 ? 'text-emerald-500' : u.growth < 0 ? 'text-rose-500' : 'text-ink-400'
                    )}
                  >
                    <TrendingUp className={cn('w-2.5 h-2.5', u.growth < 0 && 'rotate-180')} />
                    {u.growth > 0 ? '+' : ''}
                    {u.growth}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatBlock({
  label,
  value,
  icon: Icon,
  color,
  suffix,
}: {
  label: string
  value: number
  icon: any
  color: string
  suffix?: string
}) {
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-4">
      <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-2', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold flex items-baseline">
        {value > 0 && '+'}
        {value}
        {suffix && <span className="text-sm text-ink-500 ml-0.5">{suffix}</span>}
      </div>
      <div className="text-xs text-ink-500 mt-0.5">{label}</div>
    </div>
  )
}
