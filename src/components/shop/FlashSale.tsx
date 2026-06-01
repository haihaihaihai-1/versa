import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Timer, Zap, ChevronRight, Flame } from 'lucide-react'
import type { Product } from '../../data/types'
import { formatCurrency, cn } from '../../lib/utils'

function useCountdown(target: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return useMemo(() => {
    const diff = Math.max(0, new Date(target).getTime() - now)
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    const s = Math.floor((diff % 60000) / 1000)
    return { h, m, s, ended: diff === 0 }
  }, [target, now])
}

export function FlashSale({ products }: { products: Product[] }) {
  const flashProducts = useMemo(() => products.filter((p) => p.flashSale).slice(0, 6), [products])
  if (flashProducts.length === 0) return null
  const endsAt = flashProducts[0].flashSale!.endsAt
  const cd = useCountdown(endsAt)

  return (
    <div className="rounded-3xl overflow-hidden bg-gradient-to-r from-debate-500 via-debate-500 to-orange-500 text-white p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Zap className="w-6 h-6 fill-current" />
            <h3 className="text-xl sm:text-2xl font-bold">限时秒杀</h3>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-sm font-medium">
            <span>距结束</span>
            <CountUnit v={cd.h} />
            <span>:</span>
            <CountUnit v={cd.m} />
            <span>:</span>
            <CountUnit v={cd.s} />
          </div>
        </div>
        <Link to="/shop" className="inline-flex items-center gap-0.5 text-sm font-medium hover:gap-1.5 transition-all">
          查看全部 <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="sm:hidden flex items-center gap-1 text-xs mb-3 font-medium">
        <Timer className="w-3.5 h-3.5" />
        <span>距结束</span>
        <CountUnit v={cd.h} small />
        <span>:</span>
        <CountUnit v={cd.m} small />
        <span>:</span>
        <CountUnit v={cd.s} small />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {flashProducts.map((p) => {
          const fs = p.flashSale!
          const soldPct = (fs.sold / fs.total) * 100
          return (
            <Link key={p.id} to={`/shop/${p.id}`} className="group bg-white/10 hover:bg-white/15 backdrop-blur-sm rounded-2xl p-3 transition-colors">
              <div className="aspect-square rounded-xl overflow-hidden bg-white mb-2">
                <img src={p.images[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="text-white font-bold text-sm sm:text-base">
                <span className="text-xs">¥</span>{fs.flashPrice}
              </div>
              <div className="text-xs line-through opacity-70">{formatCurrency(p.price)}</div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-300 to-red-400"
                  style={{ width: `${soldPct}%` }}
                />
              </div>
              <div className="text-[10px] mt-1 opacity-80">已抢 {soldPct.toFixed(0)}%</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function CountUnit({ v, small }: { v: number; small?: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center justify-center font-mono font-bold bg-white/20 rounded',
      small ? 'w-5 h-4 text-[10px]' : 'w-7 h-6 text-sm'
    )}>
      {String(v).padStart(2, '0')}
    </span>
  )
}
