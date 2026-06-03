import { useState } from 'react'
import { Car, Fuel, Wrench, Route, CircleParking, Sparkles, DollarSign, FileText } from 'lucide-react'
import { cn } from '../lib/utils'
import { FuelLog } from '../components/FuelLog'
import { MaintenanceReminder } from '../components/MaintenanceReminder'
import { RoadTripPlanner } from '../components/RoadTripPlanner'
import { ParkingFinder } from '../components/ParkingFinder'
import { CarWashChecklist } from '../components/CarWashChecklist'
import { CarExpenseTracker } from '../components/CarExpenseTracker'
import { VehicleProfile } from '../components/VehicleProfile'

const TABS = [
  { id: 'profile', label: '档案', icon: FileText, color: 'from-slate-500 to-zinc-600' },
  { id: 'fuel', label: '加油', icon: Fuel, color: 'from-rose-500 to-pink-500' },
  { id: 'maint', label: '保养', icon: Wrench, color: 'from-amber-500 to-orange-500' },
  { id: 'trip', label: '行程', icon: Route, color: 'from-cyan-500 to-blue-500' },
  { id: 'park', label: '停车', icon: CircleParking, color: 'from-blue-500 to-indigo-500' },
  { id: 'wash', label: '洗车', icon: Sparkles, color: 'from-sky-500 to-blue-500' },
  { id: 'expense', label: '开销', icon: DollarSign, color: 'from-emerald-500 to-green-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function CarHub() {
  const [tab, setTab] = useState<TabId>('profile')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-slate-600 via-zinc-700 to-stone-800 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">车生活中心</h1>
        <p className="text-xs opacity-90">档案 · 加油 · 保养 · 行程 · 停车 · 洗车 · 开销</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {TABS.slice(0, 4).map((t) => {
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
      <div className="grid grid-cols-3 gap-1.5">
        {TABS.slice(4).map((t) => {
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
        {tab === 'profile' && <VehicleProfile />}
        {tab === 'fuel' && <FuelLog />}
        {tab === 'maint' && <MaintenanceReminder />}
        {tab === 'trip' && <RoadTripPlanner />}
        {tab === 'park' && <ParkingFinder />}
        {tab === 'wash' && <CarWashChecklist />}
        {tab === 'expense' && <CarExpenseTracker />}
      </div>
    </div>
  )
}
