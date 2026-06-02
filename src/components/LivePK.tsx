import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Trophy, Heart, Zap, Crown, Sparkles, X, Plus } from 'lucide-react'
import { cn, formatNumber, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface PKRoom {
  id: string
  host1: { name: string; avatar: string; category: string; viewers: number; gifts: number }
  host2: { name: string; avatar: string; category: string; viewers: number; gifts: number }
  topic: string
  startedAt: number
  duration: number
}

const SEED_ROOMS: PKRoom[] = [
  {
    id: 'pk1', topic: '618 数码好物大 PK', duration: 600000,
    startedAt: Date.now() - 240000,
    host1: { name: '数码小王子', avatar: 'https://i.pravatar.cc/100?img=51', category: '数码', viewers: 18500, gifts: 128000 },
    host2: { name: '科技大叔', avatar: 'https://i.pravatar.cc/100?img=52', category: '数码', viewers: 16200, gifts: 98500 },
  },
  {
    id: 'pk2', topic: '618 美食探店对决', duration: 600000,
    startedAt: Date.now() - 120000,
    host1: { name: '美食家 Lily', avatar: 'https://i.pravatar.cc/100?img=20', category: '美食', viewers: 12300, gifts: 76000 },
    host2: { name: '探店达人 D', avatar: 'https://i.pravatar.cc/100?img=66', category: '美食', viewers: 9800, gifts: 89200 },
  },
]

const SUPPORTED_KEY = 'versa:pk-supported'

function loadSupported(): string[] {
  try { return JSON.parse(localStorage.getItem(SUPPORTED_KEY) || '[]') } catch { return [] }
}

function saveSupported(s: string[]) {
  try { localStorage.setItem(SUPPORTED_KEY, JSON.stringify(s)) } catch {}
}

export function LivePK() {
  const [room, setRoom] = useState<PKRoom | null>(null)
  const [supported, setSupported] = useState<string[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [giftRain, setGiftRain] = useState<{ id: string; emoji: string; side: 1 | 2 }[]>([])

  useEffect(() => {
    setRoom(SEED_ROOMS[0])
    setSupported(loadSupported())
  }, [])

  useEffect(() => {
    if (!room) return
    const timer = setInterval(() => {
      setElapsed(Date.now() - room.startedAt)
    }, 1000)
    return () => clearInterval(timer)
  }, [room])

  useEffect(() => {
    if (!room) return
    const rainTimer = setInterval(() => {
      const side = Math.random() > 0.5 ? 1 : 2
      const emojis = ['🎁', '🌹', '💎', '🏆', '🎉', '⭐']
      const newGift = { id: uid(), emoji: emojis[Math.floor(Math.random() * emojis.length)], side: side as 1 | 2 }
      setGiftRain((g) => [...g.slice(-15), newGift])
    }, 800)
    return () => clearInterval(rainTimer)
  }, [room])

  const support = (host: 1 | 2) => {
    if (!room) return
    const target = host === 1 ? room.host1 : room.host2
    const id = `${room.id}-${host}`
    if (supported.includes(id)) { toast('已支持过', 'error'); return }
    setSupported([...supported, id])
    saveSupported([...supported, id])
    setRoom({
      ...room,
      host1: host === 1 ? { ...room.host1, gifts: room.host1.gifts + 100 } : room.host1,
      host2: host === 2 ? { ...room.host2, gifts: room.host2.gifts + 100 } : room.host2,
    })
    toast(`已为 ${target.name} 加油!`, 'success')
  }

  if (!room) return null

  const total = room.host1.gifts + room.host2.gifts
  const host1Percent = (room.host1.gifts / total) * 100
  const remaining = Math.max(0, room.duration - elapsed)
  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)
  const leader = room.host1.gifts > room.host2.gifts ? 1 : room.host1.gifts < room.host2.gifts ? 2 : 0

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          <div>
            <h2 className="text-lg font-bold">主播 PK</h2>
            <p className="text-[10px] opacity-80">{room.topic} · 剩 {mins}:{secs.toString().padStart(2, '0')}</p>
          </div>
        </div>
      </div>

      <div className="relative bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
        <AnimatePresence>
          {giftRain.map((g) => (
            <motion.div
              key={g.id}
              initial={{ y: -50, x: g.side === 1 ? '0%' : '90%', opacity: 0, scale: 0.5 }}
              animate={{ y: 200, opacity: [0, 1, 0], scale: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: 'easeIn' }}
              className="absolute top-0 text-2xl pointer-events-none"
            >
              {g.emoji}
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-3 relative z-10">
          {([1, 2] as const).map((side) => {
            const h = side === 1 ? room.host1 : room.host2
            const isLeader = leader === side
            const isSupported = supported.includes(`${room.id}-${side}`)
            return (
              <motion.button
                key={side}
                onClick={() => support(side)}
                disabled={isSupported}
                whileHover={{ scale: isSupported ? 1 : 1.02 }}
                className={cn(
                  'rounded-2xl p-3 text-center relative',
                  isSupported ? 'bg-ink-100 dark:bg-ink-800' : 'bg-gradient-to-b from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20',
                  isLeader && 'ring-2 ring-amber-400'
                )}
              >
                {isLeader && (
                  <Crown className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-5 text-amber-500" />
                )}
                <div className="relative inline-block">
                  <img src={h.avatar} alt={h.name} className="w-14 h-14 rounded-full border-2 border-white shadow-md" />
                  <span className="absolute -bottom-1 -right-1 px-1.5 rounded-full text-[8px] font-bold bg-rose-500 text-white">
                    {h.category}
                  </span>
                </div>
                <p className="text-sm font-bold mt-1.5">{h.name}</p>
                <p className="text-[10px] text-ink-500">{formatNumber(h.viewers)} 人看</p>
                <p className="text-lg font-black text-rose-500 mt-1">{formatNumber(h.gifts)}</p>
                <div className={cn(
                  'mt-1.5 h-6 rounded-full text-[10px] font-bold flex items-center justify-center gap-1',
                  isSupported ? 'bg-emerald-500 text-white' : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white'
                )}>
                  {isSupported ? <><Heart className="w-3 h-3 fill-white" />已支持</> : <><Zap className="w-3 h-3" />加油</>}
                </div>
              </motion.button>
            )
          })}
        </div>

        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[10px] text-ink-500">
            <span>{room.host1.name} {host1Percent.toFixed(0)}%</span>
            <span>{(100 - host1Percent).toFixed(0)}% {room.host2.name}</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-ink-100 dark:bg-ink-800">
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 transition-all" style={{ width: `${host1Percent}%` }} />
            <div className="bg-gradient-to-r from-violet-500 to-blue-500 transition-all" style={{ width: `${100 - host1Percent}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60">
        <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />PK 规则
        </h3>
        <ul className="text-xs text-ink-500 space-y-0.5 list-disc list-inside">
          <li>10 分钟内礼物数高者获胜, 获得专属徽章</li>
          <li>每位用户可同时支持双方, 礼物翻倍</li>
          <li>获胜方在直播封面获得「PK 之王」徽章 24h</li>
          <li>失败方承诺下一个福利, 由观众投票决定</li>
        </ul>
      </div>
    </div>
  )
}
