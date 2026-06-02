import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, ChevronLeft, ChevronRight, Compass, Zap, Heart, MessageCircle, Search, Bell, ShoppingBag, Scale, Newspaper, Wand2 } from 'lucide-react'
import { cn } from '../lib/utils'

export interface TourStep {
  id: string
  title: string
  description: string
  icon: typeof Sparkles
  targetSelector?: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  highlight?: boolean
  action?: string
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: '欢迎来到 Versa',
    description: '一个集购物 · 资讯 · 辩论于一体的超级应用。接下来我会带你快速了解核心功能。',
    icon: Sparkles,
    position: 'center',
  },
  {
    id: 'news',
    title: '资讯 · 实时热点',
    description: '在「资讯」模块查看长文、专题、视频新闻，支持 AI 一键摘要和翻译。',
    icon: Newspaper,
    position: 'center',
  },
  {
    id: 'debate',
    title: '辩论 · 观点碰撞',
    description: '在「辩论」模块参与热门话题讨论，查看双方观点和实时投票。',
    icon: Scale,
    position: 'center',
  },
  {
    id: 'shop',
    title: '购物 · 全品类',
    description: '「购物」模块支持直播带货、限时秒杀、AI 智能推荐、AI 搜索。',
    icon: ShoppingBag,
    position: 'center',
  },
  {
    id: 'ai',
    title: 'AI 助手',
    description: '右下角的紫色按钮可以呼出 AI 助手，解答购物、资讯、辩论的各种问题。',
    icon: Wand2,
    position: 'center',
  },
  {
    id: 'search',
    title: '全局搜索',
    description: '按 ⌘K (或 Ctrl+K) 打开命令面板，快速跳转页面、搜索商品/资讯/辩论。',
    icon: Search,
    position: 'center',
  },
  {
    id: 'notifications',
    title: '通知中心',
    description: '右上角的铃铛会推送订单状态、打赏、关注创作者更新等实时通知。',
    icon: Bell,
    position: 'center',
  },
  {
    id: 'done',
    title: '开始你的 Versa 之旅',
    description: '点击任意位置即可关闭。再次查看欢迎页可在「设置」中重新启动。',
    icon: Heart,
    position: 'center',
  },
]

const TOUR_KEY = 'versa:tour:completed'

interface Props {
  open: boolean
  onClose: () => void
}

export function OnboardingTour({ open, onClose }: Props) {
  const [index, setIndex] = useState(0)
  const step = TOUR_STEPS[index]
  const Icon = step?.icon

  const next = useCallback(() => {
    if (index < TOUR_STEPS.length - 1) setIndex(index + 1)
    else {
      try { localStorage.setItem(TOUR_KEY, 'true') } catch {}
      onClose()
    }
  }, [index, onClose])

  const prev = useCallback(() => {
    if (index > 0) setIndex(index - 1)
  }, [index])

  const skip = useCallback(() => {
    try { localStorage.setItem(TOUR_KEY, 'true') } catch {}
    onClose()
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return
      if (e.key === 'Escape') skip()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, next, prev, skip])

  useEffect(() => {
    if (open) setIndex(0)
  }, [open])

  if (!open || !step) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
        onClick={skip}
      >
        <motion.div
          key={step.id}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: -20 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-white dark:bg-ink-900 rounded-3xl shadow-2xl overflow-hidden"
        >
          <div className="relative h-32 bg-gradient-to-br from-nova-500 via-pink-500 to-rose-500 flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center"
            >
              {Icon && <Icon className="w-10 h-10 text-white" />}
            </motion.div>
            <button
              onClick={skip}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-4 right-4 flex gap-1">
              {TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn('flex-1 h-1 rounded-full transition-all', i === index ? 'bg-white' : 'bg-white/30')}
                />
              ))}
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-xl font-bold mb-2">{step.title}</h2>
            <p className="text-sm text-ink-500 leading-relaxed min-h-[60px]">{step.description}</p>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-xs text-ink-500">
                {index + 1} / {TOUR_STEPS.length}
              </div>
              <div className="flex items-center gap-2">
                {index > 0 && (
                  <button
                    onClick={prev}
                    className="px-3 h-9 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 text-sm flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    上一步
                  </button>
                )}
                <button
                  onClick={next}
                  className="px-4 h-9 rounded-lg bg-gradient-to-r from-nova-500 to-pink-500 text-white text-sm font-semibold flex items-center gap-1 shadow-lg hover:scale-105 transition-transform"
                >
                  {index === TOUR_STEPS.length - 1 ? '开始' : '下一步'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export function useOnboardingTour() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const completed = localStorage.getItem(TOUR_KEY)
      if (!completed) {
        setTimeout(() => setOpen(true), 1500)
      }
    } catch {}
  }, [])

  return { open, setOpen, reset: () => { try { localStorage.removeItem(TOUR_KEY) } catch {}; setOpen(true) } }
}
