import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Palette, Save, RotateCcw, Eye, Sparkles, Check } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

export interface ThemeConfig {
  name: string
  primary: string
  secondary: string
  accent: string
  bg: string
  text: string
  radius: 'sharp' | 'medium' | 'round'
  font: 'sans' | 'serif' | 'mono'
}

const PRESETS: ThemeConfig[] = [
  { name: '默认 nova', primary: '#8b5cf6', secondary: '#ec4899', accent: '#06b6d4', bg: '#fafafa', text: '#0a0a0a', radius: 'medium', font: 'sans' },
  { name: '夜空 dark', primary: '#3b82f6', secondary: '#8b5cf6', accent: '#10b981', bg: '#0a0a0a', text: '#fafafa', radius: 'medium', font: 'sans' },
  { name: '森林 forest', primary: '#059669', secondary: '#0d9488', accent: '#f59e0b', bg: '#f0fdf4', text: '#064e3b', radius: 'round', font: 'sans' },
  { name: '海洋 ocean', primary: '#0ea5e9', secondary: '#06b6d4', accent: '#facc15', bg: '#f0f9ff', text: '#0c4a6e', radius: 'medium', font: 'sans' },
  { name: '落日 sunset', primary: '#f97316', secondary: '#ec4899', accent: '#a855f7', bg: '#fff7ed', text: '#7c2d12', radius: 'round', font: 'serif' },
  { name: '商务 biz', primary: '#1e293b', secondary: '#334155', accent: '#0ea5e9', bg: '#f8fafc', text: '#0f172a', radius: 'sharp', font: 'sans' },
]

const STORAGE_KEY = 'versa:custom-theme'

function load(): ThemeConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return null
}

function applyTheme(t: ThemeConfig) {
  const root = document.documentElement
  root.style.setProperty('--nova-500', t.primary)
  root.style.setProperty('--nova-600', t.primary)
  root.style.setProperty('--color-primary', t.primary)
  root.style.setProperty('--color-secondary', t.secondary)
  root.style.setProperty('--color-accent', t.accent)
  const rad = t.radius === 'sharp' ? '0.25rem' : t.radius === 'round' ? '1rem' : '0.5rem'
  root.style.setProperty('--radius', rad)
  const font = t.font === 'serif' ? 'Georgia, serif' : t.font === 'mono' ? 'Menlo, monospace' : 'system-ui, sans-serif'
  root.style.setProperty('--font-sans', font)
}

export function ThemeBuilder() {
  const [theme, setTheme] = useState<ThemeConfig>(PRESETS[0])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = load()
    if (stored) {
      setTheme(stored)
      applyTheme(stored)
    }
  }, [])

  const update = (key: keyof ThemeConfig, value: any) => {
    const next = { ...theme, [key]: value }
    setTheme(next)
    applyTheme(next)
    setSaved(false)
  }

  const save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(theme)) } catch {}
    setSaved(true)
    toast('主题已保存', 'success')
  }

  const reset = () => {
    setTheme(PRESETS[0])
    applyTheme(PRESETS[0])
    localStorage.removeItem(STORAGE_KEY)
    setSaved(false)
    toast('已重置为默认主题', 'info')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-1.5">
          <Palette className="w-5 h-5 text-nova-500" />
          主题定制
        </h3>
        <div className="flex items-center gap-2">
          <button onClick={reset} className="px-3 h-8 rounded-lg text-xs font-medium text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" />重置
          </button>
          <button
            onClick={save}
            className="px-3 h-8 rounded-lg text-xs font-semibold bg-gradient-to-r from-nova-500 to-pink-500 text-white flex items-center gap-1"
          >
            {saved ? <><Check className="w-3 h-3" />已保存</> : <><Save className="w-3 h-3" />保存</>}
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs text-ink-500 mb-2">预设主题 (点击应用)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setTheme(p)
                applyTheme(p)
                setSaved(false)
              }}
              className={cn(
                'p-3 rounded-xl border-2 transition text-left',
                theme.name === p.name
                  ? 'border-nova-500 ring-2 ring-nova-500/30'
                  : 'border-ink-200 dark:border-ink-700 hover:border-nova-300'
              )}
            >
              <div className="flex items-center gap-1 mb-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: p.primary }} />
                <div className="w-3 h-3 rounded-full" style={{ background: p.secondary }} />
                <div className="w-3 h-3 rounded-full" style={{ background: p.accent }} />
              </div>
              <p className="text-xs font-semibold">{p.name}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-4 space-y-3">
        <p className="text-xs text-ink-500">自定义</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(['primary', 'secondary', 'accent'] as const).map((k) => (
            <div key={k}>
              <label className="text-[10px] text-ink-500 mb-1 block">
                {k === 'primary' ? '主色' : k === 'secondary' ? '次色' : '强调'}
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={theme[k]}
                  onChange={(e) => update(k, e.target.value)}
                  className="w-10 h-9 rounded-lg cursor-pointer border border-ink-200"
                />
                <input
                  value={theme[k]}
                  onChange={(e) => update(k, e.target.value)}
                  className="flex-1 px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none font-mono"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-ink-500 mb-1 block">圆角</label>
            <div className="flex gap-1">
              {(['sharp', 'medium', 'round'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => update('radius', r)}
                  className={cn(
                    'flex-1 h-8 text-xs font-medium transition',
                    theme.radius === r
                      ? 'bg-nova-500 text-white'
                      : 'bg-ink-100 dark:bg-ink-800 text-ink-600'
                  )}
                  style={{
                    borderRadius: r === 'sharp' ? '0.25rem' : r === 'round' ? '1rem' : '0.5rem',
                  }}
                >
                  {r === 'sharp' ? '硬朗' : r === 'round' ? '圆润' : '适中'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-ink-500 mb-1 block">字体</label>
            <div className="flex gap-1">
              {(['sans', 'serif', 'mono'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => update('font', f)}
                  className={cn(
                    'flex-1 h-8 text-xs font-medium transition',
                    theme.font === f
                      ? 'bg-nova-500 text-white'
                      : 'bg-ink-100 dark:bg-ink-800 text-ink-600'
                  )}
                  style={{ fontFamily: f === 'serif' ? 'Georgia, serif' : f === 'mono' ? 'Menlo, monospace' : 'system-ui' }}
                >
                  {f === 'sans' ? 'Sans' : f === 'serif' ? 'Serif' : 'Mono'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Eye className="w-3.5 h-3.5 text-nova-500" />
          <p className="text-xs text-ink-500">实时预览</p>
        </div>
        <div
          className="p-4 rounded-2xl"
          style={{ background: theme.bg, color: theme.text, borderRadius: theme.radius === 'sharp' ? '0.25rem' : theme.radius === 'round' ? '1rem' : '0.5rem' }}
        >
          <h4 className="text-base font-bold mb-1" style={{ fontFamily: theme.font === 'serif' ? 'Georgia, serif' : theme.font === 'mono' ? 'Menlo, monospace' : 'inherit' }}>
            <Sparkles className="inline w-4 h-4 mr-1" style={{ color: theme.primary }} />
            Versa 主题预览
          </h4>
          <p className="text-xs opacity-70 mb-3">这是当前主题的实时预览效果</p>
          <div className="flex flex-wrap gap-2">
            <button
              className="px-3 h-8 text-xs font-semibold text-white"
              style={{ background: theme.primary, borderRadius: theme.radius === 'sharp' ? '0.25rem' : theme.radius === 'round' ? '1rem' : '0.5rem' }}
            >
              主按钮
            </button>
            <button
              className="px-3 h-8 text-xs font-semibold text-white"
              style={{ background: theme.secondary, borderRadius: theme.radius === 'sharp' ? '0.25rem' : theme.radius === 'round' ? '1rem' : '0.5rem' }}
            >
              次按钮
            </button>
            <button
              className="px-3 h-8 text-xs font-semibold"
              style={{ background: theme.accent + '20', color: theme.accent, borderRadius: theme.radius === 'sharp' ? '0.25rem' : theme.radius === 'round' ? '1rem' : '0.5rem' }}
            >
              强调
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
