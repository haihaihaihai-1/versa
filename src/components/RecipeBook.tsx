import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChefHat, Plus, Trash2, Clock, Users, Heart, Star, Sparkles, Loader2, Flame, Soup, Beef, Salad, Cake } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Ingredient { name: string; amount: string }
interface Step { text: string; duration?: number }
interface Recipe {
  id: string
  name: string
  emoji: string
  category: 'main' | 'soup' | 'dessert' | 'snack' | 'drink'
  cover: string
  cookTime: number
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  ingredients: Ingredient[]
  steps: Step[]
  rating: number
  favorites: number
  isFavorite: boolean
  author: string
  tags: string[]
}

const STORAGE_KEY = 'versa:recipes'

function load(): Recipe[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'r1', name: '番茄炒蛋', emoji: '🍅', category: 'main', cover: 'https://picsum.photos/seed/r1/400/300', cookTime: 15, servings: 2, difficulty: 'easy', rating: 4.8, favorites: 2840, isFavorite: true, author: '美食家 Lily', tags: ['家常', '快手'],
      ingredients: [{ name: '番茄', amount: '2 个' }, { name: '鸡蛋', amount: '3 个' }, { name: '葱', amount: '1 根' }, { name: '糖', amount: '1 茶匙' }, { name: '盐', amount: '适量' }],
      steps: [{ text: '番茄切块, 鸡蛋打散' }, { text: '热锅凉油, 炒鸡蛋至凝固盛出' }, { text: '锅中再加少许油, 炒番茄至出汁' }, { text: '加糖, 倒入鸡蛋翻炒, 加盐调味' }] },
    { id: 'r2', name: '红烧肉', emoji: '🥩', category: 'main', cover: 'https://picsum.photos/seed/r2/400/300', cookTime: 90, servings: 4, difficulty: 'medium', rating: 4.9, favorites: 4280, isFavorite: false, author: '大厨王师傅', tags: ['经典', '下饭'],
      ingredients: [{ name: '五花肉', amount: '500g' }, { name: '冰糖', amount: '30g' }, { name: '生抽', amount: '2 勺' }, { name: '老抽', amount: '1 勺' }, { name: '料酒', amount: '2 勺' }, { name: '八角', amount: '2 个' }],
      steps: [{ text: '五花肉切块, 冷水下锅焯水' }, { text: '锅中放冰糖小火炒糖色' }, { text: '放入肉块翻炒上色' }, { text: '加调料和热水, 小火炖 60 分钟' }, { text: '大火收汁即可' }] },
    { id: 'r3', name: '提拉米苏', emoji: '🍰', category: 'dessert', cover: 'https://picsum.photos/seed/r3/400/300', cookTime: 120, servings: 6, difficulty: 'hard', rating: 4.7, favorites: 1820, isFavorite: false, author: '甜品师 Anna', tags: ['意式', '甜品'],
      ingredients: [{ name: '马斯卡彭', amount: '250g' }, { name: '鸡蛋', amount: '3 个' }, { name: '手指饼干', amount: '200g' }, { name: '浓缩咖啡', amount: '200ml' }, { name: '可可粉', amount: '适量' }],
      steps: [{ text: '蛋黄加糖打至浓稠' }, { text: '加入马斯卡彭拌匀' }, { text: '蛋白打至硬性发泡, 混合' }, { text: '手指饼干蘸咖啡铺底' }, { text: '一层奶糊一层饼干, 冷藏 4 小时' }, { text: '撒可可粉即可' }] },
  ]
}
function save(d: Recipe[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CAT_META: Record<Recipe['category'], { label: string; icon: any; color: string }> = {
  main: { label: '主菜', icon: Beef, color: 'bg-rose-500' },
  soup: { label: '汤品', icon: Soup, color: 'bg-amber-500' },
  dessert: { label: '甜品', icon: Cake, color: 'bg-pink-500' },
  snack: { label: '小吃', icon: Salad, color: 'bg-emerald-500' },
  drink: { label: '饮品', icon: Soup, color: 'bg-blue-500' },
}

const DIFFICULTY_META = {
  easy: { label: '简单', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' },
  medium: { label: '中等', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30' },
  hard: { label: '困难', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30' },
} as const

export function RecipeBook() {
  const [recipes, setRecipes] = useState<Recipe[]>(load())
  const [active, setActive] = useState<Recipe | null>(null)
  const [filter, setFilter] = useState<'all' | Recipe['category']>('all')
  const [aiRecipe, setAiRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(false)
  const [cookingStep, setCookingStep] = useState(0)
  const [cookMode, setCookMode] = useState(false)

  useEffect(() => { save(recipes) }, [recipes])

  const filtered = filter === 'all' ? recipes : recipes.filter((r) => r.category === filter)
  const favCount = recipes.filter((r) => r.isFavorite).length
  const avgTime = Math.round(recipes.reduce((s, r) => s + r.cookTime, 0) / recipes.length)

  const toggleFav = (id: string) => {
    setRecipes((rs) => rs.map((r) => r.id === id ? { ...r, isFavorite: !r.isFavorite, favorites: r.isFavorite ? r.favorites - 1 : r.favorites + 1 } : r))
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 1 道适合夏天的快手家常菜 (50-80 字, 含 emoji 菜名)', '你是 Versa 美食顾问, 简洁实用, 中文')
      setAiRecipe({ id: 'ai', name: result.split('\n')[0].slice(0, 20), emoji: '🍳', category: 'main', cover: 'https://picsum.photos/seed/' + Date.now() + '/400/300', cookTime: 20, servings: 2, difficulty: 'easy', rating: 5, favorites: 0, isFavorite: false, author: 'AI 大厨', tags: ['AI 推荐'],
        ingredients: [{ name: '主料', amount: '适量' }], steps: [{ text: result.split('\n').slice(1).join(' ') || '请查看详细步骤' }] })
      toast('AI 已推荐', 'success')
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <ChefHat className="w-5 h-5" />
          <h2 className="text-lg font-bold">食谱书</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">家常菜 · 烘焙甜品 · AI 推荐</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{recipes.length}</p>
            <p className="text-[10px] opacity-80">菜谱</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{favCount}</p>
            <p className="text-[10px] opacity-80">收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{avgTime}m</p>
            <p className="text-[10px] opacity-80">均时</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setFilter('all')} className={cn('flex-1 h-7 rounded-full text-xs font-semibold', filter === 'all' ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={cn('flex-1 h-7 rounded-full text-xs font-semibold', filter === k ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {CAT_META[k].label}
          </button>
        ))}
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 推荐菜谱
      </button>

      <div className="grid grid-cols-2 gap-1.5">
        {filtered.map((r) => (
          <motion.div key={r.id} whileHover={{ y: -2 }} onClick={() => setActive(r)} className="rounded-2xl overflow-hidden bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
            <div className="relative aspect-video">
              <img src={r.cover} alt={r.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <span className="absolute top-1.5 left-1.5 text-2xl">{r.emoji}</span>
              <button onClick={(e) => { e.stopPropagation(); toggleFav(r.id) }} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/40 backdrop-blur flex items-center justify-center">
                <Heart className={cn('w-3.5 h-3.5', r.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-white')} />
              </button>
              <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center gap-1 text-white">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <span className="text-xs font-bold">{r.rating}</span>
                <span className="text-[9px] opacity-80 ml-1">· {r.cookTime}m</span>
              </div>
            </div>
            <div className="p-2">
              <p className="text-sm font-bold line-clamp-1">{r.name}</p>
              <p className="text-[10px] text-ink-500 mt-0.5">{r.author} · {r.servings} 人份</p>
            </div>
          </motion.div>
        ))}

        {aiRecipe && (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={() => setActive(aiRecipe)} className="rounded-2xl overflow-hidden bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 border-2 border-amber-300 cursor-pointer">
            <div className="p-3">
              <Sparkles className="w-4 h-4 text-amber-500 mb-1" />
              <p className="text-sm font-bold">{aiRecipe.name}</p>
              <p className="text-[10px] text-ink-500 mt-0.5">AI 推荐</p>
            </div>
          </motion.div>
        )}
      </div>

      <AnimatePresence>
        {active && (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => { setActive(null); setCookMode(false); setCookingStep(0) }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto">
              <div className="relative h-40">
                <img src={active.cover} alt={active.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <button onClick={() => { setActive(null); setCookMode(false) }} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white">×</button>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <p className="text-2xl mb-1">{active.emoji}</p>
                  <h3 className="text-xl font-bold">{active.name}</h3>
                  <p className="text-[10px] opacity-90">{active.author}</p>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-bold flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{active.cookTime} 分钟</span>
                  <span className="px-2 py-0.5 rounded bg-blue-500 text-white font-bold flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{active.servings} 人份</span>
                  <span className={cn('px-2 py-0.5 rounded font-bold', DIFFICULTY_META[active.difficulty].color)}>{DIFFICULTY_META[active.difficulty].label}</span>
                </div>

                <div>
                  <h4 className="text-sm font-bold mb-1.5">食材</h4>
                  <div className="space-y-1">
                    {active.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded-lg bg-ink-50 dark:bg-ink-800">
                        <span className="font-semibold flex-1">{ing.name}</span>
                        <span className="text-ink-500">{ing.amount}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-sm font-bold">步骤 ({active.steps.length} 步)</h4>
                    <button onClick={() => { setCookMode(!cookMode); setCookingStep(0) }} className={cn('px-2 h-6 rounded text-[10px] font-bold', cookMode ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                      {cookMode ? '退出' : '开始烹饪'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {active.steps.map((s, i) => (
                      <div key={i} className={cn('p-2 rounded-lg text-xs flex gap-2', cookMode && cookingStep === i ? 'bg-amber-500 text-white' : 'bg-ink-50 dark:bg-ink-800')}>
                        <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', cookMode && cookingStep === i ? 'bg-white text-amber-500' : 'bg-amber-500 text-white')}>{i + 1}</span>
                        <span className="flex-1">{s.text}</span>
                        {cookMode && cookingStep === i && (
                          <button onClick={() => setCookingStep(Math.min(active.steps.length - 1, cookingStep + 1))} className="text-[10px] underline">下一步</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
