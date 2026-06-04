/**
 * Versa · 懒加载图片 (v12.0)
 * 使用原生 loading="lazy" + IntersectionObserver 占位符
 */
import { useState, useRef, useEffect, type ImgHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string
  fallback?: string
  aspectRatio?: string
  blurhash?: string
}

export function LazyImage({ src, fallback, alt, className, aspectRatio, blurhash, ...rest }: Props) {
  const [loaded, setLoaded] = useState(false)
  const [errored, setErrored] = useState(false)
  const ref = useRef<HTMLImageElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.loading === 'eager' || inView) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true)
            obs.disconnect()
          }
        }
      },
      { rootMargin: '200px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [inView])

  const finalSrc = errored && fallback ? fallback : inView ? src : ''

  return (
    <div
      className={cn('relative overflow-hidden bg-ink-100 dark:bg-ink-800', className)}
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-ink-200/60 via-ink-100/40 to-ink-200/60 dark:from-ink-800/60 dark:via-ink-700/40 dark:to-ink-800/60" />
      )}
      <img
        ref={ref}
        src={finalSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setErrored(true)}
        className={cn('w-full h-full object-cover transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
        {...rest}
      />
    </div>
  )
}
