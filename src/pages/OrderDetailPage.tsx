import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { useVersa, versa } from '../store/versa'
import { products } from '../data'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { EmptyState } from '../components/ui/EmptyState'
import { cn, formatCurrency, formatDate } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import {
  ArrowLeft, Package, Truck, MapPin, CheckCircle2, Clock, RotateCcw, Star,
  Phone, MessageCircle, ShoppingBag, Copy, Share2, AlertCircle, ChevronRight,
  CreditCard, FileText, Shield, X, Camera, Box, Check
} from 'lucide-react'
import type { OrderStatus } from '../data/types'

const STATUS_META: Record<OrderStatus, { label: string; color: string; icon: any; bg: string }> = {
  pending_payment: { label: '待付款', color: 'text-debate-500', bg: 'bg-debate-500/10', icon: Clock },
  paid: { label: '已支付', color: 'text-news-500', bg: 'bg-news-500/10', icon: Check },
  shipped: { label: '运输中', color: 'text-nova-500', bg: 'bg-nova-500/10', icon: Truck },
  delivered: { label: '已签收', color: 'text-shop-500', bg: 'bg-shop-500/10', icon: Package },
  reviewing: { label: '已完成', color: 'text-ink-500', bg: 'bg-ink-500/10', icon: Star },
  cancelled: { label: '已取消', color: 'text-ink-400', bg: 'bg-ink-400/10', icon: X },
  refunded: { label: '已退款', color: 'text-debate-500', bg: 'bg-debate-500/10', icon: RotateCcw },
}

const STATUS_FLOW: OrderStatus[] = ['pending_payment', 'paid', 'shipped', 'delivered', 'reviewing']

const PAYMENT_LABEL: Record<string, string> = {
  wechat: '微信支付', alipay: '支付宝', huabei: '花呗', card: '银行卡',
}

export function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { orders, afterSales, reviews } = useVersa()
  const order = orders.find((o) => o.id === id)
  const [showLogistics, setShowLogistics] = useState(true)

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <EmptyState
          icon={<Package className="w-7 h-7" />}
          title="订单不存在"
          description="可能该订单已被删除，或链接有误"
          action={
            <div className="flex gap-2">
              <Link to="/profile/orders"><Button>查看我的订单</Button></Link>
              <Link to="/shop"><Button variant="outline">去购物</Button></Link>
            </div>
          }
        />
      </div>
    )
  }

  const meta = STATUS_META[order.status]
  const currentStepIdx = STATUS_FLOW.indexOf(order.status)
  const isFinished = order.status === 'cancelled' || order.status === 'refunded'
  const orderAfterSales = (order.afterSales || []).concat(
    afterSales.filter((a) => a.orderId === order.id && !(order.afterSales || []).some((b) => b.id === a.id))
  )
  const orderReviews = reviews.filter((r) => r.orderId === order.id)
  const reviewedIds = order.reviewed || []

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      {/* Status Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-shop-500/15 via-news-500/8 to-nova-500/15 border border-ink-200/60 dark:border-ink-800/60 p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-shop-500/20 to-transparent rounded-full blur-3xl" />
        <div className="relative flex items-center gap-4 flex-wrap">
          <div className={`w-14 h-14 rounded-2xl ${meta.bg} flex items-center justify-center shadow-lg`}>
            <meta.icon className={`w-7 h-7 ${meta.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{meta.label}</h1>
            <p className="text-sm text-ink-500 mt-1">
              {order.status === 'pending_payment' && '请尽快完成支付，超时订单将自动取消'}
              {order.status === 'paid' && '商家正在备货中，预计 24 小时内发货'}
              {order.status === 'shipped' && '包裹已发出，正在飞奔向你'}
              {order.status === 'delivered' && '包裹已送达，请确认收货并评价'}
              {order.status === 'reviewing' && '订单已完成，期待你的评价'}
              {order.status === 'cancelled' && '订单已取消'}
              {order.status === 'refunded' && '退款已成功'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            <span className="text-ink-400">订单号</span>
            <div className="flex items-center gap-1">
              <span className="font-mono font-semibold">{order.id}</span>
              <button onClick={() => { navigator.clipboard.writeText(order.id); toast('已复制', 'success') }} className="text-shop-600 hover:underline">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick actions by status */}
        <div className="relative mt-5 flex flex-wrap gap-2">
          {order.status === 'pending_payment' && (
            <>
              <Button onClick={() => toast('演示模式', 'info')} size="sm">立即支付</Button>
              <Button variant="outline" size="sm" onClick={() => { if (confirm('确定取消订单？')) { versa.cancelOrder(order.id); toast('订单已取消', 'info') } }}>取消订单</Button>
            </>
          )}
          {order.status === 'paid' && (
            <Button variant="outline" size="sm" onClick={() => toast('已提醒商家尽快发货', 'success')}>催发货</Button>
          )}
          {order.status === 'shipped' && (
            <>
              <Button onClick={() => { versa.confirmReceipt(order.id); toast('已确认收货 🎉', 'success') }} size="sm">确认收货</Button>
              <Button variant="outline" size="sm" onClick={() => setShowLogistics(true)}>查看物流</Button>
              <Button variant="outline" size="sm" onClick={() => toast('已申请延长收货', 'success')}>延长收货</Button>
            </>
          )}
          {order.status === 'delivered' && (
            <>
              <Button onClick={() => navigate(`/orders/${order.id}/review`)} size="sm" leftIcon={<Star className="w-3.5 h-3.5" />}>立即评价</Button>
              <Button variant="outline" size="sm" onClick={() => navigate(`/orders/${order.id}/aftersales`)}>申请售后</Button>
              <Button variant="outline" size="sm" onClick={() => { versa.confirmReceipt(order.id); toast('已确认收货 🎉', 'success') }}>确认收货</Button>
            </>
          )}
          {order.status === 'reviewing' && (
            <>
              <Button onClick={() => navigate(`/orders/${order.id}/review`)} size="sm" leftIcon={<Star className="w-3.5 h-3.5" />}>追评/再次评价</Button>
              <Button variant="outline" size="sm" onClick={() => toast('已重新下单', 'success')}>再次购买</Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => toast('分享链接已复制', 'success')} leftIcon={<Share2 className="w-3.5 h-3.5" />}>分享</Button>
        </div>
      </div>

      {/* 物流信息 - shipped/delivered/reviewing 显示 */}
      {(order.status === 'shipped' || order.status === 'delivered' || order.status === 'reviewing') && (
        <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
          <button
            onClick={() => setShowLogistics(!showLogistics)}
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-ink-50/30 dark:hover:bg-ink-900/30"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-nova-500/20 to-blue-500/20 flex items-center justify-center">
                <Truck className="w-5 h-5 text-nova-600" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">{order.carrier} · {order.trackingNumber}</div>
                <div className="text-[11px] text-ink-500 mt-0.5">
                  {order.status === 'shipped' && '运输中 - 预计明天送达'}
                  {order.status === 'delivered' && '已签收 - 感谢您的购买'}
                  {order.status === 'reviewing' && '已签收'}
                </div>
              </div>
            </div>
            <ChevronRight className={cn('w-4 h-4 text-ink-400 transition-transform', showLogistics && 'rotate-90')} />
          </button>
          {showLogistics && (
            <div className="px-5 pb-5 border-t border-ink-100 dark:border-ink-800 pt-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {[
                  { label: '发货地', value: '上海·浦东' },
                  { label: '运输中', value: '杭州·转运中心' },
                  { label: '派送中', value: '北京·朝阳' },
                ].map((loc, i) => (
                  <div key={i} className="rounded-2xl p-3 bg-ink-50/40 dark:bg-ink-900/30 border border-ink-100/40">
                    <div className="text-[10px] text-ink-500">{loc.label}</div>
                    <div className="text-sm font-bold mt-1">{loc.value}</div>
                  </div>
                ))}
              </div>
              <ol className="space-y-3 relative">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-ink-200 dark:bg-ink-800" />
                {[
                  { at: order.placedAt, label: '商品已下单', desc: '订单创建成功', reached: true },
                  { at: new Date(Date.now() - 86400000).toISOString(), label: '已揽收', desc: '顺丰快递员已揽件', reached: true },
                  { at: new Date(Date.now() - 43200000).toISOString(), label: '运输中', desc: '快件已到达 北京·朝阳转运中心', reached: true },
                  { at: new Date(Date.now() - 7200000).toISOString(), label: '派送中', desc: '快递员 张师傅 138-0000-1234 正在派送', reached: order.status === 'delivered' || order.status === 'reviewing' },
                  { at: order.status === 'delivered' || order.status === 'reviewing' ? new Date().toISOString() : '', label: '已签收', desc: '本人签收，感谢您使用顺丰', reached: order.status === 'delivered' || order.status === 'reviewing' },
                ].filter((l) => l.at).map((l, i) => (
                  <li key={i} className="flex gap-3 items-start relative">
                    <div className={cn('w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 z-10 ring-4 ring-white dark:ring-ink-900', l.reached ? 'bg-shop-500' : 'bg-ink-200 dark:bg-ink-800')}>
                      {l.reached && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className={cn('text-sm font-medium', l.reached ? 'text-ink-900 dark:text-white' : 'text-ink-500')}>
                        {l.label}
                        <span className="text-[10px] text-ink-400 ml-2 tabular-nums">{formatDate(l.at)}</span>
                      </div>
                      {l.desc && <div className="text-xs text-ink-500 mt-0.5">{l.desc}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}

      {/* 收货地址 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-shop-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-5 h-5 text-shop-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-ink-500 mb-1">收货信息</div>
            <div className="text-sm font-semibold">{order.address}</div>
            <div className="flex items-center gap-3 mt-2 text-xs text-ink-500">
              <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" /> 138-****-1234</span>
              <span className="inline-flex items-center gap-1"><Truck className="w-3 h-3" /> {['', '标准快递', '顺丰特快', '京东配送'][parseInt(order.shippingMethod || '1')] || '标准快递'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
        <div className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-shop-500" />
            <span className="font-bold text-sm">商品 ({order.items.length})</span>
          </div>
          <span className="text-xs text-ink-500">{order.items.reduce((s, i) => s + i.quantity, 0)} 件</span>
        </div>
        <div className="divide-y divide-ink-100 dark:divide-ink-800">
          {order.items.map((it) => {
            const product = products.find((p) => p.id === it.productId)
            const reviewed = reviewedIds.includes(it.productId)
            const productAfterSale = orderAfterSales.find((a) => a.productId === it.productId)
            return (
              <div key={it.productId} className="p-4 flex gap-3">
                <Link to={`/shop/${it.productId}`} className="w-20 h-20 rounded-xl overflow-hidden bg-ink-100 flex-shrink-0">
                  <img src={it.image} alt="" className="w-full h-full object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/shop/${it.productId}`} className="text-sm font-semibold line-clamp-1 hover:text-shop-600">{it.name}</Link>
                  {product?.tagline && <p className="text-[11px] text-ink-500 line-clamp-1 mt-0.5">{product.tagline}</p>}
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-shop-500/10 text-shop-600 font-bold">× {it.quantity}</span>
                    {reviewed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 inline-flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-current" />已评价</span>}
                    {productAfterSale && (
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold', productAfterSale.status === 'refunded' ? 'bg-debate-500/10 text-debate-600' : 'bg-nova-500/10 text-nova-600')}>
                        售后{productAfterSale.status === 'refunded' ? '·已退款' : '·处理中'}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-sm font-bold text-shop-600">{formatCurrency(it.price * it.quantity)}</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(order.status === 'delivered' || order.status === 'reviewing') && !reviewed && (
                        <button
                          onClick={() => navigate(`/orders/${order.id}/review?productId=${it.productId}`)}
                          className="text-[11px] px-2.5 h-7 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:shadow-md"
                        >
                          评价晒单
                        </button>
                      )}
                      {(order.status === 'delivered' || order.status === 'reviewing') && !productAfterSale && (
                        <button
                          onClick={() => navigate(`/orders/${order.id}/aftersales?productId=${it.productId}`)}
                          className="text-[11px] px-2.5 h-7 rounded-lg border border-debate-500/30 text-debate-600 hover:bg-debate-500/5"
                        >
                          申请售后
                        </button>
                      )}
                      {order.status === 'shipped' && (
                        <button onClick={() => toast('已申请拦截', 'success')} className="text-[11px] px-2.5 h-7 rounded-lg border border-ink-200 dark:border-ink-700 hover:bg-ink-50 dark:hover:bg-ink-800">
                          申请拦截
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/shop/${it.productId}`)}
                        className="text-[11px] px-2.5 h-7 rounded-lg border border-shop-500/30 text-shop-600 hover:bg-shop-500/5"
                      >
                        再次购买
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 价格明细 */}
        <div className="px-5 py-4 border-t border-ink-100 dark:border-ink-800 bg-ink-50/30 dark:bg-ink-900/30 space-y-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-500">商品小计</span>
            <span className="tabular-nums">{formatCurrency(order.items.reduce((s, i) => s + i.price * i.quantity, 0))}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-500">运费</span>
            <span className="tabular-nums">{order.total > 99 ? '免运费' : formatCurrency(12)}</span>
          </div>
          {order.paymentMethod && (
            <div className="flex items-center justify-between">
              <span className="text-ink-500">支付方式</span>
              <span className="inline-flex items-center gap-1"><CreditCard className="w-3 h-3" />{PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-ink-200/60 dark:border-ink-700/60">
            <span className="font-bold">实付</span>
            <span className="text-xl font-bold text-shop-600 tabular-nums">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* 订单时间线 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-news-500" />订单进度</h3>
        {!isFinished ? (
          <div className="grid grid-cols-4 gap-2 mb-4">
            {STATUS_FLOW.filter((s) => s !== 'pending_payment').map((s, i) => {
              const m = STATUS_META[s]
              const idx = STATUS_FLOW.indexOf(s)
              const reached = currentStepIdx >= idx
              const isCurrent = currentStepIdx === idx
              return (
                <div key={s} className="text-center">
                  <div className={cn('w-10 h-10 rounded-full mx-auto flex items-center justify-center transition-all', reached ? `${m.bg} ${m.color}` : 'bg-ink-100 dark:bg-ink-800 text-ink-400', isCurrent && 'ring-4 ring-offset-2 ring-shop-500/20')}>
                    <m.icon className="w-4 h-4" />
                  </div>
                  <div className={cn('text-[11px] font-medium mt-1.5', reached ? 'text-ink-900 dark:text-white' : 'text-ink-400')}>{m.label}</div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-2xl p-3 bg-ink-100/60 dark:bg-ink-900/40 text-sm text-ink-500 text-center">
            订单已结束 · {meta.label}
          </div>
        )}
        {order.timeline && order.timeline.length > 0 && (
          <ol className="space-y-3 relative mt-4">
            <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-ink-200 dark:bg-ink-800" />
            {order.timeline.map((t, i) => {
              const isReached = STATUS_FLOW.indexOf(t.status) <= currentStepIdx
              return (
                <li key={i} className="flex gap-3 items-start relative">
                  <div className={cn('w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 z-10 ring-4 ring-white dark:ring-ink-900', isReached ? 'bg-shop-500' : 'bg-ink-200 dark:bg-ink-800')}>
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
        )}
      </div>

      {/* 售后记录 */}
      {orderAfterSales.length > 0 && (
        <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><RotateCcw className="w-4 h-4 text-debate-500" />售后记录 ({orderAfterSales.length})</h3>
          <div className="space-y-3">
            {orderAfterSales.map((a) => {
              const p = products.find((p) => p.id === a.productId)
              return (
                <div key={a.id} className="rounded-2xl p-3 bg-ink-50/40 dark:bg-ink-900/30 border border-ink-100/60 dark:border-ink-800/60">
                  <div className="flex items-start gap-3">
                    {p && <img src={p.images[0]} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" alt="" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={a.status === 'refunded' ? 'shop' : 'news'}>
                          {a.status === 'pending' ? '待审核' : a.status === 'approved' ? '已通过' : a.status === 'refunded' ? '已退款' : a.status === 'rejected' ? '已拒绝' : a.status}
                        </Badge>
                        <span className="text-xs text-ink-500">{a.type === 'refund_only' ? '仅退款' : a.type === 'return_refund' ? '退货退款' : '换货'}</span>
                        <span className="text-xs text-ink-500 ml-auto">{formatDate(a.createdAt)}</span>
                      </div>
                      <div className="text-sm mt-1">{a.reason}</div>
                      {a.description && <div className="text-xs text-ink-500 mt-0.5 line-clamp-1">{a.description}</div>}
                      {a.refundAmount && (
                        <div className="text-xs text-debate-600 font-bold mt-1.5">退款金额：{formatCurrency(a.refundAmount)}</div>
                      )}
                    </div>
                  </div>
                  {a.timeline && a.timeline.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-ink-100/60 dark:border-ink-800/60 space-y-1.5">
                      {a.timeline.map((t, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-shop-500" />
                          <span className="text-ink-500 tabular-nums">{formatDate(t.at)}</span>
                          <span className="text-ink-700 dark:text-ink-200">{t.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 评价记录 */}
      {orderReviews.length > 0 && (
        <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />我的评价 ({orderReviews.length})</h3>
          <div className="space-y-3">
            {orderReviews.map((r) => {
              const p = products.find((p) => p.id === r.productId)
              return (
                <div key={r.id} className="rounded-2xl p-3 bg-ink-50/40 dark:bg-ink-900/30 border border-ink-100/60 dark:border-ink-800/60">
                  <div className="flex items-center gap-2">
                    {p && <img src={p.images[0]} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />}
                    <div className="text-sm font-medium line-clamp-1 flex-1 min-w-0">{p?.name || r.productId}</div>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star key={i} className={cn('w-3.5 h-3.5', i <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-ink-700 dark:text-ink-200 mt-2">{r.content}</p>
                  {r.images && r.images.length > 0 && (
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {r.images.map((img, i) => (
                        <img key={i} src={img} className="w-16 h-16 rounded-lg object-cover" alt="" />
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] text-ink-400 mt-2">{formatDate(r.createdAt)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 服务保障 + 联系客服 */}
      <div className="rounded-3xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { icon: Shield, label: '正品保障', desc: '假一赔十' },
            { icon: Truck, label: '全国包邮', desc: '满 99 包邮' },
            { icon: RotateCcw, label: '7 天无理由', desc: '无忧退换' },
            { icon: MessageCircle, label: '在线客服', desc: '7×24 小时' },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <s.icon className="w-5 h-5 text-shop-500" />
              <div className="text-xs font-bold">{s.label}</div>
              <div className="text-[10px] text-ink-500">{s.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-ink-100/60 dark:border-ink-800/60 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" leftIcon={<MessageCircle className="w-3.5 h-3.5" />} onClick={() => toast('客服正在接入...', 'info')}>联系客服</Button>
          <Button variant="outline" size="sm" leftIcon={<Phone className="w-3.5 h-3.5" />} onClick={() => toast('请拨打 400-123-4567', 'info')}>电话客服</Button>
          <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />} onClick={() => toast('发票已申请', 'success')}>申请发票</Button>
          <Button variant="outline" size="sm" leftIcon={<AlertCircle className="w-3.5 h-3.5" />} onClick={() => toast('投诉建议已记录', 'info')}>投诉建议</Button>
        </div>
      </div>

      {/* 猜你喜欢 */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-5 h-5 text-shop-500" />
          <h2 className="text-lg font-bold">猜你还喜欢</h2>
          <span className="text-xs text-ink-500">基于本次购买</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {products.filter((p) => !order.items.some((i) => i.productId === p.id)).slice(0, 4).map((p) => (
            <Link key={p.id} to={`/shop/${p.id}`} className="rounded-2xl overflow-hidden bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 hover:shadow-md transition-all">
              <img src={p.images[0]} className="aspect-square w-full object-cover" alt="" />
              <div className="p-2">
                <div className="text-xs line-clamp-1">{p.name}</div>
                <div className="text-sm font-bold text-shop-600 mt-0.5">{formatCurrency(p.price)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
