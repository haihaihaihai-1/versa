import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, X, ChevronRight } from 'lucide-react'
import { products } from '../data/products'
import { cn, formatCurrency } from '../lib/utils'

const STORAGE_KEY = 'versa:recently-viewed'
const MAX = 8

export function useRecentlyViewed(productId?: string) {
  useEffect(() => {
    if (!productId) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const list: string[] = stored ? JSON.parse(stored) : []
      const filtered = list.filter((id) => id !== productId)
      const updated = [productId, ...filtered].slice(0, MAX)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new CustomEvent('versa:recently-viewed-updated'))
    } catch {}
  }, [productId])
}

export function RecentlyViewed({ className, excludeId }: { className?: string; excludeId?: string }) {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    const update = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        setIds(stored ? JSON.parse(stored) : [])
      } catch {
        setIds([])
      }
    }
    update()
    window.addEventListener('versa:recently-viewed-updated', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('versa:recently-viewed-updated', update)
      window.removeEventListener('storage', update)
    }
  }, [])

  const items = ids
    .filter((id) => id !== excludeId)
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean)
    .slice(0, MAX)

  if (items.length === 0) return null

  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-ink-500" />
          最近浏览
        </h3>
        <button
          onClick={() => {
            localStorage.removeItem(STORAGE_KEY)
            window.dispatchEvent(new CustomEvent('versa:recently-viewed-updated'))
          }}
          className="text-xs text-ink-500 hover:text-debate-500"
        >
          清除
        </button>
      </div>
      <div className="overflow-x-auto -mx-4 px-4 scrollbar-thin">
        <div className="flex gap-3 pb-2">
          {items.map((p) => (
            <Link
              key={p!.id}
              to={`/shop/${p!.id}`}
              className="flex-shrink-0 w-32 group"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-ink-100 dark:bg-ink-800 relative">
                <img src={p!.images[0]} alt={p!.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                {p!.originalPrice && p!.originalPrice > p!.price && (
                  <div className="absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-debate-500 text-white">
                    -{Math.round((1 - p!.price / p!.originalPrice) * 100)}%
                  </div>
                )}
              </div>
              <h4 className="text-xs font-medium truncate mt-1.5">{p!.name}</h4>
              <div className="text-xs font-bold text-shop-600">{formatCurrency(p!.price)}</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
