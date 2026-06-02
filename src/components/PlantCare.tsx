import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Leaf, Plus, Trash2, Sparkles, Loader2, Droplet, Sun, Scissors, Calendar, AlertCircle, Sprout, TreePine, Flower, Cherry, Flower2 } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Plant {
  id: string
  name: string
  species: string
  type: 'succulent' | 'flower' | 'foliage' | 'tree' | 'herb'
  location: string
  waterInterval: number
  fertilizeInterval: number
  lastWatered: string
  lastFertilized: string
  sunlight: 'low' | 'med' | 'high'
  notes: string
}

const STORAGE_KEY = 'versa:plants-v1'

function load(): Plant[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Plant[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Plant[] {
  const now = Date.now()
  return [
    { id: 'p1', name: '小绿', species: '龟背竹', type: 'foliage', location: '客厅', waterInterval: 7, fertilizeInterval: 30, lastWatered: new Date(now - 5 * 86400000).toISOString().split('T')[0], lastFertilized: new Date(now - 25 * 86400000).toISOString().split('T')[0], sunlight: 'med', notes: '' },
    { id: 'p2', name: '肉肉', species: '多肉拼盘', type: 'succulent', location: '阳台', waterInterval: 14, fertilizeInterval: 60, lastWatered: new Date(now - 10 * 86400000).toISOString().split('T')[0], lastFertilized: new Date(now - 50 * 86400000).toISOString().split('T')[0], sunlight: 'high', notes: '怕涝' },
    { id: 'p3', name: '薄荷', species: '留兰香薄荷', type: 'herb', location: '厨房', waterInterval: 3, fertilizeInterval: 14, lastWatered: new Date(now - 4 * 86400000).toISOString().split('T')[0], lastFertilized: new Date(now - 20 * 86400000).toISOString().split('T')[0], sunlight: 'high', notes: '可泡茶' },
  ]
}

const TYPE_META = {
  succulent: { label: '多肉', icon: Flower2, color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-500' },
  flower: { label: '花卉', icon: Flower, color: 'from-pink-400 to-rose-500', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-500' },
  foliage: { label: '观叶', icon: Leaf, color: 'from-green-400 to-emerald-500', bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-500' },
  tree: { label: '树木', icon: TreePine, color: 'from-emerald-600 to-green-700', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600' },
  herb: { label: '香草', icon: Cherry, color: 'from-lime-400 to-green-500', bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-500' },
} as const

const SUN_META = { low: { label: '阴', icon: '🌑' }, med: { label: '半阴', icon: '⛅' }, high: { label: '阳', icon: '☀️' } } as const

function nextDate(last: string, days: number): number {
  return new Date(last).getTime() + days * 86400000
}

function statusOf(p: Plant, kind: 'water' | 'fertilize'): 'overdue' | 'soon' | 'ok' {
  const last = kind === 'water' ? p.lastWatered : p.lastFertilized
  const interval = kind === 'water' ? p.waterInterval : p.fertilizeInterval
  const due = nextDate(last, interval)
  const diff = due - Date.now()
  if (diff < 0) return 'overdue'
  if (diff < 2 * 86400000) return 'soon'
  return 'ok'
}

export function PlantCare() {
  const [plants, setPlants] = useState<Plant[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('')
  const [type, setType] = useState<Plant['type']>('foliage')
  const [location, setLocation] = useState('客厅')
  const [waterInt, setWaterInt] = useState('7')
  const [fertInt, setFertInt] = useState('30')
  const [sunlight, setSunlight] = useState<Plant['sunlight']>('med')
  const [notes, setNotes] = useState('')

  useEffect(() => { save(plants) }, [plants])

  const thirstyCount = plants.filter((p) => statusOf(p, 'water') !== 'ok').length
  const hungryCount = plants.filter((p) => statusOf(p, 'fertilize') !== 'ok').length

  const add = () => {
    if (!name.trim()) { toast('请输入名字', 'error'); return }
    const today = new Date().toISOString().split('T')[0]
    const p: Plant = { id: uid(), name, species, type, location, waterInterval: +waterInt, fertilizeInterval: +fertInt, lastWatered: today, lastFertilized: today, sunlight, notes }
    setPlants([p, ...plants])
    setName(''); setSpecies(''); setLocation('客厅'); setWaterInt('7'); setFertInt('30'); setNotes('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const water = (id: string) => {
    const today = new Date().toISOString().split('T')[0]
    setPlants(plants.map((p) => p.id === id ? { ...p, lastWatered: today } : p))
    toast('💧 已浇水', 'success')
  }

  const fertilize = (id: string) => {
    const today = new Date().toISOString().split('T')[0]
    setPlants(plants.map((p) => p.id === id ? { ...p, lastFertilized: today } : p))
    toast('🌱 已施肥', 'success')
  }

  const remove = (id: string) => setPlants(plants.filter((p) => p.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = plants.map((p) => `${p.name}(${p.species || p.type}, ${p.location})`).join('; ')
      const result = await aiComplete(`用户植物: ${summary}. 给 3 条 50 字内养护建议, 中文`, '你是 Versa 园艺师, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Leaf className="w-5 h-5" />
          <h2 className="text-lg font-bold">植物养护</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">浇水提醒 · 施肥周期 · 光照需求</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{plants.length}</p>
            <p className="text-[9px] opacity-80">植物</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-cyan-100">{thirstyCount}</p>
            <p className="text-[9px] opacity-80">需浇水</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-amber-100">{hungryCount}</p>
            <p className="text-[9px] opacity-80">需施肥</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{new Set(plants.map((p) => p.location)).size}</p>
            <p className="text-[9px] opacity-80">位置</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加植物
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

      <div className="space-y-1.5">
        {plants.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Leaf className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有植物</p>
          </div>
        ) : plants.map((p) => {
          const Meta = TYPE_META[p.type]
          const Icon = Meta.icon
          const ws = statusOf(p, 'water')
          const fs = statusOf(p, 'fertilize')
          return (
            <motion.div key={p.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center gap-2">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', Meta.bg)}>
                  <Icon className={cn('w-5 h-5', Meta.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{p.name} <span className="text-[10px] text-ink-500 font-normal">{p.species}</span></p>
                  <p className="text-[10px] text-ink-500">{Meta.label} · {p.location} · {SUN_META[p.sunlight].icon}</p>
                </div>
                <button onClick={() => remove(p.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <button onClick={() => water(p.id)} className={cn('h-8 rounded-lg flex items-center justify-center gap-1 text-[10px] font-semibold', ws === 'overdue' ? 'bg-rose-500 text-white' : ws === 'soon' ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  <Droplet className="w-3 h-3" />
                  {ws === 'overdue' ? '立即浇水' : ws === 'soon' ? '今天浇水' : `${p.waterInterval}天周期`}
                </button>
                <button onClick={() => fertilize(p.id)} className={cn('h-8 rounded-lg flex items-center justify-center gap-1 text-[10px] font-semibold', fs === 'overdue' ? 'bg-rose-500 text-white' : fs === 'soon' ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  <Sprout className="w-3 h-3" />
                  {fs === 'overdue' ? '立即施肥' : fs === 'soon' ? '今天施肥' : `${p.fertilizeInterval}天周期`}
                </button>
              </div>
              {p.notes && <p className="text-[10px] text-ink-500 mt-1">📝 {p.notes}</p>}
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">添加植物</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名字" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="品种 (可选)" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">类型</p>
              <div className="grid grid-cols-5 gap-1">
                {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                  const M = TYPE_META[k]
                  return (
                    <button key={k} onClick={() => setType(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', type === k ? `${M.bg} ${M.text}` : 'bg-ink-100 dark:bg-ink-800')}>
                      <M.icon className="w-3.5 h-3.5" />
                      <p className="text-[9px] mt-0.5">{M.label}</p>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="位置" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <select value={sunlight} onChange={(e) => setSunlight(e.target.value as Plant['sunlight'])} className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none">
                <option value="low">🌑 阴</option>
                <option value="med">⛅ 半阴</option>
                <option value="high">☀️ 阳</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">浇水周期 (天)</p>
                <input type="number" value={waterInt} onChange={(e) => setWaterInt(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">施肥周期 (天)</p>
                <input type="number" value={fertInt} onChange={(e) => setFertInt(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
