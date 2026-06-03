import { useState } from 'react'
import { Sigma, Ruler, Triangle, BarChart3, Brain, LineChart } from 'lucide-react'
import { cn } from '../lib/utils'
import { FormulaLibrary } from '../components/FormulaLibrary'
import { UnitConverter } from '../components/UnitConverter'
import { StatisticsHelper } from '../components/StatisticsHelper'
import { GeometryTools } from '../components/GeometryTools'
import { MathQuiz } from '../components/MathQuiz'
import { GraphPlotter } from '../components/GraphPlotter'

const TABS = [
  { id: 'formula', label: '公式', icon: Sigma, color: 'from-blue-500 to-cyan-500' },
  { id: 'unit', label: '单位', icon: Ruler, color: 'from-emerald-500 to-teal-500' },
  { id: 'stats', label: '统计', icon: BarChart3, color: 'from-amber-500 to-orange-500' },
  { id: 'geom', label: '几何', icon: Triangle, color: 'from-violet-500 to-fuchsia-500' },
  { id: 'quiz', label: '题库', icon: Brain, color: 'from-rose-500 to-pink-500' },
  { id: 'graph', label: '图像', icon: LineChart, color: 'from-indigo-500 to-violet-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function MathHub() {
  const [tab, setTab] = useState<TabId>('formula')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">数学中心</h1>
        <p className="text-xs opacity-90">公式 · 单位 · 统计 · 几何 · 题库 · 图像</p>
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
        {tab === 'formula' && <FormulaLibrary />}
        {tab === 'unit' && <UnitConverter />}
        {tab === 'stats' && <StatisticsHelper />}
        {tab === 'geom' && <GeometryTools />}
        {tab === 'quiz' && <MathQuiz />}
        {tab === 'graph' && <GraphPlotter />}
      </div>
    </div>
  )
}
