import { QuickNotes } from '../components/QuickNotes'
import { StickyNote } from 'lucide-react'

export function QuickNotesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <StickyNote className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">便签墙</h1>
          <p className="text-sm text-ink-500">彩色便签 · 5 色可选 · 本地保存 · 自由布局</p>
        </div>
      </div>
      <QuickNotes />
    </div>
  )
}
