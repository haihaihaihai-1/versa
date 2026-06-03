import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Plus, Trash2, Route, Clock, Fuel, DollarSign, Coffee, Utensils, Hotel, Camera, Check } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Stop {
  id: string
  name: string
  type: 'start' | 'rest' | 'meal' | 'gas' | 'hotel' | 'sight' | 'end'
  distance: number
  eta: number
  note: string
  done: boolean
}

interface Trip {
  id: string
  name: string
  date: string
  totalKm: number
  fuelL100: number
  fuelPrice: number
  highwayFee: number
  stops: Stop[]
  done: boolean
}

const STOP_META = {
  start: { label: '起点', icon: MapPin, color: 'from-emerald-500 to-green-500' },
  rest: { label: '休息', icon: Coffee, color: 'from-amber-500 to-orange-500' },
  meal: { label: '用餐', icon: Utensils, color: 'from-rose-500 to-pink-500' },
  gas: { label: '加油', icon: Fuel, color: 'from-cyan-500 to-blue-500' },
  hotel: { label: '住宿', icon: Hotel, color: 'from-violet-500 to-purple-500' },
  sight: { label: '景点', icon: Camera, color: 'from-pink-500 to-fuchsia-500' },
  end: { label: '终点', icon: MapPin, color: 'from-red-500 to-rose-500' },
} as const

const STORAGE_KEY = 'versa:road-trips-v1'

function load(): Trip[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Trip[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Trip[] {
  return [
    {
      id: '1', name: '杭州 → 黄山自驾 3 日', date: '2026-06-15', totalKm: 480, fuelL100: 7.5, fuelPrice: 7.85, highwayFee: 220, done: false,
      stops: [
        { id: 's1', name: '杭州西湖', type: 'start', distance: 0, eta: 0, note: '出发', done: true },
        { id: 's2', name: '服务区午休', type: 'rest', distance: 120, eta: 1.5, note: '杭瑞高速', done: false },
        { id: 's3', name: '屯溪老街', type: 'meal', distance: 280, eta: 4, note: '午餐 + 逛吃', done: false },
        { id: 's4', name: '黄山风景区', type: 'sight', distance: 320, eta: 5, note: '住山脚', done: false },
        { id: 's5', name: '山顶酒店', type: 'hotel', distance: 350, eta: 5.5, note: '光明顶山庄', done: false },
        { id: 's6', name: '宏村', type: 'sight', distance: 480, eta: 7, note: '返回路上', done: false },
      ],
    },
    {
      id: '2', name: '上海周边 1 日游', date: '2026-05-20', totalKm: 180, fuelL100: 8.0, fuelPrice: 7.85, highwayFee: 60, done: true,
      stops: [
        { id: 's1', name: '人民广场', type: 'start', distance: 0, eta: 0, note: '集合', done: true },
        { id: 's2', name: '朱家角', type: 'sight', distance: 50, eta: 1, note: '古镇', done: true },
        { id: 's3', name: '淀山湖服务区', type: 'meal', distance: 90, eta: 1.8, note: '湖鲜', done: true },
        { id: 's4', name: '返程', type: 'end', distance: 180, eta: 3, note: '', done: true },
      ],
    },
  ]
}

export function RoadTripPlanner() {
  const [trips, setTrips] = useState<Trip[]>(load())
  const [activeId, setActiveId] = useState<string | null>(trips[0]?.id || null)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<Omit<Trip, 'id' | 'stops' | 'done'>>({ name: '', date: new Date().toISOString().slice(0, 10), totalKm: 0, fuelL100: 7.5, fuelPrice: 7.85, highwayFee: 0 })

  useEffect(() => { save(trips) }, [trips])
  const active = trips.find((t) => t.id === activeId)

  const calcFuel = (km: number, l100: number, price: number) => (km / 100) * l100 * price
  const activeCost = active ? calcFuel(active.totalKm, active.fuelL100, active.fuelPrice) + active.highwayFee : 0
  const totalAllCost = trips.reduce((s, t) => s + calcFuel(t.totalKm, t.fuelL100, t.fuelPrice) + t.highwayFee, 0)

  const addTrip = () => {
    if (!draft.name) { toast('请填写行程名', 'error'); return }
    const newTrip: Trip = { id: uid(), done: false, ...draft, stops: [{ id: uid(), name: '起点', type: 'start', distance: 0, eta: 0, note: '', done: false }, { id: uid(), name: '终点', type: 'end', distance: draft.totalKm, eta: draft.totalKm / 80, note: '', done: false }] }
    setTrips([newTrip, ...trips])
    setActiveId(newTrip.id)
    setShowForm(false)
    setDraft({ ...draft, name: '', totalKm: 0, highwayFee: 0 })
    toast('已创建', 'success')
  }

  const addStop = (tripId: string) => {
    const name = prompt('途经点名称:'); if (!name) return
    const distStr = prompt('距起点距离 (km):'); const dist = Number(distStr); if (isNaN(dist)) return
    const typeStr = prompt('类型 (start/rest/meal/gas/hotel/sight/end):') || 'sight'
    const type = (['start', 'rest', 'meal', 'gas', 'hotel', 'sight', 'end'].includes(typeStr) ? typeStr : 'sight') as Stop['type']
    setTrips(trips.map((t) => t.id === tripId ? { ...t, stops: [...t.stops, { id: uid(), name, type, distance: dist, eta: dist / 80, note: '', done: false }].sort((a, b) => a.distance - b.distance) } : t))
  }
  const delTrip = (id: string) => { setTrips(trips.filter((t) => t.id !== id)); if (activeId === id) setActiveId(null); toast('已删除', 'success') }
  const toggleStop = (tripId: string, stopId: string) => setTrips(trips.map((t) => t.id === tripId ? { ...t, stops: t.stops.map((s) => s.id === stopId ? { ...s, done: !s.done } : s) } : t))
  const delStop = (tripId: string, stopId: string) => setTrips(trips.map((t) => t.id === tripId ? { ...t, stops: t.stops.filter((s) => s.id !== stopId) } : t))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Route className="w-5 h-5" />
          <h2 className="text-lg font-bold">自驾规划</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">途经点 · 油耗 · 过路费 · 实时进度</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{trips.length}</p><p className="text-[9px] opacity-80">行程</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{trips.reduce((s, t) => s + t.stops.length, 0)}</p><p className="text-[9px] opacity-80">途经</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{trips.reduce((s, t) => s + t.totalKm, 0)}</p><p className="text-[9px] opacity-80">km</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">¥{totalAllCost.toFixed(0)}</p><p className="text-[9px] opacity-80">总费</p></div>
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '新建行程'}
      </button>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="行程名 (如: 杭州 → 黄山 3 日)" className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">出发日期</div>
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">总里程 (km)</div>
              <input type="number" value={draft.totalKm} onChange={(e) => setDraft({ ...draft, totalKm: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">油耗 (L/100km)</div>
              <input type="number" step="0.1" value={draft.fuelL100} onChange={(e) => setDraft({ ...draft, fuelL100: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">油价 (¥/L)</div>
              <input type="number" step="0.01" value={draft.fuelPrice} onChange={(e) => setDraft({ ...draft, fuelPrice: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div className="col-span-2">
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">过路费 (¥)</div>
              <input type="number" value={draft.highwayFee} onChange={(e) => setDraft({ ...draft, highwayFee: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
          </div>
          <button onClick={addTrip} className="w-full h-9 rounded-lg bg-cyan-500 text-white text-xs font-semibold">创建</button>
        </div>
      )}

      {trips.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {trips.map((t) => (
            <button key={t.id} onClick={() => setActiveId(t.id)} className={cn('px-3 h-8 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0', activeId === t.id ? 'bg-cyan-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
              {t.done && '✅ '}{t.name}
            </button>
          ))}
        </div>
      )}

      {active && (
        <>
          <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-3 border border-cyan-200/40 dark:border-cyan-800/40">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-ink-800 dark:text-ink-200">{active.name}</h3>
              <div className="flex gap-1">
                <button onClick={() => addStop(active.id)} className="w-6 h-6 rounded bg-cyan-500 text-white flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                <button onClick={() => delTrip(active.id)} className="w-6 h-6 rounded bg-ink-100 dark:bg-ink-800 text-ink-400 flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
              <div><p className="text-ink-500">里程</p><p className="font-mono font-bold text-cyan-500">{active.totalKm}km</p></div>
              <div><p className="text-ink-500">油费</p><p className="font-mono font-bold text-amber-500">¥{calcFuel(active.totalKm, active.fuelL100, active.fuelPrice).toFixed(0)}</p></div>
              <div><p className="text-ink-500">过路</p><p className="font-mono font-bold text-violet-500">¥{active.highwayFee}</p></div>
              <div><p className="text-ink-500">总费</p><p className="font-mono font-bold text-emerald-500">¥{activeCost.toFixed(0)}</p></div>
            </div>
          </div>

          <div className="relative space-y-1.5 pl-6">
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gradient-to-b from-emerald-500 via-amber-500 to-red-500" />
            <AnimatePresence>
              {active.stops.map((s) => {
                const meta = STOP_META[s.type]
                const Icon = meta.icon
                return (
                  <motion.div key={s.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="relative">
                    <div className={cn('absolute -left-5 top-2 w-5 h-5 rounded-full flex items-center justify-center bg-gradient-to-br text-white shadow', meta.color)}>
                      <Icon className="w-2.5 h-2.5" />
                    </div>
                    <div className={cn('p-2 rounded-xl border', s.done ? 'bg-emerald-50/40 dark:bg-emerald-900/10 border-emerald-200/40 opacity-70' : 'bg-white/60 dark:bg-ink-900/40 border-ink-200/40 dark:border-ink-800/40')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 flex-1">
                          <button onClick={() => toggleStop(active.id, s.id)} className={cn('w-5 h-5 rounded flex items-center justify-center', s.done ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}>
                            <Check className="w-3 h-3" />
                          </button>
                          <span className={cn('text-xs font-semibold text-ink-800 dark:text-ink-200', s.done && 'line-through')}>{s.name}</span>
                          <span className="text-[9px] bg-ink-100 dark:bg-ink-800 px-1.5 py-0.5 rounded">{meta.label}</span>
                        </div>
                        <button onClick={() => delStop(active.id, s.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-ink-500 mt-0.5">
                        <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{s.distance}km</span>
                        <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{s.eta.toFixed(1)}h</span>
                      </div>
                      {s.note && <p className="text-[10px] text-ink-500 mt-0.5">💬 {s.note}</p>}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {trips.length === 0 && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <Route className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>规划第一次自驾游</p>
        </div>
      )}
    </div>
  )
}
