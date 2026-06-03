import { useState } from 'react'
import { motion } from 'framer-motion'
import { Sun, Zap, Camera, Layers, Sliders, BarChart3, Image as ImageIcon, Crop, Eye, Palette, Aperture } from 'lucide-react'
import { cn } from '../lib/utils'
import { PhotoAlbum } from '../components/PhotoAlbum'
import { PhotoEditor } from '../components/PhotoEditor'
import { EXIFViewer } from '../components/EXIFViewer'
import { CompositionGuide } from '../components/CompositionGuide'
import { ShotList } from '../components/ShotList'
import { ColorGrading } from '../components/ColorGrading'
import { PhotoStats } from '../components/PhotoStats'

const TABS = [
  { id: 'album', label: '相册', icon: ImageIcon, color: 'from-rose-500 to-pink-500' },
  { id: 'editor', label: '调色', icon: Sliders, color: 'from-violet-500 to-purple-500' },
  { id: 'exif', label: 'EXIF', icon: Camera, color: 'from-cyan-500 to-blue-500' },
  { id: 'guide', label: '构图', icon: Crop, color: 'from-amber-500 to-orange-500' },
  { id: 'plan', label: '计划', icon: Layers, color: 'from-blue-500 to-indigo-500' },
  { id: 'lut', label: 'LUT', icon: Palette, color: 'from-pink-500 to-rose-500' },
  { id: 'stats', label: '统计', icon: BarChart3, color: 'from-emerald-500 to-teal-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function PhotographyHub() {
  const [tab, setTab] = useState<TabId>('album')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">摄影中心</h1>
        <p className="text-xs opacity-90">相册 · 调色 · EXIF · 构图 · 计划 · LUT · 统计</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {TABS.slice(0, 4).map((t) => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn('h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all', tab === t.id ? `bg-gradient-to-br ${t.color} text-white shadow-lg scale-105` : 'bg-white/60 dark:bg-ink-900/30 text-ink-700 dark:text-ink-300')}>
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
            <button key={t.id} onClick={() => setTab(t.id)} className={cn('h-14 rounded-2xl flex flex-col items-center justify-center gap-0.5 transition-all', tab === t.id ? `bg-gradient-to-br ${t.color} text-white shadow-lg scale-105` : 'bg-white/60 dark:bg-ink-900/30 text-ink-700 dark:text-ink-300')}>
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold">{t.label}</span>
            </button>
          )
        })}
      </div>

      <div>
        {tab === 'album' && <PhotoAlbum />}
        {tab === 'editor' && <PhotoEditor />}
        {tab === 'exif' && <EXIFViewer />}
        {tab === 'guide' && <CompositionGuide />}
        {tab === 'plan' && <ShotList />}
        {tab === 'lut' && <ColorGrading />}
        {tab === 'stats' && <PhotoStats />}
      </div>
    </div>
  )
}
