import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, UserPlus, UserMinus, MapPin, Calendar, Heart, MessageCircle, Sparkles, Loader2, Trophy, Star, Filter, TrendingUp, Clock, X } from 'lucide-react'
import { cn, uid, formatNumber, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Suggestion {
  id: string
  user: { id: string; name: string; avatar: string; bio: string; tags: string[]; followers: number }
  reason: string
  score: number
  mutual: number
  category: 'interest' | 'location' | 'mutual' | 'trending' | 'random'
}

const USERS = [
  { id: 'u1', name: '美食家 Lily', avatar: 'https://i.pravatar.cc/200?img=20', bio: '探店 / 家常菜 / 烘焙', tags: ['美食', '烘焙', '生活'], followers: 234500 },
  { id: 'u2', name: '数码小王子', avatar: 'https://i.pravatar.cc/200?img=51', bio: '硬件工程师 / 数码评测', tags: ['数码', '评测', '科技'], followers: 152000 },
  { id: 'u3', name: '穿搭博主 Mia', avatar: 'https://i.pravatar.cc/200?img=33', bio: '日常穿搭 / 街头时尚', tags: ['服饰', '美妆', '时尚'], followers: 89400 },
  { id: 'u4', name: '美妆博主 Ava', avatar: 'https://i.pravatar.cc/200?img=22', bio: '彩妆教程 / 护肤', tags: ['美妆', '教程', '时尚'], followers: 412000 },
  { id: 'u5', name: '学生党 G', avatar: 'https://i.pravatar.cc/200?img=88', bio: '学习打卡 / 校园生活', tags: ['学习', '校园', '生活'], followers: 12300 },
  { id: 'u6', name: '摄影师 Leo', avatar: 'https://i.pravatar.cc/200?img=12', bio: '风光 / 街拍 / 后期', tags: ['摄影', '旅行', '艺术'], followers: 67800 },
  { id: 'u7', name: '健身教练 Yuki', avatar: 'https://i.pravatar.cc/200?img=45', bio: '健身 / 营养 / 减脂', tags: ['健身', '健康', '营养'], followers: 156000 },
  { id: 'u8', name: '程序员小哥', avatar: 'https://i.pravatar.cc/200?img=15', bio: 'React / TypeScript / 开源', tags: ['编程', '技术', '开源'], followers: 18900 },
  { id: 'u9', name: '旅游博主 Anna', avatar: 'https://i.pravatar.cc/200?img=49', bio: '小众目的地 / 自由行', tags: ['旅行', '摄影', '生活'], followers: 92100 },
  { id: 'u10', name: '插画师 小鱼', avatar: 'https://i.pravatar.cc/200?img=24', bio: '插画 / 手账 / 周边', tags: ['艺术', '插画', '手账'], followers: 34500 },
]

const STORAGE_KEY = 'versa:friend-graph'

function load(): string[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: string[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const CAT_META = {
  interest: { label: '兴趣', color: 'bg-violet-500', emoji: '✨' },
  location: { label: '同地', color: 'bg-blue-500', emoji: '📍' },
  mutual: { label: '共同好友', color: 'bg-emerald-500', emoji: '👥' },
  trending: { label: '热门', color: 'bg-amber-500', emoji: '🔥' },
  random: { label: '随机', color: 'bg-rose-500', emoji: '🎲' },
} as const

export function FriendGraph() {
  const [following, setFollowing] = useState<string[]>(load())
  const [filter, setFilter] = useState<'all' | 'recommended' | 'mutual' | 'trending'>('all')
  const [search, setSearch] = useState('')
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => { save(following) }, [following])

  const toggleFollow = (id: string) => {
    setFollowing((fs) => fs.includes(id) ? fs.filter((x) => x !== id) : [...fs, id])
    toast(following.includes(id) ? '已取消关注' : '已关注', 'success')
  }

  const genSuggestions = (): Suggestion[] => USERS.map((u, i) => {
    const mutual = Math.floor(Math.random() * 12)
    return {
      id: u.id,
      user: u,
      reason: ['你们都喜欢 ' + u.tags[0], '你可能认识 ' + u.tags[0] + ' 圈的朋友', '近期在 ' + u.tags[0] + ' 领域活跃', '你的好友也关注了TA', '新晋人气博主'][i % 5],
      score: 100 - i * 8 + Math.floor(Math.random() * 20),
      mutual,
      category: (['interest', 'location', 'mutual', 'trending', 'random'] as const)[i % 5],
    }
  })

  const allSuggestions = genSuggestions()
  const filtered = (() => {
    let out = allSuggestions
    if (search) out = out.filter((s) => s.user.name.includes(search) || s.user.tags.some((t) => t.includes(search)))
    if (filter === 'recommended') out = out.sort((a, b) => b.score - a.score)
    else if (filter === 'mutual') out = out.filter((s) => s.mutual > 0).sort((a, b) => b.mutual - a.mutual)
    else if (filter === 'trending') out = out.filter((s) => s.user.followers > 100000)
    return out
  })()

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 3 个最值得关注的 Versa 创作者类型 (50-80 字)', '你是 Versa 社交顾问, 简洁专业, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const active = USERS.find((u) => u.id === activeId)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Users className="w-5 h-5" />
          <h2 className="text-lg font-bold">发现好友</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">智能推荐 · 兴趣匹配 · 共同好友</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{USERS.length}</p>
            <p className="text-[10px] opacity-80">推荐</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{following.length}</p>
            <p className="text-[10px] opacity-80">已关注</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{USERS.filter((u) => u.followers > 100000).length}</p>
            <p className="text-[10px] opacity-80">大V</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索用户名或标签..." className="w-full px-3 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'recommended', 'mutual', 'trending'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'recommended' ? '推荐' : f === 'mutual' ? '共同好友' : '热门'}
          </button>
        ))}
        <button onClick={runAI} disabled={loading} className="px-3 h-7 rounded-full bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1 flex-shrink-0">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiRec && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] leading-relaxed text-rose-700 dark:text-rose-300">💡 {aiRec}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {filtered.map((s) => {
          const Cat = CAT_META[s.category]
          const isFollowing = following.includes(s.user.id)
          return (
            <motion.div key={s.id} whileHover={{ y: -2 }} onClick={() => setActiveId(s.user.id)} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
              <div className="flex items-center gap-2 mb-1.5">
                <img src={s.user.avatar} alt={s.user.name} className="w-10 h-10 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{s.user.name}</p>
                  <p className="text-[9px] text-ink-500 truncate">{s.user.bio}</p>
                </div>
                {s.user.followers > 100000 && <Trophy className="w-3 h-3 text-amber-500 flex-shrink-0" />}
              </div>
              <p className="text-[10px] text-rose-500 mb-1.5 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />{s.reason}
              </p>
              <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                {s.user.tags.slice(0, 2).map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-800">#{t}</span>)}
                <span className="text-[9px] text-ink-500 ml-auto">{formatNumber(s.user.followers)} 粉</span>
              </div>
              <button onClick={(e) => { e.stopPropagation(); toggleFollow(s.user.id) }} className={cn('w-full h-7 rounded-lg text-[10px] font-bold', isFollowing ? 'bg-ink-100 dark:bg-ink-800' : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white')}>
                {isFollowing ? '已关注' : '+ 关注'}
              </button>
            </motion.div>
          )
        })}
      </div>

      {active && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setActiveId(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl max-h-[80vh] overflow-y-auto">
            <div className="relative h-40 bg-gradient-to-br from-rose-500 to-pink-500">
              <button onClick={() => setActiveId(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"><X className="w-4 h-4" /></button>
              <img src={active.avatar} alt={active.name} className="absolute -bottom-8 left-4 w-20 h-20 rounded-2xl border-4 border-white dark:border-ink-900" />
            </div>
            <div className="pt-10 p-4 space-y-2">
              <h3 className="text-xl font-bold">{active.name}</h3>
              <p className="text-xs text-ink-500">{active.bio}</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-base font-bold">{formatNumber(active.followers)}</p><p className="text-[10px] text-ink-500">粉丝</p></div>
                <div><p className="text-base font-bold">{formatNumber(Math.floor(active.followers * 0.1))}</p><p className="text-[10px] text-ink-500">帖子</p></div>
                <div><p className="text-base font-bold">{Math.floor(Math.random() * 20) + 5}</p><p className="text-[10px] text-ink-500">共同</p></div>
              </div>
              <div className="flex flex-wrap gap-1">
                {active.tags.map((t) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">#{t}</span>)}
              </div>
              <button onClick={() => toggleFollow(active.id)} className={cn('w-full h-9 rounded-xl text-sm font-bold', following.includes(active.id) ? 'bg-ink-100 dark:bg-ink-800' : 'bg-gradient-to-r from-rose-500 to-pink-500 text-white')}>
                {following.includes(active.id) ? '已关注' : '+ 关注'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
