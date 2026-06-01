// ============== 管理后台 - 概览 ==============

import { Link } from 'react-router-dom'
import { Users, FileText, MessageCircle, Users2, Flag, AlertOctagon, ArrowRight } from 'lucide-react'
import { useApi } from '../api/hooks'
import api from '../api'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { UserAvatar } from '../components/social/UserAvatar'

export function AdminDashboardPage() {
  const stats = useApi(() => api.stats.overview())
  const reports = useApi(() => api.reports.all('pending').slice(0, 5))
  const recentLogs = useApi(() => api.stats.recentActivity(10))

  const cards = [
    { label: '总用户', value: stats?.totalUsers || 0, icon: Users, color: 'from-blue-500 to-cyan-500' },
    { label: '总帖子', value: stats?.totalPosts || 0, icon: FileText, color: 'from-nova-500 to-rose-500' },
    { label: '总评论', value: stats?.totalComments || 0, icon: MessageCircle, color: 'from-emerald-500 to-teal-500' },
    { label: '总群组', value: stats?.totalGroups || 0, icon: Users2, color: 'from-amber-500 to-orange-500' },
    { label: '待处理举报', value: stats?.totalReports || 0, icon: Flag, color: 'from-rose-500 to-pink-500' },
    { label: '对话数', value: stats?.totalConversations || 0, icon: MessageCircle, color: 'from-violet-500 to-purple-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white mb-3`}>
              <c.icon className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold">{c.value.toLocaleString()}</div>
            <div className="text-xs text-ink-500 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Pending reports */}
        <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Flag className="w-4 h-4 text-rose-500" /> 待处理举报
            </h2>
            <Link to="/admin/moderation" className="text-sm text-nova-600 hover:underline flex items-center gap-1">
              全部 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {reports.length === 0 ? (
            <div className="text-center text-sm text-ink-500 py-8">
              <Flag className="w-10 h-10 mx-auto mb-2 text-ink-300" />
              没有待处理举报
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => {
                const reporter = api.users.get(r.reporterId)
                return (
                  <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-ink-100 dark:border-ink-800">
                    <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600">
                      <AlertOctagon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{r.description || r.reason}</div>
                      <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-2">
                        <UserAvatar user={reporter} size="xs" />
                        <span>{formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: zhCN })}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent mod logs */}
        <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-amber-500" /> 审核记录
            </h2>
          </div>
          {recentLogs.length === 0 ? (
            <div className="text-center text-sm text-ink-500 py-8">
              <AlertOctagon className="w-10 h-10 mx-auto mb-2 text-ink-300" />
              暂无审核记录
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((l) => {
                const actor = api.users.get((l as any).actorId || l.moderatorId)
                return (
                  <div key={l.id} className="text-sm flex items-center gap-2 py-1.5">
                    <UserAvatar user={actor} size="xs" />
                    <span className="font-medium">{actor?.displayName}</span>
                    <span className="text-ink-500">{l.action}</span>
                    <span className="text-ink-400 text-xs ml-auto">
                      {formatDistanceToNow(new Date(l.createdAt), { addSuffix: true, locale: zhCN })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
