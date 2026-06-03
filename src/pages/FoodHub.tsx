import { useState } from 'react'
import { ChefHat, Calendar, Apple, MapPin, Timer, Sparkles } from 'lucide-react'
import { cn } from '../lib/utils'
import { RecipeLibrary } from '../components/RecipeLibrary'
import { MealPlanner } from '../components/MealPlanner'
import { NutritionTracker } from '../components/NutritionTracker'
import { RestaurantBookmark } from '../components/RestaurantBookmark'
import { CookingTimer } from '../components/CookingTimer'
import { PantryInventory } from '../components/PantryInventory'
import { FlavorProfile } from '../components/FlavorProfile'

const TABS = [
  { id: 'recipe', label: '食谱', icon: ChefHat, color: 'from-orange-500 to-red-500' },
  { id: 'plan', label: '计划', icon: Calendar, color: 'from-emerald-500 to-teal-500' },
  { id: 'nutri', label: '营养', icon: Apple, color: 'from-emerald-500 to-green-500' },
  { id: 'rest', label: '餐厅', icon: MapPin, color: 'from-amber-500 to-orange-500' },
  { id: 'timer', label: '计时', icon: Timer, color: 'from-cyan-500 to-blue-500' },
  { id: 'pantry', label: '库存', icon: Apple, color: 'from-emerald-500 to-cyan-500' },
  { id: 'flavor', label: '口味', icon: Sparkles, color: 'from-pink-500 to-rose-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function FoodHub() {
  const [tab, setTab] = useState<TabId>('recipe')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">美食中心</h1>
        <p className="text-xs opacity-90">食谱 · 计划 · 营养 · 餐厅 · 计时 · 库存 · 口味</p>
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
        {tab === 'recipe' && <RecipeLibrary />}
        {tab === 'plan' && <MealPlanner />}
        {tab === 'nutri' && <NutritionTracker />}
        {tab === 'rest' && <RestaurantBookmark />}
        {tab === 'timer' && <CookingTimer />}
        {tab === 'pantry' && <PantryInventory />}
        {tab === 'flavor' && <FlavorProfile />}
      </div>
    </div>
  )
}
