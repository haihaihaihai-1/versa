import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from '../components/ui/Toaster'
import { Button } from '../components/ui/Button'
import { versa } from '../store/versa'
import { cn, uid } from '../lib/utils'
import {
  Calendar, Clock, Tv, Bell, BellRing, ChevronLeft, ChevronRight,
  Sparkles, Users, Flame, Play, Heart, Star
} from 'lucide-react'

interface ScheduleItem {
  id: string
  title: string
  host: string
  category: 'tech' | 'beauty' | 'fashion' | 'home' | 'food' | 'sports'
  startAt: string  // ISO
  durationMin: number
  viewerCount: number
  tags: string[]
  description: string
  cover: string
  status: 'live' | 'upcoming' | 'ended'
}

const CATEGORY_COLORS: Record<ScheduleItem['category'], string> = {
  tech: 'from-blue-500 to-indigo-500',
  beauty: 'from-pink-500 to-rose-500',
  fashion: 'from-fuchsia-500 to-purple-500',
  home: 'from-amber-500 to-orange-500',
  food: 'from-emerald-500 to-green-500',
  sports: 'from-red-500 to-orange-500',
}

const CATEGORY_LABELS: Record<ScheduleItem['category'], string> = {
  tech: '数码',
  beauty: '美妆',
  fashion: '穿搭',
  home: '家居',
  food: '美食',
  sports: '运动',
}

const NOW = new Date()
const tomorrow = (n: number, h = 20, m = 0) => {
  const d = new Date(NOW)
  d.setDate(d.getDate() + n)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

const SEED: ScheduleItem[] = [
  {
    id: 'ls-1',
    title: '618 数码狂欢夜 · 直降 1500 + 送 200 券',
    host: '数码小仙女',
    category: 'tech',
    startAt: tomorrow(0, 20, 0),
    durationMin: 120,
    viewerCount: 234567,
    tags: ['数码', 'iPhone', '限时秒杀'],
    description: '全场数码好物直接放价，错过等一年！',
    cover: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=600&q=80&auto=format&fit=crop',
    status: 'live',
  },
  {
    id: 'ls-2',
    title: '美妆专场 · 神仙水买一送一',
    host: '美妆博主林林',
    category: 'beauty',
    startAt: tomorrow(1, 19, 30),
    durationMin: 90,
    viewerCount: 89432,
    tags: ['美妆', 'SK-II', '兰蔻'],
    description: '今晚就播 SK-II / 兰蔻 / 雅诗兰黛专场',
    cover: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600&q=80&auto=format&fit=crop',
    status: 'upcoming',
  },
  {
    id: 'ls-3',
    title: '春日穿搭 · 职场通勤 5 套方案',
    host: '穿搭达人小敏',
    category: 'fashion',
    startAt: tomorrow(1, 21, 0),
    durationMin: 60,
    viewerCount: 0,
    tags: ['穿搭', '职场', '西装'],
    description: '5 套不同预算的春日职场穿搭，附单品清单。',
    cover: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=600&q=80&auto=format&fit=crop',
    status: 'upcoming',
  },
  {
    id: 'ls-4',
    title: '智能家居好物推荐',
    host: '家居改造师 Simon',
    category: 'home',
    startAt: tomorrow(2, 15, 0),
    durationMin: 75,
    viewerCount: 0,
    tags: ['家居', '智能'],
    description: '从扫地机到氛围灯，打造 5000 元智能家。',
    cover: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&q=80&auto=format&fit=crop',
    status: 'upcoming',
  },
  {
    id: 'ls-5',
    title: '厨房好物 · 早餐 5 分钟',
    host: '美食家阿福',
    category: 'food',
    startAt: tomorrow(2, 20, 0),
    durationMin: 60,
    viewerCount: 0,
    tags: ['美食', '早餐', '厨具'],
    description: '5 个让你秒变大厨的小家电实测。',
    cover: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80&auto=format&fit=crop',
    status: 'upcoming',
  },
  {
    id: 'ls-6',
    title: '运动专场 · 跑鞋/瑜伽/健身',
    host: '健身教练 Zack',
    category: 'sports',
    startAt: tomorrow(3, 19, 0),
    durationMin: 90,
    viewerCount: 0,
    tags: ['运动', '跑鞋', '瑜伽'],
    description: '春夏运动装备清单，满 500 减 80。',
    cover: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80&auto=format&fit=crop',
    status: 'upcoming',
  },
  {
    id: 'ls-7',
    title: '高端护肤 · 黑绷带/鱼子酱',
    host: '美妆博主林林',
    category: 'beauty',
    startAt: tomorrow(4, 20, 30),
    durationMin: 90,
    viewerCount: 0,
    tags: ['高端', '抗老'],
    description: '千元面霜专场，老客专属价。',
    cover: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80&auto=format&fit=crop',
    status: 'upcoming',
  },
  {
    id: 'ls-8',
    title: '数码 · 笔记本选购指南',
    host: '数码小仙女',
    category: 'tech',
    startAt: tomorrow(5, 19, 0),
    durationMin: 120,
    viewerCount: 0,
    tags: ['笔记本', '学生', '办公'],
    description: '5000-15000 元价位段笔记本横评。',
    cover: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&q=80&auto=format&fit=crop',
    status: 'upcoming',
  },
  {
    id: 'ls-9',
    title: '618 终极场 · 全品类清仓',
    host: 'Versa 官方',
    category: 'fashion',
    startAt: tomorrow(7, 20, 0),
    durationMin: 180,
    viewerCount: 0,
    tags: ['清仓', '全品类'],
    description: '618 最后一场，每 5 分钟抽一台 iPhone。',
    cover: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80&auto=format&fit=crop',
    status: 'upcoming',
  },
]

const REMINDER_KEY = 'versa:live-reminders:v1'

function loadReminders(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(REMINDER_KEY) || '[]'))
  } catch {
    return new Set()
  }
}
function saveReminders(set: Set<string>) {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(Array.from(set)))
}

export function LiveSchedulePage() {
  const navigate = useNavigate()
  const [reminders, setReminders] = useState<Set<string>>(loadReminders())
  const [filter, setFilter] = useState<'all' | ScheduleItem['category'] | 'reminder'>('all')
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(NOW)
    d.setHours(0, 0, 0, 0)
    return d
  })

  const toggleReminder = (id: string) => {
    const next = new Set(reminders)
    if (next.has(id)) {
      next.delete(id)
      toast('已取消提醒', 'info')
    } else {
      next.add(id)
      toast('已添加提醒，开播前会通知你 ✨', 'success')
    }
    setReminders(next)
    saveReminders(next)
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return SEED
    if (filter === 'reminder') return SEED.filter((s) => reminders.has(s.id))
    return SEED.filter((s) => s.category === filter)
  }, [filter, reminders])

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>()
    filtered.forEach((s) => {
      const d = new Date(s.startAt)
      d.setHours(0, 0, 0, 0)
      const key = d.toDateString()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(s)
    })
    return Array.from(map.entries()).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    )
  }, [filtered])

  // Week navigation
  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      days.push(d)
    }
    return days
  }, [weekStart])

  const goPrev = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }
  const goNext = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white"
      >
        ← 返回
      </button>

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-shop-500 via-news-500 to-debate-500 p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-0 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Tv className="w-5 h-5" />
              <span className="text-sm text-white/80">直播日历</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">本周直播预告</h1>
            <p className="text-white/90">
              {SEED.filter((s) => s.status === 'live').length} 场直播中 ·{' '}
              {SEED.filter((s) => s.status === 'upcoming').length} 场即将开始
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/80">我的提醒</p>
            <p className="text-4xl font-black">{reminders.size}</p>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'all', label: '全部', icon: Sparkles },
          { key: 'tech', label: '数码', icon: Tv },
          { key: 'beauty', label: '美妆', icon: Star },
          { key: 'fashion', label: '穿搭', icon: Heart },
          { key: 'home', label: '家居', icon: Calendar },
          { key: 'food', label: '美食', icon: Flame },
          { key: 'sports', label: '运动', icon: Users },
          { key: 'reminder', label: `🔔 已订阅 (${reminders.size})`, icon: Bell },
        ].map((f) => {
          const Icon = f.icon
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition',
                filter === f.key
                  ? 'bg-shop-500 text-white shadow'
                  : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-ink-200'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Week strip */}
      <div className="flex items-center gap-2">
        <button
          onClick={goPrev}
          className="p-2 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800"
          aria-label="上一周"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 grid grid-cols-7 gap-1">
          {weekDays.map((d) => {
            const isToday = d.toDateString() === new Date().toDateString()
            const isPast = d < new Date(new Date().setHours(0, 0, 0, 0))
            const hasLive = SEED.some(
              (s) => new Date(s.startAt).toDateString() === d.toDateString()
            )
            return (
              <div
                key={d.toDateString()}
                className={cn(
                  'py-2 rounded-xl text-center text-xs',
                  isToday
                    ? 'bg-shop-500 text-white'
                    : isPast
                    ? 'text-ink-400'
                    : 'text-ink-600 dark:text-ink-300',
                  hasLive && !isToday && 'ring-1 ring-shop-300'
                )}
              >
                <div className="font-medium">{'日一二三四五六'[d.getDay()]}</div>
                <div className="text-base font-bold mt-0.5">{d.getDate()}</div>
                {hasLive && (
                  <div className={cn('w-1 h-1 mx-auto rounded-full mt-1', isToday ? 'bg-white' : 'bg-shop-500')} />
                )}
              </div>
            )
          })}
        </div>
        <button
          onClick={goNext}
          className="p-2 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800"
          aria-label="下一周"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Grouped by date */}
      {grouped.length === 0 ? (
        <div className="py-20 text-center text-ink-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>暂无直播预告</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dateKey, items]) => {
            const date = new Date(dateKey)
            const isToday = date.toDateString() === new Date().toDateString()
            return (
              <div key={dateKey}>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                  <span className={isToday ? 'text-shop-600' : ''}>
                    {isToday ? '今天' : date.getDate() === new Date(NOW.getTime() + 86400000).getDate() ? '明天' : `${date.getMonth() + 1}月${date.getDate()}日`}
                  </span>
                  <span className="text-xs text-ink-500 font-normal">
                    {`日一二三四五六`[date.getDay()]} · {items.length} 场
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((s) => {
                    const isReminded = reminders.has(s.id)
                    const startTime = new Date(s.startAt)
                    const isLive = s.status === 'live'
                    return (
                      <motion.div
                        key={s.id}
                        whileHover={{ y: -2 }}
                        className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden"
                      >
                        <div className={cn('h-1.5 bg-gradient-to-r', CATEGORY_COLORS[s.category])} />
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm flex-shrink-0',
                              CATEGORY_COLORS[s.category]
                            )}>
                              {CATEGORY_LABELS[s.category]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {isLive && (
                                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    LIVE
                                  </span>
                                )}
                                <span className="text-xs text-ink-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {`${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`}
                                  <span className="text-ink-400">· {s.durationMin}min</span>
                                </span>
                                <span className="text-xs text-ink-500">· {s.host}</span>
                              </div>
                              <h3 className="font-semibold mt-1 line-clamp-2">{s.title}</h3>
                              <p className="text-xs text-ink-500 mt-1 line-clamp-1">{s.description}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {s.tags.map((t) => (
                                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-ink-500">
                                    {t}
                                  </span>
                                ))}
                              </div>
                              {s.viewerCount > 0 && (
                                <div className="flex items-center gap-1 text-xs text-ink-500 mt-2">
                                  <Users className="w-3 h-3" />
                                  {s.viewerCount.toLocaleString()} 人观看
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            {isLive ? (
                              <Link
                                to={`/shop/live/${s.id}`}
                                className="flex-1 px-3 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-medium text-center flex items-center justify-center gap-1.5"
                              >
                                <Play className="w-4 h-4" />
                                立即观看
                              </Link>
                            ) : (
                              <Link
                                to={`/shop/live/${s.id}`}
                                className="flex-1 px-3 py-2 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 text-sm font-medium text-center"
                              >
                                详情
                              </Link>
                            )}
                            <button
                              onClick={() => toggleReminder(s.id)}
                              className={cn(
                                'p-2 rounded-lg transition',
                                isReminded
                                  ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                                  : 'bg-ink-100 dark:bg-ink-800 text-ink-500 hover:text-amber-600'
                              )}
                              aria-label={isReminded ? '取消提醒' : '订阅提醒'}
                            >
                              {isReminded ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
