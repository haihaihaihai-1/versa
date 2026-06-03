import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Languages, Plus, Trash2, Sparkles, Loader2, Check, X, Volume2, Star, Eye, EyeOff, ArrowRight, Brain, Shuffle, BookOpen } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Word {
  id: string
  word: string
  translation: string
  pronunciation: string
  partOfSpeech: string
  example: string
  exampleTranslation: string
  tags: string[]
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  known: boolean
  reviewCount: number
  addedAt: string
}

const STORAGE_KEY = 'versa:vocab-v1'

function load(): Word[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Word[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Word[] {
  return [
    { id: '1', word: 'ephemeral', translation: '短暂的', pronunciation: '/ɪˈfemərəl/', partOfSpeech: 'adj.', example: 'Fashion is ephemeral; trends change every season.', exampleTranslation: '时尚是短暂的, 潮流每季都在变.', tags: ['CET6', '高级'], level: 'C1', known: false, reviewCount: 0, addedAt: new Date().toISOString() },
    { id: '2', word: 'ubiquitous', translation: '无处不在的', pronunciation: '/juːˈbɪkwɪtəs/', partOfSpeech: 'adj.', example: 'Smartphones have become ubiquitous in modern life.', exampleTranslation: '智能手机在现代生活中已无处不在.', tags: ['CET6', '高级'], level: 'B2', known: false, reviewCount: 0, addedAt: new Date().toISOString() },
    { id: '3', word: 'serendipity', translation: '意外发现好事', pronunciation: '/ˌserənˈdɪpəti/', partOfSpeech: 'n.', example: 'Meeting her was pure serendipity.', exampleTranslation: '遇见她完全是意外的好运.', tags: ['CET6', '高级'], level: 'C1', known: true, reviewCount: 5, addedAt: new Date(Date.now() - 86400000 * 5).toISOString() },
    { id: '4', word: 'resilient', translation: '有韧性的', pronunciation: '/rɪˈzɪliənt/', partOfSpeech: 'adj.', example: 'Children are remarkably resilient.', exampleTranslation: '孩子们韧性惊人.', tags: ['CET6'], level: 'B2', known: false, reviewCount: 0, addedAt: new Date().toISOString() },
  ]
}

const LEVEL_META = {
  A1: { label: 'A1 入门', color: 'bg-emerald-500' },
  A2: { label: 'A2 基础', color: 'bg-cyan-500' },
  B1: { label: 'B1 中级', color: 'bg-blue-500' },
  B2: { label: 'B2 中高', color: 'bg-violet-500' },
  C1: { label: 'C1 高级', color: 'bg-rose-500' },
  C2: { label: 'C2 精通', color: 'bg-amber-500' },
} as const

function playBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 700
    g.gain.setValueAtTime(0.08, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    o.start(); o.stop(ctx.currentTime + 0.12)
  } catch {}
}

export function WordVocabulary() {
  const [words, setWords] = useState<Word[]>(load())
  const [mode, setMode] = useState<'browse' | 'flashcard' | 'quiz'>('browse')
  const [adding, setAdding] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'new' | 'known' | 'due'>('all')
  const [levelFilter, setLevelFilter] = useState<'all' | Word['level']>('all')
  const [search, setSearch] = useState('')
  const [fcIdx, setFcIdx] = useState(0)
  const [fcShowBack, setFcShowBack] = useState(false)
  const [quizIdx, setQuizIdx] = useState(0)
  const [quizScore, setQuizScore] = useState(0)
  const [quizWord, setQuizWord] = useState<Word | null>(null)
  const [quizOptions, setQuizOptions] = useState<string[]>([])
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null)
  const [quizResult, setQuizResult] = useState<'right' | 'wrong' | null>(null)
  const [word, setWord] = useState('')
  const [translation, setTranslation] = useState('')
  const [pronunciation, setPronunciation] = useState('')
  const [pos, setPos] = useState('n.')
  const [example, setExample] = useState('')
  const [exTrans, setExTrans] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [level, setLevel] = useState<Word['level']>('B2')

  useEffect(() => { save(words) }, [words])

  const total = words.length
  const known = words.filter((w) => w.known).length
  const due = words.filter((w) => !w.known).length
  const newWords = words.filter((w) => w.reviewCount === 0).length
  const mastery = total > 0 ? Math.round((known / total) * 100) : 0

  const filtered = words.filter((w) => {
    if (search && !w.word.toLowerCase().includes(search.toLowerCase()) && !w.translation.includes(search)) return false
    if (filter === 'new' && w.reviewCount > 0) return false
    if (filter === 'known' && !w.known) return false
    if (filter === 'due' && w.known) return false
    if (levelFilter !== 'all' && w.level !== levelFilter) return false
    return true
  }).sort((a, b) => a.addedAt.localeCompare(b.addedAt))

  const startFlashcard = () => {
    if (filtered.length === 0) { toast('请先添加单词', 'info'); return }
    setFcIdx(0); setFcShowBack(false); setMode('flashcard')
  }

  const startQuiz = () => {
    if (words.length < 4) { toast('至少 4 个单词', 'info'); return }
    const shuffled = [...words].sort(() => Math.random() - 0.5)
    const w = shuffled[0]
    setQuizWord(w)
    const others = words.filter((x) => x.id !== w.id).sort(() => Math.random() - 0.5).slice(0, 3)
    const opts = [...others.map((o) => o.translation), w.translation].sort(() => Math.random() - 0.5)
    setQuizOptions(opts)
    setQuizAnswer(null); setQuizResult(null); setQuizIdx(0); setQuizScore(0); setMode('quiz')
  }

  const answerQuiz = (idx: number) => {
    if (quizResult || !quizWord) return
    setQuizAnswer(idx)
    const isRight = quizOptions[idx] === quizWord.translation
    setQuizResult(isRight ? 'right' : 'wrong')
    if (isRight) setQuizScore(quizScore + 1)
    setWords(words.map((w) => w.id === quizWord.id ? { ...w, reviewCount: w.reviewCount + 1, known: w.known || isRight } : w))
  }

  const nextQuiz = () => {
    if (quizIdx + 1 >= 10) {
      setMode('browse')
      toast(`🎉 完成!得分 ${quizScore + (quizResult === 'right' ? 1 : 0)}/10`, 'success')
      return
    }
    setQuizIdx(quizIdx + 1)
    const shuffled = [...words].sort(() => Math.random() - 0.5)
    const w = shuffled[0]
    setQuizWord(w)
    const others = words.filter((x) => x.id !== w.id).sort(() => Math.random() - 0.5).slice(0, 3)
    const opts = [...others.map((o) => o.translation), w.translation].sort(() => Math.random() - 0.5)
    setQuizOptions(opts)
    setQuizAnswer(null); setQuizResult(null)
  }

  const markKnown = (id: string) => setWords(words.map((w) => w.id === id ? { ...w, known: !w.known, reviewCount: w.reviewCount + 1 } : w))
  const remove = (id: string) => setWords(words.filter((w) => w.id !== id))
  const speak = (text: string) => {
    playBeep()
    try {
      if ('speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(text)
        u.lang = 'en-US'; u.rate = 0.85
        window.speechSynthesis.speak(u)
      }
    } catch {}
  }

  const add = () => {
    if (!word.trim() || !translation.trim()) { toast('请填写', 'error'); return }
    const w: Word = { id: uid(), word, translation, pronunciation, partOfSpeech: pos, example, exampleTranslation: exTrans, tags: tagsStr.split(/[,，]/).map((t) => t.trim()).filter(Boolean), level, known: false, reviewCount: 0, addedAt: new Date().toISOString() }
    setWords([w, ...words])
    setWord(''); setTranslation(''); setPronunciation(''); setExample(''); setExTrans(''); setTagsStr('')
    setAdding(false)
    toast('已添加', 'success')
  }

  const runAI = async () => {
    if (!isAIEnabled()) { toast('请先配置 AI API Key', 'error'); return }
    setLoading(true)
    try {
      const result = await aiComplete(`生成 3 个 B2 级别英语高频词, 格式: "单词 | 翻译 | 音标 | 词性 | 例句 | 例句翻译" 每行 1 个, 不要编号`, '你是 Versa 英语教师, 简洁实用, 中文')
      setAiTip(result)
    } catch (e: any) { toast(e?.message || '失败', 'error') } finally { setLoading(false) }
  }

  if (mode === 'flashcard' && filtered.length > 0) {
    const w = filtered[fcIdx]
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5" />
            <h2 className="text-lg font-bold">单词闪卡</h2>
          </div>
          <p className="text-xs opacity-90 mb-2">翻面背诵 · 标记掌握</p>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-white/15 rounded-xl py-1.5">
              <p className="text-base font-bold">{fcIdx + 1}/{filtered.length}</p>
              <p className="text-[9px] opacity-80">进度</p>
            </div>
            <div className="bg-white/15 rounded-xl py-1.5">
              <p className="text-base font-bold">{filtered.filter((x) => x.known).length}</p>
              <p className="text-[9px] opacity-80">已掌握</p>
            </div>
            <div className="bg-white/15 rounded-xl py-1.5">
              <p className="text-base font-bold">{LEVEL_META[w.level].label}</p>
              <p className="text-[9px] opacity-80">级别</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-6 border border-ink-200/60 dark:border-ink-800/60 min-h-[200px] flex flex-col items-center justify-center">
          <motion.div key={w.id + (fcShowBack ? 'b' : 'f')} initial={{ rotateY: -90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} className="text-center">
            {!fcShowBack ? (
              <>
                <p className="text-3xl font-bold mb-2">{w.word}</p>
                {w.pronunciation && <p className="text-sm text-violet-500 italic mb-2">{w.pronunciation}</p>}
                <span className={cn('inline-block text-[10px] px-2 py-0.5 rounded text-white', LEVEL_META[w.level].color)}>{w.partOfSpeech} {LEVEL_META[w.level].label}</span>
                <button onClick={() => speak(w.word)} className="block mx-auto mt-3 px-3 py-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-500 text-xs flex items-center gap-1">
                  <Volume2 className="w-3 h-3" />发音
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-ink-500 mb-2">{w.word} {w.pronunciation}</p>
                <p className="text-2xl font-bold mb-2">{w.translation}</p>
                {w.example && (
                  <div className="text-left text-xs leading-relaxed mt-3 p-2 bg-ink-50 dark:bg-ink-800/50 rounded-lg">
                    <p className="italic">"{w.example}"</p>
                    <p className="text-ink-500 mt-1">— {w.exampleTranslation}</p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>

        {!fcShowBack ? (
          <button onClick={() => setFcShowBack(true)} className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-bold flex items-center justify-center gap-2">
            <Eye className="w-4 h-4" />显示翻译
          </button>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => { markKnown(w.id); if (fcIdx + 1 < filtered.length) { setFcIdx(fcIdx + 1); setFcShowBack(false) } else { setMode('browse'); toast('✓ 完成本组', 'success') } }} className="h-12 rounded-xl bg-rose-500 text-white text-xs font-bold flex flex-col items-center justify-center">
              <X className="w-3.5 h-3.5" />不认识
            </button>
            <button onClick={() => { if (fcIdx + 1 < filtered.length) { setFcIdx(fcIdx + 1); setFcShowBack(false) } else { setMode('browse'); toast('✓ 完成本组', 'success') } }} className="h-12 rounded-xl bg-amber-500 text-white text-xs font-bold">
              模糊
            </button>
            <button onClick={() => { markKnown(w.id); if (fcIdx + 1 < filtered.length) { setFcIdx(fcIdx + 1); setFcShowBack(false) } else { setMode('browse'); toast('✓ 完成本组', 'success') } }} className="h-12 rounded-xl bg-emerald-500 text-white text-xs font-bold flex flex-col items-center justify-center">
              <Check className="w-3.5 h-3.5" />已掌握
            </button>
          </div>
        )}

        <button onClick={() => setMode('browse')} className="w-full h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">退出</button>
      </div>
    )
  }

  if (mode === 'quiz' && quizWord) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5" />
            <h2 className="text-lg font-bold">单词测验</h2>
          </div>
          <p className="text-xs opacity-90 mb-2">四选一 · 10 题</p>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            <div className="bg-white/15 rounded-xl py-1.5">
              <p className="text-base font-bold">{quizIdx + 1}/10</p>
              <p className="text-[9px] opacity-80">题号</p>
            </div>
            <div className="bg-white/15 rounded-xl py-1.5">
              <p className="text-base font-bold">{quizScore + (quizResult === 'right' ? 1 : 0)}</p>
              <p className="text-[9px] opacity-80">得分</p>
            </div>
            <div className="bg-white/15 rounded-xl py-1.5">
              <p className="text-base font-bold">{LEVEL_META[quizWord.level].label}</p>
              <p className="text-[9px] opacity-80">级别</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-3 border border-ink-200/60 dark:border-ink-800/60">
          <p className="text-center text-2xl font-bold mb-1">{quizWord.word}</p>
          <p className="text-center text-xs text-violet-500 mb-2">{quizWord.pronunciation}</p>
          <p className="text-center text-sm text-ink-500 mb-3">选择正确的中文释义</p>
          <div className="space-y-1.5">
            {quizOptions.map((o, i) => {
              const isCorrect = o === quizWord.translation
              const isSelected = i === quizAnswer
              const showResult = quizResult !== null
              return (
                <button key={i} onClick={() => answerQuiz(i)} disabled={showResult} className={cn('w-full px-3 py-2 rounded-lg text-left text-sm font-semibold flex items-center gap-2', !showResult && 'bg-ink-50 dark:bg-ink-800/50 hover:bg-violet-50', showResult && isCorrect && 'bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-400', showResult && isSelected && !isCorrect && 'bg-rose-100 dark:bg-rose-900/30 border border-rose-400', showResult && !isCorrect && !isSelected && 'opacity-50')}>
                  <span className="w-6 h-6 rounded-full bg-white/60 flex items-center justify-center text-xs font-bold flex-shrink-0">{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{o}</span>
                  {showResult && isCorrect && <Check className="w-4 h-4 text-emerald-500" />}
                  {showResult && isSelected && !isCorrect && <X className="w-4 h-4 text-rose-500" />}
                </button>
              )
            })}
          </div>
        </div>

        {quizResult && (
          <button onClick={nextQuiz} className="w-full h-10 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-bold">
            {quizIdx + 1 < 10 ? '下一题 →' : '完成 ✓'}
          </button>
        )}
        <button onClick={() => setMode('browse')} className="w-full h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold">退出</button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Languages className="w-5 h-5" />
          <h2 className="text-lg font-bold">单词本</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">6 级分类 · 闪卡背诵 · 测验</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{total}</p>
            <p className="text-[9px] opacity-80">单词</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-emerald-100">{known}</p>
            <p className="text-[9px] opacity-80">掌握</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold text-amber-100">{due}</p>
            <p className="text-[9px] opacity-80">待学</p>
          </div>
          <div className="bg-white/15 rounded-xl py-1.5">
            <p className="text-base font-bold">{mastery}%</p>
            <p className="text-[9px] opacity-80">掌握率</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button onClick={startFlashcard} className="h-12 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold flex flex-col items-center justify-center">
          <BookOpen className="w-3.5 h-3.5 mb-0.5" />闪卡
        </button>
        <button onClick={startQuiz} className="h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex flex-col items-center justify-center">
          <Brain className="w-3.5 h-3.5 mb-0.5" />测验
        </button>
        <button onClick={() => setAdding(true)} className="h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold flex flex-col items-center justify-center">
          <Plus className="w-3.5 h-3.5 mb-0.5" />添加
        </button>
      </div>

      <div className="flex gap-1.5">
        <button onClick={runAI} disabled={loading} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}AI 单词
        </button>
      </div>

      {aiTip && (
        <div className="bg-violet-50/40 dark:bg-violet-900/20 rounded-xl p-2 border border-violet-200/40">
          <p className="text-[10px] leading-relaxed whitespace-pre-wrap">{aiTip}</p>
        </div>
      )}

      <div className="relative">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索..." className="w-full px-3 h-9 rounded-lg bg-white/60 dark:bg-ink-900/30 border border-ink-200/60 dark:border-ink-800/60 text-sm outline-none" />
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(['all', 'new', 'due', 'known'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={cn('px-3 h-7 rounded-full text-xs font-semibold flex-shrink-0', filter === f ? 'bg-violet-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
            {f === 'all' ? '全部' : f === 'new' ? '✨ 新' : f === 'due' ? '⏳ 待学' : '✓ 掌握'}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button onClick={() => setLevelFilter('all')} className={cn('px-2 h-6 rounded-full text-[10px] font-semibold flex-shrink-0', levelFilter === 'all' ? 'bg-rose-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>全部</button>
        {(Object.keys(LEVEL_META) as Array<keyof typeof LEVEL_META>).map((k) => (
          <button key={k} onClick={() => setLevelFilter(k as any)} className={cn('px-2 h-6 rounded-full text-[10px] font-semibold flex-shrink-0', levelFilter === k ? `${LEVEL_META[k].color} text-white` : 'bg-ink-100 dark:bg-ink-800')}>
            {LEVEL_META[k].label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-ink-500">
            <Languages className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">还没有单词</p>
          </div>
        ) : filtered.map((w) => (
          <motion.div key={w.id} whileHover={{ y: -1 }} className="rounded-2xl bg-white/60 dark:bg-ink-900/30 p-2 border border-ink-200/60 dark:border-ink-800/60">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold">{w.word}</p>
                  <span className={cn('text-[9px] px-1 py-0.5 rounded text-white', LEVEL_META[w.level].color)}>{w.level}</span>
                  {w.known && <Check className="w-3 h-3 text-emerald-500" />}
                </div>
                <p className="text-[10px] text-ink-500">{w.pronunciation} · {w.partOfSpeech}</p>
                <p className="text-sm mt-0.5">{w.translation}</p>
                {w.example && <p className="text-[10px] text-ink-500 mt-1 italic">"{w.example}"</p>}
                <div className="mt-1 flex flex-wrap gap-1">
                  {w.tags.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-500 text-[9px] font-semibold">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => speak(w.word)} className="w-6 h-6 rounded bg-violet-500 text-white flex items-center justify-center">
                  <Volume2 className="w-3 h-3" />
                </button>
                <button onClick={() => markKnown(w.id)} className={cn('w-6 h-6 rounded flex items-center justify-center', w.known ? 'bg-emerald-500 text-white' : 'bg-ink-100 dark:bg-ink-800')}>
                  {w.known ? '✓' : '?'}
                </button>
                <button onClick={() => remove(w.id)} className="w-6 h-6 rounded bg-ink-100 dark:bg-ink-800 text-rose-500 text-xs">×</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {adding && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur flex items-end sm:items-center justify-center" onClick={() => setAdding(false)}>
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white dark:bg-ink-900 rounded-t-2xl sm:rounded-2xl p-4 space-y-2 max-h-[85vh] overflow-y-auto">
            <h3 className="font-bold">添加单词</h3>
            <input value={word} onChange={(e) => setWord(e.target.value)} placeholder="单词" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="翻译" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input value={pronunciation} onChange={(e) => setPronunciation(e.target.value)} placeholder="音标" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <input value={pos} onChange={(e) => setPos(e.target.value)} placeholder="词性" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            </div>
            <input value={example} onChange={(e) => setExample(e.target.value)} placeholder="例句" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <input value={exTrans} onChange={(e) => setExTrans(e.target.value)} placeholder="例句翻译" className="w-full px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
            <div className="grid grid-cols-2 gap-1.5">
              <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} placeholder="标签 (逗号)" className="px-3 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none" />
              <select value={level} onChange={(e) => setLevel(e.target.value as any)} className="px-2 h-9 rounded-lg bg-ink-50 dark:bg-ink-800 text-sm outline-none">
                {(Object.keys(LEVEL_META) as Array<keyof typeof LEVEL_META>).map((k) => <option key={k} value={k}>{LEVEL_META[k].label}</option>)}
              </select>
            </div>
            <button onClick={add} className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold">添加</button>
          </motion.div>
        </div>
      )}
    </div>
  )
}
