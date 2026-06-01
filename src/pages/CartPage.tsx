import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, Trash2, ShoppingCart, ArrowRight, Sparkles, Heart } from 'lucide-react'
import { products } from '../data'
import { useVersa, versa } from '../store/versa'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { formatCurrency, formatNumber, cn } from '../lib/utils'

export function CartPage() {
  const { cart, wishlist } = useVersa()
  const navigate = useNavigate()

  const items = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) })).filter((c) => c.product)
  const subtotal = items.reduce((sum, c) => sum + c.product!.price * c.quantity, 0)
  const shipping = subtotal > 0 ? (subtotal > 99 ? 0 : 12) : 0
  const total = subtotal + shipping

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8" />}
          title="购物车是空的"
          description="去逛逛 Versa 的好物吧"
          action={
            <div className="flex gap-2">
              <Link to="/shop"><Button leftIcon={<Sparkles className="w-4 h-4" />}>开始购物</Button></Link>
              {wishlist.length > 0 && (
                <Link to="/profile/wishlist"><Button variant="outline" leftIcon={<Heart className="w-4 h-4" />}>查看收藏 ({wishlist.length})</Button></Link>
              )}
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">购物车</h1>
          <p className="text-ink-500 dark:text-ink-400 mt-1">{items.length} 件商品</p>
        </div>
        <button
          onClick={() => { if (confirm('确定清空购物车？')) versa.clearCart() }}
          className="text-sm text-ink-500 hover:text-debate-500 inline-flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" /> 清空
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-3">
          {items.map((c) => (
            <div key={c.productId} className="flex gap-4 p-4 rounded-2xl bg-white/70 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
              <Link to={`/shop/${c.product!.id}`} className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-ink-100 dark:bg-ink-800 flex-shrink-0">
                <img src={c.product!.images[0]} alt="" className="w-full h-full object-cover" />
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link to={`/shop/${c.product!.id}`} className="font-semibold line-clamp-1 hover:text-shop-600">{c.product!.name}</Link>
                    <p className="text-xs text-ink-500 line-clamp-1 mt-0.5">{c.product!.tagline}</p>
                  </div>
                  <button
                    onClick={() => versa.removeFromCart(c.productId)}
                    className="p-1.5 rounded-lg hover:bg-debate-500/10 text-ink-400 hover:text-debate-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-bold text-shop-600 text-lg">{formatCurrency(c.product!.price)}</span>
                  <div className="flex items-center border border-ink-200 dark:border-ink-700 rounded-lg overflow-hidden">
                    <button onClick={() => versa.updateCartQuantity(c.productId, c.quantity - 1)} className="w-8 h-8 flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold">{c.quantity}</span>
                    <button onClick={() => versa.updateCartQuantity(c.productId, c.quantity + 1)} className="w-8 h-8 flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl p-6 bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
            <h2 className="text-lg font-bold mb-4">订单摘要</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">商品小计</span>
                <span className="font-semibold">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">运费</span>
                <span className="font-semibold">{shipping === 0 ? <span className="text-shop-500">免运费</span> : formatCurrency(shipping)}</span>
              </div>
              {subtotal < 99 && subtotal > 0 && (
                <div className="text-xs text-ink-500 bg-news-500/10 text-news-600 dark:text-news-500 px-2 py-1.5 rounded-lg">
                  再买 {formatCurrency(99 - subtotal)} 享免运费
                </div>
              )}
              <div className="pt-3 border-t border-ink-200 dark:border-ink-800 flex items-center justify-between text-base">
                <span className="font-bold">合计</span>
                <span className="font-bold text-2xl text-shop-600">{formatCurrency(total)}</span>
              </div>
            </div>
            <Button size="lg" fullWidth onClick={() => navigate('/checkout')} className="mt-5" rightIcon={<ArrowRight className="w-4 h-4" />}>
              去结算
            </Button>
            <p className="text-xs text-ink-500 text-center mt-3">支付为模拟流程，无真实交易</p>
          </div>
        </div>
      </div>
    </div>
  )
}
