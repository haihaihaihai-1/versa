import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImageIcon, X, Download, Share2, Heart, Eye, Sparkles, Loader2 } from 'lucide-react'
import { cn, formatNumber } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface GalleryItem {
  id: string
  url: string
  title: string
  author: string
  likes: number
  views: number
  category: string
  description: string
}

const GALLERY: GalleryItem[] = [
  { id: 'g1', url: 'https://picsum.photos/seed/g1/600/600', title: '晨曦中的城市', author: '摄影师 K', likes: 2345, views: 12800, category: '风光', description: '清晨 5 点的城市天际线, 捕捉第一缕阳光' },
  { id: 'g2', url: 'https://picsum.photos/seed/g2/600/800', title: '森林深处', author: '自然 L', likes: 1834, views: 9200, category: '自然', description: '原始森林的呼吸, 光影交错' },
  { id: 'g3', url: 'https://picsum.photos/seed/g3/600/600', title: '日落时分', author: '夕阳 M', likes: 3214, views: 18500, category: '风光', description: '海边日落, 静谧的温暖' },
  { id: 'g4', url: 'https://picsum.photos/seed/g4/600/800', title: '山巅云海', author: '登山 N', likes: 4521, views: 24300, category: '风光', description: '登上 4500 米, 云在脚下' },
  { id: 'g5', url: 'https://picsum.photos/seed/g5/600/600', title: '微距世界', author: '微观 O', likes: 1245, views: 6800, category: '微距', description: '露珠中的世界, 放大 100 倍' },
  { id: 'g6', url: 'https://picsum.photos/seed/g6/600/600', title: '街头光影', author: '街拍 P', likes: 2890, views: 14200, category: '人文', description: '城市角落的光与影' },
  { id: 'g7', url: 'https://picsum.photos/seed/g7/600/800', title: '极光之夜', author: '极光 Q', likes: 5432, views: 32100, category: '风光', description: '北极圈的极光, 终生难忘' },
  { id: 'g8', url: 'https://picsum.photos/seed/g8/600/600', title: '沙漠之花', author: '沙漠 R', likes: 1567, views: 8400, category: '自然', description: '沙漠中盛开的花, 生命力' },
]

const CATEGORIES = ['全部', '风光', '自然', '人文', '微距']

export function ProductGallery() {
  const [selected, setSelected] = useState<GalleryItem | null>(null)
  const [liked, setLiked] = useState<Set<string>>(new Set())
  const [category, setCategory] = useState('全部')
  const [aiDesc, setAiDesc] = useState('')
  const [loading, setLoading] = useState(false)

  const filtered = category === '全部' ? GALLERY : GALLERY.filter((g) => g.category === category)

  const like = (id: string) => {
    setLiked((l) => {
      const next = new Set(l)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const generateAI = async (item: GalleryItem) => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(
        `为摄影作品《${item.title}》(作者 ${item.author}) 写一段 80-150 字的诗意赏析, 包括构图、光影、情感`,
        '你是 Versa 摄影赏析助手, 文艺但不过度, 中文'
      )
      setAiDesc(result)
    } catch (e: any) {
      toast(e?.message || '生成失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon className="w-5 h-5" />
          <h2 className="text-lg font-bold">图集欣赏</h2>
        </div>
        <p className="text-xs opacity-90">精选摄影, 视觉盛宴</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn('px-3 h-7 rounded-full text-xs font-medium flex-shrink-0', category === c ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {filtered.map((item, idx) => (
          <motion.button
            key={item.id}
            onClick={() => { setSelected(item); setAiDesc('') }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn('relative rounded-xl overflow-hidden bg-ink-100 dark:bg-ink-800', idx % 3 === 0 ? 'row-span-2 aspect-[3/4]' : 'aspect-square')}
          >
            <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-1.5 left-1.5 right-1.5 text-white text-left">
              <p className="text-xs font-bold line-clamp-1">{item.title}</p>
              <p className="text-[10px] opacity-80 flex items-center gap-1.5">
                <Heart className="w-2.5 h-2.5" />{formatNumber(item.likes + (liked.has(item.id) ? 1 : 0))}
                <Eye className="w-2.5 h-2.5" />{formatNumber(item.views)}
              </p>
            </div>
            {liked.has(item.id) && (
              <Heart className="absolute top-1.5 right-1.5 w-4 h-4 text-rose-500 fill-rose-500" />
            )}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
            onClick={() => setSelected(null)}
          >
            <div className="flex items-center justify-between p-3 text-white">
              <p className="text-sm font-bold">{selected.title}</p>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 flex items-center justify-center p-3" onClick={(e) => e.stopPropagation()}>
              <img src={selected.url} alt={selected.title} className="max-w-full max-h-full object-contain rounded-xl" />
            </div>
            <div className="p-3 text-white space-y-2" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold">{selected.author}</span>
                <span className="text-white/60">·</span>
                <span className="text-white/60">{selected.category}</span>
              </div>
              <p className="text-sm text-white/80">{selected.description}</p>

              <button
                onClick={() => generateAI(selected)}
                disabled={loading}
                className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-1"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                AI 赏析
              </button>

              {aiDesc && (
                <div className="bg-white/10 rounded-xl p-2.5 text-xs text-white/90 leading-relaxed whitespace-pre-wrap">
                  {aiDesc}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => like(selected.id)}
                  className={cn('flex-1 h-9 rounded-lg flex items-center justify-center gap-1 text-sm font-semibold', liked.has(selected.id) ? 'bg-rose-500 text-white' : 'bg-white/20 text-white')}
                >
                  <Heart className={cn('w-4 h-4', liked.has(selected.id) && 'fill-white')} />
                  {formatNumber(selected.likes + (liked.has(selected.id) ? 1 : 0))}
                </button>
                <button onClick={() => toast('已下载', 'success')} className="w-9 h-9 rounded-lg bg-white/20 text-white flex items-center justify-center">
                  <Download className="w-4 h-4" />
                </button>
                <button onClick={() => toast('已分享', 'success')} className="w-9 h-9 rounded-lg bg-white/20 text-white flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
