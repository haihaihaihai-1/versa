import { OrderTracker } from '../components/OrderTracker'
import { Truck } from 'lucide-react'

export function OrderTrackerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Truck className="w-6 h-6 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold">物流跟踪</h1>
          <p className="text-sm text-ink-500">实时位置 · 6 步轨迹</p>
        </div>
      </div>
      <OrderTracker orderId="o-2026-06-02-001" status="transit" />
    </div>
  )
}
