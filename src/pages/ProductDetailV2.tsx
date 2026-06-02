import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import {
  ArrowLeft, Heart, Share2, Star, Minus, Plus, ShoppingCart, Scale, Truck,
  Shield, RotateCcw, Newspaper, ChevronRight, Tag, Check, MapPin,
  Award, MessageCircle, Sparkles, ChevronDown, Package, TrendingUp, Zap
} from 'lucide-react'
import { products, news, debates } from '../data'
import { useVersa, versa } from '../store/versa'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Tabs } from '../components/ui/Tabs'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
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
  const [showQnaPreview, setShowQnaPreview] = useState(true)

  // 问大家 Q&A - 基于商品 ID 生成稳定 mock
  const qaList = useMemo(() => {
    if (!product) return []
    const seed = product.id.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
    const templates = [
      { q: '值得买吗？质量怎么样', a: '用了一段时间了，质量确实不错，做工精细，颜值也高，强烈推荐！', helpful: 42, daysAgo: 15 },
      { q: '尺寸合适吗？会不会偏大偏小', a: '正常码数，按平时尺码买就行，我 175/65 穿 M 码刚刚好。', helpful: 28, daysAgo: 8 },
      { q: '物流几天能到？', a: '京东物流次日达，速度很快，包装也很严实。', helpful: 19, daysAgo: 3 },
      { q: '有色差吗？实物和图片差别大吗', a: '基本没色差，实物比图片更有质感，材质看着很高级。', helpful: 35, daysAgo: 22 },
      { q: '送给女朋友合适吗？', a: '我送老婆的，她很喜欢，包装也很精致，适合送礼。', helpful: 12, daysAgo: 5 },
      { q: '容易坏吗？耐用性怎么样', a: '用了一个月了，没出现任何问题，材质手感都不错。', helpful: 23, daysAgo: 11 },
      { q: '味道大吗？需要晾一下吗', a: '刚拆有点味道，通风一天就基本没了。', helpful: 8, daysAgo: 7 },
      { q: '性价比高吗？', a: '同价位里算很能打的了，活动期间入手更划算。', helpful: 31, daysAgo: 18 },
    ]
    const shuffled = templates
      .map((t, i) => ({ ...t, idx: (seed * (i + 1)) % 1000 }))
      .sort((a, b) => a.idx - b.idx)
      .slice(0, 4)
      .map((t, i) => ({
        ...t,
        author: ['小**糖', '路**人', '匿**名', '买**家', '阳**光'][i % 5],
        date: new Date(Date.now() - t.daysAgo * 86400000).toISOString().slice(0, 10),
      }))
    return shuffled
  }, [product?.id])

  type QA = { q: string; a: string; helpful: number; daysAgo: number; author: string; date: string; idx: number }

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
            <button className="w-9 h-9 rounded-full bg-white/80 dark:bg-ink-900/80 backdrop-blur-md flex items-center justify-center hover:bg-white shadow-lg" onClick={() => navigator.share?.({ title: product.name, url: window.location.href }).catch(() => toast('已复制链接', 'success'))}>
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
            <div className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-ink-100 to-ink-50 dark:from-ink-800 dark:to-ink-900 relative group">
              <img src={product.images[activeImage]} alt={product.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              {discount > 0 && (
                <div className="absolute top-4 left-4 flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-debate-500 to-orange-500 text-white text-sm font-bold shadow-lg">
                  <Tag className="w-4 h-4" />立省 {discount}%
                </div>
              )}
              {product.isFlagship && (
                <div className="absolute bottom-4 left-4 flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-news-500 to-news-600 text-white text-xs font-bold shadow-lg backdrop-blur-md">
                  <Award className="w-3.5 h-3.5" />官方旗舰
                </div>
              )}
              {/* 闪光效果 */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={cn(
                      'w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all',
                      activeImage === i
                        ? 'border-shop-500 shadow-lg shadow-shop-500/30 scale-105'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 信息区 */}
          <div className="lg:col-span-3 space-y-4">
            {/* 标题区 */}
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] text-ink-500 font-semibold uppercase tracking-widest">{product.brand}</span>
                <span className="text-ink-300 dark:text-ink-600">·</span>
                <Badge variant="shop" size="sm">{product.brand}</Badge>
                {product.isExclusive && <Badge variant="nova" size="sm" icon={<Sparkles className="w-3 h-3" />}>独家</Badge>}
                {product.tags.slice(0, 3).map((t) => <Badge key={t} variant="outline" size="sm">{t}</Badge>)}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight">{product.name}</h1>
              <p className="text-base text-ink-600 dark:text-ink-300 mt-1.5">{product.tagline}</p>
            </div>

            {/* 价格 - 杂志风大色块 */}
            <div className="relative rounded-3xl overflow-hidden border border-debate-200/50 dark:border-debate-800/50">
              <div className="absolute inset-0 bg-gradient-to-br from-debate-500/15 via-orange-500/8 to-amber-500/15" />
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-debate-500/20 to-transparent rounded-full blur-2xl" />
              <div className="relative p-5 sm:p-6">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-debate-600 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                    <span className="text-xl">¥</span>{product.price.toLocaleString()}
                  </span>
                  {product.originalPrice && (
                    <span className="text-base text-ink-400 line-through">¥{product.originalPrice.toLocaleString()}</span>
                  )}
                  {discount > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-debate-500 to-orange-500 text-white text-xs font-bold shadow-lg">
                      -{discount}%
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-ink-500 flex-wrap">
                  <span>已售 <strong className="text-shop-600 font-bold">{(product.sales || 0).toLocaleString()}</strong> 件</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                    <strong className="text-ink-700 dark:text-ink-200">{product.rating}</strong>
                    <span>({formatNumber(product.reviewCount)} 评价)</span>
                    <span>·</span>
                    <Link to={`/reviews/${product.id}`} className="text-shop-600 hover:underline">
                      查看全部评价 →
                    </Link>
                  </span>
                </div>
              </div>
            </div>

            {/* 优惠券 */}
            {product.coupons && product.coupons.length > 0 && (
              <CouponStrip coupons={product.coupons} />
            )}

            {/* 配送 + 物流 */}
            <div className="rounded-2xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-4 space-y-2.5 text-sm">
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

            {/* SKU 选择 */}
            {product.sku && (
              <div className="rounded-2xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-4">
                <SkuSelector product={product} selection={sku} onChange={setSku} />
              </div>
            )}

            {/* 服务保障 */}
            {product.services && <ServiceGuarantees services={product.services} />}

            {/* 跨模块链接 */}
            {(linkedNews || linkedDebates.length > 0) && (
              <div className="space-y-2">
                {linkedNews && (
                  <Link to={`/news/${linkedNews.id}`} className="group relative flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-news-500/8 to-transparent border border-news-500/20 hover:border-news-500/50 transition-all hover:shadow-lg overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-news-500/15 to-transparent rounded-full blur-2xl" />
                    <div className="w-10 h-10 rounded-xl bg-news-500/20 flex items-center justify-center flex-shrink-0 relative">
                      <Newspaper className="w-5 h-5 text-news-600" />
                    </div>
                    <div className="flex-1 min-w-0 relative">
                      <div className="text-[10px] text-news-600 font-bold mb-0.5 uppercase tracking-wider">媒体报道</div>
                      <div className="text-sm font-semibold line-clamp-1">{linkedNews.title}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-400 group-hover:translate-x-1 transition-transform relative" />
                  </Link>
                )}
                {linkedDebates.map((d) => d && (
                  <Link key={d.id} to={`/debates/${d.id}`} className="group relative flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-debate-500/8 to-transparent border border-debate-500/20 hover:border-debate-500/50 transition-all hover:shadow-lg overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-debate-500/15 to-transparent rounded-full blur-2xl" />
                    <div className="w-10 h-10 rounded-xl bg-debate-500/20 flex items-center justify-center flex-shrink-0 relative">
                      <Scale className="w-5 h-5 text-debate-600" />
                    </div>
                    <div className="flex-1 min-w-0 relative">
                      <div className="text-[10px] text-debate-600 font-bold mb-0.5 uppercase tracking-wider">相关辩论</div>
                      <div className="text-sm font-semibold line-clamp-1">{d.title}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-400 group-hover:translate-x-1 transition-transform relative" />
                  </Link>
                ))}
              </div>
            )}

            {/* 数量 */}
            <div className="rounded-2xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-4 flex items-center gap-3">
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

        {/* 问大家 Q&A 预览块 (淘宝 风格) */}
        {showQnaPreview && qaList.length > 0 && (
          <div className="mt-8 rounded-3xl bg-gradient-to-br from-amber-500/8 via-orange-500/5 to-transparent border border-amber-500/20 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold">问大家</h3>
                  <p className="text-[10px] text-ink-500">已购买用户的真实问答 · {qaList.length} 条</p>
                </div>
              </div>
              <button
                onClick={() => { setTab('qna'); setShowQnaPreview(false) }}
                className="text-xs text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-0.5"
              >
                查看全部 <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-2.5">
              {qaList.slice(0, 2).map((qa: QA, i: number) => (
                <div key={i} className="p-3 rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-amber-200/40 dark:border-amber-800/40">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">问</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium line-clamp-1">{qa.q}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 mt-2 ml-1">
                    <div className="w-6 h-6 rounded-full bg-shop-500/20 text-shop-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">答</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-ink-600 dark:text-ink-300 line-clamp-2">{qa.a}</div>
                      <div className="text-[10px] text-ink-400 mt-1 flex items-center gap-2">
                        <span>{qa.author}</span>
                        <span>·</span>
                        <span>{qa.date}</span>
                        <span className="ml-auto inline-flex items-center gap-0.5 text-amber-600">
                          <Award className="w-2.5 h-2.5" />{qa.helpful}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => { toast('问题已提交, 商家会尽快回复', 'success') }}
              className="w-full mt-3 h-9 rounded-xl border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/5 flex items-center justify-center gap-1.5"
            >
              <MessageCircle className="w-3.5 h-3.5" /> 我也要提问
            </button>
          </div>
        )}

        {/* 详情/规格/评价 - 淘宝 tabs */}
        <div className="mt-10">
          <div className="sticky top-32 sm:top-36 z-20 bg-ink-50 dark:bg-ink-950 -mx-4 sm:mx-0 px-4 sm:px-0">
            <Tabs
              variant="underline"
              tabs={[
                { value: 'description', label: '商品详情' },
                { value: 'specs', label: '规格参数' },
                { value: 'reviews', label: `评价 (${formatNumber(product.reviewCount)})` },
                { value: 'qna', label: `问大家 (${qaList.length})` },
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
            {tab === 'qna' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-ink-500">共 {qaList.length} 个问答 · 已购买用户的真实反馈</div>
                  <button
                    onClick={() => toast('问题已提交', 'success')}
                    className="text-xs px-3 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold hover:shadow-lg shadow-amber-500/30 inline-flex items-center gap-1"
                  >
                    <MessageCircle className="w-3 h-3" /> 我要提问
                  </button>
                </div>
                {qaList.map((qa: QA, i: number) => (
                  <div key={i} className="p-4 rounded-2xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center text-xs font-bold flex-shrink-0">问</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">{qa.q}</div>
                      </div>
                    </div>
                    <div className="mt-3 ml-9 pl-2 border-l-2 border-shop-500/30">
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-shop-500/20 text-shop-700 flex items-center justify-center text-xs font-bold flex-shrink-0">答</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-ink-700 dark:text-ink-200 leading-relaxed">{qa.a}</div>
                          <div className="mt-2 flex items-center gap-3 text-[10px] text-ink-400">
                            <span>{qa.author}</span>
                            <span>{qa.date}</span>
                            <button className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                              <Award className="w-2.5 h-2.5" />有用 ({qa.helpful})
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 同品牌推荐 */}
        {sameBrand.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center justify-between mb-4">
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

      {/* 底部固定操作栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-ink-900/95 backdrop-blur-md border-t border-ink-200 dark:border-ink-800 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-2 sm:gap-3">
          <button className="hidden sm:flex flex-col items-center gap-0.5 text-xs text-ink-600 dark:text-ink-300 hover:text-shop-600 px-2">
            <MessageCircle className="w-5 h-5" />客服
          </button>
          <Link to="/cart" className="flex flex-col items-center gap-0.5 text-xs text-ink-600 dark:text-ink-300 hover:text-shop-600 px-2">
            <div className="relative">
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-gradient-to-r from-debate-500 to-orange-500 text-white text-[10px] font-bold flex items-center justify-center">3</span>
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
          <Button size="lg" onClick={() => handleSkuAction('buy')} leftIcon={<Zap className="w-4 h-4 fill-current" />} className="bg-gradient-to-r from-debate-500 to-orange-500 hover:from-debate-600 hover:to-orange-600 text-white shadow-lg shadow-debate-500/30">
            立即购买
          </Button>
        </div>
      </div>

      {/* SKU 弹窗 */}
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
                <div className="text-2xl font-bold bg-gradient-to-r from-debate-600 to-orange-500 bg-clip-text text-transparent">¥{product.price.toLocaleString()}</div>
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
