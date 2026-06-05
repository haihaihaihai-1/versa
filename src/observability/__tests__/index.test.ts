// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { errorTracker, ErrorBoundary } from '../errors'
import { analytics, perfMonitor, PerformanceMonitor } from '../analytics'
import { healthMonitor, circuitBreaker, runStandardHealthChecks } from '../health'

beforeEach(() => {
  localStorage.clear()
  errorTracker.clear()
  analytics.clear()
  errorTracker.setContext({})
  analytics.reset()
  circuitBreaker.resetAll()
  healthMonitor.clear()
})

describe('errors · errorTracker', () => {
  it('captureError 入队', () => {
    const id = errorTracker.captureError(new Error('test'))
    expect(id).toBeTruthy()
    expect(errorTracker.getQueue().length).toBe(1)
  })

  it('captureMessage 入队', () => {
    errorTracker.captureMessage('hello', 'info')
    expect(errorTracker.getQueue().length).toBe(1)
    expect(errorTracker.getQueue()[0].severity).toBe('info')
  })

  it('重复错误 + count', () => {
    errorTracker.captureError(new Error('same'))
    errorTracker.captureError(new Error('same'))
    errorTracker.captureError(new Error('same'))
    const queue = errorTracker.getQueue()
    expect(queue.length).toBe(1)
    expect(queue[0].count).toBe(3)
  })

  it('不同错误 → 多个条目', () => {
    errorTracker.captureError(new Error('a'))
    errorTracker.captureError(new Error('b'))
    expect(errorTracker.getQueue().length).toBe(2)
  })

  it('setUser', () => {
    errorTracker.setUser('u1')
    errorTracker.captureError(new Error('x'))
    expect(errorTracker.getQueue()[0].context.userId).toBe('u1')
  })

  it('addBreadcrumb 限 50', () => {
    for (let i = 0; i < 60; i++) {
      errorTracker.addBreadcrumb({ type: 'custom', message: `b${i}` })
    }
    errorTracker.captureError(new Error('x'))
    expect(errorTracker.getQueue()[0].breadcrumbs.length).toBe(50)
  })

  it('subscribe 通知', () => {
    let captured: any = null
    const unsub = errorTracker.subscribe((e) => { captured = e })
    errorTracker.captureError(new Error('test'))
    expect(captured).not.toBeNull()
    expect(captured.message).toBe('test')
    unsub()
  })

  it('withCapture 成功路径', async () => {
    const r = await errorTracker.withCapture('op', async () => 42)
    expect(r).toBe(42)
  })

  it('withCapture 失败路径抛错 + 上报', async () => {
    let captured = false
    const unsub = errorTracker.subscribe(() => { captured = true })
    await expect(errorTracker.withCapture('op', async () => { throw new Error('boom') })).rejects.toThrow('boom')
    expect(captured).toBe(true)
    unsub()
  })

  it('stats 统计', () => {
    errorTracker.captureError(new Error('a'))
    errorTracker.captureError(new Error('b'))
    errorTracker.captureMessage('m', 'warning')
    const s = errorTracker.getStats()
    expect(s.total).toBe(3)
    expect(s.unique).toBe(3)
    expect(s.bySeverity.error).toBe(2)
    expect(s.bySeverity.warning).toBe(1)
  })
})

describe('analytics', () => {
  it('track 入队', () => {
    analytics.track('test', { foo: 1 })
    expect(analytics.getQueue().length).toBe(1)
  })

  it('identify 设置 user', () => {
    analytics.identify('u1')
    analytics.track('test')
    expect(analytics.getQueue()[0].userId).toBe('u1')
  })

  it('reset 清空 user', () => {
    analytics.identify('u1')
    analytics.reset()
    analytics.track('test')
    const last = analytics.getQueue().slice(-1)[0]
    expect(last.userId).toBeUndefined()
  })

  it('countBy', () => {
    analytics.track('a')
    analytics.track('a')
    analytics.track('b')
    expect(analytics.countBy('a')).toBe(2)
    expect(analytics.countBy('b')).toBe(1)
  })

  it('groupBy', () => {
    analytics.track('page', { path: '/home' })
    analytics.track('page', { path: '/home' })
    analytics.track('page', { path: '/blog' })
    const g = analytics.groupBy('page', 'path')
    expect(g['/home']).toBe(2)
    expect(g['/blog']).toBe(1)
  })

  it('funnel 漏斗', () => {
    analytics.identify('u1')
    analytics.track('view_home')
    analytics.track('view_product')
    analytics.track('purchase')
    analytics.identify('u2')
    analytics.track('view_home')
    analytics.track('view_product')

    const result = analytics.funnel([
      { name: 'home', event: 'view_home' },
      { name: 'product', event: 'view_product' },
      { name: 'purchase', event: 'purchase' },
    ])
    expect(result[0].entered).toBe(2)
    expect(result[1].entered).toBe(2)
    expect(result[2].completed).toBe(1)
    expect(result[2].conversionRate).toBe(0.5)
  })

  it('retention 留存', () => {
    const day = 24 * 60 * 60 * 1000
    const start = Date.now() - 2 * day
    analytics.identify('u1')
    analytics.track('page')  // day 0
    analytics.track('page')  // day 1
    // 模拟 day 2 回来
    const realNow = Date.now
    let now = start + 2 * day
    Date.now = () => now
    analytics.track('page')
    Date.now = realNow

    const r = analytics.retention({ startTs: start, userIds: ['u1'] }, 2)
    expect(r.returned).toBe(1)
    expect(r.rate).toBe(1)
  })

  it('subscribe 通知', () => {
    let calls = 0
    const unsub = analytics.subscribe(() => calls++)
    analytics.track('a')
    analytics.track('b')
    expect(calls).toBe(2)
    unsub()
  })

  it('page 自动埋点', () => {
    analytics.page('/test')
    const last = analytics.getQueue().slice(-1)[0]
    expect(last.name).toBe('pageview')
    expect(last.properties?.name).toBe('/test')
  })
})

describe('perfMonitor', () => {
  it('record + 限 200', () => {
    for (let i = 0; i < 250; i++) perfMonitor.record('m', i)
    expect(perfMonitor.getMarks().length).toBe(200)
  })

  it('rate 分级', () => {
    expect(PerformanceMonitor.rate('LCP', 1000)).toBe('good')
    expect(PerformanceMonitor.rate('LCP', 3000)).toBe('needs-improvement')
    expect(PerformanceMonitor.rate('LCP', 5000)).toBe('poor')
    expect(PerformanceMonitor.rate('CLS', 0.05)).toBe('good')
    expect(PerformanceMonitor.rate('CLS', 0.3)).toBe('poor')
  })
})

describe('circuitBreaker', () => {
  it('初始 closed', () => {
    expect(circuitBreaker.canExecute('k1')).toBe(true)
    expect(circuitBreaker.get('k1').state).toBe('closed')
  })

  it('5 次失败 → open', () => {
    for (let i = 0; i < 5; i++) circuitBreaker.recordFailure('k2')
    expect(circuitBreaker.get('k2').state).toBe('open')
    expect(circuitBreaker.canExecute('k2')).toBe(false)
  })

  it('open 状态拒绝 + 提供 fallback', async () => {
    for (let i = 0; i < 5; i++) circuitBreaker.recordFailure('k3')
    const r = await healthMonitor.call('k3', async () => 'real', { fallback: () => 'fallback' })
    expect(r).toBe('fallback')
  })

  it('recovery 超时 → half-open', () => {
    circuitBreaker.recordFailure('k4')
    circuitBreaker.recordFailure('k4')
    circuitBreaker.recordFailure('k4')
    circuitBreaker.recordFailure('k4')
    circuitBreaker.recordFailure('k4')
    const breaker = circuitBreaker.get('k4')
    if (breaker.nextAttemptAt) {
      // 模拟时间过去
      const realNow = Date.now
      Date.now = () => breaker.nextAttemptAt! + 100
      expect(circuitBreaker.canExecute('k4')).toBe(true)
      circuitBreaker.recordSuccess('k4')
      expect(circuitBreaker.get('k4').state).toBe('closed')
      Date.now = realNow
    }
  })

  it('reset', () => {
    circuitBreaker.recordFailure('k5')
    circuitBreaker.reset('k5')
    expect(circuitBreaker.get('k5').state).toBe('closed')
  })
})

describe('healthMonitor', () => {
  it('check 注册', () => {
    healthMonitor.check('svc1', 'healthy', 'ok')
    expect(healthMonitor.getChecks().length).toBe(1)
    expect(healthMonitor.getOverallState()).toBe('healthy')
  })

  it('有 unhealthy → 整体 unhealthy', () => {
    healthMonitor.check('a', 'healthy')
    healthMonitor.check('b', 'unhealthy')
    expect(healthMonitor.getOverallState()).toBe('unhealthy')
  })

  it('有 degraded + healthy → degraded', () => {
    healthMonitor.check('a', 'healthy')
    healthMonitor.check('b', 'degraded')
    expect(healthMonitor.getOverallState()).toBe('degraded')
  })

  it('runStandardHealthChecks', async () => {
    const c = await runStandardHealthChecks()
    expect(c.length).toBeGreaterThan(0)
    expect(c.some((x) => x.name === 'app')).toBe(true)
    expect(c.some((x) => x.name === 'storage')).toBe(true)
  })

  it('probe 超时 → unhealthy', async () => {
    const c = await healthMonitor.probe('timeout', 'http://127.0.0.1:1/nope', { timeout: 100 })
    expect(c.state).toBe('unhealthy')
  })
})
