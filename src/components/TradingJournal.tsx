import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Plus, Trash2, Sparkles, Loader2, TrendingUp, TrendingDown, Target, Award, AlertCircle, Calendar, DollarSign } from 'lucide-react'
import { cn, uid, formatNumber, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Trade {
  id: string
  symbol: string
  name: string
  type: 'buy' | 'sell'
  asset: 'stock' | 'crypto' | 'fund' | 'option'
  price: number
  quantity: number
  date: string
  strategy: 'swing' | 'day' | 'long' | 'value' | 'momentum' | 'arbitrage'
  thesis: string
  result?: number
  rating: 1 | 2 | 3 | 4 | 5
  lessons: string
}

const STORAGE_KEY = 'versa:trades-v1'

function load(): Trade[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Trade[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Trade[] {
  return [
    { id: 't1', symbol: 'AAPL', name: '苹果', type: 'buy', asset: 'stock', price: 175.20, quantity: 50, date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], strategy: 'long', thesis: 'iPhone 16 周期 + AI 服务收入', result: 23.30, rating: 5, lessons: '基本面买入耐心持有' },
    { id: 't2', symbol: 'TSLA', name: '特斯拉', type: 'buy', asset: 'stock', price: 280.50, quantity: 20, date: new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0], strategy: 'swing', thesis: 'FSD V12 升级', result: -34.70, rating: 2, lessons: '高位接刀, 止损不坚决' },
    { id: 't3', symbol: 'NVDA', name: '英伟达', type: 'buy', asset: 'stock', price: 850.00, quantity: 10, date: new Date(Date.now() - 90 * 86400000).toISOString().split('T')[0], strategy: 'momentum', thesis: 'AI 算力需求爆发', result: 70.30, rating: 5, lessons: '趋势跟随' },
    { id: 't4', symbol: 'BTC', name: 'Bitcoin', type: 'buy', asset: 'crypto', price: 62000, quantity: 0.5, date: new Date(Date.now() - 120 * 86400000).toISOString().split('T')[0], strategy: 'value', thesis: '减半行情', result: 6500, rating: 4, lessons: '长期持有' },
  ]
}

const STRATEGY_META = {
  swing: { label: '波段', color: 'from-violet-500 to-purple-500' },
  day: { label: '日内', color: 'from-rose-500 to-pink-500' },
  long: { label: '长线', color: 'from-blue-500 to-cyan-500' },
  value: { label: '价值', color: 'from-emerald-500 to-teal-500' },
  momentum: { label: '动量', color: 'from-amber-500 to-orange-500' },
  arbitrage: { label: '套利', color: 'from-ink-500 to-ink-600' },
} as const

export function TradingJournal() {
  const [trades, setTrades] = useState<Trade[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'win' | 'loss' | 'open'>('all')
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [type, setType] = useState<Trade['type']>('buy')
  const [asset, setAsset] = useState<Trade['asset']>('stock')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [strategy, setStrategy] = useState<Trade['strategy']>('long')
  const [thesis, setThesis] = useState('')
  const [result, setResult] = useState('')
  const [rating, setRating] = useState<Trade['rating']>(3)
  const [lessons, setLessons] = useState('')

  useEffect(() => { save(trades) }, [trades])

  const totalTrades = trades.length
  const wins = trades.filter((t) => (t.result || 0) > 0).length
  const losses = trades.filter((t) => (t.result || 0) < 0).length
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
  const totalPnL = trades.reduce((s, t) => s + (t.result || 0), 0)
  const avgRating = totalTrades > 0 ? trades.reduce((s, t) => s + t.rating, 0) / totalTrades : 0
  const bestTrade = trades.reduce((b, t) => (t.result || 0) > (b.result || -Infinity) ? t : b, trades[0] || { result: 0 } as Trade)
  const worstTrade = trades.reduce((b, t) => (t.result || 0) < (b.result || Infinity) ? t : b, trades[0] || { result: 0 } as Trade)

  const filtered = (() => {
    if (filter === 'win') return trades.filter((t) => (t.result || 0) > 0)
    if (filter === 'loss') return trades.filter((t) => (t.result || 0) < 0)
    if (filter === 'open') return trades.filter((t) => t.result === undefined)
    return trades
  })().sort((a, b) => b.date.localeCompare(a.date))

  // Strategy performance
  const strategyPerf: { [k: string]: { count: number; pnl: number; winRate: number } } = {}
  trades.forEach((t) => {
    if (!strategyPerf[t.strategy]) strategyPerf[t.strategy] = { count: 0, pnl: 0, winRate: 0 }
    strategyPerf[t.strategy].count++
    strategyPerf[t.strategy].pnl += t.result || 0
  })
  Object.keys(strategyPerf).forEach((k) => {
    const wins = trades.filter((t) => t.strategy === k && (t.result || 0) > 0).length
    strategyPerf[k].winRate = strategyPerf[k].count > 0 ? (wins / strategyPerf[k].count) * 100 : 0
  })

  const add = () => {
    if (!symbol.trim() || !price) { toast('请填写', 'error'); return }
    const t: Trade = { id: uid(), symbol: symbol.toUpperCase(), name, type, asset, price: +price, quantity: +quantity || 1, date, strategy, thesis, result: result ? +result : undefined, rating, lessons }
    setTrades([t, ...trades])
    setSymbol(''); setName(''); setPrice(''); setQuantity(''); setThesis(''); setResult(''); setLessons('')
    setAdding(false)
    toast('已记录', 'success')
  }

  const remove = (id: string) => setTrades(trades.filter((t) => t.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = `总交易 ${totalTrades}, 胜率 ${winRate.toFixed(0)}%, 总盈亏 ¥${totalPnL.toFixed(0)}, 平均评分 ${avgRating.toFixed(1)}/5`
      const result = await aiComplete(`用户交易分析: ${summary}. 给出 1 段 80 字内交易改进建议, 中文`, '你是 Versa 交易教练, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <LineChart className="w-5 h-5" />
          <h2 className="text-lg font-bold">交易日志</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">记录 · 复盘 · 策略分析</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalTrades}</p>
            <p className="text-[9px] opacity-80">交易</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{winRate.toFixed(0)}%</p>
            <p className="text-[9px] opacity-80">胜率</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className={cn('text-base font-bold', totalPnL >= 0 ? 'text-emerald-100' : 'text-rose-100')}>
              {totalPnL >= 0 ? '+' : ''}¥{formatNumber(totalPnL)}
            </p>
            <p className="text-[9px] opacity-80">总盈亏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgRating.toFixed(1)}</p>
            <p className="text-[9px] opacity-80">平均分</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />记交易
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

      {Object.keys(strategyPerf).length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-xs font-semibold mb-1.5">策略表现</p>
          <div className="space-y-1">
            {Object.entries(strategyPerf).sort((a, b) => b[1].pnl - a[1].pnl).map(([s, p]) => {
              const M = STRATEGY_META[s as Trade['strategy']]
              return (
                <div key={s} className="flex items-center gap-1.5 text-[10px]">
                  <span className={cn('px-1.5 py-0.5 rounded text-white text-[9px] font-semibold bg-gradient-to-r', M.color)}>{M.label}</span>
                  <span className="text-ink-500">{p.count} 笔</span>
                  <span className="text-ink-500">胜率 {p.winRate.toFixed(0)}%</span>
                  <span className={cn('ml-auto font-bold', p.pnl >= 0 ? 'text-rose-500' : 'text-emerald-500')}>
                    {p.pnl >= 0 ? '+' : ''}¥{formatNumber(p.pnl)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'win', 'loss', 'open'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'win' ? '✓ 盈利' : f === 'loss' ? '✗ 亏损' : '⏳ 未平'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <LineChart className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有交易</p>
          </div>
        ) : filtered.map((t) => {
          const M = STRATEGY_META[t.strategy]
          const isWin = (t.result || 0) > 0
          return (
            <motion.div key={t.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center gap-2">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white bg-gradient-to-br', t.type === 'buy' ? 'from-rose-500 to-pink-500' : 'from-emerald-500 to-teal-500')}>
                  {t.type === 'buy' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold truncate">{t.name || t.symbol}</p>
                    <span className="text-[10px] text-ink-500">{t.symbol}</span>
                    <span className={cn('text-[9px] px-1 py-0.5 rounded text-white bg-gradient-to-r', M.color)}>{M.label}</span>
                  </div>
                  <p className="text-[10px] text-ink-500 flex items-center gap-1.5">
                    <span>{t.date}</span>
                    <span>{t.quantity} @ ¥{t.price}</span>
                    <span>· ¥{formatNumber(t.quantity * t.price)}</span>
                  </p>
                </div>
                <div className="text-right">
                  {t.result !== undefined ? (
                    <>
                      <p className={cn('text-sm font-bold', isWin ? 'text-rose-500' : 'text-emerald-500')}>
                        {isWin ? '+' : ''}¥{formatNumber(t.result)}
                      </p>
                      <div className="flex justify-end">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s} className={cn('w-1 h-2', s <= t.rating ? 'bg-amber-400' : 'bg-ink-200 dark:bg-ink-700')} />
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-ink-500">持仓中</p>
                  )}
                </div>
                <button onClick={() => remove(t.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
              {t.thesis && <p className="text-[10px] text-ink-500 mt-1">💡 {t.thesis}</p>}
              {t.lessons && (
                <p className={cn('text-[10px] mt-0.5', t.result && t.result > 0 ? 'text-emerald-500' : 'text-amber-500')}>📚 {t.lessons}</p>
              )}
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">记录交易</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="代码" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setType('buy')} className={cn('h-9 rounded-lg text-xs font-semibold', type === 'buy' ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>买入</button>
              <button onClick={() => setType('sell')} className={cn('h-9 rounded-lg text-xs font-semibold', type === 'sell' ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>卖出</button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <select value={asset} onChange={(e) => setAsset(e.target.value as any)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none">
                <option value="stock">股票</option>
                <option value="crypto">加密</option>
                <option value="fund">基金</option>
                <option value="option">期权</option>
              </select>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="价格" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="数量" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(STRATEGY_META) as Array<keyof typeof STRATEGY_META>).map((k) => {
                const M = STRATEGY_META[k]
                return (
                  <button key={k} onClick={() => setStrategy(k as any)} className={cn('h-9 rounded-lg text-[10px] font-semibold', strategy === k ? `bg-gradient-to-r ${M.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    {M.label}
                  </button>
                )
              })}
            </div>
            <textarea value={thesis} onChange={(e) => setThesis(e.target.value)} placeholder="交易逻辑/理由..." className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[50px]" />
            <div className="grid grid-cols-2 gap-1.5">
              <input type="number" value={result} onChange={(e) => setResult(e.target.value)} placeholder="盈亏 (¥)" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <div className="flex gap-0.5 items-center justify-center">
                {([1, 2, 3, 4, 5] as const).map((s) => (
                  <button key={s} onClick={() => setRating(s)} className="text-xl">{s <= rating ? '⭐' : '☆'}</button>
                ))}
              </div>
            </div>
            <input value={lessons} onChange={(e) => setLessons(e.target.value)} placeholder="经验教训" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
