// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { hasPermission, hasAnyPermission, hasAllPermissions, isRoleAtLeast, ROLE_LABELS, ROLES } from '../permissions'
import { auditLog, type AuditEntry } from '../audit'
import { moderation, reviewContent, type ContentItem } from '../moderation'

beforeEach(() => {
  localStorage.clear()
  auditLog.clear()
  moderation['items'].clear()
  moderation['reports'] = []
})

describe('permissions', () => {
  it('guest 不能创建', () => {
    expect(hasPermission('guest', 'content.create')).toBe(false)
    expect(hasPermission('guest', 'content.view')).toBe(true)
  })

  it('user 能创建/编辑自己内容', () => {
    expect(hasPermission('user', 'content.create')).toBe(true)
    expect(hasPermission('user', 'content.delete')).toBe(false)
  })

  it('moderator 能审核', () => {
    expect(hasPermission('moderator', 'content.review')).toBe(true)
    expect(hasPermission('moderator', 'user.ban')).toBe(true)
    expect(hasPermission('moderator', 'system.configure')).toBe(false)
  })

  it('admin 能配置', () => {
    expect(hasPermission('admin', 'system.configure')).toBe(false)  // admin 没这个
    expect(hasPermission('admin', 'user.ban')).toBe(true)
    expect(hasPermission('admin', 'analytics.export')).toBe(true)
  })

  it('super_admin 通配 *', () => {
    expect(hasPermission('super_admin', 'user.delete')).toBe(true)
    expect(hasPermission('super_admin', 'system.configure')).toBe(true)
  })

  it('owner 全部 *', () => {
    expect(hasPermission('owner', 'anything')).toBe(true)
  })

  it('通配符 resource.* 匹配该资源所有 action', () => {
    expect(hasPermission('super_admin', 'content.delete')).toBe(true)
    expect(hasPermission('super_admin', 'content.view')).toBe(true)
  })

  it('hasAnyPermission / hasAllPermissions', () => {
    expect(hasAnyPermission('user', ['content.delete', 'content.create'])).toBe(true)
    expect(hasAllPermissions('user', ['content.create', 'content.edit'])).toBe(true)
    expect(hasAllPermissions('user', ['content.create', 'content.delete'])).toBe(false)
  })

  it('isRoleAtLeast 层级', () => {
    expect(isRoleAtLeast('admin', 'user')).toBe(true)
    expect(isRoleAtLeast('user', 'admin')).toBe(false)
    expect(isRoleAtLeast('admin', 'admin')).toBe(true)
  })

  it('ROLES 顺序', () => {
    expect(ROLES[0]).toBe('guest')
    expect(ROLES[ROLES.length - 1]).toBe('owner')
  })

  it('ROLE_LABELS 完整', () => {
    for (const r of ROLES) {
      expect(ROLE_LABELS[r]).toBeTruthy()
    }
  })
})

describe('audit log', () => {
  it('record 写入', async () => {
    const e = await auditLog.record({
      actor: { id: 'u1', name: 'A', role: 'user' },
      action: 'content.create',
    })
    expect(e.id).toBeTruthy()
    expect(e.ts).toBeGreaterThan(0)
    expect(e.hash).toBeTruthy()
  })

  it('prevHash 链接', async () => {
    const a = await auditLog.record({ actor: { id: 'u1', name: 'A', role: 'user' }, action: 'content.create' })
    const b = await auditLog.record({ actor: { id: 'u1', name: 'A', role: 'user' }, action: 'content.edit' })
    expect(b.prevHash).toBe(a.hash)
  })

  it('getEntries 过滤', async () => {
    await auditLog.record({ actor: { id: 'u1', name: 'A', role: 'user' }, action: 'content.create' })
    await auditLog.record({ actor: { id: 'u2', name: 'B', role: 'user' }, action: 'user.ban' })
    const u1 = auditLog.getEntries({ actorId: 'u1' })
    expect(u1.length).toBe(1)
    const ban = auditLog.getEntries({ action: 'user.ban' })
    expect(ban.length).toBe(1)
  })

  it('limit 生效', async () => {
    for (let i = 0; i < 10; i++) {
      await auditLog.record({ actor: { id: 'u1', name: 'A', role: 'user' }, action: 'content.create' })
    }
    expect(auditLog.getEntries({ limit: 3 }).length).toBe(3)
  })

  it('verify 完整 → ok', async () => {
    for (let i = 0; i < 3; i++) {
      await auditLog.record({ actor: { id: 'u1', name: 'A', role: 'user' }, action: 'content.create' })
    }
    const v = await auditLog.verify()
    expect(v.ok).toBe(true)
    expect(v.total).toBe(3)
  })

  it('verify 篡改 → brokenAt', async () => {
    await auditLog.record({ actor: { id: 'u1', name: 'A', role: 'user' }, action: 'content.create' })
    // 篡改: 直接修改 entries (绕过 API)
    const entries = auditLog.getEntries() as AuditEntry[]
    entries[0].actor.name = 'HACKER'
    const v = await auditLog.verify()
    expect(v.ok).toBe(false)
    expect(v.brokenAt).toBe(entries[0].id)
  })

  it('export JSON', async () => {
    await auditLog.record({ actor: { id: 'u1', name: 'A', role: 'user' }, action: 'content.create' })
    const json = auditLog.export('json')
    expect(json).toContain('"actor"')
    expect(JSON.parse(json).length).toBe(1)
  })

  it('export CSV', async () => {
    await auditLog.record({ actor: { id: 'u1', name: 'A', role: 'user' }, action: 'content.create' })
    const csv = auditLog.export('csv')
    expect(csv.split('\n').length).toBe(2)  // header + 1
    expect(csv).toContain('actor_id')
  })

  it('subscribe 通知', async () => {
    let captured: AuditEntry | null = null
    const unsub = auditLog.subscribe((e) => { captured = e })
    await auditLog.record({ actor: { id: 'u1', name: 'A', role: 'user' }, action: 'content.create' })
    expect(captured).not.toBeNull()
    unsub()
  })
})

describe('moderation · reviewContent', () => {
  const base: ContentItem = { id: '1', type: 'post', text: '正常内容', authorId: 'u1', createdAt: Date.now() }

  it('正常内容 → approve', () => {
    const r = reviewContent(base)
    expect(r.action).toBe('approve')
    expect(r.score).toBeLessThan(0.2)
  })

  it('含黑名单 → reject', () => {
    const r = reviewContent({ ...base, text: '来澳门威尼斯人赌博吧' })
    expect(['reject', 'flag']).toContain(r.action)
    expect(r.reasons.length).toBeGreaterThan(0)
    expect(r.score).toBeGreaterThan(0.3)
  })

  it('多个 URL → flag', () => {
    const r = reviewContent({ ...base, text: '链接 1 https://a.com 2 https://b.com 3 https://c.com 4 https://d.com' })
    expect(r.reasons.some((x) => x.includes('链接'))).toBe(true)
    expect(r.score).toBeGreaterThan(0.2)
  })

  it('长数字串 (手机号)', () => {
    const r = reviewContent({ ...base, text: '加我 13812345678 私聊' })
    expect(r.reasons.some((x) => x.includes('联系'))).toBe(true)
  })

  it('大量 emoji', () => {
    const r = reviewContent({ ...base, text: '🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉' })
    expect(r.reasons.some((x) => x.includes('emoji'))).toBe(true)
  })

  it('大写比例', () => {
    const r = reviewContent({ ...base, text: 'BUY NOW LIMITED OFFER' })
    expect(r.reasons.some((x) => x.includes('大写'))).toBe(true)
  })

  it('重复字符', () => {
    const r = reviewContent({ ...base, text: '哈哈哈哈哈哈哈哈哈哈' })
    expect(r.reasons.some((x) => x.includes('重复'))).toBe(true)
  })

  it('score 上限 1', () => {
    const r = reviewContent({ ...base, text: '赌博 色情 13812345678 https://a.com https://b.com https://c.com https://d.com 🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰🎰 BUY NOW' })
    expect(r.score).toBeLessThanOrEqual(1)
  })

  it('空文本', () => {
    const r = reviewContent({ ...base, text: '' })
    expect(r.action).toBe('approve')
  })
})

describe('moderation · queue', () => {
  it('submit + list', () => {
    moderation.submit({ itemId: '1', action: 'flag', reasons: ['x'], score: 0.5, auto: true })
    expect(moderation.list().length).toBe(1)
  })

  it('list 过滤', () => {
    moderation.submit({ itemId: '1', action: 'flag', reasons: [], score: 0.5, auto: true })
    moderation.submit({ itemId: '2', action: 'reject', reasons: [], score: 0.9, auto: true })
    expect(moderation.list({ action: 'reject' }).length).toBe(1)
    expect(moderation.list({ minScore: 0.7 }).length).toBe(1)
  })

  it('review 修改', () => {
    moderation.submit({ itemId: '1', action: 'flag', reasons: [], score: 0.5, auto: true })
    moderation.review('1', 'approve', '人工通过', 'admin')
    const r = moderation.getByItemId('1')!
    expect(r.action).toBe('approve')
    expect(r.auto).toBe(false)
  })

  it('addReport + resolve', () => {
    const r = moderation.addReport({ targetType: 'post', targetId: 'p1', reason: 'spam', reporterId: 'u1' })
    expect(r.status).toBe('pending')
    moderation.resolveReport(r.id, 'reviewed')
    expect(moderation.getReports()[0].status).toBe('reviewed')
  })

  it('subscribe 通知', () => {
    let calls = 0
    const unsub = moderation.subscribe(() => calls++)
    moderation.submit({ itemId: '1', action: 'flag', reasons: [], score: 0.5, auto: true })
    moderation.addReport({ targetType: 'post', targetId: 'p1', reason: 'spam', reporterId: 'u1' })
    expect(calls).toBe(2)
    unsub()
  })
})
