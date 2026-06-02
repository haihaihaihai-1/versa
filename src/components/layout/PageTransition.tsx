import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'
import { useVersa } from '../../store/versa'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  enter: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

const reducedVariants = {
  initial: { opacity: 0 },
  enter: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.05 } },
}

export function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()
  const { preferences } = useVersa()
  const reduced = preferences.reducedMotion
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={reduced ? reducedVariants : pageVariants}
        initial="initial"
        animate="enter"
        exit="exit"
        className="min-h-full"
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  )
}
