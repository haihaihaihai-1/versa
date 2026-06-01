import { Link } from 'react-router-dom'
import { Heart, Star, ShoppingCart, Flame, Tag, Eye } from 'lucide-react'
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

export function ProductCard({ product, variant = 'default' }: { product: Product; variant?: 'default' | 'compact' }) {
  const state = useVersa()
  const inWishlist = state.wishlist.includes(product.id)
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0

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

  if (variant === 'compact') {
    return (
      <Link
        to={`/shop/${product.id}`}
        className="group flex gap-3 p-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-900/40 transition-colors"
      >
        <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-ink-100 dark:bg-ink-800">
          <img src={product.images[0]} alt="" loading="lazy" className="w-full h-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm line-clamp-1 group-hover:text-shop-600">{product.name}</div>
          <div className="text-xs text-ink-500 dark:text-ink-400 line-clamp-1">{product.tagline}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-bold text-shop-600">{formatCurrency(product.price)}</span>
            <span className="text-xs text-ink-500">⭐ {product.rating}</span>
          </div>
        </div>
      </Link>
    )
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
          {discount > 0 && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-debate-500 text-white text-[10px] font-bold">
              <Tag className="w-3 h-3" />-{discount}%
            </div>
          )}
          {product.isNewsworthy && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-news-500 text-white text-[10px] font-bold">
              <Flame className="inline w-3 h-3 mr-0.5" />热门
            </div>
          )}
        </div>
      </Link>
      <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={toggleWish}
          className={cn(
            'w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all',
            inWishlist
              ? 'bg-debate-500 text-white'
              : 'bg-white/90 dark:bg-ink-900/90 text-ink-700 dark:text-ink-200 hover:scale-110'
          )}
        >
          <Heart className={cn('w-4 h-4', inWishlist && 'fill-current')} />
        </button>
      </div>
      <Link to={`/shop/${product.id}`} className="block p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={categoryColor[product.category]} size="sm">{categoryLabel[product.category]}</Badge>
          {product.linkedDebateIds && product.linkedDebateIds.length > 0 && (
            <Badge variant="debate" size="sm">有辩论</Badge>
          )}
        </div>
        <h3 className="font-semibold text-sm leading-snug line-clamp-1 group-hover:text-shop-600 transition-colors">
          {product.name}
        </h3>
        <p className="text-xs text-ink-500 dark:text-ink-400 mt-1 line-clamp-1">{product.tagline}</p>
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <Star className="w-3 h-3 fill-news-500 text-news-500" />
          <span className="font-medium">{product.rating}</span>
          <span className="text-ink-500">({formatNumber(product.reviewCount)})</span>
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-lg font-bold text-shop-600">{formatCurrency(product.price)}</div>
            {product.originalPrice && (
              <div className="text-xs text-ink-400 line-through">{formatCurrency(product.originalPrice)}</div>
            )}
          </div>
          <button
            onClick={quickAdd}
            className="w-9 h-9 rounded-xl bg-ink-100 dark:bg-ink-800 flex items-center justify-center hover:bg-shop-500 hover:text-white transition-colors"
            aria-label="加入购物车"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </Link>
    </div>
  )
}
