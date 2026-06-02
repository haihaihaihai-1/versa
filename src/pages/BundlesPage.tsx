import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, Plus, Gift, Zap, ArrowLeft, ChevronRight, Sparkles, Check, X,
  Tag, ShoppingCart, ChevronDown
} from 'lucide-react'
import { useVersa, versa } from '../store/versa'
import { products } from '../data/products'
import { formatCurrency, formatNumber } from '../lib/utils'

type Tab = 'all' | 'bundle' | 'addon' | 'gift'

export default function BundlesPage() {
  const { bundles, cart } = useVersa()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('all')
  const [detail, setDetail] = useState<string | null>(null)

  const cartTotal = cart.reduce((a, c) => {
    const p = products.find((p) => p.id === c.productId)
    return a + (p ? p.price * c.quantity : 0)
  }, 0)

  const filtered = useMemo(() => {
    let list = tab === 'all' ? bundles : bundles.filter((b) => b.type === tab)
    return list.sort((a, b) => {
      const ad = a.endsAt ? +new Date(a.endsAt) - Date.now() : Infinity
      const bd = b.endsAt ? +new Date(b.endsAt) - Date.now() : Infinity
      return ad - bd
    })
  }, [bundles, tab])

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/40 via-white to-pink-50/30 pb-20">
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white border border-ink-200 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">
              凑单包 & 套餐
            </h1>
            <p className="text-xs text-ink-500">组合更优惠 · 凑单更划算</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { k: 'all', l: '全部', icon: Package, g: 'from-slate-500 to-zinc-600' },
            { k: 'bundle', l: '套餐', icon: Tag, g: 'from-rose-500 to-pink-500' },
            { k: 'addon', l: '加价购', icon: Plus, g: 'from-amber-500 to-orange-500' },
            { k: 'gift', l: '礼包', icon: Gift, g: 'from-violet-500 to-fuchsia-500' },
          ].map((t) => {
            const Icon = t.icon
            const active = tab === t.k
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k as Tab)}
                className={`p-3 rounded-2xl border ${
                  active
                    ? `bg-gradient-to-br ${t.g} text-white border-transparent shadow-md`
                    : 'bg-white text-ink-700 border-ink-100'
                }`}
              >
                <Icon className="w-4 h-4 mx-auto mb-1" />
                <p className="text-xs font-medium">{t.l}</p>
              </button>
            )
          })}
        </div>

        {/* 凑单提示 */}
        {cartTotal > 0 && (
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200">
            <p className="text-xs text-emerald-700">
              🛒 当前购物车 ¥{formatCurrency(cartTotal)} · 
              {cartTotal < 300 ? ' 还差 ¥' + (300 - cartTotal).toFixed(0) + ' 即可享受加价购' :
               cartTotal < 500 ? ' 还差 ¥' + (500 - cartTotal).toFixed(0) + ' 升级下个档位' :
               ' 已满足加价购条件'}
            </p>
          </div>
        )}

        {/* 列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((b) => (
            <BundleCard key={b.id} bundle={b} onDetail={() => setDetail(b.id)} />
          ))}
        </div>
      </div>

      {detail && <BundleDetail bundleId={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function BundleCard({ bundle, onDetail }: { bundle: any; onDetail: () => void }) {
  const savings = bundle.originalPrice - bundle.bundlePrice
  const endsIn = bundle.endsAt ? Math.max(0, Math.floor((+new Date(bundle.endsAt) - Date.now()) / 86400000)) : null
  return (
    <div
      className="rounded-2xl overflow-hidden border border-ink-100 hover:shadow-xl transition relative"
      style={{ background: `linear-gradient(135deg, ${bundle.coverGradient.split(' ').join(', ')})` }}
    >
      <div className="bg-white/95 backdrop-blur m-0.5 rounded-[14px] p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-ink-900 truncate">{bundle.name}</h3>
            <p className="text-xs text-ink-500 mt-0.5 line-clamp-1">{bundle.desc}</p>
          </div>
          {bundle.badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 font-medium flex-shrink-0 ml-2">
              {bundle.badge}
            </span>
          )}
        </div>

        {/* 组合商品预览 */}
        <div className="flex -space-x-2 mb-3">
          {bundle.products.slice(0, 4).map((p: any, i: number) => {
            const product = products.find((x) => x.id === p.productId)
            return (
              <div
                key={i}
                className="w-10 h-10 rounded-lg bg-gradient-to-br from-ink-100 to-ink-200 border-2 border-white flex items-center justify-center text-[9px] text-ink-500 font-medium overflow-hidden"
              >
                {product ? product.name.slice(0, 2) : '?'}
              </div>
            )
          })}
          {bundle.products.length > 4 && (
            <div className="w-10 h-10 rounded-lg bg-ink-100 border-2 border-white flex items-center justify-center text-[10px] text-ink-500">
              +{bundle.products.length - 4}
            </div>
          )}
        </div>

        {/* 价格 + 操作 */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-rose-500">¥{formatCurrency(bundle.bundlePrice)}</span>
              <span className="text-xs text-ink-400 line-through">¥{formatCurrency(bundle.originalPrice)}</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-0.5">省 ¥{savings}</p>
            {endsIn !== null && endsIn <= 7 && (
              <p className="text-[10px] text-rose-500 mt-0.5">⏰ 还剩 {endsIn} 天</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={onDetail}
              className="px-3 py-1.5 text-xs rounded-full bg-ink-100 text-ink-700 hover:bg-ink-200"
            >
              查看详情
            </button>
            <button
              onClick={() => versa.addBundleToCart(bundle.id)}
              className="px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium flex items-center gap-1"
            >
              <ShoppingCart className="w-3 h-3" />一键加购
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BundleDetail({ bundleId, onClose }: { bundleId: string; onClose: () => void }) {
  const { bundles, cart } = useVersa()
  const navigate = useNavigate()
  const b = bundles.find((x) => x.id === bundleId)
  if (!b) return null
  const cartTotal = cart.reduce((a, c) => {
    const p = products.find((p) => p.id === c.productId)
    return a + (p ? p.price * c.quantity : 0)
  }, 0)
  const qualifies = b.type === 'addon' ? cartTotal >= (b.addonThreshold || 0) : true
  const missing = b.addonThreshold ? Math.max(0, b.addonThreshold - cartTotal) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[85vh] bg-white rounded-t-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4"
      >
        <div className="relative h-32 flex items-end p-4" style={{ background: b.coverGradient }}>
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur text-white flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
          <div className="text-white">
            <h2 className="text-xl font-bold">{b.name}</h2>
            <p className="text-xs opacity-80 mt-0.5">{b.desc}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* 加价购门槛提示 */}
          {b.type === 'addon' && (
            <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
              qualifies ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'
            }`}>
              {qualifies ? (
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
              )}
              <p className={`text-xs ${qualifies ? 'text-emerald-700' : 'text-amber-700'}`}>
                {qualifies
                  ? `✓ 您已满足 ¥${b.addonThreshold} 门槛，可加价换购`
                  : `再加 ¥${missing} 即可享受此加价购`}
              </p>
            </div>
          )}

          <h3 className="text-sm font-semibold text-ink-700 mb-2">套餐内商品</h3>
          <div className="space-y-2 mb-4">
            {b.products.map((p, i) => {
              const product = products.find((x) => x.id === p.productId)
              if (!product) return null
              return (
                <div
                  key={i}
                  onClick={() => { onClose(); navigate(`/shop/${product.id}`) }}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-ink-100 hover:border-rose-200 cursor-pointer"
                >
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-ink-100 to-ink-200 flex items-center justify-center text-xs text-ink-500">
                    {product.images?.[0] ? <img src={product.images[0]} className="w-full h-full object-cover rounded-lg" /> : product.name.slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">{product.name}</p>
                    <p className="text-[11px] text-ink-500 mt-0.5">{product.brand} · ×{p.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-500">¥{formatCurrency(product.price * p.quantity)}</p>
                    <ChevronRight className="w-3.5 h-3.5 text-ink-400 inline" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* 价格汇总 */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl p-4 border border-rose-100">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-ink-600">单买价</span>
              <span className="text-ink-500 line-through">¥{formatCurrency(b.originalPrice)}</span>
            </div>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-ink-600">套餐价</span>
              <span className="text-rose-500 font-bold text-lg">¥{formatCurrency(b.bundlePrice)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-rose-200">
              <span className="text-sm text-ink-700 font-medium">已省</span>
              <span className="text-base font-bold text-emerald-500">¥{formatCurrency(b.originalPrice - b.bundlePrice)}</span>
            </div>
          </div>

          {b.endsAt && (
            <p className="text-center text-xs text-ink-500 mt-3">⏰ 活动截止 {new Date(b.endsAt).toLocaleDateString('zh-CN')}</p>
          )}
        </div>

        <div className="p-3 border-t border-ink-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-ink-200 rounded-xl text-sm"
          >关闭</button>
          <button
            onClick={() => { versa.addBundleToCart(b.id); onClose() }}
            disabled={b.type === 'addon' && !qualifies}
            className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-1 ${
              b.type === 'addon' && !qualifies
                ? 'bg-ink-200 text-ink-400'
                : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />加入购物车
          </button>
        </div>
      </div>
    </div>
  )
}
