import { Users, Bell, TrendingDown, Shirt, Handshake, CalendarDays, Sparkles, Scissors } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'
import { FriendOrder } from '../components/FriendOrder'
import { LiveReminders } from '../components/LiveReminders'
import { PriceAlert } from '../components/PriceAlert'
import { OutfitMatcher } from '../components/OutfitMatcher'
import { CreatorCollab } from '../components/CreatorCollab'
import { ContentCalendar } from '../components/ContentCalendar'
import { LiveHighlight } from '../components/LiveHighlight'
import { ClipVote } from '../components/ClipVote'

const TABS = [
  { id: 'friend', label: '好友拼单', icon: Users, color: 'from-violet-500 to-purple-500' },
  { id: 'reminder', label: '直播提醒', icon: Bell, color: 'from-rose-500 to-amber-500' },
  { id: 'price', label: '价格预警', icon: TrendingDown, color: 'from-rose-500 to-orange-500' },
  { id: 'outfit', label: 'AI 搭配', icon: Shirt, color: 'from-pink-500 to-rose-500' },
  { id: 'collab', label: '创作者合作', icon: Handshake, color: 'from-violet-500 to-fuchsia-500' },
  { id: 'calendar', label: '内容日历', icon: CalendarDays, color: 'from-blue-500 to-violet-500' },
  { id: 'highlight', label: '弹幕高光', icon: Sparkles, color: 'from-amber-500 to-orange-500' },
  { id: 'clip', label: '切片投票', icon: Scissors, color: 'from-cyan-500 to-blue-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function SocialTools() {
  const [tab, setTab] = useState<TabId>('friend')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">社交工具集</h1>
        <p className="text-xs opacity-90">好友拼单 · 直播提醒 · 价格预警 · AI 搭配</p>
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
        {tab === 'friend' && <FriendOrder />}
        {tab === 'reminder' && <LiveReminders />}
        {tab === 'price' && <PriceAlert />}
        {tab === 'outfit' && <OutfitMatcher />}
        {tab === 'collab' && <CreatorCollab />}
        {tab === 'calendar' && <ContentCalendar />}
        {tab === 'highlight' && <LiveHighlight />}
        {tab === 'clip' && <ClipVote />}
      </div>
    </div>
  )
}
