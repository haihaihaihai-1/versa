/**
 * Versa · 搜索/推荐 UI (v16.0)
 */
import { useEffect, useMemo, useState } from 'react'
import { Search as SearchIcon, X, Filter, Sparkles, TrendingUp, Loader2 } from 'lucide-react'
import { searchIndex, type IndexedDoc, type SearchHit, type SearchOptions } from './index'
import { recommender, type Item, type UserProfile, type Recommendation } from './recommend'
import { cn } from '../lib/utils'

export function SearchBar({ onHit, placeholder = '搜索博客、商品、辩论…' }: { onHit?: (h: SearchHit) => void; placeholder?: string }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!q.trim()) { setHits([]); return }
    setBusy(true)
    const t = setTimeout(() => {
      setHits(searchIndex.search(q, { limit: 8, fuzzy: true, highlight: true }))
      setBusy(false)
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="relative w-full">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 rounded-full bg-ink-100 dark:bg-ink-800 outline-none text-sm focus:ring-2 ring-violet-500/50"
        />
        {q && (
          <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
            <X className="w-4 h-4" />
          </button>
        )}
        {busy && <Loader2 className="absolute right-9 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500 animate-spin" />}
      </div>
      {hits.length > 0 && (
        <div className="absolute z-30 mt-1 w-full max-h-96 overflow-y-auto rounded-2xl bg-white dark:bg-ink-900 shadow-xl border border-ink-200/50 dark:border-ink-800/50">
          {hits.map((h) => (
            <button
              key={h.id}
              onClick={() => { onHit?.(h); setQ('') }}
              className="w-full text-left px-4 py-2 hover:bg-ink-50 dark:hover:bg-ink-800 border-b border-ink-100 dark:border-ink-800 last:border-0"
            >
              <div className="text-sm font-medium truncate">{h.title}</div>
              <div
                className="text-xs text-ink-500 mt-0.5 line-clamp-1"
                dangerouslySetInnerHTML={{ __html: h.snippet }}
              />
              <div className="flex items-center gap-2 mt-1">
                {h.matchedTerms.slice(0, 3).map((t: string) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500">
                    {t}
                  </span>
                ))}
                <span className="text-[10px] text-ink-400">score: {h.score.toFixed(2)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function FacetedFilters({ value, onChange, categories }: { value: SearchOptions; onChange: (v: SearchOptions) => void; categories: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Filter className="w-4 h-4 text-ink-400" />
      {categories.map((c) => (
        <button
          key={c}
          onClick={() => onChange({ ...value, category: value.category === c ? undefined : c })}
          className={cn('px-2.5 py-1 rounded-full text-xs', value.category === c ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
        >
          {c}
        </button>
      ))}
      <label className="flex items-center gap-1 text-xs">
        <input type="checkbox" checked={!!value.fuzzy} onChange={(e) => onChange({ ...value, fuzzy: e.target.checked })} />
        模糊
      </label>
    </div>
  )
}

export function RecommendationGrid({ profile, limit = 12 }: { profile: UserProfile; limit?: number }) {
  const recs = useMemo(() => recommender.recommend(profile, limit), [profile, limit])

  if (recs.length === 0) {
    return <div className="text-sm text-ink-500 text-center py-8">暂无推荐, 多浏览一些内容后会更精准 ✨</div>
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {recs.map((r: Recommendation) => (
        <div key={r.item.id} className="rounded-2xl p-3 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50 hover:shadow-lg transition-shadow">
          <div className="aspect-video rounded-lg bg-gradient-to-br from-violet-500/20 to-pink-500/20 mb-2 flex items-center justify-center text-3xl">
            {r.item.category === 'product' ? '🛍️' : r.item.category === 'debate' ? '⚖️' : '📝'}
          </div>
          <h3 className="text-sm font-semibold line-clamp-2">{r.item.title}</h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {r.item.tags.slice(0, 2).map((t: string) => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-ink-500">
                #{t}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-ink-400 mt-1.5">{r.reason}</p>
        </div>
      ))}
    </div>
  )
}

export function TrendingList({ limit = 8 }: { limit?: number }) {
  const items = useMemo(() => recommender.trending(limit), [limit])

  return (
    <div className="space-y-2">
      <h3 className="font-semibold flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-rose-500" /> 热门
      </h3>
      {items.map((r: Recommendation, i: number) => (
        <div key={r.item.id} className="flex items-center gap-3 py-2 border-b border-ink-100 dark:border-ink-800 last:border-0">
          <div className={cn('w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold', i < 3 ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-500')}>
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{r.item.title}</div>
            <div className="text-[10px] text-ink-400">{r.item.category || '综合'} · {r.item.views || 0} 浏览</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SearchResultsPage() {
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState<SearchOptions>({ fuzzy: true, limit: 20 })
  const [hits, setHits] = useState<SearchHit[]>([])

  useEffect(() => {
    if (!q.trim()) { setHits([]); return }
    setHits(searchIndex.search(q, opts))
  }, [q, opts])

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <SearchIcon className="w-5 h-5" /> 搜索发现
      </h1>
      <div className="space-y-3 mb-6">
        <SearchBar onHit={(h) => setQ(h.title)} />
        <FacetedFilters value={opts} onChange={setOpts} categories={['blog', 'product', 'debate', 'news']} />
      </div>
      {q && hits.length === 0 && (
        <div className="text-center py-12 text-ink-500">没有找到相关结果</div>
      )}
      <div className="space-y-3">
        {hits.map((h) => (
          <div key={h.id} className="p-4 rounded-2xl bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
            <h3 className="font-semibold">{h.title}</h3>
            <p
              className="text-sm text-ink-500 mt-1"
              dangerouslySetInnerHTML={{ __html: h.snippet }}
            />
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[10px] text-ink-400">{h.doc.category}</span>
              <span className="text-[10px] text-ink-400">score: {h.score.toFixed(2)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { searchIndex, recommender }
export type { IndexedDoc, Item, UserProfile, Recommendation, SearchHit, SearchOptions }
