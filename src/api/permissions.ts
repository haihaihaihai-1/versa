// ============== 角色与权限 ==============

import type { User, Role } from './types'

export type Action =
  // 帖子相关
  | 'post.create' | 'post.delete_own' | 'post.delete_any' | 'post.report'
  // 评论相关
  | 'comment.create' | 'comment.delete_own' | 'comment.delete_any'
  // 用户相关
  | 'user.ban' | 'user.unban' | 'user.change_role' | 'user.verify'
  // 群组
  | 'group.create' | 'group.delete_any' | 'group.pin_post'
  // 审核
  | 'report.view' | 'report.resolve' | 'modlog.view'
  // 统计
  | 'stats.view' | 'admin.dashboard'
  // 私信
  | 'message.send' | 'message.broadcast'
  // 商品（模块内）
  | 'shop.checkout' | 'shop.refund_any'

export interface Permission {
  action: Action
  allowed: boolean
  reason?: string
}

const ROLE_RANK: Record<Role, number> = {
  guest: 0, user: 1, creator: 2, auditor: 3, admin: 4,
}

const MATRIX: Record<Action, Role[]> = {
  // 任何登录用户
  'post.create': ['user', 'creator', 'auditor', 'admin'],
  'post.delete_own': ['user', 'creator', 'auditor', 'admin'],
  'post.report': ['user', 'creator', 'auditor', 'admin'],
  'comment.create': ['user', 'creator', 'auditor', 'admin'],
  'comment.delete_own': ['user', 'creator', 'auditor', 'admin'],
  'message.send': ['user', 'creator', 'auditor', 'admin'],
  'shop.checkout': ['user', 'creator', 'auditor', 'admin'],
  'group.create': ['user', 'creator', 'auditor', 'admin'],
  // 创作者及以上
  'group.pin_post': ['creator', 'auditor', 'admin'],
  // 审核员及以上
  'post.delete_any': ['auditor', 'admin'],
  'comment.delete_any': ['auditor', 'admin'],
  'report.view': ['auditor', 'admin'],
  'report.resolve': ['auditor', 'admin'],
  'modlog.view': ['auditor', 'admin'],
  'user.ban': ['auditor', 'admin'],
  'user.unban': ['auditor', 'admin'],
  'message.broadcast': ['auditor', 'admin'],
  'shop.refund_any': ['auditor', 'admin'],
  'group.delete_any': ['auditor', 'admin'],
  // 仅管理员
  'user.change_role': ['admin'],
  'user.verify': ['admin'],
  'stats.view': ['admin'],
  'admin.dashboard': ['admin'],
}

export function can(user: User | null, action: Action, context?: { authorId?: string }): Permission {
  if (!user) {
    return { action, allowed: false, reason: '请先登录' }
  }
  if (user.status === 'banned') {
    return { action, allowed: false, reason: '账号已被封禁' }
  }
  const allowedRoles = MATRIX[action]
  if (!allowedRoles.includes(user.role)) {
    return { action, allowed: false, reason: `此操作需要 ${allowedRoles[0]} 及以上权限` }
  }
  // Self-action check for delete_own
  if (action === 'post.delete_own' || action === 'comment.delete_own') {
    if (context?.authorId && context.authorId !== user.id) {
      return { action, allowed: false, reason: '只能删除自己的内容' }
    }
  }
  return { action, allowed: true }
}

export function isAtLeast(user: User | null, role: Role): boolean {
  if (!user) return false
  return ROLE_RANK[user.role] >= ROLE_RANK[role]
}

export function roleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    guest: '访客', user: '用户', creator: '创作者', auditor: '审核员', admin: '管理员',
  }
  return labels[role]
}

export function roleColor(role: Role): string {
  const colors: Record<Role, string> = {
    guest: 'bg-gray-100 text-gray-700',
    user: 'bg-blue-100 text-blue-700',
    creator: 'bg-purple-100 text-purple-700',
    auditor: 'bg-amber-100 text-amber-700',
    admin: 'bg-rose-100 text-rose-700',
  }
  return colors[role]
}

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  guest: '可浏览公开内容，不可互动',
  user: '可发帖、评论、加好友、加入群组、参与投票',
  creator: '认证创作者，可置顶群组帖子、获得创作激励',
  auditor: '内容审核员，可处理举报、删除违规内容、警告用户',
  admin: '管理员，可变更角色、封禁账号、查看完整数据看板',
}
