import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Droplet, Plus, Trash2, Sparkles, Loader2, RotateCcw, Target, GlassWater, CupSoda, Coffee, Apple, Milk } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface IntakeLog {
  id: string
  time: string
  amount: number
  type: 'water' | 'tea' | 'coffee' | 'juice' | 'milk'
}

const STORAGE_KEY = 'versa:water-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }
function loadLogs(): IntakeLog[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seedToday() }
function saveLogs(d: IntakeLog[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }
function loadGoal(): number { try { const s = localStorage.getItem(STORAGE_KEY + ':goal'); if (s) return +s } catch {} return 2000 }
function saveGoal(d: number) { try { localStorage.setItem(STORAGE_KEY + ':goal', String(d)) } catch {} }

function seedToday(): IntakeLog[] {
  return [
    { id: uid(), time: '08:30', amount: 250, type: 'water' },
    { id: uid(), time: '10:15', amount: 300, type: 'water' },
    { id: uid(), time: '12:00', amount: 200, type: 'tea' },
  ]
}

const TYPE_META = {
  water: { label: '水', icon: GlassWater, color: 'text-cyan-500' },
  tea: { label: '茶', icon: CupSoda, color: 'text-emerald-500' },
  coffee: { label: '咖啡', icon: Coffee, color: 'text-amber-600' },
  juice: { label: '果汁', icon: Apple, color: 'text-rose-500' },
  milk: { label: '奶', icon: Milk, color: 'text-blue-300' },
} as const

const QUICK_AMOUNTS = [100, 200, 250, 300, 500]

export function WaterIntake() {
  const [logs, setLogs] = useState<IntakeLog[]>(loadLogs())
  const [goal, setGoal] = useState<number>(loadGoal())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('250')
  const [type, setType] = useState<IntakeLog['type']>('water')
  const [time, setTime] = useState(() => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })

  useEffect(() => { saveLogs(logs) }, [logs])
  useEffect(() => { saveGoal(goal) }, [goal])

  const today = todayKey()
  const todayLogs = logs.filter((l) => l.time && true)
  const todayTotal = logs.reduce((s, l) => s + l.amount, 0)
  const pct = Math.min(100, (todayTotal / goal) * 100)
  const remaining = Math.max(0, goal - todayTotal)
  const glasses = Math.floor(todayTotal / 250)

  const ringRadius = 36
  const circumference = 2 * Math.PI * ringRadius
  const offset = circumference * (1 - pct / 100)

  const add = () => {
    const v = +amount
    if (!v || v <= 0) { toast('请输入有效量', 'error'); return }
    setLogs([{ id: uid(), time, amount: v, type }, ...logs])
    setAdding(false)
    toast('+1', 'success')
  }

  const quick = (v: number) => {
    setLogs([{ id: uid(), time: new Date().toTimeString().slice(0, 5), amount: v, type: 'water' }, ...logs])
  }

  const remove = (id: string) => setLogs(logs.filter((l) => l.id !== id))
  const reset = () => { setLogs([]); toast('已清空今日', 'success') }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`用户今日饮水 ${todayTotal}ml, 目标 ${goal}ml. 给 3 条 50 字内建议, 中文`, '你是 Versa 健康顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Droplet className="w-5 h-5" />
          <h2 className="text-lg font-bold">饮水追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">每日目标 · 多类型饮品 · 提醒</p>
        <div className="flex items-center gap-3">
          <div className="relative w-24 h-24 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
              <motion.circle cx="40" cy="40" r={ringRadius} fill="none" stroke="white" strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }} transition={{ duration: 1 }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-base font-bold">{Math.round(pct)}%</p>
              <p className="text-[9px] opacity-80">{todayTotal}ml</p>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-1.5">
            <div className="bg-white/15 rounded-xl py-1.5 text-center">
              <p className="text-sm font-bold">{remaining}ml</p>
              <p className="text-[9px] opacity-80">剩余</p>
            </div>
            <div className="bg-white/15 rounded-xl py-1.5 text-center">
              <p className="text-sm font-bold">{glasses}</p>
              <p className="text-[9px] opacity-80">杯数</p>
            </div>
            <div className="bg-white/15 rounded-xl py-1.5 text-center col-span-2">
              <p className="text-[10px] opacity-80 mb-0.5">目标</p>
              <div className="flex items-center justify-center gap-1">
                <button onClick={() => setGoal(Math.max(500, goal - 250))} className="w-5 h-5 rounded bg-white/20 text-xs">-</button>
                <p className="text-sm font-bold w-14 text-center">{goal}ml</p>
                <button onClick={() => setGoal(Math.min(5000, goal + 250))} className="w-5 h-5 rounded bg-white/20 text-xs">+</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5">
        {QUICK_AMOUNTS.map((v) => (
          <button key={v} onClick={() => quick(v)} className="h-12 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 flex flex-col items-center justify-center active:scale-95 transition">
            <Droplet className="w-3.5 h-3.5 text-cyan-500 mb-0.5" />
            <p className="text-[10px] font-bold">{v}ml</p>
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />自定义
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
        <button onClick={reset} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {aiTip && (
        <div className="bg-cyan-50/40 dark:bg-cyan-900/20 rounded-xl p-2 border border-cyan-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-ink-700 dark:text-ink-300">今日记录 ({logs.length})</p>
        {logs.length === 0 ? (
          <div className="text-center py-6 text-ink-500">
            <Droplet className="w-8 h-8 mx-auto mb-1 opacity-30" />
            <p className="text-xs">还没有记录</p>
          </div>
        ) : logs.map((l) => {
          const Meta = TYPE_META[l.type]
          const Icon = Meta.icon
          return (
            <motion.div key={l.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="rounded-xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2">
              <Icon className={cn('w-4 h-4', Meta.color)} />
              <div className="flex-1">
                <p className="text-sm font-bold">{l.amount}ml <span className="text-[10px] text-ink-500 font-normal">· {Meta.label}</span></p>
                <p className="text-[10px] text-ink-500">{l.time}</p>
              </div>
              <button onClick={() => remove(l.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">添加饮品</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                const Meta = TYPE_META[k]
                const Icon = Meta.icon
                return (
                  <button key={k} onClick={() => setType(k)} className={cn('h-12 rounded-lg flex flex-col items-center justify-center', type === k ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                    <Icon className="w-3.5 h-3.5" />
                    <p className="text-[9px] font-semibold mt-0.5">{Meta.label}</p>
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">量 (ml)</p>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">时间</p>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
