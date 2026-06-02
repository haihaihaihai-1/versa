import { cn } from '../lib/utils'

interface Props {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

export function Skeleton({ className, variant = 'rectangular', width, height }: Props) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gradient-to-r from-ink-200/60 via-ink-100/40 to-ink-200/60 dark:from-ink-800/60 dark:via-ink-700/40 dark:to-ink-800/60',
        'bg-[length:200%_100%] animate-shimmer',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-xl',
        variant === 'text' && 'rounded-md h-4',
        className
      )}
      style={{
        width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      }}
    />
  )
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className="h-3"
          width={i === lines - 1 ? '70%' : '100%'}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-2xl bg-white dark:bg-ink-900 border border-ink-200/40 dark:border-ink-800/40 p-3 space-y-3', className)}>
      <Skeleton className="w-full aspect-square" />
      <Skeleton variant="text" width="80%" />
      <Skeleton variant="text" width="50%" />
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/80 dark:bg-ink-900/60">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="40%" height={10} />
          </div>
        </div>
      ))}
    </div>
  )
}
