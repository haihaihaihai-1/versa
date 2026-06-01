// ============== 用户主页 ==============

import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Settings as SettingsIcon, MessageCircle, UserPlus, UserMinus, MoreHorizontal, Flag, BadgeCheck, Shield, Crown, Sparkles, Grid3x3, Heart, Bookmark } from 'lucide-react'
import { UserAvatar, Username, ReputationBadge } from '../components/social/UserAvatar'
import { PostCard } from '../components/social/PostCard'
import { useAuth } from '../api/AuthContext'
import { useUser, useUserPosts, useStoreVersion, useFollowers, useFollowing } from '../api/hooks'
import api from '../api'
import { cn } from '../lib/utils'
import { roleLabel } from '../api/permissions'

const TABS: { key: string; label: string; icon: any; onlyOwner?: boolean }[] = [
  { key: 'posts', label: '帖子', icon: Grid3x3 },
  { key: 'liked', label: '喜欢', icon: Heart, onlyOwner: true },
  { key: 'saved', label: '收藏', icon: Bookmark, onlyOwner: true },
]

export function UserProfilePage() {
  const { username } = useParams<{ username: string }>()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const profile = useUser(api.users.byUsername(username || '')?.id)
  const profileId = profile?.id
  const posts = useUserPosts(profileId)
  const followers = useFollowers(profileId)
  const following = useFollowing(profileId)
  const [tab, setTab] = useState<string>('posts')
  const [menuOpen, setMenuOpen] = useState(false)
  useStoreVersion()

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold mb-2">用户不存在</h2>
        <button onClick={() => navigate(-1)} className="text-nova-600 hover:underline">返回</button>
      </div>
    )
  }

  const isMe = me?.id === profile.id
  const isFollowing = me ? api.follows.isFollowing(me.id, profile.id) : false

  const startChat = () => {
    if (!me) { navigate('/auth'); return }
    if (profile.privacy.allowMessages === 'followers' && !isFollowing && !isMe) {
      alert('对方仅接受关注者的私信')
      return
    }
    const conv = api.conversations.direct(me.id, profile.id)
    navigate(`/messages/${conv.id}`)
  }

  const toggleFollow = () => {
    if (!me) { navigate('/auth'); return }
    if (isFollowing) api.follows.unfollow(me.id, profile.id)
    else api.follows.follow(me.id, profile.id)
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Cover */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-nova-400 via-rose-400 to-shop-400">
        {profile.cover && <img src={profile.cover} alt="" className="w-full h-full object-cover" />}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 rounded-full bg-black/40 backdrop-blur text-white hover:bg-black/60"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Profile info */}
      <div className="px-4 sm:px-6 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-16">
          <div className="ring-4 ring-white dark:ring-ink-900 rounded-full inline-block">
            <UserAvatar user={profile} size="2xl" />
          </div>
          <div className="flex-1 sm:pb-2">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{profile.displayName}</h1>
              {profile.verified && <BadgeCheck className="w-5 h-5 text-nova-500" />}
              {profile.role === 'auditor' && <Shield className="w-5 h-5 text-amber-500" />}
              {profile.role === 'admin' && <Crown className="w-5 h-5 text-rose-500" />}
            </div>
            <div className="text-ink-500">@{profile.username}</div>
            <div className="mt-2 inline-block px-2 py-0.5 rounded-full bg-ink-100 dark:bg-ink-800 text-xs font-medium">
              {roleLabel(profile.role)}
            </div>
          </div>
          <div className="flex gap-2 sm:pb-2 relative">
            {isMe ? (
              <Link to="/settings" className="px-4 py-2 rounded-full bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 text-sm font-medium flex items-center gap-1.5">
                <SettingsIcon className="w-4 h-4" /> 编辑资料
              </Link>
            ) : (
              <>
                <button
                  onClick={toggleFollow}
                  className={cn(
                    'px-5 py-2 rounded-full text-sm font-semibold flex items-center gap-1.5 transition-colors',
                    isFollowing
                      ? 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300'
                      : 'bg-nova-500 hover:bg-nova-600 text-white'
                  )}
                >
                  {isFollowing ? <><UserMinus className="w-4 h-4" /> 已关注</> : <><UserPlus className="w-4 h-4" /> 关注</>}
                </button>
                <button
                  onClick={startChat}
                  className="px-4 py-2 rounded-full bg-ink-100 dark:bg-ink-800 hover:bg-ink-200 text-sm font-medium flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" /> 私信
                </button>
              </>
            )}
            <div className="relative">
              <button onClick={() => setMenuOpen((v) => !v)} className="px-3 py-2 rounded-full bg-ink-100 dark:bg-ink-800">
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-12 w-40 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-xl z-10">
                  {!isMe && (
                    <button onClick={() => { if (confirm('举报此用户？')) { api.reports.create({ reporterId: me!.id, targetType: 'user', targetId: profile.id, reason: 'other', description: '用户举报' }); alert('已提交'); setMenuOpen(false) } }} className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 text-debate-600 hover:bg-ink-50 dark:hover:bg-ink-800 rounded-xl">
                      <Flag className="w-4 h-4" /> 举报用户
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && <p className="mt-4 text-[15px]">{profile.bio}</p>}

        {/* Stats */}
        <div className="mt-4 flex items-center gap-6 text-sm">
          <div>
            <span className="font-bold">{profile.stats.postsCreated}</span> <span className="text-ink-500">帖子</span>
          </div>
          <Link to={`/u/${profile.username}/followers`} className="hover:underline">
            <span className="font-bold">{followers.length}</span> <span className="text-ink-500">关注者</span>
          </Link>
          <Link to={`/u/${profile.username}/following`} className="hover:underline">
            <span className="font-bold">{following.length}</span> <span className="text-ink-500">关注中</span>
          </Link>
          {profile.reputation > 100 && <ReputationBadge reputation={profile.reputation} />}
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-ink-200 dark:border-ink-800 flex gap-6">
          {TABS.filter((t) => (!t.onlyOwner || isMe)).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 py-3 text-sm font-medium transition-colors relative',
                tab === t.key ? 'text-nova-600' : 'text-ink-500 hover:text-ink-900'
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {tab === t.key && <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-nova-500" />}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6 space-y-4">
          {tab === 'posts' && (
            posts.length === 0 ? (
              <EmptyState text={isMe ? '你还没有发过帖子' : `${profile.displayName} 还没有发过帖子`} />
            ) : (
              posts.map((p) => <PostCard key={p.id} post={p} />)
            )
          )}
          {tab === 'liked' && <EmptyState text="喜欢的帖子展示" hint="（功能开发中）" />}
          {tab === 'saved' && <EmptyState text="收藏的帖子展示" hint="（功能开发中）" />}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="py-16 text-center text-ink-500">
      <Sparkles className="w-10 h-10 mx-auto mb-2 text-ink-300" />
      <p>{text}</p>
      {hint && <p className="text-xs mt-1 text-ink-400">{hint}</p>}
    </div>
  )
}
