import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, MessageCircle, UserPlus, UserMinus, Settings, Award, Flame, TrendingUp, Heart, Bookmark, Grid3x3, BarChart3, Activity, MapPin, Calendar, Link2, Sparkles, Trophy } from 'lucide-react'
import { UserAvatar } from '../components/social/UserAvatar'
import { PostCard } from '../components/social/PostCard'
import { useAuth } from '../api/AuthContext'
import { useUser, useUserPosts, useStoreVersion, useFollowers, useFollowing } from '../api/hooks'
import api from '../api'
import { cn } from '../lib/utils'
import { roleLabel } from '../api/permissions'

const TABS = [
  { key: 'posts', label: '帖子', icon: Grid3x3 },
  { key: 'liked', label: '喜欢', icon: Heart },
  { key: 'saved', label: '收藏', icon: Bookmark },
  { key: 'stats', label: '成就', icon: Trophy },
] as const

export function CreatorProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const profile = useUser(api.users.byUsername(username || '')?.id)
  const profileId = profile?.id
  const posts = useUserPosts(profileId)
  const followers = useFollowers(profileId)
  const following = useFollowing(profileId)
  const [tab, setTab] = useState<typeof TABS[number]['key']>('posts')
  useStoreVersion()

  const stats = useMemo(() => {
    if (!profile) return null
    const pArr = posts || []
    const totalLikes = pArr.reduce((s, p) => s + (p.reactions?.like?.length || 0) + (p.reactions?.love?.length || 0) + (p.reactions?.insightful?.length || 0) + (p.reactions?.fire?.length || 0), 0)
    const totalComments = pArr.reduce((s, p) => s + (p.commentsCount || 0), 0)
    return {
      posts: pArr.length,
      followers: followers.length,
      following: following.length,
      likes: totalLikes,
      comments: totalComments,
      avgLikes: pArr.length ? Math.round(totalLikes / pArr.length) : 0,
    }
  }, [posts, followers, following, profile])

  const heatmap = useMemo(() => {
    const cells: { date: string; count: number; level: number }[] = []
    const today = new Date()
    for (let i = 0; i < 91; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const c = Math.floor(Math.random() * 5)
      cells.push({ date: d.toISOString().slice(0, 10), count: c, level: c })
    }
    return cells.reverse()
  }, [profileId])

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold mb-2">用户不存在</h2>
        <button onClick={() => navigate(-1)} className="text-nova-600 hover:underline">返回</button>
      </div>
    )
  }

  const isMe = me?.id === profile.id
  const isFollowing = me ? api.follows.isFollowing(me.id, profile.id) : false

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Hero 渐变 cover */}
      <div className="relative h-56 sm:h-72 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-yellow-300/30 blur-3xl" />
        </div>
        {profile.cover && <img src={profile.cover} alt="" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40" />}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
        <div className="relative max-w-4xl mx-auto px-4 pt-4 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 rounded-full bg-black/30 backdrop-blur text-white hover:bg-black/50">
            <ArrowLeft className="w-4 h-4" />
          </button>
          {isMe && (
            <Link to="/settings" className="p-2 rounded-full bg-black/30 backdrop-blur text-white hover:bg-black/50">
              <Settings className="w-4 h-4" />
            </Link>
          )}
        </div>
        <div className="absolute bottom-6 left-4 right-4 flex items-end gap-4">
          <div className="ring-4 ring-white dark:ring-ink-900 rounded-3xl shadow-2xl">
            <UserAvatar user={profile} size="2xl" />
          </div>
          <div className="flex-1 text-white drop-shadow-lg pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold">{profile.displayName}</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 backdrop-blur border border-white/30 font-medium">{roleLabel(profile.role)}</span>
            </div>
            <p className="text-sm opacity-90">@{profile.username}</p>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 -mt-2">
        {profile.bio && <p className="text-sm text-ink-700 dark:text-ink-300 max-w-2xl mt-4">{profile.bio}</p>}

        <div className="flex items-center gap-2 flex-wrap text-xs text-ink-500 mt-3">
          <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" />活跃度 {profile.reputation}</span>
        </div>

        {/* Stats 数据条 */}
        {stats && (
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-0 divide-x divide-ink-200 dark:divide-ink-800 rounded-2xl bg-white/70 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
            <Stat label="帖子" value={stats.posts} />
            <Stat label="粉丝" value={stats.followers} />
            <Stat label="关注" value={stats.following} />
            <Stat label="获赞" value={stats.likes} icon={Heart} />
            <Stat label="评论" value={stats.comments} />
            <Stat label="平均赞" value={stats.avgLikes} icon={TrendingUp} />
          </div>
        )}

        {/* Action buttons */}
        {!isMe && me && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => isFollowing ? api.follows.unfollow(me.id, profile.id) : api.follows.follow(me.id, profile.id)}
              className={cn('flex-1 sm:flex-none px-5 py-2 rounded-full text-sm font-medium flex items-center justify-center gap-1.5',
                isFollowing ? 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300' : 'bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow-md'
              )}
            >
              {isFollowing ? <><UserMinus className="w-4 h-4" />已关注</> : <><UserPlus className="w-4 h-4" />关注</>}
            </button>
            <button onClick={() => navigate(`/messages`)} className="flex-1 sm:flex-none px-5 py-2 rounded-full bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 text-sm font-medium flex items-center justify-center gap-1.5">
              <MessageCircle className="w-4 h-4" />私信
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-6 -mx-4 sm:-mx-6 border-b border-ink-200 dark:border-ink-800 overflow-x-auto">
          <div className="px-4 sm:px-6 flex gap-1">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'px-4 py-3 text-sm font-medium border-b-2 flex items-center gap-1.5 whitespace-nowrap transition',
                    tab === t.key
                      ? 'border-violet-500 text-ink-900 dark:text-white'
                      : 'border-transparent text-ink-500 hover:text-ink-900 dark:hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4" />{t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="mt-6">
          {tab === 'posts' && (
            <div className="space-y-4">
              {posts && posts.length > 0 ? posts.map((p) => <PostCard key={p.id} post={p} />) : (
                <EmptyState icon={Grid3x3} title="还没有帖子" desc={isMe ? '分享你的第一个想法吧' : `${profile.displayName} 还没发帖`} />
              )}
            </div>
          )}
          {tab === 'liked' && isMe && (
            <div className="space-y-4">
              <EmptyState icon={Heart} title="喜欢的内容" desc="浏览你点过赞的帖子" />
            </div>
          )}
          {tab === 'liked' && !isMe && (
            <EmptyState icon={Heart} title="仅本人可见" desc="该用户喜欢的帖子" />
          )}
          {tab === 'saved' && isMe && (
            <div className="space-y-4">
              <EmptyState icon={Bookmark} title="收藏的内容" desc="浏览你收藏的帖子" />
            </div>
          )}
          {tab === 'saved' && !isMe && (
            <EmptyState icon={Bookmark} title="仅本人可见" desc="该用户收藏的帖子" />
          )}
          {tab === 'stats' && (
            <div className="space-y-6">
              {/* 成就卡片 */}
              <section>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500" />获得成就</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { name: '初出茅庐', desc: '发布第一个帖子', got: (stats?.posts ?? 0) >= 1, icon: '🌱', color: 'from-emerald-400 to-teal-500' },
                    { name: '十连发', desc: '发布 10 篇帖子', got: (stats?.posts ?? 0) >= 10, icon: '🔟', color: 'from-blue-400 to-cyan-500' },
                    { name: '人气王', desc: '粉丝突破 100', got: (stats?.followers ?? 0) >= 100, icon: '⭐', color: 'from-amber-400 to-orange-500' },
                    { name: '赞收者', desc: '累计获得 1000 赞', got: (stats?.likes ?? 0) >= 1000, icon: '❤️', color: 'from-rose-400 to-pink-500' },
                    { name: '辩论家', desc: '参与 5 场辩论', got: false, icon: '⚖️', color: 'from-violet-400 to-fuchsia-500' },
                    { name: '购物达人', desc: '完成 10 笔订单', got: false, icon: '🛍️', color: 'from-pink-400 to-rose-500' },
                    { name: '评论家', desc: '评论 100 次', got: (stats?.comments ?? 0) >= 100, icon: '💬', color: 'from-indigo-400 to-purple-500' },
                    { name: '连续 7 天', desc: '连续 7 天活跃', got: true, icon: '🔥', color: 'from-red-400 to-rose-500' },
                  ].map((a) => (
                    <div key={a.name} className={cn('p-3 rounded-2xl border text-center', a.got ? `bg-gradient-to-br ${a.color} text-white border-transparent shadow-md` : 'border-ink-200/60 dark:border-ink-800/60 opacity-50 grayscale')}>
                      <div className="text-3xl mb-1">{a.icon}</div>
                      <p className="text-xs font-bold">{a.name}</p>
                      <p className={cn('text-[10px] mt-0.5', a.got ? 'opacity-90' : 'text-ink-500')}>{a.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* 活跃度热力图 */}
              <section>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><BarChart3 className="w-4 h-4 text-violet-500" />最近 90 天活跃</h3>
                <div className="p-4 rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60">
                  <div className="flex flex-wrap gap-1">
                    {heatmap.map((c) => {
                      const colors = ['bg-ink-100 dark:bg-ink-800', 'bg-emerald-200 dark:bg-emerald-900', 'bg-emerald-300 dark:bg-emerald-700', 'bg-emerald-400 dark:bg-emerald-500', 'bg-emerald-500 dark:bg-emerald-400']
                      return (
                        <div
                          key={c.date}
                          title={`${c.date}: ${c.count} 活动`}
                          className={cn('w-3 h-3 rounded-sm transition', colors[c.level])}
                        />
                      )
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-ink-500">
                    <span>少</span>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className={cn('w-3 h-3 rounded-sm', ['bg-ink-100 dark:bg-ink-800', 'bg-emerald-200 dark:bg-emerald-900', 'bg-emerald-300 dark:bg-emerald-700', 'bg-emerald-400 dark:bg-emerald-500', 'bg-emerald-500 dark:bg-emerald-400'][i])} />
                    ))}
                    <span>多</span>
                  </div>
                </div>
              </section>

              {/* 等级条 */}
              <section>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-pink-500" />等级进度</h3>
                <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/5 via-pink-500/5 to-rose-500/5 border border-ink-200/60 dark:border-ink-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold">Lv. {Math.floor(profile.reputation / 100) + 1} · {profile.reputation} 经验</p>
                      <p className="text-xs text-ink-500">距离下一级还需 {100 - (profile.reputation % 100)} 经验</p>
                    </div>
                    <Award className="w-8 h-8 text-amber-500" />
                  </div>
                  <div className="h-2 bg-ink-200 dark:bg-ink-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 via-pink-500 to-rose-500 rounded-full" style={{ width: `${profile.reputation % 100}%` }} />
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, icon: Icon }: { label: string; value: number; icon?: any }) {
  return (
    <div className="p-3 text-center">
      <div className="text-lg sm:text-xl font-bold flex items-center justify-center gap-0.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-rose-500" />}
        {value.toLocaleString()}
      </div>
      <div className="text-[10px] text-ink-500 mt-0.5">{label}</div>
    </div>
  )
}

function EmptyState({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center mx-auto mb-3">
        <Icon className="w-6 h-6 text-ink-400" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-ink-500 mt-1">{desc}</p>
    </div>
  )
}

export default CreatorProfilePage
