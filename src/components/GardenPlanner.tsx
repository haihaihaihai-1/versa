import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { LayoutGrid, Plus, Trash2, MapPin, Sun, Sprout, Calendar, Save, Eye, EyeOff } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Plot {
  id: string
  name: string
  x: number
  y: number
  plant: string
  season: 'spring' | 'summer' | 'autumn' | 'winter' | 'all'
  note: string
}

const STORAGE_KEY = 'versa:garden-plots-v1'

function load(): Plot[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Plot[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Plot[] {
  return [
    { id: '1', name: '番茄区', x: 0, y: 0, plant: '🍅 番茄', season: 'spring', note: '主菜区' },
    { id: '2', name: '香草角', x: 1, y: 0, plant: '🌿 薄荷', season: 'all', note: '泡茶用' },
    { id: '3', name: '月季花墙', x: 0, y: 1, plant: '🌹 月季', season: 'spring', note: '靠南墙' },
    { id: '4', name: '草莓带', x: 1, y: 1, plant: '🍓 草莓', season: 'spring', note: '高架' },
    { id: '5', name: '黄瓜架', x: 2, y: 0, plant: '🥒 黄瓜', season: 'summer', note: '需搭架' },
  ]
}

const SEASON_META = {
  spring: { label: '春', color: 'from-pink-500 to-rose-500', emoji: '🌸' },
  summer: { label: '夏', color: 'from-amber-500 to-orange-500', emoji: '☀️' },
  autumn: { label: '秋', color: 'from-orange-600 to-red-600', emoji: '🍁' },
  winter: { label: '冬', color: 'from-cyan-500 to-blue-500', emoji: '❄️' },
  all: { label: '四季', color: 'from-emerald-500 to-teal-500', emoji: '🌿' },
}

export function GardenPlanner() {
  const [plots, setPlots] = useState<Plot[]>(load())
  const [showForm, setShowForm] = useState(false)
  const [activeSeason, setActiveSeason] = useState<'all' | keyof typeof SEASON_META>('all')
  const [draft, setDraft] = useState<Omit<Plot, 'id'>>({ name: '', x: 0, y: 0, plant: '', season: 'spring', note: '' })

  useEffect(() => { save(plots) }, [plots])

  const currentSeason = useMemo(() => {
    const m = new Date().getMonth() + 1
    if (m >= 3 && m <= 5) return 'spring'
    if (m >= 6 && m <= 8) return 'summer'
    if (m >= 9 && m <= 11) return 'autumn'
    return 'winter'
  }, [])

  const visible = plots.filter((p) => activeSeason === 'all' || p.season === activeSeason || p.season === 'all')
  const grid = useMemo(() => {
    const maxX = Math.max(2, ...plots.map((p) => p.x))
    const maxY = Math.max(1, ...plots.map((p) => p.y))
    return { maxX: maxX + 1, maxY: maxY + 1 }
  }, [plots])

  const add = () => {
    if (!draft.name || !draft.plant) { toast('请填写名称和植物', 'error'); return }
    setPlots([...plots, { id: uid(), ...draft }])
    setShowForm(false)
    setDraft({ ...draft, name: '', plant: '' })
    toast('已添加', 'success')
  }
  const del = (id: string) => { setPlots(plots.filter((p) => p.id !== id)); toast('已删除', 'success') }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <LayoutGrid className="w-5 h-5" />
          <h2 className="text-lg font-bold">花园规划</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">3x2 网格 · 季节规划 · 当前 {SEASON_META[currentSeason].emoji} {SEASON_META[currentSeason].label}</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{plots.length}</p><p className="text-[9px] opacity-80">地块</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{visible.length}</p><p className="text-[9px] opacity-80">本季</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{plots.filter((p) => p.season === currentSeason || p.season === 'all').length}</p><p className="text-[9px] opacity-80">适季</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{grid.maxX * grid.maxY}</p><p className="text-[9px] opacity-80">容量</p></div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['all', ...Object.keys(SEASON_META)] as const).map((s) => (
          <button key={s} onClick={() => setActiveSeason(s as any)} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0 flex items-center gap-1', activeSeason === s ? `bg-gradient-to-r ${SEASON_META[s as keyof typeof SEASON_META].color} text-white` : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
            {s === 'all' ? '全部' : <>{SEASON_META[s as keyof typeof SEASON_META].emoji} {SEASON_META[s as keyof typeof SEASON_META].label}</>}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2 border border-ink-200/40 dark:border-ink-800/40">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${grid.maxX}, minmax(0, 1fr))` }}>
          {Array.from({ length: grid.maxY }).map((_, y) =>
            Array.from({ length: grid.maxX }).map((_, x) => {
              const p = plots.find((p) => p.x === x && p.y === y)
              if (p && visible.includes(p)) {
                const meta = SEASON_META[p.season]
                return (
                  <div key={`${x}-${y}`} className={cn('aspect-square rounded-lg flex flex-col items-center justify-center p-1 text-white text-center bg-gradient-to-br', meta.color)}>
                    <span className="text-xl">{p.plant.split(' ')[0]}</span>
                    <span className="text-[8px] font-semibold leading-tight">{p.plant.split(' ')[1] || p.name}</span>
                    <span className="text-[7px] opacity-80">({x},{y})</span>
                  </div>
                )
              }
              return <div key={`${x}-${y}`} className="aspect-square rounded-lg border-2 border-dashed border-ink-200/40 dark:border-ink-700/40 flex items-center justify-center text-[10px] text-ink-300">空</div>
            })
          )}
        </div>
        <div className="text-[9px] text-ink-500 text-center mt-1">📐 网格坐标 ({grid.maxX}×{grid.maxY}) · 空白处可新建设施</div>
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '添加地块'}
      </button>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="地块名" className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <input value={draft.plant} onChange={(e) => setDraft({ ...draft, plant: e.target.value })} placeholder="植物 (如 🌅 番茄)" className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">X 坐标 (0-{grid.maxX - 1})</div>
              <input type="number" min="0" max={grid.maxX - 1} value={draft.x} onChange={(e) => setDraft({ ...draft, x: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">Y 坐标 (0-{grid.maxY - 1})</div>
              <input type="number" min="0" max={grid.maxY - 1} value={draft.y} onChange={(e) => setDraft({ ...draft, y: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {(Object.keys(SEASON_META) as (keyof typeof SEASON_META)[]).map((s) => (
              <button key={s} onClick={() => setDraft({ ...draft, season: s })} className={cn('h-9 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[9px]', draft.season === s ? `bg-gradient-to-br ${SEASON_META[s].color} text-white` : 'bg-ink-50 dark:bg-ink-800 text-ink-600')}>
                <span className="text-base">{SEASON_META[s].emoji}</span>{SEASON_META[s].label}
              </button>
            ))}
          </div>
          <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="备注" className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <button onClick={add} className="w-full h-9 rounded-lg bg-emerald-500 text-white text-xs font-semibold">保存</button>
        </div>
      )}

      <div className="space-y-1.5">
        {visible.map((p) => {
          const meta = SEASON_META[p.season]
          return (
            <div key={p.id} className="p-2.5 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 dark:border-ink-800/40">
              <div className="flex items-center gap-1.5">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-xl bg-gradient-to-br text-white', meta.color)}>
                  {p.plant.split(' ')[0]}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-ink-800 dark:text-ink-200">{p.name}</p>
                  <p className="text-[10px] text-ink-500">{p.plant} · ({p.x},{p.y}) · {meta.emoji} {meta.label}</p>
                </div>
                <button onClick={() => del(p.id)} className="text-ink-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              {p.note && <p className="text-[10px] text-ink-500 mt-1 ml-10">💬 {p.note}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
