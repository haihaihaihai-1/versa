import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  ArrowLeft, Heart, Share2, Star, Minus, Plus, ShoppingCart, Scale, Truck,
  Shield, RotateCcw, Newspaper, ChevronRight, Tag, Check, MapPin,
  Award, MessageCircle, Sparkles, ChevronDown, Package
} from 'lucide-react'
import { products, news, debates } from '../data'
import { useVersa, versa } from '../store/versa'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Tabs } from '../components/ui/Tabs'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { NewsCard } from '../components/news/NewsCard'
import { DebateCard } from '../components/debate/DebateCard'
import { CouponStrip } from '../components/shop/CouponStrip'
import { SkuSelector } from '../components/shop/SkuSelector'
import { ServiceGuarantees } from '../components/shop/ServiceGuarantees'
import { ReviewList } from '../components/shop/ReviewList'
import { cn, formatCurrency, formatNumber } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import type { SkuSelection } from '../data/types'

export function ProductDetailV2() {
  const { id } = useParams()
  const navigate = useNavigate()
  const product = products.find((p) => p.id === id)
  const { wishlist } = useVersa()
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)
  const [tab, setTab] = useState('description')
  const [showSkuPanel, setShowSkuPanel] = useState(false)
  const [skuAction, setSkuAction] = useState<'cart' | 'buy'>('cart')
  const [sku, setSku] = useState<SkuSelection>({})

  useEffect(() => { versa.visitModule('shop') }, [id])
  useEffect(() => {
    if (product?.sku) {
      const initial: SkuSelection = {}
      product.sku.options.forEach((opt) => {
        const first = opt.values.find((v) => v.available)
        if (first) initial[opt.name] = first.value
      })
      setSku(initial)
    }
  }, [product?.id])

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
  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 5)
  const sameBrand = products.filter((p) => p.id !== product.id && p.brand === product.brand).slice(0, 5)
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0

  const addToCart = () => {
    versa.addToCart(product.id, qty)
    toast(`已加入购物车 × ${qty}`, 'success')
  }

  const buyNow = () => {
    versa.addToCart(product.id, qty)
    navigate('/checkout')
  }

  const handleSkuAction = (action: 'cart' | 'buy') => {
    if (product.sku) {
      const missing = product.sku.options.find((o) => !sku[o.name])
      if (missing) {
        toast(`请选择 ${missing.name}`, 'error')
        return
      }
    }
    setSkuAction(action)
    setShowSkuPanel(true)
  }

  return (
    <div className="pb-24">
      {/* 顶部返回 + 分享 - 透明覆盖在图上 */}
      <div className="sticky top-14 sm:top-16 z-30 -mx-4 px-4 py-3 bg-gradient-to-b from-ink-50/80 to-transparent dark:from-ink-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm hover:text-shop-600">
            <ArrowLeft className="w-4 h-4" /> 返回
          </button>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-white/80 dark:bg-ink-900/80 backdrop-blur-sm flex items-center justify-center hover:bg-white" onClick={() => navigator.share?.({ title: product.name, url: window.location.href }).catch(() => toast('已复制链接', 'success'))}>
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 顶部：图片 + 价格信息 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-10">
          {/* 图片区 */}
          <div className="lg:col-span-2">
            <div className="aspect-square rounded-3xl overflow-hidden bg-ink-100 dark:bg-ink-800 relative">
              <img src={product.images[activeImage]} alt={product.name} className="w-full h-full object-cover" />
              {discount > 0 && (
                <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-debate-500 to-orange-500 text-white text-sm font-bold shadow-lg">
                  <Tag className="w-4 h-4" />立省 {discount}%
                </div>
              )}
              {product.isFlagship && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-news-500 to-news-600 text-white text-xs font-bold">
                  <Award className="w-3.5 h-3.5" />官方旗舰
                </div>
              )}
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      'w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors',
                      activeImage === i ? 'border-shop-500' : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 信息区 - 淘宝风: 大字价格 + 评价 + 销量 */}
          <div className="lg:col-span-3 space-y-4">
            {/* 标题区 */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="shop">{product.brand}</Badge>
                {product.isExclusive && <Badge variant="nova" size="sm">独家</Badge>}
                {product.tags.slice(0, 3).map((t) => <Badge key={t} variant="outline" size="sm">{t}</Badge>)}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{product.name}</h1>
              <p className="text-base text-ink-600 dark:text-ink-300 mt-1.5">{product.tagline}</p>
            </div>

            {/* 价格 - 淘宝风: 大字 + 双价 + 销量 */}
            <div className="rounded-2xl bg-gradient-to-br from-debate-500/10 via-orange-500/5 to-amber-500/10 dark:from-debate-500/10 dark:to-amber-500/10 border border-debate-200/50 dark:border-debate-800/50 p-5">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl sm:text-5xl font-bold text-debate-600 dark:text-debate-400">
                  <span className="text-xl">¥</span>{product.price.toLocaleString()}
                </span>
                {product.originalPrice && (
                  <span className="text-base text-ink-400 line-through">¥{product.originalPrice.toLocaleString()}</span>
                )}
                {discount > 0 && (
                  <span className="px-2 py-0.5 rounded bg-debate-500 text-white text-xs font-bold">-{discount}%</span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-ink-500">
                <span>已售 <strong className="text-shop-600 font-bold">{(product.sales || 0).toLocaleString()}</strong> 件</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-news-500 text-news-500" /> {product.rating} ({formatNumber(product.reviewCount)} 评价)
                </span>
              </div>
            </div>

            {/* 优惠券 */}
            {product.coupons && product.coupons.length > 0 && (
              <CouponStrip coupons={product.coupons} />
            )}

            {/* 配送 + 物流 */}
            <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-4 space-y-2.5 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-shop-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="text-ink-500">配送至</span>
                  <span className="ml-1 font-semibold">上海</span>
                </div>
                {product.shipping && (
                  <div className="text-right text-xs">
                    {product.shipping.fee === 0 ? (
                      <span className="text-shop-600 font-semibold">免运费</span>
                    ) : (
                      <span>运费 ¥{product.shipping.fee}</span>
                    )}
                    {product.shipping.freeOver > 0 && product.shipping.fee > 0 && (
                      <div className="text-ink-500">满 ¥{product.shipping.freeOver} 免运费</div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-start gap-2">
                <Truck className="w-4 h-4 text-shop-500 mt-0.5 flex-shrink-0" />
                <span>
                  {product.shipping?.from && `从 ${product.shipping.from} 发货`} ·
                  {product.shipping?.estimatedDays === 0 ? '到店自提' :
                    product.shipping?.estimatedDays === 1 ? '次日达' :
                    `${product.shipping?.estimatedDays || 2}-${(product.shipping?.estimatedDays || 2) + 1} 日送达`}
                </span>
              </div>
            </div>

            {/* SKU 选择（仅在主信息区） */}
            {product.sku && (
              <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-4">
                <SkuSelector product={product} selection={sku} onChange={setSku} />
              </div>
            )}

            {/* 服务保障 */}
            {product.services && <ServiceGuarantees services={product.services} />}

            {/* 跨模块链接 */}
            {(linkedNews || linkedDebates.length > 0) && (
              <div className="space-y-2">
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

            {/* 数量 */}
            <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-4 flex items-center gap-3">
              <span className="text-sm font-medium">数量</span>
              <div className="flex items-center border border-ink-200 dark:border-ink-700 rounded-xl overflow-hidden">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-9 h-9 flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center text-sm font-semibold">{qty}</span>
                <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="w-9 h-9 flex items-center justify-center hover:bg-ink-100 dark:hover:bg-ink-800">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs text-ink-500">库存 {product.stock} 件</span>
            </div>
          </div>
        </div>

        {/* 详情/规格/评价 - 淘宝 tabs */}
        <div className="mt-10">
          <div className="sticky top-32 sm:top-36 z-20 bg-ink-50 dark:bg-ink-950 -mx-4 sm:mx-0 px-4 sm:px-0">
            <Tabs
              variant="underline"
              tabs={[
                { value: 'description', label: '商品详情' },
                { value: 'specs', label: '规格参数' },
                { value: 'reviews', label: `评价 (${formatNumber(product.reviewCount)})` },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>
          <div className="mt-4">
            {tab === 'description' && (
              <div className="prose max-w-3xl text-ink-700 dark:text-ink-200 leading-relaxed">
                <p className="text-base">{product.description}</p>
                {product.detailImages && product.detailImages.length > 0 && (
                  <div className="mt-6 space-y-2">
                    {product.detailImages.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-full rounded-2xl" />
                    ))}
                  </div>
                )}
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
            {tab === 'reviews' && product.reviews && (
              <ReviewList reviews={product.reviews} rating={product.rating} reviewCount={product.reviewCount} />
            )}
          </div>
        </div>

        {/* 同品牌推荐 */}
        {sameBrand.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-xl font-bold">{product.brand} 旗下</h3>
              <Link to={`/shop/brand/${product.brand.toLowerCase().replace(/\s+/g, '-')}`} className="text-xs text-shop-600 hover:underline">查看品牌 →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {sameBrand.map((p) => <ProductCardV2 key={p.id} product={p} />)}
            </div>
          </div>
        )}

        {/* 相关商品 */}
        {related.length > 0 && (
          <div className="mt-12">
            <h3 className="text-xl font-bold mb-4">看了又看</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {related.map((p) => <ProductCardV2 key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      {/* 底部固定操作栏 - 淘宝风: 客服/购物车/收藏 + 加购/购买 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-ink-900/95 backdrop-blur-md border-t border-ink-200 dark:border-ink-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 sm:gap-3">
          <button className="hidden sm:flex flex-col items-center gap-0.5 text-xs text-ink-600 dark:text-ink-300 hover:text-shop-600 px-2">
            <MessageCircle className="w-5 h-5" />客服
          </button>
          <Link to="/cart" className="flex flex-col items-center gap-0.5 text-xs text-ink-600 dark:text-ink-300 hover:text-shop-600 px-2">
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-debate-500 text-white text-[10px] font-bold flex items-center justify-center">3</span>
            </div>
            购物车
          </Link>
          <button
            onClick={() => { versa.toggleWishlist(product.id); toast(inWishlist ? '已取消收藏' : '已加入收藏 💚', 'success') }}
            className={cn(
              'flex flex-col items-center gap-0.5 text-xs px-2',
              inWishlist ? 'text-debate-600' : 'text-ink-600 dark:text-ink-300 hover:text-shop-600'
            )}
          >
            <Heart className={cn('w-5 h-5', inWishlist && 'fill-debate-500 text-debate-500')} />
            {inWishlist ? '已收藏' : '收藏'}
          </button>
          <div className="flex-1" />
          <Button variant="outline" size="lg" onClick={() => handleSkuAction('cart')} leftIcon={<ShoppingCart className="w-4 h-4" />} className="border-2 border-shop-500 text-shop-600 hover:bg-shop-50">
            加入购物车
          </Button>
          <Button size="lg" onClick={() => handleSkuAction('buy')} leftIcon={<Check className="w-4 h-4" />} className="bg-gradient-to-r from-debate-500 to-orange-500 hover:from-debate-600 hover:to-orange-600 text-white">
            立即购买
          </Button>
        </div>
      </div>

      {/* SKU 弹窗（备用 - 当前 sku 在主信息区已显示） */}
      {showSkuPanel && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowSkuPanel(false)}>
          <div className="absolute inset-0 bg-ink-950/40" />
          <div
            className="relative w-full bg-white dark:bg-ink-900 rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-ink-100 flex-shrink-0">
                <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold text-debate-600">¥{product.price.toLocaleString()}</div>
                <div className="text-xs text-ink-500 mt-1">库存 {product.stock} 件</div>
                {Object.keys(sku).length > 0 && (
                  <div className="text-xs text-ink-600 mt-1 line-clamp-1">
                    {Object.entries(sku).map(([k, v]) => `${k}: ${v}`).join(' / ')}
                  </div>
                )}
              </div>
              <button onClick={() => setShowSkuPanel(false)} className="text-ink-400">×</button>
            </div>
            {product.sku && <SkuSelector product={product} selection={sku} onChange={setSku} />}
            <Button
              size="lg"
              onClick={() => { skuAction === 'cart' ? addToCart() : buyNow(); setShowSkuPanel(false) }}
              className="w-full mt-4 bg-gradient-to-r from-debate-500 to-orange-500 text-white"
            >
              确定{skuAction === 'cart' ? '加入购物车' : '立即购买'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
