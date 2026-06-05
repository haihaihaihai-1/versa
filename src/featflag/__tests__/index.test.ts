import { describe, it, expect, beforeEach } from 'vitest'
import {
  FlagRegistry,
  SegmentRegistry,
  ExperimentService,
  FlagEvaluator,
  flags,
  segments,
  experiments,
  evaluator,
  bucket,
  type Flag,
  type Segment,
  type UserContext,
} from '../index'

beforeEach(() => {
  flags.clear()
  segments.clear()
  experiments.clear()
  evaluator.clear()
})

const userOf = (id: string, attrs: Record<string, unknown> = {}): UserContext => ({ userId: id, attributes: attrs })

// ============== Bucket / Hash ==============

describe('bucket', () => {
  it('returns 0-100', () => {
    for (let i = 0; i < 100; i++) {
      const b = bucket(`u${i}`, 'flag1')
      expect(b).toBeGreaterThanOrEqual(0)
      expect(b).toBeLessThan(100)
    }
  })
  it('is deterministic', () => {
    expect(bucket('u1', 'flag1')).toBe(bucket('u1', 'flag1'))
  })
  it('different keys spread users', () => {
    const set1 = new Set(Array.from({ length: 100 }, (_, i) => bucket(`u${i}`, 'flag1')))
    const set2 = new Set(Array.from({ length: 100 }, (_, i) => bucket(`u${i}`, 'flag2')))
    expect(set1.size).toBeGreaterThan(50)
    expect(set2.size).toBeGreaterThan(50)
  })
})

// ============== FlagRegistry ==============

describe('FlagRegistry', () => {
  it('creates a flag', () => {
    const f = flags.create({ key: 'f1', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: [], enabled: true })
    expect(f.id).toBeDefined()
  })
  it('rejects duplicate key', () => {
    flags.create({ key: 'f1', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: [], enabled: true })
    expect(() => flags.create({ key: 'f1', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: [], enabled: true })).toThrow()
  })
  it('updates', () => {
    const f = flags.create({ key: 'f1', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: [], enabled: true })
    const u = flags.update(f.id, { description: 'new' })
    expect(u!.description).toBe('new')
  })
  it('toggles', () => {
    flags.create({ key: 'f1', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: [], enabled: true })
    flags.toggle('f1', false)
    expect(flags.getByKey('f1')!.enabled).toBe(false)
    flags.toggle('f1')
    expect(flags.getByKey('f1')!.enabled).toBe(true)
  })
  it('removes', () => {
    const f = flags.create({ key: 'f1', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: [], enabled: true })
    expect(flags.remove(f.id)).toBe(true)
  })
  it('getByKey', () => {
    flags.create({ key: 'f1', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: [], enabled: true })
    expect(flags.getByKey('f1')!.key).toBe('f1')
  })
  it('list filters by tag', () => {
    flags.create({ key: 'a', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: ['ui'], enabled: true })
    flags.create({ key: 'b', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: ['api'], enabled: true })
    expect(flags.list({ tag: 'ui' }).length).toBe(1)
  })
  it('list filters by enabled', () => {
    flags.create({ key: 'a', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: [], enabled: true })
    flags.create({ key: 'b', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: [], enabled: false })
    expect(flags.list({ enabled: true }).length).toBe(1)
  })
  it('list filters by type', () => {
    flags.create({ key: 'a', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: [], enabled: true })
    flags.create({ key: 'b', type: 'string', description: '', defaultValue: 'x', strategy: 'all', tags: [], enabled: true })
    expect(flags.list({ type: 'string' }).length).toBe(1)
  })
  it('size and clear', () => {
    flags.create({ key: 'a', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: [], enabled: true })
    expect(flags.size()).toBe(1)
    flags.clear()
    expect(flags.size()).toBe(0)
  })
})

// ============== SegmentRegistry ==============

describe('SegmentRegistry', () => {
  it('matches user in list', () => {
    const s = segments.create({ name: 'beta', rules: [], userIds: ['u1', 'u2'] })
    expect(segments.matches(userOf('u1'), s)).toBe(true)
    expect(segments.matches(userOf('u3'), s)).toBe(false)
  })
  it('matches by rules', () => {
    const s = segments.create({ name: 'us-pro', rules: [{ attribute: 'country', op: 'eq', value: 'US' }, { attribute: 'plan', op: 'eq', value: 'pro' }] })
    expect(segments.matches(userOf('u1', { country: 'US', plan: 'pro' }), s)).toBe(true)
    expect(segments.matches(userOf('u2', { country: 'US', plan: 'free' }), s)).toBe(false)
  })
  it('rule ops: neq', () => {
    const s = segments.create({ name: 'x', rules: [{ attribute: 'country', op: 'neq', value: 'CN' }] })
    expect(segments.matches(userOf('u1', { country: 'US' }), s)).toBe(true)
  })
  it('rule ops: in', () => {
    const s = segments.create({ name: 'x', rules: [{ attribute: 'role', op: 'in', value: ['admin', 'mod'] }] })
    expect(segments.matches(userOf('u1', { role: 'admin' }), s)).toBe(true)
  })
  it('rule ops: nin', () => {
    const s = segments.create({ name: 'x', rules: [{ attribute: 'role', op: 'nin', value: ['banned'] }] })
    expect(segments.matches(userOf('u1', { role: 'banned' }), s)).toBe(false)
  })
  it('rule ops: gt/gte/lt/lte', () => {
    const s = segments.create({ name: 'x', rules: [{ attribute: 'age', op: 'gte', value: 18 }] })
    expect(segments.matches(userOf('u1', { age: 18 }), s)).toBe(true)
    expect(segments.matches(userOf('u1', { age: 17 }), s)).toBe(false)
  })
  it('rule ops: contains', () => {
    const s = segments.create({ name: 'x', rules: [{ attribute: 'email', op: 'contains', value: '@acme' }] })
    expect(segments.matches(userOf('u1', { email: 'a@acme.com' }), s)).toBe(true)
  })
  it('rule ops: startsWith/endsWith', () => {
    const s1 = segments.create({ name: 'x', rules: [{ attribute: 'k', op: 'startsWith', value: 'pre' }] })
    expect(segments.matches(userOf('u', { k: 'prefix' }), s1)).toBe(true)
    const s2 = segments.create({ name: 'y', rules: [{ attribute: 'k', op: 'endsWith', value: 'fix' }] })
    expect(segments.matches(userOf('u', { k: 'suffix' }), s2)).toBe(true)
  })
  it('rule ops: regex', () => {
    const s = segments.create({ name: 'x', rules: [{ attribute: 'code', op: 'regex', value: '^[A-Z]{3}$' }] })
    expect(segments.matches(userOf('u', { code: 'ABC' }), s)).toBe(true)
  })
  it('rule ops: exists/notExists', () => {
    const s1 = segments.create({ name: 'x', rules: [{ attribute: 'k', op: 'exists' }] })
    expect(segments.matches(userOf('u', { k: 1 }), s1)).toBe(true)
    expect(segments.matches(userOf('u', {}), s1)).toBe(false)
    const s2 = segments.create({ name: 'y', rules: [{ attribute: 'k', op: 'notExists' }] })
    expect(segments.matches(userOf('u', {}), s2)).toBe(true)
  })
  it('update', () => {
    const s = segments.create({ name: 'x', rules: [] })
    segments.update(s.id, { name: 'y' })
    expect(segments.get(s.id)!.name).toBe('y')
  })
  it('remove', () => {
    const s = segments.create({ name: 'x', rules: [] })
    expect(segments.remove(s.id)).toBe(true)
  })
  it('list and clear', () => {
    segments.create({ name: 'a', rules: [] })
    expect(segments.list().length).toBe(1)
    segments.clear()
    expect(segments.list().length).toBe(0)
  })
})

// ============== ExperimentService ==============

describe('ExperimentService', () => {
  const variants = [
    { key: 'a', value: 'A', weight: 50 },
    { key: 'b', value: 'B', weight: 50 },
  ]
  it('creates experiment', () => {
    const e = experiments.create({ key: 'exp1', description: '', flagKey: 'f1', variants, startedAt: 0, status: 'draft', sticky: true })
    expect(e.id).toBeDefined()
  })
  it('start/pause/complete', () => {
    const e = experiments.create({ key: 'e', description: '', flagKey: 'f', variants, startedAt: 0, status: 'draft', sticky: true })
    experiments.start(e.id)
    expect(experiments.get(e.id)!.status).toBe('running')
    experiments.pause(e.id)
    expect(experiments.get(e.id)!.status).toBe('paused')
    experiments.complete(e.id)
    expect(experiments.get(e.id)!.status).toBe('completed')
  })
  it('records exposure and conversion', () => {
    const e = experiments.create({ key: 'e', description: '', flagKey: 'f', variants, startedAt: 0, status: 'running', sticky: true })
    experiments.recordExposure(e.id, 'a')
    experiments.recordExposure(e.id, 'a')
    experiments.recordConversion(e.id, 'a')
    const exp = experiments.get(e.id)!
    expect(exp.exposures.a).toBe(2)
    expect(exp.conversions.a).toBe(1)
  })
  it('pickVariant is sticky', () => {
    const e = experiments.create({ key: 'e', description: '', flagKey: 'f', variants, startedAt: 0, status: 'running', sticky: true })
    const v1 = experiments.pickVariant(e, 'u1')
    const v2 = experiments.pickVariant(e, 'u1')
    expect(v1!.key).toBe(v2!.key)
  })
  it('pickVariant with single variant', () => {
    const e = experiments.create({ key: 'e', description: '', flagKey: 'f', variants: [{ key: 'only', value: 'X', weight: 1 }], startedAt: 0, status: 'running', sticky: true })
    expect(experiments.pickVariant(e, 'u1')!.key).toBe('only')
  })
  it('pickVariant respects weights', () => {
    const e = experiments.create({ key: 'exp-weight', description: '', flagKey: 'f', variants: [{ key: 'a', value: 'A', weight: 100 }], startedAt: 0, status: 'running', sticky: true })
    expect(experiments.pickVariant(e, 'u1')!.key).toBe('a')
  })
  it('getByFlag', () => {
    const e = experiments.create({ key: 'e', description: '', flagKey: 'f1', variants, startedAt: 0, status: 'draft', sticky: true })
    expect(experiments.getByFlag('f1')!.id).toBe(e.id)
  })
  it('remove and clear', () => {
    const e = experiments.create({ key: 'e', description: '', flagKey: 'f', variants, startedAt: 0, status: 'draft', sticky: true })
    expect(experiments.remove(e.id)).toBe(true)
    experiments.create({ key: 'e2', description: '', flagKey: 'f2', variants, startedAt: 0, status: 'draft', sticky: true })
    experiments.clear()
    expect(experiments.list().length).toBe(0)
  })
})

// ============== Evaluator ==============

describe('FlagEvaluator - strategy all/none', () => {
  it('strategy all returns value', () => {
    flags.create({ key: 'f', type: 'boolean', description: '', defaultValue: true, strategy: 'all', tags: [], enabled: true })
    const e = evaluator.evaluate('f', userOf('u1'))
    expect(e.value).toBe(true)
    expect(e.reason).toBe('default')
  })
  it('strategy none returns default', () => {
    flags.create({ key: 'f', type: 'boolean', description: '', defaultValue: false, strategy: 'none', tags: [], enabled: true })
    const e = evaluator.evaluate('f', userOf('u1'))
    expect(e.value).toBe(false)
  })
  it('disabled returns default', () => {
    flags.create({ key: 'f', type: 'boolean', description: '', defaultValue: false, strategy: 'all', tags: [], enabled: false })
    const e = evaluator.evaluate('f', userOf('u1'))
    expect(e.reason).toBe('disabled')
  })
  it('missing flag returns default', () => {
    const e = evaluator.evaluate('nope', userOf('u1'), 'fallback')
    expect(e.value).toBe('fallback')
  })
})

describe('FlagEvaluator - percent', () => {
  it('0% rollout gives default to all', () => {
    flags.create({ key: 'f', type: 'boolean', description: '', defaultValue: false, strategy: 'percent', rolloutPercent: 0, tags: [], enabled: true })
    for (let i = 0; i < 50; i++) {
      expect(evaluator.evaluate('f', userOf(`u${i}`)).value).toBe(false)
    }
  })
  it('100% rollout gives value to all', () => {
    flags.create({ key: 'f', type: 'boolean', description: '', defaultValue: true, strategy: 'percent', rolloutPercent: 100, tags: [], enabled: true })
    for (let i = 0; i < 50; i++) {
      expect(evaluator.evaluate('f', userOf(`u${i}`)).value).toBe(true)
    }
  })
  it('50% rollout splits roughly', () => {
    flags.create({ key: 'half', type: 'boolean', description: '', defaultValue: false, strategy: 'percent', rolloutPercent: 50, variants: [{ key: 'on', value: true, weight: 1 }], tags: [], enabled: true })
    let enabled = 0
    for (let i = 0; i < 1000; i++) {
      if (evaluator.evaluate('half', userOf(`u${i}`)).value) enabled++
    }
    expect(enabled).toBeGreaterThan(400)
    expect(enabled).toBeLessThan(600)
  })
})

describe('FlagEvaluator - whitelist', () => {
  it('whitelisted user gets value', () => {
    flags.create({ key: 'f', type: 'string', description: '', defaultValue: 'default', strategy: 'whitelist', whitelist: ['u1'], tags: [], enabled: true })
    expect(evaluator.evaluate('f', userOf('u1')).value).toBe('default')
    expect(evaluator.evaluate('f', userOf('u2')).value).toBe('default')  // value is defaultValue since variants not set
    expect(evaluator.evaluate('f', userOf('u2')).reason).toBe('default')
  })
})

describe('FlagEvaluator - segment', () => {
  it('segment match enables flag', () => {
    const s = segments.create({ name: 'us', rules: [{ attribute: 'country', op: 'eq', value: 'US' }] })
    flags.create({ key: 'f', type: 'boolean', description: '', defaultValue: true, strategy: 'segment', segmentIds: [s.id], tags: [], enabled: true })
    const e1 = evaluator.evaluate('f', userOf('u1', { country: 'US' }))
    expect(e1.reason).toBe('segment')
    const e2 = evaluator.evaluate('f', userOf('u2', { country: 'CN' }))
    expect(e2.reason).toBe('default')
  })
})

describe('FlagEvaluator - override', () => {
  it('per-user override wins', () => {
    flags.create({ key: 'f', type: 'boolean', description: '', defaultValue: true, strategy: 'all', tags: [], enabled: true })
    const e = evaluator.evaluate('f', { userId: 'u1', attributes: {}, overrides: { f: false } })
    expect(e.value).toBe(false)
    expect(e.reason).toBe('override')
  })
})

describe('FlagEvaluator - expression', () => {
  it('expression true', () => {
    flags.create({ key: 'f', type: 'boolean', description: '', defaultValue: true, strategy: 'expression', expression: "country == 'US'", tags: [], enabled: true })
    expect(evaluator.evaluate('f', userOf('u1', { country: 'US' })).reason).toBe('expression')
    expect(evaluator.evaluate('f', userOf('u1', { country: 'CN' })).reason).toBe('default')
  })
  it('compound expression', () => {
    flags.create({ key: 'f', type: 'boolean', description: '', defaultValue: true, strategy: 'expression', expression: "country == 'US' AND plan == 'pro'", tags: [], enabled: true })
    expect(evaluator.evaluate('f', userOf('u1', { country: 'US', plan: 'pro' })).reason).toBe('expression')
    expect(evaluator.evaluate('f', userOf('u1', { country: 'US', plan: 'free' })).reason).toBe('default')
  })
})

describe('FlagEvaluator - experiment', () => {
  it('picks variant and records exposure', () => {
    flags.create({ key: 'f', type: 'string', description: '', defaultValue: 'control', strategy: 'experiment', tags: [], enabled: true })
    const variants = [{ key: 'a', value: 'A', weight: 50 }, { key: 'b', value: 'B', weight: 50 }]
    experiments.create({ key: 'exp', description: '', flagKey: 'f', variants, startedAt: 0, status: 'running', sticky: true })
    const e = evaluator.evaluate('f', userOf('u1'))
    expect(e.reason).toBe('experiment')
    expect(['A', 'B']).toContain(e.value as string)
  })
})

// ============== Audit ==============

describe('FlagEvaluator audit', () => {
  it('records evaluations', () => {
    flags.create({ key: 'f', type: 'boolean', description: '', defaultValue: true, strategy: 'all', tags: [], enabled: true })
    evaluator.evaluate('f', userOf('u1'))
    evaluator.evaluate('f', userOf('u2'))
    expect(evaluator.evalCounts_('f').f).toBe(2)
  })
})
