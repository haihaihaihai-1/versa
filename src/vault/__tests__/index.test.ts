import { describe, it, expect, beforeEach } from 'vitest'
import { SecretVault, getSecretVault, resetSecretVault } from '../index'

describe('SecretVault - CRUD', () => {
  let v: SecretVault
  beforeEach(() => { v = new SecretVault({ masterKey: 'k' }) })

  it('write and read', () => {
    v.write('db/password', { value: 's3cret' })
    const sv = v.read('db/password')
    expect(sv?.data.value).toBe('s3cret')
    expect(sv?.version).toBe(1)
  })
  it('write increments version', () => {
    v.write('a', { x: '1' })
    v.write('a', { x: '2' })
    const sv = v.read('a')
    expect(sv?.version).toBe(2)
    expect(sv?.data.x).toBe('2')
  })
  it('read specific version', () => {
    v.write('a', { x: '1' })
    v.write('a', { x: '2' })
    const v1 = v.read('a', { version: 1 })
    expect(v1?.data.x).toBe('1')
  })
  it('read missing returns null', () => {
    expect(v.read('missing')).toBeNull()
  })
  it('soft delete', () => {
    v.write('a', { x: '1' })
    v.delete('a')
    expect(v.read('a')).toBeNull()
  })
  it('undelete', () => {
    v.write('a', { x: '1' })
    v.delete('a')
    expect(v.undelete('a')).toBe(true)
    expect(v.read('a')?.data.x).toBe('1')
  })
  it('undelete not deleted', () => {
    v.write('a', { x: '1' })
    expect(v.undelete('a')).toBe(false)
  })
  it('hard destroy', () => {
    v.write('a', { x: '1' })
    v.delete('a', { soft: false })
    expect(v.read('a')).toBeNull()
  })
  it('list with prefix', () => {
    v.write('a/b', { x: '1' }); v.write('a/c', { x: '2' }); v.write('b/d', { x: '3' })
    expect(v.list('a/')).toHaveLength(2)
  })
  it('list with tag filter', () => {
    v.write('a', { x: '1' }, { tags: ['prod'] })
    v.write('b', { x: '2' }, { tags: ['dev'] })
    expect(v.list('', { tag: 'prod' })).toHaveLength(1)
  })
  it('history', () => {
    v.write('a', { x: '1' }); v.write('a', { x: '2' })
    expect(v.history('a')).toHaveLength(2)
  })
})

describe('SecretVault - encryption', () => {
  it('encrypt/decrypt round-trip', () => {
    const v = new SecretVault({ masterKey: 'k' })
    const enc = (v as unknown as { encrypt: (s: string) => { iv: string; ct: string; tag: string } }).encrypt('hello')
    const dec = (v as unknown as { decrypt: (p: { iv: string; ct: string; tag: string }) => string }).decrypt(enc)
    expect(dec).toBe('hello')
  })
  it('decrypt tampered ct fails', () => {
    const v = new SecretVault({ masterKey: 'k' })
    const enc = (v as unknown as { encrypt: (s: string) => { iv: string; ct: string; tag: string } }).encrypt('hello')
    enc.ct = '00'
    expect(() => (v as unknown as { decrypt: (p: { iv: string; ct: string; tag: string }) => string }).decrypt(enc)).toThrow()
  })
})

describe('SecretVault - rotation', () => {
  it('rotates', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' })
    v.rotate('a', { x: '2' })
    expect(v.read('a', { version: 2 })?.data.x).toBe('2')
  })
  it('rotateIfDue', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' }, { rotationIntervalSec: 1 })
    const before = v.read('a')!.data.x
    setTimeout(() => {
      const n = v.rotateIfDue()
      expect(n).toBeGreaterThan(0)
      expect(v.read('a')!.data.x).not.toBe(before)
    }, 1100)
  })
  it('rotateIfDue no due', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' }, { rotationIntervalSec: 10000 })
    expect(v.rotateIfDue()).toBe(0)
  })
})

describe('SecretVault - dynamic secrets', () => {
  it('createDynamicSecret', () => {
    const v = new SecretVault({ masterKey: 'k' })
    const r = v.createDynamicSecret('lease/123', { user: 'temp' }, { ttlSec: 60 })
    expect(r.token.length).toBe(32)
    expect(r.expiresAt).toBeGreaterThan(Date.now())
  })
  it('revokeDynamicSecret', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.createDynamicSecret('lease/123', { user: 'temp' }, { ttlSec: 60 })
    expect(v.revokeDynamicSecret('lease/123')).toBe(true)
  })
})

describe('SecretVault - templates', () => {
  it('resolveTemplate', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('db/pw', { value: 'secret' })
    const out = v.resolveTemplate('pw={{db/pw}}', (p) => v.read(p)?.data.value)
    expect(out).toBe('pw=secret')
  })
  it('expandTemplate', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('db/pw', { user: 'admin', pass: 'x' })
    const out = v.expandTemplate('{{db/pw}}')
    expect(out.user).toBe('admin')
  })
})

describe('SecretVault - policies / RBAC', () => {
  it('addPolicy allows specific actor', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.addPolicy({ path: 'prod/', capabilities: [{ actor: 'alice', ops: ['read', 'write'] }] })
    v.write('prod/x', { x: '1' }, { actor: 'alice' })
    expect(v.read('prod/x', { actor: 'alice' })?.data.x).toBe('1')
  })
  it('policy denies unauthorized', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.addPolicy({ path: 'prod/', capabilities: [{ actor: 'alice', ops: ['read'] }] })
    expect(() => v.write('prod/x', { x: '1' }, { actor: 'bob' })).toThrow()
  })
  it('policy read denied', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.addPolicy({ path: 'prod/', capabilities: [{ actor: 'alice', ops: ['write'] }] })
    v.write('prod/x', { x: '1' }, { actor: 'alice' })
    expect(v.read('prod/x', { actor: 'bob' })).toBeNull()
  })
  it('list policies', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.addPolicy({ path: 'a/', capabilities: [{ actor: 'x', ops: ['read'] }] })
    expect(v.listPolicies()).toHaveLength(1)
  })
  it('remove policy', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.addPolicy({ path: 'a/', capabilities: [{ actor: 'x', ops: ['read'] }] })
    v.removePolicy('a/')
    expect(v.listPolicies()).toHaveLength(0)
  })
  it('wildcard policy path', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.addPolicy({ path: 'team1', capabilities: [{ actor: 'alice', ops: ['read', 'write'] }] })
    v.write('team1/x', { x: '1' }, { actor: 'alice' })
    expect(v.read('team1/x', { actor: 'alice' })?.data.x).toBe('1')
  })
})

describe('SecretVault - audit', () => {
  it('records write', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' })
    const log = v.getAuditLog({ event: 'write' })
    expect(log).toHaveLength(1)
  })
  it('records read', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' })
    v.read('a')
    expect(v.getAuditLog({ event: 'read' })).toHaveLength(1)
  })
  it('records deny', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.addPolicy({ path: 'a', capabilities: [{ actor: 'bob', ops: ['read'] }] })
    try { v.write('a', { x: '1' }, { actor: 'bob' }) } catch { /* denied */ }
    v.read('a', { actor: 'eve' })
    const log = v.getAuditLog()
    const denied = log.filter(a => !a.success).length
    expect(denied).toBeGreaterThan(0)
  })
  it('filter audit by actor', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' }, { actor: 'alice' })
    v.write('b', { x: '2' }, { actor: 'bob' })
    expect(v.getAuditLog({ actor: 'alice' })).toHaveLength(1)
  })
  it('filter audit by since', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' })
    const t = Date.now() + 1000
    expect(v.getAuditLog({ since: t })).toHaveLength(0)
  })
})

describe('SecretVault - backup / restore', () => {
  it('backup and restore', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' })
    const snap = v.backup()
    v.write('a', { x: '2' })
    expect(v.restore(snap)).toBe(true)
  })
  it('restore with tampered MAC', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' })
    const snap = v.backup()
    expect(v.restore(snap + 'X')).toBe(false)
  })
  it('restore invalid JSON', () => {
    const v = new SecretVault({ masterKey: 'k' })
    expect(v.restore('garbage')).toBe(false)
  })
})

describe('SecretVault - bulk', () => {
  it('bulkWrite', () => {
    const v = new SecretVault({ masterKey: 'k' })
    const n = v.bulkWrite([{ path: 'a', data: { x: '1' } }, { path: 'b', data: { x: '2' } }])
    expect(n).toBe(2)
  })
  it('bulkDelete', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' })
    v.write('b', { x: '2' })
    expect(v.bulkDelete(['a', 'b'])).toBe(2)
  })
})

describe('SecretVault - metrics', () => {
  it('totalSecrets', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' })
    v.write('b', { x: '2' })
    expect(v.getMetrics().totalSecrets).toBe(2)
  })
  it('totalVersions', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' })
    v.write('a', { x: '2' })
    expect(v.getMetrics().totalVersions).toBe(2)
  })
  it('totalReads', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' })
    v.read('a')
    v.read('a')
    expect(v.getMetrics().totalReads).toBe(2)
  })
  it('totalWrites', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' })
    v.write('b', { x: '2' })
    expect(v.getMetrics().totalWrites).toBe(2)
  })
  it('totalDeletes', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' })
    v.delete('a')
    expect(v.getMetrics().totalDeletes).toBe(1)
  })
  it('resetMetrics', () => {
    const v = new SecretVault({ masterKey: 'k' })
    v.write('a', { x: '1' })
    v.resetMetrics()
    expect(v.getMetrics().totalWrites).toBe(0)
  })
})

describe('SecretVault - singleton', () => {
  it('singleton', () => {
    resetSecretVault()
    expect(getSecretVault()).toBe(getSecretVault())
  })
})
