import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check, Package, Heart, MessageCircle, AtSign, Star, ShoppingCart, Sparkles, Trash2 } from 'lucide-react'
import { cn, formatTimeAgo } from '../lib/utils'
import { playSound } from '../lib/sound'

export type NotificationType = 'order' | 'social' | 'system' | 'gift' | 'news' | 'achievement'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string
  timestamp: number
  read: boolean
  link?: string
  icon?: typeof Bell
}

const ICONS: Record<NotificationType, typeof Bell> = {
  order: Package,
  social: Heart,
  system: Bell,
  gift: Sparkles,
  news: MessageCircle,
  achievement: Star,
}

const COLORS: Record<NotificationType, string> = {
  order: 'from-shop-500 to-emerald-500',
  social: 'from-pink-500 to-rose-500',
  system: 'from-nova-500 to-indigo-500',
  gift: 'from-amber-500 to-orange-500',
  news: 'from-cyan-500 to-blue-500',
  achievement: 'from-yellow-500 to-amber-500',
}

const STORAGE_KEY = 'versa:notifications'

const SEED: Notification[] = [
  { id: 'n1', type: 'order', title: '订单已发货', body: '您的订单 #VRS-2024-8842 已发货，预计明天送达', timestamp: Date.now() - 1800000, read: false, link: '/profile/orders' },
  { id: 'n2', type: 'social', title: '小明 赞了你的帖子', body: '在 #618 数码 讨论中', timestamp: Date.now() - 3600000, read: false },
  { id: 'n3', type: 'gift', title: '小美 送了你 一颗小心心', body: '在直播 "618 数码狂欢夜"', timestamp: Date.now() - 7200000, read: false, link: '/shop/live' },
  { id: 'n4', type: 'news', title: '关注的创作者发布了新内容', body: '设计师小李：夏季新品发布预告', timestamp: Date.now() - 10800000, read: true, link: '/discover' },
  { id: 'n5', type: 'achievement', title: '解锁成就：连续 7 天签到', body: '获得 +50 声誉值奖励', timestamp: Date.now() - 86400000, read: true },
  { id: 'n6', type: 'system', title: '隐私设置已更新', body: '你的账号隐私设置已成功保存', timestamp: Date.now() - 172800000, read: true },
]

let triggerListener: ((n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void) | null = null

export function fireNotification(n: Omit<Notification, 'id' | 'timestamp' | 'read'>) {
  triggerListener?.(n)
}

export function NotificationCenter({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate?: (link: string) => void }) {
  const [items, setItems] = useState<Notification[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setItems(JSON.parse(stored))
      } else {
        setItems(SEED)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED))
      }
    } catch {
      setItems(SEED)
    }
  }, [])

  useEffect(() => {
    if (items.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
      } catch {}
    }
  }, [items])

  useEffect(() => {
    triggerListener = (n) => {
      const newItem: Notification = { ...n, id: 'n' + Date.now(), timestamp: Date.now(), read: false }
      setItems((prev) => [newItem, ...prev])
      playSound('notification', 0.05)
    }
    return () => {
      triggerListener = null
    }
  }, [])

  const grouped = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayMs = today.getTime()
    const groups: { label: string; items: Notification[] }[] = [
      { label: '今天', items: [] },
      { label: '昨天', items: [] },
      { label: '更早', items: [] },
    ]
    items.forEach((n) => {
      const d = new Date(n.timestamp)
      d.setHours(0, 0, 0, 0)
      const days = (todayMs - d.getTime()) / 86400000
      if (days < 1) groups[0].items.push(n)
      else if (days < 2) groups[1].items.push(n)
      else groups[2].items.push(n)
    })
    return groups.filter((g) => g.items.length > 0)
  }, [items])

  const unread = items.filter((n) => !n.read).length

  const markRead = useCallback((id: string) => {
    setItems((arr) => arr.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }, [])

  const markAllRead = useCallback(() => {
    setItems((arr) => arr.map((n) => ({ ...n, read: true })))
  }, [])

  const remove = useCallback((id: string) => {
    setItems((arr) => arr.filter((n) => n.id !== id))
  }, [])

  const clear = useCallback(() => {
    setItems([])
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 z-[91] w-full max-w-md bg-white dark:bg-ink-900 shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                <h2 className="font-bold text-lg">通知</h2>
                {unread > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-bold">{unread}</span>
                )}
              </div>
              <button onClick={onClose} className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 border-b border-ink-200 dark:border-ink-800 text-xs">
              <button onClick={markAllRead} disabled={unread === 0} className="inline-flex items-center gap-1 text-nova-600 hover:underline disabled:opacity-50 disabled:no-underline">
                <Check className="w-3 h-3" />全部已读
              </button>
              <button onClick={clear} disabled={items.length === 0} className="inline-flex items-center gap-1 text-ink-500 hover:text-red-500 disabled:opacity-50">
                <Trash2 className="w-3 h-3" />清空
              </button>
              <div className="flex-1" />
              <span className="text-ink-500">共 {items.length} 条</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="text-center py-20 text-ink-500">
                  <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>暂无通知</p>
                </div>
              ) : (
                grouped.map((g) => (
                  <div key={g.label}>
                    <div className="px-4 py-2 text-xs font-semibold text-ink-500 sticky top-0 bg-white/80 dark:bg-ink-900/80 backdrop-blur z-10">
                      {g.label}
                    </div>
                    {g.items.map((n) => {
                      const Icon = ICONS[n.type]
                      return (
                        <button
                          key={n.id}
                          onClick={() => {
                            markRead(n.id)
                            if (n.link) {
                              onNavigate?.(n.link)
                              onClose()
                            }
                          }}
                          className={cn(
                            'w-full text-left px-4 py-3 flex items-start gap-3 border-b border-ink-100 dark:border-ink-800/50 hover:bg-ink-50 dark:hover:bg-ink-800/30 transition',
                            !n.read && 'bg-nova-50/50 dark:bg-nova-950/20'
                          )}
                        >
                          <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0 bg-gradient-to-br', COLORS[n.type])}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-sm truncate">{n.title}</span>
                              {!n.read && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                            </div>
                            <p className="text-xs text-ink-500 line-clamp-2 mt-0.5">{n.body}</p>
                            <p className="text-[10px] text-ink-400 mt-1">{formatTimeAgo(new Date(n.timestamp).toISOString())}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              remove(n.id)
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-ink-100 dark:hover:bg-ink-800 rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function NotificationBell({ onClick }: { onClick: () => void }) {
  const [unread, setUnread] = useState(0)
  useEffect(() => {
    const update = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const list = JSON.parse(stored) as Notification[]
          setUnread(list.filter((n) => !n.read).length)
        }
      } catch {}
    }
    update()
    const id = setInterval(update, 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800 transition"
      title="通知"
    >
      <Bell className="w-5 h-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}
