import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { products, brands } from '../data/products'
import { Button } from '../components/ui/Button'
import { Tabs } from '../components/ui/Tabs'
import { ProductCardV2 } from '../components/shop/ProductCardV2'
import { toast } from '../components/ui/Toaster'
import {
  Ticket, Sparkles, Crown, Gift, Clock, ChevronRight, ShoppingBag,
  CheckCircle2, AlertCircle, Zap, Star, ArrowRight, Percent, Flame
} from 'lucide-react'
import { cn, formatCurrency } from '../lib/utils'

interface UserCoupon {
  id: string
  amount: number
  threshold: number
  scope: 'all' | 'category' | 'brand'
  scopeLabel: string
  description: string
  expiresAt: string
  source: 'claim' | 'task' | 'signup' | 'activity'
  claimed: boolean
  used?: boolean
  usedAt?: string
}

// 持久化
const KEY = 'versa:coupons:v1'
function loadUserCoupons(): UserCoupon[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}
function saveUserCoupons(c: UserCoupon[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {}
}

// 静态可领券池（来自各品牌 + 平台 + 任务）
const COUPON_POOL: Omit<UserCoupon, 'claimed' | 'used' | 'usedAt'>[] = [
  // 平台券
  { id: 'p-200-30', amount: 30, threshold: 200, scope: 'all', scopeLabel: '全场通用', description: '满 200 立减 30，跨店可用', expiresAt: '2026-12-31', source: 'claim' },
  { id: 'p-100-20', amount: 20, threshold: 100, scope: 'all', scopeLabel: '全场通用', description: '满 100 立减 20', expiresAt: '2026-12-31', source: 'claim' },
  { id: 'p-5-0', amount: 5, threshold: 0, scope: 'all', scopeLabel: '无门槛', description: '无门槛 5 元，0 元下单也可用', expiresAt: '2026-12-31', source: 'signup' },
  { id: 'p-500-80', amount: 80, threshold: 500, scope: 'all', scopeLabel: '全场通用', description: '满 500 立减 80', expiresAt: '2026-12-31', source: 'claim' },
  { id: 'p-1000-200', amount: 200, threshold: 1000, scope: 'all', scopeLabel: '全场通用', description: '满 1000 立减 200，超大额专享', expiresAt: '2026-12-31', source: 'claim' },
  // 类目券
  { id: 'c-tech-50', amount: 50, threshold: 300, scope: 'category', scopeLabel: '数码专享', description: '数码类目满 300 立减 50', expiresAt: '2026-12-31', source: 'claim' },
  { id: 'c-fashion-30', amount: 30, threshold: 200, scope: 'category', scopeLabel: '服饰专享', description: '服饰类目满 200 立减 30', expiresAt: '2026-12-31', source: 'claim' },
  { id: 'c-beauty-100', amount: 100, threshold: 500, scope: 'category', scopeLabel: '美妆专享', description: '美妆类目满 500 立减 100', expiresAt: '2026-12-31', source: 'claim' },
  { id: 'c-home-50', amount: 50, threshold: 300, scope: 'category', scopeLabel: '家居专享', description: '家居类目满 300 立减 50', expiresAt: '2026-12-31', source: 'claim' },
  // 品牌券 - 从 brands 动态生成
  ...brands.slice(0, 8).flatMap((b) => [
    { id: `b-${b.id}-30`, amount: 30, threshold: 200, scope: 'brand' as const, scopeLabel: b.name, description: `${b.name} 满 200 立减 30`, expiresAt: '2026-12-31', source: 'claim' as const },
    { id: `b-${b.id}-100`, amount: 100, threshold: 500, scope: 'brand' as const, scopeLabel: b.name, description: `${b.name} 满 500 立减 100`, expiresAt: '2026-12-31', source: 'claim' as const },
  ]),
  // 任务券
  { id: 't-signin-10', amount: 10, threshold: 50, scope: 'all', scopeLabel: '签到奖励', description: '完成签到任务获得', expiresAt: '2027-01-15', source: 'task' },
  { id: 't-invite-50', amount: 50, threshold: 200, scope: 'all', scopeLabel: '邀请好友', description: '邀请 1 位好友注册得 50 元', expiresAt: '2027-01-15', source: 'task' },
  { id: 't-review-15', amount: 15, threshold: 0, scope: 'all', scopeLabel: '晒单奖励', description: '完成商品评价得 15 元券', expiresAt: '2027-01-15', source: 'task' },
]

const TABS = [
  { value: 'all', label: '全部' },
  { value: 'platform', label: '平台券' },
  { value: 'category', label: '类目券' },
  { value: 'brand', label: '品牌券' },
  { value: 'task', label: '任务券' },
]

export function CouponsPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>(loadUserCoupons)
  const [filter, setFilter] = useState<'all' | 'unused' | 'used' | 'expired'>('all')

  useEffect(() => { saveUserCoupons(userCoupons) }, [userCoupons])

  // 合并池子和已领
  const allCoupons = useMemo(() => {
    return COUPON_POOL.map((c) => {
      const user = userCoupons.find((u) => u.id === c.id)
      return { ...c, claimed: !!user, used: user?.used, usedAt: user?.usedAt }
    })
  }, [userCoupons])

  const filtered = useMemo(() => {
    let r = allCoupons
    if (tab === 'platform') r = r.filter((c) => c.scope === 'all')
    if (tab === 'category') r = r.filter((c) => c.scope === 'category')
    if (tab === 'brand') r = r.filter((c) => c.scope === 'brand')
    if (tab === 'task') r = r.filter((c) => c.source === 'task')
    if (filter === 'unused') r = r.filter((c) => c.claimed && !c.used)
    if (filter === 'used') r = r.filter((c) => c.used)
    if (filter === 'expired') r = r.filter((c) => c.claimed && new Date(c.expiresAt) < new Date() && !c.used)
    return r
  }, [allCoupons, tab, filter])

  const stats = useMemo(() => {
    const unused = userCoupons.filter((c) => !c.used && new Date(c.expiresAt) >= new Date())
    const totalSaved = unused.reduce((s, c) => s + c.amount, 0)
    return { unused: unused.length, totalSaved }
  }, [userCoupons])

  const handleClaim = (coupon: typeof COUPON_POOL[0]) => {
    if (userCoupons.find((c) => c.id === coupon.id)) {
      toast('已经领取过啦', 'info')
      return
    }
    setUserCoupons([...userCoupons, { ...coupon, claimed: true }])
    toast(`🎉 成功领取 ${coupon.amount} 元券`, 'success')
  }

  const handleClaimAll = () => {
    const newCoupons = COUPON_POOL
      .filter((c) => !userCoupons.find((u) => u.id === c.id))
      .map((c) => ({ ...c, claimed: true }))
    setUserCoupons([...userCoupons, ...newCoupons])
    toast(`🎉 一键领取 ${newCoupons.length} 张优惠券`, 'success')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Hero Header - 京东风 */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-debate-500 via-rose-500 to-orange-500 text-white p-6 sm:p-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_60%)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold mb-3">
              <Ticket className="w-3 h-3" /> COUPONS CENTER
            </div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">领券中心</h1>
            <p className="mt-2 text-sm sm:text-base text-white/90">每天领一领，省钱多一点 · 一键领取更省心</p>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <Button size="lg" onClick={handleClaimAll} className="bg-white text-debate-600 hover:bg-white/90 font-bold" leftIcon={<Gift className="w-4 h-4" />}>
                一键领取全部
              </Button>
              <span className="text-xs text-white/80">已领 <strong className="text-white">{stats.unused}</strong> 张 · 省 <strong className="text-white">¥{stats.totalSaved}</strong></span>
            </div>
          </div>
          <div className="hidden sm:flex justify-end">
            <div className="relative">
              <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl sm:text-5xl font-bold">¥{stats.totalSaved}</div>
                  <div className="text-xs text-white/80 mt-1">总优惠</div>
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-amber-400 text-amber-900 flex items-center justify-center font-bold shadow-lg">
                <Sparkles className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 分类 + 状态 筛选 */}
      <div className="space-y-3">
        <div className="overflow-x-auto -mx-4 px-4">
          <Tabs variant="pills" tabs={TABS} value={tab} onChange={setTab} />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-ink-500">状态：</span>
          {[
            { v: 'all', l: '全部' },
            { v: 'unused', l: '未使用' },
            { v: 'used', l: '已使用' },
          ].map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v as any)}
              className={cn(
                'px-3 h-7 rounded-lg text-xs font-medium transition-colors',
                filter === f.v
                  ? 'bg-debate-500 text-white'
                  : 'bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 dark:hover:bg-ink-700'
              )}
            >
              {f.l}
            </button>
          ))}
          <span className="ml-auto text-xs text-ink-500">共 {filtered.length} 张</span>
        </div>
      </div>

      {/* 优惠券列表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {filtered.map((c) => {
          const expired = new Date(c.expiresAt) < new Date()
          const daysLeft = Math.ceil((new Date(c.expiresAt).getTime() - Date.now()) / 86400000)
          return (
            <div
              key={c.id}
              className={cn(
                'group relative rounded-2xl overflow-hidden border-2 transition-all hover:shadow-xl',
                c.used
                  ? 'border-ink-200/40 dark:border-ink-800/40 opacity-60'
                  : expired
                  ? 'border-amber-300/60 dark:border-amber-700/40 opacity-80'
                  : c.claimed
                  ? 'border-shop-300/60 dark:border-shop-700/40 bg-gradient-to-r from-shop-50/40 dark:from-shop-900/10 to-transparent'
                  : 'border-debate-300/60 dark:border-debate-700/40 hover:border-debate-500/60'
              )}
            >
              <div className="flex">
                {/* 左侧金额 */}
                <div className={cn(
                  'relative w-32 sm:w-36 flex-shrink-0 p-4 flex flex-col items-center justify-center text-white',
                  c.scope === 'all' ? 'bg-gradient-to-br from-debate-500 to-rose-500' :
                  c.scope === 'category' ? 'bg-gradient-to-br from-nova-500 to-purple-500' :
                  c.scope === 'brand' ? 'bg-gradient-to-br from-shop-500 to-pink-500' :
                  'bg-gradient-to-br from-amber-500 to-orange-500'
                )}>
                  {c.amount >= c.threshold && c.threshold > 0 && (
                    <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-ink-50 dark:bg-ink-950" />
                  )}
                  {c.amount >= c.threshold && c.threshold > 0 && (
                    <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white dark:bg-ink-900" />
                  )}
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-80 mb-1">¥</div>
                  <div className="text-3xl sm:text-4xl font-bold leading-none">{c.amount}</div>
                  <div className="text-[10px] mt-1 opacity-90">
                    {c.threshold > 0 ? `满 ${c.threshold} 可用` : '无门槛'}
                  </div>
                  {c.source === 'task' && (
                    <div className="absolute top-1 right-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-amber-900 font-bold">任务</div>
                  )}
                </div>

                {/* 右侧信息 */}
                <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wider">{c.scopeLabel}</span>
                      {c.scope === 'brand' && <Crown className="w-3 h-3 text-shop-500" />}
                    </div>
                    <h3 className="font-bold text-sm line-clamp-1">{c.description}</h3>
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-500">
                      <Clock className="w-3 h-3" />
                      {expired ? '已过期' : c.claimed ? `${daysLeft} 天后到期` : `领取后 ${Math.min(30, daysLeft)} 天有效`}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    {c.used ? (
                      <span className="inline-flex items-center gap-1 text-xs text-ink-400 line-through">
                        <CheckCircle2 className="w-3.5 h-3.5" />已使用
                      </span>
                    ) : c.claimed ? (
                      <span className="inline-flex items-center gap-1 text-xs text-shop-600 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 fill-current" />已领取
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />限领 1 张
                      </span>
                    )}
                    {c.used ? (
                      <span className="text-[10px] text-ink-400">{c.usedAt?.slice(0, 10)}</span>
                    ) : c.claimed ? (
                      <Button size="sm" variant="outline" onClick={() => navigate('/shop')}>
                        去使用
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleClaim(c)}
                        className={cn(
                          'font-bold',
                          c.scope === 'all' ? 'bg-debate-500 hover:bg-debate-600' :
                          c.scope === 'category' ? 'bg-nova-500 hover:bg-nova-600' :
                          c.scope === 'brand' ? 'bg-shop-500 hover:bg-shop-600' :
                          'bg-amber-500 hover:bg-amber-600'
                        )}
                      >
                        立即领取
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 任务中心 - 赚券 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold">做任务赚券</h2>
            <p className="text-[10px] text-ink-500">完成任务即可领取专属优惠券</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: 'signin', icon: '📅', title: '每日签到', desc: '连续 7 天再得 10 元券', reward: 10 },
            { id: 'invite', icon: '👥', title: '邀请好友', desc: '邀请 1 位好友注册', reward: 50 },
            { id: 'review', icon: '⭐', title: '商品晒单', desc: '完成 1 次商品评价', reward: 15 },
          ].map((t) => {
            const coupon = COUPON_POOL.find((c) => c.id === `t-${t.id}-${t.reward}`)
            const claimed = coupon && userCoupons.find((c) => c.id === coupon.id)
            return (
              <div key={t.id} className="rounded-2xl p-5 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-200/40 dark:border-amber-800/40 hover:shadow-xl transition-all">
                <div className="text-3xl mb-2">{t.icon}</div>
                <h3 className="font-bold">{t.title}</h3>
                <p className="text-xs text-ink-500 mt-1">{t.desc}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-amber-600 font-bold">+ ¥{t.reward}</span>
                  {claimed ? (
                    <Button size="sm" variant="outline" onClick={() => navigate('/shop')}>去使用</Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        if (coupon) handleClaim(coupon)
                      }}
                      className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                    >
                      去做任务
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 推荐商品 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-5 h-5 text-shop-500" />
          <h2 className="text-lg sm:text-xl font-bold">用券优选</h2>
          <span className="text-xs text-ink-500">满减好搭</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {products.slice(0, 4).map((p) => <ProductCardV2 key={p.id} product={p} />)}
        </div>
      </div>
    </div>
  )
}
