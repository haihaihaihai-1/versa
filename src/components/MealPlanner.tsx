import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Plus, Trash2, Sparkles, Loader2, ChefHat, ChevronLeft, ChevronRight, Coffee, Utensils, Cookie, Moon, Sun, Snowflake } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface MealSlot {
  breakfast: string
  lunch: string
  dinner: string
  snack: string
}

interface MealDay {
  date: string
  meals: MealSlot
}

const STORAGE_KEY = 'versa:mealplan-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }

function load(): MealDay[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: MealDay[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): MealDay[] {
  const out: MealDay[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() + i)
    out.push({
      date: d.toISOString().split('T')[0],
      meals: { breakfast: '', lunch: '', dinner: '', snack: '' },
    })
  }
  out[0].meals.breakfast = '燕麦牛奶'
  out[0].meals.lunch = '麻婆豆腐'
  out[0].meals.dinner = '番茄意面'
  return out
}

const SLOT_META = {
  breakfast: { label: '早餐', icon: Sun, color: 'from-amber-500 to-orange-500' },
  lunch: { label: '午餐', icon: Utensils, color: 'from-emerald-500 to-teal-500' },
  dinner: { label: '晚餐', icon: Moon, color: 'from-violet-500 to-purple-500' },
  snack: { label: '加餐', icon: Cookie, color: 'from-rose-500 to-pink-500' },
} as const

export function MealPlanner() {
  const [days, setDays] = useState<MealDay[]>(load())
  const [editing, setEditing] = useState<{ date: string; slot: keyof MealSlot } | null>(null)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [editText, setEditText] = useState('')
  const [weekStart, setWeekStart] = useState(0)

  useEffect(() => { save(days) }, [days])

  const plannedMeals = days.reduce((s, d) => s + (d.meals.breakfast ? 1 : 0) + (d.meals.lunch ? 1 : 0) + (d.meals.dinner ? 1 : 0) + (d.meals.snack ? 1 : 0), 0)
  const plannedDays = days.filter((d) => d.meals.breakfast && d.meals.lunch && d.meals.dinner).length
  const variety = new Set(days.flatMap((d) => [d.meals.breakfast, d.meals.lunch, d.meals.dinner, d.meals.snack]).filter(Boolean)).size

  const setMeal = (date: string, slot: keyof MealSlot, value: string) => {
    setDays(days.map((d) => d.date === date ? { ...d, meals: { ...d.meals, [slot]: value } } : d))
  }

  const saveEdit = () => {
    if (!editing) return
    setMeal(editing.date, editing.slot, editText)
    setEditing(null); setEditText('')
  }

  const startEdit = (date: string, slot: keyof MealSlot) => {
    setEditing({ date, slot })
    const day = days.find((d) => d.date === date)
    setEditText(day?.meals[slot] || '')
  }

  const clearWeek = () => {
    if (!confirm('清空本周所有餐食?')) return
    setDays(days.map((d) => ({ ...d, meals: { breakfast: '', lunch: '', dinner: '', snack: '' } })))
    toast('已清空', 'success')
  }

  const generatePlan = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`为用户生成 7 天三餐计划, 格式: "日期|早餐|午餐|晚餐|加餐" 每行 1 天, 不要编号. 食材简单易做, 营养均衡`, '你是 Versa 营养师, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const visibleDays = days.slice(weekStart, weekStart + 7)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-5 h-5" />
          <h2 className="text-lg font-bold">周餐计划</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">一周食谱 · 营养均衡 · AI 生成</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{plannedMeals}</p>
            <p className="text-[9px] opacity-80">餐数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{plannedDays}/7</p>
            <p className="text-[9px] opacity-80">完整天</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{variety}</p>
            <p className="text-[9px] opacity-80">菜数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">21</p>
            <p className="text-[9px] opacity-80">目标餐</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={generatePlan} disabled={loading} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 一周
        </button>
        <button onClick={clearWeek} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">清空</button>
      </div>

      {aiTip && (
        <div className="bg-emerald-50/40 dark:bg-emerald-900/20 rounded-xl p-2 border border-emerald-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="space-y-1.5">
        {visibleDays.map((d) => {
          const date = new Date(d.date)
          const dayName = date.toLocaleDateString('zh-CN', { weekday: 'short' })
          const dayNum = date.getDate()
          const isToday = d.date === todayKey()
          return (
            <div key={d.date} className={cn('rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border', isToday ? 'border-emerald-400' : 'border-ink-200/60 dark:border-ink-800/60')}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={cn('w-9 h-9 rounded-lg flex flex-col items-center justify-center text-white flex-shrink-0', isToday ? 'bg-gradient-to-br from-emerald-500 to-teal-500' : 'bg-ink-100 dark:bg-ink-800 text-ink-700 dark:text-ink-300')}>
                  <p className="text-[9px] font-semibold">{dayName}</p>
                  <p className="text-sm font-bold leading-none">{dayNum}</p>
                </div>
                <p className="text-[10px] text-ink-500 flex-1">{isToday ? '今天' : date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(Object.keys(SLOT_META) as Array<keyof typeof SLOT_META>).map((slot) => {
                  const M = SLOT_META[slot]
                  const Icon = M.icon
                  const value = d.meals[slot]
                  return (
                    <button key={slot} onClick={() => startEdit(d.date, slot)} className={cn('rounded-lg p-1.5 text-left', value ? 'bg-ink-50 dark:bg-ink-800/50' : 'bg-ink-50/50 dark:bg-ink-900/20 border border-dashed border-ink-300')}>
                      <div className="flex items-center gap-1 mb-0.5">
                        <div className={cn('w-4 h-4 rounded flex items-center justify-center text-white bg-gradient-to-br', M.color)}>
                          <Icon className="w-2.5 h-2.5" />
                        </div>
                        <span className="text-[9px] font-semibold">{M.label}</span>
                      </div>
                      <p className={cn('text-[10px] truncate', value ? 'font-semibold' : 'text-ink-400 italic')}>{value || '点击编辑'}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setEditing(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">{SLOT_META[editing.slot].label} - {editing.date}</h3>
            <input value={editText} onChange={(e) => setEditText(e.target.value)} placeholder="例如: 麻婆豆腐 + 米饭" className="w-full px-3 h-10 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" autoFocus />
            <button onClick={saveEdit} className="w-full h-10 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
