import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Plane, Plus, Trash2, Sparkles, Loader2, Clock, MapPin, PlaneTakeoff, PlaneLanding, Check, X, Bell, Calendar } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Flight {
  id: string
  airline: string
  flightNo: string
  type: 'departure' | 'arrival'
  from: string
  fromCity: string
  to: string
  toCity: string
  date: string
  time: string
  status: 'on-time' | 'delayed' | 'boarding' | 'departed' | 'arrived' | 'cancelled'
  delay: number
  gate: string
  terminal: string
  seat: string
}

const STORAGE_KEY = 'versa:flights-v1'

function load(): Flight[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Flight[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Flight[] {
  return [
    { id: 'f1', airline: '全日空', flightNo: 'NH 952', type: 'departure', from: 'PVG', fromCity: '上海', to: 'KIX', toCity: '大阪', date: '2026-09-10', time: '08:00', status: 'on-time', delay: 0, gate: 'G23', terminal: 'T2', seat: '32A' },
    { id: 'f2', airline: '东方航空', flightNo: 'MU 5401', type: 'arrival', from: 'PEK', fromCity: '北京', to: 'PVG', toCity: '上海', date: '2026-09-15', time: '15:30', status: 'boarding', delay: 15, gate: 'D12', terminal: 'T1', seat: '15F' },
  ]
}

const STATUS_META = {
  'on-time': { label: '准点', color: 'bg-emerald-500', text: 'text-emerald-500' },
  'delayed': { label: '延误', color: 'bg-amber-500', text: 'text-amber-500' },
  'boarding': { label: '登机中', color: 'bg-blue-500', text: 'text-blue-500' },
  'departed': { label: '已起飞', color: 'bg-violet-500', text: 'text-violet-500' },
  'arrived': { label: '已到达', color: 'bg-cyan-500', text: 'text-cyan-500' },
  'cancelled': { label: '取消', color: 'bg-rose-500', text: 'text-rose-500' },
} as const

export function FlightTracker() {
  const [flights, setFlights] = useState<Flight[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'departure' | 'arrival'>('all')
  const [airline, setAirline] = useState('国航')
  const [flightNo, setFlightNo] = useState('')
  const [type, setType] = useState<Flight['type']>('departure')
  const [fromCode, setFromCode] = useState('PVG')
  const [fromCity, setFromCity] = useState('上海')
  const [toCode, setToCode] = useState('PEK')
  const [toCity, setToCity] = useState('北京')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('10:00')
  const [gate, setGate] = useState('')
  const [terminal, setTerminal] = useState('T2')
  const [seat, setSeat] = useState('')

  useEffect(() => { save(flights) }, [flights])

  const upcoming = flights.filter((f) => f.status !== 'arrived' && f.status !== 'cancelled')
  const past = flights.filter((f) => f.status === 'arrived')
  const delayed = flights.filter((f) => f.status === 'delayed')
  const today = new Date().toISOString().split('T')[0]
  const todayFlights = flights.filter((f) => f.date === today)

  const filtered = (() => {
    if (filter === 'all') return flights
    return flights.filter((f) => f.type === filter)
  })().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))

  const add = () => {
    if (!flightNo.trim()) { toast('请输入航班号', 'error'); return }
    const f: Flight = { id: uid(), airline, flightNo, type, from: fromCode.toUpperCase(), fromCity, to: toCode.toUpperCase(), toCity, date, time, status: 'on-time', delay: 0, gate, terminal, seat }
    setFlights([f, ...flights])
    setFlightNo(''); setGate(''); setSeat('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const remove = (id: string) => setFlights(flights.filter((f) => f.id !== id))

  const cycleStatus = (id: string) => {
    const statuses: Flight['status'][] = ['on-time', 'delayed', 'boarding', 'departed', 'arrived', 'cancelled']
    setFlights(flights.map((f) => {
      if (f.id !== id) return f
      const idx = statuses.indexOf(f.status)
      return { ...f, status: statuses[(idx + 1) % statuses.length] }
    }))
  }

  const adjustDelay = (id: string, delta: number) => {
    setFlights(flights.map((f) => {
      if (f.id !== id) return f
      const newDelay = Math.max(0, f.delay + delta)
      return { ...f, delay: newDelay, status: newDelay > 0 ? 'delayed' : 'on-time' }
    }))
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = flights.map((f) => `${f.flightNo} ${f.fromCity}→${f.toCity} ${f.date} ${f.time}`).join('; ')
      const result = await aiComplete(`用户航班: ${summary}. 给 1 段 60 字内乘机建议 (提前到机场/行李), 中文`, '你是 Versa 旅行助手, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Plane className="w-5 h-5" />
          <h2 className="text-lg font-bold">航班追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">状态实时 · 延误提醒 · 登机口</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{flights.length}</p>
            <p className="text-[9px] opacity-80">航班</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{todayFlights.length}</p>
            <p className="text-[9px] opacity-80">今日</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-amber-100">{delayed.length}</p>
            <p className="text-[9px] opacity-80">延误</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{past.length}</p>
            <p className="text-[9px] opacity-80">已飞</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />加航班
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-sky-50/40 dark:bg-sky-900/20 rounded-xl p-2 border border-sky-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'departure', 'arrival'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-sky-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'departure' ? '✈️ 出发' : '🛬 到达'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Plane className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有航班</p>
          </div>
        ) : filtered.map((f) => {
          const M = STATUS_META[f.status]
          return (
            <motion.div key={f.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center gap-2">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0', f.type === 'departure' ? 'bg-sky-500' : 'bg-emerald-500')}>
                  {f.type === 'departure' ? <PlaneTakeoff className="w-4 h-4" /> : <PlaneLanding className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{f.flightNo} <span className="text-[10px] text-ink-500 font-normal">{f.airline}</span></p>
                  <p className="text-[10px] text-ink-500">{f.date} {f.time}{f.delay > 0 && <span className="text-amber-500 ml-1">+{f.delay}分</span>}</p>
                </div>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded text-white font-bold', M.color)}>{M.label}</span>
                <button onClick={() => remove(f.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-ink-500">
                <span className="font-bold text-ink-700 dark:text-ink-300">{f.from}</span>
                <span className="text-[9px]">{f.fromCity}</span>
                <span className="flex-1 border-t border-dashed border-ink-300 mx-1" />
                <span className="text-[9px] text-sky-500">→</span>
                <span className="flex-1 border-t border-dashed border-ink-300 mx-1" />
                <span className="text-[9px]">{f.toCity}</span>
                <span className="font-bold text-ink-700 dark:text-ink-300">{f.to}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                {f.gate && <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/30 text-sky-500 font-semibold">🚪 登机口 {f.gate}</span>}
                {f.terminal && <span className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800">{f.terminal}</span>}
                {f.seat && <span className="px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800">座位 {f.seat}</span>}
                <button onClick={() => adjustDelay(f.id, 15)} className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-500 text-[9px]">+15分</button>
                <button onClick={() => adjustDelay(f.id, -15)} className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 text-[9px]">-15分</button>
                <button onClick={() => cycleStatus(f.id)} className="ml-auto px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-500 text-[9px]">切状态</button>
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">添加航班</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="航司" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={flightNo} onChange={(e) => setFlightNo(e.target.value)} placeholder="航班号" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setType('departure')} className={cn('h-9 rounded-lg text-xs font-semibold', type === 'departure' ? 'bg-sky-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>✈️ 出发</button>
              <button onClick={() => setType('arrival')} className={cn('h-9 rounded-lg text-xs font-semibold', type === 'arrival' ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>🛬 到达</button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={fromCode} onChange={(e) => setFromCode(e.target.value)} placeholder="出发机场代码" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={fromCity} onChange={(e) => setFromCity(e.target.value)} placeholder="出发城市" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={toCode} onChange={(e) => setToCode(e.target.value)} placeholder="到达机场代码" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={toCity} onChange={(e) => setToCity(e.target.value)} placeholder="到达城市" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <input value={gate} onChange={(e) => setGate(e.target.value)} placeholder="登机口" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={terminal} onChange={(e) => setTerminal(e.target.value)} placeholder="航站楼" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={seat} onChange={(e) => setSeat(e.target.value)} placeholder="座位" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-sky-500 to-blue-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
