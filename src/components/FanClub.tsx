import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Crown, Lock, Sparkles, Loader2, Users, MessageCircle, Heart, Star, Trophy, Zap, Gift, ChevronRight, X, Check } from 'lucide-react'
import { cn, formatNumber, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'
import { Link } from 'react-router-dom'

interface Tier {
  id: string
  level: number
  name: string
  emoji: string
  price: number
  color: string
  perks: string[]
  members: number
  joined: boolean
}

interface ExclusivePost {
  id: string
  title: string
  body: string
  thumbnail: string
  at: number
  tier: number
  reactions: number
}

const TIERS: Tier[] = [
  { id: 't1', level: 1, name: '铁粉', emoji: '🥉', price: 0, color: 'from-amber-700 to-amber-500', perks: ['专属铭牌', '会员表情', '优先客服', '每月 1 次抽奖'], members: 8420, joined: true },
  { id: 't2', level: 2, name: '银粉', emoji: '🥈', price: 18, color: 'from-slate-500 to-slate-300', perks: ['所有铁粉权益', '专属直播', '每月周边', '生日礼包'], members: 3210, joined: false },
  { id: 't3', level: 3, name: '金粉', emoji: '🥇', price: 88, color: 'from-amber-500 to-yellow-300', perks: ['所有银粉权益', '1v1 私聊', '签名周边', '演唱会门票'], members: 980, joined: false },
  { id: 't4', level: 4, name: '钻石', emoji: '💎', price: 388, color: 'from-cyan-500 to-blue-400', perks: ['所有金粉权益', '私人定制', '幕后探班', '终身粉丝群'], members: 124, joined: false },
]

const EXCLUSIVE: ExclusivePost[] = [
  { id: 'e1', title: '【专属】幕后花絮: 直播间的日常', body: '今天直播前的小片段, 先给粉丝们看~', thumbnail: 'https://picsum.photos/seed/e1/400/300', at: Date.now() - 86400000, tier: 1, reactions: 1240 },
  { id: 'e2', title: '【银粉+】6 月直播完整回放', body: '含未公开花絮, 银粉可看完整版', thumbnail: 'https://picsum.photos/seed/e2/400/300', at: Date.now() - 86400000 * 3, tier: 2, reactions: 580 },
  { id: 'e3', title: '【金粉+】线下见面会视频', body: '感谢金粉们的支持, 现场精彩记录', thumbnail: 'https://picsum.photos/seed/e3/400/300', at: Date.now() - 86400000 * 7, tier: 3, reactions: 920 },
  { id: 'e4', title: '【钻石】私人 1v1 视频', body: '只有钻石会员可见, 感谢陪伴', thumbnail: 'https://picsum.photos/seed/e4/400/300', at: Date.now() - 86400000 * 14, tier: 4, reactions: 124 },
]

const STORAGE_KEY = 'versa:fan-club'

interface State { tier: number; chat: { id: string; user: string; text: string; at: number; isStaff: boolean }[] }

function load(): State {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return {
    tier: 1,
    chat: [
      { id: 'c1', user: '购物达人王', text: '主播好棒!', at: Date.now() - 60000 * 5, isStaff: false },
      { id: 'c2', user: '创作者', text: '感谢支持~', at: Date.now() - 60000 * 4, isStaff: true },
      { id: 'c3', user: '美食家 Lily', text: '我已经是金粉了!', at: Date.now() - 60000 * 3, isStaff: false },
    ],
  }
}
function save(d: State) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function FanClub() {
  const [state, setState] = useState<State>(load())
  const [chatText, setChatText] = useState('')
  const [aiMsg, setAiMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPay, setShowPay] = useState<Tier | null>(null)

  useEffect(() => { save(state) }, [state])

  const currentTier = TIERS.find((t) => t.level === state.tier) || TIERS[0]
  const totalMembers = TIERS.reduce((s, t) => s + t.members, 0)
  const totalRevenue = TIERS.slice(1).reduce((s, t) => s + t.members * t.price, 0)

  const sendChat = () => {
    if (!chatText.trim()) return
    setState({ ...state, chat: [...state.chat, { id: uid(), user: '我', text: chatText, at: Date.now(), isStaff: false }] })
    setChatText('')
  }

  const upgrade = (t: Tier) => {
    setState({ ...state, tier: t.level })
    setShowPay(null)
    toast(`已升级到 ${t.emoji} ${t.name}`, 'success')
  }

  const canAccess = (tier: number) => state.tier >= tier

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为粉丝俱乐部生成 1 条主放送福利的群消息 (40-60 字, 活泼有爱)', '你是 Versa 主播, 粉丝亲切感, 中文')
      setAiMsg(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Crown className="w-5 h-5" />
          <h2 className="text-lg font-bold">粉丝俱乐部</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">专属内容 · 福利周边 · 优先权益</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{formatNumber(totalMembers)}</p>
            <p className="text-[10px] opacity-80">成员</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{state.tier}</p>
            <p className="text-[10px] opacity-80">我的等级</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">¥{formatNumber(totalRevenue)}</p>
            <p className="text-[10px] opacity-80">营收</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20 p-3 border border-amber-200/40">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-2xl">{currentTier.emoji}</span>
          <p className="text-sm font-bold">当前等级: {currentTier.name}</p>
        </div>
        <p className="text-[10px] text-ink-500 mb-1.5">已享 {currentTier.perks.length} 项权益</p>
        <div className="flex flex-wrap gap-1">
          {currentTier.perks.map((p) => (
            <span key={p} className="px-1.5 py-0.5 rounded bg-white/60 dark:bg-ink-900/30 text-[10px] font-semibold flex items-center gap-0.5">
              <Check className="w-2.5 h-2.5 text-emerald-500" />{p}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-bold">升级选项</p>
        {TIERS.filter((t) => t.level > state.tier).map((t) => (
          <motion.div key={t.id} whileHover={{ x: 4 }} className={cn('p-3 rounded-2xl text-white bg-gradient-to-r', t.color)}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{t.emoji}</span>
              <p className="text-base font-bold flex-1">{t.name}</p>
              <span className="text-lg font-bold">¥{t.price}</span>
            </div>
            <p className="text-[10px] opacity-90 mb-1.5">{t.members.toLocaleString()} 成员</p>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {t.perks.slice(0, 2).map((p) => (
                <span key={p} className="px-1.5 py-0.5 rounded bg-white/20 text-[9px] font-semibold">{p}</span>
              ))}
              {t.perks.length > 2 && <span className="text-[9px] opacity-80">+{t.perks.length - 2} 项</span>}
            </div>
            <button onClick={() => setShowPay(t)} className="w-full h-7 rounded-lg bg-white text-ink-900 text-xs font-bold">立即升级</button>
          </motion.div>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-bold">专属内容</p>
          <button onClick={runAI} disabled={loading} className="px-2 h-7 rounded-lg bg-amber-500 text-white text-[10px] font-semibold flex items-center gap-0.5">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}主放送
          </button>
        </div>
        {aiMsg && (
          <div className="bg-amber-50/40 dark:bg-amber-900/20 rounded-xl p-2 border border-amber-200/40 mb-1.5">
            <p className="text-[10px] text-amber-700 dark:text-amber-300">📢 {aiMsg}</p>
          </div>
        )}
        <div className="space-y-1.5">
          {EXCLUSIVE.map((p) => {
            const accessible = canAccess(p.tier)
            return (
              <div key={p.id} className={cn('rounded-2xl overflow-hidden border', accessible ? 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60' : 'bg-ink-50/30 dark:bg-ink-900/10 border-ink-200/30')}>
                <div className="flex gap-2 p-2">
                  <div className="relative w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={p.thumbnail} alt={p.title} className={cn('w-full h-full object-cover', !accessible && 'opacity-40 blur-sm')} />
                    {!accessible && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Lock className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold line-clamp-1', !accessible && 'blur-sm')}>{p.title}</p>
                    <p className="text-[10px] text-ink-500 line-clamp-1">{p.body}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-ink-500">
                      <span className="px-1 py-0.5 rounded bg-amber-500 text-white font-bold">T{p.tier}+</span>
                      <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{formatNumber(p.reactions)}</span>
                    </div>
                  </div>
                  {accessible ? (
                    <Link to="/p/exclusive" className="text-amber-500 flex-shrink-0 self-center">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <button onClick={() => setShowPay(TIERS.find((t) => t.level === p.tier)!)} className="text-[10px] text-amber-500 font-bold flex-shrink-0 self-center">解锁</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
        <div className="p-2 border-b border-ink-200/60 dark:border-ink-800/60 flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-amber-500" />
          <p className="text-xs font-bold flex-1">粉丝群</p>
          <span className="text-[10px] text-ink-500">{state.chat.length} 条</span>
        </div>
        <div className="h-40 overflow-y-auto p-2 space-y-1.5">
          {state.chat.map((m) => (
            <div key={m.id} className={cn('flex gap-1.5 text-xs', m.isStaff && 'flex-row-reverse')}>
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0', m.isStaff ? 'bg-amber-500 text-white' : 'bg-ink-200 dark:bg-ink-800')}>{m.user[0]}</div>
              <div className={cn('rounded-2xl px-2 py-1 max-w-[80%]', m.isStaff ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                <p className="text-[9px] opacity-80">{m.user}</p>
                <p className="leading-relaxed">{m.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="p-2 flex gap-1 border-t border-ink-200/60 dark:border-ink-800/60">
          <input value={chatText} onChange={(e) => setChatText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendChat()} placeholder="说点什么..." className="flex-1 px-2 h-7 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none" />
          <button onClick={sendChat} className="px-3 h-7 rounded-lg bg-amber-500 text-white text-xs">发送</button>
        </div>
      </div>

      {showPay && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setShowPay(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className={cn('w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 space-y-3 text-white bg-gradient-to-br', showPay.color)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-3xl">{showPay.emoji}</span>
                <div>
                  <h3 className="text-lg font-bold">升级到 {showPay.name}</h3>
                  <p className="text-xs opacity-80">解锁 {showPay.perks.length} 项专属权益</p>
                </div>
              </div>
              <button onClick={() => setShowPay(null)}><X className="w-4 h-4" /></button>
            </div>
            <div className="bg-white/15 rounded-2xl p-3 text-center">
              <p className="text-3xl font-bold mb-0.5">¥{showPay.price}</p>
              <p className="text-[10px] opacity-80">每月 / 续费可随时取消</p>
            </div>
            <div className="space-y-1.5">
              {showPay.perks.map((p) => (
                <div key={p} className="flex items-center gap-1.5 text-sm">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
            <button onClick={() => upgrade(showPay)} className="w-full h-10 rounded-xl bg-white text-ink-900 font-bold">立即开通</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
