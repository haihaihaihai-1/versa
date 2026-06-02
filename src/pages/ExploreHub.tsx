import { useState } from 'react'
import { Wind, BookOpen, Dumbbell, Code, Bookmark, BookHeart, Sparkles, MapPin } from 'lucide-react'
import { cn } from '../lib/utils'
import { MeditationSpace } from '../components/MeditationSpace'
import { ReadingList } from '../components/ReadingList'
import { WorkoutPlanner } from '../components/WorkoutPlanner'
import { CodeSnippet } from '../components/CodeSnippet'
import { BookmarkPlus } from '../components/BookmarkPlus'
import { JournalDiary } from '../components/JournalDiary'
import { WishBucket } from '../components/WishBucket'
import { LocalGuide } from '../components/LocalGuide'

const TABS = [
  { id: 'meditate', label: '冥想', icon: Wind, color: 'from-violet-500 to-indigo-500' },
  { id: 'reading', label: '阅读', icon: BookOpen, color: 'from-amber-500 to-orange-500' },
  { id: 'workout', label: '健身', icon: Dumbbell, color: 'from-orange-500 to-rose-500' },
  { id: 'code', label: '代码', icon: Code, color: 'from-blue-500 to-indigo-500' },
  { id: 'bookmark', label: '收藏', icon: Bookmark, color: 'from-cyan-500 to-blue-500' },
  { id: 'journal', label: '日记', icon: BookHeart, color: 'from-rose-500 to-pink-500' },
  { id: 'wish', label: '愿望', icon: Sparkles, color: 'from-violet-500 to-fuchsia-500' },
  { id: 'local', label: '本地', icon: MapPin, color: 'from-emerald-500 to-teal-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function ExploreHub() {
  const [tab, setTab] = useState<TabId>('meditate')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">探索中心</h1>
        <p className="text-xs opacity-90">冥想 · 阅读 · 健身 · 代码 · 收藏 · 日记 · 愿望 · 本地</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all',
                tab === t.id
                  ? `bg-gradient-to-br ${t.color} text-white shadow-lg scale-105`
                  : 'bg-white/60 dark:bg-ink-900/30 text-ink-700 dark:text-ink-300'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          )
        })}
      </div>

      <div>
        {tab === 'meditate' && <MeditationSpace />}
        {tab === 'reading' && <ReadingList />}
        {tab === 'workout' && <WorkoutPlanner />}
        {tab === 'code' && <CodeSnippet />}
        {tab === 'bookmark' && <BookmarkPlus />}
        {tab === 'journal' && <JournalDiary />}
        {tab === 'wish' && <WishBucket />}
        {tab === 'local' && <LocalGuide />}
      </div>
    </div>
  )
}
