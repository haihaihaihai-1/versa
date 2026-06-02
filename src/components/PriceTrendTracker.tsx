import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, Sparkles, Loader2, Plus, Trash2, Search, X, History, Star, Bell, Filter } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface PricePoint {
  id: string
  productName: string
  url: string
  store: string
  price: number
  originalPrice: number
  date: string
  note: string
}

interface Product {
  id: string
  name: string
  url: string
  store: string
  target: number
  current: number
  lowest: number
  highest: number
  emoji: string
  history: { date: string; price: number }[]
  notify: boolean
}

const STORAGE_KEY = 'versa:price-tracker'

function load(): Product[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [
  {
    id: 'p1', name: 'iPhone 16 Pro 256G', url: '', store: 'Apple Store', target: 7999, current: 8999, lowest: 8599, highest: 9999, emoji: '📱', notify: true,
    history: [
      { date: '2026-05-01', price: 9999 }, { date: '2026-05-08', price: 9499 }, { date: '2026-05-15', price: 9199 },
      { date: '2026-05-22', price: 8999 }, { date: '2026-05-29', price: 8599 }, { date: '2026-06-05', price: 8999 },
    ],
  },
  {
    id: 'p2', name: 'PS5 主机', url: '', store: '京东', target: 3500, current: 3899, lowest: 3699, highest: 4299, emoji: '🎮', notify: true,
    history: [
      { date: '2026-04-15', price: 4299 }, { date: '2026-05-01', price: 4099 }, { date: '2026-05-15', price: 3899 },
      { date: '2026-05-30', price: 3699 }, { date: '2026-06-01', price: 3899 },
    ],
  },
] }
function save(d: Product[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function PriceTrendTracker() {
  const [products, setProducts] = useState<Product[]>(load())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStore, setNewStore] = useState('')
  const [newTarget, setNewTarget] = useState('')
  const [newCurrent, setNewCurrent] = useState('')
  const [newEmoji, setNewEmoji] = useState('📦')
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => { save(products) }, [products])

  const active = products.find((p) => p.id === activeId) || products[0]
  const totalSaved = products.reduce((s, p) => s + (p.highest - p.current), 0)
  const reachedTarget = products.filter((p) => p.current <= p.target).length

  const add = () => {
    if (!newName.trim() || !newCurrent) { toast('请填写名称和现价', 'error'); return }
    const p: Product = {
      id: uid(), name: newName, url: '', store: newStore, target: +newTarget || +newCurrent, current: +newCurrent,
      lowest: +newCurrent, highest: +newCurrent, emoji: newEmoji, notify: true,
      history: [{ date: new Date().toISOString().split('T')[0], price: +newCurrent }],
    }
    setProducts([p, ...products])
    setNewName(''); setNewStore(''); setNewTarget(''); setNewCurrent('')
    setAdding(false)
    toast('已追踪', 'success')
  }

  const remove = (id: string) => setProducts(products.filter((p) => p.id !== id))
  const toggleNotify = (id: string) => setProducts(products.map((p) => p.id === id ? { ...p, notify: !p.notify } : p))
  const addHistory = (id: string, price: number) => {
    setProducts(products.map((p) => p.id === id ? { ...p, current: price, history: [...p.history, { date: new Date().toISOString().split('T')[0], price }].slice(-30), lowest: Math.min(p.lowest, price), highest: Math.max(p.highest, price) } : p))
    toast('价格已记录', 'success')
  }
  const setTarget = (id: string, t: number) => setProducts(products.map((p) => p.id === id ? { ...p, target: t } : p))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = products.map((p) => `${p.name}: ¥${p.current} (目标 ¥${p.target})`).join(', ')
      const result = await aiComplete(`为用户的商品价格追踪生成 1 段 50-80 字的购买建议: ${summary}`, '你是 Versa 购物顾问, 简洁实用, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-5 h-5" />
          <h2 className="text-lg font-bold">价格趋势</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">历史价格 · 趋势图 · 目标价</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{products.length}</p>
            <p className="text-[10px] opacity-80">商品</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">¥{totalSaved}</p>
            <p className="text-[10px] opacity-80">已省</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{reachedTarget}/{products.length}</p>
            <p className="text-[10px] opacity-80">达目标</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />加商品
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiRec && (
        <div className="bg-blue-50/40 dark:bg-blue-900/20 rounded-xl p-2 border border-blue-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiRec}</p>
        </div>
      )}

      {products.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {products.map((p) => (
            <button key={p.id} onClick={() => setActiveId(p.id)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0 flex items-center gap-1', activeId === p.id ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              <span>{p.emoji}</span>{p.name.slice(0, 6)}
            </button>
          ))}
        </div>
      )}

      {active ? (
        <>
          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-start gap-2 mb-2">
              <div className="text-3xl">{active.emoji}</div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold truncate">{active.name}</p>
                <p className="text-[10px] text-ink-500">{active.store} · 最低 ¥{active.lowest} · 最高 ¥{active.highest}</p>
              </div>
              <button onClick={() => toggleNotify(active.id)} className={cn('w-8 h-8 rounded-lg flex items-center justify-center', active.notify ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                <Bell className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span>现价 ¥{active.current}</span>
              <span className="text-blue-500 font-bold">目标 ¥{active.target}</span>
            </div>
            <div className="h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${Math.min(100, (active.current / active.highest) * 100)}%` }} />
            </div>
          </div>

          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold">价格趋势</p>
              <span className="text-[10px] text-ink-500">{active.history.length} 条记录</span>
            </div>
            <div className="flex items-end gap-0.5 h-16">
              {active.history.map((h, i) => {
                const max = Math.max(...active.history.map((x) => x.price))
                const min = Math.min(...active.history.map((x) => x.price))
                const range = max - min || 1
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="flex-1 w-full flex items-end">
                      <motion.div initial={{ height: 0 }} animate={{ height: `${((h.price - min) / range) * 80 + 20}%` }} className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t min-h-[2px]" />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-1.5">
            <p className="text-xs font-bold flex items-center gap-1.5"><History className="w-3.5 h-3.5" />更新价格</p>
            <div className="flex gap-1.5">
              <input type="number" placeholder="新价格" id="new-price" className="flex-1 px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-sm" />
              <button onClick={() => { const v = +(document.getElementById('new-price') as HTMLInputElement).value; if (v) addHistory(active.id, v) }} className="px-3 h-8 rounded bg-blue-500 text-white text-xs">+ 记录</button>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-ink-500">目标价</span>
              <input type="number" value={active.target} onChange={(e) => setTarget(active.id, +e.target.value)} className="w-20 px-1 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs text-center" />
              <button onClick={() => remove(active.id)} className="ml-auto text-ink-400 hover:text-rose-500 text-xs">删除商品</button>
            </div>
          </div>

          <details className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
            <summary className="p-2 text-xs font-bold cursor-pointer">历史记录 ({active.history.length})</summary>
            <div className="max-h-40 overflow-y-auto p-2 space-y-1">
              {active.history.map((h, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] p-1.5 rounded bg-ink-50/30 dark:bg-ink-800/30">
                  <span className="text-ink-500">{h.date}</span>
                  <span className="font-bold">¥{h.price}</span>
                </div>
              ))}
            </div>
          </details>
        </>
      ) : (
        <div className="text-center py-8 text-ink-500">
          <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有追踪</p>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">添加追踪</h3>
            <div className="flex gap-1.5">
              <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={2} className="w-14 h-9 text-xl text-center rounded-lg bg-ink-50 dark:bg-ink-800 outline-none" />
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="商品名" className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <input value={newStore} onChange={(e) => setNewStore(e.target.value)} placeholder="商店" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input type="number" value={newCurrent} onChange={(e) => setNewCurrent(e.target.value)} placeholder="现价 ¥" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="number" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} placeholder="目标价 ¥" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-semibold">追踪</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
