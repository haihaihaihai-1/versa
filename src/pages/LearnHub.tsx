import { useState } from 'react'
import { GraduationCap, BookOpen, Clock, Brain, ListChecks, StickyNote, Languages } from 'lucide-react'
import { cn } from '../lib/utils'
import { FlashcardDeck } from '../components/FlashcardDeck'
import { StudyTimer } from '../components/StudyTimer'
import { CourseTracker } from '../components/CourseTracker'
import { QuizBuilder } from '../components/QuizBuilder'
import { NoteOrganizer } from '../components/NoteOrganizer'
import { ReadingList } from '../components/ReadingList'
import { WordVocabulary } from '../components/WordVocabulary'

const TABS = [
  { id: 'flash', label: '闪卡', icon: Brain, color: 'from-violet-500 to-purple-500' },
  { id: 'timer', label: '计时', icon: Clock, color: 'from-emerald-500 to-green-500' },
  { id: 'course', label: '课程', icon: BookOpen, color: 'from-blue-500 to-indigo-500' },
  { id: 'quiz', label: '测验', icon: ListChecks, color: 'from-pink-500 to-rose-500' },
  { id: 'note', label: '笔记', icon: StickyNote, color: 'from-amber-500 to-orange-500' },
  { id: 'read', label: '阅读', icon: BookOpen, color: 'from-cyan-500 to-blue-500' },
  { id: 'vocab', label: '单词', icon: Languages, color: 'from-fuchsia-500 to-pink-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function LearnHub() {
  const [tab, setTab] = useState<TabId>('flash')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">学习中心</h1>
        <p className="text-xs opacity-90">闪卡 · 计时 · 课程 · 测验 · 笔记 · 阅读 · 单词</p>
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
        {tab === 'flash' && <FlashcardDeck />}
        {tab === 'timer' && <StudyTimer />}
        {tab === 'course' && <CourseTracker />}
        {tab === 'quiz' && <QuizBuilder />}
        {tab === 'note' && <NoteOrganizer />}
        {tab === 'read' && <ReadingList />}
        {tab === 'vocab' && <WordVocabulary />}
      </div>
    </div>
  )
}
