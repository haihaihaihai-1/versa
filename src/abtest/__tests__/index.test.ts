import { describe, it, expect, beforeEach } from 'vitest'
import { AbTestingFramework, resetAbFramework, type Variant, type Experiment } from '../index'

let ab: AbTestingFramework

beforeEach(() => {
  resetAbFramework()
  ab = new AbTestingFramework({ minSamplePerVariant: 50 })
})

const exp = (over: Partial<Experiment> = {}): Omit<Experiment, 'status'> => ({
  id: 'exp1',
  name: 'homepage_cta',
  description: 'test new CTA color',
  variants: [
    { id: 'control', name: 'Control', weight: 1, isControl: true },
    { id: 'treatment', name: 'Treatment', weight: 1 },
  ],
  metric: 'click',
  tags: ['homepage'],
  ...over,
})

describe('AbTestingFramework', () => {
  it('creates and retrieves experiments', () => {
    ab.createExperiment(exp())
    expect(ab.getExperiment('exp1')?.name).toBe('homepage_cta')
    expect(ab.listExperiments()).toHaveLength(1)
  })

  it('rejects duplicate experiment ids', () => {
    ab.createExperiment(exp())
    expect(() => ab.createExperiment(exp())).toThrow()
  })

  it('rejects zero-weight variants', () => {
    expect(() => ab.createExperiment(exp({ variants: [{ id: 'a', name: 'A', weight: 0 }, { id: 'b', name: 'B', weight: 0 }] }))).toThrow()
  })

  it('starts and pauses experiments', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    expect(ab.getExperiment('exp1')?.status).toBe('running')
    ab.pauseExperiment('exp1')
    expect(ab.getExperiment('exp1')?.status).toBe('paused')
    ab.startExperiment('exp1')
    expect(ab.getExperiment('exp1')?.status).toBe('running')
    ab.completeExperiment('exp1')
    expect(ab.getExperiment('exp1')?.status).toBe('completed')
  })

  it('assigns users deterministically', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    const a1 = ab.assign('u1', 'exp1')
    const a2 = ab.assign('u1', 'exp1')
    expect(a1.variantId).toBe(a2.variantId)
    expect(['control', 'treatment']).toContain(a1.variantId)
  })

  it('distributes users roughly evenly with equal weights', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    const counts: Record<string, number> = { control: 0, treatment: 0 }
    for (let i = 0; i < 1000; i++) {
      const a = ab.assign('u' + i, 'exp1')
      counts[a.variantId] = (counts[a.variantId] ?? 0) + 1
    }
    expect(counts.control).toBeGreaterThan(400)
    expect(counts.treatment).toBeGreaterThan(400)
  })

  it('respects variant weights', () => {
    const variants: Variant[] = [
      { id: 'a', name: 'A', weight: 9, isControl: true },
      { id: 'b', name: 'B', weight: 1 },
    ]
    ab.createExperiment(exp({ variants }))
    ab.startExperiment('exp1')
    let aCount = 0
    let bCount = 0
    for (let i = 0; i < 1000; i++) {
      const a = ab.assign('u' + i, 'exp1')
      if (a.variantId === 'a') aCount += 1
      else bCount += 1
    }
    expect(aCount).toBeGreaterThan(bCount * 5)
  })

  it('throws when assigning to non-existent experiment', () => {
    expect(() => ab.assign('u1', 'missing')).toThrow()
  })

  it('throws when assigning to non-running experiment', () => {
    ab.createExperiment(exp())
    expect(() => ab.assign('u1', 'exp1')).toThrow()
  })

  it('tracks exposure and aggregates per variant', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    for (let i = 0; i < 200; i++) {
      ab.assign('u' + i, 'exp1')
      ab.trackExposure('u' + i, 'exp1', 'click', 1)
    }
    const result = ab.analyze('exp1')
    expect(result.variants).toHaveLength(2)
    for (const v of result.variants) {
      expect(v.exposures).toBeGreaterThan(0)
    }
  })

  it('throws when tracking exposure without assignment', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    expect(() => ab.trackExposure('u-never', 'exp1', 'click', 1)).toThrow()
  })

  it('analyze detects significant winner with strong effect', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    for (let i = 0; i < 500; i++) {
      ab.assign('user' + i, 'exp1')
    }
    const assignments = ab.listAssignments('exp1')
    for (const a of assignments) {
      const value = a.variantId === 'treatment' ? 1 : 0
      ab.trackExposure(a.userId, 'exp1', 'click', value)
    }
    const result = ab.analyze('exp1')
    expect(result.isSignificant).toBe(true)
    expect(result.winner).toBe('treatment')
    expect(result.recommendation).toBe('declare_winner')
  })

  it('analyze returns no winner for identical distributions', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    for (let i = 0; i < 200; i++) {
      ab.assign('user' + i, 'exp1')
    }
    const assignments = ab.listAssignments('exp1')
    for (const a of assignments) {
      ab.trackExposure(a.userId, 'exp1', 'click', 0.5)
    }
    const result = ab.analyze('exp1')
    expect(result.isSignificant).toBe(false)
    expect(result.pValue).toBeGreaterThan(0.05)
  })

  it('analyze marks sampleSizeReached when enough data', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    for (let i = 0; i < 200; i++) {
      ab.assign('u' + i, 'exp1')
      ab.trackExposure('u' + i, 'exp1', 'click', 1)
    }
    const result = ab.analyze('exp1')
    expect(result.sampleSizeReached).toBe(true)
  })

  it('analyze marks sampleSizeReached=false when insufficient data', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    for (let i = 0; i < 10; i++) {
      ab.assign('u' + i, 'exp1')
      ab.trackExposure('u' + i, 'exp1', 'click', 1)
    }
    const result = ab.analyze('exp1')
    expect(result.sampleSizeReached).toBe(false)
  })

  it('trackExposureBatch records multiple exposures', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    for (let i = 0; i < 100; i++) ab.assign('u' + i, 'exp1')
    const items = Array.from({ length: 100 }, (_, i) => ({ userId: 'u' + i, experimentId: 'exp1', metric: 'click', value: 1 }))
    ab.trackExposureBatch(items)
    expect(ab.countExposures()).toBe(100)
  })

  it('listExposures filters by experimentId', () => {
    ab.createExperiment(exp())
    ab.createExperiment(exp({ id: 'exp2', name: 'second' }))
    ab.startExperiment('exp1')
    ab.startExperiment('exp2')
    for (let i = 0; i < 50; i++) {
      ab.assign('u' + i, 'exp1')
      ab.assign('u' + i, 'exp2')
      ab.trackExposure('u' + i, 'exp1', 'click', 1)
      ab.trackExposure('u' + i, 'exp2', 'click', 1)
    }
    expect(ab.listExposures({ experimentId: 'exp1' })).toHaveLength(50)
    expect(ab.listExposures({ experimentId: 'exp2' })).toHaveLength(50)
  })

  it('variantStats computes mean, std, variance', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    for (let i = 0; i < 100; i++) {
      ab.assign('u' + i, 'exp1')
      ab.trackExposure('u' + i, 'exp1', 'click', i % 2)
    }
    const stats = ab.variantStats('exp1', 'control', 'click')
    expect(stats.mean).toBeGreaterThanOrEqual(0)
    expect(stats.std).toBeGreaterThanOrEqual(0)
  })

  it('updateVariants succeeds for draft experiment', () => {
    ab.createExperiment(exp())
    ab.updateVariants('exp1', [{ id: 'a', name: 'A', weight: 1 }])
    expect(ab.getExperiment('exp1')?.variants).toHaveLength(1)
  })

  it('updateVariants throws when running', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    expect(() => ab.updateVariants('exp1', [])).toThrow()
  })

  it('removeExperiment drops it and its assignments', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    ab.assign('u1', 'exp1')
    ab.removeExperiment('exp1')
    expect(ab.getExperiment('exp1')).toBeUndefined()
    expect(ab.listAssignments('exp1')).toHaveLength(0)
  })

  it('listExperiments filters by status and tag', () => {
    ab.createExperiment(exp({ tags: ['homepage'] }))
    ab.createExperiment(exp({ id: 'exp2', name: 'b', tags: ['checkout'] }))
    ab.startExperiment('exp1')
    expect(ab.listExperiments({ status: 'running' })).toHaveLength(1)
    expect(ab.listExperiments({ tag: 'homepage' })).toHaveLength(1)
    expect(ab.listExperiments({ tag: 'checkout' })).toHaveLength(1)
  })

  it('isAssigned returns boolean', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    expect(ab.isAssigned('u1', 'exp1')).toBe(false)
    ab.assign('u1', 'exp1')
    expect(ab.isAssigned('u1', 'exp1')).toBe(true)
  })

  it('getAssignment returns the same assignment', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    ab.assign('u1', 'exp1')
    const a = ab.getAssignment('u1', 'exp1')
    expect(a?.userId).toBe('u1')
  })

  it('bucket value is in [0, 1)', () => {
    ab.createExperiment(exp())
    ab.startExperiment('exp1')
    for (let i = 0; i < 50; i++) {
      const a = ab.assign('u' + i, 'exp1')
      expect(a.bucket).toBeGreaterThanOrEqual(0)
      expect(a.bucket).toBeLessThan(1)
    }
  })

  it('uptime is positive', () => {
    expect(ab.uptimeMs()).toBeGreaterThanOrEqual(0)
  })

  it('getAbFramework returns singleton', async () => {
    const { getAbFramework } = await import('../index')
    const a = getAbFramework()
    const b = getAbFramework()
    expect(a).toBe(b)
  })
})
