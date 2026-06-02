import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi, X } from 'lucide-react'

export function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [dismissed, setDismissed] = useState(false)
  const [wasOffline, setWasOffline] = useState(false)

  useEffect(() => {
    const onOnline = () => {
      setOnline(true)
    }
    const onOffline = () => {
      setOnline(false)
      setWasOffline(true)
      setDismissed(false)
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  // Show "back online" briefly when reconnecting
  const show = !online || (wasOffline && online && !dismissed) || (!online && !dismissed)

  return (
    <AnimatePresence>
      {show && !online && (
        <motion.div
          key="offline"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          className="fixed top-0 inset-x-0 z-40 bg-gradient-to-r from-debate-600 to-debate-700 text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <WifiOff className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">当前处于离线模式</p>
                <p className="text-xs text-white/80 truncate">
                  你可以继续浏览已缓存的页面，新操作将在恢复网络后同步
                </p>
              </div>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 p-1 rounded hover:bg-white/20 transition"
              aria-label="关闭提示"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
      {show && online && wasOffline && !dismissed && (
        <motion.div
          key="online"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 200 }}
          onAnimationComplete={() => {
            // Auto-dismiss after 3s
            setTimeout(() => setDismissed(true), 3000)
          }}
          className="fixed top-0 inset-x-0 z-40 bg-gradient-to-r from-shop-500 to-news-500 text-white shadow-lg"
          role="status"
          aria-live="polite"
        >
          <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Wifi className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium truncate">
                网络已恢复 ✨
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="flex-shrink-0 p-1 rounded hover:bg-white/20 transition"
              aria-label="关闭提示"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
