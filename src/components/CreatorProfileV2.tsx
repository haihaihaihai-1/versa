import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Crown, Heart, MessageCircle, Share2, Bookmark, TrendingUp, Eye, Sparkles, Loader2, Users, Star, Trophy, BadgeCheck, ChevronRight } from 'lucide-react'
import { cn, formatNumber, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'
import { Link } from 'react-router-dom'

interface Creator {
  id: string
  name: string
  handle: string
  avatar: string
  banner: string
  tagline: string
  bio: string
  followers: number
  following: number
  posts: number
  likes: number
  verified: boolean
  level: number
  badges: string[]
  topGenres: { name: string; pct: number }[]
  monthlyGrowth: number
  earnings: number
}

interface PortfolioItem {
  id: string
  type: 'video' | 'live' | 'post' | 'short'
  title: string
  thumbnail: string
  views: number
  likes: number
  comments: number
  at: number
}

const CREATOR: Creator = {
  id: 'c1',
  name: '数码小王子',
  handle: '@digitalprince',
  avatar: 'https://i.pravatar.cc/300?img=51',
  banner: 'https://picsum.photos/seed/banner1/1200/400',
  tagline: '专业数码评测 · 5G 先锋',
  bio: '前硬件工程师, 8 年数码评测经验。专注手机、笔电、智能穿戴的开箱和深度评测。每周三、周五 20:00 直播。',
  followers: 152000, following: 286, posts: 428, likes: 1840000,
  verified: true, level: 7,
  badges: ['官方推荐', '直播达人', '618 大V', '金牌带货'],
  topGenres: [
    { name: '手机评测', pct: 42 },
    { name: '笔电', pct: 28 },
    { name: '智能穿戴', pct: 18 },
    { name: '配件周边', pct: 12 },
  ],
  monthlyGrowth: 8.2,
  earnings: 384200,
}

const PORTFOLIO: PortfolioItem[] = [
  { id: 'p1', type: 'video', title: 'iPhone 16 Pro 深度评测: 真的值得换吗?', thumbnail: 'https://picsum.photos/seed/p1/400/300', views: 245000, likes: 18900, comments: 3421, at: Date.now() - 86400000 * 2 },
  { id: 'p2', type: 'live', title: '618 数码大促直播', thumbnail: 'https://picsum.photos/seed/p2/400/300', views: 128000, likes: 9800, comments: 12000, at: Date.now() - 86400000 * 5 },
  { id: 'p3', type: 'short', title: '30 秒看懂 M4 芯片', thumbnail: 'https://picsum.photos/seed/p3/400/300', views: 580000, likes: 42100, comments: 1820, at: Date.now() - 86400000 * 7 },
  { id: 'p4', type: 'post', title: '我的数码桌面 2.0 升级方案', thumbnail: 'https://picsum.photos/seed/p4/400/300', views: 84000, likes: 6200, comments: 920, at: Date.now() - 86400000 * 10 },
  { id: 'p5', type: 'video', title: 'MacBook Air M3 半年体验: 优缺点', thumbnail: 'https://picsum.photos/seed/p5/400/300', views: 156000, likes: 11200, comments: 2180, at: Date.now() - 86400000 * 14 },
  { id: 'p6', type: 'live', title: '智能穿戴新品首发', thumbnail: 'https://picsum.photos/seed/p6/400/300', views: 67000, likes: 4800, comments: 5400, at: Date.now() - 86400000 * 21 },
]

const TYPE_META = {
  video: { label: '视频', icon: '🎬', color: 'bg-rose-500' },
  live: { label: '直播', icon: '📹', color: 'bg-amber-500' },
  short: { label: '短视频', icon: '⚡', color: 'bg-violet-500' },
  post: { label: '图文', icon: '📝', color: 'bg-blue-500' },
} as const

const STORAGE_KEY = 'versa:creator-follow'

function load(): Set<string> { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return new Set(JSON.parse(s)) } catch {} return new Set() }
function save(d: Set<string>) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...d])) } catch {} }

export function CreatorProfileV2() {
  const [following, setFollowing] = useState<Set<string>>(load())
  const [tab, setTab] = useState<'portfolio' | 'analytics' | 'achievements' | 'collab'>('portfolio')
  const [aiBio, setAiBio] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(following) }, [following])

  const isFollowing = following.has(CREATOR.id)
  const toggleFollow = () => {
    const next = new Set(following)
    if (isFollowing) next.delete(CREATOR.id); else next.add(CREATOR.id)
    setFollowing(next)
    toast(isFollowing ? '已取消关注' : '已关注', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(
        `基于创作者「${CREATOR.name}」(粉丝 ${formatNumber(CREATOR.followers)}, 主领域: ${CREATOR.topGenres[0].name}) 生成 50 字创作者风格简评`,
        '你是 Versa 内容分析师, 简洁专业, 中文'
      )
      setAiBio(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-2xl overflow-hidden">
        <img src={CREATOR.banner} alt="banner" className="w-full h-32 object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] backdrop-blur">
          LV{CREATOR.level} 创作者
        </div>
      </div>

      <div className="px-3 -mt-8 relative">
        <div className="flex items-end justify-between">
          <div className="w-20 h-20 rounded-2xl border-4 border-white dark:border-ink-900 overflow-hidden shadow-lg bg-gradient-to-br from-nova-500 to-pink-500">
            <img src={CREATOR.avatar} alt={CREATOR.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-1.5 pb-1">
            <button className="w-9 h-9 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </button>
            <button className="w-9 h-9 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFollow}
              className={cn('px-4 h-9 rounded-full text-sm font-bold', isFollowing ? 'bg-ink-100 dark:bg-ink-800' : 'bg-gradient-to-r from-violet-500 to-purple-500 text-white')}
            >
              {isFollowing ? '已关注' : '+ 关注'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <h1 className="text-xl font-bold">{CREATOR.name}</h1>
          {CREATOR.verified && <BadgeCheck className="w-4 h-4 text-blue-500" />}
        </div>
        <p className="text-xs text-ink-500">{CREATOR.handle}</p>
        <p className="text-sm font-semibold text-nova-500">{CREATOR.tagline}</p>
        <p className="text-xs text-ink-600 dark:text-ink-400 leading-relaxed">{CREATOR.bio}</p>
      </div>

      <div className="grid grid-cols-4 gap-2 px-3">
        {[
          { l: '粉丝', v: formatNumber(CREATOR.followers), c: 'text-violet-500' },
          { l: '关注', v: formatNumber(CREATOR.following), c: 'text-blue-500' },
          { l: '作品', v: formatNumber(CREATOR.posts), c: 'text-emerald-500' },
          { l: '总赞', v: formatNumber(CREATOR.likes), c: 'text-rose-500' },
        ].map((s) => (
          <div key={s.l} className="text-center bg-white/60 dark:bg-ink-900/30 rounded-xl py-2 border border-ink-200/60 dark:border-ink-800/60">
            <p className={cn('text-base font-bold', s.c)}>{s.v}</p>
            <p className="text-[10px] text-ink-500">{s.l}</p>
          </div>
        ))}
      </div>

      <div className="px-3 flex flex-wrap gap-1">
        {CREATOR.badges.map((b) => (
          <span key={b} className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-semibold flex items-center gap-0.5">
            <Trophy className="w-2.5 h-2.5" />{b}
          </span>
        ))}
      </div>

      <div className="px-3 flex gap-1.5 overflow-x-auto pb-1">
        {[
          { k: 'portfolio' as const, l: '作品集' },
          { k: 'analytics' as const, l: '数据分析' },
          { k: 'achievements' as const, l: '成就' },
          { k: 'collab' as const, l: '合作' },
        ].map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={cn('px-3 h-8 rounded-full text-xs font-semibold flex-shrink-0', tab === t.k ? 'bg-nova-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'portfolio' && (
        <div className="px-3 grid grid-cols-2 gap-1.5">
          {PORTFOLIO.map((p) => {
            const Meta = TYPE_META[p.type]
            return (
              <motion.div key={p.id} whileHover={{ y: -2 }} className="rounded-2xl overflow-hidden bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
                <div className="relative aspect-video">
                  <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <span className={cn('absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] text-white font-bold flex items-center gap-0.5', Meta.color)}>
                    {Meta.icon}{Meta.label}
                  </span>
                  <div className="absolute bottom-1 left-1.5 right-1.5">
                    <p className="text-[10px] text-white font-semibold line-clamp-1">{p.title}</p>
                  </div>
                </div>
                <div className="p-2 flex items-center gap-1.5 text-[10px] text-ink-500">
                  <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{formatNumber(p.views)}</span>
                  <span className="flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{formatNumber(p.likes)}</span>
                  <span className="flex items-center gap-0.5"><MessageCircle className="w-2.5 h-2.5" />{formatNumber(p.comments)}</span>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {tab === 'analytics' && (
        <div className="px-3 space-y-2">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-3 text-white">
            <p className="text-xs opacity-90">本月收益</p>
            <p className="text-2xl font-bold">¥{formatNumber(CREATOR.earnings)}</p>
            <p className="text-[10px] opacity-80 flex items-center gap-0.5 mt-0.5">
              <TrendingUp className="w-2.5 h-2.5" />月增 {CREATOR.monthlyGrowth}%
            </p>
          </div>

          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
            <p className="text-xs font-bold mb-2">内容领域分布</p>
            {CREATOR.topGenres.map((g) => (
              <div key={g.name} className="mb-1.5">
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span>{g.name}</span>
                  <span className="text-ink-500">{g.pct}%</span>
                </div>
                <div className="h-1.5 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${g.pct}%` }} className="h-full bg-gradient-to-r from-violet-500 to-pink-500" />
                </div>
              </div>
            ))}
          </div>

          <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 创作者分析
          </button>

          {aiBio && (
            <div className="bg-gradient-to-br from-violet-50 to-pink-50 dark:from-violet-900/20 dark:to-pink-900/20 rounded-2xl p-3 border border-violet-200/40">
              <p className="text-xs font-bold mb-1 flex items-center gap-1.5 text-violet-500"><Sparkles className="w-3.5 h-3.5" />AI 简评</p>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{aiBio}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'achievements' && (
        <div className="px-3 space-y-1.5">
          {[
            { i: '🏆', l: '百万粉丝', d: '粉丝突破 100w', done: true, at: '2024-12' },
            { i: '⭐', l: '一周年', d: '入驻 Versa 一周年', done: true, at: '2025-03' },
            { i: '🎬', l: '百大UP', d: '视频累计播放 1000w', done: true, at: '2025-06' },
            { i: '💰', l: '带货王者', d: '单场直播 GMV 破 100w', done: true, at: '2025-08' },
            { i: '🎓', l: '新星导师', d: '带出 10 位新晋创作者', done: false, at: '进行中' },
            { i: '🌟', l: '全能创作者', d: '视频/直播/图文全覆盖', done: false, at: '进行中' },
          ].map((a) => (
            <div key={a.l} className={cn('flex items-center gap-2 p-2.5 rounded-xl border', a.done ? 'bg-amber-50/40 dark:bg-amber-900/20 border-amber-200/40' : 'bg-ink-50/30 dark:bg-ink-900/20 border-ink-200/30 opacity-60')}>
              <div className="text-2xl">{a.i}</div>
              <div className="flex-1">
                <p className="text-sm font-bold">{a.l}</p>
                <p className="text-[10px] text-ink-500">{a.d}</p>
              </div>
              <span className="text-[10px] text-ink-500">{a.at}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'collab' && (
        <div className="px-3 space-y-2">
          <Link to="/tools/personal" className="block rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 p-3 text-white">
            <p className="text-sm font-bold flex items-center gap-1.5"><Users className="w-4 h-4" />创作者合作</p>
            <p className="text-[10px] opacity-90">查看合作邀请、发起合作</p>
          </Link>
          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
            <p className="text-xs font-bold mb-2">合作品牌</p>
            <div className="grid grid-cols-3 gap-2">
              {['Apple', 'Sony', 'DJI', 'Logitech', 'Anker', 'Razer'].map((b) => (
                <div key={b} className="aspect-square rounded-xl bg-ink-50 dark:bg-ink-800 flex items-center justify-center text-xs font-bold">{b}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
