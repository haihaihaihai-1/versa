import { useState } from 'react'
import { Sprout, Leaf, Calendar, Droplet, Apple, Recycle } from 'lucide-react'
import { cn } from '../lib/utils'
import { PlantLibrary } from '../components/PlantLibrary'
import { GardenPlanner } from '../components/GardenPlanner'
import { SeedTracker } from '../components/SeedTracker'
import { WateringSchedule } from '../components/WateringSchedule'
import { HarvestLog } from '../components/HarvestLog'
import { CompostTracker } from '../components/CompostTracker'

const TABS = [
  { id: 'plant', label: '图鉴', icon: Leaf, color: 'from-green-500 to-emerald-500' },
  { id: 'plan', label: '规划', icon: Sprout, color: 'from-amber-500 to-yellow-500' },
  { id: 'seed', label: '种子', icon: Calendar, color: 'from-orange-500 to-red-500' },
  { id: 'water', label: '浇水', icon: Droplet, color: 'from-cyan-500 to-blue-500' },
  { id: 'harvest', label: '收获', icon: Apple, color: 'from-rose-500 to-pink-500' },
  { id: 'compost', label: '堆肥', icon: Recycle, color: 'from-emerald-500 to-teal-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function GardeningHub() {
  const [tab, setTab] = useState<TabId>('plant')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1 flex items-center gap-2"><Sprout className="w-5 h-5" />园艺中心</h1>
        <p className="text-xs opacity-90">图鉴 · 规划 · 种子 · 浇水 · 收获 · 堆肥</p>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {TABS.slice(0, 6).map((t) => {
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
        {tab === 'plant' && <PlantLibrary />}
        {tab === 'plan' && <GardenPlanner />}
        {tab === 'seed' && <SeedTracker />}
        {tab === 'water' && <WateringSchedule />}
        {tab === 'harvest' && <HarvestLog />}
        {tab === 'compost' && <CompostTracker />}
      </div>
    </div>
  )
}
