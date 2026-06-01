import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '../../lib/utils'

type ToastType = 'success' | 'error' | 'info'
interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

let externalAdd: ((t: Omit<Toast, 'id'>) => void) | null = null

export function toast(message: string, type: ToastType = 'info', duration = 2500) {
  externalAdd?.({ type, message, duration })
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const add = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, ...t }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, t.duration ?? 2500)
  }, [])

  useEffect(() => {
    externalAdd = add
    return () => {
      externalAdd = null
    }
  }, [add])

  return (
    <div className="fixed top-20 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border',
            'bg-white dark:bg-ink-900 border-ink-200 dark:border-ink-800',
            'animate-in slide-in-from-right fade-in duration-200'
          )}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-shop-500" />}
          {t.type === 'error' && <AlertCircle className="w-5 h-5 text-debate-500" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-nova-500" />}
          <span className="text-sm font-medium">{t.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
            className="ml-2 text-ink-400 hover:text-ink-700 dark:hover:text-ink-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
