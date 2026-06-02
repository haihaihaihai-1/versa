import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ShoppingCart, Sparkles, TrendingUp, X, Plus, Loader2, Tag, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { products } from '../data/products'
import { cn } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'
import { useVersa, useCartTotals } from '../store/versa'

interface Suggestion {
  type: 'bundle' | 'coupon' | 'free-shipping' | 'ai'
  title: string
  desc: string
  productIds?: string[]
  saving?: number
  threshold?: number
  aiText?: string
}

const COUPONS = [
  { id: 'c1', name: '满 200 减 20', threshold: 200, saving: 20 },
  { id: 'c2', name: '满 500 减 60', threshold: 500, saving: 60 },
  { id: 'c3', name: '满 1000 减 150', threshold: 1000, saving: 150 },
]

const STORAGE_KEY = 'versa:cart-suggestions'

function loadDismissed(): string[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}

function saveDismissed(d: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {}
}

export function CartSuggestions() {
  const versa = useVersa()
  const cart = versa.cart
  const [dismissed, setDismissed] = useState<string[]>([])
  const [aiResult, setAiResult] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setDismissed(loadDismissed())
  }, [])

  const detailedItems = cart
    .map((c) => {
      const p = products.find((p) => p.id === c.productId)
      return p ? { ...p, quantity: c.quantity } : null
    })
    .filter(Boolean) as (typeof products[0] & { quantity: number })[]

  const total = detailedItems.reduce((s, i) => s + i.price * i.quantity, 0)
  const itemCount = detailedItems.reduce((s, i) => s + i.quantity, 0)
  const firstItem = detailedItems[0]

  const availableCoupons = COUPONS.filter((c) => total < c.threshold)
  const nextCoupon = COUPONS.find((c) => total < c.threshold)

  const bundleSuggestions: Suggestion[] = detailedItems.length > 0
    ? products
        .filter((p) => !detailedItems.find((i) => i.id === p.id))
        .filter((p) => firstItem && (p.category === firstItem.category || p.tags.some((t) => firstItem.tags.includes(t))))
        .slice(0, 3)
        .map((p) => ({
          type: 'bundle',
          title: `搭配 ${p.name}`,
          desc: `同场景搭配, 提升体验`,
          productIds: [p.id],
        }))
    : []

  const suggestions: Suggestion[] = [
    ...availableCoupons.map((c) => ({
      type: 'coupon' as const,
      title: c.name,
      desc: `再买 ¥${c.threshold - total} 可使用`,
      saving: c.saving,
      threshold: c.threshold,
    })),
    ...bundleSuggestions,
    ...(total > 0 && total < 99 ? [{
      type: 'free-shipping' as const,
      title: '免邮建议',
      desc: `满 ¥99 免邮, 再加 ¥${99 - total}`,
      threshold: 99,
    }] : []),
  ].filter((s) => !dismissed.includes(s.title))

  const dismiss = (key: string) => {
    const next = [...dismissed, key]
    setDismissed(next)
    saveDismissed(next)
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    if (detailedItems.length === 0) { toast('购物车为空', 'error'); return }
    setLoading(true)
    setAiResult('')
    try {
      const cartItems = detailedItems.map((i) => `${i.name} x${i.quantity}`).join(', ')
      const result = await aiComplete(
        `为购物车推荐凑单/优化建议 (100-200 字):\n购物车: ${cartItems}\n总价: ¥${total}\n请给出: 1) 凑单建议 2) 满减建议 3) 替代品推荐`,
        '你是 Versa 凑单助手, 实用省钱, 中文'
      )
      setAiResult(result)
    } catch (e: any) {
      toast(e?.message || '生成失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">购物车助手</h2>
        </div>
        <p className="text-xs opacity-90">智能凑单, 帮你省更多</p>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{itemCount}</p>
            <p className="text-[10px] opacity-80">商品数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">¥{total}</p>
            <p className="text-[10px] opacity-80">总价</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">¥{nextCoupon ? nextCoupon.threshold - total : 0}</p>
            <p className="text-[10px] opacity-80">距满减</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm font-bold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-orange-500" />智能建议
        </p>
        <button
          onClick={runAI}
          disabled={loading}
          className="px-2.5 h-7 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-semibold flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
          AI 凑单
        </button>
      </div>

      {aiResult && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-900/20 dark:to-rose-900/20 rounded-2xl p-3 border border-orange-200/40"
        >
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-orange-500">
            <Sparkles className="w-3.5 h-3.5" />AI 凑单建议
          </p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiResult}</p>
        </motion.div>
      )}

      {detailedItems.length === 0 ? (
        <div className="text-center py-8 text-ink-500">
          <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">购物车空空如也</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {suggestions.map((s, i) => {
            const ICONS: any = { bundle: Sparkles, coupon: Tag, 'free-shipping': TrendingUp, ai: Sparkles }
            const COLORS: any = { bundle: 'bg-violet-500', coupon: 'bg-rose-500', 'free-shipping': 'bg-emerald-500', ai: 'bg-amber-500' }
            const Icon = ICONS[s.type]
            return (
              <motion.div
                key={`${s.type}-${i}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white/60 dark:bg-ink-900/30 rounded-xl p-2.5 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2"
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0', COLORS[s.type])}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-[10px] text-ink-500">{s.desc}</p>
                </div>
                {s.type === 'bundle' && s.productIds?.[0] && (
                  <Link
                    to={`/shop/${s.productIds[0]}`}
                    className="px-2 h-6 rounded bg-nova-500 text-white text-[10px] font-semibold flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" />加购
                  </Link>
                )}
                <button onClick={() => dismiss(s.title)} className="text-ink-400 hover:text-rose-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )
          })}
        </div>
      )}

      {nextCoupon && (
        <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl p-3 border border-rose-200/40">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertCircle className="w-4 h-4 text-rose-500" />
            <p className="text-sm font-bold text-rose-500">凑单小贴士</p>
          </div>
          <p className="text-xs text-ink-500">再买 <span className="font-bold text-rose-500">¥{nextCoupon.threshold - total}</span> 即可使用「{nextCoupon.name}」, 立省 ¥{nextCoupon.saving}!</p>
        </div>
      )}
    </div>
  )
}
