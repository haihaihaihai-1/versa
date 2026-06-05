/**
 * Versa · Workflow Engine (v28.0) — 单元测试
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  DefinitionRegistry, definitions, HandlerRegistry, handlers,
  WorkflowEventBus, eventBus, WorkflowEngine, engine,
  Scheduler, scheduler, nextCronFire, hasCycle as _hasCycle, topoSort as _topoSort,
  summarizeWorkflow, loadExecutions, persistExecutions,
  type WorkflowDefinition, type StepDefinition, type WorkflowExecution,
} from '../index'

// ============== DefinitionRegistry ==============

describe('DefinitionRegistry', () => {
  it('register and get', () => {
    const r = new DefinitionRegistry()
    const def: WorkflowDefinition = { id: 'w1', name: 'w', version: '1', steps: [{ id: 'a', name: 'a', kind: 'action', config: { handler: 'h' }, dependsOn: [] }] }
    r.register(def)
    expect(r.get('w1')?.name).toBe('w')
  })

  it('rejects duplicate step ids', () => {
    const r = new DefinitionRegistry()
    expect(() => r.register({
      id: 'w', name: 'w', version: '1',
      steps: [
        { id: 'a', name: 'a', kind: 'action', config: {}, dependsOn: [] },
        { id: 'a', name: 'b', kind: 'action', config: {}, dependsOn: [] },
      ],
    })).toThrow(/Duplicate/)
  })

  it('rejects unknown dep', () => {
    const r = new DefinitionRegistry()
    expect(() => r.register({
      id: 'w', name: 'w', version: '1',
      steps: [{ id: 'a', name: 'a', kind: 'action', config: {}, dependsOn: ['nope'] }],
    })).toThrow(/unknown step/)
  })

  it('rejects cycles', () => {
    const r = new DefinitionRegistry()
    expect(() => r.register({
      id: 'w', name: 'w', version: '1',
      steps: [
        { id: 'a', name: 'a', kind: 'action', config: {}, dependsOn: ['b'] },
        { id: 'b', name: 'b', kind: 'action', config: {}, dependsOn: ['a'] },
      ],
    })).toThrow(/cycle/)
  })

  it('list / size / remove / clear', () => {
    const r = new DefinitionRegistry()
    r.register({ id: 'w1', name: 'w1', version: '1', steps: [] })
    r.register({ id: 'w2', name: 'w2', version: '1', steps: [] })
    expect(r.size()).toBe(2)
    expect(r.remove('w1')).toBe(true)
    expect(r.size()).toBe(1)
    r.clear()
    expect(r.size()).toBe(0)
  })
})

// ============== HandlerRegistry ==============

describe('HandlerRegistry', () => {
  it('register and lookup', () => {
    const r = new HandlerRegistry()
    const h = () => 1
    r.registerAction('a', h)
    expect(r.getAction('a')).toBe(h)
  })
  it('separate namespaces', () => {
    const r = new HandlerRegistry()
    r.registerAction('a', () => 1)
    r.registerCompensate('c', () => {})
    r.registerCondition('x', () => true)
    expect(r.listActions()).toEqual(['a'])
    expect(r.listCompensates()).toEqual(['c'])
    expect(r.listConditions()).toEqual(['x'])
  })
  it('clear all', () => {
    const r = new HandlerRegistry()
    r.registerAction('a', () => 1)
    r.clear()
    expect(r.listActions()).toEqual([])
  })
})

// ============== EventBus ==============

describe('WorkflowEventBus', () => {
  beforeEach(() => eventBus.clear())

  it('emits to listener', () => {
    const fn = vi.fn()
    eventBus.on('test', fn)
    eventBus.emit('test', { data: 1 })
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ message: 'test', data: 1 }))
  })

  it('unsubscribe', () => {
    const fn = vi.fn()
    const off = eventBus.on('test', fn)
    off()
    eventBus.emit('test')
    expect(fn).not.toHaveBeenCalled()
  })

  it('wildcard listener', () => {
    const fn = vi.fn()
    eventBus.on('*', fn)
    eventBus.emit('a')
    eventBus.emit('b')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('history with filter', () => {
    eventBus.emit('a')
    eventBus.emit('b')
    eventBus.emit('a')
    expect(eventBus.history_({ type: 'a' })).toHaveLength(2)
  })
})

// ============== Engine ==============

describe('WorkflowEngine', () => {
  beforeEach(() => {
    definitions.clear()
    handlers.clear()
    engine.clear()
  })

  it('executes a simple action step', async () => {
    handlers.registerAction('echo', (ctx, step) => {
      ctx.vars['echoed'] = step.config.msg
      return { ok: true }
    })
    definitions.register({
      id: 'w1', name: 'echo', version: '1',
      steps: [{ id: 'a', name: 'echo', kind: 'action', config: { handler: 'echo', msg: 'hi' }, dependsOn: [] }],
    })
    const r = await engine.execute('w1', {})
    expect(r.status).toBe('success')
    expect(r.steps[0]?.status).toBe('success')
    expect(r.steps[0]?.output).toEqual({ ok: true })
  })

  it('executes steps in dependency order', async () => {
    const order: string[] = []
    handlers.registerAction('a', () => { order.push('a'); return 1 })
    handlers.registerAction('b', () => { order.push('b'); return 2 })
    handlers.registerAction('c', () => { order.push('c'); return 3 })
    definitions.register({
      id: 'w', name: 'w', version: '1',
      steps: [
        { id: 'c', name: 'c', kind: 'action', config: { handler: 'c' }, dependsOn: ['a', 'b'] },
        { id: 'a', name: 'a', kind: 'action', config: { handler: 'a' }, dependsOn: [] },
        { id: 'b', name: 'b', kind: 'action', config: { handler: 'b' }, dependsOn: [] },
      ],
    })
    const r = await engine.execute('w', {})
    expect(r.status).toBe('success')
    expect(order).toEqual(['a', 'b', 'c'])
  })

  it('runs delay step', async () => {
    definitions.register({
      id: 'w', name: 'w', version: '1',
      steps: [{ id: 'd', name: 'd', kind: 'delay', config: { ms: 30 }, dependsOn: [] }],
    })
    const r = await engine.execute('w', {})
    expect(r.status).toBe('success')
    expect(r.steps[0]?.output).toEqual({ slept: 30 })
  })

  it('emits events to the bus', async () => {
    definitions.register({
      id: 'w', name: 'w', version: '1',
      steps: [{ id: 'e', name: 'e', kind: 'emit', config: { event: 'hi', data: 1 }, dependsOn: [] }],
    })
    const fn = vi.fn()
    eventBus.on('hi', fn)
    await engine.execute('w', {})
    expect(fn).toHaveBeenCalled()
  })

  it('loop step runs N times', async () => {
    let count = 0
    handlers.registerAction('inc', () => { count++; return count })
    definitions.register({
      id: 'w', name: 'w', version: '1',
      steps: [{ id: 'l', name: 'l', kind: 'loop', config: { handler: 'inc', count: 5 }, dependsOn: [] }],
    })
    const r = await engine.execute('w', {})
    expect(count).toBe(5)
    expect(r.steps[0]?.output).toEqual([1, 2, 3, 4, 5])
  })

  it('failed step bubbles up and triggers saga', async () => {
    handlers.registerAction('ok', () => 'ok')
    handlers.registerAction('boom', () => { throw new Error('boom') })
    handlers.registerCompensate('undo', (ctx, step, out) => { (ctx.vars as Record<string, unknown>).undone = out })
    definitions.register({
      id: 'w', name: 'w', version: '1',
      steps: [
        { id: 'a', name: 'a', kind: 'action', config: { handler: 'ok' }, dependsOn: [], compensate: 'undo' },
        { id: 'b', name: 'b', kind: 'action', config: { handler: 'boom' }, dependsOn: ['a'] },
      ],
    })
    const r = await engine.execute('w', {})
    expect(r.status).toBe('compensated')
    expect(r.error).toBe('boom')
    expect(r.steps.find(s => s.stepId === 'a')?.status).toBe('compensated')
  })

  it('retries with backoff on transient failure', async () => {
    let n = 0
    handlers.registerAction('flaky', () => { n++; if (n < 3) throw new Error('try again'); return 'ok' })
    definitions.register({
      id: 'w', name: 'w', version: '1',
      steps: [{ id: 'f', name: 'f', kind: 'action', config: { handler: 'flaky' }, dependsOn: [], retry: { maxAttempts: 5, baseDelayMs: 1, maxDelayMs: 5, jitter: false, retryOnStatus: [] } }],
    })
    const r = await engine.execute('w', {})
    expect(r.status).toBe('success')
    expect(r.steps[0]?.attempts).toBe(3)
  })

  it('cancels a running workflow', async () => {
    handlers.registerAction('slow', async () => { await new Promise(r => setTimeout(r, 200)); return 'done' })
    definitions.register({
      id: 'w', name: 'w', version: '1',
      steps: [{ id: 's', name: 's', kind: 'action', config: { handler: 'slow' }, dependsOn: [] }],
    })
    const p = engine.execute('w', {})
    // wait a bit for engine to start
    await new Promise(r => setTimeout(r, 10))
    // find the exec id by listing
    const execs = engine.list()
    if (execs[0]) engine.cancel(execs[0].id)
    const r = await p
    expect(r.status).toBe('cancelled')
  })

  it('skips step when dependency failed', async () => {
    handlers.registerAction('boom', () => { throw new Error('x') })
    handlers.registerAction('after', () => 'after')
    definitions.register({
      id: 'w', name: 'w', version: '1',
      steps: [
        { id: 'a', name: 'a', kind: 'action', config: { handler: 'boom' }, dependsOn: [] },
        { id: 'b', name: 'b', kind: 'action', config: { handler: 'after' }, dependsOn: ['a'] },
      ],
    })
    const r = await engine.execute('w', {})
    expect(r.steps.find(s => s.stepId === 'a')?.status).toBe('failed')
    expect(r.steps.find(s => s.stepId === 'b')?.status).toBe('skipped')
  })

  it('subworkflow executes nested', async () => {
    handlers.registerAction('inner', () => 'inner-result')
    definitions.register({
      id: 'inner', name: 'inner', version: '1',
      steps: [{ id: 'a', name: 'a', kind: 'action', config: { handler: 'inner' }, dependsOn: [] }],
    })
    definitions.register({
      id: 'outer', name: 'outer', version: '1',
      steps: [{ id: 's', name: 's', kind: 'subworkflow', config: { workflow: 'inner' }, dependsOn: [] }],
    })
    const r = await engine.execute('outer', {})
    expect(r.status).toBe('success')
  })
})

// ============== Scheduler ==============

describe('Scheduler', () => {
  beforeEach(() => { scheduler.clear(); definitions.clear(); handlers.clear() })

  it('schedules and runs interval job', async () => {
    handlers.registerAction('tick', () => 'tick')
    definitions.register({
      id: 'w', name: 'w', version: '1',
      steps: [{ id: 'a', name: 'a', kind: 'action', config: { handler: 'tick' }, dependsOn: [] }],
    })
    const id = scheduler.schedule('every-100ms', 'w', { type: 'interval', expr: 100 })
    await new Promise(r => setTimeout(r, 250))
    const job = scheduler.get(id)
    expect(job?.runs).toBeGreaterThanOrEqual(1)
    scheduler.remove(id)
  })

  it('once job fires then removes itself', async () => {
    handlers.registerAction('once', () => 'once')
    definitions.register({
      id: 'w', name: 'w', version: '1',
      steps: [{ id: 'a', name: 'a', kind: 'action', config: { handler: 'once' }, dependsOn: [] }],
    })
    const id = scheduler.schedule('once-50ms', 'w', { type: 'once', expr: Date.now() + 50 })
    expect(scheduler.size()).toBe(1)
    await new Promise(r => setTimeout(r, 150))
    expect(scheduler.size()).toBe(0)
  })

  it('list / enable / clear', () => {
    definitions.register({ id: 'w', name: 'w', version: '1', steps: [] })
    const id = scheduler.schedule('j', 'w', { type: 'interval', expr: 60_000 })
    expect(scheduler.list()).toHaveLength(1)
    scheduler.enable(id, false)
    expect(scheduler.get(id)?.enabled).toBe(false)
    scheduler.clear()
    expect(scheduler.size()).toBe(0)
  })
})

describe('nextCronFire', () => {
  it('every minute returns next minute boundary', () => {
    const now = new Date('2026-06-05T10:30:30Z').getTime()
    const next = nextCronFire('* * * * *', now)
    expect(new Date(next).getMinutes()).toBe(31)
    expect(new Date(next).getSeconds()).toBe(0)
  })
  it('every hour at M', () => {
    const now = new Date('2026-06-05T10:30:00Z').getTime()
    const next = nextCronFire('15 * * * *', now)
    expect(new Date(next).getUTCMinutes()).toBe(15)
    expect(new Date(next).getUTCHours()).toBe(11)
  })
})

// ============== Persistence ==============

describe('persistence', () => {
  it('loadExecutions returns empty when no data', () => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem('versa.workflow.v1')
    expect(loadExecutions()).toEqual([])
  })
  it('persistExecutions returns count', () => {
    if (typeof localStorage === 'undefined') return
    engine.clear()
    expect(persistExecutions(engine)).toBe(0)
  })
})

// ============== summarizeWorkflow ==============

describe('summarizeWorkflow', () => {
  it('returns aggregated snapshot', () => {
    definitions.clear()
    handlers.clear()
    definitions.register({ id: 'w', name: 'w', version: '1', steps: [] })
    handlers.registerAction('a', () => 1)
    const s = summarizeWorkflow()
    expect(s.definitions).toBe(1)
    expect(s.handlers).toBe(1)
    expect(s.metrics).toBeDefined()
  })
})
