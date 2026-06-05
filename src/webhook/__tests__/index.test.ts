import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WebhookService, type WebhookSubscription } from '../index'

describe('WebhookService · subscription CRUD', () => {
  let svc: WebhookService
  beforeEach(() => { svc = new WebhookService() })
  it('createSubscription + list', () => {
    const s = svc.createSubscription({ url: 'https://x', events: ['order.created'], secret: 'k', enabled: true, headers: {}, maxAttempts: 3, initialBackoffMs: 100, maxBackoffMs: 1000, timeoutMs: 5000, deadLetterOnFailure: true, tags: ['orders'] })
    expect(svc.listSubscriptions().length).toBe(1)
    expect(svc.getSubscription(s.id)!.url).toBe('https://x')
  })
  it('updateSubscription', () => {
    const s = svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 100, maxBackoffMs: 1000, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    const u = svc.updateSubscription(s.id, { url: 'b', enabled: false })
    expect(u?.url).toBe('b')
    expect(u?.enabled).toBe(false)
  })
  it('deleteSubscription', () => {
    const s = svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 100, maxBackoffMs: 1000, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    expect(svc.deleteSubscription(s.id)).toBe(true)
    expect(svc.getSubscription(s.id)).toBeUndefined()
  })
  it('enableSubscription', () => {
    const s = svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 100, maxBackoffMs: 1000, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    svc.enableSubscription(s.id, false)
    expect(svc.getSubscription(s.id)!.enabled).toBe(false)
  })
  it('listSubscriptions filters by tag / enabled / event', () => {
    svc.createSubscription({ url: 'a', events: ['order.*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 100, maxBackoffMs: 1000, timeoutMs: 1000, deadLetterOnFailure: false, tags: ['orders'] })
    svc.createSubscription({ url: 'b', events: '*', secret: 'k', enabled: false, headers: {}, maxAttempts: 1, initialBackoffMs: 100, maxBackoffMs: 1000, timeoutMs: 1000, deadLetterOnFailure: false, tags: ['all'] })
    expect(svc.listSubscriptions({ tag: 'orders' }).length).toBe(1)
    expect(svc.listSubscriptions({ enabled: true }).length).toBe(1)
    expect(svc.listSubscriptions({ event: 'order.created' }).length).toBe(2)
  })
})

describe('WebhookService · publish', () => {
  it('publish + list', () => {
    const svc = new WebhookService()
    svc.publish('order.created', { id: 1 })
    svc.publish('order.created', { id: 2 })
    svc.publish('order.shipped', { id: 1 })
    expect(svc.listEvents().length).toBe(3)
    expect(svc.listEvents({ type: 'order.created' }).length).toBe(2)
    expect(svc.listEvents({ limit: 1 }).length).toBe(1)
  })
  it('getEvent', () => {
    const svc = new WebhookService()
    const e = svc.publish('x', {})
    expect(svc.getEvent(e.id)?.type).toBe('x')
  })
  it('listEvents since filter', () => {
    const svc = new WebhookService()
    svc.publish('a', {}); svc.publish('b', {})
    expect(svc.listEvents({ since: Date.now() - 1 }).length).toBe(2)
  })
})

describe('WebhookService · delivery (default transport 200)', () => {
  it('publishAndDeliver', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'https://a', events: ['order.*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 3, initialBackoffMs: 10, maxBackoffMs: 100, timeoutMs: 1000, deadLetterOnFailure: true, tags: [] })
    const d = await svc.publishAndDeliver('order.created', { id: 1 })
    expect(d.length).toBe(1)
    expect(d[0].status).toBe('success')
  })
  it('signature header present', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 10, maxBackoffMs: 100, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    let captured: { url: string; init: any } | null = null
    svc.transport = async (url, init) => { captured = { url, init }; return { status: 200, body: 'ok' } }
    await svc.publishAndDeliver('e', { x: 1 })
    expect(captured!.init.headers['X-Webhook-Signature']).toMatch(/^sha256=/)
    expect(captured!.init.headers['X-Webhook-Event']).toBe('e')
  })
  it('disabled sub is skipped', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: false, headers: {}, maxAttempts: 1, initialBackoffMs: 10, maxBackoffMs: 100, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    const d = await svc.publishAndDeliver('e', {})
    expect(d.length).toBe(0)
  })
  it('non-matching event skipped', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['order.*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 10, maxBackoffMs: 100, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    const d = await svc.publishAndDeliver('user.created', {})
    expect(d.length).toBe(0)
  })
  it('throws on missing sub', async () => {
    const svc = new WebhookService()
    const e = svc.publish('e', {})
    await expect(svc.deliver('nope', e.id)).rejects.toThrow()
  })
  it('throws on missing event', async () => {
    const svc = new WebhookService()
    const s = svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 10, maxBackoffMs: 100, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    await expect(svc.deliver(s.id, 'nope')).rejects.toThrow()
  })
})

describe('WebhookService · retry on failure', () => {
  it('retries on 5xx then dead-letters', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 3, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: true, tags: [] })
    let count = 0
    svc.transport = async () => { count++; return { status: 503, body: 'fail' } }
    const d = await svc.publishAndDeliver('e', {})
    expect(d[0].status).toBe('dead-letter')
    expect(count).toBe(3)
    expect(svc.getDeadLetter().length).toBe(1)
  })
  it('retries on transport error', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 2, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: true, tags: [] })
    let count = 0
    svc.transport = async () => { count++; throw new Error('network') }
    const d = await svc.publishAndDeliver('e', {})
    expect(d[0].status).toBe('dead-letter')
    expect(count).toBe(2)
  })
  it('failed (no dead letter) after max attempts', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 2, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    svc.transport = async () => ({ status: 500, body: 'fail' })
    const d = await svc.publishAndDeliver('e', {})
    expect(d[0].status).toBe('failed')
    expect(svc.getDeadLetter().length).toBe(0)
  })
  it('recovers after retry', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 3, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: true, tags: [] })
    let count = 0
    svc.transport = async () => { count++; return { status: count < 2 ? 500 : 200, body: 'ok' } }
    const d = await svc.publishAndDeliver('e', {})
    expect(d[0].status).toBe('success')
    expect(d[0].attempts).toBe(2)
  })
})

describe('WebhookService · HMAC sign / verify', () => {
  it('sign produces stable hex', () => {
    const svc = new WebhookService()
    const s1 = svc.sign('k', 'hello')
    const s2 = svc.sign('k', 'hello')
    expect(s1).toBe(s2)
    expect(s1).toMatch(/^[0-9a-f]+$/)
  })
  it('verify accepts matching signature', () => {
    const svc = new WebhookService()
    const s = svc.sign('k', 'hello')
    expect(svc.verify('k', 'hello', s)).toBe(true)
  })
  it('verify rejects different secret', () => {
    const svc = new WebhookService()
    const s = svc.sign('k1', 'hello')
    expect(svc.verify('k2', 'hello', s)).toBe(false)
  })
  it('different payload → different signature', () => {
    const svc = new WebhookService()
    expect(svc.sign('k', 'a')).not.toBe(svc.sign('k', 'b'))
  })
})

describe('WebhookService · history + replay', () => {
  it('getDelivery + listDeliveries', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    const d = await svc.publishAndDeliver('e', {})
    expect(svc.getDelivery(d[0].id)?.id).toBe(d[0].id)
    expect(svc.listDeliveries().length).toBe(1)
  })
  it('listDeliveries filters', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    await svc.publishAndDeliver('e1', {})
    await svc.publishAndDeliver('e2', {})
    expect(svc.listDeliveries({ eventType: 'e1' }).length).toBe(1)
  })
  it('replay creates new delivery', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    const d = await svc.publishAndDeliver('e', {})
    const r = await svc.replay(d[0].id)
    expect(r.id).not.toBe(d[0].id)
    expect(svc.listDeliveries().length).toBe(2)
  })
  it('replay throws on missing', async () => {
    const svc = new WebhookService()
    await expect(svc.replay('nope')).rejects.toThrow()
  })
  it('replayFailed', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    svc.transport = async () => ({ status: 500, body: 'fail' })
    const d = await svc.publishAndDeliver('e', {})
    svc.transport = async () => ({ status: 200, body: 'ok' })
    const r = await svc.replayFailed(d[0].subscriptionId)
    expect(r.length).toBe(1)
  })
})

describe('WebhookService · dead letter', () => {
  it('clearDeadLetter', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: true, tags: [] })
    svc.transport = async () => ({ status: 500, body: 'fail' })
    await svc.publishAndDeliver('e', {})
    expect(svc.getDeadLetter().length).toBe(1)
    svc.clearDeadLetter()
    expect(svc.getDeadLetter().length).toBe(0)
  })
  it('retryDeadLetter', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: true, tags: [] })
    svc.transport = async () => ({ status: 500, body: 'fail' })
    await svc.publishAndDeliver('e1', {})
    await svc.publishAndDeliver('e2', {})
    svc.transport = async () => ({ status: 200, body: 'ok' })
    const r = await svc.retryDeadLetter()
    expect(r.length).toBe(2)
    expect(svc.getDeadLetter().length).toBe(0)
  })
  it('retryDeadLetter filtered by sub', async () => {
    const svc = new WebhookService()
    const s1 = svc.createSubscription({ id: 's1', url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: true, tags: [] })
    const s2 = svc.createSubscription({ id: 's2', url: 'b', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: true, tags: [] })
    svc.transport = async () => ({ status: 500, body: 'fail' })
    await svc.publishAndDeliver('e', {})
    svc.transport = async () => ({ status: 200, body: 'ok' })
    const r = await svc.retryDeadLetter(s2.id)
    // s1's dead-letter entry remains; s2's is replayed
    expect(r.length).toBe(1)
    expect(svc.getDeadLetter().length).toBe(1)
    expect(svc.getDeadLetter()[0].delivery.subscriptionId).toBe(s1.id)
  })
})

describe('WebhookService · metrics', () => {
  it('totals & byEventType', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 1, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    await svc.publishAndDeliver('e1', {})
    await svc.publishAndDeliver('e2', {})
    svc.transport = async () => ({ status: 500, body: 'fail' })
    await svc.publishAndDeliver('e3', {})
    const m = svc.getMetrics()
    expect(m.totalEvents).toBe(3)
    expect(m.totalDeliveries).toBe(3)
    expect(m.totalSuccess).toBe(2)
    expect(m.totalFailed).toBe(1)
    expect(m.successRate).toBeCloseTo(2 / 3, 1)
  })
  it('resetMetrics', () => {
    const svc = new WebhookService()
    svc.publish('e', {})
    svc.resetMetrics()
    expect(svc.getMetrics().totalEvents).toBe(0)
  })
})

describe('WebhookService · backoff integration', () => {
  it('computeBackoffFor is exponential', () => {
    const svc = new WebhookService()
    const sub: WebhookSubscription = { id: 'x', url: 'a', events: '*', secret: 'k', enabled: true, headers: {}, maxAttempts: 5, initialBackoffMs: 100, maxBackoffMs: 1000, timeoutMs: 1000, deadLetterOnFailure: false, createdAt: 0, totalDelivered: 0, totalFailed: 0, tags: [] }
    const b1 = svc.computeBackoffFor(1, sub)
    const b2 = svc.computeBackoffFor(2, sub)
    const b3 = svc.computeBackoffFor(3, sub)
    expect(b2).toBeGreaterThanOrEqual(b1)
    expect(b3).toBeGreaterThanOrEqual(b2)
  })
  it('deliverWithRetry', async () => {
    const svc = new WebhookService()
    svc.createSubscription({ url: 'a', events: ['*'], secret: 'k', enabled: true, headers: {}, maxAttempts: 3, initialBackoffMs: 5, maxBackoffMs: 50, timeoutMs: 1000, deadLetterOnFailure: false, tags: [] })
    const e = svc.publish('e', {})
    const d = await svc.deliverWithRetry(svc.listSubscriptions()[0].id, e.id)
    expect(d.status).toBe('success')
  })
})

describe('WebhookService · singleton', () => {
  it('getWebhookService / reset', async () => {
    const m = await import('../index')
    const a = m.getWebhookService()
    const b = m.getWebhookService()
    expect(a).toBe(b)
    m.resetWebhookService()
    const c = m.getWebhookService()
    expect(c).not.toBe(a)
  })
})
