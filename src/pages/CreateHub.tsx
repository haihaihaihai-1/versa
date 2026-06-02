import { useState } from 'react'
import { Mic, Pen, Hash, Receipt, Briefcase, Link2, Smile, Palette } from 'lucide-react'
import { cn } from '../lib/utils'
import { VoiceMemoStudio } from '../components/VoiceMemoStudio'
import { SketchPad } from '../components/SketchPad'
import { QRCodeStudio } from '../components/QRCodeStudio'
import { InvoiceGenerator } from '../components/InvoiceGenerator'
import { ResumeBuilder } from '../components/ResumeBuilder'
import { LinkHub } from '../components/LinkHub'
import { MemeGenerator } from '../components/MemeGenerator'
import { ColorPaletteStudio } from '../components/ColorPaletteStudio'

const TABS = [
  { id: 'voice', label: '语音备忘', icon: Mic, color: 'from-rose-500 to-pink-500' },
  { id: 'sketch', label: '绘图板', icon: Pen, color: 'from-violet-500 to-purple-500' },
  { id: 'qr', label: '二维码', icon: Hash, color: 'from-blue-500 to-indigo-500' },
  { id: 'invoice', label: '发票', icon: Receipt, color: 'from-emerald-500 to-teal-500' },
  { id: 'resume', label: '简历', icon: Briefcase, color: 'from-blue-500 to-indigo-500' },
  { id: 'link', label: '链接中心', icon: Link2, color: 'from-cyan-500 to-blue-500' },
  { id: 'meme', label: '表情包', icon: Smile, color: 'from-rose-500 to-pink-500' },
  { id: 'palette', label: '配色工坊', icon: Palette, color: 'from-pink-500 to-fuchsia-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function CreateHub() {
  const [tab, setTab] = useState<TabId>('voice')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">创作中心</h1>
        <p className="text-xs opacity-90">语音 · 绘图 · 二维码 · 发票 · 简历 · 链接 · 表情 · 配色</p>
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
        {tab === 'voice' && <VoiceMemoStudio />}
        {tab === 'sketch' && <SketchPad />}
        {tab === 'qr' && <QRCodeStudio />}
        {tab === 'invoice' && <InvoiceGenerator />}
        {tab === 'resume' && <ResumeBuilder />}
        {tab === 'link' && <LinkHub />}
        {tab === 'meme' && <MemeGenerator />}
        {tab === 'palette' && <ColorPaletteStudio />}
      </div>
    </div>
  )
}
