// ============== 搜索页 ==============

import { useState, useMemo } from 'react'
import { Search as SearchIcon, User, Hash, Users, X } from 'lucide-react'
import { useApi, useStoreVersion } from '../api/hooks'
import api from '../api'
import { UserAvatar } from '../components/social/UserAvatar'
import { PostCard } from '../components/social/PostCard'
import { Link } from 'react-router-dom'
import { cn } from '../lib/utils'
import { useAuth } from '../api/AuthContext'

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'users', label: '用户' },
  { key: 'posts', label: '帖子' },
  { key: 'groups', label: '群组' },
  { key: 'hashtags', label: '话题' },
] as const

export function SearchPage() {
  const { user: me } = useAuth()
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<typeof TABS[number]['key']>('all')
  useStoreVersion()

  const users = useApi(() => query ? api.users.search(query, 20) : [])
  const posts = useApi(() => query ? api.posts.feed({ limit: 30 }).filter((p) => p.content.toLowerCase().includes(query.toLowerCase()) || p.hashtags.some((t) => t.toLowerCase().includes(query.toLowerCase()))) : [])
  const groups = useApi(() => query ? api.groups.all().filter((g) => g.name.toLowerCase().includes(query.toLowerCase()) || g.description.toLowerCase().includes(query.toLowerCase())) : api.groups.all())
  const hashtags = useApi(() => {
    const map: Record<string, number> = {}
    Object.values(api.debug.state().posts).forEach((p) => {
      p.hashtags.forEach((t) => { if (t.toLowerCase().includes(query.toLowerCase())) map[t] = (map[t] || 0) + 1 })
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 20)
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索用户、帖子、群组、话题..."
          className="w-full pl-12 pr-12 py-3 rounded-full bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 outline-none focus:ring-2 focus:ring-nova-500"
        />
        {query && (
          <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {query.trim() && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap',
                tab === t.key ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800 hover:bg-ink-200'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {!query.trim() ? (
        <ExploreView groups={groups.slice(0, 6)} hashtags={hashtags} />
      ) : (
        <div className="space-y-6">
          {(tab === 'all' || tab === 'users') && users.length > 0 && (
            <Section title={`用户 (${users.length})`}>
              <div className="space-y-2">
                {users.map((u) => (
                  <Link key={u.id} to={`/u/${u.username}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800">
                    <UserAvatar user={u} size="md" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{u.displayName}</div>
                      <div className="text-sm text-ink-500 truncate">@{u.username} {u.bio && `· ${u.bio}`}</div>
                    </div>
                    {me && me.id !== u.id && !me.following.includes(u.id) && (
                      <button
                        onClick={(e) => { e.preventDefault(); api.follows.follow(me.id, u.id) }}
                        className="px-3 py-1 rounded-full bg-nova-500 text-white text-xs font-medium"
                      >
                        关注
                      </button>
                    )}
                  </Link>
                ))}
              </div>
            </Section>
          )}
          {(tab === 'all' || tab === 'posts') && posts.length > 0 && (
            <Section title={`帖子 (${posts.length})`}>
              <div className="space-y-4">
                {posts.slice(0, 10).map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            </Section>
          )}
          {(tab === 'all' || tab === 'groups') && groups.length > 0 && (
            <Section title={`群组 (${groups.length})`}>
              <div className="grid sm:grid-cols-2 gap-3">
                {groups.slice(0, 6).map((g) => (
                  <Link key={g.id} to={`/groups/${g.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-ink-200 dark:border-ink-800 hover:border-nova-300">
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-nova-400 to-rose-500 flex items-center justify-center text-white"><Users className="w-6 h-6" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{g.name}</div>
                      <div className="text-xs text-ink-500 line-clamp-1">{g.description}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}
          {(tab === 'all' || tab === 'hashtags') && hashtags.length > 0 && (
            <Section title={`话题 (${hashtags.length})`}>
              <div className="flex flex-wrap gap-2">
                {hashtags.map(([t, count]) => (
                  <Link key={t} to={`/feed?tag=${encodeURIComponent(t)}`} className="px-3 py-1.5 rounded-full bg-ink-100 dark:bg-ink-800 hover:bg-nova-50 hover:text-nova-600 text-sm">
                    {t} <span className="text-xs text-ink-400">{count}</span>
                  </Link>
                ))}
              </div>
            </Section>
          )}
          {users.length === 0 && posts.length === 0 && groups.length === 0 && hashtags.length === 0 && (
            <div className="text-center py-12 text-ink-500">没有匹配 "{query}" 的结果</div>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-ink-500 mb-3">{title}</h2>
      {children}
    </section>
  )
}

function ExploreView({ groups, hashtags }: { groups: any[]; hashtags: any[] }) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-ink-500 mb-3">热门话题</h2>
        <div className="flex flex-wrap gap-2">
          {hashtags.slice(0, 12).map(([t, count]: any) => (
            <Link key={t} to={`/feed?tag=${encodeURIComponent(t)}`} className="px-3 py-1.5 rounded-full bg-ink-100 dark:bg-ink-800 hover:bg-nova-50 hover:text-nova-600 text-sm">
              {t} <span className="text-xs text-ink-400">{count}</span>
            </Link>
          ))}
        </div>
      </section>
      <section>
        <h2 className="text-sm font-semibold text-ink-500 mb-3">推荐群组</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-ink-200 dark:border-ink-800 hover:border-nova-300">
              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-nova-400 to-rose-500 flex items-center justify-center text-white"><Users className="w-6 h-6" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{g.name}</div>
                <div className="text-xs text-ink-500 line-clamp-1">{g.description}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
