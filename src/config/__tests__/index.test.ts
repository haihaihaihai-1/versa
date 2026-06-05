import { describe, it, expect, beforeEach } from 'vitest'
import { ConfigService } from '../index'

describe('ConfigService - basic CRUD', () => {
  let s: ConfigService
  beforeEach(() => { s = new ConfigService() })

  it('set and get', () => {
    s.set('a.b', 42, 'alice')
    expect(s.get('a.b')).toBe(42)
  })

  it('get missing throws without default', () => {
    expect(() => s.get('missing')).toThrow(/not found/)
  })

  it('get with default', () => {
    expect(s.get('missing', 'fallback')).toBe('fallback')
  })

  it('has', () => {
    expect(s.has('k')).toBe(false)
    s.set('k', 1, 'x')
    expect(s.has('k')).toBe(true)
  })

  it('inferred types', () => {
    s.set('s', 'hello', 'x')
    s.set('n', 42, 'x')
    s.set('b', true, 'x')
    s.set('a', [1, 2], 'x')
    s.set('o', { k: 1 }, 'x')
    expect(s.getEntry('s')!.type).toBe('string')
    expect(s.getEntry('n')!.type).toBe('number')
    expect(s.getEntry('b')!.type).toBe('boolean')
    expect(s.getEntry('a')!.type).toBe('array')
    expect(s.getEntry('o')!.type).toBe('object')
  })

  it('version increments on update', () => {
    s.set('k', 1, 'x')
    s.set('k', 2, 'x')
    s.set('k', 3, 'x')
    expect(s.getEntry('k')!.version).toBe(3)
  })

  it('getEntry returns deep copy', () => {
    s.set('k', { a: 1 }, 'x')
    const e1 = s.getEntry('k')!
    ;(e1.value as any).a = 99
    expect((s.get('k') as any).a).toBe(1)
  })

  it('delete removes key', () => {
    s.set('k', 1, 'x')
    expect(s.delete('k')).toBe(true)
    expect(s.has('k')).toBe(false)
  })

  it('delete non-existent returns false', () => {
    expect(s.delete('nope')).toBe(false)
  })

  it('listKeys and listEntries', () => {
    s.set('a', 1, 'x', { tags: ['api'] })
    s.set('b', 2, 'x', { tags: ['ui'] })
    s.set('c', 3, 'x', { tags: ['api'] })
    expect(s.listKeys().sort()).toEqual(['a', 'b', 'c'])
    expect(s.listEntries('api')).toHaveLength(2)
  })
})

describe('ConfigService - history & rollback', () => {
  let s: ConfigService
  beforeEach(() => { s = new ConfigService() })

  it('records history on each set', () => {
    s.set('k', 'v1', 'alice')
    s.set('k', 'v2', 'alice')
    s.set('k', 'v3', 'alice')
    const h = s.history_('k')
    expect(h).toHaveLength(3)
    expect(h.map(v => v.value)).toEqual(['v1', 'v2', 'v3'])
  })

  it('getVersion returns specific version', () => {
    s.set('k', 'v1', 'x')
    s.set('k', 'v2', 'x')
    expect(s.getVersion('k', 1)?.value).toBe('v1')
    expect(s.getVersion('k', 2)?.value).toBe('v2')
  })

  it('getVersion missing returns null', () => {
    expect(s.getVersion('k', 99)).toBeNull()
  })

  it('rollback restores previous value', () => {
    s.set('k', 'v1', 'x', { message: 'initial' })
    s.set('k', 'v2', 'x', { message: 'change' })
    s.set('k', 'v3', 'x', { message: 'change' })
    s.rollback('k', 1, 'x', 'reverting')
    expect(s.get('k')).toBe('v1')
    expect(s.getEntry('k')!.version).toBe(4)
  })

  it('rollback to missing version throws', () => {
    s.set('k', 'v1', 'x')
    expect(() => s.rollback('k', 99, 'x')).toThrow(/not found/)
  })

  it('history_ returns empty for unknown key', () => {
    expect(s.history_('nope')).toEqual([])
  })

  it('rollback records message', () => {
    s.set('k', 'v1', 'x')
    s.set('k', 'v2', 'x')
    s.rollback('k', 1, 'x', 'oops')
    const h = s.history_('k')
    expect(h[h.length - 1].message).toBe('oops')
    expect(h[h.length - 1].isRollback).toBe(true)
  })
})

describe('ConfigService - watchers', () => {
  let s: ConfigService
  beforeEach(() => { s = new ConfigService() })

  it('fires on exact match', () => {
    s.set('k', 1, 'x')
    const seen: any[] = []
    s.watch('k', (key, nv, ov, v) => seen.push({ key, nv, ov, v }))
    s.set('k', 2, 'x')
    expect(seen).toHaveLength(1)
    expect(seen[0].nv).toBe(2)
    expect(seen[0].ov).toBe(1)
  })

  it('fires on prefix match', () => {
    s.set('feature.flag.a', true, 'x')
    s.set('feature.flag.b', false, 'x')
    const seen: any[] = []
    s.watch('feature.flag.', () => undefined, 'prefix')
    s.watch('feature.flag.', (_k, nv, ov) => seen.push({ nv, ov }), 'prefix')
    s.set('feature.flag.a', false, 'x')
    expect(seen).toHaveLength(1)
  })

  it('fires on regex match', () => {
    s.set('db.host', 'localhost', 'x')
    s.set('db.port', 5432, 'x')
    const seen: any[] = []
    s.watch('db\\..*', (_k, nv) => seen.push(nv), 'regex')
    s.set('db.host', 'prod-host', 'x')
    expect(seen).toContain('prod-host')
  })

  it('unwatch stops notifications', () => {
    s.set('k', 1, 'x')
    let count = 0
    const id = s.watch('k', () => count++)
    s.set('k', 2, 'x')
    expect(count).toBe(1)
    s.unwatch(id)
    s.set('k', 3, 'x')
    expect(count).toBe(1)
  })

  it('unwatch unknown returns false', () => {
    expect(s.unwatch('missing')).toBe(false)
  })
})

describe('ConfigService - gray rollout', () => {
  let s: ConfigService
  beforeEach(() => { s = new ConfigService(); s.set('flag', 'A', 'x') })

  it('setGray creates rule', () => {
    const id = s.setGray('flag', { key: 'flag', percentage: 50, bucket: 'user-id', enabled: true })
    expect(id).toMatch(/^g-/)
    expect(s.listGrays('flag')).toHaveLength(1)
  })

  it('removeGray', () => {
    const id = s.setGray('flag', { key: 'flag', percentage: 50, bucket: 'user-id', enabled: true })
    expect(s.removeGray('flag', id)).toBe(true)
    expect(s.listGrays('flag')).toHaveLength(0)
  })

  it('removeGray missing', () => {
    expect(s.removeGray('flag', 'nope')).toBe(false)
  })

  it('disabled rule does not apply', () => {
    s.setGray('flag', { key: 'flag', percentage: 100, bucket: 'user-id', enabled: false })
    const r = s.getForUser('flag', 'u1')
    expect(r.rule).toBeNull()
  })

  it('100% rollout applies to all', () => {
    s.setGray('flag', { key: 'flag', percentage: 100, bucket: 'user-id', enabled: true })
    for (let i = 0; i < 50; i++) {
      const r = s.getForUser('flag', `u${i}`)
      expect(r.rule).not.toBeNull()
    }
  })

  it('0% rollout applies to none', () => {
    s.setGray('flag', { key: 'flag', percentage: 0, bucket: 'user-id', enabled: true })
    let applied = 0
    for (let i = 0; i < 50; i++) {
      const r = s.getForUser('flag', `u${i}`)
      if (r.rule) applied++
    }
    expect(applied).toBe(0)
  })

  it('50% rollout splits roughly', () => {
    s.setGray('flag', { key: 'flag', percentage: 50, bucket: 'user-id', enabled: true })
    let applied = 0
    for (let i = 0; i < 1000; i++) {
      const r = s.getForUser('flag', `u${i}`)
      if (r.rule) applied++
    }
    expect(applied).toBeGreaterThan(400)
    expect(applied).toBeLessThan(600)
  })

  it('attribute filter excludes non-matching', () => {
    s.setGray('flag', {
      key: 'flag', percentage: 100, bucket: 'user-id', enabled: true,
      attributes: { country: 'US' },
    })
    const us = s.getForUser('flag', 'u1', { country: 'US' })
    const cn = s.getForUser('flag', 'u1', { country: 'CN' })
    expect(us.rule).not.toBeNull()
    expect(cn.rule).toBeNull()
  })

  it('getForUser throws on missing key', () => {
    expect(() => s.getForUser('missing', 'u1')).toThrow(/not found/)
  })
})

describe('ConfigService - validation', () => {
  let s: ConfigService
  beforeEach(() => { s = new ConfigService() })

  it('rejects out-of-range', () => {
    expect(() => s.set('p', 200, 'x', { schema: { min: 0, max: 100 } })).toThrow()
  })

  it('accepts in-range', () => {
    expect(() => s.set('p', 50, 'x', { schema: { min: 0, max: 100 } })).not.toThrow()
  })

  it('enforces enum', () => {
    expect(() => s.set('env', 'dev', 'x', { schema: { enum: ['dev', 'staging', 'prod'] } })).not.toThrow()
    expect(() => s.set('env', 'oops', 'x', { schema: { enum: ['dev', 'staging', 'prod'] } })).toThrow()
  })

  it('enforces pattern', () => {
    expect(() => s.set('email', 'a@b.com', 'x', { schema: { pattern: '^.+@.+$' } })).not.toThrow()
    expect(() => s.set('email', 'invalid', 'x', { schema: { pattern: '^.+@.+$' } })).toThrow()
  })

  it('custom validator', () => {
    expect(() => s.set('n', 4, 'x', { schema: { validator: v => (v as number) % 2 === 0 || 'must be even' } })).not.toThrow()
    expect(() => s.set('n', 5, 'x', { schema: { validator: v => (v as number) % 2 === 0 || 'must be even' } })).toThrow()
  })
})

describe('ConfigService - bulk & export', () => {
  it('setMany', () => {
    const s = new ConfigService()
    s.setMany([
      { key: 'a', value: 1, updatedBy: 'x' },
      { key: 'b', value: 2, updatedBy: 'x' },
    ], 'x')
    expect(s.size()).toBe(2)
  })

  it('export', () => {
    const s = new ConfigService()
    s.set('a', 1, 'x')
    s.set('b', { x: true }, 'x')
    expect(s.export()).toEqual({ a: 1, b: { x: true } })
  })

  it('setOverride and clearOverride', () => {
    const s = new ConfigService()
    s.set('k', 'real', 'x')
    s.setOverride('k', 'override')
    expect(s.get('k')).toBe('override')
    s.clearOverride('k')
    expect(s.get('k')).toBe('real')
  })

  it('setOverride takes precedence in getForUser', () => {
    const s = new ConfigService()
    s.set('k', 'real', 'x')
    s.setOverride('k', 'override')
    expect(s.getForUser('k', 'u1').value).toBe('override')
  })
})

describe('ConfigService - metrics', () => {
  it('tracks reads/writes/rollbacks', () => {
    const s = new ConfigService()
    s.set('k', 1, 'x')
    s.set('k', 2, 'x')
    s.get('k')
    s.get('k')
    s.get('k')
    s.rollback('k', 1, 'x')
    const m = s.getMetrics()
    expect(m.writes).toBe(3)
    expect(m.reads).toBe(3)
    expect(m.rollbacks).toBe(0)
    expect(m.watchHits).toBeGreaterThanOrEqual(0)
  })
})
