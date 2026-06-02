import { Calendar } from '../components/Calendar'
import { CalendarDays } from 'lucide-react'

export function CalendarPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <CalendarDays className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">我的日程</h1>
          <p className="text-sm text-ink-500">5 种类型日程 · 提醒 · 直播/会议/购物 跟踪</p>
        </div>
      </div>
      <Calendar />
    </div>
  )
}
