import { LiveSubscriptions } from '../components/LiveSubscriptions'
import { Video } from 'lucide-react'

export function LiveSubsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Video className="w-6 h-6 text-rose-500" />
        <div>
          <h1 className="text-2xl font-bold">直播订阅</h1>
          <p className="text-sm text-ink-500">订阅喜欢的主播, 开播/上新时收到通知</p>
        </div>
      </div>
      <LiveSubscriptions />
    </div>
  )
}
