import { useState, useEffect } from 'react'
import { Plus, X, ChevronLeft, ChevronRight, Eye, Clock } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface Story {
  id: string
  userId: string
  userName: string
  userAvatar: string
  content: string
  bgGradient: string
  emoji?: string
  cta?: { label: string; to: string }
  createdAt: string
  seen?: boolean
}

const STORIES_KEY = 'versa:stories'
const SEEN_KEY = 'versa:stories:seen'

const GRADIENTS = [
  'from-violet-500 via-fuchsia-500 to-pink-500',
  'from-amber-400 via-orange-500 to-rose-500',
  'from-cyan-500 via-blue-500 to-indigo-500',
  'from-emerald-400 via-teal-500 to-cyan-500',
  'from-rose-500 via-red-500 to-orange-500',
  'from-fuchsia-500 via-purple-500 to-indigo-500',
]

const SEED_STORIES: Story[] = [
  { id: 's1', userId: 'versaofficial', userName: 'Versa 官方', userAvatar: 'V', content: 'v8 阶段发布完成！\n20+ 购物模块 + 50+ 页面\n感谢每一位创作者 🌟', bgGradient: 'from-violet-500 via-fuchsia-500 to-pink-500', emoji: '🎉', cta: { label: '查看 v8 详情', to: '/about' }, createdAt: new Date().toISOString() },
  { id: 's2', userId: 'creator01', userName: '小明', userAvatar: 'M', content: '今天测评 3 款运动相机\n评论区告诉我哪款值得入', bgGradient: 'from-amber-400 via-orange-500 to-rose-500', emoji: '📸', cta: { label: '看测评', to: '/shop/curator' }, createdAt: new Date(Date.now() - 2 * 3600_000).toISOString() },
  { id: 's3', userId: 'creator02', userName: '小红', userAvatar: 'H', content: '618 大促清单整理好了！\n服饰 · 美妆 · 数码 · 家居\n文末附完整链接', bgGradient: 'from-cyan-500 via-blue-500 to-indigo-500', emoji: '🛍️', cta: { label: '查看清单', to: '/shop/flash' }, createdAt: new Date(Date.now() - 5 * 3600_000).toISOString() },
  { id: 's4', userId: 'creator03', userName: '设计师小李', userAvatar: 'L', content: '露营季来了 ⛺\n推荐 5 款入门级装备\n从帐篷到炊具一次收齐', bgGradient: 'from-emerald-400 via-teal-500 to-cyan-500', emoji: '🏕️', cta: { label: '买装备', to: '/shop' }, createdAt: new Date(Date.now() - 10 * 3600_000).toISOString() },
  { id: 's5', userId: 'creator04', userName: '美食家老王', userAvatar: 'W', content: '深夜放毒 🍜\n自制螺蛳粉攻略\n简单 5 步出锅', bgGradient: 'from-rose-500 via-red-500 to-orange-500', emoji: '🌶️', createdAt: new Date(Date.now() - 15 * 3600_000).toISOString() },
  { id: 's6', userId: 'creator05', userName: '理财师小赵', userAvatar: 'Z', content: '存钱挑战 30 天 💰\n第一周心得 + 工具分享', bgGradient: 'from-fuchsia-500 via-purple-500 to-indigo-500', emoji: '📈', createdAt: new Date(Date.now() - 20 * 3600_000).toISOString() },
]

const isExpired = (s: Story) => Date.now() - new Date(s.createdAt).getTime() > 24 * 3600_000

export function StoriesBar({ className }: { className?: string }) {
  const [stories, setStories] = useState<Story[]>([])
  const [seen, setSeen] = useState<Set<string>>(new Set())
  const [active, setActive] = useState<number | null>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORIES_KEY)
      const list = stored ? JSON.parse(stored) : SEED_STORIES
      const valid = list.filter((s: Story) => !isExpired(s))
      if (!stored) localStorage.setItem(STORIES_KEY, JSON.stringify(SEED_STORIES))
      setStories(valid)

      const seenStored = localStorage.getItem(SEEN_KEY)
      if (seenStored) setSeen(new Set(JSON.parse(seenStored)))
    } catch {}
  }, [])

  useEffect(() => {
    if (active === null || !stories[active]) return
    setProgress(0)
    const total = 5000
    const interval = 50
    const step = 100 / (total / interval)
    const t = setInterval(() => {
      setProgress((p) => {
        const next = p + step
        if (next >= 100) {
          clearInterval(t)
          handleNext()
          return 0
        }
        return next
      })
    }, interval)
    return () => clearInterval(t)
  }, [active, stories])

  const handleNext = () => {
    if (active === null) return
    const cur = stories[active]
    if (cur) {
      const updated = new Set(seen)
      updated.add(cur.id)
      setSeen(updated)
      try { localStorage.setItem(SEEN_KEY, JSON.stringify([...updated])) } catch {}
    }
    if (active < stories.length - 1) setActive(active + 1)
    else setActive(null)
  }
  const handlePrev = () => {
    if (active === null) return
    if (active > 0) setActive(active - 1)
    else setProgress(0)
  }

  return (
    <>
      <div className={cn('flex gap-3 overflow-x-auto pb-1 scrollbar-hide', className)}>
        <button className="flex flex-col items-center gap-1 shrink-0 group">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-ink-100 to-ink-200 dark:from-ink-800 dark:to-ink-700 flex items-center justify-center border-2 border-dashed border-ink-300 dark:border-ink-600 group-hover:border-violet-500">
            <Plus className="w-6 h-6 text-ink-400 group-hover:text-violet-500" />
          </div>
          <span className="text-[10px] text-ink-500">你的故事</span>
        </button>
        {stories.map((s, i) => {
          const isSeen = seen.has(s.id)
          const ago = Math.floor((Date.now() - new Date(s.createdAt).getTime()) / 3600_000)
          return (
            <button key={s.id} onClick={() => setActive(i)} className="flex flex-col items-center gap-1 shrink-0 group">
              <div className={cn(
                'p-0.5 rounded-full',
                isSeen ? 'bg-ink-200 dark:bg-ink-700' : 'bg-gradient-to-br from-violet-500 via-pink-500 to-amber-500'
              )}>
                <div className="w-14 h-14 rounded-full bg-white dark:bg-ink-900 p-0.5">
                  <div className={cn('w-full h-full rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br', s.bgGradient)}>
                    {s.userAvatar}
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-ink-500 truncate max-w-[60px]">{s.userName}</span>
              <span className="text-[9px] text-ink-400">{ago}h</span>
            </button>
          )
        })}
      </div>

      {/* 故事查看器 */}
      {active !== null && stories[active] && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setActive(null)}>
          <div className="relative w-full max-w-sm aspect-[9/16] max-h-[80vh] rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className={cn('absolute inset-0 bg-gradient-to-br', stories[active].bgGradient)} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />

            {/* 进度条 */}
            <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
              {stories.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                  {i < active && <div className="h-full bg-white w-full" />}
                  {i === active && <div className="h-full bg-white" style={{ width: `${progress}%` }} />}
                </div>
              ))}
            </div>

            {/* 头部 */}
            <div className="absolute top-5 left-3 right-3 flex items-center gap-2 z-10">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white text-xs font-bold">
                {stories[active].userAvatar}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-medium">{stories[active].userName}</p>
                <p className="text-white/70 text-[10px] flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />{Math.floor((Date.now() - new Date(stories[active].createdAt).getTime()) / 3600_000)}h 前
                </p>
              </div>
              <button onClick={() => setActive(null)} className="p-1.5 rounded-full bg-white/20 backdrop-blur text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 内容 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white z-10">
              {stories[active].emoji && <div className="text-7xl mb-4 drop-shadow-lg">{stories[active].emoji}</div>}
              <p className="text-lg font-medium whitespace-pre-line leading-relaxed">{stories[active].content}</p>
              {stories[active].cta && (
                <a
                  href={stories[active].cta.to}
                  onClick={(e) => { e.preventDefault(); setActive(null); window.location.hash = stories[active].cta!.to }}
                  className="mt-6 px-5 py-2 rounded-full bg-white text-ink-900 text-sm font-medium hover:scale-105 transition"
                >
                  {stories[active].cta.label} →
                </a>
              )}
            </div>

            {/* 左右点击 */}
            <button onClick={handlePrev} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white opacity-0 hover:opacity-100 transition" />
            <button onClick={handleNext} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 text-white opacity-0 hover:opacity-100 transition" />
            <div className="absolute inset-y-0 left-0 w-1/2" onClick={handlePrev} />
            <div className="absolute inset-y-0 right-0 w-1/2" onClick={handleNext} />
          </div>
        </div>
      )}
    </>
  )
}
