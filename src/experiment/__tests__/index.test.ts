import { describe, it, expect, beforeEach } from 'vitest'
import { ExperimentService, getExperimentService, resetExperimentService, type Experiment } from '../index'

function makeExp(overrides: Partial<Experiment> = {}): Experiment {
  return {
    key: 'btn_color',
    name: 'Button Color',
    variants: [
      { name: 'control', weight: 50, config: { color: 'blue' } },
      { name: 'variant_a', weight: 50, config: { color: 'green' } }
    ],
    status: 'running',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides
  }
}

describe('ExperimentService - CRUD', () => {
  let svc: ExperimentService
  beforeEach(() => { svc = new ExperimentService() })

  it('creates experiment', () => {
    const e = svc.createExperiment(makeExp())
    expect(e.key).toBe('btn_color')
    expect(e.status).toBe('running')
    expect(svc.getExperiment('btn_color')).toBeDefined()
  })
  it('throws on duplicate', () => {
    svc.createExperiment(makeExp())
    expect(() => svc.createExperiment(makeExp())).toThrow()
  })
  it('updates experiment', () => {
    svc.createExperiment(makeExp())
    const u = svc.updateExperiment('btn_color', { description: 'updated' })
    expect(u.description).toBe('updated')
  })
  it('throws on update missing', () => {
    expect(() => svc.updateExperiment('foo', {})).toThrow()
  })
  it('deletes experiment', () => {
    svc.createExperiment(makeExp())
    expect(svc.deleteExperiment('btn_color')).toBe(true)
    expect(svc.getExperiment('btn_color')).toBeUndefined()
  })
  it('delete returns false for missing', () => {
    expect(svc.deleteExperiment('foo')).toBe(false)
  })
  it('lifecycle: start/pause/resume/complete/archive', () => {
    svc.createExperiment({ ...makeExp(), status: 'draft' })
    svc.startExperiment('btn_color')
    expect(svc.getExperiment('btn_color')?.status).toBe('running')
    svc.pauseExperiment('btn_color')
    expect(svc.getExperiment('btn_color')?.status).toBe('paused')
    svc.resumeExperiment('btn_color')
    expect(svc.getExperiment('btn_color')?.status).toBe('running')
    svc.completeExperiment('btn_color')
    expect(svc.getExperiment('btn_color')?.status).toBe('completed')
    svc.archiveExperiment('btn_color')
    expect(svc.getExperiment('btn_color')?.status).toBe('archived')
  })
})

describe('ExperimentService - list & filter', () => {
  let svc: ExperimentService
  beforeEach(() => { svc = new ExperimentService() })
  it('lists by status', () => {
    svc.createExperiment({ ...makeExp({ key: 'a' }), status: 'running' })
    svc.createExperiment({ ...makeExp({ key: 'b' }), status: 'paused' })
    expect(svc.listExperiments({ status: 'running' })).toHaveLength(1)
  })
  it('lists by tag', () => {
    svc.createExperiment({ ...makeExp({ key: 'a' }), tags: ['homepage'] })
    expect(svc.listExperiments({ tag: 'homepage' })).toHaveLength(1)
  })
  it('lists by owner', () => {
    svc.createExperiment({ ...makeExp({ key: 'a' }), ownerId: 'alice' })
    expect(svc.listExperiments({ ownerId: 'alice' })).toHaveLength(1)
  })
})

describe('ExperimentService - targeting', () => {
  let svc: ExperimentService
  beforeEach(() => { svc = new ExperimentService() })

  it('match-all returns true', () => {
    expect(svc.evaluateTargeting({ type: 'match-all' }, { userId: 'u1' })).toBe(true)
  })
  it('match-attrs eq', () => {
    expect(svc.evaluateTargeting({ type: 'match-attrs', predicates: [{ attr: 'country', op: 'eq', value: 'US' }] }, { userId: 'u1', attributes: { country: 'US' } })).toBe(true)
    expect(svc.evaluateTargeting({ type: 'match-attrs', predicates: [{ attr: 'country', op: 'eq', value: 'US' }] }, { userId: 'u1', attributes: { country: 'CA' } })).toBe(false)
  })
  it('match-attrs in/gt/lt/contains', () => {
    const r = (op: string, v: unknown, val: unknown, expect_: boolean) => {
      const result = svc.evaluateTargeting({ type: 'match-attrs', predicates: [{ attr: 'x', op: op as 'eq', value: v }] }, { userId: 'u', attributes: { x: val } })
      expect(result).toBe(expect_)
    }
    r('gt', 3, 5, true)
    r('gt', 5, 5, false)
    r('lt', 10, 5, true)
    r('in', [1, 5, 7], 5, true)
    r('contains', 'hello', 'hello world', true)
  })
  it('and/or', () => {
    const a = svc.evaluateTargeting({ type: 'and', rules: [{ type: 'match-attrs', predicates: [{ attr: 'a', op: 'eq', value: 1 }] }, { type: 'match-attrs', predicates: [{ attr: 'b', op: 'eq', value: 2 }] }] }, { userId: 'u', attributes: { a: 1, b: 2 } })
    expect(a).toBe(true)
    const o = svc.evaluateTargeting({ type: 'or', rules: [{ type: 'match-attrs', predicates: [{ attr: 'a', op: 'eq', value: 9 }] }, { type: 'match-attrs', predicates: [{ attr: 'b', op: 'eq', value: 2 }] }] }, { userId: 'u', attributes: { a: 1, b: 2 } })
    expect(o).toBe(true)
  })
  it('not', () => {
    expect(svc.evaluateTargeting({ type: 'not' }, { userId: 'u' })).toBe(false)
  })
})

describe('ExperimentService - assignment', () => {
  let svc: ExperimentService
  beforeEach(() => { svc = new ExperimentService() })

  it('returns null for missing experiment', () => {
    expect(svc.assign('missing', { userId: 'u1' })).toBeNull()
  })
  it('returns null for non-running experiment', () => {
    svc.createExperiment({ ...makeExp(), status: 'paused' })
    expect(svc.assign('btn_color', { userId: 'u1' })).toBeNull()
  })
  it('returns null when targeting fails', () => {
    svc.createExperiment({ ...makeExp(), targeting: { type: 'match-attrs', predicates: [{ attr: 'country', op: 'eq', value: 'US' }] } })
    expect(svc.assign('btn_color', { userId: 'u1', attributes: { country: 'CA' } })).toBeNull()
  })
  it('assigns a variant', () => {
    svc.createExperiment(makeExp())
    const r = svc.assign('btn_color', { userId: 'u1' })
    expect(r).not.toBeNull()
    expect(['control', 'variant_a']).toContain(r!.variant)
    expect(r!.source).toBe('bucket')
  })
  it('sticks to same variant on second call', () => {
    svc.createExperiment(makeExp())
    const a = svc.assign('btn_color', { userId: 'u1' })!
    const b = svc.assign('btn_color', { userId: 'u1' })!
    expect(a.variant).toBe(b.variant)
    expect(b.sticky).toBe(true)
  })
  it('forced user always gets first variant', () => {
    svc.createExperiment({ ...makeExp(), forcedUserIds: ['u1'] })
    const r = svc.assign('btn_color', { userId: 'u1' })!
    expect(r.variant).toBe('control')
    expect(r.source).toBe('forced')
  })
  it('holdout assignment', () => {
    svc.createExperiment({ ...makeExp({ key: 'h' }), holdoutPercent: 100 })
    const r = svc.assign('h', { userId: 'u1' })!
    expect(r.variant).toBe('__holdout__')
    expect(r.source).toBe('holdout')
  })
  it('rampout when bucket exceeds ramp', () => {
    svc.createExperiment({ ...makeExp({ key: 'r' }), rampPercent: 0 })
    const r = svc.assign('r', { userId: 'u1' })!
    expect(r.variant).toBe('__rampout__')
    expect(r.source).toBe('rampout')
  })
  it('distributes across variants roughly evenly', () => {
    svc.createExperiment(makeExp())
    const counts: Record<string, number> = { control: 0, variant_a: 0 }
    for (let i = 0; i < 200; i++) {
      const r = svc.assign('btn_color', { userId: 'u' + i })!
      counts[r.variant]++
    }
    expect(counts.control).toBeGreaterThan(50)
    expect(counts.variant_a).toBeGreaterThan(50)
  })
  it('weighted 90/10 distribution', () => {
    svc.createExperiment({ ...makeExp({ key: 'w' }), variants: [{ name: 'control', weight: 90, config: {} }, { name: 'treatment', weight: 10, config: {} }] })
    let control = 0, treat = 0
    for (let i = 0; i < 500; i++) {
      const r = svc.assign('w', { userId: 'uw' + i })!
      if (r.variant === 'control') control++; else treat++
    }
    expect(control).toBeGreaterThan(treat * 5)
  })
})

describe('ExperimentService - conversions', () => {
  let svc: ExperimentService
  beforeEach(() => { svc = new ExperimentService() })
  it('tracks and lists conversions', () => {
    svc.createExperiment(makeExp())
    svc.assign('btn_color', { userId: 'u1' })
    svc.trackConversion({ experimentKey: 'btn_color', variant: 'control', userId: 'u1', metric: 'goal' })
    expect(svc.listConversions({ experimentKey: 'btn_color' })).toHaveLength(1)
  })
  it('filters by metric', () => {
    svc.createExperiment(makeExp())
    svc.trackConversion({ experimentKey: 'btn_color', variant: 'control', userId: 'u1', metric: 'click' })
    svc.trackConversion({ experimentKey: 'btn_color', variant: 'control', userId: 'u1', metric: 'goal' })
    expect(svc.listConversions({ metric: 'click' })).toHaveLength(1)
  })
  it('filters by user', () => {
    svc.createExperiment(makeExp())
    svc.trackConversion({ experimentKey: 'btn_color', variant: 'control', userId: 'u1', metric: 'goal' })
    expect(svc.listConversions({ userId: 'u2' })).toHaveLength(0)
  })
})

describe('ExperimentService - results', () => {
  let svc: ExperimentService
  beforeEach(() => { svc = new ExperimentService() })

  it('computes variant stats', () => {
    svc.createExperiment(makeExp())
    for (let i = 0; i < 20; i++) {
      const r = svc.assign('btn_color', { userId: 'u' + i })!
      if (i < 5) svc.trackConversion({ experimentKey: 'btn_color', variant: r.variant, userId: 'u' + i, metric: 'goal' })
    }
    const res = svc.computeResults('btn_color')
    expect(res).not.toBeNull()
    expect(res!.totalExposures).toBeGreaterThan(0)
    expect(res!.variantStats).toHaveLength(2)
  })
  it('returns null for missing', () => {
    expect(svc.computeResults('foo')).toBeNull()
  })
  it('computes significance', () => {
    svc.createExperiment(makeExp())
    for (let i = 0; i < 100; i++) {
      const r = svc.assign('btn_color', { userId: 'u' + i })!
      if (r.variant === 'variant_a') svc.trackConversion({ experimentKey: 'btn_color', variant: r.variant, userId: 'u' + i, metric: 'goal' })
    }
    const res = svc.computeResults('btn_color')!
    expect(res.significance).toBeDefined()
    expect(res.significance![0]!.pValue).toBeLessThanOrEqual(1)
  })
  it('high significance with extreme lift', () => {
    svc.createExperiment(makeExp())
    for (let i = 0; i < 100; i++) {
      svc.assign('btn_color', { userId: 'u' + i })
      if (i < 50) {
        const r2 = svc.assign('btn_color', { userId: 'u' + i })
        svc.trackConversion({ experimentKey: 'btn_color', variant: r2!.variant, userId: 'u' + i, metric: 'goal' })
      }
    }
    const res = svc.computeResults('btn_color')!
    expect(res).toBeDefined()
  })
})

describe('ExperimentService - query', () => {
  let svc: ExperimentService
  beforeEach(() => { svc = new ExperimentService() })
  it('returns sticky assignment', () => {
    svc.createExperiment(makeExp())
    svc.assign('btn_color', { userId: 'u1' })
    expect(svc.getAssignment('u1', 'btn_color')).toBeDefined()
  })
  it('lists all user assignments', () => {
    svc.createExperiment(makeExp({ key: 'a' }))
    svc.createExperiment(makeExp({ key: 'b' }))
    svc.assign('a', { userId: 'u1' })
    svc.assign('b', { userId: 'u1' })
    expect(svc.listAssignmentsForUser('u1')).toHaveLength(2)
  })
})

describe('ExperimentService - metrics', () => {
  let svc: ExperimentService
  beforeEach(() => { svc = new ExperimentService() })
  it('tracks totalExperiments', () => {
    svc.createExperiment(makeExp())
    svc.createExperiment({ ...makeExp({ key: 'b' }) })
    expect(svc.getMetrics().totalExperiments).toBe(2)
  })
  it('tracks byStatus', () => {
    svc.createExperiment({ ...makeExp({ key: 'a' }), status: 'running' })
    svc.createExperiment({ ...makeExp({ key: 'b' }), status: 'paused' })
    const m = svc.getMetrics()
    expect(m.byStatus.running).toBe(1)
    expect(m.byStatus.paused).toBe(1)
  })
  it('tracks byVariant', () => {
    svc.createExperiment(makeExp())
    for (let i = 0; i < 5; i++) svc.assign('btn_color', { userId: 'u' + i })
    const m = svc.getMetrics()
    expect(m.byVariant.control + m.byVariant.variant_a).toBe(5)
  })
  it('resetMetrics keeps experiments', () => {
    svc.createExperiment(makeExp())
    svc.assign('btn_color', { userId: 'u1' })
    svc.resetMetrics()
    const m = svc.getMetrics()
    expect(m.totalAssignments).toBe(0)
    expect(m.totalExperiments).toBe(1)
  })
})

describe('ExperimentService - singleton', () => {
  it('singleton returns same instance', () => {
    resetExperimentService()
    expect(getExperimentService()).toBe(getExperimentService())
  })
})
