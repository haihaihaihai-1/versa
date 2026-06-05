// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  pluginRegistry, marketplace, eventBus, runSandboxedSync, checkPermission,
  type PluginManifest,
} from '../index'

beforeEach(() => {
  for (const p of pluginRegistry.list()) pluginRegistry.uninstall(p.manifest.id)
  eventBus.getHistory().length = 0
})

const validManifest: PluginManifest = {
  id: 'test-plugin', name: 'Test', version: '1.0.0', author: 'me',
  description: 'd', permissions: ['storage.read', 'event.subscribe'],
}

describe('PluginRegistry · validate', () => {
  it('通过合法 manifest', () => {
    const v = pluginRegistry.validate(validManifest)
    expect(v.ok).toBe(true)
  })

  it('缺少 id', () => {
    const v = pluginRegistry.validate({ ...validManifest, id: '' })
    expect(v.ok).toBe(false)
    expect(v.errors).toContain('id is required')
  })

  it('id 非 kebab-case', () => {
    const v = pluginRegistry.validate({ ...validManifest, id: 'BadId' })
    expect(v.ok).toBe(false)
  })

  it('version 非 semver', () => {
    const v = pluginRegistry.validate({ ...validManifest, version: '1.0' })
    expect(v.ok).toBe(false)
  })

  it('permissions 非数组', () => {
    const v = pluginRegistry.validate({ ...validManifest, permissions: 'foo' as any })
    expect(v.ok).toBe(false)
  })
})

describe('PluginRegistry · install/enable/disable/uninstall', () => {
  it('install', () => {
    const p = pluginRegistry.install(validManifest)
    expect(p.status).toBe('installed')
    expect(p.installedAt).toBeGreaterThan(0)
  })

  it('enable', () => {
    pluginRegistry.install(validManifest)
    const p = pluginRegistry.enable('test-plugin')
    expect(p!.status).toBe('enabled')
    expect(p!.enabledAt).toBeGreaterThan(0)
  })

  it('disable', () => {
    pluginRegistry.install(validManifest)
    pluginRegistry.enable('test-plugin')
    pluginRegistry.disable('test-plugin')
    expect(pluginRegistry.get('test-plugin')!.status).toBe('disabled')
  })

  it('uninstall 删除', () => {
    pluginRegistry.install(validManifest)
    expect(pluginRegistry.uninstall('test-plugin')).toBe(true)
    expect(pluginRegistry.get('test-plugin')).toBeUndefined()
  })

  it('uninstall 不存在返回 false', () => {
    expect(pluginRegistry.uninstall('nope')).toBe(false)
  })

  it('enable 时执行 code', () => {
    pluginRegistry.install({ ...validManifest, id: 'with-code' }, `return { greet: 'hi' }`)
    pluginRegistry.enable('with-code')
    const p = pluginRegistry.get('with-code')!
    expect(p.exports).toEqual({ greet: 'hi' })
  })

  it('enable 错误 code → status=error', () => {
    pluginRegistry.install({ ...validManifest, id: 'bad-code' }, `return notDefinedFoo`)
    const p = pluginRegistry.enable('bad-code')!
    expect(p.status).toBe('error')
    expect(p.error).toBeTruthy()
  })

  it('list 过滤 status', () => {
    pluginRegistry.install({ ...validManifest, id: 'a' })
    pluginRegistry.install({ ...validManifest, id: 'b' })
    pluginRegistry.enable('a')
    expect(pluginRegistry.list({ status: 'enabled' }).length).toBe(1)
    expect(pluginRegistry.list({ status: 'installed' }).length).toBe(1)
  })

  it('list 过滤 permission', () => {
    pluginRegistry.install({ ...validManifest, id: 'x', permissions: ['storage.read'] })
    pluginRegistry.install({ ...validManifest, id: 'y', permissions: ['network.fetch'] })
    expect(pluginRegistry.list({ permission: 'network.fetch' }).length).toBe(1)
  })
})

describe('EventBus', () => {
  it('subscribe + publish', () => {
    let got: any = null
    const unique = 'test-' + Math.random()
    eventBus.subscribe(unique, (d) => { got = d })
    eventBus.publish(unique, { x: 1 })
    expect(got).toEqual({ x: 1 })
  })

  it('unsubscribe', () => {
    let count = 0
    const unique = 'unsub-' + Math.random()
    const unsub = eventBus.subscribe(unique, () => count++)
    eventBus.publish(unique, 1)
    unsub()
    eventBus.publish(unique, 1)
    expect(count).toBe(1)
  })

  it('* 通配符', () => {
    let all = 0
    const unique = 'wild-' + Math.random()
    eventBus.subscribe('*', (e: any) => { if (e.event?.startsWith('zzz-')) all++ })
    eventBus.publish('zzz-a', 1)
    eventBus.publish('zzz-b', 2)
    expect(all).toBe(2)
  })

  it('history 累积', () => {
    const unique = 'hist-' + Math.random()
    const before = eventBus.getHistory().length
    eventBus.publish(unique + '-a', 1)
    eventBus.publish(unique + '-b', 2)
    expect(eventBus.getHistory(unique + '-a').length).toBe(1)
    expect(eventBus.getHistory(unique + '-b').length).toBe(1)
  })

  it('history 过滤 event', () => {
    const unique = 'filt-' + Math.random()
    eventBus.publish(unique, 1)
    eventBus.publish(unique, 2)
    eventBus.publish('other', 3)
    expect(eventBus.getHistory(unique).length).toBe(2)
  })

  it('listenerCount', () => {
    const unique = 'count-' + Math.random()
    eventBus.subscribe(unique, () => {})
    eventBus.subscribe(unique, () => {})
    expect(eventBus.listenerCount(unique)).toBe(2)
  })

  it('handler 错误不影响其他', () => {
    let count = 0
    const unique = 'err-' + Math.random()
    eventBus.subscribe(unique, () => { throw new Error() })
    eventBus.subscribe(unique, () => count++)
    eventBus.publish(unique, 1)
    expect(count).toBe(1)
  })
})

describe('runSandboxedSync', () => {
  it('基本返回', () => {
    const r = runSandboxedSync('return 1 + 2')
    expect(r.ok).toBe(true)
    expect(r.value).toBe(3)
  })

  it('可访问 api', () => {
    const api = {
      storage: { get: () => 'v', set: () => {} },
      events: eventBus,
      analytics: { track: () => {} },
      log: () => {},
    }
    const r = runSandboxedSync('return api.storage.get()', api)
    expect(r.value).toBe('v')
  })

  it('api.set 抛错', () => {
    const r = runSandboxedSync('return notDefined', {})
    expect(r.ok).toBe(false)
    expect(r.error).toBeTruthy()
  })

  it('durationMs 记录', () => {
    const r = runSandboxedSync('return 1')
    expect(r.durationMs).toBeGreaterThanOrEqual(0)
  })
})

describe('checkPermission', () => {
  it('已授权', () => {
    expect(checkPermission('storage.read', ['storage.read', 'storage.write'])).toBe(true)
  })
  it('未授权', () => {
    expect(checkPermission('network.fetch', ['storage.read'])).toBe(false)
  })
})

describe('Marketplace', () => {
  beforeEach(() => {
    for (const e of marketplace.search()) marketplace.uninstall(e.id)
  })

  it('内置 4 个插件', () => {
    expect(marketplace.search().length).toBeGreaterThanOrEqual(4)
  })

  it('search by query', () => {
    const r = marketplace.search('analytics')
    expect(r.length).toBeGreaterThan(0)
  })

  it('search by tag', () => {
    expect(marketplace.search('', 'analytics').length).toBeGreaterThan(0)
  })

  it('install 增加下载量', () => {
    const e = marketplace.search()[0]
    const before = e.downloads
    marketplace.install(e.id)
    expect(e.downloads).toBe(before + 1)
  })

  it('topDownloads 排序', () => {
    const r = marketplace.topDownloads()
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].downloads).toBeGreaterThanOrEqual(r[i].downloads)
    }
  })

  it('topRated 排序', () => {
    const r = marketplace.topRated()
    for (let i = 1; i < r.length; i++) {
      expect(r[i - 1].rating).toBeGreaterThanOrEqual(r[i].rating)
    }
  })

  it('isInstalled', () => {
    const e = marketplace.search()[0]
    expect(marketplace.isInstalled(e.id)).toBe(false)
    marketplace.install(e.id)
    expect(marketplace.isInstalled(e.id)).toBe(true)
  })
})
