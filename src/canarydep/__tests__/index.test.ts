import { describe, it, expect } from 'vitest'
import {
  CanaryEngine, MetricsCollector, defaultStages, getCanaryEngine, resetCanaryEngine,
} from '../index'

describe('MetricsCollector', () => {
  it('initial zero', () => {
    const m = new MetricsCollector()
    expect(m.errorRate()).toBe(0)
    expect(m.avgLatency()).toBe(0)
  })
  it('records latency & errors', () => {
    const m = new MetricsCollector()
    m.record(100, false)
    m.record(200, true)
    expect(m.metrics().totalRequests).toBe(2)
    expect(m.errorRate()).toBe(0.5)
    expect(m.avgLatency()).toBe(150)
  })
  it('p95 calculation', () => {
    const m = new MetricsCollector()
    for (let i = 1; i <= 100; i++) m.record(i, false)
    expect(m.p95()).toBeGreaterThan(90)
  })
  it('latencyMax', () => {
    const m = new MetricsCollector()
    m.record(50, false)
    m.record(500, false)
    expect(m.metrics().latencyMax).toBe(500)
  })
  it('reset', () => {
    const m = new MetricsCollector()
    m.record(50, false)
    m.reset()
    expect(m.metrics().totalRequests).toBe(0)
  })
})

describe('CanaryEngine — CRUD', () => {
  it('create', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'app:v1', stages: defaultStages(), whitelist: [], blacklist: [] })
    expect(c.id).toBe('canary_1')
    expect(c.config.version).toBe('v1')
    expect(c.status).toBe('pending')
  })
  it('get / list / delete', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: [] })
    expect(e.get(c.id)).toBe(c)
    expect(e.list()).toHaveLength(1)
    expect(e.delete(c.id)).toBe(true)
    expect(e.get(c.id)).toBeUndefined()
  })
  it('start sets running', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: [] })
    expect(e.start(c.id)).toBe(true)
    expect(e.get(c.id)?.status).toBe('running')
  })
  it('start fails if not pending', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: [] })
    e.start(c.id)
    expect(e.start(c.id)).toBe(false)
  })
  it('start fails for missing', () => {
    const e = new CanaryEngine()
    expect(e.start('nope')).toBe(false)
  })
})

describe('CanaryEngine — pause/resume', () => {
  it('pause / resume', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: [] })
    e.start(c.id)
    expect(e.pause(c.id)).toBe(true)
    expect(e.get(c.id)?.status).toBe('paused')
    expect(e.resume(c.id)).toBe(true)
    expect(e.get(c.id)?.status).toBe('running')
  })
  it('pause only when running', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: [] })
    expect(e.pause(c.id)).toBe(false)
  })
})

describe('CanaryEngine — shouldServeCanary', () => {
  it('returns false when not running', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: [] })
    expect(e.shouldServeCanary(c.id, 'u1')).toBe(false)
  })
  it('whitelist always true', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: ['u-vip'], blacklist: [] })
    e.start(c.id)
    expect(e.shouldServeCanary(c.id, 'u-vip')).toBe(true)
  })
  it('blacklist always false', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: ['u-bad'] })
    e.start(c.id)
    expect(e.shouldServeCanary(c.id, 'u-bad')).toBe(false)
  })
  it('100% stage serves all', () => {
    const e = new CanaryEngine()
    const stages = [{ id: 's1', name: '100', percentage: 100, durationMs: 0, minRequests: 0, maxErrorRate: 1, maxLatencyMs: 99999 }]
    const c = e.create({ version: 'v1', artifact: 'a', stages, whitelist: [], blacklist: [] })
    e.start(c.id)
    let count = 0
    for (let i = 0; i < 100; i++) if (e.shouldServeCanary(c.id, `user${i}`)) count++
    expect(count).toBe(100)
  })
  it('0% stage serves none', () => {
    const e = new CanaryEngine()
    const stages = [{ id: 's1', name: '0', percentage: 0, durationMs: 0, minRequests: 0, maxErrorRate: 1, maxLatencyMs: 99999 }]
    const c = e.create({ version: 'v1', artifact: 'a', stages, whitelist: [], blacklist: [] })
    e.start(c.id)
    let count = 0
    for (let i = 0; i < 100; i++) if (e.shouldServeCanary(c.id, `user${i}`)) count++
    expect(count).toBe(0)
  })
})

describe('CanaryEngine — record & evaluate', () => {
  it('record updates metrics', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: [] })
    e.start(c.id)
    e.record(c.id, 100, false)
    e.record(c.id, 200, true)
    expect(e.metrics(c.id).total).toBe(2)
  })
  it('evaluate waits when not enough requests', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: [] })
    e.start(c.id)
    expect(e.evaluate(c.id).action).toBe('wait')
  })
  it('evaluate promotes stage on good metrics', () => {
    const e = new CanaryEngine()
    const stages = [{ id: 's1', name: 's1', percentage: 10, durationMs: 0, minRequests: 10, maxErrorRate: 0.5, maxLatencyMs: 1000 }]
    const c = e.create({ version: 'v1', artifact: 'a', stages, whitelist: [], blacklist: [] })
    e.start(c.id)
    for (let i = 0; i < 10; i++) e.record(c.id, 50, false)
    const r = e.evaluate(c.id)
    expect(r.action).toBe('promote')
  })
  it('evaluate rollbacks on high error rate', () => {
    const e = new CanaryEngine()
    const stages = [{ id: 's1', name: 's1', percentage: 10, durationMs: 0, minRequests: 10, maxErrorRate: 0.05, maxLatencyMs: 1000 }]
    const c = e.create({ version: 'v1', artifact: 'a', stages, whitelist: [], blacklist: [] })
    e.start(c.id)
    for (let i = 0; i < 10; i++) e.record(c.id, 50, i < 5)  // 50% error
    const r = e.evaluate(c.id)
    expect(r.action).toBe('rollback')
    expect(e.get(c.id)?.status).toBe('rolled-back')
  })
  it('evaluate rollbacks on high latency', () => {
    const e = new CanaryEngine()
    const stages = [{ id: 's1', name: 's1', percentage: 10, durationMs: 0, minRequests: 20, maxErrorRate: 1, maxLatencyMs: 500 }]
    const c = e.create({ version: 'v1', artifact: 'a', stages, whitelist: [], blacklist: [] })
    e.start(c.id)
    for (let i = 0; i < 20; i++) e.record(c.id, 1000, false)
    const r = e.evaluate(c.id)
    expect(r.action).toBe('rollback')
  })
  it('last stage promotes fully', () => {
    const e = new CanaryEngine()
    const stages = [{ id: 's1', name: 's1', percentage: 100, durationMs: 0, minRequests: 5, maxErrorRate: 0.5, maxLatencyMs: 1000 }]
    const c = e.create({ version: 'v1', artifact: 'a', stages, whitelist: [], blacklist: [] })
    e.start(c.id)
    for (let i = 0; i < 5; i++) e.record(c.id, 50, false)
    e.evaluate(c.id)
    expect(e.get(c.id)?.status).toBe('promoted')
  })
  it('forceAdvance promotes when last stage', () => {
    const e = new CanaryEngine()
    const stages = [{ id: 's1', name: 's1', percentage: 100, durationMs: 0, minRequests: 100, maxErrorRate: 0.5, maxLatencyMs: 1000 }]
    const c = e.create({ version: 'v1', artifact: 'a', stages, whitelist: [], blacklist: [] })
    e.start(c.id)
    e.forceAdvance(c.id)
    expect(e.get(c.id)?.status).toBe('promoted')
  })
  it('forceAdvance advances stage', () => {
    const e = new CanaryEngine()
    const stages = [
      { id: 's1', name: 's1', percentage: 10, durationMs: 0, minRequests: 100, maxErrorRate: 0.5, maxLatencyMs: 1000 },
      { id: 's2', name: 's2', percentage: 100, durationMs: 0, minRequests: 0, maxErrorRate: 0.5, maxLatencyMs: 1000 },
    ]
    const c = e.create({ version: 'v1', artifact: 'a', stages, whitelist: [], blacklist: [] })
    e.start(c.id)
    e.forceAdvance(c.id)
    expect(e.get(c.id)?.currentStageIndex).toBe(1)
  })
  it('rollbackCanary', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: [] })
    e.start(c.id)
    expect(e.rollbackCanary(c.id, 'test')).toBe(true)
    expect(e.get(c.id)?.status).toBe('rolled-back')
  })
  it('whitelist add/remove', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: [] })
    e.addWhitelist(c.id, 'u1')
    expect(e.get(c.id)?.config.whitelist).toContain('u1')
    e.removeWhitelist(c.id, 'u1')
    expect(e.get(c.id)?.config.whitelist).not.toContain('u1')
  })
  it('blacklist add', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: [] })
    e.addBlacklist(c.id, 'u1')
    expect(e.get(c.id)?.config.blacklist).toContain('u1')
  })
  it('metricsAll summary', () => {
    const e = new CanaryEngine()
    const c = e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: [] })
    expect(e.metricsAll().total).toBe(1)
    e.start(c.id)
    expect(e.metricsAll().running).toBe(1)
  })
  it('clear', () => {
    const e = new CanaryEngine()
    e.create({ version: 'v1', artifact: 'a', stages: defaultStages(), whitelist: [], blacklist: [] })
    e.clear()
    expect(e.list()).toHaveLength(0)
  })
})

describe('defaultStages', () => {
  it('returns 4 stages increasing', () => {
    const s = defaultStages()
    expect(s).toHaveLength(4)
    expect(s[0].percentage).toBeLessThan(s[3].percentage)
  })
})

describe('Singleton', () => {
  it('getCanaryEngine same instance', () => {
    resetCanaryEngine()
    expect(getCanaryEngine()).toBe(getCanaryEngine())
  })
  it('reset creates new', () => {
    const a = getCanaryEngine()
    resetCanaryEngine()
    expect(a).not.toBe(getCanaryEngine())
  })
})
