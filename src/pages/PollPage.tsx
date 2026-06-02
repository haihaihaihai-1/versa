import { PollSystem } from '../components/PollSystem'
import { Vote } from 'lucide-react'

export function PollPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Vote className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">投票广场</h1>
          <p className="text-sm text-ink-500">参与或发起话题投票</p>
        </div>
      </div>
      <PollSystem />
    </div>
  )
}
