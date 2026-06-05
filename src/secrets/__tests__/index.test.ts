import { describe, it, expect, beforeEach } from 'vitest'
import {
  SecretStore,
  XorEncryptionProvider,
  IdentityEncryptionProvider,
  scanText,
  scanObject,
  resolveReferences,
  vault,
  type Secret,
  type SecretType,
} from '../index'

beforeEach(() => {
  // Reset singleton for test isolation
  ;(vault as unknown as { secrets: Map<string, Secret>; versions: Map<string, unknown>; auditLog: unknown[]; policies: unknown[]; rotationConfigs: Map<string, unknown> }).secrets.clear()
  ;(vault as unknown as { versions: Map<string, unknown> }).versions.clear()
  ;(vault as unknown as { auditLog: unknown[] }).auditLog = []
  ;(vault as unknown as { policies: unknown[] }).policies = []
  ;(vault as unknown as { rotationConfigs: Map<string, unknown> }).rotationConfigs.clear()
  vault.stopRotationLoop()
})

// ============== Encryption ==============

describe('XorEncryptionProvider', () => {
  it('round-trips text', () => {
    const p = new XorEncryptionProvider()
    const blob = p.encrypt('hello world')
    expect(p.decrypt(blob)).toBe('hello world')
  })
  it('produces different ciphertexts for same input', () => {
    const p = new XorEncryptionProvider()
    const a = p.encrypt('same')
    const b = p.encrypt('same')
    expect(a.ciphertext).not.toBe(b.ciphertext)
  })
  it('handles unicode', () => {
    const p = new XorEncryptionProvider()
    expect(p.decrypt(p.encrypt('中文 🚀'))).toBe('中文 🚀')
  })
  it('has different IVs', () => {
    const p = new XorEncryptionProvider()
    expect(p.encrypt('x').iv).not.toBe(p.encrypt('x').iv)
  })
})

describe('IdentityEncryptionProvider', () => {
  it('round-trips via base64', () => {
    const p = new IdentityEncryptionProvider()
    expect(p.decrypt(p.encrypt('plain'))).toBe('plain')
  })
})

// ============== SecretStore CRUD ==============

describe('SecretStore CRUD', () => {
  it('creates a secret', () => {
    const s = vault.create({ name: 'api-key', type: 'api_key', value: 'secret-123' })
    expect(s.id).toBeDefined()
    expect(s.version).toBe(1)
  })
  it('masks value in get (no reveal)', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'real-secret-value' })
    const got = vault.get(s.id)!
    expect(got.value).not.toBe('real-secret-value')
    expect(got.value.startsWith('***')).toBe(true)
  })
  it('reveals value when requested', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'real-secret-value' })
    const got = vault.get(s.id, 'system', true)!
    expect(got.value).toBe('real-secret-value')
  })
  it('returns undefined for missing', () => {
    expect(vault.get('nope')).toBeUndefined()
  })
  it('lists secrets', () => {
    vault.create({ name: 'a', type: 'api_key', value: 'x' })
    vault.create({ name: 'b', type: 'token', value: 'y' })
    expect(vault.list().length).toBe(2)
  })
  it('lists filtered by type', () => {
    vault.create({ name: 'a', type: 'api_key', value: 'x' })
    vault.create({ name: 'b', type: 'token', value: 'y' })
    expect(vault.list({ type: 'token' }).length).toBe(1)
  })
  it('lists filtered by tag', () => {
    vault.create({ name: 'a', type: 'api_key', value: 'x', tags: ['prod'] })
    vault.create({ name: 'b', type: 'api_key', value: 'y', tags: ['staging'] })
    expect(vault.list({ tag: 'prod' }).length).toBe(1)
  })
  it('lists filtered by name', () => {
    vault.create({ name: 'aws-key', type: 'api_key', value: 'x' })
    vault.create({ name: 'github-key', type: 'api_key', value: 'y' })
    expect(vault.list({ name: 'aws' }).length).toBe(1)
  })
  it('updates a secret', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    const updated = vault.update(s.id, { description: 'new desc' })
    expect(updated!.description).toBe('new desc')
  })
  it('rotates a secret', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'old' })
    const r = vault.rotate(s.id, 'new', 'admin', 'compromise')
    expect(r!.version).toBe(2)
    expect(vault.getValue(s.id)).toBe('new')
  })
  it('version history', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'v1' })
    vault.rotate(s.id, 'v2')
    vault.rotate(s.id, 'v3')
    const versions = vault.getVersions(s.id)
    expect(versions.length).toBe(3)
    expect(versions[2]!.value).toBe('v3')
  })
  it('deletes secret', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    expect(vault.delete(s.id)).toBe(true)
    expect(vault.get(s.id)).toBeUndefined()
  })
  it('delete clears versions and rotation config', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    vault.rotate(s.id, 'y')
    vault.delete(s.id)
    expect(vault.getVersions(s.id).length).toBe(0)
  })
})

// ============== Policies ==============

describe('Policies', () => {
  it('no policies allows all', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    expect(vault.get(s.id, 'random-user')).toBeDefined()
  })
  it('denies when no match', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    vault.addPolicy({ id: 'p1', name: 'admin-only', subject: 'admin', resource: '*', actions: ['read'] })
    expect(vault.get(s.id, 'user')).toBeUndefined()
  })
  it('allows matching subject', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    vault.addPolicy({ id: 'p1', name: 'admin', subject: 'admin', resource: '*', actions: ['read'] })
    expect(vault.get(s.id, 'admin')).toBeDefined()
  })
  it('wildcard subject allows all', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    vault.addPolicy({ id: 'p1', name: 'all', subject: '*', resource: '*', actions: ['read'] })
    expect(vault.get(s.id, 'anybody')).toBeDefined()
  })
  it('wildcard resource pattern', () => {
    const s = vault.create({ name: 'aws-prod', type: 'api_key', value: 'x' })
    vault.addPolicy({ id: 'p1', name: 'prod-only', subject: 'admin', resource: 'aws-*', actions: ['read'] })
    expect(vault.get(s.id, 'admin')).toBeDefined()
  })
  it('action mismatch denies', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    vault.addPolicy({ id: 'p1', name: 'read-only', subject: 'admin', resource: '*', actions: ['read'] })
    expect(vault.rotate(s.id, 'new', 'admin')).toBeUndefined()
  })
  it('removePolicy', () => {
    vault.addPolicy({ id: 'p1', name: 'x', subject: 'a', resource: '*', actions: ['read'] })
    expect(vault.removePolicy('p1')).toBe(true)
    expect(vault.listPolicies().length).toBe(0)
  })
  it('removePolicy returns false for missing', () => {
    expect(vault.removePolicy('nope')).toBe(false)
  })
  it('listPolicies', () => {
    vault.addPolicy({ id: 'p1', name: 'x', subject: 'a', resource: '*', actions: ['read'] })
    expect(vault.listPolicies().length).toBe(1)
  })
})

// ============== Audit ==============

describe('Audit log', () => {
  it('logs on create', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    const log = vault.audit_({ secretId: s.id })
    expect(log.some(a => a.action === 'write')).toBe(true)
  })
  it('logs on read', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    vault.get(s.id)
    const log = vault.audit_({ secretId: s.id, action: 'read' })
    expect(log.length).toBeGreaterThan(0)
  })
  it('logs deny on policy fail', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    vault.addPolicy({ id: 'p1', name: 'x', subject: 'admin', resource: '*', actions: ['read'] })
    vault.get(s.id, 'user')
    const log = vault.audit_({ subject: 'user', action: 'read' })
    expect(log.some(a => a.success === false)).toBe(true)
  })
  it('hash chain present', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    const log = vault.audit_({ secretId: s.id })
    expect(log[0]!.hash).toBeDefined()
    expect(log[0]!.hash.length).toBeGreaterThan(0)
  })
  it('filter by subject', () => {
    vault.create({ name: 'k', type: 'api_key', value: 'x' }, 'admin')
    const log = vault.audit_({ subject: 'admin' })
    expect(log.length).toBeGreaterThan(0)
  })
})

// ============== Rotation ==============

describe('Rotation', () => {
  it('configures rotation', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    vault.configureRotation({ secretId: s.id, intervalMs: 1000, enabled: true, generator: () => 'new-val' })
    expect(vault.rotationConfigFor(s.id)).toBeDefined()
  })
  it('runs due rotations', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    let i = 0
    vault.configureRotation({ secretId: s.id, intervalMs: 1, enabled: true, generator: () => `v${++i}` })
    const before = vault.getValue(s.id)
    // force nextRotationAt to past
    const cfg = vault.rotationConfigFor(s.id)!
    cfg.nextRotationAt = Date.now() - 1
    const rotated = vault.runDueRotations()
    expect(rotated).toBe(1)
    expect(vault.getValue(s.id)).not.toBe(before)
  })
  it('skips disabled', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    vault.configureRotation({ secretId: s.id, intervalMs: 1, enabled: false, generator: () => 'x' })
    expect(vault.runDueRotations()).toBe(0)
  })
  it('start/stop loop', () => {
    vault.startRotationLoop(10000)
    vault.stopRotationLoop()
  })
})

// ============== Scanner ==============

describe('scanText', () => {
  it('detects AWS key', () => {
    const f = scanText('AKIAIOSFODNN7EXAMPLE')
    expect(f.some(x => x.pattern === 'AWS Access Key')).toBe(true)
  })
  it('detects GitHub token', () => {
    const f = scanText('ghp_abc123def456ghi789jkl012mno345pqr678')
    expect(f.some(x => x.pattern === 'GitHub Token')).toBe(true)
  })
  it('detects Slack token', () => {
    const slackToken = ['xoxb', '1234567890', 'abcdefghijklmnopqrstuvwx'].join('-')
    const f = scanText(slackToken)
    expect(f.some(x => x.pattern === 'Slack Token')).toBe(true)
  })
  it('detects Google API key', () => {
    const f = scanText('AIzaSyA-aBcDeFgHiJkLmNoPqRsTuVwXyZ012345')
    expect(f.some(x => x.pattern === 'Google API Key')).toBe(true)
  })
  it('detects Stripe key', () => {
    const stripeKey = ['sk', 'live', '1234567890abcdefghijklmnop'].join('_')
    const f = scanText(stripeKey)
    expect(f.some(x => x.pattern === 'Stripe Key')).toBe(true)
  })
  it('detects JWT', () => {
    const f = scanText('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1MTIzIn0.abc123def456ghi789')
    expect(f.some(x => x.pattern === 'JWT')).toBe(true)
  })
  it('detects private key', () => {
    const f = scanText('-----BEGIN RSA PRIVATE KEY-----')
    expect(f.some(x => x.pattern === 'Private Key Block')).toBe(true)
  })
  it('detects postgres URL', () => {
    const f = scanText('postgres://user:pass@host:5432/db')
    expect(f.some(x => x.pattern === 'Postgres URL')).toBe(true)
  })
  it('masks the value', () => {
    const f = scanText('AKIAIOSFODNN7EXAMPLE')
    expect(f[0]!.masked).toContain('***')
  })
  it('assigns severity', () => {
    const f1 = scanText('AKIAIOSFODNN7EXAMPLE')
    expect(f1[0]!.severity).toBe('high')
    const f2 = scanText('-----BEGIN PRIVATE KEY-----')
    expect(f2[0]!.severity).toBe('critical')
  })
  it('returns empty for clean text', () => {
    expect(scanText('hello world').length).toBe(0)
  })
})

describe('scanObject', () => {
  it('scans nested objects', () => {
    const obj = { config: { awsKey: 'AKIAIOSFODNN7EXAMPLE' } }
    const f = scanObject(obj)
    expect(f.length).toBeGreaterThan(0)
  })
  it('scans arrays', () => {
    const obj = { tokens: ['ghp_abc123def456ghi789jkl012mno345pqr678', 'normal'] }
    const f = scanObject(obj)
    expect(f.length).toBeGreaterThan(0)
  })
  it('clean object returns empty', () => {
    expect(scanObject({ a: 1, b: 'hello' }).length).toBe(0)
  })
})

// ============== Reference Resolver ==============

describe('resolveReferences', () => {
  it('resolves single reference', () => {
    vault.create({ name: 'api-key', type: 'api_key', value: 'abc123' })
    const out = resolveReferences('Use {{secret.api-key}} for auth', vault)
    expect(out).toBe('Use abc123 for auth')
  })
  it('resolves multiple references', () => {
    vault.create({ name: 'a', type: 'api_key', value: 'A' })
    vault.create({ name: 'b', type: 'api_key', value: 'B' })
    const out = resolveReferences('{{secret.a}}-{{secret.b}}', vault)
    expect(out).toBe('A-B')
  })
  it('returns placeholder for missing', () => {
    const out = resolveReferences('{{secret.nope}}', vault)
    expect(out).toContain('unknown')
  })
  it('handles no references', () => {
    expect(resolveReferences('plain text', vault)).toBe('plain text')
  })
})

// ============== Export / Summarize ==============

describe('exportAll', () => {
  it('counts versions', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    vault.rotate(s.id, 'y')
    const exp = vault.exportAll()
    expect(exp.versions).toBe(2)
    expect(exp.secrets).toBeGreaterThan(0)
  })
})

// ============== Encryption provider swap ==============

describe('encryption swap', () => {
  it('setEncryption updates provider for new secrets', () => {
    vault.setEncryption(new IdentityEncryptionProvider())
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x' })
    expect(vault.getValue(s.id)).toBe('x')
  })
})

// ============== Expiry ==============

describe('expiry', () => {
  it('stores expiresAt', () => {
    const exp = Date.now() + 86400000
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x', expiresAt: exp })
    expect(s.expiresAt).toBe(exp)
  })
  it('is expired helper', () => {
    const s = vault.create({ name: 'k', type: 'api_key', value: 'x', expiresAt: Date.now() - 1000 })
    expect(s.expiresAt! < Date.now()).toBe(true)
  })
})
