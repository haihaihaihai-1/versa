import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Utensils, Plus, Trash2, Sparkles, Loader2, Search, Clock, Users, Star, Heart, ChefHat, Flame, Bookmark, Tag, ChevronRight, Coffee, Beef, Cake, Salad, Pizza, Soup, Apple } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Recipe {
  id: string
  name: string
  category: 'main' | 'side' | 'soup' | 'dessert' | 'drink' | 'breakfast' | 'snack'
  cuisine: 'chinese' | 'western' | 'japanese' | 'italian' | 'french' | 'thai' | 'mexican' | 'other'
  difficulty: 'easy' | 'med' | 'hard'
  prepTime: number
  cookTime: number
  servings: number
  ingredients: { name: string; amount: string }[]
  steps: string[]
  tags: string[]
  rating: 1 | 2 | 3 | 4 | 5
  favorite: boolean
  tried: number
  image: string
  calories: number
}

const STORAGE_KEY = 'versa:recipes-v1'

function load(): Recipe[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Recipe[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Recipe[] {
  return [
    { id: 'r1', name: '麻婆豆腐', category: 'main', cuisine: 'chinese', difficulty: 'med', prepTime: 10, cookTime: 15, servings: 2, ingredients: [
      { name: '嫩豆腐', amount: '400g' },
      { name: '牛肉末', amount: '100g' },
      { name: '豆瓣酱', amount: '2 勺' },
      { name: '花椒粉', amount: '1 勺' },
      { name: '葱姜蒜', amount: '适量' },
    ], steps: ['豆腐切丁焯水', '热油下牛肉末煸炒', '加豆瓣酱炒出红油', '下豆腐烧 5 分钟', '勾芡撒花椒粉葱花'], tags: ['川菜', '下饭', '辣'], rating: 5, favorite: true, tried: 3, image: 'https://picsum.photos/seed/mapo/600/400', calories: 320 },
    { id: 'r2', name: '番茄意面', category: 'main', cuisine: 'italian', difficulty: 'easy', prepTime: 5, cookTime: 20, servings: 2, ingredients: [
      { name: '意面', amount: '200g' },
      { name: '番茄', amount: '3 个' },
      { name: '大蒜', amount: '3 瓣' },
      { name: '橄榄油', amount: '适量' },
      { name: '罗勒', amount: '少许' },
    ], steps: ['煮意面 8 分钟', '番茄切块', '蒜末爆香加番茄炒烂', '拌入意面', '撒罗勒'], tags: ['意餐', '简单', '素'], rating: 4, favorite: true, tried: 5, image: 'https://picsum.photos/seed/pasta/600/400', calories: 420 },
    { id: 'r3', name: '日式味增汤', category: 'soup', cuisine: 'japanese', difficulty: 'easy', prepTime: 5, cookTime: 10, servings: 2, ingredients: [
      { name: '味增', amount: '2 大勺' },
      { name: '豆腐', amount: '100g' },
      { name: '海带', amount: '10g' },
      { name: '葱花', amount: '少许' },
    ], steps: ['海带泡水', '加水煮沸', '下豆腐', '关火加味增化开', '撒葱花'], tags: ['日料', '汤', '快手'], rating: 4, favorite: false, tried: 2, image: 'https://picsum.photos/seed/miso/600/400', calories: 120 },
    { id: 'r4', name: '巧克力蛋糕', category: 'dessert', cuisine: 'western', difficulty: 'hard', prepTime: 20, cookTime: 40, servings: 8, ingredients: [
      { name: '黑巧克力', amount: '200g' },
      { name: '黄油', amount: '100g' },
      { name: '鸡蛋', amount: '3 个' },
      { name: '低筋面粉', amount: '80g' },
      { name: '糖', amount: '80g' },
    ], steps: ['巧克力黄油隔水融化', '打蛋加糖', '混合面粉', '倒入模具', '180°C 烤 40 分钟'], tags: ['甜品', '烘焙', '庆祝'], rating: 5, favorite: true, tried: 1, image: 'https://picsum.photos/seed/cake/600/400', calories: 380 },
  ]
}

const CAT_META = {
  main: { label: '主菜', icon: Beef, color: 'from-rose-500 to-pink-500' },
  side: { label: '配菜', icon: Salad, color: 'from-emerald-500 to-teal-500' },
  soup: { label: '汤', icon: Soup, color: 'from-orange-500 to-amber-500' },
  dessert: { label: '甜品', icon: Cake, color: 'from-pink-500 to-fuchsia-500' },
  drink: { label: '饮品', icon: Coffee, color: 'from-amber-600 to-orange-600' },
  breakfast: { label: '早餐', icon: Apple, color: 'from-yellow-500 to-orange-500' },
  snack: { label: '零食', icon: Pizza, color: 'from-violet-500 to-purple-500' },
} as const

const CUISINE_META = {
  chinese: '中餐', western: '西餐', japanese: '日料', italian: '意餐',
  french: '法餐', thai: '泰餐', mexican: '墨西哥', other: '其他',
} as const

const DIFFICULTY_META = {
  easy: { label: '简单', color: 'bg-emerald-500' },
  med: { label: '中等', color: 'bg-amber-500' },
  hard: { label: '困难', color: 'bg-rose-500' },
} as const

export function RecipeLibrary() {
  const [recipes, setRecipes] = useState<Recipe[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<'all' | Recipe['category']>('all')
  const [cuisineFilter, setCuisineFilter] = useState<'all' | Recipe['cuisine']>('all')
  const [favFilter, setFavFilter] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(recipes[0]?.id || null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState<Recipe['category']>('main')
  const [cuisine, setCuisine] = useState<Recipe['cuisine']>('chinese')
  const [difficulty, setDifficulty] = useState<Recipe['difficulty']>('med')
  const [prepTime, setPrepTime] = useState('10')
  const [cookTime, setCookTime] = useState('15')
  const [servings, setServings] = useState('2')
  const [ingredientsStr, setIngredientsStr] = useState('')
  const [stepsStr, setStepsStr] = useState('')
  const [calories, setCalories] = useState('300')

  useEffect(() => { save(recipes) }, [recipes])

  const total = recipes.length
  const favCount = recipes.filter((r) => r.favorite).length
  const avgRating = total > 0 ? (recipes.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : '0'
  const totalTries = recipes.reduce((s, r) => s + r.tried, 0)
  const active = recipes.find((r) => r.id === activeId)

  const filtered = recipes.filter((r) => {
    if (search && !r.name.includes(search) && !r.tags.some((t) => t.includes(search))) return false
    if (catFilter !== 'all' && r.category !== catFilter) return false
    if (cuisineFilter !== 'all' && r.cuisine !== cuisineFilter) return false
    if (favFilter && !r.favorite) return false
    return true
  })

  const toggleFav = (id: string) => setRecipes(recipes.map((r) => r.id === id ? { ...r, favorite: !r.favorite } : r))
  const remove = (id: string) => {
    setRecipes(recipes.filter((r) => r.id !== id))
    if (activeId === id) setActiveId(recipes[0]?.id || null)
  }
  const addTry = (id: string) => setRecipes(recipes.map((r) => r.id === id ? { ...r, tried: r.tried + 1 } : r))

  const add = () => {
    if (!name.trim()) { toast('请输入菜名', 'error'); return }
    const ingredients = ingredientsStr.split('\n').map((l) => {
      const parts = l.split(/[:：]/)
      return parts.length === 2 ? { name: parts[0].trim(), amount: parts[1].trim() } : { name: l.trim(), amount: '' }
    }).filter((i) => i.name)
    const steps = stepsStr.split('\n').map((s) => s.trim()).filter(Boolean)
    const r: Recipe = { id: uid(), name, category, cuisine, difficulty, prepTime: +prepTime, cookTime: +cookTime, servings: +servings, ingredients, steps, tags: [], rating: 3, favorite: false, tried: 0, image: `https://picsum.photos/seed/${Date.now()}/600/400`, calories: +calories }
    setRecipes([r, ...recipes])
    setActiveId(r.id)
    setName(''); setIngredientsStr(''); setStepsStr('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`推荐 3 道简单美味的 ${CUISINE_META[cuisineFilter !== 'all' ? cuisineFilter : 'chinese']}, 格式: "菜名 | 简介 (15字)" 每行 1 个, 不要编号`, '你是 Versa 美食家, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-red-500 to-rose-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <ChefHat className="w-5 h-5" />
          <h2 className="text-lg font-bold">食谱库</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 大菜系 · 7 类菜品 · AI 推荐</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">菜谱</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{favCount}</p>
            <p className="text-[9px] opacity-80">收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgRating}</p>
            <p className="text-[9px] opacity-80">均评分</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalTries}</p>
            <p className="text-[9px] opacity-80">做过</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新菜谱
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-orange-50/40 dark:bg-orange-900/20 rounded-xl p-2 border border-orange-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索菜名/标签..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setCatFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', catFilter === 'all' ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
          const M = CAT_META[k]
          return (
            <button key={k} onClick={() => setCatFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', catFilter === k ? `bg-gradient-to-r ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
              {M.label}
            </button>
          )
        })}
        <button onClick={() => setFavFilter(!favFilter)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', favFilter ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>❤️ 收藏</button>
      </div>

      {active ? (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
          <div className="relative h-40">
            <img src={active.image} alt={active.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-white">
              <div className="flex items-center gap-1.5">
                <p className="text-lg font-bold">{active.name}</p>
                <span className={cn('text-[9px] px-1.5 py-0.5 rounded text-white font-semibold', DIFFICULTY_META[active.difficulty].color)}>
                  {DIFFICULTY_META[active.difficulty].label}
                </span>
              </div>
              <p className="text-[10px] opacity-90 mt-0.5">{CUISINE_META[active.cuisine]} · ⭐{active.rating} · 做过 {active.tried} 次 · {active.calories} 卡</p>
            </div>
            <button onClick={() => toggleFav(active.id)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">
              <Heart className={cn('w-4 h-4', active.favorite && 'fill-rose-500 text-rose-500')} />
            </button>
          </div>
          <div className="p-2">
            <div className="flex items-center gap-1.5 text-[10px] text-ink-500 mb-2">
              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />备 {active.prepTime}m</span>
              <span className="flex items-center gap-0.5"><Flame className="w-3 h-3" />炒 {active.cookTime}m</span>
              <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{active.servings} 人份</span>
              <button onClick={() => addTry(active.id)} className="ml-auto px-2 py-0.5 rounded bg-orange-500 text-white text-[10px] font-semibold">+1 做过</button>
              <button onClick={() => remove(active.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
            <div className="mb-2">
              <p className="text-xs font-bold mb-1">🥕 食材</p>
              <div className="space-y-0.5">
                {active.ingredients.map((i, idx) => (
                  <p key={idx} className="text-[10px] flex items-center justify-between bg-ink-50 dark:bg-ink-800/50 rounded px-1.5 py-0.5">
                    <span>{i.name}</span>
                    <span className="text-ink-500">{i.amount}</span>
                  </p>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold mb-1">👨‍🍳 步骤</p>
              <ol className="space-y-1">
                {active.steps.map((s, idx) => (
                  <li key={idx} className="text-[10px] flex gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{idx + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <p className="text-xs font-semibold">其他菜谱 ({filtered.length})</p>
        {filtered.filter((r) => r.id !== activeId).map((r) => {
          const CM = CAT_META[r.category]
          const Icon = CM.icon
          return (
            <motion.div key={r.id} whileHover={{ y: -1 }} onClick={() => setActiveId(r.id)} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
              <div className="flex items-center gap-2">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br', CM.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold truncate">{r.name}</p>
                    {r.favorite && <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />}
                  </div>
                  <p className="text-[10px] text-ink-500">{CUISINE_META[r.cuisine]} · {r.prepTime + r.cookTime}m · ⭐{r.rating} · {r.calories}卡</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">新菜谱</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="菜名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none">
                {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => <option key={k} value={k}>{CAT_META[k].label}</option>)}
              </select>
              <select value={cuisine} onChange={(e) => setCuisine(e.target.value as any)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none">
                {(Object.keys(CUISINE_META) as Array<keyof typeof CUISINE_META>).map((k) => <option key={k} value={k}>{CUISINE_META[k]}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">准备 m</p>
                <input type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">烹饪 m</p>
                <input type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">份数</p>
                <input type="number" value={servings} onChange={(e) => setServings(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">卡路里</p>
                <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-0.5">食材 (每行: 名称: 用量)</p>
              <textarea value={ingredientsStr} onChange={(e) => setIngredientsStr(e.target.value)} placeholder={'嫩豆腐: 400g\n牛肉末: 100g'} className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none min-h-[60px]" />
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-0.5">步骤 (每行一步)</p>
              <textarea value={stepsStr} onChange={(e) => setStepsStr(e.target.value)} placeholder={'豆腐切丁\n热油下肉末'} className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none min-h-[80px]" />
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-semibold">创建</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
