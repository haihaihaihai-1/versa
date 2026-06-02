import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Film, Plus, Trash2, Star, Search, Filter, Sparkles, Loader2, Eye, Check, Heart, ChevronRight, Calendar, Play } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Movie {
  id: string
  title: string
  type: 'movie' | 'series' | 'anime' | 'doc'
  year: number
  rating: number
  myRating: number
  status: 'want' | 'watching' | 'watched' | 'dropped'
  genre: string[]
  episodes?: number
  currentEp?: number
  poster: string
  notes: string
  at: number
}

const STORAGE_KEY = 'versa:movies'

function load(): Movie[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [
  { id: 'm1', title: '三体', type: 'series', year: 2023, rating: 8.7, myRating: 9, status: 'watched', genre: ['科幻', '剧情'], episodes: 30, currentEp: 30, poster: 'https://picsum.photos/seed/movie1/300/450', notes: '刘慈欣神作', at: Date.now() - 86400000 * 7 },
  { id: 'm2', title: '奥本海默', type: 'movie', year: 2023, rating: 8.8, myRating: 0, status: 'want', genre: ['传记', '历史'], poster: 'https://picsum.photos/seed/movie2/300/450', notes: '', at: Date.now() - 86400000 * 3 },
  { id: 'm3', title: '进击的巨人', type: 'anime', year: 2013, rating: 9.0, myRating: 10, status: 'watched', genre: ['动漫', '动作'], episodes: 87, currentEp: 87, poster: 'https://picsum.photos/seed/movie3/300/450', notes: '神作', at: Date.now() - 86400000 * 30 },
  { id: 'm4', title: '地球脉动', type: 'doc', year: 2006, rating: 9.4, myRating: 0, status: 'want', genre: ['纪录片', '自然'], episodes: 11, poster: 'https://picsum.photos/seed/movie4/300/450', notes: '', at: Date.now() - 86400000 },
] }
function save(d: Movie[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function MovieList() {
  const [movies, setMovies] = useState<Movie[]>(load())
  const [filter, setFilter] = useState<'all' | 'want' | 'watching' | 'watched' | 'dropped'>('all')
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<Movie['type']>('movie')
  const [newRating, setNewRating] = useState(0)

  useEffect(() => { save(movies) }, [movies])

  const filtered = (() => {
    let out = movies
    if (filter !== 'all') out = out.filter((m) => m.status === filter)
    if (search) out = out.filter((m) => m.title.includes(search) || m.genre.some((g) => g.includes(search)))
    return out.sort((a, b) => Number(b.myRating > 0) - Number(a.myRating > 0) || b.at - a.at)
  })()

  const stats = {
    total: movies.length,
    want: movies.filter((m) => m.status === 'want').length,
    watching: movies.filter((m) => m.status === 'watching').length,
    watched: movies.filter((m) => m.status === 'watched').length,
  }

  const setStatus = (id: string, status: Movie['status']) => setMovies(movies.map((m) => m.id === id ? { ...m, status } : m))
  const setMyRating = (id: string, r: number) => setMovies(movies.map((m) => m.id === id ? { ...m, myRating: r } : m))
  const incEp = (id: string, n: number = 1) => setMovies(movies.map((m) => m.id === id ? { ...m, currentEp: Math.min(m.episodes || 0, (m.currentEp || 0) + n), status: (m.currentEp || 0) + n >= (m.episodes || 0) ? 'watched' : 'watching' } : m))
  const remove = (id: string) => setMovies(movies.filter((m) => m.id !== id))

  const add = () => {
    if (!newTitle.trim()) { toast('请填写标题', 'error'); return }
    const m: Movie = { id: uid(), title: newTitle, type: newType, year: new Date().getFullYear(), rating: 0, myRating: 0, status: 'want', genre: [], poster: `https://picsum.photos/seed/${Date.now()}/300/450`, notes: '', at: Date.now() }
    setMovies([m, ...movies])
    setNewTitle(''); setNewRating(0)
    setShowAdd(false)
    toast('已添加', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 3 部最近值得看的高分影视作品 (50-80 字, 中文剧优先)', '你是 Versa 影视顾问, 简洁实用, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const TYPE_LABEL = { movie: '电影', series: '剧集', anime: '动漫', doc: '纪录片' }
  const STATUS_COLOR = { want: 'bg-amber-500', watching: 'bg-blue-500', watched: 'bg-emerald-500', dropped: 'bg-rose-500' }
  const STATUS_LABEL = { want: '想看', watching: '在看', watched: '已看', dropped: '弃' }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Film className="w-5 h-5" />
          <h2 className="text-lg font-bold">影视清单</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">想看 · 在看 · 已看 · 评分</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{stats.total}</p>
            <p className="text-[9px] opacity-80">总</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{stats.want}</p>
            <p className="text-[9px] opacity-80">想看</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{stats.watching}</p>
            <p className="text-[9px] opacity-80">在看</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{stats.watched}</p>
            <p className="text-[9px] opacity-80">已看</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索影视..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
        </div>
        <button onClick={() => setShowAdd(true)} className="px-3 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiRec && (
        <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiRec}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'want', 'watching', 'watched', 'dropped'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : STATUS_LABEL[f as keyof typeof STATUS_LABEL]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-ink-500">
          <Film className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">没有影视</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((m) => {
            const Meta = STATUS_COLOR[m.status]
            return (
              <motion.div key={m.id} whileHover={{ y: -1 }} onClick={() => setActiveId(m.id)} className="flex gap-2 p-2 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
                <img src={m.poster} alt={m.title} className="w-14 h-20 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold truncate">{m.title}</p>
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', Meta)} />
                  </div>
                  <p className="text-[10px] text-ink-500">{TYPE_LABEL[m.type]} · {m.year} · ⭐ {m.rating || '—'}</p>
                  {m.episodes && (
                    <p className="text-[10px] text-ink-500">已看 {m.currentEp}/{m.episodes} 集</p>
                  )}
                  {m.myRating > 0 && (
                    <p className="text-[10px] text-amber-500 mt-0.5">{'⭐'.repeat(m.myRating)}</p>
                  )}
                  {m.notes && <p className="text-[10px] text-ink-500 line-clamp-1">💭 {m.notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button onClick={(e) => { e.stopPropagation(); remove(m.id) }} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                  {m.status === 'watching' && <button onClick={(e) => { e.stopPropagation(); incEp(m.id, 1) }} className="text-[9px] px-1.5 h-5 rounded bg-blue-500 text-white">+1 集</button>}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {activeId && (() => {
        const m = movies.find((x) => x.id === activeId)
        if (!m) return null
        return (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setActiveId(null)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto">
              <div className="relative h-40">
                <img src={m.poster} alt={m.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <button onClick={() => setActiveId(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white">×</button>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="text-lg font-bold">{m.title}</h3>
                  <p className="text-[10px] opacity-90">{TYPE_LABEL[m.type]} · {m.year}</p>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['want', 'watching', 'watched', 'dropped'] as const).map((s) => (
                    <button key={s} onClick={() => setStatus(m.id, s)} className={cn('px-2 h-7 rounded-full text-[10px] font-semibold', m.status === s ? `${STATUS_COLOR[s]} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
                {m.episodes && (
                  <div className="rounded-xl bg-ink-50 dark:bg-ink-800 p-2">
                    <p className="text-[10px] mb-1">进度: {m.currentEp}/{m.episodes} 集</p>
                    <div className="h-1.5 bg-ink-200 dark:bg-ink-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${((m.currentEp || 0) / m.episodes) * 100}%` }} />
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      <button onClick={() => incEp(m.id, 1)} className="flex-1 h-7 rounded bg-blue-500 text-white text-[10px] font-bold">+1</button>
                      <button onClick={() => incEp(m.id, 5)} className="flex-1 h-7 rounded bg-blue-500 text-white text-[10px] font-bold">+5</button>
                      <button onClick={() => incEp(m.id, -1)} className="px-2 h-7 rounded bg-ink-200 dark:bg-ink-700 text-[10px]">撤销</button>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold mb-1">我的评分</p>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <button key={i} onClick={() => setMyRating(m.id, i + 1)} className={cn('text-base', i < m.myRating ? 'text-amber-500' : 'text-ink-300')}>⭐</button>
                    ))}
                  </div>
                </div>
                <textarea value={m.notes} onChange={(e) => setMovies(movies.map((x) => x.id === m.id ? { ...x, notes: e.target.value } : x))} placeholder="我的笔记..." rows={2} className="w-full px-2 py-1.5 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none resize-none" />
                <button onClick={() => remove(m.id)} className="w-full h-8 rounded-lg bg-rose-500 text-white text-xs">删除</button>
              </div>
            </motion.div>
          </div>
        )
      })()}

      {showAdd && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setShowAdd(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">添加影视</h3>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-4 gap-1.5">
              {(['movie', 'series', 'anime', 'doc'] as const).map((t) => (
                <button key={t} onClick={() => setNewType(t)} className={cn('h-9 rounded-lg text-xs font-semibold', newType === t ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
