import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Volume2, VolumeX, Cloud, TreePine, Waves, Flame, Wind, Coffee, Sparkles, Loader2, Plus, Trash2 } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { toast } from './ui/Toaster'

interface AmbientSound {
  id: string
  name: string
  icon: any
  color: string
  frequency: number
  type: 'white' | 'pink' | 'brown' | 'sine' | 'custom'
  freqConfig: { [k: string]: number }
}

const SOUNDS: AmbientSound[] = [
  { id: 'rain', name: '雨声', icon: Cloud, color: 'from-blue-500 to-cyan-500', frequency: 0, type: 'white', freqConfig: { base: 200, range: 2000 } },
  { id: 'forest', name: '森林', icon: TreePine, color: 'from-emerald-500 to-green-500', frequency: 0, type: 'pink', freqConfig: { base: 100, range: 800 } },
  { id: 'ocean', name: '海浪', icon: Waves, color: 'from-cyan-500 to-blue-500', frequency: 0, type: 'brown', freqConfig: { base: 80, range: 400 } },
  { id: 'fire', name: '篝火', icon: Flame, color: 'from-orange-500 to-red-500', frequency: 0, type: 'pink', freqConfig: { base: 150, range: 600 } },
  { id: 'wind', name: '风声', icon: Wind, color: 'from-slate-500 to-gray-500', frequency: 0, type: 'white', freqConfig: { base: 300, range: 1500 } },
  { id: 'cafe', name: '咖啡馆', icon: Coffee, color: 'from-amber-600 to-orange-600', frequency: 0, type: 'pink', freqConfig: { base: 200, range: 1200 } },
  { id: 'binaural', name: '双耳节拍', icon: Sparkles, color: 'from-violet-500 to-purple-500', frequency: 432, type: 'sine', freqConfig: { base: 200, beat: 7 } },
  { id: 'silence', name: '静音', icon: VolumeX, color: 'from-ink-500 to-ink-600', frequency: 0, type: 'custom', freqConfig: {} },
]

interface ActiveChannel {
  id: string
  sound: AmbientSound
  volume: number
  audioCtx: AudioContext | null
  nodes: AudioNode[]
}

const STORAGE_KEY = 'versa:ambient-v1'

function loadFavs(): string[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return ['rain', 'fire'] }
function saveFavs(d: string[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function SoundLibrary() {
  const [active, setActive] = useState<ActiveChannel[]>([])
  const [masterVolume, setMasterVolume] = useState(0.4)
  const [favs, setFavs] = useState<string[]>(loadFavs())
  const masterGainRef = useRef<GainNode | null>(null)
  const masterCtxRef = useRef<AudioContext | null>(null)

  useEffect(() => { saveFavs(favs) }, [favs])

  const ensureMaster = () => {
    if (!masterCtxRef.current) {
      masterCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      const g = masterCtxRef.current.createGain()
      g.gain.value = masterVolume
      g.connect(masterCtxRef.current.destination)
      masterGainRef.current = g
    } else if (masterGainRef.current) {
      masterGainRef.current.gain.value = masterVolume
    }
    return { ctx: masterCtxRef.current, gain: masterGainRef.current }
  }

  const createNoiseBuffer = (ctx: AudioContext, type: 'white' | 'pink' | 'brown'): AudioBuffer => {
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    } else if (type === 'pink') {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
        b6 = white * 0.115926
      }
    } else { // brown
      let lastOut = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        lastOut = (lastOut + 0.02 * white) / 1.02
        data[i] = lastOut * 3.5
      }
    }
    return buffer
  }

  const toggle = (sound: AmbientSound) => {
    if (sound.id === 'silence') {
      stopAll()
      return
    }
    const existing = active.find((a) => a.id === sound.id)
    if (existing) {
      existing.nodes.forEach((n) => { try { (n as any).stop?.() } catch {} n.disconnect() })
      setActive(active.filter((a) => a.id !== sound.id))
      return
    }

    const { ctx, gain } = ensureMaster()
    const nodes: AudioNode[] = []
    const channelGain = ctx.createGain()
    channelGain.gain.value = 0.5
    channelGain.connect(gain!)
    nodes.push(channelGain)

    if (sound.type === 'white' || sound.type === 'pink' || sound.type === 'brown') {
      const buffer = createNoiseBuffer(ctx, sound.type)
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.loop = true
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = sound.freqConfig.range || 2000
      filter.Q.value = 0.5
      src.connect(filter)
      filter.connect(channelGain)
      src.start()
      nodes.push(src, filter)
    } else if (sound.type === 'sine' && sound.id === 'binaural') {
      // Binaural beats: play two slightly different frequencies in each ear
      const base = sound.freqConfig.base
      const beat = sound.freqConfig.beat
      const oscL = ctx.createOscillator()
      const oscR = ctx.createOscillator()
      oscL.frequency.value = base
      oscR.frequency.value = base + beat
      const merger = ctx.createChannelMerger(2)
      oscL.connect(merger, 0, 0)
      oscR.connect(merger, 0, 1)
      const gainL = ctx.createGain(); gainL.gain.value = 0.3
      const gainR = ctx.createGain(); gainR.gain.value = 0.3
      merger.connect(gainL); merger.connect(gainR)
      gainL.connect(channelGain); gainR.connect(channelGain)
      oscL.start(); oscR.start()
      nodes.push(oscL, oscR, merger, gainL, gainR)
    }

    setActive([...active, { id: sound.id, sound, volume: 50, audioCtx: ctx, nodes }])
    toast(`已开启 ${sound.name}`, 'success')
  }

  const stopAll = () => {
    active.forEach((a) => a.nodes.forEach((n) => { try { (n as any).stop?.() } catch {} n.disconnect() }))
    setActive([])
  }

  const setChannelVolume = (id: string, vol: number) => {
    const a = active.find((x) => x.id === id)
    if (a && a.nodes[0]) {
      (a.nodes[0] as GainNode).gain.value = (vol / 100) * 0.5
    }
    setActive(active.map((a) => a.id === id ? { ...a, volume: vol } : a))
  }

  const toggleFav = (id: string) => setFavs(favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id])

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Volume2 className="w-5 h-5" />
          <h2 className="text-lg font-bold">环境音库</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 种音 · 实时合成 · 多层混合</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{active.length}</p>
            <p className="text-[9px] opacity-80">播放</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{favs.length}</p>
            <p className="text-[9px] opacity-80">收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{SOUNDS.length}</p>
            <p className="text-[9px] opacity-80">种类</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{Math.round(masterVolume * 100)}%</p>
            <p className="text-[9px] opacity-80">主音量</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px] text-ink-500">主音量</span>
          <input type="range" min="0" max="100" value={masterVolume * 100} onChange={(e) => { const v = +e.target.value / 100; setMasterVolume(v); if (masterGainRef.current) masterGainRef.current.gain.value = v }} className="flex-1" />
          {active.length > 0 && <button onClick={stopAll} className="px-2 h-7 rounded-lg bg-rose-500 text-white text-[10px] font-bold">停止</button>}
        </div>
      </div>

      {active.length > 0 && (
        <div className="rounded-2xl bg-blue-50/40 dark:bg-blue-900/20 p-2 border border-blue-200/40">
          <p className="text-xs font-semibold mb-1.5">🎚️ 当前混合</p>
          {active.map((a) => {
            const Icon = a.sound.icon
            return (
              <div key={a.id} className="flex items-center gap-1.5 mb-1">
                <div className={cn('w-6 h-6 rounded flex items-center justify-center text-white bg-gradient-to-br flex-shrink-0', a.sound.color)}>
                  <Icon className="w-3 h-3" />
                </div>
                <span className="text-[10px] font-semibold w-12">{a.sound.name}</span>
                <input type="range" min="0" max="100" value={a.volume} onChange={(e) => setChannelVolume(a.id, +e.target.value)} className="flex-1" />
                <span className="text-[10px] text-ink-500 w-8 text-right">{a.volume}%</span>
              </div>
            )
          })}
        </div>
      )}

      <div>
        <p className="text-xs font-semibold mb-1.5">所有声音</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SOUNDS.map((s) => {
            const Icon = s.icon
            const isActive = active.some((a) => a.id === s.id)
            return (
              <button key={s.id} onClick={() => toggle(s)} className={cn('rounded-2xl p-3 text-left transition border', isActive ? `bg-gradient-to-br ${s.color} text-white border-transparent` : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
                <div className="flex items-center gap-1.5 mb-1">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', isActive ? 'bg-white/20' : `bg-gradient-to-br ${s.color}`)}>
                    <Icon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-white')} />
                  </div>
                  <p className={cn('text-sm font-bold', isActive ? 'text-white' : '')}>{s.name}</p>
                  <button onClick={(e) => { e.stopPropagation(); toggleFav(s.id) }} className="ml-auto">
                    <span className={cn('text-xs', favs.includes(s.id) ? 'text-amber-400' : isActive ? 'text-white/50' : 'text-ink-300')}>★</span>
                  </button>
                </div>
                <p className={cn('text-[9px] capitalize', isActive ? 'text-white/80' : 'text-ink-500')}>{s.type === 'sine' ? '双耳节拍' : `${s.type} noise`}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
