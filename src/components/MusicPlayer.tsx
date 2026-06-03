import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Music, Play, Pause, SkipForward, SkipBack, Volume2, Heart, Plus, Trash2, Search, ListMusic, Shuffle, Repeat, Disc3, Clock, Music2 } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Song {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  genre: 'pop' | 'rock' | 'classical' | 'jazz' | 'electronic' | 'folk' | 'hiphop' | 'ambient'
  cover: string
  favorite: boolean
  playCount: number
}

interface Playlist {
  id: string
  name: string
  emoji: string
  songs: string[]
}

const STORAGE_KEY = 'versa:music-v1'

function loadSongs(): Song[] { try { const s = localStorage.getItem(STORAGE_KEY + ':songs'); if (s) return JSON.parse(s) } catch {} return seedSongs() }
function saveSongs(d: Song[]) { try { localStorage.setItem(STORAGE_KEY + ':songs', JSON.stringify(d)) } catch {} }
function loadPlaylists(): Playlist[] { try { const s = localStorage.getItem(STORAGE_KEY + ':lists'); if (s) return JSON.parse(s) } catch {} return seedPlaylists() }
function savePlaylists(d: Playlist[]) { try { localStorage.setItem(STORAGE_KEY + ':lists', JSON.stringify(d)) } catch {} }

function seedSongs(): Song[] {
  return [
    { id: 's1', title: '夜曲', artist: '周杰伦', album: '十一月的萧邦', duration: 226, genre: 'pop', cover: 'https://picsum.photos/seed/m1/200/200', favorite: true, playCount: 12 },
    { id: 's2', title: '致爱丽丝', artist: '贝多芬', album: '古典精选', duration: 178, genre: 'classical', cover: 'https://picsum.photos/seed/m2/200/200', favorite: true, playCount: 8 },
    { id: 's3', title: 'Take Five', artist: 'Dave Brubeck', album: 'Time Out', duration: 324, genre: 'jazz', cover: 'https://picsum.photos/seed/m3/200/200', favorite: false, playCount: 3 },
    { id: 's4', title: 'Weightless', artist: 'Marconi Union', album: 'Ambient', duration: 480, genre: 'ambient', cover: 'https://picsum.photos/seed/m4/200/200', favorite: true, playCount: 25 },
    { id: 's5', title: '稻香', artist: '周杰伦', album: '魔杰座', duration: 223, genre: 'pop', cover: 'https://picsum.photos/seed/m5/200/200', favorite: false, playCount: 5 },
    { id: 's6', title: '卡农', artist: '帕赫贝尔', album: '巴洛克', duration: 252, genre: 'classical', cover: 'https://picsum.photos/seed/m6/200/200', favorite: true, playCount: 15 },
  ]
}

function seedPlaylists(): Playlist[] {
  return [
    { id: 'p1', name: '专注工作', emoji: '💼', songs: ['s4', 's2', 's6'] },
    { id: 'p2', name: '睡前放松', emoji: '🌙', songs: ['s4', 's6'] },
    { id: 'p3', name: '通勤路上', emoji: '🚇', songs: ['s1', 's5'] },
  ]
}

const GENRE_META = {
  pop: { label: '流行', color: 'from-rose-500 to-pink-500' },
  rock: { label: '摇滚', color: 'from-red-500 to-orange-500' },
  classical: { label: '古典', color: 'from-violet-500 to-purple-500' },
  jazz: { label: '爵士', color: 'from-amber-500 to-orange-500' },
  electronic: { label: '电子', color: 'from-cyan-500 to-blue-500' },
  folk: { label: '民谣', color: 'from-emerald-500 to-teal-500' },
  hiphop: { label: '嘻哈', color: 'from-yellow-500 to-orange-500' },
  ambient: { label: '氛围', color: 'from-blue-500 to-indigo-500' },
} as const

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

export function MusicPlayer() {
  const [songs, setSongs] = useState<Song[]>(loadSongs())
  const [playlists, setPlaylists] = useState<Playlist[]>(loadPlaylists())
  const [currentId, setCurrentId] = useState<string | null>(songs[0]?.id || null)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [volume, setVolume] = useState(60)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState<'all' | Song['genre']>('all')
  const [activeList, setActiveList] = useState<'all' | string>('all')
  const tickRef = useRef<number | undefined>(undefined)

  useEffect(() => { saveSongs(songs) }, [songs])
  useEffect(() => { savePlaylists(playlists) }, [playlists])

  const current = songs.find((s) => s.id === currentId)

  useEffect(() => {
    if (playing && current) {
      tickRef.current = window.setInterval(() => {
        setPosition((p) => {
          if (p >= current.duration - 1) {
            setPlaying(false)
            setSongs(songs.map((s) => s.id === current.id ? { ...s, playCount: s.playCount + 1 } : s))
            next()
            return 0
          }
          return p + 1
        })
      }, 1000)
    } else if (tickRef.current) {
      window.clearInterval(tickRef.current)
    }
    return () => { if (tickRef.current) window.clearInterval(tickRef.current) }
  }, [playing, current?.id])

  const play = (id: string) => {
    setCurrentId(id)
    setPosition(0)
    setPlaying(true)
  }

  const next = () => {
    if (!current) return
    const list = activeList === 'all' ? songs : songs.filter((s) => playlists.find((p) => p.id === activeList)?.songs.includes(s.id))
    if (list.length === 0) return
    const idx = list.findIndex((s) => s.id === current.id)
    let newIdx: number
    if (shuffle) newIdx = Math.floor(Math.random() * list.length)
    else if (idx + 1 >= list.length) newIdx = repeat ? 0 : -1
    else newIdx = idx + 1
    if (newIdx === -1) { setPlaying(false); return }
    setCurrentId(list[newIdx].id)
    setPosition(0)
  }

  const prev = () => {
    if (!current) return
    if (position > 3) { setPosition(0); return }
    const list = activeList === 'all' ? songs : songs.filter((s) => playlists.find((p) => p.id === activeList)?.songs.includes(s.id))
    const idx = list.findIndex((s) => s.id === current.id)
    setCurrentId(list[idx > 0 ? idx - 1 : list.length - 1].id)
    setPosition(0)
  }

  const toggleFav = (id: string) => setSongs(songs.map((s) => s.id === id ? { ...s, favorite: !s.favorite } : s))
  const remove = (id: string) => {
    setSongs(songs.filter((s) => s.id !== id))
    if (currentId === id) setCurrentId(songs[0]?.id || null)
  }

  const addPlaylist = () => {
    const name = prompt('歌单名?')
    if (!name) return
    const p: Playlist = { id: uid(), name, emoji: '🎵', songs: [] }
    setPlaylists([p, ...playlists])
  }

  const filteredSongs = songs.filter((s) => {
    if (search && !s.title.includes(search) && !s.artist.includes(search)) return false
    if (genreFilter !== 'all' && s.genre !== genreFilter) return false
    if (activeList !== 'all' && !playlists.find((p) => p.id === activeList)?.songs.includes(s.id)) return false
    return true
  })

  const totalDuration = songs.reduce((s, song) => s + song.duration, 0)
  const totalPlays = songs.reduce((s, song) => s + song.playCount, 0)
  const favCount = songs.filter((s) => s.favorite).length

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Music className="w-5 h-5" />
          <h2 className="text-lg font-bold">音乐播放器</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 流派 · 多歌单 · 收藏 · 模拟</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{songs.length}</p>
            <p className="text-[9px] opacity-80">歌曲</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-rose-100">{favCount}</p>
            <p className="text-[9px] opacity-80">收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{playlists.length}</p>
            <p className="text-[9px] opacity-80">歌单</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalPlays}</p>
            <p className="text-[9px] opacity-80">播放</p>
          </div>
        </div>
      </div>

      {current && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 overflow-hidden">
          <div className="relative h-32">
            <img src={current.cover} alt={current.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute bottom-2 left-2 right-2 text-white">
              <p className="text-base font-bold truncate">{current.title}</p>
              <p className="text-[10px] opacity-90 truncate">{current.artist} · {current.album}</p>
            </div>
            <button onClick={() => toggleFav(current.id)} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center">
              <Heart className={cn('w-4 h-4', current.favorite && 'fill-rose-500 text-rose-500')} />
            </button>
          </div>
          <div className="p-2">
            <div className="flex items-center gap-1.5 text-[9px] text-ink-500 mb-0.5">
              <span>{formatTime(position)}</span>
              <div className="flex-1 h-1 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500" style={{ width: `${(position / current.duration) * 100}%` }} />
              </div>
              <span>{formatTime(current.duration)}</span>
            </div>
            <div className="flex items-center justify-center gap-2 mt-1">
              <button onClick={() => setShuffle(!shuffle)} className={cn('w-8 h-8 rounded-full flex items-center justify-center', shuffle ? 'text-rose-500 bg-rose-100 dark:bg-rose-900/30' : 'text-ink-400')}>
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <button onClick={prev} className="w-9 h-9 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => setPlaying(!playing)} className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-lg">
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button onClick={next} className="w-9 h-9 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
                <SkipForward className="w-4 h-4" />
              </button>
              <button onClick={() => setRepeat(!repeat)} className={cn('w-8 h-8 rounded-full flex items-center justify-center', repeat ? 'text-rose-500 bg-rose-100 dark:bg-rose-900/30' : 'text-ink-400')}>
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Volume2 className="w-3 h-3 text-ink-500" />
              <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(+e.target.value)} className="flex-1" />
              <span className="text-[9px] text-ink-500 w-8">{volume}%</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setActiveList('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', activeList === 'all' ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
          全部
        </button>
        {playlists.map((p) => (
          <button key={p.id} onClick={() => setActiveList(p.id)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', activeList === p.id ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {p.emoji} {p.name}
          </button>
        ))}
        <button onClick={addPlaylist} className="px-3 h-7 rounded-full bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex-shrink-0">
          <Plus className="w-3 h-3 inline" />
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索..." className="w-full pl-8 pr-2 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setGenreFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', genreFilter === 'all' ? 'bg-pink-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部流派</button>
        {(Object.keys(GENRE_META) as Array<keyof typeof GENRE_META>).map((k) => (
          <button key={k} onClick={() => setGenreFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', genreFilter === k ? `bg-gradient-to-r ${GENRE_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {GENRE_META[k].label}
          </button>
        ))}
      </div>

      <div className="space-y-1">
        {filteredSongs.map((s, idx) => (
          <motion.div key={s.id} whileHover={{ y: -1 }} className={cn('rounded-xl p-2 flex items-center gap-2 cursor-pointer transition', currentId === s.id ? 'bg-rose-50 dark:bg-rose-900/30 border border-rose-300' : 'bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60')}>
            <span className="text-[10px] text-ink-500 w-5 text-center">{idx + 1}</span>
            <img src={s.cover} alt={s.title} className="w-10 h-10 rounded object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{s.title}</p>
              <p className="text-[10px] text-ink-500">{s.artist} · {s.album}</p>
            </div>
            <span className={cn('text-[9px] px-1.5 py-0.5 rounded text-white bg-gradient-to-r', GENRE_META[s.genre].color)}>{GENRE_META[s.genre].label}</span>
            <span className="text-[10px] text-ink-500">{formatTime(s.duration)}</span>
            <button onClick={(e) => { e.stopPropagation(); toggleFav(s.id) }}>
              <Heart className={cn('w-3.5 h-3.5', s.favorite ? 'fill-rose-500 text-rose-500' : 'text-ink-300')} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); play(s.id) }} className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center">
              <Play className="w-3 h-3 ml-0.5" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
