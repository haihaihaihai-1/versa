import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Plus, Trash2, Sparkles, Loader2, Wallet, Home, Bitcoin, Briefcase, TrendingUp, Car, Gem } from 'lucide-react'
import { cn, uid, formatNumber } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Asset {
  id: string
  name: string
  type: 'stock' | 'bond' | 'cash' | 'realestate' | 'crypto' | 'fund' | 'other'
  value: number
  cost: number
  note: string
}

const STORAGE_KEY = 'versa:portfolio-v1'

function load(): Asset[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Asset[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Asset[] {
  return [
    { id: 'a1', name: '股票组合', type: 'stock', value: 285000, cost: 230000, note: 'AAPL/TSLA/NVDA' },
    { id: 'a2', name: '货币基金', type: 'fund', value: 50000, cost: 50000, note: '余额宝' },
    { id: 'a3', name: '国债', type: 'bond', value: 80000, cost: 80000, note: '3 年期' },
    { id: 'a4', name: '自住房', type: 'realestate', value: 3500000, cost: 2800000, note: '评估价' },
    { id: 'a5', name: 'BTC', type: 'crypto', value: 45000, cost: 28000, note: '0.6 BTC' },
    { id: 'a6', name: '应急现金', type: 'cash', value: 30000, cost: 30000, note: '活期' },
  ]
}

const TYPE_META = {
  stock: { label: '股票', icon: TrendingUp, color: '#10b981' },
  bond: { label: '债券', icon: Briefcase, color: '#3b82f6' },
  cash: { label: '现金', icon: Wallet, color: '#06b6d4' },
  realestate: { label: '房产', icon: Home, color: '#f59e0b' },
  crypto: { label: '加密', icon: Bitcoin, color: '#f97316' },
  fund: { label: '基金', icon: PieChart, color: '#8b5cf6' },
  other: { label: '其他', icon: Gem, color: '#ec4899' },
} as const

export function PortfolioTracker() {
  const [assets, setAssets] = useState<Asset[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<Asset['type']>('stock')
  const [value, setValue] = useState('')
  const [cost, setCost] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => { save(assets) }, [assets])

  const total = assets.reduce((s, a) => s + a.value, 0)
  const totalCost = assets.reduce((s, a) => s + a.cost, 0)
  const totalReturn = total - totalCost
  const returnPct = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0

  const byType = (() => {
    const m: { [k: string]: number } = {}
    assets.forEach((a) => { m[a.type] = (m[a.type] || 0) + a.value })
    return m
  })()

  const add = () => {
    if (!name.trim() || !value) { toast('请填写', 'error'); return }
    const a: Asset = { id: uid(), name, type, value: +value, cost: +cost || +value, note }
    setAssets([a, ...assets])
    setName(''); setValue(''); setCost(''); setNote('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const remove = (id: string) => setAssets(assets.filter((a) => a.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const allocation = Object.entries(byType).map(([k, v]) => `${TYPE_META[k as Asset['type']].label} ${((v / total) * 100).toFixed(0)}%`).join(', ')
      const result = await aiComplete(`用户资产配置: ${allocation}, 总收益 ${returnPct.toFixed(1)}%. 给出 1 段 60 字内资产配置建议, 中文`, '你是 Versa 投资顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  // Build pie chart segments
  const segments = Object.entries(byType).map(([k, v]) => ({
    type: k as Asset['type'],
    value: v,
    pct: (v / total) * 100,
    color: TYPE_META[k as Asset['type']].color,
  })).sort((a, b) => b.value - a.value)

  let cumulative = 0
  const radius = 60
  const cx = 80
  const cy = 80

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <PieChart className="w-5 h-5" />
          <h2 className="text-lg font-bold">资产配置</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">多类资产 · 配置分析 · 收益追踪</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatNumber(total)}</p>
            <p className="text-[9px] opacity-80">总资产</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatNumber(totalCost)}</p>
            <p className="text-[9px] opacity-80">总成本</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className={cn('text-base font-bold', totalReturn >= 0 ? 'text-emerald-100' : 'text-rose-100')}>
              {totalReturn >= 0 ? '+' : ''}{formatNumber(totalReturn)}
            </p>
            <p className="text-[9px] opacity-80">收益</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className={cn('text-base font-bold', returnPct >= 0 ? 'text-emerald-100' : 'text-rose-100')}>
              {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
            </p>
            <p className="text-[9px] opacity-80">回报</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加资产
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      {total > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-xs font-semibold mb-2">配置分布</p>
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 160 160" className="w-32 h-32 flex-shrink-0">
              {segments.map((seg, i) => {
                const startAngle = (cumulative / 100) * 360
                const endAngle = ((cumulative + seg.pct) / 100) * 360
                cumulative += seg.pct
                const startRad = (startAngle - 90) * Math.PI / 180
                const endRad = (endAngle - 90) * Math.PI / 180
                const x1 = cx + radius * Math.cos(startRad)
                const y1 = cy + radius * Math.sin(startRad)
                const x2 = cx + radius * Math.cos(endRad)
                const y2 = cy + radius * Math.sin(endRad)
                const largeArc = seg.pct > 50 ? 1 : 0
                return (
                  <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={seg.color} />
                )
              })}
              <circle cx={cx} cy={cy} r="35" fill="white" className="dark:fill-ink-900" />
              <text x={cx} y={cy - 5} textAnchor="middle" className="text-[10px] fill-ink-500">总资产</text>
              <text x={cx} y={cy + 8} textAnchor="middle" className="text-[12px] font-bold fill-ink-700 dark:fill-ink-300">¥{formatNumber(total)}</text>
            </svg>
            <div className="flex-1 space-y-1">
              {segments.map((s) => {
                const M = TYPE_META[s.type]
                const Icon = M.icon
                return (
                  <div key={s.type} className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-3 h-3 rounded" style={{ background: s.color }} />
                    <Icon className="w-3 h-3 text-ink-500" />
                    <span className="font-semibold">{M.label}</span>
                    <span className="ml-auto font-bold">{s.pct.toFixed(1)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {assets.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <PieChart className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有资产</p>
          </div>
        ) : assets.map((a) => {
          const M = TYPE_META[a.type]
          const Icon = M.icon
          const pnl = a.value - a.cost
          const pnlPct = a.cost > 0 ? (pnl / a.cost) * 100 : 0
          return (
            <div key={a.id} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: M.color }}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{a.name} <span className="text-[10px] text-ink-500 font-normal">{M.label}</span></p>
                  <p className="text-[10px] text-ink-500">{a.note || `成本 ¥${formatNumber(a.cost)}`}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">¥{formatNumber(a.value)}</p>
                  <p className={cn('text-[10px] font-semibold', pnl >= 0 ? 'text-rose-500' : 'text-emerald-500')}>
                    {pnl >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
                  </p>
                </div>
                <button onClick={() => remove(a.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
              <div className="mt-1.5 h-1 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${(a.value / total) * 100}%`, background: M.color }} />
              </div>
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">添加资产</h3>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="资产名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                const M = TYPE_META[k]
                const Icon = M.icon
                return (
                  <button key={k} onClick={() => setType(k)} className={cn('h-14 rounded-lg flex flex-col items-center justify-center text-[10px] font-semibold', type === k ? 'text-white' : 'bg-ink-100 dark:bg-ink-800')} style={type === k ? { background: M.color } : {}}>
                    <Icon className="w-3.5 h-3.5" />
                    <span className="mt-0.5">{M.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">当前价值</p>
                <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="¥" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">成本</p>
                <input type="number" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="¥" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="备注 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
