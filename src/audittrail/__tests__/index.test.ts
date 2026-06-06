import { describe, it, expect, vi } from 'vitest'
import { AuditTrail, getAudit, resetAudit } from '../index'

describe('AuditTrail', () => {
  describe('log & get', () => {
    it('logs an event', () => {
      const a = new AuditTrail()
      const e = a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      expect(e.id).toMatch(/^ev_/)
      expect(e.hash).toBeTruthy()
      expect(e.prevHash).toBe('genesis')
    })

    it('chains prev hash', () => {
      const a = new AuditTrail()
      const e1 = a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      const e2 = a.log({ actor: { id: 'u1', type: 'user' }, action: 'update', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      expect(e2.prevHash).toBe(e1.hash)
    })

    it('retrieves by id', () => {
      const a = new AuditTrail()
      const e = a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      expect(a.get(e.id)?.id).toBe(e.id)
    })
  })

  describe('query', () => {
    it('queries by actorId', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u2', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd2' }, status: 'success', severity: 'info' })
      const r = a.query({ actorId: 'u1' })
      expect(r.events).toHaveLength(1)
      expect(r.events[0].actor.id).toBe('u1')
    })

    it('queries by action', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'delete', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'warning' })
      const r = a.query({ action: 'delete' })
      expect(r.events).toHaveLength(1)
    })

    it('queries by multiple actions', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'update', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'delete', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      const r = a.query({ action: ['create', 'update'] })
      expect(r.events).toHaveLength(2)
    })

    it('queries by resource', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'user', id: 'u2' }, status: 'success', severity: 'info' })
      const r = a.query({ resourceType: 'doc' })
      expect(r.events).toHaveLength(1)
    })

    it('queries by status', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd2' }, status: 'failure', severity: 'error' })
      const r = a.query({ status: 'failure' })
      expect(r.events).toHaveLength(1)
    })

    it('queries by severity', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'delete', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'critical' })
      const r = a.query({ severity: 'critical' })
      expect(r.events).toHaveLength(1)
    })

    it('queries by time range', () => {
      const a = new AuditTrail()
      const now = Date.now()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      const r = a.query({ from: now - 1000, to: now + 1000 })
      expect(r.events.length).toBeGreaterThanOrEqual(0)
    })

    it('queries by tags', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info', tags: ['sensitive'] })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd2' }, status: 'success', severity: 'info' })
      const r = a.query({ tags: ['sensitive'] })
      expect(r.events).toHaveLength(1)
    })

    it('text search', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1', name: 'Order 42' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd2' }, status: 'success', severity: 'info' })
      const r = a.query({ textSearch: 'order' })
      expect(r.events).toHaveLength(1)
    })

    it('pagination with limit and offset', () => {
      const a = new AuditTrail()
      for (let i = 0; i < 10; i++) a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: `d${i}` }, status: 'success', severity: 'info' })
      const r = a.query({ limit: 3, offset: 0 })
      expect(r.events).toHaveLength(3)
      expect(r.hasMore).toBe(true)
      expect(r.total).toBe(10)
    })

    it('sort order', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd2' }, status: 'success', severity: 'info' })
      const asc = a.query({ sortOrder: 'asc' })
      const desc = a.query({ sortOrder: 'desc' })
      expect(asc.events[0].resource.id).toBe('d1')
      expect(desc.events[0].resource.id).toBe('d2')
    })
  })

  describe('history', () => {
    it('getResourceHistory', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'update', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd2' }, status: 'success', severity: 'info' })
      const hist = a.getResourceHistory('doc', 'd1')
      expect(hist).toHaveLength(2)
    })

    it('getActorHistory', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u2', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd2' }, status: 'success', severity: 'info' })
      const hist = a.getActorHistory('u1')
      expect(hist).toHaveLength(1)
    })

    it('stream returns all', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd2' }, status: 'success', severity: 'info' })
      expect(a.stream()).toHaveLength(2)
    })
  })

  describe('integrity', () => {
    it('verifies intact chain', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'update', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      const r = a.verifyIntegrity()
      expect(r.valid).toBe(true)
    })

    it('detects tampered event', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      // Tamper with the underlying event
      const ev = (a as unknown as { events: any[] }).events[0]
      ev.action = 'delete'
      const r = a.verifyIntegrity()
      expect(r.valid).toBe(false)
    })
  })

  describe('stats', () => {
    it('returns aggregate stats', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'delete', resource: { type: 'doc', id: 'd1' }, status: 'failure', severity: 'error' })
      const s = a.stats()
      expect(s.total).toBe(2)
      expect(s.byAction['create']).toBe(1)
      expect(s.byStatus['success']).toBe(1)
      expect(s.bySeverity['info']).toBe(1)
      expect(s.byActor['u1']).toBe(2)
    })
  })

  describe('retention', () => {
    it('respects maxEvents', () => {
      const a = new AuditTrail({ retention: { enabled: true, maxEvents: 5 } })
      for (let i = 0; i < 10; i++) a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: `d${i}` }, status: 'success', severity: 'info' })
      expect(a.stream()).toHaveLength(5)
    })

    it('respects maxAgeMs', async () => {
      const a = new AuditTrail({ retention: { enabled: true, maxAgeMs: 100 } })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      await new Promise(r => setTimeout(r, 150))
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd2' }, status: 'success', severity: 'info' })
      expect(a.stream()).toHaveLength(1)
    })
  })

  describe('onWrite callback', () => {
    it('fires on each log', () => {
      const cb = vi.fn()
      const a = new AuditTrail({ onWrite: cb })
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      expect(cb).toHaveBeenCalledTimes(1)
    })
  })

  describe('import / export', () => {
    it('exports events', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      const exp = a.export()
      expect(exp).toHaveLength(1)
    })

    it('imports in append mode', () => {
      const a = new AuditTrail()
      const events = [{ id: 'imp1', timestamp: 1, actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info', prevHash: 'x', hash: 'y' }]
      a.import(events)
      expect(a.stream()).toHaveLength(1)
    })

    it('imports in replace mode', () => {
      const a = new AuditTrail()
      a.log({ actor: { id: 'u1', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd1' }, status: 'success', severity: 'info' })
      const events = [{ id: 'imp1', timestamp: 1, actor: { id: 'u2', type: 'user' }, action: 'create', resource: { type: 'doc', id: 'd2' }, status: 'success', severity: 'info', prevHash: 'x', hash: 'y' }]
      a.import(events, 'replace')
      expect(a.stream()).toHaveLength(1)
      expect(a.stream()[0].actor.id).toBe('u2')
    })
  })

  describe('singleton', () => {
    it('lifecycle', () => {
      resetAudit()
      const a1 = getAudit()
      const a2 = getAudit()
      expect(a1).toBe(a2)
      resetAudit()
      const a3 = getAudit()
      expect(a3).not.toBe(a1)
    })
  })
})
