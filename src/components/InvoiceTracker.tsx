import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FileText, Sparkles, Loader2, Plus, Trash2, Check, Send, AlertCircle, Clock, TrendingUp, Search, Filter, DollarSign, Eye, FilePlus } from 'lucide-react'
import { cn, uid, formatCurrency, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Invoice {
  id: string
  number: string
  type: 'receivable' | 'payable'
  client: string
  amount: number
  currency: 'CNY' | 'USD'
  issueDate: string
  dueDate: string
  paidDate?: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'partial'
  paid: number
  items: { desc: string; amount: number }[]
  notes: string
}

const STORAGE_KEY = 'versa:invoices-v2'

function load(): Invoice[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [
  { id: 'i1', number: 'INV-2026-001', type: 'receivable', client: '美食家 Lily', amount: 5000, currency: 'CNY', issueDate: '2026-06-01', dueDate: '2026-06-30', status: 'sent', paid: 0, items: [{ desc: 'UI 设计服务', amount: 5000 }], notes: '' },
  { id: 'i2', number: 'BILL-2026-001', type: 'payable', client: '苹果开发者', amount: 99, currency: 'USD', issueDate: '2026-06-05', dueDate: '2026-06-15', status: 'paid', paid: 99, paidDate: '2026-06-08', items: [{ desc: 'Apple Developer 年费', amount: 99 }], notes: '' },
  { id: 'i3', number: 'INV-2026-002', type: 'receivable', client: '数码小王子', amount: 12000, currency: 'CNY', issueDate: '2026-05-15', dueDate: '2026-05-31', status: 'overdue', paid: 0, items: [{ desc: '视频剪辑服务', amount: 12000 }], notes: '催促中' },
] }
function save(d: Invoice[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const STATUS_META = {
  draft: { label: '草稿', color: 'bg-ink-500' },
  sent: { label: '已发', color: 'bg-blue-500' },
  paid: { label: '已付', color: 'bg-emerald-500' },
  overdue: { label: '逾期', color: 'bg-rose-500' },
  partial: { label: '部分', color: 'bg-amber-500' },
} as const

function isOverdue(inv: Invoice): boolean {
  return inv.status !== 'paid' && new Date(inv.dueDate) < new Date()
}

export function InvoiceTracker() {
  const [invoices, setInvoices] = useState<Invoice[]>(load())
  const [filter, setFilter] = useState<'all' | 'receivable' | 'payable' | 'overdue'>('all')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [aiAudit, setAiAudit] = useState('')
  const [loading, setLoading] = useState(false)
  const [newNumber, setNewNumber] = useState('')
  const [newType, setNewType] = useState<Invoice['type']>('receivable')
  const [newClient, setNewClient] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newDue, setNewDue] = useState('')
  const [payOpen, setPayOpen] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')

  useEffect(() => { save(invoices) }, [invoices])

  const receivable = invoices.filter((i) => i.type === 'receivable')
  const payable = invoices.filter((i) => i.type === 'payable')
  const totalReceivable = receivable.reduce((s, i) => s + (i.amount - i.paid), 0)
  const totalPayable = payable.reduce((s, i) => s + (i.amount - i.paid), 0)
  const overdueCount = invoices.filter(isOverdue).length
  const totalOverdue = invoices.filter(isOverdue).reduce((s, i) => s + (i.amount - i.paid), 0)

  const filtered = (() => {
    let out = invoices
    if (filter === 'receivable') out = out.filter((i) => i.type === 'receivable')
    else if (filter === 'payable') out = out.filter((i) => i.type === 'payable')
    else if (filter === 'overdue') out = out.filter(isOverdue)
    return out.sort((a, b) => (a.dueDate > b.dueDate ? 1 : -1))
  })()

  const recordPayment = (id: string) => {
    const v = +payAmount
    if (!v || v <= 0) { toast('请输入金额', 'error'); return }
    setInvoices(invoices.map((i) => {
      if (i.id !== id) return i
      const newPaid = i.paid + v
      const status: Invoice['status'] = newPaid >= i.amount ? 'paid' : newPaid > 0 ? 'partial' : i.status
      return { ...i, paid: newPaid, status, paidDate: status === 'paid' ? new Date().toISOString().split('T')[0] : i.paidDate }
    }))
    setPayAmount(''); setPayOpen(null)
    toast('已记录收款', 'success')
  }

  const add = () => {
    if (!newClient || !newAmount) { toast('请填写完整', 'error'); return }
    const inv: Invoice = { id: uid(), number: newNumber || `INV-${Date.now().toString().slice(-6)}`, type: newType, client: newClient, amount: +newAmount, currency: 'CNY', issueDate: new Date().toISOString().split('T')[0], dueDate: newDue, status: 'draft', paid: 0, items: [{ desc: '服务', amount: +newAmount }], notes: '' }
    setInvoices([inv, ...invoices])
    setNewClient(''); setNewAmount(''); setNewDue(''); setNewNumber('')
    setAdding(false)
    toast('已创建', 'success')
  }

  const remove = (id: string) => setInvoices(invoices.filter((i) => i.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = `应收 ¥${totalReceivable.toFixed(0)}, 应付 ¥${totalPayable.toFixed(0)}, 逾期 ${overdueCount} 笔 ¥${totalOverdue.toFixed(0)}`
      const result = await aiComplete(`为用户财务状况生成 1 段 60-100 字建议: ${summary}`, '你是 Versa 财务顾问, 简洁实用, 中文')
      setAiAudit(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5" />
          <h2 className="text-lg font-bold">发票追踪</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">应收应付 · 状态管理 · 现金流</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold">¥{(totalReceivable / 1000).toFixed(1)}k</p>
            <p className="text-[9px] opacity-80">应收</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold">¥{(totalPayable / 1000).toFixed(1)}k</p>
            <p className="text-[9px] opacity-80">应付</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold">{overdueCount}</p>
            <p className="text-[9px] opacity-80">逾期</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-sm font-bold">¥{(totalOverdue / 1000).toFixed(1)}k</p>
            <p className="text-[9px] opacity-80">逾期金</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />开发票
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiAudit && (
        <div className="bg-emerald-50/40 dark:bg-emerald-900/20 rounded-xl p-2 border border-emerald-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiAudit}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'receivable', 'payable', 'overdue'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'receivable' ? '应收' : f === 'payable' ? '应付' : '逾期'}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有发票</p>
          </div>
        ) : filtered.map((inv) => {
          const Meta = STATUS_META[inv.status]
          const overdue = isOverdue(inv)
          return (
            <div key={inv.id} className={cn('rounded-2xl p-3 border', overdue ? 'bg-rose-50/40 dark:bg-rose-900/20 border-rose-300' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
              <div className="flex items-start gap-2">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs flex-shrink-0', inv.type === 'receivable' ? 'bg-emerald-500' : 'bg-rose-500')}>
                  {inv.type === 'receivable' ? '↓' : '↑'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{inv.client}</p>
                  <p className="text-[10px] text-ink-500">{inv.number} · 到期 {inv.dueDate}</p>
                </div>
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded text-white font-bold flex-shrink-0', Meta.color)}>
                  {overdue ? '逾期' : Meta.label}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-base font-bold">¥{inv.amount.toLocaleString()}</span>
                {inv.paid > 0 && <span className="text-[10px] text-emerald-500">已收 ¥{inv.paid.toLocaleString()}</span>}
                {inv.amount > inv.paid && inv.paid > 0 && (
                  <div className="flex-1 h-1 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${(inv.paid / inv.amount) * 100}%` }} />
                  </div>
                )}
                <button onClick={() => setPayOpen(inv.id)} className="ml-auto px-2 h-6 rounded bg-emerald-500 text-white text-[10px] font-bold">{inv.type === 'receivable' ? '收款' : '付款'}</button>
                <button onClick={() => remove(inv.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
              {payOpen === inv.id && (
                <div className="mt-1.5 flex gap-1.5">
                  <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="金额" className="flex-1 px-2 h-7 rounded bg-ink-50 dark:bg-ink-800 text-xs" />
                  <button onClick={() => recordPayment(inv.id)} className="px-2 h-7 rounded bg-emerald-500 text-white text-[10px] font-bold">确认</button>
                  <button onClick={() => setPayOpen(null)} className="px-2 h-7 rounded bg-ink-100 dark:bg-ink-800 text-[10px]">取消</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">开发票</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => setNewType('receivable')} className={cn('h-9 rounded-lg text-xs font-semibold', newType === 'receivable' ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>应收</button>
              <button onClick={() => setNewType('payable')} className={cn('h-9 rounded-lg text-xs font-semibold', newType === 'payable' ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>应付</button>
            </div>
            <input value={newNumber} onChange={(e) => setNewNumber(e.target.value)} placeholder="发票号 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={newClient} onChange={(e) => setNewClient(e.target.value)} placeholder="客户/供应商名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input type="number" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="金额" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold">创建</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
