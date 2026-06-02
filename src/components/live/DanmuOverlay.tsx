import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

export interface Danmu {
  id: string
  text: string
  color?: string
  username?: string
  user?: string  // alias for username
  track?: 'top' | 'middle' | 'bottom'
}

interface Props {
  danmus: Danmu[]
  className?: string
  density?: 'low' | 'normal' | 'high'
}

const COLORS = [
  '#fff', '#FFD700', '#FF6B9D', '#A78BFA', '#60A5FA',
  '#34D399', '#FB923C', '#F472B6', '#22D3EE',
]

const TRACKS: Array<'top' | 'middle' | 'bottom'> = ['top', 'middle', 'bottom']

export function DanmuOverlay({ danmus, className, density = 'normal' }: Props) {
  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none overflow-hidden',
        className
      )}
    >
      {danmus.map((d, i) => (
        <DanmuItem
          key={d.id}
          danmu={d}
          track={d.track || TRACKS[i % 3]}
          speed={density === 'high' ? 6 : density === 'low' ? 14 : 9}
          topOffset={(d.track === 'top' ? 5 : d.track === 'middle' ? 45 : 80) + (i % 3) * 6}
        />
      ))}
    </div>
  )
}

function DanmuItem({
  danmu,
  speed,
  topOffset,
}: {
  danmu: Danmu
  track: string
  speed: number
  topOffset: number
}) {
  return (
    <motion.div
      initial={{ x: '110%' }}
      animate={{ x: '-110%' }}
      transition={{ duration: speed, ease: 'linear' }}
      className="absolute whitespace-nowrap"
      style={{ top: `${topOffset}%` }}
    >
      <div
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium shadow-lg"
        style={{
          background: 'rgba(0, 0, 0, 0.45)',
          backdropFilter: 'blur(4px)',
          color: danmu.color || '#fff',
        }}
      >
        {(danmu.username || danmu.user) && (
          <span className="text-[10px] text-white/70">{danmu.username || danmu.user}</span>
        )}
        <span>{danmu.text}</span>
      </div>
    </motion.div>
  )
}

/**
 * Hook: produce a stream of danmus from a list of messages, with random timing.
 * Auto-cycles through messages to keep the overlay populated.
 */
export function useDanmuStream(
  messages: Omit<Danmu, 'id'>[],
  options: { density?: 'low' | 'normal' | 'high'; enabled?: boolean } = {}
) {
  const { density = 'normal', enabled = true } = options
  const [stream, setStream] = useState<Danmu[]>([])
  const idx = useRef(0)
  const idCounter = useRef(0)

  useEffect(() => {
    if (!enabled || messages.length === 0) return
    const interval =
      density === 'high' ? 350 : density === 'low' ? 1200 : 700
    const t = setInterval(() => {
      const msg = messages[idx.current % messages.length]
      idx.current += 1
      const d: Danmu = {
        ...msg,
        id: `d-${idCounter.current++}`,
        color: msg.color || COLORS[Math.floor(Math.random() * COLORS.length)],
      }
      setStream((s) => [...s, d])
      // Auto-cleanup
      setTimeout(() => {
        setStream((s) => s.filter((x) => x.id !== d.id))
      }, (interval * 3 + 6000))
    }, interval)
    return () => clearInterval(t)
  }, [messages, density, enabled])

  return stream
}
