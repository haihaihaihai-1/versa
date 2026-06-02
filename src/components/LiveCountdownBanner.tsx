import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CountdownTimer } from './CountdownTimer'

const EVENTS = [
  { id: '618', title: '618 购物节 · 全场满 300 减 50', target: () => {
    const d = new Date()
    d.setMonth(5, 18) // June 18
    if (d.getTime() < Date.now()) d.setFullYear(d.getFullYear() + 1)
    return d
  }, gradient: 'from-rose-500 via-pink-500 to-fuchsia-500', link: '/campaign' },
  { id: 'tech', title: '科技新品发布 · iPhone 16 系列', target: () => {
    const d = new Date()
    d.setHours(d.getHours() + 24) // 24h from now
    return d
  }, gradient: 'from-cyan-500 via-blue-500 to-violet-500', link: '/shop' },
]

const STORAGE_KEY = 'versa:countdown-banner-dismissed'

export function LiveCountdownBanner() {
  const [eventIdx] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [target, setTarget] = useState<Date | null>(null)

  useEffect(() => {
    setTarget(EVENTS[eventIdx].target())
    setDismissed(localStorage.getItem(STORAGE_KEY) === EVENTS[eventIdx].id)
  }, [eventIdx])

  if (!target || dismissed) return null
  const ev = EVENTS[eventIdx]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        className={`relative overflow-hidden bg-gradient-to-r ${ev.gradient} text-white`}
      >
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-10 left-1/3 w-40 h-40 rounded-full bg-white blur-2xl" />
          <div className="absolute -bottom-10 right-1/4 w-40 h-40 rounded-full bg-yellow-200 blur-2xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Zap className="w-4 h-4 fill-yellow-300 text-yellow-300" />
            <span className="text-sm font-bold">{ev.title}</span>
          </div>
          <CountdownTimer target={target} size="sm" showLabels={false} className="ml-auto sm:ml-0" />
          <Link
            to={ev.link}
            className="ml-auto sm:ml-2 px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur text-xs font-medium border border-white/30"
          >
            去看看 →
          </Link>
          <button
            onClick={() => {
              setDismissed(true)
              localStorage.setItem(STORAGE_KEY, ev.id)
            }}
            className="p-1 rounded-full hover:bg-white/20"
            aria-label="关闭"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
