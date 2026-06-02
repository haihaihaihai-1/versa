import { useState } from 'react'
import { Wallet, Target, Timer, ChefHat, LayoutDashboard, Inbox, Plane, Users } from 'lucide-react'
import { cn } from '../lib/utils'
import { WalletHub } from '../components/WalletHub'
import { HabitTracker } from '../components/HabitTracker'
import { StudyRoom } from '../components/StudyRoom'
import { RecipeBook } from '../components/RecipeBook'
import { DashboardBuilder } from '../components/DashboardBuilder'
import { QuickCapture } from '../components/QuickCapture'
import { TravelPlanner } from '../components/TravelPlanner'
import { FriendGraph } from '../components/FriendGraph'

const TABS = [
  { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard, color: 'from-cyan-500 to-blue-500' },
  { id: 'capture', label: '快速捕获', icon: Inbox, color: 'from-violet-500 to-purple-500' },
  { id: 'wallet', label: '钱包', icon: Wallet, color: 'from-emerald-500 to-teal-500' },
  { id: 'habit', label: '习惯', icon: Target, color: 'from-orange-500 to-rose-500' },
  { id: 'study', label: '番茄钟', icon: Timer, color: 'from-rose-500 to-pink-500' },
  { id: 'recipe', label: '食谱', icon: ChefHat, color: 'from-amber-500 to-orange-500' },
  { id: 'travel', label: '旅行', icon: Plane, color: 'from-cyan-500 to-blue-500' },
  { id: 'friend', label: '发现好友', icon: Users, color: 'from-rose-500 to-pink-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function LifeHub() {
  const [tab, setTab] = useState<TabId>('dashboard')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">生活中心</h1>
        <p className="text-xs opacity-90">仪表盘 · 钱包 · 习惯 · 番茄 · 食谱 · 旅行 · 好友</p>
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
        {tab === 'dashboard' && <DashboardBuilder />}
        {tab === 'capture' && <QuickCapture />}
        {tab === 'wallet' && <WalletHub />}
        {tab === 'habit' && <HabitTracker />}
        {tab === 'study' && <StudyRoom />}
        {tab === 'recipe' && <RecipeBook />}
        {tab === 'travel' && <TravelPlanner />}
        {tab === 'friend' && <FriendGraph />}
      </div>
    </div>
  )
}
