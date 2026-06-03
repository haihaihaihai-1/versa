import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Camera, Calendar, MapPin, TrendingUp, Award, Target, Sparkles, Aperture, Shuffle, ChevronDown } from 'lucide-react'
import { cn } from '../lib/utils'

interface Shoot {
  id: string
  date: string
  category: string
  count: number
  camera: string
  location: string
  rating: 1 | 2 | 3 | 4 | 5
}

const STORAGE_KEY = 'versa:photostats-v1'

function load(): Shoot[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Shoot[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Shoot[] {
  const months: Shoot[] = []
  const cats = ['landscape', 'portrait', 'street', 'macro', 'night']
  const cams = ['Sony A7M4', 'Fuji X-T5', 'Canon R6', 'iPhone 15']
  const locs = ['上海', '北京', '杭州', '成都', '广州', '厦门']
  for (let i = 11; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const month = d.toISOString().slice(0, 7)
    const cat = cats[Math.floor(Math.random() * cats.length)]
    const cam = cams[Math.floor(Math.random() * cams.length)]
    const loc = locs[Math.floor(Math.random() * locs.length)]
    months.push({
      id: month + cat,
      date: month,
      category: cat,
      count: Math.floor(Math.random() * 200) + 30,
      camera: cam,
      location: loc,
      rating: (Math.floor(Math.random() * 3) + 3) as 1 | 2 | 3 | 4 | 5,
    })
  }
  return months
}

const CAT_META = {
  landscape: { label: '风光', color: '#10b981', emoji: '🏔️' },
  portrait: { label: '人像', color: '#ec4899', emoji: '👤' },
  street: { label: '街拍', color: '#8b5cf6', emoji: '🌆' },
  macro: { label: '微距', color: '#f59e0b', emoji: '🌸' },
  night: { label: '夜景', color: '#6366f1', emoji: '🌃' },
  food: { label: '美食', color: '#f97316', emoji: '🍜' },
  architecture: { label: '建筑', color: '#06b6d4', emoji: '🏛️' },
  nature: { label: '自然', color: '#22c55e', emoji: '🌿' },
  event: { label: '活动', color: '#eab308', emoji: '🎉' },
}

export function PhotoStats() {
  const [stats, setStats] = useState<Shoot[]>(load())
  const [view, setView] = useState<'month' | 'cat' | 'cam' | 'loc'>('month')
  const [year, setYear] = useState(new Date().getFullYear())

  useEffect(() => { save(stats) }, [stats])

  const totalCount = stats.reduce((s, x) => s + x.count, 0)
  const totalDays = new Set(stats.map((s) => s.date)).size
  const avgPerMonth = Math.round(totalCount / Math.max(1, totalDays))
  const topCategory = Object.entries(stats.reduce((m: { [k: string]: number }, s) => { m[s.category] = (m[s.category] || 0) + s.count; return m }, {})).sort((a, b) => b[1] - a[1])[0]
  const topCam = Object.entries(stats.reduce((m: { [k: string]: number }, s) => { m[s.camera] = (m[s.camera] || 0) + s.count; return m }, {})).sort((a, b) => b[1] - a[1])[0]
  const topLoc = Object.entries(stats.reduce((m: { [k: string]: number }, s) => { m[s.location] = (m[s.location] || 0) + s.count; return m }, {})).sort((a, b) => b[1] - a[1])[0]

  const monthlyData = stats.reduce((m: { [k: string]: number }, s) => { m[s.date] = (m[s.date] || 0) + s.count; return m }, {})
  const monthlyKeys = Object.keys(monthlyData).sort()
  const maxMonth = Math.max(...Object.values(monthlyData), 1)

  const catData = stats.reduce((m: { [k: string]: number }, s) => { m[s.category] = (m[s.category] || 0) + s.count; return m }, {})
  const maxCat = Math.max(...Object.values(catData), 1)

  const camData = stats.reduce((m: { [k: string]: number }, s) => { m[s.camera] = (m[s.camera] || 0) + s.count; return m }, {})
  const camSorted = Object.entries(camData).sort((a, b) => b[1] - a[1])
  const maxCam = camSorted[0]?.[1] || 1

  const locData = stats.reduce((m: { [k: string]: number }, s) => { m[s.location] = (m[s.location] || 0) + s.count; return m }, {})
  const locSorted = Object.entries(locData).sort((a, b) => b[1] - a[1])
  const maxLoc = locSorted[0]?.[1] || 1

  const achievements = [
    { icon: '🏆', title: '拍摄达人', desc: '单月超 200 张', achieved: Object.values(monthlyData).some((v) => v > 200) },
    { icon: '🌍', title: '足迹遍布', desc: '去过 3+ 城市', achieved: locSorted.length >= 3 },
    { icon: '📷', title: '器材党', desc: '用过 3+ 设备', achieved: camSorted.length >= 3 },
    { icon: '🎨', title: '多面手', desc: '拍过 5+ 类型', achieved: Object.keys(catData).length >= 5 },
    { icon: '⭐', title: '五星常客', desc: '10+ 五星作品', achieved: stats.filter((s) => s.rating === 5).length >= 10 },
    { icon: '🔥', title: '坚持输出', desc: '连续 6 月拍摄', achieved: true },
  ]

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5" />
          <h2 className="text-lg font-bold">拍照统计</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">月度趋势 · 分类占比 · 装备分布</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{totalCount}</p><p className="text-[9px] opacity-80">总张数</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{totalDays}</p><p className="text-[9px] opacity-80">月数</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{avgPerMonth}</p><p className="text-[9px] opacity-80">月均</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Object.keys(catData).length}</p><p className="text-[9px] opacity-80">类型</p></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {[
          { id: 'month', label: '月度', icon: Calendar },
          { id: 'cat', label: '分类', icon: Camera },
          { id: 'cam', label: '机型', icon: Aperture },
          { id: 'loc', label: '地点', icon: MapPin },
        ].map((v) => {
          const Icon = v.icon
          return (
            <button key={v.id} onClick={() => setView(v.id as any)} className={cn('h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all', view === v.id ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[10px] font-semibold">{v.label}</span>
            </button>
          )
        })}
      </div>

      {view === 'month' && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" />月度趋势</div>
          <div className="flex items-end gap-1 h-32 mb-1.5">
            {monthlyKeys.map((k) => {
              const v = monthlyData[k]
              const h = (v / maxMonth) * 100
              return (
                <div key={k} className="flex-1 flex flex-col items-center gap-0.5">
                  <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400">{v}</span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} className="w-full rounded-t bg-gradient-to-t from-emerald-500 to-teal-400 min-h-[2px]" />
                </div>
              )
            })}
          </div>
          <div className="flex gap-0.5">
            {monthlyKeys.map((k) => (
              <div key={k} className="flex-1 text-center text-[8px] text-ink-500">{k.slice(5)}</div>
            ))}
          </div>
        </div>
      )}

      {view === 'cat' && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1 flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-emerald-500" />分类占比</div>
          {Object.entries(catData).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
            const m = CAT_META[k as keyof typeof CAT_META]
            const pct = (v / totalCount) * 100
            return (
              <div key={k}>
                <div className="flex items-center justify-between mb-0.5 text-[11px]">
                  <span className="font-semibold text-ink-700 dark:text-ink-300">{m?.emoji} {m?.label || k}</span>
                  <span className="text-ink-500">{v} 张 · {pct.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(v / maxCat) * 100}%` }} className="h-full rounded-full" style={{ background: m?.color || '#999' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'cam' && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1 flex items-center gap-1.5"><Aperture className="w-3.5 h-3.5 text-emerald-500" />机型排行</div>
          {camSorted.map(([k, v], i) => (
            <div key={k} className="flex items-center gap-2">
              <span className={cn('w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0', i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-zinc-300 dark:bg-zinc-600' : i === 2 ? 'bg-amber-700 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600')}>{i + 1}</span>
              <span className="text-[11px] font-semibold flex-1 truncate text-ink-700 dark:text-ink-300">{k}</span>
              <div className="w-20 h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(v / maxCam) * 100}%` }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
              </div>
              <span className="w-12 text-right text-[10px] text-ink-500">{v}</span>
            </div>
          ))}
        </div>
      )}

      {view === 'loc' && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-emerald-500" />足迹地图</div>
          {locSorted.map(([k, v], i) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-base">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '📍'}</span>
              <span className="text-[11px] font-semibold flex-1 truncate text-ink-700 dark:text-ink-300">{k}</span>
              <div className="w-20 h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(v / maxLoc) * 100}%` }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" />
              </div>
              <span className="w-12 text-right text-[10px] text-ink-500">{v}</span>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-3 border border-amber-200/40 dark:border-amber-800/40">
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-2 flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-amber-500" />拍照成就</div>
        <div className="grid grid-cols-3 gap-1.5">
          {achievements.map((a) => (
            <div key={a.title} className={cn('p-2 rounded-xl text-center transition-all', a.achieved ? 'bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40' : 'bg-ink-100/60 dark:bg-ink-800/40 opacity-50')}>
              <div className="text-2xl mb-0.5">{a.achieved ? a.icon : '🔒'}</div>
              <p className="text-[10px] font-bold text-ink-800 dark:text-ink-200">{a.title}</p>
              <p className="text-[8px] text-ink-500">{a.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-900/20 dark:to-fuchsia-900/20 p-3 border border-violet-200/40 dark:border-violet-800/40">
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-violet-500" />年度总结</div>
        <div className="space-y-1 text-[11px] text-ink-700 dark:text-ink-300">
          <p>📅 今年共拍摄 <b className="text-emerald-500">{totalCount}</b> 张作品, 覆盖 <b>{Object.keys(catData).length}</b> 种类型</p>
          <p>🏆 最爱拍: <b>{topCategory && (CAT_META[topCategory[0] as keyof typeof CAT_META]?.label || topCategory[0])}</b> ({topCategory?.[1]} 张)</p>
          <p>📷 出镜最多: <b>{topCam?.[0]}</b></p>
          <p>📍 常去之地: <b>{topLoc?.[0]}</b></p>
        </div>
      </div>
    </div>
  )
}
