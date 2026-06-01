// ============== 帖子详情 ==============

import { useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Send, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { PostCard } from '../components/social/PostCard'
import { UserAvatar, Username, ReputationBadge } from '../components/social/UserAvatar'
import { useAuth } from '../api/AuthContext'
import { usePost, useComments, useUser, useApi } from '../api/hooks'
import api from '../api'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '../lib/utils'

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const post = usePost(id)
  const author = useUser(post?.authorId)
  const comments = useComments(id)
  const [reply, setReply] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)

  useEffect(() => {
    if (post) api.posts.incrementViews(post.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (!post || !author) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold mb-2">帖子不存在或已被删除</h2>
        <button onClick={() => navigate('/feed')} className="text-nova-600 hover:underline">返回动态</button>
      </div>
    )
  }

  const submitComment = () => {
    if (!reply.trim() || !me) return
    api.comments.create({ postId: post.id, authorId: me.id, content: reply.trim(), parentId: replyTo || undefined })
    setReply('')
    setReplyTo(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-ink-500 hover:text-ink-900 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      <div id="comments">
        <PostCard post={post} showReactions={false} />
      </div>

      {/* Comments */}
      <div className="mt-6 bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <MessageCircle className="w-4 h-4" /> 评论 {comments.length}
        </h3>

        {me ? (
          <div className="mb-4 flex items-start gap-3">
            <UserAvatar user={me} size="sm" />
            <div className="flex-1">
              {replyTo && (
                <div className="text-xs text-nova-600 mb-1">回复 {comments.find((c) => c.id === replyTo) ? '@' + (api.users.get(comments.find((c) => c.id === replyTo)!.authorId)?.displayName) : ''} <button onClick={() => setReplyTo(null)} className="ml-1 text-ink-400">×</button></div>
              )}
              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={2}
                placeholder={replyTo ? '写回复...' : '写评论...'}
                className="w-full px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-800/50 text-sm outline-none focus:border-nova-500"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={submitComment}
                  disabled={!reply.trim()}
                  className="px-3 py-1.5 rounded-full bg-nova-500 hover:bg-nova-600 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> 发送
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 text-center text-sm text-ink-500 py-3">
            <Link to="/auth" className="text-nova-600 hover:underline">登录</Link> 后参与评论
          </div>
        )}

        {comments.length === 0 ? (
          <div className="text-center text-sm text-ink-400 py-8">还没有人评论，沙发等你</div>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => (
              <CommentItem key={c.id} comment={c} onReply={(id) => setReplyTo(id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CommentItem({ comment, onReply }: { comment: any; onReply: (id: string) => void }) {
  const author = useUser(comment.authorId)
  const { user: me } = useAuth()
  const [showActions, setShowActions] = useState(false)

  if (!author) return null

  return (
    <div
      className="flex items-start gap-3 group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <UserAvatar user={author} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="bg-ink-50 dark:bg-ink-800/50 rounded-2xl px-4 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <Username user={author} withHandle={false} className="text-sm" />
            {author.reputation > 100 && <ReputationBadge reputation={author.reputation} />}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
        </div>
        <div className="flex items-center gap-3 mt-1 ml-2 text-xs text-ink-500">
          <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: zhCN })}</span>
          {me && (
            <button onClick={() => onReply(comment.id)} className="hover:text-nova-600">回复</button>
          )}
          {me && me.id === comment.authorId && (
            <button onClick={() => { if (confirm('删除评论？')) api.comments.delete(comment.id) }} className="hover:text-debate-600">删除</button>
          )}
        </div>
      </div>
    </div>
  )
}
