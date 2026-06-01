import { useState, useMemo, useEffect } from 'react'
import { products } from '../data'
import { useVersa, versa } from '../store/versa'
import { ProductCard } from '../components/shop/ProductCard'
import { Tabs } from '../components/ui/Tabs'
import { SearchBar, useDebounce } from '../components/ui/Search'
import { EmptyState } from '../components/ui/EmptyState'
import { ShoppingBag, SlidersHorizontal } from 'lucide-react'

const categories = [
  { value: 'all', label: '全部' },
  { value: 'tech', label: '数码' },
  { value: 'fashion', label: '服饰' },
  { value: 'home', label: '家居' },
  { value: 'books', label: '图书' },
  { value: 'food', label: '食品' },
  { value: 'beauty', label: '美妆' },
  { value: 'sports', label: '运动' },
]

const sortOptions = [
  { value: 'recommended', label: '推荐' },
  { value: 'newest', label: '最新' },
  { value: 'price_asc', label: '价格 ↑' },
  { value: 'price_desc', label: '价格 ↓' },
  { value: 'rating', label: '评分' },
]

const priceRanges = [
  { value: 'all', label: '不限' },
  { value: '0-100', label: '0-100' },
  { value: '100-1000', label: '100-1000' },
  { value: '1000-10000', label: '1k-1万' },
  { value: '10000+', label: '1万+' },
]

export function ShopListPage() {
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('recommended')
  const [price, setPrice] = useState('all')
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 200)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => { versa.visitModule('shop') }, [])

  const filtered = useMemo(() => {
    let r = products
    if (category !== 'all') r = r.filter((p) => p.category === category)
    if (debounced) {
      const q = debounced.toLowerCase()
      r = r.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (price !== 'all') {
      const [min, max] = price === '10000+' ? [10000, Infinity] : price.split('-').map(Number)
      r = r.filter((p) => p.price >= min && p.price <= max)
    }
    r = [...r]
    if (sort === 'price_asc') r.sort((a, b) => a.price - b.price)
    if (sort === 'price_desc') r.sort((a, b) => b.price - a.price)
    if (sort === 'rating') r.sort((a, b) => b.rating - a.rating)
    if (sort === 'newest') r.sort((a, b) => a.id.localeCompare(b.id))
    return r
  }, [category, sort, debounced, price])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold">购物 Shop</h1>
        <p className="text-ink-500 dark:text-ink-400 mt-1">真实评价 · 精选好物 · 理性消费</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="搜索商品、品牌、标签..."
          className="flex-1"
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="sm:hidden h-10 px-4 rounded-xl bg-ink-100 dark:bg-ink-800 text-sm font-medium inline-flex items-center justify-center gap-2"
        >
          <SlidersHorizontal className="w-4 h-4" /> 筛选
        </button>
        <div className={`${showFilters ? 'flex' : 'hidden'} sm:flex flex-wrap gap-2`}>
          {sortOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => setSort(o.value)}
              className={`px-3 h-10 rounded-xl text-sm font-medium transition-colors ${
                sort === o.value
                  ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                  : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`${showFilters ? 'block' : 'hidden'} sm:block mb-6`}>
        <div className="text-xs text-ink-500 dark:text-ink-400 mb-2">价格区间</div>
        <div className="flex flex-wrap gap-2">
          {priceRanges.map((p) => (
            <button
              key={p.value}
              onClick={() => setPrice(p.value)}
              className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors ${
                price === p.value
                  ? 'bg-shop-500 text-white'
                  : 'bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 dark:hover:bg-ink-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 overflow-x-auto -mx-4 px-4">
        <Tabs
          variant="pills"
          tabs={categories.map((c) => ({ value: c.value, label: c.label }))}
          value={category}
          onChange={setCategory}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="w-7 h-7" />} title="没有找到相关商品" />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
