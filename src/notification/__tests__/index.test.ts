import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NotificationCenter, type Notification, type ChannelSender } from '../index'

function mockSender(channel: any, ok = true): ChannelSender {
  return { channel, send: async () => ({ ok, providerId: 'mock-' + channel }) }
}
function failingSender(channel: any): ChannelSender {
  return { channel, send: async () => ({ ok: false, error: 'mock_fail' }) }
}

describe('NotificationCenter · templates', () => {
  let nc: NotificationCenter
  beforeEach(() => { nc = new NotificationCenter() })
  it('createTemplate + extract variables', () => {
    const t = nc.createTemplate({ name: 'welcome', channel: 'email', category: 'system', subject: 'Hi {{name}}', body: 'Welcome {{user.name}}!', locale: 'en' })
    expect(t.variables).toContain('name')
    expect(t.variables).toContain('user.name')
  })
  it('listTemplates filters', () => {
    nc.createTemplate({ name: 'a', channel: 'email', category: 'order', body: '', locale: 'en' })
    nc.createTemplate({ name: 'b', channel: 'sms', category: 'order', body: '', locale: 'en' })
    expect(nc.listTemplates({ channel: 'email' }).length).toBe(1)
    expect(nc.listTemplates({ category: 'order' }).length).toBe(2)
  })
  it('updateTemplate', () => {
    const t = nc.createTemplate({ name: 'a', channel: 'email', category: 'order', body: 'Hello {{name}}', locale: 'en' })
    nc.updateTemplate(t.id, { body: 'Hi {{name}} from {{from}}' })
    expect(nc.getTemplate(t.id)!.variables).toContain('from')
  })
  it('deleteTemplate', () => {
    const t = nc.createTemplate({ name: 'a', channel: 'email', category: 'order', body: '', locale: 'en' })
    expect(nc.deleteTemplate(t.id)).toBe(true)
    expect(nc.getTemplate(t.id)).toBeUndefined()
  })
  it('render', () => {
    expect(nc.render('Hi {{name}}', { name: 'Alice' })).toBe('Hi Alice')
    expect(nc.render('Nested {{a.b.c}}', { a: { b: { c: 42 } } })).toBe('Nested 42')
    expect(nc.render('Missing {{x}}', {})).toBe('Missing ')
  })
})

describe('NotificationCenter · preferences', () => {
  let nc: NotificationCenter
  beforeEach(() => { nc = new NotificationCenter() })
  it('getOrCreatePreferences returns defaults', () => {
    const p = nc.getOrCreatePreferences('u1')
    expect(p.userId).toBe('u1')
    expect(p.channels.email.enabled).toBe(true)
    expect(p.rateLimit.maxPerHour).toBe(50)
  })
  it('setPreferences + getPreferences', () => {
    const p = nc.getOrCreatePreferences('u1')
    nc.setPreferences(p)
    expect(nc.getPreferences('u1')!.userId).toBe('u1')
  })
  it('updatePreferences', () => {
    nc.getOrCreatePreferences('u1')
    const u = nc.updatePreferences('u1', { rateLimit: { maxPerHour: 10, maxPerDay: 100 } })
    expect(u?.rateLimit.maxPerHour).toBe(10)
  })
  it('isAccepted: muted', () => {
    const p = nc.getOrCreatePreferences('u1')
    nc.mute('u1', Date.now() + 10_000)
    const r = nc.isAccepted('u1', 'email', 'order')
    expect(r.accepted).toBe(false)
    expect(r.reason).toBe('muted')
  })
  it('isAccepted: snoozed', () => {
    nc.getOrCreatePreferences('u1')
    nc.snooze('u1', Date.now() + 10_000)
    const r = nc.isAccepted('u1', 'email', 'order')
    expect(r.accepted).toBe(false)
    expect(r.reason).toBe('snoozed')
  })
  it('isAccepted: channel disabled', () => {
    const p = nc.getOrCreatePreferences('u1')
    p.channels.email.enabled = false
    const r = nc.isAccepted('u1', 'email', 'order')
    expect(r.accepted).toBe(false)
    expect(r.reason).toBe('channel_disabled')
  })
  it('isAccepted: category disabled', () => {
    const p = nc.getOrCreatePreferences('u1')
    p.categories.marketing.enabled = true // enable
    p.categories.marketing.enabled = false
    const r = nc.isAccepted('u1', 'email', 'marketing')
    expect(r.accepted).toBe(false)
    expect(r.reason).toBe('category_disabled')
  })
  it('isAccepted: channel not in category list', () => {
    const p = nc.getOrCreatePreferences('u1')
    p.categories.order.channels = ['in-app']
    const r = nc.isAccepted('u1', 'email', 'order')
    expect(r.accepted).toBe(false)
    expect(r.reason).toBe('channel_not_in_category')
  })
  it('isAccepted: quiet hours', () => {
    const p = nc.getOrCreatePreferences('u1')
    p.channels.email.quietHoursStart = 0
    p.channels.email.quietHoursEnd = 24 // always quiet
    const r = nc.isAccepted('u1', 'email', 'order')
    expect(r.accepted).toBe(false)
    expect(r.reason).toBe('quiet_hours')
  })
  it('isAccepted: rate limit hour', async () => {
    const p = nc.getOrCreatePreferences('u1')
    p.rateLimit.maxPerHour = 1
    nc.registerSender(mockSender('email'))
    await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: 'a' })
    const r = nc.isAccepted('u1', 'email', 'order')
    expect(r.accepted).toBe(false)
    expect(r.reason).toBe('rate_limit_hour')
  })
  it('isAccepted: no prefs = accept', () => {
    expect(nc.isAccepted('nobody', 'email', 'order').accepted).toBe(true)
  })
  it('unmute / unsnooze', () => {
    nc.getOrCreatePreferences('u1')
    nc.mute('u1', Date.now() + 10_000)
    nc.unmute('u1')
    expect(nc.isAccepted('u1', 'email', 'order').accepted).toBe(true)
    nc.snooze('u1', Date.now() + 10_000)
    nc.unsnooze('u1')
    expect(nc.isAccepted('u1', 'email', 'order').accepted).toBe(true)
  })
})

describe('NotificationCenter · senders', () => {
  it('register + unregister', () => {
    const nc = new NotificationCenter()
    nc.registerSender(mockSender('email'))
    expect(nc['senders'].length).toBe(1)
    nc.unregisterSender('email')
    expect(nc['senders'].length).toBe(0)
  })
})

describe('NotificationCenter · send', () => {
  let nc: NotificationCenter
  beforeEach(() => { nc = new NotificationCenter() })
  it('success', async () => {
    nc.registerSender(mockSender('email'))
    const n = await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: 'hi' })
    expect(n.status).toBe('sent')
    expect(n.sentAt).toBeDefined()
  })
  it('in-app status is unread', async () => {
    nc.registerSender(mockSender('in-app'))
    const n = await nc.send({ userId: 'u1', channel: 'in-app', category: 'order', priority: 'normal', body: 'hi' })
    expect(n.status).toBe('unread')
  })
  it('failure (no sender)', async () => {
    const n = await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: 'hi' })
    expect(n.status).toBe('failed')
    expect(n.failureReason).toBe('no_sender')
  })
  it('failure (sender returns error)', async () => {
    nc.registerSender(failingSender('email'))
    const n = await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: 'hi', maxAttempts: 1 })
    expect(n.status).toBe('failed')
    expect(n.failureReason).toBe('mock_fail')
  })
  it('rejected (muted)', async () => {
    nc.registerSender(mockSender('email'))
    nc.mute('u1', Date.now() + 10_000)
    const n = await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: 'hi' })
    expect(n.status).toBe('failed')
    expect(n.failureReason).toBe('muted')
  })
  it('scheduled for future', async () => {
    nc.registerSender(mockSender('email'))
    const n = await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: 'hi', scheduledFor: Date.now() + 60_000 })
    expect(n.status).toBe('scheduled')
  })
  it('retries on failure', async () => {
    let count = 0
    nc.registerSender({ channel: 'email', send: async () => { count++; return count < 2 ? { ok: false, error: 'fail' } : { ok: true, providerId: 'ok' } } })
    const n = await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: 'hi' })
    expect(n.status).toBe('sent')
    expect(count).toBe(2)
  })
  it('applies template', async () => {
    nc.registerSender(mockSender('email'))
    const t = nc.createTemplate({ name: 'welcome', channel: 'email', category: 'order', subject: 'Hello {{name}}', body: 'Welcome {{name}}!', locale: 'en' })
    const n = await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: 'placeholder', templateId: t.id, data: { name: 'Alice' } })
    expect(n.subject).toBe('Hello Alice')
    expect(n.body).toBe('Welcome Alice!')
  })
  it('attempts incremented on each try', async () => {
    nc.registerSender(mockSender('email'))
    const n = await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: 'hi' })
    expect(n.attempts).toBe(1)
  })
})

describe('NotificationCenter · scheduler', () => {
  it('processes scheduled', async () => {
    const nc = new NotificationCenter()
    nc.registerSender(mockSender('email'))
    const n = await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: 'hi', scheduledFor: Date.now() + 50 })
    expect(n.status).toBe('scheduled')
    await new Promise(r => setTimeout(r, 100))
    await nc['processScheduled']()
    expect(nc.get(n.id)!.status).toBe('sent')
  })
  it('startScheduler / stopScheduler', () => {
    const nc = new NotificationCenter()
    nc.startScheduler(100)
    expect(nc['scheduled']).not.toBeNull()
    nc.stopScheduler()
    expect(nc['scheduled']).toBeNull()
  })
})

describe('NotificationCenter · read/unread', () => {
  it('markRead', async () => {
    const nc = new NotificationCenter()
    nc.registerSender(mockSender('in-app'))
    const n = await nc.send({ userId: 'u1', channel: 'in-app', category: 'order', priority: 'normal', body: 'hi' })
    expect(nc.markRead(n.id)).toBe(true)
    expect(nc.get(n.id)!.status).toBe('read')
  })
  it('markRead on missing returns false', () => {
    const nc = new NotificationCenter()
    expect(nc.markRead('x')).toBe(false)
  })
  it('markAllRead', async () => {
    const nc = new NotificationCenter()
    nc.registerSender(mockSender('in-app'))
    await nc.send({ userId: 'u1', channel: 'in-app', category: 'order', priority: 'normal', body: '1' })
    await nc.send({ userId: 'u1', channel: 'in-app', category: 'order', priority: 'normal', body: '2' })
    await nc.send({ userId: 'u2', channel: 'in-app', category: 'order', priority: 'normal', body: '3' })
    expect(nc.markAllRead('u1')).toBe(2)
  })
  it('unreadCount', async () => {
    const nc = new NotificationCenter()
    nc.registerSender(mockSender('in-app'))
    await nc.send({ userId: 'u1', channel: 'in-app', category: 'order', priority: 'normal', body: '1' })
    await nc.send({ userId: 'u1', channel: 'in-app', category: 'order', priority: 'normal', body: '2' })
    expect(nc.unreadCount('u1')).toBe(2)
  })
  it('snoozeNotification + muteNotification', async () => {
    const nc = new NotificationCenter()
    nc.registerSender(mockSender('in-app'))
    const n = await nc.send({ userId: 'u1', channel: 'in-app', category: 'order', priority: 'normal', body: 'hi' })
    expect(nc.snoozeNotification(n.id, Date.now() + 1000)).toBe(true)
    expect(nc.get(n.id)!.status).toBe('snoozed')
    expect(nc.muteNotification(n.id)).toBe(true)
    expect(nc.get(n.id)!.status).toBe('muted')
  })
  it('snoozeNotification / mute on missing', () => {
    const nc = new NotificationCenter()
    expect(nc.snoozeNotification('x', 0)).toBe(false)
    expect(nc.muteNotification('x')).toBe(false)
  })
})

describe('NotificationCenter · list / query', () => {
  it('list filters', async () => {
    const nc = new NotificationCenter()
    nc.registerSender(mockSender('email'))
    nc.registerSender(mockSender('sms'))
    await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: '1' })
    await nc.send({ userId: 'u1', channel: 'sms', category: 'order', priority: 'normal', body: '2' })
    await nc.send({ userId: 'u2', channel: 'email', category: 'order', priority: 'normal', body: '3' })
    expect(nc.list({ userId: 'u1' }).length).toBe(2)
    expect(nc.list({ channel: 'sms' }).length).toBe(1)
    expect(nc.list({ category: 'order' }).length).toBe(3)
    expect(nc.list({ status: 'sent' }).length).toBe(3)
  })
  it('list with since', async () => {
    const nc = new NotificationCenter()
    nc.registerSender(mockSender('email'))
    await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: '1' })
    await new Promise(r => setTimeout(r, 5))
    const t = Date.now()
    await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: '2' })
    expect(nc.list({ since: t }).length).toBe(1)
  })
  it('get', async () => {
    const nc = new NotificationCenter()
    nc.registerSender(mockSender('email'))
    const n = await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: '1' })
    expect(nc.get(n.id)!.id).toBe(n.id)
  })
})

describe('NotificationCenter · grouping + digest', () => {
  it('groups in-app notifications', async () => {
    const nc = new NotificationCenter()
    nc.registerSender(mockSender('in-app'))
    await nc.send({ userId: 'u1', channel: 'in-app', category: 'order', priority: 'normal', body: '1' })
    await nc.send({ userId: 'u1', channel: 'in-app', category: 'order', priority: 'normal', body: '2' })
    await nc.send({ userId: 'u1', channel: 'in-app', category: 'social', priority: 'normal', body: '3' })
    const groups = nc.listGroups('u1')
    expect(groups.length).toBe(2)
    expect(groups.find(g => g.category === 'order')!.count).toBe(2)
  })
  it('buildDigest', async () => {
    const nc = new NotificationCenter()
    nc.registerSender(mockSender('in-app'))
    nc.registerSender(mockSender('email'))
    await nc.send({ userId: 'u1', channel: 'in-app', category: 'order', priority: 'normal', body: 'a' })
    await nc.send({ userId: 'u1', channel: 'in-app', category: 'order', priority: 'normal', body: 'b' })
    const groups = nc.listGroups('u1')
    const digest = await nc.buildDigest(groups[0].id)
    expect(digest).not.toBeNull()
    expect(digest!.body).toContain('new order')
  })
  it('buildDigest on missing returns null', async () => {
    const nc = new NotificationCenter()
    expect(await nc.buildDigest('nope')).toBeNull()
  })
})

describe('NotificationCenter · stats', () => {
  it('totals', async () => {
    const nc = new NotificationCenter()
    nc.registerSender(mockSender('email'))
    nc.registerSender(mockSender('in-app'))
    await nc.send({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: '1' })
    await nc.send({ userId: 'u1', channel: 'in-app', category: 'order', priority: 'normal', body: '2' })
    const s = nc.getStats()
    expect(s.total).toBe(2)
    expect(s.sent).toBe(2)
    expect(s.byChannel.email).toBe(1)
    expect(s.byCategory.order).toBe(2)
  })
  it('resetStats', () => {
    const nc = new NotificationCenter()
    nc.resetStats()
    expect(nc.getStats().total).toBe(0)
  })
})

describe('NotificationCenter · federation', () => {
  it('sendWithRetry', async () => {
    const nc = new NotificationCenter()
    nc.registerSender(mockSender('email'))
    const n = await nc.sendWithRetry({ userId: 'u1', channel: 'email', category: 'order', priority: 'normal', body: 'hi' })
    expect(n.status).toBe('sent')
  })
  it('computeBackoffFor exponential', () => {
    const nc = new NotificationCenter()
    const b1 = nc.computeBackoffFor(1)
    const b2 = nc.computeBackoffFor(2)
    const b3 = nc.computeBackoffFor(3)
    expect(b2).toBeGreaterThanOrEqual(b1)
    expect(b3).toBeGreaterThanOrEqual(b2)
  })
})

describe('NotificationCenter · singleton', () => {
  it('getNotificationCenter / reset', async () => {
    const m = await import('../index')
    const a = m.getNotificationCenter()
    const b = m.getNotificationCenter()
    expect(a).toBe(b)
    m.resetNotificationCenter()
    const c = m.getNotificationCenter()
    expect(c).not.toBe(a)
  })
})
