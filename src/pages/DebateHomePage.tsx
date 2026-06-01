import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { debates, featuredRoundtable } from '../data/debates'
import { DebateCard } from '../components/debate/DebateCard'
import { Tabs } from '../components/ui/Tabs'
import { SearchBar, useDebounce } from '../components/ui/Search'
import { Scale, Crown, Calendar, Eye, Flame, Sparkles, ArrowUpRight, Tv, Users, Play } from 'lucide-react'
import { versa } from '../store/versa'
import { cn, formatNumber } from '../lib/utils'

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
  { value: 'hot', label: '🔥 最热' },
  { value: 'newest', label: '✨ 最新' },
  { value: 'active', label: '💬 最活跃' },
  { value: 'upcoming', label: '📅 即将开始' },
]

export function DebateHomePage() {
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<'hot' | 'newest' | 'active' | 'upcoming'>('hot')
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
    if (sort === 'upcoming') r.sort((a, b) => (a.status === 'upcoming' ? -1 : 1) - (b.status === 'upcoming' ? -1 : 1))
    return r
  }, [category, sort, debounced])

  const liveDebates = debates.filter((d) => d.status === 'live')
  const upcomingDebates = debates.filter((d) => d.status === 'upcoming')

  return (
    <div className="space-y-6">
      {/* 顶部搜索 */}
      <div className="sticky top-14 sm:top-16 z-30 bg-gradient-to-b from-ink-50 via-ink-50/95 to-ink-50/80 dark:from-ink-950 dark:via-ink-950/95 dark:to-ink-950/80 backdrop-blur-md -mx-4 px-4 py-3">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="搜索辩论、话题、专家..."
          className="w-full"
        />
      </div>

      {/* 圆桌直播 - 36氪/澎湃 风格 */}
      <Link
        to={`/debates/roundtable/${featuredRoundtable.id}`}
        className="group block rounded-3xl overflow-hidden bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white relative"
      >
        <div className="absolute inset-0">
          <img src={featuredRoundtable.cover} alt="" className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-900/90 via-ink-900/70 to-transparent" />
        </div>
        <div className="relative p-6 sm:p-8 min-h-[260px] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE · 圆桌直播
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-medium">
                <Users className="w-3 h-3" />{formatNumber(featuredRoundtable.viewerCount)} 人观看
              </span>
              {featuredRoundtable.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-xs">#{t}</span>
              ))}
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold leading-tight max-w-2xl">{featuredRoundtable.title}</h2>
            <p className="mt-2 text-sm sm:text-base text-white/80 max-w-2xl line-clamp-2">{featuredRoundtable.description}</p>
          </div>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="flex -space-x-2">
              {[featuredRoundtable.host, ...featuredRoundtable.guests].slice(0, 6).map((p) => (
                <img key={p.id} src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full ring-2 ring-ink-900 object-cover" />
              ))}
            </div>
            <span className="text-xs text-white/70">
              主持人 {featuredRoundtable.host.name} + {featuredRoundtable.guests.length} 位嘉宾
            </span>
            <span className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-ink-900 text-sm font-bold group-hover:gap-2 transition-all">
              <Play className="w-4 h-4 fill-current" /> 进入直播
            </span>
          </div>
        </div>
      </Link>

      {/* 分类 + 排序 */}
      <div>
        <div className="mb-4 overflow-x-auto -mx-4 px-4">
          <Tabs
            variant="pills"
            tabs={categories.map((c) => ({ value: c.value, label: c.label }))}
            value={category}
            onChange={setCategory}
          />
        </div>
        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <span className="text-xs text-ink-500 hidden sm:inline">排序：</span>
          {sortOptions.map((o) => (
            <button
              key={o.value}
              onClick={() => setSort(o.value as any)}
              className={`px-3 h-8 rounded-lg text-xs font-medium transition-colors ${
                sort === o.value
                  ? 'bg-debate-500 text-white'
                  : 'bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 dark:hover:bg-ink-700'
              }`}
            >
              {o.label}
            </button>
          ))}
          <span className="ml-auto text-xs text-ink-500">共 {filtered.length} 场</span>
        </div>
      </div>

      {/* 进行中的辩论 - 紧凑 grid */}
      {sort === 'hot' && category === 'all' && liveDebates.length > 0 && (
        <div className="rounded-3xl p-5 bg-gradient-to-br from-debate-500/5 to-nova-500/5 border border-debate-200/40 dark:border-debate-800/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-red-500" />
              <h2 className="text-lg sm:text-xl font-bold">进行中 · LIVE</h2>
              <span className="text-xs text-ink-500">实时 PK</span>
            </div>
            <span className="text-xs text-ink-500">{liveDebates.length} 场</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {liveDebates.slice(0, 3).map((d) => <DebateCard key={d.id} debate={d} />)}
          </div>
        </div>
      )}

      {/* 即将开始 */}
      {upcomingDebates.length > 0 && (
        <div className="rounded-3xl p-5 bg-gradient-to-br from-news-500/5 to-amber-500/5 border border-news-200/40 dark:border-news-800/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-news-500" />
              <h2 className="text-lg sm:text-xl font-bold">即将开始</h2>
              <span className="text-xs text-ink-500">抢先预约</span>
            </div>
            <span className="text-xs text-ink-500">{upcomingDebates.length} 场</span>
          </div>
          <div className="space-y-2">
            {upcomingDebates.slice(0, 3).map((d) => (
              <Link
                key={d.id}
                to={`/debates/${d.id}`}
                className="group flex items-center gap-3 p-3 rounded-2xl bg-white/60 dark:bg-ink-900/40 hover:bg-white dark:hover:bg-ink-900/70 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-news-500 to-amber-500 text-white flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-medium">6月</span>
                  <span className="text-base font-bold leading-none">{(d.startAt || d.createdAt).slice(8, 10)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm line-clamp-1 group-hover:text-debate-600">{d.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-500">
                    {d.moderator && <span>主持: {d.moderator.name}</span>}
                    {d.panelists && d.panelists.length > 0 && (
                      <span>· {d.panelists.length} 位嘉宾</span>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="w-4 h-4 text-ink-400 group-hover:text-debate-500" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 全部辩论列表 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-debate-500" />
          <h2 className="text-lg sm:text-xl font-bold">全部辩论</h2>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-500">没有找到相关辩论</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filtered.map((d) => <DebateCard key={d.id} debate={d} />)}
          </div>
        )}
      </div>

      {/* 推荐辩论格式说明 - 36氪/澎湃风 */}
      <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-ink-100 via-ink-50 to-ink-100 dark:from-ink-900 dark:via-ink-900/40 dark:to-ink-900 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-news-500" />
          <h3 className="font-bold">辩论格式说明</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="p-3 rounded-2xl bg-white/60 dark:bg-ink-800/40">
            <div className="font-bold text-news-600 mb-1">📖 开放式 (Open)</div>
            <p className="text-xs text-ink-600 dark:text-ink-300">所有用户自由发表观点，投票支持</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/60 dark:bg-ink-800/40">
            <div className="font-bold text-news-600 mb-1">👑 圆桌 (Roundtable)</div>
            <p className="text-xs text-ink-600 dark:text-ink-300">3-6 位专家同台，主持人串场</p>
          </div>
          <div className="p-3 rounded-2xl bg-white/60 dark:bg-ink-800/40">
            <div className="font-bold text-news-600 mb-1">🎓 牛津 (Oxford)</div>
            <p className="text-xs text-ink-600 dark:text-ink-300">正反双方轮流陈述，有严格发言顺序</p>
          </div>
        </div>
      </div>
    </div>
  )
}
