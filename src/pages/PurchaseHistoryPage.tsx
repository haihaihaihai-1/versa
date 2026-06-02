import { PurchaseHistory } from '../components/PurchaseHistory'
import { Package } from 'lucide-react'

export function PurchaseHistoryPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Package className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">购买记录</h1>
          <p className="text-sm text-ink-500">我的订单 · 物流 · 复购</p>
        </div>
      </div>
      <PurchaseHistory />
    </div>
  )
}
