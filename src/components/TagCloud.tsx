import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Hash, TrendingUp, Search } from 'lucide-react'
import { cn, formatNumber } from '../lib/utils'

interface Tag {
  name: string
  count: number
  trend?: 'up' | 'down' | 'hot'
}

const TAGS: Tag[] = [
  { name: 'iPhone', count: 12800, trend: 'up' },
  { name: '618', count: 9800, trend: 'hot' },
  { name: '测评', count: 7600, trend: 'up' },
  { name: '美食', count: 6400, trend: 'down' },
  { name: '穿搭', count: 5900, trend: 'up' },
  { name: 'AI', count: 5400, trend: 'hot' },
  { name: '露营', count: 4200 },
  { name: '咖啡', count: 3800, trend: 'up' },
  { name: '健身', count: 3500 },
  { name: '美妆', count: 3300, trend: 'down' },
  { name: '数码', count: 3100, trend: 'up' },
  { name: '家居', count: 2900 },
  { name: '母婴', count: 2400, trend: 'down' },
  { name: '汽车', count: 2100, trend: 'up' },
  { name: '宠物', count: 1900, trend: 'hot' },
  { name: '旅行', count: 1700 },
  { name: '电竞', count: 1600, trend: 'up' },
  { name: '音乐', count: 1400 },
  { name: '读书', count: 1200 },
  { name: '摄影', count: 1100, trend: 'up' },
]

export function TagCloud() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'count' | 'name'>('count')

  const filtered = useMemo(() => {
    return TAGS.filter((t) => !search || t.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => sort === 'count' ? b.count - a.count : a.name.localeCompare(b.name))
  }, [search, sort])

  const maxCount = Math.max(...TAGS.map((t) => t.count))
  const minCount = Math.min(...TAGS.map((t) => t.count))

  const size = (count: number) => {
    const ratio = (count - minCount) / (maxCount - minCount)
    return 12 + ratio * 16
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-1.5">
          <Hash className="w-5 h-5 text-nova-500" />
          热门标签
        </h3>
        <div className="flex items-center gap-1 text-xs">
          <button
            onClick={() => setSort('count')}
            className={cn('px-2 h-6 rounded-full', sort === 'count' ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
          >
            热度
          </button>
          <button
            onClick={() => setSort('name')}
            className={cn('px-2 h-6 rounded-full', sort === 'name' ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
          >
            字母
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索标签..."
          className="w-full pl-9 pr-3 h-9 rounded-xl bg-white/80 dark:bg-ink-900/40 border border-ink-200 dark:border-ink-800 outline-none focus:ring-2 focus:ring-nova-500 text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {filtered.map((t, idx) => {
          const isHot = t.trend === 'hot'
          return (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.01 }}
            >
              <Link
                to={`/tag/${encodeURIComponent(t.name)}`}
                className={cn(
                  'inline-flex items-center gap-1 px-2.5 h-7 rounded-full transition',
                  isHot
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                    : 'bg-ink-100 dark:bg-ink-800 hover:bg-nova-100 dark:hover:bg-nova-900/40 hover:text-nova-500'
                )}
                style={{ fontSize: `${size(t.count)}px` }}
              >
                <span className="font-medium">#{t.name}</span>
                <span className={cn('text-[10px]', isHot ? 'opacity-80' : 'text-ink-500')}>
                  {formatNumber(t.count)}
                </span>
                {t.trend === 'up' && <span className="text-emerald-400 text-[9px]">↑</span>}
                {t.trend === 'down' && <span className="text-rose-400 text-[9px]">↓</span>}
                {t.trend === 'hot' && <span className="text-amber-300 text-[9px]">🔥</span>}
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
