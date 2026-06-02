import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Truck, Package, MapPin, Check, Clock, X } from 'lucide-react'
import { cn } from '../lib/utils'

const STEPS = [
  { key: 'picked', label: '已下单', icon: Check, description: '商家已确认订单' },
  { key: 'packed', label: '已打包', icon: Package, description: '商品已打包完毕' },
  { key: 'shipped', label: '运输中', icon: Truck, description: '快递已揽件' },
  { key: 'transit', label: '到达中转', icon: MapPin, description: '快件到达 [城市名] 中转站' },
  { key: 'delivered', label: '派送中', icon: Truck, description: '快递员正在派送' },
  { key: 'signed', label: '已签收', icon: Check, description: '签收人: 本人' },
]

const POSITIONS = [
  { lat: 31.23, lng: 121.47, name: '上海' },
  { lat: 32.06, lng: 118.79, name: '南京' },
  { lat: 33.51, lng: 117.32, name: '徐州' },
  { lat: 36.65, lng: 117.10, name: '济南' },
  { lat: 39.90, lng: 116.40, name: '北京' },
]

export function OrderTracker({ orderId, status = 'transit' }: { orderId: string; status?: string }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [pos, setPos] = useState(2)

  useEffect(() => {
    const idx = STEPS.findIndex((s) => s.key === status)
    if (idx >= 0) setCurrentStep(idx)
  }, [status])

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        const next = p + 1
        if (next >= 100) {
          setPos((c) => Math.min(c + 1, POSITIONS.length - 1))
          return 0
        }
        return next
      })
    }, 500)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold flex items-center gap-1.5">
          <Truck className="w-5 h-5 text-blue-500" />物流跟踪
        </h3>
        <span className="text-xs text-blue-500">实时位置</span>
      </div>

      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-2xl p-3 border border-blue-200/40">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs text-ink-500">订单号</div>
          <div className="text-xs font-mono">{orderId.slice(0, 8)}...</div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-ink-500 text-[10px]">起始</p>
            <p className="font-semibold">上海·松江区</p>
          </div>
          <div>
            <p className="text-ink-500 text-[10px]">到达</p>
            <p className="font-semibold">北京·朝阳区</p>
          </div>
        </div>
      </div>

      <div className="relative aspect-[16/9] bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-2xl overflow-hidden border border-blue-200/40">
        <svg viewBox="0 0 500 280" className="w-full h-full">
          <path
            d="M 50 200 Q 150 100 250 150 T 450 80"
            stroke="#3b82f6"
            strokeWidth="2"
            fill="none"
            strokeDasharray="4 4"
            opacity="0.5"
          />
          {POSITIONS.map((p, idx) => (
            <g key={idx}>
              <circle
                cx={50 + (idx * 100)}
                cy={200 - idx * 30}
                r="8"
                fill={idx <= pos ? '#3b82f6' : '#cbd5e1'}
                stroke="white"
                strokeWidth="2"
              />
              <text x={50 + (idx * 100)} y={230 - idx * 30} textAnchor="middle" className="text-[10px] fill-current font-medium">
                {p.name}
              </text>
            </g>
          ))}
          <motion.g
            initial={{ x: 50, y: 200 }}
            animate={{ x: 50 + (pos * 100), y: 200 - (pos * 30) }}
            transition={{ duration: 1.5 }}
          >
            <circle r="14" fill="#ec4899" opacity="0.3">
              <animate attributeName="r" from="14" to="20" dur="1s" repeatCount="indefinite" />
              <animate attributeName="opacity" from="0.6" to="0" dur="1s" repeatCount="indefinite" />
            </circle>
            <circle r="8" fill="#ec4899" stroke="white" strokeWidth="2" />
            <text x="0" y="3" textAnchor="middle" className="text-[9px] fill-white font-bold">📦</text>
          </motion.g>
        </svg>
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
          {Math.round((pos / (POSITIONS.length - 1)) * 100)}% 已送达
        </div>
      </div>

      <div className="space-y-1">
        {STEPS.map((s, idx) => {
          const isCompleted = idx < currentStep
          const isCurrent = idx === currentStep
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-xl border',
                isCurrent ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' :
                isCompleted ? 'border-emerald-200/60 dark:border-emerald-800/30' : 'border-ink-200/40 dark:border-ink-800/40 opacity-50'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                isCurrent ? 'bg-blue-500 text-white' :
                isCompleted ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-500'
              )}>
                {isCompleted ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{s.label}</p>
                <p className="text-[10px] text-ink-500">{s.description}</p>
              </div>
              {isCurrent && (
                <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />进行中
                </span>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
