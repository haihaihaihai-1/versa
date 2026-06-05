/**
 * Versa · Privacy / GDPR Tests (v30.0)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  consents, classifier, anonymizer, exporter, eraser, retention, dsrService,
  cookieConsent, dataStore, persistPrivacy, loadPrivacy, summarizePrivacy,
  type ConsentPurpose, type AnonymizeMethod, type DataCategory, type PIIKind,
} from '../index'

// ============== ConsentManager ==============

describe('ConsentManager', () => {
  beforeEach(() => {
    consents.clear()
    consents.setCurrentPolicy({ id: 'p1', version: '1.0.0', effectiveAt: Date.now(), summary: 'initial', text: '...' })
  })

  it('grants and queries consent', () => {
    consents.grant('u1', 'analytics', 'banner')
    expect(consents.isGranted('u1', 'analytics')).toBe(true)
    expect(consents.isGranted('u1', 'marketing')).toBe(false)
  })

  it('denies and queries consent', () => {
    consents.deny('u1', 'marketing', 'banner')
    expect(consents.get('u1', 'marketing')?.status).toBe('denied')
  })

  it('snapshot returns latest status per purpose', () => {
    consents.grant('u1', 'analytics', 'banner')
    consents.deny('u1', 'analytics', 'settings')
    const snap = consents.snapshot('u1')
    expect(snap.analytics).toBe('denied')
  })

  it('history tracks all changes', () => {
    consents.grant('u1', 'analytics', 'banner')
    consents.deny('u1', 'analytics', 'settings')
    expect(consents.history('u1', 'analytics')).toHaveLength(2)
  })

  it('revokeAll denies all non-essential', () => {
    consents.grant('u1', 'analytics', 'banner')
    consents.grant('u1', 'marketing', 'banner')
    consents.revokeAll('u1', 'settings')
    expect(consents.isGranted('u1', 'analytics')).toBe(false)
    expect(consents.isGranted('u1', 'marketing')).toBe(false)
  })

  it('current policy version is stamped on consents', () => {
    consents.setCurrentPolicy({ id: 'p2', version: '2.0.0', effectiveAt: Date.now(), summary: 'update', text: '...' })
    const c = consents.grant('u1', 'analytics', 'banner')
    expect(c.version).toBe('2.0.0')
  })
})

// ============== DataClassifier ==============

describe('DataClassifier', () => {
  it('detects email in text', () => {
    const matches = classifier.scanText('contact alice@example.com for details')
    expect(matches).toHaveLength(1)
    expect(matches[0]!.kind).toBe('email')
    expect(matches[0]!.value).toBe('alice@example.com')
  })

  it('detects phone numbers', () => {
    const matches = classifier.scanText('call 555-123-4567 or 13800138000')
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(matches.some(m => m.kind === 'phone')).toBe(true)
  })

  it('detects IP addresses', () => {
    const matches = classifier.scanText('server 192.168.1.1 accessed from 8.8.8.8')
    expect(matches.filter(m => m.kind === 'ip')).toHaveLength(2)
  })

  it('detects ID cards (CN 18 digits)', () => {
    const matches = classifier.scanText('ID: 110101199003078888')
    expect(matches.some(m => m.kind === 'idcard')).toBe(true)
  })

  it('classifies record by field names', () => {
    const rec = { name: 'Alice', email: 'a@b.com', age: 30, address: '123 Main St' }
    const matches = classifier.classifyRecord(rec)
    const kinds = matches.map(m => m.kind)
    expect(kinds).toContain('name')
    expect(kinds).toContain('email')
    expect(kinds).toContain('address')
  })

  it('adds custom rule', () => {
    classifier.addRule({ kind: 'biometric', pattern: /FACE-\d{4}/g, confidence: 0.9 })
    const m = classifier.scanText('scan FACE-1234 to login')
    expect(m.some(x => x.kind === 'biometric')).toBe(true)
  })
})

// ============== Anonymizer ==============

describe('Anonymizer', () => {
  beforeEach(() => anonymizer.reset())

  it('redacts PII fields', () => {
    const { data, redactions } = anonymizer.anonymize({ name: 'Alice', email: 'a@b.com', age: 30 }, { method: 'redact' })
    expect((data as Record<string, unknown>).email).toBe('[REDACTED:email]')
    expect((data as Record<string, unknown>).name).toBe('[REDACTED:name]')
    expect((data as Record<string, unknown>).age).toBe(30)  // not a PII field
    expect(redactions.length).toBe(2)
  })

  it('masks email keeping first char + domain', () => {
    const { data } = anonymizer.anonymize({ email: 'alice@example.com' }, { method: 'mask' })
    const e = (data as Record<string, unknown>).email as string
    expect(e).toMatch(/^a\*+@example\.com$/)
  })

  it('hashes values deterministically', () => {
    const { data: d1 } = anonymizer.anonymize({ email: 'a@b.com' }, { method: 'hash', salt: 's1' })
    const { data: d2 } = anonymizer.anonymize({ email: 'a@b.com' }, { method: 'hash', salt: 's1' })
    const { data: d3 } = anonymizer.anonymize({ email: 'a@b.com' }, { method: 'hash', salt: 's2' })
    expect((d1 as Record<string, unknown>).email).toBe((d2 as Record<string, unknown>).email)
    expect((d1 as Record<string, unknown>).email).not.toBe((d3 as Record<string, unknown>).email)
  })

  it('pseudonymize produces stable opaque id', () => {
    const { data } = anonymizer.anonymize({ email: 'a@b.com' }, { method: 'pseudonymize' })
    const e = (data as Record<string, unknown>).email as string
    expect(e).toMatch(/^pseudo-[a-f0-9]+$/)
  })

  it('skips specified fields', () => {
    const { data, redactions } = anonymizer.anonymize({ email: 'a@b.com', name: 'Alice' }, { method: 'redact', skipFields: ['name'] })
    expect((data as Record<string, unknown>).name).toBe('Alice')
    expect(redactions.length).toBe(1)
  })

  it('applies only to specified fields when set', () => {
    const { data, redactions } = anonymizer.anonymize({ email: 'a@b.com', name: 'Alice' }, { method: 'redact', fields: ['email'] })
    expect((data as Record<string, unknown>).email).toBe('[REDACTED:email]')
    expect((data as Record<string, unknown>).name).toBe('Alice')
    expect(redactions.length).toBe(1)
  })

  it('recursively anonymizes nested objects and arrays', () => {
    const { data, redactions } = anonymizer.anonymize({ user: { email: 'a@b.com' }, list: [{ phone: '555-1234' }] }, { method: 'redact' })
    expect(redactions.length).toBe(2)
    expect(JSON.stringify(data)).toContain('REDACTED')
  })

  it('k-anonymity filters out unique records', () => {
    const records = [
      { age: 20, zip: '10001', disease: 'flu' },
      { age: 20, zip: '10001', disease: 'flu' },
      { age: 20, zip: '10001', disease: 'flu' },
      { age: 30, zip: '20002', disease: 'cold' },
    ]
    const result = anonymizer.kAnonymize(records, ['age', 'zip'], 3)
    expect(result).toHaveLength(3)
  })
})

// ============== DataStore + Exporter ==============

describe('DataExporter', () => {
  beforeEach(() => dataStore.clear())

  it('exports all categories for a user', () => {
    dataStore.put('u1', 'profile', { name: 'Alice' })
    dataStore.put('u1', 'transaction', { amount: 100 })
    const bundle = exporter.export('u1')
    expect(bundle.data.profile).toHaveLength(1)
    expect(bundle.data.transaction).toHaveLength(1)
    expect(bundle.total).toBe(2)
    expect(bundle.checksum).toMatch(/^[a-f0-9]+$/)
  })

  it('empty export has zero records', () => {
    const b = exporter.export('unknown')
    expect(b.total).toBe(0)
  })
})

// ============== Eraser ==============

describe('Eraser', () => {
  beforeEach(() => dataStore.clear())

  it('hard delete removes all categories', () => {
    dataStore.put('u1', 'profile', { x: 1 })
    dataStore.put('u1', 'transaction', { y: 2 })
    const r = eraser.erase('u1', 'hard')
    expect(r.method).toBe('hard')
    expect(dataStore.totalFor('u1')).toBe(0)
    expect(r.deleted.profile).toBe(1)
    expect(r.deleted.transaction).toBe(1)
  })

  it('soft delete anonymizes instead of removing', () => {
    dataStore.put('u1', 'profile', { email: 'a@b.com' })
    const r = eraser.erase('u1', 'soft', { method: 'redact' })
    expect(dataStore.totalFor('u1')).toBe(1)  // still there but anonymized
    expect(r.anonymized.profile).toBeGreaterThan(0)
  })
})

// ============== RetentionPolicy ==============

describe('RetentionManager', () => {
  beforeEach(() => dataStore.clear())

  it('keeps records within retention period', () => {
    dataStore.put('u1', 'session', { ts: Date.now() })
    const action = retention.applyToRecord('u1', 'session', Date.now())
    expect(action).toBe('kept')
  })

  it('deletes records past retention', () => {
    dataStore.put('u1', 'session', { x: 1 })
    const oldTs = Date.now() - 40 * 86_400_000  // 40 days ago
    const action = retention.applyToRecord('u1', 'session', oldTs)
    expect(action).toBe('deleted')
  })

  it('anonymizes behavior records past 365 days', () => {
    dataStore.put('u1', 'behavior', { email: 'a@b.com' })
    const oldTs = Date.now() - 400 * 86_400_000
    const action = retention.applyToRecord('u1', 'behavior', oldTs)
    expect(action).toBe('anonymized')
  })

  it('lists all rules', () => {
    expect(retention.listRules().length).toBeGreaterThan(0)
  })
})

// ============== DSRService ==============

describe('DSRService', () => {
  beforeEach(() => { dsrService.clear(); dataStore.clear() })

  it('creates request with SLA deadline', () => {
    const r = dsrService.create('u1', 'access')
    expect(r.status).toBe('received')
    expect(r.dueAt - r.createdAt).toBeGreaterThan(25 * 86_400_000)
  })

  it('processes access request and produces bundle', () => {
    dataStore.put('u1', 'profile', { name: 'Alice' })
    const r = dsrService.create('u1', 'access')
    const processed = dsrService.process(r.id)
    expect(processed.status).toBe('completed')
    expect(processed.bundle).toBeDefined()
    expect(processed.bundle!.data.profile).toHaveLength(1)
  })

  it('processes portability request', () => {
    dataStore.put('u1', 'profile', { x: 1 })
    const r = dsrService.create('u1', 'portability')
    const processed = dsrService.process(r.id)
    expect(processed.status).toBe('completed')
    expect(processed.bundle).toBeDefined()
  })

  it('processes delete request (erasure)', () => {
    dataStore.put('u1', 'profile', { x: 1 })
    const r = dsrService.create('u1', 'delete')
    const processed = dsrService.process(r.id)
    expect(processed.status).toBe('completed')
    expect(processed.erasureResult).toBeDefined()
    expect(dataStore.totalFor('u1')).toBe(0)
  })

  it('processes object/opt-out by revoking consents', () => {
    consents.clear()
    consents.grant('u1', 'analytics', 'banner')
    const r = dsrService.create('u1', 'opt-out')
    dsrService.process(r.id)
    expect(consents.isGranted('u1', 'analytics')).toBe(false)
  })

  it('lists overdue requests', () => {
    const r = dsrService.create('u1', 'access')
    // Manually push due date to past
    r.dueAt = Date.now() - 1000
    expect(dsrService.list({ overdue: true })).toHaveLength(1)
  })
})

// ============== CookieConsent ==============

describe('CookieConsent', () => {
  beforeEach(() => cookieConsent.clear())

  it('sets and gets cookie consent', () => {
    cookieConsent.set('u1', { analytics: 'granted', marketing: 'denied', personalization: 'granted', 'third-party': 'denied', 'ai-training': 'denied' })
    expect(cookieConsent.hasConsented('u1', 'analytics')).toBe(true)
    expect(cookieConsent.hasConsented('u1', 'marketing')).toBe(false)
  })

  it('expired consent returns undefined', () => {
    const rec = cookieConsent.set('u1', { analytics: 'granted', marketing: 'denied', personalization: 'denied', 'third-party': 'denied', 'ai-training': 'denied' })
    rec.expiresAt = Date.now() - 1
    expect(cookieConsent.get('u1')).toBeUndefined()
  })
})

// ============== Persistence ==============

describe('persistence', () => {
  beforeEach(() => {
    consents.clear()
    dsrService.clear()
    if (typeof localStorage !== 'undefined') localStorage.removeItem('versa.privacy.v1')
  })

  it('persistPrivacy returns consent count', () => {
    consents.setCurrentPolicy({ id: 'p1', version: '1.0.0', effectiveAt: Date.now(), summary: '', text: '' })
    consents.grant('u1', 'analytics', 'banner')
    if (typeof localStorage === 'undefined') return
    expect(persistPrivacy()).toBe(1)
  })

  it('loadPrivacy returns DSR count', () => {
    if (typeof localStorage === 'undefined') return
    persistPrivacy()
    const r = loadPrivacy()
    expect(r.dsrCount).toBeGreaterThanOrEqual(0)
  })
})

// ============== Summarize ==============

describe('summarizePrivacy', () => {
  it('returns aggregated snapshot', () => {
    const s = summarizePrivacy()
    expect(s.metrics).toBeDefined()
    expect(typeof s.metrics.totalConsents).toBe('number')
  })
})
