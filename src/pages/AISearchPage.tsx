import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { useAI } from '../hooks/useAI'
import { PROMPTS } from '../data/prompts'
import { products } from '../data'
import { AIBadge, AIIndicator, AIErrorBanner, AIThinkingDots } from '../components/ai/AIIndicator'
import { VoiceInputButton } from '../components/VoiceInputButton'
import { formatCurrency } from '../lib/utils'
import { toast } from '../components/ui/Toaster'
import {
  Search, Sparkles, Loader2, Wand2, ChevronDown,
  ArrowRight, Lightbulb, Tag, DollarSign
} from 'lucide-react'

const EXAMPLES = [
  '送女朋友的生日礼物，预算 500 以内，要小众有设计感',
  '适合小户型的北欧风收纳神器',
  '程序员每天用的机械键盘，红轴',
  '夏天穿的亚麻衬衫，要宽松版型',
]

interface ParsedIntent {
  intent: string
  keywords: string[]
  category: string
  priceRange: { min: number; max: number }
  tags: string[]
  refinedQuery: string
}

const CATEGORY_NAMES: Record<string, string> = {
  tech: '数码', fashion: '穿搭', home: '家居', beauty: '美妆',
  food: '美食', sports: '运动', books: '图书',
}

export function AISearchPage() {
  const navigate = useNavigate()
  const ai = useAI()
  const [query, setQuery] = useState('')
  const [parsed, setParsed] = useState<ParsedIntent | null>(null)
  const [results, setResults] = useState<typeof products>([])

  const runSearch = async (text: string) => {
    if (!text.trim()) return
    setQuery(text)
    setParsed(null)
    setResults([])

    const prompt = `用户搜索：「${text}」\n\n请解析意图并返回 JSON。`
    const result = await ai.run(prompt, PROMPTS.productSearch, { temperature: 0.3 })

    if (result) {
      try {
        const cleaned = result
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/```\s*$/i, '')
          .trim()
        const p = JSON.parse(cleaned) as ParsedIntent
        setParsed(p)

        // Filter products
        const matched = products
          .filter((prod) => {
            // Category match
            if (p.category && prod.category === p.category) return true
            // Keyword match
            if (p.keywords?.some((k) =>
              prod.name.toLowerCase().includes(k.toLowerCase()) ||
              (prod.description || '').toLowerCase().includes(k.toLowerCase()) ||
              (prod.tags || []).some((t) => t.toLowerCase().includes(k.toLowerCase()))
            )) return true
            return false
          })
          .filter((prod) => {
            if (p.priceRange?.min && prod.price < p.priceRange.min) return false
            if (p.priceRange?.max && prod.price > p.priceRange.max) return false
            return true
          })
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 12)
        setResults(matched)
      } catch (e) {
        toast('AI 返回格式有误，请重试', 'error')
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white"
      >
        ← 返回
      </button>

      {/* Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-nova-500 via-purple-500 to-pink-500 p-8 md:p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-yellow-300 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs mb-4">
            <AIBadge />
            <span>智能语义搜索 · 由 MiMo v2.5 驱动</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 tracking-tight">用自然语言找到心仪好物</h1>
          <p className="text-white/90 max-w-xl mb-6">
            不用纠结关键词。告诉 AI 你想要什么场景、什么风格、什么预算，它帮你精准推荐。
          </p>

          <div className="flex gap-2 max-w-2xl">
            <div className="flex-1 relative">
              <Wand2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch(query)}
                placeholder="例如：送女朋友的生日礼物，预算 500 以内，要小众有设计感"
                className="w-full pl-10 pr-12 h-12 rounded-full bg-white text-ink-900 text-sm outline-none focus:ring-4 ring-white/30"
                disabled={ai.loading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <VoiceInputButton onResult={(t) => setQuery((p) => (p ? p + ' ' + t : t))} size="md" />
              </div>
            </div>
            <Button
              onClick={() => runSearch(query)}
              disabled={!query.trim() || ai.loading}
              size="lg"
              className="bg-white text-nova-600 hover:bg-white/90 rounded-full px-6"
            >
              {ai.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              搜索
            </Button>
          </div>

          {/* Examples */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-[10px] text-white/60">试试：</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => runSearch(ex)}
                className="px-2.5 py-1 rounded-full text-[11px] bg-white/15 hover:bg-white/25 backdrop-blur transition"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* AI Status */}
      <AnimatePresence>
        {(ai.loading || ai.error) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-2"
          >
            {ai.loading && <AIIndicator loading={ai.loading} text="AI 正在解析你的需求…" />}
            {ai.error && <AIErrorBanner message={ai.error} />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Parsed Intent Card */}
      <AnimatePresence>
        {parsed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="rounded-2xl bg-gradient-to-br from-white to-nova-50/40 dark:from-ink-900 dark:to-nova-950/30 border border-nova-200/40 dark:border-nova-800/40 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <AIBadge />
              <h3 className="font-semibold text-sm">AI 理解</h3>
            </div>
            <p className="text-lg font-medium mb-3">{parsed.intent}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {parsed.category && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-ink-800 border border-ink-200/40">
                  <Tag className="w-3.5 h-3.5 text-nova-500" />
                  <span className="text-ink-500">类目：</span>
                  <span className="font-semibold">{CATEGORY_NAMES[parsed.category] || parsed.category}</span>
                </div>
              )}
              {(parsed.priceRange?.min || parsed.priceRange?.max) && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-ink-800 border border-ink-200/40">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-ink-500">预算：</span>
                  <span className="font-semibold">
                    {parsed.priceRange?.min ? formatCurrency(parsed.priceRange.min) : '不限'} ~ {parsed.priceRange?.max ? formatCurrency(parsed.priceRange.max) : '不限'}
                  </span>
                </div>
              )}
              {parsed.tags?.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-ink-800 border border-ink-200/40 flex-wrap">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  {parsed.tags.slice(0, 3).map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-nova-100 dark:bg-nova-900/40 text-nova-700 dark:text-nova-300">{t}</span>
                  ))}
                </div>
              )}
            </div>
            {parsed.keywords?.length > 0 && (
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-ink-500">关键词：</span>
                {parsed.keywords.map((k) => (
                  <span key={k} className="px-2 py-0.5 rounded-full text-[10px] bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-300">
                    #{k}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {parsed && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-nova-500" />
              为你推荐 {results.length} 件
            </h3>
            <Link
              to={`/shop?refined=${encodeURIComponent(parsed.refinedQuery || query)}`}
              className="text-sm text-nova-500 hover:underline flex items-center gap-1"
            >
              在商城查看全部 <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {results.length === 0 ? (
            <div className="py-16 text-center text-ink-500">
              <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>没找到完全匹配的，试试换个描述？</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {results.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ y: -2 }}
                >
                  <Link
                    to={`/shop/${p.id}`}
                    className="block rounded-2xl bg-white dark:bg-ink-900 border border-ink-200/40 dark:border-ink-800/40 overflow-hidden hover:shadow-xl transition"
                  >
                    <div className="aspect-square bg-ink-100 overflow-hidden">
                      {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="p-3">
                      <h4 className="text-sm font-semibold line-clamp-1">{p.name}</h4>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-shop-600 font-bold">{formatCurrency(p.price)}</span>
                      </div>
                      {p.rating && (
                        <p className="text-[10px] text-ink-500 mt-0.5">
                          <span className="text-amber-500">★</span> {p.rating} · {p.reviewCount} 评价
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!parsed && !ai.loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: '🛍️', title: '场景化推荐', desc: '描述场景，AI 帮你匹配最合适的商品' },
            { icon: '🎯', title: '精确筛选', desc: '自动识别价格区间、风格偏好、品类' },
            { icon: '💡', title: '智能补全', desc: 'AI 提取关键词，找到你没想到的好物' },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-white/80 dark:bg-ink-900/60 border border-ink-200/40 p-5">
              <div className="text-3xl mb-2">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-xs text-ink-500">{f.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
