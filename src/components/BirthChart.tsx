import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Sun, Moon, Stars, Calendar, Compass, Eye, Save, ChevronRight, TrendingUp, Activity, Zap, Heart } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Chart {
  id: string
  name: string
  birthDate: string
  birthTime: string
  birthPlace: string
  sunSign: string
  moonSign: string
  risingSign: string
  mercury: string
  venus: string
  mars: string
  jupiter: string
  saturn: string
  note: string
}

const SIGNS = [
  { id: 'aries', name: '白羊', element: 'fire' },
  { id: 'taurus', name: '金牛', element: 'earth' },
  { id: 'gemini', name: '双子', element: 'air' },
  { id: 'cancer', name: '巨蟹', element: 'water' },
  { id: 'leo', name: '狮子', element: 'fire' },
  { id: 'virgo', name: '处女', element: 'earth' },
  { id: 'libra', name: '天秤', element: 'air' },
  { id: 'scorpio', name: '天蝎', element: 'water' },
  { id: 'sagittarius', name: '射手', element: 'fire' },
  { id: 'capricorn', name: '摩羯', element: 'earth' },
  { id: 'aquarius', name: '水瓶', element: 'air' },
  { id: 'pisces', name: '双鱼', element: 'water' },
]

const PLANETS = [
  { key: 'sun', name: '太阳', icon: '☀️', color: 'from-yellow-500 to-amber-500', desc: '自我、身份、生命力' },
  { key: 'moon', name: '月亮', icon: '🌙', color: 'from-blue-400 to-cyan-400', desc: '情感、潜意识、母性' },
  { key: 'rising', name: '上升', icon: '⬆️', color: 'from-violet-500 to-purple-500', desc: '外在形象、第一印象' },
  { key: 'mercury', name: '水星', icon: '☿️', color: 'from-amber-600 to-yellow-600', desc: '沟通、思维、学习' },
  { key: 'venus', name: '金星', icon: '♀️', color: 'from-pink-500 to-rose-500', desc: '爱情、审美、价值观' },
  { key: 'mars', name: '火星', icon: '♂️', color: 'from-red-500 to-rose-600', desc: '行动、欲望、勇气' },
  { key: 'jupiter', name: '木星', icon: '♃', color: 'from-emerald-500 to-green-500', desc: '扩展、幸运、智慧' },
  { key: 'saturn', name: '土星', icon: '♄', color: 'from-slate-500 to-zinc-600', desc: '责任、纪律、考验' },
]

const ELEMENT_COLORS = {
  fire: 'from-red-500 to-orange-500',
  earth: 'from-emerald-500 to-green-500',
  air: 'from-cyan-500 to-blue-500',
  water: 'from-indigo-500 to-purple-500',
}

const STORAGE_KEY = 'versa:birth-charts-v1'

function load(): Chart[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Chart[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Chart[] {
  return [
    {
      id: '1', name: '我的星盘', birthDate: '1995-06-15', birthTime: '14:30', birthPlace: '上海',
      sunSign: 'gemini', moonSign: 'pisces', risingSign: 'leo',
      mercury: 'gemini', venus: 'cancer', mars: 'leo', jupiter: 'sagittarius', saturn: 'pisces',
      note: '沟通天赋强, 富有创造力',
    },
  ]
}

function dateToSign(date: string): string {
  const d = new Date(date)
  const m = d.getMonth() + 1
  const day = d.getDate()
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return 'aries'
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return 'taurus'
  if ((m === 5 && day >= 21) || (m === 6 && day <= 21)) return 'gemini'
  if ((m === 6 && day >= 22) || (m === 7 && day <= 22)) return 'cancer'
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'leo'
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'virgo'
  if ((m === 9 && day >= 23) || (m === 10 && day <= 23)) return 'libra'
  if ((m === 10 && day >= 24) || (m === 11 && day <= 22)) return 'scorpio'
  if ((m === 11 && day >= 23) || (m === 12 && day <= 21)) return 'sagittarius'
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return 'capricorn'
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return 'aquarius'
  return 'pisces'
}

export function BirthChart() {
  const [charts, setCharts] = useState<Chart[]>(load())
  const [activeId, setActiveId] = useState<string | null>(charts[0]?.id || null)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState<Omit<Chart, 'id'>>({ name: '我的星盘', birthDate: '1995-06-15', birthTime: '12:00', birthPlace: '北京', sunSign: 'gemini', moonSign: '', risingSign: '', mercury: '', venus: '', mars: '', jupiter: '', saturn: '', note: '' })

  useEffect(() => { save(charts) }, [charts])
  const active = charts.find((c) => c.id === activeId) || charts[0]

  const elementCount = useMemo(() => {
    if (!active) return { fire: 0, earth: 0, air: 0, water: 0 }
    const out = { fire: 0, earth: 0, air: 0, water: 0 }
    PLANETS.forEach((p) => {
      const signId = (active as any)[p.key]
      if (!signId) return
      const sign = SIGNS.find((s) => s.id === signId)
      if (sign) out[sign.element as keyof typeof out]++
    })
    return out
  }, [active])

  const addChart = () => {
    if (!draft.birthDate) { toast('请填写出生日期', 'error'); return }
    const sunSign = dateToSign(draft.birthDate)
    const newChart: Chart = { id: uid(), ...draft, sunSign, moonSign: draft.moonSign || sunSign, risingSign: draft.risingSign || sunSign }
    setCharts([...charts, newChart])
    setActiveId(newChart.id)
    setShowForm(false)
    toast('已创建', 'success')
  }
  const del = (id: string) => { setCharts(charts.filter((c) => c.id !== id)); toast('已删除', 'success') }
  const getSignName = (id: string) => SIGNS.find((s) => s.id === id)?.name || '-'
  const getSignElement = (id: string) => SIGNS.find((s) => s.id === id)?.element || 'fire'

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Stars className="w-5 h-5" />
          <h2 className="text-lg font-bold">本命星盘</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 行星 · 12 星座 · 4 元素分布</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{charts.length}</p><p className="text-[9px] opacity-80">星盘</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Object.values(elementCount).reduce((s, n) => s + n, 0)}</p><p className="text-[9px] opacity-80">行运</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Object.values(elementCount).filter((n) => n > 0).length}</p><p className="text-[9px] opacity-80">元素</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Object.values(elementCount).indexOf(Math.max(...Object.values(elementCount))) >= 0 ? SIGNS.filter((s) => s.element === (['fire', 'earth', 'air', 'water'][Object.values(elementCount).indexOf(Math.max(...Object.values(elementCount)))] as any))[0]?.element : '-'}</p><p className="text-[9px] opacity-80">主导</p></div>
        </div>
      </div>

      <button onClick={() => setShowForm(!showForm)} className="w-full h-9 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        + {showForm ? '收起' : '新建星盘'}
      </button>

      {showForm && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="星盘名称" className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <input value={draft.birthPlace} onChange={(e) => setDraft({ ...draft, birthPlace: e.target.value })} placeholder="出生地" className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <input type="date" value={draft.birthDate} onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })} className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <input type="time" value={draft.birthTime} onChange={(e) => setDraft({ ...draft, birthTime: e.target.value })} className="h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
          </div>
          <button onClick={addChart} className="w-full h-9 rounded-lg bg-indigo-500 text-white text-xs font-semibold">创建</button>
        </div>
      )}

      {charts.length > 0 && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {charts.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)} className={cn('px-3 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0', activeId === c.id ? 'bg-indigo-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {active && (
        <>
          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <h3 className="text-sm font-bold text-ink-800 dark:text-ink-200">{active.name}</h3>
                <p className="text-[10px] text-ink-500">{active.birthDate} {active.birthTime} · {active.birthPlace}</p>
              </div>
              <button onClick={() => del(active.id)} className="text-[10px] text-rose-500 hover:underline">删除</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20">
                <p className="text-[9px] text-ink-500">☀️ 太阳</p>
                <p className="text-sm font-bold text-amber-700">{getSignName(active.sunSign)}</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20">
                <p className="text-[9px] text-ink-500">🌙 月亮</p>
                <p className="text-sm font-bold text-blue-700">{getSignName(active.moonSign)}</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20">
                <p className="text-[9px] text-ink-500">⬆️ 上升</p>
                <p className="text-sm font-bold text-violet-700">{getSignName(active.risingSign)}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
            <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5 flex items-center gap-1.5"><Stars className="w-3.5 h-3.5 text-indigo-500" />行星落座</div>
            <div className="space-y-1">
              {PLANETS.map((p) => {
                const signId = (active as any)[p.key]
                if (!signId) return null
                const el = getSignElement(signId)
                return (
                  <div key={p.key} className="flex items-center gap-2 p-1.5 rounded-lg bg-ink-50/40 dark:bg-ink-800/30">
                    <span className="text-lg">{p.icon}</span>
                    <div className="flex-1">
                      <p className="text-[10px] text-ink-500">{p.name} · {p.desc}</p>
                      <p className={cn('text-xs font-bold bg-gradient-to-r bg-clip-text text-transparent', ELEMENT_COLORS[el as keyof typeof ELEMENT_COLORS])}>{getSignName(signId)}座</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
            <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-indigo-500" />元素分布</div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['fire', 'earth', 'air', 'water'] as const).map((el) => {
                const count = elementCount[el]
                const percent = (count / 8) * 100
                return (
                  <div key={el} className="p-1.5 rounded-lg bg-ink-50/40 dark:bg-ink-800/30">
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="font-semibold text-ink-700 dark:text-ink-300">{el === 'fire' ? '🔥 火' : el === 'earth' ? '🌍 土' : el === 'air' ? '💨 风' : '💧 水'}</span>
                      <span className="font-mono text-ink-500">{count}/8</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${percent}%` }} className={cn('h-full bg-gradient-to-r', ELEMENT_COLORS[el])} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {active.note && (
            <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-2.5 border border-indigo-200/40">
              <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-1">📝 解读笔记</div>
              <p className="text-[11px] text-ink-700 dark:text-ink-300 leading-relaxed">{active.note}</p>
            </div>
          )}
        </>
      )}

      {charts.length === 0 && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <Stars className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>创建你的第一张星盘</p>
        </div>
      )}
    </div>
  )
}
