import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Plus, Trash2, Sparkles, Loader2, Check, Shirt, Smartphone, Heart, Plane, FileText, Bath, Umbrella, Camera, Plug, Pill, Wallet } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface PackItem {
  id: string
  name: string
  category: 'clothes' | 'tech' | 'toiletries' | 'docs' | 'misc' | 'meds'
  quantity: number
  packed: boolean
  essential: boolean
}

interface PackList {
  id: string
  name: string
  destination: string
  days: number
  items: PackItem[]
}

const STORAGE_KEY = 'versa:pack-v1'

function load(): PackList[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: PackList[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): PackList[] {
  return [
    {
      id: 'p1', name: '京都 5 日', destination: '京都', days: 5,
      items: [
        { id: uid(), name: '护照', category: 'docs', quantity: 1, packed: false, essential: true },
        { id: uid(), name: '日元现金', category: 'docs', quantity: 1, packed: false, essential: true },
        { id: uid(), name: '转换插头', category: 'tech', quantity: 1, packed: false, essential: true },
        { id: uid(), name: '充电宝', category: 'tech', quantity: 1, packed: false, essential: true },
        { id: uid(), name: 'T恤', category: 'clothes', quantity: 5, packed: false, essential: false },
        { id: uid(), name: '外套', category: 'clothes', quantity: 1, packed: false, essential: true },
        { id: uid(), name: '雨伞', category: 'misc', quantity: 1, packed: false, essential: false },
        { id: uid(), name: '常用药', category: 'meds', quantity: 1, packed: false, essential: false },
      ],
    },
  ]
}

const CAT_META = {
  clothes: { label: '衣物', icon: Shirt, color: 'from-blue-500 to-cyan-500' },
  tech: { label: '电子', icon: Smartphone, color: 'from-violet-500 to-purple-500' },
  toiletries: { label: '洗护', icon: Bath, color: 'from-cyan-500 to-teal-500' },
  docs: { label: '证件', icon: FileText, color: 'from-rose-500 to-pink-500' },
  meds: { label: '药品', icon: Pill, color: 'from-emerald-500 to-green-500' },
  misc: { label: '杂物', icon: Umbrella, color: 'from-amber-500 to-orange-500' },
} as const

export function PackingList() {
  const [lists, setLists] = useState<PackList[]>(load())
  const [activeId, setActiveId] = useState<string | null>(lists[0]?.id || null)
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [addingItem, setAddingItem] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCat, setNewCat] = useState<PackItem['category']>('clothes')
  const [newQty, setNewQty] = useState('1')
  const [newEssential, setNewEssential] = useState(false)
  const [name, setName] = useState('')
  const [dest, setDest] = useState('')
  const [days, setDays] = useState('5')

  useEffect(() => { save(lists) }, [lists])

  const active = lists.find((l) => l.id === activeId)
  const packed = active?.items.filter((i) => i.packed).length || 0
  const total = active?.items.length || 0
  const pct = total > 0 ? Math.round((packed / total) * 100) : 0
  const essentialLeft = active?.items.filter((i) => i.essential && !i.packed).length || 0

  const addList = () => {
    if (!name.trim() || !dest) { toast('请填写完整', 'error'); return }
    const l: PackList = { id: uid(), name, destination: dest, days: +days, items: [] }
    setLists([l, ...lists])
    setActiveId(l.id)
    setAdding(false)
    setName(''); setDest(''); setDays('5')
    toast('已创建', 'success')
  }

  const removeList = (id: string) => {
    setLists(lists.filter((l) => l.id !== id))
    if (activeId === id) setActiveId(lists[0]?.id || null)
  }

  const addItem = () => {
    if (!newName.trim() || !active) { toast('请输入', 'error'); return }
    const item: PackItem = { id: uid(), name: newName, category: newCat, quantity: +newQty, packed: false, essential: newEssential }
    setLists(lists.map((l) => l.id === active.id ? { ...l, items: [...l.items, item] } : l))
    setNewName(''); setNewQty('1'); setNewEssential(false)
    setAddingItem(false)
    toast('已添加', 'success')
  }

  const togglePack = (itemId: string) => {
    if (!active) return
    setLists(lists.map((l) => l.id === active.id ? { ...l, items: l.items.map((i) => i.id === itemId ? { ...i, packed: !i.packed } : i) } : l))
  }

  const removeItem = (itemId: string) => {
    if (!active) return
    setLists(lists.map((l) => l.id === active.id ? { ...l, items: l.items.filter((i) => i.id !== itemId) } : l))
  }

  const runAI = async () => {
    if (!isAIEnabled() || !active) { toast('请先配置 AI', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`为 ${active.destination} ${active.days}天旅行生成打包清单 (按类别: 衣物/电子/洗护/证件), 中文, 每类 3-5 项, 用换行分隔`, '你是 Versa 旅行打包专家, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="w-5 h-5" />
          <h2 className="text-lg font-bold">打包清单</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">分类清单 · 必带标记 · 进度追踪</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{lists.length}</p>
            <p className="text-[9px] opacity-80">清单</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{packed}/{total}</p>
            <p className="text-[9px] opacity-80">已收</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{pct}%</p>
            <p className="text-[9px] opacity-80">进度</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{essentialLeft}</p>
            <p className="text-[9px] opacity-80">必带缺</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新建清单
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {lists.map((l) => (
          <button key={l.id} onClick={() => setActiveId(l.id)} className={cn('flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold', activeId === l.id ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {l.name}
          </button>
        ))}
      </div>

      {active ? (
        <div className="space-y-2">
          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{active.destination}</p>
                <p className="text-[10px] text-ink-500">{active.days} 天</p>
              </div>
              <button onClick={() => removeList(active.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
            <div className="mt-1.5 h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
            </div>
            <button onClick={() => setAddingItem(true)} className="w-full mt-1.5 h-8 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-500 text-xs font-semibold flex items-center justify-center gap-1">
              <Plus className="w-3.5 h-3.5" />添加物品
            </button>
          </div>

          {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((cat) => {
            const items = active.items.filter((i) => i.category === cat)
            if (items.length === 0) return null
            const M = CAT_META[cat]
            const Icon = M.icon
            const packed = items.filter((i) => i.packed).length
            return (
              <div key={cat} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={cn('w-6 h-6 rounded flex items-center justify-center bg-gradient-to-br text-white', M.color)}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <p className="text-xs font-bold">{M.label}</p>
                  <span className="text-[10px] text-ink-500 ml-auto">{packed}/{items.length}</span>
                </div>
                <div className="space-y-0.5">
                  {items.map((i) => (
                    <div key={i.id} className={cn('flex items-center gap-1.5 px-1.5 py-1 rounded', i.packed && 'opacity-50')}>
                      <button onClick={() => togglePack(i.id)} className={cn('w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0', i.packed ? 'bg-emerald-500 border-emerald-500' : 'border-ink-300')}>
                        {i.packed && <Check className="w-2.5 h-2.5 text-white" />}
                      </button>
                      <span className={cn('flex-1 text-xs', i.packed && 'line-through')}>{i.name}</span>
                      {i.quantity > 1 && <span className="text-[10px] text-ink-500">×{i.quantity}</span>}
                      {i.essential && <span className="text-[9px] px-1 py-0.5 rounded bg-rose-500 text-white font-bold">必</span>}
                      <button onClick={() => removeItem(i.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-ink-500">
          <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有清单</p>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">新建清单</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="清单名 (如 京都 5 日)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="目的地" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="天数" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={addList} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold">创建</button>
          </motion.div>
        </div>
      )}

      {addingItem && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAddingItem(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">添加物品</h3>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
                const M = CAT_META[k]
                return (
                  <button key={k} onClick={() => setNewCat(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', newCat === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    <M.icon className="w-3.5 h-3.5" />
                    <span className="text-[9px] mt-0.5">{M.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="数量" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="物品名" className="col-span-2 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newEssential} onChange={(e) => setNewEssential(e.target.checked)} className="rounded" />必带
            </label>
            <button onClick={addItem} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
