import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Minus, Plus, Trash2, ShoppingCart, ArrowRight, Sparkles, Heart, Tag,
  CheckCircle2, Circle, Store, ChevronDown, ChevronUp, Gift, AlertCircle, Percent,
} from 'lucide-react'
import { products, brands } from '../data'
import { useVersa, versa } from '../store/versa'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { formatCurrency, formatNumber, cn } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

export function CartPage() {
  const { cart, wishlist } = useVersa()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [coupon, setCoupon] = useState<{ brandId: string; amount: number } | null>(null)

  const items = cart
    .map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) }))
    .filter((c) => c.product) as Array<{
      productId: string
      quantity: number
      product: NonNullable<ReturnType<typeof products.find>>
    }>

  // 按 brand 分组
  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>()
    items.forEach((c) => {
      const bid = c.product.brand || 'unknown'
      if (!map.has(bid)) map.set(bid, [])
      map.get(bid)!.push(c)
    })
    return Array.from(map.entries()).map(([bid, list]) => ({
      brandId: bid,
      brand: brands.find((b) => b.name === bid),
      items: list,
    }))
  }, [items])

  const selectedItems = items.filter((c) => selected.has(c.productId))
  const subtotal = selectedItems.reduce((sum, c) => sum + c.product.price * c.quantity, 0)
  const shipping = selectedItems.length === 0 ? 0 : subtotal > 99 ? 0 : 12
  const couponDiscount = coupon ? Math.min(coupon.amount, subtotal) : 0
  const total = Math.max(0, subtotal + shipping - couponDiscount)

  // 跨品牌券（演示）
  const availableCoupons = useMemo(() => {
    return grouped
      .filter((g) => selectedItems.some((s) => s.product.brand === g.brandId))
      .map((g) => ({
        brandId: g.brandId,
        brandName: g.brand?.name || '官方',
        amount: 20,
        condition: 100,
      }))
  }, [grouped, selectedItems])

  const toggleAll = () => {
    if (selected.size === items.length) setSelected(new Set())
    else setSelected(new Set(items.map((c) => c.productId)))
  }

  const toggleItem = (pid: string) => {
    const next = new Set(selected)
    next.has(pid) ? next.delete(pid) : next.add(pid)
    setSelected(next)
  }

  const toggleBrand = (bid: string, list: typeof items) => {
    const ids = list.map((c) => c.productId)
    const allSelected = ids.every((id) => selected.has(id))
    const next = new Set(selected)
    if (allSelected) ids.forEach((id) => next.delete(id))
    else ids.forEach((id) => next.add(id))
    setSelected(next)
  }

  const toggleCollapsed = (bid: string) => {
    const next = new Set(collapsed)
    next.has(bid) ? next.delete(bid) : next.add(bid)
    setCollapsed(next)
  }

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

  const allSelected = items.length > 0 && selected.size === items.length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold">购物车</h1>
          <p className="text-ink-500 dark:text-ink-400 mt-1 text-sm">
            共 {items.length} 件 · {grouped.length} 个店铺 · 已选 {selected.size} 件
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toast('已为你保留 30 分钟', 'success')}
            className="text-sm px-3 py-1.5 rounded-lg border border-shop-500/30 text-shop-600 hover:bg-shop-500/5 inline-flex items-center gap-1.5"
          >
            <Circle className="w-3.5 h-3.5" /> 全部移入收藏
          </button>
          <button
            onClick={() => { if (confirm('确定清空购物车？')) versa.clearCart() }}
            className="text-sm text-ink-500 hover:text-debate-500 inline-flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" /> 清空
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        {/* Left: items grouped by brand */}
        <div className="space-y-4">
          {grouped.map((g) => {
            const brandSelected = g.items.every((c) => selected.has(c.productId))
            const brandSubtotal = g.items.reduce((s, c) => s + c.product.price * c.quantity, 0)
            const isCollapsed = collapsed.has(g.brandId)
            const couponAvail = availableCoupons.find((c) => c.brandId === g.brandId)
            return (
              <div key={g.brandId} className="rounded-2xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
                {/* 店铺 header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-100/60 dark:border-ink-800/60 bg-ink-50/40 dark:bg-ink-900/30">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleBrand(g.brandId, g.items)}
                      className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0',
                        brandSelected ? 'bg-shop-500 text-white' : 'border-2 border-ink-300 dark:border-ink-600'
                      )}
                      aria-label="选择店铺"
                    >
                      {brandSelected && <CheckCircle2 className="w-3.5 h-3.5" fill="currentColor" />}
                    </button>
                    <div className="flex items-center gap-2">
                      <Store className="w-4 h-4 text-shop-500" />
                      <span className="font-bold text-sm">{g.brand?.name || g.brandId}</span>
                      <Link to={`/shop/brand/${g.brand?.id || g.brandId}`} className="text-xs text-shop-600 hover:underline">
                        进店 ›
                      </Link>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleCollapsed(g.brandId)}
                    className="p-1 rounded hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-400"
                    aria-label="折叠"
                  >
                    {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>

                {/* Items */}
                {!isCollapsed && (
                  <div className="divide-y divide-ink-100/60 dark:divide-ink-800/60">
                    {g.items.map((c) => (
                      <div key={c.productId} className="flex gap-3 p-4">
                        <button
                          onClick={() => toggleItem(c.productId)}
                          className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center transition-all flex-shrink-0 mt-1',
                            selected.has(c.productId) ? 'bg-shop-500 text-white' : 'border-2 border-ink-300 dark:border-ink-600'
                          )}
                          aria-label="选择商品"
                        >
                          {selected.has(c.productId) && <CheckCircle2 className="w-3.5 h-3.5" fill="currentColor" />}
                        </button>
                        <Link to={`/shop/${c.product.id}`} className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-ink-100 dark:bg-ink-800 flex-shrink-0">
                          <img src={c.product.images[0]} alt="" className="w-full h-full object-cover" />
                        </Link>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <Link to={`/shop/${c.product.id}`} className="font-semibold line-clamp-1 hover:text-shop-600">
                                {c.product.name}
                              </Link>
                              <p className="text-xs text-ink-500 line-clamp-1 mt-0.5">{c.product.tagline}</p>
                              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                {c.product.tags?.slice(0, 2).map((t) => (
                                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-shop-500/10 text-shop-600">{t}</span>
                                ))}
                                {c.product.sku && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded border border-ink-200 dark:border-ink-700 text-ink-500">默认</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => versa.removeFromCart(c.productId)}
                              className="p-1.5 rounded-lg hover:bg-debate-500/10 text-ink-400 hover:text-debate-500"
                              aria-label="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="mt-auto pt-2 flex items-end justify-between">
                            <div>
                              <span className="font-bold text-shop-600 text-lg">{formatCurrency(c.product.price)}</span>
                              {c.product.originalPrice && c.product.originalPrice > c.product.price && (
                                <span className="ml-1.5 text-xs text-ink-400 line-through">{formatCurrency(c.product.originalPrice)}</span>
                              )}
                            </div>
                            <div className="flex items-center border border-ink-200 dark:border-ink-700 rounded-lg overflow-hidden">
                              <button
                                onClick={() => versa.updateCartQuantity(c.productId, c.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800 disabled:opacity-40"
                                disabled={c.quantity <= 1}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="text"
                                value={c.quantity}
                                onChange={(e) => {
                                  const v = parseInt(e.target.value) || 1
                                  versa.updateCartQuantity(c.productId, Math.max(1, Math.min(99, v)))
                                }}
                                className="w-10 h-8 text-center text-sm font-semibold bg-transparent border-x border-ink-200 dark:border-ink-700 outline-none"
                              />
                              <button
                                onClick={() => versa.updateCartQuantity(c.productId, c.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 店铺优惠行 */}
                {couponAvail && !isCollapsed && (
                  <div className="px-5 py-3 border-t border-ink-100/60 dark:border-ink-800/60 bg-gradient-to-r from-red-500/5 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs">
                      <Tag className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-ink-700 dark:text-ink-200">本店领券</span>
                      <span className="text-red-500 font-bold">满{couponAvail.condition}减{couponAvail.amount}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (brandSubtotal >= couponAvail.condition) {
                          setCoupon({ brandId: g.brandId, amount: couponAvail.amount })
                          toast(`已使用 ${couponAvail.amount} 元店铺券`, 'success')
                        } else {
                          toast(`再买 ${formatCurrency(couponAvail.condition - brandSubtotal)} 可使用`, 'info')
                        }
                      }}
                      className={cn(
                        'text-xs px-3 py-1 rounded-full font-medium transition-colors',
                        coupon?.brandId === g.brandId
                          ? 'bg-red-500 text-white'
                          : 'border border-red-500 text-red-500 hover:bg-red-500 hover:text-white'
                      )}
                    >
                      {coupon?.brandId === g.brandId ? '已使用' : '立即领取'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* 猜你喜欢 */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="w-4 h-4 text-shop-500" />
              <h3 className="font-bold text-base">猜你还喜欢</h3>
              <span className="text-xs text-ink-400 ml-auto">基于浏览历史</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {products.slice(0, 4).map((p) => <ProductCardV2 key={p.id} product={p} compact />)}
            </div>
          </div>
        </div>

        {/* Right: sticky summary */}
        <div className="lg:sticky lg:top-24 h-fit space-y-3">
          {/* coupon strip */}
          {availableCoupons.length > 0 && (
            <div className="rounded-2xl p-4 bg-gradient-to-br from-red-500/8 to-orange-500/5 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-red-500" />
                <span className="text-sm font-bold text-red-600">可用优惠</span>
                <span className="text-[10px] text-ink-400 ml-auto">{availableCoupons.length} 张</span>
              </div>
              <div className="space-y-1.5">
                {availableCoupons.map((c) => (
                  <div key={c.brandId} className="flex items-center justify-between text-xs">
                    <span className="text-ink-600 dark:text-ink-300">
                      {c.brandName} · 满{c.condition}减{c.amount}
                    </span>
                    {coupon?.brandId === c.brandId ? (
                      <span className="text-red-500 font-bold">已使用</span>
                    ) : (
                      <button
                        onClick={() => {
                          setCoupon({ brandId: c.brandId, amount: c.amount })
                          toast(`已使用 ${c.amount} 元券`, 'success')
                        }}
                        className="text-red-500 font-bold hover:underline"
                      >
                        使用
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* summary */}
          <div className="rounded-2xl p-5 bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60">
            <h2 className="text-base font-bold mb-3">订单摘要</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-500">商品小计 ({selected.size})</span>
                <span className="font-semibold tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink-500">运费</span>
                <span className="font-semibold tabular-nums">
                  {shipping === 0 ? <span className="text-shop-500">免运费</span> : formatCurrency(shipping)}
                </span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex items-center justify-between text-red-500">
                  <span>店铺券</span>
                  <span className="font-semibold tabular-nums">-{formatCurrency(couponDiscount)}</span>
                </div>
              )}
              {subtotal > 0 && subtotal < 99 && (
                <div className="text-xs text-ink-500 bg-news-500/10 text-news-600 dark:text-news-500 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                  <AlertCircle className="w-3 h-3" />
                  再买 {formatCurrency(99 - subtotal)} 享免运费
                </div>
              )}
              <div className="pt-3 border-t border-ink-200 dark:border-ink-800 flex items-baseline justify-between">
                <span className="font-bold">应付</span>
                <span className="font-bold text-2xl text-shop-600 tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>
            <Button
              size="lg"
              fullWidth
              disabled={selected.size === 0}
              onClick={() => {
                if (selected.size === 0) return
                navigate('/checkout', { state: { selectedIds: Array.from(selected) } })
              }}
              className="mt-4"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              去结算 ({selected.size})
            </Button>
            <p className="text-[11px] text-ink-500 text-center mt-2">支付为模拟流程，无真实交易</p>
          </div>

          {/* 服务承诺 */}
          <div className="rounded-2xl p-4 bg-white/60 dark:bg-ink-900/30 border border-ink-200/40 dark:border-ink-800/40">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <Gift className="w-4 h-4 mx-auto text-shop-500 mb-1" />
                <div className="text-[10px] text-ink-500">满 99 包邮</div>
              </div>
              <div>
                <CheckCircle2 className="w-4 h-4 mx-auto text-shop-500 mb-1" />
                <div className="text-[10px] text-ink-500">正品保障</div>
              </div>
              <div>
                <Tag className="w-4 h-4 mx-auto text-shop-500 mb-1" />
                <div className="text-[10px] text-ink-500">7 天无理由</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
