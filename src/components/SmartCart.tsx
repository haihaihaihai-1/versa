import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, Tag, X, Plus, ShoppingCart, Heart, Eye, Trash2, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { products } from '../data/products'
import { cn, formatCurrency } from '../lib/utils'
import { toast } from './ui/Toaster'

const STORAGE_KEY = 'versa:cart-v2'
const FAVORITES_KEY = 'versa:favorites'
const BROWSE_KEY = 'versa:browse-history'

export interface CartItem {
  productId: string
  qty: number
  selected: boolean
}

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return []
}

function saveCart(c: CartItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)) } catch {}
}

function loadFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]') } catch { return [] }
}

function loadBrowse(): string[] {
  try { return JSON.parse(localStorage.getItem(BROWSE_KEY) || '[]') } catch { return [] }
}

function addBrowse(id: string) {
  try {
    const arr = loadBrowse().filter((i) => i !== id)
    arr.unshift(id)
    localStorage.setItem(BROWSE_KEY, JSON.stringify(arr.slice(0, 30)))
  } catch {}
}

export function SmartCart() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    setCart(loadCart())
    setFavorites(loadFavorites())
    setRecent(loadBrowse())
  }, [])

  useEffect(() => {
    if (cart.length > 0) saveCart(cart)
  }, [cart])

  const cartProducts = cart.map((c) => ({ ...c, product: products.find((p) => p.id === c.productId) })).filter((c) => c.product)
  const selectedTotal = cartProducts.filter((c) => c.selected).reduce((s, c) => s + (c.product!.price * c.qty), 0)
  const allSelected = cartProducts.length > 0 && cartProducts.every((c) => c.selected)

  const updateQty = (id: string, qty: number) => {
    setCart((arr) => arr.map((c) => (c.productId === id ? { ...c, qty: Math.max(1, qty) } : c)))
  }

  const toggleSelect = (id: string) => {
    setCart((arr) => arr.map((c) => (c.productId === id ? { ...c, selected: !c.selected } : c)))
  }

  const toggleAll = () => {
    setCart((arr) => arr.map((c) => ({ ...c, selected: !allSelected })))
  }

  const remove = (id: string) => {
    setCart((arr) => arr.filter((c) => c.productId !== id))
    toast('已移除', 'info')
  }

  const addToCart = (id: string) => {
    setCart((arr) => {
      const existing = arr.find((c) => c.productId === id)
      if (existing) return arr.map((c) => (c.productId === id ? { ...c, qty: c.qty + 1, selected: true } : c))
      return [...arr, { productId: id, qty: 1, selected: true }]
    })
    addBrowse(id)
    toast('已加入购物车', 'success')
  }

  const toggleFav = (id: string) => {
    setFavorites((arr) => {
      const next = arr.includes(id) ? arr.filter((i) => i !== id) : [...arr, id]
      try { localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const checkout = () => {
    if (selectedTotal === 0) { toast('请选择商品', 'error'); return }
    toast(`结算中... ¥${selectedTotal}`, 'success')
  }

  const recommendations = (id: string) => {
    const p = products.find((p) => p.id === id)
    if (!p) return []
    return products.filter((x) => x.id !== id && x.category === p.category).slice(0, 3)
  }

  const trending = products.slice(0, 4)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-nova-500" />
          购物车
          {cartProducts.length > 0 && (
            <span className="text-xs text-ink-500 font-normal">({cartProducts.length} 件)</span>
          )}
        </h2>
        {cartProducts.length > 0 && (
          <button onClick={() => setCart([])} className="text-xs text-ink-500 hover:text-rose-500 flex items-center gap-1">
            <Trash2 className="w-3 h-3" />清空
          </button>
        )}
      </div>

      {cartProducts.length === 0 ? (
        <div className="text-center py-16 text-ink-500 bg-white/60 dark:bg-ink-900/30 rounded-2xl">
          <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>购物车是空的</p>
          <Link to="/shop" className="text-nova-500 text-sm inline-block mt-2">去逛逛 →</Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {cartProducts.map((c) => (
              <motion.div
                key={c.productId}
                layout
                className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-3 flex items-center gap-3"
              >
                <input
                  type="checkbox"
                  checked={c.selected}
                  onChange={() => toggleSelect(c.productId)}
                  className="w-4 h-4 accent-nova-500"
                />
                <Link to={`/shop/product/${c.productId}`} className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-ink-100">
                  <img src={c.product!.images?.[0]} alt={c.product!.name} className="w-full h-full object-cover" />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link to={`/shop/product/${c.productId}`} className="font-semibold text-sm line-clamp-1 hover:text-nova-500">
                    {c.product!.name}
                  </Link>
                  <p className="text-xs text-ink-500 mt-0.5 line-clamp-1">{c.product!.tagline}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-base font-bold text-rose-500">¥{formatCurrency(c.product!.price)}</p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQty(c.productId, c.qty - 1)}
                        className="w-6 h-6 rounded bg-ink-100 dark:bg-ink-800 text-sm"
                      >-</button>
                      <span className="w-7 text-center text-sm font-medium">{c.qty}</span>
                      <button
                        onClick={() => updateQty(c.productId, c.qty + 1)}
                        className="w-6 h-6 rounded bg-ink-100 dark:bg-ink-800 text-sm"
                      >+</button>
                    </div>
                  </div>
                </div>
                <button onClick={() => remove(c.productId)} className="p-1.5 text-ink-400 hover:text-rose-500">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-nova-500/10 to-pink-500/10 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-500">已选 {cartProducts.filter((c) => c.selected).length} 件</p>
              <p className="text-2xl font-bold text-rose-500">¥{formatCurrency(selectedTotal)}</p>
            </div>
            <button
              onClick={checkout}
              className="px-6 h-11 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold"
            >
              去结算
            </button>
          </div>
        </>
      )}

      {recent.length > 0 && (
        <div>
          <h3 className="text-sm font-bold flex items-center gap-1.5 mb-2">
            <Eye className="w-4 h-4 text-ink-500" />最近浏览
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {recent.slice(0, 4).map((id) => {
              const p = products.find((p) => p.id === id)
              if (!p) return null
              return (
                <div key={id} className="bg-white/60 dark:bg-ink-900/40 rounded-xl p-2">
                  <Link to={`/shop/product/${id}`} className="block">
                    <div className="aspect-square rounded-md overflow-hidden bg-ink-100">
                      <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] mt-1 line-clamp-1">{p.name}</p>
                    <p className="text-xs text-rose-500 font-bold">¥{p.price}</p>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {cartProducts.length > 0 && (
        <div>
          <h3 className="text-sm font-bold flex items-center gap-1.5 mb-2">
            <Sparkles className="w-4 h-4 text-nova-500" />猜你喜欢
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {trending.map((p) => (
              <div key={p.id} className="bg-white/60 dark:bg-ink-900/40 rounded-xl p-2 relative group">
                <Link to={`/shop/product/${p.id}`}>
                  <div className="aspect-square rounded-md overflow-hidden bg-ink-100">
                    <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                </Link>
                <p className="text-[10px] mt-1 line-clamp-1">{p.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs text-rose-500 font-bold">¥{p.price}</p>
                  <button
                    onClick={() => addToCart(p.id)}
                    className="opacity-0 group-hover:opacity-100 transition w-6 h-6 rounded-full bg-nova-500 text-white flex items-center justify-center"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
