import { MyContent } from '../components/MyContent'
import { Inbox } from 'lucide-react'

export function MyContentPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Inbox className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">我的内容</h1>
          <p className="text-sm text-ink-500">统一管理所有创建的内容</p>
        </div>
      </div>
      <MyContent />
    </div>
  )
}
