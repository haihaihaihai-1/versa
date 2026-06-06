import { describe, it, expect, vi } from 'vitest'
import { DLQManager, getDLQ, resetDLQ } from '../index'

describe('DLQManager — add', () => {
  it('adds a message', () => {
    const m = new DLQManager()
    const msg = m.add({ data: 1 }, 'webhook', 'timeout')
    expect(msg.id).toMatch(/^dlq_/)
    expect(msg.status).toBe('pending')
    expect(msg.attempts).toBe(0)
    expect(m.get(msg.id)).toBe(msg)
  })
  it('throws when full', () => {
    const m = new DLQManager({ maxQueueSize: 2 })
    m.add({}, 'a', 'err')
    m.add({}, 'a', 'err')
    expect(() => m.add({}, 'a', 'err')).toThrow('DLQ is full')
  })
  it('respects maxAttempts option', () => {
    const m = new DLQManager()
    const msg = m.add({}, 'a', 'err', { maxAttempts: 2 })
    expect(msg.maxAttempts).toBe(2)
  })
  it('preserves tags + metadata', () => {
    const m = new DLQManager()
    const msg = m.add({}, 'a', 'err', { tags: ['urgent'], metadata: { key: 'v' } })
    expect(msg.tags).toEqual(['urgent'])
    expect(msg.metadata).toEqual({ key: 'v' })
  })
})

describe('DLQManager — retry lifecycle', () => {
  it('attemptRetry increments attempts', () => {
    const m = new DLQManager()
    const msg = m.add({}, 'a', 'err')
    expect(m.attemptRetry(msg.id)).toBe(true)
    expect(m.get(msg.id)?.attempts).toBe(1)
    expect(m.get(msg.id)?.status).toBe('retrying')
  })
  it('success removes from queue', () => {
    const m = new DLQManager()
    const msg = m.add({}, 'a', 'err')
    m.attemptRetry(msg.id)
    expect(m.success(msg.id)).toBe(true)
    expect(m.get(msg.id)).toBeUndefined()
  })
  it('fail reschedules', () => {
    const m = new DLQManager()
    const msg = m.add({}, 'a', 'err')
    m.attemptRetry(msg.id)
    expect(m.fail(msg.id, 'still failing')).toBe(true)
    expect(m.get(msg.id)?.attempts).toBe(1)
    expect(m.get(msg.id)?.error).toBe('still failing')
  })
  it('parks at max attempts', () => {
    const m = new DLQManager({ defaultMaxAttempts: 2, defaultBackoffMs: () => 0 })
    const msg = m.add({}, 'a', 'err')
    m.attemptRetry(msg.id)
    m.fail(msg.id, 'e1')
    m.attemptRetry(msg.id)
    m.fail(msg.id, 'e2')
    // After 2 failed attempts, scheduleRetry parks
    expect(m.get(msg.id)?.status).toBe('parked')
  })
  it('park fires alert', () => {
    const alert = vi.fn()
    const m = new DLQManager({ onAlert: alert })
    const msg = m.add({}, 'a', 'err')
    m.park(msg.id, 'manual-park')
    expect(alert).toHaveBeenCalledOnce()
  })
  it('unpark resets for retry', () => {
    const m = new DLQManager()
    const msg = m.add({}, 'a', 'err')
    m.park(msg.id, 'test')
    expect(m.unpark(msg.id)).toBe(true)
    expect(m.get(msg.id)?.status).toBe('pending')
  })
  it('unpark only when parked', () => {
    const m = new DLQManager()
    const msg = m.add({}, 'a', 'err')
    expect(m.unpark(msg.id)).toBe(false)
  })
  it('discard removes', () => {
    const m = new DLQManager()
    const msg = m.add({}, 'a', 'err')
    expect(m.discard(msg.id)).toBe(true)
    expect(m.get(msg.id)).toBeUndefined()
  })
})

describe('DLQManager — list & filter', () => {
  it('list all', () => {
    const m = new DLQManager()
    m.add({}, 'webhook', 'e1')
    m.add({}, 'webhook', 'e2')
    m.add({}, 'queue', 'e3')
    expect(m.list()).toHaveLength(3)
  })
  it('filter by status', () => {
    const m = new DLQManager()
    const a = m.add({}, 'a', 'e')
    m.park(a.id, 'test')
    expect(m.list({ status: 'parked' })).toHaveLength(1)
  })
  it('filter by source', () => {
    const m = new DLQManager()
    m.add({}, 'webhook', 'e')
    m.add({}, 'queue', 'e')
    expect(m.list({ source: 'webhook' })).toHaveLength(1)
  })
  it('filter by tag', () => {
    const m = new DLQManager()
    m.add({}, 'a', 'e', { tags: ['urgent'] })
    m.add({}, 'a', 'e', { tags: ['low'] })
    expect(m.list({ tag: 'urgent' })).toHaveLength(1)
  })
})

describe('DLQManager — bulk & expire', () => {
  it('bulkReplay by source', () => {
    const m = new DLQManager()
    const a = m.add({}, 'webhook', 'e')
    m.park(a.id, 't')
    const b = m.add({}, 'queue', 'e')
    m.park(b.id, 't')
    const n = m.bulkReplay({ source: 'webhook' })
    expect(n).toBe(1)
    expect(m.get(a.id)?.status).toBe('pending')
    expect(m.get(b.id)?.status).toBe('parked')
  })
  it('expire removes old', () => {
    const m = new DLQManager({ expirationMs: 100 })
    const msg = m.add({}, 'a', 'e')
    ;(msg as { createdAt: number }).createdAt = Date.now() - 200
    expect(m.expire()).toBe(1)
    expect(m.get(msg.id)).toBeUndefined()
  })
  it('expire keeps fresh', () => {
    const m = new DLQManager({ expirationMs: 10000 })
    m.add({}, 'a', 'e')
    expect(m.expire()).toBe(0)
  })
  it('readyToRetry returns scheduled', async () => {
    const m = new DLQManager({ defaultBackoffMs: () => 5 })
    const msg = m.add({}, 'a', 'e')
    await new Promise(r => setTimeout(r, 30))
    // Manually check with future timestamp
    const ready = m.readyToRetry(Date.now() + 1000)
    expect(ready).toHaveLength(1)
  })
  it('forceRetry attempts immediately', () => {
    const m = new DLQManager({ defaultBackoffMs: () => 60000 })
    const msg = m.add({}, 'a', 'e')
    expect(m.forceRetry(msg.id)).toBe(true)
    expect(m.get(msg.id)?.attempts).toBe(1)
  })
})

describe('DLQManager — metrics', () => {
  it('counts statuses', () => {
    const m = new DLQManager()
    m.add({}, 'a', 'e')
    m.add({}, 'a', 'e')
    m.add({}, 'a', 'e')
    const metrics = m.metrics()
    expect(metrics.total).toBe(3)
    expect(metrics.pending).toBe(3)
  })
  it('clear resets all', () => {
    const m = new DLQManager()
    m.add({}, 'a', 'e')
    m.clear()
    expect(m.metrics().total).toBe(0)
  })
})

describe('Singleton', () => {
  it('getDLQ same instance', () => {
    resetDLQ()
    expect(getDLQ()).toBe(getDLQ())
  })
  it('resetDLQ creates new', () => {
    const a = getDLQ()
    resetDLQ()
    expect(a).not.toBe(getDLQ())
  })
})
