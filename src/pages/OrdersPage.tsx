import { Link } from 'react-router-dom'
import { useVersa } from '../store/versa'
import { EmptyState } from '../components/ui/EmptyState'
import { Package, ShoppingBag, ChevronRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { formatCurrency, formatDate, cn } from '../lib/utils'

const STATUS_MAP: Record<string, { label: string; variant: any; step: number }> = {
  paid: { label: '已支付', variant: 'news', step: 1 },
  shipped: { label: '已发货', variant: 'nova', step: 2 },
  delivered: { label: '已签收', variant: 'shop', step: 3 },
  cancelled: { label: '已取消', variant: 'debate', step: 0 },
}

export function OrdersPage() {
  const { orders } = useVersa()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2">我的订单</h1>
      <p className="text-ink-500 dark:text-ink-400 mb-8">{orders.length} 笔订单</p>

      {orders.length === 0 ? (
        <EmptyState
          icon={<Package className="w-7 h-7" />}
          title="还没有任何订单"
          description="在 Versa 选购好物，订单会显示在这里"
          action={
            <Link to="/shop"><Button leftIcon={<ShoppingBag className="w-4 h-4" />}>去购物</Button></Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const s = STATUS_MAP[o.status]
            return (
              <div key={o.id} className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
                <div className="px-5 py-3 flex items-center justify-between border-b border-ink-100 dark:border-ink-800">
                  <div>
                    <div className="text-xs text-ink-500">订单号</div>
                    <div className="font-mono text-sm font-semibold">{o.id}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <div className="text-sm font-bold text-shop-600">{formatCurrency(o.total)}</div>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  {o.items.map((it) => (
                    <div key={it.productId} className="flex items-center gap-3">
                      <img src={it.image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium line-clamp-1">{it.name}</div>
                        <div className="text-xs text-ink-500">× {it.quantity}</div>
                      </div>
                      <div className="text-sm font-semibold">{formatCurrency(it.price * it.quantity)}</div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 border-t border-ink-100 dark:border-ink-800 flex items-center justify-between text-xs text-ink-500">
                  <span>下单时间：{formatDate(o.placedAt)}</span>
                  {o.trackingNumber && <span>运单：<span className="font-mono">{o.trackingNumber}</span></span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
