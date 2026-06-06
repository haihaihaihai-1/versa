import { describe, it, expect, beforeEach } from 'vitest'
import { Tracer, TracerRegistry, getTracerRegistry, resetTracerRegistry, getTracer, resetTracer, type TraceContext } from '../index'

describe('Tracer - ID generation', () => {
  let t: Tracer
  beforeEach(() => { t = new Tracer({ serviceName: 'test' }) })

  it('traceId is 32 hex', () => {
    const id = t.newTraceId()
    expect(id).toMatch(/^[0-9a-f]{32}$/)
  })
  it('spanId is 16 hex', () => {
    const id = t.newSpanId()
    expect(id).toMatch(/^[0-9a-f]{16}$/)
  })
})

describe('Tracer - W3C trace-context', () => {
  let t: Tracer
  beforeEach(() => { t = new Tracer({ serviceName: 'test' }) })

  it('encode and decode', () => {
    const tp = t.encodeTraceparent({ traceId: 'aaaabbbbccccddddeeeeffffaaaaffff', spanId: '1234567890abcdef', flags: 1 })
    expect(tp).toBe('00-aaaabbbbccccddddeeeeffffaaaaffff-1234567890abcdef-01')
    const decoded = t.decodeTraceparent(tp)
    expect(decoded?.traceId).toBe('aaaabbbbccccddddeeeeffffaaaaffff')
    expect(decoded?.spanId).toBe('1234567890abcdef')
    expect(decoded?.flags).toBe(1)
  })
  it('invalid format', () => {
    expect(t.decodeTraceparent('garbage')).toBeNull()
  })
  it('baggage encode/decode', () => {
    const s = t.encodeBaggage([{ key: 'userId', value: 'u1' }, { key: 'sessionId', value: 's1' }])
    expect(s).toContain('userId=u1')
    const d = t.decodeBaggage(s)
    expect(d).toHaveLength(2)
  })
  it('empty baggage', () => {
    expect(t.decodeBaggage('')).toEqual([])
  })
})

describe('Tracer - span creation', () => {
  let t: Tracer
  beforeEach(() => { t = new Tracer({ serviceName: 'svc', sampleRate: 1 }) })

  it('starts span', () => {
    const s = t.startSpan('op')
    expect(s.name).toBe('op')
    expect(s.kind).toBe('internal')
    expect(s.service).toBe('svc')
  })
  it('with parent context', () => {
    const parent: TraceContext = { traceId: 't1'.padEnd(32, '0'), spanId: 's1'.padEnd(16, '0'), flags: 0, baggage: [] }
    const s = t.startSpan('child', { parent })
    expect(s.traceId).toBe(parent.traceId)
    expect(s.parentSpanId).toBe(parent.spanId)
  })
  it('new trace if no parent', () => {
    const s = t.startSpan('op')
    expect(s.traceId.length).toBe(32)
  })
  it('end span sets duration', () => {
    const s = t.startSpan('op', { startTime: 100 })
    t.endSpan(s, { endTime: 150 })
    expect(s.durationMs).toBe(50)
  })
  it('end span with error increments counter', () => {
    const s = t.startSpan('op')
    t.endSpan(s, { status: 'error' })
    expect(t.getObservabilityMetrics().totalErrors).toBe(1)
  })
  it('end span no-op if already ended', () => {
    const s = t.startSpan('op', { startTime: 100 })
    t.endSpan(s, { endTime: 150 })
    t.endSpan(s, { endTime: 200 })
    expect(s.durationMs).toBe(50)
  })
  it('attributes', () => {
    const s = t.startSpan('op')
    t.setAttribute(s, 'http.status_code', 200)
    t.setAttribute(s, 'http.method', 'GET')
    t.setAttribute(s, 'cache.hit', true)
    expect(s.attributes['http.status_code']?.value).toBe(200)
  })
  it('add event', () => {
    const s = t.startSpan('op')
    t.addEvent(s, 'cache.lookup', { 'key': { type: 'string', value: 'k1' } })
    expect(s.events[0]?.name).toBe('cache.lookup')
  })
  it('record exception', () => {
    const s = t.startSpan('op')
    t.recordException(s, new Error('boom'))
    expect(s.status).toBe('error')
    expect(s.events[0]?.name).toBe('exception')
  })
  it('add link', () => {
    const s = t.startSpan('op')
    t.addLink(s, { traceId: 't1'.padEnd(32, '0'), spanId: 's1'.padEnd(16, '0') })
    expect(s.links).toHaveLength(1)
  })
})

describe('Tracer - active context', () => {
  let t: Tracer
  beforeEach(() => { t = new Tracer({ serviceName: 'svc', sampleRate: 1 }) })

  it('set/get active', () => {
    const s = t.startSpan('op', { threadId: 'th1' })
    expect(t.getActiveSpan('th1')?.spanId).toBe(s.spanId)
  })
  it('clear active', () => {
    t.startSpan('op', { threadId: 'th1' })
    t.clearActive('th1')
    expect(t.getActiveSpan('th1')).toBeUndefined()
  })
  it('unset returns undefined', () => {
    expect(t.getActiveSpan('nothread')).toBeUndefined()
  })
})

describe('Tracer - withSpan', () => {
  let t: Tracer
  beforeEach(() => { t = new Tracer({ serviceName: 'svc', sampleRate: 1 }) })

  it('auto-finish ok', () => {
    const s = t.withSpan('op', (sp) => { return 42 })
    expect(s).toBe(42)
  })
  it('auto-finish error', () => {
    expect(() => t.withSpan('op', () => { throw new Error('boom') })).toThrow()
  })
  it('async ok', async () => {
    const r = await t.withSpan('op', async () => 10)
    expect(r).toBe(10)
  })
  it('async error', async () => {
    await expect(t.withSpan('op', async () => { throw new Error('boom') })).rejects.toThrow()
  })
})

describe('Tracer - exporters', () => {
  let t: Tracer
  beforeEach(() => { t = new Tracer({ serviceName: 'svc', sampleRate: 1 }) })

  it('add and export', async () => {
    const exp: unknown[] = []
    t.addExporter((spans) => { exp.push(...spans) })
    t.withSpan('op', () => 'ok')
    await t.exportAll()
    expect(exp.length).toBeGreaterThan(0)
  })
  it('clears spans', () => {
    t.withSpan('op', () => 'ok')
    t.clearSpans()
    expect(t.getSpans()).toHaveLength(0)
  })
})

describe('Tracer - query', () => {
  let t: Tracer
  beforeEach(() => { t = new Tracer({ serviceName: 'svc', sampleRate: 1 }) })

  it('getSpans by traceId', () => {
    const s = t.startSpan('a')
    t.endSpan(s)
    const s2 = t.startSpan('b')
    t.endSpan(s2)
    expect(t.getSpans(s.traceId)).toHaveLength(1)
  })
  it('getTrace sorts by startTime', () => {
    const shared = 'trace1'.padEnd(32, '0')
    const a = t.startSpan('a', { startTime: 200, parent: { traceId: shared, spanId: 'p1'.padEnd(16, '0'), flags: 0, baggage: [] } })
    t.endSpan(a)
    const b = t.startSpan('b', { startTime: 100, parent: { traceId: shared, spanId: 'p2'.padEnd(16, '0'), flags: 0, baggage: [] } })
    t.endSpan(b)
    expect(t.getTrace(shared)[0]?.name).toBe('b')
  })
  it('getTraceRoot', () => {
    const root = t.startSpan('root')
    t.endSpan(root)
    const child = t.startSpan('child', { parent: { traceId: root.traceId, spanId: root.spanId, flags: 0, baggage: [] } })
    t.endSpan(child)
    expect(t.getTraceRoot(root.traceId)?.spanId).toBe(root.spanId)
  })
  it('findByName', () => {
    t.withSpan('foo', () => 'x')
    t.withSpan('bar', () => 'x')
    expect(t.findByName('foo')).toHaveLength(1)
  })
  it('findByService', () => {
    t.withSpan('a', () => 'x')
    expect(t.findByService('svc').length).toBeGreaterThan(0)
  })
  it('findByStatus', () => {
    try { t.withSpan('a', () => { throw new Error('e') }) } catch { /* expected */ }
    expect(t.findByStatus('error').length).toBeGreaterThan(0)
  })
  it('findByAttribute', () => {
    const s = t.startSpan('op')
    t.setAttribute(s, 'http.status_code', 404)
    t.endSpan(s)
    expect(t.findByAttribute('http.status_code', 404)).toHaveLength(1)
  })
  it('getStats', () => {
    const r = t.startSpan('root')
    t.endSpan(r)
    const stats = t.getStats(r.traceId)
    expect(stats.count).toBe(1)
  })
})

describe('Tracer - metrics', () => {
  let t: Tracer
  beforeEach(() => { t = new Tracer({ serviceName: 'svc', sampleRate: 1 }) })

  it('counter', () => {
    t.counter('http.requests', 1, { route: '/x' })
    t.counter('http.requests', 2, { route: '/x' })
    expect(t.getCounter('http.requests')).toBe(3)
  })
  it('gauge', () => {
    t.gauge('cpu.usage', 0.5)
    expect(t.getGauge('cpu.usage')).toBe(0.5)
  })
  it('histogram', () => {
    t.histogram('http.duration', 0.1, { route: '/x' })
    t.histogram('http.duration', 0.5, { route: '/x' })
    const arr = t.getMetrics({ type: 'histogram' })
    expect(arr).toHaveLength(1)
  })
  it('getMetrics by name', () => {
    t.counter('a', 1)
    t.counter('b', 1)
    expect(t.getMetrics({ name: 'a' })).toHaveLength(1)
  })
  it('getGauge undefined', () => {
    expect(t.getGauge('missing')).toBeUndefined()
  })
})

describe('Tracer - observability metrics', () => {
  let t: Tracer
  beforeEach(() => { t = new Tracer({ serviceName: 'svc', sampleRate: 1 }) })

  it('tracks totalSpans', () => {
    t.withSpan('a', () => 'x')
    t.withSpan('b', () => 'x')
    expect(t.getObservabilityMetrics().totalSpans).toBe(2)
  })
  it('byKind', () => {
    t.withSpan('a', () => 'x', { kind: 'client' })
    t.withSpan('b', () => 'x', { kind: 'server' })
    const m = t.getObservabilityMetrics()
    expect(m.byKind.client).toBe(1)
    expect(m.byKind.server).toBe(1)
  })
  it('totalTraces', () => {
    t.withSpan('a', () => 'x')
    expect(t.getObservabilityMetrics().totalTraces).toBe(1)
  })
  it('resetMetrics', () => {
    t.withSpan('a', () => 'x')
    t.resetMetrics()
    expect(t.getObservabilityMetrics().totalSpans).toBe(0)
  })
})

describe('TracerRegistry', () => {
  it('register and get', () => {
    resetTracerRegistry()
    const r = getTracerRegistry()
    r.register('a', new Tracer({ serviceName: 'a' }))
    expect(r.get('a')).toBeDefined()
  })
  it('list', () => {
    resetTracerRegistry()
    const r = getTracerRegistry()
    r.register('a', new Tracer({ serviceName: 'a' }))
    r.register('b', new Tracer({ serviceName: 'b' }))
    expect(r.list()).toEqual(['a', 'b'])
  })
  it('remove', () => {
    resetTracerRegistry()
    const r = getTracerRegistry()
    r.register('a', new Tracer({ serviceName: 'a' }))
    expect(r.remove('a')).toBe(true)
  })
  it('clear', () => {
    resetTracerRegistry()
    const r = getTracerRegistry()
    r.register('a', new Tracer({ serviceName: 'a' }))
    r.clear()
    expect(r.list()).toHaveLength(0)
  })
})

describe('Singleton tracer', () => {
  it('getTracer same instance', () => {
    resetTracer()
    expect(getTracer()).toBe(getTracer())
  })
})
