import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, BellOff, Trash2, Settings, Filter, Check, X, MessageCircle, Heart, ShoppingCart, Sparkles, Volume2, Plus, Calendar, Eye } from 'lucide-react'
import { cn, formatTimeAgo, uid } from '../lib/utils'
import { Link } from 'react-router-dom'
import { toast } from './ui/Toaster'

interface NotifItem {
  id: string
  type: 'social' | 'order' | 'live' | 'system' | 'ai'
  title: string
  body: string
  avatar?: string
  thumbnail?: string
  to?: string
  read: boolean
  pinned: boolean
  at: number
}

const SEED: NotifItem[] = [
  { id: 'n1', type: 'social', title: '购物达人王 关注了你', body: '查看主页', avatar: 'https://i.pravatar.cc/100?img=11', to: '/u/shopper', read: false, pinned: false, at: Date.now() - 60000 * 5 },
  { id: 'n2', type: 'live', title: '数码小王子正在直播', body: 'iPhone 16 首发体验, 限时优惠', thumbnail: 'https://picsum.photos/seed/live1/200/200', to: '/live/1', read: false, pinned: true, at: Date.now() - 60000 * 30 },
  { id: 'n3', type: 'order', title: '订单已发货', body: 'iPhone 16 Pro 256G 正在派送中', thumbnail: 'https://picsum.photos/seed/iphone16/200/200', to: '/profile/orders', read: true, pinned: false, at: Date.now() - 3600000 },
  { id: 'n4', type: 'ai', title: 'AI 助手推荐', body: '基于你的浏览, 推荐 3 款夏季新品', avatar: '🤖', to: '/shop', read: false, pinned: false, at: Date.now() - 7200000 },
  { id: 'n5', type: 'social', title: '美食家 Lily 评论了你的动态', body: '看起来好好吃! 求店名', avatar: 'https://i.pravatar.cc/100?img=20', to: '/p/123', read: true, pinned: false, at: Date.now() - 86400000 },
  { id: 'n6', type: 'system', title: '系统升级完成', body: '新版本 v25.0 已部署, 体验 8 大新功能', to: '/about', read: false, pinned: false, at: Date.now() - 86400000 * 2 },
]

const TYPE_META = {
  social: { label: '社交', icon: MessageCircle, color: 'from-rose-500 to-pink-500' },
  order: { label: '订单', icon: ShoppingCart, color: 'from-emerald-500 to-teal-500' },
  live: { label: '直播', icon: Calendar, color: 'from-amber-500 to-orange-500' },
  system: { label: '系统', icon: Settings, color: 'from-blue-500 to-indigo-500' },
  ai: { label: 'AI', icon: Sparkles, color: 'from-violet-500 to-purple-500' },
} as const

const STORAGE_KEY = 'versa:smart-notif'
const PREFS_KEY = 'versa:notif-prefs'

interface Prefs {
  doNotDisturb: boolean
  dndStart: string
  dndEnd: string
  soundEnabled: boolean
  vibrationEnabled: boolean
  groupByType: boolean
  autoReadOnView: boolean
  showPreview: boolean
}

const DEFAULT_PREFS: Prefs = {
  doNotDisturb: false, dndStart: '22:00', dndEnd: '08:00', soundEnabled: true, vibrationEnabled: true,
  groupByType: true, autoReadOnView: true, showPreview: true,
}

function load(): NotifItem[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return SEED }
function save(d: NotifItem[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }
function loadPrefs(): Prefs { try { const s = localStorage.getItem(PREFS_KEY); if (s) return { ...DEFAULT_PREFS, ...JSON.parse(s) } } catch {} return DEFAULT_PREFS }
function savePrefs(d: Prefs) { try { localStorage.setItem(PREFS_KEY, JSON.stringify(d)) } catch {} }

export function SmartNotification() {
  const [items, setItems] = useState<NotifItem[]>([])
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs())
  const [filter, setFilter] = useState<'all' | 'unread' | keyof typeof TYPE_META>('all')
  const [prefsOpen, setPrefsOpen] = useState(false)

  useEffect(() => { setItems(load()) }, [])
  useEffect(() => { if (items.length) save(items) }, [items])
  useEffect(() => { savePrefs(prefs) }, [prefs])

  const unreadCount = items.filter((i) => !i.read).length
  const read = (id: string) => setItems((is) => is.map((i) => i.id === id ? { ...i, read: true } : i))
  const remove = (id: string) => setItems((is) => is.filter((i) => i.id !== id))
  const markAllRead = () => { setItems((is) => is.map((i) => ({ ...i, read: true }))); toast('全部已读', 'success') }
  const clear = () => { if (confirm('清空所有通知?')) { setItems([]); toast('已清空', 'info') } }
  const togglePin = (id: string) => setItems((is) => is.map((i) => i.id === id ? { ...i, pinned: !i.pinned } : i))
  const addTest = () => {
    const t: NotifItem = { id: uid(), type: 'social', title: '测试通知', body: '这是一条测试通知', avatar: 'https://i.pravatar.cc/100?img=99', read: false, pinned: false, at: Date.now() }
    setItems([t, ...items])
  }

  const filtered = (() => {
    let out = items
    if (filter === 'unread') out = out.filter((i) => !i.read)
    else if (filter !== 'all') out = out.filter((i) => i.type === filter)
    return out.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at - a.at)
  })()

  const groups = (() => {
    if (!prefs.groupByType) return null
    const out: Record<string, NotifItem[]> = {}
    filtered.forEach((i) => { if (!out[i.type]) out[i.type] = []; out[i.type].push(i) })
    return out
  })()

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="w-5 h-5" />
          <h2 className="text-lg font-bold">智能通知中心</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">分组 · 免打扰 · 智能管理</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{items.length}</p>
            <p className="text-[10px] opacity-80">总通知</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{unreadCount}</p>
            <p className="text-[10px] opacity-80">未读</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{items.filter((i) => i.pinned).length}</p>
            <p className="text-[10px] opacity-80">置顶</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setPrefsOpen(true)} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          <Settings className="w-3 h-3" />偏好
        </button>
        <button onClick={markAllRead} className="px-3 h-8 rounded-lg bg-blue-500 text-white text-xs font-semibold flex items-center gap-1">
          <Check className="w-3 h-3" />全部已读
        </button>
        <button onClick={clear} className="px-3 h-8 rounded-lg bg-rose-500 text-white text-xs font-semibold flex items-center gap-1">
          <Trash2 className="w-3 h-3" />清空
        </button>
        <button onClick={addTest} className="px-3 h-8 rounded-lg bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1">
          <Plus className="w-3 h-3" />测试
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'all' ? 'bg-blue-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        <button onClick={() => setFilter('unread')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'unread' ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>未读 ({unreadCount})</button>
        {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === k ? `bg-gradient-to-r ${TYPE_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {TYPE_META[k].label} ({items.filter((i) => i.type === k).length})
          </button>
        ))}
      </div>

      {!groups && (
        <div className="space-y-1.5">
          {filtered.map((n) => <NotifRow key={n.id} n={n} onRead={read} onRemove={remove} onPin={togglePin} showPreview={prefs.showPreview} />)}
        </div>
      )}

      {groups && Object.entries(groups).map(([type, list]) => {
        const Meta = TYPE_META[type as keyof typeof TYPE_META]
        return (
          <div key={type}>
            <div className="flex items-center gap-1.5 mb-1">
              <span className={cn('w-1.5 h-1.5 rounded-full bg-gradient-to-br', Meta.color)} />
              <p className="text-[10px] font-bold text-ink-700 dark:text-ink-300">{Meta.label} · {list.length}</p>
            </div>
            <div className="space-y-1.5">
              {list.map((n) => <NotifRow key={n.id} n={n} onRead={read} onRemove={remove} onPin={togglePin} showPreview={prefs.showPreview} />)}
            </div>
          </div>
        )
      })}

      <AnimatePresence>
        {prefsOpen && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setPrefsOpen(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-1.5"><Settings className="w-4 h-4" />通知偏好</h3>
                <button onClick={() => setPrefsOpen(false)}><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-1.5">
                {([
                  { k: 'doNotDisturb' as const, l: '免打扰模式', i: BellOff },
                  { k: 'soundEnabled' as const, l: '声音提醒', i: Volume2 },
                  { k: 'vibrationEnabled' as const, l: '震动', i: Bell },
                  { k: 'groupByType' as const, l: '按类型分组', i: Filter },
                  { k: 'autoReadOnView' as const, l: '查看自动已读', i: Eye },
                  { k: 'showPreview' as const, l: '显示预览', i: Sparkles },
                ] as const).map((row) => {
                  const Icon = row.i
                  return (
                    <button key={row.k} onClick={() => setPrefs({ ...prefs, [row.k]: !prefs[row.k] })} className="w-full flex items-center gap-2 p-2.5 rounded-lg bg-ink-50 dark:bg-ink-800">
                      <Icon className="w-4 h-4" />
                      <span className="flex-1 text-left text-sm">{row.l}</span>
                      <div className={cn('w-9 h-5 rounded-full transition', prefs[row.k] ? 'bg-blue-500' : 'bg-ink-300 dark:bg-ink-700')}>
                        <motion.div animate={{ x: prefs[row.k] ? 16 : 0 }} className="w-5 h-5 rounded-full bg-white shadow" />
                      </div>
                    </button>
                  )
                })}
              </div>

              {prefs.doNotDisturb && (
                <div className="bg-ink-50 dark:bg-ink-800 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-bold">免打扰时段</p>
                  <div className="flex items-center gap-2">
                    <input type="time" value={prefs.dndStart} onChange={(e) => setPrefs({ ...prefs, dndStart: e.target.value })} className="px-2 h-8 rounded-lg bg-white dark:bg-ink-900 text-xs" />
                    <span className="text-xs text-ink-500">至</span>
                    <input type="time" value={prefs.dndEnd} onChange={(e) => setPrefs({ ...prefs, dndEnd: e.target.value })} className="px-2 h-8 rounded-lg bg-white dark:bg-ink-900 text-xs" />
                  </div>
                </div>
              )}

              <button onClick={() => setPrefsOpen(false)} className="w-full h-9 rounded-lg bg-blue-500 text-white text-sm font-semibold">完成</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function NotifRow({ n, onRead, onRemove, onPin, showPreview }: { n: NotifItem; onRead: (id: string) => void; onRemove: (id: string) => void; onPin: (id: string) => void; showPreview: boolean }) {
  const Meta = TYPE_META[n.type]
  const Icon = Meta.icon
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className={cn('p-2.5 rounded-xl border', n.read ? 'bg-white/40 dark:bg-ink-900/20 border-ink-200/40' : 'bg-white/80 dark:bg-ink-900/40 border-blue-300/40')}
    >
      <div className="flex items-start gap-2">
        {n.avatar ? (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-nova-500 to-pink-500 flex items-center justify-center text-white text-base flex-shrink-0">
            {n.avatar.startsWith('http') ? <img src={n.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : n.avatar}
          </div>
        ) : n.thumbnail ? (
          <img src={n.thumbnail} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0 bg-gradient-to-br', Meta.color)}>
            <Icon className="w-4 h-4" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={cn('text-xs font-semibold truncate', !n.read && 'text-ink-900 dark:text-white')}>{n.title}</p>
            {n.pinned && <span className="text-[8px] px-1 py-0.5 rounded bg-amber-500 text-white font-bold">📌</span>}
            {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
          </div>
          {showPreview && <p className="text-[10px] text-ink-500 line-clamp-1">{n.body}</p>}
          <p className="text-[9px] text-ink-400 mt-0.5">{formatTimeAgo(new Date(n.at).toISOString())}</p>
        </div>
        <button onClick={() => onPin(n.id)} className={cn('w-6 h-6 rounded-lg flex items-center justify-center', n.pinned ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>📌</button>
        <button onClick={() => onRead(n.id)} className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
          <Check className="w-3 h-3" />
        </button>
        <button onClick={() => onRemove(n.id)} className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center">
          <X className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  )
}
