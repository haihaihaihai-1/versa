// ============== Versa API (localStorage backend) ==============
// 所有 API 调用都经过这里，未来切换到 PocketBase 时只需替换底层实现
// 同时保持与 PocketBase 相似的 promise-based 接口

import { getStore, setStore, uid, getSession, setSession, hashPassword, verifyPassword, resetStore, subscribeStore } from './store'
import { seedIfEmpty, DEMO_ACCOUNTS } from './seed'
import type {
  User, Post, Comment, Follow, Notification, Conversation, Message,
  Group, GroupMember, Report, ModerationLog, ReactionType, Role,
} from './types'

// ============== 初始化 ==============
let _initialized = false
export function initAPI() {
  if (_initialized) return
  _initialized = true
  seedIfEmpty()
}

// ============== Realtime subscription (just re-renders via store) ==============
export function subscribe(handler: () => void): () => void {
  initAPI()
  return subscribeStore(handler)
}

// ============== Auth ==============
export const auth = {
  current(): User | null {
    initAPI()
    const { userId } = getSession()
    if (!userId) return null
    return getStore().users[userId] || null
  },

  async signIn(usernameOrEmail: string, password: string): Promise<{ user: User; token: string }> {
    initAPI()
    const s = getStore()
    const lower = usernameOrEmail.toLowerCase().trim()
    const userId = s.usersByUsername[lower] || s.usersByEmail[lower]
    if (!userId) throw new Error('账号不存在')
    const user = s.users[userId]
    const email = user.email || `${user.username}@versa.app`
    const hashed = s.passwords[email]
    if (!hashed || !verifyPassword(password, hashed)) {
      throw new Error('密码错误')
    }
    setSession(userId)
    return { user, token: `local_${userId}_${Date.now()}` }
  },

  async signUp(input: { username: string; email?: string; password: string; displayName?: string }): Promise<{ user: User; token: string }> {
    initAPI()
    const s = getStore()
    const username = input.username.toLowerCase().trim()
    const email = (input.email || `${username}@versa.app`).toLowerCase().trim()
    if (s.usersByUsername[username]) throw new Error('用户名已被使用')
    if (s.usersByEmail[email]) throw new Error('邮箱已被注册')
    if (input.password.length < 6) throw new Error('密码至少 6 位')
    if (username.length < 3) throw new Error('用户名至少 3 个字符')

    const id = uid('usr')
    const user: User = {
      id, username, email,
      displayName: input.displayName || username,
      avatar: `https://i.pravatar.cc/300?u=${id}`,
      cover: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=1200',
      bio: '',
      role: 'user',
      verified: false,
      reputation: 0,
      badges: ['early_adopter'],
      followers: [], following: [],
      postsCount: 0,
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      stats: { articlesRead: 0, debatesJoined: 0, argumentsPosted: 0, productsPurchased: 0, postsCreated: 0, commentsPosted: 0, likesReceived: 0 },
      privacy: { profilePublic: true, showActivity: true, allowMessages: 'everyone' },
      status: 'active',
    }
    setStore((s) => {
      s.users[id] = user
      s.usersByUsername[username] = id
      s.usersByEmail[email] = id
      s.passwords[email] = hashPassword(input.password)
      return s
    })
    setSession(id)
    return { user, token: `local_${id}_${Date.now()}` }
  },

  async signOut() {
    setSession(null)
  },

  async updateMe(patch: Partial<User>): Promise<User> {
    initAPI()
    const me = this.current()
    if (!me) throw new Error('未登录')
    setStore((s) => {
      s.users[me.id] = { ...s.users[me.id], ...patch }
      return s
    })
    return getStore().users[me.id]
  },

  onChange(handler: () => void): () => void {
    return subscribe(handler)
  },

  demoAccounts() {
    return DEMO_ACCOUNTS
  },
}

// ============== Users ==============
export const users = {
  get(id: string): User | null {
    initAPI()
    return getStore().users[id] || null
  },
  byUsername(username: string): User | null {
    initAPI()
    const id = getStore().usersByUsername[username.toLowerCase()]
    return id ? getStore().users[id] : null
  },
  search(query: string, limit = 20): User[] {
    initAPI()
    const q = query.toLowerCase().trim()
    if (!q) return []
    return Object.values(getStore().users)
      .filter((u) => u.status === 'active' && (
        u.username.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        (u.bio || '').toLowerCase().includes(q)
      ))
      .slice(0, limit)
  },
  all(): User[] {
    initAPI()
    return Object.values(getStore().users).filter((u) => u.status === 'active')
  },
  update(id: string, patch: Partial<User>): User {
    setStore((s) => {
      s.users[id] = { ...s.users[id], ...patch }
      return s
    })
    return getStore().users[id]
  },
  ban(id: string, reason: string) {
    initAPI()
    setStore((s) => {
      if (s.users[id]) s.users[id].status = 'banned'
      return s
    })
    // log mod action
    const me = auth.current()
    if (me) {
      modLog({ actorId: me.id, targetType: 'user', targetId: id, action: 'ban', reason })
    }
  },
}

// ============== Follows ==============
export const follows = {
  follow(followerId: string, followeeId: string) {
    if (followerId === followeeId) return
    initAPI()
    const s = getStore()
    const existing = Object.values(s.follows).find((f) => f.followerId === followerId && f.followeeId === followeeId)
    if (existing) return
    const id = uid('flw')
    setStore((st) => {
      st.follows[id] = { id, followerId, followeeId, createdAt: new Date().toISOString() }
      if (!st.users[followerId].following.includes(followeeId)) st.users[followerId].following.push(followeeId)
      if (!st.users[followeeId].followers.includes(followerId)) st.users[followeeId].followers.push(followerId)
      return st
    })
    // notification
    createNotification({
      recipientId: followeeId,
      actorId: followerId,
      type: 'follow',
      targetType: 'user',
      targetId: followerId,
    })
  },
  unfollow(followerId: string, followeeId: string) {
    initAPI()
    const s = getStore()
    const existing = Object.values(s.follows).find((f) => f.followerId === followerId && f.followeeId === followeeId)
    if (!existing) return
    setStore((st) => {
      delete st.follows[existing.id]
      st.users[followerId].following = st.users[followerId].following.filter((x) => x !== followeeId)
      st.users[followeeId].followers = st.users[followeeId].followers.filter((x) => x !== followerId)
      return st
    })
  },
  isFollowing(followerId: string, followeeId: string): boolean {
    if (!followerId || !followeeId) return false
    initAPI()
    return getStore().users[followerId]?.following.includes(followeeId) || false
  },
  followers(userId: string): User[] {
    initAPI()
    const u = getStore().users[userId]
    if (!u) return []
    return u.followers.map((id) => getStore().users[id]).filter(Boolean) as User[]
  },
  following(userId: string): User[] {
    initAPI()
    const u = getStore().users[userId]
    if (!u) return []
    return u.following.map((id) => getStore().users[id]).filter(Boolean) as User[]
  },
}

// ============== Posts ==============
export const posts = {
  byId(id: string): Post | null {
    initAPI()
    return getStore().posts[id] || null
  },

  feed(opts: { userId?: string; limit?: number; before?: string; type?: string; hashtag?: string } = {}): Post[] {
    initAPI()
    const s = getStore()
    let list = Object.values(s.posts).filter((p) => p.status === 'published')

    // 只看关注的人的帖子
    if (opts.userId) {
      const user = s.users[opts.userId]
      if (user) {
        const allowed = new Set([opts.userId, ...user.following])
        list = list.filter((p) => allowed.has(p.authorId))
      }
    }
    if (opts.type) list = list.filter((p) => p.type === opts.type)
    if (opts.hashtag) {
      const tag = opts.hashtag.toLowerCase()
      list = list.filter((p) => p.hashtags.some((t) => t.toLowerCase() === tag))
    }
    list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (opts.before) list = list.filter((p) => p.createdAt < opts.before!)
    return list.slice(0, opts.limit || 30)
  },

  byUser(userId: string, includeHidden = false): Post[] {
    initAPI()
    return Object.values(getStore().posts)
      .filter((p) => p.authorId === userId && (includeHidden || p.status === 'published'))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },

  create(input: Partial<Post> & { authorId: string; content: string; type: Post['type'] }): Post {
    initAPI()
    const id = uid('pst')
    const now = new Date().toISOString()
    const post: Post = {
      id,
      authorId: input.authorId,
      type: input.type,
      content: input.content,
      images: input.images || [],
      hashtags: input.hashtags || [],
      mentions: input.mentions || [],
      refType: input.refType || 'none',
      refId: input.refId,
      poll: input.poll,
      reactions: { like: [], love: [], insightful: [], disagree: [], laugh: [], sad: [], fire: [] },
      commentsCount: 0,
      repostsCount: 0,
      sharesCount: 0,
      views: 0,
      status: 'published',
      flagsCount: 0,
      createdAt: now,
    }
    setStore((s) => {
      s.posts[id] = post
      s.users[input.authorId].postsCount += 1
      s.users[input.authorId].stats.postsCreated += 1
      return s
    })
    // Mention notifications
    post.mentions.forEach((m) => {
      createNotification({ recipientId: m, actorId: input.authorId, type: 'mention', targetType: 'post', targetId: id })
    })
    return post
  },

  delete(postId: string) {
    initAPI()
    const post = getStore().posts[postId]
    if (!post) return
    setStore((s) => {
      s.posts[postId].status = 'deleted'
      s.users[post.authorId].postsCount = Math.max(0, s.users[post.authorId].postsCount - 1)
      return s
    })
  },

  toggleReact(postId: string, userId: string, reaction: ReactionType) {
    initAPI()
    const post = getStore().posts[postId]
    if (!post) return
    const newReactions: Record<ReactionType, string[]> = {
      like: post.reactions.like.filter((u) => u !== userId),
      love: post.reactions.love.filter((u) => u !== userId),
      insightful: post.reactions.insightful.filter((u) => u !== userId),
      disagree: post.reactions.disagree.filter((u) => u !== userId),
      laugh: post.reactions.laugh.filter((u) => u !== userId),
      sad: post.reactions.sad.filter((u) => u !== userId),
      fire: post.reactions.fire.filter((u) => u !== userId),
    }
    if (!newReactions[reaction].includes(userId)) {
      newReactions[reaction].push(userId)
    }
    setStore((s) => {
      s.posts[postId].reactions = newReactions
      return s
    })
    if (post.authorId !== userId) {
      const typeMap: Record<ReactionType, any> = {
        like: 'like', love: 'love', insightful: 'like', disagree: 'disagree', laugh: 'love', sad: 'like', fire: 'like',
      }
      createNotification({
        recipientId: post.authorId, actorId: userId,
        type: typeMap[reaction], targetType: 'post', targetId: postId,
      })
    }
  },

  incrementViews(postId: string) {
    initAPI()
    setStore((s) => {
      if (s.posts[postId]) s.posts[postId].views += 1
      return s
    })
  },

  pollVote(postId: string, optionId: string, userId: string) {
    initAPI()
    setStore((s) => {
      const post = s.posts[postId]
      if (!post || !post.poll) return s
      // Remove user's previous vote
      post.poll.options.forEach((opt) => {
        post.poll!.options[post.poll!.options.indexOf(opt)].votes = opt.votes.filter((v) => v !== userId)
      })
      const opt = post.poll.options.find((o) => o.id === optionId)
      if (opt) opt.votes.push(userId)
      return s
    })
  },
}

// ============== Comments ==============
export const comments = {
  forPost(postId: string): Comment[] {
    initAPI()
    return Object.values(getStore().comments)
      .filter((c) => c.postId === postId && c.status === 'published')
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },

  create(input: { postId: string; authorId: string; content: string; parentId?: string }): Comment {
    initAPI()
    const id = uid('cmt')
    const c: Comment = {
      id, postId: input.postId, authorId: input.authorId, content: input.content,
      parentId: input.parentId, reactions: { like: [], love: [], insightful: [], disagree: [], laugh: [], sad: [], fire: [] },
      createdAt: new Date().toISOString(), status: 'published',
    }
    setStore((s) => {
      s.comments[id] = c
      s.posts[input.postId].commentsCount += 1
      s.users[input.authorId].stats.commentsPosted += 1
      return s
    })
    const post = getStore().posts[input.postId]
    if (post && post.authorId !== input.authorId) {
      createNotification({
        recipientId: post.authorId, actorId: input.authorId,
        type: 'comment', targetType: 'post', targetId: input.postId,
      })
    }
    return c
  },

  delete(commentId: string) {
    initAPI()
    const c = getStore().comments[commentId]
    if (!c) return
    setStore((s) => {
      s.comments[commentId].status = 'deleted'
      s.posts[c.postId].commentsCount = Math.max(0, s.posts[c.postId].commentsCount - 1)
      return s
    })
  },
}

// ============== Notifications ==============
export const notifications = {
  forUser(userId: string, opts: { unreadOnly?: boolean; limit?: number } = {}): Notification[] {
    initAPI()
    return Object.values(getStore().notifications)
      .filter((n) => n.recipientId === userId && (!opts.unreadOnly || !n.read))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, opts.limit || 50)
  },
  unreadCount(userId: string): number {
    if (!userId) return 0
    return Object.values(getStore().notifications).filter((n) => n.recipientId === userId && !n.read).length
  },
  markRead(id: string) {
    setStore((s) => {
      if (s.notifications[id]) s.notifications[id].read = true
      return s
    })
  },
  markAllRead(userId: string) {
    setStore((s) => {
      Object.values(s.notifications).forEach((n) => {
        if (n.recipientId === userId) n.read = true
      })
      return s
    })
  },
}

function createNotification(input: { recipientId: string; actorId: string; type: any; targetType: any; targetId: string }) {
  if (input.recipientId === input.actorId) return // don't notify self
  const id = uid('ntf')
  setStore((s) => {
    s.notifications[id] = {
      id, ...input, read: false,
      createdAt: new Date().toISOString(),
    }
    return s
  })
}

// ============== Conversations & Messages ==============
export const conversations = {
  forUser(userId: string): Conversation[] {
    initAPI()
    return Object.values(getStore().conversations)
      .filter((c) => c.participants.includes(userId))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
  },
  byId(id: string): Conversation | null {
    return getStore().conversations[id] || null
  },
  direct(userA: string, userB: string): Conversation {
    initAPI()
    const s = getStore()
    let conv = Object.values(s.conversations).find(
      (c) => c.type === 'direct' && c.participants.includes(userA) && c.participants.includes(userB)
    )
    if (conv) return conv
    const id = uid('cnv')
    conv = {
      id, participants: [userA, userB], type: 'direct',
      lastMessageAt: new Date().toISOString(), lastMessagePreview: '',
      unreadCount: { [userA]: 0, [userB]: 0 },
      createdAt: new Date().toISOString(),
    }
    setStore((s) => {
      s.conversations[id] = conv!
      return s
    })
    return conv!
  },
  sendMessage(conversationId: string, senderId: string, content: string): Message {
    initAPI()
    const id = uid('msg')
    const msg: Message = {
      id, conversationId, senderId, content,
      readBy: [senderId],
      createdAt: new Date().toISOString(),
    }
    setStore((s) => {
      s.messages[id] = msg
      const conv = s.conversations[conversationId]
      if (conv) {
        conv.lastMessageAt = msg.createdAt
        conv.lastMessagePreview = content.slice(0, 50)
        conv.participants.forEach((p) => {
          if (p !== senderId) {
            conv.unreadCount[p] = (conv.unreadCount[p] || 0) + 1
            createNotification({ recipientId: p, actorId: senderId, type: 'message', targetType: 'conversation', targetId: conversationId })
          }
        })
      }
      return s
    })
    return msg
  },
  messages(conversationId: string): Message[] {
    initAPI()
    return Object.values(getStore().messages)
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },
  markRead(conversationId: string, userId: string) {
    setStore((s) => {
      const conv = s.conversations[conversationId]
      if (conv) conv.unreadCount[userId] = 0
      Object.values(s.messages).forEach((m) => {
        if (m.conversationId === conversationId && !m.readBy.includes(userId)) {
          m.readBy.push(userId)
        }
      })
      return s
    })
  },
  totalUnread(userId: string): number {
    initAPI()
    return Object.values(getStore().conversations)
      .filter((c) => c.participants.includes(userId))
      .reduce((sum, c) => sum + (c.unreadCount[userId] || 0), 0)
  },
}

// ============== Groups ==============
export const groups = {
  all(): Group[] {
    initAPI()
    return Object.values(getStore().groups).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  byId(id: string): Group | null {
    return getStore().groups[id] || null
  },
  create(input: { name: string; description: string; cover?: string; module: any; tags: string[]; ownerId: string }): Group {
    initAPI()
    const id = uid('grp')
    const g: Group = {
      id, name: input.name, description: input.description,
      cover: input.cover || `https://picsum.photos/seed/${id}/800/300`,
      type: 'public', module: input.module, memberCount: 1, admins: [input.ownerId],
      createdAt: new Date().toISOString(), tags: input.tags,
    }
    const mid = uid('gmb')
    setStore((s) => {
      s.groups[id] = g
      s.groupMembers[mid] = { id: mid, groupId: id, userId: input.ownerId, role: 'owner', joinedAt: new Date().toISOString() }
      return s
    })
    return g
  },
  join(groupId: string, userId: string) {
    initAPI()
    const exists = Object.values(getStore().groupMembers).find((m) => m.groupId === groupId && m.userId === userId)
    if (exists) return
    const mid = uid('gmb')
    setStore((s) => {
      s.groupMembers[mid] = { id: mid, groupId, userId, role: 'member', joinedAt: new Date().toISOString() }
      s.groups[groupId].memberCount += 1
      return s
    })
  },
  leave(groupId: string, userId: string) {
    initAPI()
    const m = Object.values(getStore().groupMembers).find((m) => m.groupId === groupId && m.userId === userId)
    if (!m) return
    setStore((s) => {
      delete s.groupMembers[m.id]
      s.groups[groupId].memberCount = Math.max(0, s.groups[groupId].memberCount - 1)
      return s
    })
  },
  isMember(groupId: string, userId: string): boolean {
    return !!Object.values(getStore().groupMembers).find((m) => m.groupId === groupId && m.userId === userId)
  },
  members(groupId: string): User[] {
    initAPI()
    return Object.values(getStore().groupMembers)
      .filter((m) => m.groupId === groupId)
      .map((m) => getStore().users[m.userId])
      .filter(Boolean) as User[]
  },
  myGroups(userId: string): Group[] {
    initAPI()
    const myGroupIds = Object.values(getStore().groupMembers).filter((m) => m.userId === userId).map((m) => m.groupId)
    return myGroupIds.map((id) => getStore().groups[id]).filter(Boolean) as Group[]
  },
}

// ============== Reports & Moderation ==============
export const reports = {
  create(input: { reporterId: string; targetType: 'post' | 'comment' | 'user'; targetId: string; reason: any; description: string }) {
    initAPI()
    const id = uid('rpt')
    setStore((s) => {
      s.reports[id] = { id, ...input, status: 'pending', createdAt: new Date().toISOString() }
      if (input.targetType === 'post') s.posts[input.targetId].flagsCount = (s.posts[input.targetId].flagsCount || 0) + 1
      // Auto-flag: if a post gets 3+ reports, mark pending_review and notify admins
      if (input.targetType === 'post' && s.posts[input.targetId].flagsCount >= 3) {
        s.posts[input.targetId].status = 'pending_review'
        // notify all admins
        const admins = Object.values(s.users).filter((u) => (u.role === 'admin' || u.role === 'auditor'))
        admins.forEach((a) => {
          createNotification({ recipientId: a.id, actorId: input.reporterId, type: 'post_flagged', targetType: 'post', targetId: input.targetId })
        })
      }
      return s
    })
  },
  all(status?: string): Report[] {
    initAPI()
    return Object.values(getStore().reports)
      .filter((r) => !status || r.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  },
  resolve(reportId: string, action: 'approve' | 'remove' | 'warn', reason: string) {
    initAPI()
    const me = auth.current()
    if (!me) return
    setStore((s) => {
      const r = s.reports[reportId]
      if (!r) return s
      r.status = 'resolved'
      r.resolvedAt = new Date().toISOString()
      r.resolverId = me.id
      r.resolution = action
      // Mod log
      const lid = uid('mlg')
      s.modLogs[lid] = {
        id: lid, moderatorId: me.id, actorId: me.id, action: `report_${action}`,
        targetType: r.targetType as any, targetId: r.targetId, reason, createdAt: new Date().toISOString(),
      }
      if (action === 'remove' && r.targetType === 'post') {
        s.posts[r.targetId].status = 'deleted'
      } else if (action === 'warn' && r.targetType === 'user') {
        // future: add warning system
      }
      return s
    })
  },
}

function modLog(input: { actorId: string; action: string; targetType: string; targetId: string; reason: string }) {
  setStore((s) => {
    const id = uid('mlg')
    s.modLogs[id] = { id, moderatorId: input.actorId, actorId: input.actorId, action: input.action, targetType: input.targetType as any, targetId: input.targetId, reason: input.reason, createdAt: new Date().toISOString() }
    return s
  })
}

// ============== Module data (read-only seed) ==============
export const modules = {
  news: () => getStore().news,
  debates: () => getStore().debates,
  products: () => getStore().products,
}

// ============== Stats (for admin) ==============
export const stats = {
  overview() {
    initAPI()
    const s = getStore()
    return {
      totalUsers: Object.values(s.users).filter((u) => u.status === 'active').length,
      totalPosts: Object.values(s.posts).filter((p) => p.status === 'published').length,
      totalComments: Object.values(s.comments).filter((c) => c.status === 'published').length,
      totalGroups: Object.values(s.groups).length,
      totalReports: Object.values(s.reports).filter((r) => r.status === 'pending').length,
      totalConversations: Object.values(s.conversations).length,
      bannedUsers: Object.values(s.users).filter((u) => u.status === 'banned').length,
    }
  },
  recentActivity(limit = 20) {
    initAPI()
    const s = getStore()
    return Object.values(s.modLogs).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit)
  },
}

// ============== Helpers ==============
export function isBanned(user: User | null): boolean {
  return user?.status === 'banned' || false
}

export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin' || false
}

export function isAuditor(user: User | null): boolean {
  return user?.role === 'auditor' || user?.role === 'admin' || false
}

export function isCreator(user: User | null): boolean {
  return ['creator', 'auditor', 'admin'].includes(user?.role || '')
}

// ============== Debug helpers ==============
export const debug = {
  reset() {
    resetStore()
    _initialized = false
    initAPI()
  },
  state() {
    return getStore()
  },
}

// ============== Default export for convenience ==============
export default {
  init: initAPI,
  subscribe,
  auth, users, follows, posts, comments, notifications,
  conversations, groups, reports, modules, stats,
  isBanned, isAdmin, isAuditor, isCreator,
  debug,
}
