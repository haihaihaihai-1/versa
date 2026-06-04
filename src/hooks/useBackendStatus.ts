/**
 * Versa · 后端状态 hook (v10.0)
 * 监控 PB 连接 / 离线队列 / 健康度
 */

import { useEffect, useState } from 'react'
import { pb, isPocketBaseEnabled } from '../api/pb'
import { syncQueue } from '../api/sync'

export interface BackendStatus {
  mode: 'local' | 'pocketbase' | 'unknown'
  online: boolean
  pbHealthy: boolean
  pbUrl: string
  queueSize: number
  flushing: boolean
  lastFlushAt: number | null
}

export function useBackendStatus(): BackendStatus {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [pbHealthy, setPbHealthy] = useState(false)
  const [queueSize, setQueueSize] = useState(syncQueue.size)
  const [lastFlushAt, setLastFlushAt] = useState<number | null>(null)

  useEffect(() => {
    const onOn = () => setOnline(true)
    const onOff = () => setOnline(false)
    window.addEventListener('online', onOn)
    window.addEventListener('offline', onOff)

    const unsub = syncQueue.subscribe(() => setQueueSize(syncQueue.size))

    if (isPocketBaseEnabled()) {
      pb.health().then((h) => setPbHealthy(h.code === 200))
      const t = setInterval(() => {
        pb.health().then((h) => setPbHealthy(h.code === 200))
      }, 30_000)
      return () => {
        window.removeEventListener('online', onOn)
        window.removeEventListener('offline', onOff)
        clearInterval(t)
        unsub()
      }
    }
    return () => {
      window.removeEventListener('online', onOn)
      window.removeEventListener('offline', onOff)
      unsub()
    }
  }, [])

  const flush = async () => {
    const r = await syncQueue.flush()
    if (r.success > 0) setLastFlushAt(Date.now())
  }

  return {
    mode: isPocketBaseEnabled() ? 'pocketbase' : 'local',
    online,
    pbHealthy,
    pbUrl: (import.meta as any).env?.VITE_PB_URL || '',
    queueSize,
    flushing: false,
    lastFlushAt,
  } as BackendStatus & { flush: () => Promise<void> }
}
