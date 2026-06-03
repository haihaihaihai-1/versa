import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Coins, Plus, Trash2, Sparkles, Loader2, Calendar, TrendingUp, DollarSign, Gift, Bell, Check, ChevronRight } from 'lucide-react'
import { cn, uid, formatNumber } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface DivHolding {
  id: string
  symbol: string
  name: string
  shares: number
  annualDiv: number
  exDate: string
  payDate: string
  yield: number
  currency: 'CNY' | 'USD'
  received: { date: string; amount: number }[]
}

const STORAGE_KEY = 'versa:dividends-v1'

function load(): DivHolding[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: DivHolding[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): DivHolding[] {
  return [
    { id: 'd1', symbol: 'AAPL', name: '苹果', shares: 50, annualDiv: 1.00, exDate: '2026-08-12', payDate: '2026-08-19', yield: 0.50, currency: 'USD', received: [{ date: '2026-05-12', amount: 12.50 }, { date: '2026-02-12', amount: 12.00 }] },
    { id: 'd2', symbol: '600519', name: '贵州茅台', shares: 10, annualDiv: 30.88, exDate: '2026-06-25', payDate: '2026-07-15', yield: 1.84, currency: 'CNY', received: [{ date: '2025-12-25', amount: 308.80 }] },
    { id: 'd3', symbol: '00700', name: '腾讯', shares: 100, annualDiv: 3.40, exDate: '2026-05-15', payDate: '2026-05-30', yield: 0.88, currency: 'CNY', received: [] },
    { id: 'd4', symbol: 'MSFT', name: '微软', shares: 30, annualDiv: 3.00, exDate: '2026-08-20', payDate: '2026-09-12', yield: 0.70, currency: 'USD', received: [] },
  ]
}

function daysToDate(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

export function DividendTracker() {
  const [holdings, setHoldings] = useState<DivHolding[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'paid'>('upcoming')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [shares, setShares] = useState('100')
  const [annualDiv, setAnnualDiv] = useState('')
  const [exDate, setExDate] = useState('')
  const [payDate, setPayDate] = useState('')
  const [yld, setYld] = useState('')
  const [currency, setCurrency] = useState<DivHolding['currency']>('CNY')

  useEffect(() => { save(holdings) }, [holdings])

  const totalAnnual = holdings.reduce((s, h) => s + h.annualDiv * h.shares, 0)
  const totalReceived = holdings.reduce((s, h) => s + h.received.reduce((sum, r) => sum + r.amount, 0), 0)
  const upcoming = holdings.filter((h) => daysToDate(h.exDate) > 0).sort((a, b) => a.exDate.localeCompare(b.exDate))
  const avgYield = holdings.length > 0 ? holdings.reduce((s, h) => s + h.yield, 0) / holdings.length : 0
  const monthlyAvg = totalAnnual / 12

  const add = () => {
    if (!name.trim() || !symbol.trim() || !annualDiv) { toast('请填写', 'error'); return }
    const h: DivHolding = { id: uid(), name, symbol: symbol.toUpperCase(), shares: +shares, annualDiv: +annualDiv, exDate, payDate, yield: +yld || 0, currency, received: [] }
    setHoldings([h, ...holdings])
    setName(''); setSymbol(''); setShares('100'); setAnnualDiv(''); setExDate(''); setPayDate(''); setYld('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const remove = (id: string) => setHoldings(holdings.filter((h) => h.id !== id))

  const markReceived = (id: string) => {
    setHoldings(holdings.map((h) => {
      if (h.id !== id) return h
      const amount = h.annualDiv * h.shares / 4
      return { ...h, received: [{ date: new Date().toISOString().split('T')[0], amount }, ...h.received] }
    }))
    toast('✓ 已记录', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = holdings.map((h) => `${h.symbol} 持仓${h.shares} 股 年分红 ¥${(h.annualDiv * h.shares).toFixed(0)}`).join('; ')
      const result = await aiComplete(`用户分红: ${summary}, 平均收益率 ${avgYield.toFixed(2)}%. 给出 1 段 60 字内分红策略建议, 中文`, '你是 Versa 投资顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  // 12-month distribution
  const monthDiv = Array(12).fill(0)
  holdings.forEach((h) => {
    const perMonth = h.annualDiv * h.shares / 4
    h.received.forEach((r) => {
      const m = new Date(r.date).getMonth()
      monthDiv[m] += r.amount
    })
    const ex = new Date(h.exDate)
    if (ex.getTime() > Date.now() && ex.getFullYear() === new Date().getFullYear()) {
      monthDiv[ex.getMonth()] += perMonth
    }
  })
  const maxMonth = Math.max(...monthDiv, 1)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Coins className="w-5 h-5" />
          <h2 className="text-lg font-bold">分红追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">派息日历 · 收益率 · 现金流</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{holdings.length}</p>
            <p className="text-[9px] opacity-80">持仓</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatNumber(totalAnnual)}</p>
            <p className="text-[9px] opacity-80">年化</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatNumber(monthlyAvg)}</p>
            <p className="text-[9px] opacity-80">月均</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgYield.toFixed(1)}%</p>
            <p className="text-[9px] opacity-80">收益率</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-semibold mb-1.5">月度分红分布</p>
        <div className="flex items-end justify-between h-16 gap-0.5">
          {monthDiv.map((v, i) => {
            const pct = (v / maxMonth) * 100
            const month = `${i + 1}月`
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-full h-12 flex flex-col justify-end">
                  <motion.div initial={{ height: 0 }} animate={{ height: `${pct}%` }} className="w-full rounded-t bg-gradient-to-t from-rose-500 to-pink-500" />
                </div>
                <p className="text-[8px] text-ink-500">{month}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />添加持仓
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['upcoming', 'all', 'paid'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'upcoming' ? '📅 即将' : f === 'all' ? '全部' : '✓ 已收'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {holdings.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Coins className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有持仓</p>
          </div>
        ) : (() => {
          const list = (() => {
            if (filter === 'upcoming') return upcoming
            if (filter === 'paid') return holdings.filter((h) => h.received.length > 0)
            return holdings
          })()
          if (list.length === 0) return <p className="text-center text-xs text-ink-500 py-3">没有数据</p>
          return list.map((h) => {
            const days = daysToDate(h.exDate)
            const isUpcoming = days > 0
            return (
              <motion.div key={h.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white flex-shrink-0">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{h.name} <span className="text-[10px] text-ink-500 font-normal">{h.symbol}</span></p>
                    <p className="text-[10px] text-ink-500">{h.shares} 股 · {h.yield.toFixed(2)}% 收益率</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">¥{(h.annualDiv * h.shares).toFixed(0)}</p>
                    <p className="text-[10px] text-ink-500">{h.currency}</p>
                  </div>
                  <button onClick={() => remove(h.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                  {isUpcoming ? (
                    <>
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-500 font-semibold">📅 {days} 天后除权</span>
                      <span className="text-ink-500">派息 {h.payDate}</span>
                    </>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 font-semibold">✓ 已派</span>
                  )}
                  <button onClick={() => markReceived(h.id)} className="ml-auto px-2 h-6 rounded bg-rose-500 text-white text-[10px] font-bold flex items-center gap-0.5">
                    <Check className="w-3 h-3" />收到
                  </button>
                </div>
                {h.received.length > 0 && (
                  <p className="text-[10px] text-ink-500 mt-1">已收: ¥{formatNumber(h.received.reduce((s, r) => s + r.amount, 0))} ({h.received.length} 次)</p>
                )}
              </motion.div>
            )
          })
        })()}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">添加持仓</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="代码" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">股数</p>
                <input type="number" value={shares} onChange={(e) => setShares(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">币种</p>
                <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none">
                  <option value="CNY">CNY</option>
                  <option value="USD">USD</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">每股年分红</p>
                <input type="number" value={annualDiv} onChange={(e) => setAnnualDiv(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">收益率 %</p>
                <input type="number" value={yld} onChange={(e) => setYld(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">除权日</p>
                <input type="date" value={exDate} onChange={(e) => setExDate(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
              <div>
                <p className="text-[10px] text-ink-500 mb-0.5">派息日</p>
                <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="w-full px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              </div>
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
