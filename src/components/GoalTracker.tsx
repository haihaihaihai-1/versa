import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Target, Award, Flame, Sparkles, Loader2, Calendar, Tag, Clock, CheckCircle2 } from 'lucide-react'
import { cn, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Goal {
  id: string
  title: string
  description: string
  category: 'career' | 'health' | 'finance' | 'learning' | 'life' | 'relationship'
  emoji: string
  startDate: string
  targetDate: string
  milestones: { id: string; title: string; done: boolean; at?: number }[]
  tags: string[]
  at: number
  completed: boolean
}

const STORAGE_KEY = 'versa:goals'

function load(): Goal[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'g1', title: '2026 跑完一场半马', description: '完成 21 公里半程马拉松, 完赛就好', category: 'health', emoji: '🏃', startDate: '2026-01-01', targetDate: '2026-10-15', completed: false, at: Date.now() - 86400000 * 60, tags: ['运动', '挑战'],
      milestones: [
        { id: 'm1', title: '月跑量 50km', done: true, at: Date.now() - 86400000 * 30 },
        { id: 'm2', title: '完成 10km 测试', done: true, at: Date.now() - 86400000 * 15 },
        { id: 'm3', title: '完成 21km 训练', done: false },
        { id: 'm4', title: '半马比赛日', done: false },
      ] },
    { id: 'g2', title: '存款 10 万', description: '年末存款达到 10 万元', category: 'finance', emoji: '💰', startDate: '2026-01-01', targetDate: '2026-12-31', completed: false, at: Date.now() - 86400000 * 90, tags: ['理财'],
      milestones: [
        { id: 'm5', title: '存款 5 万', done: true, at: Date.now() - 86400000 * 30 },
        { id: 'm6', title: '存款 7 万', done: true, at: Date.now() - 86400000 * 7 },
        { id: 'm7', title: '存款 10 万', done: false },
      ] },
    { id: 'g3', title: '读完 24 本书', description: '平均每月读 2 本', category: 'learning', emoji: '📚', startDate: '2026-01-01', targetDate: '2026-12-31', completed: false, at: Date.now() - 86400000 * 120, tags: ['阅读'],
      milestones: [
        { id: 'm8', title: '读完 6 本 (Q1)', done: true, at: Date.now() - 86400000 * 60 },
        { id: 'm9', title: '读完 12 本 (Q2)', done: true, at: Date.now() - 86400000 * 7 },
        { id: 'm10', title: '读完 18 本 (Q3)', done: false },
        { id: 'm11', title: '读完 24 本 (Q4)', done: false },
      ] },
  ]
}
function save(d: Goal[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CAT_META = {
  career: { label: '事业', color: 'from-violet-500 to-purple-500' },
  health: { label: '健康', color: 'from-emerald-500 to-teal-500' },
  finance: { label: '财务', color: 'from-amber-500 to-orange-500' },
  learning: { label: '学习', color: 'from-blue-500 to-indigo-500' },
  life: { label: '生活', color: 'from-rose-500 to-pink-500' },
  relationship: { label: '关系', color: 'from-cyan-500 to-blue-500' },
} as const

function daysLeft(dateStr: string) { return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)) }
function daysFromStart(start: string) { return Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 86400000)) }

export function GoalTracker() {
  const [goals, setGoals] = useState<Goal[]>(load())
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | keyof typeof CAT_META>('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newCat, setNewCat] = useState<keyof typeof CAT_META>('life')
  const [newEmoji, setNewEmoji] = useState('🎯')
  const [newTarget, setNewTarget] = useState('')
  const [newMilestone, setNewMilestone] = useState('')

  useEffect(() => { save(goals) }, [goals])

  const filtered = (() => {
    let out = goals
    if (filter === 'active') out = out.filter((g) => !g.completed)
    else if (filter === 'completed') out = out.filter((g) => g.completed)
    else if (filter !== 'all') out = out.filter((g) => g.category === filter)
    return out
  })()

  const totalProgress = goals.length > 0 ? Math.round(goals.reduce((s, g) => {
    const ms = g.milestones.length || 1
    return s + (g.milestones.filter((m) => m.done).length / ms)
  }, 0) / goals.length * 100) : 0
  const totalMilestones = goals.reduce((s, g) => s + g.milestones.length, 0)
  const doneMilestones = goals.reduce((s, g) => s + g.milestones.filter((m) => m.done).length, 0)

  const add = () => {
    if (!newTitle.trim()) { toast('请填写标题', 'error'); return }
    const g: Goal = { id: 'g' + Date.now(), title: newTitle, description: newDesc, category: newCat, emoji: newEmoji, startDate: new Date().toISOString().split('T')[0], targetDate: newTarget, milestones: [], tags: [], completed: false, at: Date.now() }
    setGoals([g, ...goals])
    setNewTitle(''); setNewDesc(''); setNewTarget('')
    setAdding(false)
    toast('目标已添加', 'success')
  }

  const toggleMilestone = (goalId: string, msId: string) => {
    setGoals((gs) => gs.map((g) => g.id === goalId ? { ...g, milestones: g.milestones.map((m) => m.id === msId ? { ...m, done: !m.done, at: !m.done ? Date.now() : m.at } : m), completed: g.milestones.every((m) => m.id === msId ? !m.done : m.done) } : g))
  }
  const addMilestone = (goalId: string) => {
    if (!newMilestone.trim()) return
    setGoals((gs) => gs.map((g) => g.id === goalId ? { ...g, milestones: [...g.milestones, { id: 'm' + Date.now(), title: newMilestone, done: false }] } : g))
    setNewMilestone('')
  }
  const remove = (id: string) => setGoals(goals.filter((g) => g.id !== id))

  const runAI = async (g: Goal) => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setActiveId(g.id)
    setLoading(true)
    try {
      const result = await aiComplete(`为"${g.title}"目标生成 1 段 60-80 字的阶段性建议`, '你是 Versa 目标教练, 简洁实用, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const active = goals.find((g) => g.id === activeId)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Target className="w-5 h-5" />
          <h2 className="text-lg font-bold">长期目标</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">里程碑 · 进度 · 倒计时</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{totalProgress}%</p>
            <p className="text-[10px] opacity-80">总进度</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{doneMilestones}/{totalMilestones}</p>
            <p className="text-[10px] opacity-80">里程碑</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{goals.filter((g) => g.completed).length}</p>
            <p className="text-[10px] opacity-80">已完成</p>
          </div>
        </div>
        <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mt-2">
          <motion.div initial={{ width: 0 }} animate={{ width: `${totalProgress}%` }} className="h-full bg-white" />
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          + 新目标
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'active', 'completed', ...Object.keys(CAT_META)] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f as any)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'active' ? '进行中' : f === 'completed' ? '已达成' : CAT_META[f as keyof typeof CAT_META].label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有目标</p>
          </div>
        ) : filtered.map((g) => {
          const Cat = CAT_META[g.category]
          const totalMs = g.milestones.length || 1
          const doneMs = g.milestones.filter((m) => m.done).length
          const progress = (doneMs / totalMs) * 100
          const days = daysLeft(g.targetDate)
          const elapsed = daysFromStart(g.startDate)
          return (
            <motion.div key={g.id} whileHover={{ y: -2 }} onClick={() => setActiveId(g.id)} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br', Cat.color)}>
                  {g.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-bold truncate', g.completed && 'line-through opacity-60')}>{g.title}</p>
                  <p className="text-[10px] text-ink-500 truncate">{g.description}</p>
                </div>
                {g.completed && <Award className="w-5 h-5 text-amber-500" />}
              </div>
              <div className="mb-1.5">
                <div className="flex items-center justify-between text-[10px] text-ink-500 mb-0.5">
                  <span>{doneMs}/{totalMs} 里程碑</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className={cn('h-full bg-gradient-to-r', Cat.color)} />
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-ink-500">
                <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />已 {elapsed} 天</span>
                {!g.completed && <span className="flex items-center gap-0.5">· 剩 {days} 天</span>}
              </div>
            </motion.div>
          )
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setActiveId(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <div className="flex items-start gap-2">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br', CAT_META[active.category].color)}>
                {active.emoji}
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold">{active.title}</h3>
                <p className="text-xs text-ink-500">{active.description}</p>
              </div>
              <button onClick={() => setActiveId(null)}>×</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-2">
                <p className="text-base font-bold text-violet-500">{active.milestones.filter((m) => m.done).length}</p>
                <p className="text-[9px] text-ink-500">已达成</p>
              </div>
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-2">
                <p className="text-base font-bold">{active.milestones.length}</p>
                <p className="text-[9px] text-ink-500">总里程碑</p>
              </div>
              <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-2">
                <p className="text-base font-bold">{daysLeft(active.targetDate)}</p>
                <p className="text-[9px] text-ink-500">剩余天</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold mb-1.5">里程碑</p>
              <div className="space-y-1.5">
                {active.milestones.map((m) => (
                  <button key={m.id} onClick={() => toggleMilestone(active.id, m.id)} className={cn('w-full flex items-center gap-2 p-2 rounded-lg text-left', m.done ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-ink-50 dark:bg-ink-800')}>
                    <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0', m.done ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300')}>
                      {m.done && <CheckCircle2 className="w-2.5 h-2.5 text-white" />}
                    </div>
                    <span className={cn('text-xs flex-1', m.done && 'line-through opacity-60')}>{m.title}</span>
                    {m.at && <span className="text-[9px] text-ink-500">{formatTimeAgo(new Date(m.at).toISOString())}</span>}
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 mt-1.5">
                <input value={newMilestone} onChange={(e) => setNewMilestone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addMilestone(active.id)} placeholder="新里程碑..." className="flex-1 px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
                <button onClick={() => addMilestone(active.id)} className="px-2 h-7 rounded bg-violet-500 text-white text-[10px]">+</button>
              </div>
            </div>
            <button onClick={() => runAI(active)} disabled={loading} className="w-full h-8 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 阶段建议
            </button>
            {aiRec && activeId === active.id && (
              <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded p-2 border border-violet-200/40">
                <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiRec}</p>
              </div>
            )}
            <button onClick={() => remove(active.id)} className="w-full h-8 rounded-lg bg-rose-500 text-white text-xs">删除目标</button>
          </motion.div>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">新目标</h3>
            <div className="flex gap-1.5">
              <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={2} className="w-14 h-9 text-xl text-center rounded-lg bg-ink-50 dark:bg-ink-800 outline-none" />
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="目标" className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="描述" rows={2} className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none resize-none" />
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => (
                <button key={k} onClick={() => setNewCat(k)} className={cn('h-9 rounded-lg text-xs font-semibold', newCat === k ? `bg-gradient-to-r ${CAT_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                  {CAT_META[k].label}
                </button>
              ))}
            </div>
            <input type="date" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
