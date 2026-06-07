import { describe, it, expect } from 'vitest'
import { ModelRegistry, getModelRegistry, resetModelRegistry } from '../index'

describe('ModelRegistry', () => {
  describe('version registration', () => {
    it('registers first version as v1', () => {
      const r = new ModelRegistry()
      const v = r.registerVersion({ modelName: 'ctr', framework: 'pytorch' })
      expect(v.version).toBe(1)
      expect(v.stage).toBe('dev')
      expect(r.listVersions('ctr')).toHaveLength(1)
    })

    it('auto-increments version', () => {
      const r = new ModelRegistry()
      const v1 = r.registerVersion({ modelName: 'ctr' })
      const v2 = r.registerVersion({ modelName: 'ctr' })
      expect(v2.version).toBe(v1.version + 1)
    })

    it('uses explicit version', () => {
      const r = new ModelRegistry()
      const v = r.registerVersion({ modelName: 'ctr', version: 7 })
      expect(v.version).toBe(7)
    })

    it('rejects duplicate version', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'ctr', version: 1 })
      expect(() => r.registerVersion({ modelName: 'ctr', version: 1 })).toThrow('already exists')
    })

    it('records initial stage transition', () => {
      const r = new ModelRegistry()
      const v = r.registerVersion({ modelName: 'ctr' })
      const t = r.getTransitions(v.id)
      expect(t[0].fromStage).toBe('dev')
      expect(t[0].toStage).toBe('dev')
    })
  })

  describe('lookup', () => {
    it('getVersion by name+version', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'ctr' })
      const v = r.getVersion('ctr', 1)
      expect(v?.id).toBeDefined()
    })

    it('getVersionById', () => {
      const r = new ModelRegistry()
      const v = r.registerVersion({ modelName: 'ctr' })
      expect(r.getVersionById(v.id)?.modelName).toBe('ctr')
    })

    it('listModelNames', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'a' })
      r.registerVersion({ modelName: 'b' })
      expect(r.listModelNames().sort()).toEqual(['a', 'b'])
    })

    it('search by name, tag, stage, framework', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'ctr', framework: 'pytorch', tags: ['rec'] })
      r.registerVersion({ modelName: 'churn', framework: 'sklearn', tags: ['cls'] })
      r.registerVersion({ modelName: 'ctr2', framework: 'pytorch', tags: ['rec'] })
      expect(r.search({ framework: 'pytorch' })).toHaveLength(2)
      expect(r.search({ tag: 'rec' })).toHaveLength(2)
      expect(r.search({ name: 'ctr' })).toHaveLength(2)
      expect(r.search({ stage: 'dev' })).toHaveLength(3)
    })
  })

  describe('stage transitions', () => {
    it('transitions dev -> staging -> production', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'ctr' })
      r.transitionStage('ctr', 1, 'staging')
      r.transitionStage('ctr', 1, 'production')
      expect(r.getVersion('ctr', 1)?.stage).toBe('production')
      expect(r.getProductionVersion('ctr')?.version).toBe(1)
    })

    it('records transition history', () => {
      const r = new ModelRegistry()
      const v = r.registerVersion({ modelName: 'ctr' })
      r.transitionStage('ctr', 1, 'staging', { by: 'alice' })
      r.transitionStage('ctr', 1, 'production', { by: 'bob', reason: 'approved' })
      const tx = r.getTransitions(v.id)
      expect(tx).toHaveLength(3)
      expect(tx[1].by).toBe('alice')
      expect(tx[2].reason).toBe('approved')
    })

    it('rejects invalid transition (dev->production direct)', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'ctr' })
      expect(() => r.transitionStage('ctr', 1, 'production')).toThrow('invalid')
    })

    it('rejects transition from archived', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'ctr' })
      r.transitionStage('ctr', 1, 'staging', { force: true })
      r.transitionStage('ctr', 1, 'archived', { force: true })
      expect(() => r.transitionStage('ctr', 1, 'dev')).toThrow('invalid')
    })

    it('only one production version per model', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'ctr' })
      r.registerVersion({ modelName: 'ctr' })
      r.transitionStage('ctr', 1, 'staging', { force: true })
      r.transitionStage('ctr', 1, 'production')
      r.transitionStage('ctr', 2, 'staging', { force: true })
      r.transitionStage('ctr', 2, 'production')
      expect(r.getProductionVersion('ctr')?.version).toBe(2)
    })

    it('force bypasses rules', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'ctr' })
      r.transitionStage('ctr', 1, 'production', { force: true })
      expect(r.getVersion('ctr', 1)?.stage).toBe('production')
    })

    it('promoteToProduction helper', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'ctr' })
      r.transitionStage('ctr', 1, 'staging', { force: true })
      r.promoteToProduction('ctr', 1, 'admin')
      expect(r.getProductionVersion('ctr')).toBeDefined()
    })
  })

  describe('artifacts', () => {
    it('adds text artifact', () => {
      const r = new ModelRegistry()
      const v = r.registerVersion({ modelName: 'ctr' })
      const a = r.addTextArtifact('ctr', 1, 'weights', 'model.bin', 'binary-bytes')
      expect(a.size).toBeGreaterThan(0)
      expect(a.checksum).toMatch(/^ck_/)
      expect(r.getVersion('ctr', 1)?.artifacts).toHaveLength(1)
    })

    it('adds binary artifact with custom data', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'ctr' })
      const data = new Uint8Array([1, 2, 3, 4, 5])
      const a = r.addArtifact('ctr', 1, { type: 'weights', filename: 'a.bin', data })
      expect(a.size).toBe(5)
      expect(a.data).toEqual(data)
    })

    it('removes artifact', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'ctr' })
      const a = r.addTextArtifact('ctr', 1, 'config', 'config.json', '{}')
      expect(r.removeArtifact(r.getVersion('ctr', 1)!.id, a.id)).toBe(true)
      expect(r.getVersion('ctr', 1)?.artifacts).toHaveLength(0)
    })
  })

  describe('lineage', () => {
    it('builds lineage graph', () => {
      const r = new ModelRegistry()
      const v1 = r.registerVersion({ modelName: 'ctr' })
      const v2 = r.registerVersion({ modelName: 'ctr', parentVersionId: v1.id })
      const lin = r.getLineage('ctr')
      expect(lin.versions).toHaveLength(2)
      expect(lin.rootVersionId).toBe(v1.id)
      expect(lin.transitions.length).toBeGreaterThan(0)
    })

    it('throws for unknown model', () => {
      const r = new ModelRegistry()
      expect(() => r.getLineage('nope')).toThrow('not found')
    })
  })

  describe('stats', () => {
    it('counts by stage and bytes', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'a' })
      r.registerVersion({ modelName: 'a' })
      r.registerVersion({ modelName: 'b' })
      r.transitionStage('a', 1, 'staging', { force: true })
      r.transitionStage('a', 1, 'production')
      r.addTextArtifact('a', 2, 'weights', 'm.bin', 'abc')
      const s = r.stats()
      expect(s.totalModels).toBe(2)
      expect(s.totalVersions).toBe(3)
      expect(s.byStage.production).toBe(1)
      expect(s.byStage.dev).toBe(2)
      expect(s.totalArtifactBytes).toBe(3)
      expect(s.productionModels).toBe(1)
    })
  })

  describe('lifecycle', () => {
    it('singleton lifecycle', () => {
      resetModelRegistry()
      const a = getModelRegistry()
      const b = getModelRegistry()
      expect(a).toBe(b)
      resetModelRegistry()
    })

    it('clear empties everything', () => {
      const r = new ModelRegistry()
      r.registerVersion({ modelName: 'a' })
      r.clear()
      expect(r.listModelNames()).toHaveLength(0)
    })
  })
})
