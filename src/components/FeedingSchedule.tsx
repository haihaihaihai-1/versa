import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Utensils, Plus, Trash2, Sparkles, Loader2, Clock, Check, Coffee, Sun, Moon, Apple, Drumstick, Award, ChefHat, TrendingUp } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface FeedingLog {
  id: string
  petId: string
  date: string
  time: string
  meal: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  food: string
  amount: number
  unit: 'g' | 'cup' | 'ml'
  appetite: 1 | 2 | 3 | 4 | 5
  eaten: boolean
  notes: string
}

interface FoodStock {
  id: string
  name: string
  brand: string
  amount: number
  unit: string
  daysLeft: number
  petType: 'dog' | 'cat' | 'all'
}

const STORAGE_KEY = 'versa:pet-feed-v1'
const STOCK_KEY = 'versa:pet-stock-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }

function load(): FeedingLog[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: FeedingLog[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }
function loadStock(): FoodStock[] { try { const s = localStorage.getItem(STOCK_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function saveStock(d: FoodStock[]) { try { localStorage.setItem(STOCK_KEY, JSON.stringify(d)) } catch {} }

function seed(): FeedingLog[] {
  const today = todayKey()
  return [
    { id: '1', petId: '1', date: today, time: '08:00', meal: 'breakfast', food: '皇家狗粮', amount: 200, unit: 'g', appetite: 5, eaten: true, notes: '吃得很快' },
    { id: '2', petId: '1', date: today, time: '18:00', meal: 'dinner', food: '皇家狗粮', amount: 200, unit: 'g', appetite: 4, eaten: true, notes: '' },
    { id: '3', petId: '2', date: today, time: '07:30', meal: 'breakfast', food: '渴望猫粮', amount: 50, unit: 'g', appetite: 4, eaten: true, notes: '' },
  ]
}

const MEAL_META = {
  breakfast: { label: '早餐', icon: Sun, color: 'from-amber-500 to-orange-500', emoji: '🌅' },
  lunch: { label: '午餐', icon: Sun, color: 'from-emerald-500 to-teal-500', emoji: '☀️' },
  dinner: { label: '晚餐', icon: Moon, color: 'from-violet-500 to-purple-500', emoji: '🌙' },
  snack: { label: '零食', icon: Apple, color: 'from-pink-500 to-rose-500', emoji: '🍪' },
} as const

export function FeedingSchedule() {
  const [logs, setLogs] = useState<FeedingLog[]>(load())
  const [stock, setStock] = useState<FoodStock[]>(loadStock())
  const [adding, setAdding] = useState(false)
  const [addingStock, setAddingStock] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'log' | 'stock'>('log')
  const [currentPet, setCurrentPet] = useState('')
  const [pets, setPets] = useState<{ id: string; name: string; emoji: string }[]>([])
  const [meal, setMeal] = useState<FeedingLog['meal']>('breakfast')
  const [food, setFood] = useState('')
  const [amount, setAmount] = useState('100')
  const [unit, setUnit] = useState<FeedingLog['unit']>('g')
  const [appetite, setAppetite] = useState<FeedingLog['appetite']>(4)
  const [time, setTime] = useState(() => {
    const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [stockName, setStockName] = useState('')
  const [stockBrand, setStockBrand] = useState('')
  const [stockAmount, setStockAmount] = useState('1000')
  const [stockUnit, setStockUnit] = useState('g')
  const [stockDays, setStockDays] = useState('30')

  useEffect(() => {
    save(logs)
    saveStock(stock)
    try {
      const p = JSON.parse(localStorage.getItem('versa:pets-v1') || '[]')
      setPets(p.map((x: any) => ({ id: x.id, name: x.name, emoji: x.emoji })))
      if (p.length > 0 && !currentPet) setCurrentPet(p[0].id)
    } catch {}
  }, [logs, stock])

  const today = todayKey()
  const todayLogs = logs.filter((l) => l.date === today && (currentPet ? l.petId === currentPet : true))
  const eatenToday = todayLogs.filter((l) => l.eaten)
  const totalToday = todayLogs.filter((l) => l.eaten).reduce((s, l) => s + l.amount, 0)
  const avgAppetite = eatenToday.length > 0 ? (eatenToday.reduce((s, l) => s + l.appetite, 0) / eatenToday.length).toFixed(1) : '0'
  const lowStock = stock.filter((s) => s.daysLeft < 7).length

  const add = () => {
    if (!food.trim() || !currentPet) { toast('请填写', 'error'); return }
    const l: FeedingLog = { id: uid(), petId: currentPet, date: today, time, meal, food, amount: +amount, unit, appetite, eaten: true, notes: '' }
    setLogs([l, ...logs])
    setFood(''); setAmount('100')
    setAdding(false)
    toast('已记录', 'success')
  }

  const addStockItem = () => {
    if (!stockName.trim()) { toast('请填写', 'error'); return }
    const s: FoodStock = { id: uid(), name: stockName, brand: stockBrand, amount: +stockAmount, unit: stockUnit, daysLeft: +stockDays, petType: 'all' }
    setStock([s, ...stock])
    setStockName(''); setStockBrand(''); setStockAmount('1000'); setStockUnit('g'); setStockDays('30')
    setAddingStock(false)
    toast('已添加', 'success')
  }

  const remove = (id: string) => setLogs(logs.filter((l) => l.id !== id))
  const removeStock = (id: string) => setStock(stock.filter((s) => s.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = `今日 ${totalToday}g (平均胃口 ${avgAppetite}/5)`
      const result = await aiComplete(`宠物饮食: ${summary}. 给出 1 段 50 字内喂养建议, 中文`, '你是 Versa 宠物营养师, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Utensils className="w-5 h-5" />
          <h2 className="text-lg font-bold">喂食计划</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">4 餐次 · 库存追踪 · 胃口记录</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{eatenToday.length}</p>
            <p className="text-[9px] opacity-80">今日餐</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalToday}g</p>
            <p className="text-[9px] opacity-80">总喂量</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgAppetite}</p>
            <p className="text-[9px] opacity-80">胃口</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{lowStock}</p>
            <p className="text-[9px] opacity-80">将尽</p>
          </div>
        </div>
      </div>

      {pets.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button onClick={() => setCurrentPet('')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', !currentPet ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
          {pets.map((p) => (
            <button key={p.id} onClick={() => setCurrentPet(p.id)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0 flex items-center gap-1', currentPet === p.id ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              <span>{p.emoji}</span>{p.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <button onClick={() => setTab('log')} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', tab === 'log' ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>🍽 喂食记录</button>
        <button onClick={() => setTab('stock')} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', tab === 'stock' ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>📦 库存</button>
      </div>

      {tab === 'log' && (
        <>
          <div className="flex gap-1.5">
            <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1">
              <Plus className="w-3.5 h-3.5" />记一餐
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

          <div className="space-y-1.5">
            {todayLogs.length === 0 ? (
              <div className="text-center py-8 text-ink-500">
                <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">今天还没记录</p>
              </div>
            ) : todayLogs.map((l) => {
              const MM = MEAL_META[l.meal]
              const pet = pets.find((p) => p.id === l.petId)
              return (
                <motion.div key={l.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', MM.color)}>
                    <span className="text-lg">{MM.emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold truncate">{l.food}</p>
                      {pet && <span className="text-xs">{pet.emoji}</span>}
                    </div>
                    <p className="text-[10px] text-ink-500">{MM.label} · {l.time} · {l.amount}{l.unit} · 胃口 {'⭐'.repeat(l.appetite)}</p>
                  </div>
                  <button onClick={() => remove(l.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                </motion.div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'stock' && (
        <>
          <button onClick={() => setAddingStock(true)} className="w-full h-9 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1">
            <Plus className="w-3.5 h-3.5" />加库存
          </button>
          <div className="space-y-1.5">
            {stock.length === 0 ? (
              <div className="text-center py-8 text-ink-500">
                <Utensils className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">还没有库存</p>
              </div>
            ) : stock.map((s) => (
              <motion.div key={s.id} whileHover={{ y: -1 }} className={cn('rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border flex items-center gap-2', s.daysLeft < 7 ? 'border-rose-400' : 'border-ink-200/60 dark:border-ink-800/60')}>
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white flex-shrink-0">
                  <Drumstick className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{s.name}</p>
                  <p className="text-[10px] text-ink-500">{s.brand} · {s.amount}{s.unit}</p>
                </div>
                <div className="text-right">
                  <p className={cn('text-[10px] font-bold', s.daysLeft < 7 ? 'text-rose-500' : 'text-ink-500')}>{s.daysLeft}天</p>
                  <p className="text-[9px] text-ink-400">剩余</p>
                </div>
                <button onClick={() => removeStock(s.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </motion.div>
            ))}
          </div>
        </>
      )}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">记录一餐</h3>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">餐次</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(MEAL_META) as Array<keyof typeof MEAL_META>).map((k) => {
                  const M = MEAL_META[k]
                  return (
                    <button key={k} onClick={() => setMeal(k)} className={cn('h-12 rounded-lg flex flex-col items-center justify-center', meal === k ? `bg-gradient-to-br ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      <span className="text-lg">{M.emoji}</span>
                      <span className="text-[9px]">{M.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <input value={food} onChange={(e) => setFood(e.target.value)} placeholder="食物名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-3 gap-1.5">
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="量" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <select value={unit} onChange={(e) => setUnit(e.target.value as any)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none">
                <option value="g">g</option>
                <option value="cup">杯</option>
                <option value="ml">ml</option>
              </select>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">胃口</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setAppetite(s as any)} className={cn('flex-1 h-9 rounded-lg text-base', appetite >= s ? 'bg-amber-500' : 'bg-ink-100 dark:bg-ink-800')}>⭐</button>
                ))}
              </div>
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold">记录</button>
          </motion.div>
        </div>
      )}

      {addingStock && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAddingStock(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">加库存</h3>
            <input value={stockName} onChange={(e) => setStockName(e.target.value)} placeholder="食物名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={stockBrand} onChange={(e) => setStockBrand(e.target.value)} placeholder="品牌 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-3 gap-1.5">
              <input type="number" value={stockAmount} onChange={(e) => setStockAmount(e.target.value)} placeholder="量" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={stockUnit} onChange={(e) => setStockUnit(e.target.value)} placeholder="单位" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="number" value={stockDays} onChange={(e) => setStockDays(e.target.value)} placeholder="可吃几天" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <button onClick={addStockItem} className="w-full h-9 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
