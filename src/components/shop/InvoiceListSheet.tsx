import { useState, useEffect } from 'react'
import { BottomSheet } from '../ui/BottomSheet'
import { useVersa, versa } from '../../store/versa'
import { Button } from '../ui/Button'
import { toast } from '../ui/Toaster'
import { Receipt, FileText, Building2, Plus, Trash2, Check, ChevronRight, Mail, Hash } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { UserInvoice } from '../../data/types'

const TAX_ID_REGEX = /^[0-9A-Z]{15,20}$/

export function InvoiceEditorSheet({ open, onClose, editing, onSave }: {
  open: boolean
  onClose: () => void
  editing: UserInvoice | null
  onSave: (inv: Omit<UserInvoice, 'id'>) => void
}) {
  const [type, setType] = useState<'personal' | 'company'>('personal')
  const [title, setTitle] = useState('')
  const [taxId, setTaxId] = useState('')
  const [email, setEmail] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (editing) {
      setType(editing.type); setTitle(editing.title); setTaxId(editing.taxId || '')
      setEmail(editing.email || ''); setIsDefault(editing.isDefault || false)
    } else {
      setType('personal'); setTitle(''); setTaxId(''); setEmail(''); setIsDefault(false)
    }
    setTouched(false)
  }, [editing, open])

  const submit = () => {
    setTouched(true)
    if (!title.trim()) return toast('请填写抬头', 'error')
    if (type === 'company' && !TAX_ID_REGEX.test(taxId)) return toast('税号格式不正确 (15-20 位数字或大写字母)', 'error')
    if (!email.includes('@')) return toast('请填写正确邮箱', 'error')
    onSave({ type, title, taxId: type === 'company' ? taxId : undefined, email, isDefault })
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={editing ? '编辑发票抬头' : '新增发票抬头'}>
      <div className="p-5 space-y-4">
        {/* 类型 */}
        <div>
          <label className="text-xs font-medium text-ink-500 mb-1.5 block">发票类型</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: 'personal', l: '个人', d: '个人电子普票', icon: FileText, color: 'from-cyan-500 to-blue-500' },
              { v: 'company', l: '企业', d: '增值税专用发票', icon: Building2, color: 'from-violet-500 to-purple-500' },
            ].map((t) => (
              <button
                key={t.v}
                onClick={() => setType(t.v as any)}
                className={cn(
                  'p-3.5 rounded-2xl border-2 text-left transition-all',
                  type === t.v ? 'border-shop-500 bg-shop-500/5' : 'border-ink-200/60 dark:border-ink-800/60'
                )}
              >
                <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center mb-2', t.color)}>
                  <t.icon className="w-4 h-4 text-white" />
                </div>
                <div className="font-semibold text-sm">{t.l}</div>
                <div className="text-[10px] text-ink-500 mt-0.5">{t.d}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 抬头 */}
        <div>
          <label className="text-xs font-medium text-ink-500 mb-1.5 block">发票抬头</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={type === 'personal' ? '个人姓名' : '公司全称'}
            className="w-full h-10 px-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:border-shop-500"
          />
          {touched && !title && <div className="text-[11px] text-debate-500 mt-1">抬头不能为空</div>}
        </div>

        {/* 税号 */}
        {type === 'company' && (
          <div>
            <label className="text-xs font-medium text-ink-500 mb-1.5 block">税号</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
              <input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                placeholder="15-20 位数字或大写字母"
                className={cn('w-full h-10 pl-9 pr-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/60 border text-sm outline-none focus:border-shop-500', touched && !TAX_ID_REGEX.test(taxId) ? 'border-debate-500' : 'border-ink-200/60 dark:border-ink-800/60')}
              />
            </div>
            {touched && !TAX_ID_REGEX.test(taxId) && <div className="text-[11px] text-debate-500 mt-1">税号格式不正确</div>}
          </div>
        )}

        {/* 邮箱 */}
        <div>
          <label className="text-xs font-medium text-ink-500 mb-1.5 block">收票邮箱</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="发票将发送到此邮箱"
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:border-shop-500"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <button
            onClick={() => setIsDefault(!isDefault)}
            className={cn('w-11 h-6 rounded-full transition-colors flex-shrink-0', isDefault ? 'bg-shop-500' : 'bg-ink-300 dark:bg-ink-700')}
          >
            <div className={cn('w-5 h-5 rounded-full bg-white shadow-md transition-transform', isDefault ? 'translate-x-5' : 'translate-x-0.5')} />
          </button>
          <span className="text-sm">设为默认抬头</span>
        </label>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={submit} className="flex-[2]">保存</Button>
        </div>
      </div>
    </BottomSheet>
  )
}

export function InvoiceListSheet({ open, onClose, onSelect, currentId }: {
  open: boolean
  onClose: () => void
  onSelect: (i: UserInvoice | null) => void
  currentId: string | null
}) {
  const { invoices } = useVersa()
  const { deleteInvoice, setDefaultInvoice, addInvoice, updateInvoice } = versa
  const [editing, setEditing] = useState<UserInvoice | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  return (
    <>
      <BottomSheet open={open && !editorOpen} onClose={onClose} title="选择发票">
        <div className="p-5 space-y-2">
          <button
            onClick={() => { onSelect(null); onClose() }}
            className={cn(
              'w-full p-3.5 rounded-2xl border-2 text-left transition-all',
              !currentId ? 'border-shop-500 bg-shop-500/5' : 'border-ink-200/60 dark:border-ink-800/60'
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-ink-500/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-ink-500" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">不开发票</div>
                <div className="text-[11px] text-ink-500 mt-0.5">如需发票，请选择下方抬头</div>
              </div>
              {!currentId && <Check className="w-4 h-4 text-shop-500" />}
            </div>
          </button>

          {invoices.map((inv) => {
            const isSel = currentId === inv.id
            return (
              <button
                key={inv.id}
                onClick={() => { onSelect(inv); onClose() }}
                className={cn(
                  'w-full text-left p-3.5 rounded-2xl border-2 transition-all',
                  isSel ? 'border-shop-500 bg-shop-500/5' : 'border-ink-200/60 dark:border-ink-800/60 hover:border-shop-500/30'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={cn('inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium', inv.type === 'personal' ? 'bg-cyan-500/10 text-cyan-600' : 'bg-violet-500/10 text-violet-600')}>
                        {inv.type === 'personal' ? '个人' : '企业'}
                      </span>
                      <span className="font-semibold text-sm">{inv.title}</span>
                      {inv.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded bg-shop-500 text-white">默认</span>}
                    </div>
                    {inv.taxId && <div className="text-[11px] text-ink-500 font-mono">税号：{inv.taxId}</div>}
                    {inv.email && <div className="text-[11px] text-ink-500">收票邮箱：{inv.email}</div>}
                  </div>
                  {isSel && <Check className="w-4 h-4 text-shop-500 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-ink-100/60 dark:border-ink-800/60">
                  {!inv.isDefault && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDefaultInvoice(inv.id) }}
                      className="text-[11px] text-ink-500 hover:text-shop-600"
                    >设为默认</button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(inv); setEditorOpen(true) }}
                    className="text-[11px] text-ink-500 hover:text-shop-600"
                  >编辑</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm('删除该抬头？')) deleteInvoice(inv.id) }}
                    className="text-[11px] text-ink-500 hover:text-debate-500"
                  >删除</button>
                </div>
              </button>
            )
          })}
          <button
            onClick={() => { setEditing(null); setEditorOpen(true) }}
            className="w-full p-3.5 rounded-2xl border-2 border-dashed border-ink-300 dark:border-ink-700 text-sm text-ink-500 hover:border-shop-500 hover:text-shop-600 transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> 新增发票抬头
          </button>
        </div>
      </BottomSheet>
      <InvoiceEditorSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editing={editing}
        onSave={(inv) => editing ? updateInvoice(editing.id, inv) : addInvoice(inv)}
      />
    </>
  )
}
