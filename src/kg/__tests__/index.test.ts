import { describe, it, expect, beforeEach } from 'vitest'
import { KnowledgeGraph, resetKnowledgeGraph } from '../index'

let kg: KnowledgeGraph

beforeEach(() => {
  resetKnowledgeGraph()
  kg = new KnowledgeGraph()
  kg.addEntity({ id: 'alice', type: 'person', label: 'Alice', properties: { age: 30, country: 'US' } })
  kg.addEntity({ id: 'bob', type: 'person', label: 'Bob', properties: { age: 25, country: 'US' } })
  kg.addEntity({ id: 'acme', type: 'company', label: 'ACME Corp', properties: { founded: 1990, country: 'US' } })
  kg.addEntity({ id: 'globex', type: 'company', label: 'Globex', properties: { founded: 2000, country: 'DE' } })
  kg.addRelation({ id: 'r1', type: 'works_at', from: 'alice', to: 'acme' })
  kg.addRelation({ id: 'r2', type: 'works_at', from: 'bob', to: 'acme' })
  kg.addRelation({ id: 'r3', type: 'knows', from: 'alice', to: 'bob' })
  kg.addRelation({ id: 'r4', type: 'acquired', from: 'acme', to: 'globex' })
})

describe('KnowledgeGraph', () => {
  it('adds entities with auto timestamp', () => {
    const e = kg.addEntity({ id: 'eve', type: 'person', label: 'Eve', properties: {} })
    expect(e.createdAt).toBeGreaterThan(0)
  })

  it('rejects duplicate entities', () => {
    expect(() => kg.addEntity({ id: 'alice', type: 'person', label: 'A2', properties: {} })).toThrow()
  })

  it('retrieves entities', () => {
    expect(kg.getEntity('alice')?.label).toBe('Alice')
    expect(kg.hasEntity('nope')).toBe(false)
  })

  it('updates entity properties', () => {
    const e = kg.updateEntity('alice', { properties: { age: 31 } })
    expect(e.properties.age).toBe(31)
  })

  it('updateEntity changes type and reindexes', () => {
    kg.updateEntity('alice', { type: 'employee' })
    expect(kg.getEntity('alice')?.type).toBe('employee')
  })

  it('updateEntity throws on missing entity', () => {
    expect(() => kg.updateEntity('nope', { label: 'x' })).toThrow()
  })

  it('removes entity and its relations', () => {
    kg.removeEntity('alice')
    expect(kg.hasEntity('alice')).toBe(false)
    expect(kg.getOutgoing('alice')).toHaveLength(0)
    expect(kg.getRelation('r1')).toBeUndefined()
  })

  it('adds relations with default weight', () => {
    const r = kg.addRelation({ id: 'r5', type: 'likes', from: 'bob', to: 'globex' })
    expect(r.weight).toBe(1)
  })

  it('adds relations with custom weight', () => {
    const r = kg.addRelation({ id: 'r5', type: 'likes', from: 'bob', to: 'globex', weight: 0.5 })
    expect(r.weight).toBe(0.5)
  })

  it('rejects self-loop by default', () => {
    expect(() => kg.addRelation({ id: 'sl', type: 'self', from: 'alice', to: 'alice' })).toThrow()
  })

  it('allows self-loop when configured', () => {
    const k = new KnowledgeGraph({ allowSelfLoop: true })
    k.addEntity({ id: 'a', type: 'p', label: 'A', properties: {} })
    k.addRelation({ id: 'sl', type: 'self', from: 'a', to: 'a' })
    expect(k.getRelation('sl')).toBeDefined()
  })

  it('rejects relation with missing entity', () => {
    expect(() => kg.addRelation({ id: 'x', type: 't', from: 'nope', to: 'alice' })).toThrow()
    expect(() => kg.addRelation({ id: 'x', type: 't', from: 'alice', to: 'nope' })).toThrow()
  })

  it('removes relations', () => {
    expect(kg.removeRelation('r1')).toBe(true)
    expect(kg.getRelation('r1')).toBeUndefined()
    expect(kg.removeRelation('nope')).toBe(false)
  })

  it('getOutgoing returns relations of a type', () => {
    const out = kg.getOutgoing('alice', 'works_at')
    expect(out).toHaveLength(1)
    expect(out[0]?.to).toBe('acme')
  })

  it('getIncoming returns relations of a type', () => {
    const inc = kg.getIncoming('acme', 'works_at')
    expect(inc).toHaveLength(2)
  })

  it('getNeighbors collects both directions', () => {
    const n = kg.getNeighbors('alice')
    expect(n).toContain('acme')
    expect(n).toContain('bob')
  })

  it('queryEntities filters by type', () => {
    const companies = kg.queryEntities({ type: 'company' })
    expect(companies).toHaveLength(2)
  })

  it('queryEntities filters by property equality', () => {
    const us = kg.queryEntities({ propertyFilters: [{ key: 'country', op: 'eq', value: 'US' }] })
    expect(us.length).toBeGreaterThan(0)
  })

  it('queryEntities filters by numeric gt', () => {
    const old = kg.queryEntities({ type: 'company', propertyFilters: [{ key: 'founded', op: 'gt', value: 1995 }] })
    expect(old.find(e => e.id === 'globex')).toBeDefined()
    expect(old.find(e => e.id === 'acme')).toBeUndefined()
  })

  it('queryEntities filters by lt', () => {
    const young = kg.queryEntities({ type: 'company', propertyFilters: [{ key: 'founded', op: 'lt', value: 1995 }] })
    expect(young.find(e => e.id === 'acme')).toBeDefined()
  })

  it('queryEntities filters by in', () => {
    const found = kg.queryEntities({ propertyFilters: [{ key: 'country', op: 'in', value: ['DE'] }] })
    expect(found.find(e => e.id === 'globex')).toBeDefined()
  })

  it('queryEntities filters by contains', () => {
    kg.updateEntity('acme', { properties: { description: 'Big Holding Company' } })
    const found = kg.queryEntities({ propertyFilters: [{ key: 'description', op: 'contains', value: 'Big' }] })
    expect(found.length).toBe(1)
  })

  it('queryEntities applies limit', () => {
    const r = kg.queryEntities({ limit: 2 })
    expect(r).toHaveLength(2)
  })

  it('bfs traverses graph', () => {
    const visited = kg.bfs('alice')
    expect(visited).toContain('acme')
    expect(visited).toContain('bob')
    expect(visited).toContain('globex')
  })

  it('bfs respects maxDepth', () => {
    const visited = kg.bfs('alice', { maxDepth: 1 })
    expect(visited).toContain('acme')
    expect(visited).toContain('bob')
    expect(visited).not.toContain('globex')
  })

  it('bfs respects relType filter', () => {
    const visited = kg.bfs('alice', { relType: 'works_at' })
    expect(visited).toContain('acme')
    expect(visited).toContain('bob')
    expect(visited).not.toContain('globex')
  })

  it('findPath returns shortest path', () => {
    const p = kg.findPath('alice', 'globex')
    expect(p).not.toBeNull()
    expect(p?.nodes[0]).toBe('alice')
    expect(p?.nodes[p.nodes.length - 1]).toBe('globex')
  })

  it('findPath returns null for disconnected nodes', () => {
    kg.addEntity({ id: 'isolated', type: 'x', label: 'I', properties: {} })
    expect(kg.findPath('alice', 'isolated')).toBeNull()
  })

  it('findPath returns null for missing nodes', () => {
    expect(kg.findPath('alice', 'nope')).toBeNull()
  })

  it('findPath from node to itself', () => {
    const p = kg.findPath('alice', 'alice')
    expect(p?.nodes).toEqual(['alice'])
    expect(p?.length).toBe(0)
  })

  it('extractSubgraph collects nodes within depth', () => {
    const sub = kg.extractSubgraph(['alice'], 1)
    expect(sub.entities.length).toBeGreaterThan(1)
    expect(sub.relations.length).toBeGreaterThan(0)
  })

  it('extractSubgraph with depth 0 returns root only', () => {
    const sub = kg.extractSubgraph(['alice'], 0)
    expect(sub.entities).toHaveLength(1)
  })

  it('stats reports counts and types', () => {
    const s = kg.stats()
    expect(s.entityCount).toBe(4)
    expect(s.relationCount).toBe(4)
    expect(s.entityTypes['person']).toBe(2)
    expect(s.relationTypes['works_at']).toBe(2)
  })

  it('stats reports components for disconnected graph', () => {
    kg.addEntity({ id: 'isolated', type: 'p', label: 'I', properties: {} })
    const s = kg.stats()
    expect(s.components).toBe(2)
  })

  it('uptime is positive', () => {
    expect(kg.uptimeMs()).toBeGreaterThanOrEqual(0)
  })

  it('getKnowledgeGraph returns singleton', async () => {
    const { getKnowledgeGraph } = await import('../index')
    const a = getKnowledgeGraph()
    const b = getKnowledgeGraph()
    expect(a).toBe(b)
  })
})
