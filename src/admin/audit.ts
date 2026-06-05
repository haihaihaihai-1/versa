/**
 * Versa · 审计日志 (v18.0)
 * - 不可变记录
 * - 哈希链 (每条含前一条的 hash, 防篡改)
 * - 过滤/搜索
 * - 导出 (JSON/CSV)
 */

import type { Resource, Action } from './permissions'

export interface AuditEntry {
  id: string
  ts: number
  actor: { id: string; name: string; role: string }
  action: `${Resource}.${Action}` | 'auth.login' | 'auth.logout' | 'system.config' | 'export' | 'custom'
  target?: { type: string; id: string; label?: string }
  ip?: string
  userAgent?: string
  data?: Record<string, any>
  prevHash?: string
  hash?: string
}

const STORAGE_KEY = 'versa:audit:log'
const MAX_ENTRIES = 5000

async function sha256(text: string): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // Fallback: simple hash
    let h = 0
    for (let i = 0; i < text.length; i++) {
      h = (h << 5) - h + text.charCodeAt(i)
      h |= 0
    }
    return 'sha_' + Math.abs(h).toString(36)
  }
  const buf = new TextEncoder().encode(text)
  const out = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(out)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

class AuditLog {
  private entries: AuditEntry[] = []
  private listeners: Set<(e: AuditEntry) => void> = new Set()

  constructor() {
    this.load()
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) this.entries = JSON.parse(raw)
    } catch {}
  }

  private persist() {
    try {
      if (this.entries.length > MAX_ENTRIES) {
        this.entries = this.entries.slice(-MAX_ENTRIES)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.entries))
    } catch {}
  }

  async record(input: Omit<AuditEntry, 'id' | 'ts' | 'prevHash' | 'hash'>): Promise<AuditEntry> {
    const prev = this.entries[this.entries.length - 1]
    const id = 'aud_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
    const ts = Date.now()
    const prevHash = prev?.hash
    const partial: AuditEntry = { id, ts, prevHash, ...input }
    const hash = await sha256(JSON.stringify(partial))
    const full: AuditEntry = { ...partial, hash }
    this.entries.push(full)
    this.persist()
    this.listeners.forEach((fn) => fn(full))
    return full
  }

  getEntries(filter?: {
    actorId?: string
    action?: string
    targetType?: string
    fromTs?: number
    toTs?: number
    limit?: number
  }): AuditEntry[] {
    let r = this.entries
    if (filter?.actorId) r = r.filter((e) => e.actor.id === filter.actorId)
    if (filter?.action) r = r.filter((e) => e.action === filter.action)
    if (filter?.targetType) r = r.filter((e) => e.target?.type === filter.targetType)
    if (filter?.fromTs) r = r.filter((e) => e.ts >= filter.fromTs!)
    if (filter?.toTs) r = r.filter((e) => e.ts <= filter.toTs!)
    if (filter?.limit) r = r.slice(-filter.limit)
    return r
  }

  /** 校验哈希链完整性 */
  async verify(): Promise<{ ok: boolean; brokenAt?: string; total: number }> {
    let prev: AuditEntry | undefined
    for (const e of this.entries) {
      if (prev && e.prevHash !== prev.hash) return { ok: false, brokenAt: e.id, total: this.entries.length }
      const { hash, ...rest } = e
      const expected = await sha256(JSON.stringify(rest))
      if (expected !== hash) return { ok: false, brokenAt: e.id, total: this.entries.length }
      prev = e
    }
    return { ok: true, total: this.entries.length }
  }

  export(format: 'json' | 'csv'): string {
    if (format === 'json') return JSON.stringify(this.entries, null, 2)
    const headers = ['id', 'ts', 'iso', 'actor_id', 'actor_name', 'actor_role', 'action', 'target_type', 'target_id', 'ip']
    const rows = this.entries.map((e) => [
      e.id, e.ts, new Date(e.ts).toISOString(),
      e.actor.id, e.actor.name, e.actor.role,
      e.action,
      e.target?.type || '', e.target?.id || '',
      e.ip || '',
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    return [headers.join(','), ...rows].join('\n')
  }

  clear(): void {
    this.entries = []
    this.persist()
  }

  subscribe(fn: (e: AuditEntry) => void): () => void {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
}

export const auditLog = new AuditLog()

/** React Hook */
import { useEffect, useState } from 'react'
export function useAuditLog() {
  const [entries, setEntries] = useState(auditLog.getEntries())
  useEffect(() => {
    const unsub = auditLog.subscribe(() => setEntries(auditLog.getEntries()))
    return unsub
  }, [])
  return entries
}
