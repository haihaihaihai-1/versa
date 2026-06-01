// ============== 管理后台 - 数据看板 ==============

import { useApi, useStoreVersion } from '../api/hooks'
import api from '../api'
import { useAuth } from '../api/AuthContext'
import { isAdmin } from '../api/index'
import { UserAvatar, ReputationBadge } from '../components/social/UserAvatar'
import { roleLabel } from '../api/permissions'
import { TrendingUp, Users, FileText, Heart, BarChart3 } from 'lucide-react'

export function AdminStatsPage() {
  const { user: me } = useAuth()
  useStoreVersion()
  if (!isAdmin(me)) return <div className="p-12 text-center">仅管理员可访问</div>

  const stats = useApi(() => api.stats.overview())
  const topUsers = useApi(() => api.users.all().sort((a, b) => b.reputation - a.reputation).slice(0, 10))
  const topPosts = useApi(() => Object.values(api.debug.state().posts).sort((a: any, b: any) => {
    const aScore = (Object.values(a.reactions) as string[][]).reduce((s, arr) => s + arr.length, 0) + a.commentsCount * 2
    const bScore = (Object.values(b.reactions) as string[][]).reduce((s, arr) => s + arr.length, 0) + b.commentsCount * 2
    return bScore - aScore
  }).slice(0, 10))

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KPI label="总用户" value={stats?.totalUsers || 0} icon={Users} color="from-blue-500 to-cyan-500" />
        <KPI label="总帖子" value={stats?.totalPosts || 0} icon={FileText} color="from-nova-500 to-rose-500" />
        <KPI label="总评论" value={stats?.totalComments || 0} icon={Heart} color="from-emerald-500 to-teal-500" />
        <KPI label="已封禁" value={stats?.bannedUsers || 0} icon={TrendingUp} color="from-rose-500 to-pink-500" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top users */}
        <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" /> 声誉榜 Top 10
          </h2>
          <div className="space-y-2">
            {topUsers.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-bold text-ink-400">#{i + 1}</span>
                <UserAvatar user={u} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{u.displayName}</div>
                  <div className="text-xs text-ink-500">{roleLabel(u.role)}</div>
                </div>
                <ReputationBadge reputation={u.reputation} />
                <span className="text-sm font-bold tabular-nums w-12 text-right">{u.reputation}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top posts */}
        <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-rose-500" /> 热门帖子 Top 10
          </h2>
          <div className="space-y-2">
            {topPosts.map((p: any, i) => {
              const author = api.users.get(p.authorId)
              const score = (Object.values(p.reactions) as string[][]).reduce((s, arr) => s + arr.length, 0) + p.commentsCount * 2
              return (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/30">
                  <span className="w-6 text-center text-sm font-bold text-ink-400">#{i + 1}</span>
                  <UserAvatar user={author} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm line-clamp-1">{p.content}</p>
                    <div className="text-xs text-ink-500 mt-0.5">@{author?.username} · {p.commentsCount} 评论</div>
                  </div>
                  <span className="text-sm font-bold tabular-nums">{score}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function KPI({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-4">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs text-ink-500 mt-0.5">{label}</div>
    </div>
  )
}
