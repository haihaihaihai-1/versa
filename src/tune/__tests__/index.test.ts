import { describe, it, expect } from 'vitest'
import { Tuner, sampleValue, gridSamples } from '../index'

const space = {
  lr: { type: 'float', min: 0.0001, max: 0.1 } as const,
  batch: { type: 'int', min: 8, max: 64, step: 8 } as const,
  opt: { type: 'categorical', values: ['sgd', 'adam', 'rmsprop'] } as const,
}

describe('sampleValue', () => {
  it('samples int within range', () => {
    const v = sampleValue({ type: 'int', min: 1, max: 5 }, () => 0.5)
    expect(v).toBe(3)
  })
  it('samples int with step', () => {
    const v = sampleValue({ type: 'int', min: 0, max: 100, step: 10 }, () => 0.5)
    expect(v).toBe(50)
  })
  it('samples float in range', () => {
    const v = sampleValue({ type: 'float', min: 0, max: 1 }, () => 0.25)
    expect(v).toBe(0.25)
  })
  it('samples float in log space', () => {
    const v = sampleValue({ type: 'float', min: 0.001, max: 1, log: true }, () => 0)
    expect(v).toBeCloseTo(0.001, 5)
  })
  it('samples categorical', () => {
    const v = sampleValue({ type: 'categorical', values: ['a', 'b', 'c'] }, () => 0.99)
    expect(v).toBe('c')
  })
})

describe('gridSamples', () => {
  it('returns single empty for empty space', () => {
    expect(gridSamples({})).toEqual([{}])
  })
  it('enumerates all combinations', () => {
    const g = gridSamples({ x: { type: 'int', min: 1, max: 2 }, y: { type: 'categorical', values: ['a', 'b'] } })
    expect(g).toHaveLength(4)
  })
  it('includes float grid points', () => {
    const g = gridSamples({ f: { type: 'float', min: 0, max: 1 } })
    expect(g.length).toBe(6)
  })
})

describe('Tuner', () => {
  it('runs random search and finds best', async () => {
    const t = new Tuner(space, { sampler: 'random', maxTrials: 30, seed: 7 })
    const r = await t.tune(async p => {
      const lr = Number(p.lr)
      const target = 0.1
      return -Math.abs(lr - target) + (p.opt === 'adam' ? 0.01 : 0)
    })
    expect(r.best).not.toBeNull()
    expect(r.trials.length).toBe(30)
  })

  it('runs grid search exhaustively', async () => {
    const t = new Tuner({ x: { type: 'int', min: 1, max: 3 } }, { sampler: 'grid' })
    const r = await t.tune(p => Number(p.x))
    expect(r.trials.every(x => x.status === 'completed')).toBe(true)
  })

  it('runs bayesian sampler', async () => {
    const t = new Tuner(space, { sampler: 'bayesian', maxTrials: 15, seed: 11 })
    const r = await t.tune(p => Number(p.lr))
    expect(r.trials.length).toBe(15)
  })

  it('respects maximize direction', async () => {
    const t = new Tuner({ x: { type: 'int', min: 1, max: 10 } }, { sampler: 'grid', direction: 'maximize' })
    const r = await t.tune(p => Number(p.x))
    expect(r.best!.score).toBe(10)
  })

  it('respects minimize direction', async () => {
    const t = new Tuner({ x: { type: 'int', min: 1, max: 10 } }, { sampler: 'grid', direction: 'minimize' })
    const r = await t.tune(p => Number(p.x))
    expect(r.best!.score).toBe(1)
  })

  it('handles objective that throws', async () => {
    const t = new Tuner({ x: { type: 'int', min: 1, max: 3 } }, { sampler: 'grid' })
    const r = await t.tune(p => { if (Number(p.x) === 2) throw new Error('boom'); return Number(p.x) })
    expect(r.trials.find(t => t.status === 'failed')).toBeDefined()
  })

  it('early stopping prunes remaining trials', async () => {
    const t = new Tuner(space, { sampler: 'random', maxTrials: 50, seed: 1, earlyStoppingRounds: 3 })
    const r = await t.tune(async () => 0.5)
    const pruned = r.trials.filter(t => t.status === 'pruned')
    expect(pruned.length).toBeGreaterThan(0)
  })

  it('trial durationMs is non-negative', async () => {
    const t = new Tuner(space, { sampler: 'grid', maxTrials: 3 })
    const r = await t.tune(async () => 0)
    for (const trial of r.trials) expect(trial.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('best returns highest score trial', async () => {
    const t = new Tuner({ x: { type: 'int', min: 1, max: 5 } }, { sampler: 'grid' })
    const r = await t.tune(p => Number(p.x))
    expect(r.best!.params.x).toBe(5)
  })

  it('trialsCompleted filters', async () => {
    const t = new Tuner(space, { sampler: 'random', maxTrials: 5, seed: 1 })
    await t.tune(async () => 1)
    expect(t.trialsCompleted().length).toBeGreaterThan(0)
  })

  it('best returns null when no trials', () => {
    const t = new Tuner(space)
    expect(t.best()).toBeNull()
  })

  it('objective is sync or async', async () => {
    const t = new Tuner({ x: { type: 'int', min: 1, max: 3 } }, { sampler: 'grid' })
    const r1 = await t.tune(p => Number(p.x) * 2)
    const r2 = await t.tune(async p => Number(p.x) * 3)
    expect(r1.best!.score).toBe(6)
    expect(r2.best!.score).toBe(9)
  })

  it('getTuner singleton requires space on first call', async () => {
    const { getTuner } = await import('../index')
    expect(() => getTuner()).toThrow()
  })

  it('seed produces deterministic random samples', () => {
    const s1 = new Tuner(space, { sampler: 'random', maxTrials: 5, seed: 42 })
    const s2 = new Tuner(space, { sampler: 'random', maxTrials: 5, seed: 42 })
    const p1 = s1['suggestRandom']()
    const p2 = s2['suggestRandom']()
    expect(p1).toEqual(p2)
  })
})
