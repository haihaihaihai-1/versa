import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Handshake, Sparkles, Loader2, Check, X, MessageCircle, Star, Send } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface CollabRequest {
  id: string
  from: { id: string; name: string; avatar: string; followers: number; tags: string[] }
  to: { id: string; name: string; avatar: string; followers: number; tags: string[] }
  topic: string
  description: string
  deliverable: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: number
  rating?: number
  review?: string
}

const ME = { id: 'me', name: '我 (创作者)', avatar: 'https://i.pravatar.cc/100?img=99', followers: 28500, tags: ['美食', '生活方式'] }

const CREATORS = [
  { id: 'c1', name: '数码小王子', avatar: 'https://i.pravatar.cc/100?img=51', followers: 152000, tags: ['数码', '评测'] },
  { id: 'c2', name: '穿搭博主 Mia', avatar: 'https://i.pravatar.cc/100?img=33', followers: 89400, tags: ['服饰', '美妆'] },
  { id: 'c3', name: '美食家 Lily', avatar: 'https://i.pravatar.cc/100?img=20', followers: 234500, tags: ['美食', '探店'] },
  { id: 'c4', name: '美妆博主 Ava', avatar: 'https://i.pravatar.cc/100?img=22', followers: 412000, tags: ['美妆', '教程'] },
]

const STORAGE_KEY = 'versa:collab'

function load(): CollabRequest[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [
  { id: 'r1', from: ME, to: CREATORS[0], topic: '618 数码联名直播', description: 'iPhone 16 + MacBook 配件组合直播带货', deliverable: '2 场直播 + 1 条短视频', status: 'pending', createdAt: Date.now() - 86400000 * 2 },
  { id: 'r2', from: CREATORS[1], to: ME, topic: '夏日穿搭联动', description: '跨平台合作, 互相推广内容', deliverable: '3 条合作视频', status: 'accepted', createdAt: Date.now() - 86400000 * 5, rating: 5, review: '合作非常愉快!' },
] }
function save(d: CollabRequest[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function CreatorCollab() {
  const [list, setList] = useState<CollabRequest[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [description, setDescription] = useState('')
  const [deliverable, setDeliverable] = useState('')
  const [selectedTo, setSelectedTo] = useState<typeof CREATORS[0] | null>(null)
  const [aiSuggest, setAiSuggest] = useState('')
  const [loading, setLoading] = useState(false)
  const [ratingOpen, setRatingOpen] = useState<string | null>(null)
  const [tempRating, setTempRating] = useState(0)
  const [tempReview, setTempReview] = useState('')

  useEffect(() => { setList(load()) }, [])
  useEffect(() => { if (list.length) save(list) }, [list])

  const respond = (id: string, status: 'accepted' | 'rejected') => {
    setList((ls) => ls.map((r) => r.id === id ? { ...r, status } : r))
    toast(status === 'accepted' ? '已接受合作' : '已拒绝', 'success')
  }

  const create = () => {
    if (!topic.trim() || !description.trim() || !deliverable.trim() || !selectedTo) { toast('请填写完整', 'error'); return }
    const r: CollabRequest = { id: uid(), from: ME, to: selectedTo, topic, description, deliverable, status: 'pending', createdAt: Date.now() }
    setList([r, ...list])
    setTopic(''); setDescription(''); setDeliverable(''); setSelectedTo(null); setCreateOpen(false)
    toast('合作邀请已发送', 'success')
  }

  const rate = () => {
    if (!ratingOpen || tempRating === 0) { toast('请评分', 'error'); return }
    setList((ls) => ls.map((r) => r.id === ratingOpen ? { ...r, rating: tempRating, review: tempReview } : r))
    setRatingOpen(null); setTempRating(0); setTempReview('')
    toast('评价已提交', 'success')
  }

  const aiHelp = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为美食 + 数码创作者推荐 3 个跨领域合作创意 (50-100 字)', '你是 Versa 创作者合作顾问, 简洁实用, 中文')
      setAiSuggest(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Handshake className="w-5 h-5" />
          <h2 className="text-lg font-bold">创作者合作</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">寻找合作伙伴, 拓展影响力</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{list.filter((r) => r.status === 'pending').length}</p>
            <p className="text-[10px] opacity-80">待响应</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{list.filter((r) => r.status === 'accepted').length}</p>
            <p className="text-[10px] opacity-80">已合作</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{list.filter((r) => r.rating).length}</p>
            <p className="text-[10px] opacity-80">已评分</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setCreateOpen(true)} className="flex-1 h-9 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold">+ 发起合作</button>
        <button onClick={aiHelp} disabled={loading} className="px-3 h-9 rounded-xl bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          AI 创意
        </button>
      </div>

      {aiSuggest && (
        <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl p-3 border border-violet-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-violet-500"><Sparkles className="w-3.5 h-3.5" />AI 合作创意</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiSuggest}</p>
        </div>
      )}

      <div className="space-y-2">
        {list.map((r) => {
          const isIncoming = r.to.id === ME.id
          const partner = isIncoming ? r.from : r.to
          return (
            <motion.div
              key={r.id}
              whileHover={{ y: -2 }}
              className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-3 border border-ink-200/60 dark:border-ink-800/60"
            >
              <div className="flex items-start gap-2 mb-2">
                <img src={partner.avatar} alt={partner.name} className="w-10 h-10 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold truncate">{partner.name}</p>
                    {isIncoming && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500 text-white font-bold">收到</span>}
                  </div>
                  <p className="text-[10px] text-ink-500">{(partner.followers / 10000).toFixed(1)}w 粉丝 · {partner.tags.join('/')}</p>
                </div>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-bold', r.status === 'pending' ? 'bg-amber-100 text-amber-600' : r.status === 'accepted' ? 'bg-emerald-100 text-emerald-600' : 'bg-ink-100 text-ink-500')}>
                  {r.status === 'pending' ? '待定' : r.status === 'accepted' ? '已合作' : '已拒'}
                </span>
              </div>
              <p className="text-sm font-semibold mb-1">{r.topic}</p>
              <p className="text-xs text-ink-600 dark:text-ink-400 mb-1.5">{r.description}</p>
              <p className="text-[10px] text-ink-500">📦 交付: {r.deliverable}</p>

              {r.rating && (
                <div className="mt-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/40">
                  <div className="flex items-center gap-1 mb-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn('w-3 h-3', i < r.rating! ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                    ))}
                  </div>
                  {r.review && <p className="text-[10px] text-ink-600 dark:text-ink-400">"{r.review}"</p>}
                </div>
              )}

              {r.status === 'pending' && isIncoming && (
                <div className="flex gap-1.5 mt-2">
                  <button onClick={() => respond(r.id, 'accepted')} className="flex-1 h-7 rounded-lg bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
                    <Check className="w-3 h-3" />接受
                  </button>
                  <button onClick={() => respond(r.id, 'rejected')} className="flex-1 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1">
                    <X className="w-3 h-3" />婉拒
                  </button>
                </div>
              )}

              {r.status === 'accepted' && !r.rating && (
                <button onClick={() => setRatingOpen(r.id)} className="mt-2 w-full h-7 rounded-lg bg-amber-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
                  <Star className="w-3 h-3" />评价合作
                </button>
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
            className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3 max-h-[80vh] overflow-y-auto"
          >
            <h3 className="font-bold">发起合作</h3>
            <p className="text-xs text-ink-500">选择创作者:</p>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {CREATORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedTo(c)}
                  className={cn('w-full flex items-center gap-2 p-2 rounded-lg text-left', selectedTo?.id === c.id ? 'bg-violet-50 dark:bg-violet-900/30' : 'hover:bg-ink-50 dark:hover:bg-ink-800')}
                >
                  <img src={c.avatar} alt={c.name} className="w-8 h-8 rounded-full" />
                  <div className="flex-1 text-left">
                    <p className="text-xs font-semibold">{c.name}</p>
                    <p className="text-[10px] text-ink-500">{(c.followers / 10000).toFixed(1)}w · {c.tags.join('/')}</p>
                  </div>
                  {selectedTo?.id === c.id && <Check className="w-3.5 h-3.5 text-violet-500" />}
                </button>
              ))}
            </div>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="合作主题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="合作描述" rows={2} className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
            <input value={deliverable} onChange={(e) => setDeliverable(e.target.value)} placeholder="交付物 (如: 3 条视频)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-violet-500" />
            <button onClick={create} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold flex items-center justify-center gap-1.5">
              <Send className="w-3.5 h-3.5" />发送邀请
            </button>
          </motion.div>
        </div>
      )}

      {ratingOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setRatingOpen(null)}>
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3"
          >
            <h3 className="font-bold">评价合作</h3>
            <div className="flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <button key={i} onClick={() => setTempRating(i + 1)}>
                  <Star className={cn('w-7 h-7', i < tempRating ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                </button>
              ))}
            </div>
            <textarea value={tempReview} onChange={(e) => setTempReview(e.target.value)} placeholder="说说你的合作感受..." rows={3} className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-amber-500 resize-none" />
            <button onClick={rate} className="w-full h-9 rounded-lg bg-amber-500 text-white text-sm font-semibold">提交评价</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
