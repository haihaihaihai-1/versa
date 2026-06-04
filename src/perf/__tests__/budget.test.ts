// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { PERF_BUDGETS, checkBudget } from '../budget'

describe('性能预算', () => {
  it('默认预算非空', () => {
    expect(PERF_BUDGETS.maxJsBundleKb).toBe(800)
    expect(PERF_BUDGETS.maxLcpMs).toBe(2500)
  })

  it('合规：JS=500KB FCP=1500', () => {
    const r = checkBudget({ jsKb: 500, cssKb: 30, fcpMs: 1500 })
    expect(r.passed).toBe(true)
    expect(r.violations).toHaveLength(0)
  })

  it('违规：JS 超过 800KB', () => {
    const r = checkBudget({ jsKb: 1000, cssKb: 30 })
    expect(r.passed).toBe(false)
    expect(r.violations[0]).toMatch(/JS bundle/)
  })

  it('违规：LCP 超过 2500ms', () => {
    const r = checkBudget({ jsKb: 500, cssKb: 30, lcpMs: 3000 })
    expect(r.passed).toBe(false)
    expect(r.violations[0]).toMatch(/LCP/)
  })

  it('违规：CLS 超过 0.1', () => {
    const r = checkBudget({ jsKb: 500, cssKb: 30, clsScore: 0.15 })
    expect(r.passed).toBe(false)
    expect(r.violations[0]).toMatch(/CLS/)
  })

  it('多违规', () => {
    const r = checkBudget({ jsKb: 900, cssKb: 60, fcpMs: 2000, lcpMs: 3000, clsScore: 0.2 })
    expect(r.passed).toBe(false)
    expect(r.violations.length).toBeGreaterThanOrEqual(3)
  })
})
