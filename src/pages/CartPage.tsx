import { SmartCart } from '../components/SmartCart'
import { ShoppingCart } from 'lucide-react'

export function CartPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <ShoppingCart className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">购物车</h1>
          <p className="text-sm text-ink-500">勾选结算 · 浏览记录 · 猜你喜欢</p>
        </div>
      </div>
      <SmartCart />
    </div>
  )
}
