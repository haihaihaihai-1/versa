import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Car as CarIcon, FileText, Calendar, Hash, Gauge, Fuel, Wrench, Shield, CircleDot, Camera, Upload, Award, Sparkles } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Vehicle {
  make: string
  model: string
  year: number
  plate: string
  vin: string
  engineNo: string
  color: string
  purchaseDate: string
  purchasePrice: number
  currentKm: number
  fuelType: 'gasoline' | 'diesel' | 'hybrid' | 'ev' | 'phev'
  transmission: 'manual' | 'auto' | 'cvt' | 'dct'
  driveType: 'fwd' | 'rwd' | 'awd' | '4wd'
  displacement: string
  power: string
  seats: number
}

interface Doc {
  id: string
  name: string
  type: 'license' | 'insurance' | 'inspection' | 'manual' | 'warranty' | 'other'
  number: string
  issueDate: string
  expireDate: string
  note: string
}

const DOC_META = {
  license: { label: '行驶证', icon: FileText, color: 'from-blue-500 to-indigo-500' },
  insurance: { label: '保险单', icon: Shield, color: 'from-emerald-500 to-green-500' },
  inspection: { label: '年检', icon: Award, color: 'from-amber-500 to-orange-500' },
  manual: { label: '说明书', icon: FileText, color: 'from-violet-500 to-purple-500' },
  warranty: { label: '保修', icon: Shield, color: 'from-pink-500 to-rose-500' },
  other: { label: '其他', icon: FileText, color: 'from-zinc-500 to-zinc-600' },
} as const

const FUEL_META = {
  gasoline: { label: '汽油', icon: '⛽', color: 'from-rose-500 to-red-500' },
  diesel: { label: '柴油', icon: '🛢️', color: 'from-amber-700 to-orange-700' },
  hybrid: { label: '混动', icon: '🔋', color: 'from-emerald-500 to-green-500' },
  ev: { label: '纯电', icon: '⚡', color: 'from-cyan-500 to-blue-500' },
  phev: { label: '插混', icon: '🔌', color: 'from-violet-500 to-purple-500' },
} as const

const STORAGE_KEY = 'versa:vehicle-v1'
const DOCS_KEY = 'versa:vehicle-docs-v1'

function loadVeh(): Vehicle { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function saveVeh(d: Vehicle) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function loadDocs(): Doc[] { try { const s = localStorage.getItem(DOCS_KEY); if (s) return JSON.parse(s) } catch {} return seedDocs() }
function saveDocs(d: Doc[]) { try { localStorage.setItem(DOCS_KEY, JSON.stringify(d)) } catch {} }

function seed(): Vehicle {
  return {
    make: '丰田', model: '凯美瑞 2.5G', year: 2022, plate: '浙A·88888', vin: 'LFV2A21K8N4123456', engineNo: 'A25A-FKS-123456', color: '珍珠白',
    purchaseDate: '2022-09-15', purchasePrice: 215800, currentKm: 12500,
    fuelType: 'gasoline', transmission: 'auto', driveType: 'fwd',
    displacement: '2.5L', power: '154kW', seats: 5,
  }
}

function seedDocs(): Doc[] {
  return [
    { id: '1', name: '机动车行驶证', type: 'license', number: '33010620220915', issueDate: '2022-09-15', expireDate: '2032-09-15', note: '主页 + 副页' },
    { id: '2', name: '交强险保单', type: 'insurance', number: 'PDAA2022330106', issueDate: '2026-04-01', expireDate: '2027-04-01', note: '太平洋保险' },
    { id: '3', name: '商业险保单', type: 'insurance', number: 'TB2022330106', issueDate: '2026-04-01', expireDate: '2027-04-01', note: '车损 + 三者 300 万' },
    { id: '4', name: '车辆年检', type: 'inspection', number: 'YJ2024-330106', issueDate: '2024-09-20', expireDate: '2026-09-20', note: '6 年内免检标志' },
    { id: '5', name: '用户手册', type: 'manual', number: 'TMC-2022-CAMRY', issueDate: '2022-09-15', expireDate: '', note: '纸质 + 电子' },
    { id: '6', name: '原厂保修单', type: 'warranty', number: 'TCW-2022-CN', issueDate: '2022-09-15', expireDate: '2027-09-15', note: '3 年或 10 万 km' },
  ]
}

export function VehicleProfile() {
  const [veh, setVeh] = useState<Vehicle>(loadVeh())
  const [docs, setDocs] = useState<Doc[]>(loadDocs())
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Vehicle>(veh)
  const [showDocForm, setShowDocForm] = useState(false)
  const [docDraft, setDocDraft] = useState<Omit<Doc, 'id'>>({ name: '', type: 'license', number: '', issueDate: '', expireDate: '', note: '' })

  useEffect(() => { saveVeh(veh) }, [veh])
  useEffect(() => { saveDocs(docs) }, [docs])

  const today = new Date()
  const expiringSoon = docs.filter((d) => {
    if (!d.expireDate) return false
    const exp = new Date(d.expireDate)
    const days = Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return days <= 90 && days > 0
  }).length

  const carAge = today.getFullYear() - veh.year
  const depRate = ((veh.purchasePrice - veh.purchasePrice * Math.pow(0.85, carAge)) / veh.purchasePrice) * 100
  const depValue = veh.purchasePrice * Math.pow(0.85, carAge)
  const pricePerKm = veh.currentKm > 0 ? veh.purchasePrice / veh.currentKm : 0
  const fuelMeta = FUEL_META[veh.fuelType]

  const saveEdit = () => { setVeh(draft); setEditing(false); toast('已更新', 'success') }
  const addDoc = () => {
    if (!docDraft.name) { toast('请填写名称', 'error'); return }
    setDocs([...docs, { id: Math.random().toString(36).slice(2), ...docDraft }])
    setShowDocForm(false)
    setDocDraft({ ...docDraft, name: '', number: '' })
    toast('已添加', 'success')
  }
  const delDoc = (id: string) => { setDocs(docs.filter((d) => d.id !== id)); toast('已删除', 'success') }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-slate-500 via-zinc-600 to-stone-700 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <CarIcon className="w-5 h-5" />
          <h2 className="text-lg font-bold">我的爱车</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">车型档案 · 证件管理 · 折旧分析</p>
        <div className="rounded-xl bg-white/10 p-2 mb-2">
          <p className="text-xl font-bold text-center tracking-wider">{veh.plate}</p>
        </div>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{veh.make}</p><p className="text-[9px] opacity-80">品牌</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{veh.model.split(' ')[0]}</p><p className="text-[9px] opacity-80">车型</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{veh.year}</p><p className="text-[9px] opacity-80">年款</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{fuelMeta.icon}</p><p className="text-[9px] opacity-80">{fuelMeta.label}</p></div>
        </div>
      </div>

      <div className="flex gap-1">
        <button onClick={() => { setDraft(veh); setEditing(!editing) }} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-slate-500 to-zinc-600 text-white text-xs font-semibold">{editing ? '取消编辑' : '✏️ 编辑信息'}</button>
      </div>

      {editing ? (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">品牌</div>
              <input value={draft.make} onChange={(e) => setDraft({ ...draft, make: e.target.value })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">型号</div>
              <input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">年款</div>
              <input type="number" value={draft.year} onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">车牌</div>
              <input value={draft.plate} onChange={(e) => setDraft({ ...draft, plate: e.target.value })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">颜色</div>
              <input value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} className="w-full h-9 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
            <div>
              <div className="text-[10px] font-semibold text-ink-600 mb-0.5">里程 (km)</div>
              <input type="number" value={draft.currentKm} onChange={(e) => setDraft({ ...draft, currentKm: Number(e.target.value) })} className="w-full h-9 px-2 text-xs font-mono bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            </div>
          </div>
          <button onClick={saveEdit} className="w-full h-9 rounded-lg bg-slate-600 text-white text-xs font-semibold">保存</button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            <Row label="VIN 码" v={veh.vin} mono />
            <Row label="发动机号" v={veh.engineNo} mono />
            <Row label="排量" v={veh.displacement} />
            <Row label="最大功率" v={veh.power} />
            <Row label="变速箱" v={veh.transmission === 'auto' ? '自动' : veh.transmission === 'manual' ? '手动' : veh.transmission.toUpperCase()} />
            <Row label="驱动" v={veh.driveType === 'fwd' ? '前驱' : veh.driveType === 'rwd' ? '后驱' : veh.driveType === 'awd' ? '适时四驱' : '四驱'} />
            <Row label="座位数" v={`${veh.seats} 座`} />
            <Row label="购买日" v={veh.purchaseDate} />
            <Row label="当前里程" v={`${veh.currentKm.toLocaleString()} km`} />
            <Row label="已用年限" v={`${carAge} 年`} />
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 p-2.5 border border-amber-200/40">
        <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1.5 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />资产分析</div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="p-1.5 rounded-lg bg-white/40 dark:bg-ink-900/30">
            <p className="text-[9px] text-ink-500">购入价</p>
            <p className="text-sm font-mono font-bold text-amber-700">¥{(veh.purchasePrice / 10000).toFixed(1)}万</p>
          </div>
          <div className="p-1.5 rounded-lg bg-white/40 dark:bg-ink-900/30">
            <p className="text-[9px] text-ink-500">估算现值</p>
            <p className="text-sm font-mono font-bold text-emerald-600">¥{(depValue / 10000).toFixed(1)}万</p>
          </div>
          <div className="p-1.5 rounded-lg bg-white/40 dark:bg-ink-900/30">
            <p className="text-[9px] text-ink-500">每 km 成本</p>
            <p className="text-sm font-mono font-bold text-cyan-600">¥{pricePerKm.toFixed(2)}</p>
          </div>
        </div>
        <p className="text-[10px] text-ink-500 mt-1.5">📉 年折旧率 ~15% (首年 20%, 次年 15%, 第 3 年起 10%)</p>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-ink-700 dark:text-ink-300">📁 车辆证件 ({docs.length})</span>
          {expiringSoon > 0 && <span className="text-[10px] bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded">{expiringSoon} 项将到期</span>}
        </div>
        <button onClick={() => setShowDocForm(!showDocForm)} className="w-full h-7 rounded bg-ink-100 dark:bg-ink-800 text-[10px] text-ink-600 mb-1.5">{showDocForm ? '收起' : '+ 添加证件'}</button>
        {showDocForm && (
          <div className="rounded-xl bg-ink-50/60 dark:bg-ink-950/40 p-2 space-y-1 mb-2">
            <input value={docDraft.name} onChange={(e) => setDocDraft({ ...docDraft, name: e.target.value })} placeholder="证件名称" className="w-full h-7 px-2 text-[10px] bg-white dark:bg-ink-900 rounded border border-ink-200/40" />
            <div className="grid grid-cols-2 gap-1">
              <input value={docDraft.number} onChange={(e) => setDocDraft({ ...docDraft, number: e.target.value })} placeholder="编号" className="h-7 px-2 text-[10px] font-mono bg-white dark:bg-ink-900 rounded border border-ink-200/40" />
              <select value={docDraft.type} onChange={(e) => setDocDraft({ ...docDraft, type: e.target.value as any })} className="h-7 px-2 text-[10px] bg-white dark:bg-ink-900 rounded border border-ink-200/40">
                {Object.keys(DOC_META).map((t) => <option key={t} value={t}>{DOC_META[t as keyof typeof DOC_META].label}</option>)}
              </select>
              <input type="date" value={docDraft.issueDate} onChange={(e) => setDocDraft({ ...docDraft, issueDate: e.target.value })} className="h-7 px-2 text-[10px] bg-white dark:bg-ink-900 rounded border border-ink-200/40" />
              <input type="date" value={docDraft.expireDate} onChange={(e) => setDocDraft({ ...docDraft, expireDate: e.target.value })} className="h-7 px-2 text-[10px] bg-white dark:bg-ink-900 rounded border border-ink-200/40" />
            </div>
            <button onClick={addDoc} className="w-full h-7 rounded bg-slate-600 text-white text-[10px] font-semibold">保存</button>
          </div>
        )}
        <div className="space-y-1">
          {docs.map((d) => {
            const meta = DOC_META[d.type]
            const Icon = meta.icon
            const expDays = d.expireDate ? Math.floor((new Date(d.expireDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0
            const expiring = expDays <= 90 && expDays > 0
            return (
              <div key={d.id} className={cn('p-1.5 rounded-lg flex items-center gap-1.5', expiring ? 'bg-rose-50/40 dark:bg-rose-900/10' : 'bg-ink-50/40 dark:bg-ink-800/30')}>
                <div className={cn('w-6 h-6 rounded-md flex items-center justify-center bg-gradient-to-br text-white', meta.color)}>
                  <Icon className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-ink-800 dark:text-ink-200 truncate">{d.name}</p>
                  <p className="text-[9px] text-ink-500 font-mono">{d.number}</p>
                </div>
                {d.expireDate && <span className={cn('text-[9px] px-1.5 py-0.5 rounded', expiring ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700')}>{expiring ? `${expDays}天` : d.expireDate.slice(2)}</span>}
                <button onClick={() => delDoc(d.id)} className="text-ink-300 hover:text-rose-500 text-[10px]">✕</button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Row({ label, v, mono }: { label: string; v: string; mono?: boolean }) {
  return (
    <div className="p-1.5 rounded-lg bg-ink-50/60 dark:bg-ink-800/40">
      <p className="text-[9px] text-ink-500">{label}</p>
      <p className={cn('text-[11px] font-semibold text-ink-800 dark:text-ink-200 truncate', mono && 'font-mono')}>{v}</p>
    </div>
  )
}
