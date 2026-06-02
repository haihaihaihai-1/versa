import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, X, TrendingUp, History, Sparkles, Newspaper, Scale, ShoppingBag, User, Users, Hash, Clock } from 'lucide-react'
import { products } from '../data/products'
import { debates } from '../data/debates'
import { news } from '../data/news'
import { seedUser } from '../data/users'
import api from '../api'
import { cn } from '../lib/utils'
import { formatCurrency } from '../lib/utils'

const HOT_TAGS = ['#家居好物', '#科技评测', '#美食', '#可持续', '#职场', '#生活方式', '#金融', '#健康']
const RECENT_KEY = 'versa:search:recent'

export function GlobalSearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<'all' | 'product' | 'debate' | 'news' | 'user' | 'group'>('all')
  const [recent, setRecent] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    try {
      const stored = localStorage.getItem(RECENT_KEY)
      if (stored) setRecent(JSON.parse(stored))
    } catch {}
  }, [])

  const saveRecent = (q: string) => {
    if (!q.trim()) return
    const updated = [q, ...recent.filter((r) => r !== q)].slice(0, 8)
    setRecent(updated)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(updated)) } catch {}
  }

  const lower = query.toLowerCase().trim()
  const results = useMemo(() => {
    if (!lower) return { products: [], debates: [], news: [], users: [], groups: [] }
    let allGroups: any[] = []
    try { allGroups = api.groups.all() } catch {}
    const usersArr = [seedUser]
    return {
      products: products.filter((p: any) => p.name.toLowerCase().includes(lower) || p.brand.toLowerCase().includes(lower) || p.tags?.some((t: string) => t.toLowerCase().includes(lower))).slice(0, 8),
      debates: debates.filter((d: any) => d.title.toLowerCase().includes(lower) || d.description?.toLowerCase().includes(lower)).slice(0, 6),
      news: news.filter((n: any) => n.title.toLowerCase().includes(lower) || n.subtitle?.toLowerCase().includes(lower)).slice(0, 6),
      users: usersArr.filter((u: any) => u.displayName?.toLowerCase().includes(lower) || u.username?.toLowerCase().includes(lower) || (u.bio || '').toLowerCase().includes(lower)).slice(0, 6),
      groups: allGroups.filter((g: any) => g.name?.toLowerCase().includes(lower) || g.description?.toLowerCase().includes(lower)).slice(0, 4),
    }
  }, [lower])

  const total = results.products.length + results.debates.length + results.news.length + results.users.length + results.groups.length

  const tabs: { key: typeof tab; label: string; icon: any; count: number }[] = [
    { key: 'all', label: '全部', icon: Sparkles, count: total },
    { key: 'product', label: '商品', icon: ShoppingBag, count: results.products.length },
    { key: 'debate', label: '辩论', icon: Scale, count: results.debates.length },
    { key: 'news', label: '资讯', icon: Newspaper, count: results.news.length },
    { key: 'user', label: '用户', icon: User, count: results.users.length },
    { key: 'group', label: '群组', icon: Users, count: results.groups.length },
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveRecent(query)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* 搜索框 */}
      <form onSubmit={handleSubmit} className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜商品、辩论、资讯、用户、群组..."
          className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white dark:bg-ink-900 border-2 border-ink-200 dark:border-ink-800 outline-none focus:border-violet-500 text-base shadow-sm"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800">
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Tabs */}
      {query && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1.5 transition',
                  tab === t.key ? 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-md' : 'bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 hover:border-violet-300'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {t.count > 0 && <span className={cn('text-[10px] px-1.5 rounded-full', tab === t.key ? 'bg-white/20' : 'bg-ink-100 dark:bg-ink-800')}>{t.count}</span>}
              </button>
            )
          })}
        </div>
      )}

      {/* 主体 */}
      {!query.trim() ? (
        <ExploreView
          recent={recent}
          onPick={(t) => { setQuery(t); saveRecent(t) }}
          onClear={() => { setRecent([]); localStorage.removeItem(RECENT_KEY) }}
        />
      ) : total === 0 ? (
        <EmptyState query={query} />
      ) : (
        <div className="space-y-6">
          {(tab === 'all' || tab === 'product') && results.products.length > 0 && (
            <Section title="商品" icon={ShoppingBag} count={results.products.length} color="from-rose-500 to-orange-500">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {results.products.map((p) => (
                  <Link key={p.id} to={`/shop/${p.id}`} onClick={() => saveRecent(query)} className="bg-white dark:bg-ink-900 rounded-xl overflow-hidden border border-ink-200 dark:border-ink-800 hover:shadow-lg transition">
                    <div className="aspect-square bg-gradient-to-br from-ink-100 to-ink-200">
                      {p.images?.[0] && <img src={p.images[0]} className="w-full h-full object-cover" alt={p.name} />}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium line-clamp-2 h-8">{p.name}</p>
                      <p className="text-sm font-bold text-rose-500 mt-0.5">¥{formatCurrency(p.price)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {(tab === 'all' || tab === 'debate') && results.debates.length > 0 && (
            <Section title="辩论" icon={Scale} count={results.debates.length} color="from-violet-500 to-fuchsia-500">
              <div className="space-y-2">
                {results.debates.map((d) => (
                  <Link key={d.id} to={`/debates/${d.id}`} onClick={() => saveRecent(query)} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 hover:border-violet-300 transition">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shrink-0"><Scale className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{d.title}</p>
                      <p className="text-xs text-ink-500 mt-0.5 line-clamp-1">{d.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {(tab === 'all' || tab === 'news') && results.news.length > 0 && (
            <Section title="资讯" icon={Newspaper} count={results.news.length} color="from-amber-500 to-orange-500">
              <div className="space-y-2">
                {results.news.map((n: any) => (
                  <Link key={n.id} to={`/news/${n.id}`} onClick={() => saveRecent(query)} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 hover:border-amber-300 transition">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shrink-0"><Newspaper className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{n.title}</p>
                      <p className="text-xs text-ink-500 mt-0.5 line-clamp-1">{n.subtitle}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {(tab === 'all' || tab === 'user') && results.users.length > 0 && (
            <Section title="用户" icon={User} count={results.users.length} color="from-cyan-500 to-blue-500">
              <div className="grid sm:grid-cols-2 gap-2">
                {results.users.map((u: any) => (
                  <Link key={u.id} to={`/u/${u.username}`} onClick={() => saveRecent(query)} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 hover:border-cyan-300 transition">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 text-white flex items-center justify-center text-sm font-bold">{u.displayName?.slice(0, 1) || 'U'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{u.displayName}</p>
                      <p className="text-xs text-ink-500 truncate">@{u.username}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {(tab === 'all' || tab === 'group') && results.groups.length > 0 && (
            <Section title="群组" icon={Users} count={results.groups.length} color="from-emerald-500 to-teal-500">
              <div className="grid sm:grid-cols-2 gap-2">
                {results.groups.map((g) => (
                  <Link key={g.id} to={`/groups/${g.id}`} onClick={() => saveRecent(query)} className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 hover:border-emerald-300 transition">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center"><Users className="w-5 h-5" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{g.name}</p>
                      <p className="text-xs text-ink-500 truncate">{g.members?.length || 0} 成员</p>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, count, color, children }: { title: string; icon: any; count: number; color: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <span className={`w-5 h-5 rounded-md bg-gradient-to-br ${color} flex items-center justify-center text-white`}>
            <Icon className="w-3 h-3" />
          </span>
          {title} <span className="text-ink-400 text-xs">({count})</span>
        </h2>
      </div>
      {children}
    </section>
  )
}

function EmptyState({ query }: { query: string }) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center mx-auto mb-3">
        <Search className="w-7 h-7 text-ink-400" />
      </div>
      <p className="text-ink-500 text-sm">没有匹配 "{query}" 的结果</p>
      <p className="text-ink-400 text-xs mt-1">试试更短的关键词，或检查拼写</p>
    </div>
  )
}

function ExploreView({ recent, onPick, onClear }: { recent: string[]; onPick: (q: string) => void; onClear: () => void }) {
  return (
    <div className="space-y-6">
      {recent.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink-700 dark:text-ink-300 flex items-center gap-1.5">
              <History className="w-4 h-4" />最近搜索
            </h2>
            <button onClick={onClear} className="text-xs text-ink-400 hover:text-rose-500">清空</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => (
              <button key={r} onClick={() => onPick(r)} className="px-3 py-1.5 rounded-full bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-sm hover:border-violet-300 flex items-center gap-1">
                <Clock className="w-3 h-3 text-ink-400" />{r}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4" />热门搜索
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {HOT_TAGS.map((t, i) => (
            <button key={t} onClick={() => onPick(t)} className="p-3 rounded-xl bg-gradient-to-br from-ink-50 to-white dark:from-ink-900 dark:to-ink-800 border border-ink-200 dark:border-ink-800 hover:border-violet-300 text-left transition">
              <span className="text-[10px] text-ink-400">No.{i + 1}</span>
              <p className="text-sm font-medium mt-0.5">{t.replace('#', '')}</p>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />快速访问
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: '闪购秒杀', to: '/shop/flash', emoji: '⚡' },
            { label: '会员中心', to: '/help/member', emoji: '👑' },
            { label: '客服', to: '/help/support', emoji: '💬' },
            { label: '凑单套餐', to: '/shop/bundles', emoji: '🎁' },
            { label: '选品助手', to: '/shop/curator', emoji: '✨' },
            { label: '短视频', to: '/shop/shorts', emoji: '🎬' },
            { label: '我的订单', to: '/profile/orders', emoji: '📦' },
            { label: '消息中心', to: '/messages', emoji: '🔔' },
          ].map((q) => (
            <Link key={q.label} to={q.to} className="p-3 rounded-xl bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 hover:border-violet-300 text-center transition">
              <span className="text-2xl">{q.emoji}</span>
              <p className="text-xs font-medium mt-1">{q.label}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

export default GlobalSearchPage
