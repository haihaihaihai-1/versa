// ============== 动态信息流 ==============

import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { TrendingUp, Sparkles, Users, Plus, Newspaper, Scale, ShoppingBag } from 'lucide-react'
import { PostCard } from '../components/social/PostCard'
import { useAuth } from '../api/AuthContext'
import { useFeed, useApi, useStoreVersion } from '../api/hooks'
import api from '../api'
import { cn } from '../lib/utils'
import { UserAvatar } from '../components/social/UserAvatar'

const FILTERS: { key: string; label: string; icon: any; requireAuth?: boolean }[] = [
  { key: 'all', label: '全部', icon: Sparkles },
  { key: 'following', label: '关注', icon: Users, requireAuth: true },
  { key: 'text', label: '文字', icon: Sparkles },
  { key: 'image', label: '图片', icon: Sparkles },
  { key: 'poll', label: '投票', icon: Sparkles },
]

const MODULE_SUGGESTIONS = [
  { to: '/news', label: '今日资讯', icon: Newspaper, color: 'from-amber-500 to-orange-500' },
  { to: '/debates', label: '热门辩题', icon: Scale, color: 'from-rose-500 to-pink-500' },
  { to: '/shop', label: '编辑精选', icon: ShoppingBag, color: 'from-emerald-500 to-teal-500' },
]

export function FeedPage() {
  const { user: me } = useAuth()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<string>('all')
  const tag = params.get('tag') || undefined
  useStoreVersion()

  const posts = useFeed({
    userId: filter === 'following' && me ? me.id : undefined,
    type: ['all', 'following'].includes(filter) ? undefined : filter,
    hashtag: tag,
    limit: 50,
  })

  const trendingTags = useApi(() => {
    const map: Record<string, number> = {}
    Object.values(api.debug.state().posts).forEach((p) => {
      p.hashtags.forEach((t: string) => { map[t] = (map[t] || 0) + 1 })
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
  })

  const suggestedUsers = useApi(() => {
    if (!me) return []
    return api.users.all()
      .filter((u) => u.id !== me.id && !me.following.includes(u.id))
      .sort((a, b) => b.reputation - a.reputation)
      .slice(0, 5)
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Main feed */}
        <div>
          {/* Compose shortcut */}
          {me && (
            <Link
              to="/compose"
              className="block bg-gradient-to-r from-nova-50 via-rose-50 to-amber-50 dark:from-nova-900/30 dark:via-rose-900/30 dark:to-amber-900/30 border border-nova-200/60 dark:border-nova-800/40 rounded-2xl p-4 mb-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <UserAvatar user={me} size="md" />
                <div className="flex-1 px-4 py-2.5 rounded-full bg-white/60 dark:bg-ink-900/60 text-ink-500 text-sm">
                  {me.displayName}，今天想分享点什么？
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-nova-500 text-white text-sm font-medium">
                  <Plus className="w-4 h-4" /> 发帖
                </div>
              </div>
            </Link>
          )}

          {/* Tag context banner */}
          {tag && (
            <div className="mb-4 px-4 py-3 rounded-2xl bg-ink-50 dark:bg-ink-800/50 border border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div>
                <div className="text-sm text-ink-500">正在浏览话题</div>
                <div className="text-lg font-bold text-nova-600">{tag}</div>
              </div>
              <button onClick={() => setParams({})} className="text-sm text-ink-500 hover:text-ink-900">清除</button>
            </div>
          )}

          {/* Filters */}
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {FILTERS.map((f) => {
              const isActive = filter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  disabled={f.requireAuth && !me}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-nova-500 text-white'
                      : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-700',
                    f.requireAuth && !me && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <f.icon className="w-3.5 h-3.5" />
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Posts */}
          {posts.length === 0 ? (
            <EmptyFeed me={!!me} filter={filter} />
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <aside className="hidden lg:block space-y-4">
          {/* Module shortcuts */}
          <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-nova-500" /> 三体融合
            </h3>
            <div className="space-y-2">
              {MODULE_SUGGESTIONS.map((m) => (
                <Link
                  key={m.to}
                  to={m.to}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors"
                >
                  <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center text-white', m.color)}>
                    <m.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium">{m.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Trending tags */}
          <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-500" /> 热门话题
            </h3>
            <div className="flex flex-wrap gap-2">
              {trendingTags.map(([t, count]) => (
                <Link
                  key={t}
                  to={`/feed?tag=${encodeURIComponent(t)}`}
                  className="text-sm px-3 py-1 rounded-full bg-ink-50 dark:bg-ink-800 hover:bg-nova-50 dark:hover:bg-nova-900/30 hover:text-nova-600 transition-colors"
                >
                  {t} <span className="text-ink-400 text-xs">{count}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Suggested users */}
          {me && suggestedUsers.length > 0 && (
            <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-4">
              <h3 className="font-semibold mb-3">推荐关注</h3>
              <div className="space-y-3">
                {suggestedUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3">
                    <UserAvatar user={u} size="sm" />
                    <div className="flex-1 min-w-0">
                      <Link to={`/u/${u.username}`} className="text-sm font-semibold hover:underline truncate block">{u.displayName}</Link>
                      <div className="text-xs text-ink-500 truncate">{u.bio || `@${u.username}`}</div>
                    </div>
                    <button
                      onClick={() => api.follows.follow(me.id, u.id)}
                      className="px-3 py-1 rounded-full bg-nova-500 hover:bg-nova-600 text-white text-xs font-medium transition-colors"
                    >
                      关注
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!me && <SignInPrompt />}
        </aside>
      </div>
    </div>
  )
}

function EmptyFeed({ me, filter }: { me: boolean; filter: string }) {
  if (!me) return <SignInPrompt />
  if (filter === 'following') {
    return (
      <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-12 text-center">
        <Users className="w-12 h-12 mx-auto mb-3 text-ink-300" />
        <h3 className="font-semibold mb-1">还没有关注任何人</h3>
        <p className="text-sm text-ink-500">去发现页找点有趣的人吧</p>
      </div>
    )
  }
  return (
    <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-12 text-center">
      <Sparkles className="w-12 h-12 mx-auto mb-3 text-ink-300" />
      <h3 className="font-semibold mb-1">还没有动态</h3>
      <p className="text-sm text-ink-500">成为第一个发声的 Versa 用户！</p>
    </div>
  )
}

function SignInPrompt() {
  return (
    <div className="bg-gradient-to-br from-nova-50 via-rose-50 to-amber-50 dark:from-nova-900/30 dark:via-rose-900/30 dark:to-amber-900/30 border border-nova-200/60 dark:border-nova-800/40 rounded-2xl p-6 text-center">
      <Sparkles className="w-10 h-10 mx-auto mb-3 text-nova-500" />
      <h3 className="font-bold mb-1">加入 Versa 社区</h3>
      <p className="text-sm text-ink-600 dark:text-ink-400 mb-4">登录后即可发帖、评论、互动</p>
      <Link to="/auth" className="inline-block px-5 py-2 rounded-full bg-nova-500 hover:bg-nova-600 text-white text-sm font-medium">立即登录</Link>
    </div>
  )
}
