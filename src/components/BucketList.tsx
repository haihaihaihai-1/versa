import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Compass, Sparkles, Loader2, Plus, Trash2, MapPin, Camera, Star, Heart, Calendar, Edit3, ChevronRight } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface BucketItem {
  id: string
  title: string
  type: 'place' | 'experience' | 'food' | 'skill' | 'item' | 'goal'
  emoji: string
  description: string
  target: string
  deadline?: string
  priority: 'low' | 'med' | 'high'
  progress: number
  notes: string
  completed: boolean
  completedAt?: number
  images: string[]
  at: number
}

const STORAGE_KEY = 'versa:bucket'

function load(): BucketItem[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [
  { id: 'b1', title: '去冰岛看极光', type: 'place', emoji: '🌌', description: '冬天去冰岛, 住玻璃屋', target: '冰岛 雷克雅未克', deadline: '2026-12-15', priority: 'high', progress: 30, notes: '需要提前 3 个月订机票', completed: false, images: [], at: Date.now() - 86400000 * 30 },
  { id: 'b2', title: '学吉他', type: 'skill', emoji: '🎸', description: '从零开始学', target: '掌握 5 首完整歌曲', priority: 'med', progress: 15, notes: '每周练 2 次', completed: false, images: [], at: Date.now() - 86400000 * 60 },
  { id: 'b3', title: '跑完半马', type: 'goal', emoji: '🏃', description: '完成 21 公里', target: '上海马拉松', deadline: '2026-10-15', priority: 'high', progress: 50, notes: '已能跑 10km', completed: false, images: [], at: Date.now() - 86400000 * 90 },
] }
function save(d: BucketItem[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const TYPE_META = {
  place: { label: '地点', color: 'from-cyan-500 to-blue-500', emoji: '📍' },
  experience: { label: '体验', color: 'from-violet-500 to-purple-500', emoji: '✨' },
  food: { label: '美食', color: 'from-orange-500 to-rose-500', emoji: '🍜' },
  skill: { label: '技能', color: 'from-emerald-500 to-teal-500', emoji: '💪' },
  item: { label: '物品', color: 'from-amber-500 to-orange-500', emoji: '🛍️' },
  goal: { label: '目标', color: 'from-rose-500 to-pink-500', emoji: '🎯' },
} as const

const PRIORITY_META = { low: { label: '低', color: 'bg-blue-500' }, med: { label: '中', color: 'bg-amber-500' }, high: { label: '高', color: 'bg-rose-500' } } as const

export function BucketList() {
  const [items, setItems] = useState<BucketItem[]>(load())
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | keyof typeof TYPE_META>('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newType, setNewType] = useState<BucketItem['type']>('place')
  const [newEmoji, setNewEmoji] = useState('✨')
  const [newTarget, setNewTarget] = useState('')
  const [newDeadline, setNewDeadline] = useState('')

  useEffect(() => { save(items) }, [items])

  const filtered = (() => {
    let out = items
    if (filter === 'active') out = out.filter((i) => !i.completed)
    else if (filter === 'completed') out = out.filter((i) => i.completed)
    else if (filter !== 'all') out = out.filter((i) => i.type === filter)
    return out.sort((a, b) => Number(a.completed) - Number(b.completed) || Number(b.priority === 'high') - Number(a.priority === 'high'))
  })()

  const stats = {
    total: items.length,
    active: items.filter((i) => !i.completed).length,
    completed: items.filter((i) => i.completed).length,
    avgProgress: items.length > 0 ? Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length) : 0,
  }

  const setProgress = (id: string, p: number) => setItems(items.map((i) => i.id === id ? { ...i, progress: Math.max(0, Math.min(100, p)) } : i))
  const toggleComplete = (id: string) => setItems(items.map((i) => i.id === id ? { ...i, completed: !i.completed, completedAt: !i.completed ? Date.now() : undefined, progress: !i.completed ? 100 : i.progress } : i))
  const remove = (id: string) => setItems(items.filter((i) => i.id !== id))

  const add = () => {
    if (!newTitle.trim()) { toast('请填写标题', 'error'); return }
    const b: BucketItem = { id: uid(), title: newTitle, type: newType, emoji: newEmoji, description: '', target: newTarget, deadline: newDeadline || undefined, priority: 'med', progress: 0, notes: '', completed: false, images: [], at: Date.now() }
    setItems([b, ...items])
    setNewTitle(''); setNewTarget(''); setNewDeadline(''); setNewEmoji('✨')
    setAdding(false)
    toast('已加入愿望', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 5 个人生必做事项 (50-80 字, 含 emoji)', '你是 Versa 人生导师, 简洁实用, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Compass className="w-5 h-5" />
          <h2 className="text-lg font-bold">人生愿望清单</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">地点 · 体验 · 技能 · 目标</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{stats.total}</p>
            <p className="text-[9px] opacity-80">总</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{stats.active}</p>
            <p className="text-[9px] opacity-80">进行</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{stats.completed}</p>
            <p className="text-[9px] opacity-80">完成</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{stats.avgProgress}%</p>
            <p className="text-[9px] opacity-80">进度</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新增愿望
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiRec && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiRec}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'all' ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        <button onClick={() => setFilter('active')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'active' ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>进行中</button>
        <button onClick={() => setFilter('completed')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'completed' ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>已完成</button>
        {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === k ? `bg-gradient-to-r ${TYPE_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {TYPE_META[k].emoji} {TYPE_META[k].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-ink-500">
          <Compass className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有愿望</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((b) => {
            const Meta = TYPE_META[b.type]
            const Prio = PRIORITY_META[b.priority]
            return (
              <motion.div key={b.id} whileHover={{ y: -1 }} onClick={() => setActiveId(b.id)} className={cn('rounded-2xl p-3 border cursor-pointer', b.completed ? 'bg-emerald-50/40 dark:bg-emerald-900/20 border-emerald-300' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br flex-shrink-0', Meta.color)}>
                    {b.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-bold truncate', b.completed && 'line-through opacity-60')}>{b.title}</p>
                    <p className="text-[10px] text-ink-500">{Meta.label} · {b.target || '未指定'} {b.deadline && `· 📅 ${b.deadline}`}</p>
                  </div>
                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded text-white font-bold flex-shrink-0', Prio.color)}>{Prio.label}</span>
                </div>
                <div>
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span>进度</span>
                    <span>{b.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                    <div className={cn('h-full bg-gradient-to-r', Meta.color)} style={{ width: `${b.progress}%` }} />
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {activeId && (() => {
        const b = items.find((x) => x.id === activeId)
        if (!b) return null
        const Meta = TYPE_META[b.type]
        return (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setActiveId(null)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
              <div className={cn('rounded-2xl p-4 text-white text-center bg-gradient-to-br', Meta.color)}>
                <p className="text-5xl mb-1">{b.emoji}</p>
                <h3 className="text-xl font-bold">{b.title}</h3>
                <p className="text-xs opacity-90 mt-1">{Meta.label} · {b.target}</p>
                {b.deadline && <p className="text-[10px] opacity-80">📅 {b.deadline}</p>}
              </div>
              <div>
                <p className="text-xs font-bold mb-1">进度 {b.progress}%</p>
                <input type="range" min="0" max="100" value={b.progress} onChange={(e) => setProgress(b.id, +e.target.value)} className="w-full accent-rose-500" />
              </div>
              <textarea value={b.notes} onChange={(e) => setItems(items.map((x) => x.id === b.id ? { ...x, notes: e.target.value } : x))} placeholder="我的计划/笔记..." rows={2} className="w-full px-2 py-1.5 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none resize-none" />
              <div className="flex gap-1.5">
                <button onClick={() => toggleComplete(b.id)} className={cn('flex-1 h-9 rounded-lg text-sm font-bold', b.completed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')}>
                  {b.completed ? '✓ 已完成' : '标记完成'}
                </button>
                <button onClick={() => remove(b.id)} className="h-9 px-3 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">删除</button>
              </div>
            </motion.div>
          </div>
        )
      })()}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">新增愿望</h3>
            <div className="flex gap-1.5">
              <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={2} className="w-14 h-9 text-xl text-center rounded-lg bg-ink-50 dark:bg-ink-800 outline-none" />
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="标题" className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <input value={newTarget} onChange={(e) => setNewTarget(e.target.value)} placeholder="具体目标 (如 冰岛)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => (
                <button key={k} onClick={() => { setNewType(k); setNewEmoji(TYPE_META[k].emoji) }} className={cn('h-9 rounded-lg flex flex-col items-center justify-center', newType === k ? `bg-gradient-to-br ${TYPE_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                  <span className="text-base">{TYPE_META[k].emoji}</span>
                  <span className="text-[9px] font-semibold">{TYPE_META[k].label}</span>
                </button>
              ))}
            </div>
            <input type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold">加入清单</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
