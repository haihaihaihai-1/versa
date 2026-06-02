import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, X, Sparkles, Clock, Users } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface RedPacket {
  id: string
  from: string
  amount: number
  total: number
  claimed: number
  expiresAt: number
  message: string
}

const SEED_PACKETS: RedPacket[] = [
  { id: 'rp1', from: '主播 · 数码小王子', amount: 200, total: 100, claimed: 73, expiresAt: Date.now() + 60000 * 5, message: '618 大促冲冲冲!' },
  { id: 'rp2', from: '粉丝团 · 神秘富豪', amount: 100, total: 50, claimed: 12, expiresAt: Date.now() + 60000 * 15, message: '一起来抢!' },
  { id: 'rp3', from: '主播 · 美食家 Lily', amount: 300, total: 200, claimed: 0, expiresAt: Date.now() + 60000 * 3, message: '618 厨电福利' },
]

const CLAIMED_KEY = 'versa:rp-claimed'

function loadClaimed(): string[] {
  try { return JSON.parse(localStorage.getItem(CLAIMED_KEY) || '[]') } catch { return [] }
}

function saveClaimed(c: string[]) {
  try { localStorage.setItem(CLAIMED_KEY, JSON.stringify(c)) } catch {}
}

export function RedPacket({ compact = false }: { compact?: boolean }) {
  const [packets, setPackets] = useState<RedPacket[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [result, setResult] = useState<{ amount: number } | null>(null)
  const [claimed, setClaimed] = useState<string[]>([])

  useEffect(() => {
    setPackets(SEED_PACKETS)
    setClaimed(loadClaimed())
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setPackets((p) => p.filter((x) => x.expiresAt > Date.now())), 1000)
    return () => clearInterval(timer)
  }, [])

  const open = (p: RedPacket) => {
    if (claimed.includes(p.id)) { toast('已经领过啦', 'error'); return }
    if (p.claimed >= p.total) { toast('已被抢光', 'error'); return }
    const randomAmount = +(Math.random() * (p.amount / p.total) * 3 + 0.1).toFixed(2)
    setOpenId(p.id)
    setResult({ amount: randomAmount })
    const next = [...claimed, p.id]
    setClaimed(next)
    saveClaimed(next)
    setPackets((ps) => ps.map((x) => x.id === p.id ? { ...x, claimed: x.claimed + 1 } : x))
  }

  const active = packets.find((p) => p.id === openId)

  if (compact) {
    return (
      <div className="space-y-1.5">
        {packets.map((p) => (
          <button
            key={p.id}
            onClick={() => open(p)}
            disabled={claimed.includes(p.id)}
            className="w-full flex items-center gap-2 p-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-left"
          >
            <Gift className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{p.from}</p>
              <p className="text-[10px] opacity-80 truncate">{p.message}</p>
            </div>
            <div className="text-right text-[10px]">
              <p className="font-bold">¥{p.amount}</p>
              <p className="opacity-80">{p.claimed}/{p.total}</p>
            </div>
          </button>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        <h3 className="text-sm font-bold flex items-center gap-1.5"><Gift className="w-4 h-4 text-rose-500" />直播间红包</h3>
        {packets.length === 0 ? (
          <p className="text-center text-xs text-ink-500 py-6">没有红包了</p>
        ) : (
          packets.map((p) => {
            const remaining = Math.max(0, p.expiresAt - Date.now())
            const mins = Math.floor(remaining / 60000)
            const isClaimed = claimed.includes(p.id)
            const isFull = p.claimed >= p.total
            return (
              <motion.button
                key={p.id}
                onClick={() => open(p)}
                disabled={isClaimed || isFull}
                whileHover={{ scale: isClaimed || isFull ? 1 : 1.02 }}
                className={cn(
                  'w-full rounded-2xl p-3 text-white text-left flex items-center gap-3 relative overflow-hidden',
                  isClaimed || isFull
                    ? 'bg-ink-300 dark:bg-ink-800'
                    : 'bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500'
                )}
              >
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{p.from}</p>
                  <p className="text-xs opacity-90 truncate">{p.message}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] opacity-80">
                    <span><Clock className="inline w-2.5 h-2.5 mr-0.5" />{mins}分</span>
                    <span><Users className="inline w-2.5 h-2.5 mr-0.5" />{p.claimed}/{p.total}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">¥{p.amount}</p>
                  <p className="text-[10px] opacity-80">
                    {isClaimed ? '已领' : isFull ? '已抢光' : '点击拆'}
                  </p>
                </div>
                {!isClaimed && !isFull && (
                  <motion.div
                    className="absolute top-1 right-1 text-yellow-200"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  >
                    <Sparkles className="w-3 h-3" />
                  </motion.div>
                )}
              </motion.button>
            )
          })
        )}
      </div>

      <AnimatePresence>
        {active && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur flex items-center justify-center p-6"
            onClick={() => { setOpenId(null); setResult(null) }}
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, rotate: 20 }}
              transition={{ type: 'spring' }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-rose-500 via-pink-500 to-amber-500 rounded-3xl p-8 text-white text-center max-w-xs w-full"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ duration: 0.6 }}
                className="text-6xl mb-3"
              >
                🧧
              </motion.div>
              <p className="text-sm opacity-90 mb-1">恭喜发财</p>
              <p className="text-5xl font-bold my-2">¥{result.amount}</p>
              <p className="text-xs opacity-80 mb-4">来自 {active.from}</p>
              <button
                onClick={() => { setOpenId(null); setResult(null) }}
                className="w-full h-9 rounded-full bg-white/30 hover:bg-white/40 text-sm font-semibold"
              >
                收下
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
