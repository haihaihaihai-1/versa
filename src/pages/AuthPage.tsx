// ============== 登录/注册页 ==============

import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Eye, EyeOff, Sparkles, Shield, Crown, User, ArrowRight, X } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import api from '../api'
import { REACTION_META } from '../api/types'
import { roleLabel, ROLE_DESCRIPTIONS } from '../api/permissions'
import { cn } from '../lib/utils'

export function AuthPage() {
  const navigate = useNavigate()
  const { mode } = useParams<{ mode?: string }>()
  const { signIn, signUp, user } = useAuth()
  const [tab, setTab] = useState<'signin' | 'signup'>(mode === 'signup' ? 'signup' : 'signin')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ username: '', email: '', password: '', displayName: '' })

  // Already signed in → redirect
  useEffect(() => {
    if (user) navigate('/feed')
  }, [user, navigate])

  useEffect(() => {
    setTab(mode === 'signup' ? 'signup' : 'signin')
  }, [mode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (tab === 'signin') {
        await signIn(form.username, form.password)
      } else {
        await signUp({
          username: form.username,
          email: form.email || undefined,
          password: form.password,
          displayName: form.displayName || form.username,
        })
      }
      navigate('/feed')
    } catch (err: any) {
      setError(err.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (username: string, password: string) => {
    setForm({ username, email: '', password, displayName: '' })
    setTab('signin')
  }

  return (
    <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-stretch bg-white/60 dark:bg-ink-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 dark:border-ink-800/40 overflow-hidden">
      {/* Left: Brand showcase */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-rose-500 via-nova-500 to-shop-500 text-white overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-amber-300/30 blur-3xl" />
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">V</div>
            <div>
              <div className="text-2xl font-bold">Versa</div>
              <div className="text-sm text-white/80">新闻 × 辩论 × 购物</div>
            </div>
          </div>
          <h1 className="text-4xl font-bold leading-tight mb-3">
            读你所想，<br />辩你所信，<br />买你所爱。
          </h1>
          <p className="text-lg text-white/90 max-w-md">
            三体融合的社区平台。在这里，深度内容、理性讨论、品质好物，共同构成你的数字生活。
          </p>
        </div>

        <div className="relative space-y-3 mt-8">
          <div className="text-sm text-white/80 font-medium">社区氛围</div>
          {Object.entries(REACTION_META).slice(0, 6).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-3 text-white/95">
              <span className="text-2xl">{meta.emoji}</span>
              <span className="text-sm">{meta.label} — 表达你真实的态度</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Form */}
      <div className="relative p-6 sm:p-10">
        <Link to="/" className="absolute top-4 right-4 p-2 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800" aria-label="关闭">
          <X className="w-5 h-5" />
        </Link>

        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">{tab === 'signin' ? '欢迎回来' : '加入 Versa'}</h2>
            <p className="text-ink-500 dark:text-ink-400">
              {tab === 'signin' ? '用你的账号继续探索' : '30 秒注册，即刻融入社区'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-ink-100 dark:bg-ink-800 rounded-xl mb-6">
            {(['signin', 'signup'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); navigate(`/auth/${t === 'signup' ? 'signup' : ''}`); setError(null) }}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
                  tab === t ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-white shadow' : 'text-ink-500'
                )}
              >
                {t === 'signin' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'signup' && (
              <div>
                <label className="text-sm font-medium text-ink-700 dark:text-ink-300 block mb-1.5">昵称</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="展示给其他用户的名字"
                  className="w-full px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 focus:ring-2 focus:ring-nova-500 focus:border-transparent outline-none"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-ink-700 dark:text-ink-300 block mb-1.5">用户名</label>
              <input
                type="text"
                required
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="3-20 个字符"
                className="w-full px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 focus:ring-2 focus:ring-nova-500 focus:border-transparent outline-none"
              />
            </div>
            {tab === 'signup' && (
              <div>
                <label className="text-sm font-medium text-ink-700 dark:text-ink-300 block mb-1.5">邮箱 <span className="text-ink-400 font-normal">（可选）</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="用于接收通知"
                  className="w-full px-4 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 focus:ring-2 focus:ring-nova-500 focus:border-transparent outline-none"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-ink-700 dark:text-ink-300 block mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="至少 6 位"
                  className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-ink-200 dark:border-ink-800 bg-white dark:bg-ink-900 focus:ring-2 focus:ring-nova-500 focus:border-transparent outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-debate-50 dark:bg-debate-900/30 text-debate-600 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-nova-500 to-rose-500 text-white font-semibold hover:shadow-lg hover:shadow-nova-500/30 transition-shadow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? '处理中...' : (tab === 'signin' ? '登录' : '创建账号')}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 pt-6 border-t border-ink-200 dark:border-ink-800">
            <div className="text-xs text-ink-500 mb-3 text-center">✨ 一键登录演示账号</div>
            <div className="grid grid-cols-1 gap-2">
              {api.auth.demoAccounts().map((a: any) => (
                <button
                  key={a.username}
                  type="button"
                  onClick={() => fillDemo(a.username, a.password)}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-ink-200 dark:border-ink-800 hover:border-nova-300 hover:bg-nova-50/30 dark:hover:bg-nova-900/10 transition-colors text-left"
                >
                  <RoleIcon role={a.role as any} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.displayName}</div>
                    <div className="text-xs text-ink-500 truncate">@{a.username} · {roleLabel(a.role as any)}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-ink-400" />
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-500 text-center">
              演示账号可体验全部 5 种角色权限
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function RoleIcon({ role }: { role: 'user' | 'creator' | 'auditor' | 'admin' }) {
  const map = {
    user: { icon: User, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
    creator: { icon: Sparkles, color: 'text-nova-500 bg-nova-50 dark:bg-nova-900/30' },
    auditor: { icon: Shield, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' },
    admin: { icon: Crown, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/30' },
  }
  const { icon: Icon, color } = map[role]
  return (
    <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
      <Icon className="w-4 h-4" />
    </div>
  )
}
