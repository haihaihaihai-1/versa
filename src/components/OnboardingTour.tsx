import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Compass, X, ArrowRight, Sparkles, ShoppingBag, MessageCircle, Newspaper, Scale, Heart, Star } from 'lucide-react'
import { cn } from '../lib/utils'
import { Link } from 'react-router-dom'

interface TourStep {
  id: string
  title: string
  description: string
  icon: any
  emoji: string
  to: string
  color: string
  tip: string
}

const STEPS: TourStep[] = [
  { id: 'welcome', title: '欢迎来到 Versa', description: '购物 · 社交 · 资讯 · 辩论 一体化平台', icon: Sparkles, emoji: '👋', to: '/', color: 'from-violet-500 to-purple-500', tip: '点击"下一步"开始导览' },
  { id: 'feed', title: '真实社交', description: '发布动态, 关注创作者, 加入群组', icon: Heart, emoji: '💬', to: '/feed', color: 'from-rose-500 to-pink-500', tip: '按时间线浏览关注的人的动态' },
  { id: 'shop', title: '智能购物', description: '商品对比, 直播带货, AI 助手', icon: ShoppingBag, emoji: '🛍️', to: '/shop', color: 'from-amber-500 to-orange-500', tip: '看直播下单可享专属价' },
  { id: 'news', title: '优质资讯', description: '今日热榜, 深度报道, 观点碰撞', icon: Newspaper, emoji: '📰', to: '/news', color: 'from-blue-500 to-indigo-500', tip: '可订阅专题, AI 个性化推荐' },
  { id: 'debate', title: '理性辩论', description: '正反方观点, 投票表态, 思辨空间', icon: Scale, emoji: '⚖️', to: '/debates', color: 'from-emerald-500 to-teal-500', tip: '辩论场是 Versa 独有的功能' },
  { id: 'theme', title: '个性化', description: '6 主题色, 5 国语言, 自由定制', icon: Star, emoji: '🎨', to: '/settings', color: 'from-fuchsia-500 to-pink-500', tip: '右上角调色板切换主题' },
  { id: 'ai', title: 'AI 助手', description: '悬浮机器人, 随时解答问题', icon: Sparkles, emoji: '🤖', to: '/', color: 'from-cyan-500 to-blue-500', tip: '点击右下角浮动机器人试试' },
  { id: 'finish', title: '准备就绪', description: '开始你的 Versa 之旅吧!', icon: ArrowRight, emoji: '🚀', to: '/feed', color: 'from-amber-400 to-orange-500', tip: '随时在帮助中心重新查看此导览' },
]

const STORAGE_KEY = 'versa:onboarding-done'

export function useOnboardingTour() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY)
      if (!done) {
        setTimeout(() => setOpen(true), 800)
      }
    } catch {}
  }, [])

  const restart = () => {
    setStep(0)
    setOpen(true)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return { open, setOpen, step, setStep, restart }
}

export function OnboardingTour({ open, onClose }: { open?: boolean; onClose?: () => void } = {}) {
  const tour = useOnboardingTour()
  const controlled = open !== undefined
  const show = controlled ? open : tour.open
  const setShow = (v: boolean, markDone = true) => {
    if (markDone) { try { localStorage.setItem(STORAGE_KEY, '1') } catch {} }
    if (controlled) onClose?.()
    else tour.setOpen(v)
  }
  const step = tour.step
  const setStep = tour.setStep

  const close = (markDone = true) => setShow(false, markDone)

  const restart = () => {
    setStep(0)
    tour.restart()
  }

  const next = () => step < STEPS.length - 1 ? setStep(step + 1) : close(true)
  const prev = () => step > 0 && setStep(step - 1)

  const current = STEPS[step]
  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <>
      <button onClick={restart} className="w-full h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5">
        <Compass className="w-3.5 h-3.5" />查看新手引导
      </button>

      <AnimatePresence>
        {show && current && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-4"
            onClick={() => close(false)}
          >
            <motion.div
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className={`relative h-40 bg-gradient-to-br ${current.color} flex items-center justify-center`}>
                <button onClick={() => close(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-white">
                  <X className="w-4 h-4" />
                </button>
                <motion.div
                  key={current.id}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12 }}
                  className="text-6xl"
                >
                  {current.emoji}
                </motion.div>
                <div className="absolute bottom-2 left-3 right-3 h-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div animate={{ width: `${progress}%` }} className="h-full bg-white" />
                </div>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between text-[10px] text-ink-500">
                  <span>第 {step + 1} / {STEPS.length} 步</span>
                  <span>{Math.round(progress)}%</span>
                </div>

                <motion.div key={current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <h3 className="text-xl font-bold mb-1">{current.title}</h3>
                  <p className="text-sm text-ink-600 dark:text-ink-400 mb-2">{current.description}</p>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-2 border border-amber-200/40">
                    <p className="text-[10px] text-amber-700 dark:text-amber-300">💡 提示: {current.tip}</p>
                  </div>
                </motion.div>

                <div className="flex items-center gap-1.5">
                  {STEPS.map((_, i) => (
                    <div key={i} className={cn('h-1 flex-1 rounded-full transition', i <= step ? 'bg-nova-500' : 'bg-ink-200 dark:bg-ink-700')} />
                  ))}
                </div>

                <div className="flex gap-1.5 pt-1">
                  {step > 0 && (
                    <button onClick={prev} className="flex-1 h-10 rounded-xl bg-ink-100 dark:bg-ink-800 text-sm font-semibold">上一步</button>
                  )}
                  <Link
                    to={current.to}
                    onClick={() => close(false)}
                    className="flex-1 h-10 rounded-xl bg-ink-100 dark:bg-ink-800 text-sm font-semibold flex items-center justify-center"
                  >
                    去看看
                  </Link>
                  <button
                    onClick={next}
                    className={`flex-1 h-10 rounded-xl bg-gradient-to-r ${current.color} text-white text-sm font-bold flex items-center justify-center gap-1`}
                  >
                    {step === STEPS.length - 1 ? '完成' : '下一步'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button onClick={() => close(true)} className="w-full text-[10px] text-ink-400 hover:text-ink-600">
                  跳过导览
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
