import { useState, useMemo } from 'react'
import { BottomSheet } from '../ui/BottomSheet'
import { useVersa } from '../../store/versa'
import { cn, formatCurrency } from '../../lib/utils'
import { Tag, Check, AlertCircle, Sparkles } from 'lucide-react'
import type { UserCoupon } from '../../data/types'
import type { Product } from '../../data/types'

interface CouponPickerProps {
  open: boolean
  onClose: () => void
  selectedId: string | null
  onSelect: (c: UserCoupon | null) => void
  items: { product: Product; quantity: number }[]
}

export function CouponPickerSheet({ open, onClose, selectedId, onSelect, items }: CouponPickerProps) {
  const { coupons } = useVersa()
  const [tab, setTab] = useState<'all' | 'available' | 'unavailable'>('all')

  const subtotal = items.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const categories = new Set(items.map((i) => i.product.category))
  const brands = new Set(items.map((i) => i.product.brand))

  const enriched = useMemo(() => {
    return coupons.map((c) => {
      let available = subtotal >= c.threshold
      if (available) {
        if (c.scope === 'category' && c.scopeValue && !categories.has(c.scopeValue as any)) {
          available = items.some((i) => i.product.category === c.scopeValue)
        }
        if (c.scope === 'brand' && c.scopeValue && !brands.has(c.scopeValue)) {
          available = false
        }
      }
      const reason = !available
        ? c.threshold > subtotal
          ? `还差 ¥${(c.threshold - subtotal).toFixed(0)} 可用`
          : '不适用于所选商品'
        : ''
      return { coupon: c, available, reason }
    })
  }, [coupons, subtotal, items])

  const filtered = enriched.filter((e) => {
    if (tab === 'available') return e.available
    if (tab === 'unavailable') return !e.available
    return true
  })

  const total = enriched.filter((e) => e.available).length

  return (
    <BottomSheet open={open} onClose={onClose} title="选择优惠券" maxHeight="90vh">
      <div className="px-5 py-3">
        {/* 顶部信息条 */}
        <div className="rounded-2xl p-3 bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20 mb-4">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-red-500" />
            <span>订单金额 <strong className="text-red-600">{formatCurrency(subtotal)}</strong> · 可用券 <strong className="text-red-600">{total}</strong> 张</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-ink-100 dark:bg-ink-800 p-1 rounded-xl mb-3">
          {[
            { v: 'all', l: `全部 ${enriched.length}` },
            { v: 'available', l: `可用 ${total}` },
            { v: 'unavailable', l: `不可用 ${enriched.length - total}` },
          ].map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v as any)}
              className={cn('flex-1 h-8 rounded-lg text-xs font-medium transition-colors', tab === t.v ? 'bg-white dark:bg-ink-900 shadow-sm' : 'text-ink-500')}
            >
              {t.l}
            </button>
          ))}
        </div>

        {/* 券列表 */}
        <div className="space-y-2.5 pb-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-sm text-ink-500">
              <Tag className="w-10 h-10 text-ink-300 mx-auto mb-2" />
              当前没有{tab === 'available' ? '可用的' : '不可用的'}优惠券
            </div>
          ) : (
            filtered.map(({ coupon, available, reason }) => {
              const isSelected = selectedId === coupon.id
              return (
                <button
                  key={coupon.id}
                  onClick={() => available && onSelect(isSelected ? null : coupon)}
                  disabled={!available}
                  className={cn(
                    'w-full flex items-stretch rounded-2xl overflow-hidden border-2 transition-all text-left',
                    !available && 'opacity-50 cursor-not-allowed',
                    isSelected ? 'border-red-500 shadow-lg shadow-red-500/20' : available ? 'border-ink-200/60 dark:border-ink-800/60 hover:border-red-500/30' : 'border-ink-200/60 dark:border-ink-800/60'
                  )}
                >
                  {/* 左侧 - 金额 */}
                  <div className={cn(
                    'flex flex-col items-center justify-center px-4 py-3 text-white min-w-[100px] relative',
                    available ? 'bg-gradient-to-br from-red-500 to-orange-500' : 'bg-gradient-to-br from-ink-400 to-ink-500'
                  )}>
                    <div className="text-[10px] font-medium">¥</div>
                    <div className="text-3xl font-bold leading-none">{coupon.amount}</div>
                    {coupon.threshold > 0 && (
                      <div className="text-[10px] mt-1 opacity-90">满{coupon.threshold}可用</div>
                    )}
                    {/* 圆点装饰 */}
                    <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white dark:bg-ink-900" />
                  </div>
                  {/* 右侧 - 详情 */}
                  <div className="flex-1 px-4 py-3 bg-white/60 dark:bg-ink-900/40 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="text-sm font-bold flex items-center gap-1">
                        {coupon.name}
                        {coupon.scope === 'category' && coupon.scopeValue && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-shop-500/10 text-shop-600 font-medium">类目券</span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-500 mt-0.5 line-clamp-1">{coupon.description}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-[10px] text-ink-400">有效期至 {coupon.expiresAt}</div>
                      {!available && reason && (
                        <div className="text-[10px] text-ink-500 flex items-center gap-0.5">
                          <AlertCircle className="w-2.5 h-2.5" />{reason}
                        </div>
                      )}
                      {isSelected && (
                        <div className="text-[10px] text-red-500 font-bold flex items-center gap-0.5">
                          <Check className="w-3 h-3" />已选择
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* 底部 - 不使用券 */}
        <div className="sticky bottom-0 -mx-5 px-5 py-3 bg-white/95 dark:bg-ink-900/95 backdrop-blur-md border-t border-ink-100 dark:border-ink-800">
          <button
            onClick={() => onSelect(null)}
            className="w-full h-10 rounded-xl border border-ink-200 dark:border-ink-700 text-sm font-medium hover:bg-ink-50 dark:hover:bg-ink-800"
          >
            不使用优惠券
          </button>
        </div>
      </div>
    </BottomSheet>
  )
}
