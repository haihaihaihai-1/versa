import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Plus, Minus, ArrowUpRight, ArrowDownLeft, CreditCard, Sparkles, Loader2, Gift, TrendingUp, TrendingDown, Receipt, History, Lock, Eye, EyeOff } from 'lucide-react'
import { cn, formatCurrency, formatTimeAgo, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Transaction {
  id: string
  type: 'recharge' | 'withdraw' | 'consume' | 'refund' | 'reward' | 'gift'
  amount: number
  description: string
  category: string
  at: number
  status: 'success' | 'pending' | 'failed'
}

const STORAGE_KEY = 'versa:wallet'

function load(): { balance: number; transactions: Transaction[]; hidden: boolean } {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return {
    balance: 1280.50,
    transactions: [
      { id: 't1', type: 'recharge', amount: 500, description: '支付宝充值', category: '充值', at: Date.now() - 86400000 * 3, status: 'success' },
      { id: 't2', type: 'consume', amount: -89, description: 'iPhone 16 Pro 256G', category: '购物', at: Date.now() - 86400000 * 2, status: 'success' },
      { id: 't3', type: 'gift', amount: 50, description: '直播礼物 - 玫瑰', category: '直播', at: Date.now() - 86400000, status: 'success' },
      { id: 't4', type: 'reward', amount: 28, description: '签到奖励', category: '奖励', at: Date.now() - 3600000, status: 'success' },
      { id: 't5', type: 'consume', amount: -12, description: '包邮券兑换', category: '购物', at: Date.now() - 60000 * 30, status: 'success' },
    ],
    hidden: false,
  }
}
function save(d: any) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const TYPE_META = {
  recharge: { label: '充值', icon: ArrowDownLeft, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
  withdraw: { label: '提现', icon: ArrowUpRight, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  consume: { label: '消费', icon: CreditCard, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
  refund: { label: '退款', icon: ArrowDownLeft, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  reward: { label: '奖励', icon: Gift, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20' },
  gift: { label: '礼物', icon: Gift, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-900/20' },
} as const

export function WalletHub() {
  const [data, setData] = useState(load())
  const [rechargeOpen, setRechargeOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'alipay' | 'wechat' | 'card'>('alipay')
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(data) }, [data])

  const income = data.transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const expense = Math.abs(data.transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0))

  const recharge = () => {
    const v = +amount
    if (!v || v <= 0) { toast('请输入正确金额', 'error'); return }
    const t: Transaction = { id: uid(), type: 'recharge', amount: v, description: `${method === 'alipay' ? '支付宝' : method === 'wechat' ? '微信' : '银行卡'}充值`, category: '充值', at: Date.now(), status: 'pending' }
    setData({ ...data, transactions: [t, ...data.transactions] })
    setAmount(''); setRechargeOpen(false)
    setTimeout(() => {
      setData((d) => ({ ...d, balance: d.balance + v, transactions: d.transactions.map((x) => x.id === t.id ? { ...x, status: 'success' } : x) }))
      toast(`充值成功 ¥${v}`, 'success')
    }, 1500)
  }

  const filtered = (() => {
    if (filter === 'all') return data.transactions
    if (filter === 'income') return data.transactions.filter((t) => t.amount > 0)
    return data.transactions.filter((t) => t.amount < 0)
  })()

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(
        `为用户钱包生成 1 段理财建议 (60-100 字), 余额 ¥${data.balance.toFixed(2)}, 收入 ¥${income.toFixed(0)}, 支出 ¥${expense.toFixed(0)}`,
        '你是 Versa 理财助手, 简洁专业, 中文'
      )
      setAiAnalysis(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-5 h-5" />
          <h2 className="text-lg font-bold">钱包</h2>
          <button onClick={() => setData({ ...data, hidden: !data.hidden })} className="ml-auto">
            {data.hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] opacity-80 mb-1">账户余额</p>
        <p className="text-3xl font-bold mb-2">¥{data.hidden ? '****' : data.balance.toFixed(2)}</p>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-xs opacity-80">本月收入</p>
            <p className="text-sm font-bold">¥{income.toFixed(0)}</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-xs opacity-80">本月支出</p>
            <p className="text-sm font-bold">¥{expense.toFixed(0)}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { i: Plus, l: '充值', c: 'from-emerald-500 to-teal-500', a: () => setRechargeOpen(true) },
          { i: ArrowUpRight, l: '提现', c: 'from-blue-500 to-indigo-500', a: () => toast('提现功能开发中', 'info') },
          { i: CreditCard, l: '绑卡', c: 'from-violet-500 to-purple-500', a: () => toast('银行卡管理', 'info') },
          { i: Receipt, l: '账单', c: 'from-amber-500 to-orange-500', a: () => setFilter('expense') },
        ].map((b) => {
          const Icon = b.i
          return (
            <button key={b.l} onClick={b.a} className="rounded-2xl p-3 bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 flex flex-col items-center gap-1">
              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center text-white bg-gradient-to-br', b.c)}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-semibold">{b.l}</p>
            </button>
          )
        })}
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 理财建议
      </button>

      {aiAnalysis && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-3 border border-emerald-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-emerald-500"><Sparkles className="w-3.5 h-3.5" />AI 建议</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiAnalysis}</p>
        </div>
      )}

      <div className="flex gap-1.5">
        {(['all', 'income', 'expense'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', filter === f ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'income' ? '收入' : '支出'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.map((t) => {
          const Meta = TYPE_META[t.type]
          const Icon = Meta.icon
          return (
            <div key={t.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', Meta.bg)}>
                <Icon className={cn('w-4 h-4', Meta.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{t.description}</p>
                <p className="text-[10px] text-ink-500">{t.category} · {formatTimeAgo(new Date(t.at).toISOString())}</p>
              </div>
              <div className="text-right">
                <p className={cn('text-sm font-bold', t.amount > 0 ? 'text-emerald-500' : 'text-rose-500')}>
                  {t.amount > 0 ? '+' : ''}¥{Math.abs(t.amount).toFixed(2)}
                </p>
                {t.status === 'pending' && <p className="text-[9px] text-amber-500">处理中</p>}
                {t.status === 'failed' && <p className="text-[9px] text-rose-500">失败</p>}
              </div>
            </div>
          )
        })}
      </div>

      {rechargeOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setRechargeOpen(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <h3 className="font-bold flex items-center gap-1.5"><Wallet className="w-4 h-4" />充值</h3>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="金额" className="w-full px-3 h-10 rounded-lg bg-ink-50 dark:bg-ink-800 text-2xl font-bold outline-none focus:ring-2 focus:ring-emerald-500" />
            <div className="grid grid-cols-4 gap-1.5">
              {[50, 100, 200, 500].map((v) => (
                <button key={v} onClick={() => setAmount(String(v))} className="h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-sm font-semibold">¥{v}</button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['alipay', 'wechat', 'card'] as const).map((m) => (
                <button key={m} onClick={() => setMethod(m)} className={cn('h-9 rounded-lg text-xs font-semibold', method === m ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  {m === 'alipay' ? '支付宝' : m === 'wechat' ? '微信' : '银行卡'}
                </button>
              ))}
            </div>
            <button onClick={recharge} className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold">确认充值</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
