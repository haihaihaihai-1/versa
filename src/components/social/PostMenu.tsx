// ============== 帖子操作菜单 ==============

import { useRef, useEffect } from 'react'
import { Bookmark, Flag, Trash2, Copy, Link as LinkIcon, UserX } from 'lucide-react'
import api from '../../api'
import { useAuth } from '../../api/AuthContext'
import { useNavigate } from 'react-router-dom'
import { can } from '../../api/permissions'
import type { Post } from '../../api/types'

interface PostMenuProps {
  post: Post
  onClose: () => void
}

export function PostMenu({ post, onClose }: PostMenuProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { user: me } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [onClose])

  if (!me) return null

  const isOwner = post.authorId === me.id
  const canDelete = can(me, isOwner ? 'post.delete_own' : 'post.delete_any', { authorId: post.authorId }).allowed

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/versa/p/' + post.id)
    alert('链接已复制')
    onClose()
  }

  const report = () => {
    const reason = prompt('举报原因：', '不合适的内容')
    if (!reason) return
    api.reports.create({ reporterId: me.id, targetType: 'post', targetId: post.id, reason: 'other', description: reason })
    alert('已提交，我们会尽快处理')
    onClose()
  }

  const deletePost = () => {
    if (!confirm('确定要删除这条帖子吗？')) return
    api.posts.delete(post.id)
    alert('已删除')
    navigate(-1)
  }

  return (
    <div ref={ref} className="absolute right-0 top-12 w-48 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 shadow-xl z-50 overflow-hidden">
      <button onClick={copyLink} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-ink-50 dark:hover:bg-ink-800">
        <LinkIcon className="w-4 h-4" /> 复制链接
      </button>
      <button className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-ink-50 dark:hover:bg-ink-800">
        <Bookmark className="w-4 h-4" /> 收藏
      </button>
      {!isOwner && (
        <button onClick={report} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-ink-50 dark:hover:bg-ink-800 text-debate-600">
          <Flag className="w-4 h-4" /> 举报
        </button>
      )}
      {canDelete && (
        <>
          <div className="border-t border-ink-100 dark:border-ink-800" />
          <button onClick={deletePost} className="w-full px-4 py-2.5 text-left text-sm flex items-center gap-2 hover:bg-debate-50 dark:hover:bg-debate-900/30 text-debate-600">
            <Trash2 className="w-4 h-4" /> 删除
          </button>
        </>
      )}
    </div>
  )
}
