import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useVersa } from '../store/versa'
import { EmptyState } from '../components/ui/EmptyState'
import {
  Package, ShoppingBag, Check, Truck, Clock, Star, X, RotateCcw, ChevronRight,
  CreditCard, MapPin, Phone, FileText, MessageCircle, Search, Filter, SlidersHorizontal
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { formatCurrency, formatDate, cn } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

const STATUS_TABS: { value: string; label: string; statuses: string[] }[] = [
  { value: 'all', label: '全部', statuses: [] },
  { value: 'pending_payment', label: '待付款', statuses: ['pending_payment'] },
  { value: 'paid', label: '待发货', statuses: ['paid'] },
  { value: 'shipped', label: '待收货', statuses: ['shipped'] },
  { value: 'reviewing', label: '待评价', statuses: ['delivered'] },
  { value: 'completed', label: '已完成', statuses: ['reviewing'] },
]

const STATUS_BADGE: Record<string, { label: string; variant: any; color: string }> = {
  pending_payment: { label: '待付款', variant: 'debate', color: 'text-debate-500' },
  paid: { label: '待发货', variant: 'news', color: 'text-news-500' },
  shipped: { label: '运输中', variant: 'nova', color: 'text-nova-500' },
  delivered: { label: '已签收', variant: 'shop', color: 'text-shop-500' },
  reviewing: { label: '已完成', variant: 'default', color: 'text-ink-500' },
  cancelled: { label: '已取消', variant: 'debate', color: 'text-ink-400' },
  refunded: { label: '已退款', variant: 'debate', color: 'text-debate-500' },
}

const STEP_INDEX: Record<string, number> = {
  pending_payment: 0,
  paid: 1,
  shipped: 2,
  delivered: 3,
  reviewing: 4,
}

const STEPS = [
  { key: 'paid', label: '已支付', icon: Check },
  { key: 'shipped', label: '已发货', icon: Truck },
  { key: 'delivered', label: '已签收', icon: Package },
  { key: 'reviewing', label: '已评价', icon: Star },
]

export function OrdersPage() {
  const { orders } = useVersa()
  const [tab, setTab] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [yearFilter, setYearFilter] = useState('all')

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: orders.length }
    STATUS_TABS.forEach((t) => {
      if (t.statuses.length) {
        map[t.value] = orders.filter((o) => t.statuses.includes(o.status)).length
      }
    })
    return map
  }, [orders])

  const filtered = useMemo(() => {
    let r = orders
    const t = STATUS_TABS.find((s) => s.value === tab)
    if (t && t.value !== 'all') r = r.filter((o) => t.statuses.includes(o.status))
    if (query) {
      const q = query.toLowerCase()
      r = r.filter((o) =>
        o.id.toLowerCase().includes(q) ||
        o.items.some((i) => i.name.toLowerCase().includes(q))
      )
    }
    if (yearFilter !== 'all') {
      r = r.filter((o) => o.placedAt.startsWith(yearFilter))
    }
    return r
  }, [orders, tab, query, yearFilter])

  const years = useMemo(() => {
    const set = new Set(orders.map((o) => o.placedAt.slice(0, 4)))
    return Array.from(set).sort().reverse()
  }, [orders])

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">我的订单</h1>
          <p className="text-ink-500 dark:text-ink-400 mt-1 text-sm">共 {orders.length} 笔订单</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />} onClick={() => toast('演示模式', 'info')}>
            申请发票
          </Button>
          <Button variant="outline" size="sm" leftIcon={<MessageCircle className="w-3.5 h-3.5" />} onClick={() => toast('客服正在接入...', 'info')}>
            联系客服
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors',
              tab === t.value
                ? 'bg-shop-500 text-white'
                : 'bg-ink-100/60 dark:bg-ink-800/60 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
            )}
          >
            {t.label}
            {counts[t.value] > 0 && (
              <span className={cn('ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full tabular-nums', tab === t.value ? 'bg-white/20' : 'bg-shop-500/15 text-shop-600')}>
                {counts[t.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 搜索 + 年份筛选 */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索订单号或商品名..."
            className="w-full h-9 pl-9 pr-3 rounded-xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:border-shop-500"
          />
        </div>
        {years.length > 1 && (
          <div className="flex items-center gap-1 bg-ink-100/60 dark:bg-ink-800/60 p-1 rounded-lg">
            <button
              onClick={() => setYearFilter('all')}
              className={cn('px-2.5 h-7 rounded text-xs font-medium', yearFilter === 'all' ? 'bg-white dark:bg-ink-900 shadow-sm' : 'text-ink-500')}
            >全部</button>
            {years.map((y) => (
              <button
                key={y}
                onClick={() => setYearFilter(y)}
                className={cn('px-2.5 h-7 rounded text-xs font-medium', yearFilter === y ? 'bg-white dark:bg-ink-900 shadow-sm' : 'text-ink-500')}
              >{y}</button>
            ))}
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Package className="w-7 h-7" />}
          title="还没有任何订单"
          description="在 Versa 选购好物，订单会显示在这里"
          action={
            <Link to="/shop"><Button leftIcon={<ShoppingBag className="w-4 h-4" />}>去购物</Button></Link>
          }
        />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-ink-500">当前分类下暂无订单</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => {
            const sb = STATUS_BADGE[o.status]
            const currentStep = STEP_INDEX[o.status] ?? 0
            const expanded = expandedId === o.id
            return (
              <Link
                key={o.id}
                to={`/orders/${o.id}`}
                className="block rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden hover:shadow-lg hover:border-shop-500/40 transition-all"
              >
                {/* Header */}
                <div className="px-5 py-3.5 flex items-center justify-between gap-3 flex-wrap bg-gradient-to-r from-shop-500/5 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-ink-500">订单号</div>
                    <div className="font-mono text-sm font-semibold">{o.id}</div>
                    <button
                      onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(o.id); toast('订单号已复制', 'success') }}
                      className="text-[10px] text-shop-600 hover:underline"
                    >
                      复制
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={sb.variant}>{sb.label}</Badge>
                    <div className="text-sm font-bold text-shop-600">{formatCurrency(o.total)}</div>
                  </div>
                </div>

                {/* Items */}
                <div className="p-5 space-y-3">
                  {o.items.map((it) => (
                    <div key={it.productId} className="flex items-center gap-3">
                      <img src={it.image} alt="" className="w-16 h-16 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium line-clamp-1">{it.name}</div>
                        <div className="text-xs text-ink-500 mt-0.5">× {it.quantity}</div>
                      </div>
                      <div className="text-sm font-semibold">{formatCurrency(it.price * it.quantity)}</div>
                    </div>
                  ))}
                </div>

                {/* Timeline progress */}
                {o.status !== 'cancelled' && o.status !== 'refunded' && (
                  <div className="px-5 py-4 border-t border-ink-100 dark:border-ink-800 bg-ink-50/30 dark:bg-ink-900/30">
                    <div className="flex items-center justify-between relative">
                      {/* Progress line */}
                      <div className="absolute left-4 right-4 top-4 h-0.5 bg-ink-200 dark:bg-ink-800" />
                      <div
                        className="absolute left-4 top-4 h-0.5 bg-shop-500 transition-all duration-500"
                        style={{ width: `calc(${(currentStep / (STEPS.length - 1)) * 100}% - ${currentStep === 0 || currentStep === STEPS.length - 1 ? '0' : '0'}px)` }}
                      />
                      {STEPS.map((s, i) => {
                        const Icon = s.icon
                        const active = i <= currentStep
                        const isCurrent = i === currentStep
                        return (
                          <div key={s.key} className="flex flex-col items-center gap-1.5 relative z-10 flex-1">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                                active ? 'bg-shop-500 text-white' : 'bg-ink-200 dark:bg-ink-800 text-ink-400',
                                isCurrent && 'ring-4 ring-shop-500/20 scale-110'
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div className={cn('text-[10px] font-medium', active ? 'text-shop-600' : 'text-ink-400')}>{s.label}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Meta + actions */}
                <div className="px-5 py-3.5 border-t border-ink-100 dark:border-ink-800 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-500">
                    <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(o.placedAt)}</span>
                    {o.trackingNumber && (
                      <span className="inline-flex items-center gap-1">
                        <Truck className="w-3 h-3" /> {o.carrier} · {o.trackingNumber}
                      </span>
                    )}
                    {o.paymentMethod && (
                      <span className="inline-flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        {['', '微信支付', '支付宝', '花呗', '银行卡'][parseInt(o.paymentMethod === 'wechat' ? '1' : o.paymentMethod === 'alipay' ? '2' : o.paymentMethod === 'huabei' ? '3' : '4')]}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {o.status === 'pending_payment' && (
                      <>
                        <Button size="sm" variant="outline" onClick={(e) => { e.preventDefault(); toast('已取消订单', 'info') }}>取消订单</Button>
                        <Button size="sm" onClick={(e) => { e.preventDefault(); toast('演示模式', 'info') }}>立即支付</Button>
                      </>
                    )}
                    {o.status === 'shipped' && (
                      <>
                        <Button size="sm" variant="outline" onClick={(e) => { e.preventDefault(); toast('查看物流', 'info') }}>查看物流</Button>
                        <Button size="sm" onClick={(e) => { e.preventDefault(); toast('已确认收货', 'success') }}>确认收货</Button>
                      </>
                    )}
                    {o.status === 'delivered' && (
                      <>
                        <Button size="sm" variant="outline" onClick={(e) => e.preventDefault()}>申请售后</Button>
                        <Button size="sm" onClick={(e) => e.preventDefault()} leftIcon={<Star className="w-3.5 h-3.5" />}>立即评价</Button>
                      </>
                    )}
                    {o.status === 'reviewing' && (
                      <Button size="sm" variant="outline" onClick={(e) => { e.preventDefault(); toast('演示模式', 'info') }}>再次购买</Button>
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); setExpandedId(expanded ? null : o.id) }}
                      className="text-xs text-ink-500 hover:text-ink-900 dark:hover:text-white inline-flex items-center gap-1"
                    >
                      {expanded ? '收起' : '展开'} <ChevronRight className={cn('w-3 h-3 transition-transform', expanded && 'rotate-90')} />
                    </button>
                  </div>
                </div>

                {/* Expanded: address + timeline */}
                {expanded && (
                  <div onClick={(e) => e.preventDefault()} className="px-5 py-5 border-t border-ink-100 dark:border-ink-800 bg-ink-50/30 dark:bg-ink-900/30 space-y-5">
                    {/* Address */}
                    <div>
                      <h4 className="text-xs font-bold text-ink-500 mb-2">收货信息</h4>
                      <div className="text-sm flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-shop-500" />
                        <div>
                          <div className="font-medium">{o.address}</div>
                        </div>
                      </div>
                    </div>

                    {/* Full timeline */}
                    {o.timeline && o.timeline.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-ink-500 mb-3">订单跟踪</h4>
                        <ol className="space-y-3 relative">
                          <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-ink-200 dark:bg-ink-800" />
                          {o.timeline.map((t, i) => {
                            const isReached = i <= currentStep
                            return (
                              <li key={i} className="flex gap-3 items-start relative">
                                <div className={cn(
                                  'w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 z-10 ring-4 ring-white dark:ring-ink-900',
                                  isReached ? 'bg-shop-500' : 'bg-ink-200 dark:bg-ink-800'
                                )}>
                                  {isReached && <Check className="w-2.5 h-2.5 text-white" />}
                                </div>
                                <div className="flex-1 pb-2">
                                  <div className={cn('text-sm font-medium', isReached ? 'text-ink-900 dark:text-white' : 'text-ink-500')}>
                                    {t.label}
                                    {t.at && <span className="text-[10px] text-ink-400 ml-2 tabular-nums">{formatDate(t.at)}</span>}
                                  </div>
                                  {t.description && <div className="text-xs text-ink-500 mt-0.5">{t.description}</div>}
                                </div>
                              </li>
                            )
                          })}
                        </ol>
                      </div>
                    )}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
