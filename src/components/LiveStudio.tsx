import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Video, Mic, MicOff, Camera, Settings, Eye, Users, Gift, Heart, Loader2, Play, Pause, Square, RotateCw, Sparkles, BarChart3, Volume2 } from 'lucide-react'
import { cn, formatNumber, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Scene {
  id: string
  name: string
  emoji: string
  layout: 'full' | 'pip' | 'split' | 'grid'
  description: string
}

interface Camera {
  id: string
  name: string
  active: boolean
  resolution: string
}

interface Mic {
  id: string
  name: string
  active: boolean
  level: number
}

const SCENES: Scene[] = [
  { id: 's1', name: '主镜头', emoji: '🎥', layout: 'full', description: '主播居中特写' },
  { id: 's2', name: '产品展示', emoji: '🛍️', layout: 'pip', description: '画中画, 适合带货' },
  { id: 's3', name: '双人对谈', emoji: '👥', layout: 'split', description: '左右分屏' },
  { id: 's4', name: '嘉宾席', emoji: '🎤', layout: 'grid', description: '2x2 网格' },
]

const SEED_CAMERAS: Camera[] = [
  { id: 'c1', name: '主摄像头', active: true, resolution: '1080p' },
  { id: 'c2', name: '俯拍摄像头', active: false, resolution: '4K' },
  { id: 'c3', name: '侧拍摄像头', active: false, resolution: '720p' },
]

const SEED_MICS: Mic[] = [
  { id: 'm1', name: '主麦克风', active: true, level: 65 },
  { id: 'm2', name: '领夹麦', active: false, level: 30 },
  { id: 'm3', name: '环境麦', active: true, level: 20 },
]

const STORAGE_KEY = 'versa:live-studio'

interface State {
  currentScene: string
  cameras: Camera[]
  mics: Mic[]
  isLive: boolean
  duration: number
  viewers: number
  likes: number
  gifts: number
}

function load(): State {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return { currentScene: 's1', cameras: SEED_CAMERAS, mics: SEED_MICS, isLive: false, duration: 0, viewers: 0, likes: 0, gifts: 0 }
}
function save(d: State) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

export function LiveStudio() {
  const [state, setState] = useState<State>(load())
  const [aiTitle, setAiTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<number | undefined>(undefined)

  useEffect(() => { save(state) }, [state])

  useEffect(() => {
    if (state.isLive) {
      intervalRef.current = window.setInterval(() => {
        setState((s) => ({
          ...s,
          duration: s.duration + 1,
          viewers: Math.max(0, s.viewers + Math.floor((Math.random() - 0.4) * 20)),
          likes: s.likes + Math.floor(Math.random() * 8),
          gifts: s.gifts + Math.floor(Math.random() * 3),
        }))
      }, 1000)
    } else {
      if (intervalRef.current) { window.clearInterval(intervalRef.current); intervalRef.current = undefined }
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current) }
  }, [state.isLive])

  const setScene = (id: string) => { setState({ ...state, currentScene: id }); toast(`已切到: ${SCENES.find((s) => s.id === id)?.name}`, 'info') }
  const toggleCam = (id: string) => setState({ ...state, cameras: state.cameras.map((c) => c.id === id ? { ...c, active: !c.active } : c) })
  const toggleMic = (id: string) => setState({ ...state, mics: state.mics.map((m) => m.id === id ? { ...m, active: !m.active } : m) })
  const updateLevel = (id: string, level: number) => setState({ ...state, mics: state.mics.map((m) => m.id === id ? { ...m, level } : m) })

  const startLive = () => {
    if (!aiTitle.trim()) { toast('请先填写直播标题', 'error'); return }
    setState({ ...state, isLive: true, duration: 0, viewers: 12, likes: 0, gifts: 0 })
    toast('🔴 直播已开始', 'success')
  }
  const stopLive = () => {
    setState({ ...state, isLive: false })
    toast('直播已结束', 'info')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为一个数码带货直播生成 1 个吸引人的标题 (15-25 字, 含 emoji)', '你是 Versa 直播策划, 简洁有吸引力, 中文')
      setAiTitle(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const formatDur = (sec: number) => {
    const h = Math.floor(sec / 3600)
    const m = Math.floor((sec % 3600) / 60)
    const s = sec % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const currentScene = SCENES.find((s) => s.id === state.currentScene) || SCENES[0]
  const activeCams = state.cameras.filter((c) => c.active).length

  return (
    <div className="space-y-3">
      <div className={cn('rounded-2xl p-3 text-white', state.isLive ? 'bg-gradient-to-br from-rose-500 via-red-500 to-pink-500' : 'bg-gradient-to-br from-slate-700 to-slate-900')}>
        <div className="flex items-center gap-2 mb-1">
          {state.isLive && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
          <Video className="w-5 h-5" />
          <h2 className="text-lg font-bold">主播工作台</h2>
        </div>
        {state.isLive ? (
          <>
            <p className="text-xs opacity-90 mb-2">直播中 · {formatDur(state.duration)}</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/15 rounded-xl py-2">
                <p className="text-lg font-bold">{formatNumber(state.viewers)}</p>
                <p className="text-[10px] opacity-80">观众</p>
              </div>
              <div className="bg-white/15 rounded-xl py-2">
                <p className="text-lg font-bold">{formatNumber(state.likes)}</p>
                <p className="text-[10px] opacity-80">点赞</p>
              </div>
              <div className="bg-white/15 rounded-xl py-2">
                <p className="text-lg font-bold">{formatNumber(state.gifts)}</p>
                <p className="text-[10px] opacity-80">礼物</p>
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs opacity-90 mb-2">准备开播 · {activeCams} 路画面 · {state.mics.filter((m) => m.active).length} 路麦克风</p>
        )}
      </div>

      <div className="aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          {currentScene.layout === 'full' && <Camera className="w-16 h-16 text-slate-600" />}
          {currentScene.layout === 'pip' && (
            <div className="relative w-full h-full">
              <Camera className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 text-slate-600" />
              <div className="absolute bottom-3 right-3 w-20 h-14 rounded-lg bg-slate-700 border-2 border-slate-500 flex items-center justify-center">
                <Camera className="w-6 h-6 text-slate-400" />
              </div>
            </div>
          )}
          {currentScene.layout === 'split' && (
            <div className="grid grid-cols-2 gap-1 w-full h-full p-1">
              <div className="rounded-lg bg-slate-700 flex items-center justify-center"><Camera className="w-8 h-8 text-slate-500" /></div>
              <div className="rounded-lg bg-slate-700 flex items-center justify-center"><Camera className="w-8 h-8 text-slate-500" /></div>
            </div>
          )}
          {currentScene.layout === 'grid' && (
            <div className="grid grid-cols-2 grid-rows-2 gap-1 w-full h-full p-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="rounded-lg bg-slate-700 flex items-center justify-center"><Camera className="w-6 h-6 text-slate-500" /></div>
              ))}
            </div>
          )}
        </div>

        {state.isLive && (
          <>
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-rose-500 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[10px] font-bold">LIVE</span>
            </div>
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded-full text-[10px] font-mono">
              {formatDur(state.duration)}
            </div>
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
              <Eye className="w-2.5 h-2.5" />{formatNumber(state.viewers)}
            </div>
            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
              <Heart className="w-2.5 h-2.5" />{formatNumber(state.likes)}
            </div>
          </>
        )}
      </div>

      <div>
        <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" />摄像头 ({state.cameras.filter((c) => c.active).length}/{state.cameras.length})</p>
        <div className="space-y-1">
          {state.cameras.map((c) => (
            <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
              <Camera className="w-4 h-4 text-ink-500" />
              <div className="flex-1">
                <p className="text-xs font-semibold">{c.name}</p>
                <p className="text-[10px] text-ink-500">{c.resolution}</p>
              </div>
              <span className={cn('w-2 h-2 rounded-full', c.active ? 'bg-emerald-500' : 'bg-ink-300')} />
              <button onClick={() => toggleCam(c.id)} className={cn('w-12 h-6 rounded-full transition', c.active ? 'bg-emerald-500' : 'bg-ink-300 dark:bg-ink-700')}>
                <motion.div animate={{ x: c.active ? 24 : 2 }} className="w-5 h-5 rounded-full bg-white shadow mt-0.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold mb-1.5 flex items-center gap-1.5"><Mic className="w-3.5 h-3.5" />麦克风</p>
        <div className="space-y-1">
          {state.mics.map((m) => (
            <div key={m.id} className="p-2 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-center gap-2 mb-1.5">
                {m.active ? <Mic className="w-4 h-4 text-emerald-500" /> : <MicOff className="w-4 h-4 text-ink-400" />}
                <span className="flex-1 text-xs font-semibold">{m.name}</span>
                <button onClick={() => toggleMic(m.id)} className={cn('w-12 h-6 rounded-full transition', m.active ? 'bg-emerald-500' : 'bg-ink-300 dark:bg-ink-700')}>
                  <motion.div animate={{ x: m.active ? 24 : 2 }} className="w-5 h-5 rounded-full bg-white shadow mt-0.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-3 h-3 text-ink-400" />
                <input type="range" min="0" max="100" value={m.level} onChange={(e) => updateLevel(m.id, +e.target.value)} className="flex-1 accent-emerald-500" disabled={!m.active} />
                <span className="text-[10px] text-ink-500 w-6 text-right">{m.level}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold mb-1.5">直播场景</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SCENES.map((s) => (
            <button
              key={s.id}
              onClick={() => setScene(s.id)}
              className={cn('p-2 rounded-xl border text-left', state.currentScene === s.id ? 'bg-rose-50 dark:bg-rose-900/30 border-rose-300' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-lg">{s.emoji}</span>
                <span className="text-xs font-bold flex-1">{s.name}</span>
                {state.currentScene === s.id && <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500 text-white font-bold">当前</span>}
              </div>
              <p className="text-[10px] text-ink-500 mt-0.5">{s.description}</p>
            </button>
          ))}
        </div>
      </div>

      <input value={aiTitle} onChange={(e) => setAiTitle(e.target.value)} placeholder="直播标题" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-rose-500" />

      <div className="flex gap-1.5">
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 起标题
        </button>
        {state.isLive ? (
          <button onClick={stopLive} className="flex-1 h-9 rounded-lg bg-rose-500 text-white text-sm font-bold flex items-center justify-center gap-1">
            <Square className="w-3.5 h-3.5" />结束直播
          </button>
        ) : (
          <button onClick={startLive} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 text-white text-sm font-bold flex items-center justify-center gap-1">
            <Play className="w-3.5 h-3.5" />开始直播
          </button>
        )}
      </div>
    </div>
  )
}
