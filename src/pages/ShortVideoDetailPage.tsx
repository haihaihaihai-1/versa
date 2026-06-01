import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Heart, MessageCircle, Share2, Bookmark, Music, MapPin, Volume2, VolumeX,
  X, Send, ChevronUp, Plus
} from 'lucide-react'
import { useVersa, versa } from '../store/versa'
import { formatNumber, formatTimeAgo } from '../lib/utils'

export default function ShortVideoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { shortVideos, shortVideoComments, followingCreators } = useVersa()
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [following, setFollowing] = useState(false)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  const video = shortVideos.find((v) => v.id === id)
  const comments = shortVideoComments.filter((c) => c.videoId === id)

  useEffect(() => {
    if (video) versa.viewShortVideo(video.id)
  }, [video?.id])

  useEffect(() => {
    if (followingCreators.includes(video?.creatorId || '')) setFollowing(true)
  }, [video?.creatorId, followingCreators])

  useEffect(() => {
    lastTimeRef.current = performance.now()
    const tick = (now: number) => {
      const delta = (now - lastTimeRef.current) / 1000
      lastTimeRef.current = now
      setProgress((p) => {
        const next = p + (delta / (video?.duration || 30)) * 100
        if (next >= 100) {
          setProgress(0)
          return 0
        }
        return next
      })
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [video?.duration])

  if (!video) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black text-white">
        <p>视频不存在</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col">
      {/* 视频区 */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{ background: video.coverGradient }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center animate-pulse">
            <Music className="w-10 h-10 text-white/80" />
          </div>
        </div>

        {/* 顶部 */}
        <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-20">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
          <div className="text-xs text-white/80">{formatNumber(video.views)} 次播放</div>
        </div>

        {/* 进度条 */}
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/20 z-10">
          <div className="h-full bg-white" style={{ width: `${progress}%` }} />
        </div>

        {/* 底部信息 */}
        <div className="absolute bottom-4 left-0 right-16 px-4 z-20">
          {/* 创作者 */}
          <div className="flex items-center gap-2.5 mb-3">
            <img src={video.creatorAvatar} alt="" className="w-10 h-10 rounded-full border-2 border-white" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm">@{video.creatorName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white">L{video.creatorLevel}</span>
              </div>
              <p className="text-[11px] text-white/70 line-clamp-1">{video.location} · {formatTimeAgo(video.createdAt)}</p>
            </div>
            {following ? (
              <button
                onClick={() => { versa.toggleFollowCreator(video.creatorId); setFollowing(false) }}
                className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 border border-white/30"
              >
                已关注
              </button>
            ) : (
              <button
                onClick={() => { versa.toggleFollowCreator(video.creatorId); setFollowing(true) }}
                className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-rose-500 to-pink-500 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />关注
              </button>
            )}
          </div>
          {/* 文案 */}
          <p className="text-sm mb-2 leading-relaxed">{video.description}</p>
          {/* 标签 */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {video.tags.map((t) => (
              <span key={t} className="text-[11px] text-white/80">#{t}</span>
            ))}
          </div>
          {/* 音乐 */}
          <div className="flex items-center gap-1.5 text-[11px] text-white/80">
            <Music className="w-3 h-3" />
            <span className="truncate">{video.music}</span>
            <span className="animate-pulse">♪</span>
          </div>
        </div>

        {/* 右侧按钮栏 */}
        <div className="absolute right-2 bottom-20 flex flex-col items-center gap-5 z-20">
          <SideAction
            icon={Heart}
            count={formatNumber(video.likes + (liked ? 1 : 0))}
            active={liked}
            activeColor="text-rose-500 fill-rose-500"
            onClick={() => { versa.likeShortVideo(video.id); setLiked(true) }}
          />
          <SideAction
            icon={MessageCircle}
            count={formatNumber(comments.length)}
            onClick={() => setCommentOpen(true)}
          />
          <SideAction icon={Bookmark} count={formatNumber(video.favorites + (saved ? 1 : 0))} active={saved} activeColor="text-yellow-400 fill-yellow-400" onClick={() => setSaved((s) => !s)} />
          <SideAction icon={Share2} count={formatNumber(video.shares)} />
          <button
            onClick={() => setMuted((m) => !m)}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 底部评论抽屉 */}
      {commentOpen && (
        <div className="absolute inset-0 z-30 flex items-end" onClick={() => setCommentOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-h-[70vh] bg-white text-ink-900 rounded-t-2xl flex flex-col"
          >
            <div className="p-4 border-b border-ink-100 flex items-center justify-between">
              <span className="font-semibold">评论 · {comments.length}</span>
              <button onClick={() => setCommentOpen(false)}>
                <ChevronUp className="w-5 h-5 text-ink-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {comments.length === 0 ? (
                <p className="text-center text-ink-400 text-sm py-8">抢沙发～</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex gap-2.5">
                    <img src={c.userAvatar} alt="" className="w-8 h-8 rounded-full bg-ink-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-ink-700">{c.userName}</span>
                        <span className="text-[10px] text-ink-400">{formatTimeAgo(c.createdAt)}</span>
                      </div>
                      <p className="text-sm text-ink-800 mt-0.5">{c.content}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-ink-400">
                        <span className="flex items-center gap-0.5">
                          <Heart className="w-3 h-3" />{c.likes}
                        </span>
                        <span>回复</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-ink-100 flex items-center gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="说点好听的～"
                className="flex-1 px-3 py-2 bg-ink-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    versa.addShortVideoComment(video.id, commentText.trim())
                    setCommentText('')
                  }
                }}
              />
              <button
                onClick={() => {
                  if (!commentText.trim()) return
                  versa.addShortVideoComment(video.id, commentText.trim())
                  setCommentText('')
                }}
                className="w-9 h-9 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SideAction({ icon: Icon, count, active, activeColor, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-0.5">
      <div className="w-10 h-10 rounded-full bg-black/30 backdrop-blur flex items-center justify-center">
        <Icon className={`w-5 h-5 ${active ? activeColor : 'text-white'}`} />
      </div>
      <span className="text-[10px] font-medium">{count}</span>
    </button>
  )
}
