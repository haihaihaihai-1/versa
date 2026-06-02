import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Palette, Sparkles, Loader2, Copy, Check, Plus, Trash2, Shuffle, Save, Download, RefreshCw, Image as ImageIcon } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Palette {
  id: string
  name: string
  colors: string[]
  source: string
  at: number
  favorite: boolean
}

const STORAGE_KEY = 'versa:palettes'

function load(): Palette[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Palette[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const SEED_PALETTES: Palette[] = [
  { id: 'p1', name: 'Versa 主色', colors: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ec4899', '#f472b6'], source: 'preset', at: Date.now(), favorite: true },
  { id: 'p2', name: '落日', colors: ['#f97316', '#fb923c', '#fbbf24', '#fde047', '#fef08a'], source: 'preset', at: Date.now(), favorite: false },
  { id: 'p3', name: '森林', colors: ['#064e3b', '#065f46', '#10b981', '#34d399', '#6ee7b7'], source: 'preset', at: Date.now(), favorite: false },
]

function hslToHex(h: number, s: number, l: number) {
  l /= 100
  const a = s * Math.min(l, 1 - l) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

const SCENES = [
  { id: 'sc1', name: '商务', prompt: '专业、稳重、可信', hue: 215 },
  { id: 'sc2', name: '活泼', prompt: '年轻、活力、温暖', hue: 25 },
  { id: 'sc3', name: '科技', prompt: '未来、极客、赛博', hue: 268 },
  { id: 'sc4', name: '自然', prompt: '清新、舒适、治愈', hue: 150 },
  { id: 'sc5', name: '优雅', prompt: '奢华、神秘、女性化', hue: 320 },
  { id: 'sc6', name: '复古', prompt: '怀旧、暖色、温暖', hue: 30 },
]

export function ColorPaletteStudio() {
  const [palettes, setPalettes] = useState<Palette[]>(load().length ? load() : SEED_PALETTES)
  const [current, setCurrent] = useState<Palette>(palettes[0])
  const [copied, setCopied] = useState<string | null>(null)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [hue, setHue] = useState(215)
  const [sat, setSat] = useState(70)
  const [count, setCount] = useState(5)
  const [name, setName] = useState('')

  useEffect(() => { save(palettes) }, [palettes])

  const generate = () => {
    const colors = Array.from({ length: count }, (_, i) => {
      const l = 25 + (i / (count - 1 || 1)) * 50
      return hslToHex(hue, sat, l)
    })
    const p: Palette = { id: uid(), name: name || `调色板 ${palettes.length + 1}`, colors, source: 'generated', at: Date.now(), favorite: false }
    setCurrent(p)
  }

  const shuffle = () => {
    setHue(Math.floor(Math.random() * 360))
    setSat(40 + Math.floor(Math.random() * 50))
    setTimeout(generate, 50)
  }

  const savePalette = () => {
    if (current.source === 'preset') {
      const p: Palette = { ...current, id: uid(), source: 'custom', at: Date.now() }
      setPalettes([p, ...palettes])
      setCurrent(p)
    } else {
      setPalettes(palettes.map((p) => p.id === current.id ? { ...p, name: name || p.name } : p))
    }
    toast('已保存', 'success')
  }

  const remove = (id: string) => {
    setPalettes(palettes.filter((p) => p.id !== id))
    if (current.id === id) setCurrent(palettes[0])
  }
  const toggleFav = (id: string) => setPalettes(palettes.map((p) => p.id === id ? { ...p, favorite: !p.favorite } : p))

  const copyHex = (hex: string) => {
    navigator.clipboard?.writeText(hex)
    setCopied(hex)
    setTimeout(() => setCopied(null), 1500)
    toast(`已复制 ${hex}`, 'success')
  }

  const copyAll = () => {
    navigator.clipboard?.writeText(current.colors.join(', '))
    toast('已复制全部色值', 'success')
  }

  const exportCSS = () => {
    const css = `:root {\n${current.colors.map((c, i) => `  --color-${i + 1}: ${c};`).join('\n')}\n}`
    navigator.clipboard?.writeText(css)
    toast('CSS 已复制', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const scene = SCENES.find((s) => s.hue === hue)
      const result = await aiComplete(`为"${scene?.name || '通用'}"主题生成 3 个 60-80 字的配色建议 (含场景)`, '你是 Versa 配色顾问, 简洁专业, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-5 h-5" />
          <h2 className="text-lg font-bold">配色工坊</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">HSL 生成 · 复制 · CSS 导出</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{palettes.length}</p>
            <p className="text-[10px] opacity-80">调色板</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{palettes.filter((p) => p.favorite).length}</p>
            <p className="text-[10px] opacity-80">收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{current.colors.length}</p>
            <p className="text-[10px] opacity-80">当前色</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden border border-ink-200 dark:border-ink-700">
        <div className="flex h-32">
          {current.colors.map((c, i) => (
            <button key={i} onClick={() => copyHex(c)} className="flex-1 relative group" style={{ background: c }}>
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40">
                {copied === c ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-3 h-3 text-white" />}
              </div>
            </button>
          ))}
        </div>
        <div className="bg-white p-2 space-y-1">
          <div className="flex gap-1 flex-wrap">
            {current.colors.map((c, i) => (
              <button key={i} onClick={() => copyHex(c)} className="px-2 h-7 rounded bg-ink-50 text-[10px] font-mono font-bold flex items-center gap-1">
                {copied === c ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="调色板名" className="w-full px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-sm" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ink-500 w-10">色相</span>
          <input type="range" min="0" max="360" value={hue} onChange={(e) => setHue(+e.target.value)} className="flex-1 accent-pink-500" />
          <span className="text-[10px] font-mono w-8">{hue}°</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ink-500 w-10">饱和</span>
          <input type="range" min="0" max="100" value={sat} onChange={(e) => setSat(+e.target.value)} className="flex-1 accent-pink-500" />
          <span className="text-[10px] font-mono w-8">{sat}%</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-ink-500 w-10">数量</span>
          <input type="range" min="3" max="9" value={count} onChange={(e) => setCount(+e.target.value)} className="flex-1 accent-pink-500" />
          <span className="text-[10px] font-mono w-8">{count}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={generate} className="h-8 rounded bg-pink-500 text-white text-xs font-bold">生成</button>
          <button onClick={shuffle} className="h-8 rounded bg-violet-500 text-white text-xs font-bold flex items-center justify-center gap-1">
            <Shuffle className="w-3 h-3" />随机
          </button>
          <button onClick={runAI} disabled={loading} className="h-8 rounded bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={savePalette} className="h-8 rounded bg-ink-100 dark:bg-ink-800 text-xs font-bold flex items-center justify-center gap-1">
            <Save className="w-3 h-3" />保存
          </button>
          <button onClick={exportCSS} className="h-8 rounded bg-ink-100 dark:bg-ink-800 text-xs font-bold flex items-center justify-center gap-1">
            <Download className="w-3 h-3" />CSS
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {SCENES.map((s) => (
          <button key={s.id} onClick={() => { setHue(s.hue); setSat(70) }} className="px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0 flex items-center gap-1" style={{ background: hslToHex(s.hue, 70, 50), color: '#fff' }}>
            {s.name}
          </button>
        ))}
      </div>

      {aiRec && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiRec}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-bold">我的调色板 ({palettes.length})</p>
        {palettes.map((p) => (
          <div key={p.id} className="rounded-xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-bold flex-1 truncate">{p.name}</p>
              <button onClick={() => toggleFav(p.id)} className={cn('w-6 h-6 rounded text-xs', p.favorite ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>⭐</button>
              <button onClick={() => setCurrent(p)} className="px-2 h-6 rounded bg-pink-500 text-white text-[10px]">选</button>
              {p.source === 'custom' && <button onClick={() => remove(p.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>}
            </div>
            <div className="flex h-6 rounded overflow-hidden">
              {p.colors.map((c, i) => <div key={i} className="flex-1" style={{ background: c }} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
