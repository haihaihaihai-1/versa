import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Plus, Trash2, Sparkles, Loader2, Star, Phone, Clock, Heart, Tag, DollarSign, Utensils, Coffee, Cake, Pizza, Bookmark, Search } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Restaurant {
  id: string
  name: string
  cuisine: 'chinese' | 'japanese' | 'western' | 'italian' | 'french' | 'thai' | 'korean' | 'cafe' | 'dessert' | 'bbq' | 'hotpot' | 'other'
  rating: 1 | 2 | 3 | 4 | 5
  priceRange: '$' | '$$' | '$$$' | '$$$$'
  address: string
  phone: string
  hours: string
  tags: string[]
  visited: number
  favorite: boolean
  notes: string
  image: string
}

const STORAGE_KEY = 'versa:restaurants-v1'

function load(): Restaurant[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Restaurant[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Restaurant[] {
  return [
    { id: 'r1', name: '鼎泰丰', cuisine: 'chinese', rating: 5, priceRange: '$$$', address: '上海·静安', phone: '021-1234-5678', hours: '11:00-21:30', tags: ['小笼包', '必吃', '排队'], visited: 3, favorite: true, notes: '小笼包一绝', image: 'https://picsum.photos/seed/dt/600/400' },
    { id: 'r2', name: '一兰拉面', cuisine: 'japanese', rating: 5, priceRange: '$$', address: '东京·涉谷', phone: '03-1234-5678', hours: '24h', tags: ['拉面', '深夜食堂', '必吃'], visited: 1, favorite: true, notes: '天然豚骨拉面', image: 'https://picsum.photos/seed/ichiran/600/400' },
    { id: 'r3', name: 'Blue Bottle Coffee', cuisine: 'cafe', rating: 4, priceRange: '$$', address: '上海·武康路', phone: '021-2345-6789', hours: '08:00-19:00', tags: ['咖啡', '安静', '工作'], visited: 5, favorite: false, notes: '海耶瓦尔', image: 'https://picsum.photos/seed/bb/600/400' },
    { id: 'r4', name: '海底捞', cuisine: 'hotpot', rating: 4, priceRange: '$$$', address: '上海·徐汇', phone: '400-1234-567', hours: '10:00-02:00', tags: ['火锅', '服务好', '聚餐'], visited: 8, favorite: true, notes: '番茄锅底好喝', image: 'https://picsum.photos/seed/hdl/600/400' },
  ]
}

const CUISINE_META = {
  chinese: { label: '中餐', color: 'from-rose-500 to-pink-500', icon: '🥢' },
  japanese: { label: '日料', color: 'from-pink-500 to-fuchsia-500', icon: '🍱' },
  western: { label: '西餐', color: 'from-amber-500 to-orange-500', icon: '🍽' },
  italian: { label: '意餐', color: 'from-emerald-500 to-teal-500', icon: '🍝' },
  french: { label: '法餐', color: 'from-violet-500 to-purple-500', icon: '🥐' },
  thai: { label: '泰餐', color: 'from-cyan-500 to-blue-500', icon: '🍜' },
  korean: { label: '韩餐', color: 'from-rose-600 to-red-500', icon: '🍲' },
  cafe: { label: '咖啡', color: 'from-amber-600 to-orange-700', icon: '☕' },
  dessert: { label: '甜品', color: 'from-pink-400 to-rose-400', icon: '🍰' },
  bbq: { label: '烧烤', color: 'from-red-500 to-rose-600', icon: '🍢' },
  hotpot: { label: '火锅', color: 'from-orange-500 to-red-500', icon: '🍲' },
  other: { label: '其他', color: 'from-ink-500 to-ink-600', icon: '🍴' },
} as const

export function RestaurantBookmark() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [cuisineFilter, setCuisineFilter] = useState<'all' | Restaurant['cuisine']>('all')
  const [favFilter, setFavFilter] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(restaurants[0]?.id || null)
  const [name, setName] = useState('')
  const [cuisine, setCuisine] = useState<Restaurant['cuisine']>('chinese')
  const [rating, setRating] = useState<Restaurant['rating']>(4)
  const [priceRange, setPriceRange] = useState<Restaurant['priceRange']>('$$')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [hours, setHours] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => { save(restaurants) }, [restaurants])

  const total = restaurants.length
  const favCount = restaurants.filter((r) => r.favorite).length
  const totalVisits = restaurants.reduce((s, r) => s + r.visited, 0)
  const avgRating = total > 0 ? (restaurants.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : '0'
  const active = restaurants.find((r) => r.id === activeId)

  const filtered = restaurants.filter((r) => {
    if (search && !r.name.includes(search) && !r.address.includes(search)) return false
    if (cuisineFilter !== 'all' && r.cuisine !== cuisineFilter) return false
    if (favFilter && !r.favorite) return false
    return true
  })

  const toggleFav = (id: string) => setRestaurants(restaurants.map((r) => r.id === id ? { ...r, favorite: !r.favorite } : r))
  const remove = (id: string) => {
    setRestaurants(restaurants.filter((r) => r.id !== id))
    if (activeId === id) setActiveId(restaurants[0]?.id || null)
  }
  const addVisit = (id: string) => setRestaurants(restaurants.map((r) => r.id === id ? { ...r, visited: r.visited + 1 } : r))

  const add = () => {
    if (!name.trim()) { toast('请输入名称', 'error'); return }
    const r: Restaurant = { id: uid(), name, cuisine, rating, priceRange, address, phone, hours, tags: tagsStr.split(/[,，]/).map((t) => t.trim()).filter(Boolean), visited: 0, favorite: false, notes, image: `https://picsum.photos/seed/${Date.now()}/600/400` }
    setRestaurants([r, ...restaurants])
    setActiveId(r.id)
    setName(''); setAddress(''); setPhone(''); setHours(''); setTagsStr(''); setNotes('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`基于用户收藏 ${favCount} 家餐厅 (平均 ${avgRating}⭐), 推荐 3 个值得去的餐厅类型/菜系, 每条 30 字, 中文`, '你是 Versa 美食顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-5 h-5" />
          <h2 className="text-lg font-bold">餐厅收藏</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">12 类菜系 · 收藏管理 · 打卡追踪</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">餐厅</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{favCount}</p>
            <p className="text-[9px] opacity-80">收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalVisits}</p>
            <p className="text-[9px] opacity-80">打卡</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgRating}</p>
            <p className="text-[9px] opacity-80">均评分</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />加餐厅
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-amber-50/40 dark:bg-amber-900/20 rounded-xl p-2 border border-amber-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setCuisineFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', cuisineFilter === 'all' ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        {(Object.keys(CUISINE_META) as Array<keyof typeof CUISINE_META>).map((k) => (
          <button key={k} onClick={() => setCuisineFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', cuisineFilter === k ? `bg-gradient-to-r ${CUISINE_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {CUISINE_META[k].icon} {CUISINE_META[k].label}
          </button>
        ))}
        <button onClick={() => setFavFilter(!favFilter)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', favFilter ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>❤️ 收藏</button>
      </div>

      {active && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
          <div className="relative h-32">
            <img src={active.image} alt={active.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-white">
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-bold">{active.name}</p>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/30 backdrop-blur font-semibold">{active.priceRange}</span>
              </div>
              <p className="text-[10px] opacity-90 mt-0.5">{CUISINE_META[active.cuisine].icon} {CUISINE_META[active.cuisine].label} · ⭐{active.rating} · 打卡 {active.visited} 次</p>
            </div>
            <button onClick={() => toggleFav(active.id)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">
              <Heart className={cn('w-4 h-4', active.favorite && 'fill-rose-500 text-rose-500')} />
            </button>
          </div>
          <div className="p-2 space-y-1 text-[10px] text-ink-500">
            {active.address && <p className="flex items-center gap-1"><MapPin className="w-3 h-3" />{active.address}</p>}
            {active.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{active.phone}</p>}
            {active.hours && <p className="flex items-center gap-1"><Clock className="w-3 h-3" />{active.hours}</p>}
            {active.notes && <p className="flex items-center gap-1">📝 {active.notes}</p>}
            <div className="flex flex-wrap gap-1 pt-1">
              {active.tags.map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-[9px] font-semibold">{t}</span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 pt-1">
              <button onClick={() => addVisit(active.id)} className="flex-1 h-7 rounded-lg bg-amber-500 text-white text-[10px] font-bold">+1 打卡</button>
              <button onClick={() => remove(active.id)} className="px-2 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-500 text-[10px]">删除</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {filtered.filter((r) => r.id !== activeId).map((r) => {
          const CM = CUISINE_META[r.cuisine]
          return (
            <motion.div key={r.id} whileHover={{ y: -1 }} onClick={() => setActiveId(r.id)} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
              <div className="flex items-center gap-2">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-2xl bg-gradient-to-br', CM.color)}>
                  {CM.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold truncate">{r.name}</p>
                    {r.favorite && <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />}
                  </div>
                  <p className="text-[10px] text-ink-500">{CM.label} · {r.priceRange} · ⭐{r.rating} · 打卡 {r.visited}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">添加餐厅</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <select value={cuisine} onChange={(e) => setCuisine(e.target.value as any)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none">
              {(Object.keys(CUISINE_META) as Array<keyof typeof CUISINE_META>).map((k) => <option key={k} value={k}>{CUISINE_META[k].icon} {CUISINE_META[k].label}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">价格</p>
                <div className="flex gap-1">
                  {(['$', '$$', '$$$', '$$$$'] as const).map((p) => (
                    <button key={p} onClick={() => setPriceRange(p)} className={cn('flex-1 h-9 rounded-lg text-xs font-bold', priceRange === p ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">评分</p>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button key={s} onClick={() => setRating(s as any)}>
                      <Star className={cn('w-4 h-4', s <= rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="地址" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="电话" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="营业时间" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="标签 (逗号分隔)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[50px]" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
