import { motion, AnimatePresence } from 'framer-motion'
import { X, Keyboard } from 'lucide-react'

type Shortcut = { key: string; label: string; desc: string }

const SHORTCUTS: Shortcut[] = [
  { key: '?', label: '?', desc: '显示/隐藏本帮助' },
  { key: 'esc', label: 'Esc', desc: '关闭弹窗' },
  { key: 'g h', label: 'g', desc: '+ h  →  首页' },
  { key: 'g s', label: 'g', desc: '+ s  →  商城' },
  { key: 'g d', label: 'g', desc: '+ d  →  辩论' },
  { key: 'g n', label: 'g', desc: '+ n  →  资讯' },
  { key: 'g c', label: 'g', desc: '+ c  →  购物车' },
  { key: 'g f', label: 'g', desc: '+ f  →  为你推荐' },
  { key: 'g /', label: 'g', desc: '+ /  →  全局搜索' },
  { key: 'g u', label: 'g', desc: '+ u  →  我的主页' },
  { key: 'g k', label: 'g', desc: '+ k  →  签到' },
  { key: 'g a', label: 'g', desc: '+ a  →  管理员' },
]

export function KeyboardShortcutsHelp({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-ink-900 rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-nova-500 to-nova-700 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Keyboard className="w-6 h-6" />
                <h2 className="text-xl font-bold">键盘快捷键</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-white/20 transition"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                {SHORTCUTS.map((s) => (
                  <div
                    key={s.key}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800 transition"
                  >
                    <span className="text-sm text-ink-600 dark:text-ink-300">
                      {s.desc}
                    </span>
                    {s.key.includes(' ') ? (
                      <div className="flex items-center gap-1">
                        {s.key.split(' ').map((k, i) => (
                          <span key={i} className="flex items-center gap-1">
                            <kbd className="px-2 py-0.5 text-xs font-mono font-bold bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 rounded border border-ink-200 dark:border-ink-700">
                              {k === 'esc' ? 'Esc' : k}
                            </kbd>
                            {i === 0 && (
                              <span className="text-ink-400 text-xs">然后</span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <kbd className="px-2 py-0.5 text-xs font-mono font-bold bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-200 rounded border border-ink-200 dark:border-ink-700">
                        {s.label}
                      </kbd>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-nova-50 dark:bg-nova-950/30 text-xs text-nova-700 dark:text-nova-300">
                💡 提示：在输入框内不会触发快捷键，按 <kbd className="font-bold">?</kbd> 随时打开本帮助。
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
