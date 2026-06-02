import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Heart, Crown, Trophy, X, Zap, Flame, Star } from 'lucide-react'
import { cn, formatNumber, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Gift {
  id: string
  name: string
  emoji: string
  price: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  combo?: boolean
}

const GIFTS: Gift[] = [
  { id: 'heart', name: '小心心', emoji: '💖', price: 1, rarity: 'common' },
  { id: 'rose', name: '玫瑰', emoji: '🌹', price: 9, rarity: 'common' },
  { id: 'coffee', name: '咖啡', emoji: '☕', price: 18, rarity: 'common' },
  { id: 'crown', name: '皇冠', emoji: '👑', price: 99, rarity: 'rare' },
  { id: 'rocket', name: '火箭', emoji: '🚀', price: 199, rarity: 'rare' },
  { id: 'fireworks', name: '烟花', emoji: '🎆', price: 388, rarity: 'epic' },
  { id: 'castle', name: '城堡', emoji: '🏰', price: 888, rarity: 'epic' },
  { id: 'galaxy', name: '银河', emoji: '🌌', price: 1999, rarity: 'legendary', combo: true },
  { id: 'trophy', name: '奖杯', emoji: '🏆', price: 9999, rarity: 'legendary', combo: true },
]

interface ComboItem {
  gift: Gift
  count: number
  startTime: number
}

const RARITY_BG = {
  common: 'bg-gradient-to-br from-gray-100 to-slate-200 dark:from-gray-800 dark:to-slate-700',
  rare: 'bg-gradient-to-br from-blue-100 to-cyan-200 dark:from-blue-800 dark:to-cyan-700',
  epic: 'bg-gradient-to-br from-violet-100 to-purple-200 dark:from-violet-800 dark:to-purple-700',
  legendary: 'bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-700 dark:to-orange-600',
}

const RARITY_RING = {
  common: 'ring-1 ring-gray-300/50',
  rare: 'ring-2 ring-blue-400',
  epic: 'ring-2 ring-violet-500 shadow-lg shadow-violet-500/50',
  legendary: 'ring-2 ring-amber-500 shadow-2xl shadow-amber-500/50 animate-pulse',
}

export function GiftCombo() {
  const [combo, setCombo] = useState<Record<string, ComboItem>>({})
  const [active, setActive] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (active) {
      const timer = setTimeout(() => setActive(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [active])

  const send = (g: Gift) => {
    setCombo((c) => {
      const existing = c[g.id]
      const now = Date.now()
      if (existing && now - existing.startTime < 5000) {
        return { ...c, [g.id]: { ...existing, count: existing.count + 1 } }
      }
      return { ...c, [g.id]: { gift: g, count: 1, startTime: now } }
    })
    setActive(g.id)
  }

  const activeGift = active ? combo[active] : null
  const activeData = GIFTS.find((g) => g.id === active)

  const total = Object.values(combo).reduce((s, c) => s + c.gift.price * c.count, 0)
  const totalCount = Object.values(combo).reduce((s, c) => s + c.count, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold flex items-center gap-1.5">
          <Sparkles className="w-5 h-5 text-rose-500" />
          礼物连击
        </h3>
        <button
          onClick={() => setOpen(!open)}
          className="text-xs px-3 h-7 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium"
        >
          打开礼物
        </button>
      </div>

      {totalCount > 0 && (
        <div className="bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 rounded-2xl p-3">
          <div className="flex items-center gap-2 text-xs text-ink-500 mb-2">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>本次连击 · {totalCount} 个 · ¥{total}</span>
          </div>
          <div className="space-y-1">
            {Object.values(combo).map((c) => {
              const isLegend = c.gift.rarity === 'legendary' && c.count >= 3
              const isEpic = c.gift.rarity === 'epic' && c.count >= 5
              return (
                <motion.div
                  key={c.gift.id}
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1 rounded-lg text-xs',
                    RARITY_BG[c.gift.rarity]
                  )}
                >
                  <span className="text-lg">{c.gift.emoji}</span>
                  <span className="font-medium">{c.gift.name}</span>
                  {isLegend && <Crown className="w-3 h-3 text-amber-500" />}
                  {isEpic && <Trophy className="w-3 h-3 text-violet-500" />}
                  <span className="ml-auto font-bold">×{c.count}</span>
                  <span className="text-ink-500">¥{c.gift.price * c.count}</span>
                </motion.div>
              )
            })}
          </div>
          {totalCount >= 10 && (
            <div className="mt-2 px-2 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center text-xs font-bold">
              <Flame className="w-3 h-3 inline mr-1" />超级连击 +100% 主播经验加成!
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {activeData && activeGift && (
          <motion.div
            key={activeGift.startTime}
            initial={{ y: 100, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -100, opacity: 0, scale: 0.5 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="text-center">
              <div className={cn('text-6xl', activeGift.count >= 5 && 'animate-bounce')}>
                {activeData.emoji}
              </div>
              {activeGift.count > 1 && (
                <div className={cn(
                  'mt-1 px-3 py-1 rounded-full font-bold text-white shadow-lg',
                  activeData.rarity === 'legendary' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                  activeData.rarity === 'epic' ? 'bg-gradient-to-r from-violet-500 to-purple-500' :
                  'bg-gradient-to-r from-rose-500 to-pink-500'
                )}>
                  {activeData.name} × {activeGift.count}!
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur" onClick={() => setOpen(false)}>
          <motion.div
            initial={{ y: 200 }}
            animate={{ y: 0 }}
            exit={{ y: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-ink-900 rounded-t-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">选择礼物</h3>
              <button onClick={() => setOpen(false)} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {GIFTS.map((g) => (
                <motion.button
                  key={g.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => send(g)}
                  className={cn(
                    'p-3 rounded-xl border border-ink-200 dark:border-ink-700 hover:scale-105 transition',
                    RARITY_BG[g.rarity],
                    RARITY_RING[g.rarity]
                  )}
                >
                  <div className="text-3xl mb-1">{g.emoji}</div>
                  <p className="text-xs font-semibold">{g.name}</p>
                  <p className="text-[10px] text-ink-500">¥{g.price}</p>
                  {g.combo && <p className="text-[9px] text-amber-500 mt-0.5">连击特效</p>}
                </motion.button>
              ))}
            </div>
            {totalCount > 0 && (
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-ink-500">合计 ¥{total}</span>
                <button
                  onClick={() => { setCombo({}); toast('已清空', 'info') }}
                  className="text-xs text-rose-500"
                >
                  清空
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}
