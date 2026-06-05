/**
 * Versa · PWA 状态组件 (v15.0)
 * - 在线/离线指示器
 * - 安装按钮
 * - 更新提示
 * - 缓存统计
 */
import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Download, RefreshCw, Trash2, X, Bell } from 'lucide-react'
import { pwaState, promptInstall, applyUpdate, clearCaches, formatBytes, refreshCacheSize, requestNotificationPermission } from '.'

export function OfflineIndicator() {
  const [online, setOnline] = useState(pwaState.value.online)

  useEffect(() => {
    const unsub = pwaState.subscribe((s) => setOnline(s.online))
    return unsub
  }, [])

  if (online) return null
  return (
    <div className="fixed top-0 inset-x-0 z-50 bg-amber-500/95 text-white text-center text-sm py-1.5 flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4" />
      <span>离线模式 · 您的更改将在恢复网络后自动同步</span>
    </div>
  )
}

export function PwaInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const unsub = pwaState.subscribe((s) => {
      setShow(s.installable && !s.installed)
    })
    return unsub
  }, [])

  if (!show) return null

  const onInstall = async () => {
    const r = await promptInstall()
    if (r === 'accepted' || r === 'dismissed') setShow(false)
  }

  const onClose = () => setShow(false)

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40">
      <div className="bg-white dark:bg-ink-900 rounded-2xl shadow-xl border border-ink-200/50 dark:border-ink-800/50 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
          <Download className="w-5 h-5 text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">安装 Versa App</h3>
          <p className="text-xs text-ink-500 mt-0.5">添加到主屏幕，离线也能用</p>
          <div className="flex gap-2 mt-2">
            <button onClick={onInstall} className="px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-medium">
              安装
            </button>
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">
              稍后
            </button>
          </div>
        </div>
        <button onClick={onClose} className="text-ink-400 hover:text-ink-600">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function PwaUpdatePrompt() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const unsub = pwaState.subscribe((s) => setShow(s.updateAvailable))
    return unsub
  }, [])

  if (!show) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-violet-500 text-white rounded-full px-4 py-2 shadow-lg flex items-center gap-3 text-sm">
        <RefreshCw className="w-4 h-4" />
        <span>新版本已就绪</span>
        <button onClick={() => applyUpdate()} className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
          刷新
        </button>
        <button onClick={() => setShow(false)} className="text-white/70 hover:text-white">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export function PwaStatusPanel() {
  const [state, setState] = useState({ cacheBytes: 0, swActive: false, online: true })
  const [perm, setPerm] = useState<NotificationPermission>('default')

  useEffect(() => {
    const unsub = pwaState.subscribe((s) => {
      setState({ cacheBytes: s.cacheBytes, swActive: s.swActive, online: s.online })
      refreshCacheSize().then((b) => setState((p) => ({ ...p, cacheBytes: b })))
    })
    if ('Notification' in window) setPerm(Notification.permission)
    return unsub
  }, [])

  const onNotify = async () => {
    const p = await requestNotificationPermission()
    setPerm(p)
  }

  const onClear = async () => {
    if (confirm('确定清空所有缓存? 这会让您离线数据丢失。')) {
      await clearCaches()
      const b = await refreshCacheSize()
      setState((p) => ({ ...p, cacheBytes: b }))
    }
  }

  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
      <h2 className="font-semibold mb-3">PWA 状态</h2>
      <div className="space-y-2 text-sm">
        <Row icon={state.online ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-amber-500" />} label={state.online ? '在线' : '离线'} />
        <Row icon={<span className={`w-2 h-2 rounded-full ${state.swActive ? 'bg-emerald-500' : 'bg-ink-300'}`} />} label={state.swActive ? 'Service Worker 已激活' : 'Service Worker 未激活'} />
        <Row icon={<Trash2 className="w-4 h-4 text-ink-500" />} label={`缓存大小: ${formatBytes(state.cacheBytes)}`} />
        <Row icon={<Bell className="w-4 h-4 text-ink-500" />} label={`通知权限: ${perm}`} />

        <div className="flex gap-2 pt-2">
          {perm !== 'granted' && (
            <button onClick={onNotify} className="px-3 py-1.5 rounded-lg bg-violet-500/10 text-violet-500 text-xs">
              开启通知
            </button>
          )}
          <button onClick={onClear} className="px-3 py-1.5 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">
            清空缓存
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </div>
  )
}
