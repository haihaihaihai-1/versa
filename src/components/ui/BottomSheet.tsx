import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  maxHeight?: string
}

export function BottomSheet({ open, onClose, title, children, className, maxHeight = '85vh' }: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      {/* Sheet */}
      <div
        className={cn(
          'relative w-full sm:max-w-2xl bg-white dark:bg-ink-900 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 sm:zoom-in-95',
          className
        )}
        style={{ maxHeight }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-2 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-ink-300 dark:bg-ink-700" />
        </div>
        {title && (
          <div className="px-5 py-3 border-b border-ink-100 dark:border-ink-800 flex items-center justify-between flex-shrink-0">
            <h3 className="text-base font-bold">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-ink-100 dark:hover:bg-ink-800 flex items-center justify-center"
              aria-label="关闭"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  )
}
