import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function LoadingBar() {
  const [active, setActive] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onStart = () => {
      setActive(true)
      setProgress(0)
    }
    const onProgress = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail
      setProgress(Math.max(0, Math.min(100, detail)))
    }
    const onEnd = () => {
      setProgress(100)
      setTimeout(() => {
        setActive(false)
        setProgress(0)
      }, 400)
    }

    window.addEventListener('versa:loading-start', onStart)
    window.addEventListener('versa:loading-progress', onProgress)
    window.addEventListener('versa:loading-end', onEnd)
    return () => {
      window.removeEventListener('versa:loading-start', onStart)
      window.removeEventListener('versa:loading-progress', onProgress)
      window.removeEventListener('versa:loading-end', onEnd)
    }
  }, [])

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[200] h-0.5 pointer-events-none"
        >
          <div className="h-full bg-gradient-to-r from-nova-500 via-pink-500 to-amber-500 relative overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-white/50"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

let startListener: (() => void) | null = null
let endListener: (() => void) | null = null
let progressListener: ((p: number) => void) | null = null

export function startLoading() {
  startListener?.()
  let p = 0
  const tick = () => {
    p = Math.min(85, p + Math.random() * 12)
    progressListener?.(p)
    if (p < 85) {
      const id = setTimeout(tick, 200)
      return () => clearTimeout(id)
    }
  }
  tick()
}

export function endLoading() {
  endListener?.()
}

export function LoadingBarHost() {
  const [, setTick] = useState(0)
  useEffect(() => {
    startListener = () => setTick((t) => t + 1)
    endListener = () => setTick((t) => t + 1)
    progressListener = () => {}
    return () => {
      startListener = null
      endListener = null
      progressListener = null
    }
  }, [])
  return <LoadingBar />
}
