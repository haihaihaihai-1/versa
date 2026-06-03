import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Wind, Play, Pause, RotateCcw, Activity, Heart, Sparkles, Loader2, Sun, Moon, Wind as WindIcon, Brain, Check } from 'lucide-react'
import { cn } from '../lib/utils'
import { toast } from './ui/Toaster'

interface Pattern {
  id: string
  name: string
  description: string
  inhale: number
  hold1: number
  exhale: number
  hold2: number
  benefit: string
  color: string
  icon: any
}

const PATTERNS: Pattern[] = [
  { id: '478', name: '4-7-8 呼吸', description: '入睡助眠经典', inhale: 4, hold1: 7, exhale: 8, hold2: 0, benefit: '镇静神经, 帮助入睡', color: 'from-indigo-500 to-violet-500', icon: Moon },
  { id: 'box', name: '方块呼吸', description: '专注平衡', inhale: 4, hold1: 4, exhale: 4, hold2: 4, benefit: '提升专注, 减压', color: 'from-blue-500 to-cyan-500', icon: Activity },
  { id: 'coherent', name: '共鸣呼吸', description: '心率变异', inhale: 5, hold1: 0, exhale: 5, hold2: 0, benefit: '平衡自主神经', color: 'from-emerald-500 to-teal-500', icon: Heart },
  { id: 'deep', name: '深度呼吸', description: '能量提升', inhale: 6, hold1: 2, exhale: 6, hold2: 0, benefit: '增加血氧, 提神', color: 'from-amber-500 to-orange-500', icon: Sun },
  { id: 'wim', name: '维姆呼吸', description: '极限挑战', inhale: 8, hold1: 0, exhale: 8, hold2: 0, benefit: '快速放松, 增强意志', color: 'from-rose-500 to-pink-500', icon: Sparkles },
]

type Phase = 'inhale' | 'hold1' | 'exhale' | 'hold2'

function playBell(freq = 528) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = freq
    g.gain.setValueAtTime(0.1, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
    o.start(); o.stop(ctx.currentTime + 1.2)
  } catch {}
}

function playClick() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 800
    g.gain.setValueAtTime(0.05, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)
    o.start(); o.stop(ctx.currentTime + 0.05)
  } catch {}
}

export function BreathingExercise() {
  const [activeId, setActiveId] = useState<string>('478')
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<Phase>('inhale')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [totalCycles, setTotalCycles] = useState(0)
  const [currentCycle, setCurrentCycle] = useState(0)
  const [targetCycles, setTargetCycles] = useState(10)
  const tickRef = useRef<number | undefined>(undefined)

  const pattern = PATTERNS.find((p) => p.id === activeId)!
  const Icon = pattern.icon

  const getPhaseDuration = (p: Phase) => {
    if (p === 'inhale') return pattern.inhale
    if (p === 'hold1') return pattern.hold1
    if (p === 'exhale') return pattern.exhale
    return pattern.hold2
  }

  const getNextPhase = (p: Phase): Phase => {
    if (p === 'inhale') return pattern.hold1 > 0 ? 'hold1' : 'exhale'
    if (p === 'hold1') return 'exhale'
    if (p === 'exhale') return pattern.hold2 > 0 ? 'hold2' : 'inhale'
    return 'inhale'
  }

  useEffect(() => {
    if (running) {
      tickRef.current = window.setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            const nextP = getNextPhase(phase)
            if (nextP === 'inhale') {
              const newCycle = currentCycle + 1
              if (newCycle >= targetCycles) {
                setRunning(false)
                playBell(528)
                toast(`✓ 完成 ${targetCycles} 轮!`, 'success')
                setCurrentCycle(0)
                setPhase('inhale')
                return pattern.inhale
              }
              setCurrentCycle(newCycle)
              setTotalCycles((c) => c + 1)
            }
            setPhase(nextP)
            playClick()
            return getPhaseDuration(nextP)
          }
          return s - 1
        })
      }, 1000)
    } else if (tickRef.current) {
      window.clearInterval(tickRef.current)
    }
    return () => { if (tickRef.current) window.clearInterval(tickRef.current) }
  }, [running, phase, pattern, currentCycle, targetCycles])

  const start = () => {
    setRunning(true)
    setPhase('inhale')
    setSecondsLeft(pattern.inhale)
    setCurrentCycle(0)
    playBell(396)
  }

  const stop = () => {
    setRunning(false)
    setPhase('inhale')
    setSecondsLeft(0)
    setCurrentCycle(0)
  }

  const totalDuration = pattern.inhale + pattern.hold1 + pattern.exhale + pattern.hold2
  const phaseProgress = (1 - secondsLeft / Math.max(1, getPhaseDuration(phase))) * 100
  const phaseText = { inhale: '吸气', hold1: '屏息', exhale: '呼气', hold2: '屏息' }[phase]
  const phaseColor = { inhale: 'text-cyan-500', hold1: 'text-amber-500', exhale: 'text-emerald-500', hold2: 'text-rose-500' }[phase]

  // Circle scale based on phase
  const scale = phase === 'inhale' ? 1.4 : phase === 'exhale' ? 0.8 : 1.0

  return (
    <div className="space-y-3">
      <div className={`rounded-2xl bg-gradient-to-br ${pattern.color} p-3 text-white`}>
        <div className="flex items-center gap-2 mb-1">
          <Wind className="w-5 h-5" />
          <h2 className="text-lg font-bold">呼吸引导</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">5 种模式 · 视觉化引导 · 计数器</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{PATTERNS.length}</p>
            <p className="text-[9px] opacity-80">模式</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalCycles}</p>
            <p className="text-[9px] opacity-80">总轮</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{currentCycle}</p>
            <p className="text-[9px] opacity-80">本轮</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalDuration}s</p>
            <p className="text-[9px] opacity-80">单轮</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-6 border border-ink-200/60 dark:border-ink-800/60 flex flex-col items-center">
        <div className="relative w-40 h-40 mb-3 flex items-center justify-center">
          <motion.div
            animate={{ scale: running ? scale : 1 }}
            transition={{ duration: secondsLeft > 0 ? secondsLeft : 1, ease: 'easeInOut' }}
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${pattern.color} opacity-30`}
          />
          <motion.div
            animate={{ scale: running ? scale * 0.7 : 0.7 }}
            transition={{ duration: secondsLeft > 0 ? secondsLeft : 1, ease: 'easeInOut' }}
            className={`absolute inset-6 rounded-full bg-gradient-to-br ${pattern.color} opacity-50`}
          />
          <div className="relative z-10 text-center">
            <Icon className="w-8 h-8 text-white mx-auto mb-1" />
            <p className={`text-2xl font-bold ${phaseColor} bg-white/90 dark:bg-ink-900/90 px-2 py-1 rounded-lg`}>
              {running ? phaseText : '准备'}
            </p>
            {running && <p className="text-3xl font-bold text-white tabular-nums mt-1">{secondsLeft}</p>}
          </div>
        </div>

        {running ? (
          <button onClick={stop} className="w-32 h-10 rounded-xl bg-ink-100 dark:bg-ink-800 text-sm font-semibold flex items-center justify-center gap-1">
            <Pause className="w-3.5 h-3.5" />停止
          </button>
        ) : (
          <button onClick={start} className={`w-32 h-10 rounded-xl bg-gradient-to-r ${pattern.color} text-white text-sm font-bold flex items-center justify-center gap-1`}>
            <Play className="w-3.5 h-3.5" />开始
          </button>
        )}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
        <p className="text-xs font-semibold mb-1.5">目标轮数: {targetCycles} 轮 (~{Math.round((targetCycles * totalDuration) / 60)} 分钟)</p>
        <div className="flex gap-1.5">
          {[3, 5, 10, 20, 30].map((n) => (
            <button key={n} onClick={() => setTargetCycles(n)} disabled={running} className={cn('flex-1 h-8 rounded-lg text-[10px] font-semibold disabled:opacity-50', targetCycles === n ? `bg-gradient-to-r ${pattern.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
              {n} 轮
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold mb-1.5">呼吸模式</p>
        <div className="space-y-1.5">
          {PATTERNS.map((p) => {
            const PIcon = p.icon
            return (
              <button key={p.id} onClick={() => { if (!running) setActiveId(p.id) }} className={cn('w-full rounded-2xl p-2 border text-left transition', activeId === p.id ? `bg-gradient-to-r ${p.color} text-white border-transparent` : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
                <div className="flex items-center gap-2">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', activeId === p.id ? 'bg-white/20' : `bg-gradient-to-br ${p.color}`)}>
                    <PIcon className={cn('w-4 h-4', activeId === p.id ? 'text-white' : 'text-white')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-bold', activeId === p.id ? 'text-white' : '')}>{p.name}</p>
                    <p className={cn('text-[10px]', activeId === p.id ? 'opacity-90' : 'text-ink-500')}>
                      {p.description} · 吸{p.inhale}s · {p.hold1 > 0 ? `屏${p.hold1}s · ` : ''}呼{p.exhale}s{p.hold2 > 0 ? ` · 屏${p.hold2}s` : ''}
                    </p>
                  </div>
                  {activeId === p.id && <Check className="w-4 h-4 text-white" />}
                </div>
                {activeId === p.id && <p className="text-[10px] mt-1 opacity-90">✨ {p.benefit}</p>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
