import { LiveCalendar } from '../components/LiveCalendar'
import { Calendar } from 'lucide-react'

export function LiveCalendarPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="w-6 h-6 text-rose-500" />
        <div>
          <h1 className="text-2xl font-bold">直播日历</h1>
          <p className="text-sm text-ink-500">订阅即将开播的直播</p>
        </div>
      </div>
      <LiveCalendar />
    </div>
  )
}
