import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, Plus, Trash2, ChevronRight, Star, Heart, Tag, X } from 'lucide-react'
import { cn, uid, formatNumber } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Wishlist {
  id: string
  name: string
  emoji: string
  color: string
  items: { id: string; title: string; description: string; priority: 'low' | 'med' | 'high'; completed: boolean; addedAt: number }[]
}

const STORAGE_KEY = 'versa:wishlist'

function load(): Wishlist[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'w1', name: '想买', emoji: '🛍️', color: 'from-rose-500 to-pink-500', items: [
      { id: 'i1', title: 'iPhone 16 Pro', description: '256G 沙漠金, 等 618', priority: 'high', completed: false, addedAt: Date.now() - 86400000 * 3 },
      { id: 'i2', title: 'AirPods Pro 2', description: '替换旧的', priority: 'med', completed: false, addedAt: Date.now() - 86400000 * 5 },
    ] },
    { id: 'w2', name: '想做', emoji: '✨', color: 'from-violet-500 to-purple-500', items: [
      { id: 'i3', title: '学吉他', description: '一直想学的乐器', priority: 'low', completed: false, addedAt: Date.now() - 86400000 * 7 },
    ] },
    { id: 'w3', name: '想看', emoji: '📚', color: 'from-amber-500 to-orange-500', items: [
      { id: 'i4', title: '《三体》全集', description: '一直没时间看', priority: 'med', completed: true, addedAt: Date.now() - 86400000 * 30 },
    ] },
  ]
}
function save(d: Wishlist[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const PRIORITY_META = {
  low: { label: '低', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30' },
  med: { label: '中', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' },
  high: { label: '高', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' },
} as const

export function WishlistBoard() {
  const [lists, setLists] = useState<Wishlist[]>(load())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'med' | 'high'>('med')
  const [newListOpen, setNewListOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [newListEmoji, setNewListEmoji] = useState('📌')
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(lists) }, [lists])

  const active = lists.find((l) => l.id === activeId) || lists[0]
  const totalItems = lists.reduce((s, l) => s + l.items.length, 0)
  const completedItems = lists.reduce((s, l) => s + l.items.filter((i) => i.completed).length, 0)
  const highPriority = lists.flatMap((l) => l.items).filter((i) => i.priority === 'high' && !i.completed).length

  const addItem = () => {
    if (!active || !newTitle.trim()) { toast('请填写标题', 'error'); return }
    const it = { id: uid(), title: newTitle, description: newDesc, priority: newPriority, completed: false, addedAt: Date.now() }
    setLists(lists.map((l) => l.id === active.id ? { ...l, items: [it, ...l.items] } : l))
    setNewTitle(''); setNewDesc('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const toggleItem = (listId: string, itemId: string) => {
    setLists(lists.map((l) => l.id === listId ? { ...l, items: l.items.map((i) => i.id === itemId ? { ...i, completed: !i.completed } : i) } : l))
  }

  const removeItem = (listId: string, itemId: string) => {
    setLists(lists.map((l) => l.id === listId ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l))
  }

  const addList = () => {
    if (!newListName.trim()) { toast('请填写名称', 'error'); return }
    const l: Wishlist = { id: uid(), name: newListName, emoji: newListEmoji, color: 'from-blue-500 to-indigo-500', items: [] }
    setLists([l, ...lists])
    setNewListName(''); setNewListEmoji('📌')
    setNewListOpen(false)
    setActiveId(l.id)
    toast('列表已创建', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const items = lists.flatMap((l) => l.items).slice(0, 10).map((i) => i.title).join(', ')
      const result = await aiComplete(`基于用户愿望清单 [${items}] 推荐 3 个互补的愿望 (50-80 字)`, '你是 Versa 生活方式顾问, 简洁有创意, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">愿望看板</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">分类 · 优先级 · 进度</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{totalItems}</p>
            <p className="text-[10px] opacity-80">总项目</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{completedItems}</p>
            <p className="text-[10px] opacity-80">已完成</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{highPriority}</p>
            <p className="text-[10px] opacity-80">高优先级</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {lists.map((l) => (
          <button key={l.id} onClick={() => setActiveId(l.id)} className={cn('h-9 px-3 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0', activeId === l.id || (!activeId && l.id === active?.id) ? `bg-gradient-to-r ${l.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            <span>{l.emoji}</span>{l.name} <span className="opacity-70">({l.items.filter((i) => !i.completed).length})</span>
          </button>
        ))}
        <button onClick={() => setNewListOpen(true)} className="h-9 px-3 rounded-full bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1 flex-shrink-0">
          + 新列表
        </button>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加愿望
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI
        </button>
      </div>

      {aiRec && (
        <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed">{aiRec}</p>
        </div>
      )}

      {active && (
        <div className="space-y-1.5">
          {active.items.length === 0 ? (
            <div className="text-center py-8 text-ink-500">
              <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">还没有愿望</p>
            </div>
          ) : active.items.map((i) => {
            const Prio = PRIORITY_META[i.priority]
            return (
              <motion.div key={i.id} whileHover={{ x: 2 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
                <div className="flex items-start gap-2">
                  <button onClick={() => toggleItem(active.id, i.id)} className={cn('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5', i.completed ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300')}>
                    {i.completed && <Star className="w-3 h-3 text-white fill-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={cn('text-sm font-semibold', i.completed && 'line-through opacity-60')}>{i.title}</p>
                      <span className={cn('text-[9px] px-1.5 py-0.5 rounded font-bold', Prio.color)}>{Prio.label}</span>
                    </div>
                    {i.description && <p className="text-[10px] text-ink-500 mt-0.5">{i.description}</p>}
                  </div>
                  <button onClick={() => removeItem(active.id, i.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {adding && active && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">添加愿望 → {active.name}</h3>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="描述 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-3 gap-1.5">
              {(['low', 'med', 'high'] as const).map((p) => (
                <button key={p} onClick={() => setNewPriority(p)} className={cn('h-8 rounded-lg text-xs font-semibold', newPriority === p ? PRIORITY_META[p].color + ' ring-2 ring-violet-500' : 'bg-ink-100 dark:bg-ink-800')}>
                  {PRIORITY_META[p].label}
                </button>
              ))}
            </div>
            <button onClick={addItem} className="w-full h-9 rounded-lg bg-violet-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}

      {newListOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setNewListOpen(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">新列表</h3>
            <div className="flex gap-1.5">
              <input value={newListEmoji} onChange={(e) => setNewListEmoji(e.target.value)} maxLength={2} className="w-14 h-9 text-xl text-center rounded-lg bg-ink-50 dark:bg-ink-800 outline-none" />
              <input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="列表名" className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <button onClick={addList} className="w-full h-9 rounded-lg bg-violet-500 text-white text-sm font-semibold">创建</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
