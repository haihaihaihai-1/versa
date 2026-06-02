import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Flame, Gift, Calendar, Trophy } from 'lucide-react'
import { versa, useVersa } from '../store/versa'
import { cn } from '../lib/utils'

const MONTH_NAMES = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

interface DayCell {
  date: string
  day: number
  inMonth: boolean
  isToday: boolean
  signed: boolean
  points: number
  isMakeup: boolean
}

export function SignInCalendarPage() {
  const { user } = useVersa()
  const points = user?.points ?? 0
  const [year, setYear] = useState(new Date().getFullYear())
  const [month, setMonth] = useState(new Date().getMonth())
  const [signedDays, setSignedDays] = useState<Set<string>>(() => new Set())

  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)

  const cells = useMemo<DayCell[]>(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const arr: DayCell[] = []
    for (let i = 0; i < firstDay; i++) {
      const d = new Date(year, month, -firstDay + i + 1)
      arr.push({ date: d.toISOString().slice(0, 10), day: d.getDate(), inMonth: false, isToday: false, signed: false, points: 0, isMakeup: false })
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i)
      const ds = d.toISOString().slice(0, 10)
      arr.push({
        date: ds,
        day: i,
        inMonth: true,
        isToday: ds === todayStr,
        signed: signedDays.has(ds),
        points: [5, 5, 10, 10, 15, 20, 30][i % 7],
        isMakeup: d < today && !signedDays.has(ds),
      })
    }
    return arr
  }, [year, month, signedDays, todayStr])

  const monthStats = useMemo(() => {
    const monthCells = cells.filter((c) => c.inMonth)
    return {
      signed: monthCells.filter((c) => c.signed).length,
      total: monthCells.length,
      streak: (() => {
        let s = 0
        for (let i = cells.length - 1; i >= 0; i--) {
          if (cells[i].inMonth && cells[i].signed) s++
          else if (cells[i].inMonth && !cells[i].isToday) break
        }
        return s
      })(),
      points: cells.filter((c) => c.signed).reduce((s, c) => s + c.points, 0),
    }
  }, [cells])

  const handleSign = () => {
    if (signedDays.has(todayStr)) return
    const ds = cells.find((c) => c.isToday)
    if (!ds) return
    setSignedDays((s) => new Set(s).add(todayStr))
    versa.addPoints(ds.points)
  }

  const goPrev = () => {
    if (month === 0) { setYear(year - 1); setMonth(11) }
    else setMonth(month - 1)
  }
  const goNext = () => {
    if (month === 11) { setYear(year + 1); setMonth(0) }
    else setMonth(month + 1)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 p-6 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/30 blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Flame className="w-5 h-5 fill-yellow-300 text-yellow-300" />
              <h1 className="text-2xl font-bold">每日签到</h1>
            </div>
            <p className="text-sm opacity-90">连续签到奖励翻倍 · 不漏每一天</p>
          </div>
          <div className="text-right">
            <p className="text-xs opacity-80">已获得</p>
            <p className="text-3xl font-bold">{points}</p>
            <p className="text-[10px] opacity-80">积分</p>
          </div>
        </div>
      </div>

      {/* 统计条 */}
      <div className="grid grid-cols-4 gap-3">
        <Stat label="本月已签" value={`${monthStats.signed}/${monthStats.total}`} />
        <Stat label="连续天数" value={monthStats.streak} highlight />
        <Stat label="本月积分" value={monthStats.points} />
        <Stat label="总积分" value={points} />
      </div>

      {/* 签到按钮 */}
      <button
        onClick={handleSign}
        disabled={signedDays.has(todayStr)}
        className={cn(
          'w-full py-4 rounded-2xl font-bold text-base transition flex items-center justify-center gap-2',
          signedDays.has(todayStr)
            ? 'bg-emerald-500 text-white cursor-default'
            : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:scale-[1.01] active:scale-100'
        )}
      >
        {signedDays.has(todayStr) ? <>✓ 今日已签 (+{cells.find((c) => c.isToday)?.points || 0} 积分)</> : <><Gift className="w-5 h-5" />立即签到 (+{cells.find((c) => c.isToday)?.points || 5} 积分)</>}
      </button>

      {/* 日历 */}
      <div className="rounded-2xl bg-white/70 dark:bg-ink-900/40 border border-ink-200/60 dark:border-ink-800/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold flex items-center gap-1.5"><Calendar className="w-4 h-4" />{year} 年 {MONTH_NAMES[month]}</h2>
          <div className="flex items-center gap-1">
            <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><ChevronLeft className="w-4 h-4" /></button>
            <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-[10px] text-ink-500 font-medium py-1">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) => (
            <DayBox key={i} cell={c} />
          ))}
        </div>
      </div>

      {/* 规则 */}
      <div className="rounded-2xl p-4 bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-200/40 dark:border-amber-700/40">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500" />签到规则</h3>
        <ul className="text-xs text-ink-600 dark:text-ink-300 space-y-1">
          <li>• 基础积分：每天 5-30 积分随机</li>
          <li>• 连续 7 天额外奖励 50 积分</li>
          <li>• 连续 30 天额外奖励 300 积分 + 限定徽章</li>
          <li>• 漏签可用 20 积分补卡（每天最多 1 次）</li>
        </ul>
      </div>
    </div>
  )
}

function DayBox({ cell }: { cell: DayCell }) {
  if (!cell.inMonth) return <div className="aspect-square" />
  return (
    <div
      className={cn(
        'aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition relative',
        cell.signed && 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm',
        cell.isToday && !cell.signed && 'border-2 border-amber-500 text-amber-600 font-bold',
        !cell.signed && !cell.isToday && 'hover:bg-ink-50 dark:hover:bg-ink-800/50',
        cell.isMakeup && 'opacity-40'
      )}
    >
      <span className="text-sm leading-none">{cell.day}</span>
      {cell.signed && <span className="text-[8px] mt-0.5">+{cell.points}</span>}
      {cell.isToday && !cell.signed && <span className="text-[8px] mt-0.5">今日</span>}
    </div>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={cn('p-3 rounded-2xl text-center', highlight ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-200/40 dark:border-amber-700/40' : 'bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 dark:border-ink-800/40')}>
      <p className={cn('text-lg font-bold', highlight && 'text-amber-600')}>{value}</p>
      <p className="text-[10px] text-ink-500 mt-0.5">{label}</p>
    </div>
  )
}

export default SignInCalendarPage
