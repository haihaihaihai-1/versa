// ============== localStorage 持久化层 (兼容 PocketBase API) ==============
// 切换到真实 PocketBase 时，只需替换 src/api/pb.ts 即可

import type {
  User, Post, Comment, Follow, Notification, Conversation, Message,
  Group, GroupMember, Report, ModerationLog, ReactionType, Role,
} from './types'

const STORAGE_KEY = 'versa:v2'
const SESSION_KEY = 'versa:session'
const VERSION = 2

interface Store {
  users: Record<string, User>
  usersByUsername: Record<string, string>
  usersByEmail: Record<string, string>
  passwords: Record<string, string> // email -> hashed password (demo only)
  posts: Record<string, Post>
  comments: Record<string, Comment>
  follows: Record<string, Follow>
  notifications: Record<string, Notification>
  conversations: Record<string, Conversation>
  messages: Record<string, Message>
  groups: Record<string, Group>
  groupMembers: Record<string, GroupMember>
  reports: Record<string, Report>
  modLogs: Record<string, ModerationLog>
  // Module data (read-only seed)
  news: any[]
  debates: any[]
  products: any[]
  // User state
  userState: Record<string, any>
}

let _store: Store | null = null
const _listeners = new Set<() => void>()

function loadStore(): Store {
  if (typeof window === 'undefined') return createEmptyStore()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.version === VERSION) return parsed.data
    }
  } catch {}
  return createEmptyStore()
}

function saveStore() {
  if (!_store) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, data: _store }))
  } catch (e) {
    console.warn('Failed to save store', e)
  }
}

function createEmptyStore(): Store {
  return {
    users: {}, usersByUsername: {}, usersByEmail: {}, passwords: {},
    posts: {}, comments: {}, follows: {}, notifications: {},
    conversations: {}, messages: {}, groups: {}, groupMembers: {},
    reports: {}, modLogs: {},
    news: [], debates: [], products: [],
    userState: {},
  }
}

export function getStore(): Store {
  if (!_store) {
    _store = loadStore()
    saveStore()
  }
  return _store!
}

export function setStore(updater: (s: Store) => Store) {
  _store = updater(getStore())
  saveStore()
  _listeners.forEach((l) => l())
}

export function subscribeStore(l: () => void): () => void {
  _listeners.add(l)
  return () => _listeners.delete(l)
}

export function resetStore() {
  _store = createEmptyStore()
  saveStore()
  _listeners.forEach((l) => l())
}

// ============== Session (current user) ==============
export function getSession(): { userId: string | null } {
  if (typeof window === 'undefined') return { userId: null }
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { userId: null }
}

export function setSession(userId: string | null) {
  if (typeof window === 'undefined') return
  if (userId === null) {
    localStorage.removeItem(SESSION_KEY)
  } else {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId }))
  }
  _listeners.forEach((l) => l())
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`
}

// ============== Password hashing (demo only, NOT secure) ==============
// In real PocketBase, password handling is done server-side with bcrypt
export function hashPassword(plain: string): string {
  let hash = 0
  for (let i = 0; i < plain.length; i++) {
    hash = ((hash << 5) - hash) + plain.charCodeAt(i)
    hash |= 0
  }
  return `h_${Math.abs(hash)}_${plain.length}`
}

export function verifyPassword(plain: string, hashed: string): boolean {
  return hashPassword(plain) === hashed
}
