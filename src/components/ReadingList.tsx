import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Plus, Trash2, Check, Star, Sparkles, Loader2, Library, BookMarked, Quote, Calendar, ChevronRight, X } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Book {
  id: string
  title: string
  author: string
  cover: string
  totalPages: number
  currentPage: number
  rating: number
  status: 'want' | 'reading' | 'finished'
  category: 'tech' | 'fiction' | 'business' | 'lifestyle' | 'philosophy'
  notes: { id: string; page: number; text: string; at: number }[]
  startedAt: number
  finishedAt?: number
}

const STORAGE_KEY = 'versa:reading'

function load(): Book[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'b1', title: '原子习惯', author: 'James Clear', cover: 'https://picsum.photos/seed/b1/200/300', totalPages: 320, currentPage: 180, rating: 5, status: 'reading', category: 'lifestyle', startedAt: Date.now() - 86400000 * 7, notes: [
      { id: 'n1', page: 42, text: '"习惯是自我提升的复利"', at: Date.now() - 86400000 * 5 },
      { id: 'n2', page: 95, text: '微习惯的叠加效应, 每天 1% 进步', at: Date.now() - 86400000 * 3 },
    ] },
    { id: 'b2', title: '深入理解计算机系统', author: 'Randal Bryant', cover: 'https://picsum.photos/seed/b2/200/300', totalPages: 800, currentPage: 240, rating: 4, status: 'reading', category: 'tech', startedAt: Date.now() - 86400000 * 14, notes: [] },
    { id: 'b3', title: '百年孤独', author: '加西亚·马尔克斯', cover: 'https://picsum.photos/seed/b3/200/300', totalPages: 360, currentPage: 360, rating: 5, status: 'finished', category: 'fiction', startedAt: Date.now() - 86400000 * 30, finishedAt: Date.now() - 86400000 * 5, notes: [] },
  ]
}
function save(d: Book[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CAT_META = {
  tech: { label: '技术', color: 'bg-blue-500' },
  fiction: { label: '文学', color: 'bg-rose-500' },
  business: { label: '商业', color: 'bg-amber-500' },
  lifestyle: { label: '生活', color: 'bg-emerald-500' },
  philosophy: { label: '哲学', color: 'bg-violet-500' },
} as const

export function ReadingList() {
  const [books, setBooks] = useState<Book[]>(load())
  const [view, setView] = useState<'all' | 'want' | 'reading' | 'finished'>('reading')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAuthor, setNewAuthor] = useState('')
  const [newPages, setNewPages] = useState('300')
  const [noteText, setNoteText] = useState('')
  const [notePage, setNotePage] = useState('')

  useEffect(() => { save(books) }, [books])

  const filtered = (() => {
    if (view === 'all') return books
    return books.filter((b) => b.status === view)
  })()

  const add = () => {
    if (!newTitle.trim() || !newAuthor.trim()) { toast('请填写完整', 'error'); return }
    const b: Book = { id: uid(), title: newTitle, author: newAuthor, cover: `https://picsum.photos/seed/${Date.now()}/200/300`, totalPages: +newPages, currentPage: 0, rating: 0, status: 'want', category: 'lifestyle', notes: [], startedAt: Date.now() }
    setBooks([b, ...books])
    setNewTitle(''); setNewAuthor(''); setNewPages('300'); setAdding(false)
    toast('已添加', 'success')
  }

  const updatePage = (id: string, page: number) => setBooks(books.map((b) => b.id === id ? { ...b, currentPage: Math.max(0, Math.min(b.totalPages, page)), status: page >= b.totalPages ? 'finished' : 'reading', finishedAt: page >= b.totalPages ? Date.now() : b.finishedAt } : b))

  const startRead = (id: string) => setBooks(books.map((b) => b.id === id ? { ...b, status: 'reading', startedAt: Date.now() } : b))

  const remove = (id: string) => setBooks(books.filter((b) => b.id !== id))

  const addNote = (bookId: string) => {
    if (!noteText.trim()) return
    setBooks(books.map((b) => b.id === bookId ? { ...b, notes: [...b.notes, { id: uid(), page: +notePage || b.currentPage, text: noteText, at: Date.now() }] } : b))
    setNoteText(''); setNotePage('')
    toast('笔记已添加', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 3 本 2024-2025 年必读的好书 (50-80 字, 类别不限)', '你是 Versa 阅读顾问, 简洁专业, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const active = books.find((b) => b.id === activeId)
  const reading = books.filter((b) => b.status === 'reading')
  const finished = books.filter((b) => b.status === 'finished').length
  const totalNotes = books.reduce((s, b) => s + b.notes.length, 0)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-lg font-bold">阅读清单</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">在读 · 想读 · 已读 · 笔记</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{reading.length}</p>
            <p className="text-[10px] opacity-80">在读</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{finished}</p>
            <p className="text-[10px] opacity-80">已读</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{totalNotes}</p>
            <p className="text-[10px] opacity-80">笔记</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加书
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI
        </button>
      </div>

      {aiRec && (
        <div className="bg-amber-50/40 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-amber-500"><Sparkles className="w-3.5 h-3.5" />AI 推荐</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiRec}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'want', 'reading', 'finished'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', view === v ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {v === 'all' ? '全部' : v === 'want' ? '想读' : v === 'reading' ? '在读' : '已读'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {filtered.map((b) => {
          const Cat = CAT_META[b.category]
          const progress = (b.currentPage / b.totalPages) * 100
          return (
            <motion.div key={b.id} whileHover={{ y: -2 }} onClick={() => setActiveId(b.id)} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden cursor-pointer">
              <div className="relative aspect-[2/3]">
                <img src={b.cover} alt={b.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className={cn('absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] text-white font-bold', Cat.color)}>{Cat.label}</span>
                {b.status === 'finished' && (
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className="absolute bottom-1.5 left-1.5 right-1.5 text-white">
                  <p className="text-xs font-bold line-clamp-2 leading-tight">{b.title}</p>
                  <p className="text-[9px] opacity-80">{b.author}</p>
                </div>
              </div>
              <div className="p-2">
                <div className="h-1 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden mb-1">
                  <div className={cn('h-full', b.status === 'finished' ? 'bg-emerald-500' : 'bg-amber-500')} style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[9px] text-ink-500">{b.currentPage}/{b.totalPages} 页</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setActiveId(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto">
            <div className="relative h-32 bg-gradient-to-br from-amber-500 to-orange-500">
              <button onClick={() => setActiveId(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"><X className="w-4 h-4" /></button>
              <div className="absolute -bottom-8 left-4 flex items-end gap-3">
                <img src={active.cover} alt={active.title} className="w-16 h-24 rounded-lg border-2 border-white dark:border-ink-900 shadow" />
                <div className="pb-1 text-white">
                  <h3 className="text-base font-bold line-clamp-2">{active.title}</h3>
                  <p className="text-[10px] opacity-80">{active.author}</p>
                </div>
              </div>
            </div>
            <div className="pt-10 p-4 space-y-3">
              <div className="flex items-center gap-1 text-amber-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={cn('w-3.5 h-3.5', i < active.rating ? 'fill-amber-400' : 'text-ink-300')} />
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>进度</span>
                  <span>{active.currentPage}/{active.totalPages} ({Math.round((active.currentPage / active.totalPages) * 100)}%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max={active.totalPages}
                  value={active.currentPage}
                  onChange={(e) => updatePage(active.id, +e.target.value)}
                  className="w-full accent-amber-500"
                />
              </div>
              {active.status === 'want' && (
                <button onClick={() => startRead(active.id)} className="w-full h-9 rounded-lg bg-amber-500 text-white text-sm font-semibold">开始阅读</button>
              )}

              <div>
                <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5"><Quote className="w-3.5 h-3.5" />读书笔记</p>
                <div className="flex gap-1.5">
                  <input type="number" value={notePage} onChange={(e) => setNotePage(e.target.value)} placeholder="页" className="w-16 px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
                  <input value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addNote(active.id)} placeholder="摘录/想法..." className="flex-1 px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
                  <button onClick={() => addNote(active.id)} className="px-2 h-8 rounded bg-amber-500 text-white text-[10px]">+</button>
                </div>
                <div className="space-y-1.5 mt-1.5">
                  {active.notes.map((n) => (
                    <div key={n.id} className="p-2 rounded-lg bg-ink-50 dark:bg-ink-800">
                      <p className="text-[10px] text-amber-500 font-bold">P{n.page}</p>
                      <p className="text-xs">{n.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => remove(active.id)} className="w-full h-8 rounded-lg bg-rose-500 text-white text-xs flex items-center justify-center gap-1">
                <Trash2 className="w-3 h-3" />移除
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">添加书</h3>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="书名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={newAuthor} onChange={(e) => setNewAuthor(e.target.value)} placeholder="作者" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input type="number" value={newPages} onChange={(e) => setNewPages(e.target.value)} placeholder="总页数" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-amber-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
