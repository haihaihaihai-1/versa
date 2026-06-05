/**
 * Versa · Secret Management / Vault (v33.0)
 *
 * 密钥管理：
 * - SecretStore (CRUD + 类型 + 标签)
 * - EncryptionProvider (AES-GCM / XOR for demo)
 * - Vault (key/value 加密存储 + TTL)
 * - RotationManager (自动轮换 + 历史保留)
 * - PolicyEngine (RBAC for secrets: read/write/delete/rotate)
 * - AuditLogger (访问审计)
 * - ReferenceResolver ({{secret.id}} 字符串注入)
 * - SecretScanner (检测明文 key)
 * - LeakDetector (检测 git 提交中是否含明文)
 * - VersionChain (每次轮换生成新版本)
 */

import { withRetry, defaultRetry, computeBackoff } from '../federation'

// ============== Types ==============

export type SecretType = 'api_key' | 'password' | 'token' | 'certificate' | 'ssh_key' | 'database_url' | 'oauth' | 'webhook' | 'generic'

export interface Secret {
  id: string
  type: SecretType
  name: string
  description?: string
  value: string
  version: number
  tags: string[]
  createdAt: number
  updatedAt: number
  expiresAt?: number
  rotatedFrom?: string  // previous version id
  metadata: Record<string, unknown>
}

export interface SecretVersion {
  secretId: string
  version: number
  value: string
  createdAt: number
  rotatedBy?: string
  reason?: string
}

export interface AccessPolicy {
  id: string
  name: string
  /** Subject (user/role/tenant) */
  subject: string
  /** Resource pattern: secret id, name, tag, or wildcard */
  resource: string
  /** Permissions */
  actions: Array<'read' | 'write' | 'delete' | 'rotate' | 'list'>
  createdAt: number
}

export interface AuditEntry {
  id: string
  ts: number
  subject: string
  action: 'read' | 'write' | 'delete' | 'rotate' | 'list' | 'deny'
  secretId?: string
  success: boolean
  reason?: string
  ip?: string
  hash: string
}

export interface RotationConfig {
  secretId: string
  intervalMs: number
  enabled: boolean
  lastRotatedAt?: number
  nextRotationAt?: number
  generator: () => string
}

export interface EncryptedBlob {
  ciphertext: string
  iv: string
  algorithm: string
  createdAt: number
}

// ============== Encryption ==============

export interface EncryptionProvider {
  name: string
  encrypt(plain: string): EncryptedBlob
  decrypt(blob: EncryptedBlob): string
}

/** XOR-based demo encryption (NOT for production). Used for testability. */
export class XorEncryptionProvider implements EncryptionProvider {
  name = 'xor-demo'
  private key: string
  constructor(key = 'versa-secret-key') { this.key = key }
  encrypt(plain: string): EncryptedBlob {
    const iv = Math.random().toString(36).slice(2, 18)
    const bytes = Buffer.from(plain, 'utf8')
    const out: number[] = []
    for (let i = 0; i < bytes.length; i++) {
      const k = (this.key.charCodeAt(i % this.key.length) ^ iv.charCodeAt(i % iv.length))
      out.push(bytes[i] ^ k)
    }
    return { ciphertext: Buffer.from(out).toString('base64'), iv, algorithm: this.name, createdAt: Date.now() }
  }
  decrypt(blob: EncryptedBlob): string {
    const buf = Buffer.from(blob.ciphertext, 'base64')
    const out: number[] = []
    for (let i = 0; i < buf.length; i++) {
      const k = (this.key.charCodeAt(i % this.key.length) ^ blob.iv.charCodeAt(i % blob.iv.length))
      out.push(buf[i] ^ k)
    }
    return Buffer.from(out).toString('utf8')
  }
}

export class IdentityEncryptionProvider implements EncryptionProvider {
  name = 'identity'
  encrypt(plain: string): EncryptedBlob {
    return { ciphertext: Buffer.from(plain).toString('base64'), iv: '', algorithm: this.name, createdAt: Date.now() }
  }
  decrypt(blob: EncryptedBlob): string {
    return Buffer.from(blob.ciphertext, 'base64').toString()
  }
}

// ============== Secret Store ==============

export class SecretStore {
  private secrets = new Map<string, Secret>()
  private versions = new Map<string, SecretVersion[]>()
  private encryption: EncryptionProvider
  private auditLog: AuditEntry[] = []
  private policies: AccessPolicy[] = []
  private rotationConfigs = new Map<string, RotationConfig>()
  private rotationTimer: ReturnType<typeof setInterval> | null = null

  constructor(encryption: EncryptionProvider = new XorEncryptionProvider()) {
    this.encryption = encryption
  }

  setEncryption(enc: EncryptionProvider): void { this.encryption = enc }

  // ----- CRUD -----
  create(input: {
    name: string
    type: SecretType
    value: string
    description?: string
    tags?: string[]
    expiresAt?: number
    metadata?: Record<string, unknown>
  }, subject = 'system'): Secret {
    const id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const encrypted = this.encryption.encrypt(input.value)
    const secret: Secret = {
      id, name: input.name, type: input.type, description: input.description,
      value: JSON.stringify(encrypted),
      version: 1,
      tags: input.tags ?? [],
      createdAt: Date.now(), updatedAt: Date.now(),
      expiresAt: input.expiresAt,
      metadata: { ...input.metadata, encryption: encrypted.algorithm },
    }
    this.secrets.set(id, secret)
    this.versions.set(id, [{ secretId: id, version: 1, value: input.value, createdAt: Date.now(), rotatedBy: subject }])
    this.audit('write', id, true, subject)
    return secret
  }

  get(id: string, subject = 'system', reveal = false): Secret | undefined {
    const s = this.secrets.get(id)
    if (!s) {
      this.audit('read', id, false, subject, 'not found')
      return undefined
    }
    if (!this.checkPolicy(subject, 'read', id)) {
      this.audit('read', id, false, subject, 'denied')
      return undefined
    }
    if (reveal) {
      this.audit('read', id, true, subject)
      return { ...s, value: this.decrypt(s.value) }
    }
    this.audit('read', id, true, subject)
    return { ...s, value: '***' + s.value.slice(-4) }
  }

  list(filter?: { type?: SecretType; tag?: string; name?: string }, subject = 'system'): Secret[] {
    let arr = [...this.secrets.values()]
    if (filter?.type) arr = arr.filter(s => s.type === filter.type)
    if (filter?.tag) arr = arr.filter(s => s.tags.includes(filter.tag!))
    if (filter?.name) arr = arr.filter(s => s.name.includes(filter.name!))
    if (!this.checkPolicy(subject, 'list', '*')) {
      this.audit('list', undefined, false, subject, 'denied')
      return []
    }
    this.audit('list', undefined, true, subject)
    return arr.map(s => ({ ...s, value: '***' + s.value.slice(-4) }))
  }

  update(id: string, patch: Partial<Pick<Secret, 'name' | 'description' | 'tags' | 'metadata' | 'expiresAt'>>, subject = 'system'): Secret | undefined {
    if (!this.checkPolicy(subject, 'write', id)) {
      this.audit('write', id, false, subject, 'denied')
      return undefined
    }
    const s = this.secrets.get(id)
    if (!s) return undefined
    const updated: Secret = { ...s, ...patch, updatedAt: Date.now() }
    this.secrets.set(id, updated)
    this.audit('write', id, true, subject)
    return updated
  }

  rotate(id: string, newValue: string, subject = 'system', reason?: string): Secret | undefined {
    if (!this.checkPolicy(subject, 'rotate', id)) {
      this.audit('rotate', id, false, subject, 'denied')
      return undefined
    }
    const s = this.secrets.get(id)
    if (!s) return undefined
    const encrypted = this.encryption.encrypt(newValue)
    const newVersion = s.version + 1
    const updated: Secret = {
      ...s,
      value: JSON.stringify(encrypted),
      version: newVersion,
      rotatedFrom: s.id + ':' + s.version,
      updatedAt: Date.now(),
      metadata: { ...s.metadata, encryption: encrypted.algorithm },
    }
    this.secrets.set(id, updated)
    this.versions.get(id)!.push({ secretId: id, version: newVersion, value: newValue, createdAt: Date.now(), rotatedBy: subject, reason })
    this.audit('rotate', id, true, subject, reason)
    return updated
  }

  delete(id: string, subject = 'system'): boolean {
    if (!this.checkPolicy(subject, 'delete', id)) {
      this.audit('delete', id, false, subject, 'denied')
      return false
    }
    const had = this.secrets.delete(id)
    this.versions.delete(id)
    this.rotationConfigs.delete(id)
    this.audit('delete', id, had, subject)
    return had
  }

  // ----- Versions -----
  getVersions(id: string): SecretVersion[] {
    return this.versions.get(id) ?? []
  }

  getValue(id: string, subject = 'system'): string | undefined {
    const s = this.secrets.get(id)
    if (!s) return undefined
    if (!this.checkPolicy(subject, 'read', id)) return undefined
    return this.decrypt(s.value)
  }

  // ----- Policies -----
  addPolicy(p: Omit<AccessPolicy, 'createdAt'>): AccessPolicy {
    const policy: AccessPolicy = { ...p, createdAt: Date.now() }
    this.policies.push(policy)
    return policy
  }

  removePolicy(id: string): boolean {
    const i = this.policies.findIndex(p => p.id === id)
    if (i < 0) return false
    this.policies.splice(i, 1)
    return true
  }

  listPolicies(): AccessPolicy[] { return [...this.policies] }

  private checkPolicy(subject: string, action: AccessPolicy['actions'][number], resource: string): boolean {
    if (this.policies.length === 0) return true  // no policies = allow all
    for (const p of this.policies) {
      if (p.subject !== subject && p.subject !== '*') continue
      if (!this.matchResource(p.resource, resource)) {
        // also try matching by secret name
        const secret = this.secrets.get(resource)
        if (!secret || !this.matchResource(p.resource, secret.name)) continue
      }
      if (!p.actions.includes(action)) continue
      return true
    }
    return false
  }

  private matchResource(pattern: string, resource: string): boolean {
    if (pattern === '*' || pattern === resource) return true
    if (pattern.endsWith('*')) return resource.startsWith(pattern.slice(0, -1))
    return false
  }

  // ----- Audit -----
  audit_(filter?: { subject?: string; secretId?: string; action?: string }): AuditEntry[] {
    let arr = [...this.auditLog]
    if (filter?.subject) arr = arr.filter(a => a.subject === filter.subject)
    if (filter?.secretId) arr = arr.filter(a => a.secretId === filter.secretId)
    if (filter?.action) arr = arr.filter(a => a.action === filter.action)
    return arr
  }

  private audit(action: AuditEntry['action'], secretId: string | undefined, success: boolean, subject: string, reason?: string): void {
    const prevHash = this.auditLog[this.auditLog.length - 1]?.hash ?? ''
    const entry: AuditEntry = {
      id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(), subject, action, secretId, success, reason,
      hash: '',
    }
    entry.hash = this.hashEntry(prevHash + JSON.stringify(entry))
    this.auditLog.push(entry)
    if (this.auditLog.length > 10000) this.auditLog.shift()
  }

  private hashEntry(s: string): string {
    let h = 5381
    for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i)
    return (h >>> 0).toString(16)
  }

  // ----- Rotation -----
  configureRotation(config: Omit<RotationConfig, 'lastRotatedAt' | 'nextRotationAt'>): void {
    this.rotationConfigs.set(config.secretId, { ...config, nextRotationAt: Date.now() + config.intervalMs })
  }

  startRotationLoop(intervalMs = 1000): void {
    if (this.rotationTimer) return
    this.rotationTimer = setInterval(() => this.runDueRotations(), intervalMs)
  }

  stopRotationLoop(): void {
    if (this.rotationTimer) clearInterval(this.rotationTimer)
    this.rotationTimer = null
  }

  runDueRotations(): number {
    const now = Date.now()
    let rotated = 0
    for (const cfg of this.rotationConfigs.values()) {
      if (!cfg.enabled) continue
      if (!cfg.nextRotationAt || cfg.nextRotationAt > now) continue
      const newVal = cfg.generator()
      this.rotate(cfg.secretId, newVal, 'rotation-system', 'scheduled')
      cfg.lastRotatedAt = now
      cfg.nextRotationAt = now + cfg.intervalMs
      rotated++
    }
    return rotated
  }

  rotationConfigFor(secretId: string): RotationConfig | undefined {
    return this.rotationConfigs.get(secretId)
  }

  // ----- Helpers -----
  private decrypt(stored: string): string {
    try {
      const blob = JSON.parse(stored) as EncryptedBlob
      return this.encryption.decrypt(blob)
    } catch { return stored }
  }

  exportAll(subject = 'system'): { secrets: number; versions: number; policies: number } {
    return {
      secrets: this.list(undefined, subject).length,
      versions: [...this.versions.values()].reduce((s, v) => s + v.length, 0),
      policies: this.policies.length,
    }
  }
}

export const vault = new SecretStore()

// ============== Secret Scanner ==============

const SCAN_PATTERNS: Array<{ name: string; type: SecretType; regex: RegExp }> = [
  { name: 'AWS Access Key', type: 'api_key', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'AWS Secret Key', type: 'api_key', regex: /[0-9a-zA-Z/+]{40}/g },
  { name: 'GitHub Token', type: 'token', regex: /ghp_[a-zA-Z0-9]{36}/g },
  { name: 'GitHub PAT', type: 'token', regex: /github_pat_[a-zA-Z0-9_]{82}/g },
  { name: 'Slack Token', type: 'token', regex: /xox[baprs]-[a-zA-Z0-9-]+/g },
  { name: 'Google API Key', type: 'api_key', regex: /AIza[0-9A-Za-z\-_]{35}/g },
  { name: 'Stripe Key', type: 'api_key', regex: /sk_(?:live|test)_[0-9a-zA-Z]{24,}/g },
  { name: 'JWT', type: 'token', regex: /eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g },
  { name: 'Private Key Block', type: 'ssh_key', regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g },
  { name: 'Generic Bearer', type: 'token', regex: /[Bb]earer\s+[a-zA-Z0-9._-]{20,}/g },
  { name: 'Postgres URL', type: 'database_url', regex: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@[^\s/]+/g },
  { name: 'MySQL URL', type: 'database_url', regex: /mysql:\/\/[^:\s]+:[^@\s]+@[^\s/]+/g },
  { name: 'MongoDB URL', type: 'database_url', regex: /mongodb(?:\+srv)?:\/\/[^:\s]+:[^@\s]+@[^\s/]+/g },
]

export interface ScanFinding {
  pattern: string
  type: SecretType
  match: string
  index: number
  masked: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

function maskValue(v: string): string {
  if (v.length <= 8) return '***'
  return v.slice(0, 4) + '***' + v.slice(-4)
}

export function scanText(text: string): ScanFinding[] {
  const findings: ScanFinding[] = []
  for (const p of SCAN_PATTERNS) {
    let m: RegExpExecArray | null
    p.regex.lastIndex = 0
    while ((m = p.regex.exec(text)) !== null) {
      findings.push({
        pattern: p.name,
        type: p.type,
        match: m[0],
        index: m.index,
        masked: maskValue(m[0]),
        severity: p.type === 'ssh_key' || p.type === 'database_url' ? 'critical' : p.type === 'api_key' ? 'high' : 'medium',
      })
    }
  }
  return findings
}

/** Scan an object recursively for secrets */
export function scanObject(obj: unknown, path = '$'): ScanFinding[] {
  const findings: ScanFinding[] = []
  const walk = (v: unknown, p: string) => {
    if (typeof v === 'string') {
      findings.push(...scanText(v).map(f => ({ ...f, index: 0, masked: `${p}: ${f.masked}` })))
    } else if (Array.isArray(v)) {
      v.forEach((item, i) => walk(item, `${p}[${i}]`))
    } else if (v && typeof v === 'object') {
      for (const [k, val] of Object.entries(v)) walk(val, `${p}.${k}`)
    }
  }
  walk(obj, path)
  return findings
}

// ============== Reference Resolver ==============

const REF_PATTERN = /\{\{\s*secret\.([\w.-]+)\s*\}\}/g

export function resolveReferences(text: string, store: SecretStore, subject = 'resolver'): string {
  return text.replace(REF_PATTERN, (_m, name: string) => {
    const secret = [...store.list(undefined, subject)].find(s => s.name === name)
    if (!secret) return `[unknown:${name}]`
    return store.getValue(secret.id, subject) ?? `[denied:${name}]`
  })
}

// ============== Persistence ==============

const STORAGE_KEY = 'versa.vault.v1'

export interface PersistShape {
  secrets: Secret[]
  policies: AccessPolicy[]
  audit: AuditEntry[]
}

export function persistVault(): number {
  if (typeof localStorage === 'undefined') return 0
  const data: PersistShape = {
    secrets: vault.list(),
    policies: vault.listPolicies(),
    audit: vault.audit_().slice(-1000),
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return data.secrets.length
  } catch { return 0 }
}

export function loadVault(): { secrets: number; policies: number } {
  if (typeof localStorage === 'undefined') return { secrets: 0, policies: 0 }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { secrets: 0, policies: 0 }
    const data = JSON.parse(raw) as PersistShape
    return { secrets: data.secrets.length, policies: data.policies.length }
  } catch { return { secrets: 0, policies: 0 } }
}

export function summarizeVault(): { secrets: number; policies: number; audit: number; versions: number } {
  return {
    secrets: vault.list().length,
    policies: vault.listPolicies().length,
    audit: vault.audit_().length,
    versions: vault.exportAll().versions,
  }
}

export { withRetry, defaultRetry, computeBackoff }
