import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Flame, Zap, ChevronRight } from 'lucide-react'
import { products } from '../../data/products'
import { cn, formatCurrency, formatNumber } from '../../lib/utils'
import { CountdownTimer } from '../CountdownTimer'
import { ProgressBar } from '../ui/Progress'

const FLASHSALE_END = Date.now() + 6 * 3600 * 1000 + 23 * 60 * 1000

export function FlashSale() {
  const items = products.filter((p) => p.originalPrice && p.originalPrice > p.price).slice(0, 4)

  return (
    <section className="rounded-3xl overflow-hidden bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 p-6 text-white relative">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Flame className="w-6 h-6" />
            </motion.div>
            <h2 className="text-2xl font-bold">限时秒杀</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 backdrop-blur">每天 8 点场</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="opacity-80">距结束</span>
            <CountdownTimer target={new Date(FLASHSALE_END)} size="sm" variant="urgent" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map((p, i) => {
            const sold = 30 + Math.floor(Math.random() * 60)
            const stock = 100
            const soldPercent = Math.round((sold / stock) * 100)
            return (
              <Link
                key={p.id}
                to={`/shop/${p.id}`}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-3 hover:bg-white/20 hover:scale-105 transition-all border border-white/10"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-debate-500 text-white text-[10px] font-bold">
                    -{Math.round((1 - p.price / p.originalPrice!) * 100)}%
                  </div>
                  {i === 0 && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-amber-400 text-amber-900 text-[10px] font-bold flex items-center gap-0.5">
                      <Zap className="w-2 h-2" />
                      抢
                    </div>
                  )}
                </div>
                <h3 className="text-xs font-medium line-clamp-1 mb-1.5">{p.name}</h3>
                <div className="flex items-baseline gap-1 mb-1.5">
                  <span className="text-lg font-bold">{formatCurrency(p.price)}</span>
                  <span className="text-[10px] line-through opacity-60">{formatCurrency(p.originalPrice!)}</span>
                </div>
                <div className="space-y-1">
                  <ProgressBar value={soldPercent} max={100} height="xs" className="bg-white/20 [&>div]:bg-gradient-to-r [&>div]:from-amber-300 [&>div]:to-rose-300" />
                  <div className="text-[10px] opacity-80 flex justify-between">
                    <span>已抢 {sold}%</span>
                    <span>剩 {100 - sold} 件</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        <div className="mt-4 flex items-center justify-center">
          <Link to="/shop/flash" className="inline-flex items-center gap-1 text-sm font-semibold hover:gap-2 transition-all">
            查看更多
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
