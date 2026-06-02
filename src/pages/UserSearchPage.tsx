import { UserSearch } from '../components/UserSearch'
import { Users } from 'lucide-react'

export function UserSearchPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Users className="w-6 h-6 text-nova-500" />
        <div>
          <h1 className="text-2xl font-bold">发现用户</h1>
          <p className="text-sm text-ink-500">搜索并关注创作者和达人</p>
        </div>
      </div>
      <UserSearch />
    </div>
  )
}
