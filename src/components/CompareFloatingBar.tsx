import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { GitCompare, X, ArrowRight, Scale } from 'lucide-react'
import { useCompare, compareStore, COMPARE_LIMIT } from '../store/compare'
import { products } from '../data'
import { toast } from './ui/Toaster'
import { cn, formatCurrency } from '../lib/utils'

export function CompareFloatingBar() {
  const ids = useCompare()
  if (ids.length === 0) return null

  const items = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean)
  const isFull = ids.length >= COMPARE_LIMIT

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-3xl w-[calc(100%-2rem)]"
      >
        <div className="bg-white/95 dark:bg-ink-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-ink-200/60 dark:border-ink-800/60 p-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 pl-2">
              <Scale className="w-4 h-4 text-shop-500" />
              <span className="text-sm font-semibold">
                {ids.length} / {COMPARE_LIMIT}
              </span>
            </div>

            {/* Thumbnails */}
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto">
              {items.map((p) =>
                p ? (
                  <div
                    key={p.id}
                    className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-ink-100 to-ink-200 dark:from-ink-800 dark:to-ink-700 flex items-center justify-center text-xl relative group"
                    title={p.name}
                  >
                    {p.images?.[0] ? (
                      <img
                        src={p.images[0]}
                        alt=""
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <span>📦</span>
                    )}
                    <button
                      onClick={() => {
                        compareStore.remove(p.id)
                        toast(`已移除 ${p.name}`, 'info')
                      }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      aria-label="移除"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ) : null
              )}
              {Array.from({ length: COMPARE_LIMIT - ids.length }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex-shrink-0 w-12 h-12 rounded-lg border-2 border-dashed border-ink-200 dark:border-ink-700 flex items-center justify-center text-ink-300 text-xs"
                >
                  +
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  compareStore.clear()
                  toast('已清空对比', 'info')
                }}
                className="px-3 py-1.5 text-xs text-ink-500 hover:text-rose-500 transition"
              >
                清空
              </button>
              <Link
                to="/shop/compare"
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition',
                  isFull
                    ? 'bg-gradient-to-r from-shop-500 to-news-500 text-white shadow'
                    : 'bg-shop-100 dark:bg-shop-900/30 text-shop-600 dark:text-shop-400'
                )}
              >
                <GitCompare className="w-4 h-4" />
                {isFull ? '开始对比' : '查看对比'}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
