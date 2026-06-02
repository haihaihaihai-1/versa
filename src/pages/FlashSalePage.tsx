import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Zap, Clock, Flame, Bell, ShoppingCart, ChevronRight, ArrowLeft, BellRing,
  Sparkles, Timer, TrendingUp, Package
} from 'lucide-react'
import { products } from '../data/products'
import { formatCurrency, formatNumber } from '../lib/utils'

const SESSIONS = [
  { time: '08:00', label: '早场', status: 'done', theme: 'from-amber-400 to-orange-500' },
  { time: '12:00', label: '午场', status: 'done', theme: 'from-rose-400 to-pink-500' },
  { time: '16:00', label: '下午场', status: 'live', theme: 'from-emerald-400 to-teal-500' },
  { time: '20:00', label: '晚场', status: 'upcoming', theme: 'from-violet-400 to-fuchsia-500' },
  { time: '00:00', label: '凌晨场', status: 'upcoming', theme: 'from-blue-400 to-cyan-500' },
]

const DEALS = products.slice(0, 8).map((p, i) => ({
  ...p,
  dealPrice: Math.round(p.price * (0.4 + Math.random() * 0.3)),
  originalPrice: p.price,
  stock: Math.floor(50 + Math.random() * 200),
  sold: Math.floor(100 + Math.random() * 800),
  endsIn: 60 * (10 + i * 5) + 30,
  badge: ['⚡ 5 折秒杀', '🔥 1 元抢', '⚡ 限量 100', '🎉 直降 60%', '⚡ 整点抢'][i % 5],
}))

export default function FlashSalePage() {
  const navigate = useNavigate()
  const [tick, setTick] = useState(0)
  const [activeSession, setActiveSession] = useState('16:00')
  const live = DEALS.filter((d) => d.endsIn > 0)
  const [countdown, setCountdown] = useState({ h: 2, m: 34, s: 15 })

  useEffect(() => {
    const t = setInterval(() => {
      setTick((x) => x + 1)
      setCountdown((c) => {
        let { h, m, s } = c
        if (s > 0) s--
        else if (m > 0) { m--; s = 59 }
        else if (h > 0) { h--; m = 59; s = 59 }
        else { h = 2; m = 34; s = 15 }
        return { h, m, s }
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-500 via-pink-500 to-fuchsia-500 pb-20">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-8 right-4 w-32 h-32 rounded-full border-2 border-white/40 animate-pulse" />
          <div className="absolute top-20 right-12 w-20 h-20 rounded-full border-2 border-white/30" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 pt-4 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white/20 backdrop-blur text-white flex items-center justify-center">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                <h1 className="text-2xl font-bold text-white">限时秒杀</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-300 text-rose-600 font-bold">HOT</span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">每天 5 场 · 限量 100 件</p>
            </div>
          </div>

          {/* 倒计时 */}
          <div className="bg-white/15 backdrop-blur rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/80">距下场结束</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <TimeBox value={countdown.h} />
                  <span className="text-white font-bold">:</span>
                  <TimeBox value={countdown.m} />
                  <span className="text-white font-bold">:</span>
                  <TimeBox value={countdown.s} />
                </div>
              </div>
              <button className="px-3 py-1.5 rounded-full bg-white text-rose-500 text-xs font-medium flex items-center gap-1">
                <BellRing className="w-3 h-3" />提醒我
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 space-y-4">
        {/* 场次 */}
        <div className="grid grid-cols-5 gap-2">
          {SESSIONS.map((s) => {
            const active = activeSession === s.time
            return (
              <button
                key={s.time}
                onClick={() => setActiveSession(s.time)}
                className={`p-2.5 rounded-2xl border text-center ${
                  active
                    ? `bg-gradient-to-br ${s.theme} text-white border-transparent shadow-md`
                    : 'bg-white text-ink-700 border-ink-100'
                }`}
              >
                <p className="text-sm font-bold">{s.time}</p>
                <p className="text-[10px] opacity-80 mt-0.5">
                  {s.status === 'live' ? '🔥 进行中' : s.status === 'done' ? '已结束' : s.label}
                </p>
              </button>
            )
          })}
        </div>

        {/* 秒杀商品 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {live.map((d) => (
            <DealCard key={d.id} deal={d} />
          ))}
        </div>

        {/* 玩法说明 */}
        <div className="bg-white rounded-2xl p-4 border border-ink-100">
          <h3 className="text-sm font-semibold text-ink-800 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-rose-500" />玩法说明
          </h3>
          <ul className="text-xs text-ink-600 space-y-1.5">
            <li>• 每天 5 场秒杀，准时 0/8/12/16/20 点开抢</li>
            <li>• 价格低至 1 折，限量 100 件/场，先到先得</li>
            <li>• 设置「提醒我」可提前 5 分钟收到通知</li>
            <li>• 秒杀商品支持 7 天无理由 + 极速退款</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

function TimeBox({ value }: { value: number }) {
  return (
    <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-white font-bold text-lg">
      {String(value).padStart(2, '0')}
    </div>
  )
}

function DealCard({ deal }: { deal: any }) {
  const progress = (deal.sold / (deal.sold + deal.stock)) * 100
  const urgent = deal.stock < 30
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-ink-100 hover:shadow-xl transition">
      <div className="relative aspect-square bg-gradient-to-br from-ink-100 to-ink-200">
        {deal.images?.[0] ? <img src={deal.images[0]} className="w-full h-full object-cover" /> : (
          <div className="w-full h-full flex items-center justify-center text-xs text-ink-400">{deal.name.slice(0, 2)}</div>
        )}
        {deal.badge && (
          <span className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-medium">
            {deal.badge}
          </span>
        )}
        {urgent && (
          <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-medium flex items-center gap-0.5">
            <Flame className="w-2.5 h-2.5" />仅剩 {deal.stock}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-sm font-medium text-ink-800 line-clamp-2 h-10">{deal.name}</p>
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-lg font-bold text-rose-500">¥{formatCurrency(deal.dealPrice)}</span>
          <span className="text-[11px] text-ink-400 line-through">¥{formatCurrency(deal.originalPrice)}</span>
        </div>
        {/* 进度条 */}
        <div className="mt-1.5">
          <div className="flex items-center justify-between text-[10px] text-ink-500 mb-0.5">
            <span>已抢 {Math.round(progress)}%</span>
            <span>剩 {deal.stock} 件</span>
          </div>
          <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button className="mt-2 w-full py-1.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-medium flex items-center justify-center gap-1">
          <Zap className="w-3 h-3" />立即抢购
        </button>
      </div>
    </div>
  )
}
