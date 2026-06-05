/**
 * Versa · 搜索 UI 组件 (v41 - 基于新版 SearchEngine)
 */
import { useEffect, useMemo, useState } from 'react'
import { Search as SearchIcon, X, Filter, Sparkles, TrendingUp, Loader2 } from 'lucide-react'
import { SearchEngine, type SearchHit, type SearchOptions } from './index'
import { cn } from '../lib/utils'

const engine = new SearchEngine({ fields: ['title', 'body'], fieldBoosts: { title: 3, body: 1 }, enableFuzzy: true, fuzzyDistance: 1 })
let inited = false
function ensure() {
  if (inited) return
  engine.indexBatch([
    { id: 'b1', fields: { title: '如何写好产品文案', body: '产品文案的 AIDA 模型，Attention/Interest/Desire/Action' }, tags: ['blog', 'marketing'] },
    { id: 'b2', fields: { title: 'TypeScript 进阶之路', body: '泛型、协变与逆变、模板字面量类型、装饰器' }, tags: ['blog', 'tech'] },
    { id: 'b3', fields: { title: 'React 性能调优实战', body: 'useMemo / useCallback / Suspense / 虚拟列表' }, tags: ['blog', 'react'] },
    { id: 'p1', fields: { title: '极简木质书架', body: '北欧风格实木书架，三层设计，最大承重 50kg' }, tags: ['product', 'furniture'] },
    { id: 'p2', fields: { title: '便携蓝牙耳机', body: '主动降噪，续航 30 小时，IPX5 防水' }, tags: ['product', 'audio'] },
    { id: 'd1', fields: { title: 'AI 是否会取代程序员', body: 'AI 编码工具对开发者职业的影响分析' }, tags: ['debate', 'ai'] },
  ])
  inited = true
}

export function SearchBar({ onHit, placeholder = '搜索博客、商品、辩论…' }: { onHit?: (h: SearchHit) => void; placeholder?: string }) {
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ensure()
    if (!q.trim()) { setHits([]); return }
    setBusy(true)
    const t = setTimeout(() => {
      setHits(engine.search({ query: q, limit: 8, fuzzy: true, highlight: { pre: '<mark>', post: '</mark>' } }))
      setBusy(false)
    }, 200)
    return () => clearTimeout(t)
  }, [q])

  const titleFor = (id: string) => { const t = engine.getDoc(id)?.fields.title; return typeof t === 'string' ? t : id }

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
              <div className="text-sm font-medium truncate">{titleFor(h.id)}</div>
              <div className="text-[10px] text-ink-400 mt-0.5">score: {h.score.toFixed(2)}</div>
              <div className="flex items-center gap-2 mt-1">
                {h.matchedTerms.slice(0, 3).map((t: string) => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500">
                    {t}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function FacetedFilters({ value, onChange, categories }: { value: SearchOptions; onChange: (v: SearchOptions) => void; categories: string[] }) {
  const current = (value.filter?.find(f => f.field === 'tags')?.value as string) ?? ''
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <Filter className="w-4 h-4 text-ink-400" />
      {categories.map((c) => (
        <button
          key={c}
          onClick={() => onChange({ ...value, filter: current === c ? [] : [{ field: 'tags', value: c }] })}
          className={cn('px-2.5 py-1 rounded-full text-xs', current === c ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
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

export function RecommendationGrid({ limit = 8 }: { profile?: { id: string; interests?: string[] }; limit?: number }) {
  useEffect(() => { ensure() }, [])
  const items = useMemo(() => {
    const all = engine.listDocs()
    return all.slice(0, limit).map(d => ({ id: d.id, title: d.fields.title, tags: d.tags ?? [], category: d.tags?.[0] ?? 'misc', reason: '基于您的兴趣' }))
  }, [limit])
  if (items.length === 0) return <div className="text-sm text-ink-500 text-center py-8">暂无推荐, 多浏览一些内容后会更精准 ✨</div>
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((r) => (
        <div key={r.id} className="rounded-2xl p-3 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50 hover:shadow-lg transition-shadow">
          <div className="aspect-video rounded-lg bg-gradient-to-br from-violet-500/20 to-pink-500/20 mb-2 flex items-center justify-center text-3xl">
            {r.category === 'product' ? '🛍️' : r.category === 'debate' ? '⚖️' : '📝'}
          </div>
          <h3 className="text-sm font-semibold line-clamp-2">{r.title}</h3>
          <div className="flex flex-wrap gap-1 mt-1">
            {r.tags.slice(0, 2).map((t: string) => (
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
  useEffect(() => { ensure() }, [])
  const items = useMemo(() => {
    return engine.listDocs().slice(0, limit).map((d, i) => ({ id: d.id, title: d.fields.title, category: d.tags?.[0] ?? 'misc', views: 1000 - i * 50 }))
  }, [limit])
  return (
    <div className="space-y-2">
      <h3 className="font-semibold flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-rose-500" /> 热门
      </h3>
      {items.map((r, i: number) => (
        <div key={r.id} className="flex items-center gap-3 py-2 border-b border-ink-100 dark:border-ink-800 last:border-0">
          <div className={cn('w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold', i < 3 ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-500')}>
            {i + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{r.title}</div>
            <div className="text-[10px] text-ink-400">{r.category} · {r.views} 浏览</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function SearchResultsPage() {
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState<SearchOptions>({ query: '', fuzzy: true, limit: 20, highlight: { pre: '<mark>', post: '</mark>' } })
  const [hits, setHits] = useState<SearchHit[]>([])

  useEffect(() => {
    ensure()
    if (!q.trim()) { setHits([]); return }
    setHits(engine.search({ ...opts, query: q }))
  }, [q, opts])

  const titleFor = (id: string) => { const t = engine.getDoc(id)?.fields.title; return typeof t === 'string' ? t : id }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <SearchIcon className="w-5 h-5" /> 搜索发现
      </h1>
      <div className="space-y-3 mb-6">
        <SearchBar onHit={(h) => setQ(titleFor(h.id))} />
        <FacetedFilters value={opts} onChange={setOpts} categories={['blog', 'product', 'debate', 'tech']} />
      </div>
      {q && hits.length === 0 && (
        <div className="text-center py-12 text-ink-500">没有找到相关结果</div>
      )}
      <div className="space-y-3">
        {hits.map((h) => {
          const doc = engine.getDoc(h.id)
          return (
            <div key={h.id} className="p-4 rounded-2xl bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
              <h3 className="font-semibold">{titleFor(h.id)}</h3>
              {Object.entries(h.highlights).map(([field, frags]) => (
                <div key={field} className="text-sm text-ink-500 mt-1">
                  {frags.map((f, i) => <div key={i} dangerouslySetInnerHTML={{ __html: f }} />)}
                </div>
              ))}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-ink-400">{(doc?.tags ?? []).join(', ')}</span>
                <span className="text-[10px] text-ink-400">score: {h.score.toFixed(2)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { engine as searchIndex, engine as recommender }
export type { SearchHit, SearchOptions }
