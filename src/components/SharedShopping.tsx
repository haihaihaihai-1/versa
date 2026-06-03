import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, Plus, Trash2, Sparkles, Loader2, Check, User, Users, ShoppingBag, Apple, Beef, Milk, Wheat, Carrot, Cookie, Wine, Package, ChevronRight, Tag, AlertCircle } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface ShoppingItem {
  id: string
  name: string
  category: 'produce' | 'meat' | 'dairy' | 'grain' | 'snack' | 'beverage' | 'household' | 'other'
  quantity: number
  unit: string
  addedBy: string
  assignedTo: string
  urgent: boolean
  done: boolean
  cost: number
  date: string
}

const STORAGE_KEY = 'versa:fam-shopping-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }

function load(): ShoppingItem[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: ShoppingItem[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): ShoppingItem[] {
  return [
    { id: '1', name: '牛奶', category: 'dairy', quantity: 2, unit: '升', addedBy: '妈妈', assignedTo: '妈妈', urgent: true, done: false, cost: 25, date: todayKey() },
    { id: '2', name: '鸡蛋', category: 'dairy', quantity: 1, unit: '打', addedBy: '妈妈', assignedTo: '妈妈', urgent: false, done: true, cost: 18, date: todayKey() },
    { id: '3', name: '番茄', category: 'produce', quantity: 500, unit: '克', addedBy: '爸爸', assignedTo: '小宝', urgent: false, done: false, cost: 8, date: todayKey() },
    { id: '4', name: '猪肉', category: 'meat', quantity: 500, unit: '克', addedBy: '妈妈', assignedTo: '妈妈', urgent: false, done: false, cost: 35, date: todayKey() },
    { id: '5', name: '苹果', category: 'produce', quantity: 6, unit: '个', addedBy: '小宝', assignedTo: '小宝', urgent: false, done: false, cost: 20, date: todayKey() },
  ]
}

const CAT_META = {
  produce: { label: '果蔬', icon: Apple, color: 'from-emerald-500 to-green-500' },
  meat: { label: '肉禽', icon: Beef, color: 'from-rose-500 to-red-500' },
  dairy: { label: '乳蛋', icon: Milk, color: 'from-blue-500 to-cyan-500' },
  grain: { label: '米面', icon: Wheat, color: 'from-amber-500 to-orange-500' },
  snack: { label: '零食', icon: Cookie, color: 'from-violet-500 to-purple-500' },
  beverage: { label: '饮品', icon: Wine, color: 'from-pink-500 to-rose-500' },
  household: { label: '日用', icon: Package, color: 'from-ink-500 to-ink-600' },
  other: { label: '其他', icon: Tag, color: 'from-cyan-500 to-blue-500' },
} as const

export function SharedShopping() {
  const [items, setItems] = useState<ShoppingItem[]>(load())
  const [members, setMembers] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done' | 'mine'>('pending')
  const [currentMember, setCurrentMember] = useState('')
  const [name, setName] = useState('')
  const [category, setCategory] = useState<ShoppingItem['category']>('produce')
  const [quantity, setQuantity] = useState('1')
  const [unit, setUnit] = useState('个')
  const [assignedTo, setAssignedTo] = useState('')
  const [urgent, setUrgent] = useState(false)
  const [cost, setCost] = useState('')

  useEffect(() => {
    save(items)
    try {
      const fam = JSON.parse(localStorage.getItem('versa:family-v1') || '[]')
      setMembers(Array.from(new Set(fam.map((m: any) => m.name))))
    } catch {}
  }, [items])

  const total = items.length
  const pending = items.filter((i) => !i.done).length
  const done = items.filter((i) => i.done).length
  const totalCost = items.reduce((s, i) => s + (i.cost || 0), 0)
  const urgentCount = items.filter((i) => i.urgent && !i.done).length
  const myItems = items.filter((i) => i.assignedTo === currentMember && !i.done).length

  const filtered = items.filter((i) => {
    if (filter === 'pending') return !i.done
    if (filter === 'done') return i.done
    if (filter === 'mine') return i.assignedTo === currentMember
    return true
  })

  const add = () => {
    if (!name.trim() || !currentMember) { toast('请填写', 'error'); return }
    const i: ShoppingItem = { id: uid(), name, category, quantity: +quantity, unit, addedBy: currentMember, assignedTo: assignedTo || currentMember, urgent, done: false, cost: +cost || 0, date: todayKey() }
    setItems([i, ...items])
    setName(''); setQuantity('1'); setUrgent(false); setCost('')
    setAdding(false)
    toast('已加入', 'success')
  }

  const remove = (id: string) => setItems(items.filter((i) => i.id !== id))
  const toggle = (id: string) => setItems(items.map((i) => i.id === id ? { ...i, done: !i.done } : i))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`家庭购物清单: ${items.filter((i) => !i.done).map((i) => i.name).join('、')}. 推荐 3 个补充食材 (1 句话), 中文`, '你是 Versa 家庭顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingCart className="w-5 h-5" />
          <h2 className="text-lg font-bold">家庭购物</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 分类 · 多人协作 · 认领分配</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{pending}</p>
            <p className="text-[9px] opacity-80">待买</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-emerald-100">{done}</p>
            <p className="text-[9px] opacity-80">已买</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{urgentCount}</p>
            <p className="text-[9px] opacity-80">紧急</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{totalCost}</p>
            <p className="text-[9px] opacity-80">预算</p>
          </div>
        </div>
      </div>

      {members.length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-xs font-semibold mb-1.5">我是谁?</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setCurrentMember('')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', !currentMember ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>未选</button>
            {members.map((m) => (
              <button key={m} onClick={() => setCurrentMember(m)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', currentMember === m ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                {m}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />加物品
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-orange-50/40 dark:bg-orange-900/20 rounded-xl p-2 border border-orange-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['pending', 'mine', 'done', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'pending' ? '📋 待买' : f === 'mine' ? '🙋 我的' : f === 'done' ? '✓ 已买' : '全部'}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有物品</p>
          </div>
        ) : filtered.map((i) => {
          const CM = CAT_META[i.category]
          const Icon = CM.icon
          return (
            <motion.div key={i.id} whileHover={{ y: -1 }} className={cn('rounded-xl p-2 border flex items-center gap-2', i.done ? 'bg-emerald-50/40 dark:bg-emerald-900/20 border-emerald-200/40' : i.urgent ? 'border-rose-400 bg-rose-50/40 dark:bg-rose-900/20' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
              <button onClick={() => toggle(i.id)} className={cn('w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0', i.done ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300')}>
                {i.done && <Check className="w-3 h-3 text-white" />}
              </button>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', CM.color)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate', i.done && 'line-through opacity-60')}>{i.name}</p>
                <p className="text-[10px] text-ink-500 flex items-center gap-1.5">
                  <span>{i.quantity} {i.unit}</span>
                  <span>· {i.assignedTo}</span>
                  {i.cost > 0 && <span>· ¥{i.cost}</span>}
                </p>
              </div>
              {i.urgent && !i.done && <AlertCircle className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />}
              <button onClick={() => remove(i.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">加物品</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="物品名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">分类</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                  const C = CAT_META[k]
                  return (
                    <button key={k} onClick={() => setCategory(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', category === k ? `bg-gradient-to-br ${C.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      <C.icon className="w-3.5 h-3.5" />
                      <span className="text-[9px]">{C.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="数量" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="单位" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} placeholder="认领人" list="members" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <datalist id="members">{members.map((m) => <option key={m} value={m} />)}</datalist>
              <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="预算 ¥" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="rounded" />紧急
            </label>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
