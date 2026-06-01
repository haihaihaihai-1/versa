import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { brands, products } from '../data/products'
import { Tabs } from '../components/ui/Tabs'
import { SearchBar, useDebounce } from '../components/ui/Search'
import { Crown, TrendingUp, Package, Award, Sparkles, ChevronRight, ArrowUpRight, Star } from 'lucide-react'
import { cn, formatNumber } from '../lib/utils'

const CATEGORIES = [
  { value: 'all', label: '全部' },
  { value: 'tech', label: '数码' },
  { value: 'fashion', label: '服饰' },
  { value: 'home', label: '家居' },
  { value: 'beauty', label: '美妆' },
  { value: 'food', label: '食品' },
  { value: 'books', label: '图书' },
  { value: 'sports', label: '运动' },
]

const SORTS = [
  { value: 'sales', label: '销量' },
  { value: 'count', label: '商品数' },
  { value: 'name', label: '字母' },
]

export function BrandStreetPage() {
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState('sales')
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 200)

  // 关联每个品牌的商品分类
  const enrichedBrands = useMemo(() => {
    return brands.map((b) => {
      const ps = products.filter((p) => p.brand === b.name)
      const cats = Array.from(new Set(ps.map((p) => p.category)))
      const avgRating = ps.length > 0 ? ps.reduce((s, p) => s + p.rating, 0) / ps.length : 0
      return { ...b, categories: cats, avgRating }
    })
  }, [])

  const filtered = useMemo(() => {
    let r = enrichedBrands
    if (category !== 'all') {
      r = r.filter((b) => b.categories.includes(category as any))
    }
    if (debounced) {
      const q = debounced.toLowerCase()
      r = r.filter((b) => b.name.toLowerCase().includes(q) || b.story.toLowerCase().includes(q))
    }
    const sorted = [...r]
    if (sort === 'sales') sorted.sort((a, b) => b.totalSales - a.totalSales)
    if (sort === 'count') sorted.sort((a, b) => b.productCount - a.productCount)
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
    return sorted
  }, [enrichedBrands, category, sort, debounced])

  // Top 3 品牌
  const top3 = filtered.slice(0, 3)
  const rest = filtered.slice(3)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white p-6 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-3">
              <Crown className="w-3 h-3" /> BRAND STREET
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">品牌街</h1>
            <p className="mt-2 text-sm sm:text-base text-white/90">{enrichedBrands.length} 个优质品牌 · 品质生活之选</p>
            <div className="mt-3 flex items-center gap-3 text-xs text-white/80">
              <span className="flex items-center gap-1.5"><Award className="w-3 h-3" />官方旗舰</span>
              <span>·</span>
              <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" />正品保障</span>
            </div>
          </div>
          <div className="hidden sm:flex justify-end">
            <div className="relative">
              <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl sm:text-5xl font-bold">{enrichedBrands.length}</div>
                  <div className="text-xs text-white/80 mt-1">合作品牌</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 搜索 + 分类 + 排序 */}
      <div>
        <div className="mb-4">
          <SearchBar value={query} onChange={setQuery} placeholder="搜索品牌名、品牌故事..." className="w-full" />
        </div>
        <div className="mb-4 overflow-x-auto -mx-4 px-4">
          <Tabs variant="pills" tabs={CATEGORIES} value={category} onChange={setCategory} />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-ink-500">排序：</span>
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              className={cn(
                'px-3 h-8 rounded-lg text-xs font-medium transition-colors',
                sort === s.value
                  ? 'bg-amber-500 text-white'
                  : 'bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 dark:hover:bg-ink-700'
              )}
            >
              {s.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-ink-500">共 {filtered.length} 个品牌</span>
        </div>
      </div>

      {/* Top 3 排行 */}
      {top3.length === 3 && sort === 'sales' && category === 'all' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold">销量排行榜</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3.map((b, i) => (
              <Link
                key={b.id}
                to={`/shop/brand/${b.id}`}
                className="group relative block rounded-3xl overflow-hidden bg-white dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 transition-all hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-1"
              >
                <div className="absolute top-3 right-3 z-10">
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg',
                    i === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                    i === 1 ? 'bg-gradient-to-br from-ink-300 to-ink-400' :
                    'bg-gradient-to-br from-orange-300 to-orange-400'
                  )}>
                    {i + 1}
                  </div>
                </div>
                <div className="p-5 flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden ring-4 ring-white dark:ring-ink-800 shadow-xl mb-3">
                    <img src={b.logo} alt={b.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-bold text-lg">{b.name}</h3>
                  <p className="text-xs text-ink-500 line-clamp-1 mt-1">{b.story}</p>
                  <div className="mt-3 flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-ink-500">
                      <Package className="w-3 h-3" />{b.productCount} 款
                    </span>
                    <span>·</span>
                    <span className="text-shop-600 font-bold">{(b.totalSales / 10000).toFixed(1)} 万销量</span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-amber-600 font-bold group-hover:gap-2 transition-all">
                    进入品牌 <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 其余品牌网格 */}
      {rest.length > 0 && (
        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-4">所有品牌</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {rest.map((b) => (
              <Link
                key={b.id}
                to={`/shop/brand/${b.id}`}
                className="group block rounded-2xl overflow-hidden bg-white dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 transition-all hover:shadow-xl hover:-translate-y-0.5"
              >
                <div className="p-4 text-center">
                  <div className="w-16 h-16 mx-auto rounded-2xl overflow-hidden ring-2 ring-ink-100 dark:ring-ink-800 group-hover:ring-amber-400 transition-all mb-2">
                    <img src={b.logo} alt={b.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="font-bold text-sm line-clamp-1">{b.name}</h3>
                  <div className="mt-1.5 flex items-center justify-center gap-2 text-[10px] text-ink-500">
                    <span className="flex items-center gap-0.5">
                      <Package className="w-2.5 h-2.5" />{b.productCount}
                    </span>
                    <span>·</span>
                    <span>{(b.totalSales / 10000).toFixed(1)} 万销量</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="rounded-3xl text-center py-16 bg-white/40 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
          <Crown className="w-12 h-12 text-ink-300 mx-auto mb-3" />
          <div className="text-ink-500">没有找到相关品牌</div>
        </div>
      )}
    </div>
  )
}

import { Shield } from 'lucide-react'
