import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Search, Star, Plus, Trash2, Sparkles, Loader2, Coffee, Utensils, Camera, Mountain, ShoppingBag, Bed, Trees, X, Navigation, Heart, Clock } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Place {
  id: string
  name: string
  category: 'cafe' | 'food' | 'sight' | 'shop' | 'hotel' | 'nature'
  address: string
  rating: number
  reviews: number
  priceRange: '$' | '$$' | '$$$'
  thumbnail: string
  description: string
  tags: string[]
  distance: number
  hours: string
  visited: boolean
  favorite: boolean
  notes: string
  at: number
}

const STORAGE_KEY = 'versa:places'

function load(): Place[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'p1', name: '永康路咖啡街', category: 'cafe', address: '上海市徐汇区永康路', rating: 4.7, reviews: 1280, priceRange: '$$', thumbnail: 'https://picsum.photos/seed/cafe1/300/200', description: '网红咖啡店一条街, 适合周末午后散步', tags: ['咖啡', '网红', '周末'], distance: 1.2, hours: '08:00-22:00', visited: true, favorite: true, notes: '推荐 Manner Coffee', at: Date.now() - 86400000 * 7 },
    { id: 'p2', name: '外滩夜景', category: 'sight', address: '上海市黄浦区中山东一路', rating: 4.9, reviews: 8920, priceRange: '$', thumbnail: 'https://picsum.photos/seed/sight1/300/200', description: '上海地标, 夜晚灯光璀璨', tags: ['夜景', '地标', '必去'], distance: 3.5, hours: '全天', visited: false, favorite: true, notes: '', at: Date.now() - 86400000 * 14 },
    { id: 'p3', name: '小笼包老店', category: 'food', address: '上海市黄浦区南京西路', rating: 4.6, reviews: 3420, priceRange: '$', thumbnail: 'https://picsum.photos/seed/food1/300/200', description: '上海特色小笼包, 现蒸现卖', tags: ['本地', '小吃'], distance: 2.1, hours: '07:00-21:00', visited: true, favorite: false, notes: '', at: Date.now() - 86400000 * 30 },
    { id: 'p4', name: '佘山国家森林公园', category: 'nature', address: '上海市松江区', rating: 4.5, reviews: 1820, priceRange: '$', thumbnail: 'https://picsum.photos/seed/nature1/300/200', description: '上海最高峰, 适合周末登山', tags: ['登山', '自然'], distance: 35, hours: '08:00-17:00', visited: false, favorite: false, notes: '', at: Date.now() - 86400000 * 60 },
  ]
}
function save(d: Place[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CAT_META = {
  cafe: { label: '咖啡', icon: Coffee, color: 'from-amber-700 to-amber-500' },
  food: { label: '美食', icon: Utensils, color: 'from-orange-500 to-rose-500' },
  sight: { label: '景点', icon: Camera, color: 'from-blue-500 to-indigo-500' },
  shop: { label: '购物', icon: ShoppingBag, color: 'from-pink-500 to-rose-500' },
  hotel: { label: '酒店', icon: Bed, color: 'from-violet-500 to-purple-500' },
  nature: { label: '自然', icon: Trees, color: 'from-emerald-500 to-teal-500' },
} as const

export function LocalGuide() {
  const [places, setPlaces] = useState<Place[]>(load())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'favorite' | 'visited' | 'unvisited' | keyof typeof CAT_META>('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState<keyof typeof CAT_META>('cafe')
  const [newAddress, setNewAddress] = useState('')
  const [newPrice, setNewPrice] = useState<'$' | '$$' | '$$$'>('$$')

  useEffect(() => { save(places) }, [places])

  const filtered = (() => {
    let out = places
    if (filter === 'favorite') out = out.filter((p) => p.favorite)
    else if (filter === 'visited') out = out.filter((p) => p.visited)
    else if (filter === 'unvisited') out = out.filter((p) => !p.visited)
    else if (filter !== 'all') out = out.filter((p) => p.category === filter)
    if (search) out = out.filter((p) => p.name.includes(search) || p.tags.some((t) => t.includes(search)))
    return out.sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.distance - b.distance)
  })()

  const add = () => {
    if (!newName.trim()) { toast('请填写名称', 'error'); return }
    const p: Place = { id: uid(), name: newName, category: newCat, address: newAddress, rating: 0, reviews: 0, priceRange: newPrice, thumbnail: `https://picsum.photos/seed/${Date.now()}/300/200`, description: '', tags: [], distance: Math.random() * 5, hours: '', visited: false, favorite: false, notes: '', at: Date.now() }
    setPlaces([p, ...places])
    setNewName(''); setNewAddress('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const toggleFav = (id: string) => setPlaces(places.map((p) => p.id === id ? { ...p, favorite: !p.favorite } : p))
  const toggleVisited = (id: string) => setPlaces(places.map((p) => p.id === id ? { ...p, visited: !p.visited } : p))
  const remove = (id: string) => setPlaces(places.filter((p) => p.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 3 个上海本地人才知道的小众地点 (50-80 字, 含类目)', '你是 Versa 本地向导, 简洁有特色, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const active = places.find((p) => p.id === activeId)
  const visitedCount = places.filter((p) => p.visited).length
  const favCount = places.filter((p) => p.favorite).length

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-5 h-5" />
          <h2 className="text-lg font-bold">本地探索</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">附近地点 · 评分 · 必去清单</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{places.length}</p>
            <p className="text-[10px] opacity-80">地点</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{visitedCount}</p>
            <p className="text-[10px] opacity-80">去过</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{favCount}</p>
            <p className="text-[10px] opacity-80">收藏</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索地点/标签..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <button onClick={() => setAdding(true)} className="px-3 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />新增
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        </button>
      </div>

      {aiRec && (
        <div className="bg-emerald-50/40 dark:bg-emerald-900/20 rounded-xl p-3 border border-emerald-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-emerald-500"><Sparkles className="w-3.5 h-3.5" />AI 推荐</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiRec}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'favorite', 'visited', 'unvisited'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'favorite' ? '⭐ 收藏' : f === 'visited' ? '✓ 去过' : '未去'}
          </button>
        ))}
        {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
          const M = CAT_META[k]
          const Icon = M.icon
          return (
            <button key={k} onClick={() => setFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0 flex items-center gap-0.5', filter === k ? `bg-gradient-to-r ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
              <Icon className="w-3 h-3" />{M.label}
            </button>
          )
        })}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有匹配的地点</p>
          </div>
        ) : filtered.map((p) => {
          const Cat = CAT_META[p.category]
          const Icon = Cat.icon
          return (
            <motion.div key={p.id} whileHover={{ y: -1 }} onClick={() => setActiveId(p.id)} className="flex items-center gap-2 p-2 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
              <div className="relative w-16 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img src={p.thumbnail} alt={p.name} className="w-full h-full object-cover" />
                <div className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded flex items-center justify-center text-white bg-gradient-to-br', Cat.color)}>
                  <Icon className="w-2.5 h-2.5" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold truncate">{p.name}</p>
                  {p.visited && <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500 text-white font-bold">✓</span>}
                </div>
                <p className="text-[10px] text-ink-500 truncate flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" />{p.address || '未填'} · {p.distance.toFixed(1)}km
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    <Star className="w-2.5 h-2.5 fill-amber-400" />
                    <span className="text-[10px] font-bold">{p.rating || '—'}</span>
                  </div>
                  <span className="text-[9px] text-ink-500">{p.priceRange}</span>
                  {p.tags.slice(0, 2).map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800">#{t}</span>)}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); toggleFav(p.id) }} className="text-amber-500">
                <Heart className={cn('w-3.5 h-3.5', p.favorite ? 'fill-rose-500 text-rose-500' : 'text-ink-300')} />
              </button>
            </motion.div>
          )
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setActiveId(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto">
            <div className="relative h-40">
              <img src={active.thumbnail} alt={active.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <button onClick={() => setActiveId(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"><X className="w-4 h-4" /></button>
              <div className="absolute bottom-3 left-3 right-3 text-white">
                <div className="flex items-center gap-1.5">
                  <div className={cn('w-6 h-6 rounded flex items-center justify-center text-white bg-gradient-to-br', CAT_META[active.category].color)}>
                    {(() => { const I = CAT_META[active.category].icon; return <I className="w-3 h-3" /> })()}
                  </div>
                  <h3 className="text-lg font-bold">{active.name}</h3>
                </div>
                <p className="text-[10px] opacity-90 flex items-center gap-1"><MapPin className="w-3 h-3" />{active.address}</p>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="font-bold">{active.rating}</span>
                <span className="text-ink-500">({active.reviews} 评价)</span>
                <span className="ml-auto text-ink-500">{active.priceRange} · {active.distance.toFixed(1)}km</span>
              </div>
              {active.hours && <p className="text-xs text-ink-500 flex items-center gap-1"><Clock className="w-3 h-3" />{active.hours}</p>}
              {active.description && <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">{active.description}</p>}
              <div className="flex flex-wrap gap-1">
                {active.tags.map((t) => <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">#{t}</span>)}
              </div>
              {active.notes && <p className="text-xs bg-ink-50 dark:bg-ink-800 p-2 rounded-lg">📝 {active.notes}</p>}
              <div className="flex gap-1.5">
                <button onClick={() => toggleFav(active.id)} className={cn('flex-1 h-9 rounded-lg text-xs font-bold', active.favorite ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  {active.favorite ? '❤️ 已收藏' : '🤍 收藏'}
                </button>
                <button onClick={() => toggleVisited(active.id)} className={cn('flex-1 h-9 rounded-lg text-xs font-bold', active.visited ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  {active.visited ? '✓ 已去过' : '去过?'}
                </button>
                <button onClick={() => remove(active.id)} className="h-9 px-3 rounded-lg bg-rose-500 text-white text-xs">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">添加地点</h3>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="名称" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder="地址" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                const M = CAT_META[k]
                const Icon = M.icon
                return (
                  <button key={k} onClick={() => setNewCat(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center gap-0.5', newCat === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-semibold">{M.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['$', '$$', '$$$'] as const).map((p) => (
                <button key={p} onClick={() => setNewPrice(p)} className={cn('h-8 rounded-lg text-xs font-bold', newPrice === p ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{p}</button>
              ))}
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
