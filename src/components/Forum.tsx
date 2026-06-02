import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { MessageSquare, Heart, Eye, Plus, Pin, Lock, Search, Filter } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import { cn, formatNumber, formatTimeAgo, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

const STORAGE_KEY = 'versa:forum-threads'

export interface ForumThread {
  id: string
  title: string
  content: string
  authorId: string
  authorName: string
  authorAvatar: string
  category: 'general' | 'tech' | 'food' | 'travel' | 'lifestyle' | 'help'
  createdAt: number
  views: number
  likes: number
  replies: number
  pinned: boolean
  locked: boolean
  liked: string[]
}

const SEEDS: ForumThread[] = [
  { id: 'f1', title: '【置顶】Versa 社区准则与积分规则 (2026 修订版)', content: '欢迎来到 Versa 社区! 请遵守以下准则: 1. 友善交流 2. 原创为主 3. 拒绝广告...', authorId: 'admin', authorName: 'Versa 官方', authorAvatar: 'https://i.pravatar.cc/100?img=68', category: 'general', createdAt: Date.now() - 86400000 * 30, views: 12400, likes: 856, replies: 234, pinned: true, locked: false, liked: [] },
  { id: 'f2', title: '618 攻略合集 | 30 个会场最全优惠汇总', content: '本文整理了 30 个会场的满减券, 包括数码/美妆/家居... 持续更新中, 欢迎补充!', authorId: 'u1', authorName: '购物达人王', authorAvatar: 'https://i.pravatar.cc/100?img=11', category: 'help', createdAt: Date.now() - 86400000 * 2, views: 5600, likes: 432, replies: 89, pinned: false, locked: false, liked: [] },
  { id: 'f3', title: 'iPhone 16 Pro Max 一个月深度体验', content: '从外观到续航到拍照, 全面分析, 视频也拍了, 上手视频: ...', authorId: 'u2', authorName: '数码小王子', authorAvatar: 'https://i.pravatar.cc/100?img=51', category: 'tech', createdAt: Date.now() - 86400000, views: 3200, likes: 256, replies: 67, pinned: false, locked: false, liked: [] },
  { id: 'f4', title: '求推荐江浙沪周末 2 日游目的地', content: '下周末想去周边转转, 不要太累, 有山有水有美食, 求推荐!', authorId: 'u3', authorName: '旅行家', authorAvatar: 'https://i.pravatar.cc/100?img=22', category: 'travel', createdAt: Date.now() - 3600000 * 8, views: 890, likes: 56, replies: 42, pinned: false, locked: false, liked: [] },
  { id: 'f5', title: '自制咖啡入门心得, 从手冲到意式', content: '作为一个咖啡爱好者, 分享一下入门心得, 包括豆子选择/设备推荐/水温控制...', authorId: 'u4', authorName: '咖啡控', authorAvatar: 'https://i.pravatar.cc/100?img=33', category: 'food', createdAt: Date.now() - 86400000 * 3, views: 2100, likes: 187, replies: 53, pinned: false, locked: false, liked: [] },
]

function load(): ForumThread[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return SEEDS
}

function save(t: ForumThread[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)) } catch {}
}

const CATEGORY_LABELS = {
  general: '综合',
  tech: '科技',
  food: '美食',
  travel: '旅行',
  lifestyle: '生活',
  help: '求助',
}

const CATEGORY_COLORS = {
  general: 'from-ink-400 to-ink-600',
  tech: 'from-blue-500 to-indigo-500',
  food: 'from-amber-500 to-orange-500',
  travel: 'from-emerald-500 to-teal-500',
  lifestyle: 'from-rose-500 to-pink-500',
  help: 'from-violet-500 to-purple-500',
}

export function Forum() {
  const { user } = useAuth()
  const [threads, setThreads] = useState<ForumThread[]>([])
  const [filter, setFilter] = useState<'all' | ForumThread['category']>('all')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: 'general' as ForumThread['category'] })

  useEffect(() => {
    setThreads(load())
  }, [])

  useEffect(() => { if (threads.length > 0) save(threads) }, [threads])

  const toggleLike = (id: string) => {
    if (!user) { toast('请先登录', 'error'); return }
    setThreads((arr) => arr.map((t) => {
      if (t.id !== id) return t
      const isLiked = t.liked.includes(user.id)
      return { ...t, liked: isLiked ? t.liked.filter((u) => u !== user.id) : [...t.liked, user.id], likes: t.likes + (isLiked ? -1 : 1) }
    }))
  }

  const create = () => {
    if (!user) { toast('请先登录', 'error'); return }
    if (!form.title.trim() || !form.content.trim()) { toast('请填写完整', 'error'); return }
    const t: ForumThread = {
      id: uid('f'), title: form.title, content: form.content,
      authorId: user.id, authorName: user.displayName, authorAvatar: user.avatar,
      category: form.category, createdAt: Date.now(), views: 0, likes: 0, replies: 0,
      pinned: false, locked: false, liked: [],
    }
    setThreads((arr) => [t, ...arr])
    setForm({ title: '', content: '', category: 'general' })
    setOpen(false)
    toast('已发布', 'success')
  }

  const sorted = [...threads].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.createdAt - a.createdAt)
  const filtered = sorted.filter((t) => (filter === 'all' || t.category === filter) && (!search || t.title.toLowerCase().includes(search.toLowerCase())))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-1.5">
          <MessageSquare className="w-5 h-5 text-nova-500" />社区论坛
          <span className="text-xs text-ink-500 font-normal">{threads.length} 主题</span>
        </h2>
        <button
          onClick={() => setOpen(true)}
          className="text-xs px-3 h-7 rounded-full bg-gradient-to-r from-nova-500 to-pink-500 text-white font-medium flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />发帖
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索主题..."
          className="w-full pl-9 pr-3 h-9 rounded-xl bg-white/80 dark:bg-ink-900/40 border border-ink-200 dark:border-ink-800 outline-none focus:ring-2 focus:ring-nova-500 text-sm"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'all', label: '全部' },
          { key: 'general', label: '综合' },
          { key: 'tech', label: '科技' },
          { key: 'food', label: '美食' },
          { key: 'travel', label: '旅行' },
          { key: 'lifestyle', label: '生活' },
          { key: 'help', label: '求助' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={cn(
              'px-3 h-7 rounded-full text-xs font-medium flex-shrink-0',
              filter === f.key ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((t) => {
          const isLiked = user && t.liked.includes(user.id)
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-3 hover:border-nova-300 transition"
            >
              <div className="flex items-start gap-2.5">
                <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white text-xs font-bold flex-shrink-0', CATEGORY_COLORS[t.category])}>
                  {CATEGORY_LABELS[t.category]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 flex-wrap">
                    {t.pinned && <Pin className="w-3 h-3 text-amber-500" />}
                    {t.locked && <Lock className="w-3 h-3 text-ink-400" />}
                    <h3 className="font-semibold text-sm line-clamp-1">{t.title}</h3>
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5 line-clamp-1">{t.content}</p>
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-ink-500">
                    <span>{t.authorName}</span>
                    <span>·</span>
                    <span>{formatTimeAgo(new Date(t.createdAt).toISOString())}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-ink-100 dark:border-ink-800 text-[10px] text-ink-500">
                <span className="flex items-center gap-0.5">
                  <Eye className="w-3 h-3" />{formatNumber(t.views)}
                </span>
                <button
                  onClick={() => toggleLike(t.id)}
                  className={cn('flex items-center gap-0.5', isLiked && 'text-rose-500')}
                >
                  <Heart className={cn('w-3 h-3', isLiked && 'fill-current')} />{formatNumber(t.likes)}
                </button>
                <span className="flex items-center gap-0.5">
                  <MessageSquare className="w-3 h-3" />{formatNumber(t.replies)}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-ink-900 rounded-2xl p-5 space-y-3 max-h-[85vh] overflow-y-auto"
          >
            <h3 className="font-bold">发表新主题</h3>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ForumThread['category'] }))}
              className="w-full h-9 px-3 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="标题"
              maxLength={50}
              className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500"
            />
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              rows={6}
              maxLength={500}
              placeholder="正文..."
              className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500 resize-none"
            />
            <p className="text-[10px] text-ink-400 text-right">{form.content.length}/500</p>
            <button onClick={create} className="w-full h-10 rounded-xl bg-gradient-to-r from-nova-500 to-pink-500 text-white font-semibold">
              发布
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
