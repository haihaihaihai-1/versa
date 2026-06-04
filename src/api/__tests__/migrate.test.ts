// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import { migrateToV10, isMigrated } from '../migrate'

beforeEach(() => {
  localStorage.clear()
})

describe('migrate · isMigrated', () => {
  it('初始 false', () => {
    expect(isMigrated()).toBe(false)
  })

  it('flag 写入后 true', () => {
    localStorage.setItem('versa:migrated:v10', '1')
    expect(isMigrated()).toBe(true)
  })
})

describe('migrate · migrateToV10', () => {
  it('无旧数据 → skipped', async () => {
    const r = await migrateToV10()
    expect(r.skipped).toBe(true)
    expect(isMigrated()).toBe(true)
  })

  it('已迁移 → skipped', async () => {
    localStorage.setItem('versa:migrated:v10', '1')
    const r = await migrateToV10()
    expect(r.skipped).toBe(true)
  })

  it('JSON 损坏 → 安全跳过', async () => {
    localStorage.setItem('versa:v2', 'not json')
    const r = await migrateToV10()
    expect(r.skipped).toBe(true)
  })

  it('正常 v2 数据 → 计数', async () => {
    const v2 = {
      data: {
        users: { a: { id: 'a', username: 'alice' } },
        posts: { p1: { id: 'p1', title: 'hi' } },
        comments: {},
        follows: {},
        notifications: {},
        conversations: {},
        messages: {},
        groups: {},
        reports: {},
      },
    }
    localStorage.setItem('versa:v2', JSON.stringify(v2))
    const r = await migrateToV10()
    expect(r.skipped).toBe(false)
    expect(r.collections.users).toBe(1)
    expect(r.collections.posts).toBe(1)
    expect(isMigrated()).toBe(true)
  })

  it('data 字段缺失 → 迁移为空对象但设了 flag', async () => {
    localStorage.setItem('versa:v2', JSON.stringify({ other: 'stuff' }))
    const r = await migrateToV10()
    expect(r.collections).toEqual({})
    expect(isMigrated()).toBe(true)
  })
})
