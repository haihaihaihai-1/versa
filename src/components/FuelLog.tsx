import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Fuel, Plus, Trash2, TrendingUp, DollarSign, Gauge, Calendar, MapPin, Award, Droplet, Calculator } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface FuelEntry {
  id: string
  date: string
  odometer: number
  liters: number
  price: number
  full: boolean
  station: string
  note: string
}

const STORAGE_KEY = 'versa:fuel-log-v1'

function load(): FuelEntry[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: FuelEntry[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): FuelEntry[] {
  return [
    { id: '1', date: '2026-05-28', odometer: 12500, liters: 42.5, price: 7.89, full: true, station: '中石化', note: '高速服务区' },
    { id: '2', date: '2026-05-15', odometer: 12180, liters: 38.2, price: 7.79, full: true, station: '中石油', note: '通勤补油' },
    { id: '3', date: '2026-05-02', odometer: 11900, liters: 35.8, price: 7.85, full: true, station: '壳牌', note: '' },
    { id: '4', date: '2026-04-20', odometer: 11620, liters: 40.0, price: 7.92, full: true, station: '中石化', note: '五一前加满' },
  ]
}

export function FuelLog() {
  const [entries, setEntries] = useState<FuelEntry[]>(load())
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<Omit<FuelEntry, 'id'>>({ date: new Date().toISOString().slice(0, 10), odometer: 0, liters: 0, price: 7.85, full: true, station: '', note: '' })

  useEffect(() => { save(entries) }, [entries])

  const stats = useMemo(() => {
    if (entries.length < 2) return { totalLiters: 0, totalCost: 0, totalDist: 0, avgL100: 0, avgCost: 0, lastL100: 0 }
    const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
    const totalLiters = entries.reduce((s, e) => s + e.liters, 0)
    const totalCost = entries.reduce((s, e) => s + e.liters * e.price, 0)
    const totalDist = sorted[sorted.length - 1].odometer - sorted[0].odometer
    const fullEntries = entries.filter((e) => e.full)
    let totalFullLiters = 0
    let totalFullDist = 0
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].full && sorted[i - 1].full) {
        totalFullLiters += sorted[i].liters
        totalFullDist += sorted[i].odometer - sorted[i - 1].odometer
      }
    }
    const avgL100 = totalFullDist > 0 ? (totalFullLiters / totalFullDist) * 100 : 0
    const avgCost = totalDist > 0 ? (totalFullLiters * (totalCost / totalLiters)) / totalDist * 100 : 0
    const last = fullEntries[0] && fullEntries[1] ? (fullEntries[0].liters / (fullEntries[0].odometer - fullEntries[1].odometer)) * 100 : 0
    return { totalLiters, totalCost, totalDist, avgL100, avgCost, lastL100: last }
  }, [entries])

  const add = () => {
    if (!draft.date || draft.liters <= 0) { toast('请填写日期和升数', 'error'); return }
    setEntries([{ id: uid(), ...draft }, ...entries])
    setShowForm(false)
    setDraft({ ...draft, liters: 0, note: '' })
    toast('已添加', 'success')
  }
  const del = (id: string) => { setEntries(entries.filter((e) => e.id !== id)); toast('已删除', 'success') }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Fuel className="w-5 h-5" />
          <h2 className="text-lg font-bold">加油记录</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">油耗分析 · 百公里计算 · 费用统计</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{entries.length}</p><p className="text-[9px] opacity-80">次数</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.avgL100 ? stats.avgL100.toFixed(1) : '-'}</p><p className="text-[9px] opacity-80">L/100km</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">¥{stats.totalCost.toFixed(0)}</p><p className="text-[9px] opacity-80">总花费</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.totalDist}</p><p className="text-[9px] opacity-80">km</p></div>
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '记一笔'}
      </button>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">日期</div>
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">里程 (km)</div>
              <input type="number" value={draft.odometer || ''} onChange={(e) => setDraft({ ...draft, odometer: Number(e.target.value) })} placeholder="12500" className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">升数 (L)</div>
              <input type="number" step="0.01" value={draft.liters || ''} onChange={(e) => setDraft({ ...draft, liters: Number(e.target.value) })} placeholder="42.5" className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">单价 (¥/L)</div>
              <input type="number" step="0.01" value={draft.price || ''} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} placeholder="7.85" className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div className="col-span-2">
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">加油站</div>
              <input value={draft.station} onChange={(e) => setDraft({ ...draft, station: e.target.value })} placeholder="中石化/中石油/壳牌" className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={draft.full} onChange={(e) => setDraft({ ...draft, full: e.target.checked })} className="accent-rose-500" />
            满油 (用于计算油耗)
          </label>
          <button onClick={add} className="w-full h-9 rounded-lg bg-rose-500 text-white text-xs font-semibold">保存</button>
        </div>
      )}

      {entries.length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-rose-500" />油耗趋势</div>
          <div className="flex items-end gap-0.5 h-20">
            {[...entries].reverse().slice(0, 12).map((e) => {
              const h = Math.min(100, (e.liters / 50) * 100)
              return (
                <div key={e.id} className="flex-1 flex flex-col items-center gap-0.5">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} className="w-full rounded-t bg-gradient-to-t from-rose-500 to-pink-400" />
                  <span className="text-[8px] text-ink-500">{e.liters.toFixed(0)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {entries.map((e) => (
          <div key={e.id} className="p-2.5 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 dark:border-ink-800/40">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Droplet className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-xs font-semibold text-ink-800 dark:text-ink-200">{e.station || '加油站'}</span>
                {e.full && <span className="text-[9px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-1.5 rounded">满</span>}
              </div>
              <button onClick={() => del(e.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[10px] text-ink-600 dark:text-ink-300">
              <div className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{e.date}</div>
              <div className="flex items-center gap-0.5"><Gauge className="w-2.5 h-2.5" />{e.odometer}km</div>
              <div className="font-mono font-bold text-rose-500">{e.liters.toFixed(1)}L</div>
              <div className="font-mono font-bold text-emerald-500">¥{(e.liters * e.price).toFixed(0)}</div>
            </div>
            {e.note && <p className="text-[10px] text-ink-500 mt-1">💬 {e.note}</p>}
          </div>
        ))}
      </div>

      {entries.length === 0 && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <Fuel className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>添加第一笔加油记录</p>
        </div>
      )}
    </div>
  )
}
