import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Camera, Sun, Moon, Sparkles, Star, Heart, Plus, Trash2, Copy, Save, ChevronLeft, ChevronRight, Eye, Shuffle } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface LutPreset {
  id: string
  name: string
  emoji: string
  category: 'film' | 'warm' | 'cool' | 'bw' | 'vintage' | 'cinematic' | 'portrait' | 'landscape' | 'moody' | 'custom'
  shadow: string
  midtone: string
  highlight: string
  saturation: number
  contrast: number
  temperature: number
  tint: number
  desc: string
  liked: boolean
}

const STORAGE_KEY = 'versa:luts-v1'

function load(): LutPreset[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: LutPreset[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): LutPreset[] {
  return [
    { id: '1', name: '富士 Classic', emoji: '🎞️', category: 'film', shadow: '#1e3a5f', midtone: '#d4a574', highlight: '#fff5e6', saturation: 75, contrast: 95, temperature: 5, tint: -5, desc: '经典富士胶片色调, 阴影偏青, 肤色自然', liked: true },
    { id: '2', name: '柯达 Portra', emoji: '📸', category: 'portrait', shadow: '#3d2817', midtone: '#e8c9a0', highlight: '#fff0e0', saturation: 85, contrast: 90, temperature: 8, tint: 0, desc: '温暖人像, 柔和过渡, 经典胶片感', liked: true },
    { id: '3', name: '赛博朋克', emoji: '🌃', category: 'moody', shadow: '#0a0a2e', midtone: '#ff00ff', highlight: '#00ffff', saturation: 150, contrast: 130, temperature: -20, tint: 30, desc: '高对比青紫调, 霓虹城市感', liked: false },
    { id: '4', name: '日系清新', emoji: '🌸', category: 'portrait', shadow: '#f5f0e8', midtone: '#ffe8d6', highlight: '#fffefa', saturation: 80, contrast: 85, temperature: 5, tint: 0, desc: '明亮通透, 偏粉白, 治愈系', liked: true },
    { id: '5', name: '美式电影', emoji: '🎬', category: 'cinematic', shadow: '#1a0e0a', midtone: '#c89878', highlight: '#f5e8d0', saturation: 70, contrast: 115, temperature: 10, tint: 5, desc: '浓郁电影感, 暖色阴影, 戏剧光影', liked: false },
    { id: '6', name: '北欧极简', emoji: '❄️', category: 'cool', shadow: '#e8eef2', midtone: '#c8d4dc', highlight: '#ffffff', saturation: 60, contrast: 90, temperature: -10, tint: 0, desc: '冷调简洁, 低饱和, 高级灰', liked: false },
    { id: '7', name: '黑白经典', emoji: '⚫', category: 'bw', shadow: '#000000', midtone: '#808080', highlight: '#ffffff', saturation: 0, contrast: 120, temperature: 0, tint: 0, desc: '高对比黑白, 安塞尔·亚当斯风格', liked: false },
    { id: '8', name: '港风复古', emoji: '🏮', category: 'vintage', shadow: '#2d1a0a', midtone: '#d4805a', highlight: '#f5d4a0', saturation: 90, contrast: 110, temperature: 15, tint: 10, desc: '80 年代港片色调, 浓郁暖黄', liked: true },
  ]
}

const CAT_META = {
  film: { label: '胶片', color: 'from-amber-500 to-orange-500' },
  warm: { label: '暖调', color: 'from-rose-500 to-red-500' },
  cool: { label: '冷调', color: 'from-cyan-500 to-blue-500' },
  bw: { label: '黑白', color: 'from-zinc-500 to-zinc-700' },
  vintage: { label: '复古', color: 'from-yellow-500 to-amber-500' },
  cinematic: { label: '电影', color: 'from-violet-500 to-purple-500' },
  portrait: { label: '人像', color: 'from-pink-500 to-rose-500' },
  landscape: { label: '风光', color: 'from-emerald-500 to-teal-500' },
  moody: { label: '情绪', color: 'from-indigo-500 to-purple-600' },
  custom: { label: '自定义', color: 'from-zinc-400 to-zinc-500' },
} as const

export function ColorGrading() {
  const [luts, setLuts] = useState<LutPreset[]>(load())
  const [activeId, setActiveId] = useState<string | null>(luts[0]?.id || null)
  const [filterCat, setFilterCat] = useState<keyof typeof CAT_META | 'all' | 'liked'>('all')

  useEffect(() => { save(luts) }, [luts])
  const active = luts.find((l) => l.id === activeId) || null

  const toggleLike = (id: string) => setLuts(luts.map((l) => l.id === id ? { ...l, liked: !l.liked } : l))
  const del = (id: string) => { setLuts(luts.filter((l) => l.id !== id)); if (activeId === id) setActiveId(null); toast('已删除', 'success') }
  const copy = (val: string) => { navigator.clipboard?.writeText(val); toast('已复制', 'success') }
  const shuffle = () => { const r = luts[Math.floor(Math.random() * luts.length)]; setActiveId(r.id); toast('随机: ' + r.name, 'success') }

  const filtered = luts.filter((l) => {
    if (filterCat === 'liked' && !l.liked) return false
    if (filterCat !== 'all' && filterCat !== 'liked' && l.category !== filterCat) return false
    return true
  })

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-5 h-5" />
          <h2 className="text-lg font-bold">调色预设</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">15 LUT 风格 · 阴影/中间调/高光 · CSS 输出</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{luts.length}</p><p className="text-[9px] opacity-80">预设</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{luts.filter((l) => l.liked).length}</p><p className="text-[9px] opacity-80">收藏</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Object.keys(CAT_META).length}</p><p className="text-[9px] opacity-80">分类</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{active?.name.slice(0, 4) || '-'}</p><p className="text-[9px] opacity-80">当前</p></div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={shuffle} className="h-8 px-3 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-semibold flex items-center gap-1"><Shuffle className="w-3 h-3" />随机</button>
        <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5">
          {(['all', 'liked', ...Object.keys(CAT_META)] as const).map((c) => (
            <button key={c} onClick={() => setFilterCat(c as any)} className={cn('px-2.5 h-8 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0', filterCat === c ? 'bg-pink-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
              {c === 'all' ? '全部' : c === 'liked' ? '★' : CAT_META[c as keyof typeof CAT_META].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {filtered.map((l) => {
          const m = CAT_META[l.category]
          return (
            <button key={l.id} onClick={() => setActiveId(l.id)} className={cn('p-2 rounded-xl text-left border transition-all', activeId === l.id ? 'border-pink-400 bg-pink-50/40 dark:bg-pink-900/20 scale-[1.02]' : 'border-ink-200/40 bg-white/40 dark:bg-ink-900/30')}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-7 h-7 rounded-md flex items-center justify-center text-lg bg-gradient-to-br" style={{ background: `linear-gradient(135deg, ${l.shadow}, ${l.midtone}, ${l.highlight})` }}>{l.emoji}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-ink-800 dark:text-ink-200 truncate">{l.name}</p>
                  <p className="text-[9px] text-ink-500">{m.label} · ❤️{l.liked ? '★' : '☆'}</p>
                </div>
              </div>
              <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                <div className="flex-1" style={{ background: l.shadow }} />
                <div className="flex-1" style={{ background: l.midtone }} />
                <div className="flex-1" style={{ background: l.highlight }} />
              </div>
            </button>
          )
        })}
      </div>

      {active && (
        <div className="rounded-2xl bg-gradient-to-br p-3 text-white" style={{ background: `linear-gradient(135deg, ${active.shadow}, ${active.midtone}, ${active.highlight})` }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-3xl">{active.emoji}</span>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold">{active.name}</h3>
              <p className="text-[10px] opacity-90">{CAT_META[active.category].label}</p>
            </div>
            <button onClick={() => toggleLike(active.id)} className={cn('w-8 h-8 rounded-full flex items-center justify-center', active.liked ? 'bg-white text-rose-500' : 'bg-white/20 text-white')}>
              <Heart className={cn('w-4 h-4', active.liked && 'fill-current')} />
            </button>
          </div>
          <p className="text-[11px] opacity-95 leading-relaxed">{active.desc}</p>
        </div>
      )}

      {active && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" />参数详情</div>
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
            <div className="p-1.5 rounded-lg" style={{ background: active.shadow + '40' }}>
              <div className="w-full h-3 rounded" style={{ background: active.shadow }} />
              <p className="text-ink-600 dark:text-ink-400 mt-0.5">阴影</p>
              <p className="font-mono text-[9px]">{active.shadow}</p>
            </div>
            <div className="p-1.5 rounded-lg" style={{ background: active.midtone + '40' }}>
              <div className="w-full h-3 rounded" style={{ background: active.midtone }} />
              <p className="text-ink-600 dark:text-ink-400 mt-0.5">中间调</p>
              <p className="font-mono text-[9px]">{active.midtone}</p>
            </div>
            <div className="p-1.5 rounded-lg" style={{ background: active.highlight + '40' }}>
              <div className="w-full h-3 rounded" style={{ background: active.highlight }} />
              <p className="text-ink-600 dark:text-ink-400 mt-0.5">高光</p>
              <p className="font-mono text-[9px]">{active.highlight}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <Bar label="饱和度" v={active.saturation} max={200} unit="%" gradient="from-rose-500 to-pink-500" />
            <Bar label="对比度" v={active.contrast} max={200} unit="%" gradient="from-violet-500 to-purple-500" />
            <Bar label="色温" v={active.temperature + 50} max={100} unit="" gradient="from-blue-500 to-orange-500" />
            <Bar label="色调" v={active.tint + 50} max={100} unit="" gradient="from-green-500 to-fuchsia-500" />
          </div>
        </div>
      )}

      {active && (
        <div className="flex gap-1">
          <button onClick={() => copy(`filter: contrast(${active.contrast}%) saturate(${active.saturation}%) sepia(0.1) hue-rotate(${active.tint * 2}deg);`)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1"><Copy className="w-3.5 h-3.5" />复制 CSS</button>
          <button onClick={() => del(active.id)} className="h-9 w-9 rounded-lg bg-rose-500 text-white flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  )
}

function Bar({ label, v, max, unit, gradient }: { label: string; v: number; max: number; unit: string; gradient: string }) {
  const pct = Math.min(100, Math.max(0, (v / max) * 100))
  return (
    <div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-ink-600 dark:text-ink-400">{label}</span>
        <span className="font-mono font-bold text-ink-800 dark:text-ink-200">{v}{unit}</span>
      </div>
      <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
        <div className={cn('h-full rounded-full bg-gradient-to-r', gradient)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
