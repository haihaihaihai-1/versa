/**
 * Versa · Repository 单元测试 (v10.0)
 * 覆盖：本地 CRUD、过滤、排序、删除、迁移
 */
// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { createRepository } from '../repository'
import { migrateToV10, isMigrated } from '../migrate'

interface Todo extends Record<string, any> {
  id: string
  title: string
  priority: number
  done: boolean
  created?: string
}

const todoRepo = createRepository<Todo>('test_todos')

beforeEach(() => {
  localStorage.clear()
})

describe('repository · localStorage 后端', () => {
  it('create → 列表能找到', async () => {
    const created = await todoRepo.create({ title: 'A', priority: 1, done: false })
    expect(created.id).toBeTruthy()
    const list = await todoRepo.list()
    expect(list.items).toHaveLength(1)
    expect(list.items[0].title).toBe('A')
  })

  it('get(id) 返回单条', async () => {
    const c = await todoRepo.create({ title: 'B', priority: 2, done: false })
    const got = await todoRepo.get(c.id)
    expect(got?.title).toBe('B')
  })

  it('update 修改后列表同步', async () => {
    const c = await todoRepo.create({ title: 'C', priority: 3, done: false })
    await todoRepo.update(c.id, { done: true })
    const got = await todoRepo.get(c.id)
    expect(got?.done).toBe(true)
  })

  it('remove 真正删除', async () => {
    const c = await todoRepo.create({ title: 'D', priority: 4, done: false })
    await todoRepo.remove(c.id)
    const got = await todoRepo.get(c.id)
    expect(got).toBeNull()
  })

  it('filter 精确匹配', async () => {
    await todoRepo.create({ title: 'X', priority: 1, done: false })
    await todoRepo.create({ title: 'Y', priority: 2, done: true })
    const r = await todoRepo.list({ filter: { done: true } })
    expect(r.items).toHaveLength(1)
    expect(r.items[0].title).toBe('Y')
  })

  it('filter 范围操作 (>=)', async () => {
    await todoRepo.create({ title: 'p1', priority: 1, done: false })
    await todoRepo.create({ title: 'p3', priority: 3, done: false })
    await todoRepo.create({ title: 'p5', priority: 5, done: false })
    const r = await todoRepo.list({ filter: { priority: { op: '>=', value: 3 } } })
    expect(r.items).toHaveLength(2)
  })

  it('sort 降序', async () => {
    await todoRepo.create({ title: 'a', priority: 1, done: false })
    await todoRepo.create({ title: 'b', priority: 5, done: false })
    await todoRepo.create({ title: 'c', priority: 3, done: false })
    const r = await todoRepo.list({ sort: '-priority' })
    expect(r.items.map(x => x.priority)).toEqual([5, 3, 1])
  })

  it('分页', async () => {
    for (let i = 0; i < 25; i++) {
      await todoRepo.create({ title: `t${i}`, priority: i, done: false })
    }
    const p1 = await todoRepo.list({ page: 1, perPage: 10 })
    const p3 = await todoRepo.list({ page: 3, perPage: 10 })
    expect(p1.items).toHaveLength(10)
    expect(p1.total).toBe(25)
    expect(p3.items).toHaveLength(5)
  })
})

describe('migrate · 数据迁移', () => {
  it('空数据跳过', async () => {
    const r = await migrateToV10()
    expect(r.skipped).toBe(true)
    expect(isMigrated()).toBe(true)
  })

  it('从旧 store 迁移到新 repo', async () => {
    const oldData = {
      version: 2,
      data: {
        users: {
          u1: { id: 'u1', username: 'alice', displayName: 'Alice' },
        },
        posts: {
          p1: { id: 'p1', authorId: 'u1', content: 'hi' },
        },
      },
    }
    localStorage.setItem('versa:v2', JSON.stringify(oldData))

    const r = await migrateToV10()
    expect(r.skipped).toBe(false)
    expect(r.collections.users).toBe(1)
    expect(r.collections.posts).toBe(1)
    expect(isMigrated()).toBe(true)

    // 二次执行应该跳过
    const r2 = await migrateToV10()
    expect(r2.skipped).toBe(true)
  })
})

describe('sync · 离线队列', () => {
  it('enqueue 后 size 增加', async () => {
    const { syncQueue } = await import('../sync')
    const before = syncQueue.size
    syncQueue.enqueue({ op: 'create', collection: 'test_todos', data: { id: 'x', title: 'q', priority: 1, done: false } })
    expect(syncQueue.size).toBe(before + 1)
  })

  it('clear 清空队列', async () => {
    const { syncQueue } = await import('../sync')
    syncQueue.enqueue({ op: 'create', collection: 'test_todos', data: { id: 'x2', title: 'q', priority: 1, done: false } })
    syncQueue.clear()
    expect(syncQueue.size).toBe(0)
  })
})
