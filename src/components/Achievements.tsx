import { motion } from 'framer-motion'
import { Award, Crown, Star, Trophy, Zap, Heart, MessageCircle, ShoppingBag, Video, Sparkles, Lock } from 'lucide-react'
import { cn, formatNumber } from '../lib/utils'

const LEVELS = [
  { level: 1, name: '初来乍到', exp: 0, color: 'from-slate-400 to-slate-500', icon: Star },
  { level: 2, name: '活跃用户', exp: 100, color: 'from-blue-400 to-blue-500', icon: Heart },
  { level: 3, name: '购物达人', exp: 500, color: 'from-cyan-400 to-cyan-500', icon: ShoppingBag },
  { level: 4, name: '内容创作者', exp: 2000, color: 'from-violet-400 to-violet-500', icon: MessageCircle },
  { level: 5, name: '直播明星', exp: 5000, color: 'from-pink-400 to-pink-500', icon: Video },
  { level: 6, name: '社区名人', exp: 10000, color: 'from-rose-400 to-rose-500', icon: Sparkles },
  { level: 7, name: 'Versa 之星', exp: 30000, color: 'from-amber-400 to-orange-500', icon: Crown },
  { level: 8, name: '传说会员', exp: 100000, color: 'from-yellow-300 via-amber-400 to-orange-500', icon: Trophy },
]

const ACHIEVEMENTS = [
  { id: 'a1', name: '首次购物', desc: '完成第 1 笔订单', icon: ShoppingBag, color: 'text-rose-500', unlocked: true, date: '2024-12-01' },
  { id: 'a2', name: '百变评论', desc: '发表 100 条评价', icon: MessageCircle, color: 'text-blue-500', unlocked: true, date: '2025-02-15' },
  { id: 'a3', name: '直播新手', desc: '观看直播 10 小时', icon: Video, color: 'text-violet-500', unlocked: true, date: '2025-03-20' },
  { id: 'a4', name: '送礼达人', desc: '送出 100 个礼物', icon: Sparkles, color: 'text-amber-500', unlocked: true, date: '2025-04-08' },
  { id: 'a5', name: '万粉博主', desc: '粉丝突破 1 万', icon: Crown, color: 'text-pink-500', unlocked: true, date: '2025-05-12' },
  { id: 'a6', name: '辩论精英', desc: '辩论胜率 80%', icon: Trophy, color: 'text-emerald-500', unlocked: false },
  { id: 'a7', name: '百日打卡', desc: '连续登录 100 天', icon: Zap, color: 'text-cyan-500', unlocked: true, date: '2025-05-30' },
  { id: 'a8', name: '荣誉会员', desc: '达到 7 级', icon: Award, color: 'text-violet-600', unlocked: false },
  { id: 'a9', name: '超级买手', desc: '购物满 100 件', icon: Star, color: 'text-amber-500', unlocked: false },
  { id: 'a10', name: '创作者', desc: '发布 50 篇内容', icon: Award, color: 'text-rose-500', unlocked: false },
  { id: 'a11', name: '直播王者', desc: '直播 100 场', icon: Trophy, color: 'text-orange-500', unlocked: false },
  { id: 'a12', name: '顶级赞助', desc: '打赏 10000 元', icon: Crown, color: 'text-yellow-500', unlocked: false },
]

export function Achievements() {
  const currentExp = 2340
  const currentLevel = LEVELS.find((l) => l.level === 3) || LEVELS[0]
  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1) || LEVELS[LEVELS.length - 1]
  const progress = currentLevel.exp === nextLevel.exp ? 100 : ((currentExp - currentLevel.exp) / (nextLevel.exp - currentLevel.exp)) * 100
  const unlocked = ACHIEVEMENTS.filter((a) => a.unlocked).length

  return (
    <div className="space-y-3">
      <div className={cn('rounded-2xl p-5 bg-gradient-to-br text-white', currentLevel.color)}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
            <currentLevel.icon className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] opacity-80">当前等级</p>
            <p className="text-2xl font-bold">Lv.{currentLevel.level} · {currentLevel.name}</p>
            <p className="text-[10px] opacity-80">已解锁 {unlocked}/{ACHIEVEMENTS.length} 徽章</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] opacity-90">
            <span>经验 {formatNumber(currentExp)} / {formatNumber(nextLevel.exp)}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-white/80"
            />
          </div>
          <p className="text-[10px] opacity-80 text-center">距 {nextLevel.name} 还差 {formatNumber(nextLevel.exp - currentExp)} 经验</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-amber-500" />等级体系
        </h3>
        <div className="grid grid-cols-4 gap-1.5">
          {LEVELS.map((l) => {
            const reached = currentExp >= l.exp
            const isCurrent = l.level === currentLevel.level
            return (
              <div
                key={l.level}
                className={cn(
                  'rounded-xl p-2 text-center border',
                  isCurrent ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20' : reached ? 'border-ink-200 dark:border-ink-700 bg-white/40' : 'border-dashed border-ink-200 dark:border-ink-800 opacity-60'
                )}
              >
                <div className={cn('w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-white', reached ? `bg-gradient-to-br ${l.color}` : 'bg-ink-200 dark:bg-ink-800')}>
                  <l.icon className="w-4 h-4" />
                </div>
                <p className="text-[10px] font-bold mt-0.5">Lv.{l.level}</p>
                <p className="text-[9px] text-ink-500 line-clamp-1">{l.name}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <Award className="w-4 h-4 text-rose-500" />徽章墙
          </h3>
          <span className="text-[10px] text-ink-500">{unlocked}/{ACHIEVEMENTS.length} 已解锁</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const Icon = a.icon
            return (
              <div
                key={a.id}
                className={cn(
                  'rounded-2xl p-2.5 text-center border',
                  a.unlocked
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200/40'
                    : 'bg-ink-50 dark:bg-ink-900/30 border-dashed border-ink-300 dark:border-ink-700 opacity-60'
                )}
              >
                <div className={cn('w-10 h-10 mx-auto rounded-xl flex items-center justify-center mb-1', a.unlocked ? 'bg-white/60' : 'bg-ink-200 dark:bg-ink-800')}>
                  {a.unlocked ? <Icon className={cn('w-5 h-5', a.color)} /> : <Lock className="w-4 h-4 text-ink-400" />}
                </div>
                <p className="text-[10px] font-bold line-clamp-1">{a.name}</p>
                <p className="text-[9px] text-ink-500 line-clamp-1">{a.desc}</p>
                {a.unlocked && a.date && <p className="text-[8px] text-ink-400 mt-0.5">{a.date}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
