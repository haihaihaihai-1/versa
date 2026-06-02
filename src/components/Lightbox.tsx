import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react'
import { cn } from '../lib/utils'

interface Props {
  images: ({ src: string; alt?: string; title?: string } | string)[]
  open: boolean
  initialIndex?: number
  onClose: () => void
}

export function Lightbox({ images, open, initialIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    if (open) setIndex(initialIndex)
  }, [open, initialIndex])

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % images.length)
    setZoom(1)
  }, [images.length])

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length)
    setZoom(1)
  }, [images.length])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(3, z + 0.25))
      else if (e.key === '-') setZoom((z) => Math.max(1, z - 0.25))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, next, prev, onClose])

  if (!open || images.length === 0) return null
  const normalize = (img: { src: string; alt?: string; title?: string } | string) => (typeof img === 'string' ? { src: img } : img)
  const current = normalize(images[index])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-black/95 backdrop-blur flex flex-col"
        onClick={onClose}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 text-white" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{index + 1} / {images.length}</span>
            {current.title && <span className="text-xs text-white/60 hidden sm:inline">· {current.title}</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="p-2 rounded-full hover:bg-white/10" title="缩小">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="p-2 rounded-full hover:bg-white/10" title="放大">
              <ZoomIn className="w-4 h-4" />
            </button>
            <a
              href={current.src}
              download
              className="p-2 rounded-full hover:bg-white/10"
              title="下载"
              onClick={(e) => e.stopPropagation()}
            >
              <Download className="w-4 h-4" />
            </a>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 ml-1" title="关闭 (Esc)">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center px-12 relative" onClick={(e) => e.stopPropagation()}>
          {images.length > 1 && (
            <button
              onClick={prev}
              className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <motion.img
            key={current.src}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: zoom }}
            transition={{ type: 'spring', stiffness: 220, damping: 25 }}
            src={current.src}
            alt={current.alt || ''}
            className="max-h-full max-w-full object-contain select-none"
            drag
            dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
            dragElastic={0.2}
            style={{ cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
          />
          {images.length > 1 && (
            <button
              onClick={next}
              className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
            {images.map((raw, i) => {
              const img = normalize(raw)
              return (
              <button
                key={i}
                onClick={() => {
                  setIndex(i)
                  setZoom(1)
                }}
                className={cn(
                  'flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition',
                  i === index ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'
                )}
              >
                <img src={img.src} alt="" className="w-full h-full object-cover" />
              </button>
              )
            })}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
