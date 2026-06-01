// ============== 通知页 ==============

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Heart, MessageCircle, UserPlus, AtSign, Flag, Check, HeartHandshake, ShieldAlert } from 'lucide-react'
import { UserAvatar, Username } from '../components/social/UserAvatar'
import { useAuth } from '../api/AuthContext'
import { useNotifications, useApi } from '../api/hooks'
import api from '../api'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '../lib/utils'

const TYPE_ICON: Record<string, any> = {
  like: Heart, love: HeartHandshake, insightful: Heart, disagree: Heart,
  laugh: Heart, sad: Heart, fire: Heart, comment: MessageCircle, mention: AtSign,
  follow: UserPlus, message: MessageCircle, post_flagged: Flag, mod_action: ShieldAlert,
}

const TYPE_COLOR: Record<string, string> = {
  like: 'text-rose-500 bg-rose-50 dark:bg-rose-900/30',
  love: 'text-pink-500 bg-pink-50 dark:bg-pink-900/30',
  insightful: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
  disagree: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30',
  comment: 'text-nova-500 bg-nova-50 dark:bg-nova-900/30',
  mention: 'text-violet-500 bg-violet-50 dark:bg-violet-900/30',
  follow: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
  message: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-900/30',
  post_flagged: 'text-debate-500 bg-debate-50 dark:bg-debate-900/30',
  mod_action: 'text-orange-500 bg-orange-50 dark:bg-orange-900/30',
}

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'unread', label: '未读' },
  { key: 'mentions', label: '@我' },
] as const

export function NotificationsPage() {
  const { user: me } = useAuth()
  const [tab, setTab] = useState<typeof TABS[number]['key']>('all')
  const all = useNotifications(false)
  const unread = useNotifications(true)
  const mentions = useApi(() => me ? all.filter((n) => n.type === 'mention') : [])

  if (!me) return <div className="p-12 text-center">请先<Link to="/auth" className="text-nova-600">登录</Link></div>

  const list = tab === 'unread' ? unread : tab === 'mentions' ? mentions : all

  const markAllRead = () => api.notifications.markAllRead(me.id)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
          <h2 className="font-bold text-xl">通知</h2>
          {unread.length > 0 && (
            <button onClick={markAllRead} className="text-sm text-nova-600 hover:underline">全部已读</button>
          )}
        </div>

        <div className="border-b border-ink-200 dark:border-ink-800 flex gap-2 p-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium',
                tab === t.key ? 'bg-nova-500 text-white' : 'text-ink-700 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800'
              )}
            >
              {t.label}
              {t.key === 'unread' && unread.length > 0 && <span className="ml-1.5 text-xs">({unread.length})</span>}
            </button>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 mx-auto mb-3 text-ink-300" />
            <h3 className="font-semibold mb-1">暂无通知</h3>
            <p className="text-sm text-ink-500">有新的互动时会显示在这里</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {list.map((n) => {
              const actor = api.users.get(n.actorId)
              const Icon = TYPE_ICON[n.type] || Bell
              const target = linkFor(n.targetType, n.targetId, me.id)
              return (
                <Link
                  key={n.id}
                  to={target}
                  onClick={() => api.notifications.markRead(n.id)}
                  className={cn(
                    'flex items-center gap-3 p-4 hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors',
                    !n.read && 'bg-nova-50/30 dark:bg-nova-900/10'
                  )}
                >
                  <div className="relative">
                    <UserAvatar user={actor} size="md" />
                    <div className={cn('absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-ink-900', TYPE_COLOR[n.type] || 'text-ink-500 bg-ink-100')}>
                      <Icon className="w-3 h-3" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      {actor && <Username user={actor} withHandle={false} className="font-semibold mr-1" />}
                      <span className="text-ink-700 dark:text-ink-300">{textFor(n.type)}</span>
                    </p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: zhCN })}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 rounded-full bg-nova-500 flex-shrink-0" />}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function textFor(type: string): string {
  const map: Record<string, string> = {
    like: '赞了你的帖子', love: '爱上了你的帖子', insightful: '觉得你的帖子很有启发', disagree: '不同意你的观点',
    laugh: '被你的帖子逗笑', sad: '为你的帖子感到难过', fire: '为你的帖子点赞',
    comment: '回复了你的帖子', mention: '在帖子里提到了你', follow: '关注了你',
    message: '给你发了私信', post_flagged: '你的帖子收到举报', mod_action: '管理员处理了相关内容',
  }
  return map[type] || '有新的互动'
}

function linkFor(targetType: string, targetId: string, meId: string): string {
  if (targetType === 'post') return `/p/${targetId}`
  if (targetType === 'user') return `/u/${api.users.get(targetId)?.username || ''}`
  if (targetType === 'conversation') return `/messages/${targetId}`
  return '/feed'
}
