import { useEffect, useState } from 'react'

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const article = document.querySelector('[data-article-body]') as HTMLElement | null
      if (!article) return
      const rect = article.getBoundingClientRect()
      const articleTop = rect.top + window.scrollY
      const articleHeight = article.scrollHeight
      const start = articleTop - window.innerHeight * 0.3
      const end = articleTop + articleHeight - window.innerHeight
      const total = end - start
      const current = window.scrollY - start
      const p = Math.max(0, Math.min(100, (current / total) * 100))
      setProgress(p)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="fixed top-0 left-0 right-0 h-1 z-50 pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-news-500 via-news-400 to-news-600 transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
