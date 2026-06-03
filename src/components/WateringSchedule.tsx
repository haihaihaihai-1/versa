import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Droplet, Plus, Trash2, Check, Calendar, Sun, Cloud, CloudRain, Thermometer, Sparkles, Clock, AlertCircle } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface WateringTask {
  id: string
  plantName: string
  emoji: string
  location: 'indoor' | 'outdoor' | 'balcony' | 'garden'
  frequency: 'daily' | 'every2' | 'every3' | 'weekly' | 'biweekly'
  amount: number
  unit: 'ml' | 'L'
  lastWatered: string
  preferredTime: 'morning' | 'noon' | 'evening'
  weatherSensitive: boolean
  note: string
}

const STORAGE_KEY = 'versa:watering-v1'

function load(): WateringTask[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: WateringTask[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): WateringTask[] {
  return [
    { id: '1', plantName: '吊兰', emoji: '🪴', location: 'indoor', frequency: 'every3', amount: 200, unit: 'ml', lastWatered: '2026-06-01', preferredTime: 'morning', weatherSensitive: false, note: '客厅角落' },
    { id: '2', plantName: '月季', emoji: '🌹', location: 'garden', frequency: 'every2', amount: 1, unit: 'L', lastWatered: '2026-06-03', preferredTime: 'morning', weatherSensitive: true, note: '南面花墙' },
    { id: '3', plantName: '薄荷', emoji: '🌿', location: 'balcony', frequency: 'daily', amount: 300, unit: 'ml', lastWatered: '2026-06-04', preferredTime: 'morning', weatherSensitive: true, note: '保持土壤湿润' },
    { id: '4', plantName: '番茄', emoji: '🍅', location: 'garden', frequency: 'daily', amount: 2, unit: 'L', lastWatered: '2026-06-03', preferredTime: 'evening', weatherSensitive: true, note: '结果期需水量大' },
    { id: '5', plantName: '多肉', emoji: '🌵', location: 'indoor', frequency: 'weekly', amount: 50, unit: 'ml', lastWatered: '2026-05-30', preferredTime: 'morning', weatherSensitive: false, note: '少水' },
  ]
}

const LOC_META = {
  indoor: { label: '室内', color: 'from-cyan-500 to-blue-500' },
  outdoor: { label: '户外', color: 'from-emerald-500 to-green-500' },
  balcony: { label: '阳台', color: 'from-amber-500 to-orange-500' },
  garden: { label: '花园', color: 'from-pink-500 to-rose-500' },
}

const FREQ_DAYS = { daily: 1, every2: 2, every3: 3, weekly: 7, biweekly: 14 }
const FREQ_LABELS = { daily: '每天', every2: '每 2 天', every3: '每 3 天', weekly: '每周', biweekly: '每 2 周' }

const TIME_ICONS = { morning: '🌅', noon: '☀️', evening: '🌙' }
const TIME_LABELS = { morning: '早晨', noon: '中午', evening: '傍晚' }

const WEATHER = [
  { id: 'sunny', label: '☀️ 晴', rain: false, mul: 1.0, color: 'from-amber-400 to-yellow-500' },
  { id: 'cloudy', label: '☁️ 多云', rain: false, mul: 0.9, color: 'from-slate-400 to-zinc-500' },
  { id: 'rainy', label: '🌧️ 雨', rain: true, mul: 0.3, color: 'from-blue-400 to-cyan-500' },
  { id: 'hot', label: '🥵 高温', rain: false, mul: 1.4, color: 'from-red-500 to-orange-500' },
] as const

export function WateringSchedule() {
  const [list, setList] = useState<WateringTask[]>(load())
  const [showForm, setShowForm] = useState(false)
  const [weather, setWeather] = useState<typeof WEATHER[number]['id']>('sunny')
  const [draft, setDraft] = useState<Omit<WateringTask, 'id'>>({ plantName: '', emoji: '🌱', location: 'indoor', frequency: 'every3', amount: 200, unit: 'ml', lastWatered: new Date().toISOString().slice(0, 10), preferredTime: 'morning', weatherSensitive: false, note: '' })

  useEffect(() => { save(list) }, [list])

  const today = new Date().toISOString().slice(0, 10)
  const weatherMul = WEATHER.find((w) => w.id === weather)?.mul || 1
  const isRainy = WEATHER.find((w) => w.id === weather)?.rain || false

  const enriched = useMemo(() => {
    return list.map((t) => {
      const last = new Date(t.lastWatered)
      const diff = Math.floor((Date.now() - last.getTime()) / 86400000)
      const due = diff >= FREQ_DAYS[t.frequency]
      const adjustedAmount = t.weatherSensitive ? Math.round(t.amount * weatherMul) : t.amount
      return { ...t, daysSince: diff, due, adjustedAmount }
    })
  }, [list, weatherMul])

  const dueCount = enriched.filter((t) => t.due || (t.weatherSensitive && isRainy && t.location !== 'indoor')).length
  const todayList = enriched.filter((t) => t.due || (t.weatherSensitive && isRainy && t.location !== 'indoor'))
  const totalWater = enriched.reduce((s, t) => s + (t.weatherSensitive ? t.adjustedAmount : t.amount), 0)

  const add = () => {
    if (!draft.plantName) { toast('请填写植物名', 'error'); return }
    setList([{ id: uid(), ...draft }, ...list])
    setShowForm(false)
    setDraft({ ...draft, plantName: '', note: '' })
    toast('已添加', 'success')
  }
  const water = (id: string) => {
    setList(list.map((t) => t.id === id ? { ...t, lastWatered: today } : t))
    toast('💧 浇水完成', 'success')
  }
  const del = (id: string) => { setList(list.filter((t) => t.id !== id)); toast('已删除', 'success') }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Droplet className="w-5 h-5" />
          <h2 className="text-lg font-bold">浇水日程</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">5 频率 · 天气智能 · 4 时段</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{list.length}</p><p className="text-[9px] opacity-80">植物</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{dueCount}</p><p className="text-[9px] opacity-80">待浇</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{totalWater.toFixed(1)}</p><p className="text-[9px] opacity-80">L/总</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{WEATHER.find((w) => w.id === weather)?.label.split(' ')[0]}</p><p className="text-[9px] opacity-80">天气</p></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5 flex items-center gap-1.5"><Thermometer className="w-3.5 h-3.5 text-cyan-500" />今日天气 (智能调整水量)</div>
        <div className="grid grid-cols-4 gap-1">
          {WEATHER.map((w) => (
            <button key={w.id} onClick={() => setWeather(w.id)} className={cn('h-10 rounded-lg text-[10px] font-semibold', weather === w.id ? `bg-gradient-to-br ${w.color} text-white shadow-md` : 'bg-ink-50 dark:bg-ink-800 text-ink-600')}>
              {w.label}
              <p className="text-[8px] opacity-80">×{w.mul}</p>
            </button>
          ))}
        </div>
        {isRainy && <p className="text-[10px] text-cyan-600 dark:text-cyan-300 mt-1 flex items-center gap-0.5"><CloudRain className="w-2.5 h-2.5" />雨天提示: 户外植物可减少浇水</p>}
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        <Plus className="w-3.5 h-3.5" />{showForm ? '收起' : '添加植物'}
      </button>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <div className="grid grid-cols-3 gap-1.5">
            <input value={draft.plantName} onChange={(e) => setDraft({ ...draft, plantName: e.target.value })} placeholder="植物名" className="col-span-2 h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <input value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} placeholder="🌱" className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 text-center" />
          </div>
          <div className="grid grid-cols-4 gap-1">
            {(Object.keys(LOC_META) as (keyof typeof LOC_META)[]).map((l) => (
              <button key={l} onClick={() => setDraft({ ...draft, location: l })} className={cn('h-8 rounded-lg text-[10px] font-semibold', draft.location === l ? `bg-gradient-to-br ${LOC_META[l].color} text-white` : 'bg-ink-50 dark:bg-ink-800 text-ink-600')}>
                {LOC_META[l].label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1">
            {(Object.keys(FREQ_LABELS) as (keyof typeof FREQ_LABELS)[]).map((f) => (
              <button key={f} onClick={() => setDraft({ ...draft, frequency: f })} className={cn('h-8 rounded-lg text-[9px] font-semibold', draft.frequency === f ? 'bg-cyan-500 text-white' : 'bg-ink-50 dark:bg-ink-800 text-ink-600')}>
                {FREQ_LABELS[f]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">水量</div>
              <input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">单位</div>
              <select value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as any })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
                <option value="ml">ml</option><option value="L">L</option>
              </select>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">时段</div>
              <select value={draft.preferredTime} onChange={(e) => setDraft({ ...draft, preferredTime: e.target.value as any })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
                <option value="morning">🌅 早</option><option value="noon">☀️ 中</option><option value="evening">🌙 晚</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={draft.weatherSensitive} onChange={(e) => setDraft({ ...draft, weatherSensitive: e.target.checked })} className="accent-cyan-500" />天气敏感 (自动调整水量)
          </label>
          <input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="备注" className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          <button onClick={add} className="w-full h-9 rounded-lg bg-cyan-500 text-white text-xs font-semibold">保存</button>
        </div>
      )}

      {dueCount > 0 && (
        <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 p-2.5 border border-cyan-200/40 space-y-1.5">
          <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />今日待浇 ({dueCount})</div>
          {todayList.map((t) => (
            <div key={t.id} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/60 dark:bg-ink-900/40">
              <span className="text-xl">{t.emoji}</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-ink-800 dark:text-ink-200">{t.plantName}</p>
                <p className="text-[10px] text-ink-500">{t.adjustedAmount}{t.unit} · {TIME_ICONS[t.preferredTime]} {TIME_LABELS[t.preferredTime]}</p>
              </div>
              <button onClick={() => water(t.id)} className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center"><Droplet className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        {enriched.map((t) => {
          const loc = LOC_META[t.location]
          return (
            <div key={t.id} className={cn('p-2.5 rounded-xl border', t.due ? 'bg-rose-50/40 dark:bg-rose-900/10 border-rose-300/40' : 'bg-white/60 dark:bg-ink-900/40 border-ink-200/40 dark:border-ink-800/40')}>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl">{t.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-ink-800 dark:text-ink-200 truncate">{t.plantName}</p>
                  <p className="text-[10px] text-ink-500">{loc.label} · {FREQ_LABELS[t.frequency]}</p>
                </div>
                <button onClick={() => water(t.id)} className={cn('w-7 h-7 rounded-full flex items-center justify-center', t.due ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}><Droplet className="w-3 h-3" /></button>
                <button onClick={() => del(t.id)} className="w-7 h-7 rounded text-ink-300 hover:text-rose-500 flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
              </div>
              <div className="grid grid-cols-3 gap-1 text-center text-[10px] mt-1">
                <div className="p-1 rounded bg-ink-50/60">
                  <p className="text-[9px] opacity-80">上次</p>
                  <p className="font-mono">{t.daysSince === 0 ? '今天' : `${t.daysSince}天前`}</p>
                </div>
                <div className="p-1 rounded bg-ink-50/60">
                  <p className="text-[9px] opacity-80">建议</p>
                  <p className="font-mono font-bold text-cyan-600">{t.adjustedAmount}{t.unit}</p>
                </div>
                <div className="p-1 rounded bg-ink-50/60">
                  <p className="text-[9px] opacity-80">状态</p>
                  <p className={cn('font-bold', t.due ? 'text-rose-500' : 'text-emerald-500')}>{t.due ? '待浇' : '已浇'}</p>
                </div>
              </div>
              {t.note && <p className="text-[10px] text-ink-500 mt-1">💬 {t.note}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
