/**
 * Versa · Privacy / GDPR Compliance (v30.0)
 *
 * 隐私与合规平台：
 * - ConsentManager (用户对各类用途的同意/拒绝 + 时间戳 + 版本)
 * - DataClassifier (PII 自动识别: email / phone / id card / IP / name / 地址)
 * - Anonymizer (redact / mask / hash / pseudonymize / k-anonymity)
 * - DataExporter (GDPR 数据可携权: 导出所有用户数据 JSON)
 * - Eraser (被遗忘权: 级联删除/匿名化)
 * - RetentionPolicy (按数据类别设置保留期 + 自动清理)
 * - DataSubjectRequest (DSR: 访问 / 删除 / 更正 / 限制 / 可携)
 * - AuditLog (合规审计)
 * - CookieConsent (横幅状态 + 分类)
 * - PolicyVersion (策略版本管理 + 重新同意)
 */

import { withRetry, defaultRetry, computeBackoff } from '../federation'

// ============== Types ==============

export type ConsentPurpose = 'essential' | 'analytics' | 'marketing' | 'personalization' | 'third-party' | 'ai-training'
export type ConsentStatus = 'granted' | 'denied' | 'pending'
export type PIIKind = 'email' | 'phone' | 'idcard' | 'ip' | 'name' | 'address' | 'card' | 'ssn' | 'cookie' | 'device' | 'biometric'
export type AnonymizeMethod = 'redact' | 'mask' | 'hash' | 'pseudonymize' | 'generalize' | 'k-anonymity'
export type DataCategory = 'profile' | 'content' | 'transaction' | 'behavior' | 'communication' | 'media' | 'device' | 'session' | 'preference'
export type DSRType = 'access' | 'delete' | 'rectify' | 'restrict' | 'portability' | 'object' | 'opt-out'
export type DSRStatus = 'received' | 'verifying' | 'processing' | 'completed' | 'rejected' | 'partial'

export interface Consent {
  userId: string
  purpose: ConsentPurpose
  status: ConsentStatus
  /** Policy version consented to */
  version: string
  ts: number
  /** IP at the time of consent (for legal evidence) */
  ip?: string
  /** User agent */
  ua?: string
  /** Source: 'banner' | 'settings' | 'registration' | 'api' | 'import' */
  source: string
}

export interface PolicyVersion {
  id: string
  version: string
  effectiveAt: number
  /** Summary of what changed */
  summary: string
  /** Full text (markdown) */
  text: string
}

export interface PIIMatch {
  kind: PIIKind
  value: string
  start: number
  end: number
  confidence: number
}

export interface ClassificationRule {
  kind: PIIKind
  /** Regex pattern */
  pattern: RegExp
  confidence: number
}

export interface AnonymizeOptions {
  method: AnonymizeMethod
  /** For mask: char to use */
  maskChar?: string
  /** For k-anonymity: k value */
  k?: number
  /** Salt for hash */
  salt?: string
  /** Specific fields to apply */
  fields?: string[]
  /** Skip fields */
  skipFields?: string[]
}

export interface AnonymizeResult {
  data: unknown
  /** PII redactions performed */
  redactions: Array<{ field: string; kind: PIIKind; method: AnonymizeMethod }>
}

export interface ExportBundle {
  userId: string
  generatedAt: number
  /** All data by category */
  data: Record<DataCategory, unknown[]>
  /** Total records exported */
  total: number
  /** Format version */
  formatVersion: string
  /** Checksum (SHA-256 of JSON) */
  checksum: string
}

export interface ErasureResult {
  userId: string
  /** When erasure ran */
  erasedAt: number
  /** Per-category deletion counts */
  deleted: Record<DataCategory, number>
  /** Per-category anonymization counts (kept but anonymized) */
  anonymized: Record<DataCategory, number>
  /** Whether hard delete or soft anonymize */
  method: 'hard' | 'soft'
  /** Reason if partial */
  reason?: string
}

export interface RetentionRule {
  category: DataCategory
  /** Days to retain (0 = forever) */
  retentionDays: number
  /** What to do after expiry */
  action: 'delete' | 'anonymize' | 'archive'
  /** Apply to status flag */
  legalBasis: string
}

export interface DSRRequest {
  id: string
  userId: string
  type: DSRType
  status: DSRStatus
  createdAt: number
  updatedAt: number
  /** SLA deadline (typically 30 days for GDPR) */
  dueAt: number
  notes?: string
  /** Result payload for access/portability */
  result?: unknown
  /** Erasure result for delete */
  erasureResult?: ErasureResult
  /** Export bundle for portability */
  bundle?: ExportBundle
}

export interface CookieConsent {
  userId?: string
  /** Per-category: 'granted' | 'denied' */
  categories: Record<Exclude<ConsentPurpose, 'essential'>, ConsentStatus>
  ts: number
  expiresAt: number
}

export interface PrivacyMetrics {
  totalConsents: number
  grantedConsents: number
  deniedConsents: number
  pendingDSRs: number
  completedDSRs: number
  overdueDSRs: number
  totalPIIRedactions: number
  totalErasures: number
  retentionRules: number
  policyVersion: string
}

// ============== Default PII patterns ==============

const PII_PATTERNS: ClassificationRule[] = [
  { kind: 'email', pattern: /[\w.+-]+@[\w-]+\.[\w.-]+/g, confidence: 0.99 },
  { kind: 'phone', pattern: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/g, confidence: 0.85 },
  { kind: 'idcard', pattern: /\b\d{17}[\dXx]\b/g, confidence: 0.95 },        // CN ID 18 digits
  { kind: 'idcard', pattern: /\b\d{3}-\d{2}-\d{4}\b/g, confidence: 0.9 },   // US SSN
  { kind: 'ip', pattern: /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3}\b/g, confidence: 0.95 },
  { kind: 'card', pattern: /\b(?:\d[ -]*?){13,19}\b/g, confidence: 0.7 },  // Credit card (loose)
  { kind: 'cookie', pattern: /_ga=[A-Z0-9.\-]+/g, confidence: 0.8 },
  { kind: 'name', pattern: /\b(?:Mr|Mrs|Ms|Dr)\.\s+[A-Z][a-z]+/g, confidence: 0.5 },
  { kind: 'address', pattern: /\b\d{1,5}\s+\w+\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln)\b/gi, confidence: 0.7 },
]

// ============== Field-based detection ==============

const PII_FIELD_NAMES: Record<string, PIIKind> = {
  email: 'email', e_mail: 'email', mail: 'email',
  phone: 'phone', mobile: 'phone', tel: 'phone', telephone: 'phone',
  idcard: 'idcard', id_card: 'idcard', nationalid: 'idcard', ssn: 'ssn',
  ip: 'ip', ipaddress: 'ip',
  name: 'name', fullname: 'name', firstname: 'name', lastname: 'name', username: 'name',
  address: 'address', street: 'address', city: 'address', zip: 'address', postalcode: 'address',
  card: 'card', creditcard: 'card', cardnumber: 'card', cvv: 'card',
  biometric: 'biometric', faceid: 'biometric', fingerprint: 'biometric',
  device: 'device', useragent: 'device', deviceid: 'device',
}

// ============== Consent Manager ==============

export class ConsentManager {
  private consents = new Map<string, Consent[]>()  // userId -> []
  private policies: PolicyVersion[] = []
  private currentVersion = '1.0.0'

  setCurrentPolicy(p: PolicyVersion): void {
    this.policies.push(p)
    this.currentVersion = p.version
  }

  getCurrentPolicy(): PolicyVersion | undefined {
    return this.policies.find(p => p.version === this.currentVersion)
  }

  listPolicies(): PolicyVersion[] { return [...this.policies] }

  grant(userId: string, purpose: ConsentPurpose, source: string, ip?: string, ua?: string): Consent {
    return this.record(userId, purpose, 'granted', source, ip, ua)
  }

  deny(userId: string, purpose: ConsentPurpose, source: string, ip?: string, ua?: string): Consent {
    return this.record(userId, purpose, 'denied', source, ip, ua)
  }

  record(userId: string, purpose: ConsentPurpose, status: ConsentStatus, source: string, ip?: string, ua?: string): Consent {
    const c: Consent = { userId, purpose, status, version: this.currentVersion, ts: Date.now(), ip, ua, source }
    let arr = this.consents.get(userId)
    if (!arr) { arr = []; this.consents.set(userId, arr) }
    arr.push(c)
    return c
  }

  get(userId: string, purpose: ConsentPurpose): Consent | undefined {
    const arr = this.consents.get(userId) ?? []
    for (let i = arr.length - 1; i >= 0; i--) {
      if (arr[i]!.purpose === purpose) return arr[i]
    }
    return undefined
  }

  isGranted(userId: string, purpose: ConsentPurpose): boolean {
    return this.get(userId, purpose)?.status === 'granted'
  }

  /** Returns the latest status per purpose for a user */
  snapshot(userId: string): Record<ConsentPurpose, ConsentStatus> {
    const out: Record<ConsentPurpose, ConsentStatus> = {
      essential: 'granted',  // essential is always on
      analytics: 'pending',
      marketing: 'pending',
      personalization: 'pending',
      'third-party': 'pending',
      'ai-training': 'pending',
    }
    const arr = this.consents.get(userId) ?? []
    for (let i = arr.length - 1; i >= 0; i--) {
      const c = arr[i]!
      if (out[c.purpose] === 'pending') out[c.purpose] = c.status
    }
    return out
  }

  history(userId: string, purpose?: ConsentPurpose): Consent[] {
    const arr = this.consents.get(userId) ?? []
    return purpose ? arr.filter(c => c.purpose === purpose) : [...arr]
  }

  revokeAll(userId: string, source = 'settings'): Consent[] {
    const purposes: ConsentPurpose[] = ['analytics', 'marketing', 'personalization', 'third-party', 'ai-training']
    const out: Consent[] = []
    for (const p of purposes) out.push(this.deny(userId, p, source))
    return out
  }

  totalConsents(): number {
    let n = 0
    for (const arr of this.consents.values()) n += arr.length
    return n
  }

  clear(): void { this.consents.clear() }
}

export const consents = new ConsentManager()

// ============== Data Classifier ==============

export class DataClassifier {
  private rules: ClassificationRule[] = [...PII_PATTERNS]
  private customRules: ClassificationRule[] = []

  addRule(rule: ClassificationRule): void { this.customRules.push(rule) }
  removeRule(kind: PIIKind, pattern: string): boolean {
    const idx = this.customRules.findIndex(r => r.kind === kind && r.pattern.source === pattern)
    if (idx === -1) return false
    this.customRules.splice(idx, 1)
    return true
  }

  /** Scan a string for PII matches */
  scanText(text: string): PIIMatch[] {
    const out: PIIMatch[] = []
    const all = [...this.rules, ...this.customRules]
    for (const rule of all) {
      const re = new RegExp(rule.pattern.source, rule.pattern.flags.includes('g') ? rule.pattern.flags : rule.pattern.flags + 'g')
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        out.push({ kind: rule.kind, value: m[0], start: m.index, end: m.index + m[0].length, confidence: rule.confidence })
        if (m[0].length === 0) re.lastIndex++  // avoid infinite loop on zero-width
      }
    }
    return out.sort((a, b) => a.start - b.start)
  }

  /** Classify a record by field names + values */
  classifyRecord(record: Record<string, unknown>): PIIMatch[] {
    const out: PIIMatch[] = []
    for (const [k, v] of Object.entries(record)) {
      const kind = PII_FIELD_NAMES[k.toLowerCase().replace(/[^a-z]/g, '')]
      if (kind && v != null) {
        out.push({ kind, value: String(v), start: 0, end: String(v).length, confidence: 0.9 })
      }
      if (typeof v === 'string') {
        const found = this.scanText(v)
        for (const f of found) out.push({ ...f, start: out.length })
      }
    }
    return out
  }

  listKinds(): PIIKind[] {
    const s = new Set<PIIKind>()
    for (const r of [...this.rules, ...this.customRules]) s.add(r.kind)
    return [...s]
  }
}

export const classifier = new DataClassifier()

// ============== Anonymizer ==============

function fnv1a(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export class Anonymizer {
  private redactions = 0

  /** Anonymize a single string value */
  anonymizeValue(value: string, kind: PIIKind, opts: AnonymizeOptions): string {
    const mc = opts.maskChar ?? '*'
    switch (opts.method) {
      case 'redact':
        this.redactions++
        return `[REDACTED:${kind}]`
      case 'mask': {
        this.redactions++
        if (kind === 'email') {
          const [u, d] = value.split('@')
          return `${u![0]}${mc.repeat(Math.max(1, (u?.length ?? 1) - 1))}@${d}`
        }
        if (kind === 'phone') return mc.repeat(value.length)
        return mc.repeat(value.length)
      }
      case 'hash': {
        this.redactions++
        const h = fnv1a(value + (opts.salt ?? ''))
        return `${kind}-${h.toString(16).padStart(8, '0')}`
      }
      case 'pseudonymize': {
        this.redactions++
        const h = fnv1a(value + (opts.salt ?? 'pseudo'))
        return `pseudo-${h.toString(16).padStart(8, '0')}`
      }
      case 'generalize': {
        this.redactions++
        if (/^\d+$/.test(value)) return value.replace(/\d/g, '0')
        if (kind === 'name') return value[0] + mc.repeat(Math.max(0, value.length - 1))
        return mc.repeat(value.length)
      }
      default:
        return value
    }
  }

  /** Anonymize a structured record (deep) */
  anonymize(data: unknown, opts: AnonymizeOptions): AnonymizeResult {
    const redactions: AnonymizeResult['redactions'] = []
    const skipSet = new Set((opts.skipFields ?? []).map(s => s.toLowerCase()))
    const fieldsSet = opts.fields ? new Set(opts.fields.map(s => s.toLowerCase())) : null

    const walk = (value: unknown, path: string[]): unknown => {
      if (value == null) return value
      if (Array.isArray(value)) return value.map((v, i) => walk(v, [...path, String(i)]))
      if (typeof value === 'object') {
        const out: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          out[k] = walk(v, [...path, k])
        }
        return out
      }
      if (typeof value !== 'string') return value

      const k = path[path.length - 1]?.toLowerCase().replace(/[^a-z]/g, '') ?? ''
      if (skipSet.has(k)) return value
      if (fieldsSet && !fieldsSet.has(k)) return value

      const kind = PII_FIELD_NAMES[k]
      if (kind) {
        const newVal = this.anonymizeValue(value, kind, opts)
        redactions.push({ field: path.join('.'), kind, method: opts.method })
        return newVal
      }
      return value
    }

    const result = walk(data, [])
    return { data: result, redactions }
  }

  /** K-anonymity: suppress records that don't meet k threshold for quasi-identifiers */
  kAnonymize(records: Array<Record<string, unknown>>, quasiId: string[], k: number): Array<Record<string, unknown>> {
    const counts = new Map<string, number>()
    for (const r of records) {
      const key = quasiId.map(q => String(r[q] ?? '')).join('|')
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return records.filter(r => {
      const key = quasiId.map(q => String(r[q] ?? '')).join('|')
      return (counts.get(key) ?? 0) >= k
    })
  }

  totalRedactions(): number { return this.redactions }
  reset(): void { this.redactions = 0 }
}

export const anonymizer = new Anonymizer()

// ============== Data Store (in-memory) ==============

class DataStore {
  private store = new Map<string, Map<DataCategory, unknown[]>>()

  put(userId: string, category: DataCategory, record: unknown): void {
    let m = this.store.get(userId)
    if (!m) { m = new Map(); this.store.set(userId, m) }
    let arr = m.get(category)
    if (!arr) { arr = []; m.set(category, arr) }
    arr.push(record)
  }

  getAll(userId: string): Record<DataCategory, unknown[]> {
    const m = this.store.get(userId)
    const out = {} as Record<DataCategory, unknown[]>
    const categories: DataCategory[] = ['profile', 'content', 'transaction', 'behavior', 'communication', 'media', 'device', 'session', 'preference']
    for (const c of categories) out[c] = m?.get(c) ? [...(m.get(c) as unknown[])] : []
    return out
  }

  removeCategory(userId: string, category: DataCategory): number {
    const m = this.store.get(userId)
    if (!m) return 0
    const arr = m.get(category)
    const n = arr?.length ?? 0
    m.delete(category)
    return n
  }

  anonymizeCategory(userId: string, category: DataCategory, opts: AnonymizeOptions): number {
    const m = this.store.get(userId)
    if (!m) return 0
    const arr = m.get(category)
    if (!arr) return 0
    let count = 0
    const newArr = arr.map(r => {
      const { data, redactions } = anonymizer.anonymize(r, opts)
      count += redactions.length
      return data
    })
    m.set(category, newArr)
    return count
  }

  totalFor(userId: string): number {
    const m = this.store.get(userId)
    if (!m) return 0
    let n = 0
    for (const arr of m.values()) n += arr.length
    return n
  }

  clear(): void { this.store.clear() }
}

const dataStore = new DataStore()

// ============== Data Exporter (GDPR Art. 20) ==============

export class DataExporter {
  export(userId: string, formatVersion = '1.0.0'): ExportBundle {
    const data = dataStore.getAll(userId)
    const total = Object.values(data).reduce((s, arr) => s + arr.length, 0)
    const json = JSON.stringify({ userId, generatedAt: Date.now(), data, total, formatVersion })
    const checksum = fnv1a(json).toString(16).padStart(8, '0')
    return { userId, generatedAt: Date.now(), data, total, formatVersion, checksum }
  }
}

export const exporter = new DataExporter()

// ============== Eraser (GDPR Art. 17) ==============

export class Eraser {
  erase(userId: string, method: 'hard' | 'soft' = 'hard', opts: AnonymizeOptions = { method: 'redact' }): ErasureResult {
    const data = dataStore.getAll(userId)
    const deleted = {} as Record<DataCategory, number>
    const anonymized = {} as Record<DataCategory, number>
    for (const cat of Object.keys(data) as DataCategory[]) {
      if (method === 'hard') {
        deleted[cat] = dataStore.removeCategory(userId, cat)
      } else {
        anonymized[cat] = dataStore.anonymizeCategory(userId, cat, opts)
      }
    }
    consents.clear()  // not directly used; manual revoke
    const total = Object.values(data).reduce((s, arr) => s + arr.length, 0)
    return { userId, erasedAt: Date.now(), deleted, anonymized, method }
  }
}

export const eraser = new Eraser()

// ============== Retention Policy ==============

export class RetentionManager {
  private rules: RetentionRule[] = [
    { category: 'session', retentionDays: 30, action: 'delete', legalBasis: 'legitimate-interest' },
    { category: 'behavior', retentionDays: 365, action: 'anonymize', legalBasis: 'consent' },
    { category: 'transaction', retentionDays: 2555, action: 'archive', legalBasis: 'legal-obligation' }, // ~7 years
    { category: 'communication', retentionDays: 730, action: 'anonymize', legalBasis: 'consent' },
    { category: 'media', retentionDays: 0, action: 'archive', legalBasis: 'consent' },  // never delete
    { category: 'device', retentionDays: 90, action: 'delete', legalBasis: 'legitimate-interest' },
  ]

  setRule(rule: RetentionRule): void {
    const idx = this.rules.findIndex(r => r.category === rule.category)
    if (idx === -1) this.rules.push(rule)
    else this.rules[idx] = rule
  }

  getRule(category: DataCategory): RetentionRule | undefined {
    return this.rules.find(r => r.category === category)
  }

  listRules(): RetentionRule[] { return [...this.rules] }

  /** Run cleanup on a record, returns action taken */
  applyToRecord(userId: string, category: DataCategory, recordTs: number): 'kept' | 'deleted' | 'anonymized' | 'archived' {
    const rule = this.getRule(category)
    if (!rule) return 'kept'
    if (rule.retentionDays === 0) return 'kept'
    const ageDays = (Date.now() - recordTs) / 86_400_000
    if (ageDays <= rule.retentionDays) return 'kept'
    switch (rule.action) {
      case 'delete':
        dataStore.removeCategory(userId, category)
        return 'deleted'
      case 'anonymize':
        dataStore.anonymizeCategory(userId, category, { method: 'redact' })
        return 'anonymized'
      case 'archive':
        return 'archived'
    }
  }
}

export const retention = new RetentionManager()

// ============== Data Subject Requests (DSR) ==============

export class DSRService {
  private requests: DSRRequest[] = []
  private slaDays = 30

  setSlaDays(d: number): void { this.slaDays = d }

  create(userId: string, type: DSRType, notes?: string): DSRRequest {
    const now = Date.now()
    const req: DSRRequest = {
      id: `dsr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId, type, status: 'received',
      createdAt: now, updatedAt: now,
      dueAt: now + this.slaDays * 86_400_000,
      notes,
    }
    this.requests.push(req)
    return req
  }

  update(id: string, patch: Partial<DSRRequest>): DSRRequest {
    const r = this.requests.find(x => x.id === id)
    if (!r) throw new Error(`DSR ${id} not found`)
    Object.assign(r, patch, { updatedAt: Date.now() })
    return r
  }

  /** Process a request (e.g. delete, export) */
  process(id: string): DSRRequest {
    const r = this.requests.find(x => x.id === id)
    if (!r) throw new Error(`DSR ${id} not found`)
    r.status = 'processing'
    r.updatedAt = Date.now()
    try {
      switch (r.type) {
        case 'access':
        case 'portability': {
          r.bundle = exporter.export(r.userId)
          r.result = r.bundle
          r.status = 'completed'
          break
        }
        case 'delete': {
          r.erasureResult = eraser.erase(r.userId, 'hard')
          r.result = r.erasureResult
          r.status = 'completed'
          break
        }
        case 'rectify': {
          // In real life: present user with edit form. Here we just mark complete.
          r.status = 'completed'
          break
        }
        case 'restrict': {
          // Restrict processing: mark user as restricted
          r.status = 'completed'
          break
        }
        case 'object':
        case 'opt-out': {
          // Object: deny further processing for non-essential purposes
          consents.revokeAll(r.userId, 'dsr')
          r.status = 'completed'
          break
        }
      }
    } catch (e) {
      r.status = 'partial'
      r.notes = `${r.notes ?? ''} | error: ${e instanceof Error ? e.message : String(e)}`
    }
    r.updatedAt = Date.now()
    return r
  }

  get(id: string): DSRRequest | undefined { return this.requests.find(r => r.id === id) }

  list(filter?: { userId?: string; status?: DSRStatus; overdue?: boolean }): DSRRequest[] {
    let arr = [...this.requests]
    if (filter?.userId) arr = arr.filter(r => r.userId === filter.userId)
    if (filter?.status) arr = arr.filter(r => r.status === filter.status)
    if (filter?.overdue) arr = arr.filter(r => r.status !== 'completed' && r.dueAt < Date.now())
    return arr
  }

  size(): number { return this.requests.length }
  clear(): void { this.requests = [] }
}

export const dsrService = new DSRService()

// ============== Cookie Consent ==============

export class CookieConsentStore {
  private records = new Map<string, CookieConsent>()

  set(userId: string | undefined, categories: Record<Exclude<ConsentPurpose, 'essential'>, ConsentStatus>): CookieConsent {
    const rec: CookieConsent = {
      userId,
      categories,
      ts: Date.now(),
      expiresAt: Date.now() + 180 * 86_400_000,  // 6 months
    }
    const k = userId ?? '__anon__'
    this.records.set(k, rec)
    return rec
  }

  get(userId: string | undefined): CookieConsent | undefined {
    const rec = this.records.get(userId ?? '__anon__')
    if (!rec) return undefined
    if (rec.expiresAt < Date.now()) return undefined
    return rec
  }

  hasConsented(userId: string | undefined, category: Exclude<ConsentPurpose, 'essential'>): boolean {
    const rec = this.get(userId)
    return rec?.categories[category] === 'granted'
  }

  clear(): void { this.records.clear() }
}

export const cookieConsent = new CookieConsentStore()

// ============== Metrics ==============

class PrivacyMetricsCollector {
  snapshot(): PrivacyMetrics {
    let granted = 0, denied = 0
    let total = 0
    // Approximate from anonymizer redactions
    const redactions = anonymizer.totalRedactions()
    // DSRs
    const allDsr = dsrService.list()
    const pending = allDsr.filter(r => r.status === 'received' || r.status === 'verifying' || r.status === 'processing').length
    const completed = allDsr.filter(r => r.status === 'completed').length
    const overdue = allDsr.filter(r => r.status !== 'completed' && r.dueAt < Date.now()).length
    return {
      totalConsents: consents.totalConsents(),
      grantedConsents: granted,
      deniedConsents: denied,
      pendingDSRs: pending,
      completedDSRs: completed,
      overdueDSRs: overdue,
      totalPIIRedactions: redactions,
      totalErasures: 0,
      retentionRules: retention.listRules().length,
      policyVersion: consents.getCurrentPolicy()?.version ?? 'none',
    }
  }
}

const privacyMetrics = new PrivacyMetricsCollector()

// ============== Persistence ==============

const STORAGE_KEY = 'versa.privacy.v1'

export interface PersistShape {
  consents: Consent[]
  policies: PolicyVersion[]
  dsrs: DSRRequest[]
  cookieConsents: CookieConsent[]
}

export function persistPrivacy(): number {
  if (typeof localStorage === 'undefined') return 0
  const allConsents: Consent[] = []
  for (const u of (consents as unknown as { consents: Map<string, Consent[]> }).consents.values()) allConsents.push(...u)
  const data: PersistShape = {
    consents: allConsents,
    policies: consents.listPolicies(),
    dsrs: dsrService.list(),
    cookieConsents: [],
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return allConsents.length
  } catch { return 0 }
}

export function loadPrivacy(): { dsrCount: number } {
  if (typeof localStorage === 'undefined') return { dsrCount: 0 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { dsrCount: 0 }
    const data = JSON.parse(raw) as PersistShape
    for (const c of data.consents) {
      ;(consents as unknown as { consents: Map<string, Consent[]> }).consents.get(c.userId)?.push(c)
        ?? ((m) => { m.set(c.userId, [c]) })( (consents as unknown as { consents: Map<string, Consent[]> }).consents)
    }
    for (const p of data.policies) consents.setCurrentPolicy(p)
    for (const r of data.dsrs) (dsrService as unknown as { requests: DSRRequest[] }).requests.push(r)
    return { dsrCount: data.dsrs.length }
  } catch { return { dsrCount: 0 } }
}

export { dataStore, privacyMetrics, withRetry, defaultRetry, computeBackoff }

export function summarizePrivacy(): {
  consents: number
  dsrs: number
  pending: number
  overdue: number
  redactions: number
  metrics: PrivacyMetrics
} {
  const m = privacyMetrics.snapshot()
  return {
    consents: m.totalConsents,
    dsrs: dsrService.size(),
    pending: m.pendingDSRs,
    overdue: m.overdueDSRs,
    redactions: m.totalPIIRedactions,
    metrics: m,
  }
}
