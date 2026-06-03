import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sparkles, Check, X, RefreshCw, ChevronRight, Star, Award, Clock, Shuffle, Trophy, Plus, Trash2, Sigma, Divide, Hash, TrendingUp } from 'lucide-react'
import { cn, uid } from '../lib/utils'
import { aiComplete, isAIEnabled } from '../lib/ai'
import { toast } from './ui/Toaster'

interface Question {
  id: string
  category: 'algebra' | 'geometry' | 'calculus' | 'arithmetic' | 'logic' | 'probability' | 'word' | 'sequence'
  difficulty: 1 | 2 | 3 | 4 | 5
  question: string
  answer: string
  options?: string[]
  hint: string
  explanation: string
  explanation_ai?: string
}

const STORAGE_KEY = 'versa:math-quiz-v1'

function load(): Question[] { try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s) } catch {} return seed() }
function save(d: Question[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch {} }

function seed(): Question[] {
  return [
    { id: '1', category: 'algebra', difficulty: 2, question: '解方程: 2x + 5 = 13', answer: '4', hint: '先移项, 再除以系数', explanation: '2x = 13 - 5 = 8, x = 8/2 = 4' },
    { id: '2', category: 'geometry', difficulty: 2, question: '一个三角形三边为 3, 4, 5, 它的面积是?', answer: '6', options: ['5', '6', '7', '8'], hint: '这是直角三角形, 用两直角边', explanation: '3-4-5 是直角三角形, 面积 = (3×4)/2 = 6' },
    { id: '3', category: 'arithmetic', difficulty: 1, question: '15 × 24 = ?', answer: '360', options: ['320', '340', '360', '380'], hint: '15 × 24 = 15 × 25 - 15', explanation: '15 × 24 = 15 × (25 - 1) = 375 - 15 = 360' },
    { id: '4', category: 'calculus', difficulty: 3, question: 'f(x) = x² + 3x, 求 f\'(x)', answer: '2x + 3', options: ['2x + 3', 'x² + 3', '2x - 3', 'x + 3'], hint: '幂函数求导: (xⁿ)\' = nxⁿ⁻¹', explanation: "(x²)' = 2x, (3x)' = 3, 所以 f'(x) = 2x + 3" },
    { id: '5', category: 'logic', difficulty: 3, question: '数列 2, 6, 12, 20, 30, ? 下一个是?', answer: '42', options: ['36', '38', '40', '42'], hint: '相邻差: 4, 6, 8, 10, ?', explanation: '差是 4, 6, 8, 10, 12 → 30 + 12 = 42' },
    { id: '6', category: 'probability', difficulty: 3, question: '抛两个骰子, 至少一个为 6 的概率?', answer: '11/36', options: ['1/6', '1/3', '11/36', '1/2'], hint: '用 1 - P(都不为 6)', explanation: '1 - (5/6)² = 1 - 25/36 = 11/36' },
    { id: '7', category: 'word', difficulty: 2, question: '鸡兔同笼, 共 35 头, 94 足, 鸡兔各几只?', answer: '23 12', options: ['20 15', '23 12', '25 10', '22 13'], hint: '鸡 2 足, 兔 4 足', explanation: '设鸡 x 兔 y: x+y=35, 2x+4y=94 → y=12, x=23' },
    { id: '8', category: 'sequence', difficulty: 4, question: '斐波那契数列第 10 项是?', answer: '55', options: ['34', '55', '89', '144'], hint: 'F(n) = F(n-1) + F(n-2), F(1)=F(2)=1', explanation: '1,1,2,3,5,8,13,21,34,55 → 第 10 项 = 55' },
  ]
}

const CAT_META = {
  algebra: { label: '代数', icon: Sigma, color: 'from-blue-500 to-cyan-500' },
  geometry: { label: '几何', icon: TrendingUp, color: 'from-emerald-500 to-teal-500' },
  calculus: { label: '微积分', icon: TrendingUp, color: 'from-violet-500 to-purple-500' },
  arithmetic: { label: '算术', icon: Hash, color: 'from-amber-500 to-orange-500' },
  logic: { label: '逻辑', icon: Brain, color: 'from-rose-500 to-pink-500' },
  probability: { label: '概率', icon: Divide, color: 'from-cyan-500 to-blue-500' },
  word: { label: '应用', icon: Brain, color: 'from-fuchsia-500 to-pink-500' },
  sequence: { label: '数列', icon: TrendingUp, color: 'from-orange-500 to-red-500' },
} as const

interface QuizResult {
  id: string
  date: string
  total: number
  correct: number
  timeSpent: number
  difficulty: number
}

const STORAGE_RESULT = 'versa:math-quiz-results-v1'
function loadResults(): QuizResult[] { try { const s = localStorage.getItem(STORAGE_RESULT); if (s) return JSON.parse(s) } catch {} return [] }
function saveResults(d: QuizResult[]) { try { localStorage.setItem(STORAGE_RESULT, JSON.stringify(d)) } catch {} }

export function MathQuiz() {
  const [qs, setQs] = useState<Question[]>(load())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [filterCat, setFilterCat] = useState<keyof typeof CAT_META | 'all'>('all')
  const [difficulty, setDifficulty] = useState<1 | 2 | 3 | 4 | 5>(2)
  const [correct, setCorrect] = useState(0)
  const [startTime, setStartTime] = useState(0)
  const [results, setResults] = useState<QuizResult[]>(loadResults())
  const [aiExplain, setAiExplain] = useState('')
  const [loadingAI, setLoadingAI] = useState(false)

  useEffect(() => { save(qs) }, [qs])
  useEffect(() => { saveResults(results) }, [results])

  const filtered = qs.filter((q) => {
    if (filterCat !== 'all' && q.category !== filterCat) return false
    if (q.difficulty !== difficulty) return false
    return true
  })
  const active = filtered.find((q) => q.id === activeId) || filtered[0] || null

  const pickQuestion = (id?: string) => {
    const q = id ? filtered.find((x) => x.id === id) : filtered[Math.floor(Math.random() * filtered.length)]
    if (q) {
      setActiveId(q.id)
      setInput('')
      setPicked(null)
      setRevealed(false)
      setShowHint(false)
      setAiExplain('')
      setStartTime(Date.now())
    }
  }

  const check = () => {
    if (!active) return
    setRevealed(true)
    const ans = active.options ? picked : input.trim()
    if (ans === active.answer) {
      setCorrect(correct + 1)
      toast('✅ 答对了!', 'success')
    } else {
      toast(`❌ 正确答案是: ${active.answer}`, 'error')
    }
    const timeSpent = Math.floor((Date.now() - startTime) / 1000)
    const newResult: QuizResult = { id: uid(), date: new Date().toISOString(), total: 1, correct: ans === active.answer ? 1 : 0, timeSpent, difficulty }
    setResults([newResult, ...results].slice(0, 30))
  }

  const next = () => pickQuestion()

  const askAI = async () => {
    if (!active || !isAIEnabled()) { toast('请先配置 AI', 'error'); return }
    setLoadingAI(true)
    try {
      const txt = await aiComplete(`请详细解答这道数学题, 给出思路、步骤和答案. 题目: ${active.question}. 答案: ${active.answer}`, '你是耐心的数学老师, 解答清晰有层次.', { model: 'mimo-2.5' })
      setAiExplain(txt)
    } catch (e: any) { toast(e?.message || 'AI 失败', 'error') }
    finally { setLoadingAI(false) }
  }

  const addCustom = () => {
    const q = prompt('输入题目:'); if (!q) return
    const a = prompt('输入答案:'); if (!a) return
    const h = prompt('提示 (可选):') || ''
    const e = prompt('解析 (可选):') || ''
    const newQ: Question = { id: uid(), category: 'algebra', difficulty, question: q, answer: a, hint: h, explanation: e }
    setQs([newQ, ...qs])
    toast('已添加', 'success')
  }

  const del = (id: string) => { setQs(qs.filter((q) => q.id !== id)); toast('已删除', 'success') }

  const totalCorrect = results.reduce((s, r) => s + r.correct, 0)
  const totalAttempts = results.reduce((s, r) => s + r.total, 0)
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-gradient-to-br from-rose-500 via-pink-500 to-fuchsia-500 p-3 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-5 h-5" />
          <h2 className="text-lg font-bold">数学题库</h2>
        </div>
        <p className="text-xs opacity-90 mb-2">8 类题型 · 5 难度 · AI 详细解答</p>
        <div className="grid grid-cols-4 gap-1.5 text-center">
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{qs.length}</p><p className="text-[9px] opacity-80">题库</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{correct}</p><p className="text-[9px] opacity-80">本轮</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{accuracy}%</p><p className="text-[9px] opacity-80">正确率</p></div>
          <div className="bg-white/15 rounded-xl py-1.5"><p className="text-base font-bold">{results.length}</p><p className="text-[9px] opacity-80">次数</p></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40 space-y-1.5">
        <div className="text-[10px] font-semibold text-ink-600 dark:text-ink-400">难度</div>
        <div className="grid grid-cols-5 gap-1">
          {([1, 2, 3, 4, 5] as const).map((d) => (
            <button key={d} onClick={() => { setDifficulty(d); pickQuestion() }} className={cn('h-8 rounded-lg text-[10px] font-semibold', difficulty === d ? `bg-gradient-to-r ${d <= 2 ? 'from-emerald-500 to-green-500' : d <= 3 ? 'from-amber-500 to-orange-500' : 'from-rose-500 to-red-500'} text-white` : 'bg-ink-100 dark:bg-ink-800 text-ink-600')}>
              {d === 1 ? '入门' : d === 2 ? '基础' : d === 3 ? '中等' : d === 4 ? '困难' : '挑战'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {(['all', ...Object.keys(CAT_META)] as const).map((c) => {
            const meta = c === 'all' ? null : CAT_META[c as keyof typeof CAT_META]
            const Icon = meta?.icon
            return (
              <button key={c} onClick={() => { setFilterCat(c as any); pickQuestion() }} className={cn('px-2.5 h-7 rounded-full text-[10px] font-semibold whitespace-nowrap flex items-center gap-1 shrink-0', filterCat === c ? 'bg-rose-500 text-white' : 'bg-white/60 dark:bg-ink-900/40 text-ink-600 border border-ink-200/40')}>
                {c === 'all' ? '全部' : Icon ? <Icon className="w-3 h-3" /> : null}
                {c === 'all' ? '全部' : meta?.label}
              </button>
            )
          })}
        </div>
      </div>

      {active && (
        <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 p-3 border border-rose-200/40 dark:border-rose-800/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className={cn('px-2 h-5 rounded-full text-[10px] font-bold flex items-center gap-1 bg-gradient-to-r text-white', CAT_META[active.category].color)}>
              {(() => { const I = CAT_META[active.category].icon; return <I className="w-3 h-3" /> })()}
              {CAT_META[active.category].label}
            </span>
            <span className="text-[10px] text-rose-500 flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((d) => <span key={d} className={d <= active.difficulty ? 'text-amber-400' : 'text-ink-300'}>★</span>)}
            </span>
          </div>
          <h3 className="text-base font-bold text-ink-800 dark:text-ink-200 leading-relaxed">{active.question}</h3>
          {active.options ? (
            <div className="grid grid-cols-2 gap-1.5">
              {active.options.map((o) => (
                <button key={o} onClick={() => !revealed && setPicked(o)} disabled={revealed} className={cn('h-10 rounded-xl text-sm font-semibold border-2 transition-all',
                  revealed ? (o === active.answer ? 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-400 text-emerald-700' : o === picked ? 'bg-rose-100 dark:bg-rose-900/40 border-rose-400 text-rose-700' : 'bg-ink-50 dark:bg-ink-800/40 border-ink-200/40 text-ink-500')
                  : picked === o ? 'bg-rose-100 dark:bg-rose-900/40 border-rose-400 text-rose-700' : 'bg-white/60 dark:bg-ink-800/40 border-ink-200/40 text-ink-700 dark:text-ink-300'
                )}>
                  {o}
                </button>
              ))}
            </div>
          ) : (
            <input value={input} onChange={(e) => setInput(e.target.value)} disabled={revealed} placeholder="输入答案..." className="w-full h-10 px-3 text-sm font-mono bg-white/60 dark:bg-ink-950/40 rounded-lg border border-ink-200/40 focus:outline-none focus:ring-2 focus:ring-rose-500/40" />
          )}
          {showHint && !revealed && (
            <div className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-900/20 text-[11px] text-amber-700 dark:text-amber-300">
              💡 {active.hint}
            </div>
          )}
          {revealed && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/20 text-[11px] text-emerald-700 dark:text-emerald-300">
              <p className="font-semibold mb-0.5">📝 解析</p>
              <p>{active.explanation}</p>
            </motion.div>
          )}
          {aiExplain && (
            <div className="p-2 rounded-lg bg-violet-50/60 dark:bg-violet-900/20 text-[11px] text-violet-700 dark:text-violet-300 space-y-1">
              <p className="font-semibold">🤖 AI 详细解答</p>
              <p className="whitespace-pre-wrap leading-relaxed">{aiExplain}</p>
            </div>
          )}
          <div className="flex gap-1">
            {!revealed && <button onClick={() => setShowHint(true)} className="flex-1 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">💡 提示</button>}
            {!revealed && <button onClick={check} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold">提交</button>}
            {revealed && <button onClick={askAI} disabled={loadingAI} className="flex-1 h-9 rounded-lg bg-violet-500 text-white text-xs font-semibold disabled:opacity-50">{loadingAI ? 'AI 思考中...' : '🤖 AI 详解'}</button>}
            {revealed && <button onClick={next} className="flex-1 h-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-xs font-semibold flex items-center justify-center gap-1">下一题 <ChevronRight className="w-3 h-3" /></button>}
          </div>
        </div>
      )}

      <div className="flex gap-1">
        <button onClick={() => pickQuestion()} className="flex-1 h-9 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-semibold flex items-center justify-center gap-1"><Shuffle className="w-3 h-3" />随机一题</button>
        <button onClick={addCustom} className="h-9 w-9 rounded-lg bg-ink-100 dark:bg-ink-800 text-ink-600 flex items-center justify-center"><Plus className="w-3.5 h-3.5" /></button>
      </div>

      {results.length > 0 && (
        <div className="rounded-2xl bg-white/60 dark:bg-ink-900/40 p-2.5 border border-ink-200/40 dark:border-ink-800/40">
          <div className="text-xs font-semibold text-ink-700 dark:text-ink-300 mb-1.5 flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-amber-500" />最近记录</div>
          <div className="grid grid-cols-5 gap-1">
            {results.slice(0, 10).map((r) => (
              <div key={r.id} className={cn('p-1.5 rounded-lg text-center', r.correct ? 'bg-emerald-50/60 dark:bg-emerald-900/20' : 'bg-rose-50/60 dark:bg-rose-900/20')}>
                <div className="text-base">{r.correct ? '✅' : '❌'}</div>
                <div className="text-[9px] text-ink-500">{r.timeSpent}s</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
