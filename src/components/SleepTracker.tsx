import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Moon, Plus, Trash2, Sparkles, Loader2, BedDouble, Sunrise, Star, Clock, TrendingUp } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface SleepEntry {
  id: string
  date: string
  bedtime: string
  wakeTime: string
  quality: 1 | 2 | 3 | 4 | 5
  dream: string
  hours: number
}

const STORAGE_KEY = 'versa:sleep-v1'

function load(): SleepEntry[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: SleepEntry[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): SleepEntry[] {
  const out: SleepEntry[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const h = 6.5 + Math.random() * 2.5
    const bedH = 22 + Math.floor(Math.random() * 2)
    const bedM = Math.floor(Math.random() * 60)
    const wakeH = Math.floor(bedH + h) % 24
    const wakeM = Math.floor(Math.random() * 60)
    out.push({
      id: uid(), date: d.toISOString().split('T')[0],
      bedtime: `${String(bedH).padStart(2, '0')}:${String(bedM).padStart(2, '0')}`,
      wakeTime: `${String(wakeH).padStart(2, '0')}:${String(wakeM).padStart(2, '0')}`,
      quality: Math.max(1, Math.min(5, Math.round(2 + Math.random() * 4))) as 1|2|3|4|5,
      dream: ['梦见飞翔', '老朋友聚会', '考试迟到', '在海边漫步', '奇怪迷宫', '吃大餐', '和猫对话'][i] || '',
      hours: Math.round(h * 10) / 10,
    })
  }
  return out
}

function calcHours(bed: string, wake: string): number {
  const [bh, bm] = bed.split(':').map(Number)
  const [wh, wm] = wake.split(':').map(Number)
  let m = (wh * 60 + wm) - (bh * 60 + bm)
  if (m < 0) m += 24 * 60
  return Math.round((m / 60) * 10) / 10
}

export function SleepTracker() {
  const [entries, setEntries] = useState<SleepEntry[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [bedtime, setBedtime] = useState('23:00')
  const [wakeTime, setWakeTime] = useState('07:00')
  const [quality, setQuality] = useState<1|2|3|4|5>(4)
  const [dream, setDream] = useState('')

  useEffect(() => { save(entries) }, [entries])

  const sorted = [...entries].sort((a, b) => (a.date > b.date ? 1 : -1))
  const avgHours = entries.length > 0 ? (entries.reduce((s, e) => s + e.hours, 0) / entries.length).toFixed(1) : '0'
  const avgQuality = entries.length > 0 ? (entries.reduce((s, e) => s + e.quality, 0) / entries.length).toFixed(1) : '0'
  const bestDay = entries.reduce((b, e) => e.hours > b.hours ? e : b, entries[0] || { hours: 0 } as SleepEntry)
  const target = 8

  const add = () => {
    const hours = calcHours(bedtime, wakeTime)
    if (hours <= 0 || hours > 16) { toast('时间无效', 'error'); return }
    const e: SleepEntry = { id: uid(), date, bedtime, wakeTime, quality, dream, hours }
    setEntries([e, ...entries.filter((x) => x.date !== date)])
    setAdding(false)
    setDream('')
    toast('已记录', 'success')
  }

  const remove = (id: string) => setEntries(entries.filter((e) => e.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = `平均 ${avgHours} 小时, 质量 ${avgQuality}/5`
      const result = await aiComplete(`基于最近睡眠数据 (${summary}) 给出 3 条 50 字内改善建议, 中文`, '你是 Versa 健康顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const maxHours = Math.max(...entries.map((e) => e.hours), target)
  const last7 = sorted.slice(-7).reverse()

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-purple-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Moon className="w-5 h-5" />
          <h2 className="text-lg font-bold">睡眠追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">睡眠时长 · 质量评分 · 梦境记录</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgHours}h</p>
            <p className="text-[9px] opacity-80">平均</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgQuality}</p>
            <p className="text-[9px] opacity-80">质量</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{entries.length}</p>
            <p className="text-[9px] opacity-80">记录</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{bestDay ? bestDay.hours : 0}h</p>
            <p className="text-[9px] opacity-80">最佳</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />记录睡眠
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-indigo-50/40 dark:bg-indigo-900/20 rounded-xl p-2 border border-indigo-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-semibold mb-1.5">近 7 天时长</p>
        <div className="flex items-end justify-between h-24 gap-1">
          {last7.map((e) => {
            const pct = (e.hours / maxHours) * 100
            const targetPct = (target / maxHours) * 100
            const day = new Date(e.date).toLocaleDateString('zh-CN', { weekday: 'short' })
            return (
              <div key={e.id} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full h-20 flex flex-col justify-end relative">
                  <div className="absolute left-0 right-0 border-t border-dashed border-rose-400/60" style={{ bottom: `${targetPct}%` }} />
                  <motion.div initial={{ height: 0 }} animate={{ height: `${pct}%` }} className={cn('w-full rounded-t', e.hours >= target ? 'bg-gradient-to-t from-emerald-500 to-teal-500' : 'bg-gradient-to-t from-amber-500 to-orange-500')} />
                </div>
                <p className="text-[9px] text-ink-500">{day}</p>
                <p className="text-[9px] font-bold">{e.hours}</p>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[9px] text-ink-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />≥8h</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />不足</span>
          <span className="flex items-center gap-1">--- 目标 8h</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Moon className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有记录</p>
          </div>
        ) : sorted.map((e) => (
          <motion.div key={e.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{e.hours}h</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold">{e.date}</p>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={cn('w-2.5 h-2.5', s <= e.quality ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                    ))}
                  </div>
                </div>
                <p className="text-[10px] text-ink-500 flex items-center gap-2">
                  <span className="flex items-center gap-0.5"><BedDouble className="w-2.5 h-2.5" />{e.bedtime}</span>
                  <span>→</span>
                  <span className="flex items-center gap-0.5"><Sunrise className="w-2.5 h-2.5" />{e.wakeTime}</span>
                </p>
                {e.dream && <p className="text-[10px] text-violet-500 mt-0.5 italic">💭 {e.dream}</p>}
              </div>
              <button onClick={() => remove(e.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
          </motion.div>
        ))}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">记录睡眠</h3>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">入睡</p>
                <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">起床</p>
                <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-0.5">质量</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} onClick={() => setQuality(s as 1|2|3|4|5)} className="flex-1 h-9 flex items-center justify-center">
                    <Star className={cn('w-5 h-5', s <= quality ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                  </button>
                ))}
              </div>
            </div>
            <input value={dream} onChange={(e) => setDream(e.target.value)} placeholder="梦境 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <p className="text-[10px] text-ink-500 text-center">时长: <span className="font-bold text-indigo-500">{calcHours(bedtime, wakeTime)} 小时</span></p>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
