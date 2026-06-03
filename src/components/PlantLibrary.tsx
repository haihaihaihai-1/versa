import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Leaf, Search, Sun, Droplet, Thermometer, Sprout, Heart, Star, Plus, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Plant {
  id: string
  name: string
  latin: string
  category: 'flower' | 'vegetable' | 'herb' | 'fruit' | 'succulent' | 'tree' | 'houseplant'
  emoji: string
  difficulty: 1 | 2 | 3 | 4 | 5
  sun: 'full' | 'partial' | 'shade'
  water: 'low' | 'medium' | 'high'
  temperature: string
  season: string[]
  height: string
  growth: string
  care: string
  tips: string
  color: string
  gradient: string
}

const PLANTS: Plant[] = [
  { id: '1', name: '月季', latin: 'Rosa chinensis', category: 'flower', emoji: '🌹', difficulty: 3, sun: 'full', water: 'medium', temperature: '15-25°C', season: ['春', '夏', '秋'], height: '1-3m', growth: '30-60 天开花', care: '喜阳光, 每周浇水 2-3 次, 每月施肥', tips: '及时修剪残花可促进新花生长', color: 'from-rose-500 to-pink-500', gradient: 'bg-gradient-to-br from-rose-500 to-pink-500' },
  { id: '2', name: '番茄', latin: 'Solanum lycopersicum', category: 'vegetable', emoji: '🍅', difficulty: 2, sun: 'full', water: 'high', temperature: '18-28°C', season: ['春', '夏'], height: '1-2m', growth: '60-90 天结果', care: '每天浇水, 搭支架, 每周施肥', tips: '开花期摇晃植株可促进授粉', color: 'from-red-500 to-orange-500', gradient: 'bg-gradient-to-br from-red-500 to-orange-500' },
  { id: '3', name: '薄荷', latin: 'Mentha', category: 'herb', emoji: '🌿', difficulty: 1, sun: 'partial', water: 'high', temperature: '15-30°C', season: ['春', '夏', '秋'], height: '30-60cm', growth: '15-30 天可采', care: '保持土壤湿润, 定期修剪防止徒长', tips: '薄荷繁殖力强, 建议盆栽', color: 'from-emerald-500 to-green-500', gradient: 'bg-gradient-to-br from-emerald-500 to-green-500' },
  { id: '4', name: '草莓', latin: 'Fragaria', category: 'fruit', emoji: '🍓', difficulty: 2, sun: 'full', water: 'high', temperature: '15-22°C', season: ['春', '秋'], height: '15-25cm', growth: '90-120 天结果', care: '保持土壤湿润, 授粉, 防鸟', tips: '草莓喜欢微酸性土壤', color: 'from-rose-400 to-red-400', gradient: 'bg-gradient-to-br from-rose-400 to-red-400' },
  { id: '5', name: '多肉', latin: 'Succulent', category: 'succulent', emoji: '🌵', difficulty: 1, sun: 'full', water: 'low', temperature: '10-30°C', season: ['春', '秋'], height: '5-30cm', growth: '慢生, 多年生', care: '少浇水, 多光照, 透气土壤', tips: '夏季避免暴晒和积水', color: 'from-teal-500 to-emerald-500', gradient: 'bg-gradient-to-br from-teal-500 to-emerald-500' },
  { id: '6', name: '茉莉花', latin: 'Jasminum sambac', category: 'flower', emoji: '🌼', difficulty: 3, sun: 'full', water: 'medium', temperature: '20-30°C', season: ['夏', '秋'], height: '1-2m', growth: '60-90 天开花', care: '喜温暖湿润, 每周施肥', tips: '花后修剪可促二次开花', color: 'from-amber-400 to-yellow-400', gradient: 'bg-gradient-to-br from-amber-400 to-yellow-400' },
  { id: '7', name: '黄瓜', latin: 'Cucumis sativus', category: 'vegetable', emoji: '🥒', difficulty: 2, sun: 'full', water: 'high', temperature: '20-30°C', season: ['春', '夏'], height: '攀爬 2-3m', growth: '50-70 天采收', care: '搭架, 充足水分, 防虫', tips: '黄瓜喜温, 不耐寒', color: 'from-green-500 to-lime-500', gradient: 'bg-gradient-to-br from-green-500 to-lime-500' },
  { id: '8', name: '罗勒', latin: 'Ocimum basilicum', category: 'herb', emoji: '🌱', difficulty: 1, sun: 'full', water: 'medium', temperature: '20-28°C', season: ['春', '夏'], height: '30-60cm', growth: '30-45 天可采', care: '摘心促分枝, 喜光', tips: '罗勒与番茄是黄金搭档', color: 'from-green-400 to-emerald-500', gradient: 'bg-gradient-to-br from-green-400 to-emerald-500' },
  { id: '9', name: '蓝莓', latin: 'Vaccinium', category: 'fruit', emoji: '🫐', difficulty: 4, sun: 'full', water: 'high', temperature: '15-25°C', season: ['春', '夏'], height: '1-2m', growth: '2-3 年初果', care: '酸性土壤, 充足水分, 修剪', tips: '需要异花授粉, 至少种 2 棵', color: 'from-indigo-500 to-blue-500', gradient: 'bg-gradient-to-br from-indigo-500 to-blue-500' },
  { id: '10', name: '吊兰', latin: 'Chlorophytum', category: 'houseplant', emoji: '🪴', difficulty: 1, sun: 'partial', water: 'medium', temperature: '15-25°C', season: ['全年'], height: '30-50cm', growth: '易养护', care: '耐阴, 适量浇水', tips: '净化空气, 适合新手', color: 'from-green-500 to-teal-500', gradient: 'bg-gradient-to-br from-green-500 to-teal-500' },
  { id: '11', name: '桂花', latin: 'Osmanthus fragrans', category: 'tree', emoji: '🌳', difficulty: 3, sun: 'full', water: 'medium', temperature: '15-28°C', season: ['秋'], height: '3-15m', growth: '多年生木本', care: '喜阳耐寒, 适当修剪', tips: '秋季开花, 香气浓郁', color: 'from-amber-500 to-orange-500', gradient: 'bg-gradient-to-br from-amber-500 to-orange-500' },
  { id: '12', name: '君子兰', latin: 'Clivia', category: 'houseplant', emoji: '🌷', difficulty: 2, sun: 'partial', water: 'medium', temperature: '15-25°C', season: ['冬', '春'], height: '30-50cm', growth: '3-4 年开花', care: '散光, 控水, 施磷肥', tips: '叶面常擦拭, 保持光洁', color: 'from-orange-500 to-red-500', gradient: 'bg-gradient-to-br from-orange-500 to-red-500' },
]

const CATEGORY_LABELS: Record<Plant['category'], string> = {
  flower: '花卉', vegetable: '蔬菜', herb: '香草', fruit: '水果', succulent: '多肉', tree: '乔木', houseplant: '室内',
}

const STORAGE_FAV = 'versa:plant-fav-v1'
function loadFav(): string[] { try { const s = localStorage.getItem(STORAGE_FAV); if (s) return JSON.parse(s) } catch {} return ['5', '10'] }
function saveFav(d: string[]) { try { localStorage.setItem(STORAGE_FAV, JSON.stringify(d)) } catch {} }

export function PlantLibrary() {
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<Plant['category'] | 'all' | 'fav'>('all')
  const [filterDiff, setFilterDiff] = useState<number | 'all'>('all')
  const [activeId, setActiveId] = useState<string | null>(PLANTS[0].id)
  const [favs, setFavs] = useState<string[]>(loadFav())

  const filtered = useMemo(() => {
    return PLANTS.filter((p) => {
      if (filterCat === 'fav' && !favs.includes(p.id)) return false
      if (filterCat !== 'all' && filterCat !== 'fav' && p.category !== filterCat) return false
      if (filterDiff !== 'all' && p.difficulty !== filterDiff) return false
      if (search && !p.name.includes(search) && !p.latin.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [filterCat, filterDiff, search, favs])

  const toggleFav = (id: string) => {
    const next = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id]
    setFavs(next)
    saveFav(next)
  }

  const active = PLANTS.find((p) => p.id === activeId) || PLANTS[0]

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-5 h-5" />
          <h2 className="text-lg font-bold">植物图鉴</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">{PLANTS.length} 植物 · 7 分类 · 难度/光照/水分</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{PLANTS.length}</p><p className="text-[9px] opacity-80">植物</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Object.keys(CATEGORY_LABELS).length}</p><p className="text-[9px] opacity-80">分类</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{filtered.length}</p><p className="text-[9px] opacity-80">筛选</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{favs.length}</p><p className="text-[9px] opacity-80">收藏</p></div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索植物..." className="w-full h-9 pl-8 pr-3 text-xs bg-white/60 dark:bg-ink-900/40 rounded-lg border border-ink-200/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['all', 'fav', ...Object.keys(CATEGORY_LABELS)] as const).map((c) => (
          <button key={c} onClick={() => setFilterCat(c as any)} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0', filterCat === c ? 'bg-emerald-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
            {c === 'all' ? '全部' : c === 'fav' ? '★ 收藏' : CATEGORY_LABELS[c as Plant['category']]}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        <span className="text-[10px] text-ink-500 self-center mr-1">难度:</span>
        {(['all', 1, 2, 3, 4, 5] as const).map((d) => (
          <button key={d} onClick={() => setFilterDiff(d)} className={cn('px-2 h-6 rounded text-[10px] font-semibold', filterDiff === d ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600')}>
            {d === 'all' ? '全部' : '★'.repeat(d as number)}
          </button>
        ))}
      </div>

      {active && (
        <div className={cn('rounded-2xl p-3 text-white', active.gradient)}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{active.emoji}</span>
              <div>
                <p className="text-base font-bold">{active.name}</p>
                <p className="text-[10px] italic opacity-80">{active.latin}</p>
              </div>
            </div>
            <button onClick={() => toggleFav(active.id)} className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">
              <Star className={cn('w-3.5 h-3.5', favs.includes(active.id) ? 'fill-yellow-300 text-yellow-300' : 'text-white')} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center mt-2">
            <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold flex items-center justify-center gap-0.5"><Sun className="w-3 h-3" />{active.sun === 'full' ? '全阳' : active.sun === 'partial' ? '半阴' : '阴'}</p><p className="text-[9px] opacity-80">光照</p></div>
            <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold flex items-center justify-center gap-0.5"><Droplet className="w-3 h-3" />{active.water === 'high' ? '多' : active.water === 'medium' ? '中' : '少'}</p><p className="text-[9px] opacity-80">水分</p></div>
            <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold flex items-center justify-center gap-0.5"><Thermometer className="w-3 h-3" />{active.temperature}</p><p className="text-[9px] opacity-80">适温</p></div>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-[10px] opacity-90"><span className="font-semibold">株高:</span> {active.height} · <span className="font-semibold">周期:</span> {active.growth}</p>
            <p className="text-[10px] opacity-90"><span className="font-semibold">季节:</span> {active.season.join('/')}</p>
            <p className="text-[11px] leading-relaxed mt-1"><span className="font-semibold">养护:</span> {active.care}</p>
            <p className="text-[10px] italic opacity-90 mt-1">💡 {active.tips}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        {filtered.map((p) => (
          <button key={p.id} onClick={() => setActiveId(p.id)} className={cn('h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all', activeId === p.id ? `${p.gradient} text-white shadow-md scale-105` : 'bg-white/60 dark:bg-ink-900/40 text-ink-600')}>
            <span className="text-2xl">{p.emoji}</span>
            <span className="text-[10px] font-semibold">{p.name}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <Leaf className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>暂无匹配的植物</p>
        </div>
      )}
    </div>
  )
}
