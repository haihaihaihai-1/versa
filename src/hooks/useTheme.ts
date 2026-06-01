import { useEffect } from 'react'
import { useVersa } from '../store/versa'

export function useTheme() {
  const { preferences } = useVersa()

  useEffect(() => {
    const root = document.documentElement
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      let isDark = preferences.theme === 'dark'
      if (preferences.theme === 'system') isDark = mql.matches
      root.classList.toggle('dark', isDark)
      root.style.colorScheme = isDark ? 'dark' : 'light'
    }
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [preferences.theme])
}
