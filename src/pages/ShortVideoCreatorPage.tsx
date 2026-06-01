import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Heart, MessageCircle, Bookmark, Plus, Check } from 'lucide-react'
import { useVersa, versa } from '../store/versa'
import { seedCreators } from '../data/shortVideos'
import { formatNumber } from '../lib/utils'

export default function ShortVideoCreatorPage() {
  const { creatorId } = useParams<{ creatorId: string }>()
  const navigate = useNavigate()
  const { shortVideos, followingCreators } = useVersa()
  const [tab, setTab] = useState<'videos' | 'liked' | 'about'>('videos')

  const creator = seedCreators.find((c) => c.id === creatorId)
  const videos = useMemo(() => shortVideos.filter((v) => v.creatorId === creatorId), [shortVideos, creatorId])
  const following = creatorId ? followingCreators.includes(creatorId) : false

  if (!creator) {
    return (
      <div className="min-h-screen flex items-center justify-center text-ink-500">
        创作者不存在
      </div>
    )
  }

  const totalLikes = videos.reduce((a, v) => a + v.likes, 0)
  const totalViews = videos.reduce((a, v) => a + v.views, 0)

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/40 via-white to-pink-50/30 pb-20">
      {/* Hero 渐变 */}
      <div className="relative h-44 bg-gradient-to-br from-rose-400 via-pink-500 to-fuchsia-500">
        <button
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/20 backdrop-blur text-white flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-16">
        {/* 头像 + 名字 */}
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-end gap-3">
            <img
              src={creator.avatar}
              alt=""
              className="w-24 h-24 rounded-full border-4 border-white shadow-xl bg-white"
            />
            <div className="pb-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold text-ink-900">{creator.displayName}</h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-medium">L{creator.level}</span>
              </div>
              <p className="text-xs text-ink-500">@{creator.username}</p>
            </div>
          </div>
          {following ? (
            <button
              onClick={() => versa.toggleFollowCreator(creator.id)}
              className="flex items-center gap-1 px-4 py-2 rounded-full border border-ink-200 text-sm font-medium text-ink-700"
            >
              <Check className="w-3.5 h-3.5" />已关注
            </button>
          ) : (
            <button
              onClick={() => versa.toggleFollowCreator(creator.id)}
              className="flex items-center gap-1 px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-medium shadow-lg shadow-rose-500/30"
            >
              <Plus className="w-3.5 h-3.5" />关注
            </button>
          )}
        </div>

        {/* 简介 */}
        <p className="text-sm text-ink-600 mb-4">{creator.bio}</p>

        {/* 数据 */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <StatCard label="作品" value={String(videos.length)} />
          <StatCard label="获赞" value={formatNumber(totalLikes)} color="text-rose-500" />
          <StatCard label="播放" value={formatNumber(totalViews)} color="text-pink-500" />
        </div>

        {/* Tab */}
        <div className="flex gap-6 mb-4 border-b border-ink-100">
          {[{ k: 'videos', l: '作品' }, { k: 'liked', l: '喜欢' }, { k: 'about', l: '关于' }].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className={`relative py-2.5 text-sm font-medium ${
                tab === t.k ? 'text-rose-500' : 'text-ink-500'
              }`}
            >
              {t.l}
              {tab === t.k && <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-6 h-0.5 bg-rose-500 rounded-full" />}
            </button>
          ))}
        </div>

        {/* 内容 */}
        {tab === 'videos' && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {videos.map((v) => (
              <button
                key={v.id}
                onClick={() => navigate(`/shop/shorts/${v.id}`)}
                className="relative aspect-[9/14] rounded-md overflow-hidden group"
                style={{ background: v.coverGradient }}
              >
                <div className="absolute bottom-1.5 left-1.5 right-1.5 text-white text-[10px] font-medium truncate">{v.title}</div>
                <div className="absolute top-1.5 right-1.5 text-white text-[10px] flex items-center gap-0.5">
                  <Heart className="w-2.5 h-2.5 fill-white" />{formatNumber(v.likes)}
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'liked' && (
          <div className="text-center py-20 text-ink-400 text-sm">该创作者暂未公开喜欢列表</div>
        )}

        {tab === 'about' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-4 border border-ink-100">
              <h3 className="text-sm font-semibold text-ink-700 mb-2">创作者信息</h3>
              <div className="space-y-1.5 text-sm text-ink-600">
                <p>等级：L{creator.level} 创作者</p>
                <p>作品：{videos.length} 个</p>
                <p>总获赞：{formatNumber(totalLikes)}</p>
                <p>总播放：{formatNumber(totalViews)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-ink-100">
              <h3 className="text-sm font-semibold text-ink-700 mb-2">联系方式</h3>
              <p className="text-sm text-ink-500">暂无公开联系方式</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color = 'text-ink-900' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-xl p-3 border border-ink-100 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-ink-500 mt-0.5">{label}</p>
    </div>
  )
}
