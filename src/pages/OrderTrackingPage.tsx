import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useVersa } from '../store/versa'
import { Button } from '../components/ui/Button'
import { cn, formatTimeAgo } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import {
  ArrowLeft, Package, Truck, CheckCircle2, MapPin, Box, Home,
  Phone, MessageSquare, Clock, Shield, AlertCircle, Share2
} from 'lucide-react'

type LogisticsStatus = 'picked' | 'in_transit' | 'out_for_delivery' | 'delivered'

interface LogisticsStep {
  status: LogisticsStatus
  label: string
  description: string
  time: string
  location?: string
  courier?: string
  courierPhone?: string
}

const STATUS_ICONS: Record<LogisticsStatus, any> = {
  picked: Box,
  in_transit: Truck,
  out_for_delivery: MapPin,
  delivered: Home,
}

const STATUS_COLORS: Record<LogisticsStatus, string> = {
  picked: 'from-blue-500 to-cyan-500',
  in_transit: 'from-amber-500 to-orange-500',
  out_for_delivery: 'from-purple-500 to-fuchsia-500',
  delivered: 'from-emerald-500 to-green-500',
}

// Generate timeline based on order
function buildLogistics(orderId: string, baseTime: number): LogisticsStep[] {
  return [
    {
      status: 'picked',
      label: '商品已下单',
      description: 'Versa 仓库正在准备您的订单',
      time: new Date(baseTime).toISOString(),
      location: '上海 Versa 履约中心',
    },
    {
      status: 'in_transit',
      label: '已揽收',
      description: '快递员已揽件，包裹开始运输',
      time: new Date(baseTime + 3600_000 * 4).toISOString(),
      location: '上海分拣中心',
      courier: '张师傅',
      courierPhone: '138****1234',
    },
    {
      status: 'in_transit',
      label: '运输中',
      description: '包裹已离开上海，正在前往北京途中',
      time: new Date(baseTime + 3600_000 * 18).toISOString(),
      location: '济南转运中心',
    },
    {
      status: 'in_transit',
      label: '到达目的地',
      description: '包裹已到达北京，准备派送',
      time: new Date(baseTime + 3600_000 * 36).toISOString(),
      location: '北京朝阳分拣中心',
    },
    {
      status: 'out_for_delivery',
      label: '派送中',
      description: '快递员正在派送，请保持手机畅通',
      time: new Date(baseTime + 3600_000 * 42).toISOString(),
      location: '北京朝阳区',
      courier: '李师傅',
      courierPhone: '139****5678',
    },
    {
      status: 'delivered',
      label: '已签收',
      description: '感谢您的购买，欢迎再次光临 Versa',
      time: new Date(baseTime + 3600_000 * 44).toISOString(),
      location: '北京市朝阳区某某街道',
    },
  ]
}

export function OrderTrackingPage() {
  const { orderId } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const trackingNo = params.get('no')
  const { orders } = useVersa()

  const order = orders.find((o) => o.id === orderId) || orders[0]
  // Synthesize a base time (3 days ago)
  const baseTime = Date.now() - 3 * 24 * 3600_000
  const steps = buildLogistics(order?.id || 'demo', baseTime)
  // Show only first 4 for demo (not delivered yet)
  const visibleSteps = steps.slice(0, 4)
  const currentIdx = 3 // out_for_delivery

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> 返回订单
      </button>

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-500 p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-5 h-5" />
            <span className="text-sm text-white/80">物流跟踪</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">包裹正在派送中</h1>
          <p className="text-white/90 mb-5">
            预计 {steps[visibleSteps.length - 1].label} · {formatTimeAgo(steps[currentIdx].time)}
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
              <Truck className="w-5 h-5 mx-auto mb-1" />
              <div className="text-xs">顺丰速运</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
              <Clock className="w-5 h-5 mx-auto mb-1" />
              <div className="text-xs">预计 2 小时内送达</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-2xl p-3 text-center">
              <Shield className="w-5 h-5 mx-auto mb-1" />
              <div className="text-xs">已保价 ¥1000</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tracking number */}
      <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-ink-500">运单号</p>
          <p className="font-mono font-bold text-sm">
            {trackingNo || 'SF' + Math.floor(1000000000 + Math.random() * 8999999999)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard?.writeText(trackingNo || '')
              toast('运单号已复制', 'success')
            }}
          >
            复制
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast('分享链接已复制', 'success')}
            leftIcon={<Share2 className="w-3.5 h-3.5" />}
          >
            分享
          </Button>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <h2 className="text-lg font-bold mb-5">物流轨迹</h2>
        <div className="relative">
          {visibleSteps.map((step, idx) => {
            const Icon = STATUS_ICONS[step.status]
            const isCurrent = idx === currentIdx
            const isCompleted = idx < currentIdx
            const isFuture = idx > currentIdx
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex gap-4 pb-6 last:pb-0 relative"
              >
                {/* Vertical line */}
                {idx < visibleSteps.length - 1 && (
                  <div
                    className={cn(
                      'absolute left-[19px] top-10 bottom-0 w-0.5',
                      isCompleted || isCurrent ? 'bg-emerald-300' : 'bg-ink-200 dark:bg-ink-700'
                    )}
                  />
                )}

                {/* Icon */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow',
                    isFuture
                      ? 'bg-ink-100 dark:bg-ink-800 text-ink-400'
                      : `bg-gradient-to-br ${STATUS_COLORS[step.status]} text-white`,
                    isCurrent && 'ring-4 ring-emerald-100 dark:ring-emerald-900/30 animate-pulse'
                  )}
                >
                  <Icon className="w-5 h-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      className={cn(
                        'font-semibold',
                        isFuture ? 'text-ink-400' : 'text-ink-900 dark:text-white'
                      )}
                    >
                      {step.label}
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 font-medium">
                        当前
                      </span>
                    )}
                  </div>
                  <p className={cn('text-sm mt-0.5', isFuture ? 'text-ink-400' : 'text-ink-600 dark:text-ink-300')}>
                    {step.description}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-500">
                    {step.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {step.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {formatTimeAgo(step.time)}
                    </span>
                  </div>
                  {step.courier && (
                    <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-ink-50 dark:bg-ink-800/50">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                        {step.courier[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">{step.courier}</p>
                        <p className="text-[10px] text-ink-500">{step.courierPhone}</p>
                      </div>
                      <button
                        onClick={() => toast('已发起隐私通话', 'success')}
                        className="p-1.5 rounded-full bg-nova-100 dark:bg-nova-900/30 text-nova-600 hover:bg-nova-200"
                        aria-label="联系快递员"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toast('已发起聊天', 'success')}
                        className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 hover:bg-emerald-200"
                        aria-label="聊天"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Notice */}
      <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/60 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 dark:text-amber-200">
          <p className="font-medium">温馨提示</p>
          <p className="text-xs mt-1 text-amber-800 dark:text-amber-300">
            签收前请当面验收包裹，如有问题请拒签并联系客服。签收后 7 天内支持无理由退货。
          </p>
        </div>
      </div>
    </div>
  )
}
