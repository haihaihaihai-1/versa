import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Trophy, Plus, Trash2, Sparkles, Loader2, Award, Star, Calendar, TrendingUp, Heart, Brain, Zap, Smile, Frown, Meh, AlertCircle } from 'lucide-react'
import { cn, uid, formatTimeAgo } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface BehaviorLog {
  id: string
  petId: string
  type: 'achievement' | 'training' | 'incident' | 'milestone' | 'trick'
  title: string
  description: string
  date: string
  category: 'obedience' | 'social' | 'agility' | 'trick' | 'health' | 'other'
  difficulty: 1 | 2 | 3 | 4 | 5
  reward: number
  evidence: string
  starred: boolean
}

const STORAGE_KEY = 'versa:pet-behavior-v1'

function todayKey() { return new Date().toISOString().split('T')[0] }

function load(): BehaviorLog[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: BehaviorLog[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): BehaviorLog[] {
  return [
    { id: '1', petId: '1', type: 'achievement', title: '学会了 "握手"', description: '3 天学会, 每次成功给零食', date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], category: 'trick', difficulty: 2, reward: 10, evidence: '', starred: true },
    { id: '2', petId: '1', type: 'milestone', title: '1 岁生日', description: '旺财 1 岁啦!', date: new Date(Date.now() - 100 * 86400000).toISOString().split('T')[0], category: 'other', difficulty: 1, reward: 0, evidence: '', starred: true },
    { id: '3', petId: '1', type: 'training', title: '定点排便训练', description: '已能坚持 3 天不出错', date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0], category: 'obedience', difficulty: 4, reward: 30, evidence: '', starred: false },
    { id: '4', petId: '1', type: 'trick', title: '学会了 "翻滚"', description: '用手势引导, 成功率 80%', date: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0], category: 'trick', difficulty: 3, reward: 20, evidence: '', starred: false },
  ]
}

const TYPE_META = {
  achievement: { label: '成就', icon: Trophy, color: 'from-amber-500 to-orange-500', emoji: '🏆' },
  training: { label: '训练', icon: Brain, color: 'from-blue-500 to-cyan-500', emoji: '🎓' },
  incident: { label: '事件', icon: AlertCircle, color: 'from-rose-500 to-red-500', emoji: '⚠️' },
  milestone: { label: '里程碑', icon: Star, color: 'from-violet-500 to-purple-500', emoji: '⭐' },
  trick: { label: '技能', icon: Zap, color: 'from-emerald-500 to-teal-500', emoji: '⚡' },
} as const

const CAT_META = {
  obedience: { label: '服从', color: 'from-blue-500 to-cyan-500' },
  social: { label: '社交', color: 'from-pink-500 to-rose-500' },
  agility: { label: '敏捷', color: 'from-orange-500 to-red-500' },
  trick: { label: '技能', color: 'from-violet-500 to-purple-500' },
  health: { label: '健康', color: 'from-emerald-500 to-teal-500' },
  other: { label: '其他', color: 'from-ink-500 to-ink-600' },
} as const

export function BehaviorLog() {
  const [logs, setLogs] = useState<BehaviorLog[]>(load())
  const [pets, setPets] = useState<{ id: string; name: string; emoji: string }[]>([])
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentPet, setCurrentPet] = useState('')
  const [filter, setFilter] = useState<'all' | 'starred' | BehaviorLog['type']>('all')
  const [type, setType] = useState<BehaviorLog['type']>('achievement')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayKey())
  const [category, setCategory] = useState<BehaviorLog['category']>('trick')
  const [difficulty, setDifficulty] = useState<BehaviorLog['difficulty']>(3)
  const [reward, setReward] = useState('10')
  const [evidence, setEvidence] = useState('')

  useEffect(() => {
    save(logs)
    try {
      const p = JSON.parse(localStorage.getItem('versa:pets-v1') || '[]')
      setPets(p.map((x: any) => ({ id: x.id, name: x.name, emoji: x.emoji })))
      if (p.length > 0 && !currentPet) setCurrentPet(p[0].id)
    } catch {}
  }, [logs])

  const petLogs = currentPet ? logs.filter((l) => l.petId === currentPet) : logs
  const total = petLogs.length
  const totalReward = petLogs.reduce((s, l) => s + l.reward, 0)
  const starred = petLogs.filter((l) => l.starred).length
  const avgDifficulty = total > 0 ? (petLogs.reduce((s, l) => s + l.difficulty, 0) / total).toFixed(1) : '0'

  const filtered = (() => {
    if (filter === 'all') return petLogs
    if (filter === 'starred') return petLogs.filter((l) => l.starred)
    return petLogs.filter((l) => l.type === filter)
  })().sort((a, b) => b.date.localeCompare(a.date))

  const add = () => {
    if (!title.trim() || !currentPet) { toast('请填写', 'error'); return }
    const l: BehaviorLog = { id: uid(), petId: currentPet, type, title, description, date, category, difficulty, reward: +reward, evidence, starred: false }
    setLogs([l, ...logs])
    setTitle(''); setDescription(''); setEvidence(''); setReward('10')
    setAdding(false)
    toast('已记录', 'success')
  }

  const remove = (id: string) => setLogs(logs.filter((l) => l.id !== id))
  const toggleStar = (id: string) => setLogs(logs.map((l) => l.id === id ? { ...l, starred: !l.starred } : l))

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const summary = petLogs.slice(0, 3).map((l) => l.title).join('、')
      const result = await aiComplete(`宠物表现: ${summary}. 推荐 3 个新技能训练方向, 中文, 每条 20 字`, '你是 Versa 宠物训练师, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-5 h-5" />
          <h2 className="text-lg font-bold">行为成就</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">训练记录 · 技能解锁 · 成就徽章</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">总记录</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-amber-100">{starred}</p>
            <p className="text-[9px] opacity-80">收藏</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{avgDifficulty}</p>
            <p className="text-[9px] opacity-80">难度</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalReward}</p>
            <p className="text-[9px] opacity-80">总奖励</p>
          </div>
        </div>
      </div>

      {pets.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {pets.map((p) => (
            <button key={p.id} onClick={() => setCurrentPet(p.id)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0 flex items-center gap-1', currentPet === p.id ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              <span>{p.emoji}</span>{p.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5">
        <button onClick={() => setAdding(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />记成就
        </button>
        <button onClick={runAI} disabled={loading} className="px-3 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI
        </button>
      </div>

      {aiTip && (
        <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setFilter('all')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'all' ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        <button onClick={() => setFilter('starred')} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === 'starred' ? 'bg-amber-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>⭐ 收藏</button>
        {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
          const T = TYPE_META[k]
          return (
            <button key={k} onClick={() => setFilter(k)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === k ? `bg-gradient-to-r ${T.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
              {T.emoji} {T.label}
            </button>
          )
        })}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有记录</p>
          </div>
        ) : filtered.map((l) => {
          const TM = TYPE_META[l.type]
          const CM = CAT_META[l.category]
          return (
            <motion.div key={l.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
              <div className="flex items-start gap-2">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br', TM.color)}>
                  {TM.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold truncate">{l.title}</p>
                    {l.starred && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                  </div>
                  <p className="text-[10px] text-ink-500">{l.date} · 难度 {'⭐'.repeat(l.difficulty)}</p>
                  {l.description && <p className="text-[10px] text-ink-500 mt-0.5">{l.description}</p>}
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {l.reward > 0 && <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-500 text-[9px] font-bold">+{l.reward}奖</span>}
                  <button onClick={() => toggleStar(l.id)}>
                    <Star className={cn('w-3 h-3', l.starred ? 'fill-amber-400 text-amber-400' : 'text-ink-300')} />
                  </button>
                  <button onClick={() => remove(l.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">记录成就</h3>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">类型</p>
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(TYPE_META) as Array<keyof typeof TYPE_META>).map((k) => {
                  const T = TYPE_META[k]
                  return (
                    <button key={k} onClick={() => setType(k)} className={cn('h-10 rounded-lg flex flex-col items-center justify-center', type === k ? `bg-gradient-to-br ${T.color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                      <span className="text-base">{T.emoji}</span>
                      <span className="text-[9px]">{T.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题 (如 学会了翻滚)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="详细描述" className="w-full px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none min-h-[60px]" />
            <div className="grid grid-cols-2 gap-1.5">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input type="number" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="奖励分" className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">类别</p>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(CAT_META) as Array<keyof typeof CAT_META>).map((k) => (
                  <button key={k} onClick={() => setCategory(k)} className={cn('h-8 rounded-lg text-[10px] font-semibold', category === k ? `bg-gradient-to-r ${CAT_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
                    {CAT_META[k].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] text-ink-500 mb-1">难度</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button key={d} onClick={() => setDifficulty(d as any)} className={cn('flex-1 h-9 rounded-lg text-base', difficulty >= d ? 'bg-amber-500' : 'bg-ink-100 dark:bg-ink-800')}>⭐</button>
                ))}
              </div>
            </div>
            <input value={evidence} onChange={(e) => setEvidence(e.target.value)} placeholder="证据/视频链接 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold">记录</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
