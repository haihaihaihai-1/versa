import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { CloudRain, Trees, Coffee, Waves, Flame, Wind, Volume2, VolumeX, Plus, Trash2, Sparkles, Loader2, Play, Pause, Headphones } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Scene {
  id: string
  name: string
  emoji: string
  type: 'rain' | 'forest' | 'cafe' | 'ocean' | 'fire' | 'wind' | 'whitenoise' | 'fan' | 'stream' | 'birds'
  active: boolean
  volume: number
  color: string
}

const STORAGE_KEY = 'versa:ambient'

function load(): Scene[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [
  { id: 's1', name: '雨声', emoji: '🌧️', type: 'rain', active: true, volume: 60, color: 'from-blue-500 to-cyan-500' },
  { id: 's2', name: '森林', emoji: '🌲', type: 'forest', active: false, volume: 50, color: 'from-emerald-500 to-teal-500' },
  { id: 's3', name: '咖啡馆', emoji: '☕', type: 'cafe', active: false, volume: 50, color: 'from-amber-700 to-orange-600' },
] }
function save(d: Scene[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const SCENES: Scene[] = [
  { id: 'sr1', name: '雨声', emoji: '🌧️', type: 'rain', active: false, volume: 60, color: 'from-blue-500 to-cyan-500' },
  { id: 'sr2', name: '森林', emoji: '🌲', type: 'forest', active: false, volume: 50, color: 'from-emerald-500 to-teal-500' },
  { id: 'sr3', name: '咖啡馆', emoji: '☕', type: 'cafe', active: false, volume: 50, color: 'from-amber-700 to-orange-600' },
  { id: 'sr4', name: '海浪', emoji: '🌊', type: 'ocean', active: false, volume: 60, color: 'from-cyan-500 to-blue-500' },
  { id: 'sr5', name: '壁炉', emoji: '🔥', type: 'fire', active: false, volume: 50, color: 'from-orange-500 to-red-500' },
  { id: 'sr6', name: '风声', emoji: '💨', type: 'wind', active: false, volume: 40, color: 'from-slate-500 to-ink-500' },
  { id: 'sr7', name: '白噪音', emoji: '🔊', type: 'whitenoise', active: false, volume: 50, color: 'from-ink-500 to-slate-500' },
  { id: 'sr8', name: '电风扇', emoji: '🌀', type: 'fan', active: false, volume: 50, color: 'from-cyan-500 to-teal-500' },
  { id: 'sr9', name: '溪流', emoji: '💧', type: 'stream', active: false, volume: 50, color: 'from-teal-500 to-emerald-500' },
  { id: 'sr10', name: '鸟鸣', emoji: '🐦', type: 'birds', active: false, volume: 40, color: 'from-yellow-500 to-amber-500' },
]

const FREQ_PRESETS: Record<Scene['type'], { freqs: number[]; desc: string }> = {
  rain: { freqs: [200, 400, 800], desc: '雨滴的随机频率' },
  forest: { freqs: [300, 600, 1200], desc: '鸟鸣与树叶沙沙' },
  cafe: { freqs: [150, 300, 600], desc: '咖啡机与人声' },
  ocean: { freqs: [80, 160, 320], desc: '海浪起伏的低频' },
  fire: { freqs: [100, 200, 400], desc: '木柴燃烧的噼啪' },
  wind: { freqs: [400, 800, 1600], desc: '风的呼啸' },
  whitenoise: { freqs: [1000, 2000, 4000], desc: '纯白噪音' },
  fan: { freqs: [200, 400, 800], desc: '电扇旋转' },
  stream: { freqs: [300, 600, 1200], desc: '溪水流淌' },
  birds: { freqs: [800, 1600, 3200], desc: '鸟鸣高频率' },
}

function playNoise(type: Scene['type'], volume: number) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const freqs = FREQ_PRESETS[type].freqs
    const dur = 1.5
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain); gain.connect(ctx.destination)
    osc.frequency.value = freqs[Math.floor(Math.random() * freqs.length)]
    osc.type = 'sine'
    gain.gain.setValueAtTime(0, ctx.currentTime)
    gain.gain.linearRampToValueAtTime(volume / 200, ctx.currentTime + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + dur)
  } catch {}
}

export function AmbientSounds() {
  const [scenes, setScenes] = useState<Scene[]>(load())
  const [globalVolume, setGlobalVolume] = useState(70)
  const [masterOn, setMasterOn] = useState(true)
  const [aiRec, setAiRec] = useState('')
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<number | undefined>(undefined)

  useEffect(() => { save(scenes) }, [scenes])

  useEffect(() => {
    const activeScenes = scenes.filter((s) => s.active)
    if (activeScenes.length === 0 || !masterOn) {
      if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = undefined }
      return
    }
    intervalRef.current = window.setInterval(() => {
      activeScenes.forEach((s) => {
        if (Math.random() > 0.5) playNoise(s.type, (s.volume / 100) * (globalVolume / 100) * 100)
      })
    }, 1500)
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current) }
  }, [scenes, masterOn, globalVolume])

  const toggle = (id: string) => setScenes(scenes.map((s) => s.id === id ? { ...s, active: !s.active } : s))
  const setVolume = (id: string, v: number) => setScenes(scenes.map((s) => s.id === id ? { ...s, volume: v } : s))
  const add = (scene: Scene) => setScenes([...scenes, scene])
  const remove = (id: string) => setScenes(scenes.filter((s) => s.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 3 种适合专注的环境音组合 (50-80 字)', '你是 Versa 专注力教练, 简洁专业, 中文')
      setAiRec(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Headphones className="w-5 h-5" />
          <h2 className="text-lg font-bold">环境音</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">白噪音 · 多场景叠加 · 专注放松</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{scenes.filter((s) => s.active).length}</p>
            <p className="text-[10px] opacity-80">播放中</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{scenes.length}</p>
            <p className="text-[10px] opacity-80">已添加</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{SCENES.length}</p>
            <p className="text-[10px] opacity-80">总场景</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-2">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setMasterOn(!masterOn)} className={cn('w-10 h-10 rounded-full flex items-center justify-center', masterOn ? 'bg-cyan-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {masterOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <div className="flex-1">
            <input type="range" min="0" max="100" value={globalVolume} onChange={(e) => setGlobalVolume(+e.target.value)} className="w-full accent-cyan-500" />
            <p className="text-[10px] text-ink-500 text-center">主音量 {globalVolume}%</p>
          </div>
        </div>
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 推荐组合
      </button>

      {aiRec && (
        <div className="bg-cyan-50/40 dark:bg-cyan-900/20 rounded-xl p-2 border border-cyan-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiRec}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {scenes.map((s) => (
          <div key={s.id} className={cn('rounded-2xl p-3 border-2 transition', s.active ? `bg-gradient-to-br ${s.color} text-white border-white/30` : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-2xl">{s.emoji}</span>
              <p className="text-sm font-bold flex-1">{s.name}</p>
              <button onClick={() => remove(s.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
            </div>
            <button onClick={() => toggle(s.id)} className={cn('w-full h-7 rounded-lg text-xs font-bold', s.active ? 'bg-white/30 backdrop-blur' : 'bg-ink-100 dark:bg-ink-800')}>
              {s.active ? '播放中' : '点击播放'}
            </button>
            <input type="range" min="0" max="100" value={s.volume} onChange={(e) => setVolume(s.id, +e.target.value)} className={cn('w-full mt-1', s.active ? 'accent-white' : 'accent-cyan-500')} />
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-bold mb-1.5">添加场景</p>
        <div className="grid grid-cols-5 gap-1.5">
          {SCENES.filter((s) => !scenes.find((x) => x.type === s.type)).map((s) => (
            <button key={s.id} onClick={() => add(s)} className="aspect-square rounded-lg flex flex-col items-center justify-center bg-ink-100 dark:bg-ink-800 hover:bg-ink-200">
              <span className="text-xl">{s.emoji}</span>
              <span className="text-[9px] font-semibold mt-0.5">{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
