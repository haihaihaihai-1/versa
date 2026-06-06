import { describe, it, expect } from 'vitest'
import {
  FlagEngine, evaluateRule, evaluateSegment, getFlagEngine, resetFlagEngine,
} from '../index'

describe('evaluateRule', () => {
  it('eq', () => { expect(evaluateRule({ attribute: 'x', op: 'eq', value: 5 }, { x: 5 })).toBe(true) })
  it('neq', () => { expect(evaluateRule({ attribute: 'x', op: 'neq', value: 5 }, { x: 6 })).toBe(true) })
  it('gt / gte / lt / lte', () => {
    expect(evaluateRule({ attribute: 'x', op: 'gt', value: 5 }, { x: 6 })).toBe(true)
    expect(evaluateRule({ attribute: 'x', op: 'gte', value: 5 }, { x: 5 })).toBe(true)
    expect(evaluateRule({ attribute: 'x', op: 'lt', value: 5 }, { x: 4 })).toBe(true)
    expect(evaluateRule({ attribute: 'x', op: 'lte', value: 5 }, { x: 5 })).toBe(true)
  })
  it('in / nin', () => {
    expect(evaluateRule({ attribute: 'x', op: 'in', values: [1, 2, 3] }, { x: 2 })).toBe(true)
    expect(evaluateRule({ attribute: 'x', op: 'nin', values: [1, 2, 3] }, { x: 4 })).toBe(true)
  })
  it('contains (array)', () => {
    expect(evaluateRule({ attribute: 'tags', op: 'contains', value: 'vip' }, { tags: ['vip', 'beta'] })).toBe(true)
  })
  it('startsWith / endsWith', () => {
    expect(evaluateRule({ attribute: 'name', op: 'startsWith', value: 'A' }, { name: 'Alice' })).toBe(true)
    expect(evaluateRule({ attribute: 'name', op: 'endsWith', value: 'e' }, { name: 'Alice' })).toBe(true)
  })
  it('matches (regex)', () => {
    expect(evaluateRule({ attribute: 'email', op: 'matches', value: '^[a-z]+@' }, { email: 'alice@x.com' })).toBe(true)
  })
  it('exists / notExists', () => {
    expect(evaluateRule({ attribute: 'x', op: 'exists' }, { x: 1 })).toBe(true)
    expect(evaluateRule({ attribute: 'x', op: 'notExists' }, {})).toBe(true)
  })
  it('before / after (string)', () => {
    expect(evaluateRule({ attribute: 'date', op: 'before', value: '2025-01-01' }, { date: '2024-01-01' })).toBe(true)
    expect(evaluateRule({ attribute: 'date', op: 'after', value: '2024-01-01' }, { date: '2025-01-01' })).toBe(true)
  })
  it('between', () => {
    expect(evaluateRule({ attribute: 'age', op: 'between', values: [18, 65] }, { age: 30 })).toBe(true)
    expect(evaluateRule({ attribute: 'age', op: 'between', values: [18, 65] }, { age: 10 })).toBe(false)
  })
  it('semver', () => {
    expect(evaluateRule({ attribute: 'app_version', op: 'semver', value: '2.0.0' }, { app_version: '2.5.0' })).toBe(true)
    expect(evaluateRule({ attribute: 'app_version', op: 'semver', value: '2.0.0' }, { app_version: '1.9.9' })).toBe(false)
  })
  it('dot-path attribute', () => {
    expect(evaluateRule({ attribute: 'user.country', op: 'eq', value: 'CN' }, { user: { country: 'CN' } })).toBe(true)
  })
})

describe('evaluateSegment', () => {
  it('all combinator', () => {
    const s = { id: 's1', name: 'S1', rules: [{ attribute: 'a', op: 'eq', value: 1 }, { attribute: 'b', op: 'eq', value: 2 }], combinator: 'all' as const }
    expect(evaluateSegment(s, { a: 1, b: 2 })).toBe(true)
    expect(evaluateSegment(s, { a: 1, b: 3 })).toBe(false)
  })
  it('any combinator', () => {
    const s = { id: 's1', name: 'S1', rules: [{ attribute: 'a', op: 'eq', value: 1 }, { attribute: 'b', op: 'eq', value: 2 }], combinator: 'any' as const }
    expect(evaluateSegment(s, { a: 1, b: 0 })).toBe(true)
  })
})

describe('FlagEngine — flag CRUD', () => {
  it('createFlag with defaults', () => {
    const e = new FlagEngine()
    const f = e.createFlag({ id: 'f1', name: 'f1', defaultValue: false, state: 'on', rules: [], rolloutPercentage: 100 })
    expect(f.createdAt).toBeGreaterThan(0)
    expect(f.updatedAt).toBeGreaterThan(0)
  })
  it('updateFlag', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'f1', name: 'f1', defaultValue: false, state: 'on', rules: [], rolloutPercentage: 100 })
    const updated = e.updateFlag('f1', { state: 'off' })
    expect(updated?.state).toBe('off')
  })
  it('getFlag / getFlagByName', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'f1', name: 'alpha', defaultValue: false, state: 'on', rules: [], rolloutPercentage: 100 })
    expect(e.getFlag('f1')).toBeDefined()
    expect(e.getFlagByName('alpha')).toBeDefined()
  })
  it('deleteFlag', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'f1', name: 'f1', defaultValue: false, state: 'on', rules: [], rolloutPercentage: 100 })
    expect(e.deleteFlag('f1')).toBe(true)
    expect(e.getFlag('f1')).toBeUndefined()
  })
  it('setState', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'f1', name: 'f1', defaultValue: false, state: 'on', rules: [], rolloutPercentage: 100 })
    expect(e.setState('f1', 'kill-switch')).toBe(true)
    expect(e.getFlag('f1')?.state).toBe('kill-switch')
  })
  it('listFlags', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'a', name: 'a', defaultValue: false, state: 'on', rules: [], rolloutPercentage: 100 })
    e.createFlag({ id: 'b', name: 'b', defaultValue: false, state: 'on', rules: [], rolloutPercentage: 100 })
    expect(e.listFlags()).toHaveLength(2)
  })
})

describe('FlagEngine — segment CRUD', () => {
  it('createSegment / list', () => {
    const e = new FlagEngine()
    e.createSegment({ id: 's1', name: 'S1', rules: [], combinator: 'all' })
    expect(e.listSegments()).toHaveLength(1)
  })
  it('deleteSegment', () => {
    const e = new FlagEngine()
    e.createSegment({ id: 's1', name: 'S1', rules: [], combinator: 'all' })
    expect(e.deleteSegment('s1')).toBe(true)
  })
})

describe('FlagEngine — evaluation', () => {
  it('returns defaultValue when off', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'f1', name: 'f1', defaultValue: 'A', state: 'off', rules: [], rolloutPercentage: 100 })
    const r = e.evaluate('f1', {})
    expect(r.value).toBe('A')
    expect(r.reason).toBe('flag-off')
  })
  it('kill-switch returns false', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'f1', name: 'f1', defaultValue: true, state: 'kill-switch', rules: [], rolloutPercentage: 100 })
    expect(e.evaluate('f1', {}).value).toBe(false)
  })
  it('flag-not-found', () => {
    const e = new FlagEngine()
    expect(e.evaluate('nope', {}).reason).toBe('flag-not-found')
  })
  it('rule match', () => {
    const e = new FlagEngine()
    e.createFlag({
      id: 'f1', name: 'f1', defaultValue: false, state: 'on',
      rules: [{ rules: [{ attribute: 'country', op: 'eq', value: 'CN' }], combinator: 'all', serve: true }],
      rolloutPercentage: 0,
    })
    expect(e.evaluate('f1', { country: 'CN' }).value).toBe(true)
    expect(e.evaluate('f1', { country: 'US' }).value).toBe(false)
  })
  it('rule with variant', () => {
    const e = new FlagEngine()
    e.createFlag({
      id: 'f1', name: 'f1', defaultValue: 'A', state: 'on',
      variants: [{ name: 'A', value: 'A', weight: 50 }, { name: 'B', value: 'B', weight: 50 }],
      rules: [{ rules: [{ attribute: 'vip', op: 'eq', value: true }], combinator: 'all', serve: { variant: 'B' } }],
      rolloutPercentage: 100,
    })
    expect(e.evaluate('f1', { vip: true, userId: 'u1' }).variant).toBe('B')
  })
  it('rollout 0 → default', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'f1', name: 'f1', defaultValue: 'off', state: 'on', rules: [], rolloutPercentage: 0 })
    expect(e.evaluate('f1', { userId: 'u1' }).reason).toBe('rollout=0')
  })
  it('rollout 100 → returns default', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'f1', name: 'f1', defaultValue: 'X', state: 'on', rules: [], rolloutPercentage: 100 })
    expect(e.evaluate('f1', { userId: 'u1' }).value).toBe('X')
  })
  it('rollout 50 deterministic', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'f1', name: 'f1', defaultValue: true, state: 'on', rules: [], rolloutPercentage: 50 })
    const a = e.evaluate('f1', { userId: 'user1' })
    const b = e.evaluate('f1', { userId: 'user1' })
    expect(a.value).toBe(b.value)  // same user always same bucket
  })
  it('dependency fail', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'a', name: 'a', defaultValue: true, state: 'on', rules: [], rolloutPercentage: 100 })
    e.createFlag({ id: 'b', name: 'b', defaultValue: false, state: 'on', rules: [], rolloutPercentage: 100, dependsOn: [{ flag: 'a', expectedValue: false }] })
    const r = e.evaluate('b', {})
    expect(r.value).toBe(false)
    expect(r.reason).toBe('dependency-fail:a')
  })
  it('dependency pass', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'a', name: 'a', defaultValue: true, state: 'on', rules: [], rolloutPercentage: 100 })
    e.createFlag({ id: 'b', name: 'b', defaultValue: 'X', state: 'on', rules: [], rolloutPercentage: 100, dependsOn: [{ flag: 'a', expectedValue: true }] })
    expect(e.evaluate('b', {}).value).toBe('X')
  })
  it('evaluateBulk', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'a', name: 'a', defaultValue: false, state: 'on', rules: [], rolloutPercentage: 100 })
    e.createFlag({ id: 'b', name: 'b', defaultValue: true, state: 'on', rules: [], rolloutPercentage: 100 })
    const r = e.evaluateBulk(['a', 'b'], { userId: 'u1' })
    expect(r.a.value).toBe(false)
    expect(r.b.value).toBe(true)
  })
  it('evaluateAll', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'a', name: 'a', defaultValue: false, state: 'on', rules: [], rolloutPercentage: 100 })
    const r = e.evaluateAll({ userId: 'u1' })
    expect(Object.keys(r)).toContain('a')
  })
  it('override', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'a', name: 'a', defaultValue: false, state: 'on', rules: [], rolloutPercentage: 0 })
    e.override('a', 'u1', true)
    expect(e.getOverride('a', 'u1')?.value).toBe(true)
  })
  it('killAll', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'a', name: 'a', defaultValue: true, state: 'on', rules: [], rolloutPercentage: 100 })
    e.createFlag({ id: 'b', name: 'b', defaultValue: true, state: 'on', rules: [], rolloutPercentage: 100 })
    expect(e.killAll()).toBe(2)
    expect(e.evaluate('a', {}).value).toBe(false)
  })
  it('metrics tracks eval count', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'a', name: 'a', defaultValue: true, state: 'on', rules: [], rolloutPercentage: 100 })
    e.evaluate('a', {})
    e.evaluate('a', {})
    expect(e.metrics().evaluations).toBe(2)
  })
  it('clear resets state', () => {
    const e = new FlagEngine()
    e.createFlag({ id: 'a', name: 'a', defaultValue: true, state: 'on', rules: [], rolloutPercentage: 100 })
    e.clear()
    expect(e.listFlags()).toHaveLength(0)
  })
})

describe('Singleton', () => {
  it('getFlagEngine returns same instance', () => {
    resetFlagEngine()
    const a = getFlagEngine()
    const b = getFlagEngine()
    expect(a).toBe(b)
  })
  it('resetFlagEngine creates new', () => {
    const a = getFlagEngine()
    resetFlagEngine()
    const b = getFlagEngine()
    expect(a).not.toBe(b)
  })
})
