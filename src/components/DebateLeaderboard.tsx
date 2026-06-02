import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Scale, Trophy, ThumbsUp, ThumbsDown, MessageCircle, Sparkles, Crown, Award, Flame, BookOpen, Zap } from 'lucide-react'
import { cn, formatNumber, formatTimeAgo } from '../lib/utils'

const PERIODS = [
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'all', label: '总榜' },
] as const

const DEBATERS = [
  { rank: 1, name: '理性派 K', avatar: 'https://i.pravatar.cc/100?img=13', wins: 89, debates: 102, winRate: 87, points: 12800, specialty: '逻辑严密', streak: 12 },
  { rank: 2, name: '数据帝 L', avatar: 'https://i.pravatar.cc/100?img=24', wins: 76, debates: 89, winRate: 85, points: 11200, specialty: '数据引用', streak: 8 },
  { rank: 3, name: '雄辩家 M', avatar: 'https://i.pravatar.cc/100?img=35', wins: 68, debates: 95, winRate: 72, points: 9800, specialty: '激情澎湃', streak: 5 },
  { rank: 4, name: '哲学家 N', avatar: 'https://i.pravatar.cc/100?img=46', wins: 62, debates: 78, winRate: 79, points: 8400, specialty: '思辨深刻', streak: 6 },
  { rank: 5, name: '历史迷 O', avatar: 'https://i.pravatar.cc/100?img=57', wins: 55, debates: 72, winRate: 76, points: 7200, specialty: '以史为鉴', streak: 4 },
  { rank: 6, name: '反转侠 P', avatar: 'https://i.pravatar.cc/100?img=68', wins: 48, debates: 68, winRate: 70, points: 6100, specialty: '出其不意', streak: 3 },
  { rank: 7, name: '群众路线 Q', avatar: 'https://i.pravatar.cc/100?img=79', wins: 42, debates: 65, winRate: 64, points: 5300, specialty: '贴近民生', streak: 2 },
  { rank: 8, name: '小钢炮 R', avatar: 'https://i.pravatar.cc/100?img=80', wins: 38, debates: 60, winRate: 63, points: 4700, specialty: '火力全开', streak: 1 },
]

const HOT_DEBATES = [
  { id: 'h1', title: 'AI 时代, 教育应该教什么?', participants: 234, agree: 1240, disagree: 980, comments: 567, time: Date.now() - 3600000 * 2 },
  { id: 'h2', title: '工作 vs 生活, 你怎么选?', participants: 189, agree: 870, disagree: 1230, comments: 412, time: Date.now() - 3600000 * 5 },
  { id: 'h3', title: '消费降级是不是好趋势?', participants: 156, agree: 2100, disagree: 540, comments: 678, time: Date.now() - 86400000 },
]

const FOLLOW_KEY = 'versa:debate-follow'

function loadFollow(): string[] {
  try { return JSON.parse(localStorage.getItem(FOLLOW_KEY) || '[]') } catch { return [] }
}

function saveFollow(f: string[]) {
  try { localStorage.setItem(FOLLOW_KEY, JSON.stringify(f)) } catch {}
}

export function DebateLeaderboard() {
  const [period, setPeriod] = useState<typeof PERIODS[number]['key']>('week')
  const [follow, setFollow] = useState<string[]>([])

  useEffect(() => {
    setFollow(loadFollow())
  }, [])

  const toggle = (name: string) => {
    const next = follow.includes(name) ? follow.filter((n) => n !== name) : [...follow, name]
    setFollow(next)
    saveFollow(next)
  }

  const top3 = DEBATERS.slice(0, 3)
  const rest = DEBATERS.slice(3)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-1.5">
          <Scale className="w-5 h-5 text-violet-500" />辩论榜
        </h2>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'px-3 h-7 rounded-full text-xs font-medium',
                period === p.key ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 items-end">
        {[1, 0, 2].map((idx) => {
          const d = top3[idx]
          const heights = ['h-28', 'h-36', 'h-24']
          const colors = ['from-amber-400 to-yellow-500', 'from-slate-300 to-slate-500', 'from-orange-400 to-amber-600']
          return (
            <motion.div
              key={d.rank}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-center"
            >
              <div className="relative inline-block mb-1">
                {idx === 0 && <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 text-amber-500" />}
                <img src={d.avatar} alt={d.name} className="w-12 h-12 rounded-full border-2 border-white shadow-md mx-auto" />
                <div className={cn('absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 rounded-full text-[9px] font-bold text-white', idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-500' : 'bg-orange-500')}>
                  #{d.rank}
                </div>
              </div>
              <p className="text-xs font-bold truncate">{d.name}</p>
              <p className="text-[10px] text-violet-500 font-bold">{d.points} 分</p>
              <div className={cn('mt-1 rounded-t-lg bg-gradient-to-b flex items-end justify-center pb-1', colors[idx], heights[idx])}>
                <span className="text-white text-xs font-bold">{idx + 1}</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="space-y-1.5">
        {rest.map((d) => {
          const isFollow = follow.includes(d.name)
          return (
            <div key={d.rank} className="bg-white/60 dark:bg-ink-900/30 rounded-xl p-2.5 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center text-xs font-bold text-ink-500">
                {d.rank}
              </div>
              <img src={d.avatar} alt={d.name} className="w-8 h-8 rounded-full" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold truncate">{d.name}</p>
                  {d.streak >= 5 && <Flame className="w-3 h-3 text-rose-500" />}
                </div>
                <p className="text-[10px] text-ink-500 flex items-center gap-1">
                  <span>{d.specialty}</span>
                  <span>·</span>
                  <ThumbsUp className="w-2.5 h-2.5" />{d.wins}胜
                  <span>·</span>
                  <span>{d.winRate}% 胜率</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-violet-500">{d.points}</p>
                <button onClick={() => toggle(d.name)} className="text-[10px] text-violet-500">
                  {isFollow ? '★ 已关注' : '+ 关注'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div>
        <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-rose-500" />热门辩题
        </h3>
        <div className="space-y-1.5">
          {HOT_DEBATES.map((d) => {
            const total = d.agree + d.disagree
            const agreePercent = (d.agree / total) * 100
            return (
              <div key={d.id} className="bg-white/60 dark:bg-ink-900/30 rounded-xl p-2.5 border border-ink-200/60 dark:border-ink-800/60">
                <p className="text-sm font-semibold line-clamp-1 mb-1.5">{d.title}</p>
                <div className="flex h-1.5 rounded-full overflow-hidden bg-ink-100 dark:bg-ink-800">
                  <div className="bg-emerald-500" style={{ width: `${agreePercent}%` }} />
                  <div className="bg-rose-500" style={{ width: `${100 - agreePercent}%` }} />
                </div>
                <div className="flex items-center justify-between text-[10px] text-ink-500 mt-1">
                  <span>{d.participants} 参与 · {formatTimeAgo(new Date(d.time).toISOString())}</span>
                  <span><ThumbsUp className="inline w-2.5 h-2.5" />{formatNumber(d.agree)} : {formatNumber(d.disagree)}<ThumbsDown className="inline w-2.5 h-2.5 ml-1" /></span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl p-3 border border-violet-200/40">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          <span className="text-xs font-bold">积分规则</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="flex items-center gap-1.5"><Zap className="w-3 h-3 text-amber-500" />参与辩论 +10</div>
          <div className="flex items-center gap-1.5"><Trophy className="w-3 h-3 text-rose-500" />辩论获胜 +50</div>
          <div className="flex items-center gap-1.5"><MessageCircle className="w-3 h-3 text-blue-500" />被点赞 +2/次</div>
          <div className="flex items-center gap-1.5"><Award className="w-3 h-3 text-violet-500" />达成成就 +200</div>
        </div>
      </div>
    </div>
  )
}
