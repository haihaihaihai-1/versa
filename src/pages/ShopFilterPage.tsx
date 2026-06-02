import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Filter, Star, X, Sliders, ChevronDown } from 'lucide-react'
import { products } from '../data/products'
import { formatCurrency, cn } from '../lib/utils'

const SORTS = [
  { key: 'sales', label: '销量优先' },
  { key: 'price-asc', label: '价格升序' },
  { key: 'price-desc', label: '价格降序' },
  { key: 'rating', label: '评分最高' },
  { key: 'newest', label: '最新上架' },
] as const

const BRANDS = Array.from(new Set(products.map((p) => p.brand)))
const ALL_TAGS = Array.from(new Set(products.flatMap((p) => p.tags || [])))

export function ShopFilterPage() {
  const [minRating, setMinRating] = useState(0)
  const [priceMin, setPriceMin] = useState(0)
  const [priceMax, setPriceMax] = useState(5000)
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())
  const [hasDiscount, setHasDiscount] = useState(false)
  const [inStock, setInStock] = useState(false)
  const [sort, setSort] = useState<typeof SORTS[number]['key']>('sales')

  const filtered = useMemo(() => {
    return products
      .filter((p) => (p.rating || 4.5) >= minRating)
      .filter((p) => p.price >= priceMin && p.price <= priceMax)
      .filter((p) => selectedBrands.size === 0 || selectedBrands.has(p.brand))
      .filter((p) => selectedTags.size === 0 || p.tags?.some((t) => selectedTags.has(t)))
      .filter((p) => !hasDiscount || (p.originalPrice && p.originalPrice > p.price))
      .filter((p) => !inStock || (p.stock && p.stock > 0))
      .sort((a, b) => {
        if (sort === 'price-asc') return a.price - b.price
        if (sort === 'price-desc') return b.price - a.price
        if (sort === 'rating') return (b.rating || 0) - (a.rating || 0)
        if (sort === 'newest') return (b.id > a.id ? 1 : -1)
        return (b.sales || 0) - (a.sales || 0)
      })
  }, [minRating, priceMin, priceMax, selectedBrands, selectedTags, hasDiscount, inStock, sort])

  const reset = () => {
    setMinRating(0); setPriceMin(0); setPriceMax(5000)
    setSelectedBrands(new Set()); setSelectedTags(new Set())
    setHasDiscount(false); setInStock(false)
  }

  const toggleSet = (set: Set<string>, setter: (s: Set<string>) => void, value: string) => {
    const n = new Set(set)
    if (n.has(value)) n.delete(value)
    else n.add(value)
    setter(n)
  }

  const activeCount = (minRating > 0 ? 1 : 0) + (priceMin > 0 || priceMax < 5000 ? 1 : 0) + selectedBrands.size + selectedTags.size + (hasDiscount ? 1 : 0) + (inStock ? 1 : 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-4">
        <Sliders className="w-5 h-5" />
        <h1 className="text-2xl font-bold">筛选 & 排序</h1>
        <span className="ml-auto text-xs text-ink-500">{filtered.length} / {products.length} 件商品</span>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {/* Filters sidebar */}
        <aside className="lg:col-span-1 space-y-3">
          {/* Rating */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
            <h3 className="text-sm font-semibold mb-2">评分</h3>
            <div className="space-y-1.5">
              {[
                { v: 0, l: '不限' },
                { v: 4.5, l: '4.5+ ⭐' },
                { v: 4, l: '4.0+ ⭐' },
                { v: 3, l: '3.0+ ⭐' },
              ].map((o) => (
                <button
                  key={o.v}
                  onClick={() => setMinRating(o.v)}
                  className={cn('w-full text-left px-3 py-1.5 rounded-lg text-sm transition',
                    minRating === o.v ? 'bg-violet-500 text-white' : 'hover:bg-ink-100 dark:hover:bg-ink-800'
                  )}
                >
                  {o.l}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
            <h3 className="text-sm font-semibold mb-2">价格区间</h3>
            <div className="space-y-2">
              <input type="range" min={0} max={5000} step={50} value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="w-full" />
              <div className="flex items-center gap-2">
                <input type="number" value={priceMin} onChange={(e) => setPriceMin(Number(e.target.value))} className="w-full px-2 py-1 rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-sm" />
                <span className="text-ink-500">-</span>
                <input type="number" value={priceMax} onChange={(e) => setPriceMax(Number(e.target.value))} className="w-full px-2 py-1 rounded-lg border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 text-sm" />
              </div>
              <p className="text-[10px] text-ink-500">¥{priceMin} - ¥{priceMax}</p>
            </div>
          </div>

          {/* Brand */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
            <h3 className="text-sm font-semibold mb-2">品牌</h3>
            <div className="flex flex-wrap gap-1.5">
              {BRANDS.map((b) => (
                <button
                  key={b}
                  onClick={() => toggleSet(selectedBrands, setSelectedBrands, b)}
                  className={cn('px-2.5 py-1 rounded-full text-xs transition',
                    selectedBrands.has(b) ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800 hover:bg-ink-200'
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
            <h3 className="text-sm font-semibold mb-2">分类</h3>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.slice(0, 12).map((t) => (
                <button
                  key={t}
                  onClick={() => toggleSet(selectedTags, setSelectedTags, t)}
                  className={cn('px-2.5 py-1 rounded-full text-xs transition',
                    selectedTags.has(t) ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800 hover:bg-ink-200'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={hasDiscount} onChange={(e) => setHasDiscount(e.target.checked)} className="rounded" />
              <span>仅显示促销</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={inStock} onChange={(e) => setInStock(e.target.checked)} className="rounded" />
              <span>仅显示有货</span>
            </label>
          </div>

          {activeCount > 0 && (
            <button onClick={reset} className="w-full px-4 py-2 rounded-2xl bg-ink-100 dark:bg-ink-800 text-sm font-medium flex items-center justify-center gap-1.5">
              <X className="w-4 h-4" />清除 {activeCount} 项筛选
            </button>
          )}
        </aside>

        {/* Results */}
        <main className="lg:col-span-3">
          <div className="flex items-center justify-between mb-3 sticky top-16 z-10 bg-gradient-to-b from-ink-50 to-ink-50/80 dark:from-ink-950 dark:to-ink-950/80 backdrop-blur py-2 -mx-4 px-4">
            <div className="flex items-center gap-1.5 text-xs text-ink-500">
              <Filter className="w-3.5 h-3.5" />已激活 {activeCount} 项筛选
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-ink-500">排序:</span>
              <div className="relative">
                <select value={sort} onChange={(e) => setSort(e.target.value as any)} className="appearance-none px-3 py-1 pr-7 rounded-full bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-sm font-medium">
                  {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-20 text-center text-ink-500">
              <Filter className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">没有匹配的商品</p>
              <button onClick={reset} className="mt-3 text-xs text-violet-500 hover:underline">清除筛选</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filtered.map((p: any) => (
                <Link key={p.id} to={`/shop/${p.id}`} className="group">
                  <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-ink-100 to-ink-200 dark:from-ink-800 dark:to-ink-900 relative">
                    {p.images?.[0] && <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition" />}
                    {p.originalPrice && p.originalPrice > p.price && (
                      <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-medium">-¥{p.originalPrice - p.price}</span>
                    )}
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-medium line-clamp-2 h-10 group-hover:text-violet-600 transition">{p.name}</p>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-lg font-bold text-rose-500">¥{formatCurrency(p.price)}</span>
                      {p.originalPrice && p.originalPrice > p.price && (
                        <span className="text-[11px] text-ink-400 line-through">¥{formatCurrency(p.originalPrice)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5 text-[10px] text-ink-500">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span>{(p.rating || 4.5).toFixed(1)}</span>
                      <span>·</span>
                      <span>{p.sales || 0} 售出</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default ShopFilterPage
