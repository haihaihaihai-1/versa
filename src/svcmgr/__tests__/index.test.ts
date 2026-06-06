import { describe, it, expect, vi } from 'vitest'
import { ServiceMesh, getMesh, resetMesh } from '../index'

describe('ServiceMesh', () => {
  describe('service definitions', () => {
    it('defines a service', () => {
      const m = new ServiceMesh()
      const def = m.defineService({ name: 'api', loadBalancing: 'round-robin' })
      expect(def.name).toBe('api')
      expect(m.listServiceDefinitions()).toHaveLength(1)
    })

    it('retrieves a definition', () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'round-robin' })
      expect(m.getServiceDefinition('api')?.loadBalancing).toBe('round-robin')
    })
  })

  describe('instance registration', () => {
    it('registers an instance', () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'round-robin' })
      const inst = m.registerInstance({ service: 'api', host: 'localhost', port: 3000 })
      expect(inst.id).toMatch(/^inst_/)
      expect(m.listInstances('api')).toHaveLength(1)
    })

    it('deregisters an instance', () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'round-robin' })
      const inst = m.registerInstance({ service: 'api', host: 'localhost', port: 3000 })
      expect(m.deregisterInstance(inst.id)).toBe(true)
      expect(m.listInstances('api')).toHaveLength(0)
    })

    it('records health check', () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'round-robin' })
      const inst = m.registerInstance({ service: 'api', host: 'localhost', port: 3000 })
      expect(m.recordHealthCheck(inst.id, 'degraded')).toBe(true)
      expect(inst.health).toBe('degraded')
    })
  })

  describe('load balancing', () => {
    it('round-robin picks in order', () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'round-robin' })
      const a = m.registerInstance({ service: 'api', host: 'a', port: 1 })
      const b = m.registerInstance({ service: 'api', host: 'b', port: 1 })
      const c = m.registerInstance({ service: 'api', host: 'c', port: 1 })
      expect(m.selectInstance('api')?.id).toBe(a.id)
      expect(m.selectInstance('api')?.id).toBe(b.id)
      expect(m.selectInstance('api')?.id).toBe(c.id)
      expect(m.selectInstance('api')?.id).toBe(a.id)
    })

    it('least-connection picks least loaded', () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'least-conn' })
      const a = m.registerInstance({ service: 'api', host: 'a', port: 1 })
      const b = m.registerInstance({ service: 'api', host: 'b', port: 1 })
      a.activeConnections = 5
      b.activeConnections = 2
      expect(m.selectInstance('api')?.id).toBe(b.id)
    })

    it('random picks one', () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'random' })
      m.registerInstance({ service: 'api', host: 'a', port: 1 })
      m.registerInstance({ service: 'api', host: 'b', port: 1 })
      const picked = m.selectInstance('api')
      expect(picked).toBeTruthy()
    })

    it('weighted picks by weight', () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'weighted' })
      m.registerInstance({ service: 'api', host: 'a', port: 1, weight: 90 })
      m.registerInstance({ service: 'api', host: 'b', port: 1, weight: 10 })
      const counts: Record<string, number> = {}
      for (let i = 0; i < 100; i++) {
        const inst = m.selectInstance('api')
        if (inst) counts[inst.host] = (counts[inst.host] ?? 0) + 1
      }
      expect(counts['a']).toBeGreaterThan(counts['b'])
    })

    it('ip-hash is deterministic', () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'ip-hash' })
      m.registerInstance({ service: 'api', host: 'a', port: 1 })
      m.registerInstance({ service: 'api', host: 'b', port: 1 })
      const a1 = m.selectInstance('api', { sourceIp: '10.0.0.1' })
      const a2 = m.selectInstance('api', { sourceIp: '10.0.0.1' })
      expect(a1?.id).toBe(a2?.id)
    })

    it('returns null when no healthy instances', () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'round-robin' })
      expect(m.selectInstance('api')).toBeNull()
    })

    it('skips unhealthy instances', () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'round-robin' })
      const a = m.registerInstance({ service: 'api', host: 'a', port: 1, health: 'unhealthy' })
      const b = m.registerInstance({ service: 'api', host: 'b', port: 1, health: 'healthy' })
      expect(m.selectInstance('api')?.id).toBe(b.id)
    })
  })

  describe('circuit breaker', () => {
    it('opens after threshold failures', async () => {
      const m = new ServiceMesh({ defaultCircuitBreaker: { failureThreshold: 2, successThreshold: 1, openTimeoutMs: 1000, halfOpenMaxRequests: 1 } })
      m.defineService({ name: 'api', loadBalancing: 'round-robin', circuitBreaker: { failureThreshold: 2, successThreshold: 1, openTimeoutMs: 1000, halfOpenMaxRequests: 1 } })
      m.registerInstance({ service: 'api', host: 'a', port: 1 })
      const invoke = () => Promise.resolve({ status: 500 })
      await m.route({ service: 'api' }, invoke).catch(() => null)
      await m.route({ service: 'api' }, invoke).catch(() => null)
      expect(m.getCircuitState('api')).toBe('open')
    })

    it('transitions to half-open after timeout', async () => {
      const m = new ServiceMesh({ defaultCircuitBreaker: { failureThreshold: 1, successThreshold: 1, openTimeoutMs: 10, halfOpenMaxRequests: 1 } })
      m.defineService({ name: 'api', loadBalancing: 'round-robin', circuitBreaker: { failureThreshold: 1, successThreshold: 1, openTimeoutMs: 10, halfOpenMaxRequests: 1 } })
      m.registerInstance({ service: 'api', host: 'a', port: 1 })
      const invoke = () => Promise.resolve({ status: 500 })
      await m.route({ service: 'api' }, invoke).catch(() => null)
      expect(m.getCircuitState('api')).toBe('open')
      await new Promise(r => setTimeout(r, 20))
      const invokeOk = () => Promise.resolve({ status: 200 })
      const r = await m.route({ service: 'api' }, invokeOk)
      expect(r.success).toBe(true)
    })

    it('rejects with circuit-open error', async () => {
      const m = new ServiceMesh({ defaultCircuitBreaker: { failureThreshold: 1, successThreshold: 1, openTimeoutMs: 60_000, halfOpenMaxRequests: 1 } })
      m.defineService({ name: 'api', loadBalancing: 'round-robin', circuitBreaker: { failureThreshold: 1, successThreshold: 1, openTimeoutMs: 60_000, halfOpenMaxRequests: 1 } })
      m.registerInstance({ service: 'api', host: 'a', port: 1 })
      const invoke = () => Promise.resolve({ status: 500 })
      await m.route({ service: 'api' }, invoke).catch(() => null)
      await expect(m.route({ service: 'api' }, invoke)).rejects.toThrow('Circuit open')
    })
  })

  describe('retry', () => {
    it('retries on 5xx', async () => {
      const m = new ServiceMesh({ defaultRetry: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, retryOn: ['5xx'] } })
      m.defineService({ name: 'api', loadBalancing: 'round-robin', retryPolicy: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, retryOn: ['5xx'] } })
      m.registerInstance({ service: 'api', host: 'a', port: 1 })
      let calls = 0
      const invoke = () => { calls++; return Promise.resolve({ status: calls >= 2 ? 200 : 500 }) }
      const r = await m.route({ service: 'api' }, invoke)
      expect(r.success).toBe(true)
      expect(r.attempts).toBe(2)
    })

    it('retries on connection error', async () => {
      const m = new ServiceMesh({ defaultRetry: { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, retryOn: ['connection-error'] } })
      m.defineService({ name: 'api', loadBalancing: 'round-robin', retryPolicy: { maxAttempts: 2, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, retryOn: ['connection-error'] } })
      m.registerInstance({ service: 'api', host: 'a', port: 1 })
      let calls = 0
      const invoke = () => { calls++; return Promise.resolve({ status: 200, error: calls >= 2 ? undefined : 'econnrefused' }) }
      const r = await m.route({ service: 'api' }, invoke)
      expect(r.success).toBe(true)
    })

    it('does not retry on 4xx', async () => {
      const m = new ServiceMesh({ defaultRetry: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, retryOn: ['5xx'] } })
      m.defineService({ name: 'api', loadBalancing: 'round-robin', retryPolicy: { maxAttempts: 3, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, retryOn: ['5xx'] } })
      m.registerInstance({ service: 'api', host: 'a', port: 1 })
      let calls = 0
      const invoke = () => { calls++; return Promise.resolve({ status: 404 }) }
      const r = await m.route({ service: 'api' }, invoke)
      expect(r.attempts).toBe(1)
    })
  })

  describe('mirroring', () => {
    it('configures mirror', () => {
      const m = new ServiceMesh()
      m.configureMirroring('api', 100, ['inst2'])
      expect(m.metrics().mirrors).toBe(1)
    })
  })

  describe('stats & metrics', () => {
    it('service stats', async () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'round-robin', retryPolicy: { maxAttempts: 1, initialDelayMs: 1, maxDelayMs: 10, backoffMultiplier: 2, retryOn: [] } })
      m.registerInstance({ service: 'api', host: 'a', port: 1 })
      await m.route({ service: 'api' }, () => Promise.resolve({ status: 200 }))
      await m.route({ service: 'api' }, () => Promise.resolve({ status: 500 }))
      const s = m.serviceStats('api')
      expect(s.total).toBe(2)
      expect(s.success).toBe(1)
      expect(s.failure).toBe(1)
    })

    it('metrics summary', () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'round-robin' })
      m.registerInstance({ service: 'api', host: 'a', port: 1 })
      const m0 = m.metrics()
      expect(m0.services).toBe(1)
      expect(m0.instances).toBe(1)
    })

    it('clear all', () => {
      const m = new ServiceMesh()
      m.defineService({ name: 'api', loadBalancing: 'round-robin' })
      m.clear()
      expect(m.listServiceDefinitions()).toHaveLength(0)
    })

    it('singleton lifecycle', () => {
      resetMesh()
      const m1 = getMesh()
      const m2 = getMesh()
      expect(m1).toBe(m2)
      resetMesh()
    })
  })
})
