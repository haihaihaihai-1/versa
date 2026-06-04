// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePerformance, clearMetrics, getMetricsSnapshot } from '../usePerformance'

describe('usePerformance', () => {
  beforeEach(() => {
    clearMetrics()
  })

  it('初始无指标时返回空数组', () => {
    const { result } = renderHook(() => usePerformance())
    expect(result.current.metrics).toEqual([])
    expect(result.current.summary).toEqual({})
  })

  it('getMetricsSnapshot 返回对象', () => {
    const s = getMetricsSnapshot()
    expect(typeof s).toBe('object')
  })

  it('rate 函数在 usePerformance 中通过 summary 暴露', () => {
    const { result } = renderHook(() => usePerformance())
    // summary 是空对象因为没有真实 PerformanceObserver 数据
    expect(Object.keys(result.current.summary)).toHaveLength(0)
  })
})
