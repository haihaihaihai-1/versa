import { useState } from 'react'
import { Palette, Languages, Layers, Keyboard, Compass, FileSearch, Bell, Music } from 'lucide-react'
import { cn } from '../lib/utils'
import { ThemeBuilderLive } from '../components/ThemeBuilderLive'
import { LocaleFullCoverage } from '../components/LocaleFullCoverage'
import { LayoutReorder } from '../components/LayoutReorder'
import { ShortcutsCheatsheet } from '../components/ShortcutsCheatsheet'
import { OnboardingTour } from '../components/OnboardingTour'
import { AccentAudit } from '../components/AccentAudit'
import { SmartNotification } from '../components/SmartNotification'
import { NotificationSoundPicker } from '../components/NotificationSoundPicker'

const TABS = [
  { id: 'theme', label: '主题工坊', icon: Palette, color: 'from-violet-500 to-purple-500' },
  { id: 'audit', label: '主题审计', icon: FileSearch, color: 'from-cyan-500 to-blue-500' },
  { id: 'locale', label: '多语言', icon: Languages, color: 'from-emerald-500 to-teal-500' },
  { id: 'menu', label: '菜单定制', icon: Layers, color: 'from-violet-500 to-fuchsia-500' },
  { id: 'keys', label: '快捷键', icon: Keyboard, color: 'from-indigo-500 to-violet-500' },
  { id: 'tour', label: '新手引导', icon: Compass, color: 'from-amber-500 to-orange-500' },
  { id: 'notif', label: '通知中心', icon: Bell, color: 'from-blue-500 to-indigo-500' },
  { id: 'sound', label: '音效选择', icon: Music, color: 'from-rose-500 to-pink-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function PersonalHub() {
  const [tab, setTab] = useState<TabId>('theme')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">个性化中心</h1>
        <p className="text-xs opacity-90">主题 · 语言 · 菜单 · 快捷键 · 引导 · 通知 · 音效</p>
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
        {tab === 'theme' && <ThemeBuilderLive />}
        {tab === 'audit' && <AccentAudit />}
        {tab === 'locale' && <LocaleFullCoverage />}
        {tab === 'menu' && <LayoutReorder />}
        {tab === 'keys' && <ShortcutsCheatsheet />}
        {tab === 'tour' && <OnboardingTour />}
        {tab === 'notif' && <SmartNotification />}
        {tab === 'sound' && <NotificationSoundPicker />}
      </div>
    </div>
  )
}
