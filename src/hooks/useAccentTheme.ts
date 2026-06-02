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
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { key: 'nova', name: '星云紫', emoji: '💜', hue: 268, description: 'Versa 默认', gradient: 'from-violet-500 to-fuchsia-500' },
  { key: 'ocean', name: '深海蓝', emoji: '🌊', hue: 215, description: '冷静专业', gradient: 'from-blue-500 to-cyan-500' },
  { key: 'sunset', name: '日落橙', emoji: '🌅', hue: 25, description: '温暖活力', gradient: 'from-orange-500 to-rose-500' },
  { key: 'forest', name: '森林绿', emoji: '🌲', hue: 150, description: '自然清新', gradient: 'from-emerald-500 to-teal-500' },
  { key: 'cyber', name: '赛博粉', emoji: '⚡', hue: 320, description: '未来感', gradient: 'from-pink-500 to-purple-600' },
  { key: 'rose', name: '玫瑰红', emoji: '🌹', hue: 350, description: '浪漫优雅', gradient: 'from-rose-500 to-pink-500' },
]

function applyAccent(theme: AccentTheme) {
  if (typeof document === 'undefined') return
  const preset = ACCENT_PRESETS.find((p) => p.key === theme)
  if (!preset) return
  const root = document.documentElement
  // Override the --primary CSS variable (and a few related)
  root.style.setProperty('--accent-hue', String(preset.hue))
  // Apply to common accent classes via inline style on body
  document.body.dataset.accent = theme
}

export function useAccentTheme() {
  const [theme, setThemeState] = useState<AccentTheme>(() => {
    if (typeof window === 'undefined') return 'nova'
    return (localStorage.getItem(STORAGE_KEY) as AccentTheme) || 'nova'
  })

  useEffect(() => {
    applyAccent(theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((t: AccentTheme) => setThemeState(t), [])
  const current = ACCENT_PRESETS.find((p) => p.key === theme) || ACCENT_PRESETS[0]

  return { theme, setTheme, current, presets: ACCENT_PRESETS }
}
