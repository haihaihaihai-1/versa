import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Flame, Search, X } from 'lucide-react'
import { cn } from '../lib/utils'

export interface HotSearchItem {
  id: string
  keyword: string
  category?: string
  hot: number
  trend: 'up' | 'down' | 'new'
  link?: string
}

const HOT_SEARCHES: HotSearchItem[] = [
  { id: '1', keyword: 'iPhone 16 Pro 降价', category: 'tech', hot: 987654, trend: 'up' },
  { id: '2', keyword: '618 终极清单', category: 'shop', hot: 856432, trend: 'up' },
  { id: '3', keyword: '露营帐篷推荐', category: 'shop', hot: 743291, trend: 'up' },
  { id: '4', keyword: '高考志愿填报', category: 'news', hot: 692184, trend: 'new' },
  { id: '5', keyword: 'SK-II 神仙水', category: 'beauty', hot: 654321, trend: 'down' },
  { id: '6', keyword: '小龙虾 上市', category: 'food', hot: 612543, trend: 'up' },
  { id: '7', keyword: '新能源汽车', category: 'tech', hot: 598742, trend: 'up' },
  { id: '8', keyword: '防晒霜 横评', category: 'beauty', hot: 542198, trend: 'down' },
  { id: '9', keyword: 'iPad 选购', category: 'tech', hot: 523456, trend: 'new' },
  { id: '10', keyword: '618 退货攻略', category: 'shop', hot: 498765, trend: 'up' },
  { id: '11', keyword: '黄油相机 9.0', category: 'tech', hot: 412345, trend: 'new' },
  { id: '12', keyword: '网红奶茶测评', category: 'food', hot: 387654, trend: 'down' },
]

interface Props {
  onSelect?: (item: HotSearchItem) => void
  compact?: boolean
}

export function HotSearches({ onSelect, compact = false }: Props) {
  const [open, setOpen] = useState(false)

  if (compact) {
    return (
      <div className="flex items-center gap-2 overflow-x-auto py-2 scrollbar-thin">
        <span className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-bold text-orange-500">
          <Flame className="w-3.5 h-3.5" />
          热搜
        </span>
        {HOT_SEARCHES.slice(0, 6).map((h) => (
          <button
            key={h.id}
            onClick={() => onSelect?.(h)}
            className="flex-shrink-0 text-xs text-ink-600 dark:text-ink-300 hover:text-nova-500 transition whitespace-nowrap"
          >
            {h.keyword}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-1.5">
          <Flame className="w-4 h-4 text-orange-500" />
          实时热搜
        </h3>
        <button onClick={() => setOpen(!open)} className="text-xs text-ink-500 hover:text-nova-500">
          {open ? '收起' : '展开'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {HOT_SEARCHES.slice(0, open ? 12 : 5).map((h, i) => (
          <motion.button
            key={h.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelect?.(h)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800 transition text-left"
          >
            <span
              className={cn(
                'flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold',
                i < 3 ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-500'
              )}
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{h.keyword}</div>
              {h.category && <div className="text-[10px] text-ink-400">{h.category}</div>}
            </div>
            {h.trend === 'up' && <TrendingUp className="w-3 h-3 text-red-500" />}
            {h.trend === 'down' && <TrendingUp className="w-3 h-3 text-green-500 rotate-180" />}
            {h.trend === 'new' && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-orange-500 to-rose-500 text-white">
                NEW
              </span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  )
}

export function HotSearchesModal({ open, onClose, onSelect }: { open: boolean; onClose: () => void; onSelect: (item: HotSearchItem) => void }) {
  if (!open) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-start justify-center p-4 pt-20"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: -20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white dark:bg-ink-900 rounded-2xl shadow-2xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
              全网热搜 TOP 12
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <HotSearches onSelect={(h) => { onSelect(h); onClose() }} />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
