import { useState } from 'react'
import { Music, Wind, Brain, BookOpen, Volume2, Smile } from 'lucide-react'
import { cn } from '../lib/utils'
import { MusicPlayer } from '../components/MusicPlayer'
import { BreathingExercise } from '../components/BreathingExercise'
import { MeditationTimer } from '../components/MeditationTimer'
import { SoundLibrary } from '../components/SoundLibrary'
import { SleepStories } from '../components/SleepStories'
import { MoodTracker } from '../components/MoodTracker'

const TABS = [
  { id: 'music', label: '音乐', icon: Music, color: 'from-rose-500 to-pink-500' },
  { id: 'breath', label: '呼吸', icon: Wind, color: 'from-cyan-500 to-blue-500' },
  { id: 'medit', label: '冥想', icon: Brain, color: 'from-indigo-500 to-violet-500' },
  { id: 'sound', label: '环境音', icon: Volume2, color: 'from-blue-500 to-indigo-500' },
  { id: 'story', label: '故事', icon: BookOpen, color: 'from-indigo-600 to-violet-600' },
  { id: 'mood', label: '心情', icon: Smile, color: 'from-pink-500 to-rose-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function MusicHub() {
  const [tab, setTab] = useState<TabId>('music')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">音乐正念</h1>
        <p className="text-xs opacity-90">音乐 · 呼吸 · 冥想 · 环境音 · 故事 · 心情</p>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
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
        {tab === 'music' && <MusicPlayer />}
        {tab === 'breath' && <BreathingExercise />}
        {tab === 'medit' && <MeditationTimer />}
        {tab === 'sound' && <SoundLibrary />}
        {tab === 'story' && <SleepStories />}
        {tab === 'mood' && <MoodTracker />}
      </div>
    </div>
  )
}
