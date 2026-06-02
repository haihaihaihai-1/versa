import { useState } from 'react'
import { Moon, Droplet, Pill, Home as HomeIcon, Leaf, Focus, Sparkles, Heart } from 'lucide-react'
import { cn } from '../lib/utils'
import { SleepTracker } from '../components/SleepTracker'
import { WaterIntake } from '../components/WaterIntake'
import { MedicationReminder } from '../components/MedicationReminder'
import { HomeMaintenance } from '../components/HomeMaintenance'
import { PlantCare } from '../components/PlantCare'
import { FocusMode } from '../components/FocusMode'
import { AffirmationHub } from '../components/AffirmationHub'

const TABS = [
  { id: 'sleep', label: '睡眠', icon: Moon, color: 'from-indigo-500 to-violet-500' },
  { id: 'water', label: '饮水', icon: Droplet, color: 'from-cyan-500 to-blue-500' },
  { id: 'med', label: '用药', icon: Pill, color: 'from-rose-500 to-pink-500' },
  { id: 'home', label: '家居', icon: HomeIcon, color: 'from-amber-500 to-orange-500' },
  { id: 'plant', label: '植物', icon: Leaf, color: 'from-emerald-500 to-teal-500' },
  { id: 'focus', label: '专注', icon: Focus, color: 'from-violet-500 to-purple-500' },
  { id: 'aff', label: '肯定', icon: Sparkles, color: 'from-pink-500 to-rose-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function HealthHub() {
  const [tab, setTab] = useState<TabId>('sleep')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">健康中心</h1>
        <p className="text-xs opacity-90">睡眠 · 饮水 · 用药 · 家居 · 植物 · 专注 · 肯定</p>
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
        {tab === 'sleep' && <SleepTracker />}
        {tab === 'water' && <WaterIntake />}
        {tab === 'med' && <MedicationReminder />}
        {tab === 'home' && <HomeMaintenance />}
        {tab === 'plant' && <PlantCare />}
        {tab === 'focus' && <FocusMode />}
        {tab === 'aff' && <AffirmationHub />}
      </div>
    </div>
  )
}
