import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wind, Heart, Sparkles, Loader2, Play, Pause, RotateCcw, Smile, Meh, Frown, Volume2, VolumeX, History, Trophy, BookHeart } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface MoodEntry { id: string; mood: 'great' | 'good' | 'ok' | 'bad' | 'awful'; note: string; at: number }

const STORAGE_KEY = 'versa:meditation'

function load(): { totalMinutes: number; sessions: number; moods: MoodEntry[] } {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {}
  return { totalMinutes: 124, sessions: 18, moods: [
    { id: 'm1', mood: 'good', note: '今天很平静, 顺利完成番茄钟', at: Date.now() - 86400000 },
    { id: 'm2', mood: 'great', note: '冥想后思路清晰很多', at: Date.now() - 86400000 * 2 },
  ] }
}
function save(d: any) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const MOOD_META = {
  great: { label: '极好', emoji: '😄', color: 'from-emerald-500 to-teal-500' },
  good: { label: '不错', emoji: '🙂', color: 'from-cyan-500 to-blue-500' },
  ok: { label: '一般', emoji: '😐', color: 'from-amber-500 to-orange-500' },
  bad: { label: '不好', emoji: '😔', color: 'from-orange-500 to-rose-500' },
  awful: { label: '糟糕', emoji: '😢', color: 'from-rose-500 to-pink-500' },
} as const

const SCENES = [
  { id: 'sc1', name: '晨间唤醒', emoji: '🌅', desc: '5 分钟唤醒身心', mins: 5, color: 'from-amber-400 to-orange-400' },
  { id: 'sc2', name: '专注呼吸', emoji: '🍃', desc: '10 分钟深度呼吸', mins: 10, color: 'from-emerald-500 to-teal-500' },
  { id: 'sc3', name: '压力释放', emoji: '💆', desc: '15 分钟身体扫描', mins: 15, color: 'from-violet-500 to-purple-500' },
  { id: 'sc4', name: '睡前放松', emoji: '🌙', desc: '20 分钟深度放松', mins: 20, color: 'from-indigo-500 to-blue-500' },
]

type Phase = 'inhale' | 'hold' | 'exhale' | 'rest'

export function MeditationSpace() {
  const [data, setData] = useState(load())
  const [scene, setScene] = useState(SCENES[0])
  const [active, setActive] = useState(false)
  const [phase, setPhase] = useState<Phase>('inhale')
  const [elapsed, setElapsed] = useState(0)
  const [soundOn, setSoundOn] = useState(true)
  const [moodOpen, setMoodOpen] = useState(false)
  const [moodNote, setMoodNote] = useState('')
  const [moodSel, setMoodSel] = useState<keyof typeof MOOD_META>('good')
  const [aiQuote, setAiQuote] = useState('')
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<number | undefined>(undefined)
  const phaseRef = useRef<number>(0)
  const phaseOrder: Phase[] = ['inhale', 'hold', 'exhale', 'rest']
  const phaseDur: Record<Phase, number> = { inhale: 4, hold: 4, exhale: 6, rest: 2 }

  useEffect(() => { save(data) }, [data])

  useEffect(() => {
    if (active) {
      intervalRef.current = window.setInterval(() => {
        setElapsed((e) => e + 1)
        phaseRef.current++
        const totalCycle = phaseDur.inhale + phaseDur.hold + phaseDur.exhale + phaseDur.rest
        const pos = phaseRef.current % totalCycle
        if (pos < phaseDur.inhale) setPhase('inhale')
        else if (pos < phaseDur.inhale + phaseDur.hold) setPhase('hold')
        else if (pos < phaseDur.inhale + phaseDur.hold + phaseDur.exhale) setPhase('exhale')
        else setPhase('rest')
        if (soundOn && phaseRef.current % 4 === 0) playTone(440, 0.2)
      }, 1000)
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
      phaseRef.current = 0
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current) }
  }, [active, soundOn])

  const playTone = (f: number, dur: number) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = f
      gain.gain.setValueAtTime(0, ctx.currentTime)
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + dur)
    } catch {}
  }

  const start = () => { setActive(true); setElapsed(0); phaseRef.current = 0 }
  const stop = () => {
    setActive(false)
    setData((d) => ({ ...d, totalMinutes: d.totalMinutes + Math.floor(elapsed / 60), sessions: d.sessions + 1 }))
    toast('冥想完成 🎉', 'success')
  }
  const reset = () => { setActive(false); setElapsed(0); phaseRef.current = 0 }

  const addMood = () => {
    setData((d) => ({ ...d, moods: [{ id: uid(), mood: moodSel, note: moodNote, at: Date.now() }, ...d.moods] }))
    setMoodNote(''); setMoodOpen(false)
    toast('心情已记录', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('生成 1 段 30 字的中文冥想引导词, 温柔治愈', '你是 Versa 冥想导师')
      setAiQuote(result)
    } catch (e: any) { toast(e?.message || '生成失败', 'error') } finally { setLoading(false) }
  }

  const mins = Math.floor(elapsed / 60)
  const secs = elapsed % 60
  const phaseLabel = phase === 'inhale' ? '吸气' : phase === 'hold' ? '屏息' : phase === 'exhale' ? '呼气' : '停顿'
  const scale = phase === 'inhale' ? 1.4 : phase === 'hold' ? 1.4 : phase === 'exhale' ? 0.9 : 0.9

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Wind className="w-5 h-5" />
          <h2 className="text-lg font-bold">冥想空间</h2>
          <button onClick={() => setSoundOn(!soundOn)} className="ml-auto">
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs opacity-90 mb-2">呼吸 · 专注 · 平静</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{data.totalMinutes}</p>
            <p className="text-[10px] opacity-80">总分钟</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{data.sessions}</p>
            <p className="text-[10px] opacity-80">次数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{data.moods.length}</p>
            <p className="text-[10px] opacity-80">心情</p>
          </div>
        </div>
      </div>

      <div className={cn('rounded-2xl p-6 text-white bg-gradient-to-br', scene.color)}>
        <div className="text-center">
          <p className="text-xs opacity-90 mb-1">{scene.emoji} {scene.name} · {scene.desc}</p>
          <motion.div
            animate={{ scale }}
            transition={{ duration: phase === 'inhale' ? 4 : phase === 'exhale' ? 6 : 0.3, ease: 'easeInOut' }}
            className="w-32 h-32 mx-auto my-4 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"
          >
            <p className="text-2xl font-bold">{phaseLabel}</p>
          </motion.div>
          <p className="text-3xl font-bold font-mono">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</p>
          <p className="text-xs opacity-80 mt-1">目标: {scene.mins} 分钟</p>
          <div className="flex justify-center gap-1.5 mt-3">
            {active ? (
              <>
                <button onClick={stop} className="px-4 h-9 rounded-full bg-white/20 backdrop-blur text-sm font-semibold">结束</button>
                <button onClick={reset} className="w-9 h-9 rounded-full bg-white/20 backdrop-blur flex items-center justify-center"><RotateCcw className="w-4 h-4" /></button>
              </>
            ) : (
              <button onClick={start} className="px-6 h-10 rounded-full bg-white text-violet-500 text-sm font-bold flex items-center gap-1">
                <Play className="w-4 h-4" />开始冥想
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {SCENES.map((s) => (
          <button key={s.id} onClick={() => { setScene(s); reset() }} className={cn('p-2.5 rounded-2xl text-white bg-gradient-to-br', s.color, scene.id === s.id ? 'ring-2 ring-white shadow-lg' : 'opacity-70')}>
            <p className="text-lg">{s.emoji}</p>
            <p className="text-xs font-bold">{s.name}</p>
            <p className="text-[10px] opacity-80">{s.mins} 分钟</p>
          </button>
        ))}
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 冥想引导
      </button>

      {aiQuote && (
        <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-3 border border-violet-200/40">
          <p className="text-xs italic text-violet-700 dark:text-violet-300 leading-relaxed">"{aiQuote}"</p>
        </div>
      )}

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-bold flex items-center gap-1.5"><BookHeart className="w-3.5 h-3.5" />心情日记</p>
          <button onClick={() => setMoodOpen(true)} className="px-2 h-6 rounded bg-violet-500 text-white text-[10px] font-bold">+ 记录</button>
        </div>
        <div className="space-y-1.5">
          {data.moods.slice(0, 5).map((m) => {
            const Meta = MOOD_META[m.mood]
            return (
              <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-ink-50/30 dark:bg-ink-800/30">
                <span className="text-2xl">{Meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs line-clamp-1">{m.note || '心情记录'}</p>
                  <p className="text-[9px] text-ink-500">{Meta.label} · {formatTimeAgo(new Date(m.at).toISOString())}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {moodOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setMoodOpen(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-3">
            <h3 className="font-bold">记录心情</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {(Object.keys(MOOD_META) as Array<keyof typeof MOOD_META>).map((k) => (
                <button key={k} onClick={() => setMoodSel(k)} className={cn('h-16 rounded-xl flex flex-col items-center justify-center gap-0.5', moodSel === k ? `bg-gradient-to-br ${MOOD_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                  <span className="text-2xl">{MOOD_META[k].emoji}</span>
                  <span className="text-[9px] font-semibold">{MOOD_META[k].label}</span>
                </button>
              ))}
            </div>
            <textarea value={moodNote} onChange={(e) => setMoodNote(e.target.value)} placeholder="说说你的感受..." rows={3} className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
            <button onClick={addMood} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-sm font-semibold">保存</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
