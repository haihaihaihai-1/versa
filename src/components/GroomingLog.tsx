import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Scissors, Plus, Trash2, Sparkles, Loader2, Bath, Brush, Scissors as ScissorsIcon, Sparkles as SparklesIcon, Heart, Calendar, Droplet, Check } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface GroomLog {
  id: string
  petId: string
  type: 'bath' | 'brush' | 'nail' | 'dental' | 'haircut' | 'ear' | 'other'
  date: string
  duration: number
  groomer: string
  products: string
  notes: string
  nextDate: string
  rating: 1 | 2 | 3 | 4 | 5
}

const STORAGE_KEY = 'versa:pet-groom-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }

function load(): GroomLog[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: GroomLog[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): GroomLog[] {
  const today = todayKey()
  return [
    { id: '1', petId: '1', type: 'bath', date: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0], duration: 30, groomer: '我', products: '宠物专用沐浴露', notes: '很乖', nextDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0], rating: 4 },
    { id: '2', petId: '1', type: 'nail', date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], duration: 10, groomer: '宠物店', products: '指甲钳', notes: '剪了 4 个', nextDate: new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0], rating: 5 },
    { id: '3', petId: '2', type: 'brush', date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0], duration: 15, groomer: '我', products: '针梳', notes: '掉毛很多', nextDate: new Date(Date.now() + 1 * 86400000).toISOString().split('T')[0], rating: 3 },
  ]
}

const TYPE_META = {
  bath: { label: '洗澡', icon: Bath, color: 'from-cyan-500 to-blue-500' },
  brush: { label: '梳毛', icon: Brush, color: 'from-orange-500 to-amber-500' },
  nail: { label: '剪指甲', icon: ScissorsIcon, color: 'from-rose-500 to-pink-500' },
  dental: { label: '口腔', icon: SparklesIcon, color: 'from-violet-500 to-purple-500' },
  haircut: { label: '理发', icon: Scissors, color: 'from-pink-500 to-fuchsia-500' },
  ear: { label: '耳朵', icon: '👂', color: 'from-amber-500 to-orange-500' },
  other: { label: '其他', icon: Heart, color: 'from-ink-500 to-ink-600' },
} as const

function daysFromNow(date: string) { return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000) }

export function GroomingLog() {
  const [logs, setLogs] = useState<GroomLog[]>(load())
  const [pets, setPets] = useState<{ id: string; name: string; emoji: string }[]>([])
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentPet, setCurrentPet] = useState('')
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'recent'>('all')
  const [type, setType] = useState<GroomLog['type']>('bath')
  const [date, setDate] = useState(todayKey())
  const [duration, setDuration] = useState('30')
  const [groomer, setGroomer] = useState('我')
  const [products, setProducts] = useState('')
  const [notes, setNotes] = useState('')
  const [nextDate, setNextDate] = useState('')
  const [rating, setRating] = useState<GroomLog['rating']>(4)

  useEffect(() => {
    save(logs)
    try {
      const p = JSON.parse(localStorage.getItem('versa:pets-v1') || '[]')
      setPets(p.map((x: any) => ({ id: x.id, name: x.name, emoji: x.emoji })))
      if (p.length > 0 && !currentPet) setCurrentPet(p[0].id)
    } catch {}
  }, [logs])

  const petLogs = currentPet ? logs.filter((l) => l.petId === currentPet) : logs
  const totalLogs = petLogs.length
  const totalDuration = petLogs.reduce((s, l) => s + l.duration, 0)
  const avgRating = petLogs.length > 0 ? (petLogs.reduce((s, l) => s + l.rating, 0) / petLogs.length).toFixed(1) : '0'
  const upcoming = petLogs.filter((l) => daysFromNow(l.nextDate) > 0 && daysFromNow(l.nextDate) <= 14).length

  const filtered = (() => {
    if (filter === 'upcoming') return petLogs.filter((l) => daysFromNow(l.nextDate) > 0 && daysFromNow(l.nextDate) <= 30).sort((a, b) => daysFromNow(a.nextDate) - daysFromNow(b.nextDate))
    if (filter === 'recent') return [...petLogs].sort((a, b) => b.date.localeCompare(a.date))
    return petLogs
  })()

  const add = () => {
    if (!currentPet) { toast('请选择宠物', 'error'); return }
    const l: GroomLog = { id: uid(), petId: currentPet, type, date, duration: +duration, groomer, products, notes, nextDate, rating }
    setLogs([l, ...logs])
    setDuration('30'); setProducts(''); setNotes(''); setNextDate('')
    setAdding(false)
    toast('已记录', 'success')
  }

  const remove = (id: string) => setLogs(logs.filter((l) => l.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = petLogs.slice(0, 3).map((l) => `${l.type}(${l.date})`).join('、')
      const result = await aiComplete(`宠物美容: ${summary}. 给出 1 段 50 字内护理建议, 中文`, '你是 Versa 宠物美容师, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Scissors className="w-5 h-5" />
          <h2 className="text-lg font-bold">美容日志</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">7 项护理 · 周期提醒 · 用品记录</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalLogs}</p>
            <p className="text-[9px] opacity-80">总次</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalDuration}m</p>
            <p className="text-[9px] opacity-80">总时长</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgRating}</p>
            <p className="text-[9px] opacity-80">均评分</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-amber-100">{upcoming}</p>
            <p className="text-[9px] opacity-80">将到期</p>
          </div>
        </div>
      </div>

      {pets.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {pets.map((p) => (
            <button key={p.id} onClick={() => setCurrentPet(p.id)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0 flex items-center gap-1', currentPet === p.id ? 'bg-pink-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              <span>{p.emoji}</span>{p.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />记一次
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-pink-50/40 dark:bg-pink-900/20 rounded-xl p-2 border border-pink-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['recent', 'upcoming', 'all'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-pink-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'recent' ? '🕒 最近' : f === 'upcoming' ? '📅 下次' : '全部'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Scissors className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有记录</p>
          </div>
        ) : filtered.map((l) => {
          const TM = TYPE_META[l.type]
          const Icon = typeof TM.icon === 'string' ? null : TM.icon
          const days = daysFromNow(l.nextDate)
          return (
            <motion.div key={l.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 flex items-center gap-2">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', TM.color)}>
                {Icon && typeof Icon === 'function' ? <Icon className="w-4 h-4" /> : <span className="text-base">{String(TM.icon)}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{TM.label} · {l.groomer}</p>
                <p className="text-[10px] text-ink-500 flex items-center gap-1.5">
                  <span>{l.date}</span>
                  <span>· {l.duration}m</span>
                  {l.products && <span>· {l.products}</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold">⭐{l.rating}</p>
                <p className={cn('text-[9px]', days > 0 && days <= 7 ? 'text-amber-500' : 'text-ink-400')}>
                  {days > 0 ? `${days}天后` : days === 0 ? '今天' : '已过期'}
                </p>
              </div>
              <button onClick={() => remove(l.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">记一次美容</h3>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">类型</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                  const T = TYPE_META[k]
                  return (
                    <button key={k} onClick={() => setType(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', type === k ? `bg-gradient-to-br ${T.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      {typeof T.icon === 'string' ? <span className="text-base">{T.icon}</span> : <T.icon className="w-3.5 h-3.5" />}
                      <span className="text-[9px]">{T.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="时长分" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={groomer} onChange={(e) => setGroomer(e.target.value)} placeholder="美容师/我" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={products} onChange={(e) => setProducts(e.target.value)} placeholder="用品" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} placeholder="下次" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-[10px] text-ink-500 mb-1">评分</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setRating(s as any)} className={cn('flex-1 h-9 rounded-lg text-base', rating >= s ? 'bg-amber-500' : 'bg-ink-100 dark:bg-ink-800')}>⭐</button>
                ))}
              </div>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[50px]" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-semibold">记录</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
