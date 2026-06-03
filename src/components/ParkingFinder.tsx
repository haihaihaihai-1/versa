import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Plus, Trash2, Star, Navigation, Search, CircleParking, SquareParking, Building2, Banknote, Clock, Shield, Car as CarIcon, Layers, Heart } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Spot {
  id: string
  name: string
  type: 'indoor' | 'outdoor' | 'street' | 'underground' | 'rooftop'
  price: number
  priceUnit: 'hour' | 'day' | 'month' | 'free'
  distance: number
  rating: 1 | 2 | 3 | 4 | 5
  ev: boolean
  security: boolean
  covered: boolean
  note: string
  favorite: boolean
}

const TYPE_META = {
  indoor: { label: '室内', icon: Building2, color: 'from-cyan-500 to-blue-500' },
  outdoor: { label: '露天', icon: SquareParking, color: 'from-amber-500 to-orange-500' },
  street: { label: '路边', icon: MapPin, color: 'from-rose-500 to-pink-500' },
  underground: { label: '地下', icon: Building2, color: 'from-violet-500 to-purple-500' },
  rooftop: { label: '楼顶', icon: Building2, color: 'from-pink-500 to-fuchsia-500' },
} as const

const STORAGE_KEY = 'versa:parking-finder-v1'

function load(): Spot[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Spot[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Spot[] {
  return [
    { id: '1', name: '万达广场 B1 停车场', type: 'underground', price: 8, priceUnit: 'hour', distance: 0.3, rating: 4, ev: true, security: true, covered: true, note: '24h 营业, 电梯直达', favorite: true },
    { id: '2', name: '市政府路边车位', type: 'street', price: 5, priceUnit: 'hour', distance: 0.5, rating: 3, ev: false, security: false, covered: false, note: '工作日 8-20 点', favorite: false },
    { id: '3', name: '小区地面车位', type: 'outdoor', price: 300, priceUnit: 'month', distance: 0.1, rating: 5, ev: false, security: true, covered: false, note: '包月 300/月, 固定位', favorite: true },
    { id: '4', name: '公园地下车库', type: 'underground', price: 0, priceUnit: 'free', distance: 1.2, rating: 4, ev: false, security: true, covered: true, note: '前 2h 免费', favorite: false },
    { id: '5', name: '酒店代客泊车', type: 'indoor', price: 60, priceUnit: 'day', distance: 2.0, rating: 5, ev: true, security: true, covered: true, note: '含洗车', favorite: false },
  ]
}

export function ParkingFinder() {
  const [list, setList] = useState<Spot[]>(load())
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<keyof typeof TYPE_META | 'all' | 'fav'>('all')
  const [maxPrice, setMaxPrice] = useState(100)
  const [draft, setDraft] = useState<Omit<Spot, 'id' | 'favorite'>>({ name: '', type: 'outdoor', price: 0, priceUnit: 'hour', distance: 0, rating: 3, ev: false, security: false, covered: false, note: '' })

  useEffect(() => { save(list) }, [list])

  const filtered = useMemo(() => {
    return list.filter((s) => {
      if (filterType === 'fav' && !s.favorite) return false
      if (filterType !== 'all' && filterType !== 'fav' && s.type !== filterType) return false
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
      if (s.price > maxPrice && s.priceUnit !== 'free') return false
      return true
    }).sort((a, b) => a.distance - b.distance)
  }, [list, search, filterType, maxPrice])

  const add = () => {
    if (!draft.name) { toast('请填写名称', 'error'); return }
    setList([{ id: uid(), favorite: false, ...draft }, ...list])
    setShowForm(false)
    setDraft({ ...draft, name: '', price: 0, note: '' })
    toast('已添加', 'success')
  }
  const del = (id: string) => { setList(list.filter((s) => s.id !== id)); toast('已删除', 'success') }
  const fav = (id: string) => setList(list.map((s) => s.id === id ? { ...s, favorite: !s.favorite } : s))

  const cheapest = list.filter((s) => s.priceUnit === 'free' || s.price <= 5).length
  const evCount = list.filter((s) => s.ev).length

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <CircleParking className="w-5 h-5" />
          <h2 className="text-lg font-bold">停车位查找</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">5 类型 · 价格/距离/评分 · 收藏</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{list.length}</p><p className="text-[9px] opacity-80">车位</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{cheapest}</p><p className="text-[9px] opacity-80">低价</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{evCount}</p><p className="text-[9px] opacity-80">充电</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{list.filter((s) => s.favorite).length}</p><p className="text-[9px] opacity-80">收藏</p></div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索车位..." className="w-full h-9 pl-8 pr-3 text-xs bg-white/60 dark:bg-ink-900/40 rounded-lg border border-ink-200/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2 border border-ink-200/40 dark:border-ink-800/40">
        <div className="flex items-center justify-between text-[10px] text-ink-600 mb-1">
          <span>价格上限 (¥/{maxPrice > 0 ? '次' : '不限'})</span>
          <span className="font-mono font-bold">¥{maxPrice}</span>
        </div>
        <input type="range" min="0" max="100" step="5" value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-blue-500" />
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full h-9 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '添加车位'}
      </button>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="车位名称" className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <div className="grid grid-cols-5 gap-1">
            {(Object.keys(TYPE_META) as (keyof typeof TYPE_META)[]).map((t) => {
              const Icon = TYPE_META[t].icon
              return (
                <button key={t} onClick={() => setDraft({ ...draft, type: t })} className={cn('h-9 rounded-lg flex flex-col items-center justify-center gap-0.5 text-[9px]', draft.type === t ? `bg-gradient-to-br ${TYPE_META[t].color} text-white` : 'bg-ink-50 dark:bg-ink-800 text-ink-600')}>
                  <Icon className="w-3 h-3" />{TYPE_META[t].label}
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">价格 (¥)</div>
              <input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">单位</div>
              <select value={draft.priceUnit} onChange={(e) => setDraft({ ...draft, priceUnit: e.target.value as any })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
                <option value="hour">时</option><option value="day">天</option><option value="month">月</option><option value="free">免费</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">距离 (km)</div>
              <input type="number" step="0.1" value={draft.distance} onChange={(e) => setDraft({ ...draft, distance: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px]">
            <label className="flex items-center gap-1"><input type="checkbox" checked={draft.ev} onChange={(e) => setDraft({ ...draft, ev: e.target.checked })} className="accent-blue-500" />充电桩</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={draft.security} onChange={(e) => setDraft({ ...draft, security: e.target.checked })} className="accent-blue-500" />保安</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={draft.covered} onChange={(e) => setDraft({ ...draft, covered: e.target.checked })} className="accent-blue-500" />有棚</label>
          </div>
          <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="备注" className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <button onClick={add} className="w-full h-9 rounded-lg bg-blue-500 text-white text-xs font-semibold">保存</button>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['all', 'fav', ...Object.keys(TYPE_META)] as const).map((c) => (
          <button key={c} onClick={() => setFilterType(c as any)} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0', filterType === c ? 'bg-blue-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
            {c === 'all' ? '全部' : c === 'fav' ? '★' : TYPE_META[c as keyof typeof TYPE_META].label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.map((s) => {
          const meta = TYPE_META[s.type]
          const Icon = meta.icon
          return (
            <div key={s.id} className={cn('p-2.5 rounded-xl border bg-white/60 dark:bg-ink-900/40', s.favorite ? 'border-amber-300' : 'border-ink-200/40 dark:border-ink-800/40')}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className={cn('w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br text-white', meta.color)}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="text-xs font-bold text-ink-800 dark:text-ink-200 flex-1">{s.name}</span>
                <button onClick={() => fav(s.id)} className={cn('w-5 h-5 rounded flex items-center justify-center', s.favorite ? 'text-amber-400' : 'text-ink-300')}><Star className={cn('w-3.5 h-3.5', s.favorite && 'fill-current')} /></button>
                <button onClick={() => del(s.id)} className="w-5 h-5 rounded text-ink-300 hover:text-rose-500 flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[10px] text-ink-600 dark:text-ink-300">
                <div className="flex items-center gap-0.5 font-mono font-bold text-blue-500"><Banknote className="w-2.5 h-2.5" />{s.priceUnit === 'free' ? '免费' : `¥${s.price}/${s.priceUnit === 'hour' ? 'h' : s.priceUnit === 'day' ? '天' : '月'}`}</div>
                <div className="flex items-center gap-0.5"><Navigation className="w-2.5 h-2.5" />{s.distance}km</div>
                <div className="flex items-center gap-0.5 text-amber-500">{[1, 2, 3, 4, 5].map((d) => <span key={d} className={d <= s.rating ? '' : 'text-ink-300'}>★</span>)}</div>
                <div className="flex items-center gap-0.5">{s.ev && '⚡'}{s.security && '🛡️'}{s.covered && '🏠'}</div>
              </div>
              {s.note && <p className="text-[10px] text-ink-500 mt-1">💬 {s.note}</p>}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <CircleParking className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>暂无匹配车位</p>
        </div>
      )}
    </div>
  )
}
