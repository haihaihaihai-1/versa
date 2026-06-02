import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, ShoppingCart, Plus, Check, Star } from 'lucide-react'
import { products } from '../data/products'
import type { Product } from '../data/types'
import { cn, formatCurrency } from '../lib/utils'
import { toast } from './ui/Toaster'
import { Link } from 'react-router-dom'

interface BundleItem {
  productId: string
  qty: number
}

interface ProductBundle {
  id: string
  name: string
  description: string
  items: string[]
  cover: string
  totalPrice: number
  saves: number
  badge?: string
}

const STORAGE_KEY = 'versa:bundles'

function calcBundle(items: string[]): { totalPrice: number; saves: number } | null {
  const prods = items.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[]
  if (prods.length < 2) return null
  const totalPrice = prods.reduce((s, p) => s + p.price, 0)
  const factor = prods.length >= 4 ? 0.85 : prods.length >= 3 ? 0.9 : 0.95
  const final = Math.round(totalPrice * factor)
  return { totalPrice, saves: totalPrice - final }
}

function loadBundles(): ProductBundle[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  const out: ProductBundle[] = []
  const ids = products.map((p) => p.id)
  for (let i = 0; i < ids.length - 1; i += 3) {
    const slice = ids.slice(i, i + 3).filter(Boolean)
    if (slice.length < 2) continue
    const calced = calcBundle(slice)
    if (!calced) continue
    out.push({
      id: 'b' + i,
      name: ['舒适客厅套装', '美味厨房套装', '智能办公套装', '户外露营套装', '影音游戏套装', '健康睡眠套装'][i / 3] || '搭配套装',
      description: ['客厅升级', '厨房升级', '办公升级', '露营升级', '游戏升级', '睡眠升级'][i / 3] || '一起购买更划算',
      cover: products.find((p) => p.id === slice[0])?.images?.[0] || '',
      items: slice,
      totalPrice: calced.totalPrice,
      saves: calced.saves,
    })
  }
  return out.slice(0, 6)
}

function saveBundles(b: ProductBundle[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)) } catch {}
}

export function ProductBundle({ productId }: { productId: string }) {
  const [bundles, setBundles] = useState<ProductBundle[]>([])
  const [cart, setCart] = useState<Record<string, BundleItem[]>>({})

  useEffect(() => {
    setBundles(loadBundles())
  }, [])

  const current = products.find((p) => p.id === productId)
  if (!current) return null
  const related = bundles.filter((b) => b.items.includes(productId)).slice(0, 3)
  if (related.length === 0) return null

  const addAllToCart = (bundle: ProductBundle) => {
    setCart((c) => ({ ...c, [bundle.id]: bundle.items.map((id) => ({ productId: id, qty: 1 })) }))
    saveBundles(bundles)
    toast(`${bundle.name} 全部加入购物车`, 'success')
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-bold flex items-center gap-1.5">
        <Heart className="w-5 h-5 text-rose-500" />
        搭配推荐
        <span className="text-xs text-ink-500 font-normal ml-1">一起购买更划算</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {related.map((b) => {
          const inCart = !!cart[b.id]
          return (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 rounded-2xl border border-rose-200/60 dark:border-rose-800/30 p-4 space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm">{b.name}</h4>
                  {b.saves >= 100 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold">
                      省 ¥{b.saves}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-500 mt-0.5">{b.description}</p>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {b.items.map((id) => {
                  const p = products.find((p) => p.id === id)
                  if (!p) return null
                  return (
                    <Link
                      key={id}
                      to={`/shop/product/${id}`}
                      className="bg-white/60 dark:bg-ink-900/40 rounded-lg p-1.5 hover:scale-105 transition"
                    >
                      <div className="aspect-square rounded-md overflow-hidden bg-white">
                        <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <p className="text-[10px] mt-1 line-clamp-1 text-ink-700 dark:text-ink-300">{p.name}</p>
                      <p className="text-[10px] text-rose-500 font-bold">¥{p.price}</p>
                    </Link>
                  )
                })}
              </div>

              <div className="flex items-end justify-between pt-2 border-t border-rose-200/40">
                <div>
                  <p className="text-[10px] text-ink-400 line-through">原价 ¥{b.totalPrice}</p>
                  <p className="text-base font-bold text-rose-500">¥{b.totalPrice - b.saves}</p>
                </div>
                <button
                  onClick={() => addAllToCart(b)}
                  className={cn(
                    'px-3 h-8 rounded-lg text-xs font-semibold flex items-center gap-1 transition',
                    inCart
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:scale-105'
                  )}
                >
                  {inCart ? (
                    <><Check className="w-3.5 h-3.5" />已加入</>
                  ) : (
                    <><ShoppingCart className="w-3.5 h-3.5" />全部加入</>
                  )}
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
