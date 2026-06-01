import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { products } from '../data'
import { useVersa, versa } from '../store/versa'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Tabs } from '../components/ui/Tabs'
import { toast } from '../components/ui/Toaster'
import {
  Heart, ShoppingBag, Trash2, TrendingUp, TrendingDown, Minus, Bell,
  Sparkles, ChevronDown, ChevronUp, Grid3x3, List, Eye, Plus, Filter
} from 'lucide-react'
import { cn, formatCurrency } from '../lib/utils'

// 模拟价格历史 - 用商品 ID 做种子
function generatePriceHistory(productId: string, currentPrice: number) {
  const seed = productId.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  const history: { date: string; price: number }[] = []
  const basePrice = Math.round(currentPrice * 1.15)
  for (let i = 30; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    // 随机波动
    const variance = ((seed * (i + 1)) % 100) / 100 - 0.5
    const factor = 1 + variance * 0.08
    history.push({ date, price: Math.round(basePrice * factor) })
  }
  // 最后一天是 currentPrice
  history[history.length - 1].price = currentPrice
  return history
}

const FILTERS = [
  { value: 'all', label: '全部' },
  { value: 'price_drop', label: '降价' },
  { value: 'in_stock', label: '有货' },
  { value: 'on_sale', label: '活动中' },
]

export function WishlistPage() {
  const { wishlist } = useVersa()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('added')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['tech', 'beauty', 'home', 'fashion', 'food', 'sports', 'books', 'other']))

  const items = products.filter((p) => wishlist.includes(p.id))

  // 按分类分组
  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>()
    items.forEach((p) => {
      const k = p.category
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(p)
    })
    return Array.from(map.entries()).map(([cat, list]) => ({
      category: cat,
      label: { tech: '数码', fashion: '服饰', home: '家居', books: '图书', food: '食品', sports: '运动', beauty: '美妆' }[cat] || '其他',
      items: list,
    }))
  }, [items])

  const filtered = useMemo(() => {
    let r = items
    if (filter === 'price_drop') r = r.filter((p) => (p.originalPrice || 0) > p.price)
    if (filter === 'in_stock') r = r.filter((p) => p.stock > 0)
    if (filter === 'on_sale') r = r.filter((p) => p.isFlagship || p.isExclusive || (p.originalPrice || 0) > p.price)
    const sorted = [...r]
    if (sort === 'price_asc') sorted.sort((a, b) => a.price - b.price)
    if (sort === 'price_desc') sorted.sort((a, b) => b.price - a.price)
    if (sort === 'rating') sorted.sort((a, b) => b.rating - a.rating)
    return sorted
  }, [items, filter, sort])

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <EmptyState
          icon={<Heart className="w-7 h-7" />}
          title="还没有收藏任何商品"
          description="在商品页点击心形图标即可收藏，价格变动时会收到提醒"
          action={
            <div className="flex gap-2">
              <Link to="/shop"><Button leftIcon={<ShoppingBag className="w-4 h-4" />}>去逛逛</Button></Link>
            </div>
          }
        />
      </div>
    )
  }

  // 降价统计
  const priceDropCount = items.filter((p) => (p.originalPrice || 0) > p.price).length
  const totalSavedPotential = items.reduce((s, p) => s + ((p.originalPrice || p.price) - p.price), 0)

  const toggleGroup = (k: string) => {
    const next = new Set(expandedGroups)
    next.has(k) ? next.delete(k) : next.add(k)
    setExpandedGroups(next)
  }

  const renderItem = (p: typeof products[0]) => {
    const priceDrop = (p.originalPrice || 0) > p.price
    const history = generatePriceHistory(p.id, p.price)
    const minPrice = Math.min(...history.map((h) => h.price))
    const maxPrice = Math.max(...history.map((h) => h.price))

    if (view === 'list') {
      return (
        <div key={p.id} className="flex gap-3 p-3 rounded-2xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 hover:shadow-md transition-all group">
          <Link to={`/shop/${p.id}`} className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 rounded-xl overflow-hidden bg-ink-100">
            <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/shop/${p.id}`} className="font-semibold text-sm line-clamp-1 hover:text-shop-600">{p.name}</Link>
            <p className="text-xs text-ink-500 line-clamp-1 mt-0.5">{p.tagline}</p>
            <div className="mt-1.5 flex items-center gap-2 text-xs">
              {priceDrop ? (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-debate-500/10 text-debate-600 font-bold">
                  <TrendingDown className="w-3 h-3" />降 ¥{(p.originalPrice! - p.price).toLocaleString()}
                </span>
              ) : (
                <span className="text-ink-500">无价格变化</span>
              )}
              <span className="flex items-center gap-0.5 text-ink-500">
                <Bell className="w-3 h-3" />已开启提醒
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between flex-shrink-0">
            <div className="text-right">
              <div className="text-lg font-bold text-shop-600">{formatCurrency(p.price)}</div>
              {p.originalPrice && (
                <div className="text-xs text-ink-400 line-through">{formatCurrency(p.originalPrice)}</div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { versa.addToCart(p.id, 1); toast('已加入购物车', 'success') }}
                className="px-2.5 h-7 rounded-lg bg-shop-500 text-white text-xs font-bold hover:bg-shop-600"
              >加购</button>
              <button
                onClick={() => { versa.toggleWishlist(p.id); toast('已取消收藏', 'success') }}
                className="w-7 h-7 rounded-lg border border-ink-200 dark:border-ink-700 text-debate-500 hover:bg-debate-500/10 flex items-center justify-center"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )
    }

    return <ProductCardV2 key={p.id} product={p} />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-debate-500 to-rose-500 flex items-center justify-center shadow-lg">
              <Heart className="w-5 h-5 text-white fill-current" />
            </div>
            我的收藏
          </h1>
          <p className="text-sm text-ink-500 dark:text-ink-400 mt-2">
            {items.length} 件好物 · {priceDropCount > 0 && <span className="text-debate-600 font-bold">{priceDropCount} 件降价 · 最多可省 ¥{totalSavedPotential.toLocaleString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { toast('已开启全部降价提醒 🔔', 'success') }}
            className="text-sm px-3 py-1.5 rounded-lg border border-shop-500/30 text-shop-600 hover:bg-shop-500/5 inline-flex items-center gap-1.5"
          >
            <Bell className="w-3.5 h-3.5" /> 降价提醒
          </button>
          <button
            onClick={() => {
              if (confirm('确定清空收藏？')) {
                items.forEach((p) => versa.toggleWishlist(p.id))
              }
            }}
            className="text-sm text-ink-500 hover:text-debate-500 inline-flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" /> 清空
          </button>
        </div>
      </div>

      {/* 降价提醒横幅 */}
      {priceDropCount > 0 && (
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-debate-500/10 via-rose-500/8 to-amber-500/10 border border-debate-200/40 dark:border-debate-800/40 p-4">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-debate-500/15 to-transparent rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-debate-500 to-rose-500 flex items-center justify-center shadow-lg">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold">降价提醒</div>
              <div className="text-xs text-ink-500 mt-0.5">
                {priceDropCount} 件商品已降价 · 一键加购可省 <strong className="text-debate-600">¥{totalSavedPotential.toLocaleString()}</strong>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => {
                items.filter((p) => (p.originalPrice || 0) > p.price).forEach((p) => versa.addToCart(p.id, 1))
                toast('已将降价商品加入购物车 🛒', 'success')
              }}
              className="bg-gradient-to-r from-debate-500 to-rose-500 hover:from-debate-600 hover:to-rose-600 text-white"
              leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
            >
              一键加购降价商品
            </Button>
          </div>
        </div>
      )}

      {/* 筛选 + 排序 + 视图切换 */}
      <div className="space-y-3">
        <div className="overflow-x-auto -mx-4 px-4">
          <Tabs variant="pills" tabs={FILTERS} value={filter} onChange={setFilter} />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-ink-500">排序：</span>
          {[
            { v: 'added', l: '最近收藏' },
            { v: 'price_asc', l: '价格 ↑' },
            { v: 'price_desc', l: '价格 ↓' },
            { v: 'rating', l: '评分' },
          ].map((s) => (
            <button
              key={s.v}
              onClick={() => setSort(s.v)}
              className={cn(
                'px-3 h-8 rounded-lg text-xs font-medium transition-colors',
                sort === s.v ? 'bg-shop-500 text-white' : 'bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 dark:hover:bg-ink-700'
              )}
            >
              {s.l}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1 bg-ink-100 dark:bg-ink-800 p-1 rounded-lg">
            <button
              onClick={() => setView('grid')}
              className={cn('w-7 h-7 rounded flex items-center justify-center transition-colors', view === 'grid' ? 'bg-white dark:bg-ink-900 shadow-sm' : 'text-ink-500')}
              aria-label="网格视图"
            >
              <Grid3x3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setView('list')}
              className={cn('w-7 h-7 rounded flex items-center justify-center transition-colors', view === 'list' ? 'bg-white dark:bg-ink-900 shadow-sm' : 'text-ink-500')}
              aria-label="列表视图"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 分类分组 */}
      {view === 'grid' ? (
        <div className="space-y-4">
          {grouped.map((g) => {
            const gItems = g.items.filter((p) => {
              if (filter === 'price_drop') return (p.originalPrice || 0) > p.price
              if (filter === 'in_stock') return p.stock > 0
              if (filter === 'on_sale') return p.isFlagship || p.isExclusive || (p.originalPrice || 0) > p.price
              return true
            })
            if (gItems.length === 0) return null
            const isExpanded = expandedGroups.has(g.category)
            return (
              <div key={g.category} className="rounded-3xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
                <button
                  onClick={() => toggleGroup(g.category)}
                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-ink-50 dark:hover:bg-ink-900/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base">{g.label}</span>
                    <span className="text-xs text-ink-500">{gItems.length} 件</span>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-ink-400" /> : <ChevronDown className="w-4 h-4 text-ink-400" />}
                </button>
                {isExpanded && (
                  <div className="px-5 pb-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {gItems.map((p) => <ProductCardV2 key={p.id} product={p} />)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(renderItem)}
        </div>
      )}

      {/* 推荐 */}
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-shop-500" />
          <h2 className="text-lg font-bold">你可能还喜欢</h2>
          <span className="text-xs text-ink-500">基于收藏偏好</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {products.filter((p) => !wishlist.includes(p.id)).slice(0, 4).map((p) => (
            <ProductCardV2 key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  )
}
