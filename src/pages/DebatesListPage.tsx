import { useState, useMemo, useEffect } from 'react'
import { debates } from '../data'
import { useVersa, versa } from '../store/versa'
import { DebateCard } from '../components/debate/DebateCard'
import { Tabs } from '../components/ui/Tabs'
import { SearchBar, useDebounce } from '../components/ui/Search'
import { EmptyState } from '../components/ui/EmptyState'
import { Scale } from 'lucide-react'

const categories = [
  { value: 'all', label: '全部' },
  { value: 'tech', label: '科技' },
  { value: 'consumer', label: '消费' },
  { value: 'social', label: '社会' },
  { value: 'philosophy', label: '哲学' },
  { value: 'lifestyle', label: '生活' },
  { value: 'entertainment', label: '娱乐' },
]

const sortOptions = [
  { value: 'hot', label: '最热' },
  { value: 'newest', label: '最新' },
  { value: 'active', label: '最活跃' },
]

export function DebatesListPage() {
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<'hot' | 'newest' | 'active'>('hot')
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 200)

  useEffect(() => { versa.visitModule('debate') }, [])

  const filtered = useMemo(() => {
    let r = debates
    if (category !== 'all') r = r.filter((d) => d.category === category)
    if (debounced) {
      const q = debounced.toLowerCase()
      r = r.filter((d) =>
        d.title.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.tags?.some((t) => t.toLowerCase().includes(q))
      )
    }
    r = [...r]
    if (sort === 'hot') r.sort((a, b) => b.hot - a.hot)
    if (sort === 'newest') r.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    if (sort === 'active') r.sort((a, b) => b.pros + b.cons - (a.pros + a.cons))
    return r
  }, [category, sort, debounced])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold">辩论 Debate</h1>
        <p className="text-ink-500 dark:text-ink-400 mt-1">理性交锋 · 多元视角 · 共识构建</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="搜索辩论、话题..."
          className="flex-1"
        />
        <div className="flex gap-2">
          {sortOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => setSort(o.value as any)}
              className={`px-3 h-10 rounded-xl text-sm font-medium transition-colors ${
                sort === o.value
                  ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                  : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-8 overflow-x-auto -mx-4 px-4">
        <Tabs
          variant="pills"
          tabs={categories.map((c) => ({ value: c.value, label: c.label }))}
          value={category}
          onChange={setCategory}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Scale className="w-7 h-7" />} title="没有找到相关辩论" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((d) => <DebateCard key={d.id} debate={d} />)}
        </div>
      )}
    </div>
  )
}
