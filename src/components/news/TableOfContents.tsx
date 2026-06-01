import { useEffect, useState } from 'react'
import { List } from 'lucide-react'
import type { NewsSection } from '../../data/types'
import { cn } from '../../lib/utils'

export function TableOfContents({ sections }: { sections: NewsSection[] }) {
  const [active, setActive] = useState(sections[0]?.anchor)

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    sections.forEach((s) => {
      const el = document.getElementById(s.anchor)
      if (!el) return
      const ob = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) setActive(s.anchor)
          })
        },
        { rootMargin: '-20% 0px -70% 0px', threshold: 0 }
      )
      ob.observe(el)
      observers.push(ob)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [sections])

  return (
    <nav className="rounded-2xl border border-ink-200/60 dark:border-ink-800/60 bg-white/60 dark:bg-ink-900/40 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-ink-200/60 dark:border-ink-800/60">
        <List className="w-4 h-4 text-news-600" />
        <h3 className="font-bold text-sm">目录</h3>
      </div>
      <ol className="p-2">
        {sections.map((s, i) => (
          <li key={s.anchor}>
            <a
              href={`#${s.anchor}`}
              className={cn(
                'block px-3 py-2 rounded-lg text-sm transition-colors',
                active === s.anchor
                  ? 'bg-news-500/10 text-news-600 font-medium'
                  : 'text-ink-600 dark:text-ink-300 hover:bg-ink-50/60 dark:hover:bg-ink-900/40'
              )}
            >
              <span className="text-xs text-ink-400 mr-2 tabular-nums">
                {String(i + 1).padStart(2, '0')}
              </span>
              {s.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
