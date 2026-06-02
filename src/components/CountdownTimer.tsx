import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '../lib/utils'

interface Props {
  target: string | Date
  className?: string
  onComplete?: () => void
  size?: 'sm' | 'md' | 'lg'
  showLabels?: boolean
  variant?: 'default' | 'urgent' | 'gradient'
}

function diff(target: Date) {
  const ms = target.getTime() - Date.now()
  if (ms <= 0) return { d: 0, h: 0, m: 0, s: 0, done: true }
  return {
    d: Math.floor(ms / 86400000),
    h: Math.floor((ms % 86400000) / 3600000),
    m: Math.floor((ms % 3600000) / 60000),
    s: Math.floor((ms % 60000) / 1000),
    done: false,
  }
}

export function CountdownTimer({ target, className, onComplete, size = 'md', showLabels = true, variant = 'default' }: Props) {
  const t = typeof target === 'string' ? new Date(target) : target
  const [d, setD] = useState(() => diff(t))

  useEffect(() => {
    const id = setInterval(() => {
      const nd = diff(t)
      setD(nd)
      if (nd.done) {
        onComplete?.()
        clearInterval(id)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [t, onComplete])

  const sizeCls = {
    sm: { box: 'w-12 h-12', num: 'text-lg', lbl: 'text-[9px]' },
    md: { box: 'w-16 h-16', num: 'text-2xl', lbl: 'text-[10px]' },
    lg: { box: 'w-20 h-20', num: 'text-4xl', lbl: 'text-xs' },
  }[size]

  const variantCls = {
    default: 'bg-white/10 backdrop-blur border border-white/20 text-white',
    urgent: 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/40',
    gradient: 'bg-gradient-to-br from-nova-500 via-purple-500 to-pink-500 text-white',
  }[variant]

  const units = [
    { v: d.d, l: '天' },
    { v: d.h, l: '时' },
    { v: d.m, l: '分' },
    { v: d.s, l: '秒' },
  ]

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      {units.map((u, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <motion.div
            key={u.v}
            initial={{ scale: 1.15, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className={cn(
              sizeCls.box,
              'rounded-2xl flex flex-col items-center justify-center',
              variantCls
            )}
          >
            <span className={cn(sizeCls.num, 'font-black font-mono tabular-nums leading-none')}>
              {u.v.toString().padStart(2, '0')}
            </span>
            {showLabels && (
              <span className={cn(sizeCls.lbl, 'opacity-80 mt-0.5')}>{u.l}</span>
            )}
          </motion.div>
          {i < units.length - 1 && (
            <span className="text-xl font-bold opacity-60 self-start mt-2">:</span>
          )}
        </div>
      ))}
    </div>
  )
}
