import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Utensils, Plus, Trash2, Sparkles, Loader2, Sun, Moon, Coffee, ChefHat, RotateCcw } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface FamilyMeal {
  id: string
  date: string
  slot: 'breakfast' | 'lunch' | 'dinner'
  dish: string
  cook: string
  notes: string
}

const STORAGE_KEY = 'versa:fam-meals-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }

function load(): FamilyMeal[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: FamilyMeal[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): FamilyMeal[] {
  const today = todayKey()
  return [
    { id: '1', date: today, slot: 'breakfast', dish: '燕麦粥 + 鸡蛋', cook: '妈妈', notes: '' },
    { id: '2', date: today, slot: 'lunch', dish: '番茄炒蛋 + 米饭', cook: '奶奶', notes: '小宝爱吃' },
    { id: '3', date: today, slot: 'dinner', dish: '红烧排骨 + 蔬菜汤', cook: '爸爸', notes: '周末家宴' },
  ]
}

const SLOT_META = {
  breakfast: { label: '早餐', icon: Sun, color: 'from-amber-500 to-orange-500', emoji: '🌅' },
  lunch: { label: '午餐', icon: Sun, color: 'from-emerald-500 to-teal-500', emoji: '🍱' },
  dinner: { label: '晚餐', icon: Moon, color: 'from-violet-500 to-purple-500', emoji: '🌙' },
} as const

export function FamilyMealPlan() {
  const [meals, setMeals] = useState<FamilyMeal[]>(load())
  const [members, setMembers] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'today' | 'mine'>('today')
  const [currentMember, setCurrentMember] = useState('')
  const [dish, setDish] = useState('')
  const [slot, setSlot] = useState<FamilyMeal['slot']>('breakfast')
  const [cook, setCook] = useState('')
  const [date, setDate] = useState(todayKey())

  useEffect(() => {
    save(meals)
    try {
      const fam = JSON.parse(localStorage.getItem('versa:family-v1') || '[]')
      setMembers(Array.from(new Set(fam.map((m: any) => m.name))))
    } catch {}
  }, [meals])

  const today = todayKey()
  const todayMeals = meals.filter((m) => m.date === today)
  const allCooks = Array.from(new Set(meals.map((m) => m.cook)))
  const myMeals = meals.filter((m) => m.cook === currentMember)
  const cookStats: { [k: string]: number } = {}
  meals.forEach((m) => { cookStats[m.cook] = (cookStats[m.cook] || 0) + 1 })

  const filtered = meals.filter((m) => {
    if (filter === 'today') return m.date === today
    if (filter === 'mine') return m.cook === currentMember
    return true
  })

  const add = () => {
    if (!dish.trim() || !cook) { toast('请填写', 'error'); return }
    const m: FamilyMeal = { id: uid(), date, slot, dish, cook, notes: '' }
    setMeals([m, ...meals])
    setDish('')
    setAdding(false)
    toast('已安排', 'success')
  }

  const remove = (id: string) => setMeals(meals.filter((m) => m.id !== id))

  const generateWeek = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`家庭一周食谱, 每天 3 餐, 格式: "日期|早|中|晚|谁做" 每行 1 天, 不要编号. 家庭成员: ${allCooks.join('、') || '爸/妈/小宝'}`, '你是 Versa 家庭营养师, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Utensils className="w-5 h-5" />
          <h2 className="text-lg font-bold">家庭餐谱</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">三餐分配 · 谁做饭 · AI 排餐</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{todayMeals.length}</p>
            <p className="text-[9px] opacity-80">今日餐</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{allCooks.length}</p>
            <p className="text-[9px] opacity-80">大厨</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{myMeals.length}</p>
            <p className="text-[9px] opacity-80">我做</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{Object.values(cookStats).reduce((s, n) => s + n, 0)}</p>
            <p className="text-[9px] opacity-80">总餐</p>
          </div>
        </div>
      </div>

      {members.length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-xs font-semibold mb-1.5">我是谁?</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setCurrentMember('')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', !currentMember ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
            {members.map((m) => (
              <button key={m} onClick={() => setCurrentMember(m)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', currentMember === m ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{m}</button>
            ))}
          </div>
        </div>
      )}

      {Object.keys(cookStats).length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-xs font-semibold mb-1.5">👨‍🍳 大厨排行</p>
          <div className="space-y-1">
            {Object.entries(cookStats).sort((a, b) => b[1] - a[1]).map(([c, n]) => (
              <div key={c} className="flex items-center gap-1.5 text-[10px]">
                <ChefHat className="w-3 h-3 text-amber-500" />
                <span className="font-semibold w-16 truncate">{c}</span>
                <div className="flex-1 h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${(n / Math.max(...Object.values(cookStats))) * 100}%` }} />
                </div>
                <span className="text-ink-500 w-10 text-right">{n} 餐</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />加餐
        </button>
        <button onClick={generateWeek} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 一周
        </button>
      </div>

      {aiTip && (
        <div className="bg-orange-50/40 dark:bg-orange-900/20 rounded-xl p-2 border border-orange-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['today', 'mine', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'today' ? '今天' : f === 'mine' ? '我的' : '全部'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有餐谱</p>
          </div>
        ) : filtered.map((m) => {
          const SM = SLOT_META[m.slot]
          const Icon = SM.icon
          return (
            <motion.div key={m.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', SM.color)}>
                <span className="text-lg">{SM.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{m.dish}</p>
                <p className="text-[10px] text-ink-500 flex items-center gap-1.5">
                  <span>{SM.label}</span>
                  <span>· 👨‍🍳 {m.cook}</span>
                  <span>· 📅 {m.date}</span>
                </p>
              </div>
              <button onClick={() => remove(m.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">安排一餐</h3>
            <input value={dish} onChange={(e) => setDish(e.target.value)} placeholder="菜名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">餐次</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(SLOT_META) as Array<keyof typeof SLOT_META>).map((k) => {
                  const S = SLOT_META[k]
                  return (
                    <button key={k} onClick={() => setSlot(k)} className={cn('h-12 rounded-lg flex flex-col items-center justify-center', slot === k ? `bg-gradient-to-br ${S.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      <span className="text-lg">{S.emoji}</span>
                      <span className="text-[10px] font-semibold">{S.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={cook} onChange={(e) => setCook(e.target.value)} placeholder="谁做" list="members" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <datalist id="members">{members.map((m) => <option key={m} value={m} />)}</datalist>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
