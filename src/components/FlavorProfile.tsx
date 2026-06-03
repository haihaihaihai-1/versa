import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, Heart, ChefHat, Star, TrendingUp, ThumbsUp, ThumbsDown, Crown, Award, Flame, Cookie, Plus } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Taste {
  flavor: 'sweet' | 'sour' | 'spicy' | 'salty' | 'bitter' | 'umami'
  rating: 1 | 2 | 3 | 4 | 5
}

interface FoodReview {
  id: string
  name: string
  rating: 1 | 2 | 3 | 4 | 5
  liked: boolean
  flavors: Taste['flavor'][]
  notes: string
  date: string
}

const STORAGE_KEY = 'versa:flavor-v1'

function load(): FoodReview[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: FoodReview[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): FoodReview[] {
  return [
    { id: '1', name: '麻辣火锅', rating: 5, liked: true, flavors: ['spicy', 'umami', 'salty'], notes: '麻辣鲜香, 越辣越想吃', date: new Date(Date.now() - 86400000 * 3).toISOString() },
    { id: '2', name: '提拉米苏', rating: 5, liked: true, flavors: ['sweet', 'bitter'], notes: '层次丰富', date: new Date(Date.now() - 86400000 * 7).toISOString() },
    { id: '3', name: '苦瓜', rating: 2, liked: false, flavors: ['bitter'], notes: '太苦了', date: new Date(Date.now() - 86400000 * 14).toISOString() },
    { id: '4', name: '寿司', rating: 4, liked: true, flavors: ['umami', 'salty'], notes: '新鲜好吃', date: new Date(Date.now() - 86400000 * 21).toISOString() },
  ]
}

const FLAVOR_META = {
  sweet: { label: '甜', emoji: '🍯', color: 'from-pink-400 to-rose-500' },
  sour: { label: '酸', emoji: '🍋', color: 'from-yellow-400 to-amber-500' },
  spicy: { label: '辣', emoji: '🌶️', color: 'from-red-500 to-rose-600' },
  salty: { label: '咸', emoji: '🧂', color: 'from-blue-400 to-cyan-500' },
  bitter: { label: '苦', emoji: '☕', color: 'from-amber-700 to-orange-800' },
  umami: { label: '鲜', emoji: '🍄', color: 'from-emerald-500 to-teal-600' },
} as const

export function FlavorProfile() {
  const [reviews, setReviews] = useState<FoodReview[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [rating, setRating] = useState<FoodReview['rating']>(4)
  const [liked, setLiked] = useState(true)
  const [flavors, setFlavors] = useState<Taste['flavor'][]>([])
  const [notes, setNotes] = useState('')

  useEffect(() => { save(reviews) }, [reviews])

  const total = reviews.length
  const likedCount = reviews.filter((r) => r.liked).length
  const avgRating = total > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : '0'

  // Flavor stats
  const flavorStats: { [k: string]: { count: number; liked: number; total: number } } = {}
  reviews.forEach((r) => {
    r.flavors.forEach((f) => {
      if (!flavorStats[f]) flavorStats[f] = { count: 0, liked: 0, total: 0 }
      flavorStats[f].count++
      flavorStats[f].total += r.rating
      if (r.liked) flavorStats[f].liked++
    })
  })

  // Top flavors by avg rating
  const topFlavors = (Object.entries(flavorStats) as [keyof typeof FLAVOR_META, { count: number; liked: number; total: number }][])
    .map(([f, s]) => ({ flavor: f, avg: s.total / s.count, count: s.count, likeRate: s.liked / s.count }))
    .sort((a, b) => b.avg - a.avg)

  const add = () => {
    if (!name.trim()) { toast('请输入', 'error'); return }
    const r: FoodReview = { id: uid(), name, rating, liked, flavors, notes, date: new Date().toISOString() }
    setReviews([r, ...reviews])
    setName(''); setNotes(''); setFlavors([]); setRating(4); setLiked(true)
    setAdding(false)
    toast('已记录', 'success')
  }

  const remove = (id: string) => setReviews(reviews.filter((r) => r.id !== id))
  const toggleFlavor = (f: Taste['flavor']) => setFlavors(flavors.includes(f) ? flavors.filter((x) => x !== f) : [...flavors, f])

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const tastes = topFlavors.slice(0, 3).map((f) => `${FLAVOR_META[f.flavor].label}(${f.avg.toFixed(1)}⭐)`).join('、')
      const result = await aiComplete(`用户最爱: ${tastes}. 推荐 3 道符合用户口味的菜, 中文, 每条 25 字`, '你是 Versa 美食家, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">口味画像</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">6 味偏好 · AI 推荐 · 食物记录</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">记录</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{likedCount}</p>
            <p className="text-[9px] opacity-80">喜欢</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgRating}</p>
            <p className="text-[9px] opacity-80">均评分</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{topFlavors[0] ? FLAVOR_META[topFlavors[0].flavor].label : '-'}</p>
            <p className="text-[9px] opacity-80">最爱</p>
          </div>
        </div>
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 推荐菜品
      </button>

      {aiTip && (
        <div className="bg-pink-50/40 dark:bg-pink-900/20 rounded-xl p-2 border border-pink-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold mb-1.5 flex items-center gap-1"><Crown className="w-3 h-3" />口味雷达</p>
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
          <div className="space-y-1.5">
            {(Object.keys(FLAVOR_META) as Array<keyof typeof FLAVOR_META>).map((f) => {
              const M = FLAVOR_META[f]
              const stat = flavorStats[f] || { count: 0, liked: 0, total: 0 }
              const avg = stat.count > 0 ? stat.total / stat.count : 0
              const likeRate = stat.count > 0 ? (stat.liked / stat.count) * 100 : 0
              return (
                <div key={f} className="flex items-center gap-1.5">
                  <span className="text-base w-6">{M.emoji}</span>
                  <span className="text-[10px] font-semibold w-8">{M.label}</span>
                  <div className="flex-1 h-2 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden relative">
                    <div className={cn('h-full bg-gradient-to-r', M.color)} style={{ width: `${(avg / 5) * 100}%` }} />
                    {stat.count > 0 && (
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-bold text-ink-700 dark:text-ink-300">
                        {stat.count}次 · 喜欢{likeRate.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />记录口味
        </button>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold">食物记录</p>
        {reviews.length === 0 ? (
          <p className="text-center text-xs text-ink-500 py-3">还没有记录</p>
        ) : reviews.map((r) => (
          <motion.div key={r.id} whileHover={{ y: -1 }} className={cn('rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border', r.liked ? 'border-rose-200/60 dark:border-rose-800/40' : 'border-ink-200/60 dark:border-ink-800/60')}>
            <div className="flex items-center gap-2">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white', r.liked ? 'bg-gradient-to-br from-rose-500 to-pink-500' : 'bg-gradient-to-br from-ink-400 to-ink-500')}>
                {r.liked ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{r.name}</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={cn('w-2.5 h-2.5', s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                  ))}
                  <span className="text-[9px] text-ink-500 ml-1">{new Date(r.date).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
              <button onClick={() => remove(r.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
            {r.flavors.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {r.flavors.map((f) => {
                  const M = FLAVOR_META[f]
                  return <span key={f} className="text-xs">{M.emoji}</span>
                })}
              </div>
            )}
            {r.notes && <p className="text-[10px] text-ink-500 mt-1">💭 {r.notes}</p>}
          </motion.div>
        ))}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">记录食物</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="食物名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">喜欢?</p>
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => setLiked(true)} className={cn('h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1', liked ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  <ThumbsUp className="w-3 h-3" />喜欢
                </button>
                <button onClick={() => setLiked(false)} className={cn('h-9 rounded-lg text-xs font-semibold flex items-center justify-center gap-1', !liked ? 'bg-ink-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  <ThumbsDown className="w-3 h-3" />不喜欢
                </button>
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">评分</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s as any)}>
                    <Star className={cn('w-5 h-5', s <= rating ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">口味标签 (多选)</p>
              <div className="grid grid-cols-6 gap-1.5">
                {(Object.keys(FLAVOR_META) as Array<keyof typeof FLAVOR_META>).map((f) => {
                  const M = FLAVOR_META[f]
                  return (
                    <button key={f} onClick={() => toggleFlavor(f)} className={cn('h-12 rounded-lg flex flex-col items-center justify-center', flavors.includes(f) ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      <span className="text-lg">{M.emoji}</span>
                      <span className="text-[9px]">{M.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[50px]" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold">记录</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
