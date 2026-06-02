import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock, Sparkles, Tag, ShoppingBag, Zap, Gift, ChevronRight, Heart, Share2 } from 'lucide-react'
import { products } from '../data/products'
import { formatCurrency, cn } from '../lib/utils'

export const CAMPAIGNS = [
  {
    id: '618',
    title: '618 年中狂欢',
    subtitle: 'Versa 全场满减 · 限时秒杀 · 整点红包雨',
    gradient: 'from-rose-500 via-pink-500 to-fuchsia-500',
    badge: '618',
    endsAt: Date.now() + 3 * 24 * 3600_000,
    rules: [
      { type: '满减', label: '满 300 减 30', desc: '可叠加优惠券' },
      { type: '满减', label: '满 600 减 80', desc: '可叠加优惠券' },
      { type: '满减', label: '满 1000 减 150', desc: '可叠加优惠券' },
      { type: '赠品', label: '满 500 赠定制帆布袋', desc: '数量有限' },
    ],
    productIds: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'],
  },
  {
    id: 'fresh',
    title: '春日新鲜生活节',
    subtitle: '露营 · 野餐 · 居家 — 用 30 件好物开启春天',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    badge: 'SPRING',
    endsAt: Date.now() + 7 * 24 * 3600_000,
    rules: [
      { type: '折扣', label: '露营专区 8 折', desc: '帐篷/睡袋/炊具' },
      { type: '折扣', label: '家居专区满 2 件 9 折', desc: '可叠加' },
      { type: '优惠券', label: '满 200 立减 50', desc: '限新人' },
    ],
    productIds: ['p5', 'p6', 'p7', 'p8', 'p9', 'p10'],
  },
  {
    id: 'tech',
    title: '黑科技数码周',
    subtitle: '手机 · 耳机 · 智能家居 — 全网最低',
    gradient: 'from-blue-500 via-indigo-500 to-violet-500',
    badge: 'TECH',
    endsAt: Date.now() + 5 * 24 * 3600_000,
    rules: [
      { type: '直降', label: '旗舰手机最高直降 1000', desc: '官方补贴' },
      { type: '直降', label: 'TWS 耳机低至 199', desc: '限时抢' },
      { type: '满减', label: '数码配件满 99 减 10', desc: '全场可用' },
    ],
    productIds: ['p1', 'p2', 'p3', 'p4', 'p11', 'p12'],
  },
]

export function CampaignPage() {
  const { id } = useParams<{ id: string }>()
  const campaign = CAMPAIGNS.find((c) => c.id === id) || CAMPAIGNS[0]
  const list = products.filter((p) => campaign.productIds.includes(p.id))
  const [saved, setSaved] = useState(false)

  return (
    <div className="min-h-screen pb-12">
      {/* Hero */}
      <div className={cn('relative overflow-hidden bg-gradient-to-br', campaign.gradient, 'text-white')}>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 right-10 w-72 h-72 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute -bottom-10 left-20 w-72 h-72 rounded-full bg-yellow-300/30 blur-3xl" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 pt-4 pb-12">
          <div className="flex items-center gap-2 mb-6">
            <Link to="/shop" className="p-2 rounded-full bg-white/20 backdrop-blur">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 backdrop-blur border border-white/30 font-bold">{campaign.badge}</span>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300" />
              <h1 className="text-3xl sm:text-5xl font-bold">{campaign.title}</h1>
            </div>
            <p className="text-base sm:text-lg opacity-90 mt-2">{campaign.subtitle}</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-sm">
              <Clock className="w-4 h-4" />
              <Countdown to={campaign.endsAt} />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button onClick={() => setSaved((v) => !v)} className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-xs font-medium flex items-center gap-1.5 border border-white/30">
                <Heart className={cn('w-3.5 h-3.5', saved && 'fill-rose-500 text-rose-500')} />{saved ? '已收藏' : '收藏活动'}
              </button>
              <button className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-xs font-medium flex items-center gap-1.5 border border-white/30">
                <Share2 className="w-3.5 h-3.5" />分享
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 玩法规则 */}
      <section className="max-w-5xl mx-auto px-4 -mt-6 relative z-10">
        <div className="rounded-3xl bg-white/95 dark:bg-ink-900/95 backdrop-blur p-5 border border-white/20 shadow-xl">
          <h2 className="text-sm font-bold mb-3 flex items-center gap-1.5"><Tag className="w-4 h-4 text-rose-500" />玩法规则</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {campaign.rules.map((r, i) => (
              <div key={i} className="flex items-start gap-2 p-3 rounded-xl bg-gradient-to-r from-rose-500/5 to-pink-500/5 border border-rose-200/40 dark:border-rose-700/40">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-medium shrink-0 mt-0.5">{r.type}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 商品网格 */}
      <section className="max-w-5xl mx-auto px-4 mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold flex items-center gap-1.5"><ShoppingBag className="w-4 h-4 text-violet-500" />活动商品 <span className="text-xs text-ink-500">({list.length})</span></h2>
          <Link to="/shop" className="text-xs text-ink-500 hover:text-ink-900 dark:hover:text-white flex items-center gap-0.5">查看更多<ChevronRight className="w-3 h-3" /></Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {list.map((p) => (
            <Link key={p.id} to={`/shop/${p.id}`} className="group">
              <div className="aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-ink-100 to-ink-200 dark:from-ink-800 dark:to-ink-900 relative">
                {p.images?.[0] && <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-105 transition" />}
                <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-medium">618 直降</span>
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium line-clamp-2 h-10 group-hover:text-violet-600 transition">{p.name}</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-lg font-bold text-rose-500">¥{formatCurrency(Math.round(p.price * 0.7))}</span>
                  <span className="text-[11px] text-ink-400 line-through">¥{formatCurrency(p.price)}</span>
                </div>
                <div className="text-[10px] text-emerald-500 mt-0.5">7 折 · 立省 ¥{formatCurrency(p.price - Math.round(p.price * 0.7))}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 活动列表 (其他) */}
      <section className="max-w-5xl mx-auto px-4 mt-10">
        <h2 className="text-base font-bold mb-3 flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-500" />其他活动</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {CAMPAIGNS.filter((c) => c.id !== campaign.id).map((c) => (
            <Link key={c.id} to={`/campaign/${c.id}`} className={cn('group relative p-4 rounded-2xl overflow-hidden text-white bg-gradient-to-br', c.gradient)}>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 backdrop-blur border border-white/30 font-bold">{c.badge}</span>
              <h3 className="text-lg font-bold mt-2">{c.title}</h3>
              <p className="text-xs opacity-90 mt-0.5 line-clamp-1">{c.subtitle}</p>
              <div className="mt-2 flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3" />
                <Countdown to={c.endsAt} compact />
              </div>
              <ChevronRight className="absolute top-1/2 right-3 -translate-y-1/2 w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function Countdown({ to, compact }: { to: number; compact?: boolean }) {
  const [now, setNow] = useState(Date.now())
  if (typeof window !== 'undefined') {
    setTimeout(() => setNow(Date.now()), 1000)
  }
  const diff = Math.max(0, to - now)
  const d = Math.floor(diff / (24 * 3600_000))
  const h = Math.floor((diff % (24 * 3600_000)) / 3600_000)
  const m = Math.floor((diff % 3600_000) / 60_000)
  const s = Math.floor((diff % 60_000) / 1000)
  if (compact) {
    return <span>{d > 0 ? `${d}天` : ''} {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>
  }
  return (
    <span className="font-mono">
      {d > 0 && <span>{d} 天 </span>}
      <span className="font-bold">{String(h).padStart(2, '0')}</span>:
      <span className="font-bold">{String(m).padStart(2, '0')}</span>:
      <span className="font-bold">{String(s).padStart(2, '0')}</span>
    </span>
  )
}

export default CampaignPage
