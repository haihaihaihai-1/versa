import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn, formatCurrency } from '../../lib/utils'

interface Props {
  productId: string
  currentPrice: number
  height?: number
  days?: number
  className?: string
}

function seedHistory(id: string, current: number, days: number) {
  let seed = 0
  for (let i = 0; i < id.length; i++) seed += id.charCodeAt(i)
  const points: { date: string; price: number }[] = []
  let price = current * (0.85 + ((seed % 30) / 100))
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const wave = Math.sin((seed + i) * 0.5) * 0.04
    const trend = (current - price) * 0.1
    price = price + trend + price * wave
    price = Math.max(current * 0.7, Math.min(current * 1.1, price))
    points.push({ date: d.toISOString().slice(5, 10), price: Math.round(price) })
  }
  points[points.length - 1].price = current
  return points
}

export function PriceHistory({ productId, currentPrice, height = 80, days = 30, className }: Props) {
  const data = useMemo(() => seedHistory(productId, currentPrice, days), [productId, currentPrice, days])
  const min = Math.min(...data.map((d) => d.price))
  const max = Math.max(...data.map((d) => d.price))
  const range = max - min || 1
  const width = 100
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((d.price - min) / range) * (height - 8) - 4
    return { x, y, ...d }
  })

  const path = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ')
  const area = `${path} L ${width},${height} L 0,${height} Z`

  const current = data[data.length - 1].price
  const oldest = data[0].price
  const change = ((current - oldest) / oldest) * 100
  const changeP30 = ((current - min) / min) * 100
  const isUp = change > 0.5
  const isDown = change < -0.5
  const TrendIcon = isUp ? TrendingUp : isDown ? TrendingDown : Minus
  const trendColor = isUp ? 'text-debate-500' : isDown ? 'text-shop-500' : 'text-ink-500'
  const strokeColor = isUp ? '#ef4444' : isDown ? '#10b981' : '#7344ff'

  return (
    <div className={cn('rounded-xl border border-ink-200 dark:border-ink-800 p-3 bg-white/80 dark:bg-ink-900/40', className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-ink-500 flex items-center gap-1">
          <span>{days} 天价格走势</span>
        </div>
        <div className={cn('flex items-center gap-0.5 text-xs font-semibold', trendColor)}>
          <TrendIcon className="w-3 h-3" />
          {change > 0 ? '+' : ''}{change.toFixed(1)}%
        </div>
      </div>

      <div className="relative" style={{ height }}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`grad-${productId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
            </linearGradient>
          </defs>

          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            d={area}
            fill={`url(#grad-${productId})`}
          />
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            d={path}
            fill="none"
            stroke={strokeColor}
            strokeWidth="0.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <motion.circle
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 1.2 }}
            cx={points[points.length - 1].x}
            cy={points[points.length - 1].y}
            r="1.5"
            fill={strokeColor}
          />
        </svg>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <div className="text-ink-400">最低</div>
          <div className="font-bold text-shop-600">{formatCurrency(min)}</div>
        </div>
        <div className="text-center">
          <div className="text-ink-400">最低需</div>
          <div className="font-bold">{changeP30.toFixed(0)}%</div>
        </div>
        <div className="text-right">
          <div className="text-ink-400">最高</div>
          <div className="font-bold text-debate-500">{formatCurrency(max)}</div>
        </div>
      </div>
    </div>
  )
}
