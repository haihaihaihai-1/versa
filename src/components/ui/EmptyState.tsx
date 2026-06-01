import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6',
        'rounded-2xl border border-dashed border-ink-200 dark:border-ink-800',
        'bg-ink-50/50 dark:bg-ink-900/40',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-nova-100 dark:bg-nova-900/30 text-nova-600 dark:text-nova-400 flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-500 dark:text-ink-400 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}
