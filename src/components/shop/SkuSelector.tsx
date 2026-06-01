import { useState } from 'react'
import { Check } from 'lucide-react'
import type { Product, SkuSelection } from '../../data/types'
import { cn, formatCurrency } from '../../lib/utils'

export function SkuSelector({
  product,
  selection,
  onChange,
}: {
  product: Product
  selection: SkuSelection
  onChange: (sel: SkuSelection) => void
}) {
  if (!product.sku) return null

  const basePrice = product.price
  const calcPrice = () => {
    let delta = 0
    product.sku!.options.forEach((opt) => {
      const v = selection[opt.name]
      const val = opt.values.find((x) => x.value === v)
      if (val?.priceDelta) delta += val.priceDelta
    })
    return basePrice + delta
  }

  return (
    <div className="space-y-4">
      {product.sku.options.map((opt) => (
        <div key={opt.name}>
          <div className="text-sm font-medium mb-2">
            {opt.name}
            {selection[opt.name] && (
              <span className="ml-2 text-shop-600 font-semibold">{selection[opt.name]}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {opt.values.map((v) => {
              const selected = selection[opt.name] === v.value
              return (
                <button
                  key={v.value}
                  disabled={!v.available}
                  onClick={() => onChange({ ...selection, [opt.name]: v.value })}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all border',
                    selected
                      ? 'border-shop-500 bg-shop-50 dark:bg-shop-500/10 text-shop-600 font-semibold'
                      : 'border-ink-200 dark:border-ink-700 hover:border-shop-300',
                    !v.available && 'opacity-40 line-through cursor-not-allowed'
                  )}
                >
                  {v.image && (
                    <img src={v.image} alt="" className="w-5 h-5 rounded object-cover" />
                  )}
                  {v.value}
                  {v.priceDelta && v.priceDelta > 0 && (
                    <span className="text-xs text-ink-500">+{v.priceDelta}</span>
                  )}
                  {selected && <Check className="w-3.5 h-3.5 ml-0.5" />}
                </button>
              )
            })}
          </div>
        </div>
      ))}
      <div className="text-xs text-ink-500 pt-2 border-t border-ink-200/60 dark:border-ink-800/60">
        当前价格: <span className="font-bold text-shop-600">{formatCurrency(calcPrice())}</span>
      </div>
    </div>
  )
}
