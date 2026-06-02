import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Package, Truck, Check, Star, RotateCcw, Calendar, MapPin, Receipt, TrendingUp, ShoppingBag, MessageSquare } from 'lucide-react'
import { products } from '../data/products'
import { cn, formatCurrency, formatTimeAgo, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

const STORAGE_KEY = 'versa:orders'

export interface OrderItem {
  id: string
  productId: string
  qty: number
  price: number
  status: 'pending' | 'shipped' | 'delivered' | 'returning'
  trackingNumber?: string
  carrier?: string
  orderedAt: number
  deliveredAt?: number
  reviewSubmitted: boolean
  refunded: boolean
}

function load(): OrderItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  const now = Date.now()
  return [
    { id: uid('o'), productId: 'p1', qty: 1, price: 5999, status: 'delivered', trackingNumber: 'SF1234567890', carrier: '顺丰', orderedAt: now - 86400000 * 5, deliveredAt: now - 86400000 * 2, reviewSubmitted: true, refunded: false },
    { id: uid('o'), productId: 'p5', qty: 1, price: 199, status: 'shipped', trackingNumber: 'YT9876543210', carrier: '圆通', orderedAt: now - 86400000 * 2, reviewSubmitted: false, refunded: false },
    { id: uid('o'), productId: 'p3', qty: 2, price: 159, status: 'pending', orderedAt: now - 3600000 * 6, reviewSubmitted: false, refunded: false },
    { id: uid('o'), productId: 'p7', qty: 1, price: 899, status: 'delivered', trackingNumber: 'JD5678901234', carrier: '京东', orderedAt: now - 86400000 * 30, deliveredAt: now - 86400000 * 25, reviewSubmitted: true, refunded: false },
  ]
}

function save(o: OrderItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)) } catch {}
}

const STATUS_LABELS = {
  pending: '待发货',
  shipped: '运输中',
  delivered: '已签收',
  returning: '退货中',
}

const STATUS_COLORS = {
  pending: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600',
  shipped: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600',
  delivered: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600',
  returning: 'bg-rose-100 dark:bg-rose-900/40 text-rose-600',
}

export function PurchaseHistory() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [tab, setTab] = useState<'all' | OrderItem['status']>('all')

  useEffect(() => {
    setOrders(load())
  }, [])

  useEffect(() => { if (orders.length > 0) save(orders) }, [orders])

  const review = (id: string) => {
    setOrders((arr) => arr.map((o) => (o.id === id ? { ...o, reviewSubmitted: true } : o)))
    toast('已提交评价, 感谢分享', 'success')
  }

  const reorder = (productId: string) => {
    const p = products.find((p) => p.id === productId)
    if (!p) return
    const newOrder: OrderItem = {
      id: uid('o'), productId, qty: 1, price: p.price, status: 'pending', orderedAt: Date.now(), reviewSubmitted: false, refunded: false,
    }
    setOrders((arr) => [newOrder, ...arr])
    toast('已加入新订单', 'success')
  }

  const filtered = orders.filter((o) => tab === 'all' || o.status === tab)
  const totalSpent = orders.reduce((s, o) => s + o.price * o.qty, 0)
  const buyAgain = orders.filter((o) => o.status === 'delivered' && o.deliveredAt && Date.now() - o.deliveredAt > 86400000 * 7).slice(0, 4)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: '总订单', value: orders.length, color: 'from-violet-500 to-purple-500' },
          { label: '总消费', value: '¥' + formatCurrency(totalSpent), color: 'from-rose-500 to-pink-500' },
          { label: '已评价', value: orders.filter((o) => o.reviewSubmitted).length, color: 'from-emerald-500 to-teal-500' },
        ].map((s) => (
          <div key={s.label} className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-3">
            <div className={cn('text-base font-bold bg-gradient-to-r bg-clip-text text-transparent', s.color)}>{s.value}</div>
            <div className="text-[10px] text-ink-500">{s.label}</div>
          </div>
        ))}
      </div>

      {buyAgain.length > 0 && (
        <div>
          <h3 className="text-sm font-bold flex items-center gap-1.5 mb-2">
            <RotateCcw className="w-4 h-4 text-nova-500" />猜你想回购
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {buyAgain.map((o) => {
              const p = products.find((p) => p.id === o.productId)
              if (!p) return null
              return (
                <div key={o.id} className="bg-white/60 dark:bg-ink-900/40 rounded-xl p-2">
                  <Link to={`/shop/product/${p.id}`}>
                    <div className="aspect-square rounded-md overflow-hidden bg-ink-100">
                      <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] mt-1 line-clamp-1">{p.name}</p>
                    <p className="text-xs text-rose-500 font-bold">¥{p.price}</p>
                  </Link>
                  <button
                    onClick={() => reorder(o.productId)}
                    className="w-full mt-1 h-6 rounded text-[10px] bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold"
                  >
                    再次购买
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'all', label: '全部' },
          { key: 'pending', label: '待发货' },
          { key: 'shipped', label: '运输中' },
          { key: 'delivered', label: '已签收' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as typeof tab)}
            className={cn(
              'px-3 h-7 rounded-full text-xs font-medium flex-shrink-0',
              tab === t.key ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-500">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">暂无订单</p>
          </div>
        ) : (
          filtered.map((o) => {
            const p = products.find((p) => p.id === o.productId)
            if (!p) return null
            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-3 space-y-2"
              >
                <div className="flex items-center gap-2 text-[10px] text-ink-500">
                  <Receipt className="w-3 h-3" />
                  <span>{o.id}</span>
                  <span>·</span>
                  <span>{formatTimeAgo(new Date(o.orderedAt).toISOString())}</span>
                  <span className={cn('ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold', STATUS_COLORS[o.status])}>
                    {STATUS_LABELS[o.status]}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <Link to={`/shop/product/${p.id}`} className="w-16 h-16 rounded-lg overflow-hidden bg-ink-100 flex-shrink-0">
                    <img src={p.images?.[0]} alt={p.name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/shop/product/${p.id}`} className="text-sm font-semibold line-clamp-1 hover:text-nova-500">{p.name}</Link>
                    <p className="text-[10px] text-ink-500 mt-0.5 line-clamp-1">{p.tagline}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-rose-500 font-bold">¥{formatCurrency(o.price)} × {o.qty}</p>
                    </div>
                  </div>
                </div>

                {o.trackingNumber && o.status === 'shipped' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-[10px] text-blue-700 dark:text-blue-300">
                    <div className="flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      <span className="font-semibold">{o.carrier}</span>
                      <span>·</span>
                      <span>{o.trackingNumber}</span>
                    </div>
                    <p className="mt-0.5 opacity-80">预计明天送达</p>
                  </div>
                )}

                {o.status === 'delivered' && o.deliveredAt && (
                  <div className="text-[10px] text-emerald-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    已签收 {formatTimeAgo(new Date(o.deliveredAt).toISOString())}
                  </div>
                )}

                <div className="flex items-center gap-1.5 pt-1 border-t border-ink-100 dark:border-ink-800">
                  {o.status === 'delivered' && !o.reviewSubmitted && (
                    <button onClick={() => review(o.id)} className="flex-1 h-7 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-semibold flex items-center justify-center gap-1">
                      <Star className="w-3 h-3 fill-current" />评价晒单
                    </button>
                  )}
                  {o.reviewSubmitted && (
                    <span className="flex-1 h-7 flex items-center justify-center gap-1 text-[10px] text-emerald-600">
                      <Check className="w-3 h-3" />已评价
                    </span>
                  )}
                  {o.status === 'delivered' && (
                    <button onClick={() => reorder(o.productId)} className="h-7 px-3 rounded-lg bg-ink-100 dark:bg-ink-800 text-[10px]">
                      再次购买
                    </button>
                  )}
                  <button className="h-7 px-3 rounded-lg bg-ink-100 dark:bg-ink-800 text-[10px]">
                    <MessageSquare className="w-3 h-3 inline mr-0.5" />客服
                  </button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
