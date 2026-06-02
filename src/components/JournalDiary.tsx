import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookHeart, Plus, Trash2, Lock, Unlock, Sparkles, Loader2, Heart, Frown, Smile, Meh, Cloud, Sun, CloudRain, Calendar, X, Tag } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Entry {
  id: string
  date: string
  mood: 'great' | 'good' | 'ok' | 'sad' | 'awful'
  title: string
  body: string
  weather: 'sun' | 'cloud' | 'rain' | 'snow'
  tags: string[]
  locked: boolean
  at: number
}

const STORAGE_KEY = 'versa:journal'
const PIN_KEY = 'versa:journal-pin'

function load(): Entry[] {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return [
    { id: 'j1', date: '2026-06-01', mood: 'great', title: 'Versa v23 上线啦!', body: '今天终于把 8 个新功能做完了, 感觉很有成就感. 视频评论、弹幕情感、收益日历... 每一个都花了很多心思. 接下来还要继续加油!', weather: 'sun', tags: ['工作', 'Versa'], locked: false, at: Date.now() - 86400000 },
    { id: 'j2', date: '2026-05-30', mood: 'good', title: '休息日', body: '今天睡到自然醒, 下午去公园走了走, 看了夕阳, 心情很平静.', weather: 'cloud', tags: ['生活', '休息'], locked: false, at: Date.now() - 86400000 * 3 },
  ]
}
function save(d: Entry[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const MOOD_META = {
  great: { label: '极好', emoji: '😄', color: 'from-emerald-500 to-teal-500' },
  good: { label: '不错', emoji: '🙂', color: 'from-cyan-500 to-blue-500' },
  ok: { label: '一般', emoji: '😐', color: 'from-amber-500 to-orange-500' },
  sad: { label: '难过', emoji: '😔', color: 'from-orange-500 to-rose-500' },
  awful: { label: '糟糕', emoji: '😢', color: 'from-rose-500 to-pink-500' },
} as const

const WEATHER_META = {
  sun: { label: '晴', emoji: '☀️' },
  cloud: { label: '多云', emoji: '☁️' },
  rain: { label: '雨', emoji: '🌧️' },
  snow: { label: '雪', emoji: '❄️' },
} as const

export function JournalDiary() {
  const [entries, setEntries] = useState<Entry[]>(load())
  const [pin, setPin] = useState<string | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [editing, setEditing] = useState<Entry | null>(null)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [aiReply, setAiReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [newMood, setNewMood] = useState<keyof typeof MOOD_META>('good')
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newWeather, setNewWeather] = useState<keyof typeof WEATHER_META>('sun')
  const [newTags, setNewTags] = useState('')
  const [newLocked, setNewLocked] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  useEffect(() => { save(entries); try { const p = localStorage.getItem(PIN_KEY); if (p) setPin(p) } catch {} }, [entries])

  const setupPin = () => {
    if (pinInput.length < 4) { toast('PIN 至少 4 位', 'error'); return }
    setPin(pinInput)
    setUnlocked(true)
    setPinInput('')
    toast('PIN 已设置', 'success')
  }

  const unlock = () => {
    if (pinInput === pin) {
      setUnlocked(true)
      setPinInput('')
    } else {
      toast('PIN 错误', 'error')
    }
  }

  const add = () => {
    if (!newTitle.trim() || !newBody.trim()) { toast('请填写完整', 'error'); return }
    const e: Entry = { id: uid(), date: newDate, mood: newMood, title: newTitle, body: newBody, weather: newWeather, tags: newTags.split(',').map((t) => t.trim()).filter(Boolean), locked: newLocked, at: Date.now() }
    setEntries([e, ...entries])
    setNewTitle(''); setNewBody(''); setNewTags(''); setNewLocked(false)
    setEditing(null)
    toast('已记录', 'success')
  }

  const remove = (id: string) => {
    if (confirm('删除此条日记?')) setEntries(entries.filter((e) => e.id !== id))
  }

  const runAI = async (e: Entry) => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setActiveId(e.id)
    setLoading(true)
    try {
      const result = await aiComplete(`为这段日记写一句温柔回应 (30-50 字): ${e.body}`, '你是 Versa 心理陪伴师, 温柔治愈, 中文')
      setAiReply(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  if (pin && !unlocked) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="w-full max-w-sm rounded-3xl bg-white/80 dark:bg-ink-900/40 backdrop-blur p-6 text-center space-y-3 border border-ink-200/60 dark:border-ink-800/60">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-bold">日记已加密</h2>
          <p className="text-xs text-ink-500">请输入 PIN 解锁</p>
          <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && unlock()} placeholder="****" className="w-full px-3 h-10 rounded-lg bg-ink-50 dark:bg-ink-800 text-center text-2xl font-mono outline-none focus:ring-2 focus:ring-rose-500" />
          <button onClick={unlock} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold">解锁</button>
        </motion.div>
      </div>
    )
  }

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  const streak = (() => {
    if (entries.length === 0) return 0
    const dates = new Set(entries.map((e) => e.date))
    let s = 0
    for (let i = 0; i < 365; i++) {
      const d = new Date(Date.now() - i * 86400000)
      const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (dates.has(ds)) s++
      else if (i > 0) break
    }
    return s
  })()

  const monthDates = entries.reduce((acc, e) => { acc[e.date] = (acc[e.date] || 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <BookHeart className="w-5 h-5" />
          <h2 className="text-lg font-bold">日记本</h2>
          {pin && <button onClick={() => setUnlocked(false)} className="ml-auto"><Lock className="w-4 h-4" /></button>}
        </div>
        <p className="text-xs opacity-90 mb-2">心情 · 天气 · 标签 · 加密</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{entries.length}</p>
            <p className="text-[10px] opacity-80">总条目</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{streak}</p>
            <p className="text-[10px] opacity-80">连续</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{new Set(entries.map((e) => e.mood)).size}</p>
            <p className="text-[10px] opacity-80">心情种类</p>
          </div>
        </div>
      </div>

      {!pin && (
        <div className="rounded-2xl bg-rose-50/40 dark:bg-rose-900/20 p-3 border border-rose-200/40">
          <p className="text-xs text-rose-700 dark:text-rose-300 mb-1.5">🔒 保护你的隐私 - 设置 PIN 加密</p>
          <div className="flex gap-1.5">
            <input type="password" value={pinInput} onChange={(e) => setPinInput(e.target.value)} placeholder="设置 4 位以上 PIN" className="flex-1 px-3 h-8 rounded-lg bg-white dark:bg-ink-900 text-sm" />
            <button onClick={setupPin} className="px-3 h-8 rounded-lg bg-rose-500 text-white text-xs">设置</button>
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        <button onClick={() => setEditing({ id: '', date: newDate, mood: 'good', title: '', body: '', weather: 'sun', tags: [], locked: false, at: Date.now() })} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />记一笔
        </button>
        <button onClick={() => setView(view === 'list' ? 'calendar' : 'list')} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">
          {view === 'list' ? '📅' : '📝'}
        </button>
      </div>

      {view === 'list' && (
        <div className="space-y-1.5">
          {sorted.length === 0 ? (
            <div className="text-center py-8 text-ink-500">
              <BookHeart className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">还没有日记</p>
            </div>
          ) : sorted.map((e) => {
            const Mood = MOOD_META[e.mood]
            const W = WEATHER_META[e.weather]
            return (
              <div key={e.id} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
                <div className="flex items-start gap-2">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br', Mood.color)}>
                    {Mood.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold">{e.title}</p>
                      {e.locked && <Lock className="w-3 h-3 text-ink-400" />}
                    </div>
                    <p className="text-[10px] text-ink-500 line-clamp-2">{e.body}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-ink-500">{e.date} · {W.emoji} {W.label}</span>
                      {e.tags.map((t) => <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300">#{t}</span>)}
                    </div>
                  </div>
                  <button onClick={() => remove(e.id)} className="text-ink-400 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                <button onClick={() => runAI(e)} disabled={loading} className="mt-1.5 w-full h-7 rounded bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-semibold flex items-center justify-center gap-1">
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 暖心回应
                </button>
                {aiReply && activeId === e.id && (
                  <div className="mt-1.5 bg-rose-50/40 dark:bg-rose-900/20 rounded p-2 border border-rose-200/40">
                    <p className="text-[10px] italic leading-relaxed text-rose-700 dark:text-rose-300">"{aiReply}"</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {view === 'calendar' && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
          <div className="grid grid-cols-7 gap-1">
            {['日', '一', '二', '三', '四', '五', '六'].map((d) => <div key={d} className="text-center text-[10px] text-ink-500 font-semibold py-1">{d}</div>)}
            {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() }).map((_, i) => {
              const d = i + 1
              const ds = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
              const has = !!monthDates[ds]
              const isToday = ds === new Date().toISOString().split('T')[0]
              return (
                <div key={d} className={cn('aspect-square rounded-lg flex items-center justify-center text-xs', has ? 'bg-rose-500 text-white font-bold' : isToday ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-500' : 'text-ink-400')}>
                  {d}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setEditing(null)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[80vh] overflow-y-auto">
            <h3 className="font-bold">写日记</h3>
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div>
              <p className="text-xs text-ink-500 mb-1">心情</p>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(MOOD_META) as Array<keyof typeof MOOD_META>).map((k) => (
                  <button key={k} onClick={() => setNewMood(k)} className={cn('h-12 rounded-lg flex flex-col items-center justify-center gap-0.5', newMood === k ? `bg-gradient-to-br ${MOOD_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    <span className="text-lg">{MOOD_META[k].emoji}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs text-ink-500 mb-1">天气</p>
              <div className="grid grid-cols-4 gap-1.5">
                {(Object.keys(WEATHER_META) as Array<keyof typeof WEATHER_META>).map((k) => (
                  <button key={k} onClick={() => setNewWeather(k)} className={cn('h-9 rounded-lg text-sm', newWeather === k ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                    {WEATHER_META[k].emoji}
                  </button>
                ))}
              </div>
            </div>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="今天发生了什么..." rows={5} className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-rose-500 resize-none" />
            <input value={newTags} onChange={(e) => setNewTags(e.target.value)} placeholder="标签 (逗号分隔)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input type="checkbox" checked={newLocked} onChange={(e) => setNewLocked(e.target.checked)} className="w-3.5 h-3.5" />
              <Lock className="w-3 h-3" />加密此条
            </label>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
