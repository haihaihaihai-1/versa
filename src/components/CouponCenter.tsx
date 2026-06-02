import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Ticket, Copy, Check, Clock, Sparkles, TrendingUp, X } from 'lucide-react'
import { cn, formatCurrency, uid, formatTimeAgo } from '../lib/utils'
import { toast } from './ui/Toaster'

const STORAGE_KEY = 'versa:coupons'

export interface Coupon {
  id: string
  amount: number
  threshold: number
  category?: string
  expiresAt: number
  source: string
  claimed: boolean
  used: boolean
  discount?: number
}

function seed(): Coupon[] {
  const now = Date.now()
  return [
    { id: 'c1', amount: 30, threshold: 200, expiresAt: now + 86400000 * 30, source: '新人福利', claimed: false, used: false },
    { id: 'c2', amount: 50, threshold: 300, category: 'tech', expiresAt: now + 86400000 * 15, source: '数码专场', claimed: false, used: false },
    { id: 'c3', amount: 100, threshold: 500, expiresAt: now + 86400000 * 7, source: '618 主会场', claimed: true, used: false },
    { id: 'c4', amount: 200, threshold: 1000, discount: 0.85, expiresAt: now + 86400000 * 3, source: '限时秒杀', claimed: true, used: true },
    { id: 'c5', amount: 5, threshold: 50, expiresAt: now + 86400000 * 60, source: '日常满减', claimed: false, used: false },
    { id: 'c6', amount: 20, threshold: 99, category: 'food', expiresAt: now + 86400000 * 10, source: '美食节', claimed: false, used: false },
  ]
}

function load(): Coupon[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return seed()
}

function save(c: Coupon[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)) } catch {}
}

const CATEGORY_LABELS: Record<string, string> = {
  tech: '数码',
  food: '美食',
  fashion: '服饰',
  beauty: '美妆',
  home: '家居',
}

export function CouponCenter() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [tab, setTab] = useState<'all' | 'available' | 'used' | 'expired'>('available')

  useEffect(() => {
    setCoupons(load())
  }, [])

  useEffect(() => {
    if (coupons.length > 0) save(coupons)
  }, [coupons])

  const claim = (id: string) => {
    setCoupons((arr) => arr.map((c) => (c.id === id ? { ...c, claimed: true } : c)))
    toast('已领取, 可在结算时使用', 'success')
  }

  const copy = (code: string) => {
    navigator.clipboard?.writeText(code)
    toast('已复制优惠码', 'success')
  }

  const filtered = coupons.filter((c) => {
    if (tab === 'available') return c.claimed && !c.used && c.expiresAt > Date.now()
    if (tab === 'used') return c.used
    if (tab === 'expired') return c.expiresAt < Date.now() && !c.used
    return true
  })

  const totalAvailable = coupons.filter((c) => c.claimed && !c.used && c.expiresAt > Date.now())
    .reduce((s, c) => s + c.amount, 0)

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-rose-500 to-pink-500 rounded-2xl p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Ticket className="w-5 h-5" />
          <h2 className="text-lg font-bold">优惠券中心</h2>
        </div>
        <p className="text-3xl font-bold">¥{totalAvailable}</p>
        <p className="text-xs opacity-80">可使用总额</p>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'available', label: '可使用' },
          { key: 'all', label: '全部' },
          { key: 'used', label: '已使用' },
          { key: 'expired', label: '已过期' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={cn(
              'px-3 h-7 rounded-full text-xs font-medium flex-shrink-0',
              tab === t.key ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-500">
            <Ticket className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无优惠券</p>
          </div>
        ) : (
          filtered.map((c) => {
            const daysLeft = Math.ceil((c.expiresAt - Date.now()) / 86400000)
            const isExpired = c.expiresAt < Date.now()
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  'flex items-stretch rounded-2xl overflow-hidden border',
                  c.used || isExpired
                    ? 'border-ink-200/60 dark:border-ink-800/60 opacity-50'
                    : 'border-rose-200/60 dark:border-rose-800/30 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30'
                )}
              >
                <div className="bg-gradient-to-b from-rose-500 to-pink-500 text-white p-3 flex flex-col items-center justify-center min-w-20">
                  <p className="text-2xl font-bold">¥{c.amount}</p>
                  <p className="text-[10px] opacity-80">满{c.threshold}可用</p>
                </div>
                <div className="flex-1 p-3 flex items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-sm">{c.source}</p>
                      {c.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-nova-100 dark:bg-nova-900/40 text-nova-500">
                          {CATEGORY_LABELS[c.category]}
                        </span>
                      )}
                      {c.discount && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-500">
                          再打{(c.discount * 100).toFixed(0)}折
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-ink-500 flex items-center gap-1 mt-0.5">
                      <Clock className="w-2.5 h-2.5" />
                      {isExpired ? '已过期' : c.used ? '已使用' : `${daysLeft} 天后过期`}
                    </div>
                    {c.claimed && (
                      <div className="text-[10px] text-ink-400 mt-0.5">优惠码: VERSA{c.id.toUpperCase()}</div>
                    )}
                  </div>
                  {!c.claimed && !c.used && !isExpired && (
                    <button
                      onClick={() => claim(c.id)}
                      className="px-3 h-8 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold"
                    >
                      立即领取
                    </button>
                  )}
                  {c.claimed && !c.used && !isExpired && (
                    <button
                      onClick={() => copy('VERSA' + c.id.toUpperCase())}
                      className="px-3 h-8 rounded-lg bg-white dark:bg-ink-900 text-rose-500 text-xs font-semibold flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />复制
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
