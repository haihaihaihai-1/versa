import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'

interface TabsProps {
  tabs: { value: string; label: string; icon?: React.ReactNode; count?: number }[]
  value: string
  onChange: (v: string) => void
  variant?: 'default' | 'pills' | 'underline'
  className?: string
}

export function Tabs({ tabs, value, onChange, variant = 'default', className }: TabsProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [indicator, setIndicator] = useState({ left: 0, width: 0 })
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const c = containerRef.current.getBoundingClientRect()
      const a = activeRef.current.getBoundingClientRect()
      setIndicator({ left: a.left - c.left, width: a.width })
    }
  }, [value, tabs])

  if (variant === 'pills') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {tabs.map((t) => (
          <button
            key={t.value}
            ref={value === t.value ? activeRef : null}
            onClick={() => onChange(t.value)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all',
              value === t.value
                ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900 shadow-md'
                : 'bg-ink-100 text-ink-600 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700'
            )}
          >
            {t.icon}
            {t.label}
            {typeof t.count === 'number' && (
              <span className={cn(
                'ml-1 text-xs px-1.5 rounded-full',
                value === t.value ? 'bg-white/20 dark:bg-ink-900/20' : 'bg-ink-200/60 dark:bg-ink-700/60'
              )}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }

  if (variant === 'underline') {
    return (
      <div ref={containerRef} className={cn('relative flex gap-1 border-b border-ink-200 dark:border-ink-800', className)}>
        {tabs.map((t) => (
          <button
            key={t.value}
            ref={value === t.value ? activeRef : null}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium transition-colors',
              value === t.value ? 'text-nova-600 dark:text-nova-400' : 'text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100'
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {t.icon}
              {t.label}
              {typeof t.count === 'number' && (
                <span className="text-xs text-ink-400">({t.count})</span>
              )}
            </span>
          </button>
        ))}
        <div
          className="absolute bottom-0 h-0.5 bg-nova-500 transition-all duration-300 rounded-full"
          style={{ left: indicator.left, width: indicator.width }}
        />
      </div>
    )
  }

  return null
}
