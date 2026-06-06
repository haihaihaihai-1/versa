import { describe, it, expect } from 'vitest'
import {
  SchemaParser, SchemaRegistry, SchemaMigration, SchemaCodec,
  getRegistry, resetRegistry,
} from '../index'

describe('SchemaParser', () => {
  it('parses JSON Schema', () => {
    const s = SchemaParser.parse({
      type: 'object',
      properties: { name: { type: 'string' }, age: { type: 'int' } },
      required: ['name'],
    })
    expect(s.fields).toHaveLength(2)
    expect(s.fields[0].name).toBe('name')
    expect(s.fields[0].required).toBe(true)
    expect(s.fields[1].required).toBe(false)
  })
  it('parses Avro record', () => {
    const s = SchemaParser.parse({
      type: 'record',
      name: 'User',
      fields: [
        { name: 'id', type: 'long' },
        { name: 'nickname', type: ['null', 'string'], default: null },
      ],
    }, 'avro', 'User')
    expect(s.fields).toHaveLength(2)
    expect(s.fields[1].required).toBe(false)  // nullable union
  })
  it('parses generic list', () => {
    const s = SchemaParser.parse([{ name: 'x', type: 'int' }])
    expect(s.fields[0].name).toBe('x')
  })
  it('handles $ref', () => {
    const s = SchemaParser.parse({ type: 'object', properties: { addr: { $ref: '#/definitions/Address' } } })
    expect(s.fields[0].type).toBe('#/definitions/Address')
  })
})

describe('SchemaRegistry', () => {
  it('register and get', () => {
    const r = new SchemaRegistry()
    const s = r.register({ properties: { x: { type: 'int' } } }, 'json-schema', 'X')
    expect(s.id).toBe(1)
    expect(s.version).toBe(1)
    expect(r.get(1)).toBe(s)
  })
  it('versions same name', () => {
    const r = new SchemaRegistry()
    const s1 = r.register({ properties: { x: { type: 'int' } } }, 'json-schema', 'X')
    const s2 = r.register({ properties: { x: { type: 'int' }, y: { type: 'string' } } }, 'json-schema', 'X')
    expect(s1.version).toBe(1)
    expect(s2.version).toBe(2)
    expect(r.getByName('X')).toHaveLength(2)
    expect(r.getLatest('X')).toBe(s2)
  })
  it('lists by name', () => {
    const r = new SchemaRegistry()
    r.register({}, 'json-schema', 'A')
    r.register({}, 'json-schema', 'A')
    r.register({}, 'json-schema', 'B')
    expect(r.listByName('A')).toHaveLength(2)
  })
  it('delete', () => {
    const r = new SchemaRegistry()
    const s = r.register({}, 'json-schema', 'X')
    expect(r.delete(s.id)).toBe(true)
    expect(r.get(s.id)).toBeUndefined()
  })
  it('list all', () => {
    const r = new SchemaRegistry()
    r.register({}, 'json-schema', 'A')
    r.register({}, 'json-schema', 'B')
    expect(r.listAll()).toHaveLength(2)
  })
  it('addReference + resolveRef', () => {
    const r = new SchemaRegistry()
    const ref = SchemaParser.parse({ properties: { x: { type: 'int' } } })
    r.addReference('Address', ref)
    expect(r.resolveRef('schema:Address')).toBe(ref)
    expect(r.resolveRef('#/definitions/Address')).toBe(ref)
  })
  it('findField', () => {
    const r = new SchemaRegistry()
    r.register({ properties: { name: { type: 'string' } } }, 'json-schema', 'X')
    const found = r.findField('X', 'name')
    expect(found).toBeDefined()
    expect(found?.field.type).toBe('string')
  })
  it('searchFields', () => {
    const r = new SchemaRegistry()
    r.register({ properties: { customer_id: { type: 'int' } } }, 'json-schema', 'Order')
    const results = r.searchFields('customer')
    expect(results).toHaveLength(1)
  })
})

describe('Compatibility', () => {
  it('BACKWARD: removing required field fails', () => {
    const r = new SchemaRegistry()
    r.register({ properties: { name: { type: 'string' } }, required: ['name'] }, 'json-schema', 'X')
    const r2 = r.evolve({ properties: {} }, 'json-schema', 'X', 'BACKWARD')
    expect(r2.compatible).toBe(false)
  })
  it('BACKWARD: adding optional field OK', () => {
    const r = new SchemaRegistry()
    r.register({ properties: { x: { type: 'int' } } }, 'json-schema', 'X')
    const r2 = r.evolve({ properties: { x: { type: 'int' }, y: { type: 'string' } } }, 'json-schema', 'X', 'BACKWARD')
    expect(r2.compatible).toBe(true)
  })
  it('FORWARD: adding required fails', () => {
    const r = new SchemaRegistry()
    r.register({ properties: { x: { type: 'int' } } }, 'json-schema', 'X')
    const r2 = r.evolve({ properties: { x: { type: 'int' }, y: { type: 'string' } }, required: ['x', 'y'] }, 'json-schema', 'X', 'FORWARD')
    expect(r2.compatible).toBe(false)
  })
  it('FULL: any side removed required fails', () => {
    const r = new SchemaRegistry()
    r.register({ properties: { x: { type: 'int' } }, required: ['x'] }, 'json-schema', 'X')
    const r2 = r.evolve({ properties: { y: { type: 'int' } } }, 'json-schema', 'X', 'FULL')
    expect(r2.compatible).toBe(false)
  })
  it('NONE: no checks', () => {
    const r = new SchemaRegistry()
    r.register({ properties: { x: { type: 'int' } } }, 'json-schema', 'X')
    const r2 = r.evolve({ properties: {} }, 'json-schema', 'X', 'NONE')
    expect(r2.compatible).toBe(true)
  })
  it('type change fails', () => {
    const r = new SchemaRegistry()
    r.register({ properties: { x: { type: 'int' } } }, 'json-schema', 'X')
    const r2 = r.evolve({ properties: { x: { type: 'string' } } }, 'json-schema', 'X', 'BACKWARD')
    expect(r2.compatible).toBe(false)
  })
  it('mismatch name fails', () => {
    const r = new SchemaRegistry()
    const a = r.register({}, 'json-schema', 'A')
    const r2 = r.evolveFrom(a.id, {}, 'json-schema', 'B', 'BACKWARD')
    expect(r2.compatible).toBe(false)
  })
  it('first evolution always compatible', () => {
    const r = new SchemaRegistry()
    const r2 = r.evolve({ properties: {} }, 'json-schema', 'X', 'BACKWARD')
    expect(r2.compatible).toBe(true)
  })
})

describe('SchemaMigration', () => {
  it('rename field', () => {
    const m = new SchemaMigration(1, 2).map('user_name', 'username')
    const out = m.apply({ user_name: 'alice', other: 1 })
    expect(out.username).toBe('alice')
    expect((out as Record<string, unknown>).user_name).toBeUndefined()
  })
  it('transform with multiply', () => {
    const m = new SchemaMigration(1, 2).map('amount', 'total', v => (v as number) * 100)
    const out = m.apply({ amount: 5 })
    expect(out.total).toBe(500)
  })
  it('keeps unmapped fields', () => {
    const m = new SchemaMigration(1, 2).map('a', 'b')
    const out = m.apply({ a: 1, c: 3 })
    expect(out).toEqual({ b: 1, c: 3 })
  })
  it('preserves versions', () => {
    const m = new SchemaMigration(3, 7)
    expect(m.fromVersion).toBe(3)
    expect(m.toVersion).toBe(7)
  })
})

describe('SchemaCodec', () => {
  const schema = SchemaParser.parse({
    type: 'object',
    properties: {
      id: { type: 'int' },
      name: { type: 'string' },
      active: { type: 'boolean' },
    },
    required: ['id', 'name'],
  })

  it('validates required', () => {
    const r = SchemaCodec.validate({}, schema)
    expect(r.valid).toBe(false)
    expect(r.errors).toHaveLength(2)
  })
  it('validates types', () => {
    const r = SchemaCodec.validate({ id: 'x', name: 'foo' }, schema)
    expect(r.valid).toBe(false)
    expect(r.errors[0].field).toBe('id')
  })
  it('applyDefaults', () => {
    const s = SchemaParser.parse({ properties: { x: { type: 'int', default: 5 } } })
    expect(SchemaCodec.applyDefaults({}, s)).toEqual({ x: 5 })
  })
  it('encode with defaults', () => {
    const s = SchemaParser.parse({ properties: { x: { type: 'int', default: 5 } } })
    const r = SchemaCodec.encode({}, s)
    expect(r.ok).toBe(true)
    expect(r.result).toEqual({ x: 5 })
  })
  it('decode = encode', () => {
    const r = SchemaCodec.decode({ id: 1, name: 'x' }, schema)
    expect(r.ok).toBe(true)
  })
  it('handles union type', () => {
    const r = SchemaCodec.validate({ x: 5 }, SchemaParser.parse({ properties: { x: { type: 'int|string' } } }))
    expect(r.valid).toBe(true)
  })
  it('handles null type', () => {
    const r = SchemaCodec.validate({ x: null }, SchemaParser.parse({ properties: { x: { type: 'null' } } }))
    expect(r.valid).toBe(true)
  })
})

describe('Registry metrics & singleton', () => {
  it('metrics', () => {
    const r = new SchemaRegistry()
    r.register({}, 'json-schema', 'A')
    r.register({}, 'json-schema', 'B')
    r.addReference('X', SchemaParser.parse({}))
    expect(r.metrics().total).toBe(2)
    expect(r.metrics().families).toBe(2)
    expect(r.metrics().references).toBe(1)
  })
  it('clear', () => {
    const r = new SchemaRegistry()
    r.register({}, 'json-schema', 'A')
    r.clear()
    expect(r.listAll()).toHaveLength(0)
  })
  it('singleton get/reset', () => {
    resetRegistry()
    const a = getRegistry()
    const b = getRegistry()
    expect(a).toBe(b)
    resetRegistry()
    const c = getRegistry()
    expect(c).not.toBe(a)
  })
})
