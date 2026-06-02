// ============== 消息列表 (v2 社交私信) ==============

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Search, MessageCircle } from 'lucide-react'
import { UserAvatar } from '../components/social/UserAvatar'
import { useAuth } from '../api/AuthContext'
import { useConversations, useApi } from '../api/hooks'
import api from '../api'
import { cn } from '../lib/utils'

export function MessagesPage() {
  const { user: me } = useAuth()
  const conversations = useConversations()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  if (!me) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold mb-2">请先登录</h2>
        <Link to="/auth" className="text-nova-600 hover:underline">去登录</Link>
      </div>
    )
  }

  const filtered = conversations.filter((c) => {
    if (!query.trim()) return true
    const other = c.participants.find((p) => p !== me.id)
    if (!other) return false
    const u = api.users.get(other)
    return u?.displayName.includes(query) || u?.username.includes(query) || c.lastMessagePreview.includes(query)
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-ink-200 dark:border-ink-800">
          <h2 className="font-bold text-xl mb-3">消息</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索对话..."
              className="w-full pl-10 pr-3 py-2 rounded-full bg-ink-100 dark:bg-ink-800 text-sm outline-none"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-ink-300" />
            <h3 className="font-semibold mb-1">{query ? '没有匹配的对话' : '还没有私信'}</h3>
            <p className="text-sm text-ink-500">去用户主页发起对话吧</p>
          </div>
        ) : (
          <div className="divide-y divide-ink-100 dark:divide-ink-800">
            {filtered.map((c) => {
              const otherId = c.participants.find((p) => p !== me.id)!
              const other = api.users.get(otherId)
              if (!other) return null
              const unread = c.unreadCount[me.id] || 0
              return (
                <button
                  key={c.id}
                  onClick={() => navigate(`/messages/${c.id}`)}
                  className="w-full p-4 flex items-center gap-3 hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors text-left"
                >
                  <UserAvatar user={other} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{other.displayName}</span>
                      <span className="text-xs text-ink-400 flex-shrink-0">{c.lastMessagePreview || '开始对话'}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <p className={cn('text-sm truncate', unread > 0 ? 'text-ink-900 dark:text-white font-medium' : 'text-ink-500')}>
                        {c.lastMessagePreview || '开始对话...'}
                      </p>
                      {unread > 0 && (
                        <span className="flex-shrink-0 h-5 min-w-5 px-1.5 rounded-full bg-rose-500 text-white text-xs font-bold flex items-center justify-center">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
