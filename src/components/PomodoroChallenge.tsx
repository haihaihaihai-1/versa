import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, Trophy, Sparkles, Loader2, Plus, Target, Crown, Zap, Flame, Star, Award, Users } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Challenge {
  id: string
  name: string
  target: number
  completed: number
  emoji: string
  startDate: string
  endDate: string
  reward: string
  participants: number
}

const STORAGE_KEY = 'versa:challenges'

function load(): Challenge[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Challenge[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const PRESETS = [
  { name: '本周冲刺', target: 15, emoji: '🔥', days: 7, reward: '效率达人徽章' },
  { name: '本月目标', target: 60, emoji: '🎯', days: 30, reward: '专注大师' },
  { name: '百日筑基', target: 100, emoji: '🏔️', days: 100, reward: '百日筑基完成' },
  { name: '两周速成', target: 20, emoji: '⚡', days: 14, reward: '速度之星' },
  { name: '周末突破', target: 10, emoji: '🌟', days: 3, reward: '周末战士' },
]

export function PomodoroChallenge() {
  const [challenges, setChallenges] = useState<Challenge[]>(load())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [customName, setCustomName] = useState('')
  const [customTarget, setCustomTarget] = useState('')
  const [customDays, setCustomDays] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [aiMotivation, setAiMotivation] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(challenges) }, [challenges])

  const todayStr = new Date().toISOString().split('T')[0]

  const startChallenge = (preset: typeof PRESETS[0]) => {
    const start = new Date()
    const c: Challenge = {
      id: uid(), name: preset.name, target: preset.target, completed: 0, emoji: preset.emoji,
      startDate: todayStr, endDate: new Date(Date.now() + preset.days * 86400000).toISOString().split('T')[0],
      reward: preset.reward, participants: Math.floor(Math.random() * 100) + 20,
    }
    setChallenges([c, ...challenges])
    setActiveId(c.id)
    toast('挑战开始!', 'success')
  }

  const startCustom = () => {
    if (!customName.trim() || !customTarget || !customDays) { toast('请填写完整', 'error'); return }
    const c: Challenge = {
      id: uid(), name: customName, target: +customTarget, completed: 0, emoji: '⭐',
      startDate: todayStr, endDate: new Date(Date.now() + +customDays * 86400000).toISOString().split('T')[0],
      reward: '自定义挑战达成', participants: 1,
    }
    setChallenges([c, ...challenges])
    setActiveId(c.id)
    setCustomName(''); setCustomTarget(''); setCustomDays('')
    setShowCreate(false)
    toast('挑战创建!', 'success')
  }

  const increment = (id: string, n: number = 1) => {
    setChallenges(challenges.map((c) => c.id === id ? { ...c, completed: Math.min(c.target, c.completed + n) } : c))
    toast(`+${n} 🍅`, 'success')
  }
  const remove = (id: string) => setChallenges(challenges.filter((c) => c.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('为正在进行番茄挑战的用户写 1 段 50-80 字的激励语', '你是 Versa 激励教练, 简洁有力, 中文')
      setAiMotivation(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  const active = challenges.find((c) => c.id === activeId) || challenges[0]
  const totalCompleted = challenges.reduce((s, c) => s + c.completed, 0)
  const totalTarget = challenges.reduce((s, c) => s + c.target, 0)

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-red-500 to-pink-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5" />
          <h2 className="text-lg font-bold">番茄挑战</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">5 预设 + 自定义 · 完成奖赏</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{challenges.length}</p>
            <p className="text-[10px] opacity-80">挑战</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{totalCompleted}</p>
            <p className="text-[10px] opacity-80">已完成</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{totalTarget}</p>
            <p className="text-[10px] opacity-80">总目标</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setShowCreate(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />自定义挑战
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}激励
        </button>
      </div>

      {aiMotivation && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] italic text-rose-700 dark:text-rose-300">{aiMotivation}</p>
        </div>
      )}

      <p className="text-xs font-bold">快速开始</p>
      <div className="grid grid-cols-2 gap-1.5">
        {PRESETS.map((p, i) => (
          <button key={i} onClick={() => startChallenge(p)} className="p-3 rounded-xl bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-left">
            <p className="text-2xl mb-1">{p.emoji}</p>
            <p className="text-sm font-bold">{p.name}</p>
            <p className="text-[10px] text-ink-500">{p.target} 个 / {p.days} 天</p>
            <p className="text-[9px] text-amber-500 mt-0.5">🎁 {p.reward}</p>
          </button>
        ))}
      </div>

      {challenges.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold">我的挑战</p>
          {challenges.map((c) => {
            const progress = (c.completed / c.target) * 100
            const daysLeft = Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000))
            const completed = c.completed >= c.target
            return (
              <div key={c.id} className={cn('rounded-2xl p-3 border-2', completed ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-2xl">{c.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate flex items-center gap-1.5">
                      {c.name}
                      {completed && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                    </p>
                    <p className="text-[10px] text-ink-500">{daysLeft} 天剩余 · {c.participants} 人参与</p>
                  </div>
                  <button onClick={() => remove(c.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                </div>
                <div className="mb-1.5">
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span>{c.completed} / {c.target} 🍅</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 bg-ink-100 dark:bg-ink-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, progress)}%` }} className="h-full bg-gradient-to-r from-rose-500 to-pink-500" />
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => increment(c.id, 1)} className="flex-1 h-8 rounded-lg bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1">
                    <Plus className="w-3 h-3" />+1
                  </button>
                  <button onClick={() => increment(c.id, 5)} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">+5</button>
                  <button onClick={() => increment(c.id, 10)} className="px-3 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">+10</button>
                </div>
                {completed && <p className="mt-1.5 text-center text-xs font-bold text-amber-500">🎉 达成! 获得 {c.reward}</p>}
              </div>
            )
          })}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setShowCreate(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">自定义挑战</h3>
            <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="挑战名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input value={customTarget} onChange={(e) => setCustomTarget(e.target.value)} type="number" placeholder="目标数" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={customDays} onChange={(e) => setCustomDays(e.target.value)} type="number" placeholder="天数" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <button onClick={startCustom} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-sm font-semibold">开始挑战</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
