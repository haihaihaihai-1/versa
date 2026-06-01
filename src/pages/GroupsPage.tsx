// ============== 群组列表 ==============

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Plus, Users, Newspaper, Scale, ShoppingBag, Sparkles, Search } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import { useGroups, useMyGroups, useApi } from '../api/hooks'
import { useStoreVersion } from '../api/hooks'
import api from '../api'
import { cn } from '../lib/utils'

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'news', label: '资讯', icon: Newspaper },
  { key: 'debate', label: '辩论', icon: Scale },
  { key: 'shop', label: '购物', icon: ShoppingBag },
  { key: 'lifestyle', label: '生活', icon: Sparkles },
] as const

export function GroupsPage() {
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const groups = useGroups()
  const myGroups = useMyGroups()
  const [filter, setFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  useStoreVersion()

  const filtered = groups.filter((g) => {
    if (filter !== 'all' && g.module !== filter) return false
    if (query && !g.name.toLowerCase().includes(query.toLowerCase()) && !g.description.toLowerCase().includes(query.toLowerCase())) return false
    return true
  })

  const createGroup = () => {
    if (!me) { navigate('/auth'); return }
    const name = prompt('群组名称：')
    if (!name) return
    const desc = prompt('群组简介：') || ''
    const g = api.groups.create({ name, description: desc, module: 'none', tags: [], ownerId: me.id })
    navigate(`/groups/${g.id}`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">群组</h1>
          <p className="text-sm text-ink-500 mt-1">与同好聚集，让讨论更有温度</p>
        </div>
        <button
          onClick={createGroup}
          className="px-4 py-2 rounded-full bg-nova-500 text-white text-sm font-medium flex items-center gap-1.5 hover:bg-nova-600"
        >
          <Plus className="w-4 h-4" /> 创建群组
        </button>
      </div>

      {/* My groups */}
      {me && myGroups.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-ink-500 mb-3">我加入的</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myGroups.slice(0, 6).map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        </div>
      )}

      {/* Filters & search */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索群组..."
            className="w-full pl-10 pr-3 py-2 rounded-full bg-ink-100 dark:bg-ink-800 text-sm outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                filter === f.key ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800 hover:bg-ink-200'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* All groups */}
      <h2 className="text-sm font-semibold text-ink-500 mb-3">发现群组</h2>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-ink-500">没有匹配的群组</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((g) => <GroupCard key={g.id} group={g} />)}
        </div>
      )}
    </div>
  )
}

function GroupCard({ group }: { group: any }) {
  return (
    <Link
      to={`/groups/${group.id}`}
      className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="h-24 bg-gradient-to-br from-nova-400 to-rose-500 relative">
        {group.cover && <img src={group.cover} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="p-4">
        <h3 className="font-bold mb-1 line-clamp-1">{group.name}</h3>
        <p className="text-sm text-ink-500 line-clamp-2 mb-3">{group.description}</p>
        <div className="flex items-center justify-between text-xs text-ink-500">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> {group.memberCount} 成员
          </div>
          <div className="flex gap-1">
            {group.tags.slice(0, 2).map((t: string) => <span key={t}>{t}</span>)}
          </div>
        </div>
      </div>
    </Link>
  )
}
