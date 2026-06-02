import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Vote, Plus, Trash2, Check, BarChart3, Clock, Users, Sparkles, Loader2, Copy, Share2, X, Eye } from 'lucide-react'
import { cn, formatNumber, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Option { id: string; text: string; votes: number }
interface Poll {
  id: string
  question: string
  options: Option[]
  type: 'single' | 'multiple'
  status: 'draft' | 'open' | 'closed'
  createdAt: number
  endsAt?: number
  voters: number
  votedIds: string[]
  tags: string[]
}

const STORAGE_KEY = 'versa:polls'

function load(): Poll[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'p1', question: 'iPhone 16 Pro 哪个新颜色最值得入手?', options: [
      { id: 'o1', text: '沙漠金', votes: 2480 }, { id: 'o2', text: '原色钛', votes: 1820 }, { id: 'o3', text: '白色钛', votes: 1450 }, { id: 'o4', text: '黑色钛', votes: 920 },
    ], type: 'single', status: 'open', createdAt: Date.now() - 86400000, voters: 6670, votedIds: ['o1'], tags: ['数码'] },
    { id: 'p2', question: '你最喜欢的 Versa 新功能是?', options: [
      { id: 'o5', text: '社交工具集', votes: 1280 }, { id: 'o6', text: '个性化中心', votes: 980 }, { id: 'o7', text: '创作者合作', votes: 1450 },
    ], type: 'multiple', status: 'open', createdAt: Date.now() - 3600000, voters: 3710, votedIds: [], tags: ['Versa', '产品'] },
  ]
}
function save(d: Poll[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function PollMaker() {
  const [polls, setPolls] = useState<Poll[]>(load())
  const [view, setView] = useState<'browse' | 'create' | 'result'>('browse')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [type, setType] = useState<'single' | 'multiple'>('single')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [tags, setTags] = useState('')
  const [endsIn, setEndsIn] = useState(24)
  const [aiSuggest, setAiSuggest] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(polls) }, [polls])

  const active = polls.find((p) => p.id === activeId)

  const create = () => {
    if (!question.trim()) { toast('请填写问题', 'error'); return }
    const opts = options.filter((o) => o.trim()).map((o) => ({ id: uid(), text: o, votes: 0 }))
    if (opts.length < 2) { toast('至少 2 个选项', 'error'); return }
    const p: Poll = { id: uid(), question, options: opts, type, status: 'open', createdAt: Date.now(), endsAt: Date.now() + endsIn * 3600000, voters: 0, votedIds: [], tags: tags.split(',').map((t) => t.trim()).filter(Boolean) }
    setPolls([p, ...polls])
    setQuestion(''); setOptions(['', '']); setTags('')
    setView('browse')
    toast('投票已创建', 'success')
  }

  const vote = (pollId: string, optId: string) => {
    setPolls((ps) => ps.map((p) => {
      if (p.id !== pollId) return p
      if (p.votedIds.includes(optId)) return p
      const newVotedIds = p.type === 'single' ? [optId] : [...p.votedIds, optId]
      return { ...p, options: p.options.map((o) => o.id === optId ? { ...o, votes: o.votes + 1 } : o), voters: p.voters + 1, votedIds: newVotedIds }
    }))
  }

  const close = (pollId: string) => {
    setPolls((ps) => ps.map((p) => p.id === pollId ? { ...p, status: 'closed' } : p))
    toast('已关闭投票', 'info')
  }

  const remove = (id: string) => {
    if (confirm('删除此投票?')) setPolls(polls.filter((p) => p.id !== id))
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为 Versa 推荐 3 个有趣的用户投票主题 (50-80 字, 含 emoji)', '你是 Versa 社区运营, 简洁有创意, 中文')
      setAiSuggest(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Vote className="w-5 h-5" />
          <h2 className="text-lg font-bold">投票</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">单选/多选 · 实时统计 · 主题丰富</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{polls.length}</p>
            <p className="text-[10px] opacity-80">投票</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{polls.filter((p) => p.status === 'open').length}</p>
            <p className="text-[10px] opacity-80">进行中</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{formatNumber(polls.reduce((s, p) => s + p.voters, 0))}</p>
            <p className="text-[10px] opacity-80">参与</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setView('browse')} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', view === 'browse' ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>浏览</button>
        <button onClick={() => setView('create')} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', view === 'create' ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>创建</button>
        {active && view === 'result' && <button className="flex-1 h-8 rounded-lg text-xs font-semibold bg-emerald-500 text-white">结果</button>}
        <button onClick={runAI} disabled={loading} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiSuggest && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-3 border border-emerald-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-emerald-500"><Sparkles className="w-3.5 h-3.5" />AI 推荐主题</p>
          <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiSuggest}</p>
        </div>
      )}

      {view === 'browse' && (
        <div className="space-y-1.5">
          {polls.map((p) => {
            const total = p.options.reduce((s, o) => s + o.votes, 0)
            const isResultView = activeId === p.id
            return (
              <div key={p.id} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
                <div className="flex items-start gap-1.5 mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-bold mb-0.5">{p.question}</p>
                    <div className="flex items-center gap-1.5 text-[10px] text-ink-500">
                      <span className="px-1 py-0.5 rounded bg-emerald-500 text-white font-bold">{p.type === 'single' ? '单选' : '多选'}</span>
                      <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{formatNumber(p.voters)}</span>
                      {p.status === 'open' && p.endsAt && (
                        <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />剩 {Math.max(0, Math.ceil((p.endsAt - Date.now()) / 3600000))}h</span>
                      )}
                      {p.status === 'closed' && <span className="text-rose-500 font-bold">已结束</span>}
                    </div>
                  </div>
                  <button onClick={() => setActiveId(isResultView ? null : p.id)} className="text-emerald-500">
                    {isResultView ? <X className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="space-y-1.5">
                  {p.options.map((o) => {
                    const pct = total > 0 ? (o.votes / total) * 100 : 0
                    const voted = p.votedIds.includes(o.id)
                    const showResult = p.status === 'closed' || voted || isResultView
                    return (
                      <button
                        key={o.id}
                        onClick={() => p.status === 'open' && vote(p.id, o.id)}
                        disabled={p.status === 'closed'}
                        className={cn('relative w-full text-left rounded-lg overflow-hidden border', voted ? 'border-emerald-500' : 'border-ink-200/60 dark:border-ink-700/60', p.status === 'closed' && 'cursor-default')}
                      >
                        {showResult && (
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="absolute inset-y-0 left-0 bg-emerald-100 dark:bg-emerald-900/30" />
                        )}
                        <div className="relative flex items-center gap-1.5 px-2 py-1.5">
                          <span className="flex-1 text-xs font-semibold">{o.text}</span>
                          {showResult && (
                            <>
                              <span className="text-[10px] text-ink-500">{pct.toFixed(0)}%</span>
                              <span className="text-[10px] text-ink-500">{formatNumber(o.votes)}</span>
                            </>
                          )}
                          {voted && <Check className="w-3 h-3 text-emerald-500" />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {p.tags.map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800">#{t}</span>)}
                  <div className="ml-auto flex gap-1">
                    {p.status === 'open' && <button onClick={() => close(p.id)} className="text-[10px] text-rose-500">关闭</button>}
                    <button onClick={() => remove(p.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'create' && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="投票问题" rows={2} className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
          <div className="flex gap-1.5">
            {(['single', 'multiple'] as const).map((t) => (
              <button key={t} onClick={() => setType(t)} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', type === t ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{t === 'single' ? '单选' : '多选'}</button>
            ))}
          </div>
          {options.map((o, i) => (
            <div key={i} className="flex gap-1">
              <input value={o} onChange={(e) => setOptions(options.map((p, j) => j === i ? e.target.value : p))} placeholder={`选项 ${i + 1}`} className="flex-1 px-3 h-8 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none" />
              {options.length > 2 && <button onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>}
            </div>
          ))}
          <button onClick={() => setOptions([...options, ''])} className="w-full h-7 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">+ 添加选项</button>
          <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="标签 (逗号分隔)" className="w-full px-3 h-8 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-ink-500">持续:</span>
            {[6, 12, 24, 72].map((h) => (
              <button key={h} onClick={() => setEndsIn(h)} className={cn('px-2 h-7 rounded-lg text-[10px] font-semibold', endsIn === h ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>{h}h</button>
            ))}
          </div>
          <button onClick={create} className="w-full h-9 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold">发布投票</button>
        </div>
      )}
    </div>
  )
}
