import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../../lib/utils'

export function SearchBar({
  value,
  onChange,
  placeholder = '搜索...',
  onSubmit,
  className,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  onSubmit?: (v: string) => void
  className?: string
  autoFocus?: boolean
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
      <input
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSubmit?.(value)}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-4 rounded-xl bg-ink-100 dark:bg-ink-800/60 border border-transparent focus:border-nova-500 focus:bg-white dark:focus:bg-ink-800 outline-none text-sm transition-all"
      />
    </div>
  )
}

export function useDebounce<T>(value: T, delay = 200): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}
