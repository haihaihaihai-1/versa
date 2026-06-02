import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Pill, Plus, Trash2, Sparkles, Loader2, Clock, Package, AlertCircle, Check, Sun, Moon, Sunset, Sunrise } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Medication {
  id: string
  name: string
  dosage: string
  times: string[]
  stock: number
  unit: string
  expiry: string
  withFood: boolean
  notes: string
  taken: { [date: string]: string[] }
}

const STORAGE_KEY = 'versa:meds-v1'

function load(): Medication[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Medication[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Medication[] {
  return [
    { id: 'm1', name: '维生素 D3', dosage: '1000 IU', times: ['08:00'], stock: 24, unit: '粒', expiry: '2027-06-30', withFood: true, notes: '随早餐', taken: {} },
    { id: 'm2', name: '鱼油', dosage: '500mg', times: ['08:00', '20:00'], stock: 60, unit: '粒', expiry: '2027-12-31', withFood: true, notes: '', taken: {} },
    { id: 'm3', name: '褪黑素', dosage: '3mg', times: ['22:30'], stock: 15, unit: '片', expiry: '2026-12-31', withFood: false, notes: '睡前 30 分钟', taken: {} },
  ]
}

function todayKey() { return new Date().toISOString().split('T')[0] }
function timeToIcon(t: string) {
  const h = +t.split(':')[0]
  if (h < 6) return Moon
  if (h < 11) return Sunrise
  if (h < 14) return Sun
  if (h < 18) return Sun
  if (h < 22) return Sunset
  return Moon
}

export function MedicationReminder() {
  const [meds, setMeds] = useState<Medication[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [times, setTimes] = useState('08:00,20:00')
  const [stock, setStock] = useState('30')
  const [unit, setUnit] = useState('粒')
  const [expiry, setExpiry] = useState('')
  const [withFood, setWithFood] = useState(true)
  const [notes, setNotes] = useState('')

  useEffect(() => { save(meds) }, [meds])

  const today = todayKey()
  const lowStock = meds.filter((m) => m.stock < 7).length
  const expiringSoon = meds.filter((m) => m.expiry && new Date(m.expiry).getTime() - Date.now() < 90 * 86400000).length
  const totalTaken = meds.reduce((s, m) => s + (m.taken[today]?.length || 0), 0)
  const totalDoses = meds.reduce((s, m) => s + m.times.length, 0)

  const add = () => {
    if (!name.trim()) { toast('请输入药品名', 'error'); return }
    const ts = times.split(',').map((t) => t.trim()).filter((t) => /^\d{2}:\d{2}$/.test(t))
    if (ts.length === 0) { toast('请输入有效时间', 'error'); return }
    const m: Medication = { id: uid(), name, dosage, times: ts, stock: +stock, unit, expiry, withFood, notes, taken: {} }
    setMeds([m, ...meds])
    setName(''); setDosage(''); setTimes('08:00'); setStock('30'); setUnit('粒'); setExpiry(''); setNotes(''); setWithFood(true)
    setAdding(false)
    toast('已添加', 'success')
  }

  const remove = (id: string) => setMeds(meds.filter((m) => m.id !== id))
  const refill = (id: string, n: number) => setMeds(meds.map((m) => m.id === id ? { ...m, stock: Math.max(0, m.stock + n) } : m))

  const markTaken = (id: string, time: string) => {
    setMeds(meds.map((m) => {
      if (m.id !== id) return m
      const taken = m.taken[today] || []
      if (taken.includes(time)) {
        const next = { ...m.taken }; delete next[today]
        return { ...m, taken: next, stock: Math.min(m.stock + 1, 999) }
      }
      return { ...m, taken: { ...m.taken, [today]: [...taken, time] }, stock: Math.max(0, m.stock - 1) }
    }))
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = meds.map((m) => `${m.name} ${m.dosage} ${m.times.join('/')}`).join('; ')
      const result = await aiComplete(`用户用药: ${summary}. 给 3 条 50 字内服药建议 (间隔/食物), 中文`, '你是 Versa 健康顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Pill className="w-5 h-5" />
          <h2 className="text-lg font-bold">用药提醒</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">定时提醒 · 库存管理 · 过期预警</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{meds.length}</p>
            <p className="text-[9px] opacity-80">药品</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalTaken}/{totalDoses}</p>
            <p className="text-[9px] opacity-80">今日</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{lowStock}</p>
            <p className="text-[9px] opacity-80">低库存</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{expiringSoon}</p>
            <p className="text-[9px] opacity-80">将过期</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加药品
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="space-y-1.5">
        {meds.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Pill className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有药品</p>
          </div>
        ) : meds.map((m) => {
          const takenToday = m.taken[today] || []
          const lowS = m.stock < 7
          const expSoon = m.expiry && new Date(m.expiry).getTime() - Date.now() < 90 * 86400000
          return (
            <motion.div key={m.id} whileHover={{ y: -1 }} className={cn('rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border', lowS || expSoon ? 'border-amber-400' : 'border-ink-200/60 dark:border-ink-800/60')}>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0">
                  <Pill className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{m.name}</p>
                  <p className="text-[10px] text-ink-500">{m.dosage} · {m.times.join(', ')} {m.withFood && '· 餐时'}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-bold', lowS ? 'text-amber-500' : 'text-ink-700 dark:text-ink-300')}>{m.stock}<span className="text-[10px] font-normal text-ink-500 ml-0.5">{m.unit}</span></p>
                  {(lowS || expSoon) && <AlertCircle className="w-3 h-3 text-amber-500 inline" />}
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {m.times.map((t) => {
                  const taken = takenToday.includes(t)
                  const Icon = timeToIcon(t)
                  return (
                    <button key={t} onClick={() => markTaken(m.id, t)} className={cn('px-2 h-7 rounded-lg text-[10px] font-semibold flex items-center gap-1', taken ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                      {taken ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}{t}
                    </button>
                  )
                })}
                <button onClick={() => refill(m.id, 30)} className="px-2 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-500 text-[10px] font-semibold flex items-center gap-0.5">
                  <Package className="w-3 h-3" />补 30
                </button>
                <button onClick={() => remove(m.id)} className="ml-auto text-ink-400 hover:text-rose-500 text-xs px-1">×</button>
              </div>
              {m.notes && <p className="text-[10px] text-ink-500 mt-1">📝 {m.notes}</p>}
              {m.expiry && <p className="text-[10px] text-ink-500">📅 到期: {m.expiry}</p>}
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">添加药品</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="药品名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="剂量 (如 100mg)" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="单位 (粒/片)" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <input value={times} onChange={(e) => setTimes(e.target.value)} placeholder="时间 (逗号分隔, 如 08:00,20:00)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">库存</p>
                <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">到期</p>
                <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={withFood} onChange={(e) => setWithFood(e.target.checked)} className="rounded" />随餐服用
            </label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
