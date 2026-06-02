import { useState } from 'react'
import { Crown, Video, LayoutGrid, Star, Sparkles, Users, Vote, Send, Plus } from 'lucide-react'
import { cn } from '../lib/utils'
import { CreatorProfileV2 } from '../components/CreatorProfileV2'
import { LiveStudio } from '../components/LiveStudio'
import { ProductShowcase } from '../components/ProductShowcase'
import { FanClub } from '../components/FanClub'
import { StoryEditor } from '../components/StoryEditor'
import { LiveCoHost } from '../components/LiveCoHost'
import { PollMaker } from '../components/PollMaker'
import { PostScheduler } from '../components/PostScheduler'

const TABS = [
  { id: 'creator', label: '创作者主页', icon: Crown, color: 'from-violet-500 to-purple-500' },
  { id: 'studio', label: '主播工作台', icon: Video, color: 'from-rose-500 to-red-500' },
  { id: 'showcase', label: '橱窗编辑', icon: LayoutGrid, color: 'from-violet-500 to-fuchsia-500' },
  { id: 'fanclub', label: '粉丝俱乐部', icon: Star, color: 'from-amber-500 to-orange-500' },
  { id: 'story', label: '24h 故事', icon: Sparkles, color: 'from-fuchsia-500 to-pink-500' },
  { id: 'cohost', label: '多人连麦', icon: Users, color: 'from-violet-500 to-indigo-500' },
  { id: 'poll', label: '投票', icon: Vote, color: 'from-emerald-500 to-teal-500' },
  { id: 'scheduler', label: '定时发布', icon: Send, color: 'from-violet-500 to-purple-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function CreatorHub() {
  const [tab, setTab] = useState<TabId>('creator')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">创作者中心</h1>
        <p className="text-xs opacity-90">主页 · 工作台 · 橱窗 · 粉丝 · 故事 · 连麦 · 投票 · 定时</p>
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
        {tab === 'creator' && <CreatorProfileV2 />}
        {tab === 'studio' && <LiveStudio />}
        {tab === 'showcase' && <ProductShowcase />}
        {tab === 'fanclub' && <FanClub />}
        {tab === 'story' && <StoryEditor />}
        {tab === 'cohost' && <LiveCoHost />}
        {tab === 'poll' && <PollMaker />}
        {tab === 'scheduler' && <PostScheduler />}
      </div>
    </div>
  )
}
