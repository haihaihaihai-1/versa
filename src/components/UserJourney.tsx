import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { User, ShoppingBag, Heart, MessageCircle, Scale, Sparkles, Award, Briefcase, Camera, Star } from 'lucide-react'
import { cn } from '../lib/utils'

const NODES = [
  { day: 0, label: '注册', icon: User, color: 'from-slate-400 to-slate-500', desc: '欢迎加入 Versa!' },
  { day: 1, label: '首次浏览', icon: ShoppingBag, color: 'from-blue-400 to-blue-500', desc: '浏览商品' },
  { day: 3, label: '首次点赞', icon: Heart, color: 'from-rose-400 to-rose-500', desc: '点赞 1 篇内容' },
  { day: 5, label: '首次评论', icon: MessageCircle, color: 'from-amber-400 to-amber-500', desc: '发表第一条评论' },
  { day: 7, label: '关注创作者', icon: Star, color: 'from-violet-400 to-violet-500', desc: '关注 3 个创作者' },
  { day: 14, label: '首次下单', icon: ShoppingBag, color: 'from-emerald-400 to-emerald-500', desc: '完成首单' },
  { day: 21, label: '首次辩论', icon: Scale, color: 'from-pink-400 to-pink-500', desc: '参与一场辩论' },
  { day: 30, label: '首次直播', icon: Camera, color: 'from-orange-400 to-orange-500', desc: '观看直播' },
  { day: 45, label: '首次创作', icon: Sparkles, color: 'from-cyan-400 to-cyan-500', desc: '发布第一篇内容' },
  { day: 60, label: '获得成就', icon: Award, color: 'from-yellow-400 to-orange-500', desc: '解锁首个徽章' },
  { day: 90, label: '成为创作者', icon: Briefcase, color: 'from-fuchsia-500 to-rose-500', desc: '认证为创作者' },
]

const STORAGE_KEY = 'versa:journey-completed'

function loadCompleted(): number[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function saveCompleted(c: number[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)) } catch {}
}

export function UserJourney() {
  const [completed, setCompleted] = useState<number[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCompleted(loadCompleted())
  }, [])

  useEffect(() => { if (completed.length) saveCompleted(completed) }, [completed])

  const complete = (day: number) => {
    if (completed.includes(day)) return
    setCompleted([...completed, day])
  }

  const progress = (completed.length / NODES.length) * 100
  const next = NODES.find((n) => !completed.includes(n.day))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">我的旅程</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">在 Versa 的成长足迹</p>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] opacity-90">
            <span>已完成 {completed.length}/{NODES.length}</span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-white"
            />
          </div>
        </div>
      </div>

      {next && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-3 border border-amber-200/40">
          <p className="text-[10px] text-ink-500 mb-0.5">下一站</p>
          <p className="text-base font-bold">{next.label}</p>
          <p className="text-xs text-ink-500 mt-0.5">{next.desc}</p>
        </div>
      )}

      <div ref={containerRef} className="relative pl-8 space-y-3">
        <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gradient-to-b from-blue-400 via-violet-400 to-rose-400" />

        {NODES.map((node) => {
          const isCompleted = completed.includes(node.day)
          const Icon = node.icon
          return (
            <motion.div
              key={node.day}
              whileHover={{ x: 4 }}
              className="relative flex items-start gap-3"
            >
              <button
                onClick={() => complete(node.day)}
                className={cn(
                  'absolute -left-8 w-7 h-7 rounded-full flex items-center justify-center text-white shadow-md transition',
                  isCompleted ? `bg-gradient-to-br ${node.color}` : 'bg-ink-200 dark:bg-ink-800'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
              <div className={cn(
                'flex-1 rounded-2xl p-3 border',
                isCompleted
                  ? 'bg-white/80 dark:bg-ink-900/40 border-ink-200/60 dark:border-ink-800/60'
                  : 'bg-ink-50/40 dark:bg-ink-900/20 border-dashed border-ink-200/60 dark:border-ink-800/60 opacity-70'
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-bold">{node.label}</p>
                  <span className="text-[10px] text-ink-500">Day {node.day}</span>
                  {isCompleted && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-white font-bold">✓</span>}
                </div>
                <p className="text-xs text-ink-500">{node.desc}</p>
                {!isCompleted && (
                  <button
                    onClick={() => complete(node.day)}
                    className="mt-2 px-2.5 h-6 rounded-full bg-nova-500 text-white text-[10px] font-semibold"
                  >
                    标记完成
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
        <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5"><Award className="w-4 h-4 text-amber-500" />旅程奖励</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-rose-500" />完成 30% 解锁新秀奖
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />完成 60% 解锁活跃奖
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-violet-500" />完成 80% 解锁达人奖
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-cyan-500" />完成 100% 解锁传奇奖
          </div>
        </div>
      </div>
    </div>
  )
}
