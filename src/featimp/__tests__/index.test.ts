import { describe, it, expect } from 'vitest'
import { FeatureImportance } from '../index'

const data = [
  { x: 1, y: 2, z: 0 },
  { x: 2, y: 3, z: 1 },
  { x: 3, y: 4, z: 0 },
  { x: 4, y: 5, z: 1 },
  { x: 5, y: 6, z: 0 },
  { x: 6, y: 7, z: 1 },
  { x: 7, y: 8, z: 0 },
  { x: 8, y: 9, z: 1 },
]

const linearModel = (v: { x: number; y: number; z: number }): number => 2 * v.x + 0.1 * v.y - 0.5 * v.z

let fi: FeatureImportance

beforeEachInit()

function beforeEachInit() { fi = new FeatureImportance() }

describe('FeatureImportance', () => {
  it('permutation importance ranks x highest', () => {
    const r = fi.permutationImportance(linearModel, data)
    expect(r[0]!.feature).toBe('x')
  })

  it('permutation importance has positive std', () => {
    const r = fi.permutationImportance(linearModel, data)
    for (const s of r) expect(s.std).toBeGreaterThanOrEqual(0)
  })

  it('ranks are sequential', () => {
    const r = fi.permutationImportance(linearModel, data)
    for (let i = 0; i < r.length; i++) expect(r[i]!.rank).toBe(i + 1)
  })

  it('permutation handles single feature', () => {
    const r = fi.permutationImportance((v: { x: number }) => v.x, [{ x: 1 }, { x: 2 }, { x: 3 }, { x: 4 }], ['x'])
    expect(r).toHaveLength(1)
  })

  it('permutation respects rounds', () => {
    const fr = new FeatureImportance({ permutationRounds: 1, permutationSeed: 1 })
    const r = fr.permutationImportance(linearModel, data)
    expect(r.length).toBe(3)
  })

  it('shap values sum approximately to model(x) - base', () => {
    const r = fi.shapValues(linearModel, { x: 5, y: 5, z: 0 }, data)
    const total = r.reduce((s, v) => s + v.contribution, 0)
    const base = r[0]!.baseValue
    const pred = linearModel({ x: 5, y: 5, z: 0 })
    expect(Math.abs(total - (pred - base))).toBeLessThan(2)
  })

  it('shap values include baseValue and contribution', () => {
    const r = fi.shapValues(linearModel, { x: 5, y: 5, z: 0 }, data)
    for (const s of r) {
      expect(s.baseValue).toBeDefined()
      expect(s.contribution).toBeDefined()
    }
  })

  it('shap handles empty background', () => {
    const r = fi.shapValues(linearModel, { x: 1, y: 1, z: 0 }, [])
    expect(r).toHaveLength(3)
    for (const s of r) expect(s.contribution).toBe(0)
  })

  it('partialDependence returns n+1 points', () => {
    const r = fi.partialDependence(linearModel, data, 'x')
    expect(r).toHaveLength(11)
  })

  it('partialDependence custom grid size', () => {
    const r = fi.partialDependence(linearModel, data, 'x', { gridSize: 5 })
    expect(r).toHaveLength(6)
  })

  it('partialDependence respects min/max', () => {
    const r = fi.partialDependence(linearModel, data, 'x', { min: 0, max: 10, gridSize: 5 })
    expect(r[0]!.x).toBe(0)
    expect(r[r.length - 1]!.x).toBe(10)
  })

  it('partialDependence handles constant feature', () => {
    const r = fi.partialDependence(linearModel, [{ x: 5, y: 1, z: 0 }, { x: 5, y: 2, z: 1 }], 'x')
    expect(r).toHaveLength(1)
  })

  it('partialDependence linear feature gives linear response', () => {
    const r = fi.partialDependence(linearModel, data, 'x', { gridSize: 4 })
    // y should be increasing as x increases
    for (let i = 1; i < r.length; i++) expect(r[i]!.y).toBeGreaterThanOrEqual(r[i - 1]!.y)
  })

  it('report combines all analyses', () => {
    const r = fi.report(linearModel, data, { x: 5, y: 5, z: 0 })
    expect(r.importance.length).toBe(3)
    expect(r.shap.length).toBe(3)
    expect(Object.keys(r.pdp)).toHaveLength(3)
  })

  it('report without instance returns empty shap', () => {
    const r = fi.report(linearModel, data)
    expect(r.shap).toHaveLength(0)
    expect(Object.keys(r.pdp)).toHaveLength(3)
  })

  it('getFeatureImportance singleton', async () => {
    const { getFeatureImportance } = await import('../index')
    const a = getFeatureImportance()
    const b = getFeatureImportance()
    expect(a).toBe(b)
  })

  it('permutation with custom features subset', () => {
    const r = fi.permutationImportance(linearModel, data, ['x'])
    expect(r).toHaveLength(1)
    expect(r[0]!.feature).toBe('x')
  })
})
