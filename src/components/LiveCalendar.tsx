import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Video, Calendar, Bell, Users, Clock, Star, Play, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, formatNumber } from '../lib/utils'
import { toast } from './ui/Toaster'

interface ScheduledLive {
  id: string
  hostName: string
  hostAvatar: string
  topic: string
  category: string
  scheduledAt: number
  duration: number
  followers: number
  subscribed: boolean
  preview: string
  isHot: boolean
}

const SCHEDULED: ScheduledLive[] = [
  { id: 'l1', hostName: '数码小王子', hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=prince', topic: 'iPhone 16 首发体验', category: '数码', scheduledAt: Date.now() + 3600000 * 2, duration: 90, followers: 280000, subscribed: false, preview: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400', isHot: true },
  { id: 'l2', hostName: '厨房研究所', hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kitchen', topic: '618 厨电大促专场', category: '美食', scheduledAt: Date.now() + 3600000 * 5, duration: 120, followers: 156000, subscribed: true, preview: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400', isHot: false },
  { id: 'l3', hostName: '美妆师姐 Lily', hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lily', topic: '夏季彩妆新品', category: '美妆', scheduledAt: Date.now() + 3600000 * 9, duration: 60, followers: 420000, subscribed: false, preview: 'https://images.unsplash.com/photo-1522335789203-aaa2f6c0d2e0?w=400', isHot: true },
  { id: 'l4', hostName: '时尚博主 Mia', hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mia', topic: '夏季穿搭灵感', category: '服饰', scheduledAt: Date.now() + 86400000 + 3600000 * 4, duration: 75, followers: 312000, subscribed: false, preview: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400', isHot: false },
  { id: 'l5', hostName: '健身教练 Kevin', hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kevin', topic: '减脂餐做法教学', category: '运动', scheduledAt: Date.now() + 86400000 * 2 + 3600000 * 6, duration: 45, followers: 95000, subscribed: true, preview: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400', isHot: false },
  { id: 'l6', hostName: '美妆师姐 Lily', hostAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lily', topic: '抗老精华横评', category: '美妆', scheduledAt: Date.now() + 86400000 * 3, duration: 60, followers: 420000, subscribed: false, preview: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400', isHot: false },
]

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function LiveCalendar() {
  const [subs, setSubs] = useState<Set<string>>(new Set(SCHEDULED.filter((l) => l.subscribed).map((l) => l.id)))
  const [view, setView] = useState<'list' | 'calendar'>('list')

  const toggleSub = (id: string) => {
    setSubs((s) => {
      const next = new Set(s)
      if (next.has(id)) { next.delete(id); toast('已取消提醒', 'info') }
      else { next.add(id); toast('开播前 10 分钟会通知你', 'success') }
      return next
    })
  }

  const sorted = [...SCHEDULED].sort((a, b) => a.scheduledAt - b.scheduledAt)

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const isToday = d.toDateString() === today.toDateString()
    const isTomorrow = d.toDateString() === tomorrow.toDateString()
    const time = `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`
    if (isToday) return `今天 ${time}`
    if (isTomorrow) return `明天 ${time}`
    if (d.getTime() - today.getTime() < 86400000 * 7) return `${WEEKDAYS[d.getDay()]} ${time}`
    return `${d.getMonth() + 1}/${d.getDate()} ${time}`
  }

  const liveCount = SCHEDULED.filter((l) => l.subscribed).length
  const hotCount = SCHEDULED.filter((l) => l.isHot).length

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-1.5">
              <Calendar className="w-5 h-5" />直播日历
            </h2>
            <p className="text-xs opacity-80 mt-0.5">{SCHEDULED.length} 场即将开播 · {liveCount} 场已订阅 · {hotCount} 场热门</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setView('list')}
              className={cn('px-2 h-7 rounded text-xs', view === 'list' ? 'bg-white/30' : 'bg-white/10')}
            >列表</button>
            <button
              onClick={() => setView('calendar')}
              className={cn('px-2 h-7 rounded text-xs', view === 'calendar' ? 'bg-white/30' : 'bg-white/10')}
            >日历</button>
          </div>
        </div>
      </div>

      {view === 'list' ? (
        <div className="space-y-2">
          {sorted.map((l) => {
            const isSub = subs.has(l.id)
            const timeUntil = l.scheduledAt - Date.now()
            const hours = Math.floor(timeUntil / 3600000)
            return (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 overflow-hidden flex"
              >
                <div className="w-24 h-24 flex-shrink-0 bg-gradient-to-br from-rose-200 to-pink-300 relative">
                  <img src={l.preview} alt={l.topic} className="w-full h-full object-cover" />
                  {l.isHot && (
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-amber-500 rounded text-white text-[9px] font-bold flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 fill-current" />热门
                    </div>
                  )}
                  <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 rounded text-white text-[9px]">
                    {l.duration} 分钟
                  </div>
                </div>
                <div className="flex-1 p-2.5 flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <img src={l.hostAvatar} alt={l.hostName} className="w-5 h-5 rounded-full" />
                    <span className="text-[10px] text-ink-500 truncate">{l.hostName}</span>
                    <span className="text-[10px] px-1 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-ink-500">{l.category}</span>
                  </div>
                  <h3 className="font-semibold text-sm mt-0.5 line-clamp-1">{l.topic}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-ink-500 mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(l.scheduledAt)}
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <Users className="w-2.5 h-2.5" />
                      {formatNumber(l.followers)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-auto">
                    <button
                      onClick={() => toggleSub(l.id)}
                      className={cn(
                        'flex-1 h-6 rounded text-[10px] font-semibold flex items-center justify-center gap-1',
                        isSub ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600' : 'bg-rose-500 text-white'
                      )}
                    >
                      <Bell className="w-2.5 h-2.5" />
                      {isSub ? '已订阅提醒' : '订阅开播提醒'}
                    </button>
                    <Link
                      to="/shop/live"
                      className="h-6 px-2 rounded bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300 text-[10px] flex items-center"
                    >
                      <Play className="w-2.5 h-2.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-3">
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-ink-500 mb-2">
            {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 28 }, (_, i) => {
              const d = new Date()
              d.setDate(d.getDate() + i - new Date().getDay())
              const dayLives = SCHEDULED.filter((l) => new Date(l.scheduledAt).toDateString() === d.toDateString())
              return (
                <div key={i} className={cn('aspect-square p-1 rounded-lg text-[10px] flex flex-col items-center justify-start', i === new Date().getDay() ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-500 font-bold' : 'hover:bg-ink-100 dark:hover:bg-ink-800')}>
                  <span>{d.getDate()}</span>
                  {dayLives.length > 0 && (
                    <div className="mt-0.5 flex flex-col gap-0.5 w-full">
                      {dayLives.slice(0, 2).map((l) => (
                        <div key={l.id} className="w-full h-1 rounded bg-rose-500" />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
