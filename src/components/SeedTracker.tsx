import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sprout, Plus, Trash2, Calendar, Droplet, Sun, AlertCircle, CheckCircle, Sparkles, TrendingUp, Package, Award } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Seed {
  id: string
  name: string
  variety: string
  source: string
  category: 'vegetable' | 'flower' | 'herb' | 'fruit' | 'grain'
  emoji: string
  quantity: number
  harvestDate: string
  expiryDate: string
  planted: number
  germinated: number
  note: string
}

const STORAGE_KEY = 'versa:seeds-v1'

function load(): Seed[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Seed[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Seed[] {
  return [
    { id: '1', name: '番茄', variety: '圣女果', source: '虹越', category: 'vegetable', emoji: '🍅', quantity: 50, harvestDate: '2024-09-15', expiryDate: '2027-09-15', planted: 20, germinated: 18, note: '高产品种' },
    { id: '2', name: '罗勒', variety: '甜罗勒', source: '本地农贸市场', category: 'herb', emoji: '🌿', quantity: 200, harvestDate: '2025-04-20', expiryDate: '2028-04-20', planted: 30, germinated: 28, note: '意大利菜必备' },
    { id: '3', name: '月季', variety: '卡罗拉红', source: '淘宝花圃', category: 'flower', emoji: '🌹', quantity: 30, harvestDate: '2024-10-10', expiryDate: '2026-10-10', planted: 10, germinated: 7, note: '需冷藏保存' },
    { id: '4', name: '草莓', variety: '红颜', source: '虹越', category: 'fruit', emoji: '🍓', quantity: 100, harvestDate: '2025-03-15', expiryDate: '2027-03-15', planted: 0, germinated: 0, note: '冰箱冷藏' },
  ]
}

const CATEGORY_LABELS: Record<Seed['category'], string> = {
  vegetable: '蔬菜', flower: '花卉', herb: '香草', fruit: '水果', grain: '谷物',
}

export function SeedTracker() {
  const [list, setList] = useState<Seed[]>(load())
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<Seed['category'] | 'all' | 'low'>('all')
  const [draft, setDraft] = useState<Omit<Seed, 'id'>>({ name: '', variety: '', source: '', category: 'vegetable', emoji: '🌱', quantity: 0, harvestDate: new Date().toISOString().slice(0, 10), expiryDate: '', planted: 0, germinated: 0, note: '' })

  useEffect(() => { save(list) }, [list])

  const filtered = useMemo(() => {
    if (filter === 'low') return list.filter((s) => s.quantity < 20)
    if (filter === 'all') return list
    return list.filter((s) => s.category === filter)
  }, [list, filter])

  const stats = useMemo(() => {
    const total = list.reduce((s, l) => s + l.quantity, 0)
    const planted = list.reduce((s, l) => s + l.planted, 0)
    const germinated = list.reduce((s, l) => s + l.germinated, 0)
    const germRate = planted > 0 ? (germinated / planted) * 100 : 0
    const expiring = list.filter((s) => {
      if (!s.expiryDate) return false
      const days = Math.floor((new Date(s.expiryDate).getTime() - Date.now()) / 86400000)
      return days <= 180 && days > 0
    }).length
    return { total, planted, germinated, germRate, expiring, varieties: list.length }
  }, [list])

  const add = () => {
    if (!draft.name || draft.quantity <= 0) { toast('请填写名称和数量', 'error'); return }
    setList([{ id: uid(), ...draft }, ...list])
    setShowForm(false)
    setDraft({ ...draft, name: '', variety: '', quantity: 0, note: '' })
    toast('已添加', 'success')
  }
  const del = (id: string) => { setList(list.filter((s) => s.id !== id)); toast('已删除', 'success') }
  const germinate = (id: string) => {
    setList(list.map((s) => s.id === id ? { ...s, germinated: Math.min(s.planted, s.germinated + 1) } : s))
    toast('已记录发芽', 'success')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sprout className="w-5 h-5" />
          <h2 className="text-lg font-bold">种子管理</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">库存 · 采收日 · 过期提醒 · 发芽率</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.varieties}</p><p className="text-[9px] opacity-80">品种</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.total}</p><p className="text-[9px] opacity-80">总粒</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.germRate.toFixed(0)}%</p><p className="text-[9px] opacity-80">发芽率</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.expiring}</p><p className="text-[9px] opacity-80">将过期</p></div>
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '添加种子'}
      </button>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="种子名" className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <input value={draft.variety} onChange={(e) => setDraft({ ...draft, variety: e.target.value })} placeholder="品种" className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <input value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} placeholder="来源" className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <input value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} placeholder="🌱" className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 text-center" />
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(Object.keys(CATEGORY_LABELS) as Seed['category'][]).map((c) => (
              <button key={c} onClick={() => setDraft({ ...draft, category: c })} className={cn('h-8 rounded-lg text-[10px] font-semibold', draft.category === c ? 'bg-amber-500 text-white' : 'bg-ink-50 dark:bg-ink-800 text-ink-600')}>
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">数量 (粒)</div>
              <input type="number" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">采收日</div>
              <input type="date" value={draft.harvestDate} onChange={(e) => setDraft({ ...draft, harvestDate: e.target.value })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">过期日</div>
              <input type="date" value={draft.expiryDate} onChange={(e) => setDraft({ ...draft, expiryDate: e.target.value })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">已播</div>
              <input type="number" value={draft.planted} onChange={(e) => setDraft({ ...draft, planted: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">已发芽</div>
              <input type="number" value={draft.germinated} onChange={(e) => setDraft({ ...draft, germinated: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
          </div>
          <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="备注" className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <button onClick={add} className="w-full h-9 rounded-lg bg-amber-500 text-white text-xs font-semibold">保存</button>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['all', 'low', ...Object.keys(CATEGORY_LABELS)] as const).map((c) => (
          <button key={c} onClick={() => setFilter(c as any)} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0', filter === c ? 'bg-amber-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
            {c === 'all' ? '全部' : c === 'low' ? '⚠️ 库存低' : CATEGORY_LABELS[c as Seed['category']]}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.map((s) => {
          const today = new Date()
          const expDays = s.expiryDate ? Math.floor((new Date(s.expiryDate).getTime() - today.getTime()) / 86400000) : 999
          const germRate = s.planted > 0 ? (s.germinated / s.planted) * 100 : 0
          const lowStock = s.quantity < 20
          return (
            <div key={s.id} className={cn('p-2.5 rounded-xl border', lowStock ? 'bg-rose-50/40 dark:bg-rose-900/10 border-rose-300/40' : expDays <= 180 ? 'bg-amber-50/40 dark:bg-amber-900/10 border-amber-300/40' : 'bg-white/60 dark:bg-ink-900/40 border-ink-200/40 dark:border-ink-800/40')}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-2xl">{s.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-ink-800 dark:text-ink-200 truncate">{s.name} · {s.variety}</p>
                  <p className="text-[10px] text-ink-500">{s.source} · {CATEGORY_LABELS[s.category]}</p>
                </div>
                <button onClick={() => del(s.id)} className="text-ink-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                <div className={cn('p-1 rounded', lowStock ? 'bg-rose-100/40 text-rose-700' : 'bg-ink-50/60')}>
                  <p className="text-[9px] opacity-80">库存</p>
                  <p className="font-mono font-bold">{s.quantity}粒</p>
                </div>
                <div className="p-1 rounded bg-ink-50/60">
                  <p className="text-[9px] opacity-80">已播</p>
                  <p className="font-mono font-bold">{s.planted}</p>
                </div>
                <div className="p-1 rounded bg-ink-50/60">
                  <p className="text-[9px] opacity-80">发芽</p>
                  <p className="font-mono font-bold text-emerald-600">{s.germinated}</p>
                </div>
                <div className="p-1 rounded bg-ink-50/60">
                  <p className="text-[9px] opacity-80">发芽率</p>
                  <p className={cn('font-mono font-bold', germRate >= 80 ? 'text-emerald-600' : germRate >= 50 ? 'text-amber-600' : 'text-rose-600')}>{germRate.toFixed(0)}%</p>
                </div>
              </div>
              {s.planted > 0 && (
                <div className="mt-1.5">
                  <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${germRate}%` }} className={cn('h-full', germRate >= 80 ? 'bg-gradient-to-r from-emerald-500 to-green-500' : germRate >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-rose-500 to-red-500')} />
                  </div>
                  {s.germinated < s.planted && (
                    <button onClick={() => germinate(s.id)} className="mt-1 w-full h-6 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold flex items-center justify-center gap-0.5"><CheckCircle className="w-2.5 h-2.5" />记录发芽</button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5 text-[10px] text-ink-500 mt-1">
                <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{s.harvestDate}</span>
                {s.expiryDate && <span className={cn('flex items-center gap-0.5', expDays <= 180 ? 'text-amber-600 font-semibold' : 'text-ink-500')}>
                  {expDays <= 180 ? <AlertCircle className="w-2.5 h-2.5" /> : <CheckCircle className="w-2.5 h-2.5" />}
                  {expDays > 0 ? `${expDays}天到期` : '已过期'}
                </span>}
              </div>
              {s.note && <p className="text-[10px] text-ink-500 mt-1">💬 {s.note}</p>}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <Sprout className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>暂无种子记录</p>
        </div>
      )}
    </div>
  )
}
