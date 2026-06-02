import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  active: boolean
  count?: number
  onComplete?: () => void
}

const COLORS = ['#a855f7', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

export function Confetti({ active, count = 50, onComplete }: Props) {
  const [pieces, setPieces] = useState<{ id: number; x: number; delay: number; color: string; size: number; rotate: number }[]>([])

  useEffect(() => {
    if (active) {
      setPieces(
        Array.from({ length: count }).map((_, i) => ({
          id: i,
          x: Math.random() * 100,
          delay: Math.random() * 0.2,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 6 + Math.random() * 8,
          rotate: Math.random() * 360,
        }))
      )
      const t = setTimeout(() => {
        setPieces([])
        onComplete?.()
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [active, count, onComplete])

  if (pieces.length === 0) return null

  return (
    <div className="fixed inset-0 z-[90] pointer-events-none overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, rotate: 0, opacity: 1 }}
          animate={{
            y: '110vh',
            rotate: p.rotate + 720,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 2.5 + Math.random(),
            delay: p.delay,
            ease: 'easeIn',
          }}
          className="absolute top-0"
          style={{
            width: p.size,
            height: p.size * 0.4,
            background: p.color,
            borderRadius: p.size > 10 ? '50%' : 2,
          }}
        />
      ))}
    </div>
  )
}

let confettiListener: ((on: boolean) => void) | null = null
export function fireConfetti(count = 50) {
  confettiListener?.(true)
  setTimeout(() => confettiListener?.(false), 100)
}

export function ConfettiHost() {
  const [active, setActive] = useState(false)
  useEffect(() => {
    confettiListener = setActive
    return () => {
      confettiListener = null
    }
  }, [])
  return <Confetti active={active} />
}
