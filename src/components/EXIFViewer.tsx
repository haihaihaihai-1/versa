import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Aperture, Camera, MapPin, Calendar, Tag, FileText, Hash, Plus, Trash2, Save, Copy, Check, Eye, Search, Camera as CameraIcon, Sparkles, ChevronDown } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { toast } from './ui/Toaster'

interface ExifData {
  id: string
  filename: string
  camera: string
  lens: string
  aperture: string
  shutter: string
  iso: number
  focal: number
  flash: 'on' | 'off' | 'auto'
  wb: string
  metering: string
  fileSize: number
  width: number
  height: number
  takenAt: string
  location: string
  notes: string
}

const STORAGE_KEY = 'versa:exif-v1'

function load(): ExifData[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: ExifData[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): ExifData[] {
  return [
    { id: '1', filename: 'IMG_0001.ARW', camera: 'Sony A7M4', lens: '24-70mm f/2.8 GM II', aperture: 'f/2.8', shutter: '1/200s', iso: 400, focal: 50, flash: 'off', wb: '自动', metering: '点测光', fileSize: 45.2, width: 7008, height: 4672, takenAt: new Date(Date.now() - 86400_000 * 3).toISOString(), location: '外滩', notes: '夜景人像, ISO 控制在 1600 以内' },
  ]
}

const CAMERAS = ['Sony A7M4', 'Canon R5', 'Fuji X-T5', 'Nikon Z9', 'Leica Q3', '其他']
const LENSES = ['24-70mm f/2.8', '70-200mm f/2.8', '35mm f/1.4', '50mm f/1.8', '85mm f/1.4', '100mm Macro', '16-35mm f/4', '其他']
const WB_OPTIONS = ['自动', '日光', '阴天', '阴影', '钨丝灯', '荧光灯', '闪光灯', '自定义']
const METERING = ['矩阵测光', '中央重点', '点测光', '评价测光']

export function EXIFViewer() {
  const [list, setList] = useState<ExifData[]>(load())
  const [activeId, setActiveId] = useState<string | null>(list[0]?.id || null)
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<Partial<ExifData>>({ camera: CAMERAS[0], lens: LENSES[0], aperture: 'f/8', shutter: '1/125s', iso: 200, focal: 50, flash: 'off', wb: '自动', metering: '点测光' })

  useEffect(() => { save(list) }, [list])
  const active = list.find((e) => e.id === activeId) || null

  const add = () => {
    if (!form.filename?.trim()) { toast('请输入文件名', 'error'); return }
    const e: ExifData = {
      id: uid(),
      filename: form.filename!,
      camera: form.camera || '未知',
      lens: form.lens || '',
      aperture: form.aperture || 'f/8',
      shutter: form.shutter || '1/125s',
      iso: form.iso || 200,
      focal: form.focal || 50,
      flash: (form.flash as any) || 'off',
      wb: form.wb || '自动',
      metering: form.metering || '点测光',
      fileSize: form.fileSize || 30,
      width: form.width || 6000,
      height: form.height || 4000,
      takenAt: new Date().toISOString(),
      location: form.location || '未知',
      notes: form.notes || '',
    }
    setList([e, ...list])
    setActiveId(e.id)
    setAdding(false)
    setForm({ camera: CAMERAS[0], lens: LENSES[0], aperture: 'f/8', shutter: '1/125s', iso: 200, focal: 50, flash: 'off', wb: '自动', metering: '点测光' })
    toast('已添加', 'success')
  }

  const del = (id: string) => { setList(list.filter((e) => e.id !== id)); if (activeId === id) setActiveId(null); toast('已删除', 'success') }
  const copy = (val: string) => { navigator.clipboard?.writeText(val); toast('已复制', 'success') }

  const filtered = list.filter((e) => !search || e.filename.toLowerCase().includes(search.toLowerCase()) || e.camera.toLowerCase().includes(search.toLowerCase()) || e.location.toLowerCase().includes(search.toLowerCase()))

  const exposure = (() => {
    if (!active) return null
    const apertureNum = parseFloat(active.aperture.replace('f/', ''))
    const shutterNum = active.shutter.includes('/') ? (1 / parseFloat(active.shutter.split('/')[1])) : parseFloat(active.shutter)
    const ev = Math.log2((apertureNum * apertureNum) / shutterNum) - Math.log2(active.iso / 100)
    return { ev: ev.toFixed(1), apertureNum, shutterNum }
  })()

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Aperture className="w-5 h-5" />
          <h2 className="text-lg font-bold">EXIF 查看器</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">光圈/快门/ISO · EV 计算 · 完整元数据</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{list.length}</p><p className="text-[9px] opacity-80">照片</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{new Set(list.map((e) => e.camera)).size}</p><p className="text-[9px] opacity-80">机型</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{new Set(list.map((e) => e.lens)).size}</p><p className="text-[9px] opacity-80">镜头</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{exposure ? exposure.ev : '-'}</p><p className="text-[9px] opacity-80">当前 EV</p></div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-4 space-y-1.5">
          <div className="flex gap-1">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索..." className="w-full h-7 pl-7 pr-2 text-[10px] bg-white/60 dark:bg-ink-900/40 rounded-lg border border-ink-200/40" />
            </div>
            <button onClick={() => setAdding(true)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white"><Plus className="w-3.5 h-3.5" /></button>
          </div>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {filtered.length === 0 && <p className="text-[10px] text-ink-400 text-center py-3">暂无</p>}
            {filtered.map((e) => (
              <button key={e.id} onClick={() => setActiveId(e.id)} className={cn('w-full p-1.5 rounded-lg text-left border transition-all', activeId === e.id ? 'border-cyan-400 bg-cyan-50/40 dark:bg-cyan-900/20' : 'border-ink-200/40 bg-white/40 dark:bg-ink-900/30')}>
                <p className="text-[10px] font-bold text-ink-800 dark:text-ink-200 truncate">📷 {e.filename}</p>
                <p className="text-[9px] text-ink-500 truncate">{e.camera} · {e.aperture} · {e.shutter}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-8 space-y-1.5">
          {active ? (
            <>
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 flex items-center justify-center text-6xl text-white/50 relative">
                <Camera className="w-16 h-16" />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] text-white/90 font-mono">
                  <span>{active.width}×{active.height}</span>
                  <span>{active.fileSize.toFixed(1)} MB</span>
                </div>
              </div>
              <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40 space-y-1">
                <h3 className="text-sm font-bold truncate">📷 {active.filename}</h3>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <Cell icon="📷" label="机身" v={active.camera} />
                  <Cell icon="🔍" label="镜头" v={active.lens} />
                  <Cell icon="🔆" label="光圈" v={active.aperture} highlight />
                  <Cell icon="⏱️" label="快门" v={active.shutter} highlight />
                  <Cell icon="📊" label="ISO" v={String(active.iso)} highlight />
                  <Cell icon="📏" label="焦距" v={active.focal + 'mm'} />
                  <Cell icon="💡" label="闪光灯" v={active.flash === 'on' ? '开启' : active.flash === 'off' ? '关闭' : '自动'} />
                  <Cell icon="🌡️" label="白平衡" v={active.wb} />
                  <Cell icon="🎯" label="测光" v={active.metering} />
                  <Cell icon="📍" label="地点" v={active.location} />
                </div>
                {exposure && (
                  <div className="mt-1 p-1.5 rounded-lg bg-cyan-50/40 dark:bg-cyan-900/20 text-[10px] text-cyan-700 dark:text-cyan-300">
                    <p className="font-semibold">📊 曝光分析</p>
                    <p>EV{active.aperture} {active.shutter} ISO{active.iso} = 曝光值 <b>EV {exposure.ev}</b> ({parseFloat(exposure.ev) > 12 ? '过曝' : parseFloat(exposure.ev) < 6 ? '欠曝' : '正常'})</p>
                  </div>
                )}
                {active.notes && (
                  <div className="mt-1 p-1.5 rounded-lg bg-ink-50 dark:bg-ink-800/40 text-[10px] text-ink-700 dark:text-ink-300">
                    <p className="font-semibold mb-0.5">📝 拍摄笔记</p>
                    <p>{active.notes}</p>
                  </div>
                )}
                <div className="flex items-center gap-1 text-[9px] text-ink-500">
                  <Calendar className="w-3 h-3" />{new Date(active.takenAt).toLocaleString('zh-CN')}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => copy(JSON.stringify({ ...active, id: undefined }, null, 2))} className="flex-1 h-7 rounded bg-cyan-500 text-white text-[10px] font-semibold">复制 EXIF</button>
                  <button onClick={() => del(active.id)} className="h-7 w-7 rounded bg-rose-500 text-white flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            </>
          ) : (
            <div className="aspect-video rounded-2xl bg-ink-50 dark:bg-ink-900/30 flex items-center justify-center text-ink-400 text-xs">选择照片查看 EXIF</div>
          )}
        </div>
      </div>

      {adding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={() => setAdding(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white dark:bg-ink-900 p-3 space-y-2 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold">添加 EXIF</h3>
            <input value={form.filename || ''} onChange={(e) => setForm({ ...form, filename: e.target.value })} placeholder="文件名 (如 IMG_0001.ARW)" className="w-full h-9 px-3 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <div className="text-[10px] font-semibold mb-1">机身</div>
                <select value={form.camera} onChange={(e) => setForm({ ...form, camera: e.target.value })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
                  {CAMERAS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[10px] font-semibold mb-1">镜头</div>
                <select value={form.lens} onChange={(e) => setForm({ ...form, lens: e.target.value })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
                  {LENSES.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[10px] font-semibold mb-1">光圈</div>
                <input value={form.aperture} onChange={(e) => setForm({ ...form, aperture: e.target.value })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
              </div>
              <div>
                <div className="text-[10px] font-semibold mb-1">快门</div>
                <input value={form.shutter} onChange={(e) => setForm({ ...form, shutter: e.target.value })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
              </div>
              <div>
                <div className="text-[10px] font-semibold mb-1">ISO</div>
                <input type="number" value={form.iso} onChange={(e) => setForm({ ...form, iso: Number(e.target.value) })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
              </div>
              <div>
                <div className="text-[10px] font-semibold mb-1">焦距 (mm)</div>
                <input type="number" value={form.focal} onChange={(e) => setForm({ ...form, focal: Number(e.target.value) })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
              </div>
              <div>
                <div className="text-[10px] font-semibold mb-1">白平衡</div>
                <select value={form.wb} onChange={(e) => setForm({ ...form, wb: e.target.value })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
                  {WB_OPTIONS.map((w) => <option key={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <div className="text-[10px] font-semibold mb-1">测光</div>
                <select value={form.metering} onChange={(e) => setForm({ ...form, metering: e.target.value })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
                  {METERING.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="拍摄地点" className="w-full h-9 px-3 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
            <textarea value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="拍摄笔记..." className="w-full h-14 px-3 py-1.5 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 resize-none" />
            <div className="flex gap-1">
              <button onClick={() => setAdding(false)} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">取消</button>
              <button onClick={add} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold">添加</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Cell({ icon, label, v, highlight }: { icon: string; label: string; v: string; highlight?: boolean }) {
  return (
    <div className={cn('p-1.5 rounded-lg', highlight ? 'bg-cyan-50/60 dark:bg-cyan-900/20' : 'bg-ink-50/60 dark:bg-ink-800/40')}>
      <p className="text-[9px] text-ink-500">{icon} {label}</p>
      <p className={cn('font-bold', highlight ? 'text-cyan-600 dark:text-cyan-300' : 'text-ink-800 dark:text-ink-200')}>{v}</p>
    </div>
  )
}
