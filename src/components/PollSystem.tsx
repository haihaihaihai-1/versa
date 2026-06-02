import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Vote, BarChart3, Check, Plus, Clock, X, Users } from 'lucide-react'
import { useAuth } from '../api/AuthContext'
import { cn, formatNumber, formatTimeAgo, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

const STORAGE_KEY = 'versa:polls'

export interface Poll {
  id: string
  question: string
  options: { id: string; text: string; votes: number }[]
  multiple: boolean
  authorId: string
  authorName: string
  createdAt: number
  expiresAt?: number
  category: 'product' | 'social' | 'tech' | 'fun' | 'food'
  voters: string[]
}

function load(): Poll[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored)
  } catch {}
  return seed()
}

function save(p: Poll[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {}
}

function seed(): Poll[] {
  const now = Date.now()
  return [
    {
      id: 'p1', question: 'iPhone 16 vs iPhone 15, 你选哪个?', multiple: false, authorId: 'u1', authorName: '数码小王子',
      createdAt: now - 3600000 * 2, category: 'tech',
      expiresAt: now + 86400000 * 3,
      options: [
        { id: 'o1', text: 'iPhone 16 Pro', votes: 234 },
        { id: 'o2', text: 'iPhone 16', votes: 156 },
        { id: 'o3', text: 'iPhone 15', votes: 89 },
        { id: 'o4', text: '继续观望', votes: 312 },
      ],
      voters: [],
    },
    {
      id: 'p2', question: '618 你最想买什么品类?', multiple: true, authorId: 'u2', authorName: '购物达人王',
      createdAt: now - 3600000 * 5, category: 'product',
      expiresAt: now + 86400000 * 7,
      options: [
        { id: 'o1', text: '数码产品', votes: 567 },
        { id: 'o2', text: '美妆护肤', votes: 432 },
        { id: 'o3', text: '服饰鞋包', votes: 398 },
        { id: 'o4', text: '家居生活', votes: 256 },
        { id: 'o5', text: '美食零食', votes: 189 },
      ],
      voters: [],
    },
    {
      id: 'p3', question: '你认为 AI 会在 5 年内取代哪些工作?', multiple: true, authorId: 'u3', authorName: '未来观察家',
      createdAt: now - 86400000, category: 'social',
      options: [
        { id: 'o1', text: '客服', votes: 1456 },
        { id: 'o2', text: '翻译', votes: 1234 },
        { id: 'o3', text: '文案', votes: 987 },
        { id: 'o4', text: '程序员', votes: 654 },
        { id: 'o5', text: '设计师', votes: 432 },
        { id: 'o6', text: '不会取代', votes: 234 },
      ],
      voters: [],
    },
  ]
}

export function PollSystem() {
  const { user } = useAuth()
  const [polls, setPolls] = useState<Poll[]>([])
  const [filter, setFilter] = useState<'all' | Poll['category']>('all')
  const [voted, setVoted] = useState<Record<string, string[]>>({})
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ question: '', options: ['', ''], multiple: false, category: 'fun' as Poll['category'], days: 7 })

  useEffect(() => {
    setPolls(load())
  }, [])

  useEffect(() => {
    if (polls.length > 0) save(polls)
  }, [polls])

  const vote = (pollId: string, optionId: string) => {
    if (!user) { toast('请先登录', 'error'); return }
    setVoted((v) => {
      const existing = v[pollId] || []
      const poll = polls.find((p) => p.id === pollId)
      if (!poll) return v
      if (existing.includes(optionId)) {
        if (!poll.multiple) return v
        return { ...v, [pollId]: existing.filter((i) => i !== optionId) }
      }
      if (poll.multiple) return { ...v, [pollId]: [...existing, optionId] }
      return { ...v, [pollId]: [optionId] }
    })
    setPolls((arr) => arr.map((p) => {
      if (p.id !== pollId) return p
      const isUnvote = (voted[pollId] || []).includes(optionId)
      return {
        ...p,
        options: p.options.map((o) => o.id === optionId ? { ...o, votes: o.votes + (isUnvote ? -1 : 1) } : o),
        voters: isUnvote ? p.voters.filter((u) => u !== user.id) : [...p.voters, user.id],
      }
    }))
  }

  const create = () => {
    if (!user) { toast('请先登录', 'error'); return }
    if (!form.question.trim()) { toast('请输入问题', 'error'); return }
    const opts = form.options.filter((o) => o.trim())
    if (opts.length < 2) { toast('至少需要 2 个选项', 'error'); return }
    const poll: Poll = {
      id: uid('p'),
      question: form.question,
      options: opts.map((text, idx) => ({ id: 'o' + (idx + 1), text, votes: 0 })),
      multiple: form.multiple,
      authorId: user.id,
      authorName: user.displayName,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000 * form.days,
      category: form.category,
      voters: [],
    }
    setPolls((arr) => [poll, ...arr])
    setForm({ question: '', options: ['', ''], multiple: false, category: 'fun', days: 7 })
    setCreateOpen(false)
    toast('已发布投票', 'success')
  }

  const filtered = polls.filter((p) => filter === 'all' || p.category === filter)
  const totalVotes = polls.reduce((s, p) => s + p.voters.length, 0)

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-nova-500 to-purple-500 rounded-2xl p-4 text-white flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-1.5">
            <Vote className="w-5 h-5" />投票广场
          </h2>
          <p className="text-xs opacity-80">{polls.length} 个投票 · {formatNumber(totalVotes)} 人参与</p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="px-3 h-8 rounded-lg bg-white/20 backdrop-blur text-white text-xs font-semibold flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />发起投票
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {[
          { key: 'all', label: '全部' },
          { key: 'product', label: '商品' },
          { key: 'tech', label: '科技' },
          { key: 'social', label: '社会' },
          { key: 'fun', label: '趣味' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={cn(
              'px-3 h-7 rounded-full text-xs font-medium flex-shrink-0',
              filter === f.key ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800 text-ink-600'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((p) => {
          const userVotes = voted[p.id] || []
          const total = p.options.reduce((s, o) => s + o.votes, 0)
          const hasVoted = userVotes.length > 0
          const isExpired = !!(p.expiresAt && p.expiresAt < Date.now())
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 dark:bg-ink-900/40 rounded-2xl border border-ink-200/60 dark:border-ink-800/60 p-4 space-y-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm">{p.question}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-ink-500 mt-1">
                    <span>{p.authorName}</span>
                    <span>·</span>
                    <span>{formatTimeAgo(new Date(p.createdAt).toISOString())}</span>
                    {p.expiresAt && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {isExpired ? '已截止' : `${Math.ceil((p.expiresAt - Date.now()) / 86400000)} 天截止`}
                        </span>
                      </>
                    )}
                    {p.multiple && <span className="text-nova-500">(多选)</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                {p.options.map((o) => {
                  const isVoted = userVotes.includes(o.id)
                  const pct = total > 0 ? (o.votes / total) * 100 : 0
                  return (
                    <button
                      key={o.id}
                      onClick={() => !isExpired && vote(p.id, o.id)}
                      disabled={isExpired}
                      className={cn(
                        'relative w-full h-9 rounded-lg overflow-hidden border-2 transition',
                        isVoted ? 'border-nova-500' : 'border-ink-200 dark:border-ink-700',
                        isExpired ? 'cursor-not-allowed opacity-60' : ''
                      )}
                    >
                      {hasVoted && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          className={cn('absolute inset-y-0 left-0', isVoted ? 'bg-nova-500/20' : 'bg-ink-200/40 dark:bg-ink-700/40')}
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-between px-3 text-xs">
                        <span className={cn('flex items-center gap-1.5', isVoted && 'font-semibold')}>
                          {isVoted && <Check className="w-3 h-3 text-nova-500" />}
                          {o.text}
                        </span>
                        {hasVoted && (
                          <span className="text-ink-500">
                            {o.votes} 票 · {pct.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] text-ink-500">
                <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{formatNumber(p.voters.length)} 人参与</span>
                <span className="flex items-center gap-0.5"><BarChart3 className="w-2.5 h-2.5" />共 {formatNumber(total)} 票</span>
              </div>
            </motion.div>
          )
        })}
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-center justify-center p-4" onClick={() => setCreateOpen(false)}>
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-ink-900 rounded-2xl p-5 space-y-3 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-1.5"><Vote className="w-4 h-4" />发起投票</h3>
              <button onClick={() => setCreateOpen(false)} className="p-1 hover:bg-ink-100 dark:hover:bg-ink-800 rounded"><X className="w-4 h-4" /></button>
            </div>
            <textarea
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              rows={2}
              placeholder="投票问题..."
              className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500 resize-none"
            />
            <div className="space-y-2">
              <p className="text-xs text-ink-500">选项 (至少 2 个, 最多 8 个)</p>
              {form.options.map((opt, idx) => (
                <input
                  key={idx}
                  value={opt}
                  onChange={(e) => setForm((f) => ({ ...f, options: f.options.map((o, i) => i === idx ? e.target.value : o) }))}
                  placeholder={`选项 ${idx + 1}`}
                  className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-nova-500"
                />
              ))}
              {form.options.length < 8 && (
                <button
                  onClick={() => setForm((f) => ({ ...f, options: [...f.options, ''] }))}
                  className="w-full h-9 rounded-lg border-2 border-dashed border-ink-300 text-xs text-ink-500"
                >
                  + 添加选项
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.multiple}
                  onChange={(e) => setForm((f) => ({ ...f, multiple: e.target.checked }))}
                  className="accent-nova-500"
                />
                允许多选
              </label>
              <div>
                <select
                  value={form.days}
                  onChange={(e) => setForm((f) => ({ ...f, days: Number(e.target.value) }))}
                  className="w-full h-9 px-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none"
                >
                  <option value={1}>1 天</option>
                  <option value={3}>3 天</option>
                  <option value={7}>7 天</option>
                  <option value={30}>30 天</option>
                </select>
              </div>
            </div>
            <button
              onClick={create}
              className="w-full h-10 rounded-xl bg-gradient-to-r from-nova-500 to-purple-500 text-white font-semibold"
            >
              发布
            </button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
