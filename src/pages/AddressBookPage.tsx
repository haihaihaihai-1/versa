import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, Plus, Edit3, Trash2, Star, Home as HomeIcon, Briefcase, GraduationCap,
  Coffee, Phone, User as UserIcon, ChevronRight, X, Check
} from 'lucide-react'
import { useVersa, versa } from '../store/versa'
import type { UserAddress } from '../data/types'

const TAGS = [
  { key: 'home', label: '家', icon: HomeIcon, color: 'text-rose-500', bg: 'bg-rose-100' },
  { key: 'work', label: '公司', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-100' },
  { key: 'school', label: '学校', icon: GraduationCap, color: 'text-amber-500', bg: 'bg-amber-100' },
  { key: 'other', label: '其他', icon: Coffee, color: 'text-violet-500', bg: 'bg-violet-100' },
] as const

const REGIONS = [
  '北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '南京市', '武汉市', '西安市', '重庆市',
  '苏州市', '天津市', '长沙市', '青岛市', '宁波市', '无锡市', '厦门市', '福州市', '济南市', '合肥市',
]

export default function AddressBookPage() {
  const { addresses } = useVersa()
  const navigate = useNavigate()
  const [editing, setEditing] = useState<UserAddress | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const tagIcon = (tag: string) => TAGS.find((t) => t.key === tag)?.icon || MapPin
  const tagLabel = (tag: string) => TAGS.find((t) => t.key === tag)?.label || '其他'
  const tagColor = (tag: string) => TAGS.find((t) => t.key === tag)?.color || 'text-ink-500'
  const tagBg = (tag: string) => TAGS.find((t) => t.key === tag)?.bg || 'bg-ink-100'

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-white to-teal-50/30 pb-20">
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-white border border-ink-200 flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
          <h1 className="text-xl font-bold flex-1">收货地址</h1>
          <button
            onClick={() => { setEditing(null); setEditorOpen(true) }}
            className="px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />新增
          </button>
        </div>

        <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-start gap-2">
          <MapPin className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-700">您共有 <strong>{addresses.length}</strong> 个收货地址，最多可保存 20 个</p>
        </div>

        {addresses.length === 0 ? (
          <div className="text-center py-20 text-ink-400">
            <MapPin className="w-12 h-12 mx-auto mb-2 text-ink-300" />
            <p className="text-sm">还没有收货地址</p>
            <button
              onClick={() => { setEditing(null); setEditorOpen(true) }}
              className="mt-3 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm"
            >添加地址</button>
          </div>
        ) : (
          <div className="space-y-3">
            {addresses.map((a) => {
              const Icon = tagIcon(a.tag || 'other')
              return (
                <div
                  key={a.id}
                  className={`p-4 rounded-2xl border ${
                    a.isDefault ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200' : 'bg-white border-ink-100'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg ${tagBg(a.tag || 'other')} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${tagColor(a.tag || 'other')}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-ink-800">{a.name}</span>
                          <span className="text-xs text-ink-500">{a.phone}</span>
                          {a.isDefault && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-medium flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-white" />默认
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-600 mt-0.5">
                          {a.province} {a.city} {a.district} {a.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-ink-100">
                    <button
                      onClick={() => { setEditing(a); setEditorOpen(true) }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-100 rounded-lg"
                    >
                      <Edit3 className="w-3 h-3" />编辑
                    </button>
                    {!a.isDefault && (
                      <button
                        onClick={() => versa.setDefaultAddress(a.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded-lg"
                      >
                        <Star className="w-3 h-3" />设为默认
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm('删除该地址？')) versa.deleteAddress(a.id) }}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-500 hover:bg-rose-50 rounded-lg ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />删除
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {editorOpen && (
        <AddressEditor
          address={editing}
          onClose={() => { setEditorOpen(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function AddressEditor({ address, onClose }: { address: UserAddress | null; onClose: () => void }) {
  const [name, setName] = useState(address?.name || '')
  const [phone, setPhone] = useState(address?.phone || '')
  const [province, setProvince] = useState(address?.province || '上海市')
  const [city, setCity] = useState(address?.city || '徐汇区')
  const [detail, setDetail] = useState(address?.detail || '')
  const [tag, setTag] = useState<'home' | 'work' | 'school' | 'other'>(address?.tag || 'home')
  const [isDefault, setIsDefault] = useState(address?.isDefault || false)

  const handleSave = () => {
    if (!name.trim() || !phone.trim() || !detail.trim()) {
      alert('请填写完整信息')
      return
    }
    if (!/^1\d{10}$/.test(phone)) {
      alert('请输入正确的手机号')
      return
    }
    const data = { name, phone, province, city, district: city, detail, tag, isDefault }
    if (address) versa.updateAddress(address.id, data)
    else versa.addAddress(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-h-[90vh] bg-white rounded-t-2xl overflow-hidden flex flex-col">
        <div className="p-4 border-b border-ink-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{address ? '编辑地址' : '新增地址'}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-ink-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <Field icon={UserIcon} label="收货人">
            <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 px-2 py-1.5 bg-transparent text-sm focus:outline-none" placeholder="姓名" />
          </Field>
          <Field icon={Phone} label="手机号">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="flex-1 px-2 py-1.5 bg-transparent text-sm focus:outline-none" placeholder="11 位手机号" />
          </Field>
          <Field icon={MapPin} label="所在地区">
            <select value={province} onChange={(e) => setProvince(e.target.value)} className="bg-transparent text-sm focus:outline-none flex-1">
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field icon={MapPin} label="区/县">
            <input value={city} onChange={(e) => setCity(e.target.value)} className="flex-1 px-2 py-1.5 bg-transparent text-sm focus:outline-none" placeholder="如：徐汇区" />
          </Field>
          <Field icon={MapPin} label="详细地址">
            <input value={detail} onChange={(e) => setDetail(e.target.value)} className="flex-1 px-2 py-1.5 bg-transparent text-sm focus:outline-none" placeholder="街道、楼栋、门牌号" />
          </Field>

          <div>
            <p className="text-xs text-ink-500 mb-2">标签</p>
            <div className="grid grid-cols-4 gap-2">
              {TAGS.map((t) => {
                const Icon = t.icon
                const active = tag === t.key
                return (
                  <button
                    key={t.key}
                    onClick={() => setTag(t.key)}
                    className={`p-2.5 rounded-xl border text-center ${
                      active ? `${t.bg} border-current` : 'bg-white border-ink-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mx-auto ${active ? t.color : 'text-ink-500'}`} />
                    <p className={`text-xs mt-1 ${active ? t.color : 'text-ink-600'}`}>{t.label}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 p-2 cursor-pointer">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-4 h-4" />
            <span className="text-sm text-ink-700">设为默认地址</span>
          </label>
        </div>

        <div className="p-3 border-t border-ink-100 flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 border border-ink-200 rounded-xl text-sm">取消</button>
          <button onClick={handleSave} className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl text-sm font-medium">保存</button>
        </div>
      </div>
    </div>
  )
}

function Field({ icon: Icon, label, children }: any) {
  return (
    <div className="flex items-center gap-2 p-3 bg-ink-50 rounded-xl">
      <Icon className="w-4 h-4 text-ink-500 flex-shrink-0" />
      <div className="flex-1 flex items-center">
        <span className="text-xs text-ink-500 w-16 flex-shrink-0">{label}</span>
        {children}
      </div>
    </div>
  )
}
