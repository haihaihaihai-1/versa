// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { syncQueue, type SyncOp } from '../sync'

beforeEach(() => {
  localStorage.clear()
  syncQueue.clear()
})

describe('sync · syncQueue', () => {
  it('初始为空', () => {
    expect(syncQueue.size).toBe(0)
    expect(syncQueue.entries.length).toBe(0)
  })

  it('enqueue 推入任务', () => {
    syncQueue.enqueue({ op: 'create', collection: 'posts', data: { title: 'x' } })
    expect(syncQueue.size).toBe(1)
    const entry = syncQueue.entries[0]
    expect(entry.payload.collection).toBe('posts')
    expect(entry.payload.op).toBe('create')
    expect((entry.payload as any).data.title).toBe('x')
    expect(entry.id).toBeTruthy()
    expect(entry.ts).toBeGreaterThan(0)
    expect(entry.retries).toBe(0)
  })

  it('多次 enqueue 累积', () => {
    syncQueue.enqueue({ op: 'create', collection: 'a', data: {} })
    syncQueue.enqueue({ op: 'update', collection: 'b', id: '1', data: { x: 1 } })
    syncQueue.enqueue({ op: 'delete', collection: 'c', id: '2' })
    expect(syncQueue.size).toBe(3)
  })

  it('持久化到 localStorage', () => {
    syncQueue.enqueue({ op: 'create', collection: 'posts', data: { x: 1 } })
    const stored = JSON.parse(localStorage.getItem('versa:sync:queue') || '[]')
    expect(stored.length).toBe(1)
    expect(stored[0].payload.collection).toBe('posts')
  })

  it('clear 清空', () => {
    syncQueue.enqueue({ op: 'create', collection: 'a', data: {} })
    syncQueue.enqueue({ op: 'create', collection: 'b', data: {} })
    syncQueue.clear()
    expect(syncQueue.size).toBe(0)
  })

  it('subscribe 收到通知', () => {
    let calls = 0
    const unsub = syncQueue.subscribe(() => calls++)
    syncQueue.enqueue({ op: 'create', collection: 'a', data: {} })
    syncQueue.clear()
    expect(calls).toBeGreaterThanOrEqual(2)
    unsub()
  })
})

describe('sync · SyncOp 类型', () => {
  it('create 必有 data', () => {
    const op: SyncOp = { op: 'create', collection: 'p', data: { title: 't' } }
    expect(op.op).toBe('create')
  })
  it('update 必有 id + data', () => {
    const op: SyncOp = { op: 'update', collection: 'p', id: 'x', data: {} }
    expect(op.op).toBe('update')
  })
  it('delete 只需 id', () => {
    const op: SyncOp = { op: 'delete', collection: 'p', id: 'x' }
    expect(op.op).toBe('delete')
  })
})

describe('sync · flush 错误隔离', () => {
  it('navigator.onLine = false → 不动队列', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    syncQueue.enqueue({ op: 'create', collection: 'a', data: {} })
    const r = await syncQueue.flush()
    expect(r.success).toBe(0)
    expect(r.failed).toBe(0)
    expect(syncQueue.size).toBe(1)
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('未知 collection → 失败 → 重试到上限后丢弃', async () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    syncQueue.enqueue({ op: 'create', collection: '__nope__', data: {} })
    // 5 次
    for (let i = 0; i < 5; i++) {
      await syncQueue.flush()
    }
    expect(syncQueue.size).toBe(0)
  })
})
