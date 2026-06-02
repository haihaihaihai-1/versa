import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import {
  Home, Newspaper, Scale, ShoppingBag, Sun, Moon, Monitor,
  ShoppingCart, User, Bell, LogOut, Settings, ChevronDown, Sparkles,
  Search, Plus, MessageCircle, Users, Shield, Calendar, FileText,
  StickyNote, Video, Palette, LayoutDashboard, Inbox, Vote, Hash, Heart, Ticket,
  Package, Mail, MessageSquare, Truck, GitCompare, BarChart3, Trophy, Gift, Scissors, BookOpen, Building, Image,
} from 'lucide-react'
import { versa, useVersa, useCartTotals } from '../../store/versa'
import { useScrollPosition } from '../../hooks/useScrollPosition'
import { useAuth } from '../../api/AuthContext'
import { useUnreadCount } from '../../api/hooks'
import { cn } from '../../lib/utils'
import { ThemeSwitcher } from '../ThemeSwitcher'
import { LanguageSwitcher } from '../i18n'
import { NotificationBell, NotificationCenter } from '../NotificationCenter'

const NAV_ITEMS = [
  { to: '/feed', label: '动态', icon: Home, requireAuth: false },
  { to: '/news', label: '资讯', icon: Newspaper, requireAuth: false },
  { to: '/debates', label: '辩论', icon: Scale, requireAuth: false },
  { to: '/shop', label: '购物', icon: ShoppingBag, requireAuth: false },
  { to: '/groups', label: '群组', icon: Users, requireAuth: false },
]

export function Header() {
  const { user, signOut } = useAuth()
  const { preferences } = useVersa()
  const { cartCount } = useCartTotals()
  const unread = useUnreadCount()
  const scrollY = useScrollPosition()
  const navigate = useNavigate()
  const [themeOpen, setThemeOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
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
              <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-base">V</div>
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
                className={({ isActive }) =>
                  cn(
                    'relative px-3.5 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5',
                    isActive
                      ? 'text-nova-600 dark:text-nova-400 bg-nova-50 dark:bg-nova-900/30'
                      : 'text-ink-700 dark:text-ink-300 hover:text-ink-900 dark:hover:text-white hover:bg-ink-100 dark:hover:bg-ink-800'
                  )
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => navigate('/search')}
              className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
              aria-label="搜索"
            >
              <Search className="w-4 h-4" />
            </button>

            {user ? (
              <>
                <button
                  onClick={() => navigate('/compose')}
                  className="hidden sm:flex h-9 px-3 items-center gap-1.5 rounded-lg bg-gradient-to-r from-nova-500 to-rose-500 text-white text-sm font-medium hover:shadow-lg hover:shadow-nova-500/30 transition-shadow"
                >
                  <Plus className="w-4 h-4" />
                  发帖
                </button>

                <NotificationBell onClick={() => setNotifOpen(true)} />

                <button
                  onClick={() => navigate('/messages')}
                  className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                  aria-label="消息"
                >
                  <MessageCircle className="w-4 h-4" />
                  {unread.messages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unread.messages > 99 ? '99+' : unread.messages}
                    </span>
                  )}
                </button>
              </>
            ) : null}

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

            <ThemeSwitcher />
            <LanguageSwitcher />

            {user ? (
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
                    <div className="p-4 border-b border-ink-100 dark:border-ink-800 bg-gradient-to-br from-nova-50 to-rose-50 dark:from-nova-900/30 dark:to-rose-900/30">
                      <Link to={`/u/${user.username}`} onClick={() => setProfileOpen(false)} className="flex items-center gap-3">
                        <img src={user.avatar} alt={user.displayName} className="w-10 h-10 rounded-full ring-2 ring-white" />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold truncate">{user.displayName}</div>
                          <div className="text-xs text-ink-500 dark:text-ink-400 truncate">@{user.username}</div>
                        </div>
                      </Link>
                      <div className="mt-3 flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-nova-500" />
                          <span className="text-ink-500">声誉</span>
                          <span className="font-bold">{user.reputation}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-ink-500" />
                          <span className="text-ink-500">关注者</span>
                          <span className="font-bold">{user.followers.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="py-1">
                      {[
                        { to: '/profile', label: '个人中心', icon: User },
                        { to: '/profile/orders', label: '我的订单', icon: ShoppingBag },
                        { to: '/settings', label: '账号设置', icon: Settings },
                        { to: '/dashboard', label: '工作台', icon: LayoutDashboard },
                        { to: '/my-content', label: '我的内容', icon: Inbox },
                        { to: '/orders', label: '购买记录', icon: Package },
                        { to: '/inbox', label: '站内信', icon: Mail },
                        { to: '/forum', label: '社区论坛', icon: MessageSquare },
                        { to: '/tracker', label: '物流跟踪', icon: Truck },
                        { to: '/ai-writer', label: 'AI 写作', icon: Sparkles },
                        { to: '/smartlist', label: '智能清单', icon: Sparkles },
                        { to: '/calendar', label: '我的日程', icon: Calendar },
                        { to: '/notes', label: '笔记', icon: FileText },
                        { to: '/quicknotes', label: '便签墙', icon: StickyNote },
                        { to: '/live-subs', label: '直播订阅', icon: Video },
                        { to: '/live-calendar', label: '直播日历', icon: Calendar },
                        { to: '/theme', label: '主题定制', icon: Palette },
                        { to: '/polls', label: '投票广场', icon: Vote },
                        { to: '/tags', label: '热门标签', icon: Hash },
                        { to: '/users', label: '发现用户', icon: Users },
                        { to: '/wishlist-folders', label: '收藏夹', icon: Heart },
                        { to: '/coupons', label: '优惠券', icon: Ticket },
                        { to: '/discover', label: '全局搜索', icon: Search },
                        { to: '/compare', label: '商品对比', icon: GitCompare },
                        { to: '/creator-studio', label: '创作中心', icon: BarChart3 },
                        { to: '/gift-leaderboard', label: '礼物榜', icon: Trophy },
                        { to: '/debate-leaderboard', label: '辩论榜', icon: Scale },
                        { to: '/redpacket', label: '直播红包', icon: Gift },
                        { to: '/groupbuy', label: '超级拼团', icon: Users },
                        { to: '/qa-v2', label: '商品问答', icon: MessageCircle },
                        { to: '/live-pk', label: '主播 PK', icon: Trophy },
                        { to: '/academy', label: '创作者学院', icon: BookOpen },
                        { to: '/live-shop', label: '直播橱窗', icon: ShoppingBag },
                        { to: '/replay-editor', label: '回放剪辑', icon: Scissors },
                        { to: '/merchant', label: '商家入驻', icon: Building },
                        { to: '/invite-v2', label: '邀请 2.0', icon: Gift },
                        { to: '/video-comments', label: '视频评论', icon: MessageCircle },
                        { to: '/danmaku-sentiment', label: '弹幕情感', icon: Sparkles },
                        { to: '/revenue-calendar', label: '收益日历', icon: Calendar },
                        { to: '/cart-suggestions', label: '购物助手', icon: ShoppingCart },
                        { to: '/privacy', label: '隐私设置', icon: Shield },
                        { to: '/journey', label: '我的旅程', icon: BookOpen },
                        { to: '/gallery', label: '图集欣赏', icon: Image },
                        { to: '/brand-story', label: '品牌故事', icon: BookOpen },
                        { to: '/tools/social', label: '社交工具集', icon: Users },
                        { to: '/tools/personal', label: '个性化中心', icon: Palette },
                        { to: '/tools/creator', label: '创作者中心', icon: Users },
                        { to: '/tools/life', label: '生活中心', icon: LayoutDashboard },
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
                      {(user.role === 'admin' || user.role === 'auditor') && (
                        <Link
                          to="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-ink-100 dark:hover:bg-ink-800 text-nova-600"
                        >
                          <Shield className="w-4 h-4" />
                          管理后台
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-ink-100 dark:border-ink-800 p-1">
                      <button
                        onClick={async () => { await signOut(); setProfileOpen(false); navigate('/auth') }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-debate-600"
                      >
                        <LogOut className="w-4 h-4" />
                        退出登录
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/auth"
                className="ml-1 h-9 px-4 flex items-center gap-1.5 rounded-lg bg-nova-500 text-white text-sm font-medium hover:bg-nova-600 transition-colors"
              >
                登录
              </Link>
            )}
          </div>
        </div>
      </div>
      <NotificationCenter
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onNavigate={(link) => navigate(link)}
      />
    </header>
  )
}
