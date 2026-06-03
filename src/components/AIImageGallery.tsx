import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, Sparkles, Loader2, Heart, Download, Copy, Tag, Trash2, RefreshCw, Shuffle, Filter, Search, Grid3x3, Layers, Eye } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Artwork {
  id: string
  prompt: string
  style: keyof typeof STYLES
  ratio: 'square' | 'portrait' | 'landscape' | 'wide'
  mood: string
  colors: string[]
  liked: boolean
  notes: string
  date: string
}

const STORAGE_KEY = 'versa:artworks-v1'

function load(): Artwork[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Artwork[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Artwork[] {
  const today = new Date().toISOString()
  return [
    { id: '1', prompt: 'a cute corgi wearing sunglasses at the beach, sunset background', style: 'ghibli', ratio: 'square', mood: 'cheerful', colors: ['#fbbf24', '#fb923c', '#f472b6'], liked: true, notes: '适合做头像', date: today },
    { id: '2', prompt: 'futuristic city skyline with neon lights and flying cars', style: 'cyberpunk', ratio: 'landscape', mood: 'epic', colors: ['#06b6d4', '#a855f7', '#ec4899'], liked: false, notes: '', date: today },
    { id: '3', prompt: 'a peaceful Japanese garden in spring with cherry blossoms', style: 'watercolor', ratio: 'portrait', mood: 'calm', colors: ['#fce7f3', '#86efac', '#a7f3d0'], liked: true, notes: '清新风格', date: today },
  ]
}

const STYLES = {
  cyberpunk: { label: '赛博朋克', emoji: '🌃', gradient: 'from-cyan-500 via-fuchsia-500 to-pink-500' },
  watercolor: { label: '水彩', emoji: '🎨', gradient: 'from-pink-300 via-rose-300 to-orange-200' },
  oilpaint: { label: '油画', emoji: '🖼️', gradient: 'from-amber-500 via-yellow-500 to-orange-600' },
  pixel: { label: '像素', emoji: '👾', gradient: 'from-emerald-500 via-lime-500 to-yellow-500' },
  ghibli: { label: '吉卜力', emoji: '🌸', gradient: 'from-sky-400 via-cyan-300 to-emerald-300' },
  anime: { label: '动漫', emoji: '✨', gradient: 'from-violet-500 via-fuchsia-500 to-pink-500' },
  realistic: { label: '写实', emoji: '📷', gradient: 'from-zinc-500 via-stone-500 to-zinc-700' },
  cartoon: { label: '卡通', emoji: '🎈', gradient: 'from-orange-400 via-amber-400 to-yellow-400' },
  threed: { label: '3D 渲染', emoji: '🧊', gradient: 'from-blue-500 via-indigo-500 to-purple-600' },
  sketch: { label: '铅笔素描', emoji: '✏️', gradient: 'from-zinc-300 via-zinc-400 to-zinc-600' },
  ukiyoe: { label: '浮世绘', emoji: '🗾', gradient: 'from-indigo-500 via-blue-500 to-rose-500' },
  vaporwave: { label: '蒸汽波', emoji: '🌴', gradient: 'from-pink-400 via-purple-400 to-cyan-400' },
} as const

const RATIOS = {
  square: { w: 'aspect-square', label: '1:1' },
  portrait: { w: 'aspect-[3/4]', label: '3:4' },
  landscape: { w: 'aspect-[4/3]', label: '4:3' },
  wide: { w: 'aspect-[16/9]', label: '16:9' },
} as const

const MOODS = ['cheerful', 'epic', 'calm', 'mysterious', 'romantic', 'dark', 'energetic', 'dreamy', 'nostalgic', 'futuristic'] as const

const SAMPLE_PROMPTS = [
  'a majestic dragon flying over snowy mountains at dawn',
  'a cozy coffee shop interior on a rainy day, warm lights',
  'a magical forest with glowing mushrooms and fairy lights',
  'a vintage car driving on a coastal highway at sunset',
  'a futuristic robot playing piano in a jazz bar',
  'a tiny astronaut exploring an alien flower garden',
]

const PALETTES: string[][] = [
  ['#fbbf24', '#fb923c', '#f472b6', '#a78bfa'],
  ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'],
  ['#10b981', '#34d399', '#a7f3d0', '#fef3c7'],
  ['#f43f5e', '#ec4899', '#a855f7', '#6366f1'],
  ['#f59e0b', '#ef4444', '#dc2626', '#7c2d12'],
  ['#0ea5e9', '#06b6d4', '#0891b2', '#155e75'],
]

export function AIImageGallery() {
  const [arts, setArts] = useState<Artwork[]>(load())
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState<keyof typeof STYLES>('ghibli')
  const [ratio, setRatio] = useState<keyof typeof RATIOS>('square')
  const [mood, setMood] = useState<typeof MOODS[number]>('cheerful')
  const [palette, setPalette] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filterStyle, setFilterStyle] = useState<keyof typeof STYLES | 'all'>('all')
  const [showLiked, setShowLiked] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { save(arts) }, [arts])

  const generate = () => {
    if (!prompt.trim()) { toast('请输入 prompt', 'error'); return }
    setLoading(true)
    setTimeout(() => {
      const newArt: Artwork = {
        id: uid(),
        prompt: prompt.trim(),
        style,
        ratio,
        mood,
        colors: PALETTES[palette],
        liked: false,
        notes,
        date: new Date().toISOString(),
      }
      setArts([newArt, ...arts])
      setNotes('')
      setLoading(false)
      toast('生成成功 (本地预览)', 'success')
    }, 900)
  }

  const toggleLike = (id: string) => setArts(arts.map((a) => (a.id === id ? { ...a, liked: !a.liked } : a)))
  const del = (id: string) => { setArts(arts.filter((a) => a.id !== id)); toast('已删除', 'success') }
  const copy = (val: string) => { navigator.clipboard?.writeText(val); toast('Prompt 已复制', 'success') }
  const shuffle = () => { const p = SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)]; setPrompt(p) }

  const filtered = arts.filter((a) => {
    if (filterStyle !== 'all' && a.style !== filterStyle) return false
    if (showLiked && !a.liked) return false
    if (search && !a.prompt.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <ImageIcon className="w-5 h-5" />
          <h2 className="text-lg font-bold">AI 图像画廊</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">12 风格 · 4 比例 · 调色板预览</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{arts.length}</p><p className="text-[9px] opacity-80">作品</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{arts.filter((a) => a.liked).length}</p><p className="text-[9px] opacity-80">收藏</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Object.keys(STYLES).length}</p><p className="text-[9px] opacity-80">风格</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{MOODS.length}</p><p className="text-[9px] opacity-80">情绪</p></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-2">
        <div className="flex items-center gap-1.5">
          <input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="描述你想要生成的图像..." className="flex-1 h-9 px-3 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 dark:border-ink-800/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40" />
          <button onClick={shuffle} className="h-9 w-9 flex items-center justify-center rounded-lg bg-ink-100 dark:bg-ink-800 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/30" title="随机"><Shuffle className="w-3.5 h-3.5" /></button>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-ink-600 dark:text-ink-400 mb-1">风格</div>
          <div className="grid grid-cols-6 gap-1">
            {Object.entries(STYLES).map(([k, s]) => (
              <button key={k} onClick={() => setStyle(k as keyof typeof STYLES)} className={cn('h-9 rounded-lg flex items-center justify-center text-base transition-all', style === k ? `bg-gradient-to-br ${s.gradient} text-white scale-110 shadow-md` : 'bg-ink-100/60 dark:bg-ink-800/40 grayscale opacity-60')}>
                {s.emoji}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] font-semibold text-ink-600 dark:text-ink-400 mb-1">比例</div>
            <div className="grid grid-cols-4 gap-1">
              {Object.entries(RATIOS).map(([k, r]) => (
                <button key={k} onClick={() => setRatio(k as keyof typeof RATIOS)} className={cn('h-7 rounded-md text-[10px] font-bold', ratio === k ? 'bg-fuchsia-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-400')}>{r.label}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-ink-600 dark:text-ink-400 mb-1">调色板</div>
            <div className="grid grid-cols-6 gap-1">
              {PALETTES.map((p, i) => (
                <button key={i} onClick={() => setPalette(i)} className={cn('h-7 rounded-md flex overflow-hidden', palette === i ? 'ring-2 ring-fuchsia-500 scale-110' : '')}>
                  {p.slice(0, 3).map((c, j) => (<div key={j} className="flex-1" style={{ background: c }} />))}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-ink-600 dark:text-ink-400 mb-1">情绪</div>
          <div className="flex flex-wrap gap-1">
            {MOODS.map((m) => (
              <button key={m} onClick={() => setMood(m)} className={cn('px-2 h-6 rounded-full text-[10px] font-medium', mood === m ? 'bg-fuchsia-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600 dark:text-ink-400')}>{m}</button>
            ))}
          </div>
        </div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="备注 (可选)..." className="w-full h-8 px-3 text-xs bg-ink-50 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 dark:border-ink-800/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40" />
        <button onClick={generate} disabled={loading || !prompt.trim()} className="w-full h-10 rounded-xl bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />生成中...</> : <><Sparkles className="w-4 h-4" />生成图像</>}
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索 prompt..." className="w-full h-8 pl-8 pr-3 text-xs bg-white/60 dark:bg-ink-900/40 rounded-lg border border-ink-200/40 dark:border-ink-800/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/40" />
        </div>
        <button onClick={() => setView(view === 'grid' ? 'list' : 'grid')} className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 dark:border-ink-800/40">
          {view === 'grid' ? <Layers className="w-3.5 h-3.5" /> : <Grid3x3 className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => setShowLiked(!showLiked)} className={cn('h-8 px-2 rounded-lg text-[10px] font-medium flex items-center gap-0.5', showLiked ? 'bg-rose-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
          <Heart className="w-3 h-3" />收藏
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        <button onClick={() => setFilterStyle('all')} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap', filterStyle === 'all' ? 'bg-fuchsia-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>全部</button>
        {Object.entries(STYLES).map(([k, s]) => (
          <button key={k} onClick={() => setFilterStyle(k as keyof typeof STYLES)} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap flex items-center gap-1', filterStyle === k ? `bg-gradient-to-r ${s.gradient} text-white` : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
            <span>{s.emoji}</span>{s.label}
          </button>
        ))}
      </div>

      {view === 'grid' ? (
        <div className="grid grid-cols-2 gap-1.5">
          <AnimatePresence>
            {filtered.map((a) => {
              const s = STYLES[a.style]
              return (
                <motion.div key={a.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className={cn('rounded-xl overflow-hidden bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 dark:border-ink-800/40', RATIOS[a.ratio].w)}>
                  <div className={cn('w-full h-full flex items-center justify-center relative bg-gradient-to-br', s.gradient)}>
                    <div className="text-4xl opacity-50">{s.emoji}</div>
                    <div className="absolute top-1.5 right-1.5 flex gap-1">
                      <button onClick={() => toggleLike(a.id)} className={cn('w-6 h-6 rounded-full flex items-center justify-center', a.liked ? 'bg-white text-rose-500' : 'bg-black/30 text-white')}><Heart className={cn('w-3 h-3', a.liked && 'fill-current')} /></button>
                      <button onClick={() => del(a.id)} className="w-6 h-6 rounded-full bg-black/30 text-white flex items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                    </div>
                    <div className="absolute bottom-1.5 left-1.5 px-1.5 h-4 rounded-full bg-black/40 text-white text-[9px] font-bold flex items-center">{s.label}</div>
                    <div className="absolute bottom-1.5 right-1.5 flex gap-0.5">
                      {a.colors.slice(0, 3).map((c, i) => (<div key={i} className="w-3 h-3 rounded-full ring-1 ring-white/40" style={{ background: c }} />))}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map((a) => {
            const s = STYLES[a.style]
            return (
              <div key={a.id} className="p-2.5 rounded-xl bg-white/60 dark:bg-ink-900/40 border border-ink-200/40 dark:border-ink-800/40 flex items-center gap-2">
                <div className={cn('w-14 h-14 rounded-lg flex items-center justify-center bg-gradient-to-br shrink-0', s.gradient)}>
                  <span className="text-2xl">{s.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink-800 dark:text-ink-200 line-clamp-1">{a.prompt}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] px-1.5 h-4 rounded bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-300 flex items-center">{s.label}</span>
                    <span className="text-[9px] text-ink-500">{RATIOS[a.ratio].label}</span>
                    <span className="text-[9px] text-ink-500">· {a.mood}</span>
                  </div>
                </div>
                <button onClick={() => toggleLike(a.id)} className={cn('w-7 h-7 rounded-lg flex items-center justify-center', a.liked ? 'bg-rose-100 text-rose-500' : 'bg-ink-100 dark:bg-ink-800 text-ink-400')}><Heart className={cn('w-3.5 h-3.5', a.liked && 'fill-current')} /></button>
                <button onClick={() => copy(a.prompt)} className="w-7 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-400 flex items-center justify-center"><Copy className="w-3.5 h-3.5" /></button>
                <button onClick={() => del(a.id)} className="w-7 h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-400 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )
          })}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-8 text-ink-400 text-xs">
          <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>暂无作品, 开始创作吧</p>
        </div>
      )}
    </div>
  )
}
