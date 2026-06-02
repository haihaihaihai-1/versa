import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Activity, Sparkles, Loader2, Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Plus, Trash2, Timer, Heart } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Stretch {
  id: string
  name: string
  bodyPart: 'neck' | 'shoulder' | 'back' | 'arm' | 'leg' | 'wrist' | 'eye' | 'core'
  duration: number
  description: string
  steps: string[]
  emoji: string
  difficulty: 'easy' | 'medium' | 'hard'
}

const STRETCHES: Stretch[] = [
  { id: 's1', name: '颈部伸展', bodyPart: 'neck', duration: 30, description: '缓解久坐导致的颈部僵硬', steps: ['头慢慢向右倾', '保持 15 秒', '换边重复', '向前向后各 5 次'], emoji: '🧎', difficulty: 'easy' },
  { id: 's2', name: '肩部环绕', bodyPart: 'shoulder', duration: 45, description: '放松紧绷的肩部肌肉', steps: ['双手搭在肩上', '向前绕 10 圈', '向后绕 10 圈', '深呼吸'], emoji: '💪', difficulty: 'easy' },
  { id: 's3', name: '猫牛式', bodyPart: 'back', duration: 60, description: '活化整条脊柱', steps: ['跪姿, 手膝着地', '吸气: 凹背抬头', '呼气: 弓背低头', '重复 10 次'], emoji: '🐱', difficulty: 'medium' },
  { id: 's4', name: '墙壁俯卧撑', bodyPart: 'arm', duration: 45, description: '办公室也能练手臂', steps: ['面对墙站立', '双手撑墙', '身体前倾弯曲手肘', '重复 15 次'], emoji: '🧱', difficulty: 'easy' },
  { id: 's5', name: '椅子下蹲', bodyPart: 'leg', duration: 60, description: '激活下肢', steps: ['站在椅子前', '缓慢下蹲触碰椅子', '立即站起', '重复 10 次'], emoji: '🦵', difficulty: 'medium' },
  { id: 's6', name: '手腕旋转', bodyPart: 'wrist', duration: 20, description: '缓解鼠标手', steps: ['双手握拳', '顺时针转 10 圈', '逆时针转 10 圈', '拉伸手指'], emoji: '✋', difficulty: 'easy' },
  { id: 's7', name: '20-20-20 眼保健', bodyPart: 'eye', duration: 20, description: '看 20 尺外 20 秒', steps: ['每工作 20 分钟', '看 20 英尺外物体', '保持 20 秒', '眨眨眼'], emoji: '👀', difficulty: 'easy' },
  { id: 's8', name: '平板支撑', bodyPart: 'core', duration: 60, description: '强化核心肌群', steps: ['俯卧, 前臂撑地', '身体保持一条直线', '收紧腹部', '保持 30-60 秒'], emoji: '💎', difficulty: 'hard' },
  { id: 's9', name: '眼镜蛇式', bodyPart: 'back', duration: 30, description: '缓解腰部酸痛', steps: ['俯卧, 双手撑胸两侧', '吸气撑起上半身', '肩膀下沉', '保持 15 秒'], emoji: '🐍', difficulty: 'easy' },
  { id: 's10', name: '股四头肌拉伸', bodyPart: 'leg', duration: 30, description: '跑步后必做', steps: ['单脚站立', '另一只手抓脚踝', '拉向臀部', '保持 15 秒换边'], emoji: '🏃', difficulty: 'medium' },
]

const PART_LABEL = {
  neck: '颈部', shoulder: '肩部', back: '背部', arm: '手臂', leg: '腿部', wrist: '手腕', eye: '眼睛', core: '核心',
}

const PART_COLOR = {
  neck: 'from-amber-500 to-orange-500', shoulder: 'from-rose-500 to-pink-500', back: 'from-blue-500 to-indigo-500',
  arm: 'from-violet-500 to-purple-500', leg: 'from-emerald-500 to-teal-500', wrist: 'from-cyan-500 to-blue-500',
  eye: 'from-pink-500 to-rose-500', core: 'from-amber-700 to-yellow-500',
}

export function StretchGuide() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [filter, setFilter] = useState<'all' | Stretch['bodyPart']>('all')
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [favs, setFavs] = useState<string[]>([])
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    } else if (intervalRef.current) {
      window.clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) window.clearInterval(intervalRef.current) }
  }, [running])

  const filtered = filter === 'all' ? STRETCHES : STRETCHES.filter((s) => s.bodyPart === filter)
  const active = STRETCHES[activeIdx] || STRETCHES[0]

  const start = () => { setSeconds(0); setRunning(true) }
  const reset = () => { setRunning(false); setSeconds(0) }

  const toggleFav = (id: string) => setFavs(favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id])

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiGenerate(active)
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const aiGenerate = async (s: Stretch) => {
    return await aiComplete(`为"${s.name}"动作生成 30-50 字的进阶技巧或注意事项`, '你是 Versa 拉伸教练, 简洁专业, 中文')
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-5 h-5" />
          <h2 className="text-lg font-bold">拉伸指南</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 部位 · 10 动作 · 计时器</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{STRETCHES.length}</p>
            <p className="text-[10px] opacity-80">动作</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{Object.keys(PART_LABEL).length}</p>
            <p className="text-[10px] opacity-80">部位</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{favs.length}</p>
            <p className="text-[10px] opacity-80">收藏</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'all' ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        {(Object.keys(PART_LABEL) as Array<keyof typeof PART_LABEL>).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === k ? `bg-gradient-to-r ${PART_COLOR[k]} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {PART_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
        <div className={cn('rounded-2xl p-6 text-white text-center bg-gradient-to-br', PART_COLOR[active.bodyPart])}>
          <p className="text-6xl mb-2">{active.emoji}</p>
          <h3 className="text-xl font-bold mb-1">{active.name}</h3>
          <p className="text-xs opacity-90 mb-2">{PART_LABEL[active.bodyPart]} · {active.difficulty === 'easy' ? '简单' : active.difficulty === 'medium' ? '中等' : '困难'}</p>
          <p className="text-sm italic opacity-95 mb-3">{active.description}</p>
          <p className="text-3xl font-bold font-mono">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</p>
          <p className="text-[10px] opacity-80 mt-1">目标 {active.duration}s</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button onClick={() => setActiveIdx((activeIdx - 1 + STRETCHES.length) % STRETCHES.length)} className="w-9 h-9 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {!running ? (
          <button onClick={start} className="flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-bold flex items-center justify-center gap-1">
            <Play className="w-4 h-4" />开始
          </button>
        ) : (
          <button onClick={() => setRunning(false)} className="flex-1 h-10 rounded-xl bg-amber-500 text-white text-sm font-bold flex items-center justify-center gap-1">
            <Pause className="w-4 h-4" />暂停
          </button>
        )}
        <button onClick={reset} className="w-9 h-9 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button onClick={() => setActiveIdx((activeIdx + 1) % STRETCHES.length)} className="w-9 h-9 rounded-full bg-ink-100 dark:bg-ink-800 flex items-center justify-center">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => toggleFav(active.id)} className={cn('w-9 h-9 rounded-full flex items-center justify-center', favs.includes(active.id) ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
          <Heart className={cn('w-4 h-4', favs.includes(active.id) && 'fill-white')} />
        </button>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60 space-y-1.5">
        <p className="text-xs font-bold">动作步骤</p>
        {active.steps.map((s, i) => (
          <div key={i} className="flex items-start gap-1.5 text-xs">
            <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0', seconds > 0 && i < Math.floor(seconds / 15) ? 'bg-emerald-500 text-white' : 'bg-ink-200 dark:bg-ink-700')}>{i + 1}</span>
            <span className={cn(seconds > 0 && i < Math.floor(seconds / 15) && 'line-through opacity-60')}>{s}</span>
          </div>
        ))}
      </div>

      <button onClick={runAI} disabled={loading} className="w-full h-9 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-1">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}AI 进阶技巧
      </button>

      {aiTip && (
        <div className="bg-emerald-50/40 dark:bg-emerald-900/20 rounded-xl p-2 border border-emerald-200/40">
          <p className="text-[10px] leading-relaxed">{aiTip}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {filtered.map((s, i) => (
          <button
            key={s.id}
            onClick={() => {
              const idx = STRETCHES.findIndex((x) => x.id === s.id)
              if (idx >= 0) { setActiveIdx(idx); reset() }
            }}
            className={cn('p-2 rounded-xl text-left border', active.id === s.id ? `bg-gradient-to-br ${PART_COLOR[s.bodyPart]} text-white border-transparent` : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}
          >
            <p className="text-xl">{s.emoji}</p>
            <p className="text-xs font-bold">{s.name}</p>
            <p className={cn('text-[10px]', active.id === s.id ? 'opacity-90' : 'text-ink-500')}>{PART_LABEL[s.bodyPart]} · {s.duration}s</p>
          </button>
        ))}
      </div>
    </div>
  )
}
