import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Check, CreditCard, Wallet, Smartphone, Lock, ArrowLeft, Sparkles, MapPin, Package,
  Shield, Plus, Edit3, Home, Briefcase, Truck, Clock, Receipt, FileText, CheckCircle2,
  AlertCircle, Tag, ChevronRight, Coins, Calendar, User, Fingerprint, SmartphoneCharging,
  Building2, ChevronDown, Gift, Ticket, X, Eye, EyeOff, Zap
} from 'lucide-react'
import { products } from '../data'
import { useVersa, versa } from '../store/versa'
import { Button } from '../components/ui/Button'
import { formatCurrency, cn } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import { BottomSheet } from '../components/ui/BottomSheet'
import { CouponPickerSheet } from '../components/shop/CouponPickerSheet'
import { AddressListSheet } from '../components/shop/AddressListSheet'
import { InvoiceListSheet } from '../components/shop/InvoiceListSheet'
import { DeliveryTimePicker } from '../components/shop/DeliveryTimePicker'

const PAYMENT_METHODS = [
  { id: 'wechat', name: '微信支付', icon: Smartphone, desc: '扫码 / 公众号一键支付', recommended: true, color: 'from-green-500 to-emerald-500' },
  { id: 'alipay', name: '支付宝', icon: Wallet, desc: '扫码或免密支付', color: 'from-blue-500 to-cyan-500' },
  { id: 'huabei', name: '花呗', icon: CreditCard, desc: '本月买，下月还 · 可分期', color: 'from-orange-500 to-amber-500' },
  { id: 'jd', name: '京东支付', icon: SmartphoneCharging, desc: '白条立减优惠', color: 'from-red-500 to-rose-500' },
  { id: 'card', name: '银行卡', icon: Building2, desc: '支持储蓄卡 / 信用卡', color: 'from-violet-500 to-purple-500' },
  { id: 'cloud', name: '云闪付', icon: Zap, desc: '银联快捷支付', color: 'from-sky-500 to-blue-500' },
]

const SHIPPING_METHODS = [
  { id: 'standard', name: '普通快递', desc: '预计 3-5 天送达', price: 0, time: '3-5 天' },
  { id: 'express', name: '顺丰特快', desc: '预计 1-2 天送达', price: 12, time: '1-2 天' },
  { id: 'jd', name: '京东达达', desc: '同城 1 小时达', price: 18, time: '1 小时' },
]

const TAG_ICONS = { home: Home, work: Briefcase, school: FileText, other: MapPin }
const TAG_LABELS = { home: '家', work: '公司', school: '学校', other: '其他' }

const POINTS_RATIO = 100 // 100 积分 = 1 元

export function CheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { cart, user, coupons, addresses, invoices } = useVersa()
  const selectedIds = (location.state as any)?.selectedIds as string[] | undefined

  // 订单商品
  const allItems = cart
    .map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) }))
    .filter((c) => c.product) as Array<{ productId: string; quantity: number; product: NonNullable<ReturnType<typeof products.find>> }>

  const items = useMemo(() => {
    if (!selectedIds) return allItems
    return allItems.filter((c) => selectedIds.includes(c.productId))
  }, [allItems, selectedIds])

  // 状态
  const [addressId, setAddressId] = useState(addresses.find((a) => a.isDefault)?.id || addresses[0]?.id || '')
  const [payment, setPayment] = useState('wechat')
  const [shipping, setShipping] = useState('standard')
  const [deliverySlot, setDeliverySlot] = useState('anytime')
  const [invoiceId, setInvoiceId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null)
  const [usePoints, setUsePoints] = useState(0) // 0 = 不使用
  const [useBalance, setUseBalance] = useState(0) // 0 = 不使用
  const [processing, setProcessing] = useState(false)
  const [showFingerprint, setShowFingerprint] = useState(false)

  // Sheets
  const [couponSheet, setCouponSheet] = useState(false)
  const [addressSheet, setAddressSheet] = useState(false)
  const [invoiceSheet, setInvoiceSheet] = useState(false)
  const [deliverySheet, setDeliverySheet] = useState(false)
  const [paySheet, setPaySheet] = useState(false)

  const address = addresses.find((a) => a.id === addressId) || addresses[0]
  const selectedCoupon = coupons.find((c) => c.id === selectedCouponId) || null

  // 金额
  const subtotal = items.reduce((s, c) => s + c.product.price * c.quantity, 0)
  const shippingMethod = SHIPPING_METHODS.find((s) => s.id === shipping)!
  const shippingCost = shippingMethod.id === 'standard' ? (subtotal > 99 ? 0 : 12) : shippingMethod.price

  // 券匹配
  const couponValid = useMemo(() => {
    if (!selectedCoupon) return 0
    if (subtotal < selectedCoupon.threshold) return 0
    if (selectedCoupon.scope === 'category' && selectedCoupon.scopeValue) {
      if (!items.some((i) => i.product.category === selectedCoupon.scopeValue)) return 0
    }
    if (selectedCoupon.scope === 'brand' && selectedCoupon.scopeValue) {
      if (!items.some((i) => i.product.brand === selectedCoupon.scopeValue)) return 0
    }
    return Math.min(selectedCoupon.amount, subtotal)
  }, [selectedCoupon, subtotal, items])

  const pointsDiscount = usePoints > 0 ? Math.floor(usePoints / POINTS_RATIO) : 0
  const balanceDiscount = useBalance

  const total = Math.max(0, subtotal + shippingCost - couponValid - pointsDiscount - balanceDiscount)

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">没有可结算的商品</h2>
        <Button onClick={() => navigate('/shop')}>去购物</Button>
      </div>
    )
  }

  const handlePlace = async () => {
    if (!address?.name) return toast('请选择收货地址', 'error')
    setProcessing(true)
    setShowFingerprint(true)
    await new Promise((r) => setTimeout(r, 1500))
    setShowFingerprint(false)

    const order = versa.placeOrder(
      items.map((c) => ({ productId: c.productId, name: c.product.name, price: c.product.price, quantity: c.quantity, image: c.product.images[0] })),
      total,
      `${address.name} · ${address.phone} · ${address.province}${address.city}${address.district}${address.detail}`,
      { paymentMethod: payment as any, shippingMethod: shipping as any }
    )
    // 扣减
    if (selectedCoupon) (versa as any).useCoupon(selectedCoupon.id)
    if (usePoints > 0) (versa as any).usePoints(usePoints)
    if (useBalance > 0) (versa as any).useBalance(useBalance)
    setProcessing(false)
    toast('下单成功！', 'success')
    navigate(`/checkout/success?order=${order.id}`)
  }

  const payMethod = PAYMENT_METHODS.find((p) => p.id === payment)
  const TagIcon: any = address?.tag ? TAG_ICONS[address.tag] : MapPin
  const deliverySlotLabel = {
    anytime: '不限时间', work_am: '工作日上午 9:00-12:00', work_pm: '工作日下午 14:00-18:00',
    work_eve: '工作日晚上 18:00-21:00', weekend: '周末全天 9:00-21:00',
  }[deliverySlot]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <button onClick={() => navigate('/cart')} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-4">
        <ArrowLeft className="w-4 h-4" /> 返回购物车
      </button>

      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold">确认订单</h1>
        <p className="text-sm text-ink-500 mt-1">请在 30 分钟内完成支付</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5">
        <div className="space-y-3.5">
          {/* 收货地址 */}
          <SectionCard icon={MapPin} title="收货地址" onAction={() => setAddressSheet(true)} actionLabel="更换">
            {address ? (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-shop-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                  <TagIcon className="w-5 h-5 text-shop-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-bold text-sm">{address.name}</span>
                    <span className="text-sm text-ink-600 dark:text-ink-300 tabular-nums">{address.phone}</span>
                    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-shop-500/10 text-shop-600 font-medium">
                      <TagIcon className="w-2.5 h-2.5" />{TAG_LABELS[address.tag as keyof typeof TAG_LABELS || 'other']}
                    </span>
                    {address.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded bg-shop-500 text-white font-medium">默认</span>}
                  </div>
                  <div className="text-sm text-ink-700 dark:text-ink-200">
                    {address.province} {address.city} {address.district} {address.detail}
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => setAddressSheet(true)} className="w-full p-4 rounded-xl border-2 border-dashed border-ink-300 dark:border-ink-700 text-sm text-ink-500 hover:border-shop-500 hover:text-shop-600 inline-flex items-center justify-center gap-1.5">
                <Plus className="w-4 h-4" /> 请选择收货地址
              </button>
            )}
          </SectionCard>

          {/* 商品清单 */}
          <SectionCard icon={Package} title="商品清单" badge={`${items.length} 件`}>
            <div className="divide-y divide-ink-100 dark:divide-ink-800">
              {items.map((c) => (
                <div key={c.productId} className="py-3 first:pt-0 last:pb-0 flex gap-3 items-center">
                  <img src={c.product.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-clamp-1">{c.product.name}</div>
                    <div className="text-xs text-ink-500 mt-0.5 line-clamp-1">{c.product.tagline}</div>
                    <div className="text-xs text-shop-600 mt-0.5">× {c.quantity}</div>
                  </div>
                  <div className="font-semibold text-sm tabular-nums">{formatCurrency(c.product.price * c.quantity)}</div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* 配送方式 */}
          <SectionCard icon={Truck} title="配送方式">
            <div className="grid grid-cols-3 gap-2">
              {SHIPPING_METHODS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShipping(s.id)}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-all',
                    shipping === s.id ? 'border-shop-500 bg-shop-500/5' : 'border-ink-200/60 dark:border-ink-800/60 hover:border-shop-500/30'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-xs">{s.name}</div>
                    <div className="text-xs font-bold text-shop-600">{s.price === 0 ? '免费' : formatCurrency(s.price)}</div>
                  </div>
                  <div className="text-[10px] text-ink-500">{s.desc}</div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setDeliverySheet(true)}
              className="w-full mt-3 flex items-center justify-between p-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/30 hover:bg-ink-100/60 dark:hover:bg-ink-900/50 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-news-500" />
                <span className="font-medium">送达时间</span>
                <span className="text-ink-500">{deliverySlotLabel}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-400" />
            </button>
          </SectionCard>

          {/* 优惠券 */}
          <SectionCard icon={Ticket} title="优惠券" onAction={() => setCouponSheet(true)} actionLabel="选择">
            {selectedCoupon ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/5 border border-red-500/20">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center font-bold">
                  ¥{selectedCoupon.amount}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{selectedCoupon.name}</div>
                  <div className="text-[11px] text-ink-500 mt-0.5">{selectedCoupon.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-debate-500">-{formatCurrency(couponValid)}</div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedCouponId(null) }} className="text-[10px] text-ink-500 hover:text-debate-500 mt-0.5">不使用</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setCouponSheet(true)} className="w-full p-3 rounded-xl border border-dashed border-ink-300 dark:border-ink-700 text-sm text-ink-500 hover:border-shop-500 hover:text-shop-600 inline-flex items-center justify-center gap-1.5">
                <Ticket className="w-4 h-4" /> 有 {coupons.filter((c) => !c.used).length} 张可用券 · 立即选择
              </button>
            )}
          </SectionCard>

          {/* 积分 + 余额 */}
          <SectionCard icon={Coins} title="积分 & 余额">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/30 border border-ink-200/40 dark:border-ink-800/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold">积分</span>
                  </div>
                  <span className="text-xs text-ink-500">余额 <strong className="text-amber-600">{user.points}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={user.points}
                    step={POINTS_RATIO}
                    value={usePoints || ''}
                    onChange={(e) => setUsePoints(Math.max(0, Math.min(user.points, parseInt(e.target.value) || 0)))}
                    placeholder="0"
                    className="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 text-sm outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => setUsePoints(Math.floor(user.points / POINTS_RATIO) * POINTS_RATIO)}
                    className="text-[11px] px-2 h-9 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 font-bold"
                  >全部</button>
                </div>
                <div className="text-[10px] text-ink-500 mt-1.5">每 {POINTS_RATIO} 积分抵 ¥1</div>
              </div>
              <div className="p-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/30 border border-ink-200/40 dark:border-ink-800/40">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-news-500" />
                    <span className="text-sm font-bold">余额</span>
                  </div>
                  <span className="text-xs text-ink-500">余额 <strong className="text-news-600">¥{user.balance.toFixed(2)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={user.balance}
                    step={0.01}
                    value={useBalance || ''}
                    onChange={(e) => setUseBalance(Math.max(0, Math.min(user.balance, parseFloat(e.target.value) || 0)))}
                    placeholder="0.00"
                    className="flex-1 h-9 px-3 rounded-lg bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 text-sm outline-none focus:border-news-500"
                  />
                  <button
                    onClick={() => setUseBalance(user.balance)}
                    className="text-[11px] px-2 h-9 rounded-lg bg-news-500/10 text-news-600 hover:bg-news-500/20 font-bold"
                  >全部</button>
                </div>
                <div className="text-[10px] text-ink-500 mt-1.5 flex items-center gap-1">
                  <button onClick={() => { versa.topUpBalance(500); toast('已充值 ¥500（演示）', 'success') }} className="text-news-600 hover:underline">+ 充值 ¥500</button>
                </div>
              </div>
            </div>
            {(usePoints > 0 || useBalance > 0) && (
              <div className="mt-2 text-xs text-ink-500 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-shop-500" />
                已使用 {usePoints > 0 && <span><strong className="text-amber-600">{usePoints}</strong> 积分</span>}{usePoints > 0 && useBalance > 0 && ' + '}{useBalance > 0 && <span><strong className="text-news-600">¥{useBalance.toFixed(2)}</strong> 余额</span>}，共抵 <strong className="text-shop-600">{formatCurrency(pointsDiscount + balanceDiscount)}</strong>
              </div>
            )}
          </SectionCard>

          {/* 发票 */}
          <SectionCard icon={Receipt} title="发票信息" onAction={() => setInvoiceSheet(true)} actionLabel="选择">
            {(() => {
              const inv = invoices.find((i) => i.id === invoiceId)
              if (!inv) {
                return (
                  <button onClick={() => setInvoiceSheet(true)} className="w-full p-3 rounded-xl border border-dashed border-ink-300 dark:border-ink-700 text-sm text-ink-500 hover:border-shop-500 hover:text-shop-600 inline-flex items-center justify-center gap-1.5">
                    <Receipt className="w-4 h-4" /> 不开发票
                  </button>
                )
              }
              return (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/30">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                    <Receipt className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('inline-flex items-center text-[10px] px-1.5 py-0.5 rounded font-medium', inv.type === 'personal' ? 'bg-cyan-500/10 text-cyan-600' : 'bg-violet-500/10 text-violet-600')}>
                        {inv.type === 'personal' ? '个人' : '企业'}
                      </span>
                      <span className="font-bold text-sm">{inv.title}</span>
                      {inv.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded bg-shop-500 text-white">默认</span>}
                    </div>
                    {inv.taxId && <div className="text-[11px] text-ink-500 font-mono mt-0.5">税号：{inv.taxId}</div>}
                    {inv.email && <div className="text-[11px] text-ink-500">收票邮箱：{inv.email}</div>}
                  </div>
                </div>
              )
            })()}
          </SectionCard>

          {/* 支付方式 */}
          <SectionCard icon={CreditCard} title="支付方式" onAction={() => setPaySheet(true)} actionLabel="更换">
            {payMethod && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/30">
                <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white', payMethod.color)}>
                  <payMethod.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    {payMethod.name}
                    {payMethod.recommended && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold">推荐</span>}
                  </div>
                  <div className="text-[11px] text-ink-500 mt-0.5">{payMethod.desc}</div>
                </div>
              </div>
            )}
          </SectionCard>

          {/* 订单备注 */}
          <SectionCard icon={FileText} title="订单备注">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="选填，请勿填写价格、优惠、到付等信息（最多 200 字）"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-50/60 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:border-shop-500 resize-none"
            />
            <div className="text-[10px] text-ink-400 text-right mt-1">{note.length} / 200</div>
          </SectionCard>
        </div>

        {/* Right: 订单摘要 */}
        <div className="lg:sticky lg:top-24 h-fit space-y-3">
          <div className="rounded-3xl p-5 bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
            <h2 className="text-base font-bold mb-3">费用明细</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">商品小计</span>
                <span className="font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">配送费</span>
                <span className="font-semibold tabular-nums">
                  {shippingCost === 0 ? <span className="text-shop-500">免运费</span> : formatCurrency(shippingCost)}
                </span>
              </div>
              {couponValid > 0 && selectedCoupon && (
                <div className="flex items-center justify-between text-debate-500">
                  <span>优惠券 · {selectedCoupon.name}</span>
                  <span className="font-semibold tabular-nums">-{formatCurrency(couponValid)}</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex items-center justify-between text-amber-600">
                  <span>积分抵扣</span>
                  <span className="font-semibold tabular-nums">-{formatCurrency(pointsDiscount)}</span>
                </div>
              )}
              {balanceDiscount > 0 && (
                <div className="flex items-center justify-between text-news-600">
                  <span>余额支付</span>
                  <span className="font-semibold tabular-nums">-{formatCurrency(balanceDiscount)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-ink-200 dark:border-ink-800 flex items-baseline justify-between">
                <span className="font-bold">应付</span>
                <span className="font-bold text-3xl gradient-text tabular-nums">{formatCurrency(total)}</span>
              </div>
              {subtotal + pointsDiscount * 0 < 99 && shippingCost > 0 && (
                <div className="text-xs text-news-600 bg-news-500/10 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" />
                  再买 {formatCurrency(99 - subtotal)} 享免运费
                </div>
              )}
            </div>
            <Button size="lg" fullWidth onClick={handlePlace} loading={processing} className="mt-4" leftIcon={<Lock className="w-4 h-4" />}>
              {processing ? '提交中...' : `提交订单 · ${formatCurrency(total)}`}
            </Button>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-500">
              <Shield className="w-3 h-3" />
              本流程为演示，<span className="text-nova-600 font-medium">不会产生真实支付</span>
            </div>
          </div>

          <div className="rounded-2xl p-4 bg-white/60 dark:bg-ink-900/30 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5 text-[11px] text-ink-500">
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-shop-500" /> 支持 7 天无理由退换</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-shop-500" /> 满 99 元包邮</div>
            <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-shop-500" /> 平台担保交易</div>
            <div className="flex items-center gap-1.5"><Shield className="w-3 h-3 text-amber-500" /> 资金安全保障</div>
          </div>
        </div>
      </div>

      {/* 优惠券选择 */}
      <CouponPickerSheet
        open={couponSheet}
        onClose={() => setCouponSheet(false)}
        selectedId={selectedCouponId}
        onSelect={(c) => setSelectedCouponId(c?.id || null)}
        items={items}
      />

      {/* 地址选择 */}
      <AddressListSheet
        open={addressSheet}
        onClose={() => setAddressSheet(false)}
        onSelect={(a) => setAddressId(a.id)}
        currentId={addressId}
      />

      {/* 发票选择 */}
      <InvoiceListSheet
        open={invoiceSheet}
        onClose={() => setInvoiceSheet(false)}
        onSelect={(i) => setInvoiceId(i?.id || null)}
        currentId={invoiceId}
      />

      {/* 送达时间 */}
      <DeliveryTimePicker
        open={deliverySheet}
        onClose={() => setDeliverySheet(false)}
        value={deliverySlot}
        onSelect={setDeliverySlot}
      />

      {/* 支付方式选择 */}
      <BottomSheet open={paySheet} onClose={() => setPaySheet(false)} title="选择支付方式">
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 pb-6">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              onClick={() => { setPayment(m.id); setPaySheet(false) }}
              className={cn(
                'p-4 rounded-2xl border-2 text-left transition-all relative',
                payment === m.id ? 'border-shop-500 bg-shop-500/5' : 'border-ink-200/60 dark:border-ink-800/60 hover:border-shop-500/30'
              )}
            >
              {m.recommended && (
                <span className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold">推荐</span>
              )}
              <div className={cn('w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white mb-2', m.color)}>
                <m.icon className="w-5 h-5" />
              </div>
              <div className="font-semibold text-sm">{m.name}</div>
              <div className="text-[10px] text-ink-500 mt-0.5 line-clamp-1">{m.desc}</div>
              {payment === m.id && <Check className="w-4 h-4 text-shop-500 absolute top-2 right-2" />}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* 指纹支付 - 演示 */}
      {showFingerprint && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-white dark:bg-ink-900 rounded-3xl p-8 w-80 text-center shadow-2xl">
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-shop-500 to-pink-500 opacity-20 animate-ping" />
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-shop-500 to-pink-500 flex items-center justify-center">
                <Fingerprint className="w-12 h-12 text-white" />
              </div>
            </div>
            <h3 className="text-lg font-bold">正在验证支付</h3>
            <p className="text-xs text-ink-500 mt-1">请将手指放在指纹识别器上</p>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionCard({ icon: Icon, title, badge, onAction, actionLabel, children }: {
  icon: any; title: string; badge?: string; onAction?: () => void; actionLabel?: string; children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
      <div className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 bg-gradient-to-r from-shop-500/5 to-transparent flex items-center gap-2">
        <Icon className="w-4 h-4 text-shop-500" />
        <h2 className="font-bold text-sm">{title}</h2>
        {badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-shop-500/10 text-shop-600 font-medium">{badge}</span>}
        {onAction && (
          <button
            onClick={onAction}
            className="ml-auto text-xs text-shop-600 hover:underline inline-flex items-center gap-0.5"
          >
            {actionLabel} <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
