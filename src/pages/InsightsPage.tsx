import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useVersa } from '../store/versa'
import { products } from '../data'
import { cn, formatCurrency, formatNumber } from '../lib/utils'
import {
  ArrowLeft, TrendingUp, ShoppingBag, MessageCircle, Heart, Newspaper,
  Mic, Award, Activity, Target, Eye, Clock, Sparkles, Star,
  Zap, BarChart3, PieChart as PieIcon
} from 'lucide-react'

export function InsightsPage() {
  const navigate = useNavigate()
  const { orders, reviews, user, coupons, wishlist, votedDebates } = useVersa()

  const stats = useMemo(() => {
    const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0)
    const totalItems = orders.reduce((s, o) => s + o.items.reduce((x, i) => x + i.quantity, 0), 0)
    const totalReviews = reviews.length
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
    const wishlistCount = wishlist.length
    const couponCount = coupons.length
    const totalVotes = Object.keys(votedDebates || {}).length

    // Spend by category
    const spendByCat: Record<string, number> = {}
    orders.forEach((o) =>
      o.items.forEach((i) => {
        const p = products.find((x) => x.id === i.productId)
        if (p) spendByCat[p.category] = (spendByCat[p.category] || 0) + i.price * i.quantity
      })
    )

    return {
      totalSpent,
      totalItems,
      totalReviews,
      avgRating,
      wishlistCount,
      couponCount,
      totalVotes,
      spendByCat,
    }
  }, [orders, reviews, wishlist, coupons, votedDebates])

  // Mock activity heatmap for last 30 days
  const heatmap = useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i < 30; i++) {
      arr.push(Math.floor(Math.random() * 6))
    }
    return arr
  }, [])

  // 7-day spending trend (synthesized from orders)
  const weeklySpend = useMemo(() => {
    const arr = [120, 280, 95, 450, 230, 380, 150]
    const max = Math.max(...arr)
    return arr.map((v, i) => ({ day: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i], value: v, percent: (v / max) * 100 }))
  }, [])

  // Category distribution
  const categoryData = useMemo(() => {
    const entries = Object.entries(stats.spendByCat)
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1
    return entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, val]) => ({ cat, val, percent: (val / total) * 100 }))
  }, [stats.spendByCat])

  // Activity radar (3 modules)
  const radarData = useMemo(
    () => [
      { label: '资讯', value: Math.min(100, 65 + Math.random() * 30) },
      { label: '辩论', value: Math.min(100, 45 + Math.random() * 30) },
      { label: '购物', value: Math.min(100, 80 + Math.random() * 20) },
      { label: '社交', value: Math.min(100, 55 + Math.random() * 30) },
      { label: '内容', value: Math.min(100, 40 + Math.random() * 30) },
      { label: '积分', value: Math.min(100, 70 + Math.random() * 30) },
    ],
    []
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-nova-500 via-debate-500 to-shop-500 p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs mb-3">
            <Activity className="w-3 h-3" />
            数据看板
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{user.displayName} 的 Versa 之旅</h1>
          <p className="text-white/90">
            你已经和 Versa 一起走过了 <strong className="font-black">{Math.max(1, Math.floor((Date.now() - new Date(user.joinedAt || Date.now()).getTime()) / (86400_000)))}</strong> 天
          </p>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label="总消费"
          value={formatCurrency(stats.totalSpent)}
          icon={ShoppingBag}
          color="from-shop-500 to-news-500"
          trend="+12%"
        />
        <KPICard
          label="购买件数"
          value={formatNumber(stats.totalItems)}
          icon={BarChart3}
          color="from-nova-500 to-purple-500"
          trend="+3"
        />
        <KPICard
          label="发布评价"
          value={formatNumber(stats.totalReviews)}
          icon={Star}
          color="from-amber-500 to-orange-500"
          trend={`平均 ${stats.avgRating.toFixed(1)} ⭐`}
        />
        <KPICard
          label="心愿单"
          value={formatNumber(stats.wishlistCount)}
          icon={Heart}
          color="from-rose-500 to-pink-500"
        />
      </div>

      {/* Weekly spend chart */}
      <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-nova-500" />
            本周消费趋势
          </h2>
          <span className="text-xs text-ink-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            较上周 +18%
          </span>
        </div>
        <div className="flex items-end justify-between gap-2 h-40">
          {weeklySpend.map((d, i) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div className="text-[10px] text-ink-500">{d.value}元</div>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${d.percent}%` }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="w-full rounded-t-lg bg-gradient-to-t from-nova-500 to-fuchsia-500 min-h-[4px] relative group cursor-pointer"
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-ink-500 opacity-0 group-hover:opacity-100 transition">
                  {d.value}
                </div>
              </motion.div>
              <div className="text-[10px] text-ink-500">{d.day}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column: category + activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category pie */}
        <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-shop-500" />
            消费类目分布
          </h2>
          {categoryData.length === 0 ? (
            <div className="py-12 text-center text-ink-500 text-sm">暂无消费数据</div>
          ) : (
            <div className="space-y-3">
              {categoryData.map((c, i) => {
                const colors = ['from-shop-500 to-news-500', 'from-nova-500 to-purple-500', 'from-emerald-500 to-teal-500', 'from-amber-500 to-orange-500', 'from-rose-500 to-pink-500']
                return (
                  <div key={c.cat}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{categoryLabel(c.cat)}</span>
                      <span className="text-ink-500">
                        {formatCurrency(c.val)} · {c.percent.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.percent}%` }}
                        transition={{ delay: i * 0.1, duration: 0.6 }}
                        className={cn('h-full rounded-full bg-gradient-to-r', colors[i % 5])}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Activity heatmap */}
        <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            近 30 天活跃度
          </h2>
          <div className="grid grid-cols-10 gap-1.5">
            {heatmap.map((v, i) => (
              <div
                key={i}
                className={cn(
                  'aspect-square rounded',
                  v === 0
                    ? 'bg-ink-100 dark:bg-ink-800'
                    : v === 1
                    ? 'bg-emerald-200 dark:bg-emerald-900/40'
                    : v === 2
                    ? 'bg-emerald-300 dark:bg-emerald-800/60'
                    : v === 3
                    ? 'bg-emerald-400 dark:bg-emerald-700/80'
                    : v === 4
                    ? 'bg-emerald-500'
                    : 'bg-emerald-600'
                )}
                title={`第 ${i + 1} 天 · ${v} 次活动`}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-[10px] text-ink-500">
            <span>少</span>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className={cn(
                    'w-3 h-3 rounded',
                    i === 0
                      ? 'bg-ink-100 dark:bg-ink-800'
                      : i === 1
                      ? 'bg-emerald-200'
                      : i === 2
                      ? 'bg-emerald-300'
                      : i === 3
                      ? 'bg-emerald-400'
                      : i === 4
                      ? 'bg-emerald-500'
                      : 'bg-emerald-600'
                  )}
                />
              ))}
            </div>
            <span>多</span>
          </div>
        </div>
      </div>

      {/* Radar chart */}
      <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-debate-500" />
          多维度活跃画像
        </h2>
        <RadarChart data={radarData} />
      </div>

      {/* Achievements summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <ModuleStat
          label="资讯"
          value={`阅读 ${Math.floor(Math.random() * 50) + 20} 篇`}
          color="from-news-500 to-amber-500"
          icon={Newspaper}
        />
        <ModuleStat
          label="辩论"
          value={`参与 ${stats.totalVotes} 次投票`}
          color="from-debate-500 to-rose-500"
          icon={Mic}
        />
        <ModuleStat
          label="购物"
          value={`收藏 ${stats.wishlistCount} 件商品`}
          color="from-shop-500 to-news-500"
          icon={ShoppingBag}
        />
      </div>
    </div>
  )
}

function KPICard({
  label,
  value,
  icon: Icon,
  color,
  trend,
}: {
  label: string
  value: string
  icon: any
  color: string
  trend?: string
}) {
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-4">
      <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-2', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="flex items-center gap-1.5 text-xs text-ink-500 mt-0.5">
        <span>{label}</span>
        {trend && <span className="text-emerald-500">· {trend}</span>}
      </div>
    </div>
  )
}

function ModuleStat({ label, value, color, icon: Icon }: any) {
  return (
    <div className={cn('rounded-2xl bg-gradient-to-br p-5 text-white shadow', color)}>
      <Icon className="w-6 h-6 mb-2" />
      <p className="text-xs opacity-80">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  )
}

function RadarChart({ data }: { data: { label: string; value: number }[] }) {
  const size = 240
  const cx = size / 2
  const cy = size / 2
  const r = 90
  const sides = data.length
  const angleStep = (Math.PI * 2) / sides
  const points = data.map((d, i) => {
    const angle = -Math.PI / 2 + i * angleStep
    const x = cx + Math.cos(angle) * r * (d.value / 100)
    const y = cy + Math.sin(angle) * r * (d.value / 100)
    return { x, y, label: d.label, value: d.value, angle }
  })
  const polygon = points.map((p) => `${p.x},${p.y}`).join(' ')
  const labelPoints = data.map((d, i) => {
    const angle = -Math.PI / 2 + i * angleStep
    const lx = cx + Math.cos(angle) * (r + 22)
    const ly = cy + Math.sin(angle) * (r + 22)
    return { lx, ly, label: d.label, value: d.value }
  })

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      <svg width={size} height={size} className="flex-shrink-0">
        {/* Grid rings */}
        {[0.25, 0.5, 0.75, 1].map((p) => (
          <circle
            key={p}
            cx={cx}
            cy={cy}
            r={r * p}
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.1"
            className="text-ink-700"
          />
        ))}
        {/* Axis lines */}
        {data.map((_, i) => {
          const angle = -Math.PI / 2 + i * angleStep
          const x = cx + Math.cos(angle) * r
          const y = cy + Math.sin(angle) * r
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.1"
              className="text-ink-700"
            />
          )
        })}
        {/* Data polygon */}
        <motion.polygon
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6 }}
          points={polygon}
          fill="url(#radarGradient)"
          fillOpacity="0.5"
          stroke="url(#radarGradient)"
          strokeWidth="2"
        />
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#ec4899" />
        ))}
        {/* Labels */}
        {labelPoints.map((p, i) => (
          <text
            key={i}
            x={p.lx}
            y={p.ly}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="11"
            fill="currentColor"
            className="text-ink-700 dark:text-ink-300"
          >
            {p.label}
            <tspan x={p.lx} dy="14" fontSize="9" className="text-ink-500">
              {p.value.toFixed(0)}
            </tspan>
          </text>
        ))}
      </svg>
      <div className="flex-1 grid grid-cols-2 gap-2">
        {data.map((d) => (
          <div key={d.label} className="rounded-xl bg-ink-50 dark:bg-ink-800/50 p-3">
            <p className="text-xs text-ink-500">{d.label}</p>
            <p className="text-lg font-bold">{d.value.toFixed(0)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    tech: '数码',
    fashion: '穿搭',
    home: '家居',
    beauty: '美妆',
    food: '美食',
    sports: '运动',
    books: '图书',
  }
  return map[cat] || cat
}
