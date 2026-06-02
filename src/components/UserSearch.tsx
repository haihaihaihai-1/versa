import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Search, Users, UserPlus, Check, Sparkles, Crown } from 'lucide-react'
import { cn, formatNumber } from '../lib/utils'
import { toast } from './ui/Toaster'

interface User {
  id: string
  name: string
  username: string
  avatar: string
  bio: string
  followers: number
  verified: boolean
  role: 'user' | 'creator' | 'admin' | 'auditor'
  tags: string[]
}

const USERS: User[] = [
  { id: 'u1', name: '购物达人王', username: 'shopper_king', avatar: 'https://i.pravatar.cc/100?img=11', bio: '专业测评 5 年, 帮你避坑', followers: 128000, verified: true, role: 'creator', tags: ['数码', '测评'] },
  { id: 'u2', name: '美食家 Lily', username: 'foodie_lily', avatar: 'https://i.pravatar.cc/100?img=20', bio: '吃遍全国, 寻找最地道的味道', followers: 96000, verified: true, role: 'creator', tags: ['美食', '探店'] },
  { id: 'u3', name: '穿搭博主 Mia', username: 'style_mia', avatar: 'https://i.pravatar.cc/100?img=25', bio: '高级感日常穿搭 | 168cm/48kg', followers: 215000, verified: true, role: 'creator', tags: ['时尚', '穿搭'] },
  { id: 'u4', name: '健身教练 Kevin', username: 'fit_kevin', avatar: 'https://i.pravatar.cc/100?img=33', bio: 'NSCA 认证 | 减脂塑形', followers: 54000, verified: false, role: 'creator', tags: ['健身', '营养'] },
  { id: 'u5', name: '数码小王子', username: 'tech_prince', avatar: 'https://i.pravatar.cc/100?img=51', bio: '第一时间上手最新数码', followers: 88000, verified: true, role: 'creator', tags: ['数码', '科技'] },
  { id: 'u6', name: '美妆师姐', username: 'beauty_senpai', avatar: 'https://i.pravatar.cc/100?img=45', bio: '理性种草, 科学护肤', followers: 156000, verified: true, role: 'creator', tags: ['美妆', '护肤'] },
  { id: 'u7', name: 'Versa 官方', username: 'versa_official', avatar: 'https://i.pravatar.cc/100?img=68', bio: '三体融合购物·社交·资讯·辩论', followers: 1200000, verified: true, role: 'admin', tags: ['官方'] },
  { id: 'u8', name: '小仙女 Amy', username: 'amy_fairy', avatar: 'https://i.pravatar.cc/100?img=12', bio: '热爱生活的小仙女', followers: 23000, verified: false, role: 'user', tags: ['生活', '旅行'] },
  { id: 'u9', name: '代码艺术家', username: 'code_artist', avatar: 'https://i.pravatar.cc/100?img=14', bio: '代码改变世界', followers: 67000, verified: false, role: 'creator', tags: ['科技', '编程'] },
  { id: 'u10', name: '辩论金牌', username: 'debate_champ', avatar: 'https://i.pravatar.cc/100?img=22', bio: '辩手 | 时事评论员', followers: 145000, verified: true, role: 'auditor', tags: ['辩论', '时评'] },
]

export function UserSearch() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'creator' | 'verified' | 'admin'>('all')
  const [following, setFollowing] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    return USERS.filter((u) => {
      if (filter === 'creator' && u.role !== 'creator') return false
      if (filter === 'admin' && u.role !== 'admin') return false
      if (filter === 'verified' && !u.verified) return false
      if (!q) return true
      return u.name.includes(q) || u.username.includes(q) || u.tags.some((t) => t.includes(q))
    })
  }, [q, filter])

  const toggleFollow = (id: string) => {
    setFollowing((s) => {
      const next = new Set(s)
      if (next.has(id)) { next.delete(id); toast('已取消关注', 'info') }
      else { next.add(id); toast('已关注', 'success') }
      return next
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-1.5">
          <Users className="w-5 h-5 text-nova-500" />
          发现用户
        </h3>
        <span className="text-xs text-ink-500">{filtered.length} 位</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索用户名、昵称、标签..."
          className="w-full pl-9 pr-3 h-10 rounded-xl bg-white/80 dark:bg-ink-900/40 border border-ink-200 dark:border-ink-800 outline-none focus:ring-2 focus:ring-nova-500"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'all', label: '全部' },
          { key: 'creator', label: '创作者' },
          { key: 'verified', label: '已认证' },
          { key: 'admin', label: '官方' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={cn(
              'px-3 h-7 rounded-full text-xs font-medium flex-shrink-0',
              filter === f.key ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map((u) => {
          const isFollowed = following.has(u.id)
          const isAdmin = u.role === 'admin'
          return (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-3 flex items-center gap-3"
            >
              <Link to={`/u/${u.username}`}>
                <div className="relative">
                  <img src={u.avatar} alt={u.name} className={cn('w-12 h-12 rounded-full', isAdmin && 'ring-2 ring-amber-500')} />
                  {u.verified && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <Link to={`/u/${u.username}`} className="font-semibold text-sm hover:text-nova-500 truncate">{u.name}</Link>
                  {u.role === 'creator' && <Sparkles className="w-3 h-3 text-rose-500" />}
                  {isAdmin && <Crown className="w-3 h-3 text-amber-500" />}
                </div>
                <p className="text-[10px] text-ink-500">@{u.username} · {formatNumber(u.followers)} 粉丝</p>
                <p className="text-xs text-ink-600 dark:text-ink-300 line-clamp-1 mt-0.5">{u.bio}</p>
              </div>
              <button
                onClick={() => toggleFollow(u.id)}
                className={cn(
                  'px-2.5 h-7 rounded-lg text-xs font-medium flex items-center gap-0.5 flex-shrink-0',
                  isFollowed ? 'bg-ink-100 dark:bg-ink-800 text-ink-600' : 'bg-gradient-to-r from-nova-500 to-pink-500 text-white'
                )}
              >
                {isFollowed ? <><Check className="w-3 h-3" />已关注</> : <><UserPlus className="w-3 h-3" />关注</>}
              </button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
