/**
 * Versa · 管理后台 UI (v18.0)
 * - 用户管理
 * - 内容审核
 * - 审计日志
 * - 系统配置
 */
import { useEffect, useState, useMemo } from 'react'
import { Shield, Users, FileText, AlertTriangle, Settings, Download, Check, X, Eye, Ban } from 'lucide-react'
import { hasPermission, ROLE_LABELS, ROLE_COLORS, type Role, type Permission } from './permissions'
import { useAuditLog, auditLog, type AuditEntry } from './audit'
import { moderation, reviewContent, type ContentItem, type ReviewResult, type Report } from './moderation'
import { cn } from '../lib/utils'

export function AdminDashboard() {
  const [tab, setTab] = useState<'overview' | 'users' | 'moderation' | 'audit' | 'system'>('overview')
  const [role] = useState<Role>('admin')  // 实际从 auth 取

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-violet-500" /> 管理后台
        </h1>
        <p className="text-sm text-ink-500 mt-1">用户 · 内容 · 审计 · 系统 · {ROLE_LABELS[role]}</p>
      </header>

      <nav className="flex gap-2 mb-6 overflow-x-auto">
        {(['overview', 'users', 'moderation', 'audit', 'system'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm whitespace-nowrap',
              tab === t ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800'
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      {tab === 'overview' && <Overview role={role} />}
      {tab === 'users' && <UserManagement role={role} />}
      {tab === 'moderation' && <ModerationPanel />}
      {tab === 'audit' && <AuditPanel />}
      {tab === 'system' && <SystemPanel role={role} />}
    </div>
  )
}

const TAB_LABELS = {
  overview: '总览', users: '用户', moderation: '审核', audit: '审计', system: '系统',
}

// ============== 总览 ==============

function Overview({ role }: { role: Role }) {
  const audit = useAuditLog()
  const reports = moderation.getReports()
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard label="今日审计" value={audit.filter((a) => a.ts > Date.now() - 86400000).length} />
      <StatCard label="待审举报" value={reports.filter((r) => r.status === 'pending').length} />
      <StatCard label="高风险内容" value={moderation.list({ minScore: 0.7 }).length} color="text-rose-500" />
      <StatCard label="我的角色" value={ROLE_LABELS[role]} text color="text-violet-500" />
    </div>
  )
}

function StatCard({ label, value, color, text }: { label: string; value: any; color?: string; text?: boolean }) {
  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
      <div className="text-xs text-ink-500">{label}</div>
      <div className={cn('mt-1 font-bold', text ? 'text-base' : 'text-2xl', color)}>{value}</div>
    </div>
  )
}

// ============== 用户管理 ==============

interface MockUser {
  id: string
  name: string
  email: string
  role: Role
  status: 'active' | 'banned' | 'suspended'
  joinedAt: number
  posts: number
}

const MOCK_USERS: MockUser[] = [
  { id: 'u1', name: 'Alice', email: 'alice@example.com', role: 'user', status: 'active', joinedAt: Date.now() - 86400000 * 30, posts: 12 },
  { id: 'u2', name: 'Bob', email: 'bob@example.com', role: 'verified', status: 'active', joinedAt: Date.now() - 86400000 * 60, posts: 45 },
  { id: 'u3', name: 'Carol', email: 'carol@example.com', role: 'moderator', status: 'active', joinedAt: Date.now() - 86400000 * 90, posts: 200 },
  { id: 'u4', name: 'Spammer', email: 'spam@bot.com', role: 'user', status: 'banned', joinedAt: Date.now() - 86400000 * 2, posts: 500 },
]

function UserManagement({ role }: { role: Role }) {
  const [users, setUsers] = useState(MOCK_USERS)
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    if (!filter) return users
    const f = filter.toLowerCase()
    return users.filter((u) => u.name.toLowerCase().includes(f) || u.email.toLowerCase().includes(f))
  }, [users, filter])

  const canBan = hasPermission(role, 'user.ban')

  const onBan = async (userId: string) => {
    if (!canBan) return alert('权限不足')
    setUsers((us) => us.map((u) => (u.id === userId ? { ...u, status: 'banned' as const } : u)))
    await auditLog.record({
      actor: { id: 'admin', name: 'Admin', role },
      action: 'user.ban',
      target: { type: 'user', id: userId, label: users.find((u) => u.id === userId)?.name },
      data: { reason: 'violation' },
    })
  }

  const onUnban = async (userId: string) => {
    setUsers((us) => us.map((u) => (u.id === userId ? { ...u, status: 'active' as const } : u)))
    await auditLog.record({
      actor: { id: 'admin', name: 'Admin', role },
      action: 'user.edit',
      target: { type: 'user', id: userId },
      data: { change: 'unban' },
    })
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
      <div className="p-4 border-b border-ink-200/50 dark:border-ink-800/50">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="搜索用户…"
          className="w-full md:w-72 px-3 py-1.5 rounded-lg bg-ink-100 dark:bg-ink-800 outline-none text-sm"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-ink-500 border-b border-ink-200/50 dark:border-ink-800/50">
            <tr>
              <th className="text-left p-2">用户</th>
              <th className="text-left p-2">角色</th>
              <th className="text-left p-2">状态</th>
              <th className="text-right p-2">帖子</th>
              <th className="text-right p-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-ink-100 dark:border-ink-800/50">
                <td className="p-2">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-ink-500">{u.email}</div>
                </td>
                <td className="p-2">
                  <span className={cn('text-xs px-1.5 py-0.5 rounded', ROLE_COLORS[u.role])}>{ROLE_LABELS[u.role]}</span>
                </td>
                <td className="p-2">
                  <span className={cn('text-xs', u.status === 'active' ? 'text-emerald-500' : 'text-rose-500')}>
                    {u.status}
                  </span>
                </td>
                <td className="p-2 text-right">{u.posts}</td>
                <td className="p-2 text-right space-x-1">
                  {u.status === 'banned' ? (
                    <button onClick={() => onUnban(u.id)} className="text-xs text-emerald-500 hover:underline">
                      解封
                    </button>
                  ) : (
                    <button onClick={() => onBan(u.id)} className="text-xs text-rose-500 hover:underline">
                      封禁
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============== 审核 ==============

function ModerationPanel() {
  const [items, setItems] = useState<ReviewResult[]>([])
  const [reports, setReports] = useState<Report[]>(moderation.getReports())

  useEffect(() => {
    const refresh = () => {
      setItems(moderation.list({ minScore: 0 }))
      setReports(moderation.getReports())
    }
    refresh()
    // 演示: 添加一些 mock 数据
    if (moderation.list().length === 0) {
      const samples: ContentItem[] = [
        { id: 'p1', type: 'post', text: '欢迎加入 Versa 社区 🎉', authorId: 'u1', createdAt: Date.now() },
        { id: 'p2', type: 'post', text: '加我微信 138xxxx8888 有优惠 https://example.com https://spam.com https://more.com', authorId: 'u4', createdAt: Date.now() },
        { id: 'p3', type: 'post', text: '澳门威尼斯人赌场 🎰🎰🎰 性感荷官 在线发牌', authorId: 'u4', createdAt: Date.now() },
        { id: 'p4', type: 'comment', text: '好文！', authorId: 'u2', createdAt: Date.now() },
      ]
      for (const s of samples) {
        const r = reviewContent(s)
        moderation.submit(r)
      }
      refresh()
    }
    const unsub = moderation.subscribe(refresh)
    return unsub
  }, [])

  const onReview = async (itemId: string, action: ReviewResult['action']) => {
    moderation.review(itemId, action, `人工: ${action}`, 'admin')
  }

  const onReportResolve = (id: string, status: 'reviewed' | 'dismissed') => {
    moderation.resolveReport(id, status)
    setReports(moderation.getReports())
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" /> 内容审核 ({items.length})
        </h2>
        <div className="space-y-2">
          {items.sort((a, b) => b.score - a.score).map((r) => (
            <div key={r.itemId} className="p-3 rounded-xl border border-ink-200/50 dark:border-ink-800/50">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('text-xs px-2 py-0.5 rounded font-mono',
                  r.action === 'reject' ? 'bg-rose-500/10 text-rose-500' :
                  r.action === 'flag' ? 'bg-amber-500/10 text-amber-500' :
                  r.action === 'shadow' ? 'bg-ink-500/10 text-ink-500' :
                  'bg-emerald-500/10 text-emerald-500'
                )}>
                  {r.action}
                </span>
                <span className="text-xs text-ink-500">score: {r.score.toFixed(2)}</span>
                <span className="ml-auto text-[10px] text-ink-400">{r.auto ? '自动' : '人工'}</span>
              </div>
              <div className="text-xs text-ink-500 mb-1.5">{r.reasons.join(' · ') || '无问题'}</div>
              <div className="flex gap-1">
                <button onClick={() => onReview(r.itemId, 'approve')} className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                  <Check className="w-3 h-3 inline" /> 通过
                </button>
                <button onClick={() => onReview(r.itemId, 'reject')} className="text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-500">
                  <X className="w-3 h-3 inline" /> 拒绝
                </button>
                <button onClick={() => onReview(r.itemId, 'shadow')} className="text-xs px-2 py-0.5 rounded bg-ink-500/10 text-ink-500">
                  <Eye className="w-3 h-3 inline" /> 影子
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" /> 举报队列 ({reports.length})
        </h2>
        {reports.length === 0 ? (
          <p className="text-sm text-ink-500">暂无举报</p>
        ) : (
          <div className="space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="p-2 rounded-lg border border-ink-200/50 dark:border-ink-800/50 flex items-center gap-2 text-sm">
                <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">{r.reason}</span>
                <span className="text-xs text-ink-500">{r.targetType}#{r.targetId}</span>
                <span className="ml-auto text-xs">{r.status}</span>
                {r.status === 'pending' && (
                  <>
                    <button onClick={() => onReportResolve(r.id, 'reviewed')} className="text-xs text-emerald-500">处理</button>
                    <button onClick={() => onReportResolve(r.id, 'dismissed')} className="text-xs text-ink-500">忽略</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ============== 审计 ==============

function AuditPanel() {
  const entries = useAuditLog().slice().reverse().slice(0, 100)
  const [verify, setVerify] = useState<{ ok: boolean; total: number } | null>(null)

  const onVerify = async () => {
    const r = await auditLog.verify()
    setVerify({ ok: r.ok, total: r.total })
  }

  const onExport = (format: 'json' | 'csv') => {
    const data = auditLog.export(format)
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50">
      <div className="p-4 border-b border-ink-200/50 dark:border-ink-800/50 flex items-center gap-2">
        <button onClick={onVerify} className="text-xs px-2 py-1 rounded bg-violet-500/10 text-violet-500">
          验证哈希链
        </button>
        {verify && (
          <span className={cn('text-xs', verify.ok ? 'text-emerald-500' : 'text-rose-500')}>
            {verify.ok ? `✅ 完整 (${verify.total} 条)` : `❌ 损坏`}
          </span>
        )}
        <div className="ml-auto flex gap-1">
          <button onClick={() => onExport('json')} className="text-xs px-2 py-1 rounded bg-ink-100 dark:bg-ink-800">
            <Download className="w-3 h-3 inline" /> JSON
          </button>
          <button onClick={() => onExport('csv')} className="text-xs px-2 py-1 rounded bg-ink-100 dark:bg-ink-800">
            <Download className="w-3 h-3 inline" /> CSV
          </button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="text-ink-500 sticky top-0 bg-white dark:bg-ink-900">
            <tr>
              <th className="text-left p-2">时间</th>
              <th className="text-left p-2">操作者</th>
              <th className="text-left p-2">动作</th>
              <th className="text-left p-2">目标</th>
              <th className="text-left p-2">Hash</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-ink-100 dark:border-ink-800/50">
                <td className="p-2 font-mono whitespace-nowrap">{new Date(e.ts).toLocaleString()}</td>
                <td className="p-2">{e.actor.name}</td>
                <td className="p-2 font-mono">{e.action}</td>
                <td className="p-2 font-mono">{e.target?.id || '-'}</td>
                <td className="p-2 font-mono text-[10px] text-ink-500">{e.hash?.slice(0, 8)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============== 系统 ==============

function SystemPanel({ role }: { role: Role }) {
  const [config, setConfig] = useState({
    maintenance: false,
    registrationOpen: true,
    maxUploadMB: 50,
    rateLimit: 100,
    featureAI: true,
    featureCreator: true,
  })
  const canConfigure = hasPermission(role, 'system.configure')

  const onSave = async () => {
    if (!canConfigure) return alert('权限不足')
    await auditLog.record({
      actor: { id: 'admin', name: 'Admin', role },
      action: 'system.config',
      data: { ...config },
    })
    alert('✅ 已保存,已记录审计')
  }

  return (
    <div className="rounded-2xl p-4 bg-white dark:bg-ink-900 border border-ink-200/50 dark:border-ink-800/50 space-y-3">
      <h2 className="font-semibold flex items-center gap-2">
        <Settings className="w-4 h-4" /> 系统配置
      </h2>
      <Toggle label="维护模式" value={config.maintenance} onChange={(v) => setConfig({ ...config, maintenance: v })} />
      <Toggle label="开放注册" value={config.registrationOpen} onChange={(v) => setConfig({ ...config, registrationOpen: v })} />
      <Toggle label="AI 功能" value={config.featureAI} onChange={(v) => setConfig({ ...config, featureAI: v })} />
      <Toggle label="创作者中心" value={config.featureCreator} onChange={(v) => setConfig({ ...config, featureCreator: v })} />
      <div>
        <label className="text-sm text-ink-500">上传上限 (MB)</label>
        <input
          type="number"
          value={config.maxUploadMB}
          onChange={(e) => setConfig({ ...config, maxUploadMB: Number(e.target.value) })}
          className="w-full mt-1 px-3 py-1.5 rounded-lg bg-ink-100 dark:bg-ink-800 outline-none text-sm"
        />
      </div>
      <div>
        <label className="text-sm text-ink-500">API 速率限制 (次/分)</label>
        <input
          type="number"
          value={config.rateLimit}
          onChange={(e) => setConfig({ ...config, rateLimit: Number(e.target.value) })}
          className="w-full mt-1 px-3 py-1.5 rounded-lg bg-ink-100 dark:bg-ink-800 outline-none text-sm"
        />
      </div>
      <button onClick={onSave} disabled={!canConfigure} className="w-full py-2 rounded-xl bg-violet-500 text-white text-sm font-medium disabled:opacity-50">
        💾 保存
      </button>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1 cursor-pointer">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={cn('w-10 h-5 rounded-full transition-colors relative', value ? 'bg-violet-500' : 'bg-ink-300 dark:bg-ink-700')}
      >
        <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', value ? 'translate-x-5' : 'translate-x-0.5')} />
      </button>
    </label>
  )
}

export { hasPermission, auditLog, moderation, reviewContent, ROLE_LABELS, ROLE_COLORS }
export type { Role, Permission, ReviewResult, Report, ContentItem, AuditEntry }
