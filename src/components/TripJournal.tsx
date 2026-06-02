import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Plus, Trash2, Sparkles, Loader2, MapPin, Calendar, Star, Camera, Heart, Sun, Cloud, SunSnow, ArrowRight } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface JournalEntry {
  id: string
  date: string
  title: string
  content: string
  location: string
  weather: 'sunny' | 'cloudy' | 'rainy' | 'snow'
  mood: 1 | 2 | 3 | 4 | 5
  photos: string[]
  highlights: string[]
}

const STORAGE_KEY = 'versa:journal-v1'

function load(): JournalEntry[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: JournalEntry[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): JournalEntry[] {
  return [
    { id: 'j1', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], title: '京都的第一天', content: '抵达关西机场,坐 Haruka 前往京都。清水寺的夕阳美极了,和服体验非常有趣。', location: '京都·清水寺', weather: 'sunny', mood: 5, photos: ['https://picsum.photos/seed/kyoto1/400/300'], highlights: ['清水寺夕阳', '和服体验', '抹茶冰激凌'] },
    { id: 'j2', date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], title: '伏见稻荷大社', content: '千本鸟居令人震撼。早晨 6 点登山几乎没人,空气清新。', location: '京都·伏见', weather: 'cloudy', mood: 4, photos: ['https://picsum.photos/seed/kyoto2/400/300'], highlights: ['千本鸟居', '山顶俯瞰', '狐狸绘马'] },
  ]
}

const WEATHER_META = {
  sunny: { label: '晴', icon: Sun, color: 'text-amber-500' },
  cloudy: { label: '多云', icon: Cloud, color: 'text-ink-500' },
  rainy: { label: '雨', icon: Cloud, color: 'text-blue-500' },
  snow: { label: '雪', icon: SunSnow, color: 'text-cyan-500' },
} as const

const MOOD_EMOJI = ['😢', '😕', '😐', '😊', '🤩']

export function TripJournal() {
  const [items, setItems] = useState<JournalEntry[]>(load())
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [location, setLocation] = useState('')
  const [weather, setWeather] = useState<JournalEntry['weather']>('sunny')
  const [mood, setMood] = useState<JournalEntry['mood']>(4)
  const [photoUrl, setPhotoUrl] = useState('')
  const [highlight, setHighlight] = useState('')

  useEffect(() => { save(items) }, [items])

  const totalEntries = items.length
  const totalLocations = new Set(items.map((i) => i.location.split('·')[0])).size
  const avgMood = items.length > 0 ? (items.reduce((s, i) => s + i.mood, 0) / items.length).toFixed(1) : '0'

  const add = () => {
    if (!title.trim()) { toast('请输入标题', 'error'); return }
    const e: JournalEntry = { id: uid(), date, title, content, location, weather, mood, photos: photoUrl ? [photoUrl] : [], highlights: highlight ? [highlight] : [] }
    setItems([e, ...items])
    setTitle(''); setContent(''); setLocation(''); setPhotoUrl(''); setHighlight('')
    setAdding(false)
    toast('已记录', 'success')
  }

  const addHighlight = () => {
    if (!highlight.trim()) return
    // Only updates when adding new entry
  }

  const remove = (id: string) => setItems(items.filter((i) => i.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = items.map((i) => `${i.date} ${i.title}`).join('; ')
      const result = await aiComplete(`用户旅行日志: ${summary}. 帮写一段 60 字内旅行感悟总结, 中文`, '你是 Versa 旅行作家, 温暖文艺, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5" />
          <h2 className="text-lg font-bold">旅行日记</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">图文记录 · 心情 · 高光时刻</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalEntries}</p>
            <p className="text-[9px] opacity-80">日记</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalLocations}</p>
            <p className="text-[9px] opacity-80">地点</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgMood}</p>
            <p className="text-[9px] opacity-80">心情</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{items.reduce((s, i) => s + i.photos.length, 0)}</p>
            <p className="text-[9px] opacity-80">照片</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新日记
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-orange-50/40 dark:bg-orange-900/20 rounded-xl p-2 border border-orange-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有日记</p>
          </div>
        ) : items.map((e) => {
          const W = WEATHER_META[e.weather]
          return (
            <motion.div key={e.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
              {e.photos.length > 0 && (
                <div className="relative h-32">
                  <img src={e.photos[0]} alt={e.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <p className="absolute bottom-1.5 left-2 right-2 text-white text-sm font-bold">{e.title}</p>
                  <button onClick={() => remove(e.id)} className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center text-xs">×</button>
                </div>
              )}
              <div className="p-2">
                {!e.photos.length && <p className="text-sm font-bold mb-1">{e.title}</p>}
                <div className="flex items-center gap-1.5 text-[10px] text-ink-500 mb-1">
                  <span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{e.date}</span>
                  {e.location && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{e.location}</span>}
                  <W.icon className={cn('w-3 h-3', W.color)} />
                  <span className="ml-auto">{MOOD_EMOJI[e.mood - 1]}</span>
                </div>
                {e.content && <p className="text-xs leading-relaxed mb-1">{e.content}</p>}
                {e.highlights.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {e.highlights.map((h, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 text-[9px] font-semibold">✨ {h}</span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">新日记</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <select value={weather} onChange={(e) => setWeather(e.target.value as JournalEntry['weather'])} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none">
                <option value="sunny">☀️ 晴</option>
                <option value="cloudy">☁️ 多云</option>
                <option value="rainy">🌧 雨</option>
                <option value="snow">❄️ 雪</option>
              </select>
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="地点" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="今天的故事..." className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[80px]" />
            <div className="grid grid-cols-2 gap-1.5">
              <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} placeholder="照片 URL (可选)" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={highlight} onChange={(e) => setHighlight(e.target.value)} placeholder="高光 (如 美食)" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-0.5">心情</p>
              <div className="flex gap-1">
                {([1, 2, 3, 4, 5] as const).map((m) => (
                  <button key={m} onClick={() => setMood(m)} className="flex-1 h-9 text-xl">{MOOD_EMOJI[m - 1]}</button>
                ))}
              </div>
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
