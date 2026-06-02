import { TagCloud } from '../components/TagCloud'
import { Hash } from 'lucide-react'

export function TagCloudPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Hash className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">热门标签</h1>
          <p className="text-sm text-ink-500">发现热门话题和内容趋势</p>
        </div>
      </div>
      <TagCloud />
    </div>
  )
}
