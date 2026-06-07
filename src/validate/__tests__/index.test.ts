import { describe, it, expect, beforeEach } from 'vitest'
import { Validator, resetValidator } from '../index'

let v: Validator

beforeEach(() => {
  resetValidator()
  v = new Validator()
})

describe('Validator', () => {
  it('validates string type', () => {
    const r = v.validate({ name: { type: 'string', required: true } }, { name: 'alice' })
    expect(r.ok).toBe(true)
  })

  it('rejects wrong type', () => {
    const r = v.validate({ age: { type: 'integer' } }, { age: 'abc' })
    expect(r.ok).toBe(false)
    expect(r.errors[0]!.rule).toBe('type')
  })

  it('rejects missing required', () => {
    const r = v.validate({ name: { type: 'string', required: true } }, {})
    expect(r.ok).toBe(false)
    expect(r.errors[0]!.rule).toBe('required')
  })

  it('uses default for missing', () => {
    const r = v.validate({ name: { type: 'string', default: 'unknown' } }, {})
    expect(r.cleaned.name).toBe('unknown')
  })

  it('coerces number from string', () => {
    const r = v.validate({ x: { type: 'number' } }, { x: '42' })
    expect(r.cleaned.x).toBe(42)
  })

  it('coerces integer from float string', () => {
    const r = v.validate({ x: { type: 'integer' } }, { x: '3.7' })
    expect(r.cleaned.x).toBe(3)
  })

  it('coerces boolean', () => {
    const r = v.validate({ b: { type: 'boolean' } }, { b: 'true' })
    expect(r.cleaned.b).toBe(true)
  })

  it('coerces boolean from 0', () => {
    const r = v.validate({ b: { type: 'boolean' } }, { b: 0 })
    expect(r.cleaned.b).toBe(false)
  })

  it('validates email format', () => {
    const r1 = v.validate({ e: { type: 'email' } }, { e: 'a@b.com' })
    expect(r1.ok).toBe(true)
    const r2 = v.validate({ e: { type: 'email' } }, { e: 'not-an-email' })
    expect(r2.ok).toBe(false)
  })

  it('validates url format', () => {
    expect(v.validate({ u: { type: 'url' } }, { u: 'https://x.com' }).ok).toBe(true)
    expect(v.validate({ u: { type: 'url' } }, { u: 'ftp://x' }).ok).toBe(false)
  })

  it('validates date format', () => {
    expect(v.validate({ d: { type: 'date' } }, { d: '2025-01-15' }).ok).toBe(true)
    expect(v.validate({ d: { type: 'date' } }, { d: '01/15/2025' }).ok).toBe(false)
  })

  it('validates number range', () => {
    expect(v.validate({ x: { type: 'number', min: 0, max: 10 } }, { x: 5 }).ok).toBe(true)
    expect(v.validate({ x: { type: 'number', min: 0, max: 10 } }, { x: -1 }).ok).toBe(false)
    expect(v.validate({ x: { type: 'number', min: 0, max: 10 } }, { x: 11 }).ok).toBe(false)
  })

  it('validates string length', () => {
    const r = v.validate({ s: { type: 'string', min: 3, max: 5 } }, { s: 'ab' })
    expect(r.errors[0]!.rule).toBe('minLength')
  })

  it('validates string max length', () => {
    const r = v.validate({ s: { type: 'string', max: 3 } }, { s: 'abcd' })
    expect(r.errors[0]!.rule).toBe('maxLength')
  })

  it('validates enum', () => {
    const r1 = v.validate({ c: { type: 'enum', enum: ['a', 'b'] } }, { c: 'a' })
    expect(r1.ok).toBe(true)
    const r2 = v.validate({ c: { type: 'enum', enum: ['a', 'b'] } }, { c: 'c' })
    expect(r2.ok).toBe(false)
  })

  it('validates pattern', () => {
    const r = v.validate({ code: { type: 'string', pattern: '^[A-Z]{3}$' } }, { code: 'abc' })
    expect(r.ok).toBe(false)
  })

  it('catches invalid pattern regex', () => {
    const r = v.validate({ x: { type: 'string', pattern: '[' } }, { x: 'foo' })
    expect(r.ok).toBe(false)
  })

  it('runs custom rule', () => {
    const r = v.validate({ x: { type: 'string', custom: v => v === 'ok' ? true : 'must be ok' } }, { x: 'no' })
    expect(r.errors[0]!.rule).toBe('custom')
  })

  it('custom rule returns true allows', () => {
    const r = v.validate({ x: { type: 'string', custom: () => true } }, { x: 'any' })
    expect(r.ok).toBe(true)
  })

  it('strict mode rejects unknown fields', () => {
    const vs = new Validator({ strictMode: true })
    const r = vs.validate({ a: { type: 'string' } }, { a: 'x', b: 'y' })
    expect(r.ok).toBe(false)
  })

  it('stopOnFirstError stops early', () => {
    const vs = new Validator({ stopOnFirstError: true, coerceTypes: false })
    const r = vs.validate({ a: { type: 'string' }, b: { type: 'string' } }, { a: 1, b: 2 })
    expect(r.errors).toHaveLength(1)
  })

  it('validateBatch reports counts', () => {
    const schema = { n: { type: 'integer', min: 0 } }
    const b = v.validateBatch(schema, [{ n: 1 }, { n: -1 }, { n: 2 }])
    expect(b.okCount).toBe(2)
    expect(b.failCount).toBe(1)
  })

  it('allowNull passes null', () => {
    const r = v.validate({ x: { type: 'string', allowNull: true } }, { x: null })
    expect(r.ok).toBe(true)
  })

  it('allowNull allows null even when required', () => {
    const r = v.validate({ x: { type: 'string', required: true, allowNull: true } }, { x: null })
    expect(r.ok).toBe(true)
  })

  it('required fails for missing key', () => {
    const r = v.validate({ x: { type: 'string', required: true, allowNull: true } }, {})
    expect(r.ok).toBe(false)
  })

  it('coerceTypes disabled leaves values as-is', () => {
    const vs = new Validator({ coerceTypes: false })
    const r = vs.validate({ x: { type: 'integer' } }, { x: '5' })
    expect(r.ok).toBe(false)
  })

  it('getValidator singleton', async () => {
    const { getValidator } = await import('../index')
    const a = getValidator()
    const b = getValidator()
    expect(a).toBe(b)
  })

  it('error includes path, value, message', () => {
    const r = v.validate({ x: { type: 'integer' } }, { x: 'x' })
    expect(r.errors[0]!.path).toBe('x')
    expect(r.errors[0]!.value).toBe('x')
  })
})
