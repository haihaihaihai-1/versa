import { describe, it, expect } from 'vitest'
import { Workflow, WorkflowEngine, WorkflowBuilder, workflow, Step, getEngine, resetEngine } from '../index'

describe('Workflow definition', () => {
  it('builds from builder', () => {
    const wf = workflow('w1')
      .step('a', async () => ({ output: 1 }))
      .step('b', async () => ({ output: 2 }))
      .build('a')
    expect(wf).toBeInstanceOf(Workflow)
    expect(wf.def.steps).toHaveLength(2)
    expect(wf.def.start).toBe('a')
  })

  it('validates reachable steps', () => {
    const wf = new Workflow({
      id: 'w2',
      start: 'a',
      steps: [
        { id: 'a', handler: () => ({ output: 1 }), next: 'b' },
        { id: 'b', handler: () => ({ output: 2 }) },
        { id: 'orphan', handler: () => ({ output: 3 }) },
      ],
    })
    const v = wf.validate()
    expect(v.ok).toBe(false)
    expect(v.errors.some(e => e.includes('orphan'))).toBe(true)
  })

  it('detects missing next ref', () => {
    const wf = new Workflow({
      id: 'w3',
      start: 'a',
      steps: [{ id: 'a', handler: () => ({}), next: 'missing' }],
    })
    const v = wf.validate()
    expect(v.ok).toBe(false)
    expect(v.errors.some(e => e.includes('missing'))).toBe(true)
  })

  it('detects cycle', () => {
    const wf = new Workflow({
      id: 'w4',
      start: 'a',
      steps: [
        { id: 'a', handler: () => ({}), next: 'b' },
        { id: 'b', handler: () => ({}), next: 'a' },
      ],
    })
    const v = wf.validate()
    expect(v.ok).toBe(false)
    expect(v.errors.some(e => e.includes('cycle'))).toBe(true)
  })

  it('topoOrder returns steps in order', () => {
    const wf = new Workflow({
      id: 'w5',
      start: 'a',
      steps: [
        { id: 'a', handler: () => ({}), next: 'b' },
        { id: 'b', handler: () => ({}), next: 'c' },
        { id: 'c', handler: () => ({}), next: 'd' },
        { id: 'd', handler: () => ({}) },
      ],
    })
    expect(wf.topoOrder()).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('Step', () => {
  it('runs handler with context', async () => {
    const step = new Step({ id: 's1', handler: ctx => ({ output: ctx.runId }) })
    const r = await step.run(undefined, {}, 'rid')
    expect(r.output).toBe('rid')
  })

  it('respects condition false → skip', async () => {
    let called = false
    const step = new Step({ id: 's', handler: () => { called = true; return { output: 1 } }, condition: () => false })
    const r = await step.run(undefined, {})
    expect(called).toBe(false)
    expect(r.output).toBeUndefined()
  })

  it('catches handler error', async () => {
    const step = new Step({ id: 's', handler: () => { throw new Error('boom') } })
    const r = await step.run(undefined, {})
    expect(r.error).toBe('boom')
  })

  it('respects timeoutMs', async () => {
    const step = new Step({ id: 's', handler: async ctx => { await ctx.sleep(1000); return { output: 1 } }, timeoutMs: 50 })
    const r = await step.run(undefined, {})
    expect(r.error).toBe('timeout')
  })
})

describe('WorkflowEngine — basic', () => {
  it('starts a run', () => {
    const eng = new WorkflowEngine()
    const wf = workflow('w').step('a', () => ({ output: 1 })).build('a')
    eng.register(wf)
    const run = eng.start('w')
    expect(run.status).toBe('pending')
    expect(run.stepStates.get('a')).toBe('pending')
  })

  it('executes simple workflow', async () => {
    const eng = new WorkflowEngine()
    const wf = workflow('w')
      .step('a', () => ({ output: 1 }))
      .step('b', () => ({ output: 2 }))
      .build('a', 'b')
    eng.register(wf)
    const run = eng.start('w')
    const r = await eng.execute(run)
    expect(r.status).toBe('success')
    expect(r.stepStates.get('a')).toBe('success')
    expect(r.stepStates.get('b')).toBe('success')
  })

  it('throws on unknown workflow', () => {
    const eng = new WorkflowEngine()
    expect(() => eng.start('nope')).toThrow()
  })

  it('rejects start on completed run', async () => {
    const eng = new WorkflowEngine()
    const wf = workflow('w').step('a', () => ({ output: 1 })).build('a')
    eng.register(wf)
    const run = eng.start('w')
    await eng.execute(run)
    const r2 = await eng.execute(run)
    expect(r2.status).toBe('success')
  })
})

describe('WorkflowEngine — parallel fork/join', () => {
  it('runs parallel siblings concurrently', async () => {
    const eng = new WorkflowEngine()
    const wf = workflow('p')
      .parallelStep('a', async () => { await new Promise(r => setTimeout(r, 30)); return { output: 'A' } })
      .parallelStep('b', async () => { await new Promise(r => setTimeout(r, 30)); return { output: 'B' } })
      .step('c', () => ({ output: 'C' }))
      .build('a', 'c')
    eng.register(wf)
    const run = eng.start('p')
    const r = await eng.execute(run)
    expect(r.status).toBe('success')
    expect(r.stepStates.get('a')).toBe('success')
    expect(r.stepStates.get('b')).toBe('success')
    expect(r.stepStates.get('c')).toBe('success')
  })

  it('fails and compensates on parallel error', async () => {
    const eng = new WorkflowEngine()
    let aCompensated = false
    const wf = workflow('p2')
      .parallelStep('a', async () => ({ output: 1 }), { compensate: () => { aCompensated = true } })
      .parallelStep('b', async () => ({ error: 'fail' }))
      .build('a')
    eng.register(wf)
    const run = eng.start('p2')
    const r = await eng.execute(run)
    expect(r.status).toBe('failed')
    expect(aCompensated).toBe(true)
    expect(r.stepStates.get('a')).toBe('compensated')
  })
})

describe('WorkflowEngine — retries, compensation, signals, timers', () => {
  it('retries failed step', async () => {
    let n = 0
    const eng = new WorkflowEngine()
    const wf = workflow('r').step('a', () => { n++; return n < 3 ? { error: 'try' } : { output: 'ok' } }, { retries: 3, backoffMs: 1 }).build('a')
    eng.register(wf)
    const run = eng.start('r')
    const r = await eng.execute(run)
    expect(r.status).toBe('success')
    expect(run.stepAttempts.get('a')).toBe(3)
  })

  it('marks failed after max attempts', async () => {
    const eng = new WorkflowEngine()
    const wf = workflow('r2').step('a', () => ({ error: 'always' }), { retries: 1, backoffMs: 1 }).build('a')
    eng.register(wf)
    const run = eng.start('r2')
    const r = await eng.execute(run)
    expect(r.status).toBe('failed')
    expect(run.stepAttempts.get('a')).toBe(2)
  })

  it('runs compensation on failure', async () => {
    let comp = false
    const eng = new WorkflowEngine()
    const wf = workflow('c')
      .step('a', () => ({ output: 1 }))
      .step('b', () => ({ error: 'fail' }), { compensate: () => { comp = true } })
      .build('a')
    eng.register(wf)
    const run = eng.start('c')
    const r = await eng.execute(run)
    expect(r.status).toBe('failed')
    expect(comp).toBe(true)
  })

  it('signals modify run state', () => {
    const eng = new WorkflowEngine()
    const wf = workflow('s').step('a', () => ({ output: 1 })).build('a')
    eng.register(wf)
    const run = eng.start('s')
    eng.signal(run.id, 'x', 42)
    expect(run.state['signal.x']).toBe(42)
  })

  it('schedule fires signal', async () => {
    const eng = new WorkflowEngine()
    const wf = workflow('s2').step('a', () => ({ output: 1 })).build('a')
    eng.register(wf)
    const run = eng.start('s2')
    eng.schedule(run.id, 'tick', true, 30)
    await new Promise(r => setTimeout(r, 80))
    expect(run.state['signal.tick']).toBe(true)
  })

  it('cancelTimer removes pending', () => {
    const eng = new WorkflowEngine()
    const wf = workflow('s3').step('a', () => ({ output: 1 })).build('a')
    eng.register(wf)
    const run = eng.start('s3')
    const tid = eng.schedule(run.id, 'k', 1, 10000)
    expect(eng.cancelTimer(tid)).toBe(true)
    expect(eng.cancelTimer(tid)).toBe(false)
  })

  it('cancel marks run cancelled', async () => {
    const eng = new WorkflowEngine()
    const wf = workflow('x').step('a', async () => { await new Promise(r => setTimeout(r, 50)); return { output: 1 } }).build('a')
    eng.register(wf)
    const run = eng.start('x')
    eng.cancel(run.id)
    const r = await eng.execute(run)
    expect(r.status).toBe('cancelled')
  })

  it('waitForSignal resolves when signal set', async () => {
    const eng = new WorkflowEngine()
    const wf = workflow('w').step('a', () => ({ output: 1 })).build('a')
    eng.register(wf)
    const run = eng.start('w')
    setTimeout(() => eng.signal(run.id, 'k', 'v'), 30)
    const v = await eng.waitForSignal(run.id, 'k', 500)
    expect(v).toBe('v')
  })

  it('waitForSignal rejects on timeout', async () => {
    const eng = new WorkflowEngine()
    const wf = workflow('w').step('a', () => ({ output: 1 })).build('a')
    eng.register(wf)
    const run = eng.start('w')
    await expect(eng.waitForSignal(run.id, 'k', 30)).rejects.toThrow('timeout')
  })
})

describe('WorkflowEngine — registry and metrics', () => {
  it('registers, unregisters, lists', () => {
    const eng = new WorkflowEngine()
    const wf = workflow('r').step('a', () => ({ output: 1 })).build('a')
    eng.register(wf)
    expect(eng.listWorkflows()).toContain('r')
    expect(eng.unregister('r')).toBe(true)
    expect(eng.listWorkflows()).not.toContain('r')
  })

  it('getWorkflow retrieves by id', () => {
    const eng = new WorkflowEngine()
    const wf = workflow('id1').step('a', () => ({})).build('a')
    eng.register(wf)
    expect(eng.getWorkflow('id1')).toBe(wf)
  })

  it('listRuns filters by workflow', async () => {
    const eng = new WorkflowEngine()
    eng.register(workflow('a').step('s', () => ({})).build('s'))
    eng.register(workflow('b').step('s', () => ({})).build('s'))
    const r1 = eng.start('a')
    const r2 = eng.start('b')
    expect(eng.listRuns('a')).toHaveLength(1)
    expect(eng.listRuns('b')).toHaveLength(1)
  })

  it('snapshot captures state', async () => {
    const eng = new WorkflowEngine()
    const wf = workflow('s').step('a', () => ({ output: 1 })).build('a')
    eng.register(wf)
    const run = eng.start('s')
    eng.signal(run.id, 'x', 1)
    await eng.execute(run)
    const snap = eng.snapshot()
    expect(snap).toHaveLength(1)
    expect(snap[0].state['signal.x']).toBe(1)
  })

  it('metrics counts statuses', async () => {
    const eng = new WorkflowEngine()
    const wf = workflow('m').step('a', () => ({ output: 1 })).build('a')
    eng.register(wf)
    const r1 = eng.start('m')
    await eng.execute(r1)
    expect(eng.metrics().success).toBe(1)
    expect(eng.metrics().workflows).toBe(1)
  })

  it('clear wipes all', async () => {
    const eng = new WorkflowEngine()
    const wf = workflow('c').step('a', () => ({})).build('a')
    eng.register(wf)
    eng.start('c')
    eng.clear()
    expect(eng.listRuns()).toHaveLength(0)
  })

  it('onStepComplete callback fires for each step', async () => {
    const eng = new WorkflowEngine()
    const wf = workflow('cb').step('a', () => ({ output: 1 })).step('b', () => ({ output: 2 })).build('a')
    eng.register(wf)
    const run = eng.start('cb')
    const seen: string[] = []
    await eng.execute(run, id => seen.push(id))
    expect(seen).toEqual(['a', 'b'])
  })
})

describe('Singleton', () => {
  it('getEngine returns same instance', () => {
    resetEngine()
    const a = getEngine()
    const b = getEngine()
    expect(a).toBe(b)
  })

  it('resetEngine creates new instance', () => {
    const a = getEngine()
    resetEngine()
    const b = getEngine()
    expect(a).not.toBe(b)
  })
})
