import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useVersa, versa } from '../store/versa'
import { products } from '../data'
import { Button } from '../components/ui/Button'
import { cn, formatCurrency } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import {
  ArrowLeft, Heart, Trash2, Share2, Sparkles, Folder,
  ChevronDown, ChevronRight, Plus, X, Filter, ShoppingCart,
  TrendingDown, Bell, Tag
} from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  tech: '数码',
  fashion: '穿搭',
  home: '家居',
  beauty: '美妆',
  food: '美食',
  sports: '运动',
  books: '图书',
}

interface Collection {
  id: string
  name: string
  icon: string
  productIds: string[]
  color: string
}

const SEED_COLLECTIONS: Collection[] = [
  { id: 'c1', name: '想买', icon: '🛒', productIds: ['p1', 'p7'], color: 'from-shop-500 to-news-500' },
  { id: 'c2', name: '618 加购', icon: '🎉', productIds: ['p2', 'p9'], color: 'from-rose-500 to-pink-500' },
  { id: 'c3', name: '送朋友', icon: '🎁', productIds: ['p4', 'p10'], color: 'from-nova-500 to-purple-500' },
]

export function SmartWishlistPage() {
  const navigate = useNavigate()
  const { wishlist } = useVersa()
  const [collections, setCollections] = useState<Collection[]>(SEED_COLLECTIONS)
  const [activeCollection, setActiveCollection] = useState<string>('all')
  const [collapsed, setCollapsed] = useState(false)
  const [creatingCollection, setCreatingCollection] = useState(false)
  const [newCollectionName, setNewCollectionName] = useState('')

  const items = wishlist
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as typeof products

  const visibleItems = useMemo(() => {
    if (activeCollection === 'all') return items
    const c = collections.find((c) => c.id === activeCollection)
    if (!c) return []
    return items.filter((p) => c.productIds.includes(p.id))
  }, [items, activeCollection, collections])

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof products>()
    visibleItems.forEach((p) => {
      if (!map.has(p.category)) map.set(p.category, [])
      map.get(p.category)!.push(p)
    })
    return Array.from(map.entries())
  }, [visibleItems])

  const totalValue = visibleItems.reduce((s, p) => s + p.price, 0)

  const remove = (id: string, name: string) => {
    versa.toggleWishlist(id)
    toast(`已从心愿单移除 ${name}`, 'info')
  }

  const createCollection = () => {
    if (newCollectionName.trim().length < 2) {
      toast('名称至少 2 个字', 'error')
      return
    }
    const c: Collection = {
      id: `c-${Date.now()}`,
      name: newCollectionName.trim(),
      icon: '✨',
      productIds: [],
      color: 'from-cyan-500 to-blue-500',
    }
    setCollections((s) => [...s, c])
    setNewCollectionName('')
    setCreatingCollection(false)
    toast(`已创建收藏夹「${c.name}」`, 'success')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs mb-3">
              <Heart className="w-3 h-3" />
              我的心愿单
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">收藏的美好</h1>
            <p className="text-white/90">
              {items.length} 件好物 · {collections.length} 个收藏夹 · 总价值 {formatCurrency(totalValue)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              onClick={() => {
                if (visibleItems.length === 0) {
                  toast('当前收藏夹为空', 'info')
                  return
                }
                toast('已开始批量加购', 'success')
              }}
              className="bg-white text-rose-600 hover:bg-white/90"
              leftIcon={<ShoppingCart className="w-4 h-4" />}
            >
              全部加购
            </Button>
            <p className="text-[10px] text-white/70">满 300 减 50 自动优惠</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Sidebar */}
        <aside className="md:col-span-1 space-y-2">
          <button
            onClick={() => setActiveCollection('all')}
            className={cn(
              'w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left flex items-center justify-between transition',
              activeCollection === 'all'
                ? 'bg-rose-500 text-white shadow'
                : 'bg-white/80 dark:bg-ink-900/60 text-ink-700 dark:text-ink-200 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            )}
          >
            <span className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              全部
            </span>
            <span className="text-xs opacity-70">{items.length}</span>
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-between text-xs text-ink-500 px-1 py-1"
          >
            <span className="flex items-center gap-1">
              {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              收藏夹
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setCreatingCollection(true)
              }}
              className="hover:text-nova-500"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </button>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-1 overflow-hidden"
              >
                {collections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveCollection(c.id)}
                    className={cn(
                      'w-full px-3 py-2.5 rounded-xl text-sm text-left flex items-center justify-between transition',
                      activeCollection === c.id
                        ? `bg-gradient-to-r ${c.color} text-white shadow`
                        : 'bg-white/80 dark:bg-ink-900/60 text-ink-700 dark:text-ink-200 hover:bg-ink-50'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span>{c.icon}</span>
                      {c.name}
                    </span>
                    <span className="text-xs opacity-70">
                      {c.productIds.filter((id) => wishlist.includes(id)).length}
                    </span>
                  </button>
                ))}

                {creatingCollection && (
                  <div className="p-2 rounded-xl bg-nova-50 dark:bg-nova-950/30 space-y-1.5">
                    <input
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && createCollection()}
                      placeholder="收藏夹名称"
                      className="w-full px-2 py-1 text-sm rounded bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 focus:outline-none focus:border-nova-500"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={createCollection}
                        className="flex-1 px-2 py-1 text-xs rounded bg-nova-500 text-white"
                      >
                        创建
                      </button>
                      <button
                        onClick={() => {
                          setCreatingCollection(false)
                          setNewCollectionName('')
                        }}
                        className="px-2 py-1 text-xs rounded bg-ink-200 dark:bg-ink-700"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </aside>

        {/* Main */}
        <div className="md:col-span-3 space-y-4">
          {visibleItems.length === 0 ? (
            <div className="py-20 text-center text-ink-500">
              <Heart className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>当前收藏夹还是空的</p>
              <Link
                to="/shop"
                className="inline-block mt-3 px-4 py-2 rounded-full bg-rose-500 text-white text-sm hover:bg-rose-600"
              >
                去逛逛商城
              </Link>
            </div>
          ) : (
            grouped.map(([cat, list]) => (
              <div key={cat}>
                <h3 className="text-sm font-semibold text-ink-500 mb-2 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5" />
                  {CATEGORY_LABELS[cat] || cat} · {list.length} 件
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {list.map((p) => (
                    <motion.div
                      key={p.id}
                      layout
                      whileHover={{ scale: 1.01 }}
                      className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 p-3 flex gap-3"
                    >
                      <Link to={`/shop/${p.id}`} className="w-20 h-20 rounded-xl overflow-hidden bg-ink-100 flex-shrink-0">
                        {p.images?.[0] && (
                          <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link to={`/shop/${p.id}`}>
                          <h4 className="font-semibold text-sm line-clamp-1 hover:text-shop-600">
                            {p.name}
                          </h4>
                        </Link>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-shop-600 font-bold">{formatCurrency(p.price)}</span>
                          {p.originalPrice && p.originalPrice > p.price && (
                            <span className="text-[10px] text-ink-400 line-through">
                              {formatCurrency(p.originalPrice)}
                            </span>
                          )}
                        </div>
                        {p.rating && (
                          <p className="text-[10px] text-ink-500 mt-0.5 flex items-center gap-1">
                            <span className="text-amber-500">★</span> {p.rating} · {p.reviewCount} 评价
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2">
                          <button
                            onClick={() => {
                              versa.addToCart(p.id, 1)
                              toast(`已加入购物车`, 'success')
                            }}
                            className="px-2 py-1 text-[10px] rounded-full bg-shop-500 text-white hover:bg-shop-600"
                          >
                            加购
                          </button>
                          <button
                            onClick={() => {
                              toast('降价提醒已开启', 'success')
                            }}
                            className="px-2 py-1 text-[10px] rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-200 flex items-center gap-0.5"
                          >
                            <Bell className="w-2.5 h-2.5" />
                            降价
                          </button>
                          <button
                            onClick={() => remove(p.id, p.name)}
                            className="ml-auto p-1 text-ink-400 hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
