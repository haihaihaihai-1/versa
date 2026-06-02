import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, Play, Pause, SkipForward, Bell, MessageCircle, Heart, ShoppingCart, Check, Music } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface SoundPack {
  id: string
  name: string
  emoji: string
  type: 'notification' | 'message' | 'like' | 'order' | 'system'
  description: string
  volume: number
  selected: boolean
}

const SEED_SOUNDS: SoundPack[] = [
  { id: 'sp1', name: '默认提示音', emoji: '🔔', type: 'notification', description: '清脆短音', volume: 0.5, selected: true },
  { id: 'sp2', name: '轻快提示', emoji: '✨', type: 'notification', description: '魔法音', volume: 0.5, selected: false },
  { id: 'sp3', name: '软提示', emoji: '🌸', type: 'notification', description: '柔和', volume: 0.4, selected: false },
  { id: 'sp4', name: '无音效', emoji: '🔇', type: 'notification', description: '静音', volume: 0, selected: false },
  { id: 'sp5', name: '消息叮咚', emoji: '💬', type: 'message', description: '叮咚', volume: 0.6, selected: true },
  { id: 'sp6', name: '消息气泡', emoji: '🫧', type: 'message', description: '泡泡', volume: 0.5, selected: false },
  { id: 'sp7', name: '点赞叮', emoji: '❤️', type: 'like', description: '心动', volume: 0.5, selected: true },
  { id: 'sp8', name: '点赞欢呼', emoji: '🎉', type: 'like', description: '欢呼', volume: 0.6, selected: false },
  { id: 'sp9', name: '下单成功', emoji: '🛒', type: 'order', description: '清脆', volume: 0.7, selected: true },
  { id: 'sp10', name: '下单庆祝', emoji: '🎊', type: 'order', description: '庆祝', volume: 0.7, selected: false },
  { id: 'sp11', name: '系统提示', emoji: '⚙️', type: 'system', description: '科技', volume: 0.5, selected: true },
  { id: 'sp12', name: '复古提示', emoji: '📻', type: 'system', description: '8-bit', volume: 0.5, selected: false },
]

const TYPE_META = {
  notification: { label: '通知', icon: Bell, color: 'from-rose-500 to-pink-500' },
  message: { label: '消息', icon: MessageCircle, color: 'from-blue-500 to-indigo-500' },
  like: { label: '点赞', icon: Heart, color: 'from-pink-500 to-rose-500' },
  order: { label: '订单', icon: ShoppingCart, color: 'from-emerald-500 to-teal-500' },
  system: { label: '系统', icon: Volume2, color: 'from-violet-500 to-purple-500' },
} as const

const STORAGE_KEY = 'versa:sound-packs'
const PREVIEW_FREQS = [523, 587, 659, 698, 783, 880, 988, 1046, 1175]

function load(): SoundPack[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return SEED_SOUNDS }
function save(d: SoundPack[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function playTone(freq: number, dur: number, vol: number) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + dur)
  } catch {}
}

export function NotificationSoundPicker() {
  const [sounds, setSounds] = useState<SoundPack[]>(load())
  const [filter, setFilter] = useState<'all' | keyof typeof TYPE_META>('all')
  const [playing, setPlaying] = useState<string | null>(null)

  useEffect(() => { save(sounds) }, [sounds])

  const preview = (id: string) => {
    if (playing === id) { setPlaying(null); return }
    setPlaying(id)
    const s = sounds.find((x) => x.id === id)
    if (!s) return
    const seq = [PREVIEW_FREQS[Math.floor(Math.random() * PREVIEW_FREQS.length)], PREVIEW_FREQS[Math.floor(Math.random() * PREVIEW_FREQS.length)]]
    seq.forEach((f, i) => setTimeout(() => playTone(f, 0.15, s.volume), i * 120))
    setTimeout(() => setPlaying(null), 400)
  }

  const select = (id: string) => {
    const s = sounds.find((x) => x.id === id)
    if (!s) return
    setSounds((ss) => ss.map((x) => x.type === s.type ? { ...x, selected: x.id === id } : x))
    toast(`已选: ${s.name}`, 'success')
  }

  const updateVolume = (id: string, volume: number) => {
    setSounds((ss) => ss.map((x) => x.id === id ? { ...x, volume } : x))
  }

  const filtered = filter === 'all' ? sounds : sounds.filter((s) => s.type === filter)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Music className="w-5 h-5" />
          <h2 className="text-lg font-bold">音效选择</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">为不同事件设置专属音效</p>
        <div className="grid grid-cols-5 gap-1.5 text-center">
          {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
            const sel = sounds.find((s) => s.type === k && s.selected)
            const Icon = TYPE_META[k].icon
            return (
              <div key={k} className="bg-white/15 rounded-xl py-2">
                <Icon className="w-3.5 h-3.5 mx-auto mb-0.5" />
                <p className="text-[9px] opacity-90 truncate px-1">{sel?.name.split('')[0]}{sel?.name.length! > 2 ? '..' : ''}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'all' ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0 flex items-center gap-1', filter === k ? `bg-gradient-to-r ${TYPE_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {TYPE_META[k].label} ({sounds.filter((s) => s.type === k).length})
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.map((s) => {
          const Meta = TYPE_META[s.type]
          const Icon = Meta.icon
          return (
            <motion.div
              key={s.id}
              whileHover={{ y: -2 }}
              className={cn('p-2.5 rounded-xl border', s.selected ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-300' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}
            >
              <div className="flex items-center gap-2">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center text-white bg-gradient-to-br', Meta.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{s.emoji}</span>
                    <p className="text-sm font-semibold truncate">{s.name}</p>
                    {s.selected && <Check className="w-3 h-3 text-rose-500 flex-shrink-0" />}
                  </div>
                  <p className="text-[10px] text-ink-500">{s.description} · {Meta.label}</p>
                </div>
                <button
                  onClick={() => preview(s.id)}
                  className={cn('w-8 h-8 rounded-full flex items-center justify-center', playing === s.id ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
                >
                  {playing === s.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <button
                  onClick={() => select(s.id)}
                  className={cn('px-2 h-7 rounded-lg text-[10px] font-bold', s.selected ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}
                >
                  {s.selected ? '✓ 已选' : '选用'}
                </button>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <Volume2 className="w-3 h-3 text-ink-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={s.volume}
                  onChange={(e) => updateVolume(s.id, +e.target.value)}
                  className="flex-1 accent-rose-500"
                />
                <span className="text-[10px] text-ink-500 w-6 text-right">{Math.round(s.volume * 100)}%</span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
