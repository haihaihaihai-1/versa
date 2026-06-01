import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { debates, featuredRoundtable } from '../data/debates'
import { DebateCard } from '../components/debate/DebateCard'
import { Tabs } from '../components/ui/Tabs'
import { SearchBar, useDebounce } from '../components/ui/Search'
import { Scale, Crown, Calendar, Eye, Flame, Sparkles, ArrowUpRight, Tv, Users, Play, Quote, TrendingUp, MessageCircle } from 'lucide-react'
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
  const topDebate = filtered[0]
  const restDebates = filtered.slice(1)

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

      {/* 圆桌直播 - 大尺寸 hero 杂志封面 */}
      <Link
        to={`/debates/roundtable/${featuredRoundtable.id}`}
        className="group block rounded-3xl overflow-hidden relative h-[280px] sm:h-[340px]"
      >
        <div className="absolute inset-0">
          <img src={featuredRoundtable.cover} alt="" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
          <div className="absolute inset-0 bg-gradient-to-tr from-ink-950 via-ink-950/70 to-ink-950/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-transparent to-transparent" />
        </div>
        <div className="relative h-full p-6 sm:p-10 flex flex-col justify-between text-white">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-500/50">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE · 圆桌直播
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-semibold">
                <Users className="w-3 h-3" />{formatNumber(featuredRoundtable.viewerCount)} 人观看
              </span>
              {featuredRoundtable.tags.slice(0, 2).map((t) => (
                <span key={t} className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium">#{t}</span>
              ))}
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold leading-tight max-w-2xl tracking-tight">{featuredRoundtable.title}</h2>
            <p className="mt-3 text-sm sm:text-base text-white/80 max-w-2xl line-clamp-2">{featuredRoundtable.description}</p>
          </div>
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="flex -space-x-3">
              {[featuredRoundtable.host, ...featuredRoundtable.guests].slice(0, 6).map((p) => (
                <img key={p.id} src={p.avatar} alt={p.name} className="w-9 h-9 sm:w-10 sm:h-10 rounded-full ring-3 ring-ink-950 object-cover" />
              ))}
            </div>
            <div className="text-xs text-white/80">
              <div className="font-semibold">主持人 {featuredRoundtable.host.name}</div>
              <div className="text-white/60">+ {featuredRoundtable.guests.length} 位嘉宾</div>
            </div>
            <span className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-ink-950 text-sm font-bold group-hover:gap-3 transition-all shadow-xl">
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

      {/* 进行中 - 紧凑 grid + 进行中 横幅 */}
      {sort === 'hot' && category === 'all' && liveDebates.length > 0 && (
        <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-debate-500/5 via-nova-500/5 to-transparent border border-debate-200/40 dark:border-debate-800/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-debate-500/10 to-transparent rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-debate-500 flex items-center justify-center shadow-lg">
                  <Tv className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold">进行中 · LIVE</h2>
                <span className="text-xs text-ink-500">实时 PK</span>
              </div>
              <span className="text-xs text-ink-500">{liveDebates.length} 场</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {liveDebates.slice(0, 3).map((d) => <DebateCard key={d.id} debate={d} variant="split" />)}
            </div>
          </div>
        </div>
      )}

      {/* 即将开始 - 横向大卡片 */}
      {upcomingDebates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-news-500 to-amber-500 flex items-center justify-center shadow-lg">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold">即将开始</h2>
            <span className="text-xs text-ink-500">抢先预约</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {upcomingDebates.slice(0, 3).map((d) => (
              <Link
                key={d.id}
                to={`/debates/${d.id}`}
                className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-news-500/8 via-amber-500/5 to-transparent border border-news-200/40 dark:border-news-800/40 p-5 transition-all duration-500 hover:shadow-2xl hover:shadow-news-500/10 hover:-translate-y-1"
              >
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-news-500 to-amber-500 text-white flex flex-col items-center justify-center flex-shrink-0 shadow-lg">
                    <span className="text-[10px] font-medium">6月</span>
                    <span className="text-lg font-bold leading-none">{(d.startAt || d.createdAt).slice(8, 10)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-news-600 font-bold uppercase tracking-wider mb-1">即将开始</div>
                    <h4 className="font-bold text-base leading-snug line-clamp-2 group-hover:text-news-600 transition-colors">{d.title}</h4>
                    <div className="flex items-center gap-2 mt-2 text-xs text-ink-500">
                      {d.moderator && <span>主持: <strong>{d.moderator.name}</strong></span>}
                      {d.panelists && d.panelists.length > 0 && (
                        <>
                          <span>·</span>
                          <span>{d.panelists.length} 位嘉宾</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-ink-400 group-hover:text-news-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 全部辩论 - 杂志风布局: 头条 + 网格 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-debate-500 to-nova-500 flex items-center justify-center shadow-lg">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold">所有辩论</h2>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-3xl text-center py-16 bg-white/40 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
            <Scale className="w-12 h-12 text-ink-300 mx-auto mb-3" />
            <div className="text-ink-500">没有找到相关辩论</div>
          </div>
        ) : (
          <>
            {/* 头条辩论 - 杂志封面式 */}
            {topDebate && (
              <div className="mb-6">
                <DebateCard debate={topDebate} variant="feature" />
              </div>
            )}

            {/* 其余辩论 - 网格 */}
            {restDebates.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {restDebates.map((d) => <DebateCard key={d.id} debate={d} />)}
              </div>
            )}
          </>
        )}
      </div>

      {/* 辩论格式说明 - 苹果风 3 列卡片 */}
      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-ink-100/80 via-ink-50 to-ink-100/80 dark:from-ink-900/80 dark:via-ink-900/40 dark:to-ink-900/80 border border-ink-200/60 dark:border-ink-800/60 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-gradient-to-b from-news-500/10 to-transparent blur-2xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-news-500" />
            <h3 className="font-bold text-lg">辩论的三种打开方式</h3>
          </div>
          <p className="text-sm text-ink-500 mb-6">不同场景匹配不同形式，让思想交锋更具质感</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="group p-5 rounded-2xl bg-white/80 dark:bg-ink-800/40 border border-ink-200/60 dark:border-ink-700/60 transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="text-3xl mb-3">📖</div>
              <div className="font-bold text-ink-900 dark:text-white mb-1">开放式</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">所有用户自由发表观点，投票支持</div>
            </div>
            <div className="group p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-news-500/5 border border-amber-500/30 transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="text-3xl mb-3">👑</div>
              <div className="font-bold text-ink-900 dark:text-white mb-1">圆桌</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">3-6 位专家同台，主持人串场引导</div>
            </div>
            <div className="group p-5 rounded-2xl bg-gradient-to-br from-debate-500/10 to-nova-500/5 border border-debate-500/30 transition-all hover:shadow-xl hover:-translate-y-1">
              <div className="text-3xl mb-3">🎓</div>
              <div className="font-bold text-ink-900 dark:text-white mb-1">牛津</div>
              <div className="text-xs text-ink-500 dark:text-ink-400">正反双方轮流陈述，严格发言顺序</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
