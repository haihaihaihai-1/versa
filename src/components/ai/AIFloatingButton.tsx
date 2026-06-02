import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { AIPanel } from './AIPanel'

interface Props {
  systemPrompt: string
  title?: string
  className?: string
}

export function AIFloatingButton({ systemPrompt, title, className }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full',
          'bg-gradient-to-br from-nova-500 via-purple-500 to-pink-500',
          'text-white shadow-2xl flex items-center justify-center',
          'hover:shadow-nova-500/50 transition-shadow',
          className
        )}
        aria-label="打开 AI 助手"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
            >
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="relative"
            >
              <Sparkles className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
      <AIPanel
        open={open}
        onClose={() => setOpen(false)}
        title={title || 'AI 助手'}
        systemPrompt={systemPrompt}
      />
    </>
  )
}
