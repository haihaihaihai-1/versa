import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Plus, Trash2, Check, X, Sparkles, Loader2, ListChecks, Package, AlertCircle, Users, Share2, Copy, ChevronRight } from 'lucide-react'
import { cn, uid, formatNumber, formatCurrency } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Item {
  id: string
  name: string
  qty: number
  unit: string
  category: string
  estimatedPrice?: number
  actualPrice?: number
  purchased: boolean
  note: string
}

interface List {
  id: string
  name: string
  emoji: string
  store?: string
  dueDate?: string
  items: Item[]
  at: number
}

const STORAGE_KEY = 'versa:shopping-list'

function load(): List[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [
  {
    id: 'l1', name: '周末超市采购', emoji: '🛒', store: '山姆会员店', dueDate: '2026-06-10', at: Date.now() - 86400000,
    items: [
      { id: uid(), name: '牛奶 2L', qty: 1, unit: '瓶', category: '乳制品', estimatedPrice: 25, purchased: true, actualPrice: 28, note: '买低脂的' },
      { id: uid(), name: '鸡蛋', qty: 1, unit: '盒', category: '蛋类', estimatedPrice: 20, purchased: true, actualPrice: 19, note: '' },
      { id: uid(), name: '面包', qty: 1, unit: '袋', category: '主食', estimatedPrice: 15, purchased: false, note: '买全麦' },
      { id: uid(), name: '三文鱼', qty: 500, unit: '克', category: '海鲜', estimatedPrice: 80, purchased: false, note: '冰鲜' },
      { id: uid(), name: '牛油果', qty: 4, unit: '个', category: '水果', estimatedPrice: 30, purchased: false, note: '' },
    ],
  },
] }
function save(d: List[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function ShoppingListMaker() {
  const [lists, setLists] = useState<List[]>(load())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newItemName, setNewItemName] = useState('')
  const [creating, setCreating] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(lists) }, [lists])

  const active = lists.find((l) => l.id === activeId) || lists[0]

  const createList = () => {
    if (!newName.trim()) { toast('请填写清单名', 'error'); return }
    const l: List = { id: uid(), name: newName, emoji: '📝', items: [], at: Date.now() }
    setLists([l, ...lists])
    setActiveId(l.id)
    setNewName(''); setCreating(false)
    toast('已创建', 'success')
  }

  const removeList = (id: string) => setLists(lists.filter((l) => l.id !== id))
  const updateList = (id: string, patch: Partial<List>) => setLists(lists.map((l) => l.id === id ? { ...l, ...patch } : l))
  const addItem = (lid: string) => {
    if (!newItemName.trim()) { toast('请填写商品名', 'error'); return }
    const i: Item = { id: uid(), name: newItemName, qty: 1, unit: '个', category: '其他', purchased: false, note: '' }
    updateList(lid, { items: [i, ...(lists.find((l) => l.id === lid)?.items || [])] })
    setNewItemName('')
  }
  const updateItem = (lid: string, iid: string, patch: Partial<Item>) => {
    const l = lists.find((x) => x.id === lid)
    if (!l) return
    updateList(lid, { items: l.items.map((i) => i.id === iid ? { ...i, ...patch } : i) })
  }
  const togglePurchased = (lid: string, iid: string) => {
    const l = lists.find((x) => x.id === lid)
    if (!l) return
    updateList(lid, { items: l.items.map((i) => i.id === iid ? { ...i, purchased: !i.purchased } : i) })
  }
  const removeItem = (lid: string, iid: string) => {
    const l = lists.find((x) => x.id === lid)
    if (!l) return
    updateList(lid, { items: l.items.filter((i) => i.id !== iid) })
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 3 个适合周末家庭采购的食材清单 (50-80 字)', '你是 Versa 美食顾问, 简洁实用, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  if (!active) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-3 text-white">
          <h2 className="text-lg font-bold flex items-center gap-1.5"><ShoppingCart className="w-5 h-5" />购物清单</h2>
        </div>
        <div className="text-center py-8 text-ink-500">
          <ListChecks className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有清单</p>
        </div>
        <button onClick={() => setCreating(true)} className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold flex items-center justify-center gap-1">
          <Plus className="w-4 h-4" />新建清单
        </button>
      </div>
    )
  }

  const purchased = active.items.filter((i) => i.purchased).length
  const totalEst = active.items.reduce((s, i) => s + (i.estimatedPrice || 0) * i.qty, 0)
  const totalAct = active.items.filter((i) => i.purchased).reduce((s, i) => s + (i.actualPrice || 0) * i.qty, 0)
  const categories = Array.from(new Set(active.items.map((i) => i.category)))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingCart className="w-5 h-5" />
          <h2 className="text-lg font-bold">购物清单</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">分类 · 预算 · 分享</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{active.items.length}</p>
            <p className="text-[9px] opacity-80">总</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{purchased}</p>
            <p className="text-[9px] opacity-80">已买</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{totalEst}</p>
            <p className="text-[9px] opacity-80">预算</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{totalAct}</p>
            <p className="text-[9px] opacity-80">实付</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {lists.map((l) => (
          <button key={l.id} onClick={() => setActiveId(l.id)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', activeId === l.id ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {l.emoji} {l.name}
          </button>
        ))}
        <button onClick={() => setCreating(true)} className="px-3 h-7 rounded-full bg-emerald-500 text-white text-xs font-semibold flex-shrink-0">+ 新建</button>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <div className="flex items-center gap-1.5">
          <span className="text-2xl">{active.emoji}</span>
          <input value={active.name} onChange={(e) => updateList(active.id, { name: e.target.value })} className="flex-1 px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-sm font-bold outline-none" />
          <button onClick={() => setSharing(true)} className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => removeList(active.id)} className="w-8 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-rose-500 flex items-center justify-center text-xs">×</button>
        </div>
        <div className="flex gap-1.5">
          <input value={active.store || ''} onChange={(e) => updateList(active.id, { store: e.target.value })} placeholder="商店 (可选)" className="flex-1 px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs outline-none" />
          <input type="date" value={active.dueDate || ''} onChange={(e) => updateList(active.id, { dueDate: e.target.value })} className="px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
        </div>
        <div className="flex gap-1.5">
          <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem(active.id)} placeholder="加商品..." className="flex-1 px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
          <button onClick={() => addItem(active.id)} className="px-3 h-8 rounded-lg bg-emerald-500 text-white text-xs font-bold">+</button>
        </div>
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 采购清单
      </button>

      {aiRec && (
        <div className="bg-emerald-50/40 dark:bg-emerald-900/20 rounded-xl p-2 border border-emerald-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiRec}</p>
        </div>
      )}

      {categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {categories.map((c) => (
            <span key={c} className="px-2 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold flex items-center gap-0.5 flex-shrink-0">
              {active.items.filter((i) => i.category === c).length} {c}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-1">
        {active.items.length === 0 ? (
          <p className="text-center text-xs text-ink-500 py-3">清单是空的</p>
        ) : (
          active.items.map((i) => (
            <div key={i.id} className={cn('flex items-center gap-2 p-2 rounded-xl border', i.purchased ? 'bg-emerald-50/40 dark:bg-emerald-900/20 border-emerald-200/40 opacity-60' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
              <button onClick={() => togglePurchased(active.id, i.id)} className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0', i.purchased ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300')}>
                {i.purchased && <Check className="w-3.5 h-3.5 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate', i.purchased && 'line-through')}>{i.name}</p>
                <p className="text-[10px] text-ink-500">{i.category} · {i.qty}{i.unit} {i.estimatedPrice ? `· ~¥${i.estimatedPrice * i.qty}` : ''}</p>
              </div>
              {!i.purchased && (
                <input type="number" placeholder="实付" value={i.actualPrice || ''} onChange={(e) => updateItem(active.id, i.id, { actualPrice: +e.target.value || undefined })} className="w-16 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs text-center" />
              )}
              <button onClick={() => removeItem(active.id, i.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
          ))
        )}
      </div>

      {creating && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setCreating(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">新建清单</h3>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="清单名 (如 周末采购)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={createList} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">创建</button>
          </motion.div>
        </div>
      )}

      {sharing && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={() => setSharing(false)}>
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ink-900 rounded-2xl p-4 max-w-sm w-full space-y-2">
            <h3 className="font-bold">分享清单</h3>
            <textarea readOnly value={active.items.map((i) => `${i.purchased ? '✓' : '☐'} ${i.name} ${i.qty}${i.unit}`).join('\n')} className="w-full h-40 px-2 py-1.5 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs font-mono outline-none resize-none" />
            <button onClick={() => { navigator.clipboard?.writeText(active.items.map((i) => `${i.purchased ? '✓' : '☐'} ${i.name}`).join('\n')); toast('已复制', 'success') }} className="w-full h-9 rounded-lg bg-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-1">
              <Copy className="w-3 h-3" />复制到剪贴板
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
