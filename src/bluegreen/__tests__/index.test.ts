import { describe, it, expect } from 'vitest'
import {
  BlueGreenDeployer, HealthChecker, getDeployer, resetDeployer,
} from '../index'

describe('HealthChecker', () => {
  it('unknown when no checks', () => {
    const h = new HealthChecker()
    expect(h.status('env1')).toBe('unknown')
  })
  it('healthy after threshold', () => {
    const h = new HealthChecker()
    h.configure('e1', { intervalMs: 1000, timeoutMs: 500, healthyThreshold: 2, unhealthyThreshold: 3 })
    h.record('e1', true, 5)
    h.record('e1', true, 5)
    expect(h.status('e1')).toBe('healthy')
  })
  it('unhealthy after threshold', () => {
    const h = new HealthChecker()
    h.configure('e1', { intervalMs: 1000, timeoutMs: 500, healthyThreshold: 2, unhealthyThreshold: 3 })
    h.record('e1', false, 5)
    h.record('e1', false, 5)
    h.record('e1', false, 5)
    expect(h.status('e1')).toBe('unhealthy')
  })
  it('metrics p95', () => {
    const h = new HealthChecker()
    for (let i = 1; i <= 20; i++) h.record('e1', true, i)
    const m = h.metrics('e1')
    expect(m.total).toBe(20)
    expect(m.success).toBe(20)
    expect(m.p95).toBeGreaterThan(15)
  })
  it('clear specific', () => {
    const h = new HealthChecker()
    h.record('e1', true, 5)
    h.clear('e1')
    expect(h.getChecks('e1')).toHaveLength(0)
  })
  it('clear all', () => {
    const h = new HealthChecker()
    h.record('e1', true, 5)
    h.clear()
    expect(h.getChecks('e1')).toHaveLength(0)
  })
})

describe('BlueGreenDeployer — initial state', () => {
  it('starts with blue active 100%, green 0%', () => {
    const d = new BlueGreenDeployer()
    const s = d.healthSnapshot()
    expect(s.blue.weight).toBe(100)
    expect(s.green.weight).toBe(0)
  })
  it('listEnvironments returns both', () => {
    const d = new BlueGreenDeployer()
    expect(d.listEnvironments()).toHaveLength(2)
  })
  it('getState returns env state', () => {
    const d = new BlueGreenDeployer()
    expect(d.getState('blue').env).toBe('blue')
  })
})

describe('Deploy / promote', () => {
  it('deploy puts version in deploying state', () => {
    const d = new BlueGreenDeployer()
    const v = d.deploy('blue', 'app:v1.0.0')
    expect(v.artifact).toBe('app:v1.0.0')
    expect(d.getState('blue').deploying?.id).toBe(v.id)
    expect(d.getState('blue').status).toBe('deploying')
  })
  it('markDeploySuccess records health', () => {
    const d = new BlueGreenDeployer()
    const v = d.deploy('blue', 'app:v1')
    d.markDeploySuccess('blue', v.id, 50)
    d.markDeploySuccess('blue', v.id, 60)
    expect(d.getState('blue').deploying?.healthChecks.length).toBe(2)
  })
  it('promote makes deploying active', () => {
    const d = new BlueGreenDeployer()
    const v = d.deploy('blue', 'app:v1')
    expect(d.promote('blue')).toBe(true)
    expect(d.getState('blue').activeVersion?.id).toBe(v.id)
  })
  it('promote fails when no deploying', () => {
    const d = new BlueGreenDeployer()
    expect(d.promote('blue')).toBe(false)
  })
  it('drains other env on promote', () => {
    const d = new BlueGreenDeployer()
    d.deploy('blue', 'app:v1')
    d.promote('blue')
    expect(d.getState('green').weight).toBe(0)
  })
  it('subsequent deploy moves previous active to previousVersion', () => {
    const d = new BlueGreenDeployer()
    const v1 = d.deploy('blue', 'app:v1')
    d.promote('blue')
    const v2 = d.deploy('blue', 'app:v2')
    d.promote('blue')
    expect(d.getState('blue').activeVersion?.id).toBe(v2.id)
    expect(d.getState('blue').previousVersion?.id).toBe(v1.id)
  })
})

describe('Traffic control', () => {
  it('setTrafficWeight 50/50', () => {
    const d = new BlueGreenDeployer()
    d.setTrafficWeight('blue', 50)
    expect(d.getState('blue').weight).toBe(50)
    expect(d.getState('green').weight).toBe(50)
  })
  it('setTrafficWeight clamps', () => {
    const d = new BlueGreenDeployer()
    d.setTrafficWeight('blue', 200)
    expect(d.getState('blue').weight).toBe(100)
    d.setTrafficWeight('blue', -10)
    expect(d.getState('blue').weight).toBe(0)
  })
  it('switchTo sets 100', () => {
    const d = new BlueGreenDeployer()
    d.switchTo('green')
    expect(d.getState('green').weight).toBe(100)
  })
  it('routeRequest based on weights', () => {
    const d = new BlueGreenDeployer()
    d.setTrafficWeight('blue', 100)
    expect(d.routeRequest()).toBe('blue')
    d.setTrafficWeight('blue', 0)
    expect(d.routeRequest()).toBe('green')
  })
})

describe('Rollback', () => {
  it('rolls back to previous version', () => {
    const d = new BlueGreenDeployer()
    const v1 = d.deploy('blue', 'app:v1')
    d.promote('blue')
    const v2 = d.deploy('blue', 'app:v2')
    d.promote('blue')
    expect(d.rollback('blue')).toBe(true)
    expect(d.getState('blue').activeVersion?.id).toBe(v1.id)
    expect(d.getState('blue').previousVersion?.id).toBe(v2.id)
  })
  it('fails when no previous', () => {
    const d = new BlueGreenDeployer()
    const v = d.deploy('blue', 'app:v1')
    d.promote('blue')
    expect(d.rollback('blue')).toBe(false)
  })
  it('fails when no active', () => {
    const d = new BlueGreenDeployer()
    expect(d.rollback('blue')).toBe(false)
  })
})

describe('Auto-rollback on health fail', () => {
  it('rolls back automatically', () => {
    const d = new BlueGreenDeployer({ autoRollback: true })
    const v1 = d.deploy('blue', 'app:v1')
    d.promote('blue')
    const v2 = d.deploy('blue', 'app:v2')
    d.markDeployFailure('blue', v2.id, 'crashed')
    // v1 should be back
    expect(d.getState('blue').activeVersion?.id).toBe(v1.id)
  })
  it('does not auto rollback when disabled', () => {
    const d = new BlueGreenDeployer({ autoRollback: false })
    d.deploy('blue', 'app:v1')
    d.promote('blue')
    const v2 = d.deploy('blue', 'app:v2')
    d.markDeployFailure('blue', v2.id, 'crashed')
    // v2 still deploying, active is v1
    expect(d.getState('blue').activeVersion?.artifact).toBe('app:v1')
  })
})

describe('Disable', () => {
  it('disable sends traffic to other', () => {
    const d = new BlueGreenDeployer()
    d.deploy('blue', 'app:v1')
    d.promote('blue')
    d.disable('blue')
    expect(d.getState('blue').weight).toBe(0)
    expect(d.getState('green').weight).toBe(100)
    expect(d.getState('blue').status).toBe('disabled')
  })
})

describe('History & metrics', () => {
  it('records history', () => {
    const d = new BlueGreenDeployer()
    d.deploy('blue', 'app:v1')
    d.promote('blue')
    d.setTrafficWeight('blue', 50)
    expect(d.historyList().length).toBeGreaterThanOrEqual(3)
  })
  it('metrics counts actions', () => {
    const d = new BlueGreenDeployer()
    d.deploy('blue', 'a')
    d.promote('blue')
    d.setTrafficWeight('green', 100)
    const m = d.metrics()
    expect(m.deploys).toBe(1)
    expect(m.promotes).toBe(1)
    expect(m.switches).toBeGreaterThan(0)
  })
  it('reset clears state', () => {
    const d = new BlueGreenDeployer()
    d.deploy('blue', 'a')
    d.promote('blue')
    d.reset()
    expect(d.getState('blue').activeVersion).toBeNull()
  })
})

describe('Singleton', () => {
  it('getDeployer returns same', () => {
    resetDeployer()
    expect(getDeployer()).toBe(getDeployer())
  })
  it('resetDeployer creates new', () => {
    const a = getDeployer()
    resetDeployer()
    expect(a).not.toBe(getDeployer())
  })
})
