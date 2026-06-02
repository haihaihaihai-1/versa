import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Home as HomeIcon, Plus, Trash2, Sparkles, Loader2, Wrench, Calendar, Check, AlertCircle, Snowflake, Wind, Droplets, Zap, Shield, Filter, Flame, Thermometer, Sun, Cloud, Umbrella } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Chore {
  id: string
  name: string
  category: 'hvac' | 'safety' | 'plumbing' | 'appliance' | 'seasonal' | 'cleaning'
  intervalDays: number
  lastDone: string
  priority: 'low' | 'med' | 'high'
  notes: string
  history: { date: string }[]
}

const STORAGE_KEY = 'versa:home-maint-v1'

function load(): Chore[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Chore[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Chore[] {
  const now = Date.now()
  return [
    { id: 'c1', name: '空调滤网清洁', category: 'hvac', intervalDays: 90, lastDone: new Date(now - 95 * 86400000).toISOString().split('T')[0], priority: 'high', notes: '夏冬前必做', history: [{ date: new Date(now - 95 * 86400000).toISOString().split('T')[0] }, { date: new Date(now - 185 * 86400000).toISOString().split('T')[0] }] },
    { id: 'c2', name: '烟雾报警器电池', category: 'safety', intervalDays: 180, lastDone: new Date(now - 60 * 86400000).toISOString().split('T')[0], priority: 'high', notes: '9V 电池', history: [] },
    { id: 'c3', name: '冰箱清理', category: 'appliance', intervalDays: 30, lastDone: new Date(now - 40 * 86400000).toISOString().split('T')[0], priority: 'med', notes: '检查过期食品', history: [] },
    { id: 'c4', name: '洗衣机清洁剂', category: 'appliance', intervalDays: 60, lastDone: new Date(now - 25 * 86400000).toISOString().split('T')[0], priority: 'low', notes: '槽洗剂', history: [] },
    { id: 'c5', name: '窗户纱窗清洁', category: 'seasonal', intervalDays: 180, lastDone: new Date(now - 200 * 86400000).toISOString().split('T')[0], priority: 'med', notes: '春秋两季', history: [] },
  ]
}

const CAT_META = {
  hvac: { label: '暖通', icon: Thermometer, color: 'from-amber-500 to-orange-500', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-500' },
  safety: { label: '安全', icon: Shield, color: 'from-rose-500 to-red-500', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-500' },
  plumbing: { label: '水管', icon: Droplets, color: 'from-cyan-500 to-blue-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-500' },
  appliance: { label: '家电', icon: Zap, color: 'from-violet-500 to-purple-500', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-500' },
  seasonal: { label: '季节', icon: Sun, color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-500' },
  cleaning: { label: '清洁', icon: Filter, color: 'from-blue-500 to-indigo-500', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-500' },
} as const

const PRIORITY_META = { low: { label: '低', color: 'bg-ink-300' }, med: { label: '中', color: 'bg-amber-500' }, high: { label: '高', color: 'bg-rose-500' } } as const

function nextDue(c: Chore): number {
  const last = new Date(c.lastDone).getTime()
  return last + c.intervalDays * 86400000
}

function statusOf(c: Chore): 'overdue' | 'soon' | 'ok' {
  const due = nextDue(c)
  const diff = due - Date.now()
  if (diff < 0) return 'overdue'
  if (diff < 7 * 86400000) return 'soon'
  return 'ok'
}

export function HomeMaintenance() {
  const [chores, setChores] = useState<Chore[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'overdue' | 'soon'>('all')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Chore['category']>('hvac')
  const [interval, setInterval] = useState('30')
  const [priority, setPriority] = useState<Chore['priority']>('med')
  const [notes, setNotes] = useState('')

  useEffect(() => { save(chores) }, [chores])

  const overdueCount = chores.filter((c) => statusOf(c) === 'overdue').length
  const soonCount = chores.filter((c) => statusOf(c) === 'soon').length
  const filtered = (() => {
    if (filter === 'all') return chores
    if (filter === 'overdue') return chores.filter((c) => statusOf(c) === 'overdue')
    return chores.filter((c) => statusOf(c) === 'soon')
  })().sort((a, b) => nextDue(a) - nextDue(b))

  const add = () => {
    if (!name.trim()) { toast('请输入名称', 'error'); return }
    const c: Chore = { id: uid(), name, category, intervalDays: +interval, lastDone: new Date().toISOString().split('T')[0], priority, notes, history: [] }
    setChores([c, ...chores])
    setName(''); setInterval('30'); setNotes(''); setPriority('med')
    setAdding(false)
    toast('已添加', 'success')
  }

  const complete = (id: string) => {
    setChores(chores.map((c) => {
      if (c.id !== id) return c
      const today = new Date().toISOString().split('T')[0]
      return { ...c, lastDone: today, history: [{ date: today }, ...c.history].slice(0, 10) }
    }))
    toast('✓ 已完成', 'success')
  }

  const remove = (id: string) => setChores(chores.filter((c) => c.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`用户家庭有 ${chores.length} 项维护任务, ${overdueCount} 项逾期. 给 3 条 50 字内家居维护建议, 中文`, '你是 Versa 家居顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <HomeIcon className="w-5 h-5" />
          <h2 className="text-lg font-bold">家居维护</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">周期提醒 · 设备保养 · 季节性</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{chores.length}</p>
            <p className="text-[9px] opacity-80">任务</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{overdueCount}</p>
            <p className="text-[9px] opacity-80">逾期</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-amber-100">{soonCount}</p>
            <p className="text-[9px] opacity-80">将到期</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{chores.length - overdueCount - soonCount}</p>
            <p className="text-[9px] opacity-80">正常</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加任务
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

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'overdue', 'soon'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'overdue' ? '🔴 逾期' : '🟡 即将'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <HomeIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有任务</p>
          </div>
        ) : filtered.map((c) => {
          const Meta = CAT_META[c.category]
          const Icon = Meta.icon
          const PMeta = PRIORITY_META[c.priority]
          const st = statusOf(c)
          const due = nextDue(c)
          const daysToDue = Math.round((due - Date.now()) / 86400000)
          return (
            <motion.div key={c.id} whileHover={{ y: -1 }} className={cn('rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border', st === 'overdue' ? 'border-rose-400' : st === 'soon' ? 'border-amber-400' : 'border-ink-200/60 dark:border-ink-800/60')}>
              <div className="flex items-center gap-2">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', Meta.bg)}>
                  <Icon className={cn('w-5 h-5', Meta.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold truncate">{c.name}</p>
                    <span className={cn('w-1.5 h-1.5 rounded-full', PMeta.color)} />
                  </div>
                  <p className="text-[10px] text-ink-500">{Meta.label} · 每 {c.intervalDays} 天 · 上次 {c.lastDone}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-[10px] font-bold', st === 'overdue' ? 'text-rose-500' : st === 'soon' ? 'text-amber-500' : 'text-emerald-500')}>
                    {st === 'overdue' ? `逾期 ${-daysToDue}天` : `${daysToDue}天`}
                  </p>
                </div>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <button onClick={() => complete(c.id)} className="px-2 h-7 rounded-lg bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-0.5">
                  <Check className="w-3 h-3" />完成
                </button>
                {c.notes && <span className="text-[10px] text-ink-500 flex-1 truncate">📝 {c.notes}</span>}
                <button onClick={() => remove(c.id)} className="ml-auto text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">添加任务</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="任务名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">分类</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                  const M = CAT_META[k]
                  return (
                    <button key={k} onClick={() => setCategory(k)} className={cn('h-10 rounded-lg flex items-center justify-center gap-1 text-[10px] font-semibold', category === k ? `${M.bg} ${M.text}` : 'bg-ink-100 dark:bg-ink-800')}>
                      <M.icon className="w-3.5 h-3.5" />{M.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">周期 (天)</p>
                <input type="number" value={interval} onChange={(e) => setInterval(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">优先级</p>
                <div className="grid grid-cols-3 gap-1">
                  {(['low', 'med', 'high'] as const).map((p) => (
                    <button key={p} onClick={() => setPriority(p)} className={cn('h-9 rounded-lg text-[10px] font-semibold', priority === p ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{p === 'low' ? '低' : p === 'med' ? '中' : '高'}</button>
                  ))}
                </div>
              </div>
            </div>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
