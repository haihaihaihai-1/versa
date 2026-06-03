import { useState } from 'react'
import { motion } from 'framer-motion'
import { Ruler, ArrowRightLeft, Copy, Save, ChevronDown, Calculator, Star, History, TrendingUp } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

const CATEGORIES = {
  length: { label: '长度', icon: '📏', units: { '米 (m)': 1, '千米 (km)': 1000, '厘米 (cm)': 0.01, '毫米 (mm)': 0.001, '微米 (μm)': 1e-6, '纳米 (nm)': 1e-9, '英寸 (in)': 0.0254, '英尺 (ft)': 0.3048, '码 (yd)': 0.9144, '英里 (mi)': 1609.34, '海里 (nmi)': 1852, '光年 (ly)': 9.461e15, '天文单位 (AU)': 1.496e11 } },
  weight: { label: '重量', icon: '⚖️', units: { '千克 (kg)': 1, '克 (g)': 0.001, '毫克 (mg)': 1e-6, '吨 (t)': 1000, '磅 (lb)': 0.4536, '盎司 (oz)': 0.02835, '克拉 (ct)': 0.0002, '市斤': 0.5, '两': 0.05 } },
  temperature: { label: '温度', icon: '🌡️', units: { '摄氏度 (°C)': 1, '华氏度 (°F)': 1, '开尔文 (K)': 1 } },
  area: { label: '面积', icon: '⬜', units: { '平方米 (m²)': 1, '平方千米 (km²)': 1e6, '平方厘米 (cm²)': 1e-4, '公顷 (ha)': 1e4, '亩': 666.67, '英亩': 4046.86, '平方英尺 (ft²)': 0.0929 } },
  volume: { label: '体积', icon: '🧊', units: { '升 (L)': 1, '毫升 (mL)': 0.001, '立方米 (m³)': 1000, '立方厘米 (cm³)': 0.001, '加仑 (gal)': 3.785, '盎司 (oz)': 0.0296, '杯 (cup)': 0.237, '品脱 (pt)': 0.473 } },
  time: { label: '时间', icon: '⏰', units: { '秒 (s)': 1, '毫秒 (ms)': 0.001, '微秒 (μs)': 1e-6, '分钟 (min)': 60, '小时 (h)': 3600, '天 (day)': 86400, '周': 604800, '月 (30天)': 2592000, '年 (365天)': 31536000, '十年': 315360000 } },
  speed: { label: '速度', icon: '🚀', units: { '米/秒 (m/s)': 1, '千米/小时 (km/h)': 0.2778, '英里/小时 (mph)': 0.447, '节 (knot)': 0.5144, '马赫': 343, '光速 (c)': 3e8 } },
  data: { label: '数据', icon: '💾', units: { '字节 (B)': 1, '千字节 (KB)': 1024, '兆字节 (MB)': 1048576, '吉字节 (GB)': 1073741824, '太字节 (TB)': 1099511627776, '拍字节 (PB)': 1125899906842624 } },
} as const

type CatId = keyof typeof CATEGORIES

interface Conv {
  id: string
  cat: CatId
  from: string
  to: string
  value: number
  result: number
  date: string
}

const STORAGE_KEY = 'versa:conversions-v1'

function load(): Conv[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Conv[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

// Special handler for temperature (non-multiplicative)
function convertTemp(value: number, from: string, to: string): number {
  let celsius = value
  if (from.includes('°F')) celsius = (value - 32) * 5 / 9
  else if (from.includes('K')) celsius = value - 273.15
  if (to.includes('°C')) return celsius
  if (to.includes('°F')) return celsius * 9 / 5 + 32
  if (to.includes('K')) return celsius + 273.15
  return celsius
}

export function UnitConverter() {
  const [cat, setCat] = useState<CatId>('length')
  const [from, setFrom] = useState('米 (m)')
  const [to, setTo] = useState('英尺 (ft)')
  const [value, setValue] = useState(1)
  const [history, setHistory] = useState<Conv[]>(load())
  const [favs, setFavs] = useState<string[]>([])

  const switchCat = (c: CatId) => {
    setCat(c)
    const units = Object.keys(CATEGORIES[c].units)
    setFrom(units[0])
    setTo(units[1] || units[0])
  }

  const convert = (v: number, f: string, t: string): number => {
    if (cat === 'temperature') return convertTemp(v, f, t)
    const units = CATEGORIES[cat].units as Record<string, number>
    return (v * (units[f] || 1)) / (units[t] || 1)
  }

  const result = convert(value, from, to)

  const saveIt = () => {
    const c: Conv = { id: uid(), cat, from, to, value, result, date: new Date().toISOString() }
    setHistory([c, ...history].slice(0, 30))
    toast('已记录', 'success')
  }

  const swap = () => { const t = from; setFrom(to); setTo(t) }
  const copy = () => { navigator.clipboard?.writeText(`${value} ${from} = ${result.toFixed(6)} ${to}`); toast('已复制', 'success') }
  const toggleFav = () => {
    const key = `${from}→${to}`
    setFavs(favs.includes(key) ? favs.filter((f) => f !== key) : [...favs, key])
  }
  const isFav = favs.includes(`${from}→${to}`)

  const favConvs = favs.slice(0, 5).map((f) => {
    const [f1, t1] = f.split('→')
    return { from: f1, to: t1, result: convert(1, f1, t1) }
  })

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Ruler className="w-5 h-5" />
          <h2 className="text-lg font-bold">单位换算</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 类别 · 60+ 单位 · 温度特殊处理</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Object.keys(CATEGORIES).length}</p><p className="text-[9px] opacity-80">类别</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Object.values(CATEGORIES).reduce((s, c) => s + Object.keys(c.units).length, 0)}</p><p className="text-[9px] opacity-80">单位</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{favs.length}</p><p className="text-[9px] opacity-80">收藏</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{history.length}</p><p className="text-[9px] opacity-80">历史</p></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {Object.entries(CATEGORIES).map(([k, c]) => (
          <button key={k} onClick={() => switchCat(k as CatId)} className={cn('h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all', cat === k ? `bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-md scale-105` : 'bg-white/60 dark:bg-ink-900/40 text-ink-600')}>
            <span className="text-lg">{c.icon}</span>
            <span className="text-[10px] font-semibold">{c.label}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-2">
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300">{CATEGORIES[cat].icon} {CATEGORIES[cat].label}换算</div>
        <div>
          <div className="text-[10px] font-semibold text-ink-600 mb-1">数值</div>
          <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full h-10 px-3 text-lg font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] font-semibold text-ink-600 mb-1">从</div>
            <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
              {Object.keys(CATEGORIES[cat].units).map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-ink-600 mb-1">到</div>
            <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
              {Object.keys(CATEGORIES[cat].units).map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <button onClick={swap} className="w-full h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs flex items-center justify-center gap-1"><ArrowRightLeft className="w-3 h-3" />交换</button>
        <div className="rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 p-3 text-white text-center">
          <p className="text-[10px] opacity-90 mb-1">{value} {from} =</p>
          <p className="text-2xl font-bold font-mono">{result.toFixed(6).replace(/\.?0+$/, '')}</p>
          <p className="text-[10px] opacity-90 mt-1">{to}</p>
        </div>
        <div className="flex gap-1">
          <button onClick={copy} className="flex-1 h-8 rounded-lg bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1"><Copy className="w-3 h-3" />复制</button>
          <button onClick={saveIt} className="flex-1 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1"><Save className="w-3 h-3" />保存</button>
          <button onClick={toggleFav} className={cn('h-8 w-8 rounded-lg flex items-center justify-center', isFav ? 'bg-amber-400 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}><Star className={cn('w-3.5 h-3.5', isFav && 'fill-current')} /></button>
        </div>
      </div>

      {favConvs.length > 0 && (
        <div className="rounded-2xl bg-amber-50/40 dark:bg-amber-900/10 border border-amber-200/40 p-2.5">
          <div className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1"><Star className="w-3 h-3" />收藏换算 (以 1 为基准)</div>
          <div className="space-y-0.5">
            {favConvs.map((f, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px] text-ink-700 dark:text-ink-300">
                <span>1 {f.from} =</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{f.result.toFixed(4).replace(/\.?0+$/, '')}</span>
                <span>{f.to}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5 flex items-center gap-1"><History className="w-3.5 h-3.5" />历史</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {history.slice(0, 10).map((h) => (
              <div key={h.id} className="p-1 rounded bg-ink-50/60 dark:bg-ink-800/40 text-[10px] flex items-center gap-1">
                <span className="text-lg">{CATEGORIES[h.cat].icon}</span>
                <span className="font-mono text-ink-700 dark:text-ink-300">{h.value} {h.from} = <b className="text-emerald-500">{h.result.toFixed(4).replace(/\.?0+$/, '')}</b> {h.to}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
