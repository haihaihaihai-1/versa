import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TaskScheduler } from '../index'

describe('TaskScheduler · cron parser', () => {
  let s: TaskScheduler
  beforeEach(() => { s = new TaskScheduler() })
  it('parse *', () => {
    const c = s.parseCron('* * * * *')
    expect(c.minutes.length).toBe(60)
    expect(c.hours.length).toBe(24)
  })
  it('parse ranges', () => {
    const c = s.parseCron('0-5 * * * *')
    expect(c.minutes).toEqual([0, 1, 2, 3, 4, 5])
  })
  it('parse steps', () => {
    const c = s.parseCron('*/15 * * * *')
    expect(c.minutes).toEqual([0, 15, 30, 45])
  })
  it('parse lists', () => {
    const c = s.parseCron('0,30 * * * *')
    expect(c.minutes).toEqual([0, 30])
  })
  it('parse 5 fields only', () => {
    expect(() => s.parseCron('* * *')).toThrow()
  })
  it('parse bad field throws', () => {
    expect(() => s.parseCron('99 * * * *')).toThrow()
  })
  it('nextRunTime for daily midnight', () => {
    const t = s.nextRunTime('0 0 * * *', Date.now())
    const d = new Date(t)
    expect(d.getMinutes()).toBe(0)
    expect(d.getHours()).toBe(0)
  })
})

describe('TaskScheduler · handlers + scheduling', () => {
  let s: TaskScheduler
  beforeEach(() => { s = new TaskScheduler() })
  it('registerHandler + hasHandler', () => {
    s.registerHandler('h1', () => 1)
    expect(s.hasHandler('h1')).toBe(true)
  })
  it('unregisterHandler', () => {
    s.registerHandler('h1', () => 1)
    expect(s.unregisterHandler('h1')).toBe(true)
    expect(s.unregisterHandler('h1')).toBe(false)
  })
  it('listHandlers', () => {
    s.registerHandler('a', () => 1); s.registerHandler('b', () => 2)
    expect(s.listHandlers().sort()).toEqual(['a', 'b'])
  })
  it('schedule with handler', () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 1000 })
    expect(j.nextRunAt).toBeGreaterThan(Date.now())
  })
  it('schedule missing handler throws', () => {
    expect(() => s.schedule({ name: 'j1', handler: 'nope' })).toThrow()
  })
  it('schedule with no timing throws', () => {
    s.registerHandler('h1', () => 1)
    expect(() => s.schedule({ name: 'j1', handler: 'h1' })).toThrow()
  })
  it('schedule with cron', () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', cron: '0 0 * * *' })
    expect(j.cron).toBe('0 0 * * *')
  })
  it('schedule with runAt', () => {
    s.registerHandler('h1', () => 1)
    const t = Date.now() + 60_000
    const j = s.schedule({ name: 'j1', handler: 'h1', runAt: t })
    expect(j.runAt).toBe(t)
  })
  it('schedule with intervalMs', () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', intervalMs: 5000 })
    expect(j.intervalMs).toBe(5000)
  })
  it('unschedule', () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 1000 })
    expect(s.unschedule(j.id)).toBe(true)
  })
  it('unschedule missing', () => {
    expect(s.unschedule('nope')).toBe(false)
  })
  it('getJob / getJobByName / listJobs / jobsByTag', () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 1000, tags: ['report'] })
    expect(s.getJob(j.id)?.name).toBe('j1')
    expect(s.getJobByName('j1')?.id).toBe(j.id)
    expect(s.listJobs().length).toBe(1)
    expect(s.jobsByTag('report').length).toBe(1)
  })
})

describe('TaskScheduler · control', () => {
  let s: TaskScheduler
  beforeEach(() => { s = new TaskScheduler() })
  it('pause + resume', () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 1000 })
    expect(s.pause(j.id)).toBe(true)
    expect(s.pause(j.id)).toBe(false)
    expect(s.resume(j.id)).toBe(true)
  })
  it('enable + disable', () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 1000 })
    expect(s.disable(j.id)).toBe(true)
    expect(s.enable(j.id)).toBe(true)
  })
  it('triggerNow', async () => {
    s.registerHandler('h1', () => 42)
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 60_000 })
    const r = await s.triggerNow(j.id)
    expect(r.ok).toBe(true)
    expect(r.result).toBe(42)
  })
  it('triggerNow missing', async () => {
    await expect(s.triggerNow('nope')).rejects.toThrow()
  })
  it('start / stop / isRunning', () => {
    s.start(50)
    expect(s.isRunning()).toBe(true)
    s.stop()
    expect(s.isRunning()).toBe(false)
  })
})

describe('TaskScheduler · tick + execution', () => {
  let s: TaskScheduler
  beforeEach(() => { s = new TaskScheduler() })
  afterEach(() => { s.stop() })
  it('runs due job', async () => {
    s.registerHandler('h1', () => 1)
    s.schedule({ name: 'j1', handler: 'h1', delayMs: 0 })
    const runs = await s.tick()
    expect(runs.length).toBe(1)
    expect(runs[0].ok).toBe(true)
  })
  it('skips paused', async () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 0 })
    s.pause(j.id)
    const runs = await s.tick()
    expect(runs.length).toBe(0)
  })
  it('skips disabled', async () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 0 })
    s.disable(j.id)
    const runs = await s.tick()
    expect(runs.length).toBe(0)
  })
  it('retries on failure', async () => {
    let calls = 0
    s.registerHandler('h1', () => { calls++; if (calls < 3) throw new Error('fail') })
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 0, maxRetries: 3, retryDelayMs: 5 })
    const r = await s.triggerNow(j.id)
    expect(r.ok).toBe(true)
    expect(calls).toBe(3)
  })
  it('eventual failure after max retries', async () => {
    s.registerHandler('h1', () => { throw new Error('always fail') })
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 0, maxRetries: 1, retryDelayMs: 5 })
    const r = await s.triggerNow(j.id)
    expect(r.ok).toBe(false)
    expect(r.attempt).toBe(2)
  })
  it('records run in history', async () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 0 })
    await s.triggerNow(j.id)
    const runs = s.listRuns({ jobId: j.id })
    expect(runs.length).toBe(1)
  })
  it('misfire skip', async () => {
    s.registerHandler('h1', () => 1)
    s.schedule({ name: 'j1', handler: 'h1', runAt: Date.now() - 60_000, misfire: 'skip' })
    s.schedule({ name: 'j2', handler: 'h1', runAt: Date.now() - 60_000, misfire: 'skip' })
    await s.tick()
    expect(s.getMetrics().totalMisfires).toBeGreaterThan(0)
  })
  it('maxConcurrent backpressure', async () => {
    s.registerHandler('h1', async () => { await new Promise(r => setTimeout(r, 50)); return 1 })
    s.schedule({ name: 'j1', handler: 'h1', delayMs: 0, maxConcurrent: 1 })
    const runs = await s.tick()
    expect(runs.length).toBe(1)
  })
})

describe('TaskScheduler · history + metrics', () => {
  let s: TaskScheduler
  beforeEach(() => { s = new TaskScheduler() })
  it('listRuns with limit + since', async () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 0 })
    await s.triggerNow(j.id)
    const r = s.listRuns({ limit: 5, since: 0 })
    expect(r.length).toBeGreaterThan(0)
  })
  it('getRun', async () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 0 })
    const r = await s.triggerNow(j.id)
    expect(s.getRun(r.id)?.id).toBe(r.id)
  })
  it('getRun missing', () => {
    expect(s.getRun('nope')).toBeUndefined()
  })
  it('totalRuns', async () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 0 })
    await s.triggerNow(j.id)
    expect(s.totalRuns()).toBe(1)
  })
  it('metrics + resetMetrics', async () => {
    s.registerHandler('h1', () => 1)
    const j = s.schedule({ name: 'j1', handler: 'h1', delayMs: 0 })
    await s.triggerNow(j.id)
    const m = s.getMetrics()
    expect(m.totalRuns).toBe(1)
    s.resetMetrics()
    expect(s.getMetrics().totalRuns).toBe(0)
  })
})

describe('TaskScheduler · federation + singleton', () => {
  it('scheduleWithRetry', async () => {
    const s = new TaskScheduler()
    s.registerHandler('h1', () => 1)
    const j = await s.scheduleWithRetry({ name: 'j1', handler: 'h1', delayMs: 1000 })
    expect(j.name).toBe('j1')
  })
  it('getTaskScheduler / reset', async () => {
    const m = await import('../index')
    const a = m.getTaskScheduler()
    const b = m.getTaskScheduler()
    expect(a).toBe(b)
    m.resetTaskScheduler()
    const c = m.getTaskScheduler()
    expect(c).not.toBe(a)
  })
})
