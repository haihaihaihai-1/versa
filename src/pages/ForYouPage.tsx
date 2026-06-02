import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, TrendingUp, Heart, Star, Zap, ShoppingBag, Scale, Newspaper, ChevronRight, RefreshCw, Wand2, Loader2, X } from 'lucide-react'
import { products } from '../data/products'
import { debates } from '../data/debates'
import { news } from '../data/news'
import { useVersa } from '../store/versa'
import { useAuth } from '../api/AuthContext'
import { formatCurrency } from '../lib/utils'
import { cn } from '../lib/utils'
import { useAI } from '../hooks/useAI'
import { PROMPTS } from '../data/prompts'
import { AIBadge, AIErrorBanner, AIIndicator } from '../components/ai/AIIndicator'

interface AIRecommendation {
  reasoning: string
  items: { title: string; type: string; score: number; reason: string }[]
}

const REASONS = [
  { type: 'history', label: '基于你的浏览', icon: TrendingUp, color: 'text-rose-500' },
  { type: 'favorite', label: '因为你收藏过', icon: Heart, color: 'text-pink-500' },
  { type: 'similar', label: '相似用户也在看', icon: Sparkles, color: 'text-violet-500' },
  { type: 'hot', label: '当下热门', icon: Zap, color: 'text-amber-500' },
  { type: 'rating', label: '高评分推荐', icon: Star, color: 'text-yellow-500' },
] as const

type Item = {
  id: string
  kind: 'product' | 'debate' | 'news'
  title: string
  image?: string
  price?: number
  reason: typeof REASONS[number]['type']
  meta: string
}

export function ForYouPage() {
  const { user: me } = useAuth()
  const { cart, wishlist, votedDebates } = useVersa()
  const [seed, setSeed] = useState(0)
  const ai = useAI()
  const [aiRec, setAiRec] = useState<AIRecommendation | null>(null)
  const [showAIRec, setShowAIRec] = useState(false)

  const recommendations = useMemo(() => {
    const arr: Item[] = []
    const cartCats = new Set<string>()
    const wishCats = new Set<string>()
    products.forEach((p) => {
      if (cart.find((c) => c.productId === p.id)) p.tags?.forEach((t) => cartCats.add(t))
      if (wishlist.includes(p.id)) p.tags?.forEach((t) => wishCats.add(t))
    })

    products.forEach((p) => {
      let reason: typeof REASONS[number]['type'] = 'hot'
      const overlap = p.tags?.filter((t) => cartCats.has(t) || wishCats.has(t)).length || 0
      if (wishCats.size > 0 && p.tags?.some((t) => wishCats.has(t))) reason = 'favorite'
      else if (cartCats.size > 0 && overlap > 0) reason = 'history'
      else if ((p.rating || 0) >= 4.5) reason = 'rating'
      else if (Math.random() > 0.5) reason = 'similar'
      arr.push({
        id: p.id,
        kind: 'product',
        title: p.name,
        image: p.images?.[0],
        price: p.price,
        reason,
        meta: `${p.brand} · ${(p.rating || 4.5).toFixed(1)} 分`,
      })
    })

    debates.forEach((d) => {
      let reason: typeof REASONS[number]['type'] = 'hot'
      if (votedDebates[d.id]) reason = 'history'
      else if (d.hot > 500) reason = 'hot'
      arr.push({
        id: d.id,
        kind: 'debate',
        title: d.title,
        reason,
        meta: `${d.pros} 支持 · ${d.cons} 反对`,
      })
    })

    news.slice(0, 4).forEach((n) => {
      arr.push({
        id: n.id,
        kind: 'news',
        title: n.title,
        reason: 'hot',
        meta: n.category || '资讯',
      })
    })

    return arr.slice(0, 18)
  }, [cart, wishlist, votedDebates, seed])

  const grouped = useMemo(() => {
    const map: Record<string, Item[]> = {}
    recommendations.forEach((r) => {
      if (!map[r.reason]) map[r.reason] = []
      map[r.reason].push(r)
    })
    return map
  }, [recommendations])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 p-6 mb-6 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/30 blur-3xl animate-pulse" />
        </div>
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300" />
              <h1 className="text-2xl font-bold">为你推荐</h1>
            </div>
            <p className="text-sm opacity-90">
              {me ? `基于你的兴趣，${recommendations.length} 个精心挑选` : '登录后获得个性化推荐'}
            </p>
          </div>
          <button onClick={() => setSeed((s) => s + 1)} className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-sm font-medium flex items-center gap-1.5 border border-white/30 hover:bg-white/30">
            <RefreshCw className="w-3.5 h-3.5" />换一批
          </button>
        </div>
        <div className="relative mt-3 flex items-center gap-2">
          <button
            onClick={async () => {
              setShowAIRec(!showAIRec)
              if (!aiRec && !ai.loading) {
                const wishNames = products.filter(p => wishlist.includes(p.id)).slice(0, 5).map(p => p.name)
                const cartNames = products.filter(p => cart.find(c => c.productId === p.id)).slice(0, 5).map(p => p.name)
                const r = await ai.run(
                  `用户兴趣标签：${wishNames.join('、') || '暂无'}\n浏览/加购：${cartNames.join('、') || '暂无'}\n\n请基于这些数据推荐 5 个商品/帖子/辩论主题，输出 JSON。`,
                  PROMPTS.recommendation,
                  { temperature: 0.6, maxTokens: 700 }
                )
                if (r) {
                  try {
                    const cleaned = r.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
                    setAiRec(JSON.parse(cleaned))
                  } catch {
                    // ignore
                  }
                }
              }
            }}
            disabled={ai.loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/20 hover:bg-white/30 text-white backdrop-blur border border-white/30 transition"
          >
            {ai.loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            AI 智能推荐
            <AIBadge className="ml-0.5" />
          </button>
        </div>
      </div>

      {/* AI Rec Card */}
      <AnimatePresence>
        {showAIRec && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 rounded-2xl bg-gradient-to-br from-nova-50 via-purple-50 to-pink-50 dark:from-nova-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border border-nova-200/50 dark:border-nova-800/50 p-5 relative overflow-hidden"
          >
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-nova-500/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AIBadge />
                  <h3 className="font-bold text-sm">AI 个性化推荐</h3>
                </div>
                <button onClick={() => setShowAIRec(false)} className="p-1 rounded-full hover:bg-white/40">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {ai.error && <AIErrorBanner message={ai.error} />}
              {ai.loading && !aiRec && <AIIndicator loading text="AI 正在分析你的喜好…" />}
              {aiRec && (
                <div className="space-y-3">
                  {aiRec.reasoning && (
                    <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 text-xs text-ink-600 dark:text-ink-300">
                      💡 {aiRec.reasoning}
                    </div>
                  )}
                  <div className="space-y-2">
                    {aiRec.items?.map((it, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/60 dark:bg-ink-900/40 hover:bg-white dark:hover:bg-ink-800 transition">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-nova-500 to-pink-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{it.title}</p>
                          <p className="text-[10px] text-ink-500 mt-0.5">{it.reason}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-nova-500">{(it.score * 100).toFixed(0)}</div>
                          <div className="text-[9px] text-ink-400">匹配度</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 个性化标签 (mock 兴趣) */}
      <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <span className="text-xs text-ink-500 whitespace-nowrap">你的兴趣:</span>
        {['科技', '家居', '美食', '时尚', '财经', '可持续'].map((t) => (
          <span key={t} className="px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-200/40 dark:border-violet-700/40 text-xs font-medium whitespace-nowrap">
            {t}
          </span>
        ))}
      </div>

      {/* 分组推荐 */}
      {REASONS.map((r) => {
        const items = grouped[r.type]
        if (!items || items.length === 0) return null
        const Icon = r.icon
        return (
          <section key={r.type} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold flex items-center gap-1.5">
                <Icon className={cn('w-4 h-4', r.color)} />
                {r.label}
                <span className="text-xs text-ink-500">({items.length})</span>
              </h2>
              <Link to="/discover" className="text-xs text-ink-500 hover:text-ink-900 dark:hover:text-white flex items-center gap-0.5">
                查看更多<ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map((item) => <RecCard key={`${item.kind}-${item.id}`} item={item} />)}
            </div>
          </section>
        )
      })}

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-16 text-ink-500">
          <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有推荐内容，试试浏览或收藏一些商品</p>
        </div>
      )}
    </div>
  )
}

function RecCard({ item }: { item: Item }) {
  const reason = REASONS.find((r) => r.type === item.reason)!
  const Icon = reason.icon
  const linkTo = item.kind === 'product' ? `/shop/${item.id}` : item.kind === 'debate' ? `/debates/${item.id}` : `/news/${item.id}`

  return (
    <Link to={linkTo} className="group block">
      <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-ink-100 to-ink-200 dark:from-ink-800 dark:to-ink-900 relative">
        {item.image ? (
          <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition" alt={item.title} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {item.kind === 'debate' && <Scale className="w-10 h-10 text-violet-400" />}
            {item.kind === 'news' && <Newspaper className="w-10 h-10 text-amber-400" />}
            {item.kind === 'product' && <ShoppingBag className="w-10 h-10 text-ink-400" />}
          </div>
        )}
        <span className={cn('absolute top-2 left-2 px-1.5 py-0.5 rounded-full bg-white/90 dark:bg-ink-900/90 backdrop-blur text-[10px] font-medium flex items-center gap-0.5 shadow-sm')}>
          <Icon className={cn('w-2.5 h-2.5', reason.color)} />
          {reason.label}
        </span>
      </div>
      <div className="mt-2">
        <p className="text-sm font-medium line-clamp-2 h-10 group-hover:text-violet-600 transition">{item.title}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[11px] text-ink-500">{item.meta}</p>
          {item.kind === 'product' && item.price && (
            <p className="text-sm font-bold text-rose-500">¥{formatCurrency(item.price)}</p>
          )}
        </div>
      </div>
    </Link>
  )
}

export default ForYouPage
