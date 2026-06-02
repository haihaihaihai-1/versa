import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bookmark, Plus, Trash2, Search, Tag, Star, ExternalLink, Sparkles, Loader2, Globe, Link2, FileText, Video, Image as ImageIcon, Lock, Eye } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface BookmarkItem {
  id: string
  type: 'article' | 'video' | 'image' | 'link' | 'note'
  title: string
  url?: string
  content?: string
  thumbnail?: string
  description: string
  tags: string[]
  folder: string
  favorite: boolean
  archived: boolean
  read: boolean
  at: number
}

const STORAGE_KEY = 'versa:bookmarks'

function load(): BookmarkItem[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'b1', type: 'article', title: '深入理解 React 19 的新特性', url: 'https://react.dev', description: 'React 19 带来了 useFormStatus、useOptimistic 等新 hook, 深入解析', tags: ['react', '前端', '技术'], folder: '技术', favorite: true, archived: false, read: false, at: Date.now() - 86400000 },
    { id: 'b2', type: 'video', title: 'Claude 4 完全指南', url: 'https://youtube.com', thumbnail: 'https://picsum.photos/seed/v1/300/200', description: '从入门到精通 Claude 4 的 1 小时完整教程', tags: ['AI', '教程'], folder: '学习', favorite: true, archived: false, read: true, at: Date.now() - 86400000 * 3 },
    { id: 'b3', type: 'note', title: '灵感速记: AI 工具的 5 个应用场景', content: '1. 内容创作\n2. 代码辅助\n3. 数据分析\n4. 翻译\n5. 客服', description: '突然想到的好点子', tags: ['灵感', 'AI'], folder: '灵感', favorite: false, archived: false, read: false, at: Date.now() - 3600000 },
    { id: 'b4', type: 'link', title: 'Tailwind 4 发布说明', url: 'https://tailwindcss.com', description: '新版本性能提升 + 新的 @theme 指令', tags: ['css', '设计'], folder: '技术', favorite: false, archived: false, read: true, at: Date.now() - 86400000 * 7 },
  ]
}
function save(d: BookmarkItem[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const TYPE_META = {
  article: { label: '文章', icon: FileText, color: 'from-blue-500 to-indigo-500' },
  video: { label: '视频', icon: Video, color: 'from-rose-500 to-pink-500' },
  image: { label: '图片', icon: ImageIcon, color: 'from-violet-500 to-purple-500' },
  link: { label: '链接', icon: Link2, color: 'from-cyan-500 to-blue-500' },
  note: { label: '笔记', icon: FileText, color: 'from-amber-500 to-orange-500' },
} as const

export function BookmarkPlus() {
  const [items, setItems] = useState<BookmarkItem[]>(load())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'favorite' | 'archived'>('all')
  const [folder, setFolder] = useState<string>('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [newType, setNewType] = useState<BookmarkItem['type']>('link')
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newTags, setNewTags] = useState('')
  const [newFolder, setNewFolder] = useState('默认')

  useEffect(() => { save(items) }, [items])

  const folders = Array.from(new Set(items.map((i) => i.folder)))

  const filtered = (() => {
    let out = items
    if (filter === 'unread') out = out.filter((i) => !i.read && !i.archived)
    else if (filter === 'favorite') out = out.filter((i) => i.favorite && !i.archived)
    else if (filter === 'archived') out = out.filter((i) => i.archived)
    else out = out.filter((i) => !i.archived)
    if (folder !== 'all') out = out.filter((i) => i.folder === folder)
    if (search) out = out.filter((i) => i.title.includes(search) || i.description.includes(search) || i.tags.some((t) => t.includes(search)))
    return out.sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.at - a.at)
  })()

  const add = () => {
    if (!newTitle.trim()) { toast('请填写标题', 'error'); return }
    const b: BookmarkItem = { id: uid(), type: newType, title: newTitle, url: newUrl, description: newDesc, tags: newTags.split(',').map((t) => t.trim()).filter(Boolean), folder: newFolder, favorite: false, archived: false, read: false, at: Date.now() }
    setItems([b, ...items])
    setNewTitle(''); setNewUrl(''); setNewDesc(''); setNewTags('')
    setAdding(false)
    toast('已收藏', 'success')
  }

  const toggleRead = (id: string) => setItems(items.map((i) => i.id === id ? { ...i, read: !i.read } : i))
  const toggleFav = (id: string) => setItems(items.map((i) => i.id === id ? { ...i, favorite: !i.favorite } : i))
  const toggleArchive = (id: string) => setItems(items.map((i) => i.id === id ? { ...i, archived: !i.archived } : i))
  const remove = (id: string) => setItems(items.filter((i) => i.id !== id))

  const runAI = async (b: BookmarkItem) => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setActiveId(b.id)
    setLoading(true)
    try {
      const result = await aiComplete(`基于标题"${b.title}"和描述"${b.description}"生成 30-50 字的摘要`, '你是 Versa 内容摘要助手, 简洁专业, 中文')
      setAiSummary(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const stats = {
    total: items.length,
    unread: items.filter((i) => !i.read && !i.archived).length,
    fav: items.filter((i) => i.favorite).length,
    folders: folders.length,
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Bookmark className="w-5 h-5" />
          <h2 className="text-lg font-bold">收藏增强</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">文章/视频/链接/笔记 · 全文搜索</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold">{stats.total}</p>
            <p className="text-[9px] opacity-80">总</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold">{stats.unread}</p>
            <p className="text-[9px] opacity-80">未读</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold">{stats.fav}</p>
            <p className="text-[9px] opacity-80">星标</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold">{stats.folders}</p>
            <p className="text-[9px] opacity-80">文件夹</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
        </div>
        <button onClick={() => setAdding(true)} className="px-3 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />新增
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'unread', 'favorite', 'archived'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'unread' ? '未读' : f === 'favorite' ? '⭐ 星标' : '🗄️ 归档'}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFolder('all')} className={cn('px-3 h-7 rounded-full text-[10px] font-semibold flex-shrink-0', folder === 'all' ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
          📂 全部 ({items.filter((i) => !i.archived).length})
        </button>
        {folders.map((f) => (
          <button key={f} onClick={() => setFolder(f)} className={cn('px-3 h-7 rounded-full text-[10px] font-semibold flex-shrink-0', folder === f ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            📁 {f} ({items.filter((i) => i.folder === f && !i.archived).length})
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Bookmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有匹配的收藏</p>
          </div>
        ) : filtered.map((b) => {
          const Meta = TYPE_META[b.type]
          const Icon = Meta.icon
          return (
            <motion.div key={b.id} whileHover={{ y: -1 }} onClick={() => { setActiveId(b.id); if (!b.read) toggleRead(b.id) }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden cursor-pointer">
              <div className="flex items-start gap-2 p-2.5">
                {b.thumbnail ? (
                  <img src={b.thumbnail} alt={b.title} className="w-16 h-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', Meta.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-semibold line-clamp-1', b.read && 'opacity-60')}>{b.title}</p>
                  <p className="text-[10px] text-ink-500 line-clamp-1">{b.description}</p>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {b.tags.slice(0, 2).map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800">#{t}</span>)}
                    <span className="text-[9px] text-ink-400 ml-auto">{formatTimeAgo(new Date(b.at).toISOString())}</span>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleFav(b.id) }} className="text-amber-500">
                  <Star className={cn('w-3.5 h-3.5', b.favorite ? 'fill-amber-400' : 'text-ink-300')} />
                </button>
              </div>
              {activeId === b.id && (
                <div className="border-t border-ink-200/60 dark:border-ink-800/60 p-2 space-y-2">
                  {b.url && (
                    <a href={b.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-cyan-500 truncate">
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />{b.url}
                    </a>
                  )}
                  <div className="flex gap-1.5">
                    <button onClick={() => runAI(b)} disabled={loading} className="flex-1 h-7 rounded bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-semibold flex items-center justify-center gap-1">
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 摘要
                    </button>
                    <button onClick={() => toggleArchive(b.id)} className="h-7 px-2 rounded bg-ink-100 dark:bg-ink-800 text-[10px]">{b.archived ? '取消' : '归档'}</button>
                    <button onClick={() => remove(b.id)} className="h-7 px-2 rounded bg-rose-500 text-white text-[10px]">删除</button>
                  </div>
                  {aiSummary && activeId === b.id && (
                    <div className="bg-cyan-50/40 dark:bg-cyan-900/20 rounded p-2 border border-cyan-200/40">
                      <p className="text-[10px] leading-relaxed">{aiSummary}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">添加收藏</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                const M = TYPE_META[k]
                const Icon = M.icon
                return (
                  <button key={k} onClick={() => setNewType(k)} className={cn('h-12 rounded-lg flex flex-col items-center justify-center gap-0.5', newType === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-semibold">{M.label}</span>
                  </button>
                )
              })}
            </div>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            {newType === 'link' || newType === 'video' ? <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" /> : null}
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="描述" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="标签 (逗号分隔)" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={newFolder} onChange={(e) => setNewFolder(e.target.value)} placeholder="文件夹" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
