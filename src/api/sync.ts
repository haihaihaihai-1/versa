/**
 * Versa · 离线同步队列 (v10.0)
 *
 * 设计：
 * - 所有"写"操作先入队本地 (localStorage)
 * - 后台定时 (5s) flush 到 PocketBase
 * - 失败保留在队列最前面 (指数退避)
 * - 用户在 Settings 页面可手动 Flush / 清空
 */

export type SyncOp =
  | { op: 'create'; collection: string; data: any }
  | { op: 'update'; collection: string; id: string; data: any }
  | { op: 'delete'; collection: string; id: string }

interface QueueEntry {
  id: string
  ts: number
  retries: number
  payload: SyncOp
}

const QUEUE_KEY = 'versa:sync:queue'
const MAX_RETRIES = 5

class SyncQueue {
  private items: QueueEntry[] = []
  private flushing = false
  private timer: ReturnType<typeof setInterval> | null = null
  private listeners = new Set<() => void>()

  constructor() {
    this.load()
    this.start()
  }

  private load() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY)
      if (raw) this.items = JSON.parse(raw)
    } catch {}
  }

  private save() {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(this.items))
    } catch {}
  }

  private start() {
    if (typeof window === 'undefined') return
    if (this.timer) return
    this.timer = setInterval(() => {
      if (navigator.onLine) this.flush()
    }, 5000)
    window.addEventListener('online', () => this.flush())
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  enqueue(payload: SyncOp) {
    this.items.push({
      id: crypto.randomUUID(),
      ts: Date.now(),
      retries: 0,
      payload,
    })
    this.save()
    this.notify()
  }

  get size() {
    return this.items.length
  }

  get entries(): ReadonlyArray<QueueEntry> {
    return this.items
  }

  async flush(): Promise<{ success: number; failed: number }> {
    if (this.flushing) return { success: 0, failed: 0 }
    if (!navigator.onLine) return { success: 0, failed: 0 }
    this.flushing = true
    let success = 0
    let failed = 0
    const remaining: QueueEntry[] = []
    for (const entry of this.items) {
      try {
        await this.exec(entry.payload)
        success++
      } catch (e) {
        entry.retries++
        if (entry.retries >= MAX_RETRIES) {
          console.error('[sync] 超过最大重试，丢弃', entry)
          failed++
        } else {
          remaining.push(entry)
        }
      }
    }
    this.items = remaining
    this.save()
    this.flushing = false
    this.notify()
    return { success, failed }
  }

  private async exec(payload: SyncOp): Promise<void> {
    const mod = await import('./repository')
    const repo = (mod as any)[`${payload.collection}Repo`]
    if (!repo) throw new Error(`[sync] repo ${payload.collection} 不存在`)
    switch (payload.op) {
      case 'create': return repo.create(payload.data)
      case 'update': return repo.update(payload.id, payload.data)
      case 'delete': return repo.remove(payload.id)
    }
  }

  clear() {
    this.items = []
    this.save()
    this.notify()
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private notify() {
    this.listeners.forEach((fn) => fn())
  }
}

export const syncQueue = new SyncQueue()
