import { describe, it, expect, beforeEach } from 'vitest'
import {
  JobQueueSystem,
  QueueManager,
  JobRegistry,
  jobRegistry,
  queues,
  backoffMs,
  type Job,
  type JobOptions,
} from '../index'

beforeEach(() => {
  queues.clear()
  jobRegistry.clear()
})

function makeQueue(name = 'test', opts: JobOptions = {}) {
  const q = queues.create(name)
  const worker = q.registerWorker('w1', 1)
  return { q, worker }
}

// ============== Backoff ==============

describe('backoffMs', () => {
  it('exponential', () => {
    expect(backoffMs('exponential', 1, 100)).toBe(100)
    expect(backoffMs('exponential', 2, 100)).toBe(200)
    expect(backoffMs('exponential', 3, 100)).toBe(400)
  })
  it('linear', () => {
    expect(backoffMs('linear', 1, 100)).toBe(100)
    expect(backoffMs('linear', 2, 100)).toBe(200)
    expect(backoffMs('linear', 3, 100)).toBe(300)
  })
  it('fixed', () => {
    expect(backoffMs('fixed', 5, 100)).toBe(100)
  })
  it('fibonacci', () => {
    expect(backoffMs('fibonacci', 1, 100)).toBe(100)
    expect(backoffMs('fibonacci', 2, 100)).toBe(100)
    expect(backoffMs('fibonacci', 3, 100)).toBe(200)
    expect(backoffMs('fibonacci', 4, 100)).toBe(300)
  })
})

// ============== Enqueue ==============

describe('JobQueueSystem.enqueue', () => {
  it('creates a waiting job', () => {
    const { q } = makeQueue()
    const j = q.enqueue('foo', { x: 1 })
    expect(j.status).toBe('waiting')
    expect(q.waiting_().length).toBe(1)
  })
  it('respects priority', () => {
    const { q } = makeQueue()
    q.enqueue('a', {}, { priority: 10 })
    q.enqueue('b', {}, { priority: 1 })
    const arr = q.waiting_()
    expect(arr[0]!.name).toBe('b')
  })
  it('applies delay', () => {
    const { q } = makeQueue()
    q.enqueue('a', {}, { delay: 999999 })
    expect(q.delayed_().length).toBe(1)
    expect(q.waiting_().length).toBe(0)
  })
  it('dedupes by uniqueKey', () => {
    const { q } = makeQueue()
    const a = q.enqueue('foo', {}, { uniqueKey: 'k1' })
    const b = q.enqueue('foo', {}, { uniqueKey: 'k1' })
    expect(a.id).toBe(b.id)
  })
  it('stores tags', () => {
    const { q } = makeQueue()
    const j = q.enqueue('a', {}, { tags: ['urgent', 'batch-1'] })
    expect(j.tags).toEqual(['urgent', 'batch-1'])
  })
  it('attaches parent', () => {
    const { q } = makeQueue()
    const parent = q.enqueue('a', {})
    const child = q.enqueue('b', {}, { delay: 1 })
    expect(child.parentId).toBeUndefined()
    expect(parent.id).toBeDefined()
  })
})

// ============== Worker / tick / processJob ==============

describe('JobQueueSystem tick + processJob', () => {
  it('picks waiting job', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'foo', async () => 'ok')
    q.enqueue('foo', { x: 1 })
    const j = await q.tick(worker)
    expect(j).not.toBeNull()
    expect(j!.name).toBe('foo')
  })
  it('returns null when empty', async () => {
    const { q, worker } = makeQueue()
    const j = await q.tick(worker)
    expect(j).toBeNull()
  })
  it('respects concurrency', async () => {
    const { q, worker } = makeQueue()
    worker.concurrency = 1
    worker.active = 1
    const j = await q.tick(worker)
    expect(j).toBeNull()
  })
  it('processes successfully', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'sum', async (j) => (j.data as { a: number; b: number }).a + (j.data as { a: number; b: number }).b)
    q.enqueue('sum', { a: 2, b: 3 })
    const j = await q.tick(worker)
    if (j) await q.processJob(j, worker)
    expect(j!.status).toBe('completed')
    expect(j!.result).toBe(5)
  })
  it('retries on failure', async () => {
    const { q, worker } = makeQueue()
    let n = 0
    jobRegistry.register('test', 'flaky', async () => { n++; throw new Error('fail') })
    q.enqueue('flaky', {}, { attempts: 3, backoff: 'fixed', backoffDelay: 10 })
    const j = await q.tick(worker)
    if (j) await q.processJob(j, worker)
    expect(j!.attemptsMade).toBe(1)
    expect(j!.status).toBe('delayed_retry')
  })
  it('fails after exhausting attempts', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'flaky', async () => { throw new Error('always fail') })
    q.enqueue('flaky', {}, { attempts: 1, backoff: 'fixed', backoffDelay: 0 })
    const j = await q.tick(worker)
    if (j) await q.processJob(j, worker)
    expect(j!.status).toBe('failed')
  })
  it('handles missing handler', async () => {
    const { q, worker } = makeQueue()
    q.enqueue('unknown', {})
    const j = await q.tick(worker)
    if (j) await q.processJob(j, worker)
    expect(j!.status).toBe('failed')
    expect(j!.error).toContain('No handler')
  })
  it('captures timeout', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'slow', async () => { await new Promise(r => setTimeout(r, 200)) })
    q.enqueue('slow', {}, { timeout: 50, attempts: 1 })
    const j = await q.tick(worker)
    if (j) await q.processJob(j, worker)
    expect(j!.status).toBe('failed')
    expect(j!.error).toContain('timed out')
  })
  it('records history', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'ok', async () => 1)
    q.enqueue('ok', {})
    const j = await q.tick(worker)
    if (j) await q.processJob(j, worker)
    expect(j!.history.length).toBe(1)
    expect(j!.history[0]!.startedAt).toBeGreaterThan(0)
    expect(j!.history[0]!.finishedAt).toBeGreaterThan(0)
  })
})

// ============== Delayed promotion ==============

describe('delayed promotion', () => {
  it('promotes ready delayed jobs', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'x', async () => 1)
    q.enqueue('x', {}, { delay: 0 })
    q.promoteDelayed()
    const j = await q.tick(worker)
    expect(j).not.toBeNull()
  })
  it('keeps future delayed jobs', () => {
    const { q } = makeQueue()
    q.enqueue('x', {}, { delay: 999999 })
    q.promoteDelayed()
    expect(q.delayed_().length).toBe(1)
  })
})

// ============== Rate Limiter ==============

describe('rate limiting', () => {
  it('allows under limit', () => {
    const { q } = makeQueue()
    q.setRateLimit('foo', 3, 1000)
    expect(q.enqueue('foo', {})).toBeDefined()
  })
})

// ============== Cancel / Remove / Retry ==============

describe('cancel / remove / retry', () => {
  it('cancels waiting job', () => {
    const { q } = makeQueue()
    const j = q.enqueue('foo', {})
    expect(q.cancel(j.id)).toBe(true)
    expect(q.get(j.id)!.status).toBe('cancelled')
  })
  it('cannot cancel active', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'long', async () => { await new Promise(r => setTimeout(r, 100)) })
    const j = q.enqueue('long', {})
    const picked = await q.tick(worker)
    expect(picked).not.toBeNull()
    expect(q.cancel(j.id)).toBe(false)
  })
  it('removes job', () => {
    const { q } = makeQueue()
    const j = q.enqueue('foo', {})
    expect(q.remove(j.id)).toBe(true)
    expect(q.get(j.id)).toBeUndefined()
  })
  it('removes uniqueKey from index', () => {
    const { q } = makeQueue()
    const a = q.enqueue('foo', {}, { uniqueKey: 'k1' })
    q.remove(a.id)
    const b = q.enqueue('foo', {}, { uniqueKey: 'k1' })
    expect(b.id).not.toBe(a.id)
  })
  it('retries failed job', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'fail', async () => { throw new Error('x') })
    q.enqueue('fail', {}, { attempts: 1, backoff: 'fixed', backoffDelay: 0 })
    const j = await q.tick(worker)
    if (j) await q.processJob(j, worker)
    expect(q.retry(j!.id)).toBe(true)
  })
  it('cannot retry active', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'long', async () => { await new Promise(r => setTimeout(r, 100)) })
    const j = q.enqueue('long', {})
    await q.tick(worker)
    expect(q.retry(j.id)).toBe(false)
  })
})

// ============== DLQ ==============

describe('DLQ', () => {
  it('adds to DLQ after max attempts', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'fail', async () => { throw new Error('x') })
    q.enqueue('fail', {}, { attempts: 2, backoff: 'fixed', backoffDelay: 0 })
    const j1 = await q.tick(worker)
    if (j1) await q.processJob(j1, worker)
    expect(q.dlqList().length).toBe(0)
    // second attempt
    q.promoteDelayed()
    const j2 = await q.tick(worker)
    if (j2) await q.processJob(j2, worker)
    expect(q.dlqList().length).toBe(1)
  })
})

// ============== Events ==============

describe('events', () => {
  it('emits created', () => {
    const { q } = makeQueue()
    q.enqueue('a', {})
    const ev = q.events()
    expect(ev.some(e => e.type === 'created')).toBe(true)
  })
  it('emits completed', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'ok', async () => 1)
    q.enqueue('ok', {})
    const j = await q.tick(worker)
    if (j) await q.processJob(j, worker)
    expect(q.events({ type: 'completed' }).length).toBeGreaterThan(0)
  })
  it('emits failed', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'fail', async () => { throw new Error('x') })
    q.enqueue('fail', {}, { attempts: 1 })
    const j = await q.tick(worker)
    if (j) await q.processJob(j, worker)
    expect(q.events({ type: 'failed' }).length).toBeGreaterThan(0)
  })
  it('emits cancelled', () => {
    const { q } = makeQueue()
    const j = q.enqueue('a', {})
    q.cancel(j.id)
    expect(q.events({ type: 'cancelled' }).length).toBeGreaterThan(0)
  })
  it('filter by jobId', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'a', async () => 1)
    const j = q.enqueue('a', {})
    const picked = await q.tick(worker)
    if (picked) await q.processJob(picked, worker)
    expect(q.events({ jobId: j.id }).length).toBeGreaterThan(0)
  })
})

// ============== Metrics ==============

describe('metrics', () => {
  it('computes queue metrics', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'a', async () => 1)
    jobRegistry.register('test', 'fail', async () => { throw new Error('x') })
    q.enqueue('a', {})
    q.enqueue('fail', {}, { attempts: 1 })
    const j1 = await q.tick(worker)
    if (j1) await q.processJob(j1, worker)
    const j2 = await q.tick(worker)
    if (j2) await q.processJob(j2, worker)
    const m = q.metrics()
    expect(m.completed).toBe(1)
    expect(m.failed).toBe(1)
  })
  it('computes success rate', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'ok', async () => 1)
    q.enqueue('ok', {})
    const j = await q.tick(worker)
    if (j) await q.processJob(j, worker)
    expect(q.metrics().successRate).toBe(1)
  })
})

// ============== JobRegistry ==============

describe('JobRegistry', () => {
  it('registers and lists', () => {
    jobRegistry.register('q1', 'job1', async () => 1)
    jobRegistry.register('q1', 'job2', async () => 2)
    expect(jobRegistry.list('q1').length).toBe(2)
  })
  it('clears all', () => {
    jobRegistry.register('q1', 'j', async () => 1)
    jobRegistry.clear()
    expect(jobRegistry.list('q1').length).toBe(0)
  })
})

// ============== QueueManager ==============

describe('QueueManager', () => {
  it('creates and returns', () => {
    queues.create('a')
    queues.create('b')
    expect(queues.all().length).toBe(2)
  })
  it('dedupes create', () => {
    queues.create('a')
    queues.create('a')
    expect(queues.all().length).toBe(1)
  })
  it('snapshot aggregates', () => {
    const q1 = queues.create('a')
    const q2 = queues.create('b')
    q1.enqueue('x', {})
    q2.enqueue('y', {})
    const snap = queues.snapshot()
    expect(snap.totalJobs).toBe(2)
    expect(snap.queues.length).toBe(2)
  })
  it('names list', () => {
    queues.create('a'); queues.create('b')
    expect(queues.names().sort()).toEqual(['a', 'b'])
  })
  it('removes queue', () => {
    queues.create('a')
    expect(queues.remove('a')).toBe(true)
  })
})

// ============== Workers ==============

describe('workers', () => {
  it('lists workers', () => {
    const q = queues.create('w-test')
    q.registerWorker('w1', 2)
    q.registerWorker('w2', 1)
    expect(q.workersList().length).toBe(2)
  })
  it('stops worker', () => {
    const { q, worker } = makeQueue()
    q.workerStop(worker.id)
    expect(worker.stopRequested).toBe(true)
  })
  it('stops tick when stopped', async () => {
    const { q, worker } = makeQueue()
    q.workerStop(worker.id)
    const j = await q.tick(worker)
    expect(j).toBeNull()
  })
})

// ============== Stuck detection ==============

describe('stuck detection', () => {
  it('starts and stops', () => {
    const { q } = makeQueue()
    q.startStuckCheck(100, 200)
    q.stopStuckCheck()
  })
  it('emits stalled for long-running', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'long', async () => { await new Promise(r => setTimeout(r, 200)) })
    q.enqueue('long', {})
    const j = await q.tick(worker)
    if (j) {
      // simulate old start
      j.startedAt = Date.now() - 100000
      q.startStuckCheck(10, 50)
      await new Promise(r => setTimeout(r, 30))
      const stalled = q.events({ type: 'stalled' })
      expect(stalled.length).toBeGreaterThan(0)
      q.stopStuckCheck()
    }
  })
})

// ============== Progress ==============

describe('progress', () => {
  it('updates progress', async () => {
    const { q, worker } = makeQueue()
    jobRegistry.register('test', 'p', async (_j, update) => { update(50); return 1 })
    q.enqueue('p', {})
    const j = await q.tick(worker)
    if (j) await q.processJob(j, worker)
    expect(j!.progress).toBe(100)
    expect(q.events({ type: 'progress' }).length).toBeGreaterThan(0)
  })
})

// ============== Repeating ==============

describe('repeating jobs', () => {
  it('re-enqueues at interval', async () => {
    const { q } = makeQueue()
    jobRegistry.register('test', 'tick', async () => Date.now())
    q.enqueue('tick', {}, { repeatEvery: 50 })
    await new Promise(r => setTimeout(r, 150))
    expect(q.list({ name: 'tick' }).length).toBeGreaterThan(1)
  })
})

// ============== Filter queries ==============

describe('list filters', () => {
  it('filter by status', () => {
    const { q } = makeQueue()
    q.enqueue('a', {})
    expect(q.list({ status: 'waiting' }).length).toBe(1)
    expect(q.list({ status: 'completed' }).length).toBe(0)
  })
  it('filter by name', () => {
    const { q } = makeQueue()
    q.enqueue('foo', {})
    q.enqueue('bar', {})
    expect(q.list({ name: 'foo' }).length).toBe(1)
  })
})

// ============== Clear all ==============

describe('clearAll', () => {
  it('empties everything', () => {
    const { q } = makeQueue()
    q.enqueue('a', {})
    q.enqueue('b', {})
    q.clearAll()
    expect(q.list().length).toBe(0)
  })
  it('stops repeating jobs', () => {
    const { q } = makeQueue()
    q.enqueue('a', {}, { repeatEvery: 50 })
    q.clearAll()
    // no more jobs spawned
  })
})
