import { Forum } from '../components/Forum'
import { MessageSquare } from 'lucide-react'

export function ForumPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">社区论坛</h1>
          <p className="text-sm text-ink-500">主题讨论 · 经验分享 · 求助问答</p>
        </div>
      </div>
      <Forum />
    </div>
  )
}
