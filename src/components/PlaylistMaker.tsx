import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Plus, Trash2, Shuffle, Heart, Sparkles, Loader2, Mic, Disc3, ListMusic } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Track {
  id: string
  title: string
  artist: string
  duration: number
  cover: string
  mood: 'chill' | 'energetic' | 'romantic' | 'focus' | 'party' | 'sad'
  addedAt: number
}

const STORAGE_KEY = 'versa:playlist'

const SAMPLE_TRACKS: Track[] = [
  { id: 't1', title: '夜曲', artist: '周杰伦', duration: 230, cover: 'https://picsum.photos/seed/m1/300/300', mood: 'romantic', addedAt: Date.now() },
  { id: 't2', title: '稻香', artist: '周杰伦', duration: 220, cover: 'https://picsum.photos/seed/m2/300/300', mood: 'chill', addedAt: Date.now() },
  { id: 't3', title: '起风了', artist: '买辣椒也用券', duration: 320, cover: 'https://picsum.photos/seed/m3/300/300', mood: 'sad', addedAt: Date.now() },
  { id: 't4', title: '芒种', artist: '音阙诗听', duration: 200, cover: 'https://picsum.photos/seed/m4/300/300', mood: 'energetic', addedAt: Date.now() },
  { id: 't5', title: '失眠飞行', artist: '接个吻开枪', duration: 240, cover: 'https://picsum.photos/seed/m5/300/300', mood: 'focus', addedAt: Date.now() },
  { id: 't6', title: '野狼 Disco', artist: '宝石 Gem', duration: 250, cover: 'https://picsum.photos/seed/m6/300/300', mood: 'party', addedAt: Date.now() },
]

const MOOD_META = {
  chill: { label: '放松', color: 'from-cyan-500 to-blue-500', emoji: '😌' },
  energetic: { label: '活力', color: 'from-orange-500 to-rose-500', emoji: '⚡' },
  romantic: { label: '浪漫', color: 'from-pink-500 to-rose-500', emoji: '💕' },
  focus: { label: '专注', color: 'from-violet-500 to-purple-500', emoji: '🎯' },
  party: { label: '派对', color: 'from-amber-500 to-orange-500', emoji: '🎉' },
  sad: { label: '伤感', color: 'from-slate-500 to-slate-700', emoji: '😢' },
} as const

function load(): Track[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return SAMPLE_TRACKS }
function save(d: Track[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function PlaylistMaker() {
  const [tracks, setTracks] = useState<Track[]>(load())
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [muted, setMuted] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [filter, setFilter] = useState<'all' | keyof typeof MOOD_META>('all')
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newArtist, setNewArtist] = useState('')
  const [newMood, setNewMood] = useState<keyof typeof MOOD_META>('chill')
  const intervalRef = useRef<number | undefined>(undefined)

  useEffect(() => { save(tracks) }, [tracks])

  useEffect(() => {
    if (playing) {
      intervalRef.current = window.setInterval(() => {
        setProgress((p) => {
          if (p >= 100) { setPlaying(false); next(); return 0 }
          return p + 0.5
        })
      }, 100)
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current) }
  }, [playing])

  const current = tracks.find((t) => t.id === currentId) || tracks[0]
  const filtered = filter === 'all' ? tracks : tracks.filter((t) => t.mood === filter)
  const totalDuration = tracks.reduce((s, t) => s + t.duration, 0)

  const play = (id?: string) => {
    if (id) setCurrentId(id)
    setPlaying(true)
  }
  const pause = () => setPlaying(false)
  const next = () => {
    const idx = tracks.findIndex((t) => t.id === currentId)
    if (shuffle) {
      const nextIdx = Math.floor(Math.random() * tracks.length)
      setCurrentId(tracks[nextIdx].id)
    } else {
      setCurrentId(tracks[(idx + 1) % tracks.length].id)
    }
    setProgress(0)
  }
  const prev = () => {
    const idx = tracks.findIndex((t) => t.id === currentId)
    setCurrentId(tracks[(idx - 1 + tracks.length) % tracks.length].id)
    setProgress(0)
  }

  const toggleFav = (id: string) => toast('已收藏', 'success')

  const addTrack = () => {
    if (!newTitle.trim() || !newArtist.trim()) { toast('请填写完整', 'error'); return }
    const t: Track = { id: uid(), title: newTitle, artist: newArtist, duration: randInt(120, 360), cover: `https://picsum.photos/seed/${Date.now()}/300/300`, mood: newMood, addedAt: Date.now() }
    setTracks([t, ...tracks])
    setNewTitle(''); setNewArtist('')
    toast('已添加', 'success')
  }

  const removeTrack = (id: string) => setTracks(tracks.filter((t) => t.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 5 首适合 Versa 用户工作时听的歌曲 (50-80 字, 中文歌优先)', '你是 Versa 音乐顾问, 简洁实用, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const currentSec = current ? Math.floor((progress / 100) * current.duration) : 0
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-fuchsia-500 via-pink-500 to-rose-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Music className="w-5 h-5" />
          <h2 className="text-lg font-bold">歌单制作</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">心情分类 · 播放控制 · AI 推荐</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{tracks.length}</p>
            <p className="text-[10px] opacity-80">曲目</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{Math.round(totalDuration / 60)}m</p>
            <p className="text-[10px] opacity-80">总时长</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{Object.keys(MOOD_META).length}</p>
            <p className="text-[10px] opacity-80">心情</p>
          </div>
        </div>
      </div>

      {current && (
        <div className={cn('rounded-2xl p-3 text-white bg-gradient-to-br', MOOD_META[current.mood].color)}>
          <div className="flex items-center gap-2">
            <img src={current.cover} alt={current.title} className="w-16 h-16 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold truncate">{current.title}</p>
              <p className="text-xs opacity-90">{current.artist} · {MOOD_META[current.mood].emoji} {MOOD_META[current.mood].label}</p>
              <div className="h-1 bg-white/20 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-white" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] opacity-80 mt-0.5 font-mono">{formatTime(currentSec)} / {formatTime(current.duration)}</p>
            </div>
          </div>
          <div className="flex justify-center items-center gap-1.5 mt-2">
            <button onClick={prev} className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => playing ? pause() : play()} className="w-12 h-12 rounded-full bg-white text-rose-500 flex items-center justify-center">
              {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button onClick={next} className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <SkipForward className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShuffle(!shuffle)} className={cn('w-8 h-8 rounded-full flex items-center justify-center', shuffle ? 'bg-white text-rose-500' : 'bg-white/20 backdrop-blur')}>
              <Shuffle className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setMuted(!muted)} className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-1.5">
        <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="歌曲名" className="flex-1 px-2 h-8 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-xs" />
        <input value={newArtist} onChange={(e) => setNewArtist(e.target.value)} placeholder="歌手" className="flex-1 px-2 h-8 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-xs" />
        <select value={newMood} onChange={(e) => setNewMood(e.target.value as any)} className="px-2 h-8 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-xs">
          {(Object.keys(MOOD_META) as Array<keyof typeof MOOD_META>).map((k) => <option key={k} value={k}>{MOOD_META[k].emoji} {MOOD_META[k].label}</option>)}
        </select>
        <button onClick={addTrack} className="px-3 h-8 rounded-lg bg-fuchsia-500 text-white text-xs font-bold">+</button>
      </div>

      <div className="flex gap-1.5">
        <button onClick={runAI} disabled={loading} className="flex-1 h-8 rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 推荐歌单
        </button>
      </div>

      {aiRec && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiRec}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'all' ? 'bg-fuchsia-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        {(Object.keys(MOOD_META) as Array<keyof typeof MOOD_META>).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === k ? `bg-gradient-to-r ${MOOD_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {MOOD_META[k].emoji} {MOOD_META[k].label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Music className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">没有歌曲</p>
          </div>
        ) : filtered.map((t) => {
          const Meta = MOOD_META[t.mood]
          const isCurrent = currentId === t.id
          return (
            <motion.div key={t.id} whileHover={{ x: 2 }} onClick={() => play(t.id)} className={cn('flex items-center gap-2 p-2 rounded-xl border cursor-pointer', isCurrent ? 'bg-fuchsia-50 dark:bg-fuchsia-900/20 border-fuchsia-300' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
              <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                <img src={t.cover} alt={t.title} className="w-full h-full object-cover" />
                {isCurrent && playing && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Disc3 className="w-4 h-4 text-white animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-semibold truncate', isCurrent && 'text-fuchsia-500')}>{t.title}</p>
                <p className="text-[10px] text-ink-500">{t.artist} · {formatTime(t.duration)} · {Meta.emoji}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); toggleFav(t.id) }} className="text-amber-500"><Heart className="w-3.5 h-3.5" /></button>
              <button onClick={(e) => { e.stopPropagation(); removeTrack(t.id) }} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function randInt(a: number, b: number) { return Math.floor(Math.random() * (b - a + 1)) + a }
