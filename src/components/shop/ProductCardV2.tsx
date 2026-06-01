import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Zap, Tag, Check, Star, Award, Sparkles } from 'lucide-react'
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

export function ProductCardV2({ product, variant = 'default', compact = false, editorial = false }: { product: Product; variant?: 'default' | 'recommend' | 'editorial'; compact?: boolean; editorial?: boolean }) {
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

  if (editorial) return <ProductCardEditorial product={product} inWishlist={inWishlist} toggleWish={toggleWish} />

  return (
    <div className={cn('group relative rounded-2xl overflow-hidden bg-white dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 transition-all duration-500 hover:shadow-2xl hover:shadow-shop-500/10 hover:-translate-y-1', compact && 'rounded-xl')}>
      <Link to={`/shop/${product.id}`} className="block">
        <div className={cn('overflow-hidden bg-gradient-to-br from-ink-100 to-ink-50 dark:from-ink-800 dark:to-ink-900 relative', compact ? 'aspect-square' : 'aspect-square')}>
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          {/* 标签角标 - 多标签左上 */}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {isFlash && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-debate-500 to-orange-500 text-white text-[10px] font-bold shadow-lg">
                <Zap className="w-3 h-3 fill-current" />秒杀
              </div>
            )}
            {product.isFlagship && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-news-500 to-news-600 text-white text-[10px] font-bold shadow-lg">
                <Award className="w-3 h-3" />官方旗舰
              </div>
            )}
            {discount > 0 && !isFlash && (
              <div className="px-1.5 py-0.5 rounded bg-gradient-to-r from-shop-500 to-pink-500 text-white text-[10px] font-bold shadow-lg">
                {discount}% OFF
              </div>
            )}
          </div>
          {product.isExclusive && (
            <div className="absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gradient-to-r from-nova-500 to-purple-500 text-white text-[10px] font-bold shadow-lg">
              <Sparkles className="w-3 h-3" />独家
            </div>
          )}
          {/* hover 渐变覆盖 */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      </Link>
      <button
        onClick={toggleWish}
        className={cn(
          'absolute top-2 right-2 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all z-10 shadow-lg',
          product.isExclusive ? 'top-9' : '',
          inWishlist
            ? 'bg-debate-500 text-white'
            : 'bg-white/95 dark:bg-ink-900/95 text-ink-700 dark:text-ink-200 opacity-0 group-hover:opacity-100 hover:scale-110'
        )}
      >
        <Heart className={cn('w-4 h-4', inWishlist && 'fill-current')} />
      </button>
      <Link to={`/shop/${product.id}`} className={cn('block', compact ? 'p-2.5' : 'p-3')}>
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] text-ink-500 font-semibold uppercase tracking-wide">{product.brand}</span>
          <span className="text-ink-300 dark:text-ink-600">·</span>
          <span className="text-[10px] text-ink-400">{categoryLabel[product.category]}</span>
        </div>
        <h3 className={cn('font-bold leading-snug line-clamp-1 group-hover:text-shop-600 transition-colors', compact ? 'text-xs' : 'text-sm')}>
          {product.name}
        </h3>
        {!compact && (
          <p className="text-xs text-ink-500 dark:text-ink-400 mt-1 line-clamp-1">{product.tagline}</p>
        )}

        {/* 价格 - 大字 + 双价 + 销量 */}
        <div className={cn('flex items-baseline gap-1.5', compact ? 'mt-1' : 'mt-2.5')}>
          {isFlash && flashPrice ? (
            <>
              <span className={cn('font-bold bg-gradient-to-r from-debate-600 to-orange-500 bg-clip-text text-transparent', compact ? 'text-base' : 'text-xl')}>
                <span className="text-xs">¥</span>{flashPrice}
              </span>
              <span className="text-[10px] text-ink-400 line-through">{formatCurrency(product.price)}</span>
            </>
          ) : (
            <>
              <span className={cn('font-bold bg-gradient-to-r from-shop-600 to-pink-500 bg-clip-text text-transparent', compact ? 'text-base' : 'text-xl')}>
                <span className="text-xs">¥</span>{product.price}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-[10px] text-ink-400 line-through">{formatCurrency(product.originalPrice)}</span>
              )}
            </>
          )}
        </div>

        {!compact && (
          <>
            {/* 评分 + 销量 */}
            <div className="mt-1.5 flex items-center gap-2 text-[10px] text-ink-500">
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <strong className="text-ink-700 dark:text-ink-200 font-bold">{product.rating}</strong>
              </span>
              <span>·</span>
              <span>{(product.sales || 0).toLocaleString()} 人付款</span>
            </div>

            {/* 限时秒杀进度条 */}
            {isFlash && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-debate-500 to-orange-500" style={{ width: `${soldPct}%` }} />
                </div>
                <div className="text-[10px] text-debate-600 mt-0.5 font-semibold">已抢 {soldPct.toFixed(0)}%</div>
              </div>
            )}

            {/* 优惠券/标签 */}
            {!isFlash && product.coupons && product.coupons.length > 0 && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-debate-500/10 text-debate-600 text-[10px] font-semibold">
                <Tag className="w-3 h-3" />
                领券减 ¥{product.coupons[0].amount}
              </div>
            )}
          </>
        )}
      </Link>
    </div>
  )
}

function ProductCardEditorial({ product, inWishlist, toggleWish }: { product: Product; inWishlist: boolean; toggleWish: (e: React.MouseEvent) => void }) {
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0
  return (
    <Link
      to={`/shop/${product.id}`}
      className="group block rounded-3xl overflow-hidden bg-white dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 transition-all duration-500 hover:shadow-2xl hover:shadow-shop-500/10"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-ink-100 to-ink-50 dark:from-ink-800 dark:to-ink-900">
        <img
          src={product.images[0]}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/20 to-transparent" />
        {/* 顶部标签 */}
        <div className="absolute top-4 left-4 flex flex-col gap-1.5">
          {product.isFlagship && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-news-500 to-news-600 text-white text-xs font-bold shadow-lg backdrop-blur-md">
              <Award className="w-3 h-3" />官方旗舰
            </div>
          )}
          {product.isExclusive && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-nova-500 to-purple-500 text-white text-xs font-bold shadow-lg backdrop-blur-md">
              <Sparkles className="w-3 h-3" />独家
            </div>
          )}
          {discount > 0 && (
            <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-debate-500 to-orange-500 text-white text-xs font-bold shadow-lg backdrop-blur-md">
              立省 {discount}%
            </div>
          )}
        </div>
        <button
          onClick={toggleWish}
          className={cn(
            'absolute top-4 right-4 w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all shadow-lg',
            inWishlist ? 'bg-debate-500 text-white' : 'bg-white/95 dark:bg-ink-900/95 text-ink-700 dark:text-ink-200 opacity-0 group-hover:opacity-100 hover:scale-110'
          )}
        >
          <Heart className={cn('w-4 h-4', inWishlist && 'fill-current')} />
        </button>
        {/* 底部大文字 - 杂志风 */}
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <div className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-1">{product.brand}</div>
          <h3 className="text-xl sm:text-2xl font-bold leading-tight line-clamp-2 mb-1">{product.name}</h3>
          <p className="text-xs opacity-80 line-clamp-1">{product.tagline}</p>
        </div>
      </div>
      <div className="p-5 flex items-center justify-between">
        <div>
          <div className="text-[10px] text-ink-500 mb-1">编辑精选</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-shop-600 to-pink-500 bg-clip-text text-transparent">
              <span className="text-sm">¥</span>{product.price.toLocaleString()}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-ink-400 line-through">¥{product.originalPrice.toLocaleString()}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-ink-500">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <strong className="text-ink-700 dark:text-ink-200 font-bold">{product.rating}</strong>
          <span>·</span>
          <span>{(product.sales || 0).toLocaleString()}+ 付款</span>
        </div>
      </div>
    </Link>
  )
}
