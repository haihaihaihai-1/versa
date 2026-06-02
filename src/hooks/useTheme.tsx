import { useEffect, useState, useCallback } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
const STORAGE_KEY = 'versa:theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const resolved = mode === 'system' ? getSystemTheme() : mode
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
  const meta = document.querySelector('meta[name="theme-color"]:not([media])')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0b0b14' : '#fafafa')
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system'
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    return stored || 'system'
  })

  useEffect(() => {
    applyTheme(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }, [mode])

  useEffect(() => {
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const setMode = useCallback((m: ThemeMode) => setModeState(m), [])

  return { mode, setMode, resolved: mode === 'system' ? getSystemTheme() : mode }
}

export function ThemeToggle() {
  const { mode, setMode, resolved } = useTheme()
  const opts: { key: ThemeMode; label: string; icon: string }[] = [
    { key: 'light', label: '浅色', icon: '☀️' },
    { key: 'dark', label: '深色', icon: '🌙' },
    { key: 'system', label: '系统', icon: '🖥️' },
  ]
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-ink-100 dark:bg-ink-800 border border-ink-200 dark:border-ink-700">
      {opts.map((o) => {
        const active = mode === o.key
        return (
          <button
            key={o.key}
            onClick={() => setMode(o.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1 ${
              active
                ? 'bg-white dark:bg-ink-700 shadow-sm text-ink-900 dark:text-white'
                : 'text-ink-500 hover:text-ink-700 dark:hover:text-ink-300'
            }`}
            title={o.label}
          >
            <span>{o.icon}</span>
            <span className="hidden sm:inline">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
