import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Scissors, ThumbsUp, ThumbsDown, Play, Clock, Trophy, Sparkles, Loader2, Download, Check } from 'lucide-react'
import { cn, formatNumber, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Clip {
  id: string
  liveId: string
  hostName: string
  hostAvatar: string
  startTime: number
  endTime: number
  title: string
  description: string
  thumbnail: string
  votes: { up: number; down: number }
  voted: 'up' | 'down' | null
  comments: { id: string; user: string; text: string; at: number }[]
  published: boolean
}

const SEED: Clip[] = [
  { id: 'c1', liveId: 'l1', hostName: '数码小王子', hostAvatar: 'https://i.pravatar.cc/100?img=51', startTime: 300, endTime: 380, title: 'iPhone 16 实拍开箱', description: '主播当场开箱全新配色', thumbnail: 'https://picsum.photos/seed/c1/300/200', votes: { up: 1240, down: 32 }, voted: null, comments: [], published: false },
  { id: 'c2', liveId: 'l1', hostName: '数码小王子', hostAvatar: 'https://i.pravatar.cc/100?img=51', startTime: 1200, endTime: 1280, title: '618 优惠计算', description: '详细对比各档满减', thumbnail: 'https://picsum.photos/seed/c2/300/200', votes: { up: 980, down: 12 }, voted: null, comments: [], published: true },
  { id: 'c3', liveId: 'l1', hostName: '数码小王子', hostAvatar: 'https://i.pravatar.cc/100?img=51', startTime: 2100, endTime: 2180, title: '主播翻车现场', description: '价格口误被观众抓包', thumbnail: 'https://picsum.photos/seed/c3/300/200', votes: { up: 2350, down: 18 }, voted: null, comments: [], published: true },
  { id: 'c4', liveId: 'l1', hostName: '数码小王子', hostAvatar: 'https://i.pravatar.cc/100?img=51', startTime: 3000, endTime: 3080, title: '抽奖环节', description: '5000 元红包雨', thumbnail: 'https://picsum.photos/seed/c4/300/200', votes: { up: 1567, down: 8 }, voted: null, comments: [], published: false },
]

const STORAGE_KEY = 'versa:clip-vote'

function load(): Clip[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return SEED }
function save(d: Clip[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function formatTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ClipVote() {
  const [clips, setClips] = useState<Clip[]>([])
  const [filter, setFilter] = useState<'all' | 'published'>('all')
  const [aiPick, setAiPick] = useState<Clip | null>(null)
  const [loading, setLoading] = useState(false)
  const [commentOpen, setCommentOpen] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  useEffect(() => { setClips(load()) }, [])
  useEffect(() => { if (clips.length) save(clips) }, [clips])

  const vote = (id: string, type: 'up' | 'down') => {
    setClips((cs) => cs.map((c) => {
      if (c.id !== id) return c
      if (c.voted === type) return c
      const votes = { ...c.votes }
      if (c.voted === 'up') votes.up--
      if (c.voted === 'down') votes.down--
      votes[type]++
      return { ...c, votes, voted: type }
    }))
  }

  const publish = (id: string) => {
    setClips((cs) => cs.map((c) => c.id === id ? { ...c, published: !c.published } : c))
    toast('状态已切换', 'success')
  }

  const addComment = (id: string) => {
    if (!commentText.trim()) return
    setClips((cs) => cs.map((c) => c.id === id ? { ...c, comments: [...c.comments, { id: uid(), user: '我', text: commentText, at: Date.now() }] } : c))
    setCommentText('')
  }

  const aiPickBest = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const list = clips.map((c) => `${c.title} (${c.votes.up}赞, ${formatTime(c.startTime)}-${formatTime(c.endTime)})`).join('; ')
      const result = await aiComplete(
        `从以下直播切片选 1 个最值得推荐的, 给出理由 (50 字内): ${list}`,
        '你是 Versa 短视频编辑, 简洁专业, 中文'
      )
      setAiPick(clips[0])
      toast(result, 'success')
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const sorted = [...clips].sort((a, b) => b.votes.up - a.votes.up)
  const filtered = filter === 'all' ? sorted : sorted.filter((c) => c.published)
  const topClip = sorted[0]
  const totalUp = clips.reduce((s, c) => s + c.votes.up, 0)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Scissors className="w-5 h-5" />
          <h2 className="text-lg font-bold">切片投票</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">观众投票决定哪些切片发布</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{clips.length}</p>
            <p className="text-[10px] opacity-80">切片</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{formatNumber(totalUp)}</p>
            <p className="text-[10px] opacity-80">总赞数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{clips.filter((c) => c.published).length}</p>
            <p className="text-[10px] opacity-80">已发布</p>
          </div>
        </div>
      </div>

      {topClip && (
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-2xl p-3 border-2 border-yellow-300"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-4 h-4 text-yellow-600" />
            <span className="text-xs font-bold text-yellow-700 dark:text-yellow-300">冠军切片</span>
          </div>
          <div className="flex gap-2">
            <img src={topClip.thumbnail} alt={topClip.title} className="w-20 h-12 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{topClip.title}</p>
              <p className="text-[10px] text-ink-500">{formatNumber(topClip.votes.up)} 赞 · {formatTime(topClip.startTime)}</p>
            </div>
          </div>
        </motion.div>
      )}

      <button onClick={aiPickBest} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
        AI 推荐最佳切片
      </button>

      {aiPick && (
        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-2xl p-3 border border-cyan-200/40">
          <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-cyan-500"><Sparkles className="w-3.5 h-3.5" />AI 推荐</p>
          <div className="flex gap-2">
            <img src={aiPick.thumbnail} alt={aiPick.title} className="w-16 h-10 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{aiPick.title}</p>
              <p className="text-[10px] text-ink-500">{formatTime(aiPick.startTime)} - {formatTime(aiPick.endTime)}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        <button
          onClick={() => setFilter('all')}
          className={cn('flex-1 h-7 rounded-full text-xs font-semibold', filter === 'all' ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
        >
          全部
        </button>
        <button
          onClick={() => setFilter('published')}
          className={cn('flex-1 h-7 rounded-full text-xs font-semibold', filter === 'published' ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
        >
          已发布
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map((c) => {
          const rank = sorted.findIndex((x) => x.id === c.id) + 1
          const score = Math.round((c.votes.up / (c.votes.up + c.votes.down)) * 100) || 0
          return (
            <motion.div
              key={c.id}
              whileHover={{ y: -2 }}
              className="bg-white/60 dark:bg-ink-900/30 rounded-2xl p-2.5 border border-ink-200/60 dark:border-ink-800/60"
            >
              <div className="flex gap-2">
                <div className="relative w-24 h-16 rounded-lg overflow-hidden flex-shrink-0">
                  <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                    <p className="text-[8px] text-white font-mono">{formatTime(c.startTime)} - {formatTime(c.endTime)}</p>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    {rank <= 3 && <span className="text-[10px] font-bold text-amber-500">#{rank}</span>}
                    <p className="text-sm font-bold truncate">{c.title}</p>
                  </div>
                  <p className="text-[10px] text-ink-500 line-clamp-1">{c.description}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px] text-ink-500">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formatTime(c.endTime - c.startTime)}</span>
                    {c.published && <span className="px-1 py-0.5 rounded bg-emerald-500 text-white font-bold text-[8px]">已发布</span>}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-1">
                <button
                  onClick={() => vote(c.id, 'up')}
                  className={cn('flex-1 h-7 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold', c.voted === 'up' ? 'bg-emerald-500 text-white' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600')}
                >
                  <ThumbsUp className="w-3 h-3" />{formatNumber(c.votes.up)}
                </button>
                <button
                  onClick={() => vote(c.id, 'down')}
                  className={cn('flex-1 h-7 rounded-lg flex items-center justify-center gap-1 text-xs font-semibold', c.voted === 'down' ? 'bg-rose-500 text-white' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600')}
                >
                  <ThumbsDown className="w-3 h-3" />{formatNumber(c.votes.down)}
                </button>
                <button onClick={() => setCommentOpen(c.id === commentOpen ? null : c.id)} className="h-7 w-7 rounded-lg bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
                  <span className="text-[10px] font-bold">{c.comments.length}</span>
                </button>
                <button onClick={() => publish(c.id)} className={cn('h-7 w-7 rounded-lg flex items-center justify-center', c.published ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  {c.published ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="mt-1 h-1 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500" style={{ width: `${score}%` }} />
              </div>
              <p className="text-[9px] text-ink-500 text-right mt-0.5">好评率 {score}%</p>

              {commentOpen === c.id && (
                <div className="mt-2 space-y-1.5 border-t border-ink-200/60 dark:border-ink-800/60 pt-2">
                  {c.comments.map((cm) => (
                    <p key={cm.id} className="text-[10px] text-ink-600 dark:text-ink-400">
                      <span className="font-bold">{cm.user}:</span> {cm.text}
                    </p>
                  ))}
                  <div className="flex gap-1">
                    <input
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addComment(c.id)}
                      placeholder="评论..."
                      className="flex-1 px-2 h-7 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none"
                    />
                    <button onClick={() => addComment(c.id)} className="px-2 h-7 rounded-lg bg-cyan-500 text-white text-xs">发送</button>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
