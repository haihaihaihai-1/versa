// v40.0 IAM (Identity & Access Management: users, roles, policies, sessions, ownership)

export type Effect = 'Allow' | 'Deny'

export interface IamUser {
  id: string
  name: string
  email: string
  type: 'human' | 'service' | 'api-key'
  groups: string[]
  attachedPolicies: string[]
  mfaEnabled: boolean
  createdAt: number
  lastLogin?: number
  passwordHash?: string
  apiKeyHash?: string
}

export interface IamRole {
  id: string
  name: string
  description: string
  assumeRolePolicy: PolicyDocument
  attachedPolicies: string[]
  maxSessionDuration: number
  createdAt: number
}

export interface PolicyDocument {
  version: string
  statements: PolicyStatement[]
}

export interface PolicyStatement {
  sid?: string
  effect: Effect
  actions: string[]
  resources: string[]
  conditions?: { [op: string]: { [key: string]: unknown } }
  notActions?: string[]
  notResources?: string[]
}

export interface IamPolicy {
  id: string
  name: string
  document: PolicyDocument
  description: string
  createdAt: number
  version: string
}

export interface IamGroup {
  id: string
  name: string
  members: string[]
  attachedPolicies: string[]
}

export interface Session {
  id: string
  principalId: string
  principalType: 'user' | 'role'
  assumedRoleId?: string
  sessionToken: string
  issuedAt: number
  expiresAt: number
  mfaPresent: boolean
  sourceIp?: string
}

export interface AccessKey {
  id: string
  userId: string
  prefix: string
  secretHash: string
  status: 'active' | 'inactive'
  createdAt: number
  lastUsed?: number
}

export interface PermissionCheck {
  allowed: boolean
  matchedStatements: { policyId: string; statementSid?: string; effect: Effect }[]
}

export interface ResourceOwnership {
  resourceId: string
  ownerId: string
  acl: ResourceAcl[]
}

export interface ResourceAcl {
  grantee: string
  granteeType: 'user' | 'role' | 'group' | 'public'
  permissions: string[]
}

// ============== IAM Service ==============

export class IamService {
  private users = new Map<string, IamUser>()
  private roles = new Map<string, IamRole>()
  private policies = new Map<string, IamPolicy>()
  private groups = new Map<string, IamGroup>()
  private sessions = new Map<string, Session>()
  private accessKeys = new Map<string, AccessKey>()
  private ownerships = new Map<string, ResourceOwnership>()
  private metrics = { authChecks: 0, denies: 0, allows: 0, sessionsCreated: 0 }

  // ---- Users ----
  createUser(input: { name: string; email: string; type?: IamUser['type']; password?: string }): IamUser {
    if ([...this.users.values()].some(u => u.name === input.name)) throw new Error(`User ${input.name} exists`)
    const id = `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const user: IamUser = {
      id, name: input.name, email: input.email,
      type: input.type ?? 'human',
      groups: [], attachedPolicies: [], mfaEnabled: false,
      createdAt: Date.now(),
      passwordHash: input.password ? this.hash(input.password) : undefined,
    }
    this.users.set(id, user)
    return { ...user }
  }
  getUser(id: string): IamUser | null { const u = this.users.get(id); return u ? { ...u } : null }
  getUserByName(name: string): IamUser | null {
    const u = [...this.users.values()].find(u => u.name === name)
    return u ? { ...u } : null
  }
  listUsers(): IamUser[] { return [...this.users.values()].map(u => ({ ...u })) }
  deleteUser(id: string): boolean {
    const u = this.users.get(id); if (!u) return false
    for (const g of this.groups.values()) g.members = g.members.filter(m => m !== id)
    for (const k of [...this.accessKeys.values()]) if (k.userId === id) this.accessKeys.delete(k.id)
    this.users.delete(id)
    return true
  }
  enableMfa(id: string): void { const u = this.users.get(id); if (u) u.mfaEnabled = true }
  addUserToGroup(userId: string, groupId: string): void {
    const u = this.users.get(userId); const g = this.groups.get(groupId)
    if (!u || !g) throw new Error('User or group not found')
    if (!u.groups.includes(groupId)) u.groups.push(groupId)
    if (!g.members.includes(userId)) g.members.push(userId)
  }
  attachUserPolicy(userId: string, policyId: string): void {
    const u = this.users.get(userId); if (!u) throw new Error('User not found')
    if (!u.attachedPolicies.includes(policyId)) u.attachedPolicies.push(policyId)
  }

  // ---- Groups ----
  createGroup(name: string): IamGroup {
    if ([...this.groups.values()].some(g => g.name === name)) throw new Error(`Group ${name} exists`)
    const id = `g-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const g: IamGroup = { id, name, members: [], attachedPolicies: [] }
    this.groups.set(id, g)
    return { ...g }
  }
  getGroup(id: string): IamGroup | null { const g = this.groups.get(id); return g ? { ...g, members: [...g.members] } : null }
  attachGroupPolicy(groupId: string, policyId: string): void {
    const g = this.groups.get(groupId); if (!g) throw new Error('Group not found')
    if (!g.attachedPolicies.includes(policyId)) g.attachedPolicies.push(policyId)
  }

  // ---- Roles ----
  createRole(name: string, assumeRolePolicy: PolicyDocument, opts: { description?: string; maxSessionDuration?: number } = {}): IamRole {
    if ([...this.roles.values()].some(r => r.name === name)) throw new Error(`Role ${name} exists`)
    const id = `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const r: IamRole = {
      id, name, assumeRolePolicy,
      description: opts.description ?? '',
      attachedPolicies: [],
      maxSessionDuration: opts.maxSessionDuration ?? 3600,
      createdAt: Date.now(),
    }
    this.roles.set(id, r)
    return { ...r, assumeRolePolicy: { ...r.assumeRolePolicy, statements: r.assumeRolePolicy.statements.map(s => ({ ...s })) } }
  }
  getRole(id: string): IamRole | null { const r = this.roles.get(id); return r ? { ...r } : null }
  listRoles(): IamRole[] { return [...this.roles.values()].map(r => ({ ...r })) }
  attachRolePolicy(roleId: string, policyId: string): void {
    const r = this.roles.get(roleId); if (!r) throw new Error('Role not found')
    if (!r.attachedPolicies.includes(policyId)) r.attachedPolicies.push(policyId)
  }

  // ---- Policies ----
  createPolicy(name: string, document: PolicyDocument, description = ''): IamPolicy {
    if ([...this.policies.values()].some(p => p.name === name)) throw new Error(`Policy ${name} exists`)
    const id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const p: IamPolicy = { id, name, document, description, createdAt: Date.now(), version: '2012-10-17' }
    this.policies.set(id, p)
    return { ...p }
  }
  getPolicy(id: string): IamPolicy | null { const p = this.policies.get(id); return p ? { ...p } : null }
  listPolicies(): IamPolicy[] { return [...this.policies.values()].map(p => ({ ...p })) }

  // ---- Sessions ----
  createSession(userId: string, opts: { mfaPresent?: boolean; sourceIp?: string; durationSec?: number; roleId?: string } = {}): Session {
    const u = this.users.get(userId); if (!u) throw new Error('User not found')
    if (u.mfaEnabled && !opts.mfaPresent) throw new Error('MFA required')
    const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const session: Session = {
      id, principalId: userId, principalType: 'user',
      assumedRoleId: opts.roleId,
      sessionToken: this.hash(`tok-${id}-${Math.random()}`),
      issuedAt: Date.now(),
      expiresAt: Date.now() + (opts.durationSec ?? 3600) * 1000,
      mfaPresent: opts.mfaPresent ?? false,
      sourceIp: opts.sourceIp,
    }
    this.sessions.set(id, session)
    this.metrics.sessionsCreated++
    return { ...session }
  }
  getSession(id: string): Session | null { const s = this.sessions.get(id); return s ? { ...s } : null }
  revokeSession(id: string): boolean { return this.sessions.delete(id) }

  // ---- Access keys ----
  createAccessKey(userId: string): { key: AccessKey; secret: string } {
    if (!this.users.has(userId)) throw new Error('User not found')
    const id = `ak-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const secret = `sk_${this.hash(Math.random().toString()).slice(0, 32)}`
    const key: AccessKey = {
      id, userId,
      prefix: secret.slice(0, 7),
      secretHash: this.hash(secret),
      status: 'active',
      createdAt: Date.now(),
    }
    this.accessKeys.set(id, key)
    return { key: { ...key }, secret }
  }
  deactivateAccessKey(id: string): boolean {
    const k = this.accessKeys.get(id); if (!k) return false
    k.status = 'inactive'; return true
  }
  listAccessKeys(userId: string): AccessKey[] {
    return [...this.accessKeys.values()].filter(k => k.userId === userId).map(k => ({ ...k }))
  }
  authenticate(accessKeyId: string, secret: string): string | null {
    const k = this.accessKeys.get(accessKeyId); if (!k || k.status !== 'active') return null
    if (k.secretHash !== this.hash(secret)) return null
    k.lastUsed = Date.now()
    return k.userId
  }

  // ---- Authorization ----
  authorize(principalId: string, action: string, resource: string, context: { sourceIp?: string; mfaPresent?: boolean; time?: Date } = {}): PermissionCheck {
    this.metrics.authChecks++
    const matched: PermissionCheck['matchedStatements'] = []
    let allowed = false
    let denied = false
    const policies = this.collectPolicies(principalId)
    for (const pol of policies) {
      for (const stmt of pol.document.statements) {
        if (!this.matchStatement(stmt, action, resource, context)) continue
        matched.push({ policyId: pol.id, statementSid: stmt.sid, effect: stmt.effect })
        if (stmt.effect === 'Allow') allowed = true
        else if (stmt.effect === 'Deny') denied = true
      }
    }
    if (denied) { this.metrics.denies++; return { allowed: false, matchedStatements: matched } }
    if (allowed) { this.metrics.allows++; return { allowed: true, matchedStatements: matched } }
    this.metrics.denies++
    return { allowed: false, matchedStatements: [] }
  }

  private matchStatement(stmt: PolicyStatement, action: string, resource: string, ctx: { sourceIp?: string; mfaPresent?: boolean; time?: Date }): boolean {
    const hasActions = (stmt.actions?.length ?? 0) > 0
    const hasNotActions = (stmt.notActions?.length ?? 0) > 0
    let actionMatch = false
    if (hasActions && (stmt.actions ?? []).some(p => this.matchPattern(p, action))) actionMatch = true
    else if (hasNotActions && (stmt.notActions ?? []).every(p => !this.matchPattern(p, action))) actionMatch = true
    if (!actionMatch) return false
    const hasResources = (stmt.resources?.length ?? 0) > 0
    const hasNotResources = (stmt.notResources?.length ?? 0) > 0
    let resourceMatch = false
    if (hasResources && (stmt.resources ?? []).some(p => this.matchPattern(p, resource))) resourceMatch = true
    else if (hasNotResources && (stmt.notResources ?? []).every(p => !this.matchPattern(p, resource))) resourceMatch = true
    if (!resourceMatch) return false
    if (stmt.conditions) {
      for (const [op, conds] of Object.entries(stmt.conditions)) {
        for (const [k, v] of Object.entries(conds)) {
          if (op === 'StringEquals') {
            if (k === 'aws:SourceIp' && ctx.sourceIp !== v) return false
            if (k === 'aws:MultiFactorAuthPresent' && ctx.mfaPresent !== v) return false
          }
          if (op === 'DateGreaterThan' || op === 'DateLessThan') {
            if (k === 'aws:CurrentTime' && ctx.time) {
              const t = new Date(v as string).getTime()
              const cur = ctx.time.getTime()
              if (op === 'DateGreaterThan' && cur <= t) return false
              if (op === 'DateLessThan' && cur >= t) return false
            }
          }
        }
      }
    }
    return true
  }

  private matchPattern(pattern: string, target: string): boolean {
    if (pattern === '*') return true
    if (pattern === target) return true
    if (pattern.endsWith('*')) return target.startsWith(pattern.slice(0, -1))
    return false
  }

  private collectPolicies(principalId: string): IamPolicy[] {
    const ids = new Set<string>()
    const u = this.users.get(principalId)
    if (u) {
      for (const p of u.attachedPolicies) ids.add(p)
      for (const gId of u.groups) {
        const g = this.groups.get(gId)
        if (g) for (const p of g.attachedPolicies) ids.add(p)
      }
    }
    return [...ids].map(id => this.policies.get(id)!).filter(Boolean)
  }

  // ---- Resource ownership ----
  setResourceOwner(resourceId: string, ownerId: string): void {
    this.ownerships.set(resourceId, { resourceId, ownerId, acl: [] })
  }
  getResourceOwner(resourceId: string): ResourceOwnership | null {
    const o = this.ownerships.get(resourceId); return o ? { ...o, acl: [...o.acl] } : null
  }
  grant(resourceId: string, grantee: string, granteeType: ResourceAcl['granteeType'], permissions: string[]): void {
    const o = this.ownerships.get(resourceId)
    if (!o) throw new Error(`Resource ${resourceId} not found`)
    o.acl.push({ grantee, granteeType, permissions: [...permissions] })
  }
  revoke(resourceId: string, grantee: string): void {
    const o = this.ownerships.get(resourceId)
    if (!o) return
    o.acl = o.acl.filter(a => a.grantee !== grantee)
  }
  hasResourcePermission(resourceId: string, grantee: string, permission: string): boolean {
    const o = this.ownerships.get(resourceId); if (!o) return false
    if (o.ownerId === grantee) return true
    for (const a of o.acl) {
      if (a.grantee === grantee || a.grantee === 'public') {
        if (a.permissions.includes(permission) || a.permissions.includes('*')) return true
      }
    }
    return false
  }

  getMetrics() { return { ...this.metrics } }

  // ---- Internals ----
  private hash(s: string): string {
    let h = 5381
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
    return Math.abs(h).toString(36)
  }
}

export const iam = { IamService }
