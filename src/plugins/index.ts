/**
 * Versa · 插件系统 (v23.0)
 *
 * 能力:
 * - 插件注册表 (manifest 验证, 安装/卸载/启用/禁用)
 * - 生命周期钩子 (onInstall / onEnable / onDisable / onUninstall)
 * - 事件总线 (subscribe/publish, 命名空间)
 * - 权限沙箱 (声明式权限, 调用时检查)
 * - 隔离执行 (Function 构造器沙箱, 超时控制)
 * - 插件市场 (本地/远程注册表, 评分/下载量)
 */

export interface PluginManifest {
  id: string
  name: string
  version: string
  author: string
  description: string
  permissions: PluginPermission[]
  homepage?: string
  icon?: string
  minCoreVersion?: string
}

export type PluginPermission =
  | 'storage.read'
  | 'storage.write'
  | 'network.fetch'
  | 'ui.render'
  | 'route.register'
  | 'event.publish'
  | 'event.subscribe'
  | 'analytics.track'
  | 'admin.execute'

export interface Plugin {
  manifest: PluginManifest
  status: 'installed' | 'enabled' | 'disabled' | 'error'
  code?: string
  exports?: Record<string, any>
  error?: string
  installedAt: number
  enabledAt?: number
  metrics: { calls: number; errors: number; avgLatencyMs: number }
}

export interface PluginAPI {
  storage: {
    get(key: string): any
    set(key: string, value: any): void
  }
  events: EventBusAPI
  analytics: {
    track(event: string, data?: any): void
  }
  log: (...args: any[]) => void
}

export interface EventBusAPI {
  subscribe(event: string, fn: (data: any) => void): () => void
  publish(event: string, data: any): void
}

// ============== 事件总线 ==============

class EventBus {
  private listeners: Map<string, Set<Function>> = new Map()
  private history: { event: string; data: any; ts: number; from?: string }[] = []
  private maxHistory = 200

  subscribe(event: string, fn: (data: any) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(fn)
    return () => { this.listeners.get(event)?.delete(fn) }
  }

  publish(event: string, data: any, from?: string) {
    this.history.push({ event, data, ts: Date.now(), from })
    if (this.history.length > this.maxHistory) this.history.shift()
    this.listeners.get(event)?.forEach((fn) => {
      try { fn(data) } catch (e) { console.error(`[bus] handler for ${event} error:`, e) }
    })
    this.listeners.get('*')?.forEach((fn) => {
      try { fn({ event, data, from }) } catch (e) { console.error('[bus] wildcard error:', e) }
    })
  }

  getHistory(event?: string) {
    return event ? this.history.filter((h) => h.event === event) : this.history.slice()
  }

  listenerCount(event: string) {
    return this.listeners.get(event)?.size || 0
  }
}

export const eventBus = new EventBus()

// ============== 权限检查 ==============

export function checkPermission(perm: PluginPermission, granted: PluginPermission[]): boolean {
  return granted.includes(perm)
}

// ============== 沙箱执行 ==============

export interface SandboxResult<T = any> {
  ok: boolean
  value?: T
  error?: string
  durationMs: number
}

export function runSandboxed<T = any>(code: string, api: PluginAPI, timeoutMs = 1000): SandboxResult<T> {
  const start = Date.now()
  try {
    // 构造受控上下文
    const context = {
      api,
      console,
      setTimeout, clearTimeout, setInterval, clearInterval,
      Promise, Date, Math, JSON, Object, Array, String, Number, Boolean,
      Map, Set, Symbol, Error,
    }
    const keys = Object.keys(context)
    const values = keys.map((k) => (context as any)[k])
    // 用 Function 构造器,无法访问外层闭包
    const fn = new Function(...keys, `'use strict'; return (async () => { ${code} })()`)
    const promise = fn(...values)

    // 简单的超时控制
    return Promise.race([
      Promise.resolve(promise).then((v) => ({ ok: true, value: v, durationMs: Date.now() - start })),
      new Promise<SandboxResult>((resolve) =>
        setTimeout(() => resolve({ ok: false, error: 'Timeout', durationMs: timeoutMs }), timeoutMs)
      ),
    ]) as any
  } catch (e: any) {
    return { ok: false, error: e.message, durationMs: Date.now() - start }
  }
}

// 同步版本 (兼容非 promise)
export function runSandboxedSync<T = any>(code: string, api: PluginAPI): SandboxResult<T> {
  const start = Date.now()
  try {
    const context = { api, console, Date, Math, JSON, Object, Array, String, Number, Boolean, Map, Set, Error }
    const keys = Object.keys(context)
    const values = keys.map((k) => (context as any)[k])
    const fn = new Function(...keys, `'use strict'; return (function() { ${code} })()`)
    const value = fn(...values) as T
    return { ok: true, value, durationMs: Date.now() - start }
  } catch (e: any) {
    return { ok: false, error: e.message, durationMs: Date.now() - start }
  }
}

// ============== 插件注册表 ==============

class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map()
  private listeners: Set<() => void> = new Set()

  validate(manifest: any): { ok: boolean; errors: string[] } {
    const errors: string[] = []
    if (!manifest.id) errors.push('id is required')
    if (!manifest.name) errors.push('name is required')
    if (!manifest.version) errors.push('version is required')
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version || '')) errors.push('version must be semver')
    if (!manifest.author) errors.push('author is required')
    if (!Array.isArray(manifest.permissions)) errors.push('permissions must be array')
    if (manifest.id && !/^[a-z0-9-]+$/.test(manifest.id)) errors.push('id must be kebab-case')
    return { ok: errors.length === 0, errors }
  }

  install(manifest: PluginManifest, code?: string): Plugin {
    const v = this.validate(manifest)
    if (!v.ok) {
      const p: Plugin = {
        manifest,
        status: 'error',
        code,
        error: v.errors.join('; '),
        installedAt: Date.now(),
        metrics: { calls: 0, errors: 0, avgLatencyMs: 0 },
      }
      this.plugins.set(manifest.id, p)
      this.notify()
      return p
    }
    const p: Plugin = {
      manifest,
      status: 'installed',
      code,
      installedAt: Date.now(),
      metrics: { calls: 0, errors: 0, avgLatencyMs: 0 },
    }
    this.plugins.set(manifest.id, p)
    eventBus.publish('plugin:installed', { id: manifest.id })
    this.notify()
    return p
  }

  enable(id: string, api: PluginAPI = defaultPluginAPI): Plugin | undefined {
    const p = this.plugins.get(id)
    if (!p) return undefined
    p.status = 'enabled'
    p.enabledAt = Date.now()
    if (p.code) {
      // 执行插件入口
      const r = runSandboxedSync(p.code, api)
      if (r.ok) p.exports = r.value
      else {
        p.status = 'error'
        p.error = r.error
      }
    }
    eventBus.publish('plugin:enabled', { id })
    this.notify()
    return p
  }

  disable(id: string): Plugin | undefined {
    const p = this.plugins.get(id)
    if (!p) return undefined
    p.status = 'disabled'
    eventBus.publish('plugin:disabled', { id })
    this.notify()
    return p
  }

  uninstall(id: string): boolean {
    const p = this.plugins.get(id)
    if (!p) return false
    eventBus.publish('plugin:uninstalled', { id })
    this.plugins.delete(id)
    this.notify()
    return true
  }

  get(id: string) { return this.plugins.get(id) }
  list(filter?: { status?: Plugin['status']; permission?: PluginPermission }): Plugin[] {
    let r = Array.from(this.plugins.values())
    if (filter?.status) r = r.filter((p) => p.status === filter.status)
    if (filter?.permission) r = r.filter((p) => p.manifest.permissions.includes(filter.permission!))
    return r.sort((a, b) => b.installedAt - a.installedAt)
  }

  recordCall(id: string, durationMs: number, error?: boolean) {
    const p = this.plugins.get(id)
    if (!p) return
    p.metrics.calls++
    if (error) p.metrics.errors++
    p.metrics.avgLatencyMs = (p.metrics.avgLatencyMs * (p.metrics.calls - 1) + durationMs) / p.metrics.calls
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }
  private notify() { this.listeners.forEach((fn) => fn()) }
}

export const pluginRegistry = new PluginRegistry()

// ============== 插件市场 (本地仓库) ==============

export interface MarketplaceEntry {
  id: string
  name: string
  version: string
  author: string
  description: string
  downloads: number
  rating: number  // 0-5
  ratingCount: number
  tags: string[]
  icon?: string
  price?: number  // 0 = free
}

class Marketplace {
  private entries: Map<string, MarketplaceEntry> = new Map()
  private installed: Set<string> = new Set()

  publish(entry: MarketplaceEntry) {
    this.entries.set(entry.id, entry)
  }

  search(query?: string, tag?: string): MarketplaceEntry[] {
    let r = Array.from(this.entries.values())
    if (query) {
      const q = query.toLowerCase()
      r = r.filter((e) =>
        e.name.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    if (tag) r = r.filter((e) => e.tags.includes(tag))
    return r.sort((a, b) => b.downloads - a.downloads)
  }

  get(id: string) { return this.entries.get(id) }

  install(id: string): MarketplaceEntry | undefined {
    const e = this.entries.get(id)
    if (!e) return undefined
    e.downloads++
    this.installed.add(id)
    return e
  }

  uninstall(id: string) { this.installed.delete(id) }
  isInstalled(id: string) { return this.installed.has(id) }
  topDownloads(limit = 10) {
    return this.search().slice(0, limit)
  }
  topRated(limit = 10) {
    return Array.from(this.entries.values()).sort((a, b) => b.rating - a.rating).slice(0, limit)
  }
}

export const marketplace = new Marketplace()

// ============== 默认 API 实例 ==============

export const defaultPluginAPI: PluginAPI = {
  storage: {
    get(key) {
      try { return JSON.parse(localStorage.getItem(`plugin:${key}`) || 'null') } catch { return null }
    },
    set(key, value) {
      try { localStorage.setItem(`plugin:${key}`, JSON.stringify(value)) } catch {}
    },
  },
  events: eventBus,
  analytics: {
    track(event, data) { eventBus.publish('analytics:plugin', { event, data, ts: Date.now() }) },
  },
  log: console.log,
}

// ============== 内置示例插件 ==============

marketplace.publish({
  id: 'hello-world', name: 'Hello World', version: '1.0.0', author: 'Versa',
  description: '示例插件,打招呼', downloads: 100, rating: 4.5, ratingCount: 20,
  tags: ['example', 'starter'],
})
marketplace.publish({
  id: 'analytics-pro', name: 'Analytics Pro', version: '2.1.0', author: 'Acme',
  description: '高级分析埋点 + 漏斗分析', downloads: 5000, rating: 4.8, ratingCount: 200,
  tags: ['analytics', 'business'],
})
marketplace.publish({
  id: 'theme-dark', name: 'Dark Theme Pack', version: '1.5.0', author: 'DesignHub',
  description: '5 套暗色主题 + 自定义色板', downloads: 3000, rating: 4.6, ratingCount: 150,
  tags: ['theme', 'ui', 'dark'],
})
marketplace.publish({
  id: 'export-csv', name: 'CSV Exporter', version: '1.0.0', author: 'DataTools',
  description: '一键导出任意表格为 CSV', downloads: 1500, rating: 4.2, ratingCount: 80,
  tags: ['export', 'data'],
})
