import { useState, useMemo, useEffect } from 'react'
import { news, breakingNews } from '../data'
import { useVersa, versa } from '../store/versa'
import { NewsCard } from '../components/news/NewsCard'
import { NewsHero } from '../components/news/NewsHero'
import { BreakingTicker } from '../components/news/BreakingTicker'
import { NewsSidebar } from '../components/news/NewsSidebar'
import { Tabs } from '../components/ui/Tabs'
import { SearchBar, useDebounce } from '../components/ui/Search'
import { EmptyState } from '../components/ui/EmptyState'
import { Newspaper, Filter, TrendingUp, FileText } from 'lucide-react'

const categories = [
  { value: 'all', label: '全部' },
  { value: 'tech', label: '科技' },
  { value: 'finance', label: '财经' },
  { value: 'culture', label: '文化' },
  { value: 'science', label: '科学' },
  { value: 'world', label: '国际' },
  { value: 'lifestyle', label: '生活' },
]

const editorialTabs = [
  { value: 'all', label: '推荐', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { value: 'longform', label: '深度', icon: <FileText className="w-3.5 h-3.5" /> },
  { value: 'breaking', label: '快讯', icon: <Filter className="w-3.5 h-3.5" /> },
]

const sortOptions = [
  { value: 'newest', label: '最新' },
  { value: 'hot', label: '最热' },
]

export function NewsListPage() {
  const [category, setCategory] = useState('all')
  const [editorial, setEditorial] = useState('all')
  const [sort, setSort] = useState<'newest' | 'hot'>('newest')
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 200)

  useEffect(() => { versa.visitModule('news') }, [])

  const featured = useMemo(() => news.filter((a) => a.isFeatured).slice(0, 3), [])
  const longForm = useMemo(() => news.filter((a) => a.isLongForm), [])

  const hotArticles = useMemo(
    () => [...news].sort((a, b) => b.views - a.views).slice(0, 8),
    []
  )
  const topAuthors = useMemo(() => {
    const map = new Map<string, { name: string; avatar: string; articles: number; reads: number }>()
    news.forEach((a) => {
      const key = a.author.id
      const ex = map.get(key)
      if (ex) {
        ex.articles += 1
        ex.reads += a.views
      } else {
        map.set(key, { name: a.author.name, avatar: a.author.avatar, articles: 1, reads: a.views })
      }
    })
    return Array.from(map.values()).sort((a, b) => b.reads - a.reads).slice(0, 5)
  }, [])

  const filtered = useMemo(() => {
    let r = news
    if (category !== 'all') r = r.filter((a) => a.category === category)
    if (editorial === 'longform') r = r.filter((a) => a.isLongForm)
    if (editorial === 'breaking') r = r.filter((a) => a.isBreaking)
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
  }, [category, editorial, sort, debounced])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-end justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">资讯 News</h1>
            <p className="text-ink-500 dark:text-ink-400 mt-1">深度报道 · 独家视角 · 跨领域观察</p>
          </div>
          <div className="text-xs text-ink-400">
            共 {news.length} 篇 · {longForm.length} 篇深度
          </div>
        </div>
      </div>

      {/* 快讯 ticker */}
      <div className="mb-6">
        <BreakingTicker />
      </div>

      {/* Hero - 3张精选 */}
      {featured.length > 0 && <NewsHero featured={featured} />}

      {/* 主内容 + 侧栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main */}
        <div className="lg:col-span-8">
          {/* 工具栏 */}
          <div className="mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <SearchBar
              value={query}
              onChange={setQuery}
              placeholder="搜索资讯、标签..."
              className="flex-1"
            />
            <div className="flex gap-1.5 p-1 rounded-xl bg-ink-100/60 dark:bg-ink-800/60">
              {sortOptions.map((o) => (
                <button
                  key={o.value}
                  onClick={() => setSort(o.value as any)}
                  className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors ${
                    sort === o.value
                      ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-white shadow-sm'
                      : 'text-ink-500 hover:text-ink-900 dark:hover:text-white'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* 编辑标签 */}
          <div className="mb-4 flex gap-2 overflow-x-auto -mx-1 px-1">
            {editorialTabs.map((t) => (
              <button
                key={t.value}
                onClick={() => setEditorial(t.value)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 h-9 rounded-full text-sm font-medium transition-colors ${
                  editorial === t.value
                    ? 'bg-news-500 text-white'
                    : 'bg-ink-100/60 dark:bg-ink-800/60 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700'
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* 分类 tabs */}
          <div className="mb-6 overflow-x-auto -mx-4 px-4">
            <Tabs
              variant="pills"
              tabs={categories.map((c) => ({
                value: c.value,
                label: c.label,
                count: c.value === 'all' ? news.length : news.filter((a) => a.category === c.value).length,
              }))}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filtered.map((a) => <NewsCard key={a.id} article={a} />)}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4">
          <NewsSidebar
            hotArticles={hotArticles}
            topAuthors={topAuthors}
            breakingTitles={breakingNews.map((b) => b.title)}
          />
        </div>
      </div>
    </div>
  )
}
