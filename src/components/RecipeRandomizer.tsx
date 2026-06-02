import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChefHat, Shuffle, Sparkles, Loader2, Plus, RefreshCw, X, BookOpen, Utensils, Heart, Star, Filter, Coffee, Salad, Pizza, Cake } from 'lucide-react'
import { cn } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Recipe {
  id: string
  name: string
  emoji: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'dessert' | 'snack' | 'drink'
  difficulty: 'easy' | 'medium' | 'hard'
  time: number
  taste: 'sweet' | 'spicy' | 'sour' | 'salty' | 'fresh'
  cuisine: 'chinese' | 'western' | 'japanese' | 'korean' | 'thai'
  spicy: number
  healthy: number
}

const RECIPES: Recipe[] = [
  { id: 'r1', name: '番茄炒蛋', emoji: '🍅', category: 'lunch', difficulty: 'easy', time: 15, taste: 'salty', cuisine: 'chinese', spicy: 0, healthy: 4 },
  { id: 'r2', name: '红烧肉', emoji: '🥩', category: 'dinner', difficulty: 'medium', time: 90, taste: 'salty', cuisine: 'chinese', spicy: 1, healthy: 2 },
  { id: 'r3', name: '提拉米苏', emoji: '🍰', category: 'dessert', difficulty: 'hard', time: 120, taste: 'sweet', cuisine: 'western', spicy: 0, healthy: 1 },
  { id: 'r4', name: '意式肉酱面', emoji: '🍝', category: 'lunch', difficulty: 'medium', time: 30, taste: 'salty', cuisine: 'western', spicy: 1, healthy: 2 },
  { id: 'r5', name: '寿司卷', emoji: '🍣', category: 'dinner', difficulty: 'hard', time: 60, taste: 'fresh', cuisine: 'japanese', spicy: 0, healthy: 5 },
  { id: 'r6', name: '韩式炸鸡', emoji: '🍗', category: 'snack', difficulty: 'medium', time: 45, taste: 'spicy', cuisine: 'korean', spicy: 4, healthy: 1 },
  { id: 'r7', name: '冬阴功汤', emoji: '🍲', category: 'dinner', difficulty: 'medium', time: 40, taste: 'sour', cuisine: 'thai', spicy: 5, healthy: 3 },
  { id: 'r8', name: '燕麦碗', emoji: '🥣', category: 'breakfast', difficulty: 'easy', time: 10, taste: 'sweet', cuisine: 'western', spicy: 0, healthy: 5 },
  { id: 'r9', name: '麻辣香锅', emoji: '🌶️', category: 'dinner', difficulty: 'medium', time: 30, taste: 'spicy', cuisine: 'chinese', spicy: 5, healthy: 2 },
  { id: 'r10', name: '抹茶拿铁', emoji: '🍵', category: 'drink', difficulty: 'easy', time: 5, taste: 'sweet', cuisine: 'japanese', spicy: 0, healthy: 4 },
  { id: 'r11', name: '法式吐司', emoji: '🍞', category: 'breakfast', difficulty: 'easy', time: 15, taste: 'sweet', cuisine: 'western', spicy: 0, healthy: 3 },
  { id: 'r12', name: '宫保鸡丁', emoji: '🌰', category: 'lunch', difficulty: 'medium', time: 25, taste: 'spicy', cuisine: 'chinese', spicy: 4, healthy: 3 },
  { id: 'r13', name: '水果沙拉', emoji: '🥗', category: 'snack', difficulty: 'easy', time: 10, taste: 'fresh', cuisine: 'western', spicy: 0, healthy: 5 },
  { id: 'r14', name: '泰式炒河粉', emoji: '🍜', category: 'dinner', difficulty: 'medium', time: 25, taste: 'sour', cuisine: 'thai', spicy: 3, healthy: 3 },
  { id: 'r15', name: '草莓蛋糕', emoji: '🍓', category: 'dessert', difficulty: 'medium', time: 60, taste: 'sweet', cuisine: 'western', spicy: 0, healthy: 1 },
  { id: 'r16', name: '石锅拌饭', emoji: '🍚', category: 'lunch', difficulty: 'medium', time: 30, taste: 'spicy', cuisine: 'korean', spicy: 3, healthy: 4 },
  { id: 'r17', name: '芒果糯米饭', emoji: '🥭', category: 'dessert', difficulty: 'easy', time: 30, taste: 'sweet', cuisine: 'thai', spicy: 0, healthy: 2 },
  { id: 'r18', name: '牛油果吐司', emoji: '🥑', category: 'breakfast', difficulty: 'easy', time: 5, taste: 'fresh', cuisine: 'western', spicy: 0, healthy: 5 },
  { id: 'r19', name: '炒河粉', emoji: '🍝', category: 'dinner', difficulty: 'easy', time: 20, taste: 'salty', cuisine: 'chinese', spicy: 1, healthy: 3 },
  { id: 'r20', name: '奶茶', emoji: '🧋', category: 'drink', difficulty: 'easy', time: 10, taste: 'sweet', cuisine: 'chinese', spicy: 0, healthy: 1 },
]

const CAT_META = {
  breakfast: { label: '早餐', color: 'from-amber-500 to-orange-500' },
  lunch: { label: '午餐', color: 'from-rose-500 to-pink-500' },
  dinner: { label: '晚餐', color: 'from-indigo-500 to-purple-500' },
  dessert: { label: '甜品', color: 'from-pink-400 to-rose-400' },
  snack: { label: '小吃', color: 'from-emerald-500 to-teal-500' },
  drink: { label: '饮品', color: 'from-cyan-500 to-blue-500' },
} as const

export function RecipeRandomizer() {
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<Recipe | null>(null)
  const [rotation, setRotation] = useState(0)
  const [filters, setFilters] = useState<{ cat?: string; cuisine?: string; taste?: string; maxTime?: number }>({})
  const [favs, setFavs] = useState<string[]>([])
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)

  const filtered = RECIPES.filter((r) => {
    if (filters.cat && r.category !== filters.cat) return false
    if (filters.cuisine && r.cuisine !== filters.cuisine) return false
    if (filters.taste && r.taste !== filters.taste) return false
    if (filters.maxTime && r.time > filters.maxTime) return false
    return true
  })

  const spin = () => {
    if (filtered.length === 0) { toast('没有符合条件的菜谱', 'error'); return }
    setSpinning(true)
    let newRotation = rotation + 720 + Math.random() * 360
    setRotation(newRotation)
    setTimeout(() => {
      setSpinning(false)
      const pick = filtered[Math.floor(Math.random() * filtered.length)]
      setResult(pick)
    }, 2000)
  }

  const toggleFav = (id: string) => setFavs(favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id])

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 3 道适合深夜做的简单菜 (50-80 字, 含 emoji)', '你是 Versa 美食顾问, 简洁实用, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <ChefHat className="w-5 h-5" />
          <h2 className="text-lg font-bold">今天吃什么</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">转盘随机 · 心情过滤 · AI 推荐</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{RECIPES.length}</p>
            <p className="text-[10px] opacity-80">菜谱</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{filtered.length}</p>
            <p className="text-[10px] opacity-80">过滤后</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{favs.length}</p>
            <p className="text-[10px] opacity-80">收藏</p>
          </div>
        </div>
      </div>

      <div className="relative w-48 h-48 mx-auto my-3">
        <motion.div
          animate={{ rotate: rotation }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className="w-full h-full rounded-full bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 flex items-center justify-center shadow-2xl border-8 border-white dark:border-ink-800"
        >
          <div className="text-center text-white">
            <p className="text-5xl mb-1">{result?.emoji || '🎰'}</p>
            <p className="text-xs font-bold">{result?.name || '点击旋转'}</p>
          </div>
        </motion.div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 text-3xl">▼</div>
      </div>

      <div className="flex justify-center">
        <button onClick={spin} disabled={spinning} className="px-6 h-11 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white text-sm font-bold flex items-center gap-2 shadow-lg disabled:opacity-50">
          {spinning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
          {spinning ? '选择中...' : '随机选择'}
        </button>
      </div>

      {result && !spinning && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn('rounded-2xl p-4 text-white bg-gradient-to-br', CAT_META[result.category].color)}>
          <div className="text-center mb-2">
            <p className="text-6xl mb-2">{result.emoji}</p>
            <h3 className="text-2xl font-bold mb-1">{result.name}</h3>
            <p className="text-sm opacity-90">{CAT_META[result.category].label} · ⏱ {result.time} 分钟 · 难度: {result.difficulty === 'easy' ? '简单' : result.difficulty === 'medium' ? '中等' : '困难'}</p>
          </div>
          <div className="flex items-center justify-center gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={cn('text-base', i < result.spicy ? 'text-red-300' : 'text-white/30')}>🌶</span>
            ))}
            <span className="mx-1.5 text-white/50">·</span>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={cn('text-base', i < result.healthy ? 'text-emerald-300' : 'text-white/30')}>🥗</span>
            ))}
          </div>
          <button onClick={() => toggleFav(result.id)} className="mt-2 w-full h-8 rounded-lg bg-white/20 backdrop-blur text-xs font-bold flex items-center justify-center gap-1">
            <Heart className={cn('w-3 h-3', favs.includes(result.id) && 'fill-white')} />{favs.includes(result.id) ? '已收藏' : '收藏'}
          </button>
        </motion.div>
      )}

      <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 推荐
      </button>

      {aiRec && (
        <div className="bg-orange-50/40 dark:bg-orange-900/20 rounded-xl p-2 border border-orange-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiRec}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <p className="text-xs font-bold flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" />筛选</p>
        <div>
          <p className="text-[10px] text-ink-500 mb-1">类别</p>
          <div className="flex gap-1 flex-wrap">
            {(['all', 'breakfast', 'lunch', 'dinner', 'dessert', 'snack', 'drink'] as const).map((c) => (
              <button key={c} onClick={() => setFilters({ ...filters, cat: c === 'all' ? undefined : c })} className={cn('px-2 h-6 rounded text-[10px] font-semibold', (filters.cat || 'all') === c ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                {c === 'all' ? '全部' : CAT_META[c as keyof typeof CAT_META].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-ink-500 mb-1">菜系</p>
          <div className="flex gap-1 flex-wrap">
            {(['all', 'chinese', 'western', 'japanese', 'korean', 'thai'] as const).map((c) => (
              <button key={c} onClick={() => setFilters({ ...filters, cuisine: c === 'all' ? undefined : c })} className={cn('px-2 h-6 rounded text-[10px] font-semibold', (filters.cuisine || 'all') === c ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                {c === 'all' ? '全部' : c === 'chinese' ? '中式' : c === 'western' ? '西式' : c === 'japanese' ? '日式' : c === 'korean' ? '韩式' : '泰式'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-ink-500 mb-1">时间 ≤ {filters.maxTime || 120} 分钟</p>
          <input type="range" min="10" max="120" step="10" value={filters.maxTime || 120} onChange={(e) => setFilters({ ...filters, maxTime: +e.target.value === 120 ? undefined : +e.target.value })} className="w-full accent-orange-500" />
        </div>
      </div>
    </div>
  )
}
