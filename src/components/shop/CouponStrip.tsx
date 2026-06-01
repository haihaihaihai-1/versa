import { useState } from 'react'
import { Ticket, Check, X } from 'lucide-react'
import type { Coupon } from '../../data/types'
import { cn, formatCurrency } from '../../lib/utils'
import { toast } from '../ui/Toaster'

export function CouponStrip({ coupons }: { coupons: Coupon[] }) {
  const [claimed, setClaimed] = useState<Record<string, boolean>>({})

  if (!coupons || coupons.length === 0) return null

  const handleClaim = (c: Coupon) => {
    setClaimed((s) => ({ ...s, [c.id]: true }))
    toast(`已领取 ${formatCurrency(c.amount)} 优惠券`, 'success')
  }

  return (
    <div className="rounded-3xl p-5 bg-gradient-to-r from-amber-50 via-orange-50 to-debate-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-debate-900/20 border border-debate-200/50 dark:border-debate-800/50">
      <div className="flex items-center gap-2 mb-3">
        <Ticket className="w-5 h-5 text-debate-600" />
        <h3 className="font-bold text-sm sm:text-base">店铺优惠券</h3>
        <span className="text-xs text-ink-500">领取后下单可用</span>
      </div>
      <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-1">
        {coupons.map((c) => {
          const isClaimed = claimed[c.id] || c.claimed
          return (
            <div
              key={c.id}
              className={cn(
                'flex-shrink-0 flex items-center gap-3 pr-3 rounded-2xl overflow-hidden border-2 transition-all',
                isClaimed
                  ? 'border-ink-200/60 dark:border-ink-700/60 opacity-60'
                  : 'border-debate-300 dark:border-debate-700 hover:border-debate-500'
              )}
            >
              <div className="bg-gradient-to-br from-debate-500 to-orange-500 text-white px-4 py-3 text-center min-w-[80px]">
                <div className="text-[10px] font-medium opacity-90">¥</div>
                <div className="text-2xl font-bold leading-none">{c.amount}</div>
                <div className="text-[10px] mt-0.5 opacity-90">满{c.threshold}可用</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-ink-700 dark:text-ink-200">{c.description}</div>
                <div className="text-[10px] text-ink-500 mt-0.5">有效期至 {c.expiresAt.slice(0, 10)}</div>
              </div>
              <button
                onClick={() => !isClaimed && handleClaim(c)}
                disabled={isClaimed}
                className={cn(
                  'h-7 px-3 rounded-full text-xs font-semibold transition-colors',
                  isClaimed
                    ? 'bg-ink-100 dark:bg-ink-800 text-ink-500'
                    : 'bg-debate-500 text-white hover:bg-debate-600'
                )}
              >
                {isClaimed ? <><Check className="inline w-3 h-3" /> 已领</> : '领取'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
