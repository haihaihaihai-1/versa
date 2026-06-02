import { useState } from 'react'
import { motion } from 'framer-motion'
import { Swords, Sparkles, Loader2, Crown, Plus, Shuffle, X } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Battle {
  id: string
  a: { text: string; votes: number }
  b: { text: string; votes: number }
  emoji: string
  category: string
  ended: boolean
  winner?: 'a' | 'b'
}

const STORAGE_KEY = 'versa:battles'

function load(): Battle[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return [] }
function save(d: Battle[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

const SUGGESTIONS = [
  { a: '猫', b: '狗', emoji: '🐱', category: '宠物' },
  { a: '甜豆腐脑', b: '咸豆腐脑', emoji: '🥣', category: '美食' },
  { a: '苹果', b: '安卓', emoji: '📱', category: '科技' },
  { a: '早晨', b: '夜晚', emoji: '🌅', category: '时间' },
  { a: '夏天', b: '冬天', emoji: '❄️', category: '季节' },
  { a: '可乐', b: '雪碧', emoji: '🥤', category: '饮料' },
  { a: '猫', b: '路由器', emoji: '📡', category: '搞笑' },
  { a: '程序员', b: '产品经理', emoji: '👔', category: '职业' },
  { a: '火锅', b: '烧烤', emoji: '🍢', category: '美食' },
  { a: '电子书', b: '纸质书', emoji: '📚', category: '阅读' },
]

export function MemeBattle() {
  const [battles, setBattles] = useState<Battle[]>(load())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [newA, setNewA] = useState('')
  const [newB, setNewB] = useState('')
  const [newEmoji, setNewEmoji] = useState('🆚')
  const [newCat, setNewCat] = useState('娱乐')
  const [creating, setCreating] = useState(false)
  type VotedMap = { [k: string]: 'a' | 'b' }
  const [voted, setVoted] = useState<VotedMap>({})
  const [aiTopic, setAiTopic] = useState('')
  const [loading, setLoading] = useState(false)

  const active = battles.find((b) => b.id === activeId) || battles[0]

  const create = () => {
    if (!newA.trim() || !newB.trim()) { toast('请填写两边', 'error'); return }
    const b: Battle = { id: uid(), a: { text: newA, votes: 0 }, b: { text: newB, votes: 0 }, emoji: newEmoji, category: newCat, ended: false }
    setBattles([b, ...battles])
    setNewA(''); setNewB(''); setNewEmoji('🆚')
    setActiveId(b.id); setCreating(false)
    toast('PK 已创建', 'success')
  }

  const quickCreate = (s: typeof SUGGESTIONS[0]) => {
    const b: Battle = { id: uid(), a: { text: s.a, votes: 0 }, b: { text: s.b, votes: 0 }, emoji: s.emoji, category: s.category, ended: false }
    setBattles([b, ...battles])
    setActiveId(b.id)
  }

  const vote = (id: string, side: 'a' | 'b') => {
    if (voted[id]) return
    setBattles(battles.map((b) => b.id === id ? { ...b, [side]: { ...b[side], votes: b[side].votes + 1 } } : b))
    setVoted({ ...voted, [id]: side })
  }

  const endBattle = (id: string) => {
    setBattles(battles.map((b) => b.id === id ? { ...b, ended: true, winner: b.a.votes > b.b.votes ? 'a' : b.b.votes > b.a.votes ? 'b' : undefined } : b))
  }

  const remove = (id: string) => setBattles(battles.filter((b) => b.id !== id))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete('推荐 3 个有趣的 PK 话题 (50-80 字, 如 "猫 vs 狗")', '你是 Versa 内容运营, 简洁有趣, 中文')
      setAiTopic(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-red-500 to-orange-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Swords className="w-5 h-5" />
          <h2 className="text-lg font-bold">表情包 PK</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">投票对决 · AI 出题 · 排行榜</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{battles.length}</p>
            <p className="text-[10px] opacity-80">PK 数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{battles.reduce((s, b) => s + b.a.votes + b.b.votes, 0)}</p>
            <p className="text-[10px] opacity-80">总票数</p>
          </div>
          <div className="bg-white/15 rounded-xl py-2">
            <p className="text-lg font-bold">{SUGGESTIONS.length}</p>
            <p className="text-[10px] opacity-80">模板</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setCreating(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />发起 PK
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTopic && (
        <div className="bg-rose-50/40 dark:bg-rose-900/20 rounded-xl p-2 border border-rose-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTopic}</p>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-bold">快速发起</p>
        <div className="grid grid-cols-2 gap-1.5">
          {SUGGESTIONS.slice(0, 6).map((s, i) => (
            <button key={i} onClick={() => quickCreate(s)} className="p-2 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-left">
              <p className="text-xs font-semibold">{s.emoji} {s.a} vs {s.b}</p>
              <p className="text-[10px] text-ink-500">{s.category}</p>
            </button>
          ))}
        </div>
      </div>

      {battles.length === 0 ? (
        <div className="text-center py-8 text-ink-500">
          <Swords className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有 PK</p>
        </div>
      ) : (
        <div className="space-y-2">
          {battles.map((b) => {
            const total = b.a.votes + b.b.votes
            const aPct = total > 0 ? (b.a.votes / total) * 100 : 50
            const bPct = total > 0 ? (b.b.votes / total) * 100 : 50
            const userVoted = voted[b.id]
            return (
              <div key={b.id} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-ink-500">{b.emoji} {b.category} · {total} 票</p>
                  <div className="flex gap-1">
                    {!b.ended && <button onClick={() => endBattle(b.id)} className="px-2 h-6 rounded bg-rose-500 text-white text-[10px] font-bold">结束</button>}
                    <button onClick={() => remove(b.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 relative">
                  <button
                    onClick={() => vote(b.id, 'a')}
                    disabled={b.ended || !!userVoted}
                    className={cn('p-3 rounded-xl border-2 transition relative', userVoted === 'a' ? 'bg-rose-500 text-white border-rose-500' : b.ended && b.winner === 'a' ? 'bg-amber-500 text-white border-amber-500' : b.ended ? 'bg-ink-50 dark:bg-ink-800/30 border-ink-200 opacity-60' : 'bg-white dark:bg-ink-800 border-ink-200 hover:border-rose-500')}
                  >
                    {b.ended && b.winner === 'a' && <Crown className="absolute top-1 right-1 w-3 h-3 text-amber-200" />}
                    <p className="text-2xl mb-1">{b.emoji}</p>
                    <p className="text-sm font-bold">{b.a.text}</p>
                    <p className="text-[10px] mt-1 opacity-80">{b.a.votes} 票 · {aPct.toFixed(0)}%</p>
                    <div className="absolute bottom-0 left-0 h-1 bg-rose-300 rounded-full" style={{ width: `${aPct}%` }} />
                  </button>
                  <div className="absolute left-1/2 -translate-x-1/2 top-1/2 w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs font-bold z-10">VS</div>
                  <button
                    onClick={() => vote(b.id, 'b')}
                    disabled={b.ended || !!userVoted}
                    className={cn('p-3 rounded-xl border-2 transition relative', userVoted === 'b' ? 'bg-rose-500 text-white border-rose-500' : b.ended && b.winner === 'b' ? 'bg-amber-500 text-white border-amber-500' : b.ended ? 'bg-ink-50 dark:bg-ink-800/30 border-ink-200 opacity-60' : 'bg-white dark:bg-ink-800 border-ink-200 hover:border-rose-500')}
                  >
                    {b.ended && b.winner === 'b' && <Crown className="absolute top-1 right-1 w-3 h-3 text-amber-200" />}
                    <p className="text-2xl mb-1">{b.emoji}</p>
                    <p className="text-sm font-bold">{b.b.text}</p>
                    <p className="text-[10px] mt-1 opacity-80">{b.b.votes} 票 · {bPct.toFixed(0)}%</p>
                    <div className="absolute bottom-0 right-0 h-1 bg-rose-300 rounded-full" style={{ width: `${bPct}%` }} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {creating && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setCreating(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">发起 PK</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={newA} onChange={(e) => setNewA(e.target.value)} placeholder="A 选项" className="px-3 h-10 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={newB} onChange={(e) => setNewB(e.target.value)} placeholder="B 选项" className="px-3 h-10 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} maxLength={2} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm text-center" />
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="类别" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm" />
            </div>
            <button onClick={create} className="w-full h-9 rounded-lg bg-gradient-to-r from-rose-500 to-red-500 text-white text-sm font-semibold">发起</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
