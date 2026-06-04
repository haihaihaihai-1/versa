/**
 * Versa · 数据迁移工具 (v10.0)
 *
 * 一次性的从 `store.ts` v2 localStorage 迁移到新 repository 体系
 * 用法：await migrateToV10()
 */

import { userRepo, postRepo, commentRepo, followRepo, notificationRepo, conversationRepo, messageRepo, groupRepo, reportRepo } from './repository'

const OLD_KEY = 'versa:v2'
const MIGRATE_FLAG = 'versa:migrated:v10'

export async function migrateToV10(): Promise<{ collections: Record<string, number>; skipped: boolean }> {
  if (typeof window === 'undefined') return { collections: {}, skipped: true }
  if (localStorage.getItem(MIGRATE_FLAG)) return { collections: {}, skipped: true }

  let raw: string | null = null
  try { raw = localStorage.getItem(OLD_KEY) } catch {}
  if (!raw) {
    localStorage.setItem(MIGRATE_FLAG, '1')
    return { collections: {}, skipped: true }
  }

  let parsed: any
  try { parsed = JSON.parse(raw) } catch { return { collections: {}, skipped: true } }
  const data = parsed.data || parsed
  const counts: Record<string, number> = {}

  const map: Record<string, any> = {
    users: userRepo,
    posts: postRepo,
    comments: commentRepo,
    follows: followRepo,
    notifications: notificationRepo,
    conversations: conversationRepo,
    messages: messageRepo,
    groups: groupRepo,
    reports: reportRepo,
  }

  for (const [key, repo] of Object.entries(map)) {
    const items = Object.values(data[key] || {}) as any[]
    for (const it of items) {
      try {
        await repo.create(it)
        counts[key] = (counts[key] || 0) + 1
      } catch (e) {
        console.warn(`[migrate] ${key} 迁移失败:`, e)
      }
    }
  }

  localStorage.setItem(MIGRATE_FLAG, '1')
  console.info('[migrate] v10 迁移完成', counts)
  return { collections: counts, skipped: false }
}

export function isMigrated(): boolean {
  try { return Boolean(localStorage.getItem(MIGRATE_FLAG)) } catch { return false }
}
