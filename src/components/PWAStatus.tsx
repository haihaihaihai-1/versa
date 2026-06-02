import { motion, AnimatePresence } from 'framer-motion'
import { Download, RefreshCw, Wifi, WifiOff, X } from 'lucide-react'
import { usePWA } from '../hooks/usePWA'
import { cn } from '../lib/utils'

export function PWAStatus() {
  const { installPrompt, install, isOffline, updateAvailable, applyUpdate, swReady } = usePWA()

  return (
    <>
      {/* Offline pill */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg"
          >
            <WifiOff className="w-3 h-3" />
            离线模式 · 部分功能受限
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install prompt */}
      <AnimatePresence>
        {installPrompt && !isOffline && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 md:bottom-6 left-4 z-40 max-w-sm"
          >
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-nova-500 to-purple-500 text-white shadow-2xl">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">安装 Versa App</p>
                <p className="text-[10px] text-white/80">添加到主屏幕，离线也能用</p>
              </div>
              <button
                onClick={() => install()}
                className="px-3 py-1.5 rounded-full bg-white text-nova-600 text-xs font-bold hover:bg-white/90"
              >
                安装
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update available */}
      <AnimatePresence>
        {updateAvailable && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-20 md:bottom-6 right-4 z-40"
          >
            <button
              onClick={applyUpdate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 text-white shadow-2xl text-sm font-medium hover:bg-emerald-600"
            >
              <RefreshCw className="w-4 h-4" />
              新版本可用，点击更新
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tiny SW indicator (dev mode) */}
      {import.meta.env.DEV && swReady && (
        <div
          className={cn(
            'fixed bottom-2 right-2 z-30 w-2 h-2 rounded-full',
            isOffline ? 'bg-amber-500' : 'bg-emerald-500'
          )}
          title={isOffline ? '离线' : '在线 + SW'}
        />
      )}
    </>
  )
}
