import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Coins, ArrowRightLeft, Plus, Trash2, Sparkles, Loader2, TrendingUp, TrendingDown, RefreshCw, History, Star } from 'lucide-react'
import { cn } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Rate { code: string; name: string; symbol: string; rate: number; flag: string }
interface HistoryItem { id: string; from: string; to: string; amount: number; result: number; date: string }

const STORAGE_KEY = 'versa:fx-v1'
const FAV_KEY = 'versa:fx-fav-v1'

const CURRENCIES: Rate[] = [
  { code: 'CNY', name: '人民币', symbol: '¥', rate: 1, flag: '🇨🇳' },
  { code: 'USD', name: '美元', symbol: '$', rate: 0.14, flag: '🇺🇸' },
  { code: 'EUR', name: '欧元', symbol: '€', rate: 0.13, flag: '🇪🇺' },
  { code: 'JPY', name: '日元', symbol: '¥', rate: 21.5, flag: '🇯🇵' },
  { code: 'KRW', name: '韩元', symbol: '₩', rate: 192, flag: '🇰🇷' },
  { code: 'GBP', name: '英镑', symbol: '£', rate: 0.11, flag: '🇬🇧' },
  { code: 'HKD', name: '港币', symbol: 'HK$', rate: 1.09, flag: '🇭🇰' },
  { code: 'TWD', name: '台币', symbol: 'NT$', rate: 4.6, flag: '🇹🇼' },
  { code: 'THB', name: '泰铢', symbol: '฿', rate: 4.9, flag: '🇹🇭' },
  { code: 'SGD', name: '新币', symbol: 'S$', rate: 0.19, flag: '🇸🇬' },
  { code: 'AUD', name: '澳元', symbol: 'A$', rate: 0.21, flag: '🇦🇺' },
  { code: 'MYR', name: '马币', symbol: 'RM', rate: 0.65, flag: '🇲🇾' },
]

function load(): HistoryItem[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [
  { id: '1', from: 'CNY', to: 'JPY', amount: 1000, result: 21500, date: new Date().toISOString() },
  { id: '2', from: 'CNY', to: 'USD', amount: 1000, result: 140, date: new Date().toISOString() },
] }
function save(d: HistoryItem[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }
function loadFav(): string[] { try { const s = localStorage.getItem(FAV_KEY); if (s) return JSON.parse(s) } catch {} return ['USD', 'JPY', 'EUR', 'KRW'] }
function saveFav(d: string[]) { try { localStorage.setItem(FAV_KEY, JSON.stringify(d)) } catch {} }

export function CurrencyConverter() {
  const [history, setHistory] = useState<HistoryItem[]>(load())
  const [favs, setFavs] = useState<string[]>(loadFav())
  const [amount, setAmount] = useState('1000')
  const [from, setFrom] = useState('CNY')
  const [to, setTo] = useState('JPY')
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => { save(history) }, [history])
  useEffect(() => { saveFav(favs) }, [favs])

  const fromC = CURRENCIES.find((c) => c.code === from)!
  const toC = CURRENCIES.find((c) => c.code === to)!
  const num = +amount || 0
  const result = (num / fromC.rate) * toC.rate

  const swap = () => { const t = from; setFrom(to); setTo(t) }

  const record = () => {
    setHistory([{ id: String(Date.now()), from, to, amount: num, result, date: new Date().toISOString() }, ...history].slice(0, 30))
    toast('已记录', 'success')
  }

  const removeHist = (id: string) => setHistory(history.filter((h) => h.id !== id))

  const toggleFav = (code: string) => {
    if (favs.includes(code)) setFavs(favs.filter((c) => c !== code))
    else setFavs([...favs, code].slice(0, 8))
  }

  const quickConvert = (amt: number, f: string, t: string) => {
    const fC = CURRENCIES.find((c) => c.code === f)!
    const tC = CURRENCIES.find((c) => c.code === t)!
    return (amt / fC.rate) * tC.rate
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`1 CNY 当前约 ${(1 / fromC.rate * toC.rate).toFixed(3)} ${to}. 给出 50 字内汇率兑换建议 (何时兑换/在哪里换), 中文`, '你是 Versa 旅行金融顾问, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const displayCurrencies = showAll ? CURRENCIES : CURRENCIES.filter((c) => favs.includes(c.code))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Coins className="w-5 h-5" />
          <h2 className="text-lg font-bold">汇率转换</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">12 种货币 · 收藏常用 · 历史记录</p>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{CURRENCIES.length}</p>
            <p className="text-[9px] opacity-80">币种</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{favs.length}</p>
            <p className="text-[9px] opacity-80">收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{history.length}</p>
            <p className="text-[9px] opacity-80">历史</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <div className="grid grid-cols-2 gap-2 items-center">
          <div>
            <p className="text-[10px] text-ink-500 mb-0.5">从</p>
            <select value={from} onChange={(e) => setFrom(e.target.value)} className="w-full px-2 h-8 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full mt-1 px-3 h-10 rounded-lg bg-ink-50 dark:bg-ink-800 text-base font-bold outline-none" />
            <p className="text-[10px] text-ink-500 mt-0.5">{fromC.name} {fromC.symbol}</p>
          </div>
          <div className="relative">
            <button onClick={swap} className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center z-10">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </button>
            <p className="text-[10px] text-ink-500 mb-0.5">到</p>
            <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-2 h-8 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none">
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
            </select>
            <div className="w-full mt-1 px-3 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 text-white text-base font-bold flex items-center">
              {toC.symbol}{result.toFixed(2)}
            </div>
            <p className="text-[10px] text-ink-500 mt-0.5">{toC.name} {toC.symbol}</p>
          </div>
        </div>
        <p className="text-[10px] text-center text-ink-500 mt-2">1 {from} = {(1 / fromC.rate * toC.rate).toFixed(4)} {to}</p>
        <div className="flex gap-1.5 mt-2">
          <button onClick={record} className="flex-1 h-8 rounded-lg bg-amber-500 text-white text-xs font-semibold">记录</button>
          <button onClick={runAI} disabled={loading} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
          </button>
        </div>
      </div>

      {aiTip && (
        <div className="bg-amber-50/40 dark:bg-amber-900/20 rounded-xl p-2 border border-amber-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold">常用币种</p>
          <button onClick={() => setShowAll(!showAll)} className="text-[10px] text-amber-500 font-semibold">{showAll ? '收起' : '全部'}</button>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {displayCurrencies.map((c) => (
            <button key={c.code} onClick={() => toggleFav(c.code)} className={cn('h-14 rounded-xl flex flex-col items-center justify-center', favs.includes(c.code) ? 'bg-amber-500 text-white' : 'bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60')}>
              <span className="text-base">{c.flag}</span>
              <p className="text-[10px] font-bold">{c.code}</p>
              <p className="text-[8px] opacity-80">1¥ = {(1 / c.rate).toFixed(2)}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1.5 flex items-center gap-1"><History className="w-3 h-3" />历史记录</p>
        {history.length === 0 ? (
          <p className="text-center text-xs text-ink-500 py-3">还没有记录</p>
        ) : (
          <div className="space-y-1">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
                <span className="text-xs">{CURRENCIES.find((c) => c.code === h.from)?.flag}</span>
                <span className="text-[10px] text-ink-500">{h.from}→{h.to}</span>
                <span className="text-xs font-bold ml-auto">{h.amount} = {h.result.toFixed(2)}</span>
                <button onClick={() => removeHist(h.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
