import { InboxPage as Inbox } from '../components/InboxPage'
import { Inbox as InboxIcon } from 'lucide-react'

export function InboxPageRoute() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <InboxIcon className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">站内信</h1>
          <p className="text-sm text-ink-500">收件箱 · 已发送 · 星标 · 回收站</p>
        </div>
      </div>
      <Inbox />
    </div>
  )
}
