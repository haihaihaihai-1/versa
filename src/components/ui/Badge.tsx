import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'default' | 'nova' | 'news' | 'debate' | 'shop' | 'outline'

const variants: Record<Variant, string> = {
  default: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200',
  nova: 'bg-nova-100 text-nova-700 dark:bg-nova-900/40 dark:text-nova-200',
  news: 'bg-news-500/15 text-news-600 dark:text-news-500',
  debate: 'bg-debate-500/15 text-debate-600 dark:text-debate-500',
  shop: 'bg-shop-500/15 text-shop-600 dark:text-shop-500',
  outline: 'border border-ink-300 dark:border-ink-700 text-ink-600 dark:text-ink-300',
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  className,
}: {
  children: ReactNode
  variant?: Variant
  size?: 'sm' | 'md'
  icon?: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        variants[variant],
        className
      )}
    >
      {icon}
      {children}
    </span>
  )
}
