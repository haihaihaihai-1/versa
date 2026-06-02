import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FileText, MessageCircle, ShoppingBag, Video, Bookmark, Calendar, Edit, Trash2, Plus, Search, Filter } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import { cn, formatNumber, formatTimeAgo } from '../lib/utils'

type Tab = 'all' | 'posts' | 'comments' | 'products' | 'notes' | 'quicknotes' | 'events' | 'debates'

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'all', label: '全部', icon: FileText },
  { key: 'posts', label: '动态', icon: MessageCircle },
  { key: 'comments', label: '评论', icon: MessageCircle },
  { key: 'products', label: '商品', icon: ShoppingBag },
  { key: 'notes', label: '笔记', icon: FileText },
  { key: 'quicknotes', label: '便签', icon: Bookmark },
  { key: 'events', label: '日程', icon: Calendar },
  { key: 'debates', label: '辩论', icon: MessageCircle },
]

const KEYS: Record<Tab, string> = {
  all: '',
  posts: 'versa:posts',
  comments: 'versa:comments',
  products: 'versa:my-products',
  notes: 'versa:notes',
  quicknotes: 'versa:quicknotes',
  events: 'versa:events',
  debates: 'versa:my-debates',
}

export function MyContent() {
  const { user } = useAuth()
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [counts, setCounts] = useState<Record<Tab, number>>({ all: 0, posts: 0, comments: 0, products: 0, notes: 0, quicknotes: 0, events: 0, debates: 0 })

  useEffect(() => {
    const next: Record<Tab, number> = { all: 0, posts: 0, comments: 0, products: 0, notes: 0, quicknotes: 0, events: 0, debates: 0 }
    TABS.forEach((t) => {
      if (t.key === 'all') {
        next.all = Object.entries(KEYS).filter(([k]) => k !== 'all').reduce((s, [_, key]) => {
          try { return s + (JSON.parse(localStorage.getItem(key) || '[]') as any[]).length } catch { return s }
        }, 0)
      } else {
        try { next[t.key] = (JSON.parse(localStorage.getItem(KEYS[t.key]) || '[]') as any[]).length } catch { next[t.key] = 0 }
      }
    })
    setCounts(next)
  }, [tab])

  if (!user) return null

  const items: { id: string; title: string; meta: string; preview?: string; type: Tab }[] = []

  if (tab === 'all' || tab === 'notes') {
    try {
      JSON.parse(localStorage.getItem('versa:notes') || '[]').forEach((n: any) => {
        items.push({ id: n.id, title: n.title || '无标题', meta: formatTimeAgo(n.updatedAt), preview: n.content?.slice(0, 80), type: 'notes' })
      })
    } catch {}
  }
  if (tab === 'all' || tab === 'quicknotes') {
    try {
      JSON.parse(localStorage.getItem('versa:quicknotes') || '[]').forEach((n: any) => {
        items.push({ id: n.id, title: n.content?.slice(0, 20) || '便签', meta: formatTimeAgo(n.createdAt), preview: n.content, type: 'quicknotes' })
      })
    } catch {}
  }
  if (tab === 'all' || tab === 'events') {
    try {
      JSON.parse(localStorage.getItem('versa:events') || '[]').forEach((n: any) => {
        items.push({ id: n.id, title: n.title || '日程', meta: `${n.date} ${n.startTime}`, preview: n.note, type: 'events' })
      })
    } catch {}
  }
  if (tab === 'all' || tab === 'posts') {
    try {
      JSON.parse(localStorage.getItem('versa:posts') || '[]').forEach((n: any) => {
        items.push({ id: n.id, title: n.title || n.content?.slice(0, 30) || '动态', meta: formatTimeAgo(n.createdAt), preview: n.content?.slice(0, 100), type: 'posts' })
      })
    } catch {}
  }
  if (tab === 'all' || tab === 'comments') {
    try {
      JSON.parse(localStorage.getItem('versa:comments') || '[]').forEach((n: any) => {
        items.push({ id: n.id, title: '评论', meta: formatTimeAgo(n.createdAt), preview: n.content, type: 'comments' })
      })
    } catch {}
  }

  const filtered = items.filter((i) => !search || i.title.toLowerCase().includes(search.toLowerCase()) || (i.preview?.toLowerCase().includes(search.toLowerCase())))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1 px-3 h-8 rounded-full text-xs font-medium transition',
              tab === t.key ? 'bg-nova-500 text-white' : 'bg-white/60 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-ink-50'
            )}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
            {counts[t.key] > 0 && (
              <span className={cn('ml-0.5 text-[10px] px-1 rounded-full', tab === t.key ? 'bg-white/20' : 'bg-ink-200 dark:bg-ink-700')}>
                {counts[t.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索我的内容..."
          className="w-full pl-9 pr-3 h-10 rounded-xl bg-white/80 dark:bg-ink-900/40 border border-ink-200 dark:border-ink-800 outline-none focus:ring-2 focus:ring-nova-500"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-500 bg-white/60 dark:bg-ink-900/30 rounded-2xl">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>暂无内容</p>
          </div>
        ) : (
          filtered.map((it) => (
            <motion.div
              key={it.type + it.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-3 flex items-start gap-3"
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center',
                it.type === 'notes' && 'bg-nova-100 dark:bg-nova-900/40 text-nova-500',
                it.type === 'quicknotes' && 'bg-rose-100 dark:bg-rose-900/40 text-rose-500',
                it.type === 'events' && 'bg-blue-100 dark:bg-blue-900/40 text-blue-500',
                it.type === 'posts' && 'bg-amber-100 dark:bg-amber-900/40 text-amber-500',
                it.type === 'comments' && 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-500',
                it.type === 'debates' && 'bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-500',
              )}>
                {it.type === 'notes' && <FileText className="w-4 h-4" />}
                {it.type === 'quicknotes' && <Bookmark className="w-4 h-4" />}
                {it.type === 'events' && <Calendar className="w-4 h-4" />}
                {it.type === 'posts' && <MessageCircle className="w-4 h-4" />}
                {it.type === 'comments' && <MessageCircle className="w-4 h-4" />}
                {it.type === 'debates' && <MessageCircle className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm truncate">{it.title}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-ink-500 flex-shrink-0">
                    {TABS.find((t) => t.key === it.type)?.label}
                  </span>
                </div>
                {it.preview && <p className="text-xs text-ink-500 mt-1 line-clamp-2">{it.preview}</p>}
                <p className="text-[10px] text-ink-400 mt-1">{it.meta}</p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 rounded"><Edit className="w-3.5 h-3.5 text-ink-400" /></button>
                <button className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 rounded"><Trash2 className="w-3.5 h-3.5 text-ink-400 hover:text-rose-500" /></button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
