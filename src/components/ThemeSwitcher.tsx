import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Palette, Check } from 'lucide-react'
import { useAccentTheme, ACCENT_PRESETS } from '../hooks/useAccentTheme'
import { cn } from '../lib/utils'

export function ThemeSwitcher() {
  const { theme, setTheme, current } = useAccentTheme()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-600 dark:text-ink-300 relative"
        title="切换主题"
        aria-label="切换主题"
      >
        <Palette className="w-4 h-4" />
        <span
          className={cn(
            'absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-gradient-to-br',
            current.gradient
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              className="absolute right-0 top-full mt-2 z-40 w-72 p-3 rounded-2xl bg-white dark:bg-ink-900 shadow-2xl border border-ink-200 dark:border-ink-800"
            >
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4" />
                <h3 className="font-semibold text-sm">主题色</h3>
                <span className="ml-auto text-[10px] text-ink-500">{current.description}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {ACCENT_PRESETS.map((p: typeof ACCENT_PRESETS[number]) => (
                  <button
                    key={p.key}
                    onClick={() => {
                      setTheme(p.key)
                      setOpen(false)
                    }}
                    className={cn(
                      'relative p-3 rounded-xl border-2 transition',
                      theme === p.key
                        ? 'border-ink-900 dark:border-white'
                        : 'border-transparent hover:border-ink-200 dark:hover:border-ink-700'
                    )}
                  >
                    <div
                      className={cn(
                        'w-full aspect-square rounded-lg bg-gradient-to-br mb-1.5 flex items-center justify-center text-2xl',
                        p.gradient
                      )}
                    >
                      {p.emoji}
                    </div>
                    <p className="text-[10px] font-medium">{p.name}</p>
                    {theme === p.key && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ink-900 dark:bg-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white dark:text-ink-900" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-ink-400 text-center">
                主题色实时应用到整个界面
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
