import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, Heart, MessageCircle, Share2, Users, TrendingUp, Sparkles, Loader2, Eye, UserPlus, BarChart3, Calendar } from 'lucide-react'
import { cn, formatNumber, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface SocialMetric {
  id: string
  date: string
  type: 'like' | 'comment' | 'follow' | 'share' | 'view' | 'unfollow'
  count: number
  source: string
}

const STORAGE_KEY = 'versa:social-metrics'

function todayStr() { return new Date().toISOString().split('T')[0] }

function load(): SocialMetric[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  const out: SocialMetric[] = []
  const types: SocialMetric['type'][] = ['like', 'comment', 'follow', 'share', 'view', 'unfollow']
  const sources = ['首页', '推荐', '搜索', '话题', '群组', '通知']
  for (let i = 30; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    types.forEach((t) => {
      const c = Math.floor(Math.random() * (t === 'view' ? 800 : t === 'like' ? 80 : 30)) + 5
      out.push({ id: uid(), date: d.toISOString().split('T')[0], type: t, count: c, source: sources[Math.floor(Math.random() * sources.length)] })
    })
  }
  return out
}
function save(d: SocialMetric[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const TYPE_META = {
  like: { label: '点赞', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-500' },
  comment: { label: '评论', icon: MessageCircle, color: 'text-blue-500', bg: 'bg-blue-500' },
  follow: { label: '关注', icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-500' },
  share: { label: '分享', icon: Share2, color: 'text-violet-500', bg: 'bg-violet-500' },
  view: { label: '曝光', icon: Eye, color: 'text-amber-500', bg: 'bg-amber-500' },
  unfollow: { label: '取关', icon: Users, color: 'text-ink-500', bg: 'bg-ink-500' },
} as const

export function SocialStats() {
  const [metrics, setMetrics] = useState<SocialMetric[]>(load())
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d')
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(metrics) }, [metrics])

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 365
  const filtered = metrics.filter((m) => Date.now() - new Date(m.date).getTime() < days * 86400000)
  const today = todayStr()
  const todayM = filtered.filter((m) => m.date === today)

  const totals = (() => {
    const out: Record<string, number> = {}
    filtered.forEach((m) => out[m.type] = (out[m.type] || 0) + m.count)
    return out
  })()

  const dailyData = (() => {
    const out: Record<string, number> = {}
    filtered.forEach((m) => { out[m.date] = (out[m.date] || 0) + m.count })
    return Object.entries(out).sort().map(([d, c]) => ({ date: d, count: c }))
  })()

  const sourceStats = (() => {
    const map: Record<string, number> = {}
    filtered.forEach((m) => map[m.source] = (map[m.source] || 0) + m.count)
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  })()

  const engagement = (() => {
    const likes = totals.like || 0
    const comments = totals.comment || 0
    const shares = totals.share || 0
    const views = totals.view || 0
    return views > 0 ? (((likes + comments * 2 + shares * 3) / views) * 100).toFixed(1) : '0.0'
  })()

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`分析用户社交数据: 互动率 ${engagement}%, 关注 +${totals.follow || 0}/-${totals.unfollow || 0}, 主要来源 ${sourceStats[0]?.[0] || 'N/A'}. 给 1 段 60-80 字增长建议`, '你是 Versa 社交分析师, 简洁专业, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const maxDaily = Math.max(1, ...dailyData.map((d) => d.count))

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5" />
          <h2 className="text-lg font-bold">社交统计</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">互动 · 增长 · 来源</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{formatNumber(totals.view || 0)}</p>
            <p className="text-[10px] opacity-80">曝光</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{engagement}%</p>
            <p className="text-[10px] opacity-80">互动率</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">+{(totals.follow || 0) - (totals.unfollow || 0)}</p>
            <p className="text-[10px] opacity-80">净增粉</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        {(['7d', '30d', 'all'] as const).map((r) => (
          <button key={r} onClick={() => setRange(r)} className={cn('flex-1 h-8 rounded-lg text-xs font-semibold', range === r ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {r === '7d' ? '7 天' : r === '30d' ? '30 天' : '全部'}
          </button>
        ))}
        <button onClick={runAI} disabled={loading} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI
        </button>
      </div>

      {aiRec && (
        <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed">{aiRec}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        {(['like', 'comment', 'follow', 'share', 'view', 'unfollow'] as const).map((t) => {
          const Meta = TYPE_META[t]
          const Icon = Meta.icon
          return (
            <div key={t} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 text-center">
              <div className={cn('w-8 h-8 mx-auto rounded-lg flex items-center justify-center text-white', Meta.bg)}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <p className="text-base font-bold mt-1">{formatNumber(totals[t] || 0)}</p>
              <p className="text-[9px] text-ink-500">{Meta.label}</p>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-bold mb-1.5">每日趋势</p>
        <div className="flex items-end gap-0.5 h-20">
          {dailyData.slice(-20).map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="flex-1 w-full flex items-end">
                <motion.div initial={{ height: 0 }} animate={{ height: `${(d.count / maxDaily) * 100}%` }} className="w-full bg-gradient-to-t from-violet-500 to-fuchsia-500 rounded-t min-h-[2px]" />
              </div>
              {(i % 4 === 0) && <p className="text-[8px] text-ink-500">{parseInt(d.date.split('-')[2])}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-bold mb-1.5">流量来源</p>
        <div className="space-y-1">
          {sourceStats.map(([src, cnt], i) => {
            const max = sourceStats[0][1]
            return (
              <div key={src} className="flex items-center gap-1.5">
                <span className="text-[10px] text-ink-500 w-12">#{i + 1} {src}</span>
                <div className="flex-1 h-3 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(cnt / max) * 100}%` }} className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                </div>
                <span className="text-[10px] text-ink-500 w-12 text-right">{formatNumber(cnt)}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
