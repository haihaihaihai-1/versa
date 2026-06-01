import { useState, useEffect, useMemo } from 'react'
import { products, brands } from '../data/products'
import { ShopHero } from '../components/shop/ShopHero'
import { CategoryGrid } from '../components/shop/CategoryGrid'
import { FlashSale } from '../components/shop/FlashSale'
import { BrandZone } from '../components/shop/BrandZone'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { Tabs } from '../components/ui/Tabs'
import { SearchBar, useDebounce } from '../components/ui/Search'
import { Search, Sparkles, Crown, TrendingUp } from 'lucide-react'
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

      {/* 限时秒杀 */}
      <FlashSale products={products} />

      {/* 品牌专区 */}
      <BrandZone />

      {/* 跨模块横幅 - 新闻/辩论联动 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/news"
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-news-500 to-news-600 text-white p-5 sm:p-6 h-32 sm:h-36"
        >
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/20 text-xs font-semibold mb-2">NEWS → SHOP</div>
            <h3 className="text-xl sm:text-2xl font-bold">从资讯到购物</h3>
            <p className="text-sm opacity-90 mt-1">每篇深度报道背后的相关商品</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-30 text-7xl">📰</div>
        </Link>
        <Link
          to="/debates"
          className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-debate-500 to-debate-600 text-white p-5 sm:p-6 h-32 sm:h-36"
        >
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/20 text-xs font-semibold mb-2">DEBATE → SHOP</div>
            <h3 className="text-xl sm:text-2xl font-bold">理性消费</h3>
            <p className="text-sm opacity-90 mt-1">看完整场辩论再下单</p>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-30 text-7xl">⚖️</div>
        </Link>
      </div>

      {/* 分区切换 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-shop-500" />
          <h2 className="text-xl sm:text-2xl font-bold">好物推荐</h2>
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
          <div className="text-center py-12 text-ink-500">没有找到相关商品</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filtered.map((p) => <ProductCardV2 key={p.id} product={p} />)}
          </div>
        )}
      </div>

      {/* 底部 - 品牌聚合 */}
      <div className="rounded-3xl p-5 bg-gradient-to-br from-shop-500/5 via-nova-500/5 to-debate-500/5 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-5 h-5 text-news-500" />
          <h3 className="font-bold text-base sm:text-lg">本月热销 Top 品牌</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {brands.slice(0, 8).map((b) => (
            <Link
              key={b.id}
              to={`/shop/brand/${b.id}`}
              className="group flex items-center gap-3 p-3 rounded-2xl bg-white/70 dark:bg-ink-900/40 hover:bg-white dark:hover:bg-ink-900/70 transition-colors"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden bg-ink-100 ring-2 ring-transparent group-hover:ring-shop-400 flex-shrink-0">
                <img src={b.logo} alt={b.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold line-clamp-1">{b.name}</div>
                <div className="text-[10px] text-ink-500 flex items-center gap-1 mt-0.5">
                  <TrendingUp className="w-3 h-3" />
                  {b.productCount} 款 · {(b.totalSales / 10000).toFixed(1)} 万销量
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
