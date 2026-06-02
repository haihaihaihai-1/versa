import { useState } from 'react'
import { Target, Timer, BarChart3, BarChart, Brain, Sparkles, Mic, Bookmark } from 'lucide-react'
import { cn } from '../lib/utils'
import { GoalTracker } from '../components/GoalTracker'
import { TimeTracker } from '../components/TimeTracker'
import { SpendingStats } from '../components/SpendingStats'
import { SocialStats } from '../components/SocialStats'
import { PersonalityQuiz } from '../components/PersonalityQuiz'
import { WishlistBoard } from '../components/WishlistBoard'
import { MeetingAssistant } from '../components/MeetingAssistant'
import { KnowledgeBase } from '../components/KnowledgeBase'

const TABS = [
  { id: 'goal', label: '长期目标', icon: Target, color: 'from-violet-500 to-fuchsia-500' },
  { id: 'time', label: '时间追踪', icon: Timer, color: 'from-blue-500 to-cyan-500' },
  { id: 'spend', label: '消费统计', icon: BarChart3, color: 'from-rose-500 to-pink-500' },
  { id: 'social', label: '社交统计', icon: BarChart, color: 'from-violet-500 to-purple-500' },
  { id: 'quiz', label: '人格测试', icon: Brain, color: 'from-violet-500 to-fuchsia-500' },
  { id: 'wish', label: '愿望看板', icon: Bookmark, color: 'from-violet-500 to-purple-500' },
  { id: 'meeting', label: '会议助理', icon: Mic, color: 'from-rose-500 to-red-500' },
  { id: 'knowledge', label: '知识库', icon: Sparkles, color: 'from-amber-500 to-orange-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function InsightsHub() {
  const [tab, setTab] = useState<TabId>('goal')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">洞察中心</h1>
        <p className="text-xs opacity-90">目标 · 时间 · 消费 · 社交 · 人格 · 愿望 · 会议 · 知识</p>
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
        {tab === 'goal' && <GoalTracker />}
        {tab === 'time' && <TimeTracker />}
        {tab === 'spend' && <SpendingStats />}
        {tab === 'social' && <SocialStats />}
        {tab === 'quiz' && <PersonalityQuiz />}
        {tab === 'wish' && <WishlistBoard />}
        {tab === 'meeting' && <MeetingAssistant />}
        {tab === 'knowledge' && <KnowledgeBase />}
      </div>
    </div>
  )
}
