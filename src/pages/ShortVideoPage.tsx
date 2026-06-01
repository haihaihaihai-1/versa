import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Heart, MessageCircle, Share2, Bookmark, Music, MapPin, Volume2, VolumeX, Play,
  Coffee, Shirt, Smartphone, Sparkles, Home as HomeIcon, Plane, Dumbbell, BookOpen,
  Plus
} from 'lucide-react'
import { useVersa } from '../store/versa'
import type { ShortVideo, ShortVideoCategory } from '../data/types'
import { formatNumber } from '../lib/utils'

const TABS: { key: 'recommend' | 'follow' | 'local'; label: string }[] = [
  { key: 'recommend', label: '推荐' },
  { key: 'follow', label: '关注' },
  { key: 'local', label: '同城' },
]

const CATEGORIES: { key: ShortVideoCategory | 'all'; label: string; icon: any; gradient: string }[] = [
  { key: 'all', label: '全部', icon: Sparkles, gradient: 'from-rose-400 to-pink-500' },
  { key: 'food', label: '美食', icon: Coffee, gradient: 'from-amber-400 to-orange-500' },
  { key: 'fashion', label: '穿搭', icon: Shirt, gradient: 'from-pink-400 to-rose-500' },
  { key: 'tech', label: '数码', icon: Smartphone, gradient: 'from-blue-400 to-cyan-500' },
  { key: 'beauty', label: '美妆', icon: Sparkles, gradient: 'from-fuchsia-400 to-pink-500' },
  { key: 'home', label: '家居', icon: HomeIcon, gradient: 'from-emerald-400 to-teal-500' },
  { key: 'travel', label: '旅行', icon: Plane, gradient: 'from-sky-400 to-blue-500' },
  { key: 'fitness', label: '健身', icon: Dumbbell, gradient: 'from-violet-400 to-purple-500' },
  { key: 'lifestyle', label: '生活', icon: BookOpen, gradient: 'from-yellow-400 to-amber-500' },
]

export default function ShortVideoPage() {
  const { shortVideos, followingCreators } = useVersa()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'recommend' | 'follow' | 'local'>('recommend')
  const [cat, setCat] = useState<ShortVideoCategory | 'all'>('all')

  const filtered = useMemo(() => {
    let list = [...shortVideos]
    if (tab === 'follow') list = list.filter((v) => followingCreators.includes(v.creatorId))
    if (cat !== 'all') list = list.filter((v) => v.category === cat)
    return list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
  }, [shortVideos, tab, cat, followingCreators])

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-pink-50/40 pb-20">
      <div className="max-w-7xl mx-auto px-4 pt-6">
        {/* 顶部标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-500 to-pink-600 bg-clip-text text-transparent">
              短视频
            </h1>
            <p className="text-sm text-ink-500 mt-1">发现真实好物 · 创作者推荐</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-medium shadow-lg shadow-rose-500/30">
            <Plus className="w-4 h-4" />投稿
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex items-center gap-6 mb-4 border-b border-ink-100 sticky top-0 bg-white/80 backdrop-blur z-10 -mx-4 px-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative py-3 text-sm font-medium transition ${
                tab === t.key ? 'text-rose-500' : 'text-ink-500 hover:text-ink-700'
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* 分类 */}
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-3 mb-2 scrollbar-none">
          {CATEGORIES.map((c) => {
            const Icon = c.icon
            const active = cat === c.key
            return (
              <button
                key={c.key}
                onClick={() => setCat(c.key as any)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? `bg-gradient-to-r ${c.gradient} text-white shadow-md`
                    : 'bg-white text-ink-600 border border-ink-200 hover:border-rose-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {c.label}
              </button>
            )
          })}
        </div>

        {/* 视频瀑布流 */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-ink-400">
            <p className="text-sm">暂无相关视频，换个分类试试～</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((v) => (
              <ShortVideoCard key={v.id} video={v} onClick={() => navigate(`/shop/shorts/${v.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ShortVideoCard({ video, onClick }: { video: ShortVideo; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group text-left bg-white rounded-2xl overflow-hidden border border-ink-100 hover:shadow-xl hover:-translate-y-0.5 transition-all"
    >
      <div
        className="relative aspect-[9/14] overflow-hidden"
        style={{ background: video.coverGradient }}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
          <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-2xl">
            <Play className="w-6 h-6 text-rose-500 fill-rose-500 ml-0.5" />
          </div>
        </div>
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur text-[10px] text-white font-medium">
          {video.duration}″
        </div>
        <div className="absolute bottom-0 inset-x-0 p-2.5 bg-gradient-to-t from-black/60 to-transparent">
          <p className="text-white text-xs font-medium line-clamp-2">{video.title}</p>
        </div>
        <div className="absolute top-2 left-2 flex items-center gap-1 text-white text-[10px]">
          <Music className="w-3 h-3" />
          <span className="truncate max-w-[80px]">{video.music.split('·')[0].trim()}</span>
        </div>
      </div>
      <div className="p-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <img src={video.creatorAvatar} alt="" className="w-5 h-5 rounded-full bg-ink-100" />
          <span className="text-xs text-ink-700 font-medium truncate">{video.creatorName}</span>
          <span className="text-[10px] text-ink-400">L{video.creatorLevel}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-ink-500">
          <span className="flex items-center gap-0.5">
            <Heart className="w-3 h-3" />{formatNumber(video.likes)}
          </span>
          <span className="flex items-center gap-0.5">
            <MessageCircle className="w-3 h-3" />{formatNumber(video.comments)}
          </span>
          <span className="flex items-center gap-0.5">
            <Bookmark className="w-3 h-3" />{formatNumber(video.favorites)}
          </span>
        </div>
      </div>
    </button>
  )
}
