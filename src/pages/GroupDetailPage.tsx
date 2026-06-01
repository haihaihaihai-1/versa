// ============== 群组详情 ==============

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Users, Plus, Check, LogOut } from 'lucide-react'
import { UserAvatar } from '../components/social/UserAvatar'
import { PostCard } from '../components/social/PostCard'
import { useAuth } from '../api/AuthContext'
import { useApi, useFeed, useStoreVersion } from '../api/hooks'
import api from '../api'
import { cn } from '../lib/utils'

const TABS = ['posts', 'members'] as const

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const group = useApi(() => id ? api.groups.byId(id) : null)
  const members = useApi(() => id ? api.groups.members(id) : [])
  const isMember = useApi(() => (id && me) ? api.groups.isMember(id, me.id) : false)
  const [tab, setTab] = useState<typeof TABS[number]>('posts')
  useStoreVersion()

  if (!group) return <div className="p-12 text-center">群组不存在</div>

  const groupPosts = useFeed({ limit: 50 }).filter((p) => {
    // Filter posts mentioning this group tag
    if (!p.hashtags.length) return false
    return p.hashtags.some((t) => group.tags.includes(t))
  })

  const join = () => {
    if (!me) { navigate('/auth'); return }
    if (isMember) api.groups.leave(group.id, me.id)
    else api.groups.join(group.id, me.id)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cover */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-nova-400 to-rose-500">
        {group.cover && <img src={group.cover} alt="" className="w-full h-full object-cover" />}
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 p-2 rounded-full bg-black/40 backdrop-blur text-white">
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
          <div className="ring-4 ring-white dark:ring-ink-900 rounded-2xl inline-block">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-nova-400 to-rose-500 flex items-center justify-center text-white">
              <Users className="w-10 h-10" />
            </div>
          </div>
          <div className="flex-1 sm:pb-2">
            <h1 className="text-2xl font-bold">{group.name}</h1>
            <p className="text-ink-500 text-sm mt-1">{group.description}</p>
            <div className="mt-2 flex items-center gap-3 text-sm text-ink-500">
              <span><Users className="inline w-4 h-4" /> {group.memberCount} 成员</span>
              <span>·</span>
              <span>创建于 {new Date(group.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-2 sm:pb-2">
            {me && (
              <button
                onClick={join}
                className={cn(
                  'px-5 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5',
                  isMember ? 'bg-ink-100 dark:bg-ink-800 text-ink-700' : 'bg-nova-500 text-white hover:bg-nova-600'
                )}
              >
                {isMember ? <><LogOut className="w-4 h-4" /> 已加入</> : <><Plus className="w-4 h-4" /> 加入</>}
              </button>
            )}
            {isMember && me && (
              <Link
                to="/compose"
                className="px-4 py-2 rounded-full bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 text-sm font-medium flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> 发帖
              </Link>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {group.tags.map((t: string) => (
            <Link key={t} to={`/feed?tag=${encodeURIComponent(t)}`} className="text-xs px-2 py-1 rounded-full bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300 hover:bg-nova-100 hover:text-nova-700">{t}</Link>
          ))}
        </div>

        <div className="mt-6 border-b border-ink-200 dark:border-ink-800 flex gap-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn('py-3 text-sm font-medium relative', tab === t ? 'text-nova-600' : 'text-ink-500 hover:text-ink-900')}
            >
              {t === 'posts' ? '动态' : '成员'}
              {tab === t && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-nova-500" />}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'posts' && (
            groupPosts.length === 0 ? (
              <div className="text-center py-12 text-ink-500">
                <p>暂无相关动态</p>
                {isMember && me && <Link to="/compose" className="text-nova-600 hover:underline mt-2 inline-block">发布第一条</Link>}
              </div>
            ) : (
              <div className="space-y-4">
                {groupPosts.map((p) => <PostCard key={p.id} post={p} />)}
              </div>
            )
          )}
          {tab === 'members' && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {members.map((m) => (
                <Link key={m.id} to={`/u/${m.username}`} className="flex items-center gap-3 p-3 rounded-xl border border-ink-200 dark:border-ink-800 hover:border-nova-300">
                  <UserAvatar user={m} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{m.displayName}</div>
                    <div className="text-xs text-ink-500 truncate">@{m.username}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
