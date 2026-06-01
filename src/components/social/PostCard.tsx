// ============== 帖子卡片 (动态、详情) ==============

import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  Heart, MessageCircle, Repeat2, Share2, Bookmark, MoreHorizontal,
  BarChart3, ExternalLink, Eye,
} from 'lucide-react'
import { UserAvatar, Username, ReputationBadge } from './UserAvatar'
import { ReactionPicker, ReactionDisplay } from './ReactionPicker'
import { PostMenu } from './PostMenu'
import { useAuth } from '../../api/AuthContext'
import { useApi } from '../../api/hooks'
import api from '../../api'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '../../lib/utils'
import type { Post } from '../../api/types'

interface PostCardProps {
  post: Post
  onCommentClick?: (post: Post) => void
  showReactions?: boolean
  compact?: boolean
}

export function PostCard({ post, onCommentClick, showReactions = true, compact = false }: PostCardProps) {
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const author = useApi(() => api.users.get(post.authorId))
  const comments = useApi(() => api.comments.forPost(post.id))
  const [menuOpen, setMenuOpen] = useState(false)

  if (!author) return null

  const myReactions = me ? Object.entries(post.reactions).find(([, users]) => users.includes(me.id))?.[0] as any : null
  const topReactions = Object.entries(post.reactions)
    .filter(([, users]) => users.length > 0)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 3)

  return (
    <article className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <header className="flex items-center gap-3 p-4">
        <UserAvatar user={author} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Username user={author} />
            {author.reputation > 100 && <ReputationBadge reputation={author.reputation} />}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
            <time>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: zhCN })}</time>
            {post.refType !== 'none' && (
              <>
                <span>·</span>
                <span className="text-nova-600">{refLabel(post.refType)}</span>
              </>
            )}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
            className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
            aria-label="更多"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {menuOpen && <PostMenu post={post} onClose={() => setMenuOpen(false)} />}
        </div>
      </header>

      {/* Body */}
      <div className={cn('px-4 pb-2 cursor-pointer', !compact && 'cursor-pointer')} onClick={() => navigate(`/p/${post.id}`)}>
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
          {post.content}
        </p>

        {/* Hashtags */}
        {post.hashtags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {post.hashtags.map((tag) => (
              <Link
                key={tag}
                to={`/feed?tag=${encodeURIComponent(tag)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sm text-nova-600 dark:text-nova-400 hover:underline"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}

        {/* Reference card (linked news/debate/product) */}
        {post.refType !== 'none' && post.refId && <RefCard refType={post.refType} refId={post.refId} />}

        {/* Images */}
        {post.images.length > 0 && (
          <div className={cn('mt-3 grid gap-1 rounded-xl overflow-hidden', post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
            {post.images.slice(0, 4).map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
            ))}
          </div>
        )}

        {/* Poll */}
        {post.poll && <PollCard post={post} />}

        {/* Reactions summary */}
        {showReactions && topReactions.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-ink-500">
            <ReactionDisplay reactions={topReactions as any} />
            <span>·</span>
            <span>{post.commentsCount} 评论</span>
            {post.views > 0 && (
              <>
                <span>·</span>
                <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" /> {post.views}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <footer className="px-2 py-1.5 border-t border-ink-100 dark:border-ink-800 flex items-center justify-around">
        {me ? (
          <ReactionPicker
            current={myReactions}
            onReact={(r) => api.posts.toggleReact(post.id, me.id, r)}
          />
        ) : (
          <Link to="/auth" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-800">
            <Heart className="w-4 h-4" /> 喜欢
          </Link>
        )}
        <button
          onClick={() => onCommentClick ? onCommentClick(post) : navigate(`/p/${post.id}#comments`)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors"
        >
          <MessageCircle className="w-4 h-4" /> 评论 <span className="text-xs text-ink-500">{post.commentsCount > 0 && post.commentsCount}</span>
        </button>
        <button
          onClick={() => { alert('已保存草稿') }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors"
        >
          <Repeat2 className="w-4 h-4" /> 转发
        </button>
        <button
          onClick={() => { if (navigator.share) navigator.share({ title: '分享 Versa 帖子', url: window.location.origin + '/versa/p/' + post.id }).catch(() => {}); else { navigator.clipboard.writeText(window.location.origin + '/versa/p/' + post.id); alert('链接已复制') } }}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm text-ink-700 dark:text-ink-300 hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors"
        >
          <Share2 className="w-4 h-4" /> 分享
        </button>
        <button className="p-2 rounded-lg text-ink-500 hover:bg-ink-50 dark:hover:bg-ink-800">
          <Bookmark className="w-4 h-4" />
        </button>
      </footer>
    </article>
  )
}

function refLabel(t: string) {
  const map: Record<string, string> = { news: '关联资讯', debate: '关联辩题', shop: '关联商品', group: '来自群组' }
  return map[t] || t
}

function RefCard({ refType, refId }: { refType: string; refId: string }) {
  const item = useApi(() => {
    if (refType === 'news') return api.modules.news().find((n: any) => n.id === refId)
    if (refType === 'debate') return api.modules.debates().find((d: any) => d.id === refId)
    if (refType === 'shop') return api.modules.products().find((p: any) => p.id === refId)
    return null
  })
  if (!item) return null

  let path = '#'
  let title = ''
  let subtitle = ''
  let image = ''
  if (refType === 'news') { path = `/news/${refId}`; title = item.title; subtitle = item.subtitle; image = item.cover }
  else if (refType === 'debate') { path = `/debates/${refId}`; title = item.title; subtitle = item.description; image = item.cover || '' }
  else if (refType === 'shop') { path = `/shop/${refId}`; title = item.name; subtitle = item.tagline; image = item.images?.[0] || '' }

  return (
    <Link
      to={path}
      onClick={(e) => e.stopPropagation()}
      className="mt-3 flex gap-3 p-3 rounded-xl border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-800/30 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
    >
      {image && <img src={image} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-nova-600 font-medium mb-1">{refType === 'news' ? '资讯' : refType === 'debate' ? '辩题' : '商品'}</div>
        <div className="font-semibold text-sm line-clamp-2 mb-0.5">{title}</div>
        {subtitle && <div className="text-xs text-ink-500 line-clamp-1">{subtitle}</div>}
      </div>
      <ExternalLink className="w-4 h-4 text-ink-400 flex-shrink-0 mt-1" />
    </Link>
  )
}

function PollCard({ post }: { post: Post }) {
  const { user: me } = useAuth()
  if (!post.poll) return null
  const totalVotes = post.poll.options.reduce((s, o) => s + o.votes.length, 0)
  const myVote = me ? post.poll.options.find((o) => o.votes.includes(me.id))?.id : null

  return (
    <div className="mt-3 p-3 rounded-xl border border-ink-200 dark:border-ink-800 bg-ink-50/50 dark:bg-ink-800/30">
      <div className="flex items-center gap-2 mb-2 text-sm font-medium">
        <BarChart3 className="w-4 h-4 text-nova-500" />
        {post.poll.question}
      </div>
      <div className="space-y-1.5">
        {post.poll.options.map((opt) => {
          const percent = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0
          const isMine = opt.id === myVote
          return (
            <button
              key={opt.id}
              onClick={(e) => { e.stopPropagation(); if (me) api.posts.pollVote(post.id, opt.id, me.id) }}
              disabled={!me}
              className={cn(
                'relative w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors',
                isMine
                  ? 'border-nova-500 bg-nova-50 dark:bg-nova-900/30'
                  : 'border-ink-200 dark:border-ink-800 hover:border-nova-300',
                !me && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-center justify-between gap-2 relative z-10">
                <span className="font-medium">{opt.text}</span>
                <span className="text-xs text-ink-500">{percent}%</span>
              </div>
              <div
                className="absolute inset-y-0 left-0 bg-nova-200/40 dark:bg-nova-800/40 rounded-lg transition-all"
                style={{ width: `${percent}%` }}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-2 text-xs text-ink-500">{totalVotes} 票{me && (myVote ? ' · 你已投' : ' · 点击投票')}</div>
    </div>
  )
}
