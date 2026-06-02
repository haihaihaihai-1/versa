import { useState } from 'react'
import { Edit3, Regex, GitCompare, Clock, Scale, Lock, Database, Globe } from 'lucide-react'
import { cn } from '../lib/utils'
import { MarkdownEditor } from '../components/MarkdownEditor'
import { RegExpTester } from '../components/RegExpTester'
import { DiffViewer } from '../components/DiffViewer'
import { CronBuilder } from '../components/CronBuilder'
import { UnitConverter } from '../components/UnitConverter'
import { EncoderStudio } from '../components/EncoderStudio'
import { MockDataGenerator } from '../components/MockDataGenerator'
import { TimezoneConverter } from '../components/TimezoneConverter'

const TABS = [
  { id: 'md', label: 'Markdown', icon: Edit3, color: 'from-slate-700 to-slate-900' },
  { id: 'regex', label: '正则', icon: Regex, color: 'from-cyan-500 to-blue-500' },
  { id: 'diff', label: '文本对比', icon: GitCompare, color: 'from-emerald-500 to-teal-500' },
  { id: 'cron', label: 'Cron', icon: Clock, color: 'from-violet-500 to-purple-500' },
  { id: 'unit', label: '单位换算', icon: Scale, color: 'from-blue-500 to-cyan-500' },
  { id: 'encode', label: '编码工坊', icon: Lock, color: 'from-slate-700 to-slate-900' },
  { id: 'mock', label: '模拟数据', icon: Database, color: 'from-violet-500 to-fuchsia-500' },
  { id: 'tz', label: '时区', icon: Globe, color: 'from-blue-500 to-indigo-500' },
] as const

type TabId = (typeof TABS)[number]['id']

export function DevHub() {
  const [tab, setTab] = useState<TabId>('md')

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-3 text-white">
        <h1 className="text-xl font-bold mb-1">开发工具集</h1>
        <p className="text-xs opacity-90">Markdown · 正则 · 对比 · Cron · 单位 · 编码 · 模拟 · 时区</p>
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
        {tab === 'md' && <MarkdownEditor />}
        {tab === 'regex' && <RegExpTester />}
        {tab === 'diff' && <DiffViewer />}
        {tab === 'cron' && <CronBuilder />}
        {tab === 'unit' && <UnitConverter />}
        {tab === 'encode' && <EncoderStudio />}
        {tab === 'mock' && <MockDataGenerator />}
        {tab === 'tz' && <TimezoneConverter />}
      </div>
    </div>
  )
}
