import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Share2, Copy, X, MessageCircle, Link as LinkIcon, Download, Check, Sparkles } from 'lucide-react'
import { cn, formatCurrency } from '../lib/utils'
import { toast } from '../components/ui/Toaster'

export interface ShareableItem {
  type: 'product' | 'news' | 'debate' | 'live'
  id: string
  title: string
  subtitle?: string
  image: string
  price?: number
  originalPrice?: number
  rating?: number
  hot?: number
}

interface Props {
  item: ShareableItem | null
  onClose: () => void
}

const TYPE_LABELS: Record<ShareableItem['type'], string> = {
  product: '商品',
  news: '资讯',
  debate: '辩论',
  live: '直播',
}

const TYPE_COLORS: Record<ShareableItem['type'], string> = {
  product: 'from-shop-500 to-emerald-500',
  news: 'from-news-500 to-orange-500',
  debate: 'from-debate-500 to-rose-500',
  live: 'from-nova-500 to-pink-500',
}

export function ShareCard({ item, onClose }: Props) {
  const [copied, setCopied] = useState(false)

  if (!item) return null

  const url = `${window.location.origin}/versa/${item.type === 'product' ? 'shop/' + item.id : item.type === 'live' ? 'shop/live' : item.type + '/' + item.id}`
  const discount = item.originalPrice && item.price ? Math.round((1 - item.price / item.originalPrice) * 100) : 0

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast('链接已复制', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('复制失败', 'error')
    }
  }

  const handleNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, text: item.subtitle, url })
        onClose()
      } catch {}
    } else {
      handleCopy()
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[95] bg-black/60 backdrop-blur flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white dark:bg-ink-900 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="p-4 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-1.5">
              <Share2 className="w-4 h-4" />
              分享给朋友
            </h2>
            <button onClick={onClose} className="p-1.5 hover:bg-ink-100 dark:hover:bg-ink-800 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 分享卡片预览 */}
          <div className="p-6 bg-gradient-to-br from-ink-50 to-white dark:from-ink-800 dark:to-ink-900">
            <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-xl overflow-hidden border border-ink-200 dark:border-ink-800">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={item.image} alt="" className="w-full h-full object-cover" />
                <div className={cn('absolute top-3 left-3 px-2.5 py-1 rounded-full text-white text-xs font-bold bg-gradient-to-r', TYPE_COLORS[item.type])}>
                  {TYPE_LABELS[item.type]}
                </div>
                {discount > 0 && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-debate-500 text-white text-xs font-bold">
                    -{discount}%
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-sm line-clamp-2 leading-snug">{item.title}</h3>
                {item.subtitle && <p className="text-xs text-ink-500 mt-1 line-clamp-2">{item.subtitle}</p>}
                <div className="mt-3 flex items-center justify-between">
                  {item.price !== undefined ? (
                    <div>
                      <div className="text-xs text-ink-500">特惠价</div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-bold text-shop-600">{formatCurrency(item.price)}</span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <span className="text-xs text-ink-400 line-through">{formatCurrency(item.originalPrice)}</span>
                        )}
                      </div>
                    </div>
                  ) : item.hot !== undefined ? (
                    <div className="text-xs">
                      <span className="font-bold text-nova-500">🔥 {item.hot}</span>
                      <span className="text-ink-500 ml-1">热度</span>
                    </div>
                  ) : null}
                  {item.rating !== undefined && (
                    <div className="text-xs text-ink-500">⭐ {item.rating.toFixed(1)}</div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-ink-200 dark:border-ink-800 flex items-center justify-between text-[10px] text-ink-400">
                  <span>扫码或点击查看详情</span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5" />
                    Versa
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={handleNative}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800 transition"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-nova-500 to-pink-500 flex items-center justify-center text-white">
                  <Share2 className="w-4 h-4" />
                </div>
                <span className="text-[10px]">系统分享</span>
              </button>
              <button
                onClick={() => {
                  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(item.title)}&url=${encodeURIComponent(url)}`, '_blank')
                }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800 transition"
              >
                <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </div>
                <span className="text-[10px]">X / Twitter</span>
              </button>
              <button
                onClick={() => {
                  window.open(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`, '_blank')
                }}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800 transition"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="text-[10px]">微信</span>
              </button>
              <button
                onClick={() => toast('下载已就绪', 'success')}
                className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800 transition"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white">
                  <Download className="w-4 h-4" />
                </div>
                <span className="text-[10px]">保存图片</span>
              </button>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-ink-50 dark:bg-ink-800">
              <LinkIcon className="w-4 h-4 text-ink-400 flex-shrink-0" />
              <div className="flex-1 truncate text-xs text-ink-500 font-mono">{url}</div>
              <button
                onClick={handleCopy}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition',
                  copied ? 'bg-shop-500 text-white' : 'bg-nova-500 text-white hover:bg-nova-600'
                )}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export function ShareButton({ item, className }: { item: ShareableItem; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)} className={className} title="分享">
        <Share2 className="w-4 h-4" />
      </button>
      <ShareCard item={open ? item : null} onClose={() => setOpen(false)} />
    </>
  )
}
