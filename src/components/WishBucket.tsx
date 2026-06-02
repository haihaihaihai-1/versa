import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Plus, Trash2, Check, Star, Heart, Plane, Home, Car, Briefcase, GraduationCap, Heart as HeartIcon, Loader2, Calendar, Target, X, Clock } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Wish {
  id: string
  title: string
  description: string
  category: 'travel' | 'home' | 'car' | 'career' | 'study' | 'life'
  emoji: string
  targetAmount?: number
  currentAmount?: number
  targetDate?: string
  steps: { id: string; text: string; done: boolean }[]
  completed: boolean
  pinned: boolean
  at: number
}

const STORAGE_KEY = 'versa:wishes'

function load(): Wish[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'w1', title: '去冰岛看极光', description: '冬天去冰岛看北极光, 住玻璃屋, 泡温泉', category: 'travel', emoji: '🌌', targetAmount: 35000, currentAmount: 12000, targetDate: '2026-12-15', completed: false, pinned: true, at: Date.now() - 86400000 * 30,
      steps: [
        { id: 's1', text: '办理签证', done: true },
        { id: 's2', text: '订机票 (北京→雷克雅未克)', done: true },
        { id: 's3', text: '预订玻璃屋酒店', done: false },
        { id: 's4', text: '准备极地装备', done: false },
      ] },
    { id: 'w2', title: '换一台新 MacBook Pro', description: 'M4 芯片 16 寸, 用于视频剪辑', category: 'life', emoji: '💻', targetAmount: 25000, currentAmount: 18000, completed: false, pinned: false, at: Date.now() - 86400000 * 60, steps: [] },
    { id: 'w3', title: '学完 React 19', description: '完成官方教程 + 实战项目', category: 'study', emoji: '📚', completed: true, pinned: false, at: Date.now() - 86400000 * 90, steps: [
      { id: 's5', text: '看完全部官方文档', done: true },
      { id: 's6', text: '完成 3 个实战项目', done: true },
    ] },
  ]
}
function save(d: Wish[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CAT_META = {
  travel: { label: '旅行', icon: Plane, color: 'from-cyan-500 to-blue-500' },
  home: { label: '家', icon: Home, color: 'from-emerald-500 to-teal-500' },
  car: { label: '车', icon: Car, color: 'from-amber-500 to-orange-500' },
  career: { label: '事业', icon: Briefcase, color: 'from-violet-500 to-purple-500' },
  study: { label: '学习', icon: GraduationCap, color: 'from-blue-500 to-indigo-500' },
  life: { label: '生活', icon: HeartIcon, color: 'from-rose-500 to-pink-500' },
} as const

function daysLeft(dateStr: string) {
  return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000))
}

export function WishBucket() {
  const [wishes, setWishes] = useState<Wish[]>(load())
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'pinned'>('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [aiRoadmap, setAiRoadmap] = useState('')
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCat, setNewCat] = useState<keyof typeof CAT_META>('life')
  const [newEmoji, setNewEmoji] = useState('✨')
  const [newAmount, setNewAmount] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newStepText, setNewStepText] = useState('')

  useEffect(() => { save(wishes) }, [wishes])

  const filtered = (() => {
    let out = wishes
    if (filter === 'active') out = out.filter((w) => !w.completed)
    else if (filter === 'completed') out = out.filter((w) => w.completed)
    else if (filter === 'pinned') out = out.filter((w) => w.pinned)
    return out.sort((a, b) => Number(b.pinned) - Number(a.pinned) || Number(a.completed) - Number(b.completed))
  })()

  const add = () => {
    if (!newTitle.trim()) { toast('请填写标题', 'error'); return }
    const w: Wish = { id: uid(), title: newTitle, description: newDesc, category: newCat, emoji: newEmoji, targetAmount: newAmount ? +newAmount : undefined, currentAmount: 0, targetDate: newTarget || undefined, steps: [], completed: false, pinned: false, at: Date.now() }
    setWishes([w, ...wishes])
    setNewTitle(''); setNewDesc(''); setNewAmount(''); setNewTarget('')
    setAdding(false)
    toast('愿望已添加', 'success')
  }

  const toggleStep = (wishId: string, stepId: string) => {
    setWishes((ws) => ws.map((w) => w.id === wishId ? { ...w, steps: w.steps.map((s) => s.id === stepId ? { ...s, done: !s.done } : s) } : w))
  }
  const addStep = (wishId: string) => {
    if (!newStepText.trim()) return
    setWishes((ws) => ws.map((w) => w.id === wishId ? { ...w, steps: [...w.steps, { id: uid(), text: newStepText, done: false }] } : w))
    setNewStepText('')
  }
  const togglePin = (id: string) => setWishes(wishes.map((w) => w.id === id ? { ...w, pinned: !w.pinned } : w))
  const toggleComplete = (id: string) => setWishes(wishes.map((w) => w.id === id ? { ...w, completed: !w.completed } : w))
  const remove = (id: string) => setWishes(wishes.filter((w) => w.id !== id))
  const deposit = (id: string, amount: number) => {
    setWishes(wishes.map((w) => w.id === id ? { ...w, currentAmount: (w.currentAmount || 0) + amount } : w))
    toast(`已存入 ¥${amount}`, 'success')
  }

  const runAI = async (w: Wish) => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setActiveId(w.id)
    setLoading(true)
    try {
      const result = await aiComplete(`为"${w.title}"生成 1 段 60-80 字的实现路线图, 包含关键步骤`, '你是 Versa 愿望规划师, 简洁实用, 中文')
      setAiRoadmap(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const active = wishes.find((w) => w.id === activeId)
  const completedCount = wishes.filter((w) => w.completed).length
  const totalTarget = wishes.reduce((s, w) => s + (w.targetAmount || 0), 0)
  const totalSaved = wishes.reduce((s, w) => s + (w.currentAmount || 0), 0)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">愿望清单</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">梦想 · 路线图 · 进度</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{wishes.length}</p>
            <p className="text-[10px] opacity-80">愿望</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{completedCount}</p>
            <p className="text-[10px] opacity-80">已实现</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">¥{totalSaved}/{totalTarget}</p>
            <p className="text-[10px] opacity-80">存款</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新愿望
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'active', 'completed', 'pinned'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'active' ? '进行中' : f === 'completed' ? '已实现' : '📌 置顶'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有愿望</p>
          </div>
        ) : filtered.map((w) => {
          const Cat = CAT_META[w.category]
          const Icon = Cat.icon
          const progress = w.targetAmount ? ((w.currentAmount || 0) / w.targetAmount) * 100 : 0
          const days = w.targetDate ? daysLeft(w.targetDate) : null
          return (
            <motion.div key={w.id} whileHover={{ y: -2 }} onClick={() => setActiveId(w.id)} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white text-xl bg-gradient-to-br', Cat.color)}>
                  {w.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className={cn('text-sm font-bold truncate', w.completed && 'line-through opacity-60')}>{w.title}</p>
                    {w.completed && <Check className="w-3 h-3 text-emerald-500" />}
                    {w.pinned && <span className="text-[10px]">📌</span>}
                  </div>
                  <p className="text-[10px] text-ink-500 truncate">{w.description}</p>
                </div>
              </div>
              {w.targetAmount && (
                <div>
                  <div className="flex items-center justify-between text-[10px] text-ink-500 mb-0.5">
                    <span>¥{w.currentAmount || 0} / ¥{w.targetAmount}</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, progress)}%` }} className="h-full bg-gradient-to-r from-violet-500 to-pink-500" />
                  </div>
                </div>
              )}
              {days !== null && (
                <p className="text-[10px] text-ink-500 mt-1 flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />还剩 {days} 天
                </p>
              )}
            </motion.div>
          )
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setActiveId(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start gap-2">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white text-2xl bg-gradient-to-br flex-shrink-0', CAT_META[active.category].color)}>
                {active.emoji}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold">{active.title}</h3>
                <p className="text-xs text-ink-500">{active.description}</p>
              </div>
              <button onClick={() => setActiveId(null)}><X className="w-4 h-4" /></button>
            </div>

            {active.targetAmount && (
              <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-3 border border-violet-200/40">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold">¥{active.currentAmount || 0} / ¥{active.targetAmount}</p>
                  <p className="text-xs text-violet-500 font-bold">{((active.currentAmount || 0) / active.targetAmount * 100).toFixed(0)}%</p>
                </div>
                <div className="h-2 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-pink-500" style={{ width: `${Math.min(100, (active.currentAmount || 0) / active.targetAmount * 100)}%` }} />
                </div>
                <div className="flex gap-1.5">
                  {[100, 500, 1000].map((a) => (
                    <button key={a} onClick={() => deposit(active.id, a)} className="flex-1 h-7 rounded bg-violet-500 text-white text-[10px] font-bold">+¥{a}</button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-bold mb-1.5">路线图 ({active.steps.filter((s) => s.done).length}/{active.steps.length})</p>
              <div className="space-y-1.5">
                {active.steps.map((s) => (
                  <button key={s.id} onClick={() => toggleStep(active.id, s.id)} className={cn('w-full flex items-center gap-2 p-2 rounded-lg text-left', s.done ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-ink-50 dark:bg-ink-800')}>
                    <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0', s.done ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300')}>
                      {s.done && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={cn('text-xs flex-1', s.done && 'line-through opacity-60')}>{s.text}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 mt-1.5">
                <input value={newStepText} onChange={(e) => setNewStepText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addStep(active.id)} placeholder="新步骤..." className="flex-1 px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
                <button onClick={() => addStep(active.id)} className="px-2 h-7 rounded bg-violet-500 text-white text-[10px]">+</button>
              </div>
            </div>

            <button onClick={() => runAI(active)} disabled={loading} className="w-full h-8 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 路线图
            </button>

            {aiRoadmap && activeId === active.id && (
              <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded p-2 border border-violet-200/40">
                <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiRoadmap}</p>
              </div>
            )}

            <div className="flex gap-1.5">
              <button onClick={() => togglePin(active.id)} className={cn('flex-1 h-8 rounded text-xs font-bold', active.pinned ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                {active.pinned ? '📌 已置顶' : '📌 置顶'}
              </button>
              <button onClick={() => toggleComplete(active.id)} className={cn('flex-1 h-8 rounded text-xs font-bold', active.completed ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                {active.completed ? '✓ 已实现' : '标记实现'}
              </button>
              <button onClick={() => remove(active.id)} className="h-8 px-2 rounded bg-rose-500 text-white text-xs">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">新愿望</h3>
            <div className="flex gap-1.5">
              <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={2} className="w-14 h-9 text-xl text-center rounded-lg bg-ink-50 dark:bg-ink-800 outline-none" />
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="愿望名" className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="描述" rows={2} className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none resize-none" />
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                const M = CAT_META[k]
                const Icon = M.icon
                return (
                  <button key={k} onClick={() => setNewCat(k)} className={cn('h-9 rounded-lg flex items-center justify-center gap-1', newCat === k ? `bg-gradient-to-r ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    <Icon className="w-3.5 h-3.5" /><span className="text-[10px] font-semibold">{M.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="目标金额" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="date" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
