// ============== 管理后台布局 ==============

import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Shield, Users, Flag, BarChart3, ArrowLeft, LineChart } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import { isAuditor, isAdmin } from '../api/index'
import { cn } from '../lib/utils'

interface Tab { to: string; label: string; icon: any; end?: boolean; adminOnly?: boolean }
const TABS: Tab[] = [
  { to: '/admin', label: '概览', icon: BarChart3, end: true },
  { to: '/admin/users', label: '用户管理', icon: Users, adminOnly: true },
  { to: '/admin/moderation', label: '内容审核', icon: Flag },
  { to: '/admin/stats', label: '数据看板', icon: BarChart3, adminOnly: true },
  { to: '/admin/analytics', label: '高级分析', icon: LineChart, adminOnly: true },
]

export function AdminLayout() {
  const { user: me } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  if (!me) return <div className="p-12 text-center">请先<Link to="/auth" className="text-nova-600">登录</Link></div>
  if (!isAuditor(me)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <Shield className="w-12 h-12 mx-auto mb-3 text-debate-500" />
        <h2 className="text-xl font-bold mb-2">权限不足</h2>
        <p className="text-ink-500">仅审核员和管理员可访问后台</p>
      </div>
    )
  }

  const visibleTabs = TABS.filter((t) => !t.adminOnly || isAdmin(me))

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">管理后台</h1>
          <p className="text-sm text-ink-500">{isAdmin(me) ? '管理员视图 · 完整权限' : '审核员视图 · 社区治理'}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {visibleTabs.map((t) => {
          const active = t.end ? pathname === t.to : pathname.startsWith(t.to)
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap',
                active ? 'bg-rose-500 text-white' : 'bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800'
              )}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </Link>
          )
        })}
      </div>

      <Outlet />
    </div>
  )
}
