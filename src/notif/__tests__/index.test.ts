import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  renderTemplate,
  TemplateRegistry,
  ChannelRegistry,
  NotificationQueue,
  PreferenceManager,
  ThrottleLimiter,
  DigestEngine,
  NotificationService,
  createMockEmailProvider,
  createMockSmsProvider,
  createMockPushProvider,
  createMockInAppProvider,
  createFlakyProvider,
  templates,
  channels,
  queue,
  preferences,
  throttle,
  digests,
  notify,
  type Template,
  type Channel,
  type DeliveryRecord,
} from '../index'

beforeEach(() => {
  templates.clear()
  channels.clear()
  queue.clear()
  preferences.clear()
  throttle.reset()
  digests.clear()
})

// ============== Template Engine ==============

describe('renderTemplate', () => {
  it('substitutes variables', () => {
    expect(renderTemplate('Hello {{name}}!', { name: 'World' })).toBe('Hello World!')
  })
  it('handles missing variables', () => {
    expect(renderTemplate('Hi {{x}}', {})).toBe('Hi ')
  })
  it('renders dot paths', () => {
    expect(renderTemplate('{{a.b}}', { a: { b: 42 } })).toBe('42')
  })
  it('renders conditionals truthy', () => {
    expect(renderTemplate('{{#if x}}yes{{/if}}', { x: 1 })).toBe('yes')
  })
  it('renders conditionals falsy', () => {
    expect(renderTemplate('{{#if x}}yes{{/if}}', { x: 0 })).toBe('')
  })
  it('renders each loop', () => {
    const tpl = '{{#each items}}{{this}},{{/each}}'
    expect(renderTemplate(tpl, { items: ['a', 'b', 'c'] })).toBe('a,b,c,')
  })
  it('renders each with index', () => {
    const tpl = '{{#each items}}{{@index}}:{{this}} {{/each}}'
    expect(renderTemplate(tpl, { items: ['x', 'y'] })).toBe('0:x 1:y ')
  })
  it('renders partials', () => {
    expect(renderTemplate('{{> footer}}', {}, { footer: '© 2024' })).toBe('© 2024')
  })
  it('handles nested paths in if', () => {
    expect(renderTemplate('{{#if user.admin}}ADMIN{{/if}}', { user: { admin: true } })).toBe('ADMIN')
  })
  it('returns empty string for each on non-array', () => {
    expect(renderTemplate('{{#each x}}{{this}}{{/each}}', { x: 'oops' })).toBe('')
  })
})

describe('TemplateRegistry', () => {
  it('registers and renders', () => {
    templates.register({ id: 't1', name: 'Test', channel: 'email', format: 'text', body: 'Hi {{name}}', variables: ['name'] })
    const r = templates.render('t1', { name: 'A' })
    expect(r.body).toBe('Hi A')
  })
  it('updates template', () => {
    templates.register({ id: 't1', name: 'T', channel: 'email', format: 'html', body: 'a' })
    templates.update('t1', { body: 'b' })
    expect(templates.get('t1')!.body).toBe('b')
  })
  it('throws on missing template', () => {
    expect(() => templates.render('nope', {})).toThrow()
  })
  it('removes template', () => {
    templates.register({ id: 't1', name: 'T', channel: 'email', format: 'text', body: 'a' })
    expect(templates.remove('t1')).toBe(true)
    expect(templates.get('t1')).toBeUndefined()
  })
  it('supports locale override', () => {
    templates.register({
      id: 't1', name: 'T', channel: 'email', format: 'text', body: 'Hello', locale: { zh: { body: '你好' } },
    })
    expect(templates.render('t1', {}, 'zh').body).toBe('你好')
  })
  it('partials work via registry', () => {
    templates.register({ id: 't1', name: 'T', channel: 'email', format: 'text', body: '{{> header}}' })
    templates.addPartial('header', '<<H>>')
    expect(templates.render('t1', {}).body).toBe('<<H>>')
  })
  it('list and size', () => {
    templates.register({ id: 'a', name: 'A', channel: 'email', format: 'text', body: 'a' })
    templates.register({ id: 'b', name: 'B', channel: 'sms', format: 'text', body: 'b' })
    expect(templates.size()).toBe(2)
    expect(templates.list().length).toBe(2)
  })
})

// ============== Channel Registry ==============

describe('ChannelRegistry', () => {
  it('registers and returns provider', () => {
    const p = createMockEmailProvider()
    channels.register(p)
    expect(channels.get('email')).toBe(p)
  })
  it('lists all providers for a channel', () => {
    channels.register(createMockEmailProvider('a'))
    channels.register(createMockEmailProvider('b'))
    expect(channels.list('email').length).toBe(2)
  })
  it('all returns all', () => {
    channels.register(createMockEmailProvider())
    channels.register(createMockSmsProvider())
    expect(channels.all().length).toBe(2)
  })
  it('get returns undefined for missing', () => {
    expect(channels.get('sms')).toBeUndefined()
  })
})

// ============== Notification Queue ==============

describe('NotificationQueue', () => {
  it('enqueues and lists', () => {
    queue.enqueue({ userId: 'u1', channel: 'email', template: 't1', data: {}, priority: 'normal', scheduledAt: 0, maxRetries: 3 })
    expect(queue.size()).toBe(1)
  })
  it('respects priority order', () => {
    queue.enqueue({ userId: 'u1', channel: 'email', template: 't1', data: {}, priority: 'low', scheduledAt: 0, maxRetries: 1 })
    queue.enqueue({ userId: 'u1', channel: 'email', template: 't2', data: {}, priority: 'critical', scheduledAt: 0, maxRetries: 1 })
    const list = queue.list()
    expect(list[0]!.priority).toBe('critical')
  })
  it('processes successful messages', async () => {
    const p = createMockEmailProvider()
    channels.register(p)
    queue.enqueue({ userId: 'u1', channel: 'email', template: 't1', data: {}, priority: 'normal', scheduledAt: 0, maxRetries: 3 })
    const results = await queue.process(async (m) => p.send(m))
    expect(results[0]!.success).toBe(true)
    expect(queue.size()).toBe(0)
  })
  it('retries on failure and exhausts', async () => {
    const p = createFlakyProvider(1, 'email')  // 100% fail
    channels.register(p)
    queue.enqueue({ userId: 'u1', channel: 'email', template: 't1', data: {}, priority: 'normal', scheduledAt: 0, maxRetries: 2 })
    const results = await queue.process(async (m) => p.send(m))
    expect(results[0]!.success).toBe(false)
  })
  it('skips scheduled messages in the future', async () => {
    const p = createMockEmailProvider()
    queue.enqueue({ userId: 'u1', channel: 'email', template: 't1', data: {}, priority: 'normal', scheduledAt: Date.now() + 999999, maxRetries: 1 })
    const results = await queue.process(async (m) => p.send(m))
    expect(results.length).toBe(0)
    expect(queue.size()).toBe(1)
  })
  it('dedupes by key', () => {
    const a = queue.enqueue({ userId: 'u1', channel: 'email', template: 't1', data: {}, priority: 'normal', scheduledAt: 0, maxRetries: 1, dedupeKey: 'k1' })
    const b = queue.enqueue({ userId: 'u1', channel: 'email', template: 't1', data: {}, priority: 'normal', scheduledAt: 0, maxRetries: 1, dedupeKey: 'k1' })
    expect(a.id).toBe(b.id)
    expect(queue.size()).toBe(1)
  })
  it('records delivery', async () => {
    const p = createMockEmailProvider()
    channels.register(p)
    const m = queue.enqueue({ userId: 'u1', channel: 'email', template: 't1', data: {}, priority: 'normal', scheduledAt: 0, maxRetries: 1 })
    await queue.process(async (m) => p.send(m))
    const rec = queue.getDelivery(m.id)
    expect(rec).toBeDefined()
    expect(rec!.status).toBe('sent')
  })
  it('clear empties queue', () => {
    queue.enqueue({ userId: 'u1', channel: 'email', template: 't1', data: {}, priority: 'normal', scheduledAt: 0, maxRetries: 1 })
    queue.clear()
    expect(queue.size()).toBe(0)
  })
})

// ============== Preferences ==============

describe('PreferenceManager', () => {
  it('returns default prefs', () => {
    const p = preferences.get('u1')
    expect(p.locale).toBe('en')
    expect(p.channels.email).toBe(true)
  })
  it('updates prefs', () => {
    preferences.set('u1', { locale: 'zh' })
    expect(preferences.get('u1').locale).toBe('zh')
  })
  it('checks channel enabled', () => {
    preferences.set('u1', { channels: { ...preferences.get('u1').channels, sms: true } })
    expect(preferences.isChannelEnabled('u1', 'sms')).toBe(true)
  })
  it('checks category default true', () => {
    expect(preferences.isCategoryEnabled('u1', 'marketing')).toBe(true)
  })
  it('checks category disabled', () => {
    preferences.set('u1', { categories: { marketing: false } })
    expect(preferences.isCategoryEnabled('u1', 'marketing')).toBe(false)
  })
  it('detects DND inside window', () => {
    const now = new Date()
    const start = `${String(now.getHours()).padStart(2, '0')}:00`
    const end = `${String((now.getHours() + 1) % 24).padStart(2, '0')}:00`
    preferences.set('u1', { dndStart: start, dndEnd: end })
    expect(preferences.isDndActive('u1')).toBe(true)
  })
  it('DND inactive outside window', () => {
    preferences.set('u1', { dndStart: '03:00', dndEnd: '04:00' })
    const h = new Date().getHours()
    if (h !== 3) expect(preferences.isDndActive('u1')).toBe(false)
  })
})

// ============== Throttle Limiter ==============

describe('ThrottleLimiter', () => {
  it('allows under limit', () => {
    const c = throttle.check('u1', 'email', 5)
    expect(c.allowed).toBe(true)
  })
  it('blocks over limit', () => {
    for (let i = 0; i < 5; i++) throttle.increment('u1', 'email')
    const c = throttle.check('u1', 'email', 5)
    expect(c.allowed).toBe(false)
    expect(c.count).toBe(5)
  })
  it('reset clears', () => {
    throttle.increment('u1', 'email')
    throttle.reset('u1')
    const c = throttle.check('u1', 'email', 1)
    expect(c.count).toBe(0)
  })
})

// ============== Digest Engine ==============

describe('DigestEngine', () => {
  it('adds and flushes', () => {
    const rec: DeliveryRecord = { messageId: 'm1', userId: 'u1', channel: 'email', template: 't', status: 'sent', attempts: 1, createdAt: 0 }
    digests.addToDigest(rec, 'daily')
    digests.addToDigest({ ...rec, messageId: 'm2' }, 'daily')
    const out = digests.flush('daily')
    expect(out.length).toBe(1)
    expect(out[0]!.notifications.length).toBe(2)
  })
  it('skips digests with single notification', () => {
    const rec: DeliveryRecord = { messageId: 'm1', userId: 'u1', channel: 'email', template: 't', status: 'sent', attempts: 1, createdAt: 0 }
    digests.addToDigest(rec, 'daily')
    const out = digests.flush('daily')
    expect(out.length).toBe(0)
  })
  it('list and clear', () => {
    const rec: DeliveryRecord = { messageId: 'm1', userId: 'u1', channel: 'email', template: 't', status: 'sent', attempts: 1, createdAt: 0 }
    digests.addToDigest(rec, 'hourly')
    digests.addToDigest({ ...rec, messageId: 'm2' }, 'hourly')
    digests.flush('hourly')
    expect(digests.list().length).toBe(1)
    digests.clear()
    expect(digests.list().length).toBe(0)
  })
  it('pending_ counts', () => {
    const rec: DeliveryRecord = { messageId: 'm1', userId: 'u1', channel: 'email', template: 't', status: 'sent', attempts: 1, createdAt: 0 }
    digests.addToDigest(rec, 'weekly')
    expect(digests.pending_('weekly')).toBe(1)
  })
})

// ============== Notification Service ==============

describe('NotificationService', () => {
  it('sends end-to-end', async () => {
    channels.register(createMockEmailProvider())
    templates.register({ id: 'welcome', name: 'W', channel: 'email', format: 'text', body: 'Hi {{n}}', variables: ['n'] })
    const r = await notify.send({ userId: 'u1', channel: 'email', template: 'welcome', data: { n: 'A' } })
    expect(r.ok).toBe(true)
  })
  it('rejects if channel disabled', async () => {
    channels.register(createMockEmailProvider())
    preferences.set('u1', { channels: { ...preferences.get('u1').channels, email: false } })
    const r = await notify.send({ userId: 'u1', channel: 'email', template: 't', data: {} })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('channel disabled')
  })
  it('rejects if no provider', async () => {
    templates.register({ id: 't', name: 'T', channel: 'email', format: 'text', body: 'a' })
    const r = await notify.send({ userId: 'u1', channel: 'email', template: 't', data: {} })
    expect(r.ok).toBe(false)
  })
  it('rejects on DND unless critical', async () => {
    channels.register(createMockEmailProvider())
    templates.register({ id: 't', name: 'T', channel: 'email', format: 'text', body: 'a' })
    preferences.set('u1', { dndStart: '00:00', dndEnd: '23:59' })
    const r = await notify.send({ userId: 'u1', channel: 'email', template: 't', data: {} })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('DND active')
  })
  it('rejects on rate limit', async () => {
    channels.register(createMockEmailProvider())
    templates.register({ id: 't', name: 'T', channel: 'email', format: 'text', body: 'a' })
    preferences.set('u1', { ratePerHour: 1 })
    await notify.send({ userId: 'u1', channel: 'email', template: 't', data: {} })
    const r = await notify.send({ userId: 'u1', channel: 'email', template: 't', data: {} })
    expect(r.ok).toBe(false)
    expect(r.reason).toBe('rate limit exceeded')
  })
  it('marks as read', async () => {
    channels.register(createMockInAppProvider())
    templates.register({ id: 't', name: 'T', channel: 'inapp', format: 'text', body: 'a' })
    const r = await notify.send({ userId: 'u1', channel: 'inapp', template: 't', data: {} })
    if (r.record) {
      expect(notify.markRead(r.record.messageId)).toBe(true)
      expect(queue.getDelivery(r.record.messageId)!.status).toBe('read')
    }
  })
  it('uses priority', async () => {
    channels.register(createMockEmailProvider())
    templates.register({ id: 't', name: 'T', channel: 'email', format: 'text', body: 'a' })
    const r = await notify.send({ userId: 'u1', channel: 'email', template: 't', data: {}, priority: 'critical' })
    expect(r.ok).toBe(true)
  })
})

// ============== Mock Providers ==============

describe('Mock Providers', () => {
  it('email mock returns sent', async () => {
    const p = createMockEmailProvider()
    const r = await p.send({ id: 'm', userId: 'u', channel: 'email', template: 't', data: {}, priority: 'normal', scheduledAt: 0, maxRetries: 1, attempts: 1, createdAt: 0 })
    expect(r.status).toBe('sent')
  })
  it('sms mock returns sent', async () => {
    const r = await createMockSmsProvider().send({ id: 'm', userId: 'u', channel: 'sms', template: 't', data: {}, priority: 'normal', scheduledAt: 0, maxRetries: 1, attempts: 1, createdAt: 0 })
    expect(r.status).toBe('sent')
  })
  it('push mock returns sent', async () => {
    const r = await createMockPushProvider().send({ id: 'm', userId: 'u', channel: 'push', template: 't', data: {}, priority: 'normal', scheduledAt: 0, maxRetries: 1, attempts: 1, createdAt: 0 })
    expect(r.status).toBe('sent')
  })
  it('inapp mock returns delivered', async () => {
    const r = await createMockInAppProvider().send({ id: 'm', userId: 'u', channel: 'inapp', template: 't', data: {}, priority: 'normal', scheduledAt: 0, maxRetries: 1, attempts: 1, createdAt: 0 })
    expect(r.status).toBe('delivered')
  })
})
