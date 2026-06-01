import { useState, useMemo, useEffect } from 'react'
import { news } from '../data'
import { useVersa, versa } from '../store/versa'
import { NewsCard } from '../components/news/NewsCard'
import { Tabs } from '../components/ui/Tabs'
import { SearchBar, useDebounce } from '../components/ui/Search'
import { EmptyState } from '../components/ui/EmptyState'
import { Newspaper } from 'lucide-react'

const categories = [
  { value: 'all', label: '全部' },
  { value: 'tech', label: '科技' },
  { value: 'finance', label: '财经' },
  { value: 'culture', label: '文化' },
  { value: 'science', label: '科学' },
  { value: 'world', label: '国际' },
  { value: 'lifestyle', label: '生活' },
]

const sortOptions = [
  { value: 'newest', label: '最新' },
  { value: 'hot', label: '最热' },
]

export function NewsListPage() {
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<'newest' | 'hot'>('newest')
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 200)

  useEffect(() => { versa.visitModule('news') }, [])

  const filtered = useMemo(() => {
    let r = news
    if (category !== 'all') r = r.filter((a) => a.category === category)
    if (debounced) {
      const q = debounced.toLowerCase()
      r = r.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.subtitle.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    r = [...r]
    if (sort === 'newest') r.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    if (sort === 'hot') r.sort((a, b) => b.views - a.views)
    return r
  }, [category, sort, debounced])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold">资讯 News</h1>
        <p className="text-ink-500 dark:text-ink-400 mt-1">深度报道、独家视角、跨领域观察</p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="搜索资讯、标签..."
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
          tabs={categories.map((c) => ({ value: c.value, label: c.label, count: c.value === 'all' ? news.length : news.filter((a) => a.category === c.value).length }))}
          value={category}
          onChange={setCategory}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="w-7 h-7" />}
          title="没有找到相关资讯"
          description="试试其他关键词或分类"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((a) => <NewsCard key={a.id} article={a} />)}
        </div>
      )}
    </div>
  )
}
