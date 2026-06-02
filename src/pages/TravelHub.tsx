import { useState } from 'react'
import { Map, Briefcase, Calculator, Coins, Languages, BookOpen, Plane } from 'lucide-react'
import { cn } from '../lib/utils'
import { TripPlanner } from '../components/TripPlanner'
import { PackingList } from '../components/PackingList'
import { BudgetSplitter } from '../components/BudgetSplitter'
import { CurrencyConverter } from '../components/CurrencyConverter'
import { LanguagePhrases } from '../components/LanguagePhrases'
import { TripJournal } from '../components/TripJournal'
import { FlightTracker } from '../components/FlightTracker'

const TABS = [
  { id: 'plan', label: '行程', icon: Map, color: 'from-blue-500 to-cyan-500' },
  { id: 'pack', label: '打包', icon: Briefcase, color: 'from-violet-500 to-purple-500' },
  { id: 'split', label: 'AA', icon: Calculator, color: 'from-emerald-500 to-teal-500' },
  { id: 'fx', label: '汇率', icon: Coins, color: 'from-amber-500 to-orange-500' },
  { id: 'lang', label: '短语', icon: Languages, color: 'from-pink-500 to-rose-500' },
  { id: 'jour', label: '日记', icon: BookOpen, color: 'from-orange-500 to-amber-500' },
  { id: 'fly', label: '航班', icon: Plane, color: 'from-sky-500 to-blue-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function TravelHub() {
  const [tab, setTab] = useState<TabId>('plan')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">旅行中心</h1>
        <p className="text-xs opacity-90">行程 · 打包 · AA · 汇率 · 短语 · 日记 · 航班</p>
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
        {tab === 'plan' && <TripPlanner />}
        {tab === 'pack' && <PackingList />}
        {tab === 'split' && <BudgetSplitter />}
        {tab === 'fx' && <CurrencyConverter />}
        {tab === 'lang' && <LanguagePhrases />}
        {tab === 'jour' && <TripJournal />}
        {tab === 'fly' && <FlightTracker />}
      </div>
    </div>
  )
}
