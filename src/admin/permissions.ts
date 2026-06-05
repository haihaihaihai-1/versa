/**
 * Versa · 权限/角色系统 (v18.0)
 *
 * 设计：
 * - 角色 (Role): 树形继承
 * - 权限 (Permission): resource.action 形式
 * - 资源 (Resource): 用户/内容/订单/系统
 * - 操作 (Action): 查看/创建/编辑/删除/审核/封禁
 */

export type Resource = 'user' | 'content' | 'product' | 'comment' | 'debate' | 'order' | 'creator' | 'system' | 'analytics' | 'audit'
export type Action = 'view' | 'create' | 'edit' | 'delete' | 'review' | 'ban' | 'export' | 'configure'

export type Permission = `${Resource}.${Action}` | `${Resource}.*` | '*'

export type Role = 'guest' | 'user' | 'verified' | 'moderator' | 'admin' | 'super_admin' | 'owner'

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  guest: [
    'content.view', 'product.view', 'comment.view', 'debate.view',
  ],
  user: [
    'content.view', 'content.create', 'content.edit',
    'product.view',
    'comment.view', 'comment.create', 'comment.edit', 'comment.delete',
    'debate.view', 'debate.create',
    'creator.view',
  ],
  verified: [
    'content.view', 'content.create', 'content.edit',
    'product.view',
    'comment.view', 'comment.create', 'comment.edit', 'comment.delete',
    'debate.view', 'debate.create',
    'creator.view', 'creator.edit',
  ],
  moderator: [
    'user.view', 'user.ban',
    'content.view', 'content.create', 'content.edit', 'content.delete', 'content.review',
    'product.view', 'product.edit', 'product.delete',
    'comment.view', 'comment.create', 'comment.edit', 'comment.delete', 'comment.review',
    'debate.view', 'debate.create', 'debate.edit', 'debate.review',
    'creator.view', 'creator.edit',
    'audit.view',
  ],
  admin: [
    'user.view', 'user.edit', 'user.ban',
    'content.view', 'content.create', 'content.edit', 'content.delete', 'content.review',
    'product.view', 'product.create', 'product.edit', 'product.delete',
    'comment.view', 'comment.create', 'comment.edit', 'comment.delete', 'comment.review',
    'debate.view', 'debate.create', 'debate.edit', 'debate.delete', 'debate.review',
    'creator.view', 'creator.edit',
    'order.view', 'order.edit',
    'analytics.view', 'analytics.export',
    'audit.view', 'audit.export',
  ],
  super_admin: [
    'user.view', 'user.edit', 'user.ban', 'user.delete',
    'content.*',
    'product.*',
    'comment.*',
    'debate.*',
    'creator.*',
    'order.*',
    'analytics.*',
    'audit.*',
    'system.*',
  ],
  owner: ['*'],
}

const ROLE_HIERARCHY: Role[] = ['guest', 'user', 'verified', 'moderator', 'admin', 'super_admin', 'owner']

export function getRolePermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}

export function hasPermission(role: Role, perm: Permission): boolean {
  const perms = getRolePermissions(role)
  if (perms.includes('*')) return true
  if (perms.includes(perm)) return true
  // 通配符检查: e.g. 'content.*' 匹配 'content.view'
  const [resource] = perm.split('.')
  if (perms.includes(`${resource}.*` as Permission)) return true
  return false
}

export function hasAnyPermission(role: Role, perms: Permission[]): boolean {
  return perms.some((p) => hasPermission(role, p))
}

export function hasAllPermissions(role: Role, perms: Permission[]): boolean {
  return perms.every((p) => hasPermission(role, p))
}

export function isRoleAtLeast(actual: Role, required: Role): boolean {
  return ROLE_HIERARCHY.indexOf(actual) >= ROLE_HIERARCHY.indexOf(required)
}

export const ROLES = ROLE_HIERARCHY
export const ROLE_LABELS: Record<Role, string> = {
  guest: '游客',
  user: '普通用户',
  verified: '认证用户',
  moderator: '社区版主',
  admin: '管理员',
  super_admin: '超级管理员',
  owner: '所有者',
}

export const ROLE_COLORS: Record<Role, string> = {
  guest: 'bg-ink-100 text-ink-700',
  user: 'bg-emerald-100 text-emerald-700',
  verified: 'bg-blue-100 text-blue-700',
  moderator: 'bg-amber-100 text-amber-700',
  admin: 'bg-violet-100 text-violet-700',
  super_admin: 'bg-rose-100 text-rose-700',
  owner: 'bg-pink-100 text-pink-700',
}
