import { SmartList } from '../components/SmartList'
import { Sparkles, ListChecks } from 'lucide-react'

export function SmartListPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ListChecks className="w-6 h-6 text-nova-500" />
          <h1 className="text-2xl font-bold">智能购物清单</h1>
        </div>
        <p className="text-sm text-ink-500">添加想买的东西,AI 帮你分析补充,所有数据本地保存</p>
      </div>
      <SmartList />
    </div>
  )
}
