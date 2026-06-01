import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Zap, Tag, Check } from 'lucide-react'
import type { Product } from '../../data/types'
import { formatCurrency, formatNumber, cn } from '../../lib/utils'
import { Badge } from '../ui/Badge'
import { useVersa, versa } from '../../store/versa'
import { toast } from '../ui/Toaster'

const categoryColor: Record<string, any> = {
  tech: 'nova', fashion: 'default', home: 'shop', books: 'news', food: 'shop', sports: 'default', beauty: 'debate',
}
const categoryLabel: Record<string, string> = {
  tech: '数码', fashion: '服饰', home: '家居', books: '图书', food: '食品', sports: '运动', beauty: '美妆',
}

export function ProductCardV2({ product, variant = 'default' }: { product: Product; variant?: 'default' | 'recommend' }) {
  const state = useVersa()
  const inWishlist = state.wishlist.includes(product.id)
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0
  const isFlash = !!product.flashSale
  const flashPrice = isFlash ? product.flashSale!.flashPrice : null
  const soldPct = isFlash ? (product.flashSale!.sold / product.flashSale!.total) * 100 : 0

  const toggleWish = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    versa.toggleWishlist(product.id)
    toast(inWishlist ? '已取消收藏' : '已加入收藏 💚', 'success')
  }

  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    versa.addToCart(product.id, 1)
    toast('已加入购物车', 'success')
  }

  return (
    <div className="group card-hover rounded-2xl overflow-hidden bg-white dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 relative">
      <Link to={`/shop/${product.id}`} className="block">
        <div className="aspect-square overflow-hidden bg-ink-100 dark:bg-ink-800 relative">
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {/* 标签角标 - 淘宝风: 多标签左上+右上 */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isFlash && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-debate-500 to-orange-500 text-white text-[10px] font-bold">
                <Zap className="w-3 h-3 fill-current" />秒杀
              </div>
            )}
            {product.isFlagship && (
              <div className="px-1.5 py-0.5 rounded bg-debate-500 text-white text-[10px] font-bold">官方旗舰</div>
            )}
            {discount > 0 && !isFlash && (
              <div className="px-1.5 py-0.5 rounded bg-debate-500 text-white text-[10px] font-bold">
                {discount}% OFF
              </div>
            )}
          </div>
          {product.isExclusive && (
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-nova-500 text-white text-[10px] font-bold">
              独家
            </div>
          )}
        </div>
      </Link>
      <button
        onClick={toggleWish}
        className={cn(
          'absolute top-2 right-2 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all z-10',
          product.isExclusive ? 'top-9' : '',
          inWishlist
            ? 'bg-debate-500 text-white'
            : 'bg-white/90 dark:bg-ink-900/90 text-ink-700 dark:text-ink-200 opacity-0 group-hover:opacity-100 hover:scale-110'
        )}
      >
        <Heart className={cn('w-4 h-4', inWishlist && 'fill-current')} />
      </button>
      <Link to={`/shop/${product.id}`} className="block p-3">
        <h3 className="font-medium text-sm leading-snug line-clamp-1 group-hover:text-shop-600 transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5 line-clamp-1">{product.tagline}</p>

        {/* 价格 - 淘宝风: 红色大字 + 划线原价 */}
        <div className="mt-2 flex items-baseline gap-1.5">
          {isFlash && flashPrice ? (
            <>
              <span className="text-lg font-bold text-debate-600">
                <span className="text-xs">¥</span>{flashPrice}
              </span>
              <span className="text-xs text-ink-400 line-through">{formatCurrency(product.price)}</span>
            </>
          ) : (
            <>
              <span className="text-lg font-bold text-shop-600">
                <span className="text-xs">¥</span>{product.price}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-ink-400 line-through">{formatCurrency(product.originalPrice)}</span>
              )}
            </>
          )}
        </div>

        {/* 销量 + 评价 - 淘宝风 */}
        <div className="mt-1.5 flex items-center gap-2 text-[10px] text-ink-500">
          <span>⭐ {product.rating}</span>
          <span>·</span>
          <span>{(product.sales || 0).toLocaleString()} 人付款</span>
        </div>

        {/* 限时秒杀进度条 */}
        {isFlash && (
          <div className="mt-1.5">
            <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-debate-500 to-orange-500" style={{ width: `${soldPct}%` }} />
            </div>
            <div className="text-[10px] text-debate-600 mt-0.5">已抢 {soldPct.toFixed(0)}%</div>
          </div>
        )}

        {/* 优惠券/标签 */}
        {!isFlash && product.coupons && product.coupons.length > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-debate-600">
            <Tag className="w-3 h-3" />
            <span>领券减 {product.coupons[0].amount}</span>
          </div>
        )}
      </Link>
    </div>
  )
}
