import { useState } from 'react'
import { PawPrint, Stethoscope, Utensils, Footprints, Scissors, DollarSign, Trophy } from 'lucide-react'
import { cn } from '../lib/utils'
import { PetProfiles } from '../components/PetProfiles'
import { PetHealthTracker } from '../components/PetHealthTracker'
import { FeedingSchedule } from '../components/FeedingSchedule'
import { WalkTracker } from '../components/WalkTracker'
import { GroomingLog } from '../components/GroomingLog'
import { PetExpenses } from '../components/PetExpenses'
import { BehaviorLog } from '../components/BehaviorLog'

const TABS = [
  { id: 'profile', label: '档案', icon: PawPrint, color: 'from-amber-500 to-orange-500' },
  { id: 'health', label: '健康', icon: Stethoscope, color: 'from-emerald-500 to-teal-500' },
  { id: 'feed', label: '喂食', icon: Utensils, color: 'from-orange-500 to-amber-500' },
  { id: 'walk', label: '遛弯', icon: Footprints, color: 'from-emerald-500 to-green-500' },
  { id: 'groom', label: '美容', icon: Scissors, color: 'from-pink-500 to-rose-500' },
  { id: 'cost', label: '开销', icon: DollarSign, color: 'from-emerald-500 to-teal-500' },
  { id: 'behavior', label: '成就', icon: Trophy, color: 'from-violet-500 to-purple-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function PetHub() {
  const [tab, setTab] = useState<TabId>('profile')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">宠物中心</h1>
        <p className="text-xs opacity-90">档案 · 健康 · 喂食 · 遛弯 · 美容 · 开销 · 成就</p>
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
        {tab === 'profile' && <PetProfiles />}
        {tab === 'health' && <PetHealthTracker />}
        {tab === 'feed' && <FeedingSchedule />}
        {tab === 'walk' && <WalkTracker />}
        {tab === 'groom' && <GroomingLog />}
        {tab === 'cost' && <PetExpenses />}
        {tab === 'behavior' && <BehaviorLog />}
      </div>
    </div>
  )
}
