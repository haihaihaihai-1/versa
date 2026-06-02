import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/utils'
import {
  Home, Search, ArrowLeft, RefreshCw, Wifi, Server, Hammer,
  Sparkles, MapPin, BookOpen, ShoppingBag, MessageCircle, Compass,
  Compass as CompassIcon
} from 'lucide-react'

interface Props {
  mode?: '404' | '500' | '503' | 'offline'
}

const POPULAR_PAGES = [
  { label: '首页', path: '/', icon: Home, gradient: 'from-cyan-400 to-blue-500' },
  { label: '商城', path: '/shop', icon: ShoppingBag, gradient: 'from-rose-400 to-pink-500' },
  { label: '资讯', path: '/news', icon: BookOpen, gradient: 'from-amber-400 to-orange-500' },
  { label: '辩论', path: '/debates', icon: MessageCircle, gradient: 'from-violet-400 to-purple-500' },
  { label: '直播', path: '/shop/live', icon: Sparkles, gradient: 'from-emerald-400 to-teal-500' },
  { label: '心愿单', path: '/profile/wishlist', icon: MapPin, gradient: 'from-fuchsia-400 to-pink-500' },
]

const TIPS = [
  '💡 Versa 上有 12,000+ 商品在售',
  '🎁 618 大促进行中，满 300 减 50',
  '🆕 新人首单立减 ¥30',
  '⭐ 邀请好友最高得 ¥5000',
]

const CONFIG = {
  '404': {
    code: '404',
    title: '页面在 Versa 三维中迷失了',
    subtitle: '也许是链接失效了，或者这里从未存在过',
    icon: Compass,
    gradient: 'from-nova-500 via-purple-500 to-pink-500',
    suggestion: '不妨去这些地方逛逛',
  },
  '500': {
    code: '500',
    title: '服务器开小差了',
    subtitle: '我们的工程师正在紧急处理中，请稍后再试',
    icon: Server,
    gradient: 'from-rose-500 via-orange-500 to-amber-500',
    suggestion: '您可以尝试以下操作',
  },
  '503': {
    code: '503',
    title: '系统维护中',
    subtitle: '为了提供更好的体验，Versa 正在升级中',
    icon: Hammer,
    gradient: 'from-amber-500 via-orange-500 to-rose-500',
    suggestion: '预计 30 分钟后恢复正常',
  },
  'offline': {
    code: 'OFFLINE',
    title: '网络连接已断开',
    subtitle: '请检查您的网络连接，Versa 正在等待您的归来',
    icon: Wifi,
    gradient: 'from-slate-500 via-zinc-500 to-ink-500',
    suggestion: '重新连接后页面会自动恢复',
  },
}

export function NotFoundPage({ mode = '404' }: Props) {
  const navigate = useNavigate()
  const cfg = CONFIG[mode]
  const Icon = cfg.icon
  const [tipIndex, setTipIndex] = useState(0)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 4000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (mode === 'offline') {
      const t = setInterval(() => setTick((n) => n + 1), 3000)
      return () => clearInterval(t)
    }
  }, [mode])

  // Auto-reload for offline mode
  useEffect(() => {
    if (mode !== 'offline') return
    const handler = () => window.location.reload()
    window.addEventListener('online', handler)
    return () => window.removeEventListener('online', handler)
  }, [mode])

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 -z-10">
        <div className={cn(
          'absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20 bg-gradient-to-br',
          cfg.gradient
        )} />
        <div className={cn(
          'absolute bottom-1/4 -right-32 w-96 h-96 rounded-full blur-3xl opacity-20 bg-gradient-to-br',
          cfg.gradient
        )} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="max-w-2xl w-full text-center">
        {/* Floating icon */}
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [0, -3, 3, 0],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-6"
        >
          <div className={cn(
            'inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br text-white shadow-2xl',
            cfg.gradient
          )}>
            <Icon className="w-10 h-10" />
          </div>
        </motion.div>

        {/* Code */}
        <motion.h1
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className={cn(
            'text-7xl md:text-9xl font-black mb-3 bg-gradient-to-br bg-clip-text text-transparent tracking-tighter',
            cfg.gradient
          )}
        >
          {cfg.code}
        </motion.h1>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-2">{cfg.title}</h2>
          <p className="text-ink-500 dark:text-ink-400 max-w-md mx-auto">{cfg.subtitle}</p>
        </motion.div>

        {/* Tip ticker */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tipIndex + tick}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ink-100/60 dark:bg-ink-800/60 text-xs text-ink-600 dark:text-ink-300"
          >
            <Sparkles className="w-3 h-3" />
            {TIPS[tipIndex]}
          </motion.div>
        </AnimatePresence>

        {/* Action buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Button onClick={() => navigate(-1)} variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
            返回上一页
          </Button>
          <Link to="/">
            <Button leftIcon={<Home className="w-4 h-4" />}>回到首页</Button>
          </Link>
          {mode === 'offline' || mode === '500' ? (
            <Button
              onClick={() => window.location.reload()}
              variant="ghost"
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              {mode === 'offline' ? '重试连接' : '刷新页面'}
            </Button>
          ) : (
            <Link to="/discover">
              <Button variant="ghost" leftIcon={<Search className="w-4 h-4" />}>
                搜索内容
              </Button>
            </Link>
          )}
        </motion.div>

        {/* Suggestion section */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-12"
        >
          <p className="text-xs text-ink-500 mb-4 uppercase tracking-wider">{cfg.suggestion}</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {POPULAR_PAGES.map((p, i) => (
              <motion.div
                key={p.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              >
                <Link
                  to={p.path}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/70 dark:bg-ink-900/70 border border-ink-200/50 dark:border-ink-800/50 hover:scale-105 hover:shadow-lg transition group"
                >
                  <div className={cn(
                    'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center text-white group-hover:scale-110 transition',
                    p.gradient
                  )}>
                    <p.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium">{p.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Footer */}
        <p className="mt-12 text-[10px] text-ink-400">
          错误码 {cfg.code} · Versa · {new Date().toLocaleString('zh-CN')}
        </p>
      </div>
    </div>
  )
}

export function ServerErrorPage() {
  return <NotFoundPage mode="500" />
}

export function MaintenancePage() {
  return <NotFoundPage mode="503" />
}

export function OfflinePage() {
  return <NotFoundPage mode="offline" />
}
