import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, Settings, Heart, MessageCircle, Share2, ShoppingCart, Clock, Eye, ChevronLeft, List } from 'lucide-react'
import { Link } from 'react-router-dom'
import { products } from '../../data/products'
import { cn, formatNumber, formatTimeAgo } from '../../lib/utils'
import { DanmuOverlay } from './DanmuOverlay'

export interface Replay {
  id: string
  title: string
  host: { name: string; avatar: string; title: string; followers: number }
  cover: string
  duration: number
  recordedAt: number
  views: number
  productIds: string[]
  tags: string[]
  category: string
  description: string
  highlights: { at: number; label: string }[]
  comments: { user: string; text: string; at: number }[]
}

const SAMPLE_REPLAYS: Replay[] = [
  {
    id: 'r1',
    title: '618 数码狂欢夜 · 完整回放',
    host: { name: '数码小仙女', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=techgirl', title: 'Versa 数码官方', followers: 1280000 },
    cover: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=1200&q=80',
    duration: 3725,
    recordedAt: Date.now() - 86400000,
    views: 234567,
    productIds: products.filter((p) => p.category === 'tech').slice(0, 4).map((p) => p.id),
    tags: ['数码', 'iPhone', '回放'],
    category: 'tech',
    description: '本次直播全场 iPhone 15 直降 1500,加赠 200 元配件券,直播间下单还可参与抽奖。',
    highlights: [
      { at: 45, label: '🎁 抽奖环节: AirPods Pro' },
      { at: 320, label: '💰 iPhone 15 优惠公布' },
      { at: 1280, label: '🔥 MacBook Air M3 上架' },
      { at: 2400, label: '🎉 直播间专享 8 折' },
      { at: 3300, label: '👋 直播结束 · 下次再见' },
    ],
    comments: [
      { user: '小明', text: '主播专业!', at: 23 },
      { user: '小红', text: '下单了!', at: 156 },
      { user: '土豪小张', text: 'iPhone 真香', at: 480 },
      { user: '追剧达人', text: '有没有笔记本?', at: 1024 },
      { user: '美食家老王', text: '直播间福利太好了', at: 2100 },
    ],
  },
  {
    id: 'r2',
    title: '美妆直播 · SK-II 神仙水专场',
    host: { name: '美妆博主林林', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=beauty', title: '资深美妆达人', followers: 856000 },
    cover: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80',
    duration: 2950,
    recordedAt: Date.now() - 86400000 * 3,
    views: 89432,
    productIds: products.filter((p) => p.category === 'beauty').slice(0, 3).map((p) => p.id),
    tags: ['美妆', '护肤'],
    category: 'beauty',
    description: 'SK-II 神仙水深度测评,买一送十,仅限直播。',
    highlights: [
      { at: 120, label: '🧴 神仙水成分解析' },
      { at: 800, label: '✨ 使用前后对比' },
      { at: 1800, label: '🎁 买一送十 优惠' },
    ],
    comments: [
      { user: '小美爱买', text: 'SK-II 永远的神', at: 200 },
      { user: '设计师Lily', text: '想入坑', at: 850 },
    ],
  },
]

interface Props {
  replay: Replay
  onClose?: () => void
}

export function LiveReplayPlayer({ replay, onClose }: Props) {
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [muted, setMuted] = useState(false)
  const [showHighlights, setShowHighlights] = useState(false)
  const [danmu, setDanmu] = useState<{ id: string; user: string; text: string; color: string }[]>([])
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    if (playing) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTime((t) => {
          const next = t + 1
          if (next >= replay.duration) {
            setPlaying(false)
            return replay.duration
          }
          return next
        })
      }, 100)
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [playing, replay.duration])

  useEffect(() => {
    const c = replay.comments.find((cm) => cm.at === Math.floor(currentTime))
    if (c) {
      setDanmu((arr) => [...arr.slice(-5), { id: Date.now() + '', user: c.user, text: c.text, color: '#ec4899' }])
    }
  }, [Math.floor(currentTime / 1)])

  const pct = (currentTime / replay.duration) * 100
  const liveProducts = replay.productIds.map((id) => products.find((p) => p.id === id)!).filter(Boolean)

  const seek = (seconds: number) => {
    setCurrentTime(Math.max(0, Math.min(replay.duration, seconds)))
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {onClose && (
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-4">
          <ChevronLeft className="w-4 h-4" /> 返回直播列表
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative aspect-[16/9] rounded-3xl overflow-hidden bg-black">
            <img src={replay.cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

            <DanmuOverlay danmus={danmu} />

            <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
              <span className="px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" />
                回放
              </span>
              <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1">
                <Eye className="w-3 h-3" />{formatNumber(replay.views)}
              </span>
            </div>

            <button
              onClick={() => setPlaying((p) => !p)}
              className="absolute inset-0 flex items-center justify-center z-10 group"
            >
              <motion.div
                initial={false}
                animate={{ scale: playing ? 0 : 1 }}
                className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition shadow-2xl"
              >
                {playing ? <Pause className="w-10 h-10 text-white" /> : <Play className="w-10 h-10 text-white ml-1" />}
              </motion.div>
            </button>

            <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2 z-20">
              <div className="relative h-1 bg-white/20 rounded-full cursor-pointer group/progress" onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX - rect.left
                seek((x / rect.width) * replay.duration)
              }}>
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-rose-500 to-pink-500 rounded-full" style={{ width: `${pct}%` }} />
                {replay.highlights.map((h) => (
                  <div
                    key={h.at}
                    className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-yellow-300 ring-2 ring-yellow-300/30"
                    style={{ left: `${(h.at / replay.duration) * 100}%` }}
                    title={h.label}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3 text-white text-sm">
                <span className="font-mono text-xs">{formatTime(currentTime)}</span>
                <span className="text-ink-400">/</span>
                <span className="font-mono text-xs text-ink-300">{formatTime(replay.duration)}</span>
                <div className="flex-1" />
                <button onClick={() => setMuted((m) => !m)} className="p-1.5 hover:bg-white/10 rounded-full">
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button className="p-1.5 hover:bg-white/10 rounded-full">
                  <Settings className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-white/10 rounded-full">
                  <Maximize className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-4">
            <h2 className="text-xl font-bold mb-2">{replay.title}</h2>
            <div className="flex items-center gap-2 text-sm text-ink-500 mb-3">
              <Clock className="w-3.5 h-3.5" />
              {formatTimeAgo(new Date(replay.recordedAt).toISOString())} · {formatTime(replay.duration)} · {formatNumber(replay.views)} 播放
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {replay.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-0.5 rounded bg-nova-50 dark:bg-nova-950/30 text-nova-600">#{t}</span>
              ))}
            </div>
            <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">{replay.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-rose-500 text-white text-sm">
                <Heart className="w-4 h-4" /> 收藏回放
              </button>
              <button className="flex items-center gap-1.5 px-3 h-9 rounded-full border border-ink-200 dark:border-ink-700 text-sm">
                <Share2 className="w-4 h-4" /> 分享
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <img src={replay.host.avatar} alt="" className="w-12 h-12 rounded-full ring-2 ring-white" />
              <div>
                <div className="font-bold text-sm">{replay.host.name}</div>
                <div className="text-xs text-ink-500">{replay.host.title} · {formatNumber(replay.host.followers)} 粉丝</div>
              </div>
            </div>
            <button className="w-full h-9 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold">
              关注主播
            </button>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-4">
            <button
              onClick={() => setShowHighlights(!showHighlights)}
              className="w-full flex items-center justify-between mb-3"
            >
              <h3 className="font-bold flex items-center gap-1.5">
                <List className="w-4 h-4 text-news-500" />
                精彩时刻 ({replay.highlights.length})
              </h3>
              <span className="text-xs text-ink-500">{showHighlights ? '收起' : '展开'}</span>
            </button>
            <div className="space-y-1">
              {replay.highlights.map((h) => (
                <button
                  key={h.at}
                  onClick={() => seek(h.at)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/30 text-left"
                >
                  <span className="text-xs font-mono text-rose-500 font-bold w-12 flex-shrink-0">{formatTime(h.at)}</span>
                  <span className="text-sm flex-1 truncate">{h.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-4">
            <h3 className="font-bold mb-3 flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-shop-500" />
              本场商品 ({liveProducts.length})
            </h3>
            <div className="space-y-2">
              {liveProducts.map((p) => (
                <Link key={p.id} to={`/shop/${p.id}`} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-ink-50 dark:hover:bg-ink-800/30">
                  <img src={p.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{p.name}</div>
                    <div className="text-xs font-bold text-shop-600">¥{p.price}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LiveReplayList({ onClose }: { onClose?: () => void }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {onClose && (
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-900 dark:hover:text-white mb-4">
          ← 返回
        </button>
      )}
      <h1 className="text-2xl font-bold mb-1">直播回放</h1>
      <p className="text-sm text-ink-500 mb-4">错过的直播? 随时回看精彩内容</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SAMPLE_REPLAYS.map((r) => (
          <Link
            key={r.id}
            to={`/shop/live/replay/${r.id}`}
            className="group rounded-2xl overflow-hidden bg-white/80 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 hover:shadow-xl transition"
          >
            <div className="relative aspect-video overflow-hidden">
              <img src={r.cover} alt="" className="w-full h-full object-cover group-hover:scale-105 transition" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur text-white text-xs font-bold flex items-center gap-1">
                <Clock className="w-3 h-3" />回放
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <div className="text-white">
                  <div className="text-xs opacity-80">{Math.floor(r.duration / 60)} 分钟</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover:scale-110 transition">
                  <Play className="w-5 h-5 text-white ml-0.5" />
                </div>
              </div>
            </div>
            <div className="p-3">
              <h3 className="font-semibold text-sm line-clamp-2 mb-1.5">{r.title}</h3>
              <div className="flex items-center justify-between text-xs text-ink-500">
                <span className="flex items-center gap-1">
                  <img src={r.host.avatar} alt="" className="w-4 h-4 rounded-full" />
                  {r.host.name}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />{formatNumber(r.views)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
