import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { StickyNote, Plus, Trash2, Sparkles, Loader2, Search, Tag, Star, Edit, Link, Hash, Pin, Calendar, FileText, Folder, BookOpen } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  folder: string
  pinned: boolean
  starred: boolean
  linked: string[]
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'versa:notes-v1'

function load(): Note[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Note[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Note[] {
  const now = Date.now()
  return [
    { id: 'n1', title: 'CS50 第 5 周笔记', content: '# 数据结构\n\n- 数组: O(1) 访问, O(n) 插入\n- 链表: O(n) 访问, O(1) 插入\n- 哈希表: 平均 O(1) 所有操作\n- 树: O(log n) 平衡时\n\n## 关键概念\n红黑树, AVL 树, B 树...', tags: ['CS50', '数据结构', '算法'], folder: '编程', pinned: true, starred: true, linked: ['n2'], createdAt: new Date(now - 86400000).toISOString(), updatedAt: new Date(now - 3600000).toISOString() },
    { id: 'n2', title: '深度学习要点', content: '# 神经网络基础\n\n## 激活函数\n- ReLU: max(0, x)\n- Sigmoid: 1/(1+e^-x)\n- Tanh: (e^x - e^-x)/(e^x + e^-x)\n\n## 反向传播\n链式法则求梯度', tags: ['深度学习', 'AI'], folder: '编程', pinned: false, starred: false, linked: ['n1'], createdAt: new Date(now - 172800000).toISOString(), updatedAt: new Date(now - 86400000).toISOString() },
    { id: 'n3', title: '英语单词本', content: '# 高级词汇\n\n1. **ubiquitous** 无处不在的\n2. **ephemeral** 短暂的\n3. **serendipity** 意外的好运\n4. **mellifluous** 悦耳的', tags: ['英语', 'CET6'], folder: '语言', pinned: false, starred: true, linked: [], createdAt: new Date(now - 259200000).toISOString(), updatedAt: new Date(now - 172800000).toISOString() },
  ]
}

function renderMarkdown(text: string): string {
  return text
    .replace(/^### (.*$)/gim, '<h3 class="text-sm font-bold mt-2 mb-1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-base font-bold mt-2 mb-1">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-lg font-bold mt-2 mb-1">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\d+\. (.*$)/gim, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, '<br/>')
}

export function NoteOrganizer() {
  const [notes, setNotes] = useState<Note[]>(load())
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [folderFilter, setFolderFilter] = useState<'all' | string>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id || null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [folder, setFolder] = useState('编程')
  const [pinned, setPinned] = useState(false)

  useEffect(() => { save(notes) }, [notes])

  const folders = Array.from(new Set(notes.map((n) => n.folder)))
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)))
  const totalNotes = notes.length
  const pinnedCount = notes.filter((n) => n.pinned).length
  const starredCount = notes.filter((n) => n.starred).length

  const filtered = notes.filter((n) => {
    if (search && !n.title.includes(search) && !n.content.includes(search)) return false
    if (folderFilter !== 'all' && n.folder !== folderFilter) return false
    if (tagFilter && !n.tags.includes(tagFilter)) return false
    return true
  }).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (b.pinned && !a.pinned) return 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })

  const active = notes.find((n) => n.id === activeId)

  const add = () => {
    if (!title.trim()) { toast('请输入标题', 'error'); return }
    const note: Note = { id: uid(), title, content, tags: tagsStr.split(/[,，]/).map((t) => t.trim()).filter(Boolean), folder, pinned, starred: false, linked: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    setNotes([note, ...notes])
    setActiveId(note.id)
    setTitle(''); setContent(''); setTagsStr(''); setPinned(false)
    setAdding(false)
    toast('已创建', 'success')
  }

  const saveEdit = () => {
    if (!editing) return
    setNotes(notes.map((n) => n.id === editing ? { ...n, title, content, tags: tagsStr.split(/[,，]/).map((t) => t.trim()).filter(Boolean), folder, pinned, updatedAt: new Date().toISOString() } : n))
    setEditing(null)
    setTitle(''); setContent(''); setTagsStr(''); setPinned(false)
    toast('已保存', 'success')
  }

  const startEdit = (note: Note) => {
    setEditing(note.id)
    setTitle(note.title); setContent(note.content); setTagsStr(note.tags.join(',')); setFolder(note.folder); setPinned(note.pinned)
  }

  const remove = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id))
    if (activeId === id) setActiveId(notes[0]?.id || null)
  }

  const togglePin = (id: string) => setNotes(notes.map((n) => n.id === id ? { ...n, pinned: !n.pinned } : n))
  const toggleStar = (id: string) => setNotes(notes.map((n) => n.id === id ? { ...n, starred: !n.starred } : n))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = notes.slice(0, 3).map((n) => n.title).join(', ')
      const result = await aiComplete(`基于用户笔记主题: ${summary}. 给出 1 段 60 字内学习连接建议, 中文`, '你是 Versa 学习顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <StickyNote className="w-5 h-5" />
          <h2 className="text-lg font-bold">知识笔记</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">Markdown · 标签 · 双向链接</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalNotes}</p>
            <p className="text-[9px] opacity-80">笔记</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{folders.length}</p>
            <p className="text-[9px] opacity-80">文件夹</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{allTags.length}</p>
            <p className="text-[9px] opacity-80">标签</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{pinnedCount}</p>
            <p className="text-[9px] opacity-80">置顶</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新建笔记
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-amber-50/40 dark:bg-amber-900/20 rounded-xl p-2 border border-amber-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索标题或内容..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFolderFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', folderFilter === 'all' ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        {folders.map((f) => (
          <button key={f} onClick={() => setFolderFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', folderFilter === f ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            <Folder className="w-3 h-3 inline mr-0.5" />{f}
          </button>
        ))}
      </div>

      {allTags.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {allTags.slice(0, 12).map((t) => (
            <button key={t} onClick={() => setTagFilter(tagFilter === t ? null : t)} className={cn('px-2 h-6 rounded-full text-[10px] font-semibold flex-shrink-0', tagFilter === t ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              <Hash className="w-2.5 h-2.5 inline mr-0.5" />{t}
            </button>
          ))}
        </div>
      )}

      {active ? (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-base font-bold flex-1">{active.title}</h3>
            <button onClick={() => togglePin(active.id)} className={cn('w-6 h-6 rounded flex items-center justify-center', active.pinned ? 'text-amber-500' : 'text-ink-300')}>
              <Pin className={cn('w-3.5 h-3.5', active.pinned && 'fill-current')} />
            </button>
            <button onClick={() => toggleStar(active.id)}>
              <Star className={cn('w-4 h-4', active.starred ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
            </button>
            <button onClick={() => startEdit(active)} className="text-ink-400 hover:text-blue-500 text-xs">
              <Edit className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => remove(active.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
          </div>
          <div className="flex items-center gap-1.5 mb-2 text-[10px] text-ink-500">
            <span className="flex items-center gap-0.5"><Folder className="w-2.5 h-2.5" />{active.folder}</span>
            <span>·</span>
            <span>更新 {formatTimeAgo(active.updatedAt)}</span>
            {active.linked.length > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5"><Link className="w-2.5 h-2.5" />{active.linked.length}</span>
              </>
            )}
          </div>
          {active.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {active.tags.map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-[9px] font-semibold">
                  <Hash className="w-2.5 h-2.5 inline mr-0.5" />{t}
                </span>
              ))}
            </div>
          )}
          <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: renderMarkdown(active.content) }} />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-xs font-semibold">其他笔记</p>
        {filtered.filter((n) => n.id !== activeId).map((n) => (
          <motion.div key={n.id} whileHover={{ y: -1 }} onClick={() => setActiveId(n.id)} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
            <div className="flex items-center gap-2">
              {n.pinned && <Pin className="w-3 h-3 text-amber-500 fill-current" />}
              <p className="text-sm font-semibold truncate flex-1">{n.title}</p>
              {n.starred && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
            </div>
            <p className="text-[10px] text-ink-500 mt-0.5 line-clamp-1">{n.content.replace(/[#*\n\d]+/g, ' ').trim()}</p>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-ink-500">
              <span>{n.folder}</span>
              <span>·</span>
              <span>{formatTimeAgo(n.updatedAt)}</span>
              {n.tags.length > 0 && <span>· {n.tags.length} 标签</span>}
            </div>
          </motion.div>
        ))}
      </div>

      {(adding || editing) && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => { setAdding(false); setEditing(null) }}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">{editing ? '编辑' : '新建'}笔记</h3>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="内容 (支持 Markdown: # 标题, **粗体**, - 列表)" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[200px] font-mono" />
            <div className="grid grid-cols-2 gap-1.5">
              <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="文件夹" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="标签 (逗号)" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="rounded" />置顶
            </label>
            <button onClick={editing ? saveEdit : add} className="w-full h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold">{editing ? '保存' : '创建'}</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
