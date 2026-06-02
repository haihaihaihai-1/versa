import { UserDashboard } from '../components/UserDashboard'
import { Sparkles } from 'lucide-react'

export function UserDashboardPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">我的工作台</h1>
          <p className="text-sm text-ink-500">可拖拽自定义的小组件面板</p>
        </div>
      </div>
      <UserDashboard />
    </div>
  )
}
