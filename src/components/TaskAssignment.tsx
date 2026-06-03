import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ListChecks, Plus, Trash2, Sparkles, Loader2, Check, Clock, Star, Repeat, Award, Calendar, ChevronRight } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Chore {
  id: string
  title: string
  assignee: string
  points: number
  frequency: 'daily' | 'weekly' | 'once' | 'custom'
  dueDate: string
  done: boolean
  doneAt: string
  category: 'cleaning' | 'cooking' | 'shopping' | 'study' | 'exercise' | 'pet' | 'other'
  notes: string
}

const STORAGE_KEY = 'versa:chores-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }

function load(): Chore[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Chore[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Chore[] {
  const today = todayKey()
  return [
    { id: '1', title: '倒垃圾', assignee: '爸爸', points: 5, frequency: 'daily', dueDate: today, done: true, doneAt: today, category: 'cleaning', notes: '' },
    { id: '2', title: '做饭', assignee: '妈妈', points: 20, frequency: 'daily', dueDate: today, done: false, doneAt: '', category: 'cooking', notes: '晚饭' },
    { id: '3', title: '洗碗', assignee: '小宝', points: 10, frequency: 'daily', dueDate: today, done: false, doneAt: '', category: 'cleaning', notes: '' },
    { id: '4', title: '遛狗', assignee: '小宝', points: 8, frequency: 'daily', dueDate: today, done: false, doneAt: '', category: 'pet', notes: '晚上 7 点' },
    { id: '5', title: '买牛奶', assignee: '妈妈', points: 5, frequency: 'once', dueDate: today, done: false, doneAt: '', category: 'shopping', notes: '' },
  ]
}

const FREQ_META = {
  daily: { label: '每天', color: 'bg-emerald-500' },
  weekly: { label: '每周', color: 'bg-blue-500' },
  once: { label: '一次', color: 'bg-amber-500' },
  custom: { label: '自定义', color: 'bg-violet-500' },
} as const

const CAT_META = {
  cleaning: { label: '清洁', icon: '🧹' },
  cooking: { label: '烹饪', icon: '🍳' },
  shopping: { label: '购物', icon: '🛒' },
  study: { label: '学习', icon: '📚' },
  exercise: { label: '运动', icon: '⚽' },
  pet: { label: '宠物', icon: '🐾' },
  other: { label: '其他', icon: '⭐' },
} as const

export function TaskAssignment() {
  const [chores, setChores] = useState<Chore[]>(load())
  const [members, setMembers] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'today' | 'done' | 'pending'>('today')
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState('')
  const [points, setPoints] = useState('10')
  const [frequency, setFrequency] = useState<Chore['frequency']>('once')
  const [category, setCategory] = useState<Chore['category']>('cleaning')
  const [dueDate, setDueDate] = useState(todayKey())

  useEffect(() => {
    save(chores)
    // load family members
    try {
      const fam = JSON.parse(localStorage.getItem('versa:family-v1') || '[]')
      setMembers(Array.from(new Set(fam.map((m: any) => m.name))))
    } catch {}
  }, [chores])

  const total = chores.length
  const done = chores.filter((c) => c.done).length
  const todayChores = chores.filter((c) => c.dueDate === todayKey())
  const todayDone = todayChores.filter((c) => c.done).length
  const totalPoints = chores.reduce((s, c) => s + (c.done ? c.points : 0), 0)
  const pendingPoints = chores.filter((c) => !c.done).reduce((s, c) => s + c.points, 0)

  // per-assignee stats
  const assigneeStats: { [k: string]: { done: number; points: number; tasks: number } } = {}
  chores.forEach((c) => {
    if (!assigneeStats[c.assignee]) assigneeStats[c.assignee] = { done: 0, points: 0, tasks: 0 }
    assigneeStats[c.assignee].tasks++
    if (c.done) {
      assigneeStats[c.assignee].done++
      assigneeStats[c.assignee].points += c.points
    }
  })

  const filtered = chores.filter((c) => {
    if (filter === 'today') return c.dueDate === todayKey()
    if (filter === 'done') return c.done
    if (filter === 'pending') return !c.done
    return true
  })

  const add = () => {
    if (!title.trim() || !assignee) { toast('请填写', 'error'); return }
    const c: Chore = { id: uid(), title, assignee, points: +points, frequency, dueDate, done: false, doneAt: '', category, notes: '' }
    setChores([c, ...chores])
    setTitle(''); setPoints('10')
    setAdding(false)
    toast('已添加', 'success')
  }

  const remove = (id: string) => setChores(chores.filter((c) => c.id !== id))
  const toggle = (id: string) => {
    const today = todayKey()
    setChores(chores.map((c) => c.id === id ? { ...c, done: !c.done, doneAt: !c.done ? today : '' } : c))
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`家庭有 ${members.length} 人 (${members.join('、')}), 待完成 ${chores.filter((c) => !c.done).length} 项任务. 推荐 3 项适合家庭协作的新家务, 中文, 每条 15 字`, '你是 Versa 家庭顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <ListChecks className="w-5 h-5" />
          <h2 className="text-lg font-bold">家庭任务</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">任务分配 · 积分激励 · 完成追踪</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">总任务</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-emerald-100">{todayDone}/{todayChores.length}</p>
            <p className="text-[9px] opacity-80">今日</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-amber-100">{pendingPoints}</p>
            <p className="text-[9px] opacity-80">待积分</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalPoints}</p>
            <p className="text-[9px] opacity-80">已积分</p>
          </div>
        </div>
      </div>

      {Object.keys(assigneeStats).length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-xs font-semibold mb-1.5">🏆 排行</p>
          <div className="space-y-1">
            {Object.entries(assigneeStats).sort((a, b) => b[1].points - a[1].points).map(([name, s]) => (
              <div key={name} className="flex items-center gap-1.5 text-[10px]">
                <span className="w-16 truncate font-semibold">{name}</span>
                <div className="flex-1 h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${(s.points / Math.max(1, totalPoints + pendingPoints)) * 100}%` }} />
                </div>
                <span className="text-ink-500 w-12 text-right">{s.done}/{s.tasks} · {s.points}分</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新任务
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-emerald-50/40 dark:bg-emerald-900/20 rounded-xl p-2 border border-emerald-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['today', 'pending', 'done', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'today' ? '📅 今日' : f === 'pending' ? '⏳ 待办' : f === 'done' ? '✓ 完成' : '全部'}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有任务</p>
          </div>
        ) : filtered.map((c) => {
          const CM = CAT_META[c.category]
          const FM = FREQ_META[c.frequency]
          return (
            <motion.div key={c.id} whileHover={{ y: -1 }} className={cn('rounded-xl p-2 border flex items-center gap-2', c.done ? 'bg-emerald-50/40 dark:bg-emerald-900/20 border-emerald-200/40' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
              <button onClick={() => toggle(c.id)} className={cn('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0', c.done ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300')}>
                {c.done && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className="text-xl">{CM.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate', c.done && 'line-through opacity-60')}>{c.title}</p>
                <p className="text-[10px] text-ink-500 flex items-center gap-1.5">
                  <span>{c.assignee}</span>
                  <span className={cn('text-[9px] px-1 py-0.5 rounded text-white', FM.color)}>{FM.label}</span>
                  <span>📅 {c.dueDate}</span>
                </p>
              </div>
              <span className="text-[10px] font-bold text-amber-500 flex items-center gap-0.5">
                <Award className="w-3 h-3" />{c.points}
              </span>
              <button onClick={() => remove(c.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">新任务</h3>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="任务名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="负责人" list="members" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <datalist id="members">{members.map((m) => <option key={m} value={m} />)}</datalist>
              <input type="number" value={points} onChange={(e) => setPoints(e.target.value)} placeholder="积分" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">类别</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                  const C = CAT_META[k]
                  return (
                    <button key={k} onClick={() => setCategory(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', category === k ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                      <span className="text-base">{C.icon}</span>
                      <span className="text-[9px]">{C.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">频率</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(FREQ_META) as Array<keyof typeof FREQ_META>).map((k) => (
                  <button key={k} onClick={() => setFrequency(k)} className={cn('h-8 rounded-lg text-[10px] font-semibold text-white', frequency === k ? FREQ_META[k].color : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300')}>{FREQ_META[k].label}</button>
                ))}
              </div>
            </div>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
