// ============== 通用 UI 组件 ==============

import { Link } from 'react-router-dom'
import { Crown, Shield, CheckCircle2, BadgeCheck, Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { User, Role } from '../../api/types'

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
  '2xl': 'w-32 h-32 text-3xl',
}

const ROLE_ICON: Record<Role, any> = {
  guest: null, user: null, creator: BadgeCheck, auditor: Shield, admin: Crown,
}

const ROLE_COLOR: Record<Role, string> = {
  guest: '',
  user: '',
  creator: 'text-nova-600',
  auditor: 'text-amber-600',
  admin: 'text-rose-600',
}

interface UserAvatarProps {
  user: Pick<User, 'avatar' | 'displayName' | 'role' | 'verified' | 'username'> | null
  size?: keyof typeof SIZE_CLASSES
  withStoryRing?: boolean
  className?: string
  onClick?: () => void
}

export function UserAvatar({ user, size = 'md', withStoryRing = false, className, onClick }: UserAvatarProps) {
  if (!user) {
    return (
      <div
        className={cn(
          'rounded-full bg-gradient-to-br from-ink-200 to-ink-300 dark:from-ink-700 dark:to-ink-800 flex items-center justify-center text-ink-400',
          SIZE_CLASSES[size],
          className
        )}
      >
        ?
      </div>
    )
  }

  const RoleIcon = ROLE_ICON[user.role]
  const wrapperClass = cn(
    'inline-block relative',
    onClick && 'cursor-pointer',
    className
  )

  const inner = (
    <>
      {withStoryRing && (
        <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 to-nova-500 p-0.5">
          <div className="w-full h-full rounded-full bg-white dark:bg-ink-900" />
        </div>
      )}
      <div
        className={cn(
          'relative rounded-full bg-gradient-to-br from-nova-400 via-rose-400 to-shop-400 flex items-center justify-center text-white font-semibold overflow-hidden ring-2 ring-white dark:ring-ink-900',
          SIZE_CLASSES[size],
          withStoryRing && 'relative'
        )}
        style={{ padding: 2 }}
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.displayName}
            className="w-full h-full object-cover rounded-full"
            loading="lazy"
          />
        ) : (
          <span>{user.displayName?.[0]?.toUpperCase() || 'U'}</span>
        )}
      </div>
      {(RoleIcon || user.verified) && (
        <div className={cn('absolute -bottom-0.5 -right-0.5 rounded-full bg-white dark:bg-ink-900 p-0.5', ROLE_COLOR[user.role])}>
          {RoleIcon ? <RoleIcon className="w-3 h-3" /> : user.verified ? <CheckCircle2 className="w-3 h-3 text-nova-500" /> : null}
        </div>
      )}
    </>
  )

  if (onClick) {
    return (
      <button onClick={onClick} className={wrapperClass} aria-label={`查看 ${user.displayName}`}>
        {inner}
      </button>
    )
  }
  if (user.username) {
    return (
      <Link to={`/u/${user.username}`} className={wrapperClass} aria-label={`查看 ${user.displayName}`}>
        {inner}
      </Link>
    )
  }
  return <div className={wrapperClass}>{inner}</div>
}

interface UsernameProps {
  user: Pick<User, 'displayName' | 'username' | 'verified' | 'role'>
  className?: string
  withRoleBadge?: boolean
  withHandle?: boolean
}

export function Username({ user, className, withRoleBadge = false, withHandle = true }: UsernameProps) {
  const RoleIcon = ROLE_ICON[user.role]
  return (
    <Link to={`/u/${user.username}`} className={cn('inline-flex items-center gap-1 group', className)}>
      <span className="font-semibold group-hover:underline truncate max-w-[160px]">{user.displayName}</span>
      {user.verified && <CheckCircle2 className="w-3.5 h-3.5 text-nova-500 flex-shrink-0" />}
      {RoleIcon && withRoleBadge && <RoleIcon className={cn('w-3.5 h-3.5 flex-shrink-0', ROLE_COLOR[user.role])} />}
      {withHandle && <span className="text-ink-500 text-sm">@{user.username}</span>}
    </Link>
  )
}

interface ReputationBadgeProps {
  reputation: number
  className?: string
}

export function ReputationBadge({ reputation, className }: ReputationBadgeProps) {
  if (reputation < 100) return null
  return (
    <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium', className)}>
      <Sparkles className="w-3 h-3" />
      {reputation}
    </span>
  )
}
