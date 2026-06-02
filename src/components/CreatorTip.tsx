import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, HeartHandshake, Sparkles, X, Trophy, Crown, Star } from 'lucide-react'
import { toast } from './ui/Toaster'
import { cn, formatCurrency, uid } from '../lib/utils'

interface Creator {
  id: string
  name: string
  avatar: string
  followers: number
  bio: string
  verified: boolean
}

const CREATORS: Creator[] = [
  { id: 'c1', name: '购物达人王', avatar: 'https://i.pravatar.cc/100?img=11', followers: 128000, bio: '专业测评 5 年, 帮你避坑', verified: true },
  { id: 'c2', name: '美食家 Lily', avatar: 'https://i.pravatar.cc/100?img=20', followers: 96000, bio: '吃遍全国, 寻找最地道的味道', verified: true },
  { id: 'c3', name: '穿搭博主 Mia', avatar: 'https://i.pravatar.cc/100?img=25', followers: 215000, bio: '高级感日常穿搭 | 168cm/48kg', verified: true },
  { id: 'c4', name: '美妆师姐', avatar: 'https://i.pravatar.cc/100?img=45', followers: 156000, bio: '理性种草, 科学护肤', verified: true },
  { id: 'c5', name: '代码艺术家', avatar: 'https://i.pravatar.cc/100?img=14', followers: 67000, bio: '代码改变世界', verified: false },
]

const TIP_AMOUNTS = [1, 5, 10, 50, 100, 500]

interface Tip {
  id: string
  creatorId: string
  amount: number
  message: string
  at: number
}

export function CreatorTip({ creatorId, onSent }: { creatorId: string; onSent?: (t: Tip) => void }) {
  const creator = CREATORS.find((c) => c.id === creatorId)
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(5)
  const [message, setMessage] = useState('')
  const [recent, setRecent] = useState<Tip[]>([])

  if (!creator) return null

  const send = () => {
    const t: Tip = { id: uid('t'), creatorId, amount, message, at: Date.now() }
    setRecent((r) => [t, ...r].slice(0, 3))
    onSent?.(t)
    setOpen(false)
    setMessage('')
    toast(`已打赏 ${creator.name} ¥${amount}`, 'success')
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 h-7 rounded-full bg-gradient-to-r from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 text-rose-600 text-xs font-semibold flex items-center gap-1 hover:scale-105 transition"
      >
        <HeartHandshake className="w-3 h-3" />打赏
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={() => setOpen(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-ink-900 rounded-2xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-1.5"><HeartHandshake className="w-4 h-4 text-rose-500" />打赏创作者</h3>
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded"><X className="w-4 h-4" /></button>
              </div>

              <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl">
                <img src={creator.avatar} alt={creator.name} className="w-10 h-10 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-sm">{creator.name}</p>
                    {creator.verified && <Sparkles className="w-3 h-3 text-rose-500" />}
                  </div>
                  <p className="text-[10px] text-ink-500">{creator.followers.toLocaleString()} 粉丝</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-ink-500 mb-1.5">打赏金额 (¥)</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {TIP_AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAmount(a)}
                      className={cn(
                        'h-10 rounded-lg text-sm font-semibold border-2 transition',
                        amount === a ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-600' : 'border-ink-200 dark:border-ink-700'
                      )}
                    >
                      ¥{a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-ink-500 mb-1.5">留言 (可选)</p>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  maxLength={50}
                  placeholder="写下你的鼓励..."
                  className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
                <p className="text-[10px] text-ink-400 text-right mt-0.5">{message.length}/50</p>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-ink-500">
                <Crown className="w-3 h-3 text-amber-500" />
                <span>¥100 以上: 创作者专属徽章</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-ink-500">
                <Trophy className="w-3 h-3 text-rose-500" />
                <span>¥500 以上: 列入创作者金主榜</span>
              </div>

              <button
                onClick={send}
                className="w-full h-11 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold flex items-center justify-center gap-1.5"
              >
                <Heart className="w-4 h-4 fill-current" />确认打赏 ¥{amount}
              </button>

              {recent.length > 0 && (
                <div className="pt-2 border-t border-ink-200 dark:border-ink-800">
                  <p className="text-[10px] text-ink-500 mb-1">本次打赏记录</p>
                  {recent.map((r) => (
                    <div key={r.id} className="text-[10px] flex items-center gap-1.5 text-rose-500">
                      <Heart className="w-2.5 h-2.5 fill-current" />
                      <span>¥{r.amount}</span>
                      {r.message && <span className="text-ink-500 truncate">· {r.message}</span>}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
