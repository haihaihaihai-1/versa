import { describe, it, expect } from 'vitest'
import { FeatureStore, getFeatureStore, resetFeatureStore } from '../index'

describe('FeatureStore', () => {
  describe('feature definitions', () => {
    it('defines a feature', () => {
      const fs = new FeatureStore()
      const d = fs.defineFeature({ name: 'age', dataType: 'int', description: 'user age' })
      expect(d.name).toBe('age')
      expect(d.version).toBe(1)
      expect(d.createdAt).toBeGreaterThan(0)
    })

    it('creates new version', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      const v2 = fs.defineFeature({ name: 'age', dataType: 'float', version: 2 })
      expect(v2.version).toBe(2)
      expect(fs.listDefinitions()).toHaveLength(2)
    })

    it('retrieves definition', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      expect(fs.getDefinition('age')?.dataType).toBe('int')
    })

    it('deprecates a feature', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      expect(fs.deprecateFeature('age')).toBe(true)
      expect(fs.getDefinition('age')?.deprecated).toBe(true)
    })
  })

  describe('entities', () => {
    it('upserts entity', () => {
      const fs = new FeatureStore()
      fs.upsertEntity({ id: 'u1', type: 'user' })
      fs.upsertEntity({ id: 'u2', type: 'user' })
      expect(fs.listEntities('user')).toHaveLength(2)
    })

    it('updates entity', () => {
      const fs = new FeatureStore()
      fs.upsertEntity({ id: 'u1', type: 'user' })
      fs.upsertEntity({ id: 'u1', type: 'user', metadata: { v: '2' } })
      expect(fs.getEntity('u1')?.metadata?.v).toBe('2')
    })
  })

  describe('set & get', () => {
    it('sets and gets a value', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.set('age', 'u1', 25)
      expect(fs.get('age', 'u1')).toBe(25)
    })

    it('throws for undefined feature', () => {
      const fs = new FeatureStore()
      expect(() => fs.set('unknown', 'u1', 1)).toThrow('not defined')
    })

    it('throws for deprecated feature', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.deprecateFeature('age')
      expect(() => fs.set('age', 'u1', 1)).toThrow('deprecated')
    })

    it('returns latest value', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.set('age', 'u1', 25)
      fs.set('age', 'u1', 26)
      expect(fs.get('age', 'u1')).toBe(26)
    })

    it('returns undefined for missing', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      expect(fs.get('age', 'u1')).toBeUndefined()
    })

    it('respects TTL', async () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.set('age', 'u1', 25, { ttlMs: 50 })
      expect(fs.get('age', 'u1')).toBe(25)
      await new Promise(r => setTimeout(r, 80))
      expect(fs.get('age', 'u1')).toBeUndefined()
    })

    it('batch set', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.defineFeature({ name: 'name', dataType: 'string' })
      const r = fs.setBatch([
        { featureName: 'age', entityId: 'u1', value: 25 },
        { featureName: 'name', entityId: 'u1', value: 'alice' },
      ])
      expect(r).toHaveLength(2)
    })
  })

  describe('point-in-time', () => {
    it('returns historical value asOf timestamp', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.set('age', 'u1', 25, { timestamp: 1000 })
      fs.set('age', 'u1', 26, { timestamp: 2000 })
      fs.set('age', 'u1', 27, { timestamp: 3000 })
      expect(fs.get('age', 'u1', { asOf: 1500 })).toBe(25)
      expect(fs.get('age', 'u1', { asOf: 2500 })).toBe(26)
      expect(fs.get('age', 'u1', { asOf: 3000 })).toBe(27)
    })

    it('history returns all values', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.set('age', 'u1', 25)
      fs.set('age', 'u1', 26)
      expect(fs.history('age', 'u1')).toHaveLength(2)
    })
  })

  describe('online & offline paths', () => {
    it('onlineGet returns multiple features', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.defineFeature({ name: 'name', dataType: 'string' })
      fs.set('age', 'u1', 25)
      fs.set('name', 'u1', 'alice')
      const r = fs.onlineGet('u1', ['age', 'name'])
      expect(r['age']).toBe(25)
      expect(r['name']).toBe('alice')
    })

    it('offlineQuery returns feature vectors', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.defineFeature({ name: 'name', dataType: 'string' })
      fs.set('age', 'u1', 25)
      fs.set('name', 'u1', 'alice')
      fs.set('age', 'u2', 30)
      const r = fs.offlineQuery({ entityIds: ['u1', 'u2'], features: ['age', 'name'] })
      expect(r).toHaveLength(2)
      expect(r[0].features['age']).toBe(25)
      expect(r[1].features['age']).toBe(30)
      expect(r[1].missing).toContain('name')
    })

    it('offlineQuery uses defaultValues', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.set('age', 'u1', 25)
      const r = fs.offlineQuery({ entityIds: ['u1', 'u2'], features: ['age'], defaultValues: { age: 0 } })
      expect(r[1].features['age']).toBe(0)
    })
  })

  describe('groups', () => {
    it('creates a group', () => {
      const fs = new FeatureStore()
      const g = fs.createGroup({ name: 'user-profile', features: [] })
      expect(g.id).toMatch(/^grp_/)
    })

    it('adds feature to group', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      const g = fs.createGroup({ name: 'p', features: [] })
      expect(fs.addFeatureToGroup(g.id, 'age')).toBe(true)
      expect(fs.getGroup(g.id)?.features).toContain('age')
    })

    it('onlineGetGroup', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.set('age', 'u1', 25)
      const g = fs.createGroup({ name: 'p', features: ['age'] })
      expect(fs.onlineGetGroup('u1', g.id)).toEqual({ age: 25 })
    })

    it('lists groups', () => {
      const fs = new FeatureStore()
      fs.createGroup({ name: 'a', features: [] })
      fs.createGroup({ name: 'b', features: [] })
      expect(fs.listGroups()).toHaveLength(2)
    })
  })

  describe('sweep & stats', () => {
    it('removes expired values', async () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.set('age', 'u1', 25, { ttlMs: 30 })
      await new Promise(r => setTimeout(r, 60))
      const n = fs.sweep()
      expect(n).toBeGreaterThan(0)
    })

    it('stats', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.upsertEntity({ id: 'u1', type: 'user' })
      fs.set('age', 'u1', 25)
      const s = fs.stats()
      expect(s.definitions).toBe(1)
      expect(s.entities).toBe(1)
      expect(s.values).toBe(1)
    })

    it('clear all', () => {
      const fs = new FeatureStore()
      fs.defineFeature({ name: 'age', dataType: 'int' })
      fs.clear()
      expect(fs.stats().definitions).toBe(0)
    })

    it('singleton lifecycle', () => {
      resetFeatureStore()
      const a = getFeatureStore()
      const b = getFeatureStore()
      expect(a).toBe(b)
      resetFeatureStore()
    })
  })
})
