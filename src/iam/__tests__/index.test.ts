import { describe, it, expect, beforeEach } from 'vitest'
import { IamService, type PolicyDocument } from '../index'

const allowAll: PolicyDocument = {
  version: '2012-10-17',
  statements: [{ effect: 'Allow', actions: ['*'], resources: ['*'] }],
}
const readOnly: PolicyDocument = {
  version: '2012-10-17',
  statements: [{ effect: 'Allow', actions: ['s3:Get*', 's3:List*'], resources: ['arn:aws:s3:::*'] }],
}
const denyDelete: PolicyDocument = {
  version: '2012-10-17',
  statements: [{ effect: 'Deny', actions: ['s3:Delete*'], resources: ['*'] }],
}

describe('IamService - users', () => {
  let s: IamService
  beforeEach(() => { s = new IamService() })

  it('create and get', () => {
    const u = s.createUser({ name: 'alice', email: 'a@x.com' })
    expect(u.id).toMatch(/^u-/)
    expect(u.name).toBe('alice')
    expect(u.mfaEnabled).toBe(false)
    expect(s.getUser(u.id)?.name).toBe('alice')
  })

  it('create duplicate throws', () => {
    s.createUser({ name: 'alice', email: 'a@x.com' })
    expect(() => s.createUser({ name: 'alice', email: 'a@x.com' })).toThrow()
  })

  it('getUserByName', () => {
    const u = s.createUser({ name: 'bob', email: 'b@x.com' })
    expect(s.getUserByName('bob')?.id).toBe(u.id)
    expect(s.getUserByName('missing')).toBeNull()
  })

  it('listUsers', () => {
    s.createUser({ name: 'a', email: 'a@x.com' })
    s.createUser({ name: 'b', email: 'b@x.com' })
    expect(s.listUsers()).toHaveLength(2)
  })

  it('deleteUser cascades to groups', () => {
    const u = s.createUser({ name: 'a', email: 'a@x.com' })
    const g = s.createGroup('devs')
    s.addUserToGroup(u.id, g.id)
    s.deleteUser(u.id)
    expect(s.getGroup(g.id)?.members).toEqual([])
  })

  it('deleteUser removes access keys', () => {
    const u = s.createUser({ name: 'a', email: 'a@x.com' })
    s.createAccessKey(u.id)
    s.deleteUser(u.id)
    expect(s.listAccessKeys(u.id)).toHaveLength(0)
  })

  it('enableMfa', () => {
    const u = s.createUser({ name: 'a', email: 'a@x.com' })
    s.enableMfa(u.id)
    expect(s.getUser(u.id)?.mfaEnabled).toBe(true)
  })

  it('createUser with type service', () => {
    const u = s.createUser({ name: 'svc', email: 's@x.com', type: 'service' })
    expect(u.type).toBe('service')
  })

  it('addUserToGroup', () => {
    const u = s.createUser({ name: 'a', email: 'a@x.com' })
    const g = s.createGroup('devs')
    s.addUserToGroup(u.id, g.id)
    expect(s.getUser(u.id)?.groups).toContain(g.id)
    expect(s.getGroup(g.id)?.members).toContain(u.id)
  })

  it('addUserToGroup idempotent', () => {
    const u = s.createUser({ name: 'a', email: 'a@x.com' })
    const g = s.createGroup('devs')
    s.addUserToGroup(u.id, g.id)
    s.addUserToGroup(u.id, g.id)
    expect(s.getGroup(g.id)?.members).toHaveLength(1)
  })
})

describe('IamService - groups', () => {
  let s: IamService
  beforeEach(() => { s = new IamService() })

  it('create and attach policy', () => {
    const g = s.createGroup('devs')
    const p = s.createPolicy('admin', allowAll)
    s.attachGroupPolicy(g.id, p.id)
    expect(s.getGroup(g.id)?.attachedPolicies).toContain(p.id)
  })

  it('create duplicate throws', () => {
    s.createGroup('devs')
    expect(() => s.createGroup('devs')).toThrow()
  })
})

describe('IamService - roles', () => {
  let s: IamService
  beforeEach(() => { s = new IamService() })

  it('create role', () => {
    const r = s.createRole('admin', allowAll)
    expect(r.id).toMatch(/^r-/)
    expect(r.maxSessionDuration).toBe(3600)
  })

  it('create role with custom duration', () => {
    const r = s.createRole('admin', allowAll, { maxSessionDuration: 7200 })
    expect(r.maxSessionDuration).toBe(7200)
  })

  it('create duplicate throws', () => {
    s.createRole('admin', allowAll)
    expect(() => s.createRole('admin', allowAll)).toThrow()
  })

  it('attach role policy', () => {
    const r = s.createRole('admin', allowAll)
    const p = s.createPolicy('p', allowAll)
    s.attachRolePolicy(r.id, p.id)
    expect(s.getRole(r.id)?.attachedPolicies).toContain(p.id)
  })

  it('listRoles', () => {
    s.createRole('a', allowAll)
    s.createRole('b', allowAll)
    expect(s.listRoles()).toHaveLength(2)
  })
})

describe('IamService - policies', () => {
  let s: IamService
  beforeEach(() => { s = new IamService() })

  it('create and list', () => {
    s.createPolicy('p1', allowAll)
    s.createPolicy('p2', readOnly)
    expect(s.listPolicies()).toHaveLength(2)
  })

  it('duplicate throws', () => {
    s.createPolicy('p1', allowAll)
    expect(() => s.createPolicy('p1', allowAll)).toThrow()
  })

  it('getPolicy', () => {
    const p = s.createPolicy('p1', allowAll)
    expect(s.getPolicy(p.id)?.name).toBe('p1')
    expect(s.getPolicy('missing')).toBeNull()
  })
})

describe('IamService - sessions', () => {
  let s: IamService
  beforeEach(() => {
    s = new IamService()
    const u = s.createUser({ name: 'a', email: 'a@x.com' })
    s.user_a = u.id
  })
  // helper field; just an alias
  declare global { var user_a: string }

  it('create session', () => {
    const u = s.getUserByName('a')!
    const sess = s.createSession(u.id, { sourceIp: '1.2.3.4' })
    expect(sess.id).toMatch(/^s-/)
    expect(sess.sourceIp).toBe('1.2.3.4')
  })

  it('session requires MFA when enabled', () => {
    const u = s.getUserByName('a')!
    s.enableMfa(u.id)
    expect(() => s.createSession(u.id)).toThrow(/MFA/)
    expect(() => s.createSession(u.id, { mfaPresent: true })).not.toThrow()
  })

  it('getSession', () => {
    const u = s.getUserByName('a')!
    const sess = s.createSession(u.id)
    expect(s.getSession(sess.id)?.id).toBe(sess.id)
  })

  it('revokeSession', () => {
    const u = s.getUserByName('a')!
    const sess = s.createSession(u.id)
    expect(s.revokeSession(sess.id)).toBe(true)
    expect(s.getSession(sess.id)).toBeNull()
  })

  it('session expiry is in the future', () => {
    const u = s.getUserByName('a')!
    const sess = s.createSession(u.id, { durationSec: 60 })
    expect(sess.expiresAt).toBeGreaterThan(sess.issuedAt)
  })
})

describe('IamService - access keys', () => {
  let s: IamService
  beforeEach(() => { s = new IamService(); s.createUser({ name: 'a', email: 'a@x.com' }) })

  it('create and authenticate', () => {
    const u = s.getUserByName('a')!
    const { key, secret } = s.createAccessKey(u.id)
    expect(secret).toMatch(/^sk_/)
    expect(s.authenticate(key.id, secret)).toBe(u.id)
  })

  it('auth fails with wrong secret', () => {
    const u = s.getUserByName('a')!
    const { key } = s.createAccessKey(u.id)
    expect(s.authenticate(key.id, 'wrong')).toBeNull()
  })

  it('auth fails when deactivated', () => {
    const u = s.getUserByName('a')!
    const { key, secret } = s.createAccessKey(u.id)
    s.deactivateAccessKey(key.id)
    expect(s.authenticate(key.id, secret)).toBeNull()
  })

  it('auth fails for missing key', () => {
    expect(s.authenticate('missing', 'x')).toBeNull()
  })

  it('listAccessKeys', () => {
    const u = s.getUserByName('a')!
    s.createAccessKey(u.id)
    s.createAccessKey(u.id)
    expect(s.listAccessKeys(u.id)).toHaveLength(2)
  })
})

describe('IamService - authorize', () => {
  let s: IamService
  beforeEach(() => {
    s = new IamService()
    const u = s.createUser({ name: 'alice', email: 'a@x.com' })
    s.aliceId = u.id
  })
  declare global { var aliceId: string }

  it('denies when no policy attached', () => {
    const u = s.getUserByName('alice')!
    const r = s.authorize(u.id, 's3:GetObject', 'arn:aws:s3:::bucket/key')
    expect(r.allowed).toBe(false)
  })

  it('allows via user policy', () => {
    const u = s.getUserByName('alice')!
    const p = s.createPolicy('admin', allowAll)
    s.attachUserPolicy(u.id, p.id)
    const r = s.authorize(u.id, 's3:GetObject', 'arn:aws:s3:::bucket/key')
    expect(r.allowed).toBe(true)
  })

  it('read-only policy denies Write', () => {
    const u = s.getUserByName('alice')!
    const p = s.createPolicy('ro', readOnly)
    s.attachUserPolicy(u.id, p.id)
    expect(s.authorize(u.id, 's3:GetObject', 'arn:aws:s3:::b/k').allowed).toBe(true)
    expect(s.authorize(u.id, 's3:PutObject', 'arn:aws:s3:::b/k').allowed).toBe(false)
  })

  it('explicit deny overrides allow', () => {
    const u = s.getUserByName('alice')!
    const p1 = s.createPolicy('admin', allowAll)
    const p2 = s.createPolicy('no-del', denyDelete)
    s.attachUserPolicy(u.id, p1.id)
    s.attachUserPolicy(u.id, p2.id)
    expect(s.authorize(u.id, 's3:GetObject', 'arn:aws:s3:::b/k').allowed).toBe(true)
    expect(s.authorize(u.id, 's3:DeleteObject', 'arn:aws:s3:::b/k').allowed).toBe(false)
  })

  it('inherits policies from group', () => {
    const u = s.getUserByName('alice')!
    const g = s.createGroup('devs')
    const p = s.createPolicy('admin', allowAll)
    s.attachGroupPolicy(g.id, p.id)
    s.addUserToGroup(u.id, g.id)
    expect(s.authorize(u.id, 's3:GetObject', 'arn:aws:s3:::b/k').allowed).toBe(true)
  })

  it('pattern wildcard matches', () => {
    const u = s.getUserByName('alice')!
    const p = s.createPolicy('p', {
      version: '2012-10-17',
      statements: [{ effect: 'Allow', actions: ['s3:Get*'], resources: ['arn:aws:s3:::bucket/*'] }],
    })
    s.attachUserPolicy(u.id, p.id)
    expect(s.authorize(u.id, 's3:GetObject', 'arn:aws:s3:::bucket/x').allowed).toBe(true)
    expect(s.authorize(u.id, 's3:PutObject', 'arn:aws:s3:::bucket/x').allowed).toBe(false)
  })

  it('conditions: source IP', () => {
    const u = s.getUserByName('alice')!
    const p = s.createPolicy('p', {
      version: '2012-10-17',
      statements: [{
        effect: 'Allow', actions: ['s3:Get*'], resources: ['*'],
        conditions: { StringEquals: { 'aws:SourceIp': '10.0.0.1' } },
      }],
    })
    s.attachUserPolicy(u.id, p.id)
    expect(s.authorize(u.id, 's3:GetObject', 'b/k', { sourceIp: '10.0.0.1' }).allowed).toBe(true)
    expect(s.authorize(u.id, 's3:GetObject', 'b/k', { sourceIp: '10.0.0.2' }).allowed).toBe(false)
  })

  it('conditions: MFA required', () => {
    const u = s.getUserByName('alice')!
    const p = s.createPolicy('p', {
      version: '2012-10-17',
      statements: [{
        effect: 'Allow', actions: ['s3:Delete*'], resources: ['*'],
        conditions: { StringEquals: { 'aws:MultiFactorAuthPresent': true } },
      }],
    })
    s.attachUserPolicy(u.id, p.id)
    expect(s.authorize(u.id, 's3:DeleteObject', 'b/k', { mfaPresent: true }).allowed).toBe(true)
    expect(s.authorize(u.id, 's3:DeleteObject', 'b/k', { mfaPresent: false }).allowed).toBe(false)
  })

  it('notActions', () => {
    const u = s.getUserByName('alice')!
    const p = s.createPolicy('p', {
      version: '2012-10-17',
      statements: [{ effect: 'Allow', notActions: ['iam:*'], actions: [], resources: ['*'] }],
    })
    s.attachUserPolicy(u.id, p.id)
    expect(s.authorize(u.id, 's3:GetObject', 'b/k').allowed).toBe(true)
    expect(s.authorize(u.id, 'iam:CreateUser', 'arn:aws:iam::1:user/x').allowed).toBe(false)
  })
})

describe('IamService - resource ownership', () => {
  let s: IamService
  beforeEach(() => { s = new IamService() })

  it('owner has all permissions', () => {
    s.setResourceOwner('file-1', 'alice')
    expect(s.hasResourcePermission('file-1', 'alice', 'read')).toBe(true)
  })

  it('grant and check', () => {
    s.setResourceOwner('file-1', 'alice')
    s.grant('file-1', 'bob', 'user', ['read'])
    expect(s.hasResourcePermission('file-1', 'bob', 'read')).toBe(true)
    expect(s.hasResourcePermission('file-1', 'bob', 'write')).toBe(false)
  })

  it('public grant', () => {
    s.setResourceOwner('file-1', 'alice')
    s.grant('file-1', 'public', 'public', ['read'])
    expect(s.hasResourcePermission('file-1', 'anyone', 'read')).toBe(true)
  })

  it('wildcard permission', () => {
    s.setResourceOwner('file-1', 'alice')
    s.grant('file-1', 'bob', 'user', ['*'])
    expect(s.hasResourcePermission('file-1', 'bob', 'delete')).toBe(true)
  })

  it('revoke', () => {
    s.setResourceOwner('file-1', 'alice')
    s.grant('file-1', 'bob', 'user', ['read'])
    s.revoke('file-1', 'bob')
    expect(s.hasResourcePermission('file-1', 'bob', 'read')).toBe(false)
  })

  it('missing resource returns false', () => {
    expect(s.hasResourcePermission('missing', 'x', 'read')).toBe(false)
  })
})

describe('IamService - metrics', () => {
  it('tracks authChecks and allows/denies', () => {
    const s = new IamService()
    const u = s.createUser({ name: 'a', email: 'a@x.com' })
    s.authorize(u.id, 's3:GetObject', 'b/k')
    s.authorize(u.id, 's3:GetObject', 'b/k')
    const m = s.getMetrics()
    expect(m.authChecks).toBe(2)
    expect(m.denies).toBe(2)
  })
})
