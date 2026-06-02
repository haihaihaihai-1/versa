import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Heart, ShoppingBag, Clock, Bell, TrendingUp, Sparkles, Star, Eye, MessageCircle, Bookmark, FileText, StickyNote, Calendar, Video, Palette, Trash2, Plus, ChevronRight } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import { cn, formatNumber, formatTimeAgo } from '../lib/utils'

const STORAGE_KEY = 'versa:user-dashboard'
const WIDGETS = [
  { id: 'stats', label: '我的数据', icon: TrendingUp, color: 'from-violet-500 to-purple-500' },
  { id: 'recent', label: '最近浏览', icon: Eye, color: 'from-blue-500 to-cyan-500' },
  { id: 'favorites', label: '我的收藏', icon: Heart, color: 'from-rose-500 to-pink-500' },
  { id: 'cart', label: '购物车', icon: ShoppingBag, color: 'from-amber-500 to-orange-500' },
  { id: 'notifications', label: '通知', icon: Bell, color: 'from-emerald-500 to-teal-500' },
  { id: 'shortcuts', label: '快捷入口', icon: Sparkles, color: 'from-fuchsia-500 to-pink-500' },
  { id: 'calendar', label: '今日日程', icon: Calendar, color: 'from-indigo-500 to-blue-500' },
  { id: 'live', label: '直播提醒', icon: Video, color: 'from-red-500 to-rose-500' },
]

function loadOrder() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '["stats","recent","shortcuts","favorites","cart"]') }
  catch { return ['stats', 'recent', 'shortcuts', 'favorites', 'cart'] }
}

function saveOrder(order: string[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)) } catch {}
}

function getStat(key: string): number {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]').length
  } catch { return 0 }
}

export function UserDashboard() {
  const { user } = useAuth()
  const [order, setOrder] = useState<string[]>([])
  const [edit, setEdit] = useState(false)

  useEffect(() => {
    setOrder(loadOrder())
  }, [])

  useEffect(() => { if (order.length > 0) saveOrder(order) }, [order])

  if (!user) return null

  const stats = {
    orders: getStat('versa:orders') || 0,
    cart: getStat('versa:cart-v2'),
    favorites: getStat('versa:favorites'),
    notes: getStat('versa:notes'),
    events: getStat('versa:events'),
    recently: getStat('versa:browse-history'),
  }

  const recent = (() => { try { return JSON.parse(localStorage.getItem('versa:browse-history') || '[]') } catch { return [] } })()
  const favorites = (() => { try { return JSON.parse(localStorage.getItem('versa:favorites') || '[]') } catch { return [] } })()

  const moveWidget = (id: string, dir: -1 | 1) => {
    setOrder((arr) => {
      const idx = arr.indexOf(id)
      if (idx < 0) return arr
      const next = idx + dir
      if (next < 0 || next >= arr.length) return arr
      const out = [...arr]
      ;[out[idx], out[next]] = [out[next], out[idx]]
      return out
    })
  }

  const removeWidget = (id: string) => {
    setOrder((arr) => arr.filter((i) => i !== id))
  }

  const addWidget = (id: string) => {
    if (!order.includes(id)) setOrder((arr) => [...arr, id])
  }

  const availableToAdd = WIDGETS.filter((w) => !order.includes(w.id))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-nova-500" />
          {user.displayName} 的工作台
        </h2>
        <button
          onClick={() => setEdit((v) => !v)}
          className={cn(
            'px-3 h-8 rounded-lg text-xs font-medium transition',
            edit ? 'bg-nova-500 text-white' : 'bg-white/60 dark:bg-ink-800 text-ink-700 dark:text-ink-200 hover:bg-ink-50'
          )}
        >
          {edit ? '完成' : '编辑'}
        </button>
      </div>

      {edit && availableToAdd.length > 0 && (
        <div className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-3">
          <p className="text-xs text-ink-500 mb-2">点击添加组件</p>
          <div className="flex flex-wrap gap-2">
            {availableToAdd.map((w) => (
              <button
                key={w.id}
                onClick={() => addWidget(w.id)}
                className="flex items-center gap-1.5 px-2.5 h-7 rounded-full text-xs bg-ink-50 dark:bg-ink-800 hover:bg-nova-50 dark:hover:bg-nova-900/30"
              >
                <Plus className="w-3 h-3" />
                <w.icon className="w-3 h-3" />
                {w.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {order.map((id) => {
          const widget = WIDGETS.find((w) => w.id === id)
          if (!widget) return null
          return (
            <motion.div
              key={id}
              layout
              className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-4 relative group"
            >
              {edit && (
                <div className="absolute top-2 right-2 flex gap-1">
                  <button onClick={() => moveWidget(id, -1)} className="w-6 h-6 rounded bg-ink-100 dark:bg-ink-800 text-xs">↑</button>
                  <button onClick={() => moveWidget(id, 1)} className="w-6 h-6 rounded bg-ink-100 dark:bg-ink-800 text-xs">↓</button>
                  <button onClick={() => removeWidget(id)} className="w-6 h-6 rounded bg-rose-100 dark:bg-rose-900/40 text-rose-500"><Trash2 className="w-3 h-3 mx-auto" /></button>
                </div>
              )}
              <h3 className="text-sm font-bold flex items-center gap-1.5 mb-2.5">
                <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br', widget.color)}>
                  <widget.icon className="w-3 h-3 text-white" />
                </div>
                {widget.label}
              </h3>

              {id === 'stats' && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '订单', value: stats.orders, color: 'text-rose-500' },
                    { label: '收藏', value: stats.favorites, color: 'text-pink-500' },
                    { label: '笔记', value: stats.notes, color: 'text-nova-500' },
                    { label: '日程', value: stats.events, color: 'text-blue-500' },
                    { label: '浏览', value: stats.recently, color: 'text-amber-500' },
                    { label: '购物车', value: stats.cart, color: 'text-emerald-500' },
                  ].map((s) => (
                    <div key={s.label} className="bg-ink-50/60 dark:bg-ink-800/40 rounded-lg p-2 text-center">
                      <p className={cn('text-lg font-bold', s.color)}>{s.value}</p>
                      <p className="text-[10px] text-ink-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {id === 'shortcuts' && (
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { to: '/notes', icon: FileText, label: '笔记' },
                    { to: '/quicknotes', icon: StickyNote, label: '便签' },
                    { to: '/calendar', icon: Calendar, label: '日程' },
                    { to: '/smartlist', icon: Sparkles, label: '清单' },
                    { to: '/live-subs', icon: Video, label: '直播' },
                    { to: '/theme', icon: Palette, label: '主题' },
                    { to: '/compose', icon: Plus, label: '发布' },
                    { to: '/settings', icon: Bookmark, label: '设置' },
                  ].map((s) => (
                    <Link
                      key={s.to}
                      to={s.to}
                      className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800 transition"
                    >
                      <s.icon className="w-4 h-4 text-nova-500" />
                      <span className="text-[10px]">{s.label}</span>
                    </Link>
                  ))}
                </div>
              )}

              {(id === 'recent' || id === 'favorites') && (
                <div className="space-y-1">
                  {((id === 'recent' ? recent : favorites) as string[]).slice(0, 4).map((pId) => (
                    <div key={pId} className="text-xs text-ink-700 dark:text-ink-300 truncate">· {pId}</div>
                  ))}
                  {((id === 'recent' ? recent : favorites) as string[]).length === 0 && (
                    <p className="text-xs text-ink-400">暂无记录</p>
                  )}
                </div>
              )}

              {id === 'cart' && (
                <Link to="/cart" className="flex items-center justify-between text-sm hover:text-nova-500">
                  <span>购物车 {stats.cart} 件</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}

              {id === 'calendar' && (
                <Link to="/calendar" className="flex items-center justify-between text-sm hover:text-nova-500">
                  <span>查看全部日程 ({stats.events})</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}

              {id === 'live' && (
                <Link to="/live-subs" className="flex items-center justify-between text-sm hover:text-nova-500">
                  <span>直播订阅管理</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}

              {id === 'notifications' && (
                <Link to="/messages" className="flex items-center justify-between text-sm hover:text-nova-500">
                  <span>查看全部通知</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
