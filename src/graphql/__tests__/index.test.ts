// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  schema, Schema, parse, execute, DataLoader, mockDBExport,
  objectType, scalarType, nonNull, list, enumType, inputObject, unwrap, typeName,
  type GraphQLType, type FieldDef,
} from '../index'

describe('type helpers', () => {
  it('nonNull / list', () => {
    expect(nonNull(scalarType('String'))).toEqual({ kind: 'NonNull', ofType: { kind: 'Scalar', name: 'String' } })
    expect(list(scalarType('Int'))).toEqual({ kind: 'List', ofType: { kind: 'Scalar', name: 'Int' } })
  })

  it('unwrap 嵌套', () => {
    const t = nonNull(list(scalarType('String')))
    expect(unwrap(t)).toEqual({ kind: 'Scalar', name: 'String' })
  })

  it('typeName 提取', () => {
    expect(typeName(nonNull(scalarType('ID')))).toBe('ID')
  })
})

describe('parse', () => {
  it('基本 query', () => {
    const doc = parse(`query { hello }`)
    const op = doc.definitions[0] as any
    expect(op.kind).toBe('OperationDefinition')
    expect(op.operation).toBe('query')
    expect(op.selectionSet.selections[0].name).toBe('hello')
  })

  it('带变量', () => {
    const doc = parse(`query GetUser($id: ID!) { user(id: $id) { name } }`)
    const op = doc.definitions[0] as any
    expect(op.name).toBe('GetUser')
    expect(op.variableDefinitions[0]).toEqual({ variable: 'id', type: { kind: 'NonNull', ofType: { kind: 'Scalar', name: 'ID' } } })
    expect(op.selectionSet.selections[0].name).toBe('user')
    expect(op.selectionSet.selections[0].arguments.id.kind).toBe('variable')
  })

  it('mutation', () => {
    const doc = parse(`mutation { createPost(text: "hi") { id } }`)
    const op = doc.definitions[0] as any
    expect(op.operation).toBe('mutation')
  })

  it('subscription', () => {
    const doc = parse(`subscription { ping }`)
    expect((doc.definitions[0] as any).operation).toBe('subscription')
  })

  it('fragment', () => {
    const doc = parse(`fragment F on Post { id title } query { posts { ...F } }`)
    expect(doc.definitions.length).toBe(2)
    expect(doc.fragments.F).toBeDefined()
  })

  it('内联片段', () => {
    const doc = parse(`{ posts { id ... on Post { likes } } }`)
    const sel = (doc.definitions[0] as any).selectionSet.selections[0]
    expect(sel.selectionSet.selections.some((s: any) => s.kind === 'InlineFragment')).toBe(true)
  })

  it('alias', () => {
    const doc = parse(`{ myName: me { name } }`)
    const sel = (doc.definitions[0] as any).selectionSet.selections[0]
    expect(sel.alias).toBe('myName')
    expect(sel.name).toBe('me')
  })

  it('数字/布尔/null 字面量', () => {
    const doc = parse(`{ user(id: 1) { active: true deleted: null } }`)
    const sel = (doc.definitions[0] as any).selectionSet.selections[0]
    expect(sel.arguments.id.value).toBe(1)
  })
})

describe('Schema', () => {
  it('addType + getType', () => {
    const s = new Schema()
    s.addType(objectType('Foo', { x: { type: scalarType('Int') } }))
    const t = s.getType('Foo')
    expect(t).toBeDefined()
    expect((t as any).fields.x).toBeDefined()
  })

  it('toSDL', () => {
    const s = new Schema()
    s.addType(objectType('Foo', { name: { type: scalarType('String') } }))
    const sdl = s.toSDL()
    expect(sdl).toContain('type Foo')
    expect(sdl).toContain('name: String')
  })

  it('introspect', () => {
    const s = new Schema()
    s.addType(objectType('Foo', { x: { type: scalarType('Int') } }))
    const i = s.introspect()
    const foo = i.__schema.types.find((t: any) => t.name === 'Foo')
    expect(foo).toBeDefined()
    expect(foo.fields[0].name).toBe('x')
  })
})

describe('execute', () => {
  it('简单 query', async () => {
    const r = await execute(schema, `{ hello }`)
    expect(r.errors).toBeUndefined()
    expect(r.data).toEqual({ hello: 'world' })
  })

  it('now 返回时间戳', async () => {
    const r = await execute(schema, `{ now }`)
    expect(typeof r.data.now).toBe('number')
  })

  it('嵌套解析 (users → posts)', async () => {
    const r = await execute(schema, `{ users { id name posts { id title } } }`)
    expect(r.errors).toBeUndefined()
    expect(r.data.users[0].posts.length).toBeGreaterThan(0)
  })

  it('变量解析', async () => {
    const r = await execute(schema, `query($id: ID!) { user(id: $id) { name } }`, { id: 'u1' })
    expect(r.data.user.name).toBe('Alice')
  })

  it('mutation 修改状态', async () => {
    const before = mockDBExport.posts.length
    const r = await execute(schema, `mutation { createPost(text: "test", authorId: "u1") { id } }`)
    expect(r.data.createPost.id).toBeTruthy()
    expect(mockDBExport.posts.length).toBe(before + 1)
  })

  it('字段不存在 → error', async () => {
    const r = await execute(schema, `{ unknownField }`)
    expect(r.errors).toBeDefined()
    expect(r.errors![0].message).toContain('unknownField')
  })

  it('嵌套错误', async () => {
    const r = await execute(schema, `{ users { id unknown } }`)
    expect(r.errors).toBeDefined()
  })

  it('product query', async () => {
    const r = await execute(schema, `{ products { name price inStock } }`)
    expect(r.data.products.length).toBeGreaterThan(0)
  })

  it('likePost mutation', async () => {
    const before = mockDBExport.posts.find((p) => p.id === 'p1')!.likes
    const r = await execute(schema, `mutation { likePost(id: "p1") { likes } }`)
    expect(r.data.likePost.likes).toBe(before + 1)
  })
})

describe('DataLoader', () => {
  it('基本批处理', async () => {
    let batch: number[][] = []
    const loader = new DataLoader<number, number>(async (keys) => {
      batch.push(keys)
      return keys.map((k) => k * 2)
    })
    const [a, b, c] = await Promise.all([loader.load(1), loader.load(2), loader.load(3)])
    expect(a).toBe(2)
    expect(b).toBe(4)
    expect(c).toBe(6)
    expect(batch.length).toBe(1)
    expect(batch[0].sort()).toEqual([1, 2, 3])
  })

  it('缓存命中', async () => {
    let calls = 0
    const loader = new DataLoader<number, number>(async (keys) => {
      calls++
      return keys.map((k) => k)
    })
    await loader.load(1)
    await loader.load(1)
    expect(calls).toBe(1)
  })

  it('clear 清除缓存', async () => {
    let calls = 0
    const loader = new DataLoader<number, number>(async (keys) => {
      calls++
      return keys
    })
    await loader.load(1)
    loader.clear(1)
    await loader.load(1)
    expect(calls).toBe(2)
  })

  it('clear 全部', async () => {
    let calls = 0
    const loader = new DataLoader<number, number>(async (keys) => {
      calls++
      return keys
    })
    await Promise.all([loader.load(1), loader.load(2)])
    loader.clear()
    await Promise.all([loader.load(1), loader.load(2)])
    expect(calls).toBe(2)
  })

  it('错误处理', async () => {
    const loader = new DataLoader<number, number>(async () => {
      throw new Error('batch failed')
    })
    await expect(loader.load(1)).rejects.toThrow('batch failed')
  })

  it('maxBatchSize 分批', async () => {
    let calls = 0
    const loader = new DataLoader<number, number>(async (keys) => {
      calls++
      return keys
    }, { maxBatchSize: 2 })
    await Promise.all([
      loader.load(1), loader.load(2), loader.load(3), loader.load(4), loader.load(5),
    ])
    expect(calls).toBe(3)  // 2+2+1
  })
})
