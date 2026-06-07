import { describe, it, expect } from 'vitest'
import { DriftMonitor, getDriftMonitor, resetDriftMonitor } from '../index'

const sampleNumeric = (mean: number, std: number, n: number, seed = 42): number[] => {
  let s = seed
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const boxMuller = (): number => {
    const u1 = Math.max(rand(), 1e-9)
    const u2 = rand()
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  }
  return Array.from({ length: n }, () => mean + std * boxMuller())
}

const sampleCategorical = (categories: string[], probs: number[], n: number, seed = 42): string[] => {
  let s = seed
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  const out: string[] = []
  const cum: number[] = []
  let acc = 0
  for (const p of probs) { acc += p; cum.push(acc) }
  for (let i = 0; i < n; i++) {
    const r = rand()
    let idx = cum.findIndex(c => c >= r)
    if (idx < 0) idx = categories.length - 1
    out.push(categories[idx])
  }
  return out
}

describe('DriftMonitor', () => {
  describe('distribution building', () => {
    it('builds numeric distribution with stats', () => {
      const m = new DriftMonitor()
      const d = m.buildNumericDistribution([1, 2, 3, 4, 5], 4)
      expect(d.type).toBe('numeric')
      expect(d.n).toBe(5)
      expect(d.min).toBe(1)
      expect(d.max).toBe(5)
      expect(d.mean).toBe(3)
      expect(d.histogram).toHaveLength(4)
    })

    it('builds categorical distribution with probs', () => {
      const m = new DriftMonitor()
      const d = m.buildCategoricalDistribution(['a', 'b', 'a', 'c', 'a'])
      expect(d.n).toBe(5)
      expect(d.probs['a']).toBeCloseTo(0.6, 5)
    })
  })

  describe('PSI', () => {
    it('zero drift when distributions match', () => {
      const m = new DriftMonitor()
      const v = sampleNumeric(0, 1, 1000)
      m.setReference('f', 'numeric', v)
      m.setCurrent('f', 'numeric', v)
      const psi = m.computePSI(m.getSnapshot('f')!.reference, m.getSnapshot('f')!.current)
      expect(psi).toBeLessThan(0.01)
    })

    it('detects shift in mean', () => {
      const m = new DriftMonitor()
      m.setReference('f', 'numeric', sampleNumeric(0, 1, 1000))
      m.setCurrent('f', 'numeric', sampleNumeric(1.5, 1, 1000))
      const r = m.detectDrift(m.getSnapshot('f')!)
      expect(r.score).toBeGreaterThan(0.1)
      expect(r.isDrift).toBe(true)
    })

    it('handles categorical PSI with new categories', () => {
      const m = new DriftMonitor()
      m.setReference('cat', 'categorical', sampleCategorical(['a', 'b'], [0.5, 0.5], 500))
      m.setCurrent('cat', 'categorical', sampleCategorical(['a', 'b', 'c'], [0.5, 0.3, 0.2], 500))
      const r = m.detectDrift(m.getSnapshot('cat')!)
      expect(r.isDrift).toBe(true)
    })
  })

  describe('KS', () => {
    it('zero KS for identical samples', () => {
      const m = new DriftMonitor()
      const v = sampleNumeric(0, 1, 500)
      m.setReference('f', 'numeric', v)
      m.setCurrent('f', 'numeric', v)
      const r = m.computeKS(m.getSnapshot('f')!.reference as unknown as Parameters<DriftMonitor['computeKS']>[0], m.getSnapshot('f')!.current as unknown as Parameters<DriftMonitor['computeKS']>[1])
      expect(r.statistic).toBe(0)
    })

    it('detects shift', () => {
      const m = new DriftMonitor()
      m.setReference('f', 'numeric', sampleNumeric(0, 1, 500))
      m.setCurrent('f', 'numeric', sampleNumeric(2, 1, 500))
      const r = m.computeKS(m.getSnapshot('f')!.reference as unknown as Parameters<DriftMonitor['computeKS']>[0], m.getSnapshot('f')!.current as unknown as Parameters<DriftMonitor['computeKS']>[1])
      expect(r.statistic).toBeGreaterThan(0.3)
    })
  })

  describe('chi-square', () => {
    it('zero chi-square for identical distributions', () => {
      const m = new DriftMonitor()
      const v = sampleCategorical(['a', 'b', 'c'], [0.5, 0.3, 0.2], 500)
      m.setReference('c', 'categorical', v)
      m.setCurrent('c', 'categorical', v)
      const r = m.computeChiSquare(m.getSnapshot('c')!.reference as unknown as Parameters<DriftMonitor['computeChiSquare']>[0], m.getSnapshot('c')!.current as unknown as Parameters<DriftMonitor['computeChiSquare']>[1])
      expect(r.statistic).toBeCloseTo(0, 5)
    })

    it('detects category imbalance shift', () => {
      const m = new DriftMonitor()
      m.setReference('c', 'categorical', sampleCategorical(['a', 'b', 'c'], [0.5, 0.3, 0.2], 500))
      m.setCurrent('c', 'categorical', sampleCategorical(['a', 'b', 'c'], [0.1, 0.8, 0.1], 500))
      const r = m.computeChiSquare(m.getSnapshot('c')!.reference as unknown as Parameters<DriftMonitor['computeChiSquare']>[0], m.getSnapshot('c')!.current as unknown as Parameters<DriftMonitor['computeChiSquare']>[1])
      expect(r.statistic).toBeGreaterThan(0)
    })
  })

  describe('JS divergence', () => {
    it('zero for identical', () => {
      const m = new DriftMonitor()
      const v = sampleNumeric(0, 1, 500)
      m.setReference('f', 'numeric', v)
      m.setCurrent('f', 'numeric', v)
      const r = m.computeJSDivergence(m.getSnapshot('f')!.reference, m.getSnapshot('f')!.current)
      expect(r).toBeLessThan(0.01)
    })

    it('positive for shift', () => {
      const m = new DriftMonitor()
      m.setReference('f', 'numeric', sampleNumeric(0, 1, 500))
      m.setCurrent('f', 'numeric', sampleNumeric(0, 1, 500).map(v => v + 2))
      const r = m.computeJSDivergence(m.getSnapshot('f')!.reference, m.getSnapshot('f')!.current)
      expect(r).toBeGreaterThan(0.05)
    })
  })

  describe('detection & alerts', () => {
    it('severity classification', () => {
      const m = new DriftMonitor()
      m.setReference('f', 'numeric', sampleNumeric(0, 1, 1000))
      m.setCurrent('f', 'numeric', sampleNumeric(2, 1, 1000))
      const r = m.detectDrift(m.getSnapshot('f')!)
      expect(['minor', 'major', 'critical']).toContain(r.severity)
    })

    it('detectAllDrift', () => {
      const m = new DriftMonitor()
      m.setReference('a', 'numeric', sampleNumeric(0, 1, 500))
      m.setReference('b', 'numeric', sampleNumeric(0, 1, 500))
      m.setCurrent('a', 'numeric', sampleNumeric(0, 1, 500))
      m.setCurrent('b', 'numeric', sampleNumeric(1, 1, 500))
      const results = m.detectAllDrift()
      expect(results).toHaveLength(2)
      const b = results.find(r => r.featureName === 'b')!
      expect(b.isDrift).toBe(true)
    })

    it('raises and acknowledges alerts', () => {
      const m = new DriftMonitor()
      m.setReference('f', 'numeric', sampleNumeric(0, 1, 500))
      m.setCurrent('f', 'numeric', sampleNumeric(2, 1, 500))
      const r = m.detectDrift(m.getSnapshot('f')!)
      const alert = m.raiseAlert(r)
      expect(alert).not.toBeNull()
      expect(alert!.id).toMatch(/^alert_/)
      expect(m.listAlerts({ unacknowledged: true })).toHaveLength(1)
      expect(m.acknowledgeAlert(alert!.id, 'analyst')).toBe(true)
      expect(m.listAlerts({ unacknowledged: true })).toHaveLength(0)
    })

    it('returns null for non-drift alert', () => {
      const m = new DriftMonitor()
      m.setReference('f', 'numeric', sampleNumeric(0, 1, 500))
      m.setCurrent('f', 'numeric', sampleNumeric(0, 1, 500))
      const r = m.detectDrift(m.getSnapshot('f')!)
      expect(m.raiseAlert(r)).toBeNull()
    })

    it('lists alerts by severity and feature', () => {
      const m = new DriftMonitor()
      m.setReference('a', 'numeric', sampleNumeric(0, 1, 500))
      m.setReference('b', 'numeric', sampleNumeric(0, 1, 500))
      m.setCurrent('a', 'numeric', sampleNumeric(2, 1, 500))
      m.setCurrent('b', 'numeric', sampleNumeric(2, 1, 500))
      for (const name of ['a', 'b']) {
        const r = m.detectDrift(m.getSnapshot(name)!)
        m.raiseAlert(r)
      }
      expect(m.listAlerts({ featureName: 'a' })).toHaveLength(1)
      expect(m.listAlerts().length).toBe(2)
    })
  })

  describe('stats', () => {
    it('reports drift rate and alert counts', () => {
      const m = new DriftMonitor()
      m.setReference('a', 'numeric', sampleNumeric(0, 1, 500))
      m.setReference('b', 'numeric', sampleNumeric(0, 1, 500))
      m.setCurrent('a', 'numeric', sampleNumeric(0, 1, 500))
      m.setCurrent('b', 'numeric', sampleNumeric(2, 1, 500))
      m.detectAllDrift().forEach(r => m.raiseAlert(r))
      const s = m.stats()
      expect(s.features).toBe(2)
      expect(s.driftRate).toBeCloseTo(0.5, 5)
      expect(s.totalAlerts).toBe(1)
    })
  })

  describe('config', () => {
    it('overrides thresholds via constructor and update', () => {
      const m = new DriftMonitor({ psiThresholds: { minor: 0.05, major: 0.1, critical: 0.2 } })
      expect(m.getConfig().psiThresholds.minor).toBe(0.05)
      m.updateConfig({ ksThreshold: 0.05 })
      expect(m.getConfig().ksThreshold).toBe(0.05)
    })
  })

  describe('lifecycle', () => {
    it('singleton lifecycle', () => {
      resetDriftMonitor()
      const a = getDriftMonitor()
      const b = getDriftMonitor()
      expect(a).toBe(b)
      resetDriftMonitor()
    })

    it('clear empties everything', () => {
      const m = new DriftMonitor()
      m.setReference('a', 'numeric', sampleNumeric(0, 1, 100))
      m.clear()
      expect(m.listSnapshots()).toHaveLength(0)
    })
  })
})
