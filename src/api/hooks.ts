// ============== 响应式订阅 store 的 hook ==============
// 当 localStorage 数据变化时，强制组件重渲染

import { useEffect, useState, useCallback } from 'react'
import api from './index'
import { subscribeStore } from './store'

const listeners = new Set<() => void>()
let version = 0

subscribeStore(() => {
  version += 1
  listeners.forEach((l) => l())
})

export function useStoreVersion() {
  const [, setV] = useState(version)
  useEffect(() => {
    const l = () => setV((v) => v + 1)
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  return version
}

// ============== 通用 useApi hook：传入 selector，订阅 store 变化 ==============
export function useApi<T>(selector: () => T): T {
  useStoreVersion()
  return selector()
}

// ============== 便捷 hooks ==============
export function useCurrentUser() {
  useStoreVersion()
  return api.auth.current()
}

export function useUser(id?: string) {
  useStoreVersion()
  return id ? api.users.get(id) : null
}

export function usePost(id?: string) {
  useStoreVersion()
  return id ? api.posts.byId(id) : null
}

export function useFeed(opts: { userId?: string; limit?: number; type?: string; hashtag?: string } = {}) {
  useStoreVersion()
  return api.posts.feed(opts)
}

export function useUserPosts(userId?: string) {
  useStoreVersion()
  return userId ? api.posts.byUser(userId) : []
}

export function useComments(postId?: string) {
  useStoreVersion()
  return postId ? api.comments.forPost(postId) : []
}

export function useUnreadCount() {
  useStoreVersion()
  const me = api.auth.current()
  if (!me) return { notifications: 0, messages: 0 }
  return {
    notifications: api.notifications.unreadCount(me.id),
    messages: api.conversations.totalUnread(me.id),
  }
}

export function useNotifications(unreadOnly = false) {
  useStoreVersion()
  const me = api.auth.current()
  if (!me) return []
  return api.notifications.forUser(me.id, { unreadOnly })
}

export function useConversations() {
  useStoreVersion()
  const me = api.auth.current()
  if (!me) return []
  return api.conversations.forUser(me.id)
}

export function useMessages(conversationId?: string) {
  useStoreVersion()
  return conversationId ? api.conversations.messages(conversationId) : []
}

export function useGroups() {
  useStoreVersion()
  return api.groups.all()
}

export function useMyGroups() {
  useStoreVersion()
  const me = api.auth.current()
  return me ? api.groups.myGroups(me.id) : []
}

export function useFollowers(userId?: string) {
  useStoreVersion()
  return userId ? api.follows.followers(userId) : []
}

export function useFollowing(userId?: string) {
  useStoreVersion()
  return userId ? api.follows.following(userId) : []
}
