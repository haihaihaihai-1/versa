// ============== 管理后台 - 用户管理 ==============

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Shield, Crown, BadgeCheck, Ban, CheckCircle2 } from 'lucide-react'
import { useApi, useStoreVersion } from '../api/hooks'
import api from '../api'
import { useAuth } from '../api/AuthContext'
import { isAdmin } from '../api/index'
import { roleLabel, roleColor } from '../api/permissions'
import { UserAvatar } from '../components/social/UserAvatar'
import { cn } from '../lib/utils'
import type { Role } from '../api/types'

export function AdminUsersPage() {
  const { user: me } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Role | 'all' | 'banned'>('all')
  useStoreVersion()

  if (!isAdmin(me)) {
    return <div className="p-12 text-center">仅管理员可访问</div>
  }

  const users = useApi(() => api.users.all())
  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (filter === 'banned' && u.status !== 'banned') return false
      if (filter !== 'all' && filter !== 'banned' && u.role !== filter) return false
      if (query) {
        const q = query.toLowerCase()
        if (!u.displayName.toLowerCase().includes(q) && !u.username.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [users, filter, query])

  const setRole = (userId: string, role: Role) => {
    if (!me) return
    if (userId === me.id) { alert('不能修改自己的角色'); return }
    api.users.update(userId, { role })
  }
  const toggleBan = (userId: string) => {
    if (!me) return
    if (userId === me.id) { alert('不能封禁自己'); return }
    const u = api.users.get(userId)
    if (!u) return
    if (u.status === 'banned') api.users.update(userId, { status: 'active' })
    else {
      const reason = prompt('封禁原因：')
      if (!reason) return
      api.users.ban(userId, reason)
    }
  }
  const toggleVerify = (userId: string) => {
    const u = api.users.get(userId)
    if (!u) return
    api.users.update(userId, { verified: !u.verified })
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索用户名、昵称..."
              className="w-full pl-10 pr-3 py-2 rounded-full bg-ink-100 dark:bg-ink-800 text-sm outline-none"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'user', 'creator', 'auditor', 'admin', 'banned'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap',
                  filter === f ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800'
                )}
              >
                {f === 'all' ? '全部' : f === 'banned' ? '已封禁' : roleLabel(f as Role)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-ink-50 dark:bg-ink-800/50 text-sm text-ink-500">
            <tr>
              <th className="text-left p-4">用户</th>
              <th className="text-left p-4">角色</th>
              <th className="text-left p-4 hidden sm:table-cell">声誉</th>
              <th className="text-left p-4 hidden sm:table-cell">状态</th>
              <th className="text-right p-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-ink-50 dark:hover:bg-ink-800/30">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={u} size="sm" />
                    <div>
                      <div className="font-medium text-sm">{u.displayName}</div>
                      <div className="text-xs text-ink-500">@{u.username}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <select
                    value={u.role}
                    onChange={(e) => setRole(u.id, e.target.value as Role)}
                    className={cn('text-xs px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer', roleColor(u.role))}
                  >
                    <option value="user">用户</option>
                    <option value="creator">创作者</option>
                    <option value="auditor">审核员</option>
                    <option value="admin">管理员</option>
                  </select>
                </td>
                <td className="p-4 hidden sm:table-cell text-sm">{u.reputation}</td>
                <td className="p-4 hidden sm:table-cell">
                  {u.status === 'banned' ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-debate-100 text-debate-700">已封禁</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">正常</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      onClick={() => toggleVerify(u.id)}
                      title={u.verified ? '取消认证' : '认证'}
                      className={cn('p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800', u.verified && 'text-nova-600')}
                    >
                      <BadgeCheck className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleBan(u.id)}
                      title={u.status === 'banned' ? '解封' : '封禁'}
                      className={cn('p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800', u.status === 'banned' && 'text-debate-600')}
                    >
                      {u.status === 'banned' ? <CheckCircle2 className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-12 text-center text-ink-500">没有匹配的用户</div>
        )}
      </div>
    </div>
  )
}
