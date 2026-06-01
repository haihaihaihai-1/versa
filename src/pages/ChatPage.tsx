// ============== 单个聊天页 ==============

import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Send, MoreVertical, Image as ImageIcon } from 'lucide-react'
import { UserAvatar } from '../components/social/UserAvatar'
import { useAuth } from '../api/AuthContext'
import { useApi, useMessages, useStoreVersion } from '../api/hooks'
import api from '../api'
import { cn } from '../lib/utils'
import { format, isToday, isYesterday } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function ChatPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const conv = useApi(() => id ? api.conversations.byId(id) : null)
  const messages = useMessages(id)
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  useStoreVersion()

  useEffect(() => {
    if (id && me) api.conversations.markRead(id, me.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, me, messages.length])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (!me) return <div className="p-12 text-center">请先<Link to="/auth" className="text-nova-600">登录</Link></div>
  if (!conv) return <div className="p-12 text-center">对话不存在</div>

  const otherId = conv.participants.find((p) => p !== me.id)
  if (!otherId) return <div className="p-12 text-center">无效对话</div>
  const other = api.users.get(otherId)
  if (!other) return <div className="p-12 text-center">用户不存在</div>

  const send = () => {
    if (!text.trim()) return
    api.conversations.sendMessage(conv.id, me.id, text.trim())
    setText('')
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 h-[calc(100vh-7rem)] md:h-[calc(100vh-5rem)] flex flex-col">
      <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-ink-200 dark:border-ink-800 flex items-center gap-3">
          <button onClick={() => navigate('/messages')} className="md:hidden p-1 -ml-1 text-ink-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <UserAvatar user={other} size="md" />
          <Link to={`/u/${other.username}`} className="flex-1 min-w-0">
            <div className="font-semibold truncate">{other.displayName}</div>
            <div className="text-xs text-ink-500 truncate">@{other.username}</div>
          </Link>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center text-sm text-ink-400 py-12">
              👋 发送第一条消息来开启对话吧
            </div>
          ) : (
            messages.map((m, i) => {
              const isMe = m.senderId === me.id
              const prev = messages[i - 1]
              const showAvatar = !prev || prev.senderId !== m.senderId
              return (
                <div key={m.id} className={cn('flex gap-2', isMe ? 'justify-end' : 'justify-start')}>
                  {!isMe && (showAvatar ? <UserAvatar user={other} size="sm" /> : <div className="w-8" />)}
                  <div className={cn('flex flex-col', isMe && 'items-end')}>
                    <div className={cn(
                      'max-w-[75%] px-4 py-2 rounded-2xl text-sm',
                      isMe ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800'
                    )}>
                      {m.content}
                    </div>
                    <span className="text-[10px] text-ink-400 mt-0.5">
                      {format(new Date(m.createdAt), 'HH:mm')}
                    </span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-ink-200 dark:border-ink-800 flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="输入消息..."
            className="flex-1 px-4 py-2.5 rounded-full bg-ink-100 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500"
          />
          <button
            onClick={send}
            disabled={!text.trim()}
            className="p-2.5 rounded-full bg-nova-500 text-white disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
