import { NavLink, useLocation } from 'react-router-dom'
import { Home, Newspaper, Scale, ShoppingBag, User } from 'lucide-react'
import { cn } from '../../lib/utils'

const ITEMS = [
  { to: '/', label: '首页', icon: Home, end: true },
  { to: '/news', label: '资讯', icon: Newspaper },
  { to: '/debates', label: '辩论', icon: Scale },
  { to: '/shop', label: '购物', icon: ShoppingBag },
  { to: '/profile', label: '我的', icon: User },
]

export function MobileNav() {
  const { pathname } = useLocation()
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-ink-200/60 dark:border-ink-800/60 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {ITEMS.map((item) => {
          const active = item.end ? pathname === item.to : pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={cn(
                'flex flex-col items-center justify-center py-2.5 gap-0.5 text-[10px] font-medium transition-colors',
                active ? 'text-nova-600 dark:text-nova-400' : 'text-ink-500 dark:text-ink-400'
              )}
            >
              <div className="relative">
                <item.icon className={cn('w-5 h-5 transition-transform', active && 'scale-110')} />
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
