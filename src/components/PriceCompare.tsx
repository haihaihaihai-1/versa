import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, TrendingDown, TrendingUp, Star, Zap, Crown, Award } from 'lucide-react'
import { products } from '../data/products'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { cn, formatCurrency } from '../lib/utils'
import { toast } from './ui/Toaster'
import { AIErrorBanner, AIIndicator } from './ai/AIIndicator'

interface CompareItem {
  productId: string
  price: number
  rating: number
  reviewCount: number
  platform: string
}

const PLATFORMS = [
  { name: 'Versa', factor: 1, color: 'from-violet-500 to-purple-500' },
  { name: '京东', factor: 0.95, color: 'from-rose-500 to-pink-500' },
  { name: '拼多多', factor: 0.88, color: 'from-orange-500 to-red-500' },
  { name: '天猫', factor: 1.02, color: 'from-amber-500 to-yellow-500' },
  { name: '苏宁', factor: 0.92, color: 'from-blue-500 to-cyan-500' },
]

export function PriceCompare({ productId }: { productId: string }) {
  const product = products.find((p) => p.id === productId)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState('Versa')

  if (!product) return null

  const items: CompareItem[] = PLATFORMS.map((p) => ({
    productId,
    price: Math.round(product.price * p.factor * (0.95 + Math.random() * 0.1)),
    rating: product.rating - 0.1 + Math.random() * 0.3,
    reviewCount: Math.round(product.reviewCount * (0.7 + Math.random() * 0.6)),
    platform: p.name,
  }))

  const sorted = [...items].sort((a, b) => a.price - b.price)
  const cheapest = sorted[0]
  const mostExpensive = sorted[sorted.length - 1]
  const saving = mostExpensive.price - cheapest.price

  const analyze = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    setAnalysis(null)
    try {
      const result = await aiComplete(
        `请对比分析商品 ${product.name} (¥${product.price}) 在以下平台的价格差异, 给出购买建议 (1-2 句话, 不超过 100 字):\n${items.map((i) => `- ${i.platform}: ¥${i.price} 评分 ${i.rating.toFixed(1)}`).join('\n')}\n最低价: ${cheapest.platform} ¥${cheapest.price}, 最高价: ${mostExpensive.platform} ¥${mostExpensive.price}`,
        '你是 Versa 购物助手, 客观分析价格, 提醒用户注意假货风险, 中文回答'
      )
      setAnalysis(result)
    } catch (e: any) {
      toast(e?.message || '分析失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold flex items-center gap-1.5">
          <TrendingDown className="w-5 h-5 text-emerald-500" />
          全网比价
        </h3>
        <span className="text-xs text-ink-500">省 ¥{saving} = {(saving / mostExpensive.price * 100).toFixed(0)}%</span>
      </div>

      <div className="space-y-1.5">
        {sorted.map((i, idx) => {
          const isCheapest = idx === 0
          const platform = PLATFORMS.find((p) => p.name === i.platform)!
          const diff = i.price - cheapest.price
          return (
            <motion.div
              key={i.platform}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                'flex items-center gap-2 p-2.5 rounded-xl border-2 transition cursor-pointer',
                selectedPlatform === i.platform ? 'border-nova-500 bg-nova-50 dark:bg-nova-900/20' : 'border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/40'
              )}
              onClick={() => setSelectedPlatform(i.platform)}
            >
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white text-[10px] font-bold bg-gradient-to-br', platform.color)}>
                {i.platform}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm">¥{formatCurrency(i.price)}</p>
                  {isCheapest && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-bold">最低</span>
                  )}
                  {i.platform === 'Versa' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-nova-500 text-white font-bold">本站</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-ink-500 mt-0.5">
                  <span className="flex items-center gap-0.5">
                    <Star className="w-2.5 h-2.5 text-amber-500 fill-current" />
                    {i.rating.toFixed(1)}
                  </span>
                  <span>{i.reviewCount.toLocaleString()} 评价</span>
                  {diff > 0 && <span className="text-rose-500">+¥{diff}</span>}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-3 border border-emerald-200/40">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-semibold">AI 智能分析</span>
        </div>
        {!analysis ? (
          <button
            onClick={analyze}
            disabled={loading}
            className="w-full h-8 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-1"
          >
            {loading ? (
              <><Loader2 className="w-3 h-3 animate-spin" />分析中…</>
            ) : (
              <><Sparkles className="w-3 h-3" />让 AI 告诉我哪个最划算</>
            )}
          </button>
        ) : (
          <div className="text-xs text-ink-700 dark:text-ink-300 leading-relaxed">{analysis}</div>
        )}
      </div>
    </div>
  )
}
