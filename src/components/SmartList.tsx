import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, Trash2, Sparkles, ShoppingCart, Calendar, AlertCircle, X, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { products } from '../data/products'
import { cn, formatCurrency } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { AIIndicator } from './ai/AIIndicator'
import { toast } from './ui/Toaster'

const STORAGE_KEY = 'versa:smartlist'

export interface SmartListItem {
  id: string
  name: string
  qty: number
  done: boolean
  priority: 'low' | 'normal' | 'high'
  note?: string
  productId?: string
  estimatedPrice?: number
  createdAt: number
}

const PRIORITY_COLORS = {
  low: 'border-ink-200 dark:border-ink-800 bg-white/60 dark:bg-ink-900/40',
  normal: 'border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20',
  high: 'border-debate-300 dark:border-debate-800/50 bg-debate-50/60 dark:bg-debate-950/20',
}

const PRIORITY_LABELS = { low: '低', normal: '中', high: '高' }

function loadList(): SmartListItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return [
    { id: 'demo1', name: '鸡蛋', qty: 10, done: false, priority: 'normal', createdAt: Date.now() - 86400000 },
    { id: 'demo2', name: '牛奶', qty: 2, done: false, priority: 'high', createdAt: Date.now() - 86400000 },
    { id: 'demo3', name: 'iPhone 16 Pro', qty: 1, done: false, priority: 'low', productId: 'p2', estimatedPrice: 8999, createdAt: Date.now() - 3600000 },
  ]
}

function saveList(list: SmartListItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)) } catch {}
}

interface Props {
  compact?: boolean
}

export function SmartList({ compact = false }: Props) {
  const [items, setItems] = useState<SmartListItem[]>([])
  const [newName, setNewName] = useState('')
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all')
  const [aiSuggesting, setAiSuggesting] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    setItems(loadList())
  }, [])

  useEffect(() => {
    if (items.length > 0) saveList(items)
  }, [items])

  const add = useCallback((name: string, extras?: Partial<SmartListItem>) => {
    if (!name.trim()) return
    const item: SmartListItem = {
      id: 'i' + Date.now(),
      name: name.trim(),
      qty: 1,
      done: false,
      priority: 'normal',
      createdAt: Date.now(),
      ...extras,
    }
    setItems((arr) => [item, ...arr])
    setNewName('')
    toast('已加入清单', 'success')
  }, [])

  const toggle = useCallback((id: string) => {
    setItems((arr) => arr.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))
  }, [])

  const remove = useCallback((id: string) => {
    setItems((arr) => arr.filter((i) => i.id !== id))
  }, [])

  const clearDone = useCallback(() => {
    setItems((arr) => arr.filter((i) => !i.done))
    toast('已清除已完成项', 'success')
  }, [])

  const handleAISuggest = useCallback(async () => {
    if (!isAIEnabled()) {
      toast('请先配置 VITE_MIMO_API_KEY', 'info')
      return
    }
    setAiSuggesting(true)
    setAiSuggestions([])
    try {
      const result = await aiComplete(
        items.filter((i) => !i.done).map((i) => i.name).join('、') || '日常生活用品',
        '你是一个购物助手。基于用户的当前清单,推荐 5 个可能需要的相关物品(中文,每个一行,简短 2-6 字,不要带序号或解释)',
        { maxTokens: 200, temperature: 0.7 }
      )
      const list = result.split('\n').map((l) => l.replace(/^[\d\-•.\s]+/, '').trim()).filter(Boolean).slice(0, 5)
      setAiSuggestions(list)
    } catch (e) {
      toast('AI 推荐失败', 'error')
    } finally {
      setAiSuggesting(false)
    }
  }, [items])

  const totalEstimate = items.filter((i) => !i.done).reduce((s, i) => s + (i.estimatedPrice || 0) * i.qty, 0)
  const doneCount = items.filter((i) => i.done).length
  const filtered = items.filter((i) => (filter === 'todo' ? !i.done : filter === 'done' ? i.done : true))

  const filteredProducts = productSearch
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5)
    : []

  if (compact) {
    return (
      <div className="space-y-2">
        {items.slice(0, 5).map((i) => (
          <div key={i.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-ink-900/40">
            <button
              onClick={() => toggle(i.id)}
              className={cn(
                'w-5 h-5 rounded border-2 flex items-center justify-center',
                i.done ? 'bg-shop-500 border-shop-500' : 'border-ink-300'
              )}
            >
              {i.done && <Check className="w-3 h-3 text-white" />}
            </button>
            <span className={cn('flex-1 text-sm', i.done && 'line-through opacity-50')}>{i.name}</span>
            <span className="text-xs text-ink-400">×{i.qty}</span>
          </div>
        ))}
        {items.length > 5 && <p className="text-xs text-ink-500 text-center">还有 {items.length - 5} 项</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add(newName)}
          placeholder="添加物品 · 回车确认"
          className="flex-1 px-3 h-10 rounded-xl bg-white dark:bg-ink-800 border border-ink-200 dark:border-ink-700 outline-none focus:border-nova-500"
        />
        <button
          onClick={() => setShowAddProduct((v) => !v)}
          className="px-3 h-10 rounded-xl border border-ink-200 dark:border-ink-700 text-xs hover:bg-ink-50 dark:hover:bg-ink-800"
          title="从商品添加"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => add(newName)}
          disabled={!newName.trim()}
          className="px-4 h-10 rounded-xl bg-gradient-to-r from-nova-500 to-pink-500 text-white font-semibold disabled:opacity-50"
        >
          添加
        </button>
      </div>

      {showAddProduct && (
        <div className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800/50 border border-ink-200 dark:border-ink-700">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-ink-400" />
            <input
              autoFocus
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="搜索商品..."
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <button onClick={() => setShowAddProduct(false)}><X className="w-4 h-4" /></button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  add(p.name, { productId: p.id, estimatedPrice: p.price })
                  setShowAddProduct(false)
                  setProductSearch('')
                }}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-ink-900 text-left"
              >
                <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{p.name}</div>
                  <div className="text-xs text-shop-600 font-bold">{formatCurrency(p.price)}</div>
                </div>
                <Plus className="w-4 h-4" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => setFilter('all')}
          className={cn('px-3 py-1 rounded-full', filter === 'all' ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
        >
          全部 {items.length}
        </button>
        <button
          onClick={() => setFilter('todo')}
          className={cn('px-3 py-1 rounded-full', filter === 'todo' ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
        >
          待办 {items.length - doneCount}
        </button>
        <button
          onClick={() => setFilter('done')}
          className={cn('px-3 py-1 rounded-full', filter === 'done' ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
        >
          已完成 {doneCount}
        </button>
        <div className="flex-1" />
        {doneCount > 0 && (
          <button onClick={clearDone} className="text-ink-500 hover:text-debate-500">清除已完成</button>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex items-center gap-3 text-xs px-3 py-2 rounded-xl bg-gradient-to-r from-nova-50 to-shop-50 dark:from-nova-950/30 dark:to-shop-950/30 border border-nova-200/50 dark:border-nova-800/30">
          <ShoppingCart className="w-4 h-4 text-nova-500" />
          <span>预估总额</span>
          <span className="font-bold text-nova-600 text-base ml-auto">{formatCurrency(totalEstimate)}</span>
        </div>
      )}

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-500">
            <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">清单空空如也</p>
            <p className="text-xs">添加一些想买的物品吧</p>
          </div>
        ) : (
          filtered.map((i) => (
            <div
              key={i.id}
              className={cn(
                'flex items-center gap-2 p-3 rounded-xl border transition',
                PRIORITY_COLORS[i.priority],
                i.done && 'opacity-60'
              )}
            >
              <button
                onClick={() => toggle(i.id)}
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                  i.done ? 'bg-shop-500 border-shop-500' : 'border-ink-300'
                )}
              >
                {i.done && <Check className="w-3 h-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={cn('text-sm font-medium', i.done && 'line-through')}>{i.name}</div>
                {i.estimatedPrice ? (
                  <div className="text-xs text-shop-600 font-bold">{formatCurrency(i.estimatedPrice)}</div>
                ) : null}
              </div>
              <span className="text-xs text-ink-500">×{i.qty}</span>
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded', i.priority === 'high' ? 'bg-debate-500/20 text-debate-600' : 'bg-ink-200 dark:bg-ink-800 text-ink-500')}>
                {PRIORITY_LABELS[i.priority]}
              </span>
              {i.productId && (
                <Link to={`/shop/${i.productId}`} className="text-xs text-nova-500 hover:underline">查看</Link>
              )}
              <button onClick={() => remove(i.id)} className="p-1 hover:bg-ink-200/50 dark:hover:bg-ink-800/50 rounded">
                <Trash2 className="w-3.5 h-3.5 text-ink-400" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-ink-200 dark:border-ink-800 pt-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-nova-500" />
            AI 智能补充
          </h3>
          <button
            onClick={handleAISuggest}
            disabled={aiSuggesting}
            className="text-xs px-3 h-7 rounded-full bg-gradient-to-r from-nova-500 to-pink-500 text-white font-semibold disabled:opacity-50"
          >
            {aiSuggesting ? '思考中...' : 'AI 推荐'}
          </button>
        </div>
        <AnimatePresence>
          {aiSuggesting && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-3">
              <AIIndicator loading text="AI 正在分析你的清单" />
            </motion.div>
          )}
          {aiSuggestions.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2">
              {aiSuggestions.map((s, i) => (
                <motion.button
                  key={i}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => {
                    add(s)
                    setAiSuggestions((arr) => arr.filter((_, j) => j !== i))
                  }}
                  className="px-3 py-1.5 rounded-full bg-nova-50 dark:bg-nova-950/30 text-nova-700 dark:text-nova-300 text-xs font-medium hover:bg-nova-100 dark:hover:bg-nova-900/30 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {s}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
