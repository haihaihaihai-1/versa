import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Plus, Trash2, Users, Sparkles, Loader2, Crown, Star, Target, X, ChevronUp, ChevronDown } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Player {
  id: string
  name: string
  emoji: string
  score: number
  color: string
}

interface Game {
  id: string
  name: string
  players: Player[]
  ended: boolean
  at: number
}

const STORAGE_KEY = 'versa:scoreboard'

function load(): Game[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Game[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

const GAME_TEMPLATES = [
  { name: '麻将', icon: '🀄', desc: '4 玩家' },
  { name: 'UNO', icon: '🎴', desc: '2-8 玩家' },
  { name: '斗地主', icon: '🃏', desc: '3 玩家' },
  { name: '谁是卧底', icon: '🕵️', desc: '4-10 玩家' },
  { name: '你画我猜', icon: '🎨', desc: '3+ 玩家' },
  { name: '狼人杀', icon: '🐺', desc: '6-12 玩家' },
  { name: '飞行棋', icon: '✈️', desc: '2-4 玩家' },
  { name: '大富翁', icon: '💰', desc: '2-6 玩家' },
]

const EMOJI_POOL = ['🦊', '🐼', '🐯', '🦁', '🐸', '🐵', '🐔', '🐧', '🦉', '🦄', '🐝', '🐢']

export function ScoreBoard() {
  const [games, setGames] = useState<Game[]>(load())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('🎲')
  const [newPlayer, setNewPlayer] = useState('')
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { save(games) }, [games])

  const active = games.find((g) => g.id === activeId) || games[0]

  const create = () => {
    if (!newName.trim()) { toast('请填写名称', 'error'); return }
    const g: Game = { id: uid(), name: newName, players: [], ended: false, at: Date.now() }
    setGames([g, ...games])
    setActiveId(g.id)
    setNewName(''); setNewIcon('🎲')
    setCreating(false)
    toast('已创建', 'success')
  }

  const addPlayer = (gid: string) => {
    if (!newPlayer.trim()) { toast('请输入名字', 'error'); return }
    const p: Player = { id: uid(), name: newPlayer, emoji: EMOJI_POOL[Math.floor(Math.random() * EMOJI_POOL.length)], score: 0, color: COLORS[Math.floor(Math.random() * COLORS.length)] }
    setGames(games.map((g) => g.id === gid ? { ...g, players: [...g.players, p] } : g))
    setNewPlayer('')
  }

  const addScore = (gid: string, pid: string, n: number) => {
    setGames(games.map((g) => g.id === gid ? { ...g, players: g.players.map((p) => p.id === pid ? { ...p, score: p.score + n } : p) } : g))
  }
  const endGame = (gid: string) => setGames(games.map((g) => g.id === gid ? { ...g, ended: true } : g))
  const remove = (id: string) => setGames(games.filter((g) => g.id !== id))
  const removePlayer = (gid: string, pid: string) => setGames(games.map((g) => g.id === gid ? { ...g, players: g.players.filter((p) => p.id !== pid) } : g))

  const runAI = async () => {
    if (!isAIEnabled() || !active) { toast('请先配置 AI Key', 'error'); return }
    setLoading(true)
    try {
      const sorted = [...active.players].sort((a, b) => b.score - a.score).slice(0, 3)
      const result = await aiComplete(`为 ${active.name} 游戏前三名写一段 30-50 字的点评, 突出竞争感`, '你是 Versa 游戏主持, 活泼有趣, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5" />
          <h2 className="text-lg font-bold">计分板</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">多玩家 · 多游戏 · 排行榜</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{games.length}</p>
            <p className="text-[10px] opacity-80">局数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{games.reduce((s, g) => s + g.players.length, 0)}</p>
            <p className="text-[10px] opacity-80">玩家</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{GAME_TEMPLATES.length}</p>
            <p className="text-[10px] opacity-80">模板</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setCreating(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新局
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-amber-50/40 dark:bg-amber-900/20 rounded-xl p-2 border border-amber-200/40">
          <p className="text-[10px] leading-relaxed">{aiTip}</p>
        </div>
      )}

      {games.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {games.map((g) => (
            <button key={g.id} onClick={() => setActiveId(g.id)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', activeId === g.id || (!activeId && g.id === active?.id) ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              {g.ended && '🏁 '}{g.name}
            </button>
          ))}
        </div>
      )}

      {active && (
        <>
          <div className="space-y-1.5">
            {active.players.length === 0 ? (
              <p className="text-center text-xs text-ink-500 py-3">还没有玩家</p>
            ) : (
              [...active.players].sort((a, b) => b.score - a.score).map((p, i) => (
                <div key={p.id} className={cn('rounded-2xl p-3 border-2', i === 0 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300' : 'bg-white/60 dark:bg-ink-900/30 border-ink-200/60 dark:border-ink-800/60')}>
                  <div className="flex items-center gap-2">
                    {i === 0 && <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                    {i === 1 && <Trophy className="w-4 h-4 text-ink-400 flex-shrink-0" />}
                    {i === 2 && <Star className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                    <span className="text-2xl">{p.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{p.name}</p>
                      <p className="text-2xl font-bold font-mono" style={{ color: p.color }}>{p.score}</p>
                    </div>
                    <button onClick={() => addScore(active.id, p.id, -1)} className="w-8 h-8 rounded-lg bg-rose-500 text-white text-sm font-bold">-</button>
                    <button onClick={() => addScore(active.id, p.id, 1)} className="w-8 h-8 rounded-lg bg-emerald-500 text-white text-sm font-bold">+</button>
                    <button onClick={() => removePlayer(active.id, p.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {active.players.length > 0 && !active.ended && (
            <div className="flex gap-1.5">
              <input value={newPlayer} onChange={(e) => setNewPlayer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPlayer(active.id)} placeholder="加玩家..." className="flex-1 px-2 h-8 rounded-lg bg-ink-50 dark:bg-ink-800 text-xs outline-none" />
              <button onClick={() => addPlayer(active.id)} className="px-2 h-8 rounded-lg bg-amber-500 text-white text-xs font-bold">+</button>
              <button onClick={() => endGame(active.id)} className="px-2 h-8 rounded-lg bg-rose-500 text-white text-xs font-bold">🏁 结束</button>
              <button onClick={() => remove(active.id)} className="w-8 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-500 text-xs">🗑️</button>
            </div>
          )}
        </>
      )}

      {creating && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setCreating(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">新计分局</h3>
            <div className="flex gap-1.5">
              <input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} maxLength={2} className="w-14 h-9 text-xl text-center rounded-lg bg-ink-50 dark:bg-ink-800 outline-none" />
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="局名 (如 周六麻将)" className="flex-1 px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {GAME_TEMPLATES.map((t) => (
                <button key={t.name} onClick={() => { setNewName(t.name); setNewIcon(t.icon) }} className="p-2 rounded-lg bg-ink-100 dark:bg-ink-800 text-center">
                  <p className="text-base">{t.icon}</p>
                  <p className="text-[10px] font-semibold">{t.name}</p>
                </button>
              ))}
            </div>
            <button onClick={create} className="w-full h-9 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold">创建</button>
          </motion.div>
        </div>
      )}

      {games.length === 0 && !creating && (
        <div className="text-center py-8 text-ink-500">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有计分局</p>
        </div>
      )}
    </div>
  )
}
