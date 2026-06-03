import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, Plus, Trash2, Heart, Search, Tag, Calendar, MapPin, Camera, Filter, Grid3x3, Layers, Eye, Aperture, Shuffle, Download, X } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Photo {
  id: string
  title: string
  description: string
  category: 'portrait' | 'landscape' | 'street' | 'macro' | 'night' | 'food' | 'architecture' | 'nature' | 'event' | 'other'
  mood: string
  tags: string[]
  location: string
  date: string
  camera: string
  lens: string
  aperture: string
  shutter: string
  iso: number
  focal: number
  liked: boolean
  colors: string[]
}

const STORAGE_KEY = 'versa:photos-v1'

function load(): Photo[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Photo[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Photo[] {
  const today = new Date().toISOString()
  return [
    { id: '1', title: '晨雾山林', description: '清晨 5 点爬上山顶, 雾气在松林间缓缓流动', category: 'landscape', mood: '静谧', tags: ['山', '雾', '清晨'], location: '黄山', date: today, camera: 'Sony A7M4', lens: '24-70mm f/2.8', aperture: 'f/8', shutter: '1/60s', iso: 200, focal: 35, liked: true, colors: ['#84cc16', '#10b981', '#06b6d4'] },
    { id: '2', title: '城市霓虹', description: '雨后的街道倒映着霓虹灯, 充满赛博朋克感', category: 'street', mood: '迷幻', tags: ['街拍', '夜', '雨'], location: '上海', date: today, camera: 'Fuji X-T5', lens: '35mm f/1.4', aperture: 'f/2', shutter: '1/30s', iso: 1600, focal: 35, liked: true, colors: ['#ec4899', '#a855f7', '#06b6d4'] },
    { id: '3', title: '奶奶的窗台', description: '午后阳光下的多肉植物, 岁月静好', category: 'macro', mood: '温暖', tags: ['植物', '光影'], location: '家里', date: today, camera: 'Canon R6', lens: '100mm f/2.8 Macro', aperture: 'f/4', shutter: '1/200s', iso: 100, focal: 100, liked: false, colors: ['#f59e0b', '#84cc16', '#f97316'] },
  ]
}

const CAT_META = {
  portrait: { label: '人像', icon: '👤', color: 'from-rose-500 to-pink-500' },
  landscape: { label: '风光', icon: '🏔️', color: 'from-emerald-500 to-green-500' },
  street: { label: '街拍', icon: '🌆', color: 'from-violet-500 to-purple-500' },
  macro: { label: '微距', icon: '🌸', color: 'from-pink-500 to-fuchsia-500' },
  night: { label: '夜景', icon: '🌃', color: 'from-indigo-500 to-blue-600' },
  food: { label: '美食', icon: '🍜', color: 'from-amber-500 to-orange-500' },
  architecture: { label: '建筑', icon: '🏛️', color: 'from-cyan-500 to-teal-500' },
  nature: { label: '自然', icon: '🌿', color: 'from-green-500 to-emerald-500' },
  event: { label: '活动', icon: '🎉', color: 'from-yellow-500 to-amber-500' },
  other: { label: '其他', icon: '📷', color: 'from-zinc-500 to-zinc-600' },
} as const

const CAMERAS = ['Sony A7M4', 'Canon R5', 'Fuji X-T5', 'Nikon Z6', 'Leica Q3', 'iPhone 15 Pro', 'DJI Mini 4 Pro', '其他']
const MOODS = ['温暖', '静谧', '迷幻', '欢快', '忧郁', '震撼', '清新', '复古', '极简', '梦幻']
const PALETTES = [
  ['#fbbf24', '#fb923c', '#f472b6'],
  ['#06b6d4', '#3b82f6', '#8b5cf6'],
  ['#10b981', '#34d399', '#a7f3d0'],
  ['#f43f5e', '#ec4899', '#a855f7'],
  ['#f59e0b', '#ef4444', '#7c2d12'],
  ['#0ea5e9', '#0891b2', '#155e75'],
  ['#84cc16', '#65a30d', '#3f6212'],
]

export function PhotoAlbum() {
  const [photos, setPhotos] = useState<Photo[]>(load())
  const [adding, setAdding] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filterCat, setFilterCat] = useState<keyof typeof CAT_META | 'all' | 'liked'>('all')
  const [search, setSearch] = useState('')
  const [active, setActive] = useState<Photo | null>(null)
  const [palette, setPalette] = useState(0)
  const [form, setForm] = useState<Partial<Photo>>({ category: 'landscape', mood: '静谧', camera: CAMERAS[0], lens: '24-70mm f/2.8', aperture: 'f/8', shutter: '1/125s', iso: 200, focal: 50 })

  useEffect(() => { save(photos) }, [photos])

  const add = () => {
    if (!form.title?.trim()) { toast('请输入标题', 'error'); return }
    const p: Photo = {
      id: uid(),
      title: form.title!,
      description: form.description || '',
      category: (form.category as any) || 'other',
      mood: form.mood || '温暖',
      tags: (form.tags || []).length ? form.tags! : ['未分类'],
      location: form.location || '未知',
      date: new Date().toISOString(),
      camera: form.camera || '未知',
      lens: form.lens || '',
      aperture: form.aperture || 'f/8',
      shutter: form.shutter || '1/125s',
      iso: form.iso || 200,
      focal: form.focal || 50,
      liked: false,
      colors: PALETTES[palette],
    }
    setPhotos([p, ...photos])
    setAdding(false)
    setForm({ category: 'landscape', mood: '静谧', camera: CAMERAS[0], lens: '24-70mm f/2.8', aperture: 'f/8', shutter: '1/125s', iso: 200, focal: 50 })
    toast('照片已添加', 'success')
  }

  const toggleLike = (id: string) => setPhotos(photos.map((p) => p.id === id ? { ...p, liked: !p.liked } : p))
  const del = (id: string) => { setPhotos(photos.filter((p) => p.id !== id)); if (active?.id === id) setActive(null); toast('已删除', 'success') }

  const filtered = photos.filter((p) => {
    if (filterCat === 'liked' && !p.liked) return false
    if (filterCat !== 'all' && filterCat !== 'liked' && p.category !== filterCat) return false
    if (search) {
      const s = search.toLowerCase()
      if (!p.title.toLowerCase().includes(s) && !p.tags.some((t) => t.toLowerCase().includes(s)) && !p.location.toLowerCase().includes(s)) return false
    }
    return true
  })

  const stats = {
    total: photos.length,
    liked: photos.filter((p) => p.liked).length,
    cameras: new Set(photos.map((p) => p.camera)).size,
    locations: new Set(photos.map((p) => p.location)).size,
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon className="w-5 h-5" />
          <h2 className="text-lg font-bold">智能相册</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">10 分类 · EXIF 参数 · 心情标签</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.total}</p><p className="text-[9px] opacity-80">总张</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.liked}</p><p className="text-[9px] opacity-80">收藏</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.cameras}</p><p className="text-[9px] opacity-80">机型</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{stats.locations}</p><p className="text-[9px] opacity-80">地点</p></div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索标题、标签、地点..." className="w-full h-8 pl-8 pr-3 text-xs bg-white/60 dark:bg-ink-900/40 rounded-lg border border-ink-200/40 dark:border-ink-800/40 focus:outline-none focus:ring-2 focus:ring-rose-500/40" />
        </div>
        <button onClick={() => setView(view === 'grid' ? 'list' : 'grid')} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 dark:border-ink-800/40">
          {view === 'grid' ? <Layers className="w-3.5 h-3.5" /> : <Grid3x3 className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => setAdding(true)} className="h-8 w-8 flex items-center justify-center rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white"><Plus className="w-3.5 h-3.5" /></button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {(['all', 'liked', ...Object.keys(CAT_META)] as const).map((c) => (
          <button key={c} onClick={() => setFilterCat(c as any)} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap flex items-center gap-1 shrink-0', filterCat === c ? 'bg-rose-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
            {c === 'all' ? '全部' : c === 'liked' ? '★' : <>{CAT_META[c as keyof typeof CAT_META].icon}{CAT_META[c as keyof typeof CAT_META].label}</>}
          </button>
        ))}
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-3 gap-1">
          <AnimatePresence>
            {filtered.map((p) => {
              const m = CAT_META[p.category]
              return (
                <motion.button
                  key={p.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={() => setActive(p)}
                  className="aspect-square rounded-xl overflow-hidden relative bg-gradient-to-br group"
                  style={{ background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]}, ${p.colors[2]})` }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-40 group-hover:opacity-60 transition-opacity">{m.icon}</div>
                  <div className="absolute top-1 right-1 flex flex-col gap-0.5">
                    {p.liked && <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center"><Heart className="w-2.5 h-2.5 text-rose-500 fill-current" /></div>}
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-1 bg-gradient-to-t from-black/70 to-transparent">
                    <p className="text-[9px] text-white font-bold truncate">{p.title}</p>
                    <p className="text-[8px] text-white/80">{p.aperture} · {p.shutter} · ISO{p.iso}</p>
                  </div>
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((p) => {
            const m = CAT_META[p.category]
            return (
              <div key={p.id} className="p-2.5 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 dark:border-ink-800/40 flex items-center gap-2">
                <button onClick={() => setActive(p)} className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center text-2xl bg-gradient-to-br" style={{ background: `linear-gradient(135deg, ${p.colors[0]}, ${p.colors[1]})` }}>{m.icon}</button>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-ink-800 dark:text-ink-200 truncate">{p.title}</p>
                  <p className="text-[10px] text-ink-500 truncate">📍 {p.location} · {m.label} · {p.mood}</p>
                  <p className="text-[9px] text-ink-400">{p.aperture} · {p.shutter} · ISO{p.iso} · {p.focal}mm</p>
                </div>
                <button onClick={() => toggleLike(p.id)} className={cn('w-7 h-7 rounded-lg flex items-center justify-center', p.liked ? 'bg-rose-100 text-rose-500' : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}><Heart className={cn('w-3.5 h-3.5', p.liked && 'fill-current')} /></button>
                <button onClick={() => del(p.id)} className="w-7 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-400 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>暂无照片, 添加第一张吧</p>
        </div>
      )}

      <AnimatePresence>
        {active && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setActive(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white dark:bg-ink-900 overflow-hidden">
              <div className="aspect-video flex items-center justify-center text-6xl relative" style={{ background: `linear-gradient(135deg, ${active.colors[0]}, ${active.colors[1]}, ${active.colors[2]})` }}>
                {CAT_META[active.category].icon}
                <button onClick={() => setActive(null)} className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-3 space-y-2">
                <h3 className="text-base font-bold">{active.title}</h3>
                <p className="text-xs text-ink-600 dark:text-ink-400">{active.description || '无描述'}</p>
                <div className="flex flex-wrap gap-1">
                  {active.tags.map((t) => <span key={t} className="px-2 h-5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 text-[10px] flex items-center">#{t}</span>)}
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <div className="p-1.5 rounded bg-ink-50 dark:bg-ink-800/50"><Aperture className="w-3 h-3 mx-auto mb-0.5" />{active.aperture}</div>
                  <div className="p-1.5 rounded bg-ink-50 dark:bg-ink-800/50"><span className="font-bold">⏱</span><br />{active.shutter}</div>
                  <div className="p-1.5 rounded bg-ink-50 dark:bg-ink-800/50"><span className="font-bold">ISO</span><br />{active.iso}</div>
                </div>
                <div className="text-[10px] text-ink-500 flex items-center gap-2 flex-wrap">
                  <span>📍 {active.location}</span>
                  <span>· 📷 {active.camera}</span>
                  <span>· {active.focal}mm</span>
                </div>
                <p className="text-[9px] text-ink-400">{formatTimeAgo(active.date)}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3" onClick={() => setAdding(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white dark:bg-ink-900 p-3 space-y-2 max-h-[90vh] overflow-y-auto">
              <h3 className="text-sm font-bold">添加照片</h3>
              <input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="标题" className="w-full h-9 px-3 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 dark:border-ink-800/40" />
              <textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="描述" className="w-full h-14 px-3 py-1.5 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 dark:border-ink-800/40 resize-none" />
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <div className="text-[10px] font-semibold text-ink-600 mb-1">分类</div>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
                    {Object.entries(CAT_META).map(([k, m]) => <option key={k} value={k}>{m.icon} {m.label}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-ink-600 mb-1">心情</div>
                  <select value={form.mood} onChange={(e) => setForm({ ...form, mood: e.target.value })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
                    {MOODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-ink-600 mb-1">机型</div>
                  <select value={form.camera} onChange={(e) => setForm({ ...form, camera: e.target.value })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40">
                    {CAMERAS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-ink-600 mb-1">地点</div>
                  <input value={form.location || ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="拍摄地" className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-ink-600 mb-1">光圈</div>
                  <input value={form.aperture} onChange={(e) => setForm({ ...form, aperture: e.target.value })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-ink-600 mb-1">快门</div>
                  <input value={form.shutter} onChange={(e) => setForm({ ...form, shutter: e.target.value })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-ink-600 mb-1">ISO</div>
                  <input type="number" value={form.iso} onChange={(e) => setForm({ ...form, iso: Number(e.target.value) })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-ink-600 mb-1">焦距 (mm)</div>
                  <input type="number" value={form.focal} onChange={(e) => setForm({ ...form, focal: Number(e.target.value) })} className="w-full h-8 px-2 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40" />
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-ink-600 mb-1">调色板</div>
                <div className="grid grid-cols-7 gap-1">
                  {PALETTES.map((p, i) => (
                    <button key={i} onClick={() => setPalette(i)} className={cn('h-7 rounded-md flex overflow-hidden', palette === i ? 'ring-2 ring-rose-500 scale-110' : '')}>
                      {p.map((c, j) => <div key={j} className="flex-1" style={{ background: c }} />)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setAdding(false)} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">取消</button>
                <button onClick={add} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold">添加</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
