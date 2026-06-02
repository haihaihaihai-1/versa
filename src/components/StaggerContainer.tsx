import { motion, useInView, type Variants } from 'framer-motion'
import { useRef, type ReactNode, type ElementType } from 'react'

interface Props {
  children: ReactNode
  className?: string
  stagger?: number
  delay?: number
  as?: ElementType
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: (stagger: number) => ({
    opacity: 1,
    transition: {
      staggerChildren: stagger,
      delayChildren: 0.1,
    },
  }),
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as any },
  },
}

export function StaggerContainer({
  children,
  className,
  stagger = 0.06,
  delay = 0,
  as = 'div',
}: Props) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, amount: 0.1 })
  const Comp = motion[as as keyof typeof motion] as any

  return (
    <Comp
      ref={ref}
      variants={containerVariants}
      custom={stagger}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      className={className}
      transition={{ delayChildren: delay }}
    >
      {children}
    </Comp>
  )
}

export function StaggerItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  as?: ElementType
}) {
  const Comp = motion[as as keyof typeof motion] as any
  return (
    <Comp variants={itemVariants} className={className}>
      {children}
    </Comp>
  )
}

interface RevealProps {
  children: ReactNode
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right' | 'none'
  className?: string
  once?: boolean
}

export function RevealOnScroll({
  children,
  delay = 0,
  direction = 'up',
  className,
  once = true,
}: RevealProps) {
  const ref = useRef(null)
  const inView = useInView(ref, { once, amount: 0.2 })

  const offset = {
    up: { y: 30 },
    down: { y: -30 },
    left: { x: 30 },
    right: { x: -30 },
    none: {},
  }[direction]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...offset }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, ...offset }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as any }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

interface CountUpProps {
  to: number
  from?: number
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
  decimals?: number
}

import { useEffect, useState } from 'react'
export function CountUp({ to, from = 0, duration = 1.2, className, prefix = '', suffix = '', decimals = 0 }: CountUpProps) {
  const [val, setVal] = useState(from)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000))
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(from + (to - from) * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, from, to, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}{val.toFixed(decimals)}{suffix}
    </span>
  )
}
