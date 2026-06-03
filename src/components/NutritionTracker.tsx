import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Apple, Plus, Trash2, Sparkles, Loader2, Check, Flame, Beef, Wheat, Droplet, Target, TrendingUp, Calendar, Activity } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface FoodEntry {
  id: string
  name: string
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories: number
  protein: number
  carbs: number
  fat: number
  date: string
  time: string
  portion: number
}

const STORAGE_KEY = 'versa:nutrition-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }

function load(): FoodEntry[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: FoodEntry[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): FoodEntry[] {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  return [
    { id: '1', name: '燕麦牛奶', meal: 'breakfast', calories: 280, protein: 12, carbs: 45, fat: 6, date: today, time: '08:00', portion: 1 },
    { id: '2', name: '鸡蛋', meal: 'breakfast', calories: 80, protein: 7, carbs: 1, fat: 5, date: today, time: '08:00', portion: 1 },
    { id: '3', name: '麻婆豆腐', meal: 'lunch', calories: 320, protein: 18, carbs: 12, fat: 22, date: today, time: '12:30', portion: 1 },
    { id: '4', name: '米饭', meal: 'lunch', calories: 200, protein: 4, carbs: 45, fat: 1, date: today, time: '12:30', portion: 1 },
  ]
}

const MEAL_META = {
  breakfast: { label: '早餐', icon: '🌅', color: 'from-amber-500 to-orange-500' },
  lunch: { label: '午餐', icon: '🍱', color: 'from-emerald-500 to-teal-500' },
  dinner: { label: '晚餐', icon: '🌙', color: 'from-violet-500 to-purple-500' },
  snack: { label: '加餐', icon: '🍪', color: 'from-rose-500 to-pink-500' },
} as const

const GOAL_DAILY = 2000

export function NutritionTracker() {
  const [entries, setEntries] = useState<FoodEntry[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [meal, setMeal] = useState<FoodEntry['meal']>('breakfast')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [portion, setPortion] = useState('1')

  useEffect(() => { save(entries) }, [entries])

  const today = todayKey()
  const todayEntries = entries.filter((e) => e.date === today)
  const totalCal = todayEntries.reduce((s, e) => s + e.calories * e.portion, 0)
  const totalProtein = todayEntries.reduce((s, e) => s + e.protein * e.portion, 0)
  const totalCarbs = todayEntries.reduce((s, e) => s + e.carbs * e.portion, 0)
  const totalFat = todayEntries.reduce((s, e) => s + e.fat * e.portion, 0)
  const remaining = Math.max(0, GOAL_DAILY - totalCal)
  const progress = (totalCal / GOAL_DAILY) * 100

  // Last 7 days
  const last7 = (() => {
    const arr: { date: string; cal: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      const cal = entries.filter((e) => e.date === key).reduce((s, e) => s + e.calories * e.portion, 0)
      arr.push({ date: key, cal })
    }
    return arr
  })()
  const maxCal = Math.max(...last7.map((d) => d.cal), GOAL_DAILY)

  const add = () => {
    if (!name.trim() || !calories) { toast('请填写', 'error'); return }
    const e: FoodEntry = { id: uid(), name, meal, calories: +calories, protein: +protein || 0, carbs: +carbs || 0, fat: +fat || 0, date: today, time: new Date().toTimeString().slice(0, 5), portion: +portion || 1 }
    setEntries([e, ...entries])
    setName(''); setCalories(''); setProtein(''); setCarbs(''); setFat(''); setPortion('1')
    setAdding(false)
    toast('已记录', 'success')
  }

  const remove = (id: string) => setEntries(entries.filter((e) => e.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = `今日 ${Math.round(totalCal)} 卡 (目标 ${GOAL_DAILY}), 蛋白 ${Math.round(totalProtein)}g, 碳水 ${Math.round(totalCarbs)}g, 脂肪 ${Math.round(totalFat)}g`
      const result = await aiComplete(`用户饮食: ${summary}. 给出 1 段 60 字内营养建议, 中文`, '你是 Versa 营养师, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  // Macro distribution pie data
  const proteinCal = totalProtein * 4
  const carbCal = totalCarbs * 4
  const fatCal = totalFat * 9
  const totalMacroCal = proteinCal + carbCal + fatCal || 1

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Apple className="w-5 h-5" />
          <h2 className="text-lg font-bold">营养追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">每日卡路里 · 三大营养素 · AI 建议</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{Math.round(totalCal)}</p>
            <p className="text-[9px] opacity-80">已摄入</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{remaining}</p>
            <p className="text-[9px] opacity-80">剩余</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{Math.round(progress)}%</p>
            <p className="text-[9px] opacity-80">目标</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{todayEntries.length}</p>
            <p className="text-[9px] opacity-80">餐数</p>
          </div>
        </div>
        <div className="mt-2 h-2 bg-white/15 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, progress)}%` }} className={cn('h-full', progress > 100 ? 'bg-rose-500' : 'bg-white')} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 text-center">
          <Beef className="w-4 h-4 text-rose-500 mx-auto" />
          <p className="text-base font-bold mt-0.5">{Math.round(totalProtein)}g</p>
          <p className="text-[9px] text-ink-500">蛋白</p>
          <p className="text-[8px] text-ink-400">{Math.round((proteinCal / totalMacroCal) * 100)}%</p>
        </div>
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 text-center">
          <Wheat className="w-4 h-4 text-amber-500 mx-auto" />
          <p className="text-base font-bold mt-0.5">{Math.round(totalCarbs)}g</p>
          <p className="text-[9px] text-ink-500">碳水</p>
          <p className="text-[8px] text-ink-400">{Math.round((carbCal / totalMacroCal) * 100)}%</p>
        </div>
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 text-center">
          <Droplet className="w-4 h-4 text-blue-500 mx-auto" />
          <p className="text-base font-bold mt-0.5">{Math.round(totalFat)}g</p>
          <p className="text-[9px] text-ink-500">脂肪</p>
          <p className="text-[8px] text-ink-400">{Math.round((fatCal / totalMacroCal) * 100)}%</p>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />记一餐
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-emerald-50/40 dark:bg-emerald-900/20 rounded-xl p-2 border border-emerald-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-semibold mb-1.5">近 7 天卡路里</p>
        <div className="flex items-end justify-between h-16 gap-1">
          {last7.map((d) => {
            const pct = (d.cal / maxCal) * 100
            const day = new Date(d.date).toLocaleDateString('zh-CN', { weekday: 'short' })
            return (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full h-12 flex flex-col justify-end">
                  <div className="w-full bg-gradient-to-t from-emerald-500 to-teal-500 rounded-t relative" style={{ height: `${pct}%` }}>
                    {d.cal > GOAL_DAILY && <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />}
                  </div>
                </div>
                <p className="text-[9px] text-ink-500">{day}</p>
                <p className="text-[9px] font-bold">{d.cal > 0 ? d.cal : '-'}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        {(Object.keys(MEAL_META) as Array<keyof typeof MEAL_META>).map((m) => {
          const list = todayEntries.filter((e) => e.meal === m)
          if (list.length === 0) return null
          const M = MEAL_META[m]
          const cal = list.reduce((s, e) => s + e.calories * e.portion, 0)
          return (
            <div key={m} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-lg">{M.icon}</span>
                <p className="text-xs font-bold">{M.label}</p>
                <span className="text-[10px] text-ink-500 ml-auto">{cal} 卡</span>
              </div>
              <div className="space-y-0.5">
                {list.map((e) => (
                  <div key={e.id} className="flex items-center gap-1.5 text-[10px] py-0.5">
                    <span className="font-semibold flex-1 truncate">{e.name}{e.portion > 1 && <span className="text-ink-500"> ×{e.portion}</span>}</span>
                    <span className="text-emerald-500 font-bold">{e.calories * e.portion}卡</span>
                    <span className="text-ink-500">P{e.protein * e.portion}/C{e.carbs * e.portion}/F{e.fat * e.portion}</span>
                    <button onClick={() => remove(e.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">记录食物</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="食物名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(MEAL_META) as Array<keyof typeof MEAL_META>).map((k) => {
                const M = MEAL_META[k]
                return (
                  <button key={k} onClick={() => setMeal(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold', meal === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    <span className="text-base">{M.icon}</span>
                    <span>{M.label}</span>
                  </button>
                )
              })}
            </div>
            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="卡路里" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">蛋白 g</p>
                <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">碳水 g</p>
                <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">脂肪 g</p>
                <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-0.5">份数</p>
              <input type="number" value={portion} onChange={(e) => setPortion(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">记录</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
