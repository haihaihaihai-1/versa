import { useParams, useNavigate, Link } from 'react-router-dom'
import { useState, useMemo } from 'react'
import { ArrowLeft, Award, Package, TrendingUp, Sparkles, Star, ShieldCheck, Heart, Share2, Clock, Truck, Crown } from 'lucide-react'
import { products, brands } from '../data/products'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { Tabs } from '../components/ui/Tabs'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'

const FILTERS = [
  { value: 'all', label: '综合' },
  { value: 'sales', label: '销量' },
  { value: 'newest', label: '新品' },
  { value: 'price_asc', label: '价格 ↑' },
  { value: 'price_desc', label: '价格 ↓' },
  { value: 'rating', label: '好评' },
]

export function BrandPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const brand = brands.find((b) => b.id === id)
  const [tab, setTab] = useState('products')
  const [filter, setFilter] = useState('all')

  const allBrandProducts = useMemo(() => {
    return products.filter((p) => p.brand.toLowerCase().replace(/\s+/g, '-') === id)
  }, [id])

  const brandName = brand?.name
  const related = useMemo(() => {
    if (!brandName) return []
    const cats = Array.from(new Set(allBrandProducts.map((p) => p.category)))
    return products.filter((p) => p.brand !== brandName && cats.includes(p.category)).slice(0, 4)
  }, [allBrandProducts, brandName])

  const sortedProducts = useMemo(() => {
    const r = [...allBrandProducts]
    if (filter === 'sales') r.sort((a, b) => (b.sales || 0) - (a.sales || 0))
    if (filter === 'newest') r.sort((a, b) => a.id.localeCompare(b.id))
    if (filter === 'price_asc') r.sort((a, b) => a.price - b.price)
    if (filter === 'price_desc') r.sort((a, b) => b.price - a.price)
    if (filter === 'rating') r.sort((a, b) => b.rating - a.rating)
    return r
  }, [allBrandProducts, filter])

  const ratingDist = useMemo(() => {
    const dist = [0, 0, 0, 0, 0]
    allBrandProducts.forEach((p) => {
      const idx = Math.max(0, Math.min(4, Math.floor(p.rating) - 1))
      dist[idx]++
    })
    return dist
  }, [allBrandProducts])

  if (!brand || allBrandProducts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">品牌不存在</h2>
        <Button onClick={() => navigate('/shop')}>返回商城</Button>
      </div>
    )
  }

  const avgRating = allBrandProducts.length > 0
    ? allBrandProducts.reduce((s, p) => s + p.rating, 0) / allBrandProducts.length
    : 0

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white">
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      {/* 品牌 Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-shop-500/15 via-nova-500/10 to-debate-500/15 border border-ink-200/60 dark:border-ink-800/60">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/20 to-transparent rounded-full blur-3xl" />
        <div className="relative p-6 sm:p-8">
          <div className="flex items-start gap-5 flex-wrap sm:flex-nowrap">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-white shadow-2xl flex-shrink-0 ring-4 ring-white/50 dark:ring-ink-800/50">
              <img src={brand.logo} alt={brand.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">{brand.name}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-news-500 to-news-600 text-white text-xs font-bold shadow-md">
                  <Award className="w-3 h-3" />官方旗舰
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold shadow-md">
                  <Crown className="w-3 h-3" />金牌品牌
                </span>
              </div>
              <p className="text-sm sm:text-base text-ink-600 dark:text-ink-300 mt-2 max-w-2xl leading-relaxed">{brand.story}</p>
              <div className="mt-4 flex flex-wrap gap-4 sm:gap-6 text-sm">
                <div className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-shop-600" />
                  <span><strong className="text-base">{brand.productCount}</strong> 款商品</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-news-600" />
                  <span>累计销量 <strong className="text-base">{(brand.totalSales / 10000).toFixed(1)}</strong> 万</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>平均评分 <strong className="text-base">{avgRating.toFixed(1)}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-nova-600" />
                  <span>品牌保障</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start">
              <button className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-white dark:bg-ink-800 text-sm font-medium hover:shadow-lg">
                <Share2 className="w-3.5 h-3.5" />分享
              </button>
              <button className="inline-flex items-center gap-1.5 px-4 h-9 rounded-full bg-gradient-to-r from-shop-500 to-pink-500 text-white text-sm font-medium hover:shadow-lg shadow-shop-500/30">
                <Heart className="w-3.5 h-3.5" />关注品牌
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 品牌服务保障 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: ShieldCheck, label: '正品保障', desc: '假一赔十' },
          { icon: Truck, label: '满 99 包邮', desc: '次日达可选' },
          { icon: Clock, label: '7 天无理由', desc: '无忧退换' },
          { icon: Award, label: '金牌售后', desc: '1V1 客服' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2 p-3 rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-shop-500/15 to-pink-500/15 flex items-center justify-center">
              <s.icon className="w-4 h-4 text-shop-600" />
            </div>
            <div>
              <div className="text-sm font-bold">{s.label}</div>
              <div className="text-[10px] text-ink-500">{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-ink-200/60 dark:border-ink-800/60">
        <Tabs
          variant="underline"
          tabs={[
            { value: 'products', label: `全部商品 (${allBrandProducts.length})` },
            { value: 'rating', label: '用户评价' },
            { value: 'about', label: '品牌介绍' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === 'products' && (
        <>
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-ink-500">排序：</span>
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'px-3 h-8 rounded-lg text-xs font-medium transition-colors',
                  filter === f.value
                    ? 'bg-shop-500 text-white'
                    : 'bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 dark:hover:bg-ink-700'
                )}
              >
                {f.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-ink-500">共 {sortedProducts.length} 件</span>
          </div>

          {sortedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {sortedProducts.map((p) => <ProductCardV2 key={p.id} product={p} />)}
            </div>
          ) : (
            <div className="rounded-3xl text-center py-16 bg-white/40 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
              <Package className="w-12 h-12 text-ink-300 mx-auto mb-3" />
              <div className="text-ink-500">该品牌暂无商品</div>
            </div>
          )}

          {related.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-shop-500" />
                <h2 className="text-lg font-bold">同品类推荐</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {related.map((p) => <ProductCardV2 key={p.id} product={p} />)}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'rating' && (
        <div className="rounded-3xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-6 sm:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-5xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">{avgRating.toFixed(1)}</div>
              <div className="flex items-center justify-center gap-0.5 mt-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={cn('w-4 h-4', i <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                ))}
              </div>
              <div className="text-xs text-ink-500 mt-1">综合评分</div>
            </div>
            <div className="sm:col-span-2 space-y-2">
              {ratingDist.slice().reverse().map((count, i) => {
                const star = 5 - i
                const pct = allBrandProducts.length > 0 ? (count / allBrandProducts.length) * 100 : 0
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-ink-500">{star}星</span>
                    <div className="flex-1 h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-orange-400" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-12 text-right text-ink-500">{pct.toFixed(0)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {tab === 'about' && (
        <div className="rounded-3xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-6 sm:p-8">
          <h3 className="text-xl font-bold mb-4">关于 {brand.name}</h3>
          <p className="text-ink-600 dark:text-ink-300 leading-relaxed">{brand.story}</p>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: '品牌成立', value: '2010' },
              { label: '商品数量', value: `${brand.productCount} 款` },
              { label: '总销量', value: `${(brand.totalSales / 10000).toFixed(1)} 万` },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-2xl bg-gradient-to-br from-shop-500/5 to-transparent border border-shop-200/40 text-center">
                <div className="text-2xl font-bold bg-gradient-to-r from-shop-600 to-pink-500 bg-clip-text text-transparent">{s.value}</div>
                <div className="text-xs text-ink-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
