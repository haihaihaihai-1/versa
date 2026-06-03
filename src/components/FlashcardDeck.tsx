import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, Plus, Trash2, Sparkles, Loader2, RotateCcw, Check, X, Eye, Brain, ChevronRight, ChevronLeft, Shuffle, Tag, Calendar } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Card {
  id: string
  front: string
  back: string
  hint: string
  tags: string[]
  // SM-2 state
  interval: number
  repetitions: number
  ease: number
  due: string
  reviews: number
  lapses: number
}

interface Deck {
  id: string
  name: string
  description: string
  emoji: string
  cards: Card[]
}

const STORAGE_KEY = 'versa:flashcards-v1'

function load(): Deck[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Deck[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function todayKey() { return new Date().toISOString().split('T')[0] }

function seed(): Deck[] {
  return [
    {
      id: 'd1', name: '英语单词', description: 'CET-6 高频词', emoji: '📚',
      cards: [
        { id: uid(), front: 'ephemeral', back: 'adj. 短暂的', hint: 'eph- 时间', tags: ['CET6'], interval: 1, repetitions: 0, ease: 2.5, due: todayKey(), reviews: 0, lapses: 0 },
        { id: uid(), front: 'ubiquitous', back: 'adj. 无处不在的', hint: 'ubique 到处', tags: ['CET6'], interval: 1, repetitions: 0, ease: 2.5, due: todayKey(), reviews: 0, lapses: 0 },
        { id: uid(), front: 'serendipity', back: 'n. 意外发现珍宝的运气', hint: '', tags: ['CET6'], interval: 1, repetitions: 0, ease: 2.5, due: todayKey(), reviews: 0, lapses: 0 },
        { id: uid(), front: 'mellifluous', back: 'adj. 悦耳的', hint: 'mel 蜂蜜', tags: ['CET6'], interval: 1, repetitions: 0, ease: 2.5, due: todayKey(), reviews: 0, lapses: 0 },
      ],
    },
    {
      id: 'd2', name: '世界首都', description: '地理常识', emoji: '🌍',
      cards: [
        { id: uid(), front: '澳大利亚', back: '堪培拉 Canberra', hint: '不是悉尼', tags: ['地理'], interval: 1, repetitions: 0, ease: 2.5, due: todayKey(), reviews: 0, lapses: 0 },
        { id: uid(), front: '巴西', back: '巴西利亚 Brasília', hint: '不是里约', tags: ['地理'], interval: 1, repetitions: 0, ease: 2.5, due: todayKey(), reviews: 0, lapses: 0 },
        { id: uid(), front: '土耳其', back: '安卡拉 Ankara', hint: '不是伊斯坦布尔', tags: ['地理'], interval: 1, repetitions: 0, ease: 2.5, due: todayKey(), reviews: 0, lapses: 0 },
      ],
    },
  ]
}

function nextDue(c: Card, quality: number): Card {
  // SM-2 algorithm
  let { interval, repetitions, ease } = c
  if (quality < 3) {
    repetitions = 0
    interval = 1
  } else {
    if (repetitions === 0) interval = 1
    else if (repetitions === 1) interval = 6
    else interval = Math.round(interval * ease)
    repetitions += 1
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
  const due = new Date()
  due.setDate(due.getDate() + interval)
  return { ...c, interval, repetitions, ease, due: due.toISOString().split('T')[0], reviews: c.reviews + 1, lapses: quality < 3 ? c.lapses + 1 : c.lapses }
}

export function FlashcardDeck() {
  const [decks, setDecks] = useState<Deck[]>(load())
  const [activeId, setActiveId] = useState<string | null>(decks[0]?.id || null)
  const [mode, setMode] = useState<'browse' | 'study'>('browse')
  const [studyIdx, setStudyIdx] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [sessionReviews, setSessionReviews] = useState(0)
  const [sessionCorrect, setSessionCorrect] = useState(0)
  const [adding, setAdding] = useState(false)
  const [addingDeck, setAddingDeck] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [hint, setHint] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [deckName, setDeckName] = useState('')
  const [deckEmoji, setDeckEmoji] = useState('📚')
  const [deckDesc, setDeckDesc] = useState('')

  useEffect(() => { save(decks) }, [decks])

  const active = decks.find((d) => d.id === activeId)
  const today = todayKey()
  const dueCards = active?.cards.filter((c) => c.due <= today) || []
  const newCards = active?.cards.filter((c) => c.reviews === 0) || []
  const totalCards = decks.reduce((s, d) => s + d.cards.length, 0)
  const totalDue = decks.reduce((s, d) => s + d.cards.filter((c) => c.due <= today).length, 0)
  const totalReviews = decks.reduce((s, d) => s + d.cards.reduce((sum, c) => sum + c.reviews, 0), 0)
  const avgEase = totalCards > 0 ? (decks.reduce((s, d) => s + d.cards.reduce((sum, c) => sum + c.ease, 0), 0) / totalCards).toFixed(2) : '0'

  const startStudy = () => {
    if (!active || dueCards.length === 0) { toast('没有需要复习的卡片', 'info'); return }
    setStudyIdx(0)
    setShowBack(false)
    setSessionReviews(0)
    setSessionCorrect(0)
    setMode('study')
  }

  const review = (quality: number) => {
    if (!active) return
    const card = dueCards[studyIdx]
    if (!card) return
    const updated = nextDue(card, quality)
    setDecks(decks.map((d) => d.id === active.id ? { ...d, cards: d.cards.map((c) => c.id === card.id ? updated : c) } : d))
    setSessionReviews(sessionReviews + 1)
    if (quality >= 3) setSessionCorrect(sessionCorrect + 1)
    if (studyIdx + 1 < dueCards.length) {
      setStudyIdx(studyIdx + 1)
      setShowBack(false)
    } else {
      setMode('browse')
      toast(`✓ 复习 ${sessionReviews + 1} 张, 正确率 ${Math.round(((sessionCorrect + (quality >= 3 ? 1 : 0)) / (sessionReviews + 1)) * 100)}%`, 'success')
    }
  }

  const addDeck = () => {
    if (!deckName.trim()) { toast('请输入名称', 'error'); return }
    const d: Deck = { id: uid(), name: deckName, description: deckDesc, emoji: deckEmoji, cards: [] }
    setDecks([d, ...decks])
    setActiveId(d.id)
    setAddingDeck(false)
    setDeckName(''); setDeckDesc(''); setDeckEmoji('📚')
    toast('已创建', 'success')
  }

  const addCard = () => {
    if (!active || !front.trim() || !back.trim()) { toast('请填写', 'error'); return }
    const card: Card = { id: uid(), front, back, hint, tags: tagsStr.split(/[,，]/).map((t) => t.trim()).filter(Boolean), interval: 1, repetitions: 0, ease: 2.5, due: today, reviews: 0, lapses: 0 }
    setDecks(decks.map((d) => d.id === active.id ? { ...d, cards: [card, ...d.cards] } : d))
    setFront(''); setBack(''); setHint(''); setTagsStr('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const removeCard = (cardId: string) => {
    if (!active) return
    setDecks(decks.map((d) => d.id === active.id ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) } : d))
  }

  const removeDeck = (id: string) => {
    setDecks(decks.filter((d) => d.id !== id))
    if (activeId === id) setActiveId(decks[0]?.id || null)
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`生成 5 个 CET-6 高级词汇卡片, 格式: "英文 | 中文释义 | 助记提示" 每行 1 个, 不要编号`, '你是 Versa 英语教师, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  if (mode === 'study' && active && dueCards.length > 0) {
    const card = dueCards[studyIdx]
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5" />
            <h2 className="text-lg font-bold">{active.emoji} {active.name}</h2>
          </div>
          <p className="text-xs opacity-90 mb-2">间隔重复 · SM-2 算法</p>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-white/15 rounded-xl py-1.5">
              <p className="text-base font-bold">{studyIdx + 1}/{dueCards.length}</p>
              <p className="text-[9px] opacity-80">进度</p>
            </div>
            <div className="bg-white/15 rounded-xl py-1.5">
              <p className="text-base font-bold">{sessionCorrect}</p>
              <p className="text-[9px] opacity-80">正确</p>
            </div>
            <div className="bg-white/15 rounded-xl py-1.5">
              <p className="text-base font-bold">{Math.round((sessionCorrect / Math.max(1, sessionReviews)) * 100)}%</p>
              <p className="text-[9px] opacity-80">正确率</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-6 border border-ink-200/60 dark:border-ink-800/60 min-h-[200px] flex flex-col items-center justify-center">
          <motion.div key={card.id + (showBack ? 'b' : 'f')} initial={{ rotateY: -90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} className="text-center">
            {!showBack ? (
              <>
                <p className="text-xs text-ink-500 mb-2">{card.tags.join(' · ')}</p>
                <p className="text-2xl font-bold mb-2">{card.front}</p>
                {card.hint && <p className="text-xs text-violet-500 italic">💡 {card.hint}</p>}
              </>
            ) : (
              <>
                <p className="text-xs text-ink-500 mb-2">{card.front}</p>
                <p className="text-xl font-bold mb-2">{card.back}</p>
                <p className="text-[10px] text-ink-500">下次第 {card.interval} 天 · 简易度 {card.ease.toFixed(2)}</p>
              </>
            )}
          </motion.div>
        </div>

        {!showBack ? (
          <button onClick={() => setShowBack(true)} className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-bold flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" />显示答案
          </button>
        ) : (
          <div className="grid grid-cols-4 gap-1.5">
            <button onClick={() => review(0)} className="h-12 rounded-xl bg-rose-500 text-white text-xs font-bold flex flex-col items-center justify-center">
              <X className="w-3.5 h-3.5" />忘记
            </button>
            <button onClick={() => review(3)} className="h-12 rounded-xl bg-amber-500 text-white text-xs font-bold flex flex-col items-center justify-center">
              困难
            </button>
            <button onClick={() => review(4)} className="h-12 rounded-xl bg-cyan-500 text-white text-xs font-bold flex flex-col items-center justify-center">
              良好
            </button>
            <button onClick={() => review(5)} className="h-12 rounded-xl bg-emerald-500 text-white text-xs font-bold flex flex-col items-center justify-center">
              <Check className="w-3.5 h-3.5" />简单
            </button>
          </div>
        )}

        <button onClick={() => setMode('browse')} className="w-full h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">退出复习</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="w-5 h-5" />
          <h2 className="text-lg font-bold">闪卡记忆</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">间隔重复 · SM-2 算法 · AI 生成</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{decks.length}</p>
            <p className="text-[9px] opacity-80">卡组</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalCards}</p>
            <p className="text-[9px] opacity-80">卡片</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-amber-100">{totalDue}</p>
            <p className="text-[9px] opacity-80">待复习</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{totalReviews}</p>
            <p className="text-[9px] opacity-80">总复习</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5">
        <button onClick={() => setAddingDeck(true)} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold flex items-center justify-center gap-1">
          <Plus className="w-3.5 h-3.5" />新卡组
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
        {decks.map((d) => {
          const due = d.cards.filter((c) => c.due <= today).length
          return (
            <button key={d.id} onClick={() => setActiveId(d.id)} className={cn('flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold flex items-center gap-1', activeId === d.id ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
              <span>{d.emoji}</span>{d.name}
              {due > 0 && <span className="ml-1 px-1 rounded-full bg-rose-500 text-white text-[9px]">{due}</span>}
            </button>
          )
        })}
      </div>

      {active ? (
        <div className="space-y-2">
          <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">{active.emoji} {active.name}</p>
                <p className="text-[10px] text-ink-500">{active.description} · {active.cards.length} 张</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={startStudy} disabled={dueCards.length === 0} className="px-3 h-8 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] font-bold flex items-center gap-1 disabled:opacity-50">
                  <Brain className="w-3 h-3" />复习 ({dueCards.length})
                </button>
                <button onClick={() => setAdding(true)} className="px-2 h-8 rounded-lg bg-ink-100 dark:bg-ink-800 text-[10px] font-semibold">+卡</button>
                <button onClick={() => removeDeck(active.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
              </div>
            </div>
          </div>

          {active.cards.length === 0 ? (
            <div className="text-center py-8 text-ink-500">
              <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">还没有卡片</p>
            </div>
          ) : (
            <div className="space-y-1">
              {active.cards.slice(0, 20).map((c) => {
                const isDue = c.due <= today
                return (
                  <div key={c.id} className={cn('rounded-xl bg-white/60 dark:bg-ink-900/30 p-2 border', isDue ? 'border-amber-400' : 'border-ink-200/60 dark:border-ink-800/60')}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{c.front}</p>
                        <p className="text-[10px] text-ink-500 truncate">{c.back}</p>
                      </div>
                      <div className="text-right">
                        <p className={cn('text-[9px] font-semibold', isDue ? 'text-amber-500' : 'text-ink-400')}>
                          {isDue ? '待复习' : `${c.interval}天后`}
                        </p>
                        <p className="text-[9px] text-ink-500">ease {c.ease.toFixed(2)}</p>
                      </div>
                      <button onClick={() => removeCard(c.id)} className="text-ink-400 hover:text-rose-500 text-xs">×</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-ink-500">
          <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">还没有卡组</p>
        </div>
      )}

      {addingDeck && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAddingDeck(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2">
            <h3 className="font-bold">新建卡组</h3>
            <div className="grid grid-cols-4 gap-1.5">
              {['📚', '🌍', '🧪', '🎨', '💻', '🎵', '🏛️', '⚖️'].map((e) => (
                <button key={e} onClick={() => setDeckEmoji(e)} className={cn('h-10 rounded-lg text-2xl', deckEmoji === e ? 'bg-violet-500' : 'bg-ink-100 dark:bg-ink-800')}>{e}</button>
              ))}
            </div>
            <input value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder="卡组名" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={deckDesc} onChange={(e) => setDeckDesc(e.target.value)} placeholder="描述 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={addDeck} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold">创建</button>
          </motion.div>
        </div>
      )}

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">添加卡片</h3>
            <input value={front} onChange={(e) => setFront(e.target.value)} placeholder="正面 (问题)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={back} onChange={(e) => setBack(e.target.value)} placeholder="背面 (答案)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="提示 (可选)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="标签 (逗号分隔)" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <button onClick={addCard} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
