import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bitcoin, Plus, Trash2, Sparkles, Loader2, Search, TrendingUp, TrendingDown, Star, Activity, Zap, Coins } from 'lucide-react'
import { cn, uid, formatNumber } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Coin {
  id: string
  symbol: string
  name: string
  icon: string
  price: number
  change24h: number
  change7d: number
  marketCap: number
  volume: number
  high24: number
  low24: number
  history: number[]
  holding: number
  watched: boolean
}

const STORAGE_KEY = 'versa:coins-v1'

function load(): Coin[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Coin[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Coin[] {
  return [
    { id: 'c1', symbol: 'BTC', name: 'Bitcoin', icon: '₿', price: 68500, change24h: 1.25, change7d: 3.50, marketCap: 1350e9, volume: 28e9, high24: 69200, low24: 67500, history: [66000, 66500, 67000, 66800, 67200, 68000, 68500], holding: 0.5, watched: true },
    { id: 'c2', symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', price: 3850, change24h: 2.10, change7d: -1.20, marketCap: 463e9, volume: 12e9, high24: 3920, low24: 3780, history: [3900, 3880, 3850, 3820, 3840, 3870, 3850], holding: 4, watched: true },
    { id: 'c3', symbol: 'SOL', name: 'Solana', icon: '◎', price: 168.50, change24h: 5.30, change7d: 12.40, marketCap: 78e9, volume: 4.2e9, high24: 172, low24: 160, history: [150, 153, 158, 162, 165, 167, 168.50], holding: 0, watched: true },
    { id: 'c4', symbol: 'BNB', name: 'BNB', icon: '⬡', price: 580.20, change24h: -0.50, change7d: 2.10, marketCap: 87e9, volume: 1.8e9, high24: 585, low24: 578, history: [568, 572, 575, 580, 582, 578, 580.20], holding: 10, watched: false },
    { id: 'c5', symbol: 'XRP', name: 'Ripple', icon: '✕', price: 0.52, change24h: -1.80, change7d: 5.20, marketCap: 29e9, volume: 1.2e9, high24: 0.535, low24: 0.515, history: [0.49, 0.50, 0.51, 0.50, 0.52, 0.51, 0.52], holding: 0, watched: false },
    { id: 'c6', symbol: 'ADA', name: 'Cardano', icon: '₳', price: 0.45, change24h: 3.20, change7d: -2.50, marketCap: 16e9, volume: 480e6, high24: 0.46, low24: 0.43, history: [0.46, 0.45, 0.44, 0.45, 0.46, 0.45, 0.45], holding: 0, watched: false },
    { id: 'c7', symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', price: 0.13, change24h: 8.50, change7d: 15.30, marketCap: 19e9, volume: 2.1e9, high24: 0.135, low24: 0.118, history: [0.11, 0.115, 0.12, 0.122, 0.125, 0.128, 0.13], holding: 5000, watched: true },
    { id: 'c8', symbol: 'AVAX', name: 'Avalanche', icon: '▲', price: 35.80, change24h: -2.10, change7d: 4.50, marketCap: 14e9, volume: 520e6, high24: 37, low24: 35, history: [34, 35, 36, 35.5, 35.2, 36, 35.80], holding: 0, watched: false },
  ]
}

export function CryptoWatch() {
  const [coins, setCoins] = useState<Coin[]>(load())
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'watch' | 'gain' | 'loss' | 'holding'>('all')
  const [editing, setEditing] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(coins) }, [coins])

  const totalValue = coins.reduce((s, c) => s + c.price * c.holding, 0)
  const totalChange = coins.reduce((s, c) => s + c.price * c.holding * (c.change24h / 100), 0)
  const watchCount = coins.filter((c) => c.watched).length
  const holdingCount = coins.filter((c) => c.holding > 0).length

  const filtered = coins.filter((c) => {
    if (search && !c.symbol.includes(search.toUpperCase()) && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'watch' && !c.watched) return false
    if (filter === 'gain' && c.change24h < 0) return false
    if (filter === 'loss' && c.change24h >= 0) return false
    if (filter === 'holding' && c.holding === 0) return false
    return true
  })

  const toggleWatch = (id: string) => setCoins(coins.map((c) => c.id === id ? { ...c, watched: !c.watched } : c))

  const saveHolding = (id: string) => {
    const v = +editAmount
    if (isNaN(v) || v < 0) { toast('无效', 'error'); return }
    setCoins(coins.map((c) => c.id === id ? { ...c, holding: v } : c))
    setEditing(null); setEditAmount('')
    toast('已更新', 'success')
  }

  const refresh = () => {
    setCoins(coins.map((c) => {
      const newPrice = c.price * (1 + (Math.random() - 0.5) * 0.04)
      const newHistory = [...c.history.slice(-6), newPrice]
      return { ...c, price: newPrice, history: newHistory, change24h: c.change24h + (Math.random() - 0.5) * 0.5 }
    }))
    toast('🔄 刷新', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = coins.filter((c) => c.watched).map((c) => `${c.symbol} ${c.change24h > 0 ? '+' : ''}${c.change24h.toFixed(2)}%`).join(', ')
      const result = await aiComplete(`关注币种: ${summary}. 给出 1 段 60 字内行情看法, 中文`, '你是 Versa 加密货币分析师, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Bitcoin className="w-5 h-5" />
          <h2 className="text-lg font-bold">加密货币</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 大币种 · 24h 涨跌 · 持仓追踪</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">¥{formatNumber(totalValue)}</p>
            <p className="text-[9px] opacity-80">持仓</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className={cn('text-base font-bold', totalChange >= 0 ? 'text-emerald-100' : 'text-rose-100')}>
              {totalChange >= 0 ? '+' : ''}{formatNumber(totalChange)}
            </p>
            <p className="text-[9px] opacity-80">24h</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{holdingCount}</p>
            <p className="text-[9px] opacity-80">持仓币</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{watchCount}</p>
            <p className="text-[9px] opacity-80">关注</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={refresh} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          <Activity className="w-3 h-3" />刷新
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-orange-50/40 dark:bg-orange-900/20 rounded-xl p-2 border border-orange-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索币种..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'watch', 'holding', 'gain', 'loss'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-orange-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'watch' ? '⭐ 关注' : f === 'holding' ? '💼 持仓' : f === 'gain' ? '↑ 涨' : '↓ 跌'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.map((c) => {
          const isGain = c.change24h >= 0
          const max = Math.max(...c.history)
          const min = Math.min(...c.history)
          const range = max - min || 1
          return (
            <motion.div key={c.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold">{c.symbol}</p>
                    <span className="text-[10px] text-ink-500">{c.name}</span>
                  </div>
                  <p className="text-[10px] text-ink-500">市值 ${(c.marketCap / 1e9).toFixed(0)}B</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">${c.price < 1 ? c.price.toFixed(4) : c.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  <p className={cn('text-[10px] font-semibold', isGain ? 'text-rose-500' : 'text-emerald-500')}>
                    {isGain ? '+' : ''}{c.change24h.toFixed(2)}%
                  </p>
                </div>
                <button onClick={() => toggleWatch(c.id)}>
                  <Star className={cn('w-4 h-4', c.watched ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                </button>
              </div>
              <div className="mt-1 flex items-end h-5 gap-0.5">
                {c.history.map((h, i) => {
                  const height = ((h - min) / range) * 100
                  return (
                    <div key={i} className="flex-1 rounded-sm" style={{ height: `${height}%`, background: h >= c.history[0] ? '#f43f5e' : '#10b981' }} />
                  )
                })}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                {editing === c.id ? (
                  <>
                    <input type="number" step="any" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="持仓数量" className="flex-1 px-2 h-6 rounded bg-ink-50 dark:bg-ink-800 text-[10px] outline-none" />
                    <button onClick={() => saveHolding(c.id)} className="px-2 h-6 rounded bg-emerald-500 text-white text-[10px] font-bold">保存</button>
                  </>
                ) : (
                  <>
                    {c.holding > 0 ? (
                      <button onClick={() => { setEditing(c.id); setEditAmount(String(c.holding)) }} className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-500 font-semibold flex items-center gap-0.5">
                        <Coins className="w-3 h-3" />{c.holding} = ¥{formatNumber(c.holding * c.price)}
                      </button>
                    ) : (
                      <button onClick={() => { setEditing(c.id); setEditAmount('') }} className="px-2 py-0.5 rounded bg-ink-100 dark:bg-ink-800 text-ink-500 text-[10px]">+ 添加持仓</button>
                    )}
                    <span className="text-ink-400 ml-auto text-[9px]">7d {c.change7d > 0 ? '+' : ''}{c.change7d.toFixed(1)}%</span>
                  </>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
