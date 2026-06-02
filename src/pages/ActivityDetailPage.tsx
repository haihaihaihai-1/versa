import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useVersa } from '../store/versa'
import { products } from '../data'
import { Button } from '../components/ui/Button'
import { cn, formatCurrency } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import {
  ArrowLeft, Calendar, Clock, Sparkles, Tag, Heart,
  Share2, ChevronRight, Trophy, Gift, Zap, ShoppingBag, Star
} from 'lucide-react'

interface ActivityData {
  id: string
  title: string
  subtitle: string
  cover: string
  startAt: string
  endAt: string
  status: 'upcoming' | 'live' | 'ended'
  rules: { title: string; desc: string; icon: any }[]
  products: string[]
  coupons: { amount: number; threshold: number; stock: number }[]
  prizes: { rank: string; reward: string }[]
  description: string
  tags: string[]
}

const ACTIVITIES: ActivityData[] = [
  {
    id: 'a618',
    title: '618 超级盛典',
    subtitle: '数码 · 美妆 · 家电 · 全品类狂欢',
    cover: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200',
    startAt: '2026-06-01T00:00:00Z',
    endAt: '2026-06-18T23:59:59Z',
    status: 'live',
    description: '连续 18 天狂欢，每天 3 场限时秒杀，最高直降 5000。叠加平台券 + 店铺券 + 满减，到手价低至 5 折。',
    rules: [
      { title: '百亿补贴', desc: '每天 0 点上新爆款', icon: Gift },
      { title: '跨店满减', desc: '每满 300-50，上不封顶', icon: Tag },
      { title: '红包雨', desc: '每天 8/12/20 点准时开启', icon: Sparkles },
      { title: '抽奖转盘', desc: '下单即抽 iPhone 15', icon: Trophy },
    ],
    products: ['p1', 'p2', 'p7', 'p10'],
    coupons: [
      { amount: 50, threshold: 200, stock: 999 },
      { amount: 100, threshold: 500, stock: 888 },
      { amount: 200, threshold: 1000, stock: 666 },
    ],
    prizes: [
      { rank: '特等奖', reward: 'iPhone 15 Pro Max' },
      { rank: '一等奖', reward: 'Apple Watch S10' },
      { rank: '二等奖', reward: 'AirPods Pro' },
      { rank: '三等奖', reward: '100 元无门槛券' },
    ],
    tags: ['数码', '美妆', '家电', '全品类', '满减'],
  },
  {
    id: 'aspring',
    title: '春日焕新',
    subtitle: '穿搭 · 美妆 · 家居 · 春意盎然',
    cover: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=1200',
    startAt: '2026-04-01T00:00:00Z',
    endAt: '2026-04-30T23:59:59Z',
    status: 'ended',
    description: '春日好物大赏，新品首发 + 春日特惠 + 满 500 减 100。',
    rules: [
      { title: '春日特惠', desc: '指定商品 5 折起', icon: Sparkles },
      { title: '新人专享', desc: '首单 9 折 + 30 元券', icon: Gift },
      { title: '满减', desc: '满 500 减 100', icon: Tag },
    ],
    products: ['p2', 'p9', 'p4', 'p6'],
    coupons: [
      { amount: 30, threshold: 100, stock: 9999 },
      { amount: 100, threshold: 500, stock: 999 },
    ],
    prizes: [
      { rank: '特等奖', reward: '戴森吹风机' },
      { rank: '一等奖', reward: '雅诗兰黛小棕瓶' },
    ],
    tags: ['春日', '焕新', '穿搭', '美妆'],
  },
  {
    id: 'atech',
    title: '科技未来节',
    subtitle: 'AI · 数码 · 智能家居',
    cover: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200',
    startAt: '2026-07-15T00:00:00Z',
    endAt: '2026-07-22T23:59:59Z',
    status: 'upcoming',
    description: '科技爱好者盛会！AI 硬件首发、智能家居套装、VR 体验。',
    rules: [
      { title: '首发特惠', desc: '新品首发 24 小时 9 折', icon: Sparkles },
      { title: '科技盲盒', desc: '下单抽隐藏款', icon: Gift },
    ],
    products: ['p1', 'p4', 'p10'],
    coupons: [
      { amount: 80, threshold: 300, stock: 5000 },
      { amount: 300, threshold: 1000, stock: 1000 },
    ],
    prizes: [
      { rank: '特等奖', reward: 'Meta Quest 3' },
      { rank: '一等奖', reward: '大疆无人机' },
    ],
    tags: ['科技', 'AI', '数码'],
  },
]

export function ActivityDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useVersa()
  const [reminderOn, setReminderOn] = useState(false)

  const activity = ACTIVITIES.find((a) => a.id === id) || ACTIVITIES[0]
  const activityProducts = activity.products
    .map((pid) => products.find((p) => p.id === pid))
    .filter(Boolean) as typeof products

  const statusBadge = {
    upcoming: { text: '即将开始', color: 'bg-nova-500' },
    live: { text: '进行中', color: 'bg-rose-500 animate-pulse' },
    ended: { text: '已结束', color: 'bg-ink-400' },
  }[activity.status]

  const handleClaim = (amount: number, threshold: number) => {
    if (activity.status === 'ended') {
      toast('活动已结束', 'error')
      return
    }
    toast(`已领取 ¥${amount} 优惠券（满 ${threshold} 减 ${amount}）`, 'success')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      {/* Hero */}
      <div className="rounded-3xl overflow-hidden shadow-2xl relative">
        <img src={activity.cover} alt="" className="w-full h-64 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold text-white', statusBadge.color)}>
              {statusBadge.text}
            </span>
            {activity.tags.map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur text-white">
                {t}
              </span>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-black mb-1">{activity.title}</h1>
          <p className="text-white/80 text-sm mb-3">{activity.subtitle}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {activity.status !== 'ended' && (
              <Button
                size="sm"
                onClick={() => {
                  setReminderOn(!reminderOn)
                  toast(reminderOn ? '已取消提醒' : '已设置提醒', 'success')
                }}
                className="bg-white text-ink-900 hover:bg-white/90"
                leftIcon={reminderOn ? <Heart className="w-3.5 h-3.5 fill-current" /> : <Heart className="w-3.5 h-3.5" />}
              >
                {reminderOn ? '已订阅' : '订阅提醒'}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href)
                toast('链接已复制', 'success')
              }}
              leftIcon={<Share2 className="w-3.5 h-3.5" />}
            >
              分享
            </Button>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <p className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed">
          {activity.description}
        </p>
      </div>

      {/* Rules */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          玩法规则
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activity.rules.map((r) => {
            const Icon = r.icon
            return (
              <div
                key={r.title}
                className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-4 flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white flex-shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="text-xs text-ink-500 mt-0.5">{r.desc}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Coupons */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Tag className="w-5 h-5 text-rose-500" />
          活动专享券
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {activity.coupons.map((c) => (
            <motion.div
              key={c.amount}
              whileHover={{ scale: 1.02 }}
              className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-rose-500 to-pink-500 text-white p-4 shadow-lg"
            >
              <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/10" />
              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white dark:bg-ink-900" />
              <p className="text-xs opacity-80">满 {c.threshold} 可用</p>
              <p className="text-3xl font-black my-1">¥{c.amount}</p>
              <p className="text-[10px] opacity-80">剩余 {c.stock.toLocaleString()} 张</p>
              <Button
                size="sm"
                onClick={() => handleClaim(c.amount, c.threshold)}
                className="w-full mt-2 bg-white text-rose-600 hover:bg-white/90"
                disabled={activity.status === 'ended'}
              >
                {activity.status === 'ended' ? '已结束' : '立即领取'}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Products */}
      <div>
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-shop-500" />
          活动好物
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {activityProducts.map((p) => (
            <Link
              key={p.id}
              to={`/shop/${p.id}`}
              className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden hover:shadow-lg transition"
            >
              <div className="aspect-square bg-gradient-to-br from-ink-100 to-ink-200 dark:from-ink-800 dark:to-ink-700">
                {p.images?.[0] && (
                  <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="p-3">
                <p className="text-sm font-medium line-clamp-1">{p.name}</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-shop-600 font-bold">{formatCurrency(p.price)}</span>
                  {p.originalPrice && p.originalPrice > p.price && (
                    <span className="text-[10px] text-ink-400 line-through">
                      {formatCurrency(p.originalPrice)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Prizes */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/40 dark:border-amber-800/40 p-5">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          抽奖大转盘
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {activity.prizes.map((p) => (
            <div
              key={p.rank}
              className="rounded-xl bg-white/80 dark:bg-ink-900/60 p-3 text-center"
            >
              <Sparkles className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="text-[10px] text-ink-500">{p.rank}</p>
              <p className="font-bold text-sm">{p.reward}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
