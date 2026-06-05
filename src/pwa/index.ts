/**
 * Versa · PWA 注册 (v15.0)
 * - 注册 Service Worker
 * - 监听更新
 * - 暴露安装提示钩子
 * - 缓存统计
 */

export interface PwaState {
  installed: boolean
  installable: boolean
  online: boolean
  swActive: boolean
  updateAvailable: boolean
  cacheBytes: number
}

type Listener<T> = (s: T) => void

class SimpleStore<T> {
  private _value: T
  private _listeners: Set<Listener<T>> = new Set()
  constructor(initial: T) { this._value = initial }
  get value() { return this._value }
  set value(v: T) { this._value = v; this._listeners.forEach((l) => l(v)) }
  update(fn: (s: T) => T) { this._value = fn(this._value); this._listeners.forEach((l) => l(this._value)) }
  subscribe(l: Listener<T>) { this._listeners.add(l); l(this._value); return () => { this._listeners.delete(l) } }
}

const STORAGE_KEY_DEFER = 'versa:pwa:install-deferred'

export const pwaState = new SimpleStore<PwaState>({
  installed: false,
  installable: false,
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  swActive: false,
  updateAvailable: false,
  cacheBytes: 0,
})

let deferredPrompt: any = null
let swRegistration: ServiceWorkerRegistration | null = null

export async function registerPWA(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null

  try {
    swRegistration = await navigator.serviceWorker.register('./sw.js', { scope: './' })

    pwaState.update((s) => ({ ...s, swActive: true }))

    swRegistration.addEventListener('updatefound', () => {
      const newWorker = swRegistration!.installing
      if (!newWorker) return
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          pwaState.update((s) => ({ ...s, updateAvailable: true }))
        }
      })
    })

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      pwaState.update((s) => ({ ...s, swActive: true }))
    })

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'CACHE_SIZE') {
        pwaState.update((s) => ({ ...s, cacheBytes: event.data.bytes }))
      }
      if (event.data?.type === 'outbox-flushed') {
        console.info('[PWA] outbox flushed', event.data.count)
      }
    })

    window.addEventListener('online', () => pwaState.update((s) => ({ ...s, online: true })))
    window.addEventListener('offline', () => pwaState.update((s) => ({ ...s, online: false })))

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferredPrompt = e
      pwaState.update((s) => ({ ...s, installable: true }))
    })

    window.addEventListener('appinstalled', () => {
      pwaState.update((s) => ({ ...s, installed: true, installable: false }))
      deferredPrompt = null
    })

    return swRegistration
  } catch (e) {
    console.warn('[PWA] 注册失败:', e)
    return null
  }
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable'
  try {
    deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    deferredPrompt = null
    pwaState.update((s) => ({ ...s, installable: false }))
    if (choice.outcome === 'accepted') {
      try { localStorage.removeItem(STORAGE_KEY_DEFER) } catch {}
    } else {
      try { localStorage.setItem(STORAGE_KEY_DEFER, String(Date.now())) } catch {}
    }
    return choice.outcome
  } catch {
    return 'unavailable'
  }
}

export function shouldShowInstallPrompt(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const last = Number(localStorage.getItem(STORAGE_KEY_DEFER) || 0)
    if (last && Date.now() - last < 7 * 24 * 60 * 60 * 1000) return false
  } catch {}
  return true
}

export async function applyUpdate(): Promise<void> {
  if (!swRegistration?.waiting) return
  swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' })
  await new Promise((r) => setTimeout(r, 500))
  window.location.reload()
}

export async function clearCaches(): Promise<void> {
  if (!navigator.serviceWorker?.controller) {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    } catch {}
    return
  }
  navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHES' })
}

export async function refreshCacheSize(): Promise<number> {
  if (!navigator.serviceWorker?.controller) return 0
  return new Promise((resolve) => {
    const channel = new MessageChannel()
    channel.port1.onmessage = (e) => resolve(e.data?.bytes || 0)
    navigator.serviceWorker!.controller!.postMessage({ type: 'GET_CACHE_SIZE' }, [channel.port2])
    setTimeout(() => resolve(0), 1000)
  })
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return await Notification.requestPermission()
}

export function formatBytes(b: number): string {
  if (b === 0) return '0 B'
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(b) / Math.log(k))
  return `${(b / Math.pow(k, i)).toFixed(1)} ${units[i]}`
}
