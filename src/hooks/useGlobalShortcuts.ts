import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type Shortcut = {
  key: string
  label: string
  desc: string
  action: () => void
}

export function useGlobalShortcuts() {
  const navigate = useNavigate()
  const [helpOpen, setHelpOpen] = useState(false)

  const shortcuts: Shortcut[] = [
    { key: 'g h', label: 'g h', desc: '前往首页', action: () => navigate('/') },
    { key: 'g s', label: 'g s', desc: '前往商城', action: () => navigate('/shop') },
    { key: 'g d', label: 'g d', desc: '前往辩论', action: () => navigate('/debates') },
    { key: 'g n', label: 'g n', desc: '前往资讯', action: () => navigate('/news') },
    { key: 'g c', label: 'g c', desc: '前往购物车', action: () => navigate('/cart') },
    { key: 'g f', label: 'g f', desc: '前往为你推荐', action: () => navigate('/foryou') },
    { key: 'g /', label: 'g /', desc: '全局搜索', action: () => navigate('/discover') },
    { key: 'g u', label: 'g u', desc: '个人主页', action: () => navigate('/profile') },
    { key: 'g a', label: 'g a', desc: '管理员', action: () => navigate('/admin') },
    { key: 'g k', label: 'g k', desc: '签到', action: () => navigate('/checkin') },
    { key: '?', label: '?', desc: '快捷键帮助', action: () => setHelpOpen(true) },
    { key: 'esc', label: 'Esc', desc: '关闭弹窗', action: () => setHelpOpen(false) },
  ]

  useEffect(() => {
    let pending: string | null = null
    let pendingTimer: ReturnType<typeof setTimeout> | null = null

    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false
      const tag = el.tagName.toLowerCase()
      return tag === 'input' || tag === 'textarea' || el.isContentEditable
    }

    const onKey = (e: KeyboardEvent) => {
      if (isEditable(e.target)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // 单键快捷键
      if (e.key === '?') {
        e.preventDefault()
        setHelpOpen((v) => !v)
        return
      }
      if (e.key === 'Escape') {
        setHelpOpen(false)
        return
      }

      // 两键前缀 (g + x)
      if (e.key.toLowerCase() === 'g') {
        pending = 'g'
        if (pendingTimer) clearTimeout(pendingTimer)
        pendingTimer = setTimeout(() => {
          pending = null
        }, 1000)
        return
      }
      if (pending === 'g') {
        const combo = `g ${e.key.toLowerCase()}`
        const sc = shortcuts.find((s) => s.key === combo)
        if (sc) {
          e.preventDefault()
          sc.action()
        }
        pending = null
        if (pendingTimer) clearTimeout(pendingTimer)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return { helpOpen, setHelpOpen, shortcuts }
}
