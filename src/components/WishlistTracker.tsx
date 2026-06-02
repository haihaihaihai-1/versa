import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, TrendingDown, TrendingUp, Plus, Trash2, Sparkles, Loader2, Bell, ExternalLink, Star, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { cn, uid, formatNumber, formatCurrency } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface WishlistItem {
  id: string
  name: string
  url: string
  image: string
  currentPrice: number
  originalPrice: number
  targetPrice: number
  category: string
  priority: 'low' | 'med' | 'high'
  inStock: boolean
  notify: boolean
  at: number
}

const STORAGE_KEY = 'versa:wishlist-v2'

function load(): WishlistItem[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [
  { id: 'w1', name: 'iPhone 16 Pro 256G', url: 'https://apple.com', image: 'https://picsum.photos/seed/w1/200/200', currentPrice: 8999, originalPrice: 9999, targetPrice: 7999, category: '数码', priority: 'high', inStock: true, notify: true, at: Date.now() - 86400000 * 3 },
  { id: 'w2', name: '索尼 WH-1000XM5', url: 'https://sony.com', image: 'https://picsum.photos/seed/w2/200/200', currentPrice: 2299, originalPrice: 2899, targetPrice: 1999, category: '数码', priority: 'med', inStock: true, notify: false, at: Date.now() - 86400000 * 7 },
  { id: 'w3', name: '戴森 V12 吸尘器', url: 'https://dyson.com', image: 'https://picsum.photos/seed/w3/200/200', currentPrice: 4490, originalPrice: 4990, targetPrice: 3500, category: '家居', priority: 'low', inStock: false, notify: true, at: Date.now() - 86400000 * 14 },
] }
function save(d: WishlistItem[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function WishlistTracker() {
  const [items, setItems] = useState<WishlistItem[]>(load())
  const [filter, setFilter] = useState<'all' | 'notify' | 'instock'>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'added' | 'price' | 'discount'>('added')
  const [adding, setAdding] = useState(false)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newOriginal, setNewOriginal] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newCategory, setNewCategory] = useState('数码')

  useEffect(() => { save(items) }, [items])

  const totalCurrent = items.reduce((s, i) => s + i.currentPrice, 0)
  const totalOriginal = items.reduce((s, i) => s + i.originalPrice, 0)
  const totalSaved = totalOriginal - totalCurrent
  const avgDiscount = items.length > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0
  const notifyCount = items.filter((i) => i.notify && i.currentPrice <= i.targetPrice).length

  const filtered = (() => {
    let out = items
    if (filter === 'notify') out = out.filter((i) => i.notify)
    else if (filter === 'instock') out = out.filter((i) => i.inStock)
    if (search) out = out.filter((i) => i.name.includes(search))
    if (sort === 'price') out.sort((a, b) => a.currentPrice - b.currentPrice)
    else if (sort === 'discount') out.sort((a, b) => (b.originalPrice - b.currentPrice) / b.originalPrice - (a.originalPrice - a.currentPrice) / a.originalPrice)
    return out
  })()

  const setTarget = (id: string, p: number) => setItems(items.map((i) => i.id === id ? { ...i, targetPrice: p } : i))
  const setCurrent = (id: string, p: number) => setItems(items.map((i) => i.id === id ? { ...i, currentPrice: p } : i))
  const toggleNotify = (id: string) => setItems(items.map((i) => i.id === id ? { ...i, notify: !i.notify } : i))
  const remove = (id: string) => setItems(items.filter((i) => i.id !== id))

  const add = () => {
    if (!newName.trim() || !newPrice) { toast('请填写完整', 'error'); return }
    const w: WishlistItem = {
      id: uid(), name: newName, url: '', image: `https://picsum.photos/seed/${Date.now()}/200/200`,
      currentPrice: +newPrice, originalPrice: +newOriginal || +newPrice, targetPrice: +newTarget || +newPrice,
      category: newCategory, priority: 'med', inStock: true, notify: true, at: Date.now(),
    }
    setItems([w, ...items])
    setNewName(''); setNewPrice(''); setNewOriginal(''); setNewTarget('')
    setAdding(false)
    toast('已加入心愿', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 3 个当下值得入手的电子产品 (50-80 字, 中文)', '你是 Versa 消费顾问, 简洁实用, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-5 h-5" />
          <h2 className="text-lg font-bold">心愿单 + 价格追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">降价提醒 · 折扣计算 · 目标价</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{items.length}</p>
            <p className="text-[9px] opacity-80">商品</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatNumber(totalCurrent)}</p>
            <p className="text-[9px] opacity-80">现价</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatNumber(totalSaved)}</p>
            <p className="text-[9px] opacity-80">已省</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{notifyCount}</p>
            <p className="text-[9px] opacity-80">降价</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
        </div>
        <button onClick={() => setAdding(true)} className="px-3 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold flex items-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiRec && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiRec}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'notify', 'instock'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'notify' ? '🔔 提醒' : '✓ 有货'}
          </button>
        ))}
        <button onClick={() => setSort(sort === 'price' ? 'discount' : sort === 'discount' ? 'added' : 'price')} className="px-3 h-7 rounded-full bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex-shrink-0">
          {sort === 'price' ? '↓ 价格' : sort === 'discount' ? '↓ 折扣' : '↓ 时间'}
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-ink-500">
          <Heart className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有心愿</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((i) => {
            const discount = i.originalPrice - i.currentPrice
            const discountPct = i.originalPrice > 0 ? Math.round((discount / i.originalPrice) * 100) : 0
            const targetReached = i.currentPrice <= i.targetPrice
            return (
              <motion.div key={i.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
                <div className="flex items-center gap-2">
                  <img src={i.image} alt={i.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{i.name}</p>
                    <p className="text-[10px] text-ink-500">{i.category} {i.inStock ? '✓ 有货' : '缺货'}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-base font-bold text-rose-500">¥{i.currentPrice}</span>
                      {discount > 0 && (
                        <span className="text-[10px] text-ink-400 line-through">¥{i.originalPrice}</span>
                      )}
                      {discountPct > 0 && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500 text-white font-bold">-{discountPct}%</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button onClick={() => toggleNotify(i.id)} className={cn('w-7 h-7 rounded flex items-center justify-center', i.notify ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                      <Bell className="w-3 h-3" />
                    </button>
                    <button onClick={() => remove(i.id)} className="w-7 h-7 rounded bg-ink-100 dark:bg-ink-800 text-rose-500 flex items-center justify-center text-xs">×</button>
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="text-[10px] text-ink-500">目标价 ¥</span>
                  <input type="number" value={i.targetPrice} onChange={(e) => setTarget(i.id, +e.target.value)} className="w-20 px-1 h-6 rounded bg-ink-50 dark:bg-ink-800 text-[10px] text-center" />
                  <span className="text-[10px] text-ink-500 ml-1">现价 ¥</span>
                  <input type="number" value={i.currentPrice} onChange={(e) => setCurrent(i.id, +e.target.value)} className="w-20 px-1 h-6 rounded bg-ink-50 dark:bg-ink-800 text-[10px] text-center" />
                  {targetReached && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-white font-bold">🎉 达成!</span>}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">添加心愿</h3>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="商品名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">现价</p>
                <input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="¥" className="w-full px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">原价</p>
                <input type="number" value={newOriginal} onChange={(e) => setNewOriginal(e.target.value)} placeholder="¥" className="w-full px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">目标价</p>
                <input type="number" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} placeholder="¥" className="w-full px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
              </div>
            </div>
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="类别" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold">加入</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
