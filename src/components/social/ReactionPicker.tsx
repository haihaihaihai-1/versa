// ============== 7 种表情反应 ==============

import { useState, useRef, useEffect } from 'react'
import { Heart, Lightbulb, ThumbsDown, Sparkles, Flame, Smile, Frown } from 'lucide-react'
import { REACTION_META, type ReactionType } from '../../api/types'
import { cn } from '../../lib/utils'

interface ReactionPickerProps {
  current: ReactionType | null
  onReact: (r: ReactionType) => void
}

const ICONS: Record<ReactionType, any> = {
  like: Heart,
  love: Sparkles,
  insightful: Lightbulb,
  disagree: ThumbsDown,
  laugh: Smile,
  sad: Frown,
  fire: Flame,
}

export function ReactionPicker({ current, onReact }: ReactionPickerProps) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<ReactionType | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const currentMeta = current ? REACTION_META[current] : null
  const CurrentIcon = current ? ICONS[current] : Heart
  const label = currentMeta?.label || '喜欢'
  const colorClass = currentMeta ? `${currentMeta.bg} ${currentMeta.text}` : 'text-ink-700 dark:text-ink-300'

  const onOpen = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setOpen(true)
  }
  const onClose = () => {
    timeoutRef.current = window.setTimeout(() => setOpen(false), 200)
  }

  return (
    <div
      ref={ref}
      className="relative flex-1"
      onMouseEnter={onOpen}
      onMouseLeave={onClose}
    >
      <button
        onClick={() => onReact(current || 'like')}
        className={cn(
          'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm transition-colors',
          currentMeta ? `${currentMeta.bg} ${currentMeta.text}` : 'text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800'
        )}
      >
        <CurrentIcon className="w-4 h-4" />
        {label}
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 rounded-full bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 shadow-xl flex gap-0.5 z-30 animate-fade-in">
          {(Object.keys(REACTION_META) as ReactionType[]).map((r) => {
            const Meta = REACTION_META[r]
            const Icon = ICONS[r]
            return (
              <button
                key={r}
                onMouseEnter={() => setHovered(r)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => { onReact(r); setOpen(false) }}
                className={cn(
                  'relative px-2.5 py-1.5 rounded-full text-lg transition-transform hover:scale-125',
                  current === r && 'bg-nova-100 dark:bg-nova-900/30'
                )}
                title={Meta.label}
              >
                <span>{Meta.emoji}</span>
                {hovered === r && (
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-ink-900 text-white text-xs whitespace-nowrap">
                    {Meta.label}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface ReactionDisplayProps {
  reactions: Array<[string, string[]]>
}

export function ReactionDisplay({ reactions }: ReactionDisplayProps) {
  if (reactions.length === 0) return null
  return (
    <div className="flex items-center gap-1">
      {reactions.map(([type]) => {
        const Meta = REACTION_META[type as ReactionType]
        if (!Meta) return null
        return (
          <span key={type} className="inline-flex items-center gap-0.5 text-xs">
            <span>{Meta.emoji}</span>
            <span className="text-ink-500">{Meta.label}</span>
          </span>
        )
      })}
    </div>
  )
}
