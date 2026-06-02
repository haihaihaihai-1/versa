import { useEffect, useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Command, ArrowRight, Hash, ShoppingBag, Newspaper, MessageCircle, User, Sparkles, Settings, Home, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { products } from '../data/products'
import { news } from '../data/news'
import { debates } from '../data/debates'

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon: any
  action: () => void
  group: string
  keywords?: string[]
}

const NAV_ITEMS = [
  { path: '/', label: '首页', icon: Home, group: '页面' },
  { path: '/shop', label: '商城', icon: ShoppingBag, group: '页面' },
  { path: '/news', label: '资讯', icon: Newspaper, group: '页面' },
  { path: '/debates', label: '辩论', icon: MessageCircle, group: '页面' },
  { path: '/feed', label: '动态', icon: Hash, group: '页面' },
  { path: '/discover/ai', label: 'AI 智能搜索', icon: Sparkles, group: 'AI 工具' },
  { path: '/insights', label: '个人数据看板', icon: Sparkles, group: 'AI 工具' },
  { path: '/achievements', label: '成就中心', icon: Sparkles, group: '个人中心' },
  { path: '/smartlist', label: '智能购物清单', icon: Sparkles, group: 'AI 工具' },
  { path: '/profile', label: '我的资料', icon: User, group: '个人中心' },
  { path: '/settings', label: '设置', icon: Settings, group: '个人中心' },
  { path: '/creator-center', label: '创作者中心', icon: Sparkles, group: 'AI 工具' },
  { path: '/help', label: '帮助中心', icon: Sparkles, group: '页面' },
  { path: '/invite', label: '邀请有礼', icon: Sparkles, group: '页面' },
  { path: '/support/chat', label: '在线客服', icon: MessageCircle, group: '页面' },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const navigate = useNavigate()
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIdx(0)
    }
  }, [open])

  const items: CommandItem[] = useMemo(() => {
    const list: CommandItem[] = []
    NAV_ITEMS.forEach((n) => {
      list.push({
        id: `nav-${n.path}`,
        title: n.label,
        subtitle: n.path,
        icon: n.icon,
        group: n.group,
        keywords: [n.path, n.label.toLowerCase()],
        action: () => {
          navigate(n.path)
          setOpen(false)
        },
      })
    })
    products.slice(0, 8).forEach((p) => {
      list.push({
        id: `prod-${p.id}`,
        title: p.name,
        subtitle: `商品 · ¥${p.price}`,
        icon: ShoppingBag,
        group: '商品',
        keywords: [p.name, p.category, ...(p.tags || [])],
        action: () => {
          navigate(`/shop/${p.id}`)
          setOpen(false)
        },
      })
    })
    news.slice(0, 5).forEach((n) => {
      list.push({
        id: `news-${n.id}`,
        title: n.title,
        subtitle: '资讯',
        icon: Newspaper,
        group: '资讯',
        keywords: [n.title, n.category, ...(n.tags || [])],
        action: () => {
          navigate(`/news/${n.id}`)
          setOpen(false)
        },
      })
    })
    debates.slice(0, 5).forEach((d) => {
      list.push({
        id: `debate-${d.id}`,
        title: d.title,
        subtitle: '辩论',
        icon: MessageCircle,
        group: '辩论',
        keywords: [d.title, d.category],
        action: () => {
          navigate(`/debates/${d.id}`)
          setOpen(false)
        },
      })
    })
    return list
  }, [navigate])

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 20)
    const q = query.toLowerCase()
    return items
      .filter((it) =>
        it.title.toLowerCase().includes(q) ||
        it.subtitle?.toLowerCase().includes(q) ||
        it.keywords?.some((k) => k.toLowerCase().includes(q))
      )
      .slice(0, 20)
  }, [items, query])

  useEffect(() => {
    setActiveIdx(0)
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>()
    filtered.forEach((it) => {
      if (!map.has(it.group)) map.set(it.group, [])
      map.get(it.group)!.push(it)
    })
    return Array.from(map.entries())
  }, [filtered])

  const runItem = (it: CommandItem) => {
    it.action()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(filtered.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[activeIdx]) runItem(filtered[activeIdx])
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] px-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-2xl bg-white dark:bg-ink-900 rounded-2xl shadow-2xl border border-ink-200 dark:border-ink-800 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-ink-200 dark:border-ink-800">
              <Search className="w-4 h-4 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="搜索商品、资讯、辩论、页面..."
                className="flex-1 bg-transparent text-sm outline-none"
                autoFocus
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-ink-100 dark:bg-ink-800 text-ink-500">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
              <button onClick={() => setOpen(false)} className="sm:hidden p-1 rounded hover:bg-ink-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div ref={listRef} className="max-h-[55vh] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-ink-500 text-sm">
                  没有匹配的结果
                </div>
              ) : (
                grouped.map(([group, list]) => (
                  <div key={group} className="mb-2">
                    <p className="text-[10px] uppercase tracking-wider text-ink-400 px-2 py-1">
                      {group}
                    </p>
                    {list.map((it) => {
                      const idx = filtered.indexOf(it)
                      const active = idx === activeIdx
                      return (
                        <button
                          key={it.id}
                          onClick={() => runItem(it)}
                          onMouseEnter={() => setActiveIdx(idx)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-sm transition',
                            active && 'bg-nova-50 dark:bg-nova-950/40 text-nova-600 dark:text-nova-300'
                          )}
                        >
                          <it.icon className="w-4 h-4 text-ink-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{it.title}</p>
                            {it.subtitle && (
                              <p className="text-[10px] text-ink-500 truncate">{it.subtitle}</p>
                            )}
                          </div>
                          {active && <ArrowRight className="w-3.5 h-3.5" />}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-2 border-t border-ink-200 dark:border-ink-800 flex items-center gap-3 text-[10px] text-ink-500">
              <span>↑↓ 导航</span>
              <span>↵ 选择</span>
              <span>esc 关闭</span>
              <span className="ml-auto">共 {filtered.length} 条结果</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
