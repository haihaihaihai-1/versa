import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellRing, Calendar, Users, Video, X, Check } from 'lucide-react'
import { cn, formatNumber, formatTimeAgo } from '../lib/utils'
import { toast } from './ui/Toaster'

export interface LiveHost {
  id: string
  name: string
  avatar: string
  followers: number
  category: string
  nextLive: string
  nextLiveTopic: string
  isLive: boolean
  isFollowed: boolean
}

const DEMO_HOSTS: LiveHost[] = [
  { id: 'h1', name: '数码小王子', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=prince', followers: 280000, category: '数码', nextLive: '今晚 20:00', nextLiveTopic: 'iPhone 16 首发体验', isLive: true, isFollowed: true },
  { id: 'h2', name: '厨房研究所', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kitchen', followers: 156000, category: '美食', nextLive: '明天 19:30', nextLiveTopic: '618 厨电大促', isLive: false, isFollowed: true },
  { id: 'h3', name: '美妆师姐 Lily', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lily', followers: 420000, category: '美妆', nextLive: '今晚 21:00', nextLiveTopic: '夏季彩妆新品', isLive: false, isFollowed: false },
  { id: 'h4', name: '健身教练 Kevin', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kevin', followers: 95000, category: '运动', nextLive: '周三 18:00', nextLiveTopic: '减脂餐做法', isLive: false, isFollowed: false },
  { id: 'h5', name: '时尚博主 Mia', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mia', followers: 312000, category: '服饰', nextLive: '周末 14:00', nextLiveTopic: '夏季穿搭', isLive: false, isFollowed: false },
]

const STORAGE_KEY = 'versa:live-subs'

function load(): LiveHost[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return DEMO_HOSTS
}

function save(hosts: LiveHost[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(hosts)) } catch {}
}

export function LiveSubscriptions() {
  const [hosts, setHosts] = useState<LiveHost[]>([])
  const [filter, setFilter] = useState<'all' | 'following' | 'live'>('all')

  useEffect(() => {
    setHosts(load())
  }, [])

  useEffect(() => {
    if (hosts.length > 0) save(hosts)
  }, [hosts])

  const toggleFollow = (id: string) => {
    setHosts((arr) => {
      const next = arr.map((h) => (h.id === id ? { ...h, isFollowed: !h.isFollowed } : h))
      const target = next.find((h) => h.id === id)
      if (target?.isFollowed) toast(`已订阅 ${target.name} 的直播`, 'success')
      else toast(`已取消订阅`, 'info')
      return next
    })
  }

  const setReminder = (id: string) => {
    toast('已开启开播提醒, 主播开播时会通知你', 'success')
  }

  const filtered = hosts.filter((h) => {
    if (filter === 'following') return h.isFollowed
    if (filter === 'live') return h.isLive
    return true
  })

  const followingCount = hosts.filter((h) => h.isFollowed).length
  const liveCount = hosts.filter((h) => h.isLive).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-1.5">
          <Video className="w-5 h-5 text-rose-500" />
          直播订阅
        </h3>
        <div className="flex items-center gap-1 text-xs text-ink-500">
          <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/40 text-rose-600 rounded-full">
            {liveCount} 直播中
          </span>
          <span className="px-2 py-0.5 bg-nova-100 dark:bg-nova-900/40 text-nova-600 rounded-full">
            订阅 {followingCount}
          </span>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'all', label: '全部', icon: Users },
          { key: 'following', label: '我的订阅', icon: Bell },
          { key: 'live', label: '正在直播', icon: Video },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={cn(
              'flex items-center gap-1 px-3 h-7 rounded-full text-xs font-medium flex-shrink-0 transition',
              filter === f.key
                ? 'bg-rose-500 text-white'
                : 'bg-white dark:bg-ink-800 text-ink-600 dark:text-ink-300 hover:bg-ink-50'
            )}
          >
            <f.icon className="w-3 h-3" />
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-500">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无订阅</p>
          </div>
        ) : (
          filtered.map((h) => (
            <motion.div
              key={h.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={h.avatar} alt={h.name} className="w-12 h-12 rounded-full bg-ink-100" />
                  {h.isLive && (
                    <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-bold rounded-full animate-pulse">
                      LIVE
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="font-semibold text-sm truncate">{h.name}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-ink-500">
                      {h.category}
                    </span>
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">{formatNumber(h.followers)} 粉丝</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {h.isFollowed && (
                    <button
                      onClick={() => setReminder(h.id)}
                      className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 hover:scale-110 transition"
                      title="开播提醒"
                    >
                      <BellRing className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => toggleFollow(h.id)}
                    className={cn(
                      'px-3 h-7 rounded-lg text-xs font-semibold transition',
                      h.isFollowed
                        ? 'bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300'
                        : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                    )}
                  >
                    {h.isFollowed ? (
                      <><Check className="w-3 h-3 inline mr-0.5" />已订阅</>
                    ) : (
                      '+ 订阅'
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-ink-100 dark:border-ink-800 flex items-center gap-2 text-xs">
                <Calendar className="w-3 h-3 text-ink-400" />
                <span className="text-ink-500">下次直播:</span>
                <span className="font-medium text-rose-500">{h.nextLive}</span>
                <span className="text-ink-700 dark:text-ink-300">· {h.nextLiveTopic}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
