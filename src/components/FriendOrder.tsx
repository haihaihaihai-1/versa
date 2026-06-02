import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Share2, Copy, Clock, Sparkles, Loader2 } from 'lucide-react'
import { cn, formatNumber, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface FriendOrder {
  id: string
  productId: string
  productName: string
  productImg: string
  price: number
  totalNeeded: number
  joined: { id: string; name: string; avatar: string; qty: number; paid: boolean }[]
  initiator: { id: string; name: string; avatar: string }
  expiresAt: number
  status: 'open' | 'closed' | 'completed'
}

const SEED: FriendOrder[] = [
  { id: 'fo1', productId: 'p1', productName: 'iPhone 16 Pro 256G', productImg: 'https://picsum.photos/seed/iphone16/300/300', price: 8999, totalNeeded: 3, expiresAt: Date.now() + 86400000 * 2,
    initiator: { id: 'me', name: '我', avatar: 'https://i.pravatar.cc/100?img=99' },
    joined: [
      { id: 'u1', name: '购物达人王', avatar: 'https://i.pravatar.cc/100?img=11', qty: 1, paid: true },
    ],
    status: 'open',
  },
  { id: 'fo2', productId: 'p2', productName: 'AirPods Pro 2', productImg: 'https://picsum.photos/seed/airpods/300/300', price: 1899, totalNeeded: 2, expiresAt: Date.now() + 86400000,
    initiator: { id: 'u2', name: '数码小王子', avatar: 'https://i.pravatar.cc/100?img=51' },
    joined: [
      { id: 'me', name: '我', avatar: 'https://i.pravatar.cc/100?img=99', qty: 1, paid: false },
      { id: 'u3', name: '美食家 Lily', avatar: 'https://i.pravatar.cc/100?img=20', qty: 1, paid: true },
    ],
    status: 'open',
  },
]

const FRIENDS = [
  { id: 'u1', name: '购物达人王', avatar: 'https://i.pravatar.cc/100?img=11' },
  { id: 'u3', name: '美食家 Lily', avatar: 'https://i.pravatar.cc/100?img=20' },
  { id: 'u4', name: '穿搭博主 Mia', avatar: 'https://i.pravatar.cc/100?img=33' },
  { id: 'u5', name: '学生党 G', avatar: 'https://i.pravatar.cc/100?img=88' },
]

const STORAGE_KEY = 'versa:friend-orders'

function load(): FriendOrder[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return SEED
}

function save(o: FriendOrder[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)) } catch {} }

export function FriendOrder() {
  const [orders, setOrders] = useState<FriendOrder[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [aiRecommend, setAiRecommend] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { setOrders(load()) }, [])
  useEffect(() => { if (orders.length) save(orders) }, [orders])

  const invite = (id: string, friendId: string) => {
    const friend = FRIENDS.find((f) => f.id === friendId)
    if (!friend) return
    setOrders((os) => os.map((o) => o.id === id ? { ...o, joined: [...o.joined, { id: friend.id, name: friend.name, avatar: friend.avatar, qty: 1, paid: false }] } : o))
    toast('已邀请 ' + friend.name, 'success')
  }

  const payShare = (id: string) => {
    setOrders((os) => os.map((o) => {
      if (o.id !== id) return o
      const updated = o.joined.map((j) => j.id === 'me' ? { ...j, paid: true } : j)
      const totalJoined = updated.reduce((s, j) => s + j.qty, 0)
      return { ...o, joined: updated, status: totalJoined >= o.totalNeeded ? 'completed' : 'open' }
    }))
    toast('已支付拼单份额', 'success')
  }

  const copyCode = (id: string) => {
    navigator.clipboard?.writeText(`拼单号 ${id.toUpperCase()}`)
    toast('拼单号已复制', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(
        '推荐 3 个适合朋友拼单的场景 (50-100 字), 比如: 大件家电、季节性商品、节日礼物',
        '你是 Versa 拼单助手, 简洁实用, 中文'
      )
      setAiRecommend(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-purple-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5" />
          <h2 className="text-lg font-bold">好友拼单</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">和好友一起凑单, 享更多优惠</p>
        <button onClick={() => setCreateOpen(true)} className="px-3 h-8 rounded-full bg-white text-violet-500 text-xs font-bold">+ 发起拼单</button>
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        AI 推荐拼单场景
      </button>

      {aiRecommend && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl p-3 border border-violet-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-violet-500"><Sparkles className="w-3.5 h-3.5" />AI 推荐</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiRecommend}</p>
        </div>
      )}

      <div className="space-y-2">
        {orders.map((o) => {
          const totalJoined = o.joined.reduce((s, j) => s + j.qty, 0)
          const remaining = Math.max(0, o.expiresAt - Date.now())
          const hours = Math.floor(remaining / 3600000)
          const minutes = Math.floor((remaining % 3600000) / 60000)
          const isFull = totalJoined >= o.totalNeeded
          const myEntry = o.joined.find((j) => j.id === 'me')
          const myPaid = myEntry?.paid
          return (
            <motion.div
              key={o.id}
              whileHover={{ y: -2 }}
              className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60"
            >
              <div className="flex gap-2 mb-2">
                <img src={o.productImg} alt={o.productName} className="w-16 h-16 rounded-xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold line-clamp-1">{o.productName}</p>
                  <p className="text-base font-bold text-violet-500">¥{o.price}</p>
                  <p className="text-[10px] text-ink-500"><Clock className="inline w-2.5 h-2.5 mr-0.5" />剩 {hours}h {minutes}m</p>
                </div>
                {isFull && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500 text-white font-bold h-fit">已成团</span>}
              </div>

              <div className="flex items-center gap-1.5 mb-2">
                <div className="flex -space-x-1.5">
                  {o.joined.map((j) => (
                    <img key={j.id} src={j.avatar} alt={j.name} className={cn('w-6 h-6 rounded-full border-2 border-white dark:border-ink-900', j.paid ? 'opacity-100' : 'opacity-60')} title={j.name} />
                  ))}
                </div>
                <span className="text-[10px] text-ink-500">{totalJoined}/{o.totalNeeded} 人</span>
                <div className="flex-1 h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500" style={{ width: `${Math.min(100, (totalJoined / o.totalNeeded) * 100)}%` }} />
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {myPaid ? (
                  <span className="flex-1 h-7 rounded-lg bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center">✓ 已支付</span>
                ) : isFull ? (
                  <button onClick={() => payShare(o.id)} className="flex-1 h-7 rounded-lg bg-emerald-500 text-white text-xs font-semibold">支付 ¥{o.price}</button>
                ) : (
                  <>
                    <button onClick={() => payShare(o.id)} className="flex-1 h-7 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold">支付份额 ¥{o.price}</button>
                    <button onClick={() => copyCode(o.id)} className="h-7 w-7 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center"><Copy className="w-3.5 h-3.5" /></button>
                  </>
                )}
              </div>

              {!isFull && (
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[10px] text-ink-500 flex-shrink-0">邀请:</span>
                  {FRIENDS.filter((f) => !o.joined.find((j) => j.id === f.id)).map((f) => (
                    <button key={f.id} onClick={() => invite(o.id, f.id)} className="px-2 h-6 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-500 text-[10px] font-semibold flex items-center gap-0.5 flex-shrink-0">
                      <img src={f.avatar} alt="" className="w-3 h-3 rounded-full" />{f.name}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setCreateOpen(false)}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3"
          >
            <h3 className="font-bold">发起拼单</h3>
            <p className="text-xs text-ink-500">选择购物车中的商品, 邀请好友一起拼</p>
            <button onClick={() => { toast('已创建拼单 (模拟)', 'success'); setCreateOpen(false) }} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold">确认发起</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
