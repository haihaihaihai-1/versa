import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Send, Inbox, X, Reply, Trash2, Star, Search, Check, CheckCheck } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import { cn, formatTimeAgo, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

const STORAGE_KEY = 'versa:inbox'

export interface Message {
  id: string
  fromId: string
  fromName: string
  fromAvatar: string
  toId: string
  subject: string
  content: string
  createdAt: number
  read: boolean
  starred: boolean
  folder: 'inbox' | 'sent' | 'starred' | 'trash'
}

const SEEDS: Message[] = [
  { id: 'm1', fromId: 'u1', fromName: '购物达人王', fromAvatar: 'https://i.pravatar.cc/100?img=11', toId: 'me', subject: '关于 iPhone 16 测评', content: '你好, 我刚发布了 iPhone 16 深度测评, 想请你看看有什么建议? 我很欣赏你的专业观点...', createdAt: Date.now() - 3600000 * 2, read: false, starred: true, folder: 'inbox' },
  { id: 'm2', fromId: 'admin', fromName: 'Versa 官方', fromAvatar: 'https://i.pravatar.cc/100?img=68', toId: 'me', subject: '【618 活动】创作者激励计划', content: '亲爱的创作者, 618 期间我们推出创作激励计划, 优质内容可获得 3 倍曝光...', createdAt: Date.now() - 86400000, read: true, starred: false, folder: 'inbox' },
  { id: 'm3', fromId: 'u2', fromName: '美食家 Lily', fromAvatar: 'https://i.pravatar.cc/100?img=20', toId: 'me', subject: '回复: 美食探店合作', content: '感谢回复! 我这周末正好要去 3 家新店, 如果你有空可以一起探店...', createdAt: Date.now() - 86400000 * 2, read: true, starred: false, folder: 'inbox' },
  { id: 'm4', fromId: 'u3', fromName: '穿搭博主 Mia', fromAvatar: 'https://i.pravatar.cc/100?img=25', toId: 'me', subject: '互关申请', content: '你好, 我是穿搭博主, 看到你的内容很专业, 想互相关注交流~', createdAt: Date.now() - 86400000 * 3, read: true, starred: false, folder: 'inbox' },
  { id: 'm5', fromId: 'me', fromName: '我', fromAvatar: 'https://i.pravatar.cc/100?img=68', toId: 'u1', subject: '回复: 美食探店', content: 'Lily 你好, 感谢邀请! 周六下午 2 点 我有空, 在哪里集合?', createdAt: Date.now() - 86400000 * 2, read: true, starred: false, folder: 'sent' },
]

function load(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return SEEDS
}

function save(m: Message[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)) } catch {}
}

export function InboxPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [folder, setFolder] = useState<Message['folder']>('inbox')
  const [active, setActive] = useState<Message | null>(null)
  const [search, setSearch] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [form, setForm] = useState({ to: '', subject: '', content: '' })

  useEffect(() => {
    setMessages(load())
  }, [])

  useEffect(() => { if (messages.length > 0) save(messages) }, [messages])

  const markRead = (id: string) => {
    setMessages((arr) => arr.map((m) => (m.id === id ? { ...m, read: true } : m)))
  }

  const toggleStar = (id: string) => {
    setMessages((arr) => arr.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)))
  }

  const remove = (id: string) => {
    setMessages((arr) => arr.map((m) => (m.id === id ? { ...m, folder: 'trash' as const } : m)))
    setActive(null)
    toast('已移至回收站', 'info')
  }

  const compose = () => {
    if (!user) { toast('请先登录', 'error'); return }
    if (!form.to.trim() || !form.subject.trim() || !form.content.trim()) {
      toast('请填写完整', 'error')
      return
    }
    const m: Message = {
      id: uid('m'), fromId: user.id, fromName: user.displayName, fromAvatar: user.avatar,
      toId: form.to, subject: form.subject, content: form.content,
      createdAt: Date.now(), read: true, starred: false, folder: 'sent',
    }
    setMessages((arr) => [m, ...arr])
    setForm({ to: '', subject: '', content: '' })
    setComposeOpen(false)
    toast('已发送', 'success')
  }

  const filtered = messages.filter((m) => {
    if (folder === 'starred') return m.starred
    if (folder === 'trash') return m.folder === 'trash'
    return m.folder === folder
  }).filter((m) => !search || m.subject.toLowerCase().includes(search.toLowerCase()) || m.content.toLowerCase().includes(search.toLowerCase()) || m.fromName.includes(search))

  const counts = {
    inbox: messages.filter((m) => m.folder === 'inbox' && !m.read).length,
    sent: messages.filter((m) => m.folder === 'sent').length,
    starred: messages.filter((m) => m.starred).length,
    trash: messages.filter((m) => m.folder === 'trash').length,
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-1.5">
          <Inbox className="w-5 h-5 text-nova-500" />站内信
          {counts.inbox > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold">{counts.inbox} 未读</span>
          )}
        </h2>
        <button
          onClick={() => setComposeOpen(true)}
          className="text-xs px-3 h-7 rounded-full bg-gradient-to-r from-nova-500 to-pink-500 text-white font-medium flex items-center gap-1"
        >
          <Send className="w-3 h-3" />写信
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索邮件..."
          className="w-full pl-9 pr-3 h-9 rounded-xl bg-white/80 dark:bg-ink-900/40 border border-ink-200 dark:border-ink-800 outline-none focus:ring-2 focus:ring-nova-500 text-sm"
        />
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { key: 'inbox', label: '收件箱', icon: Inbox },
          { key: 'sent', label: '已发送', icon: Send },
          { key: 'starred', label: '星标', icon: Star },
          { key: 'trash', label: '回收站', icon: Trash2 },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => { setFolder(f.key as Message['folder']); setActive(null) }}
            className={cn(
              'p-2 rounded-xl text-xs font-medium flex flex-col items-center gap-1',
              folder === f.key ? 'bg-nova-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 dark:text-ink-300'
            )}
          >
            <f.icon className="w-4 h-4" />
            {f.label}
            {f.key === 'inbox' && counts.inbox > 0 && (
              <span className="text-[9px] px-1 rounded bg-rose-500 text-white">{counts.inbox}</span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-500">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无邮件</p>
          </div>
        ) : (
          filtered.map((m) => (
            <motion.button
              key={m.id}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => { setActive(m); if (!m.read) markRead(m.id) }}
              className={cn(
                'w-full text-left p-3 rounded-2xl border transition flex items-start gap-2.5',
                active?.id === m.id
                  ? 'border-nova-500 bg-nova-50 dark:bg-nova-900/20'
                  : !m.read
                    ? 'border-rose-200/60 dark:border-rose-800/30 bg-rose-50/30 dark:bg-rose-900/10'
                    : 'border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/40'
              )}
            >
              <img src={m.fromAvatar} alt={m.fromName} className="w-9 h-9 rounded-full flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={cn('text-sm', !m.read && 'font-bold')}>{m.fromName}</p>
                  {m.starred && <Star className="w-3 h-3 text-amber-500 fill-current" />}
                  <span className="ml-auto text-[10px] text-ink-400">{formatTimeAgo(new Date(m.createdAt).toISOString())}</span>
                </div>
                <p className={cn('text-sm mt-0.5 truncate', !m.read && 'font-semibold')}>{m.subject}</p>
                <p className="text-xs text-ink-500 mt-0.5 truncate">{m.content}</p>
              </div>
              {!m.read && <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-2" />}
            </motion.button>
          ))
        )}
      </div>

      <AnimatePresence>
        {active && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={() => setActive(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white dark:bg-ink-900 rounded-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm flex-1 line-clamp-1">{active.subject}</h3>
                <button onClick={() => setActive(null)} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded"><X className="w-4 h-4" /></button>
              </div>
              <div className="flex items-center gap-2 pb-2 border-b border-ink-200 dark:border-ink-800">
                <img src={active.fromAvatar} alt={active.fromName} className="w-8 h-8 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{active.fromName}</p>
                  <p className="text-[10px] text-ink-500">{formatTimeAgo(new Date(active.createdAt).toISOString())}</p>
                </div>
                <button onClick={() => toggleStar(active.id)} className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 rounded">
                  <Star className={cn('w-4 h-4', active.starred ? 'text-amber-500 fill-current' : 'text-ink-400')} />
                </button>
                <button onClick={() => remove(active.id)} className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 rounded">
                  <Trash2 className="w-4 h-4 text-ink-400" />
                </button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{active.content}</p>
              {active.folder !== 'sent' && (
                <button
                  onClick={() => { setReplyOpen(true); setForm({ to: active.fromName, subject: '回复: ' + active.subject, content: '' }) }}
                  className="w-full h-9 rounded-lg bg-gradient-to-r from-nova-500 to-pink-500 text-white text-sm font-semibold flex items-center justify-center gap-1"
                >
                  <Reply className="w-3 h-3" />回复
                </button>
              )}
            </motion.div>
          </div>
        )}

        {(composeOpen || replyOpen) && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={() => { setComposeOpen(false); setReplyOpen(false) }}>
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-ink-900 rounded-2xl p-5 space-y-3"
            >
              <h3 className="font-bold flex items-center gap-1.5"><Mail className="w-4 h-4" />{replyOpen ? '回复' : '写新邮件'}</h3>
              <input
                value={form.to}
                onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
                placeholder="收件人"
                className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500"
              />
              <input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="主题"
                className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500"
              />
              <textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={6}
                placeholder="正文..."
                className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500 resize-none"
              />
              <button onClick={compose} className="w-full h-10 rounded-xl bg-gradient-to-r from-nova-500 to-pink-500 text-white font-semibold">
                发送
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
