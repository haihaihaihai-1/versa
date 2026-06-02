import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Volume2, VolumeX, Maximize, X, Sparkles, Heart } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface VideoItem {
  id: string
  title: string
  thumbnail: string
  duration: number
  views: number
  likes: number
  videoUrl?: string
  demoGradient: string
  description: string
}

const DEMO_VIDEOS: VideoItem[] = [
  { id: 'v1', title: 'iPhone 16 实物开箱', thumbnail: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&q=80', duration: 95, views: 12400, likes: 892, demoGradient: 'from-rose-500/30 to-pink-500/30', description: '全新哑光玻璃后盖 + 钛金属边框, 4K 60fps 实拍' },
  { id: 'v2', title: '运动耳机深度测评', thumbnail: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80', duration: 180, views: 8900, likes: 567, demoGradient: 'from-blue-500/30 to-cyan-500/30', description: 'Bose vs Sony vs 苹果, 音质降噪对比' },
  { id: 'v3', title: '咖啡机使用教程', thumbnail: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&q=80', duration: 240, views: 5600, likes: 312, demoGradient: 'from-amber-500/30 to-orange-500/30', description: '从磨豆到出杯, 全程录制' },
]

export function VideoPreview({ productId }: { productId: string }) {
  const [videos] = useState<VideoItem[]>(DEMO_VIDEOS)
  const [activeIdx, setActiveIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [muted, setMuted] = useState(true)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [time, setTime] = useState(0)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (playing) {
      timerRef.current = window.setInterval(() => {
        setProgress((p) => {
          const next = p + (100 / (videos[activeIdx]?.duration || 60))
          if (next >= 100) {
            setPlaying(false)
            return 0
          }
          return next
        })
        setTime((t) => t + 1)
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [playing, activeIdx, videos])

  const active = videos[activeIdx]
  const liked_count = liked.size

  const toggleLike = (id: string) => {
    setLiked((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else { next.add(id); toast('已点赞', 'success') }
      return next
    })
  }

  return (
    <div className="space-y-3">
      <h3 className="text-base font-bold flex items-center gap-1.5">
        <Play className="w-5 h-5 text-rose-500 fill-current" />
        视频预览
        <span className="text-xs text-ink-500 font-normal">({videos.length} 个)</span>
      </h3>

      <div className="bg-black rounded-2xl overflow-hidden aspect-video relative">
        <div className={cn('absolute inset-0 bg-gradient-to-br', active.demoGradient)}>
          <img src={active.thumbnail} alt={active.title} className="w-full h-full object-cover opacity-80" />
        </div>

        <AnimatePresence>
          {!playing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/30"
            >
              <button
                onClick={() => setPlaying(true)}
                className="w-16 h-16 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-2xl hover:scale-110 transition"
              >
                <Play className="w-7 h-7 text-rose-500 fill-current ml-1" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur rounded text-white text-[10px] font-medium">
          {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')} / {Math.floor(active.duration / 60)}:{(active.duration % 60).toString().padStart(2, '0')}
        </div>

        <div className="absolute top-2 right-2 flex items-center gap-1">
          <span className="px-1.5 py-0.5 bg-rose-500/90 rounded text-white text-[10px] font-bold">
            4K
          </span>
          <span className="px-1.5 py-0.5 bg-nova-500/90 rounded text-white text-[10px] font-bold">
            <Sparkles className="w-2.5 h-2.5 inline mr-0.5" />AI 字幕
          </span>
        </div>

        {playing && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent"
          >
            <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-2">
              <motion.div className="h-full bg-rose-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex items-center gap-2 text-white">
              <button onClick={() => setPlaying(false)}>
                <Pause className="w-4 h-4" />
              </button>
              <button onClick={() => setMuted(!muted)}>
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => toggleLike(active.id)}
                className={cn('ml-auto', liked.has(active.id) && 'text-rose-500')}
              >
                <Heart className={cn('w-4 h-4', liked.has(active.id) && 'fill-current')} />
              </button>
              <button>
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {playing && time > 0 && time % 5 === 0 && (
            <motion.div
              key={time}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-20 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/70 rounded-full text-white text-xs"
            >
              {active.description}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-semibold">{active.title}</h4>
        <div className="flex items-center gap-3 text-xs text-ink-500">
          <span>{(active.views + (liked.has(active.id) ? 1 : 0)).toLocaleString()} 播放</span>
          <span>{active.likes + liked_count} 赞</span>
          <span className="text-nova-500">模拟播放 (无真实视频流)</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {videos.map((v, idx) => (
          <button
            key={v.id}
            onClick={() => { setActiveIdx(idx); setProgress(0); setTime(0); setPlaying(false) }}
            className={cn(
              'relative aspect-video rounded-lg overflow-hidden',
              idx === activeIdx ? 'ring-2 ring-rose-500' : 'opacity-70 hover:opacity-100'
            )}
          >
            <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
            <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/60 rounded text-white text-[9px]">
              {Math.floor(v.duration / 60)}:{(v.duration % 60).toString().padStart(2, '0')}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
