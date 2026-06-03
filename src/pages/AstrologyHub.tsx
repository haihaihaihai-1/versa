import { useState } from 'react'
import { Sparkles, Star, Moon, Sun, BookOpen, Hash } from 'lucide-react'
import { cn } from '../lib/utils'
import { ZodiacScope } from '../components/ZodiacScope'
import { ChineseZodiac } from '../components/ChineseZodiac'
import { TarotReading } from '../components/TarotReading'
import { BirthChart } from '../components/BirthChart'
import { DreamDiary } from '../components/DreamDiary'
import { Numerology } from '../components/Numerology'

const TABS = [
  { id: 'zodiac', label: '星座', icon: Star, color: 'from-violet-500 to-purple-500' },
  { id: 'chinese', label: '生肖', icon: Sun, color: 'from-red-500 to-orange-500' },
  { id: 'tarot', label: '塔罗', icon: Sparkles, color: 'from-indigo-500 to-blue-500' },
  { id: 'chart', label: '星盘', icon: Moon, color: 'from-cyan-500 to-teal-500' },
  { id: 'dream', label: '解梦', icon: BookOpen, color: 'from-rose-500 to-pink-500' },
  { id: 'numer', label: '数字', icon: Hash, color: 'from-amber-500 to-yellow-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function AstrologyHub() {
  const [tab, setTab] = useState<TabId>('zodiac')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1 flex items-center gap-2"><Sparkles className="w-5 h-5" />占星中心</h1>
        <p className="text-xs opacity-90">星座 · 生肖 · 塔罗 · 星盘 · 解梦 · 数字</p>
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
        {tab === 'zodiac' && <ZodiacScope />}
        {tab === 'chinese' && <ChineseZodiac />}
        {tab === 'tarot' && <TarotReading />}
        {tab === 'chart' && <BirthChart />}
        {tab === 'dream' && <DreamDiary />}
        {tab === 'numer' && <Numerology />}
      </div>
    </div>
  )
}
