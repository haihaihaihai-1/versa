import { CouponCenter } from '../components/CouponCenter'
import { Ticket } from 'lucide-react'

export function CouponCenterPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Ticket className="w-6 h-6 text-rose-500" />
        <div>
          <h1 className="text-2xl font-bold">优惠券</h1>
          <p className="text-sm text-ink-500">领券省钱 · 自动核销</p>
        </div>
      </div>
      <CouponCenter />
    </div>
  )
}
