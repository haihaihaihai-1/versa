import { Link, useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { CheckCircle2, Package, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useVersa } from '../store/versa'
import { formatCurrency, formatDate } from '../lib/utils'
import { fireConfetti } from '../components/Confetti'

export function CheckoutSuccessPage() {
  const [params] = useSearchParams()
  const { orders } = useVersa()
  const orderId = params.get('order')
  const order = orders.find((o) => o.id === orderId)

  useEffect(() => {
    if (order) fireConfetti(80)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId])

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="inline-flex w-20 h-20 rounded-full bg-shop-500/10 items-center justify-center mb-6 pulse-ring">
        <CheckCircle2 className="w-10 h-10 text-shop-500" />
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold">下单成功！</h1>
      <p className="mt-3 text-ink-500 dark:text-ink-400">感谢您在 Versa 购物，您的订单已被记录</p>

      {order && (
        <div className="mt-8 p-6 rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 text-left">
          <div className="flex items-center justify-between pb-3 border-b border-ink-200 dark:border-ink-800">
            <div>
              <div className="text-xs text-ink-500">订单编号</div>
              <div className="font-mono text-sm font-semibold">{order.id}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-ink-500">下单时间</div>
              <div className="text-sm font-semibold">{formatDate(order.placedAt)}</div>
            </div>
          </div>
          <div className="py-3 space-y-2">
            {order.items.map((it) => (
              <div key={it.productId} className="flex items-center gap-3 text-sm">
                <img src={it.image} alt="" className="w-10 h-10 rounded object-cover" />
                <div className="flex-1 truncate">{it.name} × {it.quantity}</div>
                <div className="font-semibold">{formatCurrency(it.price * it.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-ink-200 dark:border-ink-800 flex items-center justify-between">
            <span className="text-sm text-ink-500">订单总额</span>
            <span className="font-bold text-xl text-shop-600">{formatCurrency(order.total)}</span>
          </div>
          {order.trackingNumber && (
            <div className="mt-3 text-xs text-ink-500 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              运单号：<span className="font-mono">{order.trackingNumber}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/profile/orders"><Button leftIcon={<Package className="w-4 h-4" />}>查看我的订单</Button></Link>
        <Link to="/shop"><Button variant="outline" rightIcon={<ArrowRight className="w-4 h-4" />}>继续购物</Button></Link>
      </div>

      <div className="mt-12 inline-flex items-center gap-1.5 text-xs text-ink-500">
        <Sparkles className="w-3 h-3 text-nova-500" />
        你获得了 <span className="font-bold text-nova-500">+30 声誉值</span>
      </div>
    </div>
  )
}
