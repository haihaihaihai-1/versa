import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Plus, Trash2, Sparkles, Loader2, Star, Calendar, Check, Clock, Edit, Award, TrendingUp, User, FileText, Hash } from 'lucide-react'
import { cn, uid, formatNumber } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Book {
  id: string
  title: string
  author: string
  category: 'tech' | 'business' | 'fiction' | 'science' | 'history' | 'biography' | 'self-help' | 'other'
  pages: number
  currentPage: number
  status: 'wishlist' | 'reading' | 'finished' | 'paused'
  rating: 1 | 2 | 3 | 4 | 5
  startDate: string
  finishDate: string
  notes: string
  cover: string
  isArticle: boolean
}

const STORAGE_KEY = 'versa:books-v1'

function load(): Book[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Book[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Book[] {
  return [
    { id: 'b1', title: 'Atomic Habits', author: 'James Clear', category: 'self-help', pages: 320, currentPage: 180, status: 'reading', rating: 5, startDate: '2026-05-01', finishDate: '', notes: '微习惯的力量', cover: 'https://picsum.photos/seed/atomic/200/300', isArticle: false },
    { id: 'b2', title: 'Sapiens', author: 'Yuval Noah Harari', category: 'history', pages: 440, currentPage: 440, status: 'finished', rating: 5, startDate: '2026-03-01', finishDate: '2026-04-20', notes: '人类简史, 印象深刻', cover: 'https://picsum.photos/seed/sapiens/200/300', isArticle: false },
    { id: 'b3', title: 'Deep Learning', author: 'Ian Goodfellow', category: 'science', pages: 800, currentPage: 50, status: 'reading', rating: 4, startDate: '2026-06-01', finishDate: '', notes: '深度学习圣经', cover: 'https://picsum.photos/seed/dlbook/200/300', isArticle: false },
    { id: 'b4', title: '如何阅读一本书', author: '莫提默·艾德勒', category: 'self-help', pages: 280, currentPage: 0, status: 'wishlist', rating: 3, startDate: '', finishDate: '', notes: '', cover: 'https://picsum.photos/seed/read/200/300', isArticle: false },
  ]
}

const CAT_META = {
  tech: { label: '技术', color: 'from-emerald-500 to-teal-500' },
  business: { label: '商业', color: 'from-blue-500 to-cyan-500' },
  fiction: { label: '小说', color: 'from-pink-500 to-rose-500' },
  science: { label: '科学', color: 'from-violet-500 to-purple-500' },
  history: { label: '历史', color: 'from-amber-500 to-orange-500' },
  biography: { label: '传记', color: 'from-cyan-500 to-teal-500' },
  'self-help': { label: '自助', color: 'from-rose-500 to-pink-500' },
  other: { label: '其他', color: 'from-ink-500 to-ink-600' },
} as const

const STATUS_META = {
  wishlist: { label: '想读', color: 'bg-ink-400' },
  reading: { label: '在读', color: 'bg-emerald-500' },
  finished: { label: '已读', color: 'bg-blue-500' },
  paused: { label: '暂缓', color: 'bg-amber-500' },
} as const

export function ReadingList() {
  const [books, setBooks] = useState<Book[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | Book['status']>('reading')
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [category, setCategory] = useState<Book['category']>('tech')
  const [pages, setPages] = useState('300')
  const [isArticle, setIsArticle] = useState(false)

  useEffect(() => { save(books) }, [books])

  const totalBooks = books.length
  const finishedBooks = books.filter((b) => b.status === 'finished').length
  const readingBooks = books.filter((b) => b.status === 'reading').length
  const totalPages = books.reduce((s, b) => s + (b.status === 'finished' ? b.pages : b.currentPage), 0)
  const avgRating = finishedBooks > 0 ? (books.filter((b) => b.status === 'finished').reduce((s, b) => s + b.rating, 0) / finishedBooks).toFixed(1) : '0'

  const filtered = (filter === 'all' ? books : books.filter((b) => b.status === filter)).sort((a, b) => {
    if (a.status === 'reading' && b.status !== 'reading') return -1
    if (b.status === 'reading' && a.status !== 'reading') return 1
    return a.title.localeCompare(b.title)
  })

  const updateProgress = (id: string, delta: number) => {
    setBooks(books.map((b) => {
      if (b.id !== id) return b
      const newPage = Math.max(0, Math.min(b.pages, b.currentPage + delta))
      return { ...b, currentPage: newPage, status: newPage === b.pages ? 'finished' : newPage === 0 ? 'wishlist' : b.status, finishDate: newPage === b.pages && b.status !== 'finished' ? new Date().toISOString().split('T')[0] : b.finishDate }
    }))
  }

  const setStatus = (id: string, status: Book['status']) => {
    setBooks(books.map((b) => b.id === id ? { ...b, status, finishDate: status === 'finished' && !b.finishDate ? new Date().toISOString().split('T')[0] : b.finishDate, startDate: status === 'reading' && !b.startDate ? new Date().toISOString().split('T')[0] : b.startDate } : b))
  }

  const setRating = (id: string, rating: 1 | 2 | 3 | 4 | 5) => {
    setBooks(books.map((b) => b.id === id ? { ...b, rating } : b))
  }

  const remove = (id: string) => setBooks(books.filter((b) => b.id !== id))

  const add = () => {
    if (!title.trim()) { toast('请输入书名', 'error'); return }
    const b: Book = { id: uid(), title, author, category, pages: +pages, currentPage: 0, status: 'wishlist', rating: 3, startDate: '', finishDate: '', notes: '', cover: `https://picsum.photos/seed/${Date.now()}/200/300`, isArticle }
    setBooks([b, ...books])
    setTitle(''); setAuthor(''); setPages('300'); setIsArticle(false)
    setAdding(false)
    toast('已添加', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`用户已读 ${finishedBooks} 本书, 在读 ${readingBooks} 本. 推荐 3 本最近值得读的书 (1 句话/本), 中文`, '你是 Versa 阅读顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-lg font-bold">阅读清单</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">进度追踪 · 评分 · 分类管理</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalBooks}</p>
            <p className="text-[9px] opacity-80">总数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{readingBooks}</p>
            <p className="text-[9px] opacity-80">在读</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{finishedBooks}</p>
            <p className="text-[9px] opacity-80">已读</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalPages}</p>
            <p className="text-[9px] opacity-80">总页数</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加书
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-cyan-50/40 dark:bg-cyan-900/20 rounded-xl p-2 border border-cyan-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['reading', 'wishlist', 'finished', 'paused', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : STATUS_META[f].label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有书</p>
          </div>
        ) : filtered.map((b) => {
          const pct = b.pages > 0 ? (b.currentPage / b.pages) * 100 : 0
          const CM = CAT_META[b.category]
          const SM = STATUS_META[b.status]
          return (
            <motion.div key={b.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-start gap-2">
                <img src={b.cover} alt={b.title} className="w-12 h-16 rounded object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold truncate flex-1">{b.title}</p>
                    <span className={cn('text-[9px] px-1 py-0.5 rounded text-white font-semibold flex-shrink-0', SM.color)}>{SM.label}</span>
                  </div>
                  <p className="text-[10px] text-ink-500 flex items-center gap-1"><User className="w-2.5 h-2.5" />{b.author || '未知'}</p>
                  <p className="text-[10px] text-ink-500">{CM.label} · {b.pages} 页</p>
                  {b.status === 'reading' && (
                    <div className="mt-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                          <div className={cn('h-full bg-gradient-to-r', CM.color)} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-bold">{Math.round(pct)}%</span>
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        <button onClick={() => updateProgress(b.id, -10)} className="px-2 h-6 rounded bg-ink-100 dark:bg-ink-800 text-[10px]">-10</button>
                        <button onClick={() => updateProgress(b.id, 10)} className="px-2 h-6 rounded bg-cyan-500 text-white text-[10px]">+10</button>
                        <button onClick={() => updateProgress(b.id, 50)} className="px-2 h-6 rounded bg-cyan-500 text-white text-[10px]">+50</button>
                        <span className="text-[9px] text-ink-500 ml-auto">{b.currentPage}/{b.pages}</span>
                      </div>
                    </div>
                  )}
                  {b.status === 'finished' && (
                    <div className="mt-1 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} onClick={() => setRating(b.id, s as any)}>
                          <Star className={cn('w-3 h-3', s <= b.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                        </button>
                      ))}
                      {b.finishDate && <span className="text-[9px] text-ink-500 ml-auto">📅 {b.finishDate}</span>}
                    </div>
                  )}
                </div>
                <button onClick={() => remove(b.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
              {b.notes && <p className="text-[10px] text-ink-500 mt-1">💭 {b.notes}</p>}
              <div className="mt-1 flex gap-1">
                {(['wishlist', 'reading', 'paused', 'finished'] as const).map((s) => (
                  <button key={s} onClick={() => setStatus(b.id, s)} className={cn('px-2 h-5 rounded text-[9px] font-semibold', b.status === s ? `${STATUS_META[s].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    {STATUS_META[s].label}
                  </button>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">添加书</h3>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="书名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="作者" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none">
                {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => <option key={k} value={k}>{CAT_META[k].label}</option>)}
              </select>
              <input type="number" value={pages} onChange={(e) => setPages(e.target.value)} placeholder="页数" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isArticle} onChange={(e) => setIsArticle(e.target.checked)} className="rounded" />是文章 (而非书)
            </label>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
