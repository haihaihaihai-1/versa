import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Play, Pause, RotateCcw, Sparkles, Loader2, Plus, Trash2, Moon, Star, Clock, Volume2, Heart, Tag } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Story {
  id: string
  title: string
  narrator: string
  category: 'fantasy' | 'nature' | 'philosophy' | 'fairy-tale' | 'biblical' | 'sci-fi' | 'mystery' | 'romance'
  duration: number
  description: string
  content: string[]
  image: string
  rating: 1 | 2 | 3 | 4 | 5
  favorite: boolean
  listened: number
}

const STORAGE_KEY = 'versa:stories-v1'

function load(): Story[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Story[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Story[] {
  return [
    { id: 'st1', title: '森林深处的萤火虫', narrator: '夜雨声', category: 'nature', duration: 8, description: '在宁静的夏夜里, 跟随萤火虫的光点, 探索古老森林的秘密...', content: [
      '夜色降临, 森林里开始苏醒...',
      '第一只萤火虫点亮了它的小灯笼...',
      '你跟随光点, 穿过苔藓覆盖的小径...',
      '古老的橡树在低语, 讲述千年的故事...',
      '溪水的声音渐渐远去, 一切归于宁静...',
      '愿你在这温柔的光中, 安然入眠...',
    ], image: 'https://picsum.photos/seed/firefly/400/300', rating: 5, favorite: true, listened: 3 },
    { id: 'st2', title: '海边灯塔的孤独守望者', narrator: '海风轻', category: 'mystery', duration: 12, description: '一位老守塔人守护着海岸的灯塔, 等待迷航的船只...', content: [
      '灯塔矗立在悬崖之巅, 望向无尽的海洋...',
      '守塔人点燃了巨灯, 光芒穿越夜空...',
      '远方有船只在迷雾中徘徊...',
      '灯塔的光, 是回家的方向...',
      '潮水拍打礁石, 节奏如摇篮曲...',
      '你渐渐进入梦乡, 与星辰为伴...',
    ], image: 'https://picsum.photos/seed/lighthouse/400/300', rating: 4, favorite: true, listened: 2 },
    { id: 'st3', title: '雪山小屋的炉火', narrator: '北风寒', category: 'fairy-tale', duration: 10, description: '暴风雪中的小屋里, 炉火噼啪作响, 讲述古老传说...', content: [
      '大雪纷飞, 天地间一片苍茫...',
      '小木屋里, 炉火温暖地跳动...',
      '老奶奶递来一杯热可可...',
      '窗外的雪花像羽毛一样飘落...',
      '故事一个接一个, 时间慢慢流淌...',
      '你蜷缩在毯子里, 安心睡去...',
    ], image: 'https://picsum.photos/seed/cabin/400/300', rating: 5, favorite: false, listened: 1 },
  ]
}

const CAT_META = {
  fantasy: { label: '奇幻', icon: '🦄', color: 'from-violet-500 to-purple-500' },
  nature: { label: '自然', icon: '🌲', color: 'from-emerald-500 to-teal-500' },
  philosophy: { label: '哲思', icon: '🧘', color: 'from-indigo-500 to-blue-500' },
  'fairy-tale': { label: '童话', icon: '🏰', color: 'from-pink-500 to-rose-500' },
  biblical: { label: '宗教', icon: '🕊', color: 'from-amber-400 to-yellow-500' },
  'sci-fi': { label: '科幻', icon: '🚀', color: 'from-cyan-500 to-blue-500' },
  mystery: { label: '悬疑', icon: '🔍', color: 'from-ink-600 to-ink-800' },
  romance: { label: '浪漫', icon: '💕', color: 'from-rose-400 to-pink-400' },
} as const

export function SleepStories() {
  const [stories, setStories] = useState<Story[]>(load())
  const [activeId, setActiveId] = useState<string | null>(stories[0]?.id || null)
  const [playing, setPlaying] = useState(false)
  const [paragraph, setParagraph] = useState(0)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'fav'>('all')
  const [catFilter, setCatFilter] = useState<'all' | Story['category']>('all')
  const tickRef = useRef<number | undefined>(undefined)

  useEffect(() => { save(stories) }, [stories])

  const active = stories.find((s) => s.id === activeId)
  const totalStories = stories.length
  const favCount = stories.filter((s) => s.favorite).length
  const totalListens = stories.reduce((s, st) => s + st.listened, 0)
  const totalDuration = stories.reduce((s, st) => s + st.duration, 0)

  useEffect(() => {
    if (playing && active) {
      const secondsPerPara = Math.max(5, (active.duration * 60) / active.content.length)
      tickRef.current = window.setInterval(() => {
        setParagraph((p) => {
          if (p + 1 >= active.content.length) {
            setPlaying(false)
            setStories(stories.map((s) => s.id === active.id ? { ...s, listened: s.listened + 1 } : s))
            toast('✓ 故事结束, 晚安~', 'success')
            return 0
          }
          return p + 1
        })
      }, secondsPerPara * 1000)
    } else if (tickRef.current) {
      window.clearInterval(tickRef.current)
    }
    return () => { if (tickRef.current) window.clearInterval(tickRef.current) }
  }, [playing, active?.id])

  const toggleFav = (id: string) => setStories(stories.map((s) => s.id === id ? { ...s, favorite: !s.favorite } : s))
  const remove = (id: string) => {
    setStories(stories.filter((s) => s.id !== id))
    if (activeId === id) setActiveId(stories[0]?.id || null)
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`写一个 6 段睡前故事 (每段 30 字), 主题: 星空下的旅行, 格式: 每行 1 段`, '你是 Versa 童话作家, 温柔治愈, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const filtered = stories.filter((s) => {
    if (filter === 'fav' && !s.favorite) return false
    if (catFilter !== 'all' && s.category !== catFilter) return false
    return true
  })

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-lg font-bold">睡前故事</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 主题 · 全文朗读 · 定时播放</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalStories}</p>
            <p className="text-[9px] opacity-80">故事</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{favCount}</p>
            <p className="text-[9px] opacity-80">收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalListens}</p>
            <p className="text-[9px] opacity-80">收听</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{Math.round(totalDuration / 60)}h</p>
            <p className="text-[9px] opacity-80">时长</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={runAI} disabled={loading} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-bold flex items-center justify-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 写故事
        </button>
      </div>

      {aiTip && (
        <div className="bg-indigo-50/40 dark:bg-indigo-900/20 rounded-xl p-2 border border-indigo-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        <button onClick={() => setFilter('fav')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'fav' ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>⭐ 收藏</button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setCatFilter('all')} className={cn('px-2 h-6 rounded-full text-[10px] font-semibold flex-shrink-0', catFilter === 'all' ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => (
          <button key={k} onClick={() => setCatFilter(k)} className={cn('px-2 h-6 rounded-full text-[10px] font-semibold flex-shrink-0', catFilter === k ? `bg-gradient-to-r ${CAT_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {CAT_META[k].icon} {CAT_META[k].label}
          </button>
        ))}
      </div>

      {active && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
          <div className="relative h-32">
            <img src={active.image} alt={active.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-white">
              <p className="text-lg font-bold">{active.title}</p>
              <p className="text-[10px] opacity-90">{CAT_META[active.category].icon} {CAT_META[active.category].label} · 讲述: {active.narrator} · ⭐{active.rating} · {active.duration}分钟</p>
            </div>
            <button onClick={() => toggleFav(active.id)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">
              <Heart className={cn('w-4 h-4', active.favorite && 'fill-rose-500 text-rose-500')} />
            </button>
          </div>
          <div className="p-3">
            <p className="text-[10px] text-ink-500 mb-2">{active.description}</p>
            {playing && (
              <motion.div key={paragraph} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-indigo-50/60 dark:bg-indigo-900/30 p-3 mb-2 border border-indigo-200/40">
                <p className="text-sm text-center text-ink-700 dark:text-ink-300 leading-relaxed italic">"{active.content[paragraph]}"</p>
                <p className="text-[10px] text-center text-indigo-500 mt-1">{paragraph + 1} / {active.content.length}</p>
              </motion.div>
            )}
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setParagraph(Math.max(0, paragraph - 1))} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">上一段</button>
              <button onClick={() => setPlaying(!playing)} className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg">
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={() => setParagraph(0)} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs">重置</button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        {filtered.filter((s) => s.id !== activeId).map((s) => {
          const CM = CAT_META[s.category]
          return (
            <motion.div key={s.id} whileHover={{ y: -1 }} onClick={() => setActiveId(s.id)} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60 cursor-pointer">
              <div className="flex items-center gap-2">
                <img src={s.image} alt={s.title} className="w-12 h-12 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold truncate">{s.title}</p>
                    {s.favorite && <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />}
                  </div>
                  <p className="text-[10px] text-ink-500">{CM.icon} {CM.label} · {s.duration}分 · {s.narrator}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); remove(s.id) }} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
