import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Recycle, Plus, Trash2, Calendar, Leaf, Thermometer, Droplet, Sparkles, CheckCircle, AlertCircle, Award, TrendingUp, RotateCcw } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface CompostBin {
  id: string
  name: string
  type: 'bin' | 'tumbler' | 'pile' | 'worm' | 'bokashi'
  startedDate: string
  status: 'active' | 'curing' | 'finished' | 'paused'
  volume: number
  unit: 'L' | 'm³'
  greens: number
  browns: number
  moisture: number
  temperature: number
  ph: number
  turns: number
  lastTurn: string
  nextTurn: string
  harvest: number
  note: string
}

const STORAGE_KEY = 'versa:compost-v1'

function load(): CompostBin[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: CompostBin[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): CompostBin[] {
  return [
    { id: '1', name: '厨余桶', type: 'bin', startedDate: '2026-03-01', status: 'active', volume: 50, unit: 'L', greens: 15, browns: 10, moisture: 50, temperature: 45, ph: 6.8, turns: 4, lastTurn: '2026-05-30', nextTurn: '2026-06-07', harvest: 0, note: '日常厨余堆肥' },
    { id: '2', name: '落叶堆', type: 'pile', startedDate: '2025-11-01', status: 'curing', volume: 0.5, unit: 'm³', greens: 5, browns: 30, moisture: 40, temperature: 25, ph: 7.0, turns: 6, lastTurn: '2026-05-20', nextTurn: '2026-06-15', harvest: 10, note: '秋冬落叶' },
  ]
}

const TYPE_META: Record<CompostBin['type'], { label: string; emoji: string; color: string }> = {
  bin: { label: '堆肥桶', emoji: '🪣', color: 'from-emerald-500 to-green-500' },
  tumbler: { label: '滚筒', emoji: '🔄', color: 'from-blue-500 to-cyan-500' },
  pile: { label: '堆肥堆', emoji: '⛰️', color: 'from-amber-600 to-orange-600' },
  worm: { label: '蚯蚓塔', emoji: '🪱', color: 'from-rose-500 to-pink-500' },
  bokashi: { label: '波卡西', emoji: '🧪', color: 'from-violet-500 to-purple-500' },
}

const STATUS_META: Record<CompostBin['status'], { label: string; color: string }> = {
  active: { label: '发酵中', color: 'bg-amber-500' },
  curing: { label: '熟化', color: 'bg-amber-700' },
  finished: { label: '完成', color: 'bg-emerald-500' },
  paused: { label: '暂停', color: 'bg-ink-400' },
}

const STATUS_RANK = { active: 0, curing: 1, finished: 2, paused: 0 }

export function CompostTracker() {
  const [list, setList] = useState<CompostBin[]>(load())
  const [showForm, setShowForm] = useState(false)
  const [active, setActive] = useState<string | null>(null)
  const [draft, setDraft] = useState<Omit<CompostBin, 'id'>>({ name: '', type: 'bin', startedDate: new Date().toISOString().slice(0, 10), status: 'active', volume: 50, unit: 'L', greens: 0, browns: 0, moisture: 50, temperature: 30, ph: 6.5, turns: 0, lastTurn: new Date().toISOString().slice(0, 10), nextTurn: '', harvest: 0, note: '' })

  useEffect(() => { save(list) }, [list])

  const stats = useMemo(() => {
    const total = list.length
    const activeBins = list.filter((b) => b.status === 'active').length
    const totalHarvest = list.reduce((s, b) => s + b.harvest, 0)
    const avgTemp = list.filter((b) => b.status === 'active').reduce((s, b, _, arr) => s + b.temperature / arr.length, 0)
    const totalTurns = list.reduce((s, b) => s + b.turns, 0)
    return { total, activeBins, totalHarvest, avgTemp: isNaN(avgTemp) ? 0 : avgTemp, totalTurns }
  }, [list])

  const getHealth = (b: CompostBin) => {
    const ratio = b.browns > 0 ? b.greens / b.browns : 0
    if (ratio >= 0.6 && ratio <= 0.8) return { label: '理想', color: 'emerald' }
    if (ratio < 0.6) return { label: '碳多', color: 'amber' }
    return { label: '氮多', color: 'rose' }
  }

  const add = () => {
    if (!draft.name) { toast('请填写名称', 'error'); return }
    setList([{ id: uid(), ...draft }, ...list])
    setShowForm(false)
    setDraft({ ...draft, name: '', greens: 0, browns: 0, note: '' })
    toast('已添加', 'success')
  }
  const del = (id: string) => { setList(list.filter((b) => b.id !== id)); setActive(null); toast('已删除', 'success') }
  const turn = (id: string) => {
    const today = new Date().toISOString().slice(0, 10)
    setList(list.map((b) => b.id === id ? { ...b, turns: b.turns + 1, lastTurn: today, nextTurn: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) } : b))
    toast('🔄 已翻堆', 'success')
  }
  const harvest = (id: string) => {
    setList(list.map((b) => b.id === id ? { ...b, status: 'finished', harvest: b.harvest + 1 } : b))
    toast('🌟 收获堆肥', 'success')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Recycle className="w-5 h-5" />
          <h2 className="text-lg font-bold">堆肥追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">5 类型 · 翻堆 · C:N 平衡 · 收获</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.total}</p><p className="text-[9px] opacity-80">堆肥箱</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.activeBins}</p><p className="text-[9px] opacity-80">发酵中</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.avgTemp.toFixed(0)}°</p><p className="text-[9px] opacity-80">均温</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.totalHarvest}</p><p className="text-[9px] opacity-80">收获</p></div>
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '添加堆肥箱'}
      </button>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="堆肥箱名" className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <div className="grid grid-cols-5 gap-1">
            {(Object.keys(TYPE_META) as (keyof typeof TYPE_META)[]).map((t) => (
              <button key={t} onClick={() => setDraft({ ...draft, type: t })} className={cn('h-10 rounded-lg flex flex-col items-center justify-center text-[10px]', draft.type === t ? `bg-gradient-to-br ${TYPE_META[t].color} text-white` : 'bg-ink-50 dark:bg-ink-800 text-ink-600')}>
                <span className="text-base">{TYPE_META[t].emoji}</span>
                <span className="text-[8px]">{TYPE_META[t].label}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">启动日</div>
              <input type="date" value={draft.startedDate} onChange={(e) => setDraft({ ...draft, startedDate: e.target.value })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">体积</div>
              <input type="number" value={draft.volume} onChange={(e) => setDraft({ ...draft, volume: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">单位</div>
              <select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as any })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
                <option value="L">L</option><option value="m³">m³</option>
              </select>
            </div>
          </div>
          <button onClick={add} className="w-full h-9 rounded-lg bg-emerald-500 text-white text-xs font-semibold">保存</button>
        </div>
      )}

      <div className="space-y-1.5">
        {list.sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]).map((b) => {
          const tm = TYPE_META[b.type]
          const sm = STATUS_META[b.status]
          const health = getHealth(b)
          const today = new Date().toISOString().slice(0, 10)
          const turnDue = b.nextTurn && b.nextTurn <= today
          return (
            <div key={b.id} className="rounded-2xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 dark:border-ink-800/40 overflow-hidden">
              <div className={cn('p-2.5 bg-gradient-to-br text-white', tm.color)}>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl">{tm.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{b.name}</p>
                    <p className="text-[10px] opacity-90">{tm.label} · 启动 {b.startedDate} · {b.volume}{b.unit}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold text-white', sm.color)}>{sm.label}</span>
                </div>
              </div>
              <div className="p-2.5">
                <div className="grid grid-cols-4 gap-1 text-center text-[10px] mb-1.5">
                  <div className="p-1 rounded bg-ink-50/60">
                    <p className="text-[9px] opacity-80">温</p>
                    <p className={cn('font-mono font-bold', b.temperature >= 45 ? 'text-rose-500' : b.temperature >= 30 ? 'text-amber-500' : 'text-blue-500')}>{b.temperature}°C</p>
                  </div>
                  <div className="p-1 rounded bg-ink-50/60">
                    <p className="text-[9px] opacity-80">湿</p>
                    <p className={cn('font-mono font-bold', b.moisture >= 50 && b.moisture <= 60 ? 'text-emerald-500' : 'text-amber-500')}>{b.moisture}%</p>
                  </div>
                  <div className="p-1 rounded bg-ink-50/60">
                    <p className="text-[9px] opacity-80">pH</p>
                    <p className={cn('font-mono font-bold', b.ph >= 6 && b.ph <= 7.5 ? 'text-emerald-500' : 'text-amber-500')}>{b.ph}</p>
                  </div>
                  <div className="p-1 rounded bg-ink-50/60">
                    <p className="text-[9px] opacity-80">翻堆</p>
                    <p className="font-mono font-bold">{b.turns}次</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <div>
                    <div className="flex justify-between mb-0.5"><span className="text-emerald-600 font-semibold">🌱 氮料</span><span className="font-mono">{b.greens}</span></div>
                    <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, b.greens * 2)}%` }} className="h-full bg-gradient-to-r from-emerald-500 to-green-500" /></div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-0.5"><span className="text-amber-600 font-semibold">🍂 碳料</span><span className="font-mono">{b.browns}</span></div>
                    <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, b.browns * 2)}%` }} className="h-full bg-gradient-to-r from-amber-500 to-orange-500" /></div>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="text-[10px] text-ink-500">C:N:</span>
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', health.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' : health.color === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700')}>{health.label}</span>
                  <span className="text-[10px] text-ink-500 ml-auto">最后翻 {b.lastTurn}</span>
                </div>
                {b.note && <p className="text-[10px] text-ink-500 mt-1">💬 {b.note}</p>}
                {active === b.id ? (
                  <div className="mt-1.5 grid grid-cols-3 gap-1">
                    <button onClick={() => turn(b.id)} className="h-7 rounded-lg bg-emerald-500 text-white text-[10px] font-semibold flex items-center justify-center gap-0.5"><RotateCcw className="w-3 h-3" />翻堆</button>
                    {b.status === 'active' && <button onClick={() => harvest(b.id)} className="h-7 rounded-lg bg-amber-500 text-white text-[10px] font-semibold flex items-center justify-center gap-0.5"><Award className="w-3 h-3" />收获</button>}
                    <button onClick={() => del(b.id)} className="h-7 rounded-lg bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center gap-0.5"><Trash2 className="w-3 h-3" />删除</button>
                  </div>
                ) : (
                  <button onClick={() => setActive(b.id)} className="mt-1.5 w-full h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-600 text-[10px] font-semibold">操作</button>
                )}
                {turnDue && <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-0.5"><AlertCircle className="w-2.5 h-2.5" />翻堆到期</p>}
              </div>
            </div>
          )
        })}
      </div>

      {list.length === 0 && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <Recycle className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>暂无堆肥箱</p>
        </div>
      )}
    </div>
  )
}
