import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Tent, Home as HomeIcon, Briefcase, Gift, GraduationCap, Dumbbell, Sparkles, TrendingDown,
  ArrowLeft, ChevronRight, Lightbulb, Crown, ArrowUpRight, ShoppingBag, Eye
} from 'lucide-react'
import { useVersa } from '../store/versa'
import { products } from '../data/products'
import { seedScenarios, seedPriceHistory, TOP_PICKS } from '../data/scenarios'
import { formatCurrency, formatNumber } from '../lib/utils'

const ICONS: Record<string, any> = {
  Tent, Home: HomeIcon, Briefcase, Gift, GraduationCap, Dumbbell,
}

type Tab = 'scenario' | 'top' | 'price'

export default function CuratorPage() {
  const navigate = useNavigate()
  const { wishlist } = useVersa()
  const [tab, setTab] = useState<Tab>('scenario')
  const [activeScenario, setActiveScenario] = useState<string>('outdoor')
  const [activeProduct, setActiveProduct] = useState<string>('p1')

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/40 via-white to-fuchsia-50/30 pb-20">
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white border border-ink-200 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
              选品助手
            </h1>
            <p className="text-xs text-ink-500">场景化推荐 · 价格走势 · 必买清单</p>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-[10px] font-medium flex items-center gap-0.5">
            <Sparkles className="w-3 h-3" />AI
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { k: 'scenario', l: '场景推荐', g: 'from-violet-500 to-fuchsia-500' },
            { k: 'top', l: '必买清单', g: 'from-amber-500 to-orange-500' },
            { k: 'price', l: '价格走势', g: 'from-emerald-500 to-teal-500' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as Tab)}
              className={`p-3 rounded-2xl border ${
                tab === t.k
                  ? `bg-gradient-to-br ${t.g} text-white border-transparent shadow-md`
                  : 'bg-white text-ink-700 border-ink-100'
              }`}
            >
              <p className="text-sm font-medium">{t.l}</p>
            </button>
          ))}
        </div>

        {tab === 'scenario' && (
          <ScenarioView active={activeScenario} setActive={setActiveScenario} />
        )}
        {tab === 'top' && <TopPicksView />}
        {tab === 'price' && (
          <PriceView active={activeProduct} setActive={setActiveProduct} />
        )}
      </div>
    </div>
  )
}

/* ==================== 场景推荐 ==================== */
function ScenarioView({ active, setActive }: { active: string; setActive: (k: string) => void }) {
  const scenario = seedScenarios.find((s) => s.key === active) || seedScenarios[0]
  const Icon = ICONS[scenario.icon] || Sparkles
  const items = scenario.productIds.map((id) => products.find((p) => p.id === id)).filter(Boolean) as typeof products
  const totalPrice = items.reduce((a, p) => a + p.price, 0)

  return (
    <div className="space-y-4">
      {/* 场景网格 */}
      <div className="grid grid-cols-3 gap-2">
        {seedScenarios.map((s) => {
          const I = ICONS[s.icon] || Sparkles
          const isActive = active === s.key
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={`p-3 rounded-2xl border transition ${
                isActive
                  ? `bg-gradient-to-br ${s.gradient} text-white border-transparent shadow-md`
                  : 'bg-white text-ink-700 border-ink-100'
              }`}
            >
              <I className="w-5 h-5 mx-auto mb-1" />
              <p className="text-xs font-medium">{s.name}</p>
            </button>
          )
        })}
      </div>

      {/* 场景详情 */}
      <div className="rounded-2xl overflow-hidden border border-ink-100">
        <div className={`p-5 bg-gradient-to-br ${scenario.gradient} text-white`}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{scenario.name}</h2>
              <p className="text-xs opacity-80">{scenario.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur">推荐 {items.length} 件</span>
            <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur">套装 ¥{formatCurrency(totalPrice)}</span>
          </div>
        </div>

        <div className="p-4">
          {/* 提示 */}
          <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">{scenario.tip}</p>
          </div>

          {/* 商品 */}
          <div className="space-y-2">
            {items.map((p) => (
              <div
                key={p.id}
                onClick={() => window.history.pushState({}, '', `/shop/${p.id}`)}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-ink-100 hover:border-violet-300 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-ink-100 to-ink-200 flex items-center justify-center text-xs text-ink-500 flex-shrink-0">
                  {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover rounded-lg" /> : p.name.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800 truncate">{p.name}</p>
                  <p className="text-[11px] text-ink-500 mt-0.5">{p.brand} · ⭐ {p.rating}</p>
                  <p className="text-sm font-bold text-rose-500 mt-0.5">¥{formatCurrency(p.price)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==================== 必买清单 ==================== */
function TopPicksView() {
  return (
    <div className="bg-white rounded-2xl border border-ink-100 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-amber-800">本月 Top 10 必买清单</h2>
        </div>
        <p className="text-[11px] text-amber-700 mt-1">基于销量、评价、编辑推荐综合排序</p>
      </div>
      <div>
        {TOP_PICKS.map((pick) => {
          const product = products.find((p) => p.id === pick.productId)
          if (!product) return null
          const rankColor = pick.rank === 1 ? 'from-amber-400 to-yellow-500' :
                            pick.rank === 2 ? 'from-gray-300 to-slate-400' :
                            pick.rank === 3 ? 'from-orange-400 to-amber-600' :
                            'from-ink-200 to-ink-300'
          return (
            <div
              key={pick.productId}
              className="flex items-center gap-3 p-3 border-b border-ink-100 last:border-0 hover:bg-amber-50/30 cursor-pointer"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${rankColor} text-white font-bold flex items-center justify-center text-sm flex-shrink-0`}>
                {pick.rank}
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-ink-100 to-ink-200 flex items-center justify-center text-xs text-ink-500 flex-shrink-0">
                {product.images?.[0] ? <img src={product.images[0]} className="w-full h-full object-cover rounded-lg" /> : product.name.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-800 truncate">{product.name}</p>
                <p className="text-[11px] text-ink-500 mt-0.5 line-clamp-1">{pick.reason}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm font-bold text-rose-500">¥{formatCurrency(product.price)}</span>
                  <span className="text-[10px] text-ink-400">⭐ {product.rating} · 销量 {formatNumber(product.sales || 0)}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-400 flex-shrink-0" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ==================== 价格走势 ==================== */
function PriceView({ active, setActive }: { active: string; setActive: (id: string) => void }) {
  const product = products.find((p) => p.id === active)
  const history = seedPriceHistory[active] || []
  if (!product || history.length === 0) {
    return <div className="text-center py-20 text-ink-400 text-sm">暂无价格数据</div>
  }
  const current = history[history.length - 1].price
  const high = Math.max(...history.map((h) => h.price))
  const low = Math.min(...history.map((h) => h.price))
  const avg = Math.round(history.reduce((a, h) => a + h.price, 0) / history.length)
  const isLowest = current === low
  const diff = high - current
  const diffPercent = ((diff / high) * 100).toFixed(0)

  // 简单的 SVG 折线图
  const W = 600, H = 200, P = 24
  const max = high, min = low
  const range = max - min || 1
  const points = history.map((h, i) => {
    const x = P + (i * (W - 2 * P)) / (history.length - 1)
    const y = H - P - ((h.price - min) / range) * (H - 2 * P)
    return { x, y, p: h.price, d: h.date }
  })
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${path} L${points[points.length - 1].x},${H - P} L${points[0].x},${H - P} Z`

  return (
    <div className="space-y-4">
      {/* 商品切换 */}
      <div className="grid grid-cols-4 gap-2">
        {Object.keys(seedPriceHistory).slice(0, 8).map((id) => {
          const p = products.find((x) => x.id === id)
          if (!p) return null
          return (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`p-2 rounded-xl border text-xs ${
                active === id
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-transparent'
                  : 'bg-white text-ink-700 border-ink-100'
              }`}
            >
              <p className="truncate font-medium">{p.name.slice(0, 6)}</p>
            </button>
          )
        })}
      </div>

      {/* 当前价 + 状态 */}
      <div className="bg-white rounded-2xl p-4 border border-ink-100">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-ink-100 to-ink-200 flex items-center justify-center text-xs text-ink-500">
              {product.images?.[0] ? <img src={product.images[0]} className="w-full h-full object-cover rounded-lg" /> : product.name.slice(0, 2)}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-800">{product.name}</p>
              <p className="text-[11px] text-ink-500 mt-0.5">{product.brand}</p>
            </div>
          </div>
          {isLowest && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 font-medium">⚡ 最低价</span>
          )}
        </div>

        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-bold text-rose-500">¥{formatCurrency(current)}</span>
          {diff > 0 && (
            <span className="text-xs text-emerald-600 font-medium">低于 7 天最高 ¥{diff} ({diffPercent}%)</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Stat label="7 天最高" value={`¥${high}`} color="text-rose-500" />
          <Stat label="7 天最低" value={`¥${low}`} color="text-emerald-500" />
          <Stat label="7 天均价" value={`¥${avg}`} color="text-ink-700" />
        </div>

        {/* SVG 折线图 */}
        <div className="rounded-xl bg-gradient-to-b from-emerald-50/30 to-white p-2">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44">
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* 网格 */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <line key={t} x1={P} y1={P + t * (H - 2 * P)} x2={W - P} y2={P + t * (H - 2 * P)} stroke="#e5e7eb" strokeDasharray="2 2" />
            ))}
            <path d={areaPath} fill="url(#g1)" />
            <path d={path} stroke="#10b981" strokeWidth="2.5" fill="none" />
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="#10b981" strokeWidth="2" />
                <text x={p.x} y={H - 4} fontSize="10" textAnchor="middle" fill="#6b7280">{p.d}</text>
              </g>
            ))}
          </svg>
        </div>

        {isLowest ? (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2">
            <TrendingDown className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
            <p className="text-xs text-rose-700">当前价格 <strong>7 天最低</strong>，建议入手</p>
          </div>
        ) : (
          <div className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-700">建议加入心愿单，降价时通知</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-2 rounded-lg bg-ink-50">
      <p className="text-[10px] text-ink-500">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  )
}
