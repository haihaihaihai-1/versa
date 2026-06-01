import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { ArrowLeft, Heart, Share2, Star, Minus, Plus, ShoppingCart, ShoppingBag, Scale, Truck, Shield, RotateCcw, Newspaper, ChevronRight, Tag, Check } from 'lucide-react'
import { products, news, debates } from '../data'
import { useVersa, versa } from '../store/versa'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Tabs } from '../components/ui/Tabs'
import { ProductCard } from '../components/shop/ProductCard'
import { NewsCard } from '../components/news/NewsCard'
import { DebateCard } from '../components/debate/DebateCard'
import { cn, formatCurrency, formatNumber } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = products.find((p) => p.id === id)
  const { wishlist } = useVersa()
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState('description')

  useEffect(() => { versa.visitModule('shop') }, [id])

  if (!product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">商品不存在</h2>
        <Button onClick={() => navigate('/shop')}>返回商品列表</Button>
      </div>
    )
  }

  const inWishlist = wishlist.includes(product.id)
  const linkedNews = product.linkedNewsId ? news.find((n) => n.id === product.linkedNewsId) : null
  const linkedDebates = product.linkedDebateIds?.map((id) => debates.find((d) => d.id === id)).filter(Boolean) || []
  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4)
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0

  const addToCart = () => {
    versa.addToCart(product.id, qty)
    toast(`已加入购物车 × ${qty}`, 'success')
  }

  const buyNow = () => {
    versa.addToCart(product.id, qty)
    navigate('/checkout')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-6">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* 图片 */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-ink-100 dark:bg-ink-800 relative">
            <img src={product.images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
            {discount > 0 && (
              <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1 rounded-full bg-debate-500 text-white text-sm font-bold">
                <Tag className="w-4 h-4" />-{discount}% OFF
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={cn('w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors', activeImage === i ? 'border-shop-500' : 'border-transparent opacity-60 hover:opacity-100')}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 信息 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge variant="shop">{product.brand}</Badge>
            {product.tags.map((t) => <Badge key={t} variant="outline" size="sm">{t}</Badge>)}
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight">{product.name}</h1>
          <p className="text-lg text-ink-600 dark:text-ink-300 mt-2">{product.tagline}</p>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={cn('w-4 h-4', i < Math.round(product.rating) ? 'fill-news-500 text-news-500' : 'text-ink-300')} />
              ))}
            </div>
            <span className="text-sm font-semibold">{product.rating}</span>
            <span className="text-sm text-ink-500">({formatNumber(product.reviewCount)} 评价)</span>
          </div>

          <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-shop-500/10 to-nova-500/10 border border-shop-500/20">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-shop-600">{formatCurrency(product.price)}</span>
              {product.originalPrice && (
                <span className="text-lg text-ink-400 line-through">{formatCurrency(product.originalPrice)}</span>
              )}
            </div>
            {discount > 0 && <div className="text-sm text-debate-500 mt-1">立省 {formatCurrency(product.originalPrice! - product.price)}</div>}
          </div>

          {/* 服务 */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { icon: Truck, label: '次日达' },
              { icon: Shield, label: '正品保证' },
              { icon: RotateCcw, label: '7 天无理由' },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-ink-50 dark:bg-ink-800/40 text-xs text-ink-600 dark:text-ink-300">
                <s.icon className="w-4 h-4 text-shop-500" />
                {s.label}
              </div>
            ))}
          </div>

          {/* 数量 */}
          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm font-medium">数量</span>
            <div className="flex items-center border border-ink-200 dark:border-ink-700 rounded-xl overflow-hidden">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800">
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center text-sm font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="w-9 h-9 flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs text-ink-500">库存 {product.stock} 件</span>
          </div>

          {/* 操作 */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button size="lg" variant="outline" onClick={addToCart} leftIcon={<ShoppingCart className="w-4 h-4" />} className="flex-1">
              加入购物车
            </Button>
            <Button size="lg" onClick={buyNow} leftIcon={<Check className="w-4 h-4" />} className="flex-1">
              立即购买
            </Button>
            <Button size="lg" variant="ghost" onClick={() => { versa.toggleWishlist(product.id); toast(inWishlist ? '已取消收藏' : '已加入收藏', 'success') }} leftIcon={<Heart className={cn('w-4 h-4', inWishlist && 'fill-debate-500 text-debate-500')} />}>
              {inWishlist ? '已收藏' : '收藏'}
            </Button>
          </div>

          {/* 跨模块：相关资讯/辩论 */}
          {(linkedNews || linkedDebates.length > 0) && (
            <div className="mt-8 space-y-2">
              {linkedNews && (
                <Link to={`/news/${linkedNews.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-news-500/5 border border-news-500/20 hover:border-news-500/50 transition-colors group">
                  <Newspaper className="w-5 h-5 text-news-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-news-600 font-semibold mb-0.5">媒体报道</div>
                    <div className="text-sm font-medium line-clamp-1">{linkedNews.title}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )}
              {linkedDebates.map((d) => d && (
                <Link key={d.id} to={`/debates/${d.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-debate-500/5 border border-debate-500/20 hover:border-debate-500/50 transition-colors group">
                  <Scale className="w-5 h-5 text-debate-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-debate-600 font-semibold mb-0.5">相关辩论</div>
                    <div className="text-sm font-medium line-clamp-1">{d.title}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 详情 / 规格 / 评价 */}
      <div className="mt-12">
        <Tabs
          variant="underline"
          tabs={[
            { value: 'description', label: '商品详情' },
            { value: 'specs', label: '规格参数' },
            { value: 'reviews', label: `用户评价 (${formatNumber(product.reviewCount)})` },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="mt-6">
          {tab === 'description' && (
            <div className="prose max-w-3xl text-ink-700 dark:text-ink-200 leading-relaxed">
              <p>{product.description}</p>
            </div>
          )}
          {tab === 'specs' && (
            <div className="max-w-2xl rounded-xl border border-ink-200 dark:border-ink-800 overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(product.specs).map(([k, v], i) => (
                    <tr key={k} className={cn(i !== 0 && 'border-t border-ink-200 dark:border-ink-800')}>
                      <td className="px-4 py-3 bg-ink-50 dark:bg-ink-900/60 font-medium w-32">{k}</td>
                      <td className="px-4 py-3">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'reviews' && <MockReviews rating={product.rating} />}
        </div>
      </div>

      {/* 相关商品 */}
      {related.length > 0 && (
        <div className="mt-12">
          <h3 className="text-xl font-bold mb-4">看了又看</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function MockReviews({ rating }: { rating: number }) {
  const reviews = [
    { name: '买家用1', avatar: 'https://i.pravatar.cc/100?img=68', rating: 5, text: '比想象中更好，做工精细，体验流畅。' },
    { name: '买家用2', avatar: 'https://i.pravatar.cc/100?img=64', rating: rating, text: '整体满意，物流很快，包装仔细。' },
    { name: '买家用3', avatar: 'https://i.pravatar.cc/100?img=52', rating: 4, text: '价格稍贵，但品质对得起这个价位。' },
  ]
  return (
    <div className="max-w-3xl space-y-4">
      {reviews.map((r, i) => (
        <div key={i} className="flex gap-3 p-4 rounded-xl bg-ink-50/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
          <img src={r.avatar} alt="" className="w-9 h-9 rounded-full" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{r.name}</span>
              <div className="flex">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={cn('w-3.5 h-3.5', j < r.rating ? 'fill-news-500 text-news-500' : 'text-ink-300')} />
                ))}
              </div>
            </div>
            <p className="text-sm text-ink-700 dark:text-ink-300 mt-1.5">{r.text}</p>
          </div>
        </div>
      ))}
      <p className="text-xs text-ink-500 text-center">显示示例评价 · 真实评价需连接后端</p>
    </div>
  )
}
