import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShoppingBag, Plus, X, TrendingUp, Star, Eye, ChevronUp, ChevronDown } from 'lucide-react'
import { cn, formatCurrency, formatNumber } from '../lib/utils'
import { toast } from './ui/Toaster'

interface ShopItem {
  id: string
  name: string
  price: number
  originalPrice?: number
  image: string
  category: string
  stock: number
  sold: number
  isHot?: boolean
  isNew?: boolean
}

const SEED: ShopItem[] = [
  { id: 's1', name: 'iPhone 16 Pro 256G', price: 8999, originalPrice: 9999, image: 'https://picsum.photos/seed/iphone16/300/300', category: '数码', stock: 32, sold: 128, isHot: true },
  { id: 's2', name: 'AirPods Pro 2', price: 1899, image: 'https://picsum.photos/seed/airpods/300/300', category: '数码', stock: 86, sold: 256, isHot: true },
  { id: 's3', name: 'Apple Watch S10', price: 3199, image: 'https://picsum.photos/seed/watch/300/300', category: '数码', stock: 18, sold: 64 },
  { id: 's4', name: '戴森 V12 吸尘器', price: 4990, originalPrice: 5490, image: 'https://picsum.photos/seed/dyson/300/300', category: '家电', stock: 12, sold: 89, isNew: true },
  { id: 's5', name: '戴森吹风机 HD16', price: 2990, image: 'https://picsum.photos/seed/dyson-hd/300/300', category: '家电', stock: 24, sold: 45 },
  { id: 's6', name: '雅诗兰黛小棕瓶', price: 880, image: 'https://picsum.photos/seed/estee/300/300', category: '美妆', stock: 99, sold: 312, isHot: true },
  { id: 's7', name: '兰蔻菁纯眼霜', price: 1120, originalPrice: 1280, image: 'https://picsum.photos/seed/lancome/300/300', category: '美妆', stock: 56, sold: 178 },
  { id: 's8', name: '三顿半咖啡礼盒', price: 199, image: 'https://picsum.photos/seed/coffee/300/300', category: '美食', stock: 200, sold: 512, isNew: true },
]

const STORAGE_KEY = 'versa:live-shop'

function load(): ShopItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return SEED
}

function save(items: ShopItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch {}
}

export function LiveShopWindow() {
  const [items, setItems] = useState<ShopItem[]>([])
  const [sort, setSort] = useState<'default' | 'sold' | 'price-asc' | 'price-desc'>('default')
  const [category, setCategory] = useState<'all' | string>('all')

  useEffect(() => {
    setItems(load())
  }, [])

  useEffect(() => { if (items.length) save(items) }, [items])

  const categories = ['all', ...Array.from(new Set(items.map((i) => i.category)))]
  const filtered = items.filter((i) => category === 'all' || i.category === category)
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'sold') return b.sold - a.sold
    if (sort === 'price-asc') return a.price - b.price
    if (sort === 'price-desc') return b.price - a.price
    return 0
  })

  const totalSold = items.reduce((s, i) => s + i.sold, 0)
  const totalRevenue = items.reduce((s, i) => s + i.sold * i.price, 0)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 p-3 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] opacity-80">直播销售额</p>
            <p className="text-2xl font-bold">¥{formatNumber(totalRevenue)}</p>
            <p className="text-[10px] opacity-80">已售 {totalSold} 件</p>
          </div>
          <ShoppingBag className="w-10 h-10 opacity-30" />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn('px-3 h-7 rounded-full text-xs font-medium flex-shrink-0', category === c ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
          >
            {c === 'all' ? '全部' : c}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-ink-500">排序:</span>
        {[
          { k: 'default', l: '默认' },
          { k: 'sold', l: '销量' },
          { k: 'price-asc', l: '价格 ↑' },
          { k: 'price-desc', l: '价格 ↓' },
        ].map((s) => (
          <button
            key={s.k}
            onClick={() => setSort(s.k as typeof sort)}
            className={cn('px-2 h-6 rounded text-[10px]', sort === s.k ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
          >
            {s.l}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {sorted.map((item) => {
          const percent = item.stock <= 20 ? Math.max(0, item.stock / 50 * 100) : 100
          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -2 }}
              className="bg-white/60 dark:bg-ink-900/30 rounded-2xl overflow-hidden border border-ink-200/60 dark:border-ink-800/60"
            >
              <div className="relative aspect-square bg-ink-100 dark:bg-ink-800">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 flex gap-0.5">
                  {item.isHot && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-500 text-white">🔥 爆款</span>}
                  {item.isNew && <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500 text-white">NEW</span>}
                </div>
                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/60 text-white">
                  剩 {item.stock}
                </div>
              </div>
              <div className="p-2 space-y-1">
                <p className="text-xs font-semibold line-clamp-2 leading-tight">{item.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-bold text-rose-500">¥{item.price}</span>
                  {item.originalPrice && <span className="text-[9px] text-ink-400 line-through">¥{item.originalPrice}</span>}
                </div>
                <div className="flex items-center justify-between text-[9px] text-ink-500">
                  <span><Eye className="inline w-2.5 h-2.5" />已售 {item.sold}</span>
                  {item.stock <= 20 && (
                    <span className="text-rose-500 font-bold">仅剩 {item.stock}</span>
                  )}
                </div>
                <button
                  onClick={() => toast('已加入购物车', 'success')}
                  className="w-full h-6 rounded bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-semibold flex items-center justify-center gap-0.5"
                >
                  <Plus className="w-3 h-3" />抢购
                </button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
