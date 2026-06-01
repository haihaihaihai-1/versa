// ============== 管理后台 - 内容审核 ==============

import { useState } from 'react'
import { Flag, Trash2, CheckCircle2, AlertOctagon, ChevronDown, ChevronRight } from 'lucide-react'
import { useApi, useStoreVersion } from '../api/hooks'
import api from '../api'
import { useAuth } from '../api/AuthContext'
import { UserAvatar } from '../components/social/UserAvatar'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { cn } from '../lib/utils'

const REASON_LABEL: Record<string, string> = {
  spam: '垃圾信息', harassment: '骚扰他人', misinformation: '虚假信息', hate_speech: '仇恨言论',
  nudity: '色情内容', violence: '暴力内容', other: '其他',
}

export function AdminModerationPage() {
  const { user: me } = useAuth()
  const [tab, setTab] = useState<'pending' | 'resolved'>('pending')
  useStoreVersion()
  const reports = useApi(() => tab === 'pending' ? api.reports.all('pending') : api.reports.all('resolved'))
  const [expanded, setExpanded] = useState<string | null>(null)

  const resolve = (reportId: string, action: 'approve' | 'remove' | 'warn') => {
    if (!me) return
    const reason = prompt(`${action === 'remove' ? '删除' : action === 'warn' ? '警告' : '驳回'}理由：`) || ''
    api.reports.resolve(reportId, action, reason)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['pending', 'resolved'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-1.5 rounded-full text-sm font-medium',
              tab === t ? 'bg-rose-500 text-white' : 'bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800'
            )}
          >
            {t === 'pending' ? '待处理' : '已处理'}
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <div className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl p-12 text-center">
          <Flag className="w-12 h-12 mx-auto mb-3 text-ink-300" />
          <h3 className="font-semibold mb-1">{tab === 'pending' ? '没有待处理举报' : '没有已处理记录'}</h3>
          <p className="text-sm text-ink-500">{tab === 'pending' ? '社区运行良好！' : '处理的举报会显示在这里'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const reporter = api.users.get(r.reporterId)
            const isExpanded = expanded === r.id
            const target = r.targetType === 'post' ? api.posts.byId(r.targetId) : null
            const targetAuthor = target ? api.users.get(target.authorId) : null

            return (
              <div key={r.id} className="bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpanded(isExpanded ? null : r.id)}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-ink-50 dark:hover:bg-ink-800/30"
                >
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 flex-shrink-0">
                    <Flag className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{reporter?.displayName}</span>
                      <span className="text-ink-500">举报了</span>
                      <span className="font-medium">{r.targetType === 'post' ? '帖子' : r.targetType}</span>
                      <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', reasonColor(r.reason))}>
                        {REASON_LABEL[r.reason] || r.reason}
                      </span>
                    </div>
                    <div className="text-xs text-ink-500 mt-0.5">
                      {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: zhCN })}
                      {r.status === 'resolved' && r.resolution && ` · 已处理（${r.resolution}）`}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-ink-100 dark:border-ink-800">
                    <div className="pt-3 text-sm">
                      <div className="text-ink-500 mb-1">举报描述：</div>
                      <div className="px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800/50">{r.description || '（无）'}</div>
                    </div>

                    {target && targetAuthor && (
                      <div className="p-3 rounded-xl border border-ink-200 dark:border-ink-800">
                        <div className="flex items-center gap-2 mb-2 text-xs text-ink-500">
                          <UserAvatar user={targetAuthor} size="xs" />
                          <span>{targetAuthor.displayName} · {formatDistanceToNow(new Date(target.createdAt), { addSuffix: true, locale: zhCN })}</span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap line-clamp-4">{target.content}</p>
                        {target.images.length > 0 && (
                          <div className="mt-2 grid grid-cols-2 gap-1">
                            {target.images.slice(0, 2).map((img, i) => <img key={i} src={img} className="rounded-lg" />)}
                          </div>
                        )}
                      </div>
                    )}

                    {r.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => resolve(r.id, 'remove')}
                          className="flex-1 px-3 py-2 rounded-lg bg-debate-500 text-white text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-debate-600"
                        >
                          <Trash2 className="w-4 h-4" /> 删除内容
                        </button>
                        <button
                          onClick={() => resolve(r.id, 'warn')}
                          className="flex-1 px-3 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-amber-600"
                        >
                          <AlertOctagon className="w-4 h-4" /> 警告作者
                        </button>
                        <button
                          onClick={() => resolve(r.id, 'approve')}
                          className="flex-1 px-3 py-2 rounded-lg border border-ink-200 dark:border-ink-800 hover:bg-ink-50 dark:hover:bg-ink-800 text-sm font-medium flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" /> 驳回
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function reasonColor(r: string) {
  if (['violence', 'hate_speech', 'nudity'].includes(r)) return 'bg-debate-100 text-debate-700'
  if (['spam', 'misinformation'].includes(r)) return 'bg-amber-100 text-amber-700'
  return 'bg-ink-100 text-ink-700'
}
