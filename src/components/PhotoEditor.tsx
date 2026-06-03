import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sliders, RefreshCw, Download, Copy, Check, Sun, Contrast, Droplet, RotateCcw, Sparkles, Save, ImageIcon, Zap } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Preset {
  id: string
  name: string
  emoji: string
  brightness: number
  contrast: number
  saturation: number
  sepia: number
  hueRotate: number
  blur: number
  grayscale: number
  invert: number
}

const PRESETS: Preset[] = [
  { id: 'original', name: '原图', emoji: '🖼️', brightness: 100, contrast: 100, saturation: 100, sepia: 0, hueRotate: 0, blur: 0, grayscale: 0, invert: 0 },
  { id: 'vivid', name: '鲜艳', emoji: '🌈', brightness: 110, contrast: 120, saturation: 140, sepia: 0, hueRotate: 0, blur: 0, grayscale: 0, invert: 0 },
  { id: 'mono', name: '黑白', emoji: '⚫', brightness: 100, contrast: 110, saturation: 0, sepia: 0, hueRotate: 0, blur: 0, grayscale: 100, invert: 0 },
  { id: 'sepia', name: '复古', emoji: '📜', brightness: 105, contrast: 90, saturation: 80, sepia: 60, hueRotate: 0, blur: 0, grayscale: 0, invert: 0 },
  { id: 'cool', name: '冷调', emoji: '❄️', brightness: 95, contrast: 110, saturation: 90, sepia: 0, hueRotate: 30, blur: 0, grayscale: 0, invert: 0 },
  { id: 'warm', name: '暖调', emoji: '☀️', brightness: 110, contrast: 105, saturation: 110, sepia: 20, hueRotate: -15, blur: 0, grayscale: 0, invert: 0 },
  { id: 'film', name: '胶片', emoji: '🎞️', brightness: 105, contrast: 95, saturation: 85, sepia: 15, hueRotate: 0, blur: 0, grayscale: 0, invert: 0 },
  { id: 'cinema', name: '电影', emoji: '🎬', brightness: 95, contrast: 130, saturation: 80, sepia: 0, hueRotate: 0, blur: 0, grayscale: 0, invert: 0 },
  { id: 'dream', name: '梦幻', emoji: '💭', brightness: 115, contrast: 90, saturation: 120, sepia: 0, hueRotate: 0, blur: 1, grayscale: 0, invert: 0 },
  { id: 'cyber', name: '赛博', emoji: '🤖', brightness: 100, contrast: 130, saturation: 150, sepia: 0, hueRotate: 200, blur: 0, grayscale: 0, invert: 0 },
  { id: 'faded', name: '褪色', emoji: '🌫️', brightness: 110, contrast: 70, saturation: 70, sepia: 0, hueRotate: 0, blur: 0, grayscale: 0, invert: 0 },
  { id: 'noir', name: '暗调', emoji: '🕶️', brightness: 80, contrast: 140, saturation: 0, sepia: 0, hueRotate: 0, blur: 0, grayscale: 100, invert: 0 },
]

interface SavedEdit {
  id: string
  name: string
  preset: Preset
  customValues: Preset
}

const STORAGE_KEY = 'versa:photo-edits-v1'

function loadEdits(): SavedEdit[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function saveEdits(d: SavedEdit[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function PhotoEditor() {
  const [active, setActive] = useState<Preset>(PRESETS[0])
  const [values, setValues] = useState<Preset>({ ...PRESETS[0] })
  const [saved, setSaved] = useState<SavedEdit[]>(loadEdits())
  const [hueColor, setHueColor] = useState('#06b6d4')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => { saveEdits(saved) }, [saved])

  const filterStr = `brightness(${values.brightness}%) contrast(${values.contrast}%) saturate(${values.saturation}%) sepia(${values.sepia}%) hue-rotate(${values.hueRotate}deg) blur(${values.blur}px) grayscale(${values.grayscale}%) invert(${values.invert}%)`

  const apply = (p: Preset) => {
    setActive(p)
    setValues({ ...p })
  }

  const reset = () => {
    setActive(PRESETS[0])
    setValues({ ...PRESETS[0] })
    toast('已重置', 'success')
  }

  const saveCustom = () => {
    const name = prompt('为这个调色方案命名:', '我的预设 ' + (saved.length + 1))
    if (!name) return
    const edit: SavedEdit = { id: String(Date.now()), name, preset: active, customValues: { ...values } }
    setSaved([edit, ...saved].slice(0, 20))
    toast('已保存', 'success')
  }

  const loadEdit = (e: SavedEdit) => {
    setActive(e.preset)
    setValues({ ...e.customValues })
    toast('已加载', 'success')
  }

  const del = (id: string) => { setSaved(saved.filter((e) => e.id !== id)); toast('已删除', 'success') }

  const copyCSS = () => {
    navigator.clipboard?.writeText(`filter: ${filterStr};`)
    toast('CSS 已复制', 'success')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sliders className="w-5 h-5" />
          <h2 className="text-lg font-bold">照片调色</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">12 预设 · 8 滑块 · CSS 滤镜</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{PRESETS.length}</p><p className="text-[9px] opacity-80">预设</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{saved.length}</p><p className="text-[9px] opacity-80">自定义</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{Math.abs(values.contrast - 100) + Math.abs(values.saturation - 100)}</p><p className="text-[9px] opacity-80">调整度</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{active.emoji}</p><p className="text-[9px] opacity-80">当前</p></div>
        </div>
      </div>

      <div className="aspect-video rounded-2xl overflow-hidden relative bg-gradient-to-br from-amber-400 via-rose-500 to-violet-600">
        <div className="absolute inset-0 flex items-center justify-center transition-all" style={{ filter: filterStr }}>
          <div className="w-32 h-32 rounded-2xl bg-white/30 backdrop-blur-md flex items-center justify-center text-5xl shadow-2xl">📸</div>
        </div>
        <div className="absolute top-2 left-2 px-2 h-6 rounded-full bg-black/40 text-white text-[10px] font-semibold flex items-center">{active.emoji} {active.name}</div>
        <div className="absolute bottom-2 right-2 px-2 h-6 rounded-full bg-black/40 text-white text-[10px] font-mono flex items-center">{Math.round(values.brightness)},{Math.round(values.contrast)},{Math.round(values.saturation)}</div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40">
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">预设</div>
        <div className="grid grid-cols-6 gap-1">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => apply(p)} className={cn('h-12 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all', active.id === p.id ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white scale-105' : 'bg-ink-100/60 dark:bg-ink-800/40 text-ink-600 dark:text-ink-400')}>
              <span className="text-base">{p.emoji}</span>
              <span className="text-[9px] font-semibold">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
        <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1">精细调节</div>
        {([
          { key: 'brightness', label: '亮度', icon: Sun, min: 0, max: 200, unit: '%' },
          { key: 'contrast', label: '对比度', icon: Contrast, min: 0, max: 200, unit: '%' },
          { key: 'saturation', label: '饱和度', icon: Droplet, min: 0, max: 200, unit: '%' },
          { key: 'sepia', label: '复古', icon: Sparkles, min: 0, max: 100, unit: '%' },
          { key: 'hueRotate', label: '色相', icon: Zap, min: -180, max: 180, unit: '°' },
          { key: 'blur', label: '模糊', icon: Sliders, min: 0, max: 10, unit: 'px' },
          { key: 'grayscale', label: '灰度', icon: ImageIcon, min: 0, max: 100, unit: '%' },
          { key: 'invert', label: '反相', icon: RotateCcw, min: 0, max: 100, unit: '%' },
        ] as const).map((s) => {
          const Icon = s.icon
          const v = values[s.key as keyof Preset] as number
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className="w-16 flex items-center gap-1 text-[10px] text-ink-600 dark:text-ink-400">
                <Icon className="w-3 h-3" />{s.label}
              </div>
              <input type="range" min={s.min} max={s.max} value={v} onChange={(e) => setValues({ ...values, [s.key]: Number(e.target.value) })} className="flex-1 h-1.5 accent-violet-500" />
              <span className="w-12 text-right text-[10px] font-mono font-bold text-ink-700 dark:text-ink-300">{v}{s.unit}</span>
            </div>
          )
        })}
      </div>

      <div className="flex gap-1">
        <button onClick={reset} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1"><RotateCcw className="w-3.5 h-3.5" />重置</button>
        <button onClick={saveCustom} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-semibold flex items-center justify-center gap-1"><Save className="w-3.5 h-3.5" />保存</button>
        <button onClick={copyCSS} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1"><Copy className="w-3.5 h-3.5" />CSS</button>
      </div>

      {saved.length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-3 border border-ink-200/40 dark:border-ink-800/40">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5">我的预设 ({saved.length})</div>
          <div className="space-y-1">
            {saved.map((e) => (
              <div key={e.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-ink-50 dark:bg-ink-800/40">
                <span className="text-base">{e.preset.emoji}</span>
                <span className="text-xs font-semibold flex-1 truncate">{e.name}</span>
                <button onClick={() => loadEdit(e)} className="px-2 h-6 rounded bg-violet-500 text-white text-[10px]">加载</button>
                <button onClick={() => del(e.id)} className="w-6 h-6 rounded bg-ink-100 dark:bg-ink-700 text-ink-500 flex items-center justify-center text-[10px]">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-ink-50 dark:bg-ink-900/60 p-2.5 text-[10px] font-mono text-ink-700 dark:text-ink-300 overflow-x-auto">
        <div className="text-ink-500 mb-1">/* CSS 输出 */</div>
        <div>.photo {`{`}</div>
        <div className="pl-3">filter: {filterStr};</div>
        <div>{`}`}</div>
      </div>
    </div>
  )
}
