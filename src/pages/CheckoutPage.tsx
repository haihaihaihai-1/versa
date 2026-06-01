import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Check, CreditCard, Wallet, Smartphone, Lock, ArrowLeft, Sparkles, MapPin, Package, Shield, Plus,
  Edit3, Home, Briefcase, Truck, Clock, Receipt, FileText, CheckCircle2, AlertCircle, Tag,
} from 'lucide-react'
import { products, brands } from '../data'
import { useVersa, versa } from '../store/versa'
import { Button } from '../components/ui/Button'
import { formatCurrency, cn } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

interface Address {
  id: string
  name: string
  phone: string
  province: string
  city: string
  district: string
  detail: string
  tag?: 'home' | 'work' | 'school' | 'other'
  isDefault?: boolean
}

const SEED_ADDRESSES: Address[] = [
  { id: 'a1', name: '许泉兴', phone: '138****8829', province: '上海市', city: '徐汇区', district: '虹漕路', detail: '88 号 15 楼 1502 室', tag: 'home', isDefault: true },
  { id: 'a2', name: '许泉兴', phone: '138****8829', province: '上海市', city: '浦东新区', district: '世纪大道', detail: '100 号 3 号楼 28 楼', tag: 'work' },
]

const PAYMENT_METHODS = [
  { id: 'wechat', name: '微信支付', icon: Smartphone, desc: '扫码 / 公众号一键支付', recommended: true },
  { id: 'alipay', name: '支付宝', icon: Wallet, desc: '扫码或免密支付' },
  { id: 'huabei', name: '花呗', icon: CreditCard, desc: '本月买，下月还' },
  { id: 'card', name: '银行卡', icon: CreditCard, desc: '支持储蓄卡/信用卡' },
]

const SHIPPING_METHODS = [
  { id: 'standard', name: '普通快递', desc: '预计 3-5 天送达', price: 0, time: '3-5 天' },
  { id: 'express', name: '顺丰特快', desc: '预计 1-2 天送达', price: 12, time: '1-2 天' },
  { id: 'jd', name: '京东达达', desc: '同城 1 小时达', price: 18, time: '1 小时' },
]

const INVOICE_TYPES = [
  { id: 'none', name: '不开发票' },
  { id: 'personal', name: '个人电子发票', desc: '电子普票' },
  { id: 'company', name: '企业增值税发票', desc: '需填写税号' },
]

const TAG_ICONS = { home: Home, work: Briefcase, school: FileText, other: MapPin }

export function CheckoutPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { cart } = useVersa()
  const selectedIds = (location.state as any)?.selectedIds as string[] | undefined
  const [address, setAddress] = useState<Address>(SEED_ADDRESSES[0])
  const [editingAddress, setEditingAddress] = useState(false)
  const [addresses, setAddresses] = useState(SEED_ADDRESSES)
  const [payment, setPayment] = useState('wechat')
  const [shipping, setShipping] = useState('standard')
  const [invoice, setInvoice] = useState('none')
  const [note, setNote] = useState('')
  const [coupon, setCoupon] = useState<{ amount: number; name: string } | null>(null)
  const [processing, setProcessing] = useState(false)

  const allItems = cart
    .map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) }))
    .filter((c) => c.product) as Array<{ productId: string; quantity: number; product: NonNullable<ReturnType<typeof products.find>> }>

  // 默认全选
  const items = useMemo(() => {
    if (!selectedIds) return allItems
    return allItems.filter((c) => selectedIds.includes(c.productId))
  }, [allItems, selectedIds])

  // 按店铺分组
  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>()
    items.forEach((c) => {
      const bid = c.product.brand || 'unknown'
      if (!map.has(bid)) map.set(bid, [])
      map.get(bid)!.push(c)
    })
    return Array.from(map.entries()).map(([bid, list]) => ({
      brandId: bid,
      brand: brands.find((b) => b.name === bid),
      items: list,
      shipping: list.reduce((s, c) => s + c.product.price * c.quantity, 0) > 99 ? 0 : 12,
    }))
  }, [items])

  const subtotal = items.reduce((s, c) => s + c.product.price * c.quantity, 0)
  const shippingMethod = SHIPPING_METHODS.find((s) => s.id === shipping)!
  const shippingCost = shippingMethod.id === 'standard' ? grouped.reduce((s, g) => s + g.shipping, 0) : shippingMethod.price * grouped.length
  const couponDiscount = coupon ? Math.min(coupon.amount, subtotal) : 0
  const total = Math.max(0, subtotal + shippingCost - couponDiscount)

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">没有可结算的商品</h2>
        <Button onClick={() => navigate('/shop')}>去购物</Button>
      </div>
    )
  }

  const handlePlace = async () => {
    if (!address.name || !address.phone || !address.detail) {
      toast('请完整填写收货信息', 'error')
      return
    }
    if (invoice === 'company' && !note.includes('税号')) {
      toast('企业发票需备注税号信息', 'info')
    }
    setProcessing(true)
    await new Promise((r) => setTimeout(r, 1500))
    const order = versa.placeOrder(
      items.map((c) => ({ productId: c.productId, name: c.product.name, price: c.product.price, quantity: c.quantity, image: c.product.images[0] })),
      total,
      `${address.name} · ${address.phone} · ${address.province}${address.city}${address.district}${address.detail}`,
      { paymentMethod: payment as any, shippingMethod: shipping as any }
    )
    setProcessing(false)
    toast('下单成功！', 'success')
    navigate(`/checkout/success?order=${order.id}`)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/cart')} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回购物车
      </button>

      <h1 className="text-3xl sm:text-4xl font-bold mb-2">确认订单</h1>
      <p className="text-sm text-ink-500 mb-8">请在 30 分钟内完成支付，超时订单将自动取消</p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        <div className="space-y-4">
          {/* 收货地址 */}
          <section className="rounded-2xl overflow-hidden bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
            <div className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 bg-gradient-to-r from-shop-500/8 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-shop-500" />
                <h2 className="font-bold text-sm">收货地址</h2>
              </div>
              <button
                onClick={() => setEditingAddress(!editingAddress)}
                className="text-xs text-shop-600 hover:underline inline-flex items-center gap-1"
              >
                <Edit3 className="w-3 h-3" /> {editingAddress ? '收起' : '更换地址'}
              </button>
            </div>

            <div className="p-5">
              {editingAddress ? (
                <div className="space-y-2">
                  {addresses.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { setAddress(a); setEditingAddress(false) }}
                      className={cn(
                        'w-full text-left p-3 rounded-xl border-2 transition-all',
                        address.id === a.id ? 'border-shop-500 bg-shop-500/5' : 'border-ink-200 dark:border-ink-700 hover:border-shop-500/30'
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">{a.name}</span>
                        <span className="text-xs text-ink-500">{a.phone}</span>
                        {a.tag && <TagPill tag={a.tag} />}
                        {a.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded bg-shop-500 text-white">默认</span>}
                      </div>
                      <div className="text-xs text-ink-600 dark:text-ink-300">
                        {a.province} {a.city} {a.district} {a.detail}
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => toast('演示模式：暂不支持新增地址', 'info')}
                    className="w-full p-3 rounded-xl border-2 border-dashed border-ink-300 dark:border-ink-700 text-sm text-ink-500 hover:border-shop-500 hover:text-shop-600 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> 使用新地址
                  </button>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-base">{address.name}</span>
                      <span className="text-sm text-ink-600 dark:text-ink-300 tabular-nums">{address.phone}</span>
                      {address.tag && <TagPill tag={address.tag} />}
                      {address.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded bg-shop-500 text-white font-medium">默认</span>}
                    </div>
                    <div className="text-sm text-ink-700 dark:text-ink-200">
                      {address.province} {address.city} {address.district} {address.detail}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* 商品清单（按店铺分组） */}
          <section className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
            <div className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 bg-gradient-to-r from-shop-500/8 to-transparent flex items-center gap-2">
              <Package className="w-4 h-4 text-shop-500" />
              <h2 className="font-bold text-sm">商品清单</h2>
              <span className="text-xs text-ink-400 ml-auto">{items.length} 件 · {grouped.length} 个店铺</span>
            </div>
            <div className="divide-y divide-ink-100 dark:divide-ink-800">
              {grouped.map((g) => (
                <div key={g.brandId} className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-semibold text-sm">{g.brand?.name || g.brandId}</span>
                  </div>
                  <div className="space-y-3">
                    {g.items.map((c) => (
                      <div key={c.productId} className="flex gap-3 items-center">
                        <img src={c.product.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium line-clamp-1">{c.product.name}</div>
                          <div className="text-xs text-ink-500 mt-0.5">{c.product.tagline}</div>
                          <div className="text-xs text-shop-600 mt-0.5">× {c.quantity}</div>
                        </div>
                        <div className="font-semibold text-sm tabular-nums">{formatCurrency(c.product.price * c.quantity)}</div>
                      </div>
                    ))}
                  </div>
                  {/* 店铺配送方式 */}
                  <div className="mt-4 pt-3 border-t border-dashed border-ink-200/60 dark:border-ink-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-ink-500">
                      <Truck className="w-3.5 h-3.5" />
                      <span>配送方式</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">普通快递 3-5 天 · {g.shipping === 0 ? '包邮' : formatCurrency(g.shipping)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 支付方式 */}
          <section className="rounded-2xl p-5 bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-shop-500" />
              <h2 className="font-bold text-sm">支付方式</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    onClick={() => setPayment(m.id)}
                    className={cn(
                      'p-3.5 rounded-xl border-2 text-left transition-all relative',
                      payment === m.id ? 'border-shop-500 bg-shop-500/5' : 'border-ink-200 dark:border-ink-700 hover:border-shop-500/30'
                    )}
                  >
                    {m.recommended && (
                      <span className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white font-bold">推荐</span>
                    )}
                    <Icon className="w-5 h-5 text-shop-500 mb-2" />
                    <div className="font-semibold text-sm">{m.name}</div>
                    <div className="text-[10px] text-ink-500 mt-0.5 line-clamp-1">{m.desc}</div>
                    {payment === m.id && <Check className="w-4 h-4 text-shop-500 absolute top-2 right-2" />}
                  </button>
                )
              })}
            </div>
          </section>

          {/* 配送方式（全局） */}
          <section className="rounded-2xl p-5 bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="w-4 h-4 text-shop-500" />
              <h2 className="font-bold text-sm">配送方式</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {SHIPPING_METHODS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShipping(s.id)}
                  className={cn(
                    'p-3.5 rounded-xl border-2 text-left transition-all',
                    shipping === s.id ? 'border-shop-500 bg-shop-500/5' : 'border-ink-200 dark:border-ink-700 hover:border-shop-500/30'
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-semibold text-sm">{s.name}</div>
                    <div className="text-sm font-bold text-shop-600">{s.price === 0 ? '免费' : formatCurrency(s.price)}</div>
                  </div>
                  <div className="text-xs text-ink-500">{s.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* 发票 */}
          <section className="rounded-2xl p-5 bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-4 h-4 text-shop-500" />
              <h2 className="font-bold text-sm">发票信息</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {INVOICE_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setInvoice(t.id)}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-all',
                    invoice === t.id ? 'border-shop-500 bg-shop-500/5' : 'border-ink-200 dark:border-ink-700 hover:border-shop-500/30'
                  )}
                >
                  <div className="font-semibold text-sm">{t.name}</div>
                  {t.desc && <div className="text-[10px] text-ink-500 mt-0.5">{t.desc}</div>}
                </button>
              ))}
            </div>
          </section>

          {/* 订单备注 */}
          <section className="rounded-2xl p-5 bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-shop-500" />
              <h2 className="font-bold text-sm">订单备注</h2>
              <span className="text-[11px] text-ink-400 ml-auto">选填，建议留言前先与商家沟通</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="选填，请勿填写有关价格、优惠、到付等信息（最多 200 字）"
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-50 dark:bg-ink-800/60 border border-ink-200 dark:border-ink-700 focus:border-shop-500 outline-none text-sm resize-none"
            />
            <div className="text-[10px] text-ink-400 text-right">{note.length} / 200</div>
          </section>
        </div>

        {/* Right: order summary */}
        <div className="lg:sticky lg:top-24 h-fit space-y-3">
          {/* coupon */}
          <div className="rounded-2xl p-4 bg-gradient-to-br from-red-500/8 to-orange-500/5 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-red-500" />
              <span className="text-sm font-bold">优惠</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {[
                { amount: 30, condition: 200, name: '满 200 减 30' },
                { amount: 20, condition: 100, name: '满 100 减 20' },
                { amount: 5, condition: 0, name: '无门槛 5 元' },
              ].map((c, i) => {
                const eligible = subtotal >= c.condition
                const used = coupon != null && coupon.amount === c.amount
                return (
                  <button
                    key={i}
                    disabled={!eligible}
                    onClick={() => {
                      if (eligible) {
                        setCoupon({ amount: c.amount, name: c.name })
                        toast(`已选择：${c.name}`, 'success')
                      }
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-left',
                      !eligible && 'opacity-50',
                      used ? 'bg-red-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 hover:bg-white/80'
                    )}
                  >
                    <span className="font-medium">{c.name}</span>
                    {used ? <Check className="w-3.5 h-3.5" /> : eligible ? <span className="text-red-500 font-bold">使用</span> : <span className="text-ink-400">不可用</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* summary */}
          <div className="rounded-2xl p-5 bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
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
              {couponDiscount > 0 && coupon && (
                <div className="flex items-center justify-between text-red-500">
                  <span>优惠 · {coupon.name}</span>
                  <span className="font-semibold tabular-nums">-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              <div className="pt-3 border-t border-ink-200 dark:border-ink-800 flex items-baseline justify-between">
                <span className="font-bold">应付</span>
                <span className="font-bold text-3xl gradient-text tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>
            <Button size="lg" fullWidth onClick={handlePlace} loading={processing} className="mt-4" leftIcon={<Lock className="w-4 h-4" />}>
              {processing ? '提交中...' : `提交订单 · ${formatCurrency(total)}`}
            </Button>
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-ink-500">
              <Shield className="w-3 h-3" />
              本流程为演示，<span className="text-nova-600 font-medium">不会产生真实支付</span>
            </div>
            <div className="mt-3 pt-3 border-t border-ink-200 dark:border-ink-800 space-y-1.5 text-[11px] text-ink-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-shop-500" /> 支持 7 天无理由退换
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-shop-500" /> 满 99 元包邮
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-shop-500" /> 平台担保交易
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TagPill({ tag }: { tag: NonNullable<Address['tag']> }) {
  const Icon = TAG_ICONS[tag]
  const labels = { home: '家', work: '公司', school: '学校', other: '其他' }
  const colors = {
    home: 'bg-blue-500/10 text-blue-600',
    work: 'bg-purple-500/10 text-purple-600',
    school: 'bg-green-500/10 text-green-600',
    other: 'bg-ink-500/10 text-ink-600',
  }
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium', colors[tag])}>
      <Icon className="w-2.5 h-2.5" /> {labels[tag]}
    </span>
  )
}
