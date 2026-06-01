import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CreditCard, Wallet, Smartphone, Lock, ArrowLeft, Sparkles, MapPin, Package, Shield } from 'lucide-react'
import { products } from '../data'
import { useVersa, versa } from '../store/versa'
import { Button } from '../components/ui/Button'
import { formatCurrency, cn } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

const PAYMENT_METHODS = [
  { id: 'wechat', name: '微信支付', icon: Smartphone, desc: '扫码完成支付' },
  { id: 'alipay', name: '支付宝', icon: Wallet, desc: '快捷安全' },
  { id: 'card', name: '银行卡', icon: CreditCard, desc: '支持储蓄卡/信用卡' },
]

export function CheckoutPage() {
  const navigate = useNavigate()
  const { cart } = useVersa()
  const [payment, setPayment] = useState('wechat')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [processing, setProcessing] = useState(false)

  const items = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) })).filter((c) => c.product)
  const subtotal = items.reduce((sum, c) => sum + c.product!.price * c.quantity, 0)
  const shipping = subtotal > 99 ? 0 : 12
  const total = subtotal + shipping

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-4">购物车是空的</h2>
        <Button onClick={() => navigate('/shop')}>去购物</Button>
      </div>
    )
  }

  const handlePlace = async () => {
    if (!name || !phone || !address) {
      toast('请完整填写收货信息', 'error')
      return
    }
    setProcessing(true)
    await new Promise((r) => setTimeout(r, 1500))
    const order = versa.placeOrder(
      items.map((c) => ({ productId: c.productId, name: c.product!.name, price: c.product!.price, quantity: c.quantity, image: c.product!.images[0] })),
      total,
      `${name} · ${phone} · ${address}`
    )
    setProcessing(false)
    navigate(`/checkout/success?order=${order.id}`)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate('/cart')} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回购物车
      </button>

      <h1 className="text-3xl sm:text-4xl font-bold mb-8">结算</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-6">
          {/* 收货地址 */}
          <section className="rounded-2xl p-6 bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-shop-500" />
              <h2 className="font-semibold">收货信息</h2>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="收货人姓名"
                  className="h-11 px-3 rounded-xl bg-ink-50 dark:bg-ink-800/60 border border-ink-200 dark:border-ink-700 focus:border-shop-500 outline-none text-sm"
                />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="手机号码"
                  className="h-11 px-3 rounded-xl bg-ink-50 dark:bg-ink-800/60 border border-ink-200 dark:border-ink-700 focus:border-shop-500 outline-none text-sm"
                />
              </div>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="详细地址（省/市/区/街道/门牌号）"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-ink-50 dark:bg-ink-800/60 border border-ink-200 dark:border-ink-700 focus:border-shop-500 outline-none text-sm resize-none"
              />
            </div>
          </section>

          {/* 商品列表 */}
          <section className="rounded-2xl p-6 bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-4 h-4 text-shop-500" />
              <h2 className="font-semibold">商品清单 · {items.length}</h2>
            </div>
            <div className="space-y-3">
              {items.map((c) => (
                <div key={c.productId} className="flex gap-3 items-center">
                  <img src={c.product!.images[0]} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium line-clamp-1">{c.product!.name}</div>
                    <div className="text-xs text-ink-500">× {c.quantity}</div>
                  </div>
                  <div className="font-semibold text-sm">{formatCurrency(c.product!.price * c.quantity)}</div>
                </div>
              ))}
            </div>
          </section>

          {/* 支付方式 */}
          <section className="rounded-2xl p-6 bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-shop-500" />
              <h2 className="font-semibold">支付方式</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.id}
                    onClick={() => setPayment(m.id)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      payment === m.id
                        ? 'border-shop-500 bg-shop-500/5'
                        : 'border-ink-200 dark:border-ink-700 hover:border-shop-500/30'
                    )}
                  >
                    <Icon className="w-5 h-5 text-shop-500 mb-2" />
                    <div className="font-semibold text-sm">{m.name}</div>
                    <div className="text-xs text-ink-500 mt-0.5">{m.desc}</div>
                    {payment === m.id && <Check className="w-4 h-4 text-shop-500 mt-2" />}
                  </button>
                )
              })}
            </div>
          </section>
        </div>

        <div className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl p-6 bg-gradient-to-br from-shop-500/5 to-nova-500/5 border border-shop-500/20">
            <h2 className="text-lg font-bold mb-4">费用详情</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">商品</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">运费</span>
                <span className="font-semibold">{shipping === 0 ? '免运费' : formatCurrency(shipping)}</span>
              </div>
              <div className="pt-3 border-t border-ink-200 dark:border-ink-800 flex items-center justify-between">
                <span className="font-bold">应付</span>
                <span className="font-bold text-3xl gradient-text">{formatCurrency(total)}</span>
              </div>
            </div>
            <Button size="lg" fullWidth onClick={handlePlace} loading={processing} className="mt-5" leftIcon={<Lock className="w-4 h-4" />}>
              {processing ? '处理中...' : '确认下单'}
            </Button>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-ink-500">
              <Shield className="w-3.5 h-3.5" />
              本流程为演示，<span className="text-nova-600 font-medium">不会产生真实支付</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
