import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, Newspaper, Scale, ShoppingBag, User, Plus, Bell, MessageCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../api/AuthContext'
import { useUnreadCount } from '../../api/hooks'

const ITEMS_LOGGED_OUT = [
  { to: '/', label: '首页', icon: Home, end: true },
  { to: '/news', label: '资讯', icon: Newspaper },
  { to: '/debates', label: '辩论', icon: Scale },
  { to: '/shop', label: '购物', icon: ShoppingBag },
  { to: '/auth', label: '我的', icon: User },
]

const ITEMS_LOGGED_IN = [
  { to: '/feed', label: '动态', icon: Home },
  { to: '/search', label: '发现', icon: Newspaper },
  { to: '/compose', label: '发帖', icon: Plus, isCompose: true },
  { to: '/messages', label: '消息', icon: MessageCircle },
  { to: '/profile', label: '我的', icon: User },
]

export function MobileNav() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const unread = useUnreadCount()
  const navigate = useNavigate()
  const ITEMS = user ? ITEMS_LOGGED_IN : ITEMS_LOGGED_OUT

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-ink-200/60 dark:border-ink-800/60 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {ITEMS.map((item: any) => {
          const active = item.end ? pathname === item.to : pathname.startsWith(item.to)

          if (item.isCompose) {
            return (
              <button
                key={item.to}
                onClick={() => navigate(item.to)}
                className="flex flex-col items-center justify-center -mt-5"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-nova-500 via-rose-500 to-shop-500 shadow-lg shadow-nova-500/40 flex items-center justify-center text-white">
                  <item.icon className="w-6 h-6" />
                </div>
              </button>
            )
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                'flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors relative',
                active ? 'text-nova-600 dark:text-nova-400' : 'text-ink-500 dark:text-ink-400'
              )}
            >
              <div className="relative">
                <item.icon className={cn('w-5 h-5 transition-transform', active && 'scale-110')} />
                {item.to === '/messages' && unread.messages > 0 && (
                  <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unread.messages > 9 ? '9+' : unread.messages}
                  </span>
                )}
                {active && <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-nova-500" />}
              </div>
              {item.label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
