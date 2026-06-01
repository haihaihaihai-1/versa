import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  Newspaper, Scale, ShoppingBag, Sun, Moon, Monitor,
  ShoppingCart, User, Bell, LogOut, Settings, ChevronDown, Sparkles,
} from 'lucide-react'
import { useVersa, versa } from '../../store/versa'
import { useScrollPosition } from '../../hooks/useScrollPosition'
import { useCartTotals } from '../../store/versa'
import { cn } from '../../lib/utils'

const NAV_ITEMS = [
  { to: '/', label: '首页', end: true },
  { to: '/news', label: '资讯', icon: Newspaper },
  { to: '/debates', label: '辩论', icon: Scale },
  { to: '/shop', label: '购物', icon: ShoppingBag },
  { to: '/about', label: '关于' },
]

export function Header() {
  const { user, preferences } = useVersa()
  const { cartCount } = useCartTotals()
  const scrollY = useScrollPosition()
  const navigate = useNavigate()
  const [themeOpen, setThemeOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const themeRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const themeIcon = preferences.theme === 'light' ? <Sun className="w-4 h-4" /> : preferences.theme === 'dark' ? <Moon className="w-4 h-4" /> : <Monitor className="w-4 h-4" />

  return (
    <header
      className={cn(
        'fixed top-0 inset-x-0 z-50 transition-all duration-300',
        scrollY > 12
          ? 'glass border-b border-ink-200/60 dark:border-ink-800/60 shadow-sm'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-nova-400 via-debate-500 to-shop-500 shadow-lg shadow-nova-500/30 group-hover:scale-105 transition-transform">
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-base">
                V
              </div>
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-shop-400 ring-2 ring-white dark:ring-ink-950 animate-pulse" />
            </div>
            <div className="hidden sm:flex flex-col leading-none">
              <span className="font-bold text-base tracking-tight">Versa</span>
              <span className="text-[10px] text-ink-500 dark:text-ink-400 mt-0.5">三体融合</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'relative px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'text-nova-600 dark:text-nova-400'
                      : 'text-ink-700 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-nova-500" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate('/shop')}
              className="hidden sm:flex relative h-9 w-9 items-center justify-center rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
              aria-label="搜索"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-debate-500" />
            </button>

            <div ref={themeRef} className="relative">
              <button
                onClick={() => setThemeOpen((v) => !v)}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                aria-label="主题"
              >
                {themeIcon}
              </button>
              {themeOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-xl overflow-hidden z-50">
                  {[
                    { v: 'light', label: '浅色', icon: Sun },
                    { v: 'dark', label: '深色', icon: Moon },
                    { v: 'system', label: '跟随系统', icon: Monitor },
                  ].map((t) => (
                    <button
                      key={t.v}
                      onClick={() => { versa.setTheme(t.v as any); setThemeOpen(false) }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-ink-100 dark:hover:bg-ink-800',
                        preferences.theme === t.v && 'bg-nova-50 dark:bg-nova-900/30 text-nova-600 dark:text-nova-400'
                      )}
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => navigate('/cart')}
              className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
              aria-label="购物车"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-debate-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            <div ref={profileRef} className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="ml-1 h-9 flex items-center gap-2 pl-1 pr-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
              >
                <img src={user.avatar} alt={user.displayName} className="w-7 h-7 rounded-full ring-2 ring-white dark:ring-ink-800" />
                <ChevronDown className="w-3.5 h-3.5 hidden sm:block" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-xl overflow-hidden z-50">
                  <div className="p-4 border-b border-ink-100 dark:border-ink-800">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar} alt={user.displayName} className="w-10 h-10 rounded-full" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{user.displayName}</div>
                        <div className="text-xs text-ink-500 dark:text-ink-400 truncate">@{user.username}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-1 text-xs">
                      <Sparkles className="w-3 h-3 text-nova-500" />
                      <span className="text-ink-500">声誉</span>
                      <span className="font-bold">{user.reputation}</span>
                    </div>
                  </div>
                  <div className="py-1">
                    {[
                      { to: '/profile', label: '个人中心', icon: User },
                      { to: '/profile/orders', label: '我的订单', icon: ShoppingBag },
                      { to: '/profile/settings', label: '偏好设置', icon: Settings },
                    ].map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800"
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-ink-100 dark:border-ink-800 p-1">
                    <button
                      onClick={() => { if (confirm('确定重置所有数据？')) { versa.reset(); setProfileOpen(false); navigate('/') } }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-debate-600"
                    >
                      <LogOut className="w-4 h-4" />
                      重置数据
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
