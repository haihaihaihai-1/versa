import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Receipt, Plus, Trash2, Download, Send, Mail, Phone, Hash, Calendar, User, Sparkles, Loader2, Eye, Printer } from 'lucide-react'
import { cn, uid, formatCurrency } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Invoice {
  id: string
  number: string
  date: string
  dueDate: string
  from: { name: string; email: string; address: string; phone: string }
  to: { name: string; email: string; address: string; phone: string }
  items: { id: string; desc: string; qty: number; price: number; tax: number }[]
  notes: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  currency: 'CNY' | 'USD' | 'EUR' | 'JPY'
  taxRate: number
  discount: number
}

const STORAGE_KEY = 'versa:invoices'

function load(): Invoice[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Invoice[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CURRENCY_SYMBOL = { CNY: '¥', USD: '$', EUR: '€', JPY: '¥' }

const SEED: Invoice[] = [
  {
    id: 'inv1', number: 'INV-2026-001', date: '2026-06-01', dueDate: '2026-06-15',
    from: { name: 'Versa Studio', email: 'hello@versa.app', address: '上海市黄浦区 Versa 大厦 18F', phone: '+86 21-1234-5678' },
    to: { name: '美食家 Lily', email: 'lily@example.com', address: '北京市朝阳区国贸 CBD', phone: '+86 138-0000-0000' },
    items: [
      { id: uid(), desc: 'UI 设计服务', qty: 1, price: 5000, tax: 6 },
      { id: uid(), desc: '前端开发', qty: 2, price: 3000, tax: 6 },
    ],
    notes: '感谢您的合作!', status: 'sent', currency: 'CNY', taxRate: 6, discount: 0,
  },
]

export function InvoiceGenerator() {
  const [invoices, setInvoices] = useState<Invoice[]>(load().length ? load() : SEED)
  const [activeId, setActiveId] = useState<string | null>(invoices[0]?.id || null)
  const [adding, setAdding] = useState(false)
  const [aiNotes, setAiNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [newInv, setNewInv] = useState<Partial<Invoice>>({ currency: 'CNY', taxRate: 6, discount: 0, status: 'draft' })

  useEffect(() => { save(invoices) }, [invoices])

  const active = invoices.find((i) => i.id === activeId) || invoices[0]

  const updateActive = (patch: Partial<Invoice>) => {
    if (!active) return
    setInvoices(invoices.map((i) => i.id === active.id ? { ...i, ...patch } : i))
  }

  const updateFrom = (patch: Partial<Invoice['from']>) => {
    if (!active) return
    updateActive({ from: { ...active.from, ...patch } })
  }
  const updateTo = (patch: Partial<Invoice['to']>) => {
    if (!active) return
    updateActive({ to: { ...active.to, ...patch } })
  }
  const updateItem = (id: string, patch: Partial<Invoice['items'][0]>) => {
    if (!active) return
    updateActive({ items: active.items.map((it) => it.id === id ? { ...it, ...patch } : it) })
  }
  const addItem = () => {
    if (!active) return
    updateActive({ items: [...active.items, { id: uid(), desc: '新项目', qty: 1, price: 0, tax: active.taxRate }] })
  }
  const removeItem = (id: string) => {
    if (!active) return
    updateActive({ items: active.items.filter((i) => i.id !== id) })
  }

  const calcSubtotal = () => active?.items.reduce((s, i) => s + i.qty * i.price, 0) || 0
  const calcTax = () => active?.items.reduce((s, i) => s + i.qty * i.price * (i.tax / 100), 0) || 0
  const calcTotal = () => (calcSubtotal() - (active?.discount || 0) + calcTax())

  const add = () => {
    const inv: Invoice = {
      id: uid(), number: `INV-2026-${String(invoices.length + 1).padStart(3, '0')}`, date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      from: { name: 'Versa Studio', email: 'hello@versa.app', address: '', phone: '' },
      to: { name: '', email: '', address: '', phone: '' },
      items: [{ id: uid(), desc: '服务/产品', qty: 1, price: 1000, tax: 6 }],
      notes: '', status: 'draft', currency: 'CNY', taxRate: 6, discount: 0,
    }
    setInvoices([inv, ...invoices])
    setActiveId(inv.id)
    setAdding(false)
    toast('已创建', 'success')
  }

  const remove = (id: string) => {
    if (confirm('删除?')) {
      setInvoices(invoices.filter((i) => i.id !== id))
      if (activeId === id) setActiveId(invoices[0]?.id || null)
    }
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为发票生成一段 30-50 字的友好付款提醒', '你是 Versa 财务助理, 礼貌专业, 中文')
      setAiNotes(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const useAINotes = () => {
    if (aiNotes && active) updateActive({ notes: aiNotes })
  }

  const print = () => window.print()

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="w-5 h-5" />
          <h2 className="text-lg font-bold">发票生成</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">开票 · 状态 · 打印</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{invoices.length}</p>
            <p className="text-[10px] opacity-80">总数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{invoices.filter((i) => i.status === 'paid').length}</p>
            <p className="text-[10px] opacity-80">已付</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{invoices.filter((i) => i.status === 'sent').length}</p>
            <p className="text-[10px] opacity-80">已发</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {invoices.map((i) => (
          <button key={i.id} onClick={() => setActiveId(i.id)} className={cn('px-3 h-8 rounded-full text-xs font-semibold flex items-center gap-1 flex-shrink-0', activeId === i.id ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {i.number}
            <span className={cn('w-1.5 h-1.5 rounded-full', i.status === 'paid' ? 'bg-emerald-500' : i.status === 'sent' ? 'bg-amber-500' : i.status === 'overdue' ? 'bg-rose-500' : 'bg-ink-400')} />
          </button>
        ))}
        <button onClick={() => setAdding(true)} className="px-3 h-8 rounded-full bg-emerald-500 text-white text-xs font-semibold flex-shrink-0">+ 新发票</button>
      </div>

      {active && (
        <div className="rounded-2xl bg-white text-ink-900 p-3 border border-ink-200 space-y-2 print:shadow-none">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <h3 className="text-xl font-bold">发票</h3>
              <input value={active.number} onChange={(e) => updateActive({ number: e.target.value })} className="text-xs text-ink-500 bg-transparent outline-none" />
            </div>
            <select value={active.status} onChange={(e) => updateActive({ status: e.target.value as any })} className="px-2 h-7 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">
              <option value="draft">草稿</option>
              <option value="sent">已发</option>
              <option value="paid">已付</option>
              <option value="overdue">逾期</option>
            </select>
            <button onClick={print} className="w-7 h-7 rounded bg-ink-100 flex items-center justify-center"><Printer className="w-3.5 h-3.5" /></button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <p className="text-ink-500 font-bold mb-0.5">自</p>
              <input value={active.from.name} onChange={(e) => updateFrom({ name: e.target.value })} placeholder="公司名" className="w-full px-1.5 h-7 rounded bg-ink-50 text-xs" />
              <input value={active.from.email} onChange={(e) => updateFrom({ email: e.target.value })} placeholder="邮箱" className="w-full px-1.5 h-7 rounded bg-ink-50 text-[10px] mt-0.5" />
              <input value={active.from.address} onChange={(e) => updateFrom({ address: e.target.value })} placeholder="地址" className="w-full px-1.5 h-7 rounded bg-ink-50 text-[10px] mt-0.5" />
            </div>
            <div>
              <p className="text-ink-500 font-bold mb-0.5">至</p>
              <input value={active.to.name} onChange={(e) => updateTo({ name: e.target.value })} placeholder="客户名" className="w-full px-1.5 h-7 rounded bg-ink-50 text-xs" />
              <input value={active.to.email} onChange={(e) => updateTo({ email: e.target.value })} placeholder="邮箱" className="w-full px-1.5 h-7 rounded bg-ink-50 text-[10px] mt-0.5" />
              <input value={active.to.address} onChange={(e) => updateTo({ address: e.target.value })} placeholder="地址" className="w-full px-1.5 h-7 rounded bg-ink-50 text-[10px] mt-0.5" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <p className="text-ink-500">日期</p>
              <input type="date" value={active.date} onChange={(e) => updateActive({ date: e.target.value })} className="w-full px-1.5 h-7 rounded bg-ink-50 text-xs" />
            </div>
            <div>
              <p className="text-ink-500">到期</p>
              <input type="date" value={active.dueDate} onChange={(e) => updateActive({ dueDate: e.target.value })} className="w-full px-1.5 h-7 rounded bg-ink-50 text-xs" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold">项目</p>
              <button onClick={addItem} className="text-[10px] text-emerald-500 font-bold">+ 添加</button>
            </div>
            <div className="space-y-1">
              {active.items.map((it) => (
                <div key={it.id} className="grid grid-cols-12 gap-1 items-center text-[10px]">
                  <input value={it.desc} onChange={(e) => updateItem(it.id, { desc: e.target.value })} className="col-span-5 px-1 h-7 rounded bg-ink-50 text-xs" />
                  <input type="number" value={it.qty} onChange={(e) => updateItem(it.id, { qty: +e.target.value })} className="col-span-2 px-1 h-7 rounded bg-ink-50 text-center" />
                  <input type="number" value={it.price} onChange={(e) => updateItem(it.id, { price: +e.target.value })} className="col-span-2 px-1 h-7 rounded bg-ink-50 text-right" />
                  <span className="col-span-2 text-right text-xs font-bold">{(it.qty * it.price).toFixed(0)}</span>
                  <button onClick={() => removeItem(it.id)} className="col-span-1 text-rose-500 text-center">×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-ink-200 pt-2 text-[10px]">
            <div className="flex justify-between"><span>小计</span><span>{CURRENCY_SYMBOL[active.currency]} {calcSubtotal().toFixed(2)}</span></div>
            <div className="flex justify-between items-center"><span>折扣</span>
              <input type="number" value={active.discount} onChange={(e) => updateActive({ discount: +e.target.value })} className="w-16 px-1 h-6 rounded bg-ink-50 text-right" />
            </div>
            <div className="flex justify-between"><span>税</span><span>{CURRENCY_SYMBOL[active.currency]} {calcTax().toFixed(2)}</span></div>
            <div className="flex justify-between text-base font-bold border-t border-ink-200 pt-1 mt-1"><span>合计</span><span className="text-emerald-500">{CURRENCY_SYMBOL[active.currency]} {calcTotal().toFixed(2)}</span></div>
          </div>

          <div>
            <p className="text-xs font-bold mb-1">备注</p>
            <textarea value={active.notes} onChange={(e) => updateActive({ notes: e.target.value })} rows={2} className="w-full px-2 py-1.5 rounded bg-ink-50 text-xs outline-none resize-none" />
            <button onClick={runAI} disabled={loading} className="mt-1 px-2 h-6 rounded bg-emerald-500 text-white text-[10px] font-semibold flex items-center gap-1">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 备注
            </button>
            {aiNotes && (
              <div className="mt-1 p-2 rounded bg-emerald-50 border border-emerald-200/40">
                <p className="text-[10px] text-emerald-700 leading-relaxed">{aiNotes}</p>
                <button onClick={useAINotes} className="text-[10px] text-emerald-500 font-bold mt-0.5">使用</button>
              </div>
            )}
          </div>
        </div>
      )}

      {!active && (
        <div className="text-center py-8 text-ink-500">
          <Receipt className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有发票</p>
        </div>
      )}
    </div>
  )
}
