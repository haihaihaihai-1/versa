/**
 * Versa · PocketBase 后端客户端 (v10.0)
 *
 * 目标：把"后端"从硬编码 localStorage 解耦到可切换的 Provider。
 *
 * 用法：
 *   import { pb, isPocketBaseEnabled } from './api/pb'
 *   if (isPocketBaseEnabled()) {
 *     const users = await pb.collection('users').getList<User>(1, 20)
 *   }
 *
 * 启用 PocketBase：
 *   1. 下载 https://pocketbase.io/docs/ (单文件 Go binary)
 *   2. ./pocketbase serve --http=127.0.0.1:8090
 *   3. 设置环境变量 VITE_PB_URL=http://127.0.0.1:8090
 *
 * 不设置环境变量时，本模块回退到 noop 实现，
 * 上层通过 isPocketBaseEnabled() 判断，调用 localStorage 后备。
 */

import type { RecordModel, ClientResponseError } from 'pocketbase'

export interface PbListResult<T> {
  items: T[]
  page: number
  perPage: number
  totalItems: number
  totalPages: number
}

export interface PbQuery {
  page?: number
  perPage?: number
  sort?: string
  filter?: string
  expand?: string
}

export interface PbCollectionAPI<T = any> {
  getList<T2 = T>(page?: number, perPage?: number, options?: Partial<PbQuery>): Promise<PbListResult<T2>>
  getOne<T2 = T>(id: string, options?: { expand?: string }): Promise<T2>
  getFirstListItem<T2 = T>(filter: string, options?: Partial<PbQuery>): Promise<T2>
  create<T2 = T>(data: Partial<T2>): Promise<T2>
  update<T2 = T>(id: string, data: Partial<T2>): Promise<T2>
  delete(id: string): Promise<void>
  subscribe<T2 = T>(topic: string, handler: (e: { action: string; record: T2 }) => void): () => void
}

export interface PbClient {
  collection: <T = any>(name: string) => PbCollectionAPI<T>
  authStore: {
    model: RecordModel | null
    token: string
    isValid: boolean
    save(token: string, model: RecordModel | null): void
    clear(): void
  }
  health: () => Promise<{ code: number; message: string }>
}

const PB_URL =
  (import.meta as any).env?.VITE_PB_URL ||
  (typeof window !== 'undefined' && (window as any).__VERSA_PB_URL__) ||
  ''

export const isPocketBaseEnabled = (): boolean => Boolean(PB_URL)

/** 动态加载 pocketbase (避免冷启动) */
async function loadPb(): Promise<any> {
  try {
    const mod: any = await import('pocketbase')
    return mod.default || mod
  } catch (e) {
    console.warn('[pb] pocketbase 包未安装或加载失败，将回退 localStorage', e)
    return null
  }
}

let _pb: any = null
let _initPromise: Promise<any> | null = null

async function getClient(): Promise<any> {
  if (_pb) return _pb
  if (_initPromise) return _initPromise
  _initPromise = (async () => {
    const PB = await loadPb()
    if (!PB) return null
    if (!PB_URL) return null
    try {
      _pb = new PB(PB_URL)
      // 健康检查
      await _pb.health.check()
      console.info(`[pb] 已连接 PocketBase: ${PB_URL}`)
      return _pb
    } catch (e) {
      console.warn('[pb] 连接失败，回退 localStorage', e)
      return null
    }
  })()
  return _initPromise
}

/**
 * 顶层 PocketBase 客户端 (Promise-based)
 * 在 pbReady 之前调用是安全的，会等待连接或回退 null
 */
export const pb: PbClient = {
  collection<T extends RecordModel = RecordModel>(name: string): PbCollectionAPI<T> {
    const wrap = async <R>(fn: (c: any) => Promise<R>, fallback: () => R): Promise<R> => {
      const c = await getClient()
      if (!c) return fallback()
      try {
        return await fn(c.collection(name))
      } catch (e) {
        const err = e as ClientResponseError
        if (err?.status === 0 || err?.status >= 500) {
          console.warn(`[pb] ${name} 操作失败: ${err?.message}，回退 localStorage`)
          return fallback()
        }
        throw e
      }
    }
    return {
      getList: (page = 1, perPage = 20, options = {}) =>
        wrap(
          (c) => c.getList(page, perPage, options),
          () => ({ items: [], page, perPage, totalItems: 0, totalPages: 0 })
        ),
      getOne: (id, options = {}) =>
        wrap((c) => c.getOne(id, options), () => null as any),
      getFirstListItem: (filter, options = {}) =>
        wrap((c) => c.getFirstListItem(filter, options), () => null as any),
      create: (data) => wrap((c) => c.create(data), () => data as any),
      update: (id, data) => wrap((c) => c.update(id, data), () => ({ id, ...data }) as any),
      delete: (id) => wrap<void>(async (c) => { await c.delete(id) }, () => undefined),
      subscribe: (_topic, _handler) => {
        // realtime 订阅仅在 PocketBase 模式下生效
        return () => {}
      },
    }
  },
  authStore: {
    model: null,
    token: '',
    isValid: false,
    save(token, model) {
      this.token = token
      this.model = model
      this.isValid = Boolean(token)
      try {
        if (token) localStorage.setItem('versa:pb:auth', JSON.stringify({ token, model }))
        else localStorage.removeItem('versa:pb:auth')
      } catch {}
    },
    clear() {
      this.token = ''
      this.model = null
      this.isValid = false
      try { localStorage.removeItem('versa:pb:auth') } catch {}
    },
  },
  health: async () => {
    const c = await getClient()
    if (!c) return { code: 0, message: 'localStorage mode' }
    try {
      return await c.health.check()
    } catch (e: any) {
      return { code: e?.status || -1, message: e?.message || 'unreachable' }
    }
  },
}

// 恢复持久化的 auth
try {
  const raw = localStorage.getItem('versa:pb:auth')
  if (raw) {
    const { token, model } = JSON.parse(raw)
    pb.authStore.save(token, model)
  }
} catch {}

/** 强制重连 (用于设置面板切换后端) */
export async function resetPbClient(): Promise<void> {
  _pb = null
  _initPromise = null
  await getClient()
}

export const PB_CONFIG = {
  url: PB_URL,
  isEnabled: isPocketBaseEnabled(),
}
