import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

export function AIIndicator({
  loading,
  text = 'AI 正在思考…',
  className,
}: {
  loading: boolean
  text?: string
  className?: string
}) {
  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-nova-500/10 to-purple-500/10 text-xs',
            className
          )}
        >
          <span className="relative inline-flex">
            <span className="w-2 h-2 rounded-full bg-nova-500 animate-pulse" />
            <span className="absolute inset-0 w-2 h-2 rounded-full bg-nova-500 animate-ping opacity-50" />
          </span>
          <Sparkles className="w-3 h-3 text-nova-500" />
          <span className="text-nova-600 dark:text-nova-300 font-medium">{text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function AIThinkingDots({ className }: { className?: string }) {
  return (
    <div className={cn('flex gap-1 items-center', className)}>
      <span className="w-1.5 h-1.5 rounded-full bg-nova-500 animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

export function AIBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider',
        'bg-gradient-to-r from-nova-500 to-purple-500 text-white',
        className
      )}
    >
      <Sparkles className="w-2.5 h-2.5" />
      AI
    </span>
  )
}

export function AIErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-3 py-2 text-xs text-rose-600 dark:text-rose-300 flex items-center gap-2">
      <Loader2 className="w-3.5 h-3.5" />
      {message}
    </div>
  )
}
