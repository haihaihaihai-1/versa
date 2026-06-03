import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Plus, Trash2, Sparkles, Loader2, Search, Star, ArrowUp, ArrowDown, DollarSign, Wallet, X } from 'lucide-react'
import { cn, uid, formatNumber } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
  market: 'SH' | 'SZ' | 'HK' | 'US'
  sector: string
  watched: boolean
  history: number[]
}

interface Position {
  id: string
  symbol: string
  shares: number
  costBasis: number
  date: string
}

const STORAGE_KEY = 'versa:stocks-v1'
const POS_KEY = 'versa:positions-v1'
const CASH_KEY = 'versa:cash-v1'

function loadStocks(): Stock[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seedStocks() }
function saveStocks(d: Stock[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }
function loadPos(): Position[] { try { const s = localStorage.getItem(POS_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function savePos(d: Position[]) { try { localStorage.setItem(POS_KEY, JSON.stringify(d)) } catch {} }
function loadCash(): number { try { const s = localStorage.getItem(CASH_KEY); if (s) return +s } catch {} return 100000 }
function saveCash(d: number) { try { localStorage.setItem(CASH_KEY, String(d)) } catch {} }

function seedStocks(): Stock[] {
  return [
    { symbol: 'AAPL', name: '苹果', price: 198.50, change: 2.30, changePct: 1.17, market: 'US', sector: '科技', watched: true, history: [195, 196, 194, 197, 198, 196, 198] },
    { symbol: 'TSLA', name: '特斯拉', price: 245.80, change: -5.40, changePct: -2.15, market: 'US', sector: '汽车', watched: true, history: [255, 250, 252, 248, 246, 251, 245] },
    { symbol: 'NVDA', name: '英伟达', price: 920.30, change: 15.20, changePct: 1.68, market: 'US', sector: '芯片', watched: true, history: [880, 895, 900, 905, 910, 905, 920] },
    { symbol: 'MSFT', name: '微软', price: 425.60, change: 3.10, changePct: 0.73, market: 'US', sector: '科技', watched: false, history: [420, 422, 421, 423, 424, 422, 425] },
    { symbol: 'GOOG', name: '谷歌', price: 175.20, change: -0.80, changePct: -0.45, market: 'US', sector: '科技', watched: false, history: [176, 175, 176, 175, 174, 175, 175] },
    { symbol: '00700', name: '腾讯', price: 385.60, change: 4.20, changePct: 1.10, market: 'HK', sector: '互联网', watched: true, history: [380, 382, 381, 383, 384, 381, 385] },
    { symbol: '600519', name: '贵州茅台', price: 1680.00, change: -15.00, changePct: -0.88, market: 'SH', sector: '消费', watched: true, history: [1700, 1695, 1690, 1685, 1683, 1685, 1680] },
    { symbol: '000858', name: '五粮液', price: 145.30, change: 1.80, changePct: 1.25, market: 'SZ', sector: '消费', watched: false, history: [143, 144, 143, 145, 144, 143, 145] },
    { symbol: 'BABA', name: '阿里巴巴', price: 78.50, change: 0.50, changePct: 0.64, market: 'US', sector: '互联网', watched: false, history: [77, 78, 78, 77, 78, 78, 78] },
    { symbol: 'PDD', name: '拼多多', price: 142.80, change: -1.20, changePct: -0.83, market: 'US', sector: '互联网', watched: false, history: [144, 143, 144, 143, 142, 144, 142] },
  ]
}

function simulatePrice(stock: Stock): Stock {
  const last = stock.history[stock.history.length - 1]
  const change = (Math.random() - 0.5) * last * 0.02
  const newPrice = Math.max(0.01, last + change)
  const newHistory = [...stock.history.slice(-19), newPrice]
  const changeNew = newPrice - stock.history[0]
  const changePctNew = (changeNew / stock.history[0]) * 100
  return { ...stock, price: newPrice, history: newHistory, change: changeNew, changePct: changePctNew }
}

export function StockSimulator() {
  const [stocks, setStocks] = useState<Stock[]>(loadStocks())
  const [positions, setPositions] = useState<Position[]>(loadPos())
  const [cash, setCash] = useState<number>(loadCash())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'watch' | 'gain' | 'loss'>('all')
  const [tab, setTab] = useState<'market' | 'portfolio'>('market')
  const [trading, setTrading] = useState<string | null>(null)
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [tradeShares, setTradeShares] = useState('')
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { saveStocks(stocks) }, [stocks])
  useEffect(() => { savePos(positions) }, [positions])
  useEffect(() => { saveCash(cash) }, [cash])

  const filtered = stocks.filter((s) => {
    if (search && !s.symbol.includes(search.toUpperCase()) && !s.name.includes(search)) return false
    if (filter === 'watch' && !s.watched) return false
    if (filter === 'gain' && s.changePct < 0) return false
    if (filter === 'loss' && s.changePct >= 0) return false
    return true
  })

  const portfolioValue = positions.reduce((sum, p) => {
    const stock = stocks.find((s) => s.symbol === p.symbol)
    return sum + (stock ? stock.price * p.shares : 0)
  }, 0)
  const totalCost = positions.reduce((sum, p) => sum + p.costBasis * p.shares, 0)
  const totalPnL = portfolioValue - totalCost
  const totalValue = portfolioValue + cash

  const refresh = () => setStocks(stocks.map(simulatePrice))

  const toggleWatch = (sym: string) => setStocks(stocks.map((s) => s.symbol === sym ? { ...s, watched: !s.watched } : s))

  const executeTrade = () => {
    if (!trading) return
    const stock = stocks.find((s) => s.symbol === trading)
    if (!stock) return
    const shares = +tradeShares
    if (!shares || shares <= 0) { toast('请输入股数', 'error'); return }
    const amount = stock.price * shares
    if (tradeType === 'buy') {
      if (amount > cash) { toast('余额不足', 'error'); return }
      setCash(cash - amount)
      const existing = positions.find((p) => p.symbol === trading)
      if (existing) {
        const totalCost = existing.costBasis * existing.shares + amount
        const totalShares = existing.shares + shares
        setPositions(positions.map((p) => p.id === existing.id ? { ...p, costBasis: totalCost / totalShares, shares: totalShares } : p))
      } else {
        setPositions([{ id: uid(), symbol: trading, shares, costBasis: stock.price, date: new Date().toISOString().split('T')[0] }, ...positions])
      }
      toast(`✓ 买入 ${shares} 股 ${stock.name}`, 'success')
    } else {
      const existing = positions.find((p) => p.symbol === trading)
      if (!existing || existing.shares < shares) { toast('持仓不足', 'error'); return }
      setCash(cash + amount)
      if (existing.shares === shares) {
        setPositions(positions.filter((p) => p.id !== existing.id))
      } else {
        setPositions(positions.map((p) => p.id === existing.id ? { ...p, shares: p.shares - shares } : p))
      }
      toast(`✓ 卖出 ${shares} 股 ${stock.name}`, 'success')
    }
    setTrading(null); setTradeShares('')
  }

  const removePosition = (id: string) => setPositions(positions.filter((p) => p.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = stocks.filter((s) => s.watched).map((s) => `${s.symbol} ${s.changePct > 0 ? '+' : ''}${s.changePct.toFixed(2)}%`).join(', ')
      const result = await aiComplete(`关注股票: ${summary}. 给出 1 段 60 字内行情看法, 中文`, '你是 Versa 投资顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5" />
          <h2 className="text-lg font-bold">股票模拟</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">虚拟交易 · 自选股 · 持仓分析</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatNumber(totalValue)}</p>
            <p className="text-[9px] opacity-80">总资产</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatNumber(cash)}</p>
            <p className="text-[9px] opacity-80">现金</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatNumber(portfolioValue)}</p>
            <p className="text-[9px] opacity-80">持仓</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className={cn('text-base font-bold', totalPnL >= 0 ? 'text-emerald-100' : 'text-rose-100')}>
              {totalPnL >= 0 ? '+' : ''}{formatNumber(totalPnL)}
            </p>
            <p className="text-[9px] opacity-80">盈亏</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={refresh} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />刷新
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
        <button onClick={() => setTab(tab === 'market' ? 'portfolio' : 'market')} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 text-white text-xs font-bold">
          {tab === 'market' ? `📊 自选 (${stocks.filter((s) => s.watched).length})` : `💼 持仓 (${positions.length})`}
        </button>
      </div>

      {aiTip && (
        <div className="bg-emerald-50/40 dark:bg-emerald-900/20 rounded-xl p-2 border border-emerald-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      {tab === 'market' && (
        <>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索代码/名称..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {(['all', 'watch', 'gain', 'loss'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                {f === 'all' ? '全部' : f === 'watch' ? '⭐ 自选' : f === 'gain' ? '↑ 涨' : '↓ 跌'}
              </button>
            ))}
          </div>
          <div className="space-y-1">
            {filtered.map((s) => {
              const isGain = s.changePct >= 0
              const max = Math.max(...s.history)
              const min = Math.min(...s.history)
              const range = max - min || 1
              return (
                <motion.div key={s.symbol} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-bold">{s.name}</p>
                        <span className="text-[10px] text-ink-500">{s.symbol}</span>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-ink-500">{s.market}</span>
                      </div>
                      <p className="text-[10px] text-ink-500">{s.sector}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{s.price.toFixed(2)}</p>
                      <p className={cn('text-[10px] font-semibold', isGain ? 'text-rose-500' : 'text-emerald-500')}>
                        {isGain ? '+' : ''}{s.changePct.toFixed(2)}%
                      </p>
                    </div>
                    <button onClick={() => toggleWatch(s.symbol)} className="ml-1">
                      <Star className={cn('w-4 h-4', s.watched ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                    </button>
                  </div>
                  <div className="mt-1.5 flex items-end h-6 gap-0.5">
                    {s.history.map((h, i) => {
                      const height = ((h - min) / range) * 100
                      return (
                        <div key={i} className="flex-1 rounded-sm" style={{ height: `${height}%`, background: h >= s.history[0] ? '#f43f5e' : '#10b981' }} />
                      )
                    })}
                  </div>
                  <div className="mt-1.5 flex gap-1.5">
                    <button onClick={() => { setTrading(s.symbol); setTradeType('buy') }} className="flex-1 h-7 rounded-lg bg-rose-500 text-white text-[10px] font-bold">买入</button>
                    <button onClick={() => { setTrading(s.symbol); setTradeType('sell') }} className="flex-1 h-7 rounded-lg bg-emerald-500 text-white text-[10px] font-bold">卖出</button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'portfolio' && (
        <div className="space-y-1.5">
          {positions.length === 0 ? (
            <div className="text-center py-8 text-ink-500">
              <Wallet className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">还没有持仓</p>
            </div>
          ) : positions.map((p) => {
            const stock = stocks.find((s) => s.symbol === p.symbol)
            if (!stock) return null
            const pnl = (stock.price - p.costBasis) * p.shares
            const pnlPct = ((stock.price - p.costBasis) / p.costBasis) * 100
            return (
              <div key={p.id} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">{stock.name} <span className="text-[10px] text-ink-500">{p.symbol}</span></p>
                    <p className="text-[10px] text-ink-500">{p.shares} 股 @ ¥{p.costBasis.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">¥{formatNumber(stock.price * p.shares)}</p>
                    <p className={cn('text-[10px] font-semibold', pnl >= 0 ? 'text-rose-500' : 'text-emerald-500')}>
                      {pnl >= 0 ? '+' : ''}{formatNumber(pnl)} ({pnlPct.toFixed(2)}%)
                    </p>
                  </div>
                  <button onClick={() => removePosition(p.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {trading && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setTrading(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">{tradeType === 'buy' ? '买入' : '卖出'} {stocks.find((s) => s.symbol === trading)?.name}</h3>
            <p className="text-xs text-ink-500">当前价 ¥{stocks.find((s) => s.symbol === trading)?.price.toFixed(2)} · 可用 ¥{formatNumber(cash)}</p>
            <input type="number" value={tradeShares} onChange={(e) => setTradeShares(e.target.value)} placeholder="股数" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <p className="text-[10px] text-ink-500">预估: ¥{formatNumber((+tradeShares || 0) * (stocks.find((s) => s.symbol === trading)?.price || 0))}</p>
            <button onClick={executeTrade} className={cn('w-full h-9 rounded-lg text-white text-sm font-semibold', tradeType === 'buy' ? 'bg-gradient-to-r from-rose-500 to-pink-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500')}>
              确认{tradeType === 'buy' ? '买入' : '卖出'}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
