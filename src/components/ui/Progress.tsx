import { cn } from '../../lib/utils'
import { Sparkles, Flame, Star, type LucideIcon } from 'lucide-react'

interface ProgressBarProps {
  value: number
  max?: number
  variant?: 'nova' | 'debate' | 'success' | 'gradient'
  showLabel?: boolean
  height?: 'sm' | 'md' | 'lg' | 'xs'
  className?: string
}

const variants = {
  nova: 'bg-nova-500',
  debate: 'bg-debate-500',
  success: 'bg-shop-500',
  gradient: 'bg-gradient-to-r from-nova-500 via-debate-500 to-shop-500',
}

export function ProgressBar({ value, max = 100, variant = 'nova', showLabel, height = 'md', className }: ProgressBarProps) {
  const heights = { xs: 'h-0.5', sm: 'h-1', md: 'h-2', lg: 'h-3' }
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cn('w-full bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden', heights[height], className)}>
      <div
        className={cn('h-full rounded-full transition-all duration-700 ease-out', variants[variant])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function DivergingBar({
  left,
  right,
  leftColor = 'bg-nova-500',
  rightColor = 'bg-debate-500',
  className,
}: {
  left: number
  right: number
  leftColor?: string
  rightColor?: string
  className?: string
}) {
  const total = left + right || 1
  const leftP = (left / total) * 100
  const rightP = (right / total) * 100
  return (
    <div className={cn('flex w-full h-2 rounded-full overflow-hidden bg-ink-100 dark:bg-ink-800', className)}>
      <div className={cn('h-full transition-all duration-500', leftColor)} style={{ width: `${leftP}%` }} />
      <div className={cn('h-full transition-all duration-500', rightColor)} style={{ width: `${rightP}%` }} />
    </div>
  )
}

export function ScorePill({ icon, label, value, variant = 'nova' }: { icon?: LucideIcon; label: string; value: number | string; variant?: 'nova' | 'news' | 'debate' | 'shop' }) {
  const colors = {
    nova: 'bg-nova-100 text-nova-700 dark:bg-nova-900/40 dark:text-nova-300',
    news: 'bg-news-500/15 text-news-600 dark:text-news-500',
    debate: 'bg-debate-500/15 text-debate-600 dark:text-debate-500',
    shop: 'bg-shop-500/15 text-shop-600 dark:text-shop-500',
  }
  const Icon = icon
  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', colors[variant])}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}: <span className="font-bold">{value}</span>
    </div>
  )
}
