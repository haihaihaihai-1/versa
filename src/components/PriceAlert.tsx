import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingDown, Bell, Plus, X, Trash2, Sparkles, Loader2, Eye, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { products } from '../data/products'
import { cn, formatNumber, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Alert {
  id: string
  productId: string
  productName: string
  productImg: string
  currentPrice: number
  targetPrice: number
  createdAt: number
  triggered: boolean
  history: { date: number; price: number }[]
}

const STORAGE_KEY = 'versa:price-alerts'

function load(): Alert[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(a: Alert[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(a)) } catch {} }

function generateHistory(base: number): { date: number; price: number }[] {
  const out: { date: number; price: number }[] = []
  let p = base * 1.15
  for (let i = 30; i >= 0; i--) {
    p += (Math.random() - 0.5) * base * 0.03
    out.push({ date: Date.now() - i * 86400000, price: Math.round(p) })
  }
  out[out.length - 1] = { date: Date.now(), price: base }
  return out
}

export function PriceAlert() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [addOpen, setAddOpen] = useState(false)
  const [selected, setSelected] = useState<typeof products[0] | null>(null)
  const [target, setTarget] = useState('')
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { setAlerts(load()) }, [])
  useEffect(() => { if (alerts.length) save(alerts) }, [alerts])

  const add = () => {
    if (!selected || !target) { toast('请选择商品并填写目标价', 'error'); return }
    const a: Alert = {
      id: uid(), productId: selected.id, productName: selected.name, productImg: selected.images?.[0] || '',
      currentPrice: selected.price, targetPrice: +target, createdAt: Date.now(), triggered: false,
      history: generateHistory(selected.price),
    }
    setAlerts([a, ...alerts])
    setSelected(null); setTarget(''); setAddOpen(false)
    toast('价格预警已设置', 'success')
  }

  const remove = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id))
  }

  const trigger = (id: string) => {
    setAlerts((as) => as.map((a) => a.id === id ? { ...a, triggered: true } : a))
    toast('🎉 价格已降至目标, 立即抢购!', 'success')
  }

  const analyze = async (a: Alert) => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(
        `为「${a.productName}」(当前价 ¥${a.currentPrice}, 目标价 ¥${a.targetPrice}) 分析价格走势, 给出购买建议 (50-100 字)`,
        '你是 Versa 价格分析师, 简洁专业, 中文'
      )
      setAiAnalysis(result)
    } catch (e: any) { toast(e?.message || '分析失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <TrendingDown className="w-5 h-5" />
          <h2 className="text-lg font-bold">价格预警</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">降价自动通知, 不再错过好价</p>
        <button onClick={() => setAddOpen(true)} className="px-3 h-8 rounded-full bg-white text-rose-500 text-xs font-bold flex items-center gap-0.5">
          <Plus className="w-3.5 h-3.5" />添加预警
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-ink-500">
          <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有价格预警</p>
          <p className="text-[10px]">添加你关注的商品, 降价立即通知</p>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => {
            const lowest = Math.min(...a.history.map((h) => h.price))
            const highest = Math.max(...a.history.map((h) => h.price))
            const minPrice = Math.min(...a.history.map((h) => h.price))
            return (
              <motion.div
                key={a.id}
                whileHover={{ y: -2 }}
                className={cn('bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border', a.triggered ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-900/20' : 'border-ink-200/60 dark:border-ink-800/60')}
              >
                <div className="flex gap-2 mb-2">
                  <img src={a.productImg} alt={a.productName} className="w-14 h-14 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{a.productName}</p>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <span className="text-lg font-bold text-rose-500">¥{a.currentPrice}</span>
                      <span className="text-[10px] text-ink-400">目标 ¥{a.targetPrice}</span>
                    </div>
                    {a.triggered && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-white font-bold">🎉 已触发</span>}
                  </div>
                  <button onClick={() => remove(a.id)} className="text-ink-400 hover:text-rose-500 self-start">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative h-12 my-2">
                  <svg viewBox="0 0 200 40" className="w-full h-full" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={`grad-${a.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgb(244 63 94)" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="rgb(244 63 94)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {a.history.length > 1 && (() => {
                      const points = a.history.map((h, i) => {
                        const x = (i / (a.history.length - 1)) * 200
                        const y = 40 - ((h.price - minPrice) / (highest - minPrice || 1)) * 36 - 2
                        return `${x},${y}`
                      }).join(' ')
                      return (
                        <>
                          <polyline points={`0,40 ${points} 200,40`} fill={`url(#grad-${a.id})`} />
                          <polyline points={points} fill="none" stroke="rgb(244 63 94)" strokeWidth="1.5" />
                        </>
                      )
                    })()}
                    <line x1="0" x2="200" y1={40 - ((a.targetPrice - minPrice) / (highest - minPrice || 1)) * 36 - 2} y2={40 - ((a.targetPrice - minPrice) / (highest - minPrice || 1)) * 36 - 2} stroke="rgb(34 197 94)" strokeWidth="1" strokeDasharray="3,3" />
                  </svg>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-ink-500">
                  <span>30 天最低 ¥{lowest}</span>
                  <span>·</span>
                  <span>最高 ¥{highest}</span>
                </div>

                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => analyze(a)} disabled={loading} className="flex-1 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1">
                    {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    AI 走势
                  </button>
                  {a.triggered ? (
                    <Link to={`/shop/${a.productId}`} className="flex-1 h-7 rounded-lg bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
                      <Check className="w-3 h-3" />立即购买
                    </Link>
                  ) : (
                    <button onClick={() => trigger(a.id)} className="flex-1 h-7 rounded-lg bg-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
                      标记达成
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {aiAnalysis && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl p-3 border border-amber-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-amber-500"><Sparkles className="w-3.5 h-3.5" />AI 价格分析</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
        </div>
      )}

      {addOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAddOpen(false)}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold">添加价格预警</h3>
              <button onClick={() => setAddOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <input value={target} onChange={(e) => setTarget(e.target.value)} type="number" placeholder="目标价格 (¥)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
            <p className="text-xs text-ink-500">选择商品:</p>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {products.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={cn('w-full flex items-center gap-2 p-2 rounded-lg text-left', selected?.id === p.id ? 'bg-rose-50 dark:bg-rose-900/30' : 'hover:bg-ink-50 dark:hover:bg-ink-800')}
                >
                  <img src={p.images?.[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold line-clamp-1">{p.name}</p>
                    <p className="text-xs text-rose-500 font-bold">¥{p.price}</p>
                  </div>
                  {selected?.id === p.id && <Check className="w-4 h-4 text-rose-500" />}
                </button>
              ))}
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-rose-500 text-white text-sm font-semibold">添加预警</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
