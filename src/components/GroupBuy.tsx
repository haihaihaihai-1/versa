import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Clock, TrendingUp, Copy, Share2, Trophy, Gift } from 'lucide-react'
import { cn, formatNumber, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Group {
  id: string
  productId: string
  productName: string
  productImg: string
  price: number
  groupPrice: number
  target: number
  current: number
  expiresAt: number
  initiator: string
  initiatorAvatar: string
}

const SEED: Group[] = [
  { id: 'g1', productId: 'p1', productName: 'iPhone 16 Pro 256G', productImg: 'https://picsum.photos/seed/iphone16/300/300', price: 8999, groupPrice: 8499, target: 3, current: 2, expiresAt: Date.now() + 86400000 * 1.5, initiator: '购物达人王', initiatorAvatar: 'https://i.pravatar.cc/100?img=11' },
  { id: 'g2', productId: 'p2', productName: 'AirPods Pro 2 主动降噪', productImg: 'https://picsum.photos/seed/airpods/300/300', price: 1899, groupPrice: 1699, target: 5, current: 3, expiresAt: Date.now() + 86400000 * 0.8, initiator: '数码小王子', initiatorAvatar: 'https://i.pravatar.cc/100?img=51' },
  { id: 'g3', productId: 'p3', productName: 'Apple Watch Series 10', productImg: 'https://picsum.photos/seed/watch/300/300', price: 3199, groupPrice: 2899, target: 3, current: 1, expiresAt: Date.now() + 86400000 * 2, initiator: '美食家 Lily', initiatorAvatar: 'https://i.pravatar.cc/100?img=20' },
  { id: 'g4', productId: 'p4', productName: '戴森 V12 无线吸尘器', productImg: 'https://picsum.photos/seed/dyson/300/300', price: 4990, groupPrice: 4490, target: 4, current: 4, expiresAt: Date.now() + 3600000 * 6, initiator: '探店达人 D', initiatorAvatar: 'https://i.pravatar.cc/100?img=66' },
]

const JOINED_KEY = 'versa:group-joined'

function loadJoined(): string[] {
  try { return JSON.parse(localStorage.getItem(JOINED_KEY) || '[]') } catch { return [] }
}

function saveJoined(j: string[]) {
  try { localStorage.setItem(JOINED_KEY, JSON.stringify(j)) } catch {}
}

export function GroupBuy() {
  const [groups, setGroups] = useState<Group[]>([])
  const [joined, setJoined] = useState<string[]>([])

  useEffect(() => {
    setGroups(SEED)
    setJoined(loadJoined())
  }, [])

  const join = (g: Group) => {
    if (g.current >= g.target) { toast('已成团, 请参与下一期', 'error'); return }
    if (joined.includes(g.id)) { toast('已在团里', 'error'); return }
    const next = [...joined, g.id]
    setJoined(next)
    saveJoined(next)
    setGroups((gs) => gs.map((x) => x.id === g.id ? { ...x, current: Math.min(x.target, x.current + 1) } : x))
    toast('参团成功!', 'success')
  }

  const copyCode = (id: string) => {
    navigator.clipboard?.writeText(`团号 ${id.toUpperCase()}`)
    toast('已复制团号', 'success')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 p-4 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-5 h-5" />
          <h2 className="text-lg font-bold">超级拼团</h2>
        </div>
        <p className="text-xs opacity-90">邀请好友, 享超低价 · 已累计省 <span className="text-2xl font-bold mx-1">¥38w+</span></p>
      </div>

      <div className="space-y-2">
        {groups.map((g) => {
          const isJoined = joined.includes(g.id)
          const remaining = Math.max(0, g.expiresAt - Date.now())
          const hours = Math.floor(remaining / 3600000)
          const minutes = Math.floor((remaining % 3600000) / 60000)
          const progress = (g.current / g.target) * 100
          const full = g.current >= g.target
          return (
            <motion.div
              key={g.id}
              whileHover={{ y: -2 }}
              className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60 flex gap-3"
            >
              <img src={g.productImg} alt={g.productName} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1.5">
                <div>
                  <p className="text-sm font-semibold line-clamp-1">{g.productName}</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-bold text-rose-500">¥{g.groupPrice}</span>
                    <span className="text-[10px] text-ink-400 line-through">¥{g.price}</span>
                    <span className="text-[10px] text-emerald-500 font-semibold">省 ¥{g.price - g.groupPrice}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-ink-500">
                  <img src={g.initiatorAvatar} alt="" className="w-4 h-4 rounded-full" />
                  <span>{g.initiator} 发起</span>
                  <span>·</span>
                  <Clock className="w-2.5 h-2.5" />
                  <span>剩 {hours}h {minutes}m</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-rose-500 to-pink-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold whitespace-nowrap">
                    {g.current}/{g.target} 人
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {full ? (
                    <>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-white font-bold">已成团</span>
                      <button className="flex-1 h-7 rounded-lg bg-emerald-500 text-white text-xs font-semibold">立即购买</button>
                    </>
                  ) : isJoined ? (
                    <>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-nova-500 text-white font-bold">已参团</span>
                      <button onClick={() => copyCode(g.id)} className="flex-1 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1">
                        <Copy className="w-3 h-3" />复制团号
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => join(g)} className="flex-1 h-7 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold">
                        ¥{g.groupPrice} 参团
                      </button>
                      <button onClick={() => copyCode(g.id)} className="h-7 w-7 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
                        <Share2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-2.5 text-center border border-ink-200/60 dark:border-ink-800/60">
          <Users className="w-4 h-4 text-rose-500 mx-auto mb-0.5" />
          <p className="text-lg font-bold">{formatNumber(28600)}</p>
          <p className="text-[10px] text-ink-500">今日参团</p>
        </div>
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-2.5 text-center border border-ink-200/60 dark:border-ink-800/60">
          <TrendingUp className="w-4 h-4 text-amber-500 mx-auto mb-0.5" />
          <p className="text-lg font-bold">68%</p>
          <p className="text-[10px] text-ink-500">成团率</p>
        </div>
        <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-2.5 text-center border border-ink-200/60 dark:border-ink-800/60">
          <Gift className="w-4 h-4 text-violet-500 mx-auto mb-0.5" />
          <p className="text-lg font-bold">¥3.8</p>
          <p className="text-[10px] text-ink-500">平均节省</p>
        </div>
      </div>
    </div>
  )
}
