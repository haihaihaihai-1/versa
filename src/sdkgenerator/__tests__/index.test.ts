import { describe, it, expect, beforeEach } from 'vitest'
import { SdkGenerator, getSdkGenerator, resetSdkGenerator, type ApiSpec } from '../index'

function sampleSpec(): ApiSpec {
  return {
    title: 'Pet Store',
    version: '1.0.0',
    baseUrl: 'https://petstore.example.com/v1',
    auth: [{ type: 'bearer', name: 'apiKey' }],
    operations: [
      {
        id: 'listPets',
        method: 'GET',
        path: '/pets',
        summary: 'List all pets',
        tags: ['pets'],
        parameters: [
          { name: 'limit', in: 'query', type: 'integer', required: false },
          { name: 'status', in: 'query', type: 'string', required: false }
        ],
        responses: [{ status: 200, type: 'application/json' }],
        auth: ['apiKey']
      },
      {
        id: 'createPet',
        method: 'POST',
        path: '/pets',
        summary: 'Create a pet',
        tags: ['pets'],
        parameters: [],
        requestBody: { type: 'application/json', required: true },
        responses: [{ status: 201 }],
        auth: ['apiKey']
      },
      {
        id: 'getPet',
        method: 'GET',
        path: '/pets/{id}',
        summary: 'Get pet by id',
        tags: ['pets'],
        parameters: [{ name: 'id', in: 'path', type: 'string', required: true }],
        responses: [{ status: 200, type: 'application/json' }],
        auth: ['apiKey']
      },
      {
        id: 'deletePet',
        method: 'DELETE',
        path: '/pets/{id}',
        tags: ['pets'],
        parameters: [{ name: 'id', in: 'path', type: 'string', required: true }],
        responses: [{ status: 204 }],
        auth: ['apiKey']
      }
    ],
    types: [
      { name: 'Pet', kind: 'object', fields: { id: { type: 'string' }, name: { type: 'string' }, tag: { type: 'string', optional: true } } },
      { name: 'Status', kind: 'enum', values: ['available', 'pending', 'sold'] }
    ]
  }
}

describe('SdkGenerator - ingestion', () => {
  let gen: SdkGenerator
  beforeEach(() => { gen = new SdkGenerator() })

  it('ingests a spec', () => {
    const s = sampleSpec()
    gen.ingest(s)
    expect(gen.listSpecs()).toHaveLength(1)
    expect(gen.getSpec('Pet Store')?.title).toBe('Pet Store')
  })
  it('removes a spec', () => {
    gen.ingest(sampleSpec())
    expect(gen.removeSpec('Pet Store')).toBe(true)
    expect(gen.listSpecs()).toHaveLength(0)
  })
  it('removes non-existent', () => {
    expect(gen.removeSpec('foo')).toBe(false)
  })
  it('updates metrics on ingest', () => {
    gen.ingest(sampleSpec())
    const m = gen.getMetrics()
    expect(m.totalSpecs).toBe(1)
    expect(m.totalOperations).toBe(4)
    expect(m.totalTypes).toBe(2)
  })
})

describe('SdkGenerator - OpenAPI parsing', () => {
  let gen: SdkGenerator
  beforeEach(() => { gen = new SdkGenerator() })

  it('parses basic OpenAPI doc', () => {
    const doc = {
      info: { title: 'T', version: '1.0' },
      servers: [{ url: 'https://api.test.com' }],
      paths: {
        '/users': { get: { operationId: 'listUsers', summary: 'List', parameters: [{ name: 'limit', in: 'query', required: false, schema: { type: 'integer' } }], responses: { '200': { content: { 'application/json': { schema: { type: 'array' } } } } } }, post: { operationId: 'createUser', requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { '201': { content: {} } } } }
      },
      components: { securitySchemes: { apiKey: { type: 'apiKey', in: 'header' }, basic: { type: 'http' } }, schemas: { User: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' } }, required: ['id'] } } }
    }
    const spec = gen.parseOpenAPI(doc)
    expect(spec.title).toBe('T')
    expect(spec.baseUrl).toBe('https://api.test.com')
    expect(spec.operations).toHaveLength(2)
    expect(spec.operations[0].id).toBe('listUsers')
    expect(spec.operations[0].parameters[0].type).toBe('integer')
    expect(spec.operations[1].requestBody?.type).toBe('application/json')
    expect(spec.auth).toHaveLength(2)
    expect(spec.auth[0].type).toBe('apiKey')
    expect(spec.auth[1].type).toBe('bearer')
    expect(spec.types).toHaveLength(1)
    expect(spec.types[0].fields?.id.optional).toBe(false)
    expect(spec.types[0].fields?.name.optional).toBe(true)
  })
  it('falls back to default baseUrl', () => {
    const spec = gen.parseOpenAPI({ info: { title: 'T', version: '1' }, servers: [], paths: {} })
    expect(spec.baseUrl).toBe('https://api.example.com')
  })
  it('skips non-http methods', () => {
    const spec = gen.parseOpenAPI({ info: { title: 'T', version: '1' }, paths: { '/x': { parameters: [] } as unknown as Record<string, unknown> } })
    expect(spec.operations).toHaveLength(0)
  })
  it('handles enum schema', () => {
    const spec = gen.parseOpenAPI({ info: { title: 'T', version: '1' }, paths: {}, components: { schemas: { Color: { type: 'string', enum: ['red', 'green', 'blue'] } } } })
    expect(spec.types[0].kind).toBe('enum')
    expect(spec.types[0].values).toEqual(['red', 'green', 'blue'])
  })
  it('generates operation id from method+path when missing', () => {
    const spec = gen.parseOpenAPI({ info: { title: 'T', version: '1' }, paths: { '/foo/{id}': { get: { responses: {} } } } })
    expect(spec.operations[0].id).toContain('get')
  })
  it('handles basic auth', () => {
    const spec = gen.parseOpenAPI({ info: { title: 'T', version: '1' }, paths: {}, components: { securitySchemes: { b: { type: 'basic' } } } })
    expect(spec.auth[0].type).toBe('basic')
  })
})

describe('SdkGenerator - GraphQL SDL parsing', () => {
  let gen: SdkGenerator
  beforeEach(() => { gen = new SdkGenerator() })
  it('parses queries and types', () => {
    const sdl = `
      type User { id: ID! name: String email: String }
      type Query {
        user(id: ID!): User
        users(limit: Int): [User]
      }
      enum Status { ACTIVE BANNED }
    `
    const r = gen.parseGraphQLSDL(sdl)
    expect(r.queries).toHaveLength(2)
    expect(r.queries[0].name).toBe('user')
    expect(r.queries[0].args[0].required).toBe(true)
    expect(r.types).toHaveLength(2)
    const userType = r.types.find(t => t.name === 'User')!
    expect(userType.fields?.id.optional).toBe(false)
    const status = r.types.find(t => t.name === 'Status')!
    expect(status.kind).toBe('enum')
    expect(status.values).toEqual(['ACTIVE', 'BANNED'])
  })
  it('parses mutations', () => {
    const sdl = `type Mutation { createUser(name: String!): User }`
    const r = gen.parseGraphQLSDL(sdl)
    expect(r.queries[0].name).toBe('createUser')
  })
})

describe('SdkGenerator - TypeScript generation', () => {
  let gen: SdkGenerator
  beforeEach(() => { gen = new SdkGenerator(); gen.ingest(sampleSpec()) })
  it('generates TS code', () => {
    const file = gen.generate('Pet Store', 'typescript')
    expect(file.language).toBe('typescript')
    expect(file.filename).toBe('pet-store-client.ts')
    expect(file.content).toContain('export const BASE_URL')
    expect(file.content).toContain('export interface Pet')
    expect(file.content).toContain('export enum Status')
    expect(file.content).toContain('export class PetStore')
    expect(file.content).toContain('async listPets')
    expect(file.content).toContain('async getPet')
    expect(file.content).toContain("method: 'GET'")
  })
  it('uses custom client name', () => {
    const file = gen.generate('Pet Store', 'typescript', { clientName: 'Pets' })
    expect(file.content).toContain('export class Pets')
  })
  it('handles path params', () => {
    const file = gen.generate('Pet Store', 'typescript')
    expect(file.content).toContain("path.replace('{id}'")
  })
  it('handles query params', () => {
    const file = gen.generate('Pet Store', 'typescript')
    expect(file.content).toContain('URLSearchParams')
    expect(file.content).toContain("query.set('limit'")
  })
  it('handles body', () => {
    const file = gen.generate('Pet Store', 'typescript')
    expect(file.content).toContain("'Content-Type': 'application/json'")
    expect(file.content).toContain('JSON.stringify')
  })
  it('throws for missing spec', () => {
    expect(() => gen.generate('foo', 'typescript')).toThrow()
  })
})

describe('SdkGenerator - JavaScript generation', () => {
  let gen: SdkGenerator
  beforeEach(() => { gen = new SdkGenerator(); gen.ingest(sampleSpec()) })
  it('generates JS code', () => {
    const file = gen.generate('Pet Store', 'javascript')
    expect(file.language).toBe('javascript')
    expect(file.filename).toBe('pet-store-client.js')
    expect(file.content).toContain('module.exports')
    expect(file.content).toContain('class PetStore')
  })
})

describe('SdkGenerator - Python generation', () => {
  let gen: SdkGenerator
  beforeEach(() => { gen = new SdkGenerator(); gen.ingest(sampleSpec()) })
  it('generates Python code', () => {
    const file = gen.generate('Pet Store', 'python')
    expect(file.filename).toBe('pet-store-client.py')
    expect(file.content).toContain('import requests')
    expect(file.content).toContain('class PetStore:')
    expect(file.content).toContain('def list_pets')
    expect(file.content).toContain('def get_pet')
  })
  it('handles path params in Python', () => {
    const file = gen.generate('Pet Store', 'python')
    expect(file.content).toContain("path.replace('{id}'")
  })
  it('handles body in Python', () => {
    const file = gen.generate('Pet Store', 'python')
    expect(file.content).toContain("'json': body")
  })
})

describe('SdkGenerator - Go generation', () => {
  let gen: SdkGenerator
  beforeEach(() => { gen = new SdkGenerator(); gen.ingest(sampleSpec()) })
  it('generates Go code', () => {
    const file = gen.generate('Pet Store', 'go')
    expect(file.filename).toBe('pet-store-client.go')
    expect(file.content).toContain('package pet-store')
    expect(file.content).toContain('type PetStore struct')
    expect(file.content).toContain('func (c *PetStore) ListPets(')
    expect(file.content).toContain('func (c *PetStore) GetPet(')
  })
  it('handles path params in Go', () => {
    const file = gen.generate('Pet Store', 'go')
    expect(file.content).toContain("strings.Replace")
  })
})

describe('SdkGenerator - cURL generation', () => {
  let gen: SdkGenerator
  beforeEach(() => { gen = new SdkGenerator(); gen.ingest(sampleSpec()) })
  it('generates cURL script', () => {
    const file = gen.generate('Pet Store', 'curl')
    expect(file.filename).toBe('pet-store-client.sh')
    expect(file.content).toContain('#!/usr/bin/env bash')
    expect(file.content).toContain('BASE_URL=')
    expect(file.content).toContain('list_pets()')
    expect(file.content).toContain('get_pet()')
    expect(file.content).toContain('curl')
  })
  it('handles path param in cURL', () => {
    const file = gen.generate('Pet Store', 'curl')
    expect(file.content).toContain('local id=')
  })
})

describe('SdkGenerator - generated history', () => {
  let gen: SdkGenerator
  beforeEach(() => { gen = new SdkGenerator(); gen.ingest(sampleSpec()) })
  it('tracks generated files', () => {
    gen.generate('Pet Store', 'typescript')
    gen.generate('Pet Store', 'python')
    expect(gen.listGenerated()).toHaveLength(2)
  })
  it('filters by language', () => {
    gen.generate('Pet Store', 'typescript')
    gen.generate('Pet Store', 'python')
    expect(gen.getGenerated('typescript')).toHaveLength(1)
  })
  it('clears history', () => {
    gen.generate('Pet Store', 'typescript')
    gen.clearGenerated()
    expect(gen.listGenerated()).toHaveLength(0)
  })
  it('updates metrics by language', () => {
    gen.generate('Pet Store', 'typescript')
    gen.generate('Pet Store', 'typescript')
    gen.generate('Pet Store', 'python')
    const m = gen.getMetrics()
    expect(m.byLanguage.typescript).toBe(2)
    expect(m.byLanguage.python).toBe(1)
  })
  it('file metadata correct', () => {
    const f = gen.generate('Pet Store', 'typescript')
    expect(f.bytes).toBeGreaterThan(0)
    expect(f.lineCount).toBeGreaterThan(0)
    expect(f.timestamp).toBeGreaterThan(0)
  })
})

describe('SdkGenerator - reset and singleton', () => {
  it('singleton returns same instance', () => {
    resetSdkGenerator()
    const a = getSdkGenerator()
    const b = getSdkGenerator()
    expect(a).toBe(b)
  })
  it('reset creates new instance', () => {
    const a = getSdkGenerator()
    resetSdkGenerator()
    const b = getSdkGenerator()
    expect(a).not.toBe(b)
  })
  it('resetMetrics clears counters but keeps specs', () => {
    const g = new SdkGenerator()
    g.ingest(sampleSpec())
    g.generate('Pet Store', 'typescript')
    g.resetMetrics()
    const m = g.getMetrics()
    expect(m.totalGenerations).toBe(0)
    expect(m.totalSpecs).toBe(1)
  })
})

describe('SdkGenerator - withRetry', () => {
  it('retries on failure then succeeds', async () => {
    const g = new SdkGenerator()
    g.ingest(sampleSpec())
    const file = await g.generateWithRetry('Pet Store', 'typescript')
    expect(file.language).toBe('typescript')
  })
  it('throws after all attempts fail', async () => {
    const g = new SdkGenerator()
    await expect(g.generateWithRetry('nonexistent', 'typescript')).rejects.toThrow()
  })
})
