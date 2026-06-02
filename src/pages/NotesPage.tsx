import { Notes } from '../components/Notes'
import { Notebook } from 'lucide-react'

export function NotesPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Notebook className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">我的笔记</h1>
          <p className="text-sm text-ink-500">Markdown 语法支持 · 本地保存 · 可置顶打标</p>
        </div>
      </div>
      <Notes />
    </div>
  )
}
