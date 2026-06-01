// ============== 完整数据模型 ==============
// 与 PocketBase collection schema 一一对应
// 切换到真实 PocketBase 时，只需修改 api/pb.ts 即可

export type Role = 'guest' | 'user' | 'creator' | 'auditor' | 'admin'

export const ROLE_LABELS: Record<Role, string> = {
  guest: '游客',
  user: '用户',
  creator: '创作者',
  auditor: '审核员',
  admin: '管理员',
}

export const ROLE_RANK: Record<Role, number> = {
  guest: 0,
  user: 1,
  creator: 2,
  auditor: 3,
  admin: 4,
}

export interface User {
  id: string
  username: string
  email?: string
  displayName: string
  avatar: string
  cover: string
  bio: string
  role: Role
  verified: boolean
  reputation: number
  badges: string[]
  followers: string[]
  following: string[]
  postsCount: number
  createdAt: string
  lastSeenAt: string
  // Stats
  stats: {
    articlesRead: number
    debatesJoined: number
    argumentsPosted: number
    productsPurchased: number
    postsCreated: number
    commentsPosted: number
    likesReceived: number
  }
  // Privacy
  privacy: {
    profilePublic: boolean
    showActivity: boolean
    allowMessages: 'everyone' | 'followers' | 'none'
  }
  status: 'active' | 'suspended' | 'banned'
  suspensionEndsAt?: string
}

export type PostType = 'text' | 'image' | 'quote' | 'link' | 'poll' | 'share'
export type PostModuleRef = 'news' | 'debate' | 'shop' | 'group' | 'lifestyle' | 'none'

export interface Post {
  id: string
  authorId: string
  type: PostType
  content: string
  images: string[]
  hashtags: string[]
  mentions: string[]
  refType: PostModuleRef
  refId?: string
  linkUrl?: string
  linkTitle?: string
  linkDescription?: string
  // Poll
  poll?: {
    question: string
    options: { id: string; text: string; votes: string[] }[]
    endsAt?: string
  }
  // Metrics
  reactions: Record<ReactionType, string[]> // user IDs
  commentsCount: number
  repostsCount: number
  sharesCount: number
  views: number
  // Status
  status: 'published' | 'pending_review' | 'flagged' | 'hidden' | 'deleted'
  flagsCount: number
  createdAt: string
  editedAt?: string
  // Group
  groupId?: string
}

export type ReactionType = 'like' | 'love' | 'insightful' | 'disagree' | 'laugh' | 'sad' | 'fire'

export const REACTION_META: Record<ReactionType, { emoji: string; label: string; color: string; bg: string; text: string }> = {
  like:       { emoji: '👍', label: '赞同',   color: 'text-nova-500',   bg: 'bg-nova-50 dark:bg-nova-900/30',     text: 'text-nova-600 dark:text-nova-400' },
  love:       { emoji: '❤️', label: '喜欢',   color: 'text-debate-500', bg: 'bg-debate-50 dark:bg-debate-900/30', text: 'text-debate-600 dark:text-debate-400' },
  insightful: { emoji: '💡', label: '有启发', color: 'text-news-500',   bg: 'bg-news-50 dark:bg-news-900/30',     text: 'text-news-600 dark:text-news-400' },
  disagree:   { emoji: '🤔', label: '存疑',   color: 'text-ink-500',    bg: 'bg-ink-100 dark:bg-ink-800',         text: 'text-ink-600 dark:text-ink-300' },
  laugh:      { emoji: '😂', label: '哈哈',   color: 'text-news-500',   bg: 'bg-news-50 dark:bg-news-900/30',     text: 'text-news-600 dark:text-news-400' },
  sad:        { emoji: '😢', label: '心疼',   color: 'text-nova-500',   bg: 'bg-nova-50 dark:bg-nova-900/30',     text: 'text-nova-600 dark:text-nova-400' },
  fire:       { emoji: '🔥', label: '燃',     color: 'text-debate-500', bg: 'bg-debate-50 dark:bg-debate-900/30', text: 'text-debate-600 dark:text-debate-400' },
}

export interface Comment {
  id: string
  postId: string
  authorId: string
  content: string
  parentId?: string
  reactions: Record<ReactionType, string[]>
  createdAt: string
  status: 'published' | 'flagged' | 'hidden' | 'deleted'
}

export interface Follow {
  id: string
  followerId: string
  followeeId: string
  createdAt: string
}

export type NotificationType =
  | 'follow'           // 关注了你
  | 'like'             // 赞了你的帖子
  | 'love'             // 喜欢你的帖子
  | 'comment'          // 评论了你的帖子
  | 'reply'            // 回复了你的评论
  | 'mention'          // @了你
  | 'share'            // 转发了你的帖子
  | 'group_invite'     // 邀请你加入群组
  | 'group_post'       // 你加入的群有新帖
  | 'post_flagged'     // 你的帖子被举报
  | 'post_hidden'      // 你的帖子被隐藏
  | 'role_change'      // 你的角色变更
  | 'message'          // 新私信

export interface Notification {
  id: string
  recipientId: string
  actorId: string
  type: NotificationType
  targetType: 'post' | 'comment' | 'user' | 'group' | 'message'
  targetId: string
  read: boolean
  createdAt: string
}

export interface Conversation {
  id: string
  participants: string[]
  type: 'direct' | 'group'
  name?: string
  lastMessageAt: string
  lastMessagePreview: string
  unreadCount: Record<string, number>
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  attachments?: string[]
  readBy: string[]
  createdAt: string
}

export interface Group {
  id: string
  name: string
  description: string
  cover: string
  type: 'public' | 'private'
  module: PostModuleRef
  memberCount: number
  admins: string[]
  createdAt: string
  rules?: string
  tags: string[]
}

export interface GroupMember {
  id: string
  groupId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  joinedAt: string
}

export type ReportReason = 'spam' | 'harassment' | 'hate' | 'violence' | 'misinformation' | 'inappropriate' | 'other'
export type ReportTargetType = 'post' | 'comment' | 'user'

export interface Report {
  id: string
  reporterId: string
  targetType: ReportTargetType
  targetId: string
  reason: ReportReason
  description?: string
  status: 'pending' | 'resolved' | 'dismissed'
  resolverId?: string
  resolverAction?: 'none' | 'hide' | 'delete' | 'warn' | 'suspend' | 'ban'
  resolution?: 'approve' | 'remove' | 'warn' | 'dismiss'
  createdAt: string
  resolvedAt?: string
}

export interface ModerationLog {
  id: string
  moderatorId: string
  actorId?: string
  action: string
  targetType: 'post' | 'comment' | 'user' | 'group'
  targetId: string
  reason: string
  createdAt: string
}

// ============== 原有三模块数据（保持兼容） ==============
export type ModuleKey = 'news' | 'debate' | 'shop'

export interface Author {
  id: string
  name: string
  handle: string
  avatar: string
  bio?: string
  verified?: boolean
}

export type NewsCategory = 'tech' | 'finance' | 'culture' | 'science' | 'world' | 'lifestyle'

export interface NewsArticle {
  id: string
  title: string
  subtitle: string
  cover: string
  category: NewsCategory
  author: Author
  publishedAt: string
  readTime: number
  content: string
  tags: string[]
  reactions: { like: number; insightful: number; disagree: number }
  views: number
  linkedDebateId?: string
  linkedProductIds?: string[]
  source?: string
}

export type DebateCategory = 'tech' | 'social' | 'consumer' | 'philosophy' | 'entertainment' | 'world' | 'lifestyle'

export interface DebateArgument {
  id: string
  side: 'pro' | 'con'
  authorId: string
  authorName: string
  authorAvatar: string
  content: string
  upvotes: number
  downvotes: number
  createdAt: string
  parentId?: string
  userVote?: 1 | -1 | 0
}

export interface Debate {
  id: string
  title: string
  description: string
  category: DebateCategory
  creatorId: string
  createdAt: string
  pros: number
  cons: number
  arguments: DebateArgument[]
  views: number
  hot: number
  linkedNewsId?: string
  linkedProductId?: string
  cover?: string
  tags?: string[]
}

export type ProductCategory = 'tech' | 'fashion' | 'home' | 'books' | 'food' | 'sports' | 'beauty'

export interface Product {
  id: string
  name: string
  tagline: string
  description: string
  price: number
  originalPrice?: number
  images: string[]
  brand: string
  category: ProductCategory
  rating: number
  reviewCount: number
  stock: number
  specs: Record<string, string>
  tags: string[]
  linkedDebateIds?: string[]
  linkedNewsId?: string
  isNewsworthy?: boolean
  vendor?: string
}
