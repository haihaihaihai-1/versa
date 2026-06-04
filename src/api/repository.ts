/**
 * Versa · 通用 Repository 模式 (v10.0)
 *
 * 把 PocketBase / localStorage 的差异封装在统一 API 之下。
 * 业务层只需要写 `userRepo.create(...)` 不需要关心后端。
 *
 * 设计原则：
 * 1. 默认 localStorage (零配置演示)
 * 2. 检测到 VITE_PB_URL 时自动切换到 PocketBase
 * 3. 写入操作走离线队列，断网时不丢失
 * 4. 列表/详情操作失败时自动回退到本地缓存
 */

import { pb, isPocketBaseEnabled } from './pb'
import { syncQueue } from './sync'

export interface RepoDoc {
  id: string
  collectionId?: string
  collectionName?: string
  created?: string
  updated?: string
  [key: string]: any
}

export interface RepoQuery {
  page?: number
  perPage?: number
  sort?: string
  filter?: Record<string, any>
  expand?: string
}

export interface RepoListResult<T> {
  items: T[]
  total: number
  page: number
  perPage: number
}

type Backend = 'local' | 'pocketbase'

function detectBackend(): Backend {
  return isPocketBaseEnabled() ? 'pocketbase' : 'local'
}

const LS_KEY = (collection: string) => `versa:repo:${collection}`

function readLocal<T>(collection: string): T[] {
  try {
    const raw = localStorage.getItem(LS_KEY(collection))
    if (!raw) return []
    return JSON.parse(raw) as T[]
  } catch {
    return []
  }
}

function writeLocal<T>(collection: string, items: T[]): void {
  try {
    localStorage.setItem(LS_KEY(collection), JSON.stringify(items))
  } catch (e) {
    console.warn(`[repo:${collection}] 写 localStorage 失败`, e)
  }
}

function toPbFilter(filter: Record<string, any> | undefined): string {
  if (!filter) return ''
  return Object.entries(filter)
    .map(([k, v]) => {
      if (v === null || v === undefined) return `${k}=null`
      if (typeof v === 'object' && 'op' in v) return `${k}${v.op}'${v.value}'`
      return `${k}='${v}'`
    })
    .join(' && ')
}

/**
 * 创建面向单一 collection 的 Repository
 */
export function createRepository<T extends RepoDoc>(collection: string) {
  const backend = detectBackend()

  const list = async (query: RepoQuery = {}): Promise<RepoListResult<T>> => {
    const { page = 1, perPage = 30, sort, filter, expand } = query
    if (backend === 'pocketbase') {
      try {
        const res = await pb.collection<T>(collection).getList(page, perPage, {
          sort,
          filter: toPbFilter(filter),
          expand,
        })
        return { items: res.items, total: res.totalItems, page: res.page, perPage: res.perPage }
      } catch (e) {
        console.warn(`[repo:${collection}] list 失败，回退 localStorage`, e)
      }
    }
    let items = readLocal<T>(collection)
    if (filter) {
      items = items.filter((it: any) =>
        Object.entries(filter).every(([k, v]) => {
          if (v === null || v === undefined) return it[k] == null
          if (typeof v === 'object' && 'op' in v) return applyOp(it[k], v)
          return it[k] === v
        })
      )
    }
    if (sort) {
      const desc = sort.startsWith('-')
      const key = desc ? sort.slice(1) : sort
      items = [...items].sort((a: any, b: any) => {
        if (a[key] < b[key]) return desc ? 1 : -1
        if (a[key] > b[key]) return desc ? -1 : 1
        return 0
      })
    }
    const start = (page - 1) * perPage
    return { items: items.slice(start, start + perPage), total: items.length, page, perPage }
  }

  const get = async (id: string): Promise<T | null> => {
    if (backend === 'pocketbase') {
      try {
        return await pb.collection<T>(collection).getOne(id)
      } catch (e) {
        console.warn(`[repo:${collection}] get 失败，回退 localStorage`, e)
      }
    }
    return readLocal<T>(collection).find((x: any) => x.id === id) || null
  }

  const create = async (data: Partial<T>): Promise<T> => {
    const doc = { ...data, id: (data as any).id || crypto.randomUUID() } as unknown as T
    if (backend === 'pocketbase') {
      try {
        return await pb.collection(collection).create(doc as any)
      } catch (e) {
        console.warn(`[repo:${collection}] create 失败，入队`, e)
      }
    }
    const items = readLocal<T>(collection)
    items.push(doc)
    writeLocal(collection, items)
    syncQueue.enqueue({ op: 'create', collection, data: doc })
    return doc
  }

  const update = async (id: string, data: Partial<T>): Promise<T | null> => {
    if (backend === 'pocketbase') {
      try {
        return await pb.collection(collection).update(id, data as any)
      } catch (e) {
        console.warn(`[repo:${collection}] update 失败，入队`, e)
      }
    }
    const items = readLocal<T>(collection)
    const idx = items.findIndex((x: any) => x.id === id)
    if (idx === -1) return null
    items[idx] = { ...items[idx], ...data } as T
    writeLocal(collection, items)
    syncQueue.enqueue({ op: 'update', collection, id, data })
    return items[idx]
  }

  const remove = async (id: string): Promise<void> => {
    if (backend === 'pocketbase') {
      try {
        await pb.collection<T>(collection).delete(id)
        return
      } catch (e) {
        console.warn(`[repo:${collection}] delete 失败，入队`, e)
      }
    }
    const items = readLocal<T>(collection).filter((x: any) => x.id !== id)
    writeLocal(collection, items)
    syncQueue.enqueue({ op: 'delete', collection, id })
  }

  return { list, get, create, update, remove, backend, collection }
}

function applyOp(actual: any, op: { op: string; value: any }): boolean {
  switch (op.op) {
    case '=': return actual === op.value
    case '!=': return actual !== op.value
    case '>': return actual > op.value
    case '>=': return actual >= op.value
    case '<': return actual < op.value
    case '<=': return actual <= op.value
    case '~': return String(actual).includes(String(op.value))
    default: return true
  }
}

// ============== 预置 Repositories ==============

import type { User, Post, Comment, Follow, Notification, Conversation, Message, Group, Report, NewsArticle, Debate, Product } from './types'

export const userRepo = createRepository<User>('users')
export const postRepo = createRepository<Post>('posts')
export const commentRepo = createRepository<Comment>('comments')
export const followRepo = createRepository<Follow>('follows')
export const notificationRepo = createRepository<Notification>('notifications')
export const conversationRepo = createRepository<Conversation>('conversations')
export const messageRepo = createRepository<Message>('messages')
export const groupRepo = createRepository<Group>('groups')
export const reportRepo = createRepository<Report>('reports')
export const newsRepo = createRepository<NewsArticle>('news')
export const debateRepo = createRepository<Debate>('debates')
export const productRepo = createRepository<Product>('products')
