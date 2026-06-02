import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Heart, Rocket, Crown, Gift, Star, Diamond, Coffee, Cake, Music, ThumbsUp, Cake as CakeIcon, Trophy, Flower2, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export interface Gift {
  id: string
  name: string
  icon: typeof Sparkles
  color: string
  price: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export const GIFTS: Gift[] = [
  { id: 'heart', name: '小心心', icon: Heart, color: 'from-pink-500 to-rose-500', price: 1, rarity: 'common' },
  { id: 'thumbs', name: '点赞', icon: ThumbsUp, color: 'from-blue-500 to-cyan-500', price: 1, rarity: 'common' },
  { id: 'coffee', name: '咖啡', icon: Coffee, color: 'from-amber-700 to-orange-700', price: 5, rarity: 'common' },
  { id: 'cake', name: '蛋糕', icon: Cake, color: 'from-pink-400 to-pink-600', price: 10, rarity: 'common' },
  { id: 'flower', name: '鲜花', icon: Flower2, color: 'from-fuchsia-500 to-pink-500', price: 20, rarity: 'common' },
  { id: 'star', name: '星星', icon: Star, color: 'from-yellow-400 to-amber-500', price: 50, rarity: 'rare' },
  { id: 'gift', name: '礼盒', icon: Gift, color: 'from-emerald-500 to-teal-500', price: 100, rarity: 'rare' },
  { id: 'music', name: '点歌', icon: Music, color: 'from-violet-500 to-purple-500', price: 200, rarity: 'rare' },
  { id: 'rocket', name: '火箭', icon: Rocket, color: 'from-orange-500 to-red-500', price: 500, rarity: 'epic' },
  { id: 'crown', name: '皇冠', icon: Crown, color: 'from-yellow-500 to-amber-600', price: 1000, rarity: 'epic' },
  { id: 'sparkle', name: '星光', icon: Sparkles, color: 'from-cyan-400 to-blue-500', price: 2000, rarity: 'epic' },
  { id: 'trophy', name: '奖杯', icon: Trophy, color: 'from-amber-500 to-yellow-600', price: 5000, rarity: 'legendary' },
  { id: 'diamond', name: '钻石', icon: Diamond, color: 'from-cyan-300 to-blue-500', price: 10000, rarity: 'legendary' },
]

const RARITY_RING: Record<Gift['rarity'], string> = {
  common: 'ring-common',
  rare: 'ring-rare',
  epic: 'ring-epic',
  legendary: 'ring-legendary',
}

interface GiftPanelProps {
  onSend: (gift: Gift, count: number) => void
  onClose?: () => void
}

export function GiftPanel({ onSend, onClose }: GiftPanelProps) {
  const [selected, setSelected] = useState<Gift>(GIFTS[0])
  const [count, setCount] = useState(1)

  return (
    <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-2xl border border-ink-200 dark:border-ink-800 p-4 w-80 max-w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-1.5">
          <Gift className="w-4 h-4 text-nova-500" />
          送出礼物
        </h3>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 mb-3 max-h-48 overflow-y-auto">
        {GIFTS.map((g) => {
          const Icon = g.icon
          return (
            <button
              key={g.id}
              onClick={() => setSelected(g)}
              className={cn(
                'p-2 rounded-xl flex flex-col items-center gap-1 transition-all border-2',
                selected.id === g.id
                  ? 'border-nova-500 bg-nova-50 dark:bg-nova-950/30'
                  : 'border-transparent hover:bg-ink-50 dark:hover:bg-ink-800'
              )}
            >
              <div className={cn('w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white', g.color, RARITY_RING[g.rarity])}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-[10px] text-ink-600 dark:text-ink-300">{g.name}</div>
              <div className="text-[10px] font-bold text-nova-600">{g.price}币</div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-ink-500">数量</span>
        <div className="flex items-center bg-ink-100 dark:bg-ink-800 rounded-full">
          {[1, 5, 10, 50, 99].map((n) => (
            <button
              key={n}
              onClick={() => setCount(n)}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-full',
                count === n ? 'bg-nova-500 text-white' : 'text-ink-600 dark:text-ink-300'
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-nova-50 to-shop-50 dark:from-nova-950/30 dark:to-shop-950/30">
        <div>
          <div className="text-xs text-ink-500">合计</div>
          <div className="font-bold text-lg text-nova-600">{selected.price * count} 币</div>
        </div>
        <button
          onClick={() => onSend(selected, count)}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-nova-500 to-shop-500 text-white font-semibold text-sm shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          送出
        </button>
      </div>
    </div>
  )
}

interface FlyingGift {
  id: number
  gift: Gift
  x: number
  count: number
}

interface GiftOverlayProps {
  gifts: FlyingGift[]
  onDone: (id: number) => void
}

export function GiftOverlay({ gifts, onDone }: GiftOverlayProps) {
  return (
    <div className="fixed inset-0 pointer-events-none z-[80] overflow-hidden">
      <AnimatePresence>
        {gifts.map((g) => {
          const Icon = g.gift.icon
          return (
            <motion.div
              key={g.id}
              initial={{ y: 100, x: `${g.x}vw`, scale: 0.3, opacity: 0, rotate: -20 }}
              animate={{ y: -200, scale: [0.3, 1.2, 1], opacity: [0, 1, 1, 0], rotate: [0, 15, -5, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: 'easeOut' }}
              onAnimationComplete={() => onDone(g.id)}
              className="absolute bottom-0"
            >
              <div className="relative">
                <div className={cn('w-16 h-16 rounded-full bg-gradient-to-br flex items-center justify-center text-white shadow-2xl', g.gift.color, RARITY_RING[g.gift.rarity])}>
                  <Icon className="w-8 h-8" />
                </div>
                {g.count > 1 && (
                  <div className="absolute -top-1 -right-1 bg-nova-500 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center border-2 border-white">
                    x{g.count}
                  </div>
                )}
                <div className="absolute top-16 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-bold text-white bg-black/60 px-2 py-0.5 rounded">
                  送出了 {g.gift.name}
                </div>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

let toastListener: ((gift: Gift, count: number) => void) | null = null
export function fireGiftToast(gift: Gift, count: number) {
  toastListener?.(gift, count)
}

export function GiftToastHost() {
  const [items, setItems] = useState<FlyingGift[]>([])

  const remove = useCallback((id: number) => {
    setItems((arr) => arr.filter((i) => i.id !== id))
  }, [])

  useEffect(() => {
    toastListener = (gift, count) => {
      const id = Date.now() + Math.random()
      setItems((arr) => [...arr, { id, gift, count, x: 10 + Math.random() * 70 }])
    }
    return () => {
      toastListener = null
    }
  }, [])

  return <GiftOverlay gifts={items} onDone={remove} />
}
