import { useState, useEffect, useMemo } from 'react'
import { products, brands } from '../data/products'
import { ShopHero } from '../components/shop/ShopHero'
import { CategoryGrid } from '../components/shop/CategoryGrid'
import { FlashSale } from '../components/shop/FlashSale'
import { BrandZone } from '../components/shop/BrandZone'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { Tabs } from '../components/ui/Tabs'
import { SearchBar, useDebounce } from '../components/ui/Search'
import { Sparkles, Crown, TrendingUp, ShoppingBag, Newspaper, Scale, ArrowUpRight, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { versa } from '../store/versa'
import { useVersa } from '../store/versa'

const sortOptions = [
  { value: 'recommended', label: '推荐' },
  { value: 'sales', label: '销量' },
  { value: 'newest', label: '新品' },
  { value: 'price_asc', label: '价格 ↑' },
  { value: 'price_desc', label: '价格 ↓' },
  { value: 'rating', label: '评分' },
]

const sections = [
  { value: 'recommended', label: '为你推荐' },
  { value: 'flashsale', label: '⚡秒杀' },
  { value: 'news', label: '新闻同款' },
  { value: 'flagship', label: '官方旗舰' },
  { value: 'premium', label: '高端' },
]

export function ShopHomePage() {
  const [query, setQuery] = useState('')
  const [section, setSection] = useState('recommended')
  const [sort, setSort] = useState('recommended')
  const debounced = useDebounce(query, 200)

  useEffect(() => { versa.visitModule('shop') }, [])

  const filtered = useMemo(() => {
    let r = [...products]
    if (debounced) {
      const q = debounced.toLowerCase()
      r = r.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (section === 'flashsale') r = r.filter((p) => p.flashSale)
    if (section === 'news') r = r.filter((p) => p.linkedNewsId || p.isNewsworthy)
    if (section === 'flagship') r = r.filter((p) => p.isFlagship)
    if (section === 'premium') r = r.filter((p) => p.price > 1500)

    if (sort === 'sales') r.sort((a, b) => (b.sales || 0) - (a.sales || 0))
    if (sort === 'price_asc') r.sort((a, b) => a.price - b.price)
    if (sort === 'price_desc') r.sort((a, b) => b.price - a.price)
    if (sort === 'rating') r.sort((a, b) => b.rating - a.rating)
    if (sort === 'newest') r.sort((a, b) => a.id.localeCompare(b.id))
    return r
  }, [debounced, section, sort])

  // 编辑精选 - 高分 + 高销量 + 有特色
  const editorPicks = useMemo(() => {
    return [...products]
      .filter((p) => p.isFlagship || p.rating >= 4.8)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3)
  }, [])

  return (
    <div className="space-y-6">
      {/* 搜索条 - 顶部固定 */}
      <div className="sticky top-14 sm:top-16 z-30 bg-gradient-to-b from-ink-50 via-ink-50/95 to-ink-50/80 dark:from-ink-950 dark:via-ink-950/95 dark:to-ink-950/80 backdrop-blur-md -mx-4 px-4 py-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="搜索商品、品牌、标签..."
          className="w-full"
        />
      </div>

      {/* Hero 轮播 */}
      <ShopHero />

      {/* 大类导航 */}
      <div className="rounded-3xl p-5 bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
        <CategoryGrid />
      </div>

      {/* 编辑精选 - 杂志大卡片 */}
      {editorPicks.length >= 3 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-shop-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold">编辑精选</h2>
                <p className="text-[10px] text-ink-500">高评分 + 高销量 · 品味之选</p>
              </div>
            </div>
            <span className="text-xs text-ink-500 flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              严选好物
            </span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {editorPicks.map((p) => (
              <ProductCardV2 key={p.id} product={p} editorial />
            ))}
          </div>
        </div>
      )}

      {/* 限时秒杀 */}
      <FlashSale products={products} />

      {/* 品牌专区 */}
      <BrandZone />

      {/* 跨模块横幅 - 杂志风 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/news"
          className="group relative overflow-hidden rounded-3xl h-36 sm:h-40 transition-all hover:shadow-2xl hover:shadow-news-500/20"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-news-500 via-news-600 to-news-700" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative h-full p-5 sm:p-6 text-white flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-2">NEWS → SHOP</div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">从资讯到购物</h3>
              <p className="text-sm opacity-90 mt-1">每篇深度报道背后的相关商品</p>
            </div>
            <div className="inline-flex items-center gap-1 text-xs font-bold opacity-90 group-hover:gap-2 transition-all">
              探索 <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>
        <Link
          to="/debates"
          className="group relative overflow-hidden rounded-3xl h-36 sm:h-40 transition-all hover:shadow-2xl hover:shadow-debate-500/20"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-debate-500 via-debate-600 to-orange-600" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
          <div className="relative h-full p-5 sm:p-6 text-white flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-2">DEBATE → SHOP</div>
              <h3 className="text-2xl sm:text-3xl font-bold tracking-tight">理性消费</h3>
              <p className="text-sm opacity-90 mt-1">看完整场辩论再下单</p>
            </div>
            <div className="inline-flex items-center gap-1 text-xs font-bold opacity-90 group-hover:gap-2 transition-all">
              进入 <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </Link>
      </div>

      {/* 分区切换 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-shop-500 to-nova-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold">好物推荐</h2>
            <p className="text-[10px] text-ink-500">为你挑选 · 实时更新</p>
          </div>
        </div>
        <div className="mb-4 overflow-x-auto -mx-4 px-4">
          <Tabs
            variant="pills"
            tabs={sections.map((s) => ({ value: s.value, label: s.label }))}
            value={section}
            onChange={setSection}
          />
        </div>

        {/* 排序 */}
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-ink-500 hidden sm:inline">排序：</span>
          {sortOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => setSort(o.value)}
              className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors ${
                sort === o.value
                  ? 'bg-shop-500 text-white'
                  : 'bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 dark:hover:bg-ink-700'
              }`}
            >
              {o.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-ink-500">共 {filtered.length} 件</span>
        </div>

        {/* 商品网格 */}
        {filtered.length === 0 ? (
          <div className="rounded-3xl text-center py-16 bg-white/40 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
            <ShoppingBag className="w-12 h-12 text-ink-300 mx-auto mb-3" />
            <div className="text-ink-500">没有找到相关商品</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filtered.map((p) => <ProductCardV2 key={p.id} product={p} />)}
          </div>
        )}
      </div>

      {/* 底部 - 品牌聚合 */}
      <div className="rounded-3xl p-6 bg-gradient-to-br from-shop-500/5 via-nova-500/5 to-debate-500/5 border border-ink-200/60 dark:border-ink-800/60 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-shop-500/10 to-transparent rounded-full blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg">本月热销 Top 品牌</h3>
                <p className="text-[10px] text-ink-500">人气与口碑兼具</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {brands.slice(0, 8).map((b, i) => (
              <Link
                key={b.id}
                to={`/shop/brand/${b.id}`}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-white/80 dark:bg-ink-900/50 hover:bg-white dark:hover:bg-ink-900/80 transition-all border border-ink-200/40 dark:border-ink-800/40 hover:border-shop-300 hover:shadow-lg"
              >
                <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-shop-100 to-ink-100 ring-2 ring-transparent group-hover:ring-shop-400 flex-shrink-0">
                  <img src={b.logo} alt={b.name} className="w-full h-full object-cover" />
                  {i < 3 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
                      {i + 1}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold line-clamp-1">{b.name}</div>
                  <div className="text-[10px] text-ink-500 flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-shop-500" />
                    {b.productCount} 款 · {(b.totalSales / 10000).toFixed(1)} 万销量
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
