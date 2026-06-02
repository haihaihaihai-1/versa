import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Plus, Trash2, Copy, ExternalLink, Star, Hash, Sparkles, Loader2, Eye, EyeOff, Folder, Tag, Search } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface LinkItem {
  id: string
  url: string
  title: string
  description: string
  thumbnail: string
  domain: string
  folder: string
  tags: string[]
  favorite: boolean
  private: boolean
  clicks: number
  at: number
}

const STORAGE_KEY = 'versa:linkhub'

function load(): LinkItem[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: LinkItem[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const FOLDERS = ['工作', '学习', '工具', '灵感', '娱乐', '其他']

export function LinkHub() {
  const [links, setLinks] = useState<LinkItem[]>(load())
  const [folder, setFolder] = useState('all')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newFolder, setNewFolder] = useState('工作')
  const [newTags, setNewTags] = useState('')
  const [aiSummary, setAiSummary] = useState('')

  useEffect(() => { save(links) }, [links])

  const extractMeta = (url: string) => {
    const domain = url.replace(/^https?:\/\//, '').split('/')[0]
    return { domain, thumbnail: `https://picsum.photos/seed/${encodeURIComponent(url)}/300/200` }
  }

  const add = () => {
    if (!newUrl.trim()) { toast('请输入链接', 'error'); return }
    const meta = extractMeta(newUrl)
    const link: LinkItem = { id: uid(), url: newUrl, title: newTitle || meta.domain, description: '', thumbnail: meta.thumbnail, domain: meta.domain, folder: newFolder, tags: newTags.split(',').map((t) => t.trim()).filter(Boolean), favorite: false, private: false, clicks: 0, at: Date.now() }
    setLinks([link, ...links])
    setNewUrl(''); setNewTitle(''); setNewTags('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const toggleFav = (id: string) => setLinks(links.map((l) => l.id === id ? { ...l, favorite: !l.favorite } : l))
  const togglePrivate = (id: string) => setLinks(links.map((l) => l.id === id ? { ...l, private: !l.private } : l))
  const incrementClick = (id: string) => setLinks(links.map((l) => l.id === id ? { ...l, clicks: l.clicks + 1 } : l))
  const remove = (id: string) => setLinks(links.filter((l) => l.id !== id))

  const filtered = (() => {
    let out = links
    if (folder !== 'all') out = out.filter((l) => l.folder === folder)
    if (search) out = out.filter((l) => l.title.includes(search) || l.url.includes(search) || l.tags.some((t) => t.includes(search)))
    return out.sort((a, b) => Number(b.favorite) - Number(a.favorite) || b.at - a.at)
  })()

  const folderStats = FOLDERS.map((f) => ({ name: f, count: links.filter((l) => l.folder === f).length }))
  const totalClicks = links.reduce((s, l) => s + l.clicks, 0)
  const totalFav = links.filter((l) => l.favorite).length

  const copy = (url: string) => {
    navigator.clipboard?.writeText(url)
    toast('已复制', 'success')
  }

  const runAI = async (l: LinkItem) => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setActiveId(l.id)
    setLoading(true)
    try {
      const result = await aiComplete(`为链接 "${l.title}" (${l.url}) 生成 30-50 字摘要`, '你是 Versa 链接摘要助手, 简洁专业, 中文')
      setAiSummary(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const active = links.find((l) => l.id === activeId)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="w-5 h-5" />
          <h2 className="text-lg font-bold">链接中心</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">收藏 · 文件夹 · 统计</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{links.length}</p>
            <p className="text-[10px] opacity-80">链接</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{totalClicks}</p>
            <p className="text-[10px] opacity-80">点击</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{totalFav}</p>
            <p className="text-[10px] opacity-80">收藏</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
        </div>
        <button onClick={() => setAdding(true)} className="px-3 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFolder('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', folder === 'all' ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
          📂 全部 ({links.length})
        </button>
        {FOLDERS.map((f) => (
          <button key={f} onClick={() => setFolder(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', folder === f ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            📁 {f} ({links.filter((l) => l.folder === f).length})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {filtered.length === 0 ? (
          <div className="col-span-full text-center py-8 text-ink-500">
            <Link2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有链接</p>
          </div>
        ) : filtered.map((l) => (
          <motion.div key={l.id} whileHover={{ y: -2 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
            <a href={l.url} target="_blank" rel="noreferrer" onClick={() => incrementClick(l.id)} className="block">
              <div className="relative aspect-video">
                <img src={l.thumbnail} alt={l.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute top-1 right-1 flex gap-0.5">
                  {l.private && <span className="w-5 h-5 rounded bg-ink-900/60 backdrop-blur flex items-center justify-center text-[8px]">🔒</span>}
                  {l.favorite && <span className="w-5 h-5 rounded bg-amber-500 flex items-center justify-center text-[8px]">⭐</span>}
                </div>
                <div className="absolute bottom-1 left-1 right-1">
                  <p className="text-[10px] text-white font-semibold line-clamp-1">{l.title}</p>
                </div>
              </div>
            </a>
            <div className="p-1.5">
              <p className="text-[9px] text-ink-500 truncate">{l.domain}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-[8px] text-ink-400 flex-1">{l.clicks} 点击</span>
                <button onClick={() => toggleFav(l.id)} className={cn('w-5 h-5 rounded flex items-center justify-center', l.favorite ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  <span className="text-[8px]">{l.favorite ? '⭐' : '☆'}</span>
                </button>
                <button onClick={() => copy(l.url)} className="w-5 h-5 rounded bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
                  <Copy className="w-2.5 h-2.5" />
                </button>
                <button onClick={() => runAI(l)} className="w-5 h-5 rounded bg-cyan-500 text-white flex items-center justify-center">
                  <Sparkles className="w-2.5 h-2.5" />
                </button>
              </div>
              {l.tags.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap">
                  {l.tags.slice(0, 2).map((t) => <span key={t} className="text-[8px] px-1 py-0.5 rounded bg-ink-100 dark:bg-ink-800">#{t}</span>)}
                </div>
              )}
              {aiSummary && activeId === l.id && (
                <p className="text-[9px] text-cyan-700 dark:text-cyan-300 mt-1 leading-relaxed">{aiSummary}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">添加链接</h3>
            <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://..." className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="标题 (可选, 自动用域名)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <select value={newFolder} onChange={(e) => setNewFolder(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm">
              {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="标签 (逗号分隔)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
