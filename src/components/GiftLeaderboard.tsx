import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Crown, Medal, Sparkles, Heart, TrendingUp } from 'lucide-react'
import { cn, formatNumber, formatTimeAgo } from '../lib/utils'

const PERIODS = [
  { key: 'day', label: '日榜' },
  { key: 'week', label: '周榜' },
  { key: 'month', label: '月榜' },
] as const

const SEED_DATA = {
  day: [
    { rank: 1, user: '神秘富豪 A', avatar: 'https://i.pravatar.cc/100?img=33', value: 12500, room: '数码小王子', roomTopic: 'iPhone 16 首发' },
    { rank: 2, user: '打赏狂魔 B', avatar: 'https://i.pravatar.cc/100?img=44', value: 8900, room: '美食家 Lily', roomTopic: '618 厨电' },
    { rank: 3, user: '追星粉丝 C', avatar: 'https://i.pravatar.cc/100?img=55', value: 5600, room: '穿搭博主 Mia', roomTopic: '夏季穿搭' },
    { rank: 4, user: '探店达人 D', avatar: 'https://i.pravatar.cc/100?img=66', value: 3200, room: '美食家 Lily', roomTopic: '美食探店' },
    { rank: 5, user: '装备党 E', avatar: 'https://i.pravatar.cc/100?img=77', value: 2800, room: '数码小王子', roomTopic: '618 数码' },
    { rank: 6, user: '路人 F', avatar: 'https://i.pravatar.cc/100?img=88', value: 1900, room: '穿搭博主 Mia', roomTopic: '美妆分享' },
    { rank: 7, user: '学生党 G', avatar: 'https://i.pravatar.cc/100?img=99', value: 1200, room: '美妆博主 Ava', roomTopic: '平价彩妆' },
    { rank: 8, user: '上班族 H', avatar: 'https://i.pravatar.cc/100?img=12', value: 800, room: '数码小王子', roomTopic: '618 数码' },
  ],
  week: [
    { rank: 1, user: '神秘富豪 A', avatar: 'https://i.pravatar.cc/100?img=33', value: 68500, room: '数码小王子', roomTopic: 'iPhone 16 首发' },
    { rank: 2, user: '打赏狂魔 B', avatar: 'https://i.pravatar.cc/100?img=44', value: 42300, room: '美食家 Lily', roomTopic: '618 厨电' },
    { rank: 3, user: '追星粉丝 C', avatar: 'https://i.pravatar.cc/100?img=55', value: 28900, room: '穿搭博主 Mia', roomTopic: '夏季穿搭' },
    { rank: 4, user: 'VIP 大佬 I', avatar: 'https://i.pravatar.cc/100?img=23', value: 21500, room: '美妆博主 Ava', roomTopic: '618 美妆' },
    { rank: 5, user: '探店达人 D', avatar: 'https://i.pravatar.cc/100?img=66', value: 17800, room: '美食家 Lily', roomTopic: '美食探店' },
  ],
  month: [
    { rank: 1, user: '神秘富豪 A', avatar: 'https://i.pravatar.cc/100?img=33', value: 268500, room: '数码小王子', roomTopic: 'iPhone 16 首发' },
    { rank: 2, user: '打赏狂魔 B', avatar: 'https://i.pravatar.cc/100?img=44', value: 198700, room: '美食家 Lily', roomTopic: '618 厨电' },
    { rank: 3, user: '追星粉丝 C', avatar: 'https://i.pravatar.cc/100?img=55', value: 124500, room: '穿搭博主 Mia', roomTopic: '夏季穿搭' },
  ],
}

const STORAGE_KEY = 'versa:gift-leaderboard'
const FAVORITE_KEY = 'versa:leaderboard-favorites'

function loadFavorites(): number[] {
  try { return JSON.parse(localStorage.getItem(FAVORITE_KEY) || '[]') } catch { return [] }
}

function saveFavorites(favs: number[]) {
  try { localStorage.setItem(FAVORITE_KEY, JSON.stringify(favs)) } catch {}
}

export function GiftLeaderboard() {
  const [period, setPeriod] = useState<typeof PERIODS[number]['key']>('day')
  const [favorites, setFavorites] = useState<number[]>([])

  useEffect(() => {
    setFavorites(loadFavorites())
  }, [])

  const toggleFav = (rank: number) => {
    const next = favorites.includes(rank) ? favorites.filter((r) => r !== rank) : [...favorites, rank]
    setFavorites(next)
    saveFavorites(next)
  }

  const data = SEED_DATA[period]
  const max = data[0]?.value || 1

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-1.5">
          <Trophy className="w-5 h-5 text-amber-500" />礼物榜
        </h2>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'px-3 h-7 rounded-full text-xs font-medium',
                period === p.key ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 via-rose-50 to-pink-50 dark:from-amber-900/20 dark:via-rose-900/20 dark:to-pink-900/20 rounded-2xl p-3 border border-amber-200/40">
        <p className="text-[10px] text-ink-500 text-center">已收藏 <span className="font-bold text-rose-500">{favorites.length}</span> 位金主</p>
      </div>

      {data.length >= 3 && (
        <div className="grid grid-cols-3 gap-2 items-end">
          {[1, 0, 2].map((idx) => {
            const item = data[idx]
            const heights = ['h-32', 'h-40', 'h-24']
            const colors = ['from-amber-400 to-yellow-500', 'from-slate-300 to-slate-500', 'from-orange-400 to-amber-600']
            return (
              <motion.div
                key={item.rank}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center"
              >
                <div className="relative inline-block mb-1">
                  {idx === 0 && <Crown className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 text-amber-500" />}
                  <img src={item.avatar} alt={item.user} className="w-12 h-12 rounded-full border-2 border-white shadow-md mx-auto" />
                  <div className={cn('absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 rounded-full text-[9px] font-bold text-white', idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-500' : 'bg-orange-500')}>
                    #{item.rank}
                  </div>
                </div>
                <p className="text-xs font-bold truncate">{item.user}</p>
                <p className="text-[10px] text-rose-500 font-bold">¥{formatNumber(item.value)}</p>
                <div className={cn('mt-1 rounded-t-lg bg-gradient-to-b flex items-end justify-center pb-1', colors[idx], heights[idx])}>
                  <span className="text-white text-xs font-bold">{idx + 1}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <div className="space-y-1.5">
        {data.slice(3).map((item) => (
          <div key={item.rank} className="flex items-center gap-2 p-2 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
            <div className="w-7 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center text-sm font-bold text-ink-500">
              {item.rank}
            </div>
            <img src={item.avatar} alt={item.user} className="w-8 h-8 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{item.user}</p>
              <p className="text-[10px] text-ink-500 truncate">支持: {item.room} · {item.roomTopic}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-rose-500">¥{formatNumber(item.value)}</p>
              <button onClick={() => toggleFav(item.rank)} className="text-rose-500 text-[10px]">
                {favorites.includes(item.rank) ? '★ 已收藏' : '☆ 收藏'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {favorites.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl p-3 border border-rose-200/40">
          <p className="text-sm font-bold mb-2 flex items-center gap-1"><Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />我的关注</p>
          <div className="flex flex-wrap gap-1.5">
            {favorites.map((r) => {
              const u = data.find((d) => d.rank === r)
              if (!u) return null
              return (
                <div key={r} className="px-2 h-7 rounded-full bg-white/60 dark:bg-ink-900/40 border border-rose-200 flex items-center gap-1">
                  <img src={u.avatar} alt="" className="w-4 h-4 rounded-full" />
                  <span className="text-[10px] font-semibold">{u.user}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
