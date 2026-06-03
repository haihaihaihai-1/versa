import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Star, Sun, Heart, Briefcase, DollarSign, Activity, Calendar, RefreshCw, TrendingUp, ChevronRight, BookOpen } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

interface ZodiacSign {
  id: string
  name: string
  symbol: string
  element: 'fire' | 'earth' | 'air' | 'water'
  quality: 'cardinal' | 'fixed' | 'mutable'
  ruler: string
  dateRange: string
  start: [number, number]
  end: [number, number]
  traits: string
  color: string
  gradient: string
  icon: string
}

const SIGNS: ZodiacSign[] = [
  { id: 'aries', name: '白羊座', symbol: '♈', element: 'fire', quality: 'cardinal', ruler: '火星', dateRange: '3.21-4.19', start: [3, 21], end: [4, 19], traits: '热情、勇敢、直率', color: 'from-rose-500 to-red-500', gradient: 'bg-gradient-to-br from-rose-500 to-red-500', icon: '🔥' },
  { id: 'taurus', name: '金牛座', symbol: '♉', element: 'earth', quality: 'fixed', ruler: '金星', dateRange: '4.20-5.20', start: [4, 20], end: [5, 20], traits: '稳重、务实、可靠', color: 'from-emerald-500 to-green-500', gradient: 'bg-gradient-to-br from-emerald-500 to-green-500', icon: '🌿' },
  { id: 'gemini', name: '双子座', symbol: '♊', element: 'air', quality: 'mutable', ruler: '水星', dateRange: '5.21-6.21', start: [5, 21], end: [6, 21], traits: '机敏、好奇、善变', color: 'from-amber-500 to-yellow-500', gradient: 'bg-gradient-to-br from-amber-500 to-yellow-500', icon: '🌬️' },
  { id: 'cancer', name: '巨蟹座', symbol: '♋', element: 'water', quality: 'cardinal', ruler: '月亮', dateRange: '6.22-7.22', start: [6, 22], end: [7, 22], traits: '温柔、念家、敏感', color: 'from-cyan-500 to-blue-500', gradient: 'bg-gradient-to-br from-cyan-500 to-blue-500', icon: '🌊' },
  { id: 'leo', name: '狮子座', symbol: '♌', element: 'fire', quality: 'fixed', ruler: '太阳', dateRange: '7.23-8.22', start: [7, 23], end: [8, 22], traits: '自信、慷慨、领导', color: 'from-orange-500 to-amber-500', gradient: 'bg-gradient-to-br from-orange-500 to-amber-500', icon: '☀️' },
  { id: 'virgo', name: '处女座', symbol: '♍', element: 'earth', quality: 'mutable', ruler: '水星', dateRange: '8.23-9.22', start: [8, 23], end: [9, 22], traits: '细致、完美、理性', color: 'from-teal-500 to-cyan-500', gradient: 'bg-gradient-to-br from-teal-500 to-cyan-500', icon: '🌾' },
  { id: 'libra', name: '天秤座', symbol: '♎', element: 'air', quality: 'cardinal', ruler: '金星', dateRange: '9.23-10.23', start: [9, 23], end: [10, 23], traits: '优雅、公正、犹豫', color: 'from-pink-500 to-rose-500', gradient: 'bg-gradient-to-br from-pink-500 to-rose-500', icon: '⚖️' },
  { id: 'scorpio', name: '天蝎座', symbol: '♏', element: 'water', quality: 'fixed', ruler: '冥王星', dateRange: '10.24-11.22', start: [10, 24], end: [11, 22], traits: '深沉、神秘、专注', color: 'from-violet-500 to-purple-500', gradient: 'bg-gradient-to-br from-violet-500 to-purple-500', icon: '🦂' },
  { id: 'sagittarius', name: '射手座', symbol: '♐', element: 'fire', quality: 'mutable', ruler: '木星', dateRange: '11.23-12.21', start: [11, 23], end: [12, 21], traits: '自由、乐观、爱冒险', color: 'from-indigo-500 to-blue-500', gradient: 'bg-gradient-to-br from-indigo-500 to-blue-500', icon: '🏹' },
  { id: 'capricorn', name: '摩羯座', symbol: '♑', element: 'earth', quality: 'cardinal', ruler: '土星', dateRange: '12.22-1.19', start: [12, 22], end: [1, 19], traits: '坚韧、抱负、保守', color: 'from-slate-500 to-zinc-600', gradient: 'bg-gradient-to-br from-slate-500 to-zinc-600', icon: '🐐' },
  { id: 'aquarius', name: '水瓶座', symbol: '♒', element: 'air', quality: 'fixed', ruler: '天王星', dateRange: '1.20-2.18', start: [1, 20], end: [2, 18], traits: '独立、创新、人道', color: 'from-blue-500 to-cyan-500', gradient: 'bg-gradient-to-br from-blue-500 to-cyan-500', icon: '⚡' },
  { id: 'pisces', name: '双鱼座', symbol: '♓', element: 'water', quality: 'mutable', ruler: '海王星', dateRange: '2.19-3.20', start: [2, 19], end: [3, 20], traits: '浪漫、直觉、梦幻', color: 'from-fuchsia-500 to-purple-500', gradient: 'bg-gradient-to-br from-fuchsia-500 to-purple-500', icon: '🐟' },
]

const RATINGS = ['爱情', '事业', '财运', '健康']
const RATINGS_ICONS = [Heart, Briefcase, DollarSign, Activity]

const STORAGE_KEY = 'versa:zodiac-fav-v1'

function loadFav(): string { try { return localStorage.getItem(STORAGE_KEY) || 'leo' } catch {} return 'leo' }
function saveFav(d: string) { try { localStorage.setItem(STORAGE_KEY, d) } catch {} }

function seeded(seed: number) {
  return (min: number, max: number) => {
    const x = Math.sin(seed++) * 10000
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
  }
}

function generateHoroscope(signId: string, day: 'today' | 'tomorrow' | 'week' | 'month', idx: number) {
  const sign = SIGNS.find((s) => s.id === signId)
  if (!sign) return { overall: 0, love: 0, career: 0, money: 0, health: 0, advice: '' }
  const seed = (signId.charCodeAt(0) + signId.charCodeAt(1) + day.charCodeAt(0) + idx * 7) * 1000
  const r = seeded(seed)
  const base = sign.element === 'fire' ? 4 : sign.element === 'earth' ? 3 : sign.element === 'air' ? 4 : 3
  const overall = Math.min(5, Math.max(1, base + r(0, 2)))
  const love = Math.min(5, Math.max(1, base + r(-1, 2)))
  const career = Math.min(5, Math.max(1, base + r(-1, 2)))
  const money = Math.min(5, Math.max(1, base + r(-1, 2)))
  const health = Math.min(5, Math.max(1, base + r(0, 1)))
  const advices = [
    `${sign.name}今天适合尝试新事物, 大胆一点会有惊喜`,
    `保持耐心, ${sign.name}的运气会在午后好转`,
    `与朋友多交流, ${sign.name}的人际运上升`,
    `注意休息, ${sign.name}今天需要放松心情`,
    `${sign.name}的财运不错, 适合做财务规划`,
    `信任直觉, ${sign.name}今天的判断力很强`,
  ]
  return { overall, love, career, money, health, advice: advices[r(0, advices.length - 1)] }
}

export function ZodiacScope() {
  const [favSign, setFavSign] = useState<string>(loadFav())
  const [period, setPeriod] = useState<'today' | 'tomorrow' | 'week' | 'month'>('today')
  const [filterEl, setFilterEl] = useState<'all' | 'fire' | 'earth' | 'air' | 'water'>('all')

  useEffect(() => { saveFav(favSign) }, [favSign])

  const today = new Date()
  const month = today.getMonth() + 1
  const day = today.getDate()
  const autoSign = SIGNS.find((s) => (s.start[0] === s.end[0] ? (month === s.start[0] && day >= s.start[1] && day <= s.end[1]) : (month === s.start[0] && day >= s.start[1]) || (month === s.end[0] && day <= s.end[1])))
  const active = favSign === 'auto' ? autoSign : SIGNS.find((s) => s.id === favSign)
  const filtered = SIGNS.filter((s) => filterEl === 'all' || s.element === filterEl)

  const periods = [
    { id: 'today' as const, label: '今日', icon: Sun, color: 'from-amber-500 to-orange-500' },
    { id: 'tomorrow' as const, label: '明日', icon: Calendar, color: 'from-cyan-500 to-blue-500' },
    { id: 'week' as const, label: '本周', icon: TrendingUp, color: 'from-violet-500 to-purple-500' },
    { id: 'month' as const, label: '本月', icon: Star, color: 'from-rose-500 to-pink-500' },
  ]

  const data = active ? generateHoroscope(active.id, period, today.getDate()) : null
  const luckyColor = ['红色', '蓝色', '绿色', '黄色', '紫色'][today.getDate() % 5]
  const luckyNum = (today.getDate() + (active?.id.charCodeAt(0) || 0)) % 9 + 1

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl p-3 text-white ${active?.gradient || 'bg-gradient-to-br from-violet-500 to-purple-500'}`}>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">星座运势</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">12 星座 · 今日/明日/周/月 · 5 维度评分</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold">{active?.symbol} {active?.name}</p>
            <p className="text-[10px] opacity-80">{active?.dateRange} · {active?.ruler}守护 · {active?.traits}</p>
          </div>
          <div className="text-5xl opacity-50">{active?.icon}</div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center mt-2">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{data?.overall}★</p><p className="text-[9px] opacity-80">综合</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">#{(luckyNum)}</p><p className="text-[9px] opacity-80">幸运数</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{luckyColor}</p><p className="text-[9px] opacity-80">幸运色</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{['白羊', '金牛', '双子', '巨蟹'][today.getDate() % 4]}</p><p className="text-[9px] opacity-80">贵人</p></div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {periods.map((p) => {
          const Icon = p.icon
          return (
            <button key={p.id} onClick={() => setPeriod(p.id)} className={cn('flex-1 h-9 rounded-xl flex items-center justify-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0', period === p.id ? `bg-gradient-to-r ${p.color} text-white` : 'bg-white/60 dark:bg-ink-900/40 text-ink-600')}>
              <Icon className="w-3.5 h-3.5" />{p.label}
            </button>
          )
        })}
      </div>

      {data && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          {RATINGS.map((label, i) => {
            const value = [data.overall, data.love, data.career, data.money, data.health][i]
            const Icon = RATINGS_ICONS[i]
            return (
              <div key={label} className="flex items-center gap-2">
                <Icon className="w-3.5 h-3.5 text-ink-500" />
                <span className="text-xs font-semibold text-ink-700 dark:text-ink-300 w-12">{label}</span>
                <div className="flex-1 flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => <span key={s} className={cn('flex-1 h-2 rounded', s <= value ? 'bg-gradient-to-r from-amber-400 to-yellow-500' : 'bg-ink-100 dark:bg-ink-800')} />)}
                </div>
                <span className="text-xs font-mono font-bold text-amber-500 w-4 text-right">{value}</span>
              </div>
            )
          })}
        </div>
      )}

      {data && (
        <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-3 border border-violet-200/40 space-y-1">
          <div className="text-xs font-semibold text-violet-700 dark:text-violet-300 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />星象指引</div>
          <p className="text-[11px] text-ink-700 dark:text-ink-300 leading-relaxed">{data.advice}</p>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['all', 'fire', 'earth', 'air', 'water'] as const).map((el) => (
          <button key={el} onClick={() => setFilterEl(el)} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0', filterEl === el ? 'bg-violet-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
            {el === 'all' ? '全部' : el === 'fire' ? '🔥 火象' : el === 'earth' ? '🌍 土象' : el === 'air' ? '💨 风象' : '💧 水象'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {filtered.map((s) => (
          <button key={s.id} onClick={() => setFavSign(s.id)} className={cn('h-16 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all', favSign === s.id ? `${s.gradient} text-white shadow-md scale-105` : 'bg-white/60 dark:bg-ink-900/40 text-ink-600')}>
            <span className="text-2xl">{s.symbol}</span>
            <span className="text-[10px] font-semibold">{s.name.replace('座', '')}</span>
          </button>
        ))}
      </div>

      <button onClick={() => { setFavSign('auto'); toast('已设为自动', 'success') }} className="w-full h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-[10px] text-ink-600 flex items-center justify-center gap-1">
        <RefreshCw className="w-3 h-3" />自动按生日显示
      </button>
    </div>
  )
}
