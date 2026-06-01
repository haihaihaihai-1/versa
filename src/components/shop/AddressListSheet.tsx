import { useState, useEffect } from 'react'
import { BottomSheet } from '../ui/BottomSheet'
import { useVersa, versa } from '../../store/versa'
import { Button } from '../ui/Button'
import { toast } from '../ui/Toaster'
import { Home, Briefcase, FileText, MapPin, Plus, Trash2, Check, Edit3, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { UserAddress } from '../../data/types'

const TAG_ICONS = { home: Home, work: Briefcase, school: FileText, other: MapPin }
const TAG_LABELS = { home: '家', work: '公司', school: '学校', other: '其他' }

export function AddressEditorSheet({ open, onClose, editing, onSave }: {
  open: boolean
  onClose: () => void
  editing: UserAddress | null
  onSave: (a: Omit<UserAddress, 'id'>) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [province, setProvince] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [detail, setDetail] = useState('')
  const [tag, setTag] = useState<UserAddress['tag']>('home')
  const [isDefault, setIsDefault] = useState(false)

  useEffect(() => {
    if (editing) {
      setName(editing.name); setPhone(editing.phone)
      setProvince(editing.province); setCity(editing.city); setDistrict(editing.district)
      setDetail(editing.detail); setTag(editing.tag); setIsDefault(editing.isDefault || false)
    } else {
      setName(''); setPhone(''); setProvince(''); setCity(''); setDistrict('')
      setDetail(''); setTag('home'); setIsDefault(false)
    }
  }, [editing, open])

  const submit = () => {
    if (!name.trim()) return toast('请输入收件人', 'error')
    if (!/^1\d{10}$/.test(phone.replace(/\D/g, ''))) return toast('请输入正确手机号', 'error')
    if (!province || !city || !district || !detail) return toast('请填完整地址', 'error')
    onSave({ name, phone, province, city, district, detail, tag, isDefault })
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={editing ? '编辑地址' : '新增地址'}>
      <div className="p-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-ink-500 mb-1.5 block">收件人</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入姓名"
            className="w-full h-10 px-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:border-shop-500"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-500 mb-1.5 block">手机号</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="请输入11位手机号"
            inputMode="numeric"
            className="w-full h-10 px-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:border-shop-500"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-medium text-ink-500 mb-1.5 block">省</label>
            <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="省" className="w-full h-10 px-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:border-shop-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-500 mb-1.5 block">市</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="市" className="w-full h-10 px-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:border-shop-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-500 mb-1.5 block">区</label>
            <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="区" className="w-full h-10 px-3 rounded-xl bg-ink-50/60 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:border-shop-500" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-ink-500 mb-1.5 block">详细地址</label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="街道、楼栋、门牌号等"
            rows={2}
            className="w-full px-3 py-2 rounded-xl bg-ink-50/60 dark:bg-ink-900/60 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:border-shop-500 resize-none"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-ink-500 mb-1.5 block">地址标签</label>
          <div className="flex gap-2 flex-wrap">
            {(['home', 'work', 'school', 'other'] as const).map((t) => {
              const Icon = TAG_ICONS[t]
              return (
                <button
                  key={t}
                  onClick={() => setTag(t)}
                  className={cn(
                    'inline-flex items-center gap-1 px-3 h-9 rounded-full text-sm font-medium transition-colors',
                    tag === t ? 'bg-shop-500 text-white' : 'bg-ink-100/60 dark:bg-ink-800/60 hover:bg-ink-200'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />{TAG_LABELS[t]}
                </button>
              )
            })}
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <button
            onClick={() => setIsDefault(!isDefault)}
            className={cn('w-11 h-6 rounded-full transition-colors flex-shrink-0', isDefault ? 'bg-shop-500' : 'bg-ink-300 dark:bg-ink-700')}
          >
            <div className={cn('w-5 h-5 rounded-full bg-white shadow-md transition-transform', isDefault ? 'translate-x-5' : 'translate-x-0.5')} />
          </button>
          <span className="text-sm">设为默认地址</span>
        </label>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">取消</Button>
          <Button onClick={submit} className="flex-[2]">保存</Button>
        </div>
      </div>
    </BottomSheet>
  )
}

export function AddressListSheet({ open, onClose, onSelect, currentId }: {
  open: boolean
  onClose: () => void
  onSelect: (a: UserAddress) => void
  currentId: string
}) {
  const { addresses } = useVersa()
  const [editing, setEditing] = useState<UserAddress | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const { addAddress, updateAddress, deleteAddress, setDefaultAddress } = versa

  return (
    <>
      <BottomSheet open={open && !editorOpen} onClose={onClose} title="选择收货地址">
        <div className="p-5 space-y-2">
          {addresses.map((a) => {
            const TagIcon = TAG_ICONS[a.tag || 'other']
            return (
              <button
                key={a.id}
                onClick={() => { onSelect(a); onClose() }}
                className={cn(
                  'w-full text-left p-3.5 rounded-2xl border-2 transition-all',
                  currentId === a.id ? 'border-shop-500 bg-shop-500/5' : 'border-ink-200/60 dark:border-ink-800/60 hover:border-shop-500/30'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm">{a.name}</span>
                      <span className="text-xs text-ink-500 tabular-nums">{a.phone}</span>
                      <span className={cn('inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium', a.tag === 'home' ? 'bg-blue-500/10 text-blue-600' : a.tag === 'work' ? 'bg-purple-500/10 text-purple-600' : a.tag === 'school' ? 'bg-green-500/10 text-green-600' : 'bg-ink-500/10 text-ink-600')}>
                        <TagIcon className="w-2.5 h-2.5" />{TAG_LABELS[a.tag || 'other']}
                      </span>
                      {a.isDefault && <span className="text-[10px] px-1.5 py-0.5 rounded bg-shop-500 text-white">默认</span>}
                    </div>
                    <div className="text-xs text-ink-600 dark:text-ink-300">{a.province} {a.city} {a.district} {a.detail}</div>
                  </div>
                  {currentId === a.id && <Check className="w-4 h-4 text-shop-500 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-ink-100/60 dark:border-ink-800/60">
                  {!a.isDefault && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDefaultAddress(a.id) }}
                      className="text-[11px] text-ink-500 hover:text-shop-600"
                    >设为默认</button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditing(a); setEditorOpen(true) }}
                    className="text-[11px] text-ink-500 hover:text-shop-600 inline-flex items-center gap-0.5"
                  >
                    <Edit3 className="w-2.5 h-2.5" />编辑
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); if (confirm('删除该地址？')) deleteAddress(a.id) }}
                    className="text-[11px] text-ink-500 hover:text-debate-500 inline-flex items-center gap-0.5"
                  >
                    <Trash2 className="w-2.5 h-2.5" />删除
                  </button>
                </div>
              </button>
            )
          })}
          <button
            onClick={() => { setEditing(null); setEditorOpen(true) }}
            className="w-full p-3.5 rounded-2xl border-2 border-dashed border-ink-300 dark:border-ink-700 text-sm text-ink-500 hover:border-shop-500 hover:text-shop-600 transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> 新增收货地址
          </button>
        </div>
      </BottomSheet>
      <AddressEditorSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        editing={editing}
        onSave={(a) => editing ? updateAddress(editing.id, a) : addAddress(a)}
      />
    </>
  )
}
