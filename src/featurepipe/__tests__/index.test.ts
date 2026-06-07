import { describe, it, expect } from 'vitest'
import { FeaturePipelineEngine, getFeaturePipeline, resetFeaturePipeline } from '../index'

describe('FeaturePipelineEngine', () => {
  describe('pipeline CRUD', () => {
    it('defines a pipeline', () => {
      const e = new FeaturePipelineEngine()
      const p = e.define({ name: 'p1', nodes: [], materialization: 'full', tags: [] })
      expect(p.id).toMatch(/^pipe_/)
      expect(e.get(p.id)?.name).toBe('p1')
    })

    it('uses provided id', () => {
      const e = new FeaturePipelineEngine()
      const p = e.define({ id: 'my_pipe', name: 'p', nodes: [], materialization: 'full', tags: [] })
      expect(p.id).toBe('my_pipe')
    })

    it('updates updatedAt on re-define', async () => {
      const e = new FeaturePipelineEngine()
      const p1 = e.define({ name: 'p', nodes: [], materialization: 'full', tags: [] })
      await new Promise(r => setTimeout(r, 5))
      const p2 = e.define({ id: p1.id, name: 'p2', nodes: [], materialization: 'full', tags: [] })
      expect(p2.createdAt).toBe(p1.createdAt)
      expect(p2.updatedAt).toBeGreaterThan(p1.updatedAt)
    })

    it('lists and deletes', () => {
      const e = new FeaturePipelineEngine()
      const p = e.define({ name: 'p', nodes: [], materialization: 'full', tags: [] })
      expect(e.list()).toHaveLength(1)
      expect(e.delete(p.id)).toBe(true)
      expect(e.list()).toHaveLength(0)
    })
  })

  describe('handler registry', () => {
    it('registers and lists handlers', () => {
      const e = new FeaturePipelineEngine()
      e.registerHandler('noop', () => 1)
      expect(e.hasHandler('noop')).toBe(true)
      expect(e.listHandlers()).toContain('noop')
    })
  })

  describe('DAG operations', () => {
    it('topologicalOrder respects dependencies', () => {
      const e = new FeaturePipelineEngine()
      const p = e.define({
        name: 'dag', materialization: 'full', tags: [],
        nodes: [
          { id: 'a', name: 'a', type: 'source', config: {}, dependsOn: [] },
          { id: 'b', name: 'b', type: 'transform', config: {}, dependsOn: ['a'], handler: 'h' },
          { id: 'c', name: 'c', type: 'sink', config: {}, dependsOn: ['b'], handler: 'h' },
        ],
      })
      const order = e.topologicalOrder(p)
      expect(order.indexOf('a')).toBeLessThan(order.indexOf('b'))
      expect(order.indexOf('b')).toBeLessThan(order.indexOf('c'))
    })

    it('throws on cycle', () => {
      const e = new FeaturePipelineEngine()
      const p = e.define({
        name: 'cyc', materialization: 'full', tags: [],
        nodes: [
          { id: 'a', name: 'a', type: 'transform', config: {}, dependsOn: ['c'], handler: 'h' },
          { id: 'b', name: 'b', type: 'transform', config: {}, dependsOn: ['a'], handler: 'h' },
          { id: 'c', name: 'c', type: 'transform', config: {}, dependsOn: ['b'], handler: 'h' },
        ],
      })
      expect(() => e.topologicalOrder(p)).toThrow('cycle')
      const cycles = e.detectCycles(p)
      expect(cycles.length).toBeGreaterThan(0)
    })

    it('downstream and upstream traversal', () => {
      const e = new FeaturePipelineEngine()
      const p = e.define({
        name: 'trav', materialization: 'full', tags: [],
        nodes: [
          { id: 'a', name: 'a', type: 'source', config: {}, dependsOn: [] },
          { id: 'b', name: 'b', type: 'transform', config: {}, dependsOn: ['a'], handler: 'h' },
          { id: 'c', name: 'c', type: 'transform', config: {}, dependsOn: ['b'], handler: 'h' },
          { id: 'd', name: 'd', type: 'sink', config: {}, dependsOn: ['b'], handler: 'h' },
        ],
      })
      expect(e.upstream(p, 'd')).toEqual(expect.arrayContaining(['b', 'a']))
      expect(e.downstream(p, 'a')).toEqual(expect.arrayContaining(['b', 'c', 'd']))
    })
  })

  describe('validation', () => {
    it('flags missing dependency', () => {
      const e = new FeaturePipelineEngine()
      const p = e.define({
        name: 'v', materialization: 'full', tags: [],
        nodes: [
          { id: 'a', name: 'a', type: 'transform', config: {}, dependsOn: ['ghost'], handler: 'h' },
        ],
      })
      const issues = e.validate(p)
      expect(issues.some(i => i.message.includes('missing'))).toBe(true)
    })

    it('flags transform without handler', () => {
      const e = new FeaturePipelineEngine()
      const p = e.define({
        name: 'v', materialization: 'full', tags: [],
        nodes: [{ id: 'a', name: 'a', type: 'transform', config: {}, dependsOn: [] }],
      })
      const issues = e.validate(p)
      expect(issues.some(i => i.message.includes('requires a handler'))).toBe(true)
    })
  })

  describe('execution', () => {
    it('runs a linear pipeline end-to-end', async () => {
      const e = new FeaturePipelineEngine()
      e.registerHandler('constOne', () => 1)
      e.registerHandler('addOne', (input: unknown) => (typeof input === 'number' ? input + 1 : 0))
      e.registerHandler('identity', (input: unknown) => input)
      const p = e.define({
        name: 'linear', materialization: 'full', tags: [],
        nodes: [
          { id: 'src', name: 'src', type: 'source', config: {}, dependsOn: [], handler: 'constOne' },
          { id: 't1', name: 't1', type: 'transform', config: {}, dependsOn: ['src'], handler: 'addOne' },
          { id: 'sink', name: 'sink', type: 'sink', config: {}, dependsOn: ['t1'], handler: 'identity' },
        ],
      })
      const run = await e.run(p.id)
      expect(run.status).toBe('success')
      expect(run.nodeStates['t1'].output).toBe(2)
      expect(run.nodeStates['sink'].status).toBe('success')
    })

    it('skips downstream nodes on failure', async () => {
      const e = new FeaturePipelineEngine()
      e.registerHandler('ok', () => 'ok')
      e.registerHandler('fail', () => { throw new Error('boom') })
      const p = e.define({
        name: 'fail', materialization: 'full', tags: [],
        nodes: [
          { id: 'a', name: 'a', type: 'transform', config: {}, dependsOn: [], handler: 'ok' },
          { id: 'b', name: 'b', type: 'transform', config: {}, dependsOn: ['a'], handler: 'fail' },
          { id: 'c', name: 'c', type: 'sink', config: {}, dependsOn: ['b'], handler: 'ok' },
        ],
      })
      const run = await e.run(p.id)
      expect(run.status).toBe('failed')
      expect(run.nodeStates['b'].status).toBe('failed')
      expect(run.nodeStates['c'].status).toBe('skipped')
    })

    it('retries failed node', async () => {
      const e = new FeaturePipelineEngine()
      let n = 0
      e.registerHandler('flaky', () => { n += 1; if (n < 3) throw new Error('flaky') ; return n })
      const p = e.define({
        name: 'retry', materialization: 'full', tags: [],
        nodes: [
          { id: 'a', name: 'a', type: 'transform', config: {}, dependsOn: [], handler: 'flaky', retries: 3 },
        ],
      })
      const run = await e.run(p.id)
      expect(run.status).toBe('success')
      expect(run.nodeStates['a'].attempts).toBe(3)
      expect(run.nodeStates['a'].output).toBe(3)
    })

    it('exhausts retries on persistent failure', async () => {
      const e = new FeaturePipelineEngine()
      e.registerHandler('alwaysFail', () => { throw new Error('nope') })
      const p = e.define({
        name: 'exh', materialization: 'full', tags: [],
        nodes: [
          { id: 'a', name: 'a', type: 'transform', config: {}, dependsOn: [], handler: 'alwaysFail', retries: 2 },
        ],
      })
      const run = await e.run(p.id)
      expect(run.status).toBe('failed')
      expect(run.nodeStates['a'].attempts).toBe(3)
    })

    it('merges multiple upstream inputs', async () => {
      const e = new FeaturePipelineEngine()
      e.registerHandler('a', () => 2)
      e.registerHandler('b', () => 3)
      e.registerHandler('sum', (input: unknown) => {
        if (input && typeof input === 'object') {
          return Object.values(input as Record<string, number>).reduce((s, v) => s + v, 0)
        }
        return 0
      })
      const p = e.define({
        name: 'merge', materialization: 'full', tags: [],
        nodes: [
          { id: 'a', name: 'a', type: 'source', config: {}, dependsOn: [], handler: 'a' },
          { id: 'b', name: 'b', type: 'source', config: {}, dependsOn: [], handler: 'b' },
          { id: 'c', name: 'c', type: 'transform', config: {}, dependsOn: ['a', 'b'], handler: 'sum' },
        ],
      })
      const run = await e.run(p.id)
      expect(run.nodeStates['c'].output).toBe(5)
    })
  })

  describe('run history & stats', () => {
    it('lists runs in chronological order', async () => {
      const e = new FeaturePipelineEngine()
      e.registerHandler('ok', () => 1)
      const p = e.define({
        name: 'h', materialization: 'full', tags: [],
        nodes: [{ id: 'a', name: 'a', type: 'transform', config: {}, dependsOn: [], handler: 'ok' }],
      })
      await e.run(p.id)
      await e.run(p.id)
      const runs = e.listRuns(p.id)
      expect(runs).toHaveLength(2)
      expect(runs[0].startedAt).toBeLessThanOrEqual(runs[1].startedAt)
    })

    it('respects limit', async () => {
      const e = new FeaturePipelineEngine()
      e.registerHandler('ok', () => 1)
      const p = e.define({ name: 'h', materialization: 'full', tags: [], nodes: [{ id: 'a', name: 'a', type: 'transform', config: {}, dependsOn: [], handler: 'ok' }] })
      await e.run(p.id)
      await e.run(p.id)
      await e.run(p.id)
      expect(e.listRuns(p.id, 2)).toHaveLength(2)
    })

    it('computes stats', async () => {
      const e = new FeaturePipelineEngine()
      e.registerHandler('ok', () => 1)
      e.registerHandler('fail', () => { throw new Error('x') })
      const pOk = e.define({ name: 'ok', materialization: 'full', tags: [], nodes: [{ id: 'a', name: 'a', type: 'transform', config: {}, dependsOn: [], handler: 'ok' }] })
      const pFail = e.define({ name: 'f', materialization: 'full', tags: [], nodes: [{ id: 'a', name: 'a', type: 'transform', config: {}, dependsOn: [], handler: 'fail' }] })
      await e.run(pOk.id)
      await e.run(pOk.id)
      await e.run(pFail.id)
      const s = e.stats(pOk.id)
      expect(s.totalRuns).toBe(2)
      expect(s.successRuns).toBe(2)
      expect(s.successRate).toBe(1)
    })
  })

  describe('lifecycle', () => {
    it('singleton lifecycle', () => {
      resetFeaturePipeline()
      const a = getFeaturePipeline()
      const b = getFeaturePipeline()
      expect(a).toBe(b)
      resetFeaturePipeline()
    })
  })
})
