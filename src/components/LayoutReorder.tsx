import { useState, useEffect } from 'react'
import { motion, Reorder } from 'framer-motion'
import { GripVertical, Eye, EyeOff, RotateCcw, Save, Layers } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

interface MenuItem {
  id: string
  label: string
  to: string
  visible: boolean
  icon: string
  group: 'social' | 'tools' | 'content' | 'shop' | 'live' | 'profile'
}

const DEFAULT_ITEMS: MenuItem[] = [
  { id: 'feed', label: '动态', to: '/feed', visible: true, icon: '📰', group: 'social' },
  { id: 'news', label: '资讯', to: '/news', visible: true, icon: '📰', group: 'content' },
  { id: 'debates', label: '辩论', to: '/debates', visible: true, icon: '⚖️', group: 'content' },
  { id: 'shop', label: '购物', to: '/shop', visible: true, icon: '🛍️', group: 'shop' },
  { id: 'groups', label: '群组', to: '/groups', visible: true, icon: '👥', group: 'social' },
  { id: 'discover', label: '全局搜索', to: '/discover', visible: true, icon: '🔍', group: 'tools' },
  { id: 'creator-studio', label: '创作中心', to: '/creator-studio', visible: true, icon: '📊', group: 'tools' },
  { id: 'gift-leaderboard', label: '礼物榜', to: '/gift-leaderboard', visible: true, icon: '🏆', group: 'live' },
  { id: 'redpacket', label: '直播红包', to: '/redpacket', visible: true, icon: '🧧', group: 'live' },
  { id: 'qa-v2', label: '商品问答', to: '/qa-v2', visible: true, icon: '💬', group: 'shop' },
  { id: 'academy', label: '创作者学院', to: '/academy', visible: true, icon: '🎓', group: 'content' },
  { id: 'cart-suggestions', label: '购物助手', to: '/cart-suggestions', visible: true, icon: '🛒', group: 'shop' },
  { id: 'tools-social', label: '社交工具集', to: '/tools/social', visible: true, icon: '🧰', group: 'tools' },
  { id: 'settings', label: '设置', to: '/settings', visible: true, icon: '⚙️', group: 'profile' },
  { id: 'cart', label: '购物车', to: '/cart', visible: true, icon: '🛒', group: 'shop' },
  { id: 'profile', label: '个人中心', to: '/profile', visible: true, icon: '👤', group: 'profile' },
  { id: 'wishlist', label: '收藏夹', to: '/profile/wishlist', visible: true, icon: '❤️', group: 'profile' },
  { id: 'orders', label: '订单', to: '/profile/orders', visible: true, icon: '📦', group: 'profile' },
  { id: 'inbox', label: '消息', to: '/messages', visible: true, icon: '✉️', group: 'social' },
  { id: 'notifications', label: '通知', to: '/notifications', visible: true, icon: '🔔', group: 'profile' },
]

const STORAGE_KEY = 'versa:menu-order'
const VISIBLE_KEY = 'versa:menu-visible'

function loadOrder(): MenuItem[] {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    if (s) {
      const order: string[] = JSON.parse(s)
      const map = new Map(DEFAULT_ITEMS.map((it) => [it.id, it]))
      const out: MenuItem[] = []
      order.forEach((id) => { const it = map.get(id); if (it) out.push(it); map.delete(id) })
      map.forEach((it) => out.push(it))
      return out
    }
  } catch {}
  return DEFAULT_ITEMS
}

function loadVisible(): Record<string, boolean> {
  try { const s = localStorage.getItem(VISIBLE_KEY); if (s) return JSON.parse(s) } catch {}
  return {}
}

export function LayoutReorder() {
  const [items, setItems] = useState<MenuItem[]>(loadOrder())
  const [visible, setVisible] = useState<Record<string, boolean>>(loadVisible())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 1500)
      return () => clearTimeout(t)
    }
  }, [saved])

  const applyVisibility = (next: MenuItem[]) => {
    return next.map((it) => ({ ...it, visible: visible[it.id] !== false }))
  }

  const save = () => {
    const order = items.map((it) => it.id)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)) } catch {}
    try { localStorage.setItem(VISIBLE_KEY, JSON.stringify(visible)) } catch {}
    setItems(applyVisibility(items))
    setSaved(true)
    toast('已保存菜单配置', 'success')
  }

  const reset = () => {
    setItems(DEFAULT_ITEMS)
    setVisible({})
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(VISIBLE_KEY) } catch {}
    toast('已重置为默认', 'info')
  }

  const toggleVisible = (id: string) => {
    setVisible({ ...visible, [id]: visible[id] === false })
  }

  const groupColors: Record<string, string> = {
    social: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
    tools: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30',
    content: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
    shop: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30',
    live: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',
    profile: 'bg-ink-100 text-ink-700 dark:bg-ink-800',
  }

  const grouped = (() => {
    const out: Record<string, MenuItem[]> = {}
    items.forEach((it) => { if (!out[it.group]) out[it.group] = []; out[it.group].push(it) })
    return out
  })()

  const visibleCount = items.filter((it) => it.visible).length

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Layers className="w-5 h-5" />
          <h2 className="text-lg font-bold">菜单定制</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">拖拽排序 · 隐藏/显示 · 个性化下拉菜单</p>
        <div className="flex items-center gap-2 text-xs">
          <span>显示 {visibleCount}/{items.length} 项</span>
          <span>·</span>
          <span>共 {Object.keys(grouped).length} 分组</span>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={save} className="flex-1 h-9 rounded-lg bg-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
          {saved ? <><Eye className="w-3 h-3" />已保存</> : <><Save className="w-3 h-3" />保存</>}
        </button>
        <button onClick={reset} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          <RotateCcw className="w-3 h-3" />重置
        </button>
      </div>

      {Object.entries(grouped).map(([group, list]) => (
        <div key={group}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', groupColors[group])}>{group.toUpperCase()}</span>
            <span className="text-[10px] text-ink-500">{list.length} 项</span>
          </div>
          <Reorder.Group axis="y" values={list} onReorder={() => {}} className="space-y-1">
            {list.map((it) => (
              <Reorder.Item
                key={it.id}
                value={it}
                onDragEnd={() => {
                  const newOrder = items.filter((x) => x.group !== group)
                  newOrder.push(...list)
                  setItems(newOrder)
                }}
                className="flex items-center gap-1.5 p-2 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />
                <span className="text-base">{it.icon}</span>
                <span className={cn('flex-1 text-xs font-semibold', !it.visible && 'opacity-40 line-through')}>{it.label}</span>
                <span className="text-[9px] text-ink-500 font-mono hidden sm:inline">{it.to}</span>
                <button onClick={() => toggleVisible(it.id)} className={cn('w-6 h-6 rounded-lg flex items-center justify-center', it.visible ? 'bg-violet-500 text-white' : 'bg-ink-200 dark:bg-ink-800 text-ink-400')}>
                  {it.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      ))}
    </div>
  )
}
