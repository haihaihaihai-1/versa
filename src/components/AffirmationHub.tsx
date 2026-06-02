import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, Heart, RefreshCw, Send, Quote, Sun, Moon, Star, Flame } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Affirmation {
  id: string
  text: string
  category: 'self' | 'gratitude' | 'growth' | 'calm' | 'courage' | 'love'
  favorite: boolean
  createdAt: string
}

const STORAGE_KEY = 'versa:affirmations-v1'

function load(): Affirmation[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Affirmation[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Affirmation[] {
  return [
    { id: 'a1', text: '我值得被爱,值得拥有美好的一切。', category: 'self', favorite: true, createdAt: new Date().toISOString() },
    { id: 'a2', text: '感恩今天的阳光,感恩呼吸的每一口空气。', category: 'gratitude', favorite: true, createdAt: new Date().toISOString() },
    { id: 'a3', text: '我每天都在变得更好。', category: 'growth', favorite: false, createdAt: new Date().toISOString() },
    { id: 'a4', text: '我选择放下无法控制的事。', category: 'calm', favorite: false, createdAt: new Date().toISOString() },
    { id: 'a5', text: '我勇敢地面对未知。', category: 'courage', favorite: false, createdAt: new Date().toISOString() },
    { id: 'a6', text: '我向身边的人传递善意。', category: 'love', favorite: false, createdAt: new Date().toISOString() },
  ]
}

const CAT_META = {
  self: { label: '自我', icon: Sun, color: 'from-amber-400 to-orange-500', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-500' },
  gratitude: { label: '感恩', icon: Heart, color: 'from-rose-400 to-pink-500', bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-500' },
  growth: { label: '成长', icon: Star, color: 'from-violet-400 to-purple-500', bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-500' },
  calm: { label: '平静', icon: Moon, color: 'from-cyan-400 to-blue-500', bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-500' },
  courage: { label: '勇气', icon: Flame, color: 'from-red-400 to-rose-500', bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-500' },
  love: { label: '爱', icon: Heart, color: 'from-pink-400 to-fuchsia-500', bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-500' },
} as const

const CATEGORY_PROMPTS = {
  self: '自我价值肯定',
  gratitude: '感恩生活',
  growth: '成长与进步',
  calm: '平静与接纳',
  courage: '勇气与突破',
  love: '爱与连接',
} as const

export function AffirmationHub() {
  const [items, setItems] = useState<Affirmation[]>(load())
  const [filter, setFilter] = useState<'all' | 'fav' | 'cat' | 'today'>('all')
  const [catFilter, setCatFilter] = useState<keyof typeof CAT_META>('self')
  const [generating, setGenerating] = useState(false)
  const [genCat, setGenCat] = useState<keyof typeof CAT_META>('self')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [newText, setNewText] = useState('')
  const [newCat, setNewCat] = useState<keyof typeof CAT_META>('self')

  useEffect(() => { save(items) }, [items])

  const today = new Date().toISOString().split('T')[0]
  const favs = items.filter((i) => i.favorite)
  const todayCount = items.filter((i) => i.createdAt.startsWith(today)).length

  const filtered = (() => {
    if (filter === 'fav') return items.filter((i) => i.favorite)
    if (filter === 'cat') return items.filter((i) => i.category === catFilter)
    if (filter === 'today') return items.filter((i) => i.createdAt.startsWith(today))
    return items
  })()

  const generate = async (cat: keyof typeof CAT_META) => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setGenerating(true)
    try {
      const result = await aiComplete(`生成 3 句关于"${CATEGORY_PROMPTS[cat]}"的肯定语, 每句 15-25 字, 第二人称"你", 富有力量感, 换行分隔, 不要编号`, '你是 Versa 心灵导师, 温暖有力量, 中文')
      const lines = result.split('\n').map((l) => l.replace(/^[\d.、\-\s]+/, '').trim()).filter((l) => l.length > 5 && l.length < 80)
      const newItems: Affirmation[] = lines.slice(0, 3).map((t) => ({ id: uid(), text: t, category: cat, favorite: false, createdAt: new Date().toISOString() }))
      if (newItems.length > 0) {
        setItems([...newItems, ...items])
        toast(`已生成 ${newItems.length} 句`, 'success')
      } else {
        toast('生成失败,请重试', 'error')
      }
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setGenerating(false) }
  }

  const add = () => {
    if (!newText.trim()) { toast('请输入内容', 'error'); return }
    setItems([{ id: uid(), text: newText, category: newCat, favorite: false, createdAt: new Date().toISOString() }, ...items])
    setNewText('')
    toast('已添加', 'success')
  }

  const toggleFav = (id: string) => setItems(items.map((i) => i.id === id ? { ...i, favorite: !i.favorite } : i))
  const remove = (id: string) => setItems(items.filter((i) => i.id !== id))

  const daily = items.length > 0 ? items[currentIdx % items.length] : null
  const next = () => setCurrentIdx((i) => (i + 1) % items.length)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-bold">每日肯定</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">AI 生成 · 心灵滋养 · 积极自我对话</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{items.length}</p>
            <p className="text-[9px] opacity-80">总句</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{favs.length}</p>
            <p className="text-[9px] opacity-80">收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{todayCount}</p>
            <p className="text-[9px] opacity-80">今日</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{Object.keys(CAT_META).length}</p>
            <p className="text-[9px] opacity-80">主题</p>
          </div>
        </div>
      </div>

      {daily && (
        <motion.div key={daily.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-2xl bg-gradient-to-br from-pink-100 via-rose-100 to-fuchsia-100 dark:from-pink-900/30 dark:via-rose-900/30 dark:to-fuchsia-900/30 p-4 border border-pink-200/60 dark:border-pink-800/40 text-center">
          <Quote className="w-5 h-5 text-pink-400 mx-auto mb-1" />
          <p className="text-base font-bold text-ink-800 dark:text-white leading-relaxed">"{daily.text}"</p>
          <p className="text-[10px] text-pink-500 mt-1">— {CAT_META[daily.category].label}</p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <button onClick={() => toggleFav(daily.id)} className={cn('w-7 h-7 rounded-full flex items-center justify-center', daily.favorite ? 'bg-rose-500 text-white' : 'bg-white/60 dark:bg-ink-800/60')}>
              <Heart className={cn('w-3.5 h-3.5', daily.favorite && 'fill-current')} />
            </button>
            <button onClick={next} className="px-3 h-7 rounded-full bg-white/60 dark:bg-ink-800/60 text-[10px] font-semibold flex items-center gap-1">
              <RefreshCw className="w-3 h-3" />换一句
            </button>
          </div>
        </motion.div>
      )}

      <div>
        <p className="text-xs font-semibold mb-1.5">AI 生成主题</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => {
            const M = CAT_META[k]
            return (
              <button key={k} onClick={() => { setGenCat(k); generate(k) }} disabled={generating} className={cn('h-12 rounded-xl flex flex-col items-center justify-center text-[10px] font-semibold', genCat === k ? `bg-gradient-to-br ${M.color} text-white` : `${M.bg} ${M.text}`)}>
                {generating && genCat === k ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <M.icon className="w-3.5 h-3.5" />}
                <span className="mt-0.5">{M.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex items-center gap-1.5 mb-1.5">
          <input value={newText} onChange={(e) => setNewText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="写下你自己的肯定语..." className="flex-1 px-2 h-8 rounded bg-ink-50 dark:bg-ink-800 text-xs outline-none" />
          <select value={newCat} onChange={(e) => setNewCat(e.target.value as keyof typeof CAT_META)} className="px-1.5 h-8 rounded bg-ink-50 dark:bg-ink-800 text-[10px] outline-none">
            {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => <option key={k} value={k}>{CAT_META[k].label}</option>)}
          </select>
          <button onClick={add} className="w-8 h-8 rounded bg-pink-500 text-white flex items-center justify-center">
            <Send className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'fav', 'today', 'cat'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-pink-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'fav' ? '❤️ 收藏' : f === 'today' ? '今日' : '分类'}
          </button>
        ))}
        {filter === 'cat' && (
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value as keyof typeof CAT_META)} className="px-2 h-7 rounded-full bg-ink-100 dark:bg-ink-800 text-[10px] font-semibold outline-none">
            {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => <option key={k} value={k}>{CAT_META[k].label}</option>)}
          </select>
        )}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Sparkles className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有肯定语</p>
          </div>
        ) : filtered.map((i) => {
          const M = CAT_META[i.category]
          return (
            <motion.div key={i.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-start gap-2">
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', M.bg)}>
                  <M.icon className={cn('w-4 h-4', M.text)} />
                </div>
                <p className="flex-1 text-sm leading-relaxed">{i.text}</p>
                <div className="flex flex-col gap-1">
                  <button onClick={() => toggleFav(i.id)} className={cn('w-6 h-6 rounded flex items-center justify-center', i.favorite ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                    <Heart className={cn('w-3 h-3', i.favorite && 'fill-current')} />
                  </button>
                  <button onClick={() => remove(i.id)} className="w-6 h-6 rounded bg-ink-100 dark:bg-ink-800 text-rose-500 flex items-center justify-center text-xs">×</button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
