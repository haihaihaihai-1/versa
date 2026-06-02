import { useState } from 'react'
import { Music, ChefHat, Swords, Headphones, Cookie, Circle, Sparkles } from 'lucide-react'
import { cn } from '../lib/utils'
import { PlaylistMaker } from '../components/PlaylistMaker'
import { RecipeRandomizer } from '../components/RecipeRandomizer'
import { MemeBattle } from '../components/MemeBattle'
import { AmbientSounds } from '../components/AmbientSounds'
import { FortuneCookie } from '../components/FortuneCookie'
import { Magic8Ball } from '../components/Magic8Ball'
import { TarotDeck } from '../components/TarotDeck'

const TABS = [
  { id: 'playlist', label: '歌单', icon: Music, color: 'from-fuchsia-500 to-pink-500' },
  { id: 'recipe', label: '今天吃啥', icon: ChefHat, color: 'from-orange-500 to-rose-500' },
  { id: 'battle', label: '表情包 PK', icon: Swords, color: 'from-rose-500 to-red-500' },
  { id: 'ambient', label: '环境音', icon: Headphones, color: 'from-cyan-500 to-blue-500' },
  { id: 'fortune', label: '幸运饼干', icon: Cookie, color: 'from-amber-500 to-orange-500' },
  { id: '8ball', label: '魔法 8 球', icon: Circle, color: 'from-slate-700 to-slate-900' },
  { id: 'tarot', label: '塔罗牌', icon: Sparkles, color: 'from-violet-500 to-purple-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function FunHub() {
  const [tab, setTab] = useState<TabId>('playlist')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">娱乐中心</h1>
        <p className="text-xs opacity-90">歌单 · 转盘 · PK · 白噪音 · 签文 · 8 球 · 塔罗</p>
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
        {tab === 'playlist' && <PlaylistMaker />}
        {tab === 'recipe' && <RecipeRandomizer />}
        {tab === 'battle' && <MemeBattle />}
        {tab === 'ambient' && <AmbientSounds />}
        {tab === 'fortune' && <FortuneCookie />}
        {tab === '8ball' && <Magic8Ball />}
        {tab === 'tarot' && <TarotDeck />}
      </div>
    </div>
  )
}
