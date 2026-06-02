import { useState } from 'react'
import { Trophy, Activity, Film, Brain, Dices, Users, Bot, Compass } from 'lucide-react'
import { cn } from '../lib/utils'
import { PomodoroChallenge } from '../components/PomodoroChallenge'
import { StretchGuide } from '../components/StretchGuide'
import { MovieList } from '../components/MovieList'
import { DailyQuiz } from '../components/DailyQuiz'
import { DiceRoller } from '../components/DiceRoller'
import { ScoreBoard } from '../components/ScoreBoard'
import { ChatBot } from '../components/ChatBot'
import { BucketList } from '../components/BucketList'

const TABS = [
  { id: 'challenge', label: '番茄挑战', icon: Trophy, color: 'from-rose-500 to-red-500' },
  { id: 'stretch', label: '拉伸指南', icon: Activity, color: 'from-emerald-500 to-teal-500' },
  { id: 'movie', label: '影视清单', icon: Film, color: 'from-violet-500 to-purple-500' },
  { id: 'quiz', label: '每日问答', icon: Brain, color: 'from-violet-500 to-fuchsia-500' },
  { id: 'dice', label: '骰子', icon: Dices, color: 'from-amber-500 to-orange-500' },
  { id: 'score', label: '计分板', icon: Users, color: 'from-amber-500 to-red-500' },
  { id: 'chat', label: 'AI 对话', icon: Bot, color: 'from-cyan-500 to-blue-500' },
  { id: 'bucket', label: '人生清单', icon: Compass, color: 'from-rose-500 to-fuchsia-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function LifeHub2() {
  const [tab, setTab] = useState<TabId>('challenge')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">生活中心 2</h1>
        <p className="text-xs opacity-90">挑战 · 拉伸 · 影视 · 问答 · 骰子 · 计分 · 对话 · 清单</p>
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
        {tab === 'challenge' && <PomodoroChallenge />}
        {tab === 'stretch' && <StretchGuide />}
        {tab === 'movie' && <MovieList />}
        {tab === 'quiz' && <DailyQuiz />}
        {tab === 'dice' && <DiceRoller />}
        {tab === 'score' && <ScoreBoard />}
        {tab === 'chat' && <ChatBot />}
        {tab === 'bucket' && <BucketList />}
      </div>
    </div>
  )
}
