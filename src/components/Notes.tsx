import { useState, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, X, Trash2, Edit3, Save, Calendar, Tag, FolderOpen, Bold, Italic, List, ListOrdered, Quote, Code, Link2, Hash, Eye, EyeOff } from 'lucide-react'
import { cn, formatTimeAgo, uid } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

const STORAGE_KEY = 'versa:notes'

export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  folder?: string
  pinned: boolean
  createdAt: number
  updatedAt: number
}

const DEFAULT_FOLDERS = ['想法', '购物', '阅读', '灵感', '其他']

function loadNotes(): Note[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  const now = Date.now()
  return [
    {
      id: 'demo1',
      title: '618 购物清单灵感',
      content: '# 想买什么\n\n- iPhone 16 Pro\n- 新的 AirPods Pro\n- 小米空气净化器\n\n## 重点关注\n\n- 价格曲线\n- 是否有满减券',
      tags: ['购物', '618'],
      folder: '购物',
      pinned: true,
      createdAt: now - 86400000 * 2,
      updatedAt: now - 3600000,
    },
    {
      id: 'demo2',
      title: 'Versa 优化想法',
      content: '## 想法\n\n- 增加深色模式快捷键\n- 全局命令面板\n- AI 写作模板',
      tags: ['Versa', '产品'],
      folder: '想法',
      pinned: false,
      createdAt: now - 86400000 * 5,
      updatedAt: now - 86400000,
    },
  ]
}

function saveNotes(notes: Note[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notes)) } catch {}
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-2">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-2 mt-4">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mb-1 mt-3">$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-sm font-mono">$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-nova-500 hover:underline" target="_blank">$1</a>')
    .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
    .replace(/^> (.*$)/gm, '<blockquote class="border-l-4 border-nova-300 pl-3 my-1 italic text-ink-600 dark:text-ink-300">$1</blockquote>')
    .replace(/\n/g, '<br/>')
}

interface Props {
  compact?: boolean
}

export function Notes({ compact = false }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [folder, setFolder] = useState<string>('all')
  const [previewMode, setPreviewMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const loaded = loadNotes()
    setNotes(loaded)
    if (loaded.length > 0) setActiveId(loaded[0].id)
  }, [])

  useEffect(() => {
    if (notes.length > 0) saveNotes(notes)
  }, [notes])

  const active = notes.find((n) => n.id === activeId)

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (folder !== 'all' && n.folder !== folder) return false
      if (search && !`${n.title} ${n.content} ${n.tags.join(' ')}`.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [notes, search, folder])

  const create = () => {
    const n: Note = {
      id: uid('n'),
      title: '新笔记',
      content: '',
      tags: [],
      folder: '想法',
      pinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setNotes((arr) => [n, ...arr])
    setActiveId(n.id)
    setEditTitle(n.title)
  }

  const update = (patch: Partial<Note>) => {
    setNotes((arr) => arr.map((n) => (n.id === activeId ? { ...n, ...patch, updatedAt: Date.now() } : n)))
  }

  const remove = (id: string) => {
    if (!confirm('确定要删除这条笔记吗？')) return
    setNotes((arr) => arr.filter((n) => n.id !== id))
    if (activeId === id) setActiveId(null)
    toast('笔记已删除', 'success')
  }

  const togglePin = (id: string) => {
    setNotes((arr) => arr.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)))
  }

  const insertMd = (before: string, after = '') => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = ta.value
    const selected = text.substring(start, end)
    const newText = text.substring(0, start) + before + selected + after + text.substring(end)
    update({ content: newText })
    setTimeout(() => {
      ta.focus()
      ta.selectionStart = start + before.length
      ta.selectionEnd = start + before.length + selected.length
    }, 0)
  }

  const folders = useMemo(() => {
    const set = new Set<string>(DEFAULT_FOLDERS)
    notes.forEach((n) => n.folder && set.add(n.folder))
    return Array.from(set)
  }, [notes])

  if (compact) {
    return (
      <div className="space-y-2">
        {notes.slice(0, 5).map((n) => (
          <div
            key={n.id}
            onClick={() => setActiveId(n.id)}
            className="p-2 rounded-lg bg-white/60 dark:bg-ink-900/40 hover:bg-ink-100 dark:hover:bg-ink-800/50 cursor-pointer"
          >
            <div className="text-sm font-medium truncate flex items-center gap-1">
              {n.pinned && <span className="text-amber-500">📌</span>}
              {n.title}
            </div>
            <div className="text-xs text-ink-500 line-clamp-1">{n.content.replace(/[#*`]/g, '')}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-12rem)] min-h-[500px]">
      {/* 列表 */}
      <div className="bg-white/60 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-ink-200 dark:border-ink-800 space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={create}
              className="flex-1 px-3 h-9 rounded-lg bg-gradient-to-r from-nova-500 to-pink-500 text-white text-sm font-semibold flex items-center gap-1 justify-center hover:scale-[1.02] transition"
            >
              <Plus className="w-4 h-4" /> 新建
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索笔记..."
              className="w-full pl-8 pr-2 h-8 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:bg-white dark:focus:bg-ink-900"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setFolder('all')}
              className={cn('text-[10px] px-2 py-0.5 rounded-full', folder === 'all' ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
            >
              全部
            </button>
            {folders.map((f) => (
              <button
                key={f}
                onClick={() => setFolder(f)}
                className={cn('text-[10px] px-2 py-0.5 rounded-full', folder === f ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-ink-500 text-sm">
              {search ? '无匹配笔记' : '暂无笔记'}
            </div>
          ) : (
            filtered
              .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
              .map((n) => (
                <div
                  key={n.id}
                  onClick={() => setActiveId(n.id)}
                  className={cn(
                    'p-3 border-b border-ink-100 dark:border-ink-800/50 cursor-pointer hover:bg-ink-50 dark:hover:bg-ink-800/30',
                    activeId === n.id && 'bg-nova-50/50 dark:bg-nova-950/30 border-l-4 border-l-nova-500'
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    {n.pinned && <span className="text-amber-500 text-xs">📌</span>}
                    <div className="font-medium text-sm truncate flex-1">{n.title}</div>
                  </div>
                  <div className="text-xs text-ink-500 line-clamp-2 mt-0.5">{n.content.replace(/[#*`>]/g, '').slice(0, 60)}</div>
                  <div className="text-[10px] text-ink-400 mt-1 flex items-center gap-1.5">
                    <span>{formatTimeAgo(new Date(n.updatedAt).toISOString())}</span>
                    {n.tags.slice(0, 2).map((t) => (
                      <span key={t} className="text-nova-500">#{t}</span>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* 编辑器 */}
      <div className="lg:col-span-2 bg-white/60 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 flex flex-col overflow-hidden">
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-ink-500 text-sm">
            <div className="text-center">
              <Edit3 className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>选择或新建一条笔记</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-3 border-b border-ink-200 dark:border-ink-800 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={active.title}
                  onChange={(e) => update({ title: e.target.value })}
                  className="flex-1 bg-transparent text-lg font-bold outline-none"
                  placeholder="标题"
                />
                <button
                  onClick={() => togglePin(active.id)}
                  className={cn('p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800', active.pinned && 'text-amber-500')}
                  title="置顶"
                >
                  📌
                </button>
                <button
                  onClick={() => setPreviewMode((v) => !v)}
                  className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"
                  title={previewMode ? '编辑' : '预览'}
                >
                  {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => remove(active.id)}
                  className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-debate-500"
                  title="删除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={active.folder}
                  onChange={(e) => update({ folder: e.target.value })}
                  className="bg-ink-100 dark:bg-ink-800 rounded px-2 py-0.5 text-xs outline-none"
                >
                  {DEFAULT_FOLDERS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <input
                  value={active.tags.join(', ')}
                  onChange={(e) => update({ tags: e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean) })}
                  placeholder="标签 (逗号分隔)"
                  className="flex-1 bg-ink-100 dark:bg-ink-800 rounded px-2 py-0.5 text-xs outline-none"
                />
              </div>
              {!previewMode && (
                <div className="flex items-center gap-1 text-xs text-ink-500">
                  <button onClick={() => insertMd('**', '**')} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded" title="粗体">
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => insertMd('*', '*')} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded" title="斜体">
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => insertMd('\n- ')} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded" title="无序列表">
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => insertMd('\n1. ')} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded" title="有序列表">
                    <ListOrdered className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => insertMd('\n> ')} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded" title="引用">
                    <Quote className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => insertMd('`', '`')} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded" title="代码">
                    <Code className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => insertMd('[', '](url)')} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded" title="链接">
                    <Link2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => insertMd('\n# ')} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded" title="H1">
                    H1
                  </button>
                  <button onClick={() => insertMd('\n## ')} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded" title="H2">
                    H2
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {previewMode ? (
                <div
                  className="prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(active.content) }}
                />
              ) : (
                <textarea
                  ref={textareaRef}
                  value={active.content}
                  onChange={(e) => update({ content: e.target.value })}
                  placeholder="开始写笔记...支持 Markdown 语法"
                  className="w-full h-full bg-transparent outline-none resize-none text-sm leading-relaxed font-mono"
                />
              )}
            </div>
            <div className="px-4 py-2 border-t border-ink-200 dark:border-ink-800 text-xs text-ink-500 flex items-center justify-between">
              <span>最后编辑: {formatTimeAgo(new Date(active.updatedAt).toISOString())}</span>
              <span>{active.content.length} 字</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
