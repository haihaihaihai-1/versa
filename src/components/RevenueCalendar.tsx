import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, TrendingUp, DollarSign, Eye, Heart, ShoppingBag, Video, Sparkles, ChevronLeft, ChevronRight, Award } from 'lucide-react'
import { cn, formatNumber, formatTimeAgo } from '../lib/utils'

const REVENUE_SEED = [
  { day: 1, amount: 320, sources: { product: 200, gift: 80, tip: 40 } },
  { day: 2, amount: 480, sources: { product: 320, gift: 120, tip: 40 } },
  { day: 3, amount: 290, sources: { product: 180, gift: 80, tip: 30 } },
  { day: 4, amount: 0, sources: { product: 0, gift: 0, tip: 0 } },
  { day: 5, amount: 680, sources: { product: 450, gift: 180, tip: 50 } },
  { day: 6, amount: 920, sources: { product: 600, gift: 250, tip: 70 } },
  { day: 7, amount: 540, sources: { product: 360, gift: 140, tip: 40 } },
  { day: 8, amount: 760, sources: { product: 500, gift: 200, tip: 60 } },
  { day: 9, amount: 410, sources: { product: 280, gift: 100, tip: 30 } },
  { day: 10, amount: 0, sources: { product: 0, gift: 0, tip: 0 } },
  { day: 11, amount: 880, sources: { product: 580, gift: 230, tip: 70 } },
  { day: 12, amount: 1240, sources: { product: 800, gift: 320, tip: 120 } },
  { day: 13, amount: 980, sources: { product: 640, gift: 260, tip: 80 } },
  { day: 14, amount: 720, sources: { product: 480, gift: 180, tip: 60 } },
  { day: 15, amount: 0, sources: { product: 0, gift: 0, tip: 0 } },
  { day: 16, amount: 1100, sources: { product: 720, gift: 290, tip: 90 } },
  { day: 17, amount: 1450, sources: { product: 950, gift: 380, tip: 120 } },
  { day: 18, amount: 860, sources: { product: 560, gift: 230, tip: 70 } },
  { day: 19, amount: 540, sources: { product: 360, gift: 140, tip: 40 } },
  { day: 20, amount: 320, sources: { product: 200, gift: 90, tip: 30 } },
  { day: 21, amount: 480, sources: { product: 320, gift: 120, tip: 40 } },
  { day: 22, amount: 0, sources: { product: 0, gift: 0, tip: 0 } },
  { day: 23, amount: 720, sources: { product: 480, gift: 180, tip: 60 } },
  { day: 24, amount: 1280, sources: { product: 840, gift: 340, tip: 100 } },
  { day: 25, amount: 1640, sources: { product: 1080, gift: 420, tip: 140 } },
  { day: 26, amount: 1100, sources: { product: 720, gift: 290, tip: 90 } },
  { day: 27, amount: 880, sources: { product: 580, gift: 230, tip: 70 } },
  { day: 28, amount: 560, sources: { product: 380, gift: 140, tip: 40 } },
  { day: 29, amount: 0, sources: { product: 0, gift: 0, tip: 0 } },
  { day: 30, amount: 1380, sources: { product: 900, gift: 360, tip: 120 } },
]

export function RevenueCalendar() {
  const [year, setYear] = useState(2025)
  const [month, setMonth] = useState(6)
  const [selected, setSelected] = useState<number | null>(null)

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const monthRevenue = REVENUE_SEED.reduce((s, r) => s + r.amount, 0)
  const bestDay = REVENUE_SEED.reduce((best, r) => r.amount > best.amount ? r : best, REVENUE_SEED[0])
  const activeDays = REVENUE_SEED.filter((r) => r.amount > 0).length

  const getDay = (d: number) => REVENUE_SEED.find((r) => r.day === d) || { day: d, amount: 0, sources: { product: 0, gift: 0, tip: 0 } }
  const maxAmount = Math.max(...REVENUE_SEED.map((r) => r.amount))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-5 h-5" />
          <h2 className="text-lg font-bold">收益日历</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">可视化每日收入, 把握趋势</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-xl font-bold">¥{formatNumber(monthRevenue)}</p>
            <p className="text-[10px] opacity-80">本月总收益</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-xl font-bold">{activeDays}</p>
            <p className="text-[10px] opacity-80">活跃天数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-xl font-bold">¥{formatNumber(bestDay.amount)}</p>
            <p className="text-[10px] opacity-80">最高日 {bestDay.day}日</p>
          </div>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setMonth(month > 1 ? month - 1 : 12)} className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 rounded">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-base font-bold">{year} 年 {monthNames[month - 1]}</h3>
          <button onClick={() => setMonth(month < 12 ? month + 1 : 1)} className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 rounded">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-ink-500 mb-1">
          {['日', '一', '二', '三', '四', '五', '六'].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
            const day = getDay(d)
            const intensity = day.amount / maxAmount
            const color = day.amount === 0
              ? 'bg-ink-100 dark:bg-ink-800 text-ink-400'
              : intensity > 0.7
                ? 'bg-emerald-500 text-white'
                : intensity > 0.4
                  ? 'bg-emerald-400 text-white'
                  : 'bg-emerald-200 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
            const isSelected = selected === d
            return (
              <motion.button
                key={d}
                onClick={() => setSelected(d)}
                whileTap={{ scale: 0.9 }}
                className={cn('aspect-square rounded-lg text-xs font-bold flex items-center justify-center relative', color, isSelected && 'ring-2 ring-nova-500')}
              >
                {d}
                {day.amount > 0 && (
                  <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </motion.button>
            )
          })}
        </div>

        <div className="flex items-center gap-2 mt-3 text-[10px] text-ink-500">
          <span>少</span>
          <div className="flex gap-0.5">
            {[0.2, 0.4, 0.6, 0.8, 1].map((v) => (
              <div key={v} className="w-3 h-3 rounded bg-emerald-500" style={{ opacity: v }} />
            ))}
          </div>
          <span>多</span>
        </div>
      </div>

      {selected && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{month}月{selected}日 收益详情</p>
            <p className="text-lg font-black text-emerald-500">¥{getDay(selected).amount}</p>
          </div>
          {getDay(selected).amount > 0 ? (
            <div className="space-y-1.5">
              <Row icon={ShoppingBag} label="商品佣金" amount={getDay(selected).sources.product} color="text-rose-500" />
              <Row icon={Sparkles} label="礼物分成" amount={getDay(selected).sources.gift} color="text-violet-500" />
              <Row icon={Heart} label="打赏" amount={getDay(selected).sources.tip} color="text-amber-500" />
            </div>
          ) : (
            <p className="text-xs text-ink-500 py-2">今天没有收益</p>
          )}
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
          <Award className="w-5 h-5 text-amber-500 mb-1" />
          <p className="text-xs text-ink-500">最高收益日</p>
          <p className="text-lg font-bold">{month}月{bestDay.day}日</p>
          <p className="text-[10px] text-ink-400">¥{formatNumber(bestDay.amount)}</p>
        </div>
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
          <TrendingUp className="w-5 h-5 text-emerald-500 mb-1" />
          <p className="text-xs text-ink-500">日均收益</p>
          <p className="text-lg font-bold">¥{formatNumber(Math.round(monthRevenue / 30))}</p>
          <p className="text-[10px] text-ink-400">较上月 +12%</p>
        </div>
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, amount, color }: { icon: any; label: string; amount: number; color: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-ink-500">
        <Icon className={`w-3.5 h-3.5 ${color}`} />{label}
      </span>
      <span className="font-bold">¥{amount}</span>
    </div>
  )
}
