import { useEffect, useState, useCallback } from 'react'

export type AccentTheme = 'nova' | 'ocean' | 'sunset' | 'forest' | 'cyber' | 'rose'
const STORAGE_KEY = 'versa:accent'

export interface AccentPreset {
  key: AccentTheme
  name: string
  emoji: string
  hue: number
  description: string
  gradient: string
  swatches: {
    50: string
    100: string
    200: string
    300: string
    400: string
    500: string
    600: string
    700: string
    800: string
    900: string
  }
}

function hsv(h: number, s: number, v: number) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const to = (v2: number) => Math.round((v2 + m) * 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

function genSwatches(hue: number) {
  return {
    50:  hsv(hue, 0.35, 0.99),
    100: hsv(hue, 0.45, 0.96),
    200: hsv(hue, 0.55, 0.90),
    300: hsv(hue, 0.65, 0.80),
    400: hsv(hue, 0.75, 0.70),
    500: hsv(hue, 0.80, 0.60),
    600: hsv(hue, 0.80, 0.50),
    700: hsv(hue, 0.75, 0.40),
    800: hsv(hue, 0.65, 0.30),
    900: hsv(hue, 0.60, 0.22),
  }
}

function makePreset(key: AccentTheme, name: string, emoji: string, hue: number, description: string, gradient: string): AccentPreset {
  return { key, name, emoji, hue, description, gradient, swatches: genSwatches(hue) }
}

export const ACCENT_PRESETS: AccentPreset[] = [
  makePreset('nova',   '星云紫', '💜', 268, 'Versa 默认', 'from-violet-500 to-fuchsia-500'),
  makePreset('ocean',  '深海蓝', '🌊', 215, '冷静专业',   'from-blue-500 to-cyan-500'),
  makePreset('sunset', '日落橙', '🌅',  20, '温暖活力',   'from-orange-500 to-rose-500'),
  makePreset('forest', '森林绿', '🌲', 150, '自然清新',   'from-emerald-500 to-teal-500'),
  makePreset('cyber',  '赛博粉', '⚡', 320, '未来感',     'from-pink-500 to-purple-600'),
  makePreset('rose',   '玫瑰红', '🌹', 350, '浪漫优雅',   'from-rose-500 to-pink-500'),
]

function applyAccent(theme: AccentTheme) {
  if (typeof document === 'undefined') return
  const preset = ACCENT_PRESETS.find((p) => p.key === theme)
  if (!preset) return
  const root = document.documentElement
  const s = preset.swatches
  root.style.setProperty('--accent-hue', String(preset.hue))
  root.style.setProperty('--color-nova-50',  s[50])
  root.style.setProperty('--color-nova-100', s[100])
  root.style.setProperty('--color-nova-200', s[200])
  root.style.setProperty('--color-nova-300', s[300])
  root.style.setProperty('--color-nova-400', s[400])
  root.style.setProperty('--color-nova-500', s[500])
  root.style.setProperty('--color-nova-600', s[600])
  root.style.setProperty('--color-nova-700', s[700])
  root.style.setProperty('--color-nova-800', s[800])
  root.style.setProperty('--color-nova-900', s[900])
  document.body.dataset.accent = theme
}

export function useAccentTheme() {
  const [theme, setThemeState] = useState<AccentTheme>(() => {
    if (typeof window === 'undefined') return 'nova'
    return (localStorage.getItem(STORAGE_KEY) as AccentTheme) || 'nova'
  })

  useEffect(() => {
    applyAccent(theme)
    try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
  }, [theme])

  const setTheme = useCallback((t: AccentTheme) => setThemeState(t), [])
  const current = ACCENT_PRESETS.find((p) => p.key === theme) || ACCENT_PRESETS[0]

  return { theme, setTheme, current, presets: ACCENT_PRESETS }
}

