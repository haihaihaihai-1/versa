import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Package, Plus, Trash2, Sparkles, Loader2, Search, Apple, Beef, Wheat, Milk, Snowflake, Calendar, AlertCircle, ShoppingCart, Tag } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface PantryItem {
  id: string
  name: string
  category: 'produce' | 'meat' | 'dairy' | 'grain' | 'spice' | 'frozen' | 'beverage' | 'snack' | 'other'
  quantity: number
  unit: string
  expiry: string
  location: 'fridge' | 'freezer' | 'pantry' | 'counter'
  note: string
  addedAt: string
}

const STORAGE_KEY = 'versa:pantry-v1'

function load(): PantryItem[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: PantryItem[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): PantryItem[] {
  const now = new Date()
  return [
    { id: '1', name: '鸡蛋', category: 'dairy', quantity: 6, unit: '个', expiry: new Date(now.getTime() + 20 * 86400000).toISOString().split('T')[0], location: 'fridge', note: '', addedAt: now.toISOString() },
    { id: '2', name: '牛奶', category: 'dairy', quantity: 1, unit: '升', expiry: new Date(now.getTime() + 5 * 86400000).toISOString().split('T')[0], location: 'fridge', note: '', addedAt: now.toISOString() },
    { id: '3', name: '番茄', category: 'produce', quantity: 4, unit: '个', expiry: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0], location: 'fridge', note: '', addedAt: now.toISOString() },
    { id: '4', name: '猪肉', category: 'meat', quantity: 500, unit: 'g', expiry: new Date(now.getTime() - 1 * 86400000).toISOString().split('T')[0], location: 'fridge', note: '', addedAt: now.toISOString() },
    { id: '5', name: '意大利面', category: 'grain', quantity: 500, unit: 'g', expiry: new Date(now.getTime() + 365 * 86400000).toISOString().split('T')[0], location: 'pantry', note: '', addedAt: now.toISOString() },
    { id: '6', name: '橄榄油', category: 'other', quantity: 500, unit: 'ml', expiry: new Date(now.getTime() + 180 * 86400000).toISOString().split('T')[0], location: 'pantry', note: '', addedAt: now.toISOString() },
  ]
}

const CAT_META = {
  produce: { label: '果蔬', icon: Apple, color: 'from-emerald-500 to-green-500' },
  meat: { label: '肉禽', icon: Beef, color: 'from-rose-500 to-red-500' },
  dairy: { label: '乳蛋', icon: Milk, color: 'from-blue-500 to-cyan-500' },
  grain: { label: '米面', icon: Wheat, color: 'from-amber-500 to-orange-500' },
  spice: { label: '调料', icon: Tag, color: 'from-orange-500 to-red-500' },
  frozen: { label: '冷冻', icon: Snowflake, color: 'from-cyan-500 to-blue-500' },
  beverage: { label: '饮品', icon: Milk, color: 'from-blue-400 to-cyan-400' },
  snack: { label: '零食', icon: Package, color: 'from-violet-500 to-purple-500' },
  other: { label: '其他', icon: Package, color: 'from-ink-500 to-ink-600' },
} as const

const LOC_META = {
  fridge: { label: '冷藏', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-500' },
  freezer: { label: '冷冻', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-500' },
  pantry: { label: '储藏', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-500' },
  counter: { label: '台面', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-500' },
} as const

function expiryStatus(expiry: string): 'expired' | 'urgent' | 'soon' | 'ok' {
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
  if (days < 0) return 'expired'
  if (days <= 3) return 'urgent'
  if (days <= 7) return 'soon'
  return 'ok'
}

export function PantryInventory() {
  const [items, setItems] = useState<PantryItem[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<'all' | PantryItem['category']>('all')
  const [locFilter, setLocFilter] = useState<'all' | PantryItem['location']>('all')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<PantryItem['category']>('produce')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('个')
  const [expiry, setExpiry] = useState('')
  const [location, setLocation] = useState<PantryItem['location']>('fridge')

  useEffect(() => { save(items) }, [items])

  const total = items.length
  const expired = items.filter((i) => expiryStatus(i.expiry) === 'expired').length
  const urgent = items.filter((i) => expiryStatus(i.expiry) === 'urgent').length
  const expiringSoon = items.filter((i) => ['urgent', 'soon', 'expired'].includes(expiryStatus(i.expiry))).length

  const filtered = items.filter((i) => {
    if (search && !i.name.includes(search)) return false
    if (catFilter !== 'all' && i.category !== catFilter) return false
    if (locFilter !== 'all' && i.location !== locFilter) return false
    return true
  }).sort((a, b) => a.expiry.localeCompare(b.expiry))

  const add = () => {
    if (!name.trim()) { toast('请输入', 'error'); return }
    const item: PantryItem = { id: uid(), name, category, quantity: +quantity, unit, expiry, location, note: '', addedAt: new Date().toISOString() }
    setItems([item, ...items])
    setName(''); setQuantity('1'); setUnit('个'); setExpiry('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const remove = (id: string) => setItems(items.filter((i) => i.id !== id))
  const adjust = (id: string, delta: number) => setItems(items.map((i) => i.id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))

  const addToShopping = (name: string) => {
    try {
      const list = JSON.parse(localStorage.getItem('versa:food-shopping-v1') || '[]')
      list.push({ id: uid(), name, added: new Date().toISOString(), checked: false })
      localStorage.setItem('versa:food-shopping-v1', JSON.stringify(list))
      toast('已加入购物清单', 'success')
    } catch {}
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = items.map((i) => `${i.name}(${i.quantity}${i.unit})`).join(', ')
      const result = await aiComplete(`用户冰箱: ${summary}. 给出 1 段 60 字内 3 道菜的建议 (基于现有食材), 中文`, '你是 Versa 美食家, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Package className="w-5 h-5" />
          <h2 className="text-lg font-bold">厨房库存</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">过期预警 · 位置管理 · AI 菜谱</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">物品</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{expired}</p>
            <p className="text-[9px] opacity-80">已过期</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-amber-100">{urgent}</p>
            <p className="text-[9px] opacity-80">3天内</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-yellow-100">{expiringSoon}</p>
            <p className="text-[9px] opacity-80">需关注</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />加库存
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 菜谱
        </button>
      </div>

      {aiTip && (
        <div className="bg-emerald-50/40 dark:bg-emerald-900/20 rounded-xl p-2 border border-emerald-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setCatFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', catFilter === 'all' ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
          const M = CAT_META[k]
          return (
            <button key={k} onClick={() => setCatFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', catFilter === k ? `bg-gradient-to-r ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
              {M.label}
            </button>
          )
        })}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setLocFilter('all')} className={cn('px-2 h-6 rounded-full text-[10px] font-semibold flex-shrink-0', locFilter === 'all' ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部位置</button>
        {(Object.keys(LOC_META) as Array<keyof typeof LOC_META>).map((k) => (
          <button key={k} onClick={() => setLocFilter(k)} className={cn('px-2 h-6 rounded-full text-[10px] font-semibold flex-shrink-0', locFilter === k ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{LOC_META[k].label}</button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有库存</p>
          </div>
        ) : filtered.map((i) => {
          const CM = CAT_META[i.category]
          const Icon = CM.icon
          const LM = LOC_META[i.location]
          const st = expiryStatus(i.expiry)
          return (
            <motion.div key={i.id} whileHover={{ y: -1 }} className={cn('rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border', st === 'expired' ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-900/20' : st === 'urgent' ? 'border-amber-400' : 'border-ink-200/60 dark:border-ink-800/60')}>
              <div className="flex items-center gap-2">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white bg-gradient-to-br', CM.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold truncate">{i.name}</p>
                    {st === 'expired' && <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500 text-white font-bold">已过期</span>}
                    {st === 'urgent' && <span className="text-[9px] px-1 py-0.5 rounded bg-amber-500 text-white font-bold">即将</span>}
                  </div>
                  <p className="text-[10px] text-ink-500">{i.quantity} {i.unit} · 📅 {i.expiry || '无'} · <span className={cn('px-1 rounded text-[9px] font-semibold', LM.color)}>{LM.label}</span></p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => adjust(i.id, -1)} className="w-6 h-6 rounded bg-ink-100 dark:bg-ink-800 text-[10px]">-</button>
                  <button onClick={() => adjust(i.id, 1)} className="w-6 h-6 rounded bg-ink-100 dark:bg-ink-800 text-[10px]">+</button>
                  <button onClick={() => addToShopping(i.name)} className="w-6 h-6 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 text-[10px]">+🛒</button>
                  <button onClick={() => remove(i.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">添加库存</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">分类</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                  const M = CAT_META[k]
                  return (
                    <button key={k} onClick={() => setCategory(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold', category === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      <M.icon className="w-3.5 h-3.5" />
                      <span className="text-[9px]">{M.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="col-span-1">
                <p className="text-[10px] text-ink-500 mb-0.5">数量</p>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div className="col-span-1">
                <p className="text-[10px] text-ink-500 mb-0.5">单位</p>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div className="col-span-1">
                <p className="text-[10px] text-ink-500 mb-0.5">过期</p>
                <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-full px-1 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">存放位置</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(LOC_META) as Array<keyof typeof LOC_META>).map((k) => (
                  <button key={k} onClick={() => setLocation(k)} className={cn('h-9 rounded-lg text-[10px] font-semibold', location === k ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{LOC_META[k].label}</button>
                ))}
              </div>
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
